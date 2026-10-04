"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  ShoppingBag,
  Play,
  Pause,
  ChevronDown,
  Loader2,
  Sparkles,
  Music,
  Check
} from 'lucide-react';

export interface VideoItem {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  restaurantName?: string;
  restaurantAvatar?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount?: number;
  tags?: string[];
  dish?: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
}

// Initial high quality placeholder video dataset
export const DEFAULT_PLACEHOLDER_VIDEOS: VideoItem[] = [
  {
    id: 'vid-burger-1',
    title: 'Double Smash Burger Truffe & Cheddar Affiné 🍔🔥',
    description: 'Double steak Black Angus smashé à chaud, cheddar maturé 12 mois et sauce secrète.',
    videoUrl: '/videos/culinary-1.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
    restaurantName: 'Smashed Lab Paris',
    restaurantAvatar: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=120',
    likesCount: 2450,
    commentsCount: 128,
    sharesCount: 94,
    tags: ['#Burger', '#FoodPorn', '#StreetFood'],
    dish: {
      id: 'dish-smash-1',
      name: 'Smash Truffe Deluxe',
      price: 14.90,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'
    }
  },
  {
    id: 'vid-pizza-2',
    title: 'Napoletana au four à bois 450°C & Burrata 🍕🇮🇹',
    description: 'Pâte fermentée 48 heures, sauce tomate San Marzano DOP et burrata crémeuse.',
    videoUrl: '/videos/culinary-2.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
    restaurantName: 'Nonna Napoletana',
    restaurantAvatar: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=120',
    likesCount: 3820,
    commentsCount: 215,
    sharesCount: 160,
    tags: ['#Pizza', '#Napoli', '#ItalianFood'],
    dish: {
      id: 'dish-pizza-2',
      name: 'Pizza Regina Burrata',
      price: 16.50,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400'
    }
  },
  {
    id: 'vid-ramen-3',
    title: 'Ramen Tonkotsu mijoté 18 heures 🍜🍥',
    description: 'Bouillon crémeux traditionnel, huile d\'ail noir fumé et œuf tamago coulant.',
    videoUrl: '/videos/culinary-3.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
    restaurantName: 'Tokyo Ramen Bar',
    restaurantAvatar: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=120',
    likesCount: 1890,
    commentsCount: 94,
    sharesCount: 72,
    tags: ['#Ramen', '#JapaneseFood', '#Tokyo'],
    dish: {
      id: 'dish-ramen-3',
      name: 'Tonkotsu Black Garlic Ramen',
      price: 15.90,
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400'
    }
  }
];

// Mock API generator for infinite scroll pagination
export const fetchMockVideosPage = async (page: number, limit: number = 3): Promise<VideoItem[]> => {
  // Simulate network latency (400ms)
  await new Promise((resolve) => setTimeout(resolve, 400));

  const templates = [
    {
      title: 'Tacos Birria au jus mijoté épicé 🌮🇲🇽',
      desc: 'Viande de boeuf fondante cuite 8h au piment doux avec consomé pour tremper.',
      rest: 'El Patron Tacos',
      tag: ['#Tacos', '#Birria', '#Mexican'],
      dishName: 'Tacos Birria x3 & Consomé',
      price: 13.50,
      url: '/videos/culinary-4.mp4',
      img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800'
    },
    {
      title: 'Pancakes Soufflés Japonais extra moelleux 🥞✨',
      desc: 'Pancakes ultra aériens avec coulis de fruits rouges et sirop d\'érable pur.',
      rest: 'Sweet Fluffy Tokyo',
      tag: ['#Dessert', '#Pancakes', '#Fluffy'],
      dishName: 'Fluffy Souffle Pancakes',
      price: 11.00,
      url: '/videos/culinary-5.mp4',
      img: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800'
    },
    {
      title: 'Côte de Boeuf Tomahawk Flambée au Romarin 🥩🔥',
      desc: 'Viande maturée 45 jours saisie à la flamme et beurre aux herbes fraîches.',
      rest: 'Steakhouse Atelier',
      tag: ['#Steak', '#MeatLover', '#Grill'],
      dishName: 'Tomahawk Steak 1.2kg',
      price: 48.00,
      url: '/videos/culinary-2.mp4',
      img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'
    }
  ];

  return Array.from({ length: limit }).map((_, i) => {
    const idx = (page * limit + i) % templates.length;
    const t = templates[idx];
    const uniqueId = `vid-mock-p${page}-i${i}-${Date.now()}`;
    return {
      id: uniqueId,
      title: t.title,
      description: t.desc,
      videoUrl: t.url,
      thumbnailUrl: t.img,
      restaurantName: t.rest,
      restaurantAvatar: t.img,
      likesCount: Math.floor(Math.random() * 1500) + 300,
      commentsCount: Math.floor(Math.random() * 90) + 15,
      sharesCount: Math.floor(Math.random() * 50) + 5,
      tags: t.tag,
      dish: {
        id: `dish-${uniqueId}`,
        name: t.dishName,
        price: t.price,
        image: t.img
      }
    };
  });
};

