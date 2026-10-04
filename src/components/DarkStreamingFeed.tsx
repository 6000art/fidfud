import React, { useState, useEffect, useRef } from 'react';
import { getSafeVideoUrl, STABLE_CULINARY_FALLBACK_VIDEOS } from '../utils/videoUtils';
import { 
  Video as VideoIcon, 
  Search, 
  ShoppingBag, 
  User, 
  Bell, 
  Tv, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Sparkles, 
  CheckCircle, 
  Heart, 
  Share2, 
  Clock, 
  MapPin, 
  Star, 
  Plus, 
  Minus, 
  Maximize2, 
  Menu, 
  X, 
  Filter, 
  Eye, 
  EyeOff,
  Zap, 
  ChefHat, 
  Store, 
  ArrowRight,
  TrendingUp,
  MessageCircle,
  ShieldCheck,
  Award,
  Download,
  Headphones,
  Youtube,
  Disc,
  ChevronDown
} from 'lucide-react';
import { Video, Restaurant, Dish, User as UserType, Order } from '../types';
import LazyImage from './LazyImage';
import BackgroundVideoPlayer from './BackgroundVideoPlayer';
import { offlineCacheService } from '../services/OfflineCacheService';

interface DarkStreamingFeedProps {
  videos: Video[];
  restaurants: Restaurant[];
  dishes: Dish[];
  user: UserType | null;
  orders: Order[];
  cartCount: number;
  cartTotal?: number;
  onAddToCart: (dish: Dish, quantity: number) => void;
  onSelectDish: (dishId: string) => void;
  onSelectLiveVideo: (videoId: string) => void;
  onOpenCart: () => void;
  onOpenOrdersHistory: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onLoginDemo?: (role: 'client' | 'restaurant' | 'admin') => void;
  onOpenAdmin?: () => void;
  onOpenProfile?: () => void;
  accentColor?: string;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  selectedCategory?: string;
  onSelectCategory?: (cat: string) => void;
  designSettings?: any;
  onOpenOfflineDownloads?: () => void;
  onOpenDJArea?: () => void;
  onOpenShows?: () => void;
  onOpenYouTubers?: () => void;
  onOpenRecipes?: () => void;
  onOpenFavorites?: () => void;
  isFastLane?: boolean;
  setIsFastLane?: (val: boolean) => void;
  maxPrepTimeMinutes?: number;
  setMaxPrepTimeMinutes?: (val: number) => void;
  onOpenSearch?: () => void;
}

// Fallback Rich Demo Datasets if backend feeds are sparse
const DEMO_RESTAURANTS: Restaurant[] = [
  {
    id: 'rest-demo-1',
    userId: 'usr-rest-demo-1',
    name: 'Pizzeria Napoletana Live',
    slogan: 'Four à bois & Pizzas artisanales en direct',
    category: 'Pizza',
    logoUrl: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=150&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80',
    address: '12 rue de la Roquette, Paris 11e',
    commissionRateDelivery: 15,
    commissionRateCollect: 5
  },
  {
    id: 'rest-demo-2',
    userId: 'usr-rest-demo-2',
    name: 'Smash & Flame Burger',
    slogan: 'Smash burgers croustillants & frites maison',
    category: 'Burgers',
    logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=150&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=1200&auto=format&fit=crop&q=80',
    address: '45 boulevard Voltaire, Paris 11e',
    commissionRateDelivery: 15,
    commissionRateCollect: 5
  },
  {
    id: 'rest-demo-3',
    userId: 'usr-rest-demo-3',
    name: 'O-Sushi Master Tokyo',
    slogan: 'Sashimis découpés à la minute par le Master Chef',
    category: 'Japonais',
    logoUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=150&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=1200&auto=format&fit=crop&q=80',
    address: '88 rue Oberkampf, Paris 11e',
    commissionRateDelivery: 15,
    commissionRateCollect: 5
  }
];

const DEMO_DISHES: Dish[] = [
  {
    id: 'dish-demo-1',
    restaurantId: 'rest-demo-1',
    name: 'Pizza Truffe & Burrata San Marzano',
    description: 'Sauce tomate San Marzano DOP, Burrata fraîche 125g, huile de truffe noire et basilic frais.',
    price: 15.90,
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    category: 'Pizza',
    isAvailable: true,
    isFastPreparation: true,
    preparationTimeMinutes: 12
  },
  {
    id: 'dish-demo-2',
    restaurantId: 'rest-demo-2',
    name: 'Double Smash Cheddar Affiné',
    description: 'Deux steaks de bœuf français smashés, double cheddar affiné 9 mois, sauce secret maison.',
    price: 13.50,
    imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
    category: 'Burgers',
    isAvailable: true,
    isFastPreparation: true,
    preparationTimeMinutes: 10
  },
  {
    id: 'dish-demo-3',
    restaurantId: 'rest-demo-3',
    name: 'Plateau O-Sushi Signature 18 Pieces',
    description: 'Salmon Roll Avocat, Nigiri Thon Rouge, California Ebi Fry croustillant.',
    price: 21.00,
    imageUrl: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=600&auto=format&fit=crop&q=80',
    category: 'Japonais',
    isAvailable: true,
    isFastPreparation: false,
    preparationTimeMinutes: 15
  }
];

const nowMs = Date.now();

const DEMO_VIDEOS: Video[] = [
  {
    id: 'vid-demo-1',
    restaurantId: 'rest-demo-1',
    restaurantName: 'Pizzeria Napoletana Live',
    title: '🔴 EN DIRECT: Cuisson minute au four à bois 450°C !',
    videoUrl: STABLE_CULINARY_FALLBACK_VIDEOS[0],
    likesCount: 1420,
    viewsCount: 3890,
    isLiveContinuous: true,
    isOnline: true,
    createdAt: new Date(nowMs - 3 * 60 * 1000).toISOString(), // 3 mins ago
    associatedDishId: 'dish-demo-1',
    associatedDish: DEMO_DISHES[0]
  },
  {
    id: 'vid-demo-1-b',
    restaurantId: 'rest-demo-1',
    restaurantName: 'Pizzeria Napoletana Live',
    title: '🔥 Étirage à la main de la pâte levée 48h (Tradition Napolitaine)',
    videoUrl: STABLE_CULINARY_FALLBACK_VIDEOS[1],
    likesCount: 890,
    viewsCount: 2100,
    isLiveContinuous: false,
    isOnline: false,
    createdAt: new Date(nowMs - 12 * 60 * 1000).toISOString(), // 12 mins ago
    associatedDishId: 'dish-demo-1',
    associatedDish: DEMO_DISHES[0]
  },
  {
    id: 'vid-demo-2',
    restaurantId: 'rest-demo-2',
    restaurantName: 'Smash & Flame Burger',
    title: '⚡ Smash de 2 steaks croustillants sur plaque brûlante',
    videoUrl: STABLE_CULINARY_FALLBACK_VIDEOS[2],
    likesCount: 980,
    viewsCount: 2450,
    isLiveContinuous: false,
    isOnline: true,
    createdAt: new Date(nowMs - 25 * 60 * 1000).toISOString(), // 25 mins ago
    associatedDishId: 'dish-demo-2',
    associatedDish: DEMO_DISHES[1]
  },
  {
    id: 'vid-demo-2-b',
    restaurantId: 'rest-demo-2',
    restaurantName: 'Smash & Flame Burger',
    title: '🧀 Nappage au cheddar fondu fumé d’alpage en direct',
    videoUrl: STABLE_CULINARY_FALLBACK_VIDEOS[3],
    likesCount: 1120,
    viewsCount: 3100,
    isLiveContinuous: false,
    isOnline: false,
    createdAt: new Date(nowMs - 45 * 60 * 1000).toISOString(), // 45 mins ago
    associatedDishId: 'dish-demo-2',
    associatedDish: DEMO_DISHES[1]
  },
  {
    id: 'vid-demo-3',
    restaurantId: 'rest-demo-3',
    restaurantName: 'O-Sushi Master Tokyo',
    title: '🍣 Découpe spectaculaire du saumon frais du matin',
    videoUrl: STABLE_CULINARY_FALLBACK_VIDEOS[4],
    likesCount: 2150,
    viewsCount: 5120,
    isLiveContinuous: true,
    isOnline: true,
    createdAt: new Date(nowMs - 75 * 60 * 1000).toISOString(), // 1h15 ago
    associatedDishId: 'dish-demo-3',
    associatedDish: DEMO_DISHES[2]
  },
  {
    id: 'vid-demo-3-b',
    restaurantId: 'rest-demo-3',
    restaurantName: 'O-Sushi Master Tokyo',
    title: '🔥 Flambage au chalumeau du Nigiri Saumon Gravlax',
    videoUrl: STABLE_CULINARY_FALLBACK_VIDEOS[5],
    likesCount: 1840,
    viewsCount: 4200,
    isLiveContinuous: false,
    isOnline: false,
    createdAt: new Date(nowMs - 110 * 60 * 1000).toISOString(), // 1h50 ago
    associatedDishId: 'dish-demo-3',
    associatedDish: DEMO_DISHES[2]
  }
];

