/**
 * VideoPreloadService.ts
 * 
 * Intelligent TikTok/Reels-style Blob & Stream Preloader:
 * - As soon as the active video starts playing, pre-fetches the blob for index+1 (and index+2)
 * - Converts video binary streams into instant, local `blob:` URLs stored in-memory
 * - Eliminates network lag, buffering delays, and black frames upon vertical scroll
 * - Implements LRU cache eviction and URL.revokeObjectURL() to prevent browser memory leaks
 * - Provides graceful fallback to hidden HTML5 preloading when CORS prevents raw blob fetching
 */

import { Video } from '../types';
import { parseVideoSource } from '../utils/videoUtils';

interface CachedBlobEntry {
  url: string;
  blobUrl: string;
  blobSize: number;
  lastAccessed: number;
}

class VideoPreloadService {
  private static instance: VideoPreloadService;
  
  // Cache of rawUrl -> Blob URL
  private blobUrlCache: Map<string, CachedBlobEntry> = new Map();
  // In-flight fetch promises to prevent duplicate simultaneous network downloads
  private inFlightRequests: Map<string, Promise<string>> = new Map();
  // Subscribers for cache updates
  private listeners: Set<(cacheMap: Record<string, string>) => void> = new Set();
  
  // Maximum number of active blobs held in memory to prevent mobile RAM pressure
  private readonly MAX_CACHED_BLOBS = 10;
  // Maximum file size to cache in memory (30MB)
  private readonly MAX_BLOB_SIZE_BYTES = 30 * 1024 * 1024;

