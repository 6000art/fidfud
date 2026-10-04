import React, { useRef, useState, useEffect } from 'react';
import UniversalVideoPlayer from './UniversalVideoPlayer';
import { 
  Heart, 
  Share2, 
  ShoppingCart, 
  Volume2, 
  VolumeX, 
  Sparkles,
  MapPin,
  Clock
} from 'lucide-react';
import { Video, Dish, Restaurant } from '../types';
import { videoPreloadService } from '../services/VideoPreloadService';

export interface VerticalVideoPlayerProps {
  videos: Video[];
  dishes?: Dish[];
  restaurants?: Restaurant[];
  onSelectDish: (dishId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

export default function VerticalVideoPlayer({
  videos,
  dishes = [],
  restaurants = [],
  onSelectDish,
  onLoadMore,
  hasMore = false,
  className = ''
}: VerticalVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [showHeartBurst, setShowHeartBurst] = useState<string | null>(null);

  // IntersectionObserver to manage active video index on scroll (TikTok / Instagram Reels style)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observerOptions: IntersectionObserverInit = {
      root: container,
      threshold: 0.65
    };

    const handleIntersection: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-index'));
          if (!isNaN(index)) {
            setActiveIndex(index);
            // Trigger load more when reaching near end
            if (hasMore && onLoadMore && index >= videos.length - 2) {
              onLoadMore();
            }
          }
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    const videoContainers = container.querySelectorAll('.vertical-video-item');
    videoContainers.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [videos, hasMore, onLoadMore]);

  // Intelligent blob preloading for index+1 and index+2
  useEffect(() => {
    if (videos && videos.length > 0) {
      videoPreloadService.preloadNext(activeIndex, videos);
    }
  }, [activeIndex, videos]);

  // Toggle Mute globally
  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  // Toggle Like
  const handleToggleLike = (videoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLikedVideos(prev => {
      const currentlyLiked = prev[videoId];
      const video = videos.find(v => v.id === videoId);
      const baseLikes = video?.likesCount || 120;
      
      setLikeCounts(prevCounts => ({
        ...prevCounts,
        [videoId]: (prevCounts[videoId] ?? baseLikes) + (currentlyLiked ? -1 : 1)
      }));

      return { ...prev, [videoId]: !currentlyLiked };
    });
  };

  // Double tap to like (Instagram gesture)
  const handleDoubleTap = (videoId: string) => {
    if (!likedVideos[videoId]) {
      handleToggleLike(videoId);
    }
    setShowHeartBurst(videoId);
    setTimeout(() => setShowHeartBurst(null), 800);
  };