function getRelativeTimeStr(dateStr?: string, index: number = 0): string {
  if (!dateStr) {
    const mins = (index + 1) * 8;
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    return `Il y a ${hours} h`;
  }
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs)) return "Récemment";
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays} j`;
  } catch (e) {
    return "Récemment";
  }
}

function getDishOrVideoPrepTime(v: Video, restaurant?: Restaurant, dish?: Dish): number {
  if (dish?.preparationTimeMinutes !== undefined && dish.preparationTimeMinutes > 0) {
    return dish.preparationTimeMinutes;
  }
  if (restaurant?.preparationTimeMinutes !== undefined && restaurant.preparationTimeMinutes > 0) {
    return restaurant.preparationTimeMinutes;
  }
  if (restaurant?.avgPreparationTimeMinutes !== undefined && restaurant.avgPreparationTimeMinutes > 0) {
    return restaurant.avgPreparationTimeMinutes;
  }
  const titleLower = ((v.title || '') + ' ' + (dish?.name || '') + ' ' + (dish?.category || '')).toLowerCase();
  if (titleLower.includes('boisson') || titleLower.includes('café') || titleLower.includes('smoothie') || titleLower.includes('dessert') || titleLower.includes('cookie') || titleLower.includes('donut')) {
    return 5;
  }
  if (titleLower.includes('smash') || titleLower.includes('wrap') || titleLower.includes('tacos') || titleLower.includes('sandwich') || titleLower.includes('salade') || titleLower.includes('sushi') || titleLower.includes('poke')) {
    return 8;
  }
  const code = (v.id || restaurant?.id || '0').split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0);
  return 5 + (code % 15);
}

export default function DarkStreamingFeed({
  videos,
  restaurants,
  dishes,
  user,
  orders,
  cartCount,
  cartTotal = 0,
  onAddToCart,
  onSelectDish,
  onSelectLiveVideo,
  onOpenCart,
  onOpenOrdersHistory,
  onOpenAuth,
  onLogout,
  onLoginDemo,
  onOpenAdmin,
  onOpenProfile,
  accentColor = '#FF5C00',
  searchQuery = '',
  onSearchQueryChange,
  selectedCategory = '',
  onSelectCategory,
  designSettings,
  onOpenOfflineDownloads,
  onOpenDJArea,
  onOpenShows,
  onOpenYouTubers,
  onOpenRecipes,
  onOpenFavorites,
  isFastLane = false,
  setIsFastLane,
  maxPrepTimeMinutes = 10,
  setMaxPrepTimeMinutes,
  onOpenSearch
}: DarkStreamingFeedProps) {
  // Sidebar expand/collapse state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isLiveMenuOpen, setIsLiveMenuOpen] = useState<boolean>(false);
  const liveMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (liveMenuRef.current && !liveMenuRef.current.contains(event.target as Node)) {
        setIsLiveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Hero Carousel Index & Hovered Video State
  const [heroIndex, setHeroIndex] = useState<number>(0);
  const [isHeroPlaying, setIsHeroPlaying] = useState<boolean>(true);
  const [isHeroMuted, setIsHeroMuted] = useState<boolean>(true);
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);

  // Downloaded videos tracking
  const [downloadedVideoIds, setDownloadedVideoIds] = useState<string[]>(() => 
    offlineCacheService.getDownloadedVideos().map(v => v.id)
  );

  useEffect(() => {
    const unsub = offlineCacheService.subscribeDownloads(() => {
      setDownloadedVideoIds(offlineCacheService.getDownloadedVideos().map(v => v.id));
    });
    return () => unsub();
  }, []);

  const handleToggleDownloadVideo = (e: React.MouseEvent, video: Video) => {
    e.stopPropagation();
    const isNowDownloaded = offlineCacheService.toggleVideoDownload(video);
    if (isNowDownloaded) {
      setAddedToast({ dishName: `Vidéo "${video.title || video.dishName || video.restaurantName}" sauvegardée hors-ligne`, price: video.dishPrice || 0 });
      setTimeout(() => setAddedToast(null), 3500);
    }
  };

  // Auto-pause video playback when scrolling
  useEffect(() => {
    let scrollTimer: any = null;
    const handleScroll = () => {
      setIsHeroPlaying(false);
      window.dispatchEvent(new CustomEvent('fidfud-pause-all-videos'));
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        // Keep paused or resume hero only if near top
        if (window.scrollY < 150) {
          setIsHeroPlaying(true);
        }
      }, 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, []);

  // Search & Filters internal states
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'flash' | 'popular' | 'fast'>('all');
  const [activeCategory, setActiveCategory] = useState<string>(selectedCategory || 'Tous');
  const [selectedRestFilter, setSelectedRestFilter] = useState<string | null>(null);

  // Followed Chefs / Restaurants in localStorage
  const [followedIds, setFollowedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fidfud_followed_chefs');
      return saved ? JSON.parse(saved) : ['rest-1', 'rest-2'];
    } catch (e) {
      return ['rest-1', 'rest-2'];
    }
  });

  // Card Video Audio & Interaction States
  const [unmutedCardIds, setUnmutedCardIds] = useState<string[]>([]);
  const [likedVideoIds, setLikedVideoIds] = useState<string[]>([]);
  const [likeCountsState, setLikeCountsState] = useState<Record<string, number>>({});

  const toggleLikeVideo = (e: React.MouseEvent, videoId: string, initialCount: number) => {
    e.stopPropagation();
    setLikedVideoIds(prev => {
      const isLiked = prev.includes(videoId);
      const updated = isLiked ? prev.filter(id => id !== videoId) : [...prev, videoId];
      const currentCount = likeCountsState[videoId] ?? initialCount;
      setLikeCountsState(c => ({ ...c, [videoId]: isLiked ? Math.max(0, currentCount - 1) : currentCount + 1 }));
      return updated;
    });
  };

  const toggleMuteCardVideo = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    setUnmutedCardIds(prev => 
      prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
    );
  };

  // Notification Drawer Dropdown
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [addedToast, setAddedToast] = useState<{ dishName: string; price: number } | null>(null);
  const [isCleanMode, setIsCleanMode] = useState<boolean>(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState<boolean>(false);
  const [isCartBouncing, setIsCartBouncing] = useState<boolean>(false);
  const [isCartShaking, setIsCartShaking] = useState<boolean>(false);
  const prevCartCountRef = useRef(cartCount);

  const triggerCartBounce = () => {
    setIsCartBouncing(false);
    requestAnimationFrame(() => {
      setIsCartBouncing(true);
    });
    setTimeout(() => setIsCartBouncing(false), 700);
  };

  const triggerCartShake = () => {
    setIsCartShaking(false);
    requestAnimationFrame(() => {
      setIsCartShaking(true);
    });
    setTimeout(() => setIsCartShaking(false), 800);
  };

  useEffect(() => {
    const handleCartAddEvent = () => {
      triggerCartBounce();
    };

    const handleCartShakeEvent = () => {
      triggerCartShake();
    };

    window.addEventListener('fidfud:cart-add', handleCartAddEvent);
    window.addEventListener('fidfud:cart-shake', handleCartShakeEvent);
    return () => {
      window.removeEventListener('fidfud:cart-add', handleCartAddEvent);
      window.removeEventListener('fidfud:cart-shake', handleCartShakeEvent);
    };
  }, []);

  useEffect(() => {
    if (cartCount > prevCartCountRef.current) {
      triggerCartBounce();
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  // Sync internal search with parent search
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (val: string) => {
    setLocalSearch(val);
    if (onSearchQueryChange) {
      onSearchQueryChange(val);
    }
  };

  const toggleFollow = (restId: string) => {
    setFollowedIds(prev => {
      const exists = prev.includes(restId);
      const updated = exists ? prev.filter(id => id !== restId) : [...prev, restId];
      try {
        localStorage.setItem('fidfud_followed_chefs', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Deduplicate and sanitize restaurants
  const effectiveRestaurants = React.useMemo(() => {
    if (!restaurants || restaurants.length === 0) return [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const result: Restaurant[] = [];
    for (const r of restaurants) {
      if (!r || !r.id) continue;
      const normName = (r.name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (seenIds.has(r.id) || (normName && seenNames.has(normName))) {
        continue;
      }
      seenIds.add(r.id);
      if (normName) seenNames.add(normName);
      result.push(r);
    }
    return result;
  }, [restaurants]);

  const effectiveDishes = dishes || [];

  // Deduplicate videos and ensure no duplicate restaurant entries on the feed
  const effectiveVideos = React.useMemo(() => {
    const list: Video[] = [];
    const seenVideoIds = new Set<string>();
    const seenRestIds = new Set<string>();
    const seenUrls = new Set<string>();

    // 1. Process all actual videos
    if (videos && videos.length > 0) {
      for (const v of videos) {
        if (!v || !v.id) continue;
        const normUrl = (v.videoUrl || '').trim();
        if (seenVideoIds.has(v.id)) continue;
        if (normUrl && seenUrls.has(normUrl)) continue;

        seenVideoIds.add(v.id);
        if (normUrl) seenUrls.add(normUrl);
        if (v.restaurantId) seenRestIds.add(v.restaurantId);
        list.push(v);
      }
    }

    // 2. Recover single video representation for restaurants that have a videoUrl and no video in list
    if (effectiveRestaurants && effectiveRestaurants.length > 0) {
      effectiveRestaurants.forEach(rest => {
        if (rest.videoUrl && rest.videoUrl.trim() !== '') {
          const normUrl = rest.videoUrl.trim();
          const alreadyExists = list.some(v => v.restaurantId === rest.id || (v.videoUrl && v.videoUrl.trim() === normUrl));
          if (!alreadyExists && !seenRestIds.has(rest.id) && !seenUrls.has(normUrl)) {
            seenRestIds.add(rest.id);
            seenUrls.add(normUrl);
            list.push({
              id: `video_${rest.id}`,
              restaurantId: rest.id,
              restaurantName: rest.name,
              title: `${rest.name} — Direct & Coulisses Culinaire`,
              description: rest.description || `Découvrez la cuisine en direct chez ${rest.name}`,
              videoUrl: rest.videoUrl,
              likesCount: 120,
              viewsCount: 1540,
              isLiveContinuous: true,
              isOnline: true,
              createdAt: rest.createdAt || new Date(nowMs - 5 * 60 * 1000).toISOString()
            });
          }
        }
      });
    }

    // Sort strictly by createdAt descending so newest videos/posts appear FIRST
    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return list;
  }, [videos, effectiveRestaurants]);

  // Filtered lists logic
  const liveVideos = effectiveVideos.filter(v => v.isLiveContinuous || v.isOnline || (v.viewsCount && v.viewsCount > 500));
  const heroFeaturedVideos = liveVideos.length > 0 ? liveVideos.slice(0, 5) : effectiveVideos.slice(0, 5);

  // Auto advance hero carousel
  useEffect(() => {
    if (heroFeaturedVideos.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroFeaturedVideos.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [heroFeaturedVideos.length]);

  const currentHeroVideo = heroFeaturedVideos[heroIndex] || effectiveVideos[0];
  const currentHeroRestaurant = currentHeroVideo ? effectiveRestaurants.find(r => r.id === currentHeroVideo.restaurantId) : null;
  const currentHeroDish = currentHeroVideo ? (currentHeroVideo.associatedDish || effectiveDishes.find(d => d.id === currentHeroVideo.associatedDishId || d.restaurantId === currentHeroVideo.restaurantId)) : null;

  // Filter videos for the main grid
  let filteredVideos = effectiveVideos.filter(v => {
    const restaurant = effectiveRestaurants.find(r => r.id === v.restaurantId);
    const dish = v.associatedDish || effectiveDishes.find(d => d.id === v.associatedDishId || d.restaurantId === v.restaurantId);
    const prepTime = getDishOrVideoPrepTime(v, restaurant, dish);

    // Restaurant filter from sidebar
    if (selectedRestFilter && v.restaurantId !== selectedRestFilter) return false;

    // Fast Lane Global Filter (< 10 min or maxPrepTimeMinutes)
    if (isFastLane) {
      const effectiveMax = maxPrepTimeMinutes !== undefined && maxPrepTimeMinutes > 0 ? maxPrepTimeMinutes : 10;
      if (prepTime > effectiveMax) return false;
    }

    // Search filter
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase().trim();
      const matchTitle = (v.title || '').toLowerCase().includes(q);
      const matchRest = (restaurant?.name || '').toLowerCase().includes(q);
      const matchDish = (dish?.name || '').toLowerCase().includes(q);
      const matchCuisine = (restaurant?.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchRest && !matchDish && !matchCuisine) return false;
    }

    // Tab filter
    if (activeTab === 'live') {
      if (!v.isLiveContinuous && !v.isOnline) return false;
    } else if (activeTab === 'flash') {
      if (!dish?.isFastPreparation && (v.duration || 0) > 60) return false;
    } else if (activeTab === 'popular') {
      if ((v.likesCount || 0) < 10) return false;
    } else if (activeTab === 'fast') {
      if (prepTime > 10) return false;
    }

    // Category filter
    if (activeCategory && activeCategory !== 'Tous') {
      const catNorm = activeCategory.toLowerCase();
      const restCat = (restaurant?.category || '').toLowerCase();
      const dishCat = (dish?.category || '').toLowerCase();
      if (!restCat.includes(catNorm) && !dishCat.includes(catNorm)) return false;
    }

    return true;
  });

  // When Fast Lane mode or Express tab is enabled, prioritize & sort items with shortest prep time first
  if (isFastLane || activeTab === 'fast') {
    filteredVideos = [...filteredVideos].sort((a, b) => {
      const restA = effectiveRestaurants.find(r => r.id === a.restaurantId);
      const dishA = a.associatedDish || effectiveDishes.find(d => d.id === a.associatedDishId || d.restaurantId === a.restaurantId);
      const prepA = getDishOrVideoPrepTime(a, restA, dishA);

      const restB = effectiveRestaurants.find(r => r.id === b.restaurantId);
      const dishB = b.associatedDish || effectiveDishes.find(d => d.id === b.associatedDishId || d.restaurantId === b.restaurantId);
      const prepB = getDishOrVideoPrepTime(b, restB, dishB);

      return prepA - prepB;
    });
  }

  const categoriesList = [
    { label: 'Tous', icon: '🔥' },
    { label: 'En Direct', icon: '🔴' },
    { label: 'Recettes Flash', icon: '⚡' },
    { label: 'Pizza', icon: '🍕' },
    { label: 'Burgers', icon: '🍔' },
    { label: 'Japonais', icon: '🍣' },
    { label: 'Healthy', icon: '🥗' },
    { label: 'Desserts', icon: '🍰' },
  ];

  const handleAddToCartQuick = (e: React.MouseEvent, dish: Dish) => {
    e.stopPropagation();
    onAddToCart(dish, 1);
    setAddedToast({ dishName: dish.name, price: dish.price });
    setTimeout(() => setAddedToast(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-zinc-100 font-sans flex flex-col selection:bg-purple-600 selection:text-white">
      
      {/* 1. SLEEK TRANSPARENT STREAMING NAVIGATION HEADER (Non-obstructive overlay) */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-[#0e0e10]/90 via-[#0e0e10]/60 to-transparent backdrop-blur-md border-b border-white/10 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 w-full max-w-full overflow-x-clip transition-all">
        
        {/* Left: Brand Logo & Sidebar Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className="p-2 rounded-xl bg-black/40 hover:bg-black/70 text-zinc-300 hover:text-white border border-white/15 transition-all cursor-pointer shrink-0"
            title="Masquer/Afficher la barre latérale"
          >
            <Menu size={18} />
          </button>

          <div 
            className="flex items-center gap-2 cursor-pointer select-none group" 
            onClick={() => { setSelectedRestFilter(null); handleSearchChange(''); setActiveTab('all'); }}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#FF5C00] via-purple-600 to-red-600 p-0.5 shadow-[0_0_15px_rgba(255,92,0,0.4)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0e0e10] rounded-[10px] flex items-center justify-center">
                <Flame size={18} className="text-[#FF5C00] animate-pulse" />
              </div>
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-black uppercase tracking-tight italic bg-gradient-to-r from-white via-zinc-100 to-[#FF5C00] bg-clip-text text-transparent block truncate leading-none">
                FEED FOOD
              </span>
              <span className="hidden xs:block text-[8px] font-mono font-bold uppercase tracking-widest text-purple-400 mt-0.5 truncate">
                STREAMING & FOOD 🔴
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-xl mx-2 hidden sm:block relative">
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-3.5 text-zinc-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Rechercher un plat, un chef en direct, une pizza..."
              className="w-full bg-black/50 hover:bg-black/70 focus:bg-black/90 border border-white/15 focus:border-[#FF5C00] rounded-full py-1.5 pl-10 pr-10 text-xs text-white placeholder-zinc-400 focus:outline-none transition-all shadow-inner backdrop-blur-sm"
            />
            {localSearch && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions Center (Espaces Live, Favorites, Cart, Hamburger Action Menu) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Espaces Live Button in Header */}
          {(onOpenDJArea || onOpenShows || onOpenYouTubers) && (
            <div className="relative shrink-0" ref={liveMenuRef}>
              <button
                onClick={() => setIsLiveMenuOpen(prev => !prev)}
                className="px-2.5 sm:px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FF5C00] via-purple-600 to-red-600 hover:opacity-90 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg transition-all border border-white/20 animate-pulse"
                title="Hub Espaces Live"
              >
                <Disc size={13} className="animate-spin-slow shrink-0" />
                <span className="hidden md:inline">Espaces Live 🎧🔴</span>
                <span className="md:hidden">Live 🎧</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${isLiveMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu for Espaces Live */}
              {isLiveMenuOpen && (
                <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-full mt-2 sm:w-72 bg-[#0C0C0E]/98 backdrop-blur-2xl border border-white/20 rounded-3xl p-3 shadow-2xl z-[120] flex flex-col gap-2 font-sans animate-fade-in text-left">
                  <div className="px-2 py-1 border-b border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                      <Sparkles size={12} className="text-[#FF5C00]" />
                      Hub Espaces Live
                    </span>
                    <button 
                      onClick={() => setIsLiveMenuOpen(false)}
                      className="text-zinc-500 hover:text-white p-0.5 rounded cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {/* 1. DJ Live */}
                  {onOpenDJArea && (
                    <button
                      onClick={() => {
                        setIsLiveMenuOpen(false);
                        onOpenDJArea();
                      }}
                      className="flex items-center gap-2.5 p-2 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-white transition-all cursor-pointer text-left w-full group"
                    >
                      <div className="p-2 rounded-xl bg-purple-500 text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
                        <Headphones size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-wider text-purple-300 truncate">🎧 Lounge DJs & Sets</div>
                        <div className="text-[9.5px] text-zinc-400 truncate">Sons en direct & demande de titres</div>
                      </div>
                    </button>
                  )}

                  {/* 2. Émissions Culinaires */}
                  {onOpenShows && (
                    <button
                      onClick={() => {
                        setIsLiveMenuOpen(false);
                        onOpenShows();
                      }}
                      className="flex items-center gap-2.5 p-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-white transition-all cursor-pointer text-left w-full group"
                    >
                      <div className="p-2 rounded-xl bg-amber-500 text-black shadow-md group-hover:scale-105 transition-transform shrink-0">
                        <Tv size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-wider text-amber-300 truncate">🍳 Émissions Culinaires</div>
                        <div className="text-[9.5px] text-zinc-400 truncate">Crash-tests & recettes des chefs</div>
                      </div>
                    </button>
                  )}

                  {/* 3. YouTubers Food */}
                  {onOpenYouTubers && (
                    <button
                      onClick={() => {
                        setIsLiveMenuOpen(false);
                        onOpenYouTubers();
                      }}
                      className="flex items-center gap-2.5 p-2 rounded-2xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-white transition-all cursor-pointer text-left w-full group"
                    >
                      <div className="p-2 rounded-xl bg-red-600 text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
                        <Youtube size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-wider text-red-300 truncate">📺 YouTubers Food</div>
                        <div className="text-[9.5px] text-zinc-400 truncate">Revues, tests & dégustations</div>
                      </div>
                    </button>
                  )}

                  {/* 4. Section Recettes & Astuces */}
                  {onOpenRecipes && (
                    <button
                      onClick={() => {
                        setIsLiveMenuOpen(false);
                        onOpenRecipes();
                      }}
                      className="flex items-center gap-2.5 p-2 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/30 text-white transition-all cursor-pointer text-left w-full group"
                    >
                      <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md group-hover:scale-105 transition-transform shrink-0 font-bold">
                        🍳
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-wider text-amber-300 truncate">👨‍🍳 Recettes & Astuces (&lt; 1 min)</div>
                        <div className="text-[9.5px] text-zinc-400 truncate">Omelettes, vidéos courtes & astuces</div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Active Orders Status Badge */}
          {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length > 0 && (
            <button
              onClick={onOpenOrdersHistory}
              className="px-2.5 sm:px-3 py-1.5 rounded-full bg-purple-600/20 border border-purple-500/40 text-purple-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 animate-pulse cursor-pointer hover:bg-purple-600/30 transition-all shrink-0"
            >
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping shrink-0" />
              <span className="hidden sm:inline">Cmd ({orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length})</span>
            </button>
          )}

          {/* Favorites Button */}
          {onOpenFavorites && (
            <button
              id="btn-feed-favorites"
              onClick={onOpenFavorites}
              className="p-2 sm:p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer relative shrink-0 active:scale-95"
              title="Mes Restaurants Favoris"
            >
              <Heart size={16} className="fill-red-400/30" />
            </button>
          )}

          {/* Cart Button */}
          <button
            id="btn-feed-cart"
            onClick={onOpenCart}
            className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shrink-0 relative ${
              isCartShaking
                ? 'animate-cart-shake bg-red-600 border border-red-400 ring-2 ring-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.85)] scale-105'
                : isCartBouncing 
                  ? 'animate-cart-bounce bg-gradient-to-r from-[#FF5C00] to-red-600 ring-2 ring-[#FF5C00] shadow-[0_0_25px_rgba(255,92,0,0.7)] scale-105' 
                  : 'bg-gradient-to-r from-[#FF5C00] to-red-600 hover:opacity-95 shadow-[0_4px_15px_rgba(255,92,0,0.3)] hover:scale-105 active:scale-95'
            }`}
            title={isCartShaking ? "1 seul restaurant par commande !" : "Mon Panier"}
          >
            {isCartShaking && (
              <span className="absolute inset-0 rounded-xl border-2 border-red-400 animate-cart-shake-ring pointer-events-none" />
            )}
            <div className={`transition-transform duration-300 flex items-center justify-center ${
              isCartShaking 
                ? 'animate-cart-shake text-white' 
                : isCartBouncing 
                  ? 'animate-icon-bounce' 
                  : ''
            }`}>
              <ShoppingBag size={16} />
            </div>
            <span className="hidden sm:inline">{isCartShaking ? '1 Seul Resto !' : 'Panier'}</span>
            {cartCount > 0 && (
              <span 
                key={cartCount}
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono border ${
                  isCartShaking
                    ? 'bg-red-950 text-red-200 border-red-400 animate-cart-shake'
                    : isCartBouncing 
                      ? 'bg-black/40 text-white border-white/20 animate-badge-pulse scale-110' 
                      : 'bg-black/40 text-white border-white/20 animate-count-pop'
                }`}
              >
                {cartCount}
              </span>
            )}
          </button>

          {/* Top-Right Hamburger / Profile Menu Toggle */}
          <button
            id="btn-header-hamburger"
            onClick={() => setIsHamburgerOpen(prev => !prev)}
            className="p-2 sm:p-2.5 rounded-xl bg-black/40 hover:bg-black/70 text-zinc-300 hover:text-white border border-white/15 transition-all cursor-pointer relative shrink-0 active:scale-95"
            title="Menu Principal & Profil"
          >
            {user ? (
              <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center">
                {user.fullName ? user.fullName.charAt(0) : user.email.charAt(0).toUpperCase()}
              </div>
            ) : (
              <Menu size={18} />
            )}
          </button>

        </div>
      </header>

      {/* Hamburger / Action Navigation Drawer Overlay */}
      {isHamburgerOpen && (
        <div className="fixed inset-0 z-[110] flex justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsHamburgerOpen(false)} />
          
          <div className="relative w-full max-w-sm h-full bg-[#0e0e11] border-l border-white/10 p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FF5C00] flex items-center justify-center text-white shadow-md">
                    <Flame size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase italic tracking-tight">FEED FOOD</h3>
                    <p className="text-[10px] font-mono text-purple-400">MENU & PARAMÈTRES</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHamburgerOpen(false)}
                  className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-white/10 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* User Account / Login State */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white text-sm font-black uppercase shadow">
                        {user.fullName ? user.fullName.charAt(0) : user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate">{user.fullName || user.email}</p>
                        <p className="text-[10px] text-purple-400 font-mono uppercase font-bold">Rôle: {user.role}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                      {onOpenProfile && (
                        <button
                          onClick={() => { setIsHamburgerOpen(false); onOpenProfile(); }}
                          className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white text-center cursor-pointer transition-all"
                        >
                          Mon Profil
                        </button>
                      )}
                      <button
                        onClick={() => { setIsHamburgerOpen(false); onLogout?.(); }}
                        className="py-2 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-xs font-bold text-red-300 text-center cursor-pointer border border-red-500/30 transition-all"
                      >
                        Déconnexion
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-300 font-semibold">Connectez-vous pour commander et enregistrer vos favoris</p>
                    <button
                      onClick={() => { setIsHamburgerOpen(false); onOpenAuth?.(); }}
                      className="w-full py-2.5 rounded-xl bg-[#FF5C00] hover:bg-[#FF7A00] text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-[#FF5C00]/20 transition-all"
                    >
                      Se connecter / S'inscrire
                    </button>
                  </div>
                )}
              </div>

              {/* Demo Role Switcher */}
              <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2.5">
                <span className="text-[10px] font-black uppercase text-purple-300 font-mono tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[#FF5C00]" />
                  Comptes Démo Instantanés
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setIsHamburgerOpen(false); onLoginDemo?.('client'); }}
                    className="py-2 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    👤 Client Démo
                  </button>
                  <button
                    onClick={() => { setIsHamburgerOpen(false); onLoginDemo?.('restaurant'); }}
                    className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-[#FF5C00] to-red-600 text-white font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    👨‍🍳 Chef Live
                  </button>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1.5">
                {user?.role === 'admin' && onOpenAdmin && (
                  <button
                    onClick={() => { setIsHamburgerOpen(false); onOpenAdmin(); }}
                    className="w-full p-3 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span>🛡️ Panneau Admin CMS</span>
                    <ChevronRight size={14} />
                  </button>
                )}

                {onOpenOrdersHistory && (
                  <button
                    onClick={() => { setIsHamburgerOpen(false); onOpenOrdersHistory(); }}
                    className="w-full p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 text-zinc-200 font-bold text-xs flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span className="flex items-center gap-2">🛵 Mes Commandes & Suivi</span>
                    <ChevronRight size={14} />
                  </button>
                )}

                {onOpenFavorites && (
                  <button
                    onClick={() => { setIsHamburgerOpen(false); onOpenFavorites(); }}
                    className="w-full p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 text-zinc-200 font-bold text-xs flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span className="flex items-center gap-2">❤️ Mes Restaurants Favoris</span>
                    <ChevronRight size={14} />
                  </button>
                )}

                {onOpenOfflineDownloads && (
                  <button
                    onClick={() => { setIsHamburgerOpen(false); onOpenOfflineDownloads(); }}
                    className="w-full p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 text-zinc-200 font-bold text-xs flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span className="flex items-center gap-2">📥 Menus Hors-Ligne Téléchargés</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-center">
              <p className="text-[10px] text-zinc-500 font-mono">Feed Food v1.0 • Streaming & Gastronomie</p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Popup Notification */}
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18181b] border border-green-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">
            ✓
          </div>
          <div>
            <p className="text-xs font-black text-white uppercase">{addedToast.dishName} ajouté !</p>
            <p className="text-[10px] text-zinc-400 font-mono">Prix: {addedToast.price.toFixed(2)} €</p>
          </div>
          <button
            onClick={onOpenCart}
            className="ml-2 px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
          >
            Voir Panier 🛒
          </button>
        </div>
      )}

      {/* MAIN CONTAINER LAYOUT WITH COLLAPSIBLE SIDEBAR */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 2. LEFT SIDEBAR ("Following & Live Chefs") */}
        <aside 
          className={`${
            isSidebarOpen ? 'w-64' : 'w-16'
          } shrink-0 bg-[#0e0e10] border-r border-[#27272a] transition-all duration-300 flex flex-col justify-between overflow-y-auto select-none hidden md:flex z-20`}
        >
          <div className="p-3 space-y-6">
            
            {/* Quick Favorites Shortcut */}
            {onOpenFavorites && isSidebarOpen && (
              <button
                onClick={onOpenFavorites}
                className="w-full p-2.5 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 text-red-300 font-bold text-xs flex items-center justify-between transition-all cursor-pointer shadow-sm group"
              >
                <span className="flex items-center gap-2">
                  <Heart size={14} className="fill-red-400 text-red-400 group-hover:scale-110 transition-transform" />
                  <span>Mes Favoris ❤️</span>
                </span>
                <span className="text-[10px] font-mono bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                  {followedIds.length}
                </span>
              </button>
            )}

            {/* Section: Live Chefs */}
            <div>
              <div className="flex items-center justify-between px-2 mb-3">
                <span className={`text-[10px] font-mono font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 ${!isSidebarOpen && 'sr-only'}`}>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Chefs En Direct
                </span>
                {isSidebarOpen && (
                  <span className="text-[9px] bg-red-500/20 text-red-400 font-mono font-bold px-1.5 py-0.5 rounded">
                    {liveVideos.length} LIVE
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {effectiveRestaurants.slice(0, 10).map((rest, idx) => {
                  const isFollowing = followedIds.includes(rest.id);
                  const isLiveNow = idx % 2 === 0; // Simulate live continuous stream status
                  const isSelected = selectedRestFilter === rest.id;

                  return (
                    <div
                      key={rest.id}
                      onClick={() => setSelectedRestFilter(isSelected ? null : rest.id)}
                      className={`group p-2 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-purple-600/20 border border-purple-500/40 text-white' 
                          : 'hover:bg-[#18181b] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {/* Avatar with Live Ring */}
                      <div className="relative shrink-0">
                        <img
                          src={rest.logoUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80"}
                          alt={rest.name}
                          className={`w-9 h-9 rounded-full object-cover border-2 ${
                            isLiveNow ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'border-[#27272a]'
                          }`}
                        />
                        {isLiveNow && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-600 border-2 border-[#0e0e10] rounded-full animate-ping" />
                        )}
                      </div>

                      {/* Info Text (When Expanded) */}
                      {isSidebarOpen && (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-white truncate group-hover:text-purple-300">
                              {rest.name}
                            </p>
                            {isLiveNow ? (
                              <span className="text-[9px] font-mono text-red-400 font-bold flex items-center gap-0.5">
                                🔴 LIVE
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-zinc-500">
                                ⚡ Flash
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 truncate font-sans">
                            {rest.slogan || rest.category || "Spécialités maison"}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section: Category Shortcuts */}
            {isSidebarOpen && (
              <div className="pt-3 border-t border-[#27272a]/60 space-y-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-zinc-400 px-2 block">
                  Envie Gourmande
                </span>
                <div className="space-y-1">
                  {categoriesList.map(cat => (
                    <button
                      key={cat.label}
                      onClick={() => setActiveCategory(cat.label)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        activeCategory === cat.label
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'text-zinc-400 hover:bg-[#18181b] hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                      {activeCategory === cat.label && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar Footer CTA */}
          {isSidebarOpen && (
            <div className="p-3 border-t border-[#27272a] bg-[#18181b]/40">
              <div className="p-3 rounded-xl bg-purple-900/20 border border-purple-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-purple-300 text-xs font-black uppercase">
                  <ChefHat size={14} />
                  <span>Devenir Partenaire</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Vous êtes restaurateur ou chef ? Diffusez vos créations en direct.
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN FEED CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 sm:pb-28 space-y-8 max-w-7xl mx-auto w-full">
          
          {/* MOBILE SEARCH & CATEGORIES SCROLLER */}
          <div className="block sm:hidden space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Rechercher plats, chefs, recettes..."
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categoriesList.map(cat => (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(cat.label)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer ${
                    activeCategory === cat.label
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-[#18181b] text-zinc-400 hover:text-white border border-[#27272a]'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filter Status Reset Alert if filter applied */}
          {selectedRestFilter && (
            <div className="bg-purple-900/30 border border-purple-500/40 rounded-2xl p-3 flex items-center justify-between text-xs text-purple-200">
              <div className="flex items-center gap-2">
                <Store size={16} className="text-purple-400" />
                <span>Affichage exclusif des vidéos de: <strong>{restaurants.find(r => r.id === selectedRestFilter)?.name}</strong></span>
              </div>
              <button
                onClick={() => setSelectedRestFilter(null)}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] uppercase cursor-pointer"
              >
                Réinitialiser Filter
              </button>
            </div>
          )}

          {/* 3. HERO CAROUSEL WIDESCREEN FEATURED STAGE */}
          <section className="relative rounded-3xl border border-[#27272a] bg-[#18181b] overflow-hidden shadow-2xl group min-h-[360px] md:min-h-[420px] flex flex-col justify-end">
            
            {/* Background Media Container */}
            <div className="absolute inset-0 w-full h-full">
              {currentHeroVideo && currentHeroVideo.videoUrl ? (
                <BackgroundVideoPlayer
                  src={currentHeroVideo.videoUrl}
                  isPlaying={isHeroPlaying}
                  isMuted={isHeroMuted}
                  className="w-full h-full object-cover opacity-80"
                />
              ) : (
                <img
                  src={currentHeroRestaurant?.bannerUrl || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80"}
                  alt="Featured Stage"
                  className="w-full h-full object-cover opacity-70"
                />
              )}
              {/* Dark Gradient Overlay for Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-[#0e0e10]/60 to-transparent" />
            </div>

            {/* Top Badges Bar */}
            <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  🔴 EN DIRECT EN CUISINE
                </span>
                <span className="bg-purple-600/80 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-purple-400/30">
                  ⚡ 2,840 Spectateurs
                </span>
              </div>

              {/* Sound & Controls */}
              <div className="flex items-center gap-2">
                <button
                  id="btn-dark-stream-toggle-clean-mode"
                  onClick={() => setIsCleanMode(prev => !prev)}
                  className={`group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 border-2 ${
                    isCleanMode
                      ? 'bg-gradient-to-r from-[#FF5C00] via-orange-500 to-amber-500 text-white border-white shadow-[0_0_22px_rgba(255,92,0,0.85)] ring-2 ring-[#FF5C00]/80 scale-105 animate-pulse'
                      : 'bg-zinc-950/90 hover:bg-black text-amber-300 hover:text-amber-200 border-amber-400/90 hover:border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.45)] hover:shadow-[0_0_24px_rgba(251,191,36,0.7)] backdrop-blur-xl ring-1 ring-amber-400/30'
                  }`}
                  title="Version Épurée : Masquer l'interface pour profiter pleinement de la vidéo"
                >
                  {isCleanMode ? (
                    <>
                      <EyeOff size={13} className="text-white shrink-0" />
                      <span className="font-sans font-black tracking-wide">Quitter Épuré</span>
                    </>
                  ) : (
                    <>
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                      </span>
                      <Eye size={13} className="text-amber-300 group-hover:text-amber-200 shrink-0 transition-colors" />
                      <span className="font-sans font-black tracking-wide text-amber-300 group-hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Version Épurée</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsHeroMuted(prev => !prev)}
                  className="p-2 rounded-full bg-black/60 backdrop-blur-md hover:bg-black text-white border border-white/10 transition-all cursor-pointer"
                  title={isHeroMuted ? "Activer le son" : "Désactiver le son"}
                >
                  {isHeroMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                  onClick={() => setIsHeroPlaying(prev => !prev)}
                  className="p-2 rounded-full bg-black/60 backdrop-blur-md hover:bg-black text-white border border-white/10 transition-all cursor-pointer"
                  title={isHeroPlaying ? "Pause" : "Play"}
                >
                  {isHeroPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
            </div>

            {/* Hero Stage Content & CTA */}
            <div className={`relative z-20 p-6 md:p-8 space-y-4 max-w-3xl transition-all duration-500 ${
              isCleanMode ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'
            }`}>
              
              {/* Creator Info */}
              <div className="flex items-center gap-3">
                <img
                  src={currentHeroRestaurant?.logoUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&auto=format&fit=crop&q=80"}
                  alt="Creator"
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-purple-500 shadow-xl"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-black text-white uppercase italic tracking-wide">
                      {currentHeroRestaurant?.name || currentHeroVideo?.restaurantName || "Bistro Gourmet"}
                    </h3>
                    <ShieldCheck size={16} className="text-purple-400 fill-purple-400/20" />
                  </div>
                  <p className="text-xs text-zinc-300 font-sans">
                    {currentHeroRestaurant?.slogan || "Cuisine artisanale faite maison & produits frais du marché"}
                  </p>
                </div>
              </div>

              {/* Title & Price */}
              <div className="space-y-2">
                <h2 className="text-xl md:text-3xl font-black text-white uppercase italic leading-tight drop-shadow-md">
                  {currentHeroVideo?.title || currentHeroDish?.name || "Spécialité Cuisson Minute en Direct"}
                </h2>
                
                {currentHeroDish && (
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-mono font-black text-white bg-purple-600/90 border border-purple-400/40 px-3 py-1 rounded-xl shadow-lg">
                      {currentHeroDish.price.toFixed(2)} €
                    </span>
                    <span className="text-xs text-zinc-300 font-mono bg-black/60 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                      <Clock size={12} className="text-purple-400" />
                      Prêt en 12-15 min
                    </span>
                  </div>
                )}
              </div>

              {/* CTAs Overlay */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {currentHeroDish ? (
                  <>
                    <button
                      onClick={() => onSelectDish(currentHeroDish.id)}
                      className="px-5 py-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-white border border-[#FF5C00]/40 font-black text-xs md:text-sm uppercase tracking-wider shadow-xl flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <Eye size={18} className="text-[#FF5C00]" />
                      <span>Voir Plat & Ingrédients</span>
                    </button>
                    <button
                      onClick={(e) => handleAddToCartQuick(e, currentHeroDish)}
                      className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5C00] via-purple-600 to-red-600 hover:opacity-95 text-white font-black text-xs md:text-sm uppercase tracking-wider shadow-[0_10px_25px_rgba(255,92,0,0.4)] flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <ShoppingBag size={18} />
                      <span>Commander ({currentHeroDish.price.toFixed(2)} €)</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onSelectLiveVideo(currentHeroVideo.id)}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-red-600 hover:opacity-95 text-white font-black text-xs md:text-sm uppercase tracking-wider shadow-xl flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Eye size={18} />
                    <span>Rejoindre le Live Stream</span>
                  </button>
                )}

                <button
                  onClick={() => onSelectLiveVideo(currentHeroVideo.id)}
                  className="px-5 py-3.5 rounded-2xl bg-black/60 hover:bg-black/90 text-white border border-white/20 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
                >
                  <MessageCircle size={16} className="text-purple-400" />
                  <span>Chat Direct & Menu</span>
                </button>
              </div>

            </div>

            {/* Carousel Arrow Controls */}
            {heroFeaturedVideos.length > 1 && (
              <div className="absolute right-4 bottom-6 z-20 flex items-center gap-2">
                <button
                  onClick={() => setHeroIndex(prev => (prev - 1 + heroFeaturedVideos.length) % heroFeaturedVideos.length)}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black text-white border border-white/10 transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1.5 px-2">
                  {heroFeaturedVideos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroIndex(i)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        i === heroIndex ? 'w-6 bg-purple-500' : 'w-2 bg-zinc-600'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setHeroIndex(prev => (prev + 1) % heroFeaturedVideos.length)}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black text-white border border-white/10 transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </section>

          {/* 4. MAIN GRID FEED ("Food Videos & Live Streams") */}
          <section className="space-y-6">
            
            {/* Feed Section Title & Navigation Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#27272a] pb-4">
              <div>
                <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-2">
                  <Tv size={22} className="text-purple-500" />
                  Vidéos Gourmandes & Live Streams
                </h2>
                <p className="text-xs text-zinc-400 font-sans mt-0.5">
                  Regardez les recettes en direct et commandez en 1 clic pour une livraison ultra-rapide.
                </p>
              </div>

              {/* Feed Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'Tous' },
                  { id: 'live', label: '🔴 Live Streams' },
                  { id: 'flash', label: '⚡ Recettes Flash' },
                  { id: 'popular', label: '🔥 Populaires' },
                  { id: 'fast', label: '⚡ Ready to grab (<10m)' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      if (tab.id === 'fast' && setIsFastLane) {
                        setIsFastLane(true);
                        if (setMaxPrepTimeMinutes) setMaxPrepTimeMinutes(10);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black shadow-lg shadow-amber-500/20'
                        : 'bg-[#18181b] text-zinc-400 hover:text-white border border-[#27272a]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Container */}
            {filteredVideos.length === 0 ? (
              <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-12 text-center space-y-4">
                <Tv size={48} className="mx-auto text-zinc-600 animate-pulse" />
                <h3 className="text-base font-black text-white uppercase italic">Aucun flux vidéo trouvé</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto font-sans">
                  Essayez de modifier votre recherche ou de réinitialiser vos filtres de catégories.
                </p>
                <button
                  onClick={() => { handleSearchChange(''); setActiveTab('all'); setActiveCategory('Tous'); setSelectedRestFilter(null); }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase cursor-pointer"
                >
                  Réinitialiser les Filtres
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredVideos.map((video, videoIdx) => {
                  const restaurant = effectiveRestaurants.find(r => r.id === video.restaurantId) || restaurants.find(r => r.id === video.restaurantId);
                  const dish = video.associatedDish || dishes.find(d => d.id === video.associatedDishId || d.restaurantId === video.restaurantId);
                  const isLive = video.isLiveContinuous || video.isOnline || (video.title && (video.title.toLowerCase().includes('live') || video.title.toLowerCase().includes('direct')));
                  const isUnmuted = unmutedCardIds.includes(video.id);
                  const isLiked = likedVideoIds.includes(video.id);
                  const currentLikes = likeCountsState[video.id] ?? (video.likesCount || 120);
                  const isFollowing = restaurant ? followedIds.includes(restaurant.id) : false;
                  const timeAgo = getRelativeTimeStr(video.createdAt, videoIdx);

                  return (
                    <div
                      key={video.id}
                      onClick={() => onSelectLiveVideo(video.id)}
                      onMouseEnter={() => setHoveredVideoId(video.id)}
                      onMouseLeave={() => setHoveredVideoId(null)}
                      className="group bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden hover:border-purple-500/60 transition-all hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(0,0,0,0.7)] flex flex-col cursor-pointer relative"
                    >
                      {/* 1. Header (Instagram / TikTok Creator Header) */}
                      <div className="p-3 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between gap-2 z-10">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={restaurant?.logoUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&auto=format&fit=crop&q=80"}
                              alt={video.restaurantName || "Chef"}
                              className={`w-8 h-8 rounded-full object-cover border-2 ${
                                isLive ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'border-purple-500/60'
                              }`}
                            />
                            {isLive && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-600 border-2 border-[#18181b] rounded-full animate-ping" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-black text-white truncate group-hover:text-purple-300 transition-colors">
                                {restaurant?.name || video.restaurantName || "Restaurateur Partenaire"}
                              </p>
                              <ShieldCheck size={13} className="text-purple-400 shrink-0" />
                            </div>
                            <p className="text-[10px] text-zinc-400 font-mono truncate">
                              {isLive ? (
                                <span className="text-red-400 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                  🔴 LIVE
                                </span>
                              ) : (
                                timeAgo
                              )}
                            </p>
                          </div>
                        </div>

                        {restaurant && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFollow(restaurant.id); }}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                              isFollowing 
                                ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' 
                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                            }`}
                          >
                            {isFollowing ? 'Abonné' : '+ Suivre'}
                          </button>
                        )}
                      </div>

                      {/* 2. Video Canvas (Looping background video as actual thumbnail) */}
                      <div className="relative aspect-[4/5] bg-black overflow-hidden">
                        <BackgroundVideoPlayer
                          src={getSafeVideoUrl(video.videoUrl)}
                          isPlaying={true}
                          isMuted={!isUnmuted}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {/* Top Gradient */}
                        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />
                        
                        {/* Bottom Gradient */}
                        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#18181b] via-[#18181b]/70 to-transparent pointer-events-none" />

                        {/* Top Left Badge: Status & Fast Lane Ready To Grab */}
                        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
                          {isLive ? (
                            <span className="bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              🔴 EN DIRECT
                            </span>
                          ) : (
                            <span className="bg-purple-600/90 text-white text-[9px] font-mono font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-purple-400/30">
                              <Zap size={10} />
                              POST VIDEO
                            </span>
                          )}

                          {(() => {
                            const prep = getDishOrVideoPrepTime(video, restaurant, dish);
                            if (prep <= 10) {
                              return (
                                <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-black text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 border border-amber-300 animate-pulse">
                                  <Zap size={9} className="fill-black text-black" />
                                  <span>Ready to grab ({prep}m)</span>
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        {/* Top Right Controls: Audio Toggle, Offline Download & Viewers */}
                        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                          <button
                            onClick={(e) => toggleMuteCardVideo(e, video.id)}
                            className={`p-1.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                              isUnmuted 
                                ? 'bg-purple-600 text-white border-purple-400 shadow-lg' 
                                : 'bg-black/60 text-zinc-300 hover:text-white border-white/10 hover:bg-black'
                            }`}
                            title={isUnmuted ? "Couper le son" : "Activer le son"}
                          >
                            {isUnmuted ? <Volume2 size={13} /> : <VolumeX size={13} />}
                          </button>

                          <button
                            onClick={(e) => handleToggleDownloadVideo(e, video)}
                            className={`p-1.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                              downloadedVideoIds.includes(video.id)
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : 'bg-black/60 text-zinc-300 hover:text-white border-white/10 hover:bg-black/80'
                            }`}
                            title={downloadedVideoIds.includes(video.id) ? "Enregistrée hors-ligne" : "Télécharger"}
                          >
                            {downloadedVideoIds.includes(video.id) ? (
                              <ShieldCheck size={13} className="text-emerald-400" />
                            ) : (
                              <Download size={13} />
                            )}
                          </button>

                          <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-1 rounded-xl border border-white/10 flex items-center gap-1">
                            <Eye size={12} className="text-purple-400" />
                            <span>{video.viewsCount || video.likesCount * 12 || 480}</span>
                          </div>
                        </div>

                        {/* Bottom Right: Price Tag Overlay */}
                        {dish && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectDish(dish.id);
                            }}
                            className="absolute bottom-3 right-3 z-10 bg-gradient-to-r from-[#FF5C00] to-red-600 hover:scale-105 active:scale-95 text-white text-xs font-mono font-black px-2.5 py-1 rounded-xl shadow-xl border border-white/20 flex items-center gap-1 cursor-pointer transition-all"
                            title="Cliquer pour voir la fiche plat & photos"
                          >
                            <Eye size={12} />
                            <span>{dish.price.toFixed(2)} €</span>
                          </button>
                        )}
                      </div>

                      {/* 3. Card Content Footer & Social Interactions (Instagram / TikTok Style) */}
                      <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between relative z-10 bg-[#18181b]">
                        
                        {/* Title & Caption */}
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-zinc-100 line-clamp-2 leading-snug group-hover:text-purple-200 transition-colors">
                            {video.title}
                          </h4>
                          {video.description && (
                            <p className="text-[10px] text-zinc-400 line-clamp-1 font-sans">
                              {video.description}
                            </p>
                          )}
                        </div>

                        {/* Social Interactions Bar */}
                        <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-[#27272a]/60 text-xs">
                          <button
                            onClick={(e) => toggleLikeVideo(e, video.id, video.likesCount || 120)}
                            className={`flex items-center gap-1.5 hover:text-red-500 transition-colors cursor-pointer font-mono text-[11px] ${
                              isLiked ? 'text-red-500 font-bold' : ''
                            }`}
                          >
                            <Heart size={15} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
                            <span>{currentLikes}</span>
                          </button>

                          <button
                            onClick={() => onSelectLiveVideo(video.id)}
                            className="flex items-center gap-1.5 hover:text-purple-300 transition-colors cursor-pointer font-mono text-[11px]"
                          >
                            <MessageCircle size={15} />
                            <span>{(video.viewsCount ? Math.floor(video.viewsCount / 15) : 34)}</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(window.location.href);
                                setAddedToast({ dishName: "Lien de la vidéo copié !", price: 0 });
                                setTimeout(() => setAddedToast(null), 2500);
                              }
                            }}
                            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                            title="Partager le post"
                          >
                            <Share2 size={15} />
                          </button>
                        </div>

                        {/* Instant 1-Click Purchase & Dish Details Actions */}
                        <div className="pt-2 border-t border-[#27272a] flex items-center justify-between gap-2">
                          {dish ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectDish(dish.id);
                                }}
                                className="py-2 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 hover:text-white text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                                title="Voir la galerie photos, ingrédients et description"
                              >
                                <Eye size={13} className="text-[#FF5C00]" />
                                <span>Fiche</span>
                              </button>
                              <button
                                onClick={(e) => handleAddToCartQuick(e, dish)}
                                className="flex-1 py-2 px-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 border border-purple-500/40 text-purple-200 hover:text-white text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-md cursor-pointer truncate"
                              >
                                <ShoppingBag size={13} />
                                <span>+ Panier ({dish.price.toFixed(2)} €)</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => onSelectLiveVideo(video.id)}
                              className="w-full py-2 px-3 rounded-xl bg-[#27272a] hover:bg-purple-600 text-white text-xs font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Eye size={14} />
                              <span>Voir le Stream</span>
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </section>

        </main>
      </div>

    </div>
  );
}
