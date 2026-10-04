import React, { useRef, useEffect, useState } from 'react';
import { parseVideoSource, getSafeVideoUrl } from '../utils/videoUtils';

interface BackgroundVideoPlayerProps {
  src: string;
  isPlaying: boolean;
  isMuted: boolean;
  loop?: boolean;
  className?: string;
  allowInteractive?: boolean;
  onClick?: () => void;
  poster?: string;
}

interface EmbedInfo {
  type: 'youtube' | 'instagram' | 'tiktok' | 'direct';
  embedUrl: string;
}

const parseEmbedInfo = (url: string, isPlaying: boolean, isMuted: boolean): EmbedInfo => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return { type: 'direct', embedUrl: '' };
  }

  const parsed = parseVideoSource(url, { isPlaying, isMuted, loop: true });
  if (parsed.isEmbed && parsed.embedUrl) {
    let type: 'youtube' | 'instagram' | 'tiktok' | 'direct' = 'direct';
    if (parsed.type.startsWith('youtube')) type = 'youtube';
    else if (parsed.type === 'instagram') type = 'instagram';
    else if (parsed.type === 'tiktok') type = 'tiktok';
    return {
      type,
      embedUrl: parsed.embedUrl
    };
  }

  return { type: 'direct', embedUrl: getSafeVideoUrl(url) };
};

export const BackgroundVideoPlayer: React.FC<BackgroundVideoPlayerProps> = ({
  src,
  isPlaying,
  isMuted,
  loop = true,
  className = '',
  allowInteractive = false,
  onClick,
  poster
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const initialParsed = parseEmbedInfo(src, isPlaying, isMuted);
  const [embedInfo, setEmbedInfo] = useState<EmbedInfo>(initialParsed);
  const [currentSrc, setCurrentSrc] = useState<string>(initialParsed.embedUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const info = parseEmbedInfo(src, isPlaying, isMuted);
    setCurrentSrc(info.embedUrl);
    setEmbedInfo(info);
    setHasError(false);
  }, [src, isPlaying, isMuted]);

  // Listen for global pause-all-videos event
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

  // Sync HTML5 video playback if type is 'direct'
  useEffect(() => {
    if (embedInfo.type !== 'direct' || hasError) return;
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
    video.playsInline = true;
    video.loop = loop;

    if (isPlaying) {
      const safePlay = () => {
        if (!video) return;
        const promise = video.play();
        if (promise !== undefined) {
          playPromiseRef.current = promise;
          promise
            .catch(err => {
              if (err.name !== 'AbortError' && !err.message?.includes('interrupted')) {
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
      };

      if (video.readyState >= 2) {
        safePlay();
      } else {
        const handleCanPlay = () => safePlay();
        video.addEventListener('canplay', handleCanPlay, { once: true });
        if (video.readyState === 0) {
          try {
            video.load();
          } catch (_) {}
        }
        return () => video.removeEventListener('canplay', handleCanPlay);
      }
    } else {
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
  }, [isPlaying, currentSrc, isMuted, hasError, embedInfo.type]);

  const handleVideoError = () => {
    console.warn(`[Background Video] Source playback error: ${currentSrc}`);
    setHasError(true);
  };

  if (hasError || !currentSrc || !currentSrc.trim()) {
    const backgroundCover = poster || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80';
    return (
      <div
        className={`${className} bg-cover bg-center transition-all duration-700 relative flex items-center justify-center overflow-hidden`}
        style={{
          backgroundImage: `url('${backgroundCover}')`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60 backdrop-blur-[1px]" />
        
        {/* Clean Logo Showcase Overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-4 space-y-2 animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center shadow-lg">
            <span className="text-base font-black text-white">
              FID<span className="text-[#FF5C00]">FUD</span>
            </span>
          </div>
          <p className="text-[11px] font-bold text-white uppercase tracking-wider">
            Flux Vidéo Direct
          </p>
        </div>
      </div>
    );
  }

  // Render iframe for YouTube, Instagram or TikTok embeds
  if (embedInfo.type !== 'direct') {
    if (!embedInfo.embedUrl || !embedInfo.embedUrl.trim()) {
      return null;
    }
    return (
      <div 
        onClick={onClick}
        className={`relative overflow-hidden ${className}`}
      >
        <iframe
          src={embedInfo.embedUrl.trim()}
          title="Video Player Embed"
          className={`w-full h-full border-none object-cover transition-opacity duration-500 ${
            allowInteractive ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={currentSrc.trim() || undefined}
      poster={poster?.trim() || undefined}
      loop={loop}
      muted={isMuted}
      playsInline
      onClick={onClick}
      onError={handleVideoError}
      onEnded={(e) => {
        if (loop) {
          try {
            e.currentTarget.currentTime = 0;
            if (isPlaying) e.currentTarget.play().catch(() => {});
          } catch (_) {}
        }
      }}
      onTimeUpdate={(e) => {
        const vid = e.currentTarget;
        if (loop && vid.duration > 0 && vid.currentTime >= vid.duration - 0.08) {
          if (vid.currentTime !== 0 && !vid.seeking) {
            vid.currentTime = 0;
          }
        }
      }}
      className={className}
      style={{
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
    />
  );
};

export default BackgroundVideoPlayer;