  // Handle Share
  const handleShare = async (video: Video, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title || 'Plat Fidfud',
          text: `Regardez ce plat délicieux sur Fidfud : ${video.title}`,
          url: window.location.href
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien de la vidéo copié ! 📋');
    }
  };

  if (!videos || videos.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500 bg-zinc-950 rounded-3xl">
        <Sparkles size={36} className="text-[#FF5C00] mb-3 animate-pulse" />
        <p className="text-sm font-black uppercase text-white">Aucune vidéo disponible</p>
        <p className="text-xs text-zinc-400 mt-1">Le flux se mettra à jour sous peu.</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-y-scroll snap-y snap-mandatory bg-black select-none scrollbar-none rounded-3xl ${className}`}
      style={{ scrollBehavior: 'smooth' }}
    >
      {videos.map((video, idx) => {
        const dish = dishes.find(d => d.id === (video.dishId || video.associatedDishId));
        const restaurant = restaurants.find(r => r.id === (video.restaurantId || dish?.restaurantId));
        const isLiked = likedVideos[video.id];
        const baseLikes = video.likesCount || 142;
        const currentLikes = likeCounts[video.id] ?? baseLikes;
        const isActive = activeIndex === idx;
        const isNearActive = Math.abs(activeIndex - idx) <= 1;

        return (
          <div 
            key={video.id || idx}
            data-index={idx}
            className="vertical-video-item relative w-full h-full snap-start snap-always shrink-0 overflow-hidden bg-zinc-950 flex items-center justify-center"
          >
            {/* Universal Video Player (Supports YouTube, Shorts, TikTok, Instagram, MP4, WebM, HLS) */}
            {isNearActive ? (
              <UniversalVideoPlayer
                src={video.videoUrl}
                poster={video.thumbnailUrl || (dish ? (dish.imageUrl || (dish as any).image) : undefined)}
                isPlaying={isActive}
                isMuted={isMuted}
                loop={true}
                className="w-full h-full object-cover"
                onDoubleTap={() => handleDoubleTap(video.id)}
                preload={isActive ? 'auto' : 'metadata'}
              />
            ) : (
              <div 
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${video.thumbnailUrl || dish?.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'})` }}
              />
            )}

            {/* Double Tap Floating Heart Burst Effect */}
            {showHeartBurst === video.id && (
              <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-scaleUp">
                <Heart size={90} className="fill-red-500 text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]" />
              </div>
            )}

            {/* Mute / Unmute Top Control Pill */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-black/80 transition-all cursor-pointer shadow-lg"
            >
              {isMuted ? <VolumeX size={14} className="text-zinc-400" /> : <Volume2 size={14} className="text-[#FF5C00]" />}
              <span className="text-[10px] uppercase font-mono">{isMuted ? 'Muet' : 'Son On'}</span>
            </button>

            {/* Right Side Engagement Column */}
            <div className="absolute right-3 bottom-24 z-30 flex flex-col items-center space-y-4">
              {/* Like Button */}
              <button
                onClick={(e) => handleToggleLike(video.id, e)}
                className="group flex flex-col items-center cursor-pointer transition-transform active:scale-90"
              >
                <div className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                  isLiked ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-black/50 border-white/10 text-white hover:bg-black/70'
                }`}>
                  <Heart size={22} className={isLiked ? 'fill-red-500 text-red-500' : 'text-white'} />
                </div>
                <span className="text-[10px] font-black text-white font-mono mt-1 drop-shadow-md">
                  {currentLikes}
                </span>
              </button>

              {/* Share Button */}
              <button
                onClick={(e) => handleShare(video, e)}
                className="flex flex-col items-center cursor-pointer transition-transform active:scale-90"
              >
                <div className="p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-black/70 transition-all">
                  <Share2 size={20} />
                </div>
                <span className="text-[10px] font-bold text-white font-mono mt-1 drop-shadow-md">
                  Partager
                </span>
              </button>

              {/* Dish Price Tag Badge */}
              {dish && (
                <div className="px-2.5 py-1 rounded-full bg-[#FF5C00] text-white text-xs font-black font-mono border border-white/20 shadow-xl flex items-center gap-1 animate-pulse">
                  <span>{dish.price.toFixed(2)} €</span>
                </div>
              )}
            </div>

            {/* Bottom Overlay Info & "Commander ce plat" Clickable Drawer Trigger */}
            <div className="absolute bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-12 space-y-3 pointer-events-none">
              <div className="space-y-1 pointer-events-auto">
                {restaurant && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-[#FF5C00] uppercase tracking-wider bg-[#FF5C00]/10 px-2 py-0.5 rounded border border-[#FF5C00]/20 flex items-center gap-1">
                      <MapPin size={10} />
                      <span>{restaurant.name}</span>
                    </span>
                    {(dish?.preparationTimeMinutes || (dish as any)?.prepTimeMinutes) && (
                      <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-0.5">
                        <Clock size={10} />
                        <span>{dish?.preparationTimeMinutes || (dish as any)?.prepTimeMinutes} min</span>
                      </span>
                    )}
                  </div>
                )}

                <h3 className="text-base font-black text-white tracking-tight uppercase italic drop-shadow-md">
                  {video.title || dish?.name || 'Spécialité Gourmande'}
                </h3>

                <p className="text-xs text-zinc-300 font-sans line-clamp-2 leading-relaxed font-normal drop-shadow">
                  {video.description || dish?.description || 'Découvrez ce plat d’exception cuisiné frais.'}
                </p>
              </div>

              {/* Clickable Overlay Card / Button "Commander ce plat" */}
              <div className="pointer-events-auto pt-1">
                <button
                  id={`btn-order-dish-overlay-${video.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetDishId = video.dishId || dish?.id;
                    if (targetDishId) {
                      onSelectDish(targetDishId);
                    }
                  }}
                  className="w-full bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-black uppercase text-xs py-3 px-4 rounded-2xl flex items-center justify-between shadow-[0_10px_25px_rgba(255,92,0,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-white/20 cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    {dish?.imageUrl && (
                      <img 
                        src={dish.imageUrl} 
                        alt={dish.name} 
                        className="w-8 h-8 rounded-lg object-cover border border-white/30"
                      />
                    )}
                    <div className="text-left">
                      <p className="text-[10px] text-white/80 font-mono leading-none">FIDFUD EXPRESS</p>
                      <p className="text-xs font-black text-white italic leading-tight">Commander ce plat</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-xl font-mono text-xs font-bold">
                    <span>{dish ? `${dish.price.toFixed(2)} €` : 'Menu'}</span>
                    <ShoppingCart size={14} className="ml-1 fill-white" />
                  </div>
                </button>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
