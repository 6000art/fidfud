import React, { useRef, useEffect, useState } from 'react';

interface BackgroundVideoPlayerProps {
  src: string;
  isPlaying: boolean;
  isMuted: boolean;
  className?: string;
}

const getSafeVideoUrl = (url: string): string => {
  if (!url) return 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
  return url;
};

export const BackgroundVideoPlayer: React.FC<BackgroundVideoPlayerProps> = ({
  src,
  isPlaying,
  isMuted,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentSrc, setCurrentSrc] = useState(getSafeVideoUrl(src));

  useEffect(() => {
    setCurrentSrc(getSafeVideoUrl(src));
  }, [src]);

  // Sync isPlaying state with HTML5 video element play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(err => {
        // Autoplay or playback was interrupted/blocked by browser policies
        console.warn("Background video playback was prevented or interrupted:", err);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, currentSrc]);

  const handleVideoError = () => {
    console.warn(`[Self-Healing Background Video] Source failed: ${currentSrc}`);
    if (src && (src.startsWith('blob:') || src.startsWith('data:'))) {
      console.log(`[Self-Healing Background Video] Preserving user-provided upload/recording URL: ${src}`);
      return;
    }
    const fallbackUrl = 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
    setCurrentSrc(fallbackUrl);
  };

  return (
    <video
      ref={videoRef}
      src={currentSrc}
      loop
      muted={isMuted}
      playsInline
      onError={handleVideoError}
      className={className}
    />
  );
};

export default BackgroundVideoPlayer;
