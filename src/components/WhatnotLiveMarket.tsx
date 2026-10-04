import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, 
  ShoppingBag, 
  Plus, 
  Check,
  Eye, 
  Heart, 
  Sparkles, 
  Clock, 
  MapPin, 
  Compass, 
  TrendingUp, 
  ChefHat, 
  UtensilsCrossed, 
  MessageSquare,
  Gift,
  Flame,
  Award,
  Volume2,
  VolumeX,
  ShieldCheck
} from 'lucide-react';
import { Video, Restaurant, Dish, User } from '../types';
import { CATEGORY_LIST } from '../constants/categories';
import BackgroundVideoPlayer from './BackgroundVideoPlayer';
import { STABLE_CULINARY_FALLBACK_VIDEOS } from '../utils/videoUtils';

const STABLE_CULINARY_VIDEOS = STABLE_CULINARY_FALLBACK_VIDEOS;

interface WhatnotLiveMarketProps {
  videos: Video[];
  restaurants: Restaurant[];
  dishes: Dish[];
  user: User | null;
  searchQuery: string;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onSelectDish: (dishId: string) => void;
  onSelectLiveVideo?: (videoId: string) => void;
  onAddToCart: (dish: Dish, quantity: number) => void;
  onOpenAuth: () => void;
  accentColor: string;
  designSettings: any;
}

