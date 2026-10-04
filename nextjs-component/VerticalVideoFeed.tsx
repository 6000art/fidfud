"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Heart, 
  MessageSquare, 
  Gift, 
  Share2, 
  ShoppingBag, 
  X, 
  Check, 
  Star,
  Sparkles
} from 'lucide-react';

export interface NextJsDish {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
}

export interface NextJsVideo {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantLogoUrl?: string;
  videoUrl: string;
  title: string;
  associatedDish?: NextJsDish;
  likesCount: number;
  commentsCount: number;
}

interface VerticalVideoFeedProps {
  initialVideos: NextJsVideo[];
  onLoadMore?: () => Promise<NextJsVideo[]>;
}

export default function VerticalVideoFeed({ initialVideos, onLoadMore }: VerticalVideoFeedProps) {
  const [videos, setVideos] = useState<NextJsVideo[]>(initialVideos);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [showOrderPopup, setShowOrderPopup] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<'order' | 'menu'>('order');
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const activeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeVideo = videos[activeIndex];

  // Intersection Observer to track active video index and trigger autoplay
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const observerOptions = {
      root: container,
      threshold: 0.6, // Trigger when 60% of the video card is visible
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
          setActiveIndex(index);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    const videoElements = container.querySelectorAll('[data-video-container]');
    videoElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [videos]);

  // Handle Autoplay and Muted logic when activeIndex changes
  useEffect(() => {
    videos.forEach((video, idx) => {
      const el = videoRefs.current[video.id];
      if (el) {
        if (idx === activeIndex) {
          el.muted = isMuted;
          el.currentTime = 0;
          el.play().catch((err) => console.log('Autoplay blocked:', err));
        } else {
          el.pause();
        }
      }
    });

    // Reset popup timer for each video. The user requested:
    // "I need the order button to appear within 15 to 20 seconds, or even 10 seconds, at the end of 5 seconds."
    // We make a premium popup slide in exactly after 5 seconds of active watching!
    setShowOrderPopup(false);
    if (activeTimerRef.current) clearTimeout(activeTimerRef.current);

    if (activeVideo && activeVideo.associatedDish) {
      activeTimerRef.current = setTimeout(() => {
        setShowOrderPopup(true);
      }, 5000); // 5 seconds timer
    }

    return () => {
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
    };
  }, [activeIndex, videos, isMuted, activeVideo]);

  // Handle play/pause on window focus/blur and page visibility change
  useEffect(() => {
    const handleWindowFocus = () => {
      if (!activeVideo) return;
      const el = videoRefs.current[activeVideo.id];
      if (el) {
        el.play().catch((err) => console.log('Focus playback resume blocked:', err));
      }
    };

    const handleWindowBlur = () => {
      if (!activeVideo) return;
      const el = videoRefs.current[activeVideo.id];
      if (el) {
        el.pause();
      }
    };

    const handleVisibilityChange = () => {
      if (!activeVideo) return;
      const el = videoRefs.current[activeVideo.id];
      if (el) {
        if (document.hidden) {
          el.pause();
        } else {
          el.play().catch((err) => console.log('Visibility playback resume blocked:', err));
        }
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeVideo]);

  // Sync general mute state across all video elements
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    videos.forEach((v) => {
      const el = videoRefs.current[v.id];
      if (el) el.muted = newMuteState;
    });
  };

  const handleLike = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedMap(prev => ({ ...prev, [videoId]: !prev[videoId] }));
  };

  // Trigger infinite scrolling
  const handleScroll = async () => {
    const el = containerRef.current;
    if (!el || !onLoadMore) return;

    // If close to bottom, trigger load more
    if (el.scrollHeight - el.scrollTop <= el.clientHeight * 1.5) {
      try {
        const nextBatch = await onLoadMore();
        if (nextBatch.length > 0) {
          // Prevent duplicates
          setVideos(prev => {
            const existingIds = new Set(prev.map(v => v.id));
            const filteredNew = nextBatch.filter(v => !existingIds.has(v.id));
            return [...prev, ...filteredNew];
          });
        }
      } catch (err) {
        console.error('Failed to load more video items:', err);
      }
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-[#09090B] font-sans overflow-hidden text-white flex items-center justify-center">
      {/* Feed Container (Snap Scrolling) */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full max-w-md bg-black relative overflow-y-scroll snap-y snap-mandatory scrollbar-none"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {videos.map((video, idx) => {
          const isLiked = !!likedMap[video.id];
          const hasDish = !!video.associatedDish;
          const isActive = idx === activeIndex;
          const isNearActive = Math.abs(idx - activeIndex) <= 1;

          return (
            <div 
              key={video.id}
              data-index={idx}
              data-video-container
              className="w-full h-full snap-start relative flex items-center justify-center bg-black overflow-hidden"
              style={{ minHeight: '100dvh' }}
            >
              {/* HTML5 Video */}
              {isNearActive ? (
                <video
                  ref={(el) => { videoRefs.current[video.id] = el; }}
                  src={video.videoUrl || '/videos/culinary-fallback.mp4'}
                  loop
                  playsInline
                  muted={isMuted}
                  onClick={toggleMute}
                  className="w-full h-full object-cover cursor-pointer select-none"
                  onError={(e) => {
                    if (e.currentTarget.src !== '/videos/culinary-fallback.mp4') {
                      e.currentTarget.src = '/videos/culinary-fallback.mp4';
                    }
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090B] text-zinc-500">
                  <div className="w-8 h-8 rounded-full border-2 border-[#FF5C00] border-t-transparent animate-spin mb-2" />
                  <p className="text-xs font-mono uppercase tracking-widest text-[#FF5C00]/80 font-black">FIDFUD LIVE</p>
                </div>
              )}

              {/* Streetwear Overlay Controls on Right Side (Lowered & shifted to prevent headers overlap) */}
              <div className="absolute right-3.5 bottom-28 z-20 flex flex-col items-center space-y-4">
                {/* Audio sound button */}
                <button 
                  onClick={toggleMute}
                  className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                >
                  {isMuted ? <VolumeX size={18} className="text-zinc-400" /> : <Volume2 size={18} className="text-[#FF5C00]" />}
                </button>

                {/* Like / Heart */}
                <div className="flex flex-col items-center">
                  <button 
                    onClick={(e) => handleLike(video.id, e)}
                    className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  >
                    <Heart size={18} className={isLiked ? 'text-[#FF3B30] fill-[#FF3B30]' : 'text-white'} />
                  </button>
                  <span className="text-[10px] font-black mt-1 text-zinc-300 drop-shadow-md">
                    {video.likesCount + (isLiked ? 1 : 0)}
                  </span>
                </div>

                {/* Comment */}
                <div className="flex flex-col items-center">
                  <button className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all">
                    <MessageSquare size={18} />
                  </button>
                  <span className="text-[10px] font-black mt-1 text-zinc-300 drop-shadow-md">{video.commentsCount}</span>
                </div>

                {/* Gift */}
                <div className="flex flex-col items-center">
                  <button className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all text-yellow-400">
                    <Gift size={18} />
                  </button>
                  <span className="text-[9px] uppercase tracking-wide font-bold mt-1 text-zinc-400">Cadeau</span>
                </div>

                {/* Share */}
                <div className="flex flex-col items-center">
                  <button className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all">
                    <Share2 size={18} />
                  </button>
                  <span className="text-[9px] uppercase tracking-wide font-bold mt-1 text-zinc-400">Partager</span>
                </div>

                {/* Custom Streetwear MENU button - triggers slide-up restaurant list */}
                <div className="flex flex-col items-center">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDrawerTab('menu');
                      setIsDrawerOpen(true);
                    }}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF5C00] to-orange-600 border border-white/20 flex items-center justify-center shadow-[0_0_15px_rgba(255,92,0,0.4)] hover:scale-105 active:scale-95 transition-all text-white"
                  >
                    <ShoppingBag size={18} className="animate-pulse" />
                  </button>
                  <span className="text-[9px] uppercase tracking-widest font-black mt-1 text-[#FF5C00] font-mono">MENU</span>
                </div>
              </div>

              {/* Bottom Metadata Panel */}
              <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 bg-gradient-to-t from-black via-black/50 to-transparent z-10 pointer-events-none">
                <div className="space-y-3 pointer-events-auto">
                  {/* Restaurant Row with Logo and Subscribe option */}
                  <div className="flex items-center space-x-2 flex-wrap">
                    {video.restaurantLogoUrl && (
                      <img 
                        src={video.restaurantLogoUrl} 
                        alt={video.restaurantName} 
                        className="w-6 h-6 rounded-full object-cover border border-white/30" 
                      />
                    )}
                    <span 
                      onClick={() => {
                        setDrawerTab('menu');
                        setIsDrawerOpen(true);
                      }}
                      className="text-xs font-black uppercase tracking-wider cursor-pointer hover:text-[#FF5C00] transition-colors"
                    >
                      {video.restaurantName}
                    </span>
                    <button 
                      onClick={() => setIsSubscribed(!isSubscribed)}
                      className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border transition-all ${
                        isSubscribed 
                          ? 'bg-white/10 text-zinc-400 border-white/10' 
                          : 'bg-transparent text-white border-white/50 hover:bg-white/10'
                      }`}
                    >
                      {isSubscribed ? 'Suivi' : 'Suivre'}
                    </button>
                  </div>

                  {/* Video Title description */}
                  <p className="text-xs font-medium leading-relaxed drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] max-w-[85%]">
                    {video.title}
                  </p>
                </div>
              </div>

              {/* Delayed Interactive Pop-Up (Order CTA) - Slides up from bottom center after 5s */}
              {hasDish && isActive && showOrderPopup && (
                <div className="absolute bottom-24 left-4 right-16 z-30 animate-slide-up pointer-events-auto">
                  <div className="bg-[#09090B]/95 backdrop-blur-xl border border-[#FF5C00]/40 rounded-2xl p-3 shadow-[0_4px_25px_rgba(255,92,0,0.25)] flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      {video.associatedDish?.imageUrl ? (
                        <img 
                          src={video.associatedDish.imageUrl} 
                          alt={video.associatedDish.name} 
                          className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0">🍔</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[8px] uppercase tracking-widest font-mono text-[#FF5C00] font-bold">SUGGESTION DU CHEF</span>
                        <h4 className="text-xs font-black uppercase tracking-tight text-white truncate">{video.associatedDish?.name}</h4>
                        <span className="text-[10px] font-mono text-[#FF5C00] font-black">{video.associatedDish?.price.toFixed(2)} €</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pl-2">
                      <button 
                        onClick={() => {
                          setDrawerTab('order');
                          setIsDrawerOpen(true);
                        }}
                        className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white text-[10px] font-black tracking-wider uppercase px-3.5 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-1 shrink-0"
                      >
                        <ShoppingBag size={10} />
                        <span>Commander</span>
                      </button>
                      <button 
                        onClick={() => setShowOrderPopup(false)}
                        className="text-zinc-500 hover:text-white p-1"
                        title="Dismiss"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Streetwear Slide-Up Culinary Drawer */}
      {isDrawerOpen && activeVideo && activeVideo.associatedDish && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setIsDrawerOpen(false)} />

          <div className="relative w-full max-w-md bg-[#0D0D0E] border-t border-white/10 rounded-t-[28px] overflow-hidden p-6 z-10 transition-all shadow-2xl flex flex-col max-h-[85vh]">
            {/* Drag Handle */}
            <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto mb-4" />

            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[9px] text-[#FF5C00] font-bold tracking-widest uppercase bg-[#FF5C00]/10 px-2.5 py-1 rounded">
                  {activeVideo.restaurantName}
                </span>
                <h3 className="text-base font-black text-white mt-2 tracking-tight uppercase italic">{activeVideo.associatedDish.name}</h3>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-full bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Sub-tabs inside drawer */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-black rounded-xl mb-4 border border-white/5 text-[10px] font-black uppercase font-mono tracking-wider">
              <button
                onClick={() => setDrawerTab('order')}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  drawerTab === 'order' ? 'bg-[#FF5C00] text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>Plat</span>
              </button>
              <button
                onClick={() => setDrawerTab('menu')}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  drawerTab === 'menu' ? 'bg-[#FF5C00] text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>Carte complète</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {drawerTab === 'order' ? (
                <div className="space-y-4">
                  {activeVideo.associatedDish.imageUrl && (
                    <img 
                      src={activeVideo.associatedDish.imageUrl} 
                      alt={activeVideo.associatedDish.name} 
                      className="w-full h-40 rounded-xl object-cover border border-white/5"
                    />
                  )}
                  <p className="text-zinc-400 text-xs leading-relaxed font-sans bg-black/40 p-3 rounded-xl border border-white/5">
                    {activeVideo.associatedDish.description || "Une création culinaire d'exception préparée avec ferveur par nos chefs."}
                  </p>

                  <div className="bg-black/60 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase font-black block">PRIX UNITAIRE</span>
                      <span className="text-base font-black text-[#FF5C00] font-mono">{activeVideo.associatedDish.price.toFixed(2)} €</span>
                    </div>

                    <div className="flex items-center space-x-2 bg-zinc-900 border border-white/5 rounded-xl p-1 font-mono">
                      <button 
                        onClick={() => setQuantity(q => q > 1 ? q - 1 : 1)}
                        className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-white px-2">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button className="w-full bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-black uppercase text-xs py-3.5 rounded-xl transition-all hover:scale-[1.01] flex items-center justify-center gap-2">
                    <ShoppingBag size={14} />
                    <span>Ajouter {(activeVideo.associatedDish.price * quantity).toFixed(2)} € au panier</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase font-mono text-[#FF5C00]">Spécialités de {activeVideo.restaurantName}</span>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center cursor-pointer hover:border-[#FF5C00]/30 transition-all">
                    <div>
                      <h4 className="text-xs font-black uppercase">{activeVideo.associatedDish.name}</h4>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{activeVideo.associatedDish.price.toFixed(2)} €</p>
                    </div>
                    <span className="text-[10px] bg-[#FF5C00]/10 text-[#FF5C00] border border-[#FF5C00]/20 font-black px-2 py-0.5 rounded">PLAT ACTUEL</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
