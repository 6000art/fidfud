import { Video } from '../types';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: {
    contentType?: string;
    title?: string;
    author?: string;
    thumbnail?: string;
    duration?: number;
    videoId?: string;
  };
}

export class VideoValidator {
  /**
   * Performs quick format, protocol-level validation, and queries the backend or DOM
   * to verify if the video URL is reachable, valid, and playable.
   */
  static async validate(
    url: string,
    sourceType?: 'direct' | 'instagram' | 'tiktok' | 'youtube_link' | 'youtube_channel'
  ): Promise<ValidationResult> {
    if (!url) {
      return { isValid: false, error: "L'URL de la vidéo est vide." };
    }

    // Local in-progress recordings or uploaded blobs / data URIs are immediately valid
    if (
      url.startsWith('blob:') ||
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.includes('localhost')
    ) {
      return { isValid: true, metadata: { contentType: 'video/mp4' } };
    }

    // Standard URL format validation
    try {
      new URL(url.startsWith('/') ? `http://localhost${url}` : url);
    } catch (e) {
      return { isValid: false, error: "Le format de l'URL est invalide." };
    }

    // Detect source type if not provided
    let detectedType = sourceType;
    if (!detectedType) {
      if (url.includes('instagram.com') || url.includes('instagr.am')) {
        detectedType = 'instagram';
      } else if (url.includes('tiktok.com') || url.includes('tiktok')) {
        detectedType = 'tiktok';
      } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        if (url.includes('/@') || url.includes('/channel/') || url.includes('/c/')) {
          detectedType = 'youtube_channel';
        } else {
          detectedType = 'youtube_link';
        }
      } else {
        detectedType = 'direct';
      }
    }

    // Basic regex check before hitting the APIs
    if (detectedType === 'youtube_link') {
      const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
      if (!ytMatch || !ytMatch[1]) {
        return { isValid: false, error: "L'identifiant de la vidéo YouTube est introuvable ou invalide." };
      }
    }

    if (detectedType === 'youtube_channel') {
      const ytChannelMatch = url.match(/(?:youtube\.com)\/(?:@|c\/|channel\/)([\w.-]+)/i);
      if (!ytChannelMatch || !ytChannelMatch[1]) {
        return { isValid: false, error: "Le format du lien de la chaîne YouTube est incorrect." };
      }
    }

    if (detectedType === 'instagram') {
      const igMatch = url.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
      if (!igMatch || !igMatch[1]) {
        return { isValid: false, error: "Le format de la publication Instagram ou de la Reel est incorrect." };
      }
    }

    if (detectedType === 'tiktok') {
      const tkMatch = url.match(/(?:tiktok\.com)\/(?:@[\w.-]+\/video\/(\d+)|t\/([A-Za-z0-9_-]+))/i);
      if (!tkMatch) {
        // Allow generic tiktok.com/ links too
        if (!url.includes('tiktok.com')) {
          return { isValid: false, error: "Le format du lien de la vidéo TikTok est incorrect." };
        }
      }
    }

    // Query backend validator endpoint for external links
    if (!url.startsWith('/')) {
      try {
        const response = await fetch('/api/videos/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: url, videoSourceType: detectedType }),
        });

        if (response.ok) {
          const result: ValidationResult = await response.json();
          // If server side validation confirmed it is invalid, return it
          if (!result.isValid) {
            return result;
          }
        }
      } catch (err) {
        console.warn('[VideoValidator] Backend validation query failed, falling back to client-side checks:', err);
      }
    }

    // Client-side playback simulation verification and duration measurement
    if (detectedType === 'direct') {
      try {
        const domResult = await this.validateDirectVideoWithDOM(url);
        if (!domResult.isValid) {
          return {
            isValid: false,
            error: "Le fichier vidéo n'est pas jouable par le navigateur (format non supporté, CORS ou lien cassé)."
          };
        }
        return {
          isValid: true,
          metadata: {
            contentType: 'video/mp4',
            duration: domResult.duration
          }
        };
      } catch (e) {
        // Fallback to true if DOM checks are blocked
      }
    }

    return { isValid: true };
  }

  /**
   * Helper to validate a direct video source using HTML5 Video element metadata load
   */
  private static validateDirectVideoWithDOM(url: string): Promise<{ isValid: boolean; duration?: number }> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = url;
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const timeout = setTimeout(() => {
        cleanup();
        // If timeout reached, assume valid to avoid blocking on slow connections
        resolve({ isValid: true });
      }, 6000);

      const cleanup = () => {
        clearTimeout(timeout);
        video.onloadedmetadata = null;
        video.onerror = null;
        video.remove();
      };

      video.onloadedmetadata = () => {
        const duration = video.duration;
        cleanup();
        resolve({ isValid: true, duration });
      };

      video.onerror = () => {
        cleanup();
        resolve({ isValid: false });
      };
    });
  }
}
