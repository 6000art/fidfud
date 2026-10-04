import React, { useRef, useState, useEffect } from 'react';
import { Play, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { parseVideoSource, getSafeVideoUrl, isDirectPlayableVideo, STABLE_CULINARY_FALLBACK_VIDEOS } from '../utils/videoUtils';
import { videoPreloadService } from '../services/VideoPreloadService';

export interface UniversalVideoPlayerProps {
  src: string;
  poster?: string;
  isPlaying?: boolean;
  isMuted?: boolean;
  loop?: boolean;
  showControls?: boolean;
  controls?: boolean;
  className?: string;
  videoClassName?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  onDoubleTap?: () => void;
  onClick?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  allowInteractive?: boolean;
  priority?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
}

export const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({
  src,
  poster,
  isPlaying = true,
  isMuted = true,
  loop = true,
  showControls = false,
  controls,
  className = 'w-full h-full relative overflow-hidden bg-black',
  videoClassName = 'w-full h-full',
  objectFit = 'cover',
  onDoubleTap,
  onClick,
  onEnded,
  onTimeUpdate,
  allowInteractive = false,
  priority = false,
  preload = 'auto'
}) => {
  const effectiveShowControls = controls !== undefined ? controls : showControls;
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [currentSrc, setCurrentSrc] = useState<string>(src);

  // Parse video source for embeds (YouTube, Shorts, TikTok, Instagram) or direct media
  const parsed = parseVideoSource(currentSrc, {
    isPlaying,
    isMuted,
    loop,
    controls: effectiveShowControls
  });

  // Keep internal source synchronized with props
  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  // Global event listener to pause other playing videos
  useEffect(() => {
    const handlePauseAll = (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetVideo = customEvent.detail?.target;
      const video = videoRef.current;
      if (video && video !== targetVideo) {
        if (playPromiseRef.current !== null) {
          playPromiseRef.current
            .then(() => {
              if (videoRef.current) {
                videoRef.current.pause();
              }
            })
            .catch(() => {});
        } else {
          try {
            video.pause();
          } catch (_) {}
        }
      }
    };

    window.addEventListener('fidfud-pause-all-videos', handlePauseAll);
    return () => {
      window.removeEventListener('fidfud-pause-all-videos', handlePauseAll);
    };
  }, []);

  // HTML5 Video Play/Pause Management with robust promise protection and loop continuity
  useEffect(() => {
    if (parsed.isEmbed) return;
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
    video.loop = loop;
    video.playsInline = true;

    if (isPlaying) {
      const promise = video.play();
      if (promise !== undefined) {
        playPromiseRef.current = promise;
        promise
          .then(() => {
            setIsLoaded(true);
          })
          .catch((err) => {
            if (err.name !== 'AbortError' && !err.message?.includes('interrupted')) {
              // Browser autoplay policy might require muted state
              if (!video.muted) {
                video.muted = true;
                video.play().catch(() => {});
              }
            }
          })
          .finally(() => {
            if (playPromiseRef.current === promise) {
              playPromiseRef.current = null;
            }
          });
      }
    } else {
      if (playPromiseRef.current !== null) {
        playPromiseRef.current
          .then(() => {
            if (videoRef.current) videoRef.current.pause();
          })
          .catch(() => {});
      } else {
        try {
          video.pause();
        } catch (_) {}
      }
    }
  }, [isPlaying, isMuted, loop, parsed.isEmbed, currentSrc]);

  // Seamless loop trigger helper
  const handleLoopRestart = (video: HTMLVideoElement) => {
    if (!loop) return;
    try {
      video.currentTime = 0;
      if (isPlaying) {
        const p = video.play();
        if (p !== undefined) {
          p.catch(() => {});
        }
      }
    } catch (_) {}
  };

  // Double-tap and Single-click handler (TikTok / Instagram gesture)
  const handleTouchOrClick = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapTime < DOUBLE_TAP_DELAY) {
      // Double tap detected!
      if (onDoubleTap) {
        e.stopPropagation();
        onDoubleTap();
      }
      setLastTapTime(0);
    } else {
      setLastTapTime(now);
      if (onClick) {
        onClick();
      }
    }
  };

  // Video error handler
  const handleVideoError = () => {
    setHasError(true);
  };

  // 1. If parsed as Embed (YouTube, TikTok, Instagram)
  if (parsed.isEmbed && parsed.embedUrl) {
    return (
      <div 
        ref={containerRef}
        onClick={handleTouchOrClick}
        className={`${className} flex items-center justify-center relative`}
      >
        <iframe
          src={parsed.embedUrl}
          title="Video Embed Player"
          className="w-full h-full border-none transition-opacity duration-300 pointer-events-auto"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading={priority ? 'eager' : 'lazy'}
          style={{ width: '100%', height: '100%' }}
        />
        {/* Direct link badge for native app viewing */}
        {(parsed.type === 'instagram' || parsed.type === 'tiktok' || parsed.type.startsWith('youtube')) && (
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 z-40 px-3 py-1.5 bg-black/80 hover:bg-black text-white text-[11px] font-bold rounded-full backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-xl transition-all hover:scale-105"
            title="Ouvrir le flux directement"
          >
            <span>{parsed.type === 'instagram' ? '📸 Instagram' : parsed.type === 'tiktok' ? '🎵 TikTok' : '▶️ YouTube'}</span>
            <span className="text-[10px]">↗</span>
          </a>
        )}
      </div>
    );
  }

  // 2. Direct HTML5 Video File / Stream (utilizes instant memory blob if preloaded)
  const candidateSrc = (videoPreloadService.getBlobUrl(currentSrc) || getSafeVideoUrl(currentSrc))?.trim();
  const safeDirectSrc = (candidateSrc && isDirectPlayableVideo(candidateSrc)) 
    ? candidateSrc 
    : (candidateSrc ? STABLE_CULINARY_FALLBACK_VIDEOS[0] : null);

  if (hasError || !safeDirectSrc) {
    return (
      <div 
        ref={containerRef}
        onClick={handleTouchOrClick}
        className={className}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center flex items-center justify-center bg-zinc-950"
          style={{ backgroundImage: `url(${poster || parsed.thumbnailUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'})` }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle size={28} className="text-[#FF5C00] mb-2" />
            <p className="text-xs font-bold text-white uppercase tracking-wider">Vidéo en cours de synchronisation</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onClick={handleTouchOrClick}
      className={className}
    >
      <video
        ref={videoRef}
        src={safeDirectSrc || undefined}
        poster={poster || parsed.thumbnailUrl || undefined}
        preload={preload}
        playsInline
        muted={isMuted}
        loop={loop}
        controls={effectiveShowControls}
        onError={(e) => {
          if (e.currentTarget.src !== STABLE_CULINARY_FALLBACK_VIDEOS[0]) {
            e.currentTarget.src = STABLE_CULINARY_FALLBACK_VIDEOS[0];
          } else {
            handleVideoError();
          }
        }}
        onLoadedData={() => setIsLoaded(true)}
        onEnded={(e) => {
          if (loop) {
            handleLoopRestart(e.currentTarget);
          }
          if (onEnded) {
            onEnded();
          }
        }}
        onPause={(e) => {
          // If playback was intended and loop is active, prevent terminal stall on EOF
          if (isPlaying && loop && e.currentTarget.ended) {
            handleLoopRestart(e.currentTarget);
          }
        }}
        onTimeUpdate={(e) => {
          const vid = e.currentTarget;
          if (loop && vid.duration > 0 && vid.currentTime >= vid.duration - 0.08) {
            // Pre-seamless loop jump to eliminate browser-level keyframe freeze at EOF
            if (vid.currentTime !== 0 && !vid.seeking) {
              vid.currentTime = 0;
            }
          }
          if (onTimeUpdate) {
            onTimeUpdate(vid.currentTime, vid.duration || 0);
          }
        }}
        className={`${videoClassName} ${
          objectFit === 'cover' ? 'object-cover' : objectFit === 'contain' ? 'object-contain' : 'object-fill'
        } transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-90'}`}
        style={{
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)'
        }}
      />

      {/* Fallback Display if video completely failed */}
      {hasError && (
        <div 
          className="absolute inset-0 bg-cover bg-center flex items-center justify-center bg-zinc-950"
          style={{ backgroundImage: `url(${poster || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'})` }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle size={28} className="text-[#FF5C00] mb-2" />
            <p className="text-xs font-bold text-white uppercase tracking-wider">Vidéo en cours de synchronisation</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalVideoPlayer;