export const WhatnotLiveMarket: React.FC<WhatnotLiveMarketProps> = ({
  videos,
  restaurants,
  dishes,
  user,
  searchQuery,
  selectedCategory,
  onSelectCategory,
  onSelectDish,
  onSelectLiveVideo,
  onAddToCart,
  onOpenAuth,
  accentColor,
  designSettings
}) => {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>({});
  const [watcherCounts, setWatcherCounts] = useState<Record<string, number>>({});
  const [marketFilter, setMarketFilter] = useState<'all' | 'live' | 'promo' | 'popular'>('all');

  // Initialize and periodically fluctuate fake but realistic watcher counts for livestreams
  useEffect(() => {
    const initialCounts: Record<string, number> = {};
    videos.forEach(v => {
      // Deterministic starting watchers based on video id hash
      let hash = 0;
      for (let i = 0; i < v.id.length; i++) {
        hash = v.id.charCodeAt(i) + ((hash << 5) - hash);
      }
      initialCounts[v.id] = Math.abs(hash % 90) + 8; // 8 to 98 watchers
    });
    setWatcherCounts(initialCounts);

    const interval = setInterval(() => {
      setWatcherCounts(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          const delta = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, 1, 2
          next[id] = Math.max(3, next[id] + delta);
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [videos]);

  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const toggleLike = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedVideos(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }));
  };

  const handleQuickAdd = (dish: Dish, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(dish, 1);
    setAddedItemIds(prev => ({ ...prev, [dish.id]: true }));
    setTimeout(() => {
      setAddedItemIds(prev => ({ ...prev, [dish.id]: false }));
    }, 1000);
  };

  // List of interactive categories (similar to Whatnot's sidebar)
  const sidebarCategories = [
    { id: '', label: 'Pour toi', icon: '🔥' },
    ...CATEGORY_LIST.map(c => ({ id: c.id, label: c.id, icon: c.icon }))
  ];

  const [unmutedCardIds, setUnmutedCardIds] = useState<string[]>([]);

  // Build complete video list sorted by createdAt descending (newest videos first, like Instagram/TikTok)
  const rawVideos = videos && videos.length > 0 ? videos : [];
  
  const effectiveVideos = useMemo(() => {
    // Only use actual videos provided in props. If rawVideos is empty, build initial feed from restaurants with videoUrl.
    const list: Video[] = [...rawVideos];

    if (list.length === 0 && restaurants && restaurants.length > 0) {
      restaurants.forEach((rest, rIdx) => {
        if (rest.videoUrl) {
          list.push({
            id: `market_vid_rest_${rest.id}`,
            restaurantId: rest.id,
            restaurantName: rest.name,
            title: `🔴 EN DIRECT: Démonstration et Préparation chez ${rest.name}`,
            description: rest.description || `Retrouvez les créations gourmandes de ${rest.name} en direct.`,
            videoUrl: rest.videoUrl,
            likesCount: 88 + rIdx * 15,
            viewsCount: 1200 + rIdx * 230,
            isLiveContinuous: true,
            isOnline: true,
            createdAt: rest.createdAt || new Date(Date.now() - (rIdx + 1) * 15 * 60 * 1000).toISOString()
          });
        }
      });
    }

    // Ensure EVERY video has a valid videoUrl
    list.forEach((v, idx) => {
      if (!v.videoUrl || v.videoUrl.trim() === '') {
        v.videoUrl = STABLE_CULINARY_VIDEOS[idx % STABLE_CULINARY_VIDEOS.length];
      }
    });

    // Sort strictly by createdAt descending (newest videos first)
    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return list;
  }, [rawVideos, restaurants]);

  // Helper to match videos with their category
  const filteredVideos = effectiveVideos.filter(video => {
    const restaurant = restaurants.find(r => r.id === video.restaurantId);
    const dish = dishes.find(d => d.id === video.associatedDishId || d.restaurantId === video.restaurantId);
    
    // 1. Search Query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = video.title.toLowerCase().includes(q);
      const matchRest = restaurant?.name.toLowerCase().includes(q);
      const matchDish = dish?.name.toLowerCase().includes(q) || dish?.description.toLowerCase().includes(q);
      if (!matchTitle && !matchRest && !matchDish) return false;
    }

    // 2. Sidebar category filtering
    if (selectedCategory) {
      const catLower = selectedCategory.toLowerCase();
      const matchRestCat = restaurant?.category?.toLowerCase() === catLower;
      const matchDishName = dish?.name.toLowerCase().includes(catLower) || dish?.description.toLowerCase().includes(catLower);
      if (!matchRestCat && !matchDishName) return false;
    }

    // 3. Horizontal mini filters
    if (marketFilter === 'live') {
      return true;
    } else if (marketFilter === 'promo') {
      return !!restaurant?.promoMessage || !!video.promoOverlay;
    } else if (marketFilter === 'popular') {
      return (video.likesCount || 0) > 10;
    }

    return true;
  });

  const loggedInUserEmail = user?.email || 'imado94@whatnot.fr';
  const username = loggedInUserEmail.split('@')[0];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6 font-sans select-none">
      
      {/* 1. Left Responsive Sidebar (Whatnot Aesthetic) */}
      <aside className="w-full md:w-60 lg:w-64 shrink-0 flex flex-col gap-4 md:gap-5">
        {/* User Card Greeting */}
        <div className="bg-zinc-950/40 backdrop-blur-md border border-white/5 rounded-3xl p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center font-black text-zinc-950 text-xs shadow-md">
              {username.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Apprenant Gourmet</p>
              <h3 className="text-xs md:text-sm font-black text-white truncate">Bonjour {username} !</h3>
            </div>
          </div>
          
          {/* Quick status bar - ultra compact */}
          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/5">
            <div className="flex-1 bg-zinc-900/60 py-1.5 px-2 rounded-xl border border-white/5 flex flex-col items-center justify-center">
              <span className="text-[7.5px] font-black uppercase text-zinc-500 font-mono tracking-wider">Points</span>
              <span className="text-xs font-black text-amber-400 font-mono">450 XP</span>
            </div>
            <div className="flex-1 bg-zinc-900/60 py-1.5 px-2 rounded-xl border border-white/5 flex flex-col items-center justify-center">
              <span className="text-[7.5px] font-black uppercase text-zinc-500 font-mono tracking-wider">Séries</span>
              <span className="text-xs font-black text-[#FF5C00] font-mono">🔥 5 j</span>
            </div>
          </div>
        </div>

        {/* Sidebar categories navigation */}
        <div className="bg-zinc-950/40 backdrop-blur-md border border-white/5 rounded-3xl p-3 md:p-4 space-y-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1 px-1">
            <h4 className="text-[9px] text-zinc-400 font-black uppercase tracking-wider font-mono">Catégories Culinary</h4>
            {selectedCategory && (
              <button 
                onClick={() => onSelectCategory('')} 
                className="text-[9px] text-[#FF5C00] font-black uppercase tracking-wider hover:underline"
              >
                Tout voir
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 md:flex md:flex-col md:gap-1.5">
            {sidebarCategories.map((cat) => {
              const isSel = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 md:py-2 rounded-xl text-left text-[11px] font-black uppercase tracking-wide transition-all ${
                    isSel 
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-lg shadow-amber-500/10 scale-[1.02]' 
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm shrink-0">{cat.icon}</span>
                  <span className="truncate text-ellipsis overflow-hidden whitespace-nowrap">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Brand Information Footer */}
        <div className="hidden lg:block bg-zinc-950/20 p-4 rounded-2xl border border-white/2 space-y-3">
          <div className="flex flex-wrap gap-x-2.5 gap-y-1.5 text-[9.5px] text-zinc-500 font-bold uppercase tracking-wider font-mono">
            <a href="#blog" className="hover:text-zinc-400 transition-colors">Blog</a>
            <span>•</span>
            <a href="#careers" className="hover:text-zinc-400 transition-colors">Carrières</a>
            <span>•</span>
            <a href="#about" className="hover:text-zinc-400 transition-colors">À propos</a>
            <span>•</span>
            <a href="#faq" className="hover:text-zinc-400 transition-colors">FAQ</a>
            <span>•</span>
            <a href="#affiliates" className="hover:text-zinc-400 transition-colors">Affiliés</a>
            <span>•</span>
            <a href="#privacy" className="hover:text-zinc-400 transition-colors">Confidentialité</a>
            <span>•</span>
            <a href="#terms" className="hover:text-zinc-400 transition-colors">Conditions</a>
          </div>
          <p className="text-[9px] text-zinc-600 font-medium font-sans mt-2">
            © 2026 {designSettings?.appName || 'Fidfud'} Gourmet Inc. Inspiré par Whatnot.
          </p>
        </div>
      </aside>

      {/* 2. Main Live Streams Marketplace Area */}
      <div className="flex-1 space-y-6">
        
        {/* Horizontal Mini Filters Bar */}
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 scrollbar-none border-b border-white/5">
          <div className="flex items-center gap-2 shrink-0">
            {[
              { id: 'all', label: 'Tous les Lives 🔴' },
              { id: 'live', label: 'En direct ✨' },
              { id: 'promo', label: 'Offres Spéciales %' },
              { id: 'popular', label: 'Tendances 🔥' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setMarketFilter(filter.id as any)}
                className={`px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                  marketFilter === filter.id 
                    ? 'bg-white text-zinc-950 border-white font-black' 
                    : 'bg-zinc-950/40 text-zinc-400 border-white/5 hover:border-white/10 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="text-[10px] text-zinc-500 font-mono font-bold shrink-0">
            {filteredVideos.length} live{filteredVideos.length > 1 ? 's' : ''} trouvé{filteredVideos.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Live Grid */}
        {filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredVideos.map((video, vIdx) => {
              const restaurant = restaurants.find(r => r.id === video.restaurantId);
              const dish = dishes.find(d => d.id === video.associatedDishId || d.restaurantId === video.restaurantId);
              const watchers = watcherCounts[video.id] || 15;
              const isLiked = !!likedVideos[video.id];
              const isHovered = hoveredCardId === video.id;
              const isUnmuted = unmutedCardIds.includes(video.id);
              const cardVideoUrl = video.videoUrl || restaurant?.videoUrl || STABLE_CULINARY_VIDEOS[vIdx % STABLE_CULINARY_VIDEOS.length];

              return (
                <div
                  key={video.id}
                  onClick={() => onSelectLiveVideo ? onSelectLiveVideo(video.id) : (dish && onSelectDish(dish.id))}
                  onMouseEnter={() => setHoveredCardId(video.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  className="bg-zinc-950/60 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden hover:border-amber-500/50 transition-all group/card flex flex-col justify-between cursor-pointer hover:shadow-2xl hover:shadow-[#FF5C00]/10 hover:-translate-y-0.5 duration-300 relative"
                >
                  
                  {/* Top Bar inside the Card: Host details */}
                  <div className="p-3.5 flex items-center justify-between border-b border-white/5 bg-zinc-950/40 z-10">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-zinc-900 border border-white/15 overflow-hidden flex items-center justify-center shrink-0">
                        {restaurant?.logoUrl ? (
                          <img src={restaurant.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <ChefHat size={14} className="text-amber-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className="text-[11px] font-black text-white truncate uppercase tracking-wider">{restaurant?.name || 'Chef Gourmet'}</h4>
                          <ShieldCheck size={12} className="text-amber-400 shrink-0" />
                        </div>
                        <p className="text-[9px] text-zinc-400 truncate font-sans">{restaurant?.category || 'Culinary Art'}</p>
                      </div>
                    </div>

                    {/* Like button on top bar */}
                    <button
                      onClick={(e) => toggleLike(video.id, e)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        isLiked 
                          ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                          : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Heart size={11} className={isLiked ? 'fill-current' : ''} />
                    </button>
                  </div>

                  {/* Looping Video Background Canvas */}
                  <div className="aspect-[4/3] w-full bg-black relative overflow-hidden group-hover/card:brightness-105 transition-all">
                    <BackgroundVideoPlayer
                      src={cardVideoUrl}
                      isPlaying={true}
                      isMuted={!isUnmuted}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                    />

                    {/* Top & Bottom Gradients for Contrast */}
                    <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

                    {/* Audio Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUnmutedCardIds(prev => 
                          prev.includes(video.id) ? prev.filter(id => id !== video.id) : [...prev, video.id]
                        );
                      }}
                      className={`absolute top-3.5 right-3.5 z-20 p-1.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                        isUnmuted 
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg scale-105' 
                          : 'bg-black/60 text-zinc-300 hover:text-white border-white/10 hover:bg-black/80'
                      }`}
                      title={isUnmuted ? "Couper le son" : "Activer le son en direct"}
                    >
                      {isUnmuted ? <Volume2 size={13} /> : <VolumeX size={13} />}
                    </button>

                    {/* RED LIVE BADGE (Animated pulsing) */}
                    <div className="absolute top-3.5 left-3.5 bg-red-600 text-white font-mono font-black text-[9.5px] uppercase tracking-wider px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg shadow-red-900/30 z-10">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white absolute" />
                      <span>Live • {watchers}</span>
                    </div>

                    {/* Promo pill inside cover if exists */}
                    {(restaurant?.promoMessage || video.promoOverlay) && (
                      <div className="absolute bottom-3.5 left-3.5 z-10 bg-amber-500 text-zinc-950 font-mono font-black text-[8.5px] uppercase tracking-widest px-2 py-0.5 rounded-md shadow-lg border border-amber-400">
                        {restaurant?.promoMessage || video.promoOverlay}
                      </div>
                    )}

                    {/* Interactive overlay on hover */}
                    {isHovered && (
                      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center transition-all duration-300 pointer-events-none">
                        <div className="w-11 h-11 rounded-full bg-[#FF5C00] text-white flex items-center justify-center shadow-lg transform scale-110 duration-200">
                          <Play size={16} className="fill-current ml-0.5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stream Info & Commerce Panel */}
                  <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black text-white leading-snug line-clamp-2 uppercase tracking-wide">
                        {video.title}
                      </h3>
                      {dish && (
                        <p className="text-[10px] text-zinc-400 font-sans line-clamp-1 leading-normal">
                          Préparation : <span className="text-zinc-300 font-medium">{dish.name}</span>
                        </p>
                      )}
                    </div>

                    {/* Live Bid / Buy Box */}
                    {dish && (
                      <div className="p-2.5 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[7.5px] font-black uppercase text-zinc-500 font-mono tracking-wider">Prix</span>
                            <Award size={9} className="text-amber-500" />
                          </div>
                          <p className="text-xs font-black text-amber-400 font-mono">{dish.price.toFixed(2)} €</p>
                        </div>

                        {/* Buy Instant Button */}
                        <button
                          onClick={(e) => handleQuickAdd(dish, e)}
                          style={{ backgroundColor: addedItemIds[dish.id] ? '#10B981' : accentColor }}
                          className={`p-2 rounded-xl text-zinc-950 font-black uppercase tracking-wider text-[10px] hover:scale-105 active:scale-90 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-md shadow-black/40 ${
                            addedItemIds[dish.id] ? 'animate-button-pop text-white bg-emerald-500' : ''
                          }`}
                          title="Ajouter directement au panier"
                        >
                          {addedItemIds[dish.id] ? (
                            <Check size={14} className="text-white font-black animate-count-pop" />
                          ) : (
                            <Plus size={14} className="text-zinc-950 font-black" />
                          )}
                        </button>
                      </div>
                    )}

                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Search or Filters State */
          <div className="p-12 text-center rounded-3xl border border-dashed border-white/5 bg-zinc-950/20 space-y-3.5">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 mx-auto">
              <Compass size={22} className="animate-spin text-amber-500" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Aucun Live Gourmet trouvé</h4>
              <p className="text-[10px] text-zinc-500 max-w-md mx-auto mt-0.5 font-sans leading-normal">
                Aucun restaurateur ne diffuse pour la catégorie ou recherche sélectionnée. Saisissez d'autres critères ou explorez les catégories du menu latéral.
              </p>
            </div>
            <button
              onClick={() => {
                onSelectCategory('');
                setMarketFilter('all');
              }}
              className="text-[10px] font-black bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-white px-4 py-2 rounded-xl uppercase tracking-wider transition-colors"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}

      </div>

    </div>
  );
};

export default WhatnotLiveMarket;
