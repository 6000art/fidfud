import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, 
  X, 
  ChefHat, 
  Star, 
  MapPin, 
  UtensilsCrossed, 
  ExternalLink, 
  Trash2, 
  Search, 
  Sparkles, 
  Clock, 
  ShoppingBag,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Restaurant, Dish } from '../types';
import { notify } from '../utils/notify';

interface FavoritesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  restaurants: Restaurant[];
  dishes: Dish[];
  onOpenDish: (dishId: string, initialTab?: 'order' | 'menu' | 'reviews' | 'reserve') => void;
  onOpenAuth: () => void;
}

export default function FavoritesDrawer({
  isOpen,
  onClose,
  user,
  restaurants,
  dishes,
  onOpenDish,
  onOpenAuth
}: FavoritesDrawerProps) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync favorites from API / localStorage
  const loadFavorites = () => {
    try {
      const local = JSON.parse(localStorage.getItem('fidfud_followed_chefs') || '[]');
      const userSaved = user?.savedRestaurantIds || user?.favoriteRestaurantIds || [];
      const combined = Array.from(new Set([...local, ...userSaved])) as string[];
      setFavoriteIds(combined);
    } catch (e) {
      setFavoriteIds([]);
    }

    if (user?.id) {
      setLoading(true);
      fetch(`/api/users/${user.id}/favorites`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.savedRestaurantIds)) {
            setFavoriteIds(data.savedRestaurantIds);
          }
        })
        .catch(err => console.warn('Could not fetch user favorites:', err))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFavorites();
    }
  }, [isOpen, user?.id, user?.savedRestaurantIds]);

  // Real-time event listener for follow/unfollow updates
  useEffect(() => {
    const handleUpdated = (e: any) => {
      const detail = e.detail;
      if (detail && detail.restaurantId) {
        if (detail.isFollowing) {
          setFavoriteIds(prev => Array.from(new Set([...prev, detail.restaurantId])));
        } else {
          setFavoriteIds(prev => prev.filter(id => id !== detail.restaurantId));
        }
      }
    };
    window.addEventListener('fidfud-favorites-updated', handleUpdated);
    return () => window.removeEventListener('fidfud-favorites-updated', handleUpdated);
  }, []);

  const handleToggleFollow = async (restaurantId: string, restaurantName: string) => {
    if (!user) {
      notify('Connexion requise', 'Connectez-vous pour gérer vos favoris ❤️', 'info');
      onOpenAuth();
      return;
    }

    const isCurrentlyFav = favoriteIds.includes(restaurantId);
    const updated = isCurrentlyFav 
      ? favoriteIds.filter(id => id !== restaurantId) 
      : [...favoriteIds, restaurantId];
    
    setFavoriteIds(updated);
    localStorage.setItem('fidfud_followed_chefs', JSON.stringify(updated));

    try {
      const res = await fetch(`/api/users/${user.id}/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId })
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new CustomEvent('fidfud-favorites-updated', {
          detail: { restaurantId, isFollowing: data.isFollowing, savedRestaurantIds: data.savedRestaurantIds }
        }));
        notify(
          data.isFollowing ? 'Restaurant Suivi !' : 'Favori Retiré',
          data.isFollowing 
            ? `${restaurantName} a été ajouté à vos favoris ❤️` 
            : `${restaurantName} a été retiré de vos favoris.`,
          data.isFollowing ? 'success' : 'info'
        );
      }
    } catch (err) {
      console.error('Error toggling favorite in drawer:', err);
    }
  };

  // Filtered favorite restaurants list
  const favoriteRestaurants = useMemo(() => {
    return restaurants.filter(r => favoriteIds.includes(r.id)).filter(r => {
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        (r.cuisineType || '').toLowerCase().includes(q) ||
        (r.city || '').toLowerCase().includes(q)
      );
    });
  }, [restaurants, favoriteIds, searchFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-end animate-fadeIn">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Slide-out Drawer */}
      <div className="relative w-full max-w-xl bg-[#0d0d10] border-l border-zinc-800 text-white h-full flex flex-col shadow-2xl z-10 overflow-hidden">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-bold shadow-lg shadow-red-500/10">
              <Heart size={22} className="fill-red-400" />
            </div>
            <div>
              <h2 className="font-black text-lg text-white uppercase italic tracking-wider flex items-center gap-2">
                <span>Mes Favoris</span>
                <span className="text-xs font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full not-italic">
                  {favoriteRestaurants.length}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Restaurants & chefs que vous suivez</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar & Filter */}
        <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/40 shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher parmi vos favoris..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5C00]"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* Restaurants Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {favoriteRestaurants.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
                <Heart size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300">
                  {searchFilter ? 'Aucun favori correspondant' : 'Aucun restaurant suivi'}
                </h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  {searchFilter
                    ? `Aucun restaurant ne correspond à "${searchFilter}".`
                    : 'Suivez vos restaurants préférés depuis les fiches plats ou leurs menus pour les retrouver facilement ici !'}
                </p>
              </div>

              {!user && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="px-4 py-2 bg-[#FF5C00] hover:bg-[#ff6d1a] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-[#FF5C00]/20 cursor-pointer transition-all inline-flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  <span>Se Connecter pour sauvegarder</span>
                </button>
              )}
            </div>
          ) : (
            favoriteRestaurants.map(restaurant => {
              const restaurantDishes = dishes.filter(d => d.restaurantId === restaurant.id);
              const previewDish = restaurantDishes[0];

              return (
                <div
                  key={restaurant.id}
                  className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-3xl p-4 transition-all space-y-3.5 shadow-lg group"
                >
                  {/* Top Bar: Restaurant Avatar, Name, Rating & Unfollow */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                        {restaurant.imageUrl ? (
                          <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover" />
                        ) : (
                          <ChefHat size={22} className="text-[#FF5C00]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-white uppercase italic truncate">{restaurant.name}</h3>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-md font-bold flex items-center gap-0.5">
                            <ShieldCheck size={9} /> Pro
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span className="text-amber-400 font-bold flex items-center gap-0.5">
                            <Star size={11} className="fill-amber-400" /> {restaurant.rating || '4.9'}
                          </span>
                          <span>•</span>
                          <span className="truncate">{restaurant.cuisineType || 'Cuisine Gourmet'}</span>
                          {restaurant.city && (
                            <>
                              <span>•</span>
                              <span className="text-zinc-500 truncate">{restaurant.city}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Unfollow Button */}
                    <button
                      onClick={() => handleToggleFollow(restaurant.id, restaurant.name)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer shrink-0"
                      title="Retirer des favoris"
                    >
                      <Heart size={16} className="fill-red-400" />
                    </button>
                  </div>

                  {/* Dishes Preview Carousel inside Favorite Restaurant */}
                  {restaurantDishes.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-zinc-400 uppercase tracking-wider">
                          Plats Disponibles ({restaurantDishes.length})
                        </span>
                        {previewDish && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenDish(previewDish.id, 'menu');
                            }}
                            className="text-[#FF5C00] hover:underline font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                          >
                            <span>Consulter toute la Carte</span>
                            <ArrowRight size={11} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {restaurantDishes.slice(0, 3).map(dish => (
                          <div
                            key={dish.id}
                            onClick={() => {
                              onClose();
                              onOpenDish(dish.id, 'order');
                            }}
                            className="bg-zinc-950 p-2 rounded-2xl border border-zinc-800/80 hover:border-[#FF5C00]/50 transition-all cursor-pointer flex flex-col justify-between group/dish"
                          >
                            <div className="aspect-video rounded-xl bg-zinc-900 overflow-hidden mb-1.5 relative">
                              <img
                                src={dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80'}
                                alt={dish.name}
                                className="w-full h-full object-cover group-hover/dish:scale-105 transition-transform duration-300"
                              />
                              <span className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold text-white">
                                {dish.price.toFixed(2)}€
                              </span>
                            </div>
                            <p className="text-[10.5px] font-bold text-zinc-200 truncate group-hover/dish:text-[#FF5C00] transition-colors">
                              {dish.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {restaurant.address || 'Livraison rapide disponible'}
                    </p>
                    {previewDish && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenDish(previewDish.id, 'menu');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#FF5C00] text-zinc-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <UtensilsCrossed size={12} />
                        <span>Ouvrir Menu</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950 text-center">
          <p className="text-[11px] text-zinc-500">
            Fidfud synchronise vos restaurants favoris sur tous vos appareils en temps réel.
          </p>
        </div>
      </div>
    </div>
  );
}
