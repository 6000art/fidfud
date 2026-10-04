import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Utensils, 
  Store, 
  Star, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  Flame, 
  Compass,
  Check
} from 'lucide-react';
import { Dish, Restaurant, SearchResult } from '../types';

interface SearchBarProps {
  onSelectDish?: (dish: Dish) => void;
  onSelectRestaurant?: (restaurant: Restaurant) => void;
  onSelectCategory?: (category: string) => void;
  placeholder?: string;
  className?: string;
  initialQuery?: string;
  autoFocus?: boolean;
}

const QUICK_FILTERS = [
  { id: 'top_rated', label: '⭐ Top Notés', query: '', minRating: 4.8 },
  { id: 'pizza', label: '🍕 Pizza', query: 'pizza' },
  { id: 'burger', label: '🍔 Burgers', query: 'burger' },
  { id: 'sushi', label: '🍣 Sushi / Ramen', query: 'ramen' },
  { id: 'tacos', label: '🌮 Tacos', query: 'tacos' },
  { id: 'veggie', label: '🌱 Végétarien', query: 'veggie' },
  { id: 'dessert', label: '🍰 Desserts', query: 'dessert' }
];

export default function SearchBar({
  onSelectDish,
  onSelectRestaurant,
  onSelectCategory,
  placeholder = "Rechercher un plat, un restaurant, un ingrédient ou une envie...",
  className = "",
  initialQuery = "",
  autoFocus = false
}: SearchBarProps) {
  const [query, setQuery] = useState<string>(initialQuery);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initial query
  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Keyboard shortcut (Ctrl+K or ⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!query.trim() && !activeFilterId) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const filter = QUICK_FILTERS.find(f => f.id === activeFilterId);
        const searchQuery = query.trim() || (filter ? filter.query : '');
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (filter?.minRating) params.set('minRating', String(filter.minRating));
        params.set('limit', '8');

        const res = await fetch(`/api/search?${params.toString()}`);
        if (res.ok) {
          const data: SearchResult = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('[SearchBar API error]', err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, activeFilterId]);

  const handleClear = () => {
    setQuery('');
    setActiveFilterId(null);
    setResults(null);
    inputRef.current?.focus();
  };

  const handleQuickFilterClick = (filter: typeof QUICK_FILTERS[0]) => {
    if (activeFilterId === filter.id) {
      setActiveFilterId(null);
      setQuery('');
    } else {
      setActiveFilterId(filter.id);
      if (filter.query) {
        setQuery(filter.query);
      }
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Field */}
      <div className="relative flex items-center w-full">
        <div className="absolute left-3.5 sm:left-4 flex items-center pointer-events-none text-amber-500">
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          id="global-search-input"
          autoFocus={autoFocus}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveFilterId(null);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-stone-900/90 hover:bg-stone-900 focus:bg-stone-950 border border-stone-800 focus:border-amber-500/80 rounded-2xl pl-10 sm:pl-12 pr-20 py-2.5 sm:py-3 text-xs sm:text-sm text-stone-100 placeholder-stone-500 shadow-inner transition-all duration-200 outline-none backdrop-blur-md"
        />

        {/* Right action icons (Loading spinner, Clear X, Ctrl+K hint) */}
        <div className="absolute right-3 sm:right-4 flex items-center gap-2">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-stone-500 hover:text-stone-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center text-[10px] font-mono text-stone-600 bg-stone-800/80 px-1.5 py-0.5 rounded border border-stone-700/50">
              ⌘K
            </span>
          )}
        </div>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none no-scrollbar">
        {QUICK_FILTERS.map((filter) => {
          const isSelected = activeFilterId === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => handleQuickFilterClick(filter)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 border flex-shrink-0 flex items-center gap-1 ${
                isSelected
                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold shadow-md shadow-orange-500/20'
                  : 'bg-stone-900/80 text-stone-300 border-stone-800 hover:border-stone-700 hover:text-white'
              }`}
            >
              <span>{filter.label}</span>
              {isSelected && <Check className="w-3 h-3 text-stone-950" />}
            </button>
          );
        })}
      </div>

      {/* Live Dropdown Results Popover */}
      {isOpen && (query.trim() || results) && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-stone-950/95 border-2 border-stone-800 backdrop-blur-xl rounded-2xl p-4 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center text-stone-400 space-y-2">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Recherche réactive en cours...</span>
            </div>
          ) : results && results.totalCount > 0 ? (
            <div className="space-y-4">
              {/* Matched Dishes Section */}
              {results.dishes && results.dishes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-stone-800 mb-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Plats Recommandés ({results.dishes.length})</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.dishes.map((dish) => (
                      <div
                        key={dish.id}
                        onClick={() => {
                          if (onSelectDish) onSelectDish(dish);
                          setIsOpen(false);
                        }}
                        className="group flex items-center gap-3 p-2.5 rounded-xl bg-stone-900/60 hover:bg-stone-800/90 border border-stone-800/80 hover:border-amber-500/50 cursor-pointer transition-all"
                      >
                        {/* Dish Photo */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-800 flex-shrink-0 relative">
                          <img
                            src={dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}
                            alt={dish.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e: any) => {
                              e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200';
                            }}
                          />
                        </div>

                        {/* Dish Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 truncate transition-colors">
                            {dish.name}
                          </h4>
                          <p className="text-[11px] text-stone-400 truncate">
                            {dish.restaurantName || 'Restaurant partenaire'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-black text-amber-400">
                              {Number(dish.price).toFixed(2)} €
                            </span>
                            {dish.rating && (
                              <span className="flex items-center gap-0.5 text-[10px] text-stone-300 bg-stone-800 px-1.5 py-0.5 rounded">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                <span>{dish.rating}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Restaurants Section */}
              {results.restaurants && results.restaurants.length > 0 && (
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-stone-800 mb-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" />
                      <span>Restaurants & Établissements ({results.restaurants.length})</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.restaurants.map((rest) => (
                      <div
                        key={rest.id}
                        onClick={() => {
                          if (onSelectRestaurant) onSelectRestaurant(rest);
                          setIsOpen(false);
                        }}
                        className="group flex items-center gap-3 p-2.5 rounded-xl bg-stone-900/60 hover:bg-stone-800/90 border border-stone-800/80 hover:border-amber-500/50 cursor-pointer transition-all"
                      >
                        {/* Restaurant Logo */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-800 flex-shrink-0 flex items-center justify-center p-1 border border-stone-700">
                          {rest.logoUrl ? (
                            <img
                              src={rest.logoUrl}
                              alt={rest.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Store className="w-6 h-6 text-amber-500" />
                          )}
                        </div>

                        {/* Restaurant Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 truncate transition-colors">
                              {rest.name}
                            </h4>
                            {rest.isCertified && (
                              <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-stone-400 truncate">
                            {rest.category || rest.slogan || rest.address || 'Cuisine d\'exception'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              <span>{rest.rating || 4.9}</span>
                            </span>
                            {rest.reviewCount !== undefined && rest.reviewCount > 0 && (
                              <span className="text-[10px] text-stone-500">
                                ({rest.reviewCount} avis)
                              </span>
                            )}
                          </div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-stone-400 space-y-2">
              <Compass className="w-8 h-8 mx-auto text-stone-600" />
              <p className="text-sm font-semibold text-stone-300">
                Aucun résultat pour "{query}"
              </p>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Essayez d'autres mots-clés comme "pizza", "burger", "halal", "bio" ou le nom d'un quartier.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