  private constructor() {
    // Clean up on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clearAllBlobs();
      });
    }
  }

  public static getInstance(): VideoPreloadService {
    if (!VideoPreloadService.instance) {
      VideoPreloadService.instance = new VideoPreloadService();
    }
    return VideoPreloadService.instance;
  }

  /**
   * Subscribe to cache changes (e.g. React state updater)
   */
  public subscribe(listener: (cacheMap: Record<string, string>) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllBlobUrls());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const map = this.getAllBlobUrls();
    this.listeners.forEach((listener) => {
      try {
        listener(map);
      } catch (err) {
        console.warn('[VideoPreloadService] Listener error:', err);
      }
    });
  }

  public getAllBlobUrls(): Record<string, string> {
    const map: Record<string, string> = {};
    this.blobUrlCache.forEach((entry, key) => {
      map[key] = entry.blobUrl;
    });
    return map;
  }

  /**
   * Get cached blob URL for a specific video source URL, if available
   */
  public getBlobUrl(rawUrl?: string): string | undefined {
    if (!rawUrl) return undefined;
    const entry = this.blobUrlCache.get(rawUrl.trim());
    if (entry) {
      entry.lastAccessed = Date.now();
      return entry.blobUrl;
    }
    return undefined;
  }

  /**
   * Checks if the video is direct media suitable for blob fetching
   */
  public isDirectMedia(url?: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const parsed = parseVideoSource(url);
    if (parsed.isEmbed) return false;
    const lower = url.toLowerCase();
    return (
      lower.includes('.mp4') ||
      lower.includes('.webm') ||
      lower.includes('.mov') ||
      lower.includes('googleapis.com') ||
      lower.includes('cloudinary.com') ||
      lower.includes('pexels.com') ||
      lower.includes('pixabay.com') ||
      lower.includes('w3schools.com') ||
      lower.startsWith('blob:') ||
      lower.startsWith('data:')
    );
  }

  /**
   * Preload the upcoming videos (index+1, index+2) when the current video begins playback
   */
  public preloadNext(currentIndex: number, feedVideos: Video[]): void {
    if (!Array.isArray(feedVideos) || feedVideos.length === 0) return;

    // Prioritize next video (index + 1)
    const nextIdx = currentIndex + 1;
    if (nextIdx < feedVideos.length) {
      const nextVid = feedVideos[nextIdx];
      if (nextVid && nextVid.videoUrl) {
        this.preloadVideo(nextVid.videoUrl, 'high');
      }
    }

    // Secondary prefetch for index + 2
    const secondNextIdx = currentIndex + 2;
    if (secondNextIdx < feedVideos.length) {
      const secondVid = feedVideos[secondNextIdx];
      if (secondVid && secondVid.videoUrl) {
        // slight delay to not compete with index+1 network bandwidth
        setTimeout(() => {
          this.preloadVideo(secondVid.videoUrl, 'low');
        }, 150);
      }
    }

    // Evict distant blobs from memory (keeping active window)
    this.evictDistantBlobs(currentIndex, feedVideos);
  }

  /**
   * Fetch and convert video stream into a Blob URL
   */
  public async preloadVideo(rawUrl: string, priority: 'high' | 'low' = 'high'): Promise<string> {
    if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
    const cleanUrl = rawUrl.trim();

    // 1. Already in blob cache?
    const existing = this.blobUrlCache.get(cleanUrl);
    if (existing) {
      existing.lastAccessed = Date.now();
      return existing.blobUrl;
    }

    // 2. Is it a direct downloadable media?
    if (!this.isDirectMedia(cleanUrl)) {
      return cleanUrl;
    }

    // 3. Already downloading?
    if (this.inFlightRequests.has(cleanUrl)) {
      return this.inFlightRequests.get(cleanUrl)!;
    }

    // 4. Initiate asynchronous fetch
    const fetchPromise = (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

        const response = await fetch(cleanUrl, {
          mode: 'cors',
          credentials: 'omit',
          signal: controller.signal,
          headers: priority === 'high' ? { 'Priority': 'u=1' } : {}
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const blob = await response.blob();
        
        // Guard against excessively large files that could trigger OOM on mobile devices
        if (blob.size > this.MAX_BLOB_SIZE_BYTES) {
          console.info(`[VideoPreloadService] Video size (${(blob.size / (1024 * 1024)).toFixed(1)}MB) exceeds blob threshold, using direct streaming.`);
          return cleanUrl;
        }

        // Create fast local object URL
        const blobUrl = URL.createObjectURL(blob);

        // Ensure cache space available
        this.enforceCacheLimit();

        this.blobUrlCache.set(cleanUrl, {
          url: cleanUrl,
          blobUrl,
          blobSize: blob.size,
          lastAccessed: Date.now()
        });

        this.notifyListeners();
        return blobUrl;
      } catch (err: any) {
        // If CORS or network prevents fetch, warmup browser media buffer via hidden link/video
        this.warmupBrowserMediaCache(cleanUrl);
        return cleanUrl;
      } finally {
        this.inFlightRequests.delete(cleanUrl);
      }
    })();

    this.inFlightRequests.set(cleanUrl, fetchPromise);
    return fetchPromise;
  }

  /**
   * Browser-level warmup fallback for cross-origin restricted videos
   */
  private warmupBrowserMediaCache(url: string): void {
    if (typeof document === 'undefined') return;
    try {
      // Use <link rel="preload" as="video"> for browser socket warming
      const existingLink = document.querySelector(`link[href="${url}"]`);
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'video';
        link.href = url;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    } catch (_) {}
  }

  /**
   * Remove least-recently-used (LRU) blobs if cache exceeds maximum allowed items
   */
  private enforceCacheLimit(): void {
    if (this.blobUrlCache.size >= this.MAX_CACHED_BLOBS) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      this.blobUrlCache.forEach((entry, key) => {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      });

      if (oldestKey) {
        const entry = this.blobUrlCache.get(oldestKey);
        if (entry) {
          try {
            URL.revokeObjectURL(entry.blobUrl);
          } catch (_) {}
          this.blobUrlCache.delete(oldestKey);
        }
      }
    }
  }

  /**
   * Evict blobs that are far outside the user's active viewport (index ± 4)
   */
  private evictDistantBlobs(currentIndex: number, feedVideos: Video[]): void {
    const keepUrls = new Set<string>();
    for (let i = Math.max(0, currentIndex - 2); i <= Math.min(feedVideos.length - 1, currentIndex + 3); i++) {
      const vid = feedVideos[i];
      if (vid?.videoUrl) {
        keepUrls.add(vid.videoUrl.trim());
      }
    }

    const keysToDelete: string[] = [];
    this.blobUrlCache.forEach((entry, key) => {
      if (!keepUrls.has(key)) {
        keysToDelete.push(key);
      }
    });

    if (keysToDelete.length > 0) {
      keysToDelete.forEach((key) => {
        const entry = this.blobUrlCache.get(key);
        if (entry) {
          try {
            URL.revokeObjectURL(entry.blobUrl);
          } catch (_) {}
          this.blobUrlCache.delete(key);
        }
      });
      this.notifyListeners();
    }
  }

  /**
   * Clear all allocated Blob URLs
   */
  public clearAllBlobs(): void {
    this.blobUrlCache.forEach((entry) => {
      try {
        URL.revokeObjectURL(entry.blobUrl);
      } catch (_) {}
    });
    this.blobUrlCache.clear();
    this.inFlightRequests.clear();
    this.notifyListeners();
  }
}

export const videoPreloadService = VideoPreloadService.getInstance();