export interface VideoFeedProps {
  initialVideos?: VideoItem[];
  fetchVideos?: (page: number) => Promise<VideoItem[]>;
  apiEndpoint?: string;
  onOrderClick?: (dish: NonNullable<VideoItem['dish']>, video: VideoItem) => void;
  className?: string;
}

export default function VideoFeed({
  initialVideos = DEFAULT_PLACEHOLDER_VIDEOS,
  fetchVideos,
  apiEndpoint,
  onOrderClick,
  className = ''
}: VideoFeedProps) {
  const [videos, setVideos] = useState<VideoItem[]>(initialVideos);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [page, setPage] = useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [showHeartAnim, setShowHeartAnim] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const lastTapRef = useRef<{ time: number; id: string }>({ time: 0, id: '' });

  // Initialize initial likes map
  useEffect(() => {
    const counts: Record<string, number> = {};
    videos.forEach((v) => {
      if (counts[v.id] === undefined) {
        counts[v.id] = v.likesCount;
      }
    });
    setLikesCountMap((prev) => ({ ...counts, ...prev }));
  }, [videos]);

  // IntersectionObserver to auto-detect active full-screen video
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index') || '0');
            setActiveIndex(index);
            setIsPlaying(true);
          }
        });
      },
      {
        root: container,
        threshold: 0.65 // Trigger when >65% is in viewport
      }
    );

    const videoElements = container.querySelectorAll('[data-video-card]');
    videoElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [videos]);

  // Handle Play/Pause and Muting across videos when active index changes
  useEffect(() => {
    videos.forEach((video, idx) => {
      const el = videoRefs.current[video.id];
      if (!el) return;

      if (idx === activeIndex) {
        el.muted = isMuted;
        if (isPlaying) {
          el.currentTime = 0;
          el.play().catch(() => {
            // Autoplay with sound might be blocked, fallback to muted play
            el.muted = true;
            setIsMuted(true);
            el.play().catch(() => {});
          });
        } else {
          el.pause();
        }
      } else {
        el.pause();
      }
    });
  }, [activeIndex, videos, isMuted, isPlaying]);

  // Handle Tab Focus & Visibility
  useEffect(() => {
    const handleVisibility = () => {
      const activeVideo = videos[activeIndex];
      if (!activeVideo) return;
      const el = videoRefs.current[activeVideo.id];
      if (!el) return;

      if (document.hidden) {
        el.pause();
      } else if (isPlaying) {
        el.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activeIndex, isPlaying, videos]);

  // Keyboard navigation (Arrow Up / Arrow Down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToIndex(activeIndex - 1);
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, videos.length]);

  const scrollToIndex = (index: number) => {
    if (index < 0 || index >= videos.length || !containerRef.current) return;
    const targetEl = containerRef.current.querySelector(`[data-index="${index}"]`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Toggle Global Mute State
  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videos.forEach((v) => {
      const el = videoRefs.current[v.id];
      if (el) el.muted = nextMuted;
    });
  };

  // Toggle Play / Pause for active video
  const togglePlayPause = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const activeVideo = videos[activeIndex];
    if (!activeVideo) return;
    const el = videoRefs.current[activeVideo.id];
    if (!el) return;

    if (el.paused) {
      el.play().catch(() => {});
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  // Double Tap to Like
  const handleCardTap = (videoId: string, e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (lastTapRef.current.id === videoId && now - lastTapRef.current.time < DOUBLE_TAP_DELAY) {
      // Trigger Double Tap Like
      triggerLike(videoId, true);
      setShowHeartAnim(videoId);
      setTimeout(() => setShowHeartAnim(null), 800);
    } else {
      // Single Tap: Play / Pause toggle
      togglePlayPause(e);
    }
    lastTapRef.current = { time: now, id: videoId };
  };

  const triggerLike = (videoId: string, forceLike: boolean = false) => {
    const currentlyLiked = !!likedMap[videoId];
    const nextLiked = forceLike ? true : !currentlyLiked;

    if (nextLiked !== currentlyLiked) {
      setLikedMap((prev) => ({ ...prev, [videoId]: nextLiked }));
      setLikesCountMap((prev) => ({
        ...prev,
        [videoId]: (prev[videoId] || 0) + (nextLiked ? 1 : -1)
      }));
    }
  };

  const toggleSave = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedMap((prev) => ({ ...prev, [videoId]: !prev[videoId] }));
  };

  // Infinite Scroll Handler
  const handleScroll = useCallback(async () => {
    const container = containerRef.current;
    if (!container || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // When within 1.5 screen heights from bottom, load next batch
    if (scrollHeight - (scrollTop + clientHeight) < clientHeight * 1.5) {
      setIsLoadingMore(true);
      try {
        let newVideos: VideoItem[] = [];

        if (fetchVideos) {
          newVideos = await fetchVideos(page + 1);
        } else if (apiEndpoint) {
          const res = await fetch(`${apiEndpoint}?page=${page + 1}&limit=3`);
          if (res.ok) {
            const data = await res.json();
            newVideos = Array.isArray(data) ? data : data.videos || [];
          }
        } else {
          // Default: Fetch from built-in mock API generator
          newVideos = await fetchMockVideosPage(page + 1, 3);
        }

        if (newVideos && newVideos.length > 0) {
          setVideos((prev) => {
            const existingIds = new Set(prev.map((v) => v.id));
            const filtered = newVideos.filter((v) => !existingIds.has(v.id));
            return [...prev, ...filtered];
          });
          setPage((prev) => prev + 1);
        } else {
          setHasMore(false);
        }
      } catch (err) {
        console.error('Error fetching more videos:', err);
      } finally {
        setIsLoadingMore(false);
      }
    }
  }, [isLoadingMore, hasMore, fetchVideos, apiEndpoint, page]);

  return (
    <div
      className={`relative w-full h-[100dvh] bg-[#09090B] overflow-hidden text-white flex items-center justify-center select-none font-sans ${className}`}
    >
      {/* Vertically Scrolling Video Container with Snap Mandatory */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full max-w-md bg-black relative overflow-y-scroll snap-y snap-mandatory scrollbar-none"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {videos.map((video, idx) => {
          const isLiked = !!likedMap[video.id];
          const isSaved = !!savedMap[video.id];
          const isActive = idx === activeIndex;
          const isNear = Math.abs(idx - activeIndex) <= 1;
          const likesCount = likesCountMap[video.id] ?? video.likesCount;

          return (
            <div
              key={video.id}
              data-index={idx}
              data-video-card
              className="w-full h-full snap-start relative flex items-center justify-center bg-black overflow-hidden"
              style={{ minHeight: '100dvh' }}
              onClick={(e) => handleCardTap(video.id, e)}
            >
              {/* Video Element (rendered for active and neighboring videos for smooth scrolling) */}
              {isNear ? (
                <video
                  ref={(el) => {
                    videoRefs.current[video.id] = el;
                  }}
                  src={video.videoUrl || '/videos/culinary-fallback.mp4'}
                  poster={video.thumbnailUrl}
                  loop
                  playsInline
                  muted={isMuted}
                  className="w-full h-full object-cover cursor-pointer"
                  onError={(e) => {
                    if (e.currentTarget.src !== '/videos/culinary-fallback.mp4') {
                      e.currentTarget.src = '/videos/culinary-fallback.mp4';
                    }
                  }}
                />
              ) : (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${video.thumbnailUrl || ''})` }}
                />
              )}

              {/* Dark Gradient Overlay for optimal text legibility */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none z-10" />

              {/* Play / Pause Indicator on Tap */}
              {!isPlaying && isActive && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 animate-scale-in">
                    <Play size={28} className="translate-x-0.5 fill-white" />
                  </div>
                </div>
              )}

              {/* Double Tap Floating Heart Animation */}
              {showHeartAnim === video.id && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                  <Heart size={84} className="text-[#FF3B30] fill-[#FF3B30] animate-ping opacity-90 drop-shadow-2xl" />
                </div>
              )}

              {/* Top Navigation & Live Header */}
              <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-[#FF5C00] animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-white">LIVE FEED</span>
                </div>

                <button
                  id="btn-toggle-mute"
                  onClick={toggleMute}
                  className="pointer-events-auto w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all text-white"
                  title={isMuted ? 'Activer le son' : 'Couper le son'}
                >
                  {isMuted ? <VolumeX size={16} className="text-zinc-400" /> : <Volume2 size={16} className="text-[#FF5C00]" />}
                </button>
              </div>

              {/* Right Action Bar (TikTok / Reels Style) */}
              <div className="absolute right-3.5 bottom-24 z-20 flex flex-col items-center gap-4 pointer-events-auto">
                {/* Creator Avatar */}
                {video.restaurantAvatar && (
                  <div className="relative mb-1">
                    <img
                      src={video.restaurantAvatar}
                      alt={video.restaurantName || 'Restaurant'}
                      className="w-11 h-11 rounded-full object-cover border-2 border-[#FF5C00] shadow-lg"
                    />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#FF5C00] text-white rounded-full p-0.5 shadow-sm">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  </div>
                )}

                {/* Like Button */}
                <div className="flex flex-col items-center">
                  <button
                    id={`btn-like-${video.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerLike(video.id);
                    }}
                    className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 ${
                      isLiked
                        ? 'bg-[#FF3B30]/20 border-[#FF3B30]/40 text-[#FF3B30]'
                        : 'bg-black/50 border-white/15 text-white hover:bg-black/70'
                    }`}
                  >
                    <Heart size={20} className={isLiked ? 'fill-[#FF3B30] text-[#FF3B30]' : 'text-white'} />
                  </button>
                  <span className="text-[11px] font-bold mt-1 text-zinc-200 drop-shadow">
                    {likesCount > 999 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}
                  </span>
                </div>

                {/* Comments Button */}
                <div className="flex flex-col items-center">
                  <button
                    id={`btn-comment-${video.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/70 active:scale-90 transition-all"
                  >
                    <MessageSquare size={20} />
                  </button>
                  <span className="text-[11px] font-bold mt-1 text-zinc-200 drop-shadow">
                    {video.commentsCount}
                  </span>
                </div>

                {/* Bookmark / Save Button */}
                <div className="flex flex-col items-center">
                  <button
                    id={`btn-save-${video.id}`}
                    onClick={(e) => toggleSave(video.id, e)}
                    className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 ${
                      isSaved
                        ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                        : 'bg-black/50 border-white/15 text-white hover:bg-black/70'
                    }`}
                  >
                    <Bookmark size={20} className={isSaved ? 'fill-yellow-400 text-yellow-400' : 'text-white'} />
                  </button>
                  <span className="text-[10px] font-medium mt-1 text-zinc-400">Favoris</span>
                </div>

                {/* Share Button */}
                <div className="flex flex-col items-center">
                  <button
                    id={`btn-share-${video.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (navigator.share) {
                        navigator.share({ title: video.title, url: window.location.href }).catch(() => {});
                      }
                    }}
                    className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/70 active:scale-90 transition-all"
                  >
                    <Share2 size={20} />
                  </button>
                  <span className="text-[10px] font-medium mt-1 text-zinc-400">Partager</span>
                </div>
              </div>

              {/* Bottom Video Metadata & Dish CTA Banner */}
              <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 z-20 pointer-events-none">
                <div className="space-y-2.5 max-w-[78%] pointer-events-auto">
                  {/* Restaurant Name Header */}
                  {video.restaurantName && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black uppercase tracking-wider text-white bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
                        @{video.restaurantName}
                      </span>
                    </div>
                  )}

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight drop-shadow-md">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-xs text-zinc-300 line-clamp-2 mt-1 leading-relaxed drop-shadow">
                        {video.description}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  {video.tags && video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {video.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="text-[11px] font-bold text-[#FF5C00] hover:underline cursor-pointer">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Associated Dish Order CTA Card */}
                  {video.dish && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOrderClick) {
                          onOrderClick(video.dish!, video);
                        }
                      }}
                      className="bg-black/70 backdrop-blur-xl border border-orange-500/40 hover:border-[#FF5C00] rounded-xl p-2 flex items-center justify-between gap-2 shadow-xl cursor-pointer transition-all hover:scale-102"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {video.dish.image ? (
                          <img
                            src={video.dish.image}
                            alt={video.dish.name}
                            className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 text-base">
                            🍔
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase text-white truncate">{video.dish.name}</p>
                          <p className="text-[10px] font-mono text-[#FF5C00] font-bold">{video.dish.price.toFixed(2)} €</p>
                        </div>
                      </div>

                      <button className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0 shadow-md">
                        <ShoppingBag size={11} />
                        <span>Commander</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Infinite Scroll Loading Spinner */}
        {isLoadingMore && (
          <div className="w-full py-8 flex items-center justify-center bg-black snap-start text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF5C00] mr-2" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest">Chargement des vidéos...</span>
          </div>
        )}
      </div>
    </div>
  );
}
