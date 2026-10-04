import React, { useState, useRef, useEffect } from 'react';
import { Dish } from '../types';
import { Play, Sparkles, Video as VideoIcon, Flame } from 'lucide-react';
import { getSafeVideoUrl, STABLE_CULINARY_FALLBACK_VIDEOS, isDirectPlayableVideo } from '../utils/videoUtils';

interface AnimatedDishThumbnailProps {
  dish: Dish;
  className?: string;
  showBadges?: boolean;
  aspectRatio?: string;
  autoPlay?: boolean;
}

export default function AnimatedDishThumbnail({
  dish,
  className = '',
  showBadges = true,
  aspectRatio = 'aspect-video',
  autoPlay = true
}: AnimatedDishThumbnailProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Derive animation video url (dish videoUrl if direct playable, else fallback culinary loops)
  const fallbackLoop = dish.imageUrl?.includes('pizza') 
    ? STABLE_CULINARY_FALLBACK_VIDEOS[1]
    : dish.imageUrl?.includes('burger')
    ? STABLE_CULINARY_FALLBACK_VIDEOS[0]
    : dish.imageUrl?.includes('dessert') || dish.name?.toLowerCase().includes('tiramisu')
    ? STABLE_CULINARY_FALLBACK_VIDEOS[4]
    : STABLE_CULINARY_FALLBACK_VIDEOS[2];

  const videoSource = (dish.videoUrl && isDirectPlayableVideo(dish.videoUrl))
    ? getSafeVideoUrl(dish.videoUrl)
    : fallbackLoop;

  const mainImageUrl = dish.imageUrl || (dish.galleryImages && dish.galleryImages[0]) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';

  useEffect(() => {
    if (!videoRef.current) return;
    if (autoPlay || isHovered) {
      videoRef.current.play().catch(() => {
        // Autoplay may be restricted by browser until interaction
      });
    } else {
      videoRef.current.pause();
    }
  }, [isHovered, autoPlay]);

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl bg-zinc-950 border border-white/10 group select-none ${aspectRatio} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background static image as base fallback */}
      <img
        src={mainImageUrl}
        alt={dish.name}
        className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 ${
          isVideoLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        loading="lazy"
      />

      {/* Video Loop Element for Animated Thumbnail */}
      {videoSource && (
        <video
          ref={videoRef}
          src={videoSource}
          muted
          loop
          playsInline
          autoPlay
          onLoadedData={() => setIsVideoLoaded(true)}
          onError={(e) => {
            setIsVideoLoaded(false);
            if (e.currentTarget.src !== fallbackLoop) {
              e.currentTarget.src = fallbackLoop;
            }
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none group-hover:scale-105 transition-transform ${
            isVideoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Gradient Vignette for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

      {/* Top Badges (Animated tags, video indicator, spicy tag) */}
      {showBadges && (
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            {videoSource && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-600/90 text-white backdrop-blur-md shadow-sm border border-purple-400/30 animate-pulse">
                <VideoIcon size={10} />
                <span>Animé HD</span>
              </span>
            )}
            {dish.isHomemade && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/90 text-black backdrop-blur-md shadow-sm">
                <span>👨‍🍳 Fait Maison</span>
              </span>
            )}
          </div>

          {dish.spicyLevel && dish.spicyLevel > 0 ? (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600/90 text-white backdrop-blur-md shadow-sm border border-red-400/30">
              <Flame size={10} className="animate-bounce" />
              <span>{'🌶️'.repeat(Math.min(dish.spicyLevel, 3))}</span>
            </span>
          ) : null}
        </div>
      )}

      {/* Center Interactive Play Cue */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
        <div className="w-10 h-10 rounded-full bg-[#FF5C00]/90 text-white flex items-center justify-center shadow-lg shadow-[#FF5C00]/30 transform scale-75 group-hover:scale-100 transition-transform">
          <Play size={18} className="fill-white translate-x-0.5" />
        </div>
      </div>

      {/* Bottom overlay info bar */}
      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between pointer-events-none z-10">
        <span className="text-[11px] font-black text-white drop-shadow-md truncate max-w-[70%]">
          {dish.name}
        </span>
        <span className="text-xs font-black text-[#FF5C00] bg-black/80 px-2 py-0.5 rounded-lg border border-white/10 shadow-sm">
          {dish.price.toFixed(2)} €
        </span>
      </div>
    </div>
  );
}
