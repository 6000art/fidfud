import React, { useState, useEffect, useMemo, useRef } from 'react';
import DietaryBadges from './DietaryBadges';
import LazyImage from './LazyImage';
import BackgroundVideoPlayer from './BackgroundVideoPlayer';
import ReviewsAndRatingSection from './ReviewsAndRatingSection';
import AnimatedDishThumbnail from './AnimatedDishThumbnail';
import { 
  X, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ShieldCheck, 
  Star, 
  Calendar, 
  Clock, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  FileText,
  Sparkles,
  Flame,
  ChefHat,
  Play,
  Pause,
  RotateCcw,
  Film,
  Volume2,
  VolumeX,
  Maximize2,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Image as ImageIcon,
  Video as VideoIcon,
  Zap,
  Check,
  Download,
  Search,
  ArrowLeft,
  AlertTriangle,
  Leaf,
  UtensilsCrossed,
  Info,
  Wheat,
  CheckCircle2,
  Heart,
  Bookmark,
  Eye,
  UploadCloud,
  Camera,
  Trash2,
  Ban,
  AlertCircle
} from 'lucide-react';
import { offlineCacheService } from '../services/OfflineCacheService';
import { Dish, Review, Reservation, Order, Restaurant, SupplementOption } from '../types';
import { notify } from '../utils/notify';
import { getSafeVideoUrl, STABLE_CULINARY_FALLBACK_VIDEOS } from '../utils/videoUtils';
import { enrichDishData, EnrichedDishData } from '../utils/dishEnrichment';

export interface MediaGalleryItem {
  id: string;
  type: 'image' | 'video' | 'camera_live';
  url: string;
  thumbnailUrl?: string;
  title: string;
  caption?: string;
  isLive?: boolean;
}

interface DishDrawerProps {
  dishId: string | null;
  restaurantName: string | null;
  onClose: () => void;
  onAddToCart: (dish: Dish, quantity: number, selectedSupplements?: SupplementOption[]) => void;
  dishes: Dish[];
  user: any;
  onOpenAuth: () => void;
  isOrderingEnabled?: boolean;
  initialTab?: TabType;
  orders?: Order[];
}

type TabType = 'order' | 'menu' | 'reviews' | 'reserve';

// Recommendation matching logic based on co-occurrence in orders, name category semantics, and popular items
function getComplementarySuggestions(
  currentDish: Dish,
  allDishes: Dish[],
  orders: Order[] = []
): Array<{ dish: Dish; score: number; matchType: 'co_occurrence' | 'category' | 'popular' }> {
  if (!currentDish) return [];

  const restaurantDishes = allDishes.filter(
    d => d.restaurantId === currentDish.restaurantId && d.id !== currentDish.id && d.isAvailable
  );

  // 1. Analyze Co-occurrence in orders
  const coOccurrenceCounts: Record<string, number> = {};
  
  if (orders && Array.isArray(orders)) {
    // Filter orders for this restaurant that contain our current dish
    const matchingOrders = orders.filter(o => 
      o.restaurantId === currentDish.restaurantId && 
      o.items?.some(item => item.dishId === currentDish.id)
    );

    matchingOrders.forEach(order => {
      order.items?.forEach(item => {
        if (item.dishId !== currentDish.id) {
          coOccurrenceCounts[item.dishId] = (coOccurrenceCounts[item.dishId] || 0) + item.quantity;
        }
      });
    });
  }

  // 2. Identify categories via simple semantic NLP heuristic
  const getDishCategoryType = (d: Dish): 'main' | 'drink' | 'dessert' | 'side' => {
    const nameLower = d.name.toLowerCase();
    const descLower = (d.description || '').toLowerCase();
    const catLower = (d.category || '').toLowerCase();

    // Check drinks
    if (
      catLower.includes('boisson') || catLower.includes('drink') || catLower.includes('cocktail') ||
      nameLower.includes('coca') || nameLower.includes('fanta') || nameLower.includes('sprite') ||
      nameLower.includes('jus') || nameLower.includes('eau ') || nameLower.includes('bouteille') ||
      nameLower.includes('bière') || nameLower.includes('tea') || nameLower.includes('pepsi') ||
      nameLower.includes('limonade') || nameLower.includes('perrier') || nameLower.includes('vittel') ||
      nameLower.includes('boisson') || nameLower.includes('boba') || nameLower.includes('café') ||
      nameLower.includes('iced')
    ) {
      return 'drink';
    }

    // Check desserts
    if (
      catLower.includes('dessert') || catLower.includes('sucré') || catLower.includes('patisserie') ||
      nameLower.includes('cookie') || nameLower.includes('tiramisu') || nameLower.includes('muffin') ||
      nameLower.includes('glace') || nameLower.includes('tarte') || nameLower.includes('fondant') ||
      nameLower.includes('donut') || nameLower.includes('cheesecake') || nameLower.includes('crêpe') ||
      nameLower.includes('gâteau') || nameLower.includes('brownie') || nameLower.includes('mochi')
    ) {
      return 'dessert';
    }

    // Check sides
    if (
      catLower.includes('accompagnement') || catLower.includes('entrée') || catLower.includes('side') ||
      nameLower.includes('frite') || nameLower.includes('potato') || nameLower.includes('salade') ||
      nameLower.includes('onion ring') || nameLower.includes('nugget') || nameLower.includes('tapas') ||
      nameLower.includes('calamar') || nameLower.includes('sauce') || nameLower.includes('pain') ||
      nameLower.includes('soupe') || nameLower.includes('edamame') || nameLower.includes('tempura')
    ) {
      return 'side';
    }

    return 'main';
  };

  const currentType = getDishCategoryType(currentDish);

  // Score each eligible dish
  const scoredDishes = restaurantDishes.map(d => {
    const otherType = getDishCategoryType(d);
    let score = 0;
    let matchType: 'co_occurrence' | 'category' | 'popular' = 'popular';

    // A. Co-occurrence score
    const coCount = coOccurrenceCounts[d.id] || 0;
    if (coCount > 0) {
      score += coCount * 12; // High weight for real co-purchase patterns
      matchType = 'co_occurrence';
    }

    // B. Category complementarity bonus
    if (currentType === 'main') {
      // Mains pair perfectly with drinks and sides, and secondly with desserts
      if (otherType === 'drink') {
        score += 8;
        if (matchType !== 'co_occurrence') matchType = 'category';
      } else if (otherType === 'side') {
        score += 7;
        if (matchType !== 'co_occurrence') matchType = 'category';
      } else if (otherType === 'dessert') {
        score += 4;
        if (matchType !== 'co_occurrence') matchType = 'category';
      }
    } else if (currentType === 'drink') {
      // Drinks pair with mains and sides
      if (otherType === 'main') {
        score += 8;
        if (matchType !== 'co_occurrence') matchType = 'category';
      } else if (otherType === 'side') {
        score += 5;
        if (matchType !== 'co_occurrence') matchType = 'category';
      }
    } else if (currentType === 'side') {
      // Sides pair with mains and drinks
      if (otherType === 'main') {
        score += 8;
        if (matchType !== 'co_occurrence') matchType = 'category';
      } else if (otherType === 'drink') {
        score += 6;
        if (matchType !== 'co_occurrence') matchType = 'category';
      }
    } else if (currentType === 'dessert') {
      // Desserts pair with mains and drinks
      if (otherType === 'main') {
        score += 7;
        if (matchType !== 'co_occurrence') matchType = 'category';
      } else if (otherType === 'drink') {
        score += 4;
        if (matchType !== 'co_occurrence') matchType = 'category';
      }
    }

    // C. Popularity boost
    if (d.isPopular) {
      score += 3;
    }

    // D. Stock indicator (encourage moving items with decent stock, but not low stock warning level)
    if (d.stockCount !== undefined && d.stockCount >= 5) {
      score += 1;
    }

    return {
      dish: d,
      score,
      matchType
    };
  });

  // Sort by score descending
  scoredDishes.sort((a, b) => b.score - a.score);

  return scoredDishes;
}

function getSimilarDishes(currentDish: Dish, allDishes: Dish[], limit: number = 6): Dish[] {
  if (!currentDish || !allDishes || allDishes.length === 0) return [];

  const currCat = (currentDish.category || '').toLowerCase().trim();

  const getBadges = (d: Dish): string[] => {
    const list: string[] = [];
    if (Array.isArray(d.dietaryBadges)) list.push(...d.dietaryBadges);
    if (Array.isArray(d.dietary_info)) list.push(...d.dietary_info);
    if (typeof d.dietary_info === 'string') list.push(...d.dietary_info.split(','));
    if (Array.isArray(d.dietaryInfo)) list.push(...d.dietaryInfo);
    if (typeof d.dietaryInfo === 'string') list.push(...d.dietaryInfo.split(','));
    return list.map(b => b.toLowerCase().trim()).filter(Boolean);
  };

  const currBadges = new Set(getBadges(currentDish));

  const currFlags = {
    isHalal: !!currentDish.isHalal,
    isKosher: !!currentDish.isKosher,
    isBio: !!currentDish.isBio,
    isVegan: !!currentDish.isVegan,
    isVegetarian: !!currentDish.isVegetarian,
    isGlutenFree: !!currentDish.isGlutenFree,
    isHomemade: !!currentDish.isHomemade,
    isPopular: !!currentDish.isPopular
  };

  const scored = allDishes
    .filter(d => d.id !== currentDish.id && d.isAvailable !== false)
    .map(d => {
      let score = 0;
      const candCat = (d.category || '').toLowerCase().trim();

      // 1. Identical / Similar Category
      if (currCat && candCat) {
        if (candCat === currCat) {
          score += 20;
        } else if (candCat.includes(currCat) || currCat.includes(candCat)) {
          score += 10;
        }
      }

      // 2. Overlapping Badges / Tags
      const candBadges = getBadges(d);
      let badgeMatches = 0;
      candBadges.forEach(b => {
        if (currBadges.has(b)) badgeMatches++;
      });
      score += badgeMatches * 6;

      // 3. Overlapping Boolean Flags
      if (currFlags.isHalal && d.isHalal) score += 5;
      if (currFlags.isKosher && d.isKosher) score += 5;
      if (currFlags.isBio && d.isBio) score += 5;
      if (currFlags.isVegan && d.isVegan) score += 5;
      if (currFlags.isVegetarian && d.isVegetarian) score += 5;
      if (currFlags.isGlutenFree && d.isGlutenFree) score += 5;
      if (currFlags.isHomemade && d.isHomemade) score += 5;
      if (currFlags.isPopular && d.isPopular) score += 3;

      // 4. Same restaurant bonus
      if (d.restaurantId === currentDish.restaurantId) {
        score += 2;
      }

      return { dish: d, score };
    });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  let results = scored.filter(s => s.score > 0).map(s => s.dish);

  if (results.length === 0) {
    results = allDishes.filter(d => d.id !== currentDish.id);
  }

  return results.slice(0, limit);
}

interface FastPrepTimerProps {
  preparationTimeMinutes?: number;
}

function FastPrepTimer({ preparationTimeMinutes = 10 }: FastPrepTimerProps) {
  const getSecondsRemaining = () => {
    const now = new Date();
    const totalSeconds = preparationTimeMinutes * 60;
    const currentSeconds = (now.getMinutes() % preparationTimeMinutes) * 60 + now.getSeconds();
    const remaining = totalSeconds - currentSeconds;
    return remaining > 0 ? remaining : totalSeconds;
  };

  const [timeLeft, setTimeLeft] = useState<number>(getSecondsRemaining());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getSecondsRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, [preparationTimeMinutes]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const totalSeconds = preparationTimeMinutes * 60;
  const percentage = (timeLeft / totalSeconds) * 100;

  return (
    <div className="bg-[#FF5C00]/5 border border-[#FF5C00]/25 rounded-2xl p-4 space-y-3 relative overflow-hidden animate-fade-in shadow-lg shadow-black/40">
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#FF5C00]/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5C00] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5C00]"></span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#FF5C00]">
            ⚡ PRÉPARATION EXPRESS ACTIVE
          </span>
        </div>
        
        <div className="text-[10px] font-black font-mono bg-zinc-950 px-2 py-0.5 rounded border border-[#FF5C00]/15 text-[#FF5C00]">
          -{preparationTimeMinutes} MIN MAX
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 py-1.5">
        <div className="flex-1 space-y-1 min-w-0">
          <h4 className="text-white text-xs font-black tracking-tight leading-none">
            Prochain départ en cuisine
          </h4>
          <p className="text-[9px] text-zinc-400 font-medium leading-relaxed">
            Commandez maintenant pour inclure ce plat dans la prochaine fournée prioritaire.
          </p>
        </div>

        <div className="flex flex-col items-end shrink-0 bg-zinc-950/90 border border-white/5 rounded-xl px-3.5 py-2.5 shadow-inner">
          <span className="text-[7.5px] font-black uppercase tracking-widest text-zinc-500 font-mono">Décompte</span>
          <span className="text-lg font-black text-white font-mono tracking-tight leading-none tabular-nums animate-pulse">
            {formattedTime}
          </span>
        </div>
      </div>

      <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
        <div 
          className="h-full bg-gradient-to-r from-[#FF5C00] to-amber-500 transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center gap-2 text-[8px] text-zinc-500 font-bold uppercase tracking-wider pt-0.5 border-t border-white/5">
        <span>🕒 Heure de commande max :</span>
        <span className="text-zinc-400 font-extrabold font-mono">
          {new Date(Date.now() + timeLeft * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

export default function DishDrawer({ 
  dishId, 
  restaurantName, 
  onClose, 
  onAddToCart, 
  dishes,
  user,
  onOpenAuth,
  isOrderingEnabled = true,
  initialTab = 'order',
  orders = []
}: DishDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [quantity, setQuantity] = useState<number>(1);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [localDishId, setLocalDishId] = useState<string | null>(null);
  const [addedSuggestions, setAddedSuggestions] = useState<Record<string, boolean>>({});

  // Media Gallery & Carousel / Lightbox States
  const [activeMediaFilter, setActiveMediaFilter] = useState<'all' | 'photos' | 'videos' | 'cameras'>('all');
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [isLightboxMuted, setIsLightboxMuted] = useState<boolean>(false);
  const [isMainVideoMuted, setIsMainVideoMuted] = useState<boolean>(true);

  // Lightbox Interactive Zoom & Pan States
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxPan, setLightboxPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingLightbox, setIsDraggingLightbox] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const lightboxThumbStripRef = useRef<HTMLDivElement | null>(null);

  // Reset zoom & pan when image changes or lightbox opens/closes
  useEffect(() => {
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    setIsDraggingLightbox(false);
  }, [lightboxIndex, isLightboxOpen]);

  // Auto-scroll active thumbnail into view in the lightbox
  useEffect(() => {
    if (isLightboxOpen && lightboxThumbStripRef.current) {
      const activeEl = lightboxThumbStripRef.current.children[lightboxIndex] as HTMLElement | undefined;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [lightboxIndex, isLightboxOpen]);

  // Short Cooking Video Popup States
  const [isCookingVideoOpen, setIsCookingVideoOpen] = useState<boolean>(false);
  const [isCookingVideoPlaying, setIsCookingVideoPlaying] = useState<boolean>(true);
  const [isCookingVideoMuted, setIsCookingVideoMuted] = useState<boolean>(false);
  const [cookingVideoProgress, setCookingVideoProgress] = useState<number>(0);
  const [cookingVideoCurrentTime, setCookingVideoCurrentTime] = useState<number>(0);
  const [cookingVideoDuration, setCookingVideoDuration] = useState<number>(0);
  const cookingVideoRef = useRef<HTMLVideoElement | null>(null);
  const drawerContentRef = useRef<HTMLDivElement | null>(null);

  // Pause background videos when modal opens/closes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('fidfud-pause-all-videos'));
    return () => {
      window.dispatchEvent(new CustomEvent('fidfud-pause-all-videos'));
    };
  }, [localDishId]);

  // Reviews State
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [dishReviewsList, setDishReviewsList] = useState<Review[]>([]);
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [reviewTextInput, setReviewTextInput] = useState<string>('');
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const [dishRatingInput, setDishRatingInput] = useState<number>(5);
  const [dishReviewTextInput, setDishReviewTextInput] = useState<string>('');
  const [hoverDishRating, setHoverDishRating] = useState<number | null>(null);
  const [reviewsScope, setReviewsScope] = useState<'dish' | 'restaurant'>('dish');
  
  // Reservation State
  const [reservationDate, setReservationDate] = useState<string>('');
  const [reservationTime, setReservationTime] = useState<string>('20:00');
  const [reservationGuests, setReservationGuests] = useState<number>(2);
  const [reservationNotes, setReservationNotes] = useState<string>('');
  const [reservationSuccess, setReservationSuccess] = useState<Reservation | null>(null);

  const [selectedSupplements, setSelectedSupplements] = useState<SupplementOption[]>([]);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Custom User/Restaurateur Added Media State
  const [customMediaList, setCustomMediaList] = useState<MediaGalleryItem[]>([]);
  const [isAddMediaOpen, setIsAddMediaOpen] = useState<boolean>(false);
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');
  const [newMediaUrl, setNewMediaUrl] = useState<string>('');
  const [newMediaTitle, setNewMediaTitle] = useState<string>('');
  const [newMediaCaption, setNewMediaCaption] = useState<string>('');
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);

  // Load custom user/restaurateur uploaded media from localStorage on dish change
  useEffect(() => {
    if (localDishId) {
      try {
        const saved = localStorage.getItem(`fidfud_dish_media_${localDishId}`);
        setCustomMediaList(saved ? JSON.parse(saved) : []);
      } catch (e) {
        setCustomMediaList([]);
      }
    }
  }, [localDishId]);

  // Restaurant Follow / Favorite state
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isFollowLoading, setIsFollowLoading] = useState<boolean>(false);

  useEffect(() => {
    if (dishId) {
      setLocalDishId(dishId);
      setActiveTab(initialTab);
      setSelectedSupplements([]);
    }
  }, [dishId, initialTab]);

  const dish = dishes.find(d => d.id === localDishId);

  // Synchronize following status with user preferences and localStorage
  useEffect(() => {
    if (!dish?.restaurantId) return;

    try {
      const saved = JSON.parse(localStorage.getItem('fidfud_followed_chefs') || '[]');
      const userSaved = user?.savedRestaurantIds || user?.favoriteRestaurantIds || [];
      setIsFollowing(saved.includes(dish.restaurantId) || userSaved.includes(dish.restaurantId));
    } catch (e) {
      setIsFollowing(false);
    }

    if (user?.id) {
      fetch(`/api/users/${user.id}/favorites`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.savedRestaurantIds)) {
            setIsFollowing(data.savedRestaurantIds.includes(dish.restaurantId));
          }
        })
        .catch(() => {});
    }
  }, [dish?.restaurantId, user?.id, user?.savedRestaurantIds]);

  const handleToggleFollow = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!dish?.restaurantId) return;

    if (!user) {
      notify("Connexion requise", "Connectez-vous pour ajouter ce restaurant à vos favoris ❤️", "info");
      onOpenAuth();
      return;
    }

    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setIsFollowLoading(true);

    try {
      // LocalStorage instant optimistic update
      const saved = JSON.parse(localStorage.getItem('fidfud_followed_chefs') || '[]');
      const updated = nextState 
        ? Array.from(new Set([...saved, dish.restaurantId]))
        : saved.filter((id: string) => id !== dish.restaurantId);
      localStorage.setItem('fidfud_followed_chefs', JSON.stringify(updated));

      const res = await fetch(`/api/users/${user.id}/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: dish.restaurantId })
      });
      const data = await res.json();

      if (data.success) {
        setIsFollowing(data.isFollowing);
        window.dispatchEvent(new CustomEvent('fidfud-favorites-updated', {
          detail: { restaurantId: dish.restaurantId, isFollowing: data.isFollowing, savedRestaurantIds: data.savedRestaurantIds }
        }));
        notify(
          data.isFollowing ? "Restaurant Suivi !" : "Favoris mis à jour",
          data.isFollowing 
            ? `Vous suivez désormais ${restaurantName || 'ce restaurant'}. Retrouvez-le dans l'onglet Favoris ❤️`
            : `Vous ne suivez plus ${restaurantName || 'ce restaurant'}.`,
          data.isFollowing ? "success" : "info"
        );
      }
    } catch (err) {
      console.error('Follow error in DishDrawer:', err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Rich Enriched Data for Dish (Gallery, Ingredients, Nutrition, Allergens, Chef Notes)
  const enrichedData = useMemo(() => {
    if (!dish) return null;
    return enrichDishData(dish);
  }, [dish]);

  // Multi-photo gallery list builder
  const galleryImages = useMemo(() => {
    if (!dish) return [];
    if (enrichedData?.galleryImages && enrichedData.galleryImages.length > 0) {
      return enrichedData.galleryImages;
    }
    
    // Combine explicit galleryImages with dish.imageUrl
    const imgs: string[] = [];
    if (dish.imageUrl && dish.imageUrl.trim()) {
      imgs.push(dish.imageUrl.trim());
    }
    if (dish.galleryImages && Array.isArray(dish.galleryImages)) {
      dish.galleryImages.forEach(img => {
        if (img && img.trim() && !imgs.includes(img.trim())) {
          imgs.push(img.trim());
        }
      });
    }

    if (imgs.length > 0) {
      return imgs;
    }

    return [
      dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&auto=format&fit=crop&q=80'
    ];
  }, [dish, enrichedData]);

  // Video URL for dish
  const dishVideoUrl = useMemo(() => {
    if (!dish) return '';
    if (dish.videoUrl && dish.videoUrl.trim() !== '') return getSafeVideoUrl(dish.videoUrl);
    return STABLE_CULINARY_FALLBACK_VIDEOS[0];
  }, [dish]);

  // Unified Media Gallery (Photos + Video Clips + User/Restaurateur Uploads)
  const mediaGallery = useMemo<MediaGalleryItem[]>(() => {
    if (!dish) return [];

    const items: MediaGalleryItem[] = [];

    // 1. Custom User/Restaurateur Media First
    if (customMediaList && customMediaList.length > 0) {
      customMediaList.forEach(cItem => {
        items.push(cItem);
      });
    }

    // 2. Photos
    galleryImages.forEach((imgUrl, idx) => {
      if (!items.some(it => it.url === imgUrl)) {
        let title = `Photo HD #${idx + 1}`;
        let caption = `Aperçu gourmet HD de ${dish.name}`;
        if (idx === 0) {
          title = 'Présentation Signature';
          caption = 'Plat dressé à la commande par le chef';
        } else if (idx === 1) {
          title = 'Ingrédients & Fraîcheur';
          caption = 'Produits rigoureusement sélectionnés auprès de nos producteurs';
        } else if (idx === 2) {
          title = 'Cuisson & Texture';
          caption = 'Finition dorée et jus de cuisson réduit';
        } else if (idx === 3) {
          title = 'Accompagnement Gourmet';
          caption = 'Servi chaud sur plateau de présentation';
        }

        items.push({
          id: `img-${idx}`,
          type: 'image',
          url: imgUrl,
          thumbnailUrl: imgUrl,
          title,
          caption
        });
      }
    });

    // 3. Videos
    if (dishVideoUrl && !items.some(it => it.url === dishVideoUrl)) {
      items.push({
        id: 'vid-1',
        type: 'video',
        url: dishVideoUrl,
        thumbnailUrl: galleryImages[0] || dish.imageUrl,
        title: 'Vidéo Dégustation Live 4K',
        caption: 'Préparation minute & flambage en direct en cuisine'
      });
    }

    if (!items.some(it => it.id === 'vid-2')) {
      items.push({
        id: 'vid-2',
        type: 'video',
        url: STABLE_CULINARY_FALLBACK_VIDEOS[1],
        thumbnailUrl: galleryImages[1] || galleryImages[0],
        title: 'Coulisses Cuisine & Savoir-faire',
        caption: 'Processus artisanal et secrets de dressage de la maison'
      });
    }

    // 4. Live Kitchen & Counter Cameras (Caméras Live HD)
    items.push({
      id: 'cam-live-cuisine',
      type: 'camera_live',
      url: STABLE_CULINARY_FALLBACK_VIDEOS[2],
      thumbnailUrl: galleryImages[0] || dish.imageUrl,
      title: '🔴 Caméra Live Cuisines (Four & Feux)',
      caption: 'Vue directe en temps réel sur la brigade et le plan de cuisson',
      isLive: true
    });

    items.push({
      id: 'cam-live-dressage',
      type: 'camera_live',
      url: STABLE_CULINARY_FALLBACK_VIDEOS[3],
      thumbnailUrl: galleryImages[1] || galleryImages[0],
      title: '🔴 Caméra Live Comptoir & Dressage',
      caption: 'Contrôle qualité et dressage minute avant départ coursier',
      isLive: true
    });

    return items;
  }, [dish, galleryImages, dishVideoUrl, customMediaList]);

  // Handler for adding custom user/restaurateur media (Photo or Video)
  const handleAddCustomMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaUrl.trim() && !newMediaFile) {
      notify("Média Requis", "Veuillez fournir une URL valide ou sélectionner un fichier", "warn");
      return;
    }

    const finalTitle = newMediaTitle.trim() || (newMediaType === 'image' ? `Photo de ${dish?.name || 'plat'}` : `Vidéo de ${dish?.name || 'plat'}`);
    const finalCaption = newMediaCaption.trim() || (newMediaType === 'image' ? 'Ajoutée à la galerie gourmet' : 'Préparation & dégustation');

    const saveMediaItem = (mediaUrl: string) => {
      const newItem: MediaGalleryItem = {
        id: `custom-media-${Date.now()}`,
        type: newMediaType,
        url: mediaUrl,
        thumbnailUrl: newMediaType === 'image' ? mediaUrl : (galleryImages[0] || dish?.imageUrl),
        title: finalTitle,
        caption: finalCaption
      };

      const updated = [newItem, ...customMediaList];
      setCustomMediaList(updated);
      if (dish?.id) {
        localStorage.setItem(`fidfud_dish_media_${dish.id}`, JSON.stringify(updated));
      }
      notify("Média Ajouté !", `${newMediaType === 'image' ? 'Photo' : 'Vidéo'} ajoutée avec succès à la galerie !`, "success");
      setIsAddMediaOpen(false);
      setNewMediaUrl('');
      setNewMediaTitle('');
      setNewMediaCaption('');
      setNewMediaFile(null);
      setActiveMediaIndex(0);
    };

    if (newMediaFile) {
      setIsUploadingMedia(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        setIsUploadingMedia(false);
        if (event.target?.result) {
          saveMediaItem(event.target.result as string);
        }
      };
      reader.onerror = () => {
        setIsUploadingMedia(false);
        notify("Erreur", "Impossible de charger le fichier sélectionné", "warn");
      };
      reader.readAsDataURL(newMediaFile);
    } else {
      saveMediaItem(newMediaUrl.trim());
    }
  };

  const handleDeleteCustomMedia = (mediaId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = customMediaList.filter(m => m.id !== mediaId);
    setCustomMediaList(updated);
    if (dish?.id) {
      localStorage.setItem(`fidfud_dish_media_${dish.id}`, JSON.stringify(updated));
    }
    notify("Média Supprimé", "Le média a été retiré de votre galerie", "info");
  };

  // Filtered media items based on tab selection
  const filteredMediaGallery = useMemo(() => {
    if (activeMediaFilter === 'photos') {
      return mediaGallery.filter(m => m.type === 'image');
    }
    if (activeMediaFilter === 'videos') {
      return mediaGallery.filter(m => m.type === 'video');
    }
    if (activeMediaFilter === 'cameras') {
      return mediaGallery.filter(m => m.type === 'camera_live');
    }
    return mediaGallery;
  }, [mediaGallery, activeMediaFilter]);

  useEffect(() => {
    if (activeMediaIndex >= filteredMediaGallery.length) {
      setActiveMediaIndex(0);
    }
  }, [filteredMediaGallery.length, activeMediaIndex]);

  const currentMedia = filteredMediaGallery[activeMediaIndex] || filteredMediaGallery[0] || mediaGallery[0];
  const activeLightboxMedia = mediaGallery[lightboxIndex] || mediaGallery[0];

  // Lightbox Keyboard Navigation (Esc, Left/Right Arrow Keys, Zoom +/-, Reset 0, Mute M)
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setLightboxIndex(prev => (prev + 1) % mediaGallery.length);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setLightboxIndex(prev => (prev === 0 ? mediaGallery.length - 1 : prev - 1));
      } else if (e.key === '+' || e.key === '=') {
        setLightboxZoom(prev => Math.min(prev + 0.5, 3));
      } else if (e.key === '-' || e.key === '_') {
        setLightboxZoom(prev => Math.max(prev - 0.5, 1));
      } else if (e.key === '0' || e.key.toLowerCase() === 'r') {
        setLightboxZoom(1);
        setLightboxPan({ x: 0, y: 0 });
      } else if (e.key.toLowerCase() === 'm') {
        setIsLightboxMuted(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, mediaGallery.length]);

  // Lock scroll when lightbox is active
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen]);

  // Reset indices on dish change
  useEffect(() => {
    setActiveMediaIndex(0);
    setLightboxIndex(0);
    setIsLightboxOpen(false);
    setIsCookingVideoOpen(false);
  }, [localDishId]);

  // Check and extract cooking / preparation video if available in data
  const cookingVideoData = useMemo(() => {
    if (!dish) return null;
    const rawUrl = dish.cookingVideoUrl || dish.prepVideoUrl || dish.videoUrl || dishVideoUrl;
    if (!rawUrl || rawUrl.trim() === '') return null;
    return {
      url: rawUrl.trim(),
      dishName: dish.name,
      dishPrice: dish.price,
      dishCategory: dish.category || 'Spécialité',
      restaurantName: restaurantName || 'Restaurant Signature',
      posterUrl: dish.imageUrl || (dish.galleryImages && dish.galleryImages[0])
    };
  }, [dish, dishVideoUrl, restaurantName]);

  const hasCookingVideo = Boolean(cookingVideoData);

  const formatVideoTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleToggleCookingVideoPlay = () => {
    if (!cookingVideoRef.current) return;
    if (cookingVideoRef.current.paused) {
      cookingVideoRef.current.play().catch(() => {});
      setIsCookingVideoPlaying(true);
    } else {
      cookingVideoRef.current.pause();
      setIsCookingVideoPlaying(false);
    }
  };

  // Keyboard navigation & body lock for Cooking Video Popup
  useEffect(() => {
    if (!isCookingVideoOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCookingVideoOpen(false);
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        handleToggleCookingVideoPlay();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsCookingVideoMuted(prev => {
          if (cookingVideoRef.current) cookingVideoRef.current.muted = !prev;
          return !prev;
        });
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCookingVideoOpen]);

  const complementarySuggestions = useMemo(() => {
    if (!dish) return [];
    return getComplementarySuggestions(dish, dishes, orders);
  }, [dish, dishes, orders]);

  const similarDishes = useMemo(() => {
    if (!dish) return [];
    return getSimilarDishes(dish, dishes, 6);
  }, [dish, dishes]);

  // Load reviews whenever dish or localDishId changes
  useEffect(() => {
    if (dish) {
      // Fetch restaurant reviews
      fetch(`/api/restaurants/${dish.restaurantId}/reviews`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => setReviewsList(data))
        .catch(err => console.warn('Failed to load restaurant reviews in DishDrawer:', err.message || err));

      // Fetch dish-specific reviews
      fetch(`/api/dishes/${dish.id}/reviews`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => setDishReviewsList(data))
        .catch(err => console.warn('Failed to load dish reviews in DishDrawer:', err.message || err));
    }
  }, [dish]);

  // Reset states when dish changes
  useEffect(() => {
    setQuantity(1);
    setShowNotification(false);
    setReservationSuccess(null);
    setReviewsScope('dish'); // Default to showing reviews for the selected dish
    setAddedSuggestions({});
  }, [localDishId]);

  // Menu filtering & search states
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuSelectedCategory, setMenuSelectedCategory] = useState<string>('all');
  const [menuDietaryFilter, setMenuDietaryFilter] = useState<string>('all');

  const [isMenuDownloadedState, setIsMenuDownloadedState] = useState<boolean>(() => 
    dish?.restaurantId ? offlineCacheService.isMenuDownloaded(dish.restaurantId) : false
  );

  useEffect(() => {
    if (!dish?.restaurantId) return;
    setIsMenuDownloadedState(offlineCacheService.isMenuDownloaded(dish.restaurantId));
    const unsub = offlineCacheService.subscribeDownloads(() => {
      setIsMenuDownloadedState(offlineCacheService.isMenuDownloaded(dish.restaurantId));
    });
    return () => unsub();
  }, [dish?.restaurantId]);

  // Filter dishes to form the restaurant's complete menu
  const restaurantMenu = useMemo(() => {
    if (!dish?.restaurantId) return [];
    return dishes.filter(d => d.restaurantId === dish.restaurantId);
  }, [dishes, dish?.restaurantId]);

  const menuCategories = useMemo(() => {
    const cats = new Set<string>();
    restaurantMenu.forEach(d => {
      if (d.category) cats.add(d.category);
    });
    return Array.from(cats);
  }, [restaurantMenu]);

  const filteredRestaurantMenu = useMemo(() => {
    return restaurantMenu.filter(d => {
      const q = menuSearchQuery.toLowerCase().trim();
      const ingredientsStr = d.ingredients 
        ? (Array.isArray(d.ingredients) ? d.ingredients.join(' ') : String(d.ingredients)) 
        : '';
      const matchesSearch = !q || 
        d.name.toLowerCase().includes(q) || 
        (d.description || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q) ||
        ingredientsStr.toLowerCase().includes(q);
        
      const matchesCat = menuSelectedCategory === 'all' || d.category === menuSelectedCategory;
      
      let matchesDiet = true;
      if (menuDietaryFilter === 'halal') {
        matchesDiet = !!d.isHalal || (d.dietaryTags || []).some(t => t.toLowerCase().includes('halal'));
      } else if (menuDietaryFilter === 'kasher') {
        matchesDiet = !!d.isKasher || (d.dietaryTags || []).some(t => t.toLowerCase().includes('kasher') || t.toLowerCase().includes('kosher'));
      } else if (menuDietaryFilter === 'spicy') {
        matchesDiet = !!d.isSpicy || (d.spicyLevel !== undefined && d.spicyLevel > 0);
      } else if (menuDietaryFilter === 'homemade') {
        matchesDiet = !!d.isHomemade || (d.dietaryTags || []).some(t => t.toLowerCase().includes('maison') || t.toLowerCase().includes('artisanal'));
      } else if (menuDietaryFilter === 'vegetarian') {
        matchesDiet = !!d.isVegetarian || !!d.isVegan;
      } else if (menuDietaryFilter === 'gluten_free') {
        matchesDiet = !!d.isGlutenFree;
      } else if (menuDietaryFilter === 'formula') {
        matchesDiet = !!d.isFormula || d.name.toLowerCase().includes('menu') || d.name.toLowerCase().includes('formule');
      }
      
      return matchesSearch && matchesCat && matchesDiet;
    });
  }, [restaurantMenu, menuSearchQuery, menuSelectedCategory, menuDietaryFilter]);

  const isFastPrep = !!(dish?.isFastPreparation || 
    dish?.category?.toLowerCase().includes('rapide') || 
    dish?.category?.toLowerCase().includes('fast') || 
    dish?.name.toLowerCase().includes('burger') || 
    dish?.name.toLowerCase().includes('pizza') || 
    dish?.name.toLowerCase().includes('frite') || 
    dish?.name.toLowerCase().includes('wrap') || 
    dish?.name.toLowerCase().includes('tacos'));

  const handleToggleMenuDownload = () => {
    const restObj: Restaurant = {
      id: dish.restaurantId || 'rest-1',
      userId: 'usr-1',
      name: restaurantName || 'Restaurant',
      address: 'Paris 11e',
      category: dish.category || 'Gastronomie',
      commissionRateDelivery: 15,
      commissionRateCollect: 5
    };
    offlineCacheService.toggleMenuDownload(restObj, restaurantMenu);
  };

  const AVAILABLE_SUPPLEMENTS: SupplementOption[] = [
    { id: 'supp-cheddar', name: 'Sauce Cheddar Fondu', price: 1.20, category: 'sauces', emoji: '🧀' },
    { id: 'supp-fidfud-sauce', name: 'Sauce Maison Fidfud', price: 0.80, category: 'sauces', emoji: '🔥' },
    { id: 'supp-extra-cheese', name: 'Extra Double Fromage', price: 1.50, category: 'extras', emoji: '🧀' },
    { id: 'supp-extra-bacon', name: 'Supplément Bacon Crisp', price: 1.80, category: 'extras', emoji: '🥓' },
    { id: 'supp-extra-avocado', name: 'Supplément Avocat Frais', price: 1.90, category: 'extras', emoji: '🥑' },
    { id: 'supp-frites-maison', name: 'Portion Frites Maison', price: 2.90, category: 'sides', emoji: '🍟' },
    { id: 'supp-coca-zero', name: 'Coca-Cola Zero 33cl', price: 2.50, category: 'drinks', emoji: '🥤' },
  ];

  const handleToggleSupplement = (supp: SupplementOption) => {
    const isSelected = selectedSupplements.some(s => s.id === supp.id);
    if (isSelected) {
      setSelectedSupplements(prev => prev.filter(s => s.id !== supp.id));
      notify("➖ SUPPLÉMENT RETIRÉ", `Option "${supp.name}" retirée du plat`, "info");
    } else {
      setSelectedSupplements(prev => [...prev, supp]);
      notify("✨ SUPPLÉMENT SÉLECTIONNÉ", `Option "${supp.name}" (+${supp.price.toFixed(2)} €) ajoutée au plat !`, "success");
    }
  };

  const handleIncrement = () => setQuantity(q => q + 1);
  const handleDecrement = () => setQuantity(q => (q > 1 ? q - 1 : 1));

  const handleAdd = (d: Dish = dish, q: number = quantity) => {
    if (d.isAvailable === false) {
      notify("⛔ PLAT ÉPUISÉ", `Désolé, « ${d.name} » est actuellement indisponible (Sold Out).`, "warn");
      return;
    }
    onAddToCart(d, q, selectedSupplements);
    setShowNotification(true);
    const suppCount = selectedSupplements.length > 0 ? ` avec ${selectedSupplements.length} supplément(s)` : '';
    notify("🛒 PLAT AJOUTÉ AU PANIER", `${q}x ${d.name}${suppCount} ajouté(s) au panier !`, "success");
    setTimeout(() => {
      setShowNotification(false);
    }, 1200);
  };

  const handleAddSuggestion = (sDish: Dish) => {
    if (sDish.isAvailable === false) {
      notify("⛔ ACCOMPAGNEMENT ÉPUISÉ", `Désolé, « ${sDish.name} » est actuellement en rupture de stock.`, "warn");
      return;
    }
    onAddToCart(sDish, 1);
    setAddedSuggestions(prev => ({ ...prev, [sDish.id]: true }));
    notify("✨ ACCOMPAGNEMENT AJOUTÉ", `${sDish.name} (+${sDish.price.toFixed(2)} €) ajouté au panier !`, "success");
    setTimeout(() => {
      setAddedSuggestions(prev => ({ ...prev, [sDish.id]: false }));
    }, 2000);
  };

  // Post Restaurant Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    try {
      const res = await fetch(`/api/restaurants/${dish.restaurantId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: user.email.split('@')[0],
          rating: ratingInput,
          text: reviewTextInput
        })
      });
      if (res.ok) {
        const newReview = await res.json();
        setReviewsList(prev => [newReview, ...prev]);
        setReviewTextInput('');
        setRatingInput(5);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Post Dish-Specific Review
  const handleSubmitDishReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    try {
      const res = await fetch(`/api/dishes/${dish.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: user.email.split('@')[0],
          rating: dishRatingInput,
          text: dishReviewTextInput
        })
      });
      if (res.ok) {
        const newReview = await res.json();
        setDishReviewsList(prev => [newReview, ...prev]);
        setDishReviewTextInput('');
        setDishRatingInput(5);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Table Reservation
  const handleBookTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!reservationDate) {
      alert('Veuillez sélectionner une date.');
      return;
    }

    try {
      const res = await fetch(`/api/restaurants/${dish.restaurantId}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          date: reservationDate,
          time: reservationTime,
          guests: reservationGuests,
          notes: reservationNotes
        })
      });

      if (res.ok) {
        const booking = await res.json();
        setReservationSuccess(booking);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Compute average score
  const avgScore = reviewsList.length > 0 
    ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1)
    : '4.8'; // high quality default fallback

  const dishAvgScore = dishReviewsList.length > 0 
    ? (dishReviewsList.reduce((acc, r) => acc + r.rating, 0) / dishReviewsList.length).toFixed(1)
    : '4.9'; // high quality default fallback

  if (!dish) return null;

  return (
    <div className="fixed inset-0 z-[100] w-full h-full bg-[#0a0a0c] text-white flex flex-col overflow-hidden animate-fadeIn">
      
      {/* Top Bar Header */}
      <div className="h-14 sm:h-16 px-3 sm:px-6 md:px-8 bg-[#121215] border-b border-zinc-800/80 flex items-center justify-between z-20 shrink-0 gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FF5C00]/10 border border-[#FF5C00]/30 flex items-center justify-center text-[#FF5C00] shrink-0 font-bold">
            <ChefHat size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
              <span className="text-xs sm:text-sm font-black text-[#FF5C00] uppercase tracking-wider truncate">
                {restaurantName || 'Restaurant Exclusif'}
              </span>
              <span className="hidden xs:flex text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold items-center gap-1 shrink-0">
                <ShieldCheck size={10} /> Vérifié
              </span>
              
              {dish.isAvailable === false && (
                <span className="text-[9.5px] bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1 shrink-0 animate-pulse">
                  <Ban size={9} className="stroke-[3]" /> Épuisé
                </span>
              )}
              
              {/* Top Bar Follow Restaurant Button */}
              <button
                id="btn-follow-restaurant-topbar"
                onClick={handleToggleFollow}
                disabled={isFollowLoading}
                className={`hidden sm:flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider items-center gap-1 transition-all cursor-pointer border shadow-sm shrink-0 ${
                  isFollowing 
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30' 
                    : 'bg-[#FF5C00]/20 text-[#FF5C00] border-[#FF5C00]/40 hover:bg-[#FF5C00] hover:text-white'
                }`}
                title={isFollowing ? "Ne plus suivre ce restaurant" : "Suivre ce restaurant et l'ajouter aux Favoris"}
              >
                <Heart size={10} className={isFollowing ? "fill-red-400 text-red-400 animate-pulse" : ""} />
                <span>{isFollowing ? 'Suivi' : '+ Suivre'}</span>
              </button>
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-zinc-300 truncate">{dish.name}</h2>
          </div>
        </div>

        {/* Tab Navigation Center */}
        <div className="hidden md:flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-xs font-bold uppercase shrink-0">
          <button
            onClick={() => setActiveTab('order')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'order' ? 'bg-[#FF5C00] text-white shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShoppingBag size={13} />
            <span>Fiche Plat & Galerie</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'menu' 
                ? 'bg-[#FF5C00] text-white shadow-lg' 
                : 'text-amber-300 hover:text-white bg-amber-500/10 border border-amber-500/30 animate-menu-pulse'
            }`}
          >
            <BookOpen size={13} className={activeTab !== 'menu' ? 'animate-menu-icon-float text-amber-400' : ''} />
            <span>Menu complet ({restaurantMenu.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'reviews' ? 'bg-[#FF5C00] text-white shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Star size={13} />
            <span>Avis ({dishAvgScore})</span>
          </button>
          <button
            onClick={() => setActiveTab('reserve')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'reserve' ? 'bg-[#FF5C00] text-white shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Calendar size={13} />
            <span>Réserver Table</span>
          </button>
        </div>

        {/* Right Close Button */}
        <button 
          id="btn-close-dish-drawer"
          onClick={onClose}
          className="p-2 sm:p-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
        >
          <span className="hidden sm:inline">Fermer</span>
          <X size={16} />
        </button>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex border-b border-zinc-800 bg-zinc-900 text-[11px] font-bold uppercase shrink-0">
        <button
          onClick={() => setActiveTab('order')}
          className={`flex-1 py-3 text-center transition-colors border-b-2 ${
            activeTab === 'order' ? 'border-[#FF5C00] text-[#FF5C00]' : 'border-transparent text-zinc-400'
          }`}
        >
          Fiche Plat
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex-1 py-3 text-center transition-all border-b-2 font-bold flex items-center justify-center gap-1 ${
            activeTab === 'menu' ? 'border-[#FF5C00] text-[#FF5C00]' : 'border-transparent text-amber-300 animate-menu-pulse'
          }`}
        >
          <BookOpen size={12} className={activeTab !== 'menu' ? 'animate-menu-icon-float text-amber-400' : ''} />
          <span>Menu 📖</span>
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex-1 py-3 text-center transition-colors border-b-2 ${
            activeTab === 'reviews' ? 'border-[#FF5C00] text-[#FF5C00]' : 'border-transparent text-zinc-400'
          }`}
        >
          Avis ({dishAvgScore})
        </button>
        <button
          onClick={() => setActiveTab('reserve')}
          className={`flex-1 py-3 text-center transition-colors border-b-2 ${
            activeTab === 'reserve' ? 'border-[#FF5C00] text-[#FF5C00]' : 'border-transparent text-zinc-400'
          }`}
        >
          Réserver
        </button>
      </div>

      {/* Main Full Page Body */}
      <div ref={drawerContentRef} className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 md:p-8 pb-32 md:pb-12">
        
        {/* TAB 1: FULL PAGE DISH VIEW & MULTI GALLERY / VIDEO */}
        {activeTab === 'order' && (
          <div className="max-w-7xl mx-auto flex flex-col gap-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT 7 COLUMNS: CAROUSEL GALLERY & LIGHTBOX TRIGGER */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              
              {/* Media Filter & Lightbox Trigger Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/90 p-2 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => {
                      setActiveMediaFilter('all');
                      setActiveMediaIndex(0);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeMediaFilter === 'all'
                        ? 'bg-[#FF5C00] text-white shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <Sparkles size={13} />
                    <span>Tout ({mediaGallery.length})</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveMediaFilter('photos');
                      setActiveMediaIndex(0);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeMediaFilter === 'photos'
                        ? 'bg-[#FF5C00] text-white shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <ImageIcon size={13} />
                    <span>Photos ({galleryImages.length})</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveMediaFilter('videos');
                      setActiveMediaIndex(0);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeMediaFilter === 'videos'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <VideoIcon size={13} />
                    <span>Vidéos ({mediaGallery.filter(m => m.type === 'video').length})</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveMediaFilter('cameras');
                      setActiveMediaIndex(0);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeMediaFilter === 'cameras'
                        ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400/50'
                        : 'text-red-400 hover:text-white hover:bg-red-950/40 border border-red-500/20'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                    <Camera size={13} />
                    <span>Caméras Live ({mediaGallery.filter(m => m.type === 'camera_live').length})</span>
                  </button>
                </div>

                {/* Action Buttons: Add Media & Lightbox Trigger */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddMediaOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black uppercase shadow-sm group"
                    title="Ajouter une photo ou vidéo à la galerie du plat"
                  >
                    <UploadCloud size={14} className="group-hover:scale-110 transition-transform" />
                    <span>+ Média</span>
                  </button>

                  <button
                    onClick={() => {
                      const fullIdx = mediaGallery.findIndex(m => m.id === currentMedia?.id);
                      setLightboxIndex(fullIdx >= 0 ? fullIdx : 0);
                      setIsLightboxOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-[#FF5C00] text-zinc-200 hover:text-white border border-zinc-700/80 transition-all cursor-pointer flex items-center gap-2 text-xs font-black uppercase shadow-sm group"
                    title="Agrandir en plein écran (Lightbox)"
                  >
                    <Maximize2 size={14} className="group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">Plein Écran</span>
                  </button>
                </div>
              </div>

              {/* Main Carousel Display Canvas Stage with Touch Swipe & Zoom */}
              <div 
                className="relative aspect-[4/3] md:aspect-[16/10] bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl group select-none touch-pan-y"
                onTouchStart={(e) => {
                  setTouchStartX(e.targetTouches[0].clientX);
                  setTouchEndX(null);
                }}
                onTouchMove={(e) => {
                  setTouchEndX(e.targetTouches[0].clientX);
                }}
                onTouchEnd={() => {
                  if (touchStartX === null || touchEndX === null) return;
                  const distance = touchStartX - touchEndX;
                  const isLeftSwipe = distance > 45;
                  const isRightSwipe = distance < -45;
                  if (isLeftSwipe) {
                    setActiveMediaIndex(prev => (prev === filteredMediaGallery.length - 1 ? 0 : prev + 1));
                  } else if (isRightSwipe) {
                    setActiveMediaIndex(prev => (prev === 0 ? filteredMediaGallery.length - 1 : prev - 1));
                  }
                  setTouchStartX(null);
                  setTouchEndX(null);
                }}
              >
                
                {currentMedia?.type === 'image' ? (
                  <div 
                    onClick={() => {
                      const fullIdx = mediaGallery.findIndex(m => m.id === currentMedia.id);
                      setLightboxIndex(fullIdx >= 0 ? fullIdx : 0);
                      setIsLightboxOpen(true);
                    }}
                    className="w-full h-full relative cursor-zoom-in"
                  >
                    <img
                      src={currentMedia.url}
                      alt={currentMedia.title}
                      className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                        dish.isAvailable === false ? 'filter grayscale-[35%] opacity-85' : ''
                      }`}
                    />

                    {/* Hover Zoom Hint Overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold text-white border border-white/20 flex items-center gap-2 shadow-2xl">
                        <Maximize2 size={14} className="text-[#FF5C00]" />
                        <span>Cliquer pour aggrandir (Plein écran)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full relative">
                    <BackgroundVideoPlayer
                      src={currentMedia?.url ? getSafeVideoUrl(currentMedia.url) : STABLE_CULINARY_FALLBACK_VIDEOS[0]}
                      isPlaying={true}
                      isMuted={isMainVideoMuted}
                      className={`w-full h-full object-cover ${
                        dish.isAvailable === false ? 'filter grayscale-[35%] opacity-85' : ''
                      }`}
                    />

                    {/* Video Audio Mute Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMainVideoMuted(!isMainVideoMuted);
                      }}
                      className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white transition-all cursor-pointer"
                      title={isMainVideoMuted ? "Activer le son" : "Couper le son"}
                    >
                      {isMainVideoMuted ? <VolumeX size={16} className="text-amber-400" /> : <Volume2 size={16} className="text-emerald-400" />}
                    </button>
                  </div>
                )}

                {/* Prominent Sold Out / Épuisé Stage Ribbon Banner */}
                {dish.isAvailable === false && (
                  <div className="absolute top-4 right-4 z-30 flex items-center gap-2 pointer-events-none">
                    <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-2xl border border-red-300 shadow-[0_0_25px_rgba(239,68,68,0.7)] backdrop-blur-md flex items-center gap-2 animate-pulse">
                      <Ban size={15} className="stroke-[3]" />
                      <span>Épuisé • Sold Out</span>
                    </div>
                  </div>
                )}

                {/* Stage Overlay Badges & Counter */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
                  <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white border border-white/10 flex items-center gap-2">
                    {currentMedia?.type === 'camera_live' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <Camera size={13} className="text-red-400" />
                        <span className="text-red-400 font-extrabold uppercase text-[11px] tracking-wide">LIVE</span>
                      </>
                    ) : currentMedia?.type === 'video' ? (
                      <VideoIcon size={13} className="text-purple-400" />
                    ) : (
                      <ImageIcon size={13} className="text-[#FF5C00]" />
                    )}
                    <span>{currentMedia?.title}</span>
                  </div>

                  <span className="bg-black/80 backdrop-blur-md px-2.5 py-1.5 rounded-full text-[11px] font-mono font-bold text-zinc-300 border border-white/10">
                    {activeMediaIndex + 1} / {filteredMediaGallery.length}
                  </span>
                </div>

                {/* Bottom Carousel Controls Container: Cooking Video, Menu Shortcut, and Pagination without overlaps */}
                <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                  {/* Left: Live Cooking Video or Quick Chef Video */}
                  <div className="flex items-center gap-2 pointer-events-auto">
                    {hasCookingVideo && (
                      <button
                        id="btn-stage-cooking-video"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCookingVideoOpen(true);
                          setIsCookingVideoPlaying(true);
                        }}
                        className="bg-black/90 hover:bg-[#FF5C00] text-white backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 hover:border-[#FF5C00] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xl transition-all cursor-pointer group hover:scale-105 active:scale-95"
                        title="Voir la courte vidéo du plat en train d'être cuisiné"
                      >
                        <div className="relative">
                          <Play size={12} className="fill-white text-white group-hover:scale-110 transition-transform" />
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                        </div>
                        <span>🔥 Cuisson</span>
                      </button>
                    )}

                    {/* Menu Button relocated to bottom of video/carousel for clear non-overlapping layout */}
                    <button
                      id="btn-stage-menu-shortcut"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('menu');
                      }}
                      className="bg-black/90 hover:bg-amber-600 text-amber-300 hover:text-white backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/40 hover:border-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xl transition-all cursor-pointer group hover:scale-105 active:scale-95 animate-menu-pulse"
                      title="Consulter toute la carte du restaurant"
                    >
                      <BookOpen size={13} className="text-amber-400 group-hover:text-white" />
                      <span>📖 Menu ({restaurantMenu.length})</span>
                    </button>
                  </div>

                  {/* Center / Right: Pagination Dots */}
                  {filteredMediaGallery.length > 1 && (
                    <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 pointer-events-auto">
                      {filteredMediaGallery.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMediaIndex(idx);
                          }}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            activeMediaIndex === idx 
                              ? 'w-5 bg-[#FF5C00]' 
                              : 'w-2 bg-white/40 hover:bg-white/70'
                          }`}
                          title={`Aller à la photo ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Navigation Arrows on Carousel Stage */}
                {filteredMediaGallery.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMediaIndex(prev => (prev === 0 ? filteredMediaGallery.length - 1 : prev - 1));
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-[#FF5C00] text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer backdrop-blur-md shadow-lg"
                      title="Média précédent"
                    >
                      <ChevronLeft size={22} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMediaIndex(prev => (prev === filteredMediaGallery.length - 1 ? 0 : prev + 1));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-[#FF5C00] text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer backdrop-blur-md shadow-lg"
                      title="Média suivant"
                    >
                      <ChevronRight size={22} />
                    </button>
                  </>
                )}
              </div>

              {/* Interactive Thumbnail Carousel Strip */}
              {filteredMediaGallery.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 pt-1">
                  {filteredMediaGallery.map((media, idx) => {
                    const isSelected = activeMediaIndex === idx;
                    const isCustom = media.id.startsWith('custom-media-');
                    return (
                      <div key={media.id} className="relative aspect-video group">
                        <button
                          onClick={() => setActiveMediaIndex(idx)}
                          className={`w-full h-full rounded-xl overflow-hidden border-2 transition-all cursor-pointer relative block ${
                            isSelected
                              ? 'border-[#FF5C00] ring-2 ring-[#FF5C00]/40 scale-102 shadow-lg'
                              : 'border-zinc-800/80 opacity-60 hover:opacity-100 hover:border-zinc-700'
                          }`}
                        >
                          <img
                            src={media.type === 'image' ? media.url : (media.thumbnailUrl || media.url)}
                            alt={media.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {media.type === 'video' && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Play size={14} className="text-white fill-white drop-shadow-md" />
                            </div>
                          )}
                          {media.type === 'camera_live' && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <div className="flex items-center gap-1 bg-red-600/90 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase text-white shadow-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                <Camera size={9} />
                                <span>LIVE</span>
                              </div>
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#FF5C00]/10" />
                          )}
                        </button>

                        {/* Delete Custom Media Button */}
                        {isCustom && (
                          <button
                            onClick={(e) => handleDeleteCustomMedia(media.id, e)}
                            className="absolute -top-1.5 -right-1.5 z-30 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer"
                            title="Supprimer ce média"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Media Quick Button */}
                  <button
                    onClick={() => setIsAddMediaOpen(true)}
                    className="aspect-video rounded-xl border-2 border-dashed border-zinc-700 hover:border-emerald-500 bg-zinc-900/50 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group"
                    title="Ajouter une photo ou vidéo"
                  >
                    <UploadCloud size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-wider">+ Média</span>
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT 5 COLUMNS: DISH DETAILS & ACTION DASHBOARD */}
            <div className="lg:col-span-5 bg-zinc-900/60 p-6 rounded-3xl border border-zinc-800 flex flex-col gap-6">
              
              {/* Header Title & Price */}
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="bg-[#FF5C00]/10 text-[#FF5C00] font-black text-xs uppercase px-3 py-1 rounded-full border border-[#FF5C00]/20">
                    {dish.category || 'Spécialité'}
                  </span>
                  {dish.isAvailable === false ? (
                    <span className="bg-red-500/20 text-red-400 font-black text-xs uppercase px-3 py-1 rounded-full border border-red-500/40 flex items-center gap-1.5 shadow-sm">
                      <Ban size={13} className="stroke-[3]" /> Épuisé / Sold Out
                    </span>
                  ) : isFastPrep ? (
                    <span className="bg-amber-500/10 text-amber-400 font-bold text-xs uppercase px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
                      <Zap size={12} /> Préparation Rapide (~{dish.preparationTimeMinutes || 12} min)
                    </span>
                  ) : null}
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tight">{dish.name}</h1>
                
                {/* Visual Sold Out Alert Banner */}
                {dish.isAvailable === false && (
                  <div className="mt-3 p-3.5 bg-gradient-to-r from-red-950/60 via-red-900/30 to-zinc-950 border border-red-500/40 rounded-2xl flex items-start gap-3 shadow-lg">
                    <div className="p-2 bg-red-500/20 rounded-xl text-red-400 border border-red-500/30 shrink-0 mt-0.5">
                      <Ban size={18} className="stroke-[2.5]" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black uppercase tracking-wider text-red-300">
                          Plat Momentanément Épuisé
                        </p>
                        <span className="text-[9px] bg-red-600 text-white font-mono font-bold px-1.5 py-0.2 rounded uppercase">
                          Sold Out
                        </span>
                      </div>
                      <p className="text-[11.5px] text-zinc-300 font-sans leading-relaxed">
                        Ce plat n'est plus disponible pour le service en cours. Les commandes de cet article sont temporairement désactivées.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-baseline gap-3 mt-3">
                  <p className={`font-black text-3xl ${dish.isAvailable === false ? 'text-zinc-500 line-through' : 'text-[#FF5C00]'}`}>
                    {((dish.price + selectedSupplements.reduce((sum, s) => sum + s.price, 0)) * quantity).toFixed(2)} €
                  </p>
                  {dish.isAvailable === false ? (
                    <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 uppercase font-mono">
                      Non commandable
                    </span>
                  ) : selectedSupplements.length > 0 ? (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      +{selectedSupplements.reduce((sum, s) => sum + s.price, 0).toFixed(2)}€ suppléments
                    </span>
                  ) : null}
                </div>

                {/* 🎬 Short Cooking Video Button (if available in data) */}
                {hasCookingVideo && (
                  <button
                    id="btn-open-cooking-video-tab1"
                    onClick={() => {
                      setIsCookingVideoOpen(true);
                      setIsCookingVideoPlaying(true);
                    }}
                    className="mt-3 w-full bg-gradient-to-r from-red-600/20 via-[#FF5C00]/25 to-amber-500/20 hover:from-red-600/35 hover:via-[#FF5C00]/35 hover:to-amber-500/30 text-white border border-[#FF5C00]/50 hover:border-[#FF5C00] rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all shadow-xl hover:shadow-[#FF5C00]/25 group relative overflow-hidden active:scale-[0.98]"
                    title="Voir la courte vidéo du plat en train d'être cuisiné"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5C00] to-red-600 flex items-center justify-center text-white shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                        <Play size={18} className="fill-white translate-x-0.5" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-900 animate-ping" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-900" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 truncate">
                          <span>🔥 Voir le plat cuisiné</span>
                          <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black tracking-widest uppercase shrink-0">Vidéo Cuisson</span>
                        </p>
                        <p className="text-[11px] text-zinc-300 truncate">Préparation & cuisson artisanale par le chef</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs font-black text-[#FF5C00] group-hover:text-white uppercase tracking-wider shrink-0 ml-2">
                      <span className="hidden sm:inline">Regarder</span>
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                )}

                {/* 📖 Discreetly Animated Chef Menu Shortcut */}
                <button
                  onClick={() => setActiveTab('menu')}
                  className="mt-3 w-full bg-gradient-to-r from-amber-500/15 via-[#FF5C00]/15 to-amber-500/15 hover:from-amber-500/25 hover:to-[#FF5C00]/25 text-amber-300 border border-amber-500/35 rounded-2xl p-3 flex items-center justify-between cursor-pointer transition-all animate-menu-pulse group shadow-lg"
                  title="Consulter toute la carte du restaurant"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                      <BookOpen size={16} className="animate-menu-icon-float" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                        <span>📖 Voir toute la Carte</span>
                        <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.2 rounded font-mono font-bold">{restaurantMenu.length} Plats</span>
                      </p>
                      <p className="text-[10px] text-zinc-400">Parcourir les autres créations de {restaurantName || 'ce chef'}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 👨‍🍳 Restaurant Profile & Follow Card */}
                <div className="mt-2.5 p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#FF5C00]/10 border border-[#FF5C00]/30 flex items-center justify-center text-[#FF5C00] shrink-0 font-black text-sm">
                      <ChefHat size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase text-white truncate">{restaurantName || 'Restaurant Exclusif'}</p>
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1.5 font-mono">
                        <span className="text-amber-400 font-bold">⭐ {avgScore}</span>
                        <span>•</span>
                        <span className="text-zinc-400">{isFollowing ? 'Dans vos Favoris ❤️' : 'Restaurant vérifié'}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-follow-restaurant-tab1"
                    onClick={handleToggleFollow}
                    disabled={isFollowLoading}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 ${
                      isFollowing
                        ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                        : 'bg-[#FF5C00] hover:bg-[#ff6d1a] text-white border-[#FF5C00] shadow-lg shadow-[#FF5C00]/20'
                    }`}
                  >
                    <Heart size={13} className={isFollowing ? "fill-red-400 text-red-400" : ""} />
                    <span>{isFollowing ? 'Abonné ❤️' : '+ Suivre'}</span>
                  </button>
                </div>
              </div>

              {/* 1. Description du Chef & Savoir-faire */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <ChefHat size={14} className="text-[#FF5C00]" />
                    <span>Description & Savoir-Faire</span>
                  </p>
                  {enrichedData?.portionSize && (
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                      ⚖️ {enrichedData.portionSize}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed font-sans">{dish.description}</p>
                {enrichedData?.chefNotes && enrichedData.chefNotes !== dish.description && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 leading-relaxed font-sans flex items-start gap-2">
                    <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Note du Chef :</strong> {enrichedData.chefNotes}</span>
                  </div>
                )}
              </div>

              {/* 2. Ce que contient ce plat / Ingrédients & Composition Détaillée */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <UtensilsCrossed size={14} className="text-[#FF5C00]" />
                    <span>Ce que contient ce plat ({enrichedData?.ingredients.length || 0} Ingrédients)</span>
                  </p>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={10} /> 100% Frais
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {enrichedData?.ingredients.map((ing) => (
                    <div 
                      key={ing.id} 
                      className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                        ing.isKeyIngredient 
                          ? 'bg-zinc-950/90 border-[#FF5C00]/30 shadow-sm' 
                          : 'bg-zinc-950/60 border-zinc-800/80'
                      }`}
                    >
                      <span className="text-xl shrink-0 p-1 bg-zinc-900 rounded-lg border border-zinc-800/60">{ing.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-zinc-100 leading-snug">{ing.name}</p>
                          {ing.qualityTag && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono">
                              {ing.qualityTag}
                            </span>
                          )}
                        </div>
                        {ing.description && (
                          <p className="text-[10px] text-zinc-400 leading-tight mt-1 font-sans">{ing.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {enrichedData?.cookingStyle && (
                  <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs text-zinc-300">
                    <span className="font-mono text-zinc-400 flex items-center gap-1">
                      <Flame size={13} className="text-[#FF5C00]" /> Mode de cuisson :
                    </span>
                    <span className="font-bold text-white text-right">{enrichedData.cookingStyle}</span>
                  </div>
                )}
              </div>

              {/* 3. Allergènes & Avertissements Alimentaires */}
              {enrichedData && enrichedData.allergens.length > 0 && (
                <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <AlertTriangle size={14} className="text-amber-400" />
                      <span>Allergènes & Précautions</span>
                    </p>
                    <span className="text-[10px] text-zinc-400 font-mono">Réglementation INCO</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {enrichedData.allergens.map((alg) => (
                      <span 
                        key={alg.id}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <span>{alg.emoji}</span>
                        <span>{alg.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Valeurs Nutritionnelles & Macros */}
              {enrichedData?.nutrition && (
                <div className="pt-3 border-t border-zinc-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Zap size={14} className="text-yellow-400" />
                      <span>Valeurs Nutritionnelles (Par Portion)</span>
                    </p>
                    <span className="text-xs font-black text-[#FF5C00] font-mono bg-[#FF5C00]/10 border border-[#FF5C00]/20 px-2 py-0.5 rounded-lg">
                      🔥 {enrichedData.nutrition.calories} kcal
                    </span>
                  </div>

                  {/* Macros Grid */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                      <p className="text-[10px] text-zinc-400 uppercase font-mono">Protéines</p>
                      <p className="text-xs font-black text-purple-400 font-mono mt-0.5">{enrichedData.nutrition.proteins} g</p>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                      <p className="text-[10px] text-zinc-400 uppercase font-mono">Glucides</p>
                      <p className="text-xs font-black text-amber-400 font-mono mt-0.5">{enrichedData.nutrition.carbs} g</p>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                      <p className="text-[10px] text-zinc-400 uppercase font-mono">Lipides</p>
                      <p className="text-xs font-black text-blue-400 font-mono mt-0.5">{enrichedData.nutrition.fats} g</p>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                      <p className="text-[10px] text-zinc-400 uppercase font-mono">Fibres</p>
                      <p className="text-xs font-black text-emerald-400 font-mono mt-0.5">{enrichedData.nutrition.fibres} g</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Dietary Badges & Certifications */}
              <div className="pt-3 border-t border-zinc-800/80">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Certifications & Diététique</p>
                <DietaryBadges item={dish} size="sm" />
              </div>

              {/* 6. Suppléments & Options Personnalisées */}
              <div className="pt-3 border-t border-zinc-800/80">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Sparkles size={14} /> Suppléments & Extras au Choix
                  </span>
                  {selectedSupplements.length > 0 && (
                    <button 
                      onClick={() => {
                        setSelectedSupplements([]);
                        notify("🔄 RÉINITIALISÉ", "Tous les suppléments ont été retirés", "info");
                      }}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      Effacer tout
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {AVAILABLE_SUPPLEMENTS.map(supp => {
                    const isSelected = selectedSupplements.some(s => s.id === supp.id);
                    return (
                      <button
                        key={supp.id}
                        onClick={() => handleToggleSupplement(supp)}
                        className={`p-2.5 rounded-xl border text-left transition-all duration-200 flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-[#FF5C00]/15 border-[#FF5C00] text-white shadow-lg shadow-[#FF5C00]/10 scale-[1.02]'
                            : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold truncate flex items-center gap-1">
                            <span>{supp.emoji}</span>
                            <span>{supp.name}</span>
                          </p>
                          <p className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-[#FF5C00] font-bold' : 'text-zinc-400'}`}>
                            +{supp.price.toFixed(2)} €
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                          isSelected 
                            ? 'bg-[#FF5C00] border-[#FF5C00] text-white' 
                            : 'border-zinc-700 text-transparent'
                        }`}>
                          <Check size={12} className="stroke-[3]" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7. Quantity Selector & Add to Cart */}
              <div className="pt-4 border-t border-zinc-800/80 flex flex-col gap-4">
                <div className={`flex items-center justify-between bg-zinc-950 p-3 rounded-2xl border border-zinc-800 transition-all ${
                  dish.isAvailable === false ? 'opacity-40 pointer-events-none' : ''
                }`}>
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Quantité</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDecrement}
                      disabled={dish.isAvailable === false}
                      className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center font-bold border border-zinc-800 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-lg font-black text-white w-8 text-center">{quantity}</span>
                    <button
                      onClick={handleIncrement}
                      disabled={dish.isAvailable === false}
                      className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center font-bold border border-zinc-800 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <button
                  id="btn-add-to-cart-drawer-main"
                  onClick={() => handleAdd(dish, quantity)}
                  disabled={dish.isAvailable === false}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl transition-all ${
                    dish.isAvailable === false
                      ? 'bg-zinc-900 border-2 border-red-500/40 text-red-400 cursor-not-allowed shadow-none select-none'
                      : showNotification
                      ? 'bg-emerald-600 text-white scale-102 cursor-pointer'
                      : 'bg-[#FF5C00] hover:bg-[#ff6d1a] text-white shadow-[#FF5C00]/20 cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  {dish.isAvailable === false ? (
                    <>
                      <Ban size={18} className="stroke-[2.5] text-red-400" />
                      <span>Plat Épuisé • Indisponible à la commande</span>
                    </>
                  ) : showNotification ? (
                    <>
                      <Check size={18} />
                      <span>Ajouté au Panier !</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={18} />
                      <span>Ajouter au Panier • {((dish.price + selectedSupplements.reduce((sum, s) => sum + s.price, 0)) * quantity).toFixed(2)} €</span>
                    </>
                  )}
                </button>
              </div>

              {/* 8. AI Complementary Pairings */}
              {complementarySuggestions.length > 0 && (
                <div className="pt-4 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Sparkles size={14} /> Accompagnements Recommandés
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {complementarySuggestions.slice(0, 2).map(({ dish: sDish }) => (
                      <div 
                        key={sDish.id} 
                        onClick={() => {
                          setLocalDishId(sDish.id);
                          drawerContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`bg-zinc-950 p-2.5 rounded-xl border transition-all flex items-center gap-2 cursor-pointer group ${
                          sDish.isAvailable === false 
                            ? 'border-zinc-800/60 opacity-60' 
                            : 'border-zinc-800 hover:border-[#FF5C00]/40'
                        }`}
                      >
                        {sDish.imageUrl && (
                          <div className="relative w-10 h-10 shrink-0">
                            <img src={sDish.imageUrl} alt={sDish.name} className={`w-10 h-10 rounded-lg object-cover group-hover:scale-105 transition-transform ${sDish.isAvailable === false ? 'grayscale' : ''}`} />
                            {sDish.isAvailable === false && (
                              <span className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center text-[7px] font-black text-red-400 uppercase">
                                Épuisé
                              </span>
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate group-hover:text-amber-300">{sDish.name}</p>
                          <p className="text-[11px] text-[#FF5C00] font-black">
                            {sDish.price.toFixed(2)} €
                            {sDish.isAvailable === false && (
                              <span className="text-red-400 text-[9px] font-normal ml-1">• Épuisé</span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (sDish.isAvailable === false) return;
                            handleAddSuggestion(sDish);
                          }}
                          disabled={sDish.isAvailable === false}
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            sDish.isAvailable === false
                              ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                              : 'bg-[#FF5C00]/20 text-[#FF5C00] hover:bg-[#FF5C00] hover:text-white cursor-pointer'
                          }`}
                          title={sDish.isAvailable === false ? "Plat épuisé" : "Ajouter au panier"}
                        >
                          {sDish.isAvailable === false ? <Ban size={13} className="stroke-[2.5]" /> : <Plus size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            </div>

            {/* SECTION: VOUS AIMEREZ AUSSI */}
            {similarDishes.length > 0 && (
              <div className="w-full pt-8 border-t border-zinc-800/80 space-y-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-[#FF5C00]" size={18} />
                      <h3 className="text-xl font-black text-white uppercase italic tracking-wide">
                        Vous aimerez aussi
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Sélection de plats similaires basée sur la catégorie <strong className="text-zinc-200">"{dish?.category || 'Gourmet'}"</strong> et les ingrédients.
                    </p>
                  </div>

                  <span className="text-xs font-mono font-bold bg-[#FF5C00]/10 text-[#FF5C00] border border-[#FF5C00]/20 px-3 py-1 rounded-full self-start sm:self-auto">
                    {similarDishes.length} Recommandation{similarDishes.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 w-full">
                  {similarDishes.map((sDish) => (
                    <div
                      key={sDish.id}
                      onClick={() => {
                        setLocalDishId(sDish.id);
                        setActiveTab('order');
                        drawerContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`group bg-zinc-900/80 border p-3 rounded-2xl transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.02] shadow-md relative overflow-hidden min-w-0 w-full ${
                        sDish.isAvailable === false
                          ? 'border-zinc-800/60 opacity-70 hover:border-red-500/30'
                          : 'border-zinc-800 hover:border-[#FF5C00]/60 hover:shadow-[#FF5C00]/10'
                      }`}
                    >
                      <div className="min-w-0 w-full">
                        {/* Image & Category Badge */}
                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-zinc-950 relative mb-2.5 border border-zinc-800/60">
                          {sDish.imageUrl ? (
                            <img
                              src={sDish.imageUrl}
                              alt={sDish.name}
                              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                                sDish.isAvailable === false ? 'grayscale' : ''
                              }`}
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700">
                              <ChefHat size={24} />
                            </div>
                          )}

                          {/* Match Tag Badge */}
                          {sDish.category && (
                            <div className="absolute top-2 left-2 flex flex-col gap-1 max-w-[85%]">
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-amber-400 border border-amber-400/30 truncate">
                                {sDish.category}
                              </span>
                            </div>
                          )}

                          {/* Sold Out Overlay Badge */}
                          {sDish.isAvailable === false && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="bg-red-600/90 text-white text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-red-400/50 shadow-md">
                                Épuisé
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h4 className="text-xs font-black text-white uppercase truncate group-hover:text-[#FF5C00] transition-colors">
                          {sDish.name}
                        </h4>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 font-sans leading-tight">
                          {sDish.description || 'Spécialité cuisinée à la commande.'}
                        </p>
                      </div>

                      {/* Price & Add to cart button */}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-800/80 gap-1.5">
                        <span className="text-xs font-black text-[#FF5C00] font-mono shrink-0">
                          {sDish.price.toFixed(2)} €
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (sDish.isAvailable === false) return;
                            onAddToCart(sDish, 1);
                          }}
                          disabled={sDish.isAvailable === false}
                          className={`px-2 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shrink-0 ${
                            sDish.isAvailable === false
                              ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
                              : 'bg-[#FF5C00] hover:bg-[#ff6d1a] text-white cursor-pointer active:scale-95 shadow-sm'
                          }`}
                          title={sDish.isAvailable === false ? "Plat indisponible" : "Ajouter au panier"}
                        >
                          {sDish.isAvailable === false ? (
                            <>
                              <Ban size={11} className="stroke-[2.5]" />
                              <span>Épuisé</span>
                            </>
                          ) : (
                            <>
                              <Plus size={12} className="stroke-[3]" />
                              <span className="hidden sm:inline">Ajouter</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: FULL RESTAURANT MENU VIEW */}
        {activeTab === 'menu' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-zinc-900/80 p-6 rounded-3xl border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white uppercase italic">Menu Complet • {restaurantName}</h2>
                <p className="text-xs text-zinc-400 mt-1">Découvrez l'ensemble des spécialités cuisinées par le chef.</p>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  id="btn-follow-restaurant-tab2"
                  onClick={handleToggleFollow}
                  disabled={isFollowLoading}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
                    isFollowing
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                      : 'bg-[#FF5C00] hover:bg-[#ff6d1a] text-white border-[#FF5C00]'
                  }`}
                  title={isFollowing ? "Ne plus suivre ce restaurant" : "Suivre ce restaurant"}
                >
                  <Heart size={14} className={isFollowing ? "fill-red-400 text-red-400 animate-pulse" : ""} />
                  <span>{isFollowing ? 'Restaurant Suivi ❤️' : '+ Suivre Restaurant'}</span>
                </button>
                <button
                  onClick={handleToggleMenuDownload}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
                    isMenuDownloadedState
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-[#FF5C00]/15 text-[#FF5C00] hover:bg-[#FF5C00] hover:text-white border-[#FF5C00]/30'
                  }`}
                  title="Télécharger ce menu pour consultation hors-ligne"
                >
                  {isMenuDownloadedState ? <ShieldCheck size={14} /> : <Download size={14} />}
                  <span>{isMenuDownloadedState ? 'Menu Téléchargé (Hors-Ligne)' : 'Télécharger le Menu'}</span>
                </button>
                <span className="text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-2 rounded-xl">
                  {restaurantMenu.length} Plats
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {restaurantMenu.map(mDish => (
                <div
                  key={mDish.id}
                  onClick={() => {
                    setLocalDishId(mDish.id);
                    setActiveTab('order');
                    drawerContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`group bg-zinc-900/80 border p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between hover:shadow-lg ${
                    mDish.id === localDishId 
                      ? 'border-[#FF5C00] ring-1 ring-[#FF5C00]' 
                      : mDish.isAvailable === false
                      ? 'border-zinc-800/70 opacity-75 hover:border-red-500/40'
                      : 'border-zinc-800 hover:border-[#FF5C00]/50'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    {mDish.imageUrl ? (
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-950 shrink-0 relative">
                        <img src={mDish.imageUrl} alt={mDish.name} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${mDish.isAvailable === false ? 'grayscale' : ''}`} />
                        {mDish.isAvailable === false ? (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-red-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow">
                              Épuisé
                            </span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye size={16} className="text-white drop-shadow" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-600 shrink-0 relative">
                        <ChefHat size={20} />
                        {mDish.isAvailable === false && (
                          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                            <span className="bg-red-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow">
                              Épuisé
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">{mDish.category || 'Gourmet'}</span>
                        {mDish.isAvailable === false && (
                          <span className="text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/40 px-1.5 py-0.2 rounded uppercase">
                            Sold Out
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-black text-white uppercase truncate mt-0.5 group-hover:text-[#FF5C00] transition-colors">{mDish.name}</h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1 font-sans">{mDish.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800 gap-2">
                    <span className={`text-sm font-black font-mono ${mDish.isAvailable === false ? 'text-zinc-500 line-through' : 'text-[#FF5C00]'}`}>
                      {mDish.price.toFixed(2)} €
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocalDishId(mDish.id);
                          setActiveTab('order');
                          drawerContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                        title="Voir tous les détails, photos et ingrédients"
                      >
                        <span>📸 Détails</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (mDish.isAvailable === false) return;
                          onAddToCart(mDish, 1);
                        }}
                        disabled={mDish.isAvailable === false}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase flex items-center gap-1 transition-all shadow-md ${
                          mDish.isAvailable === false
                            ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
                            : 'bg-[#FF5C00] hover:bg-[#ff6d1a] text-white cursor-pointer active:scale-95'
                        }`}
                        title={mDish.isAvailable === false ? "Plat épuisé" : "Ajouter au panier"}
                      >
                        {mDish.isAvailable === false ? (
                          <>
                            <Ban size={12} className="stroke-[2.5]" />
                            <span>Épuisé</span>
                          </>
                        ) : (
                          <>
                            <Plus size={14} /> Ajouter
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: REVIEWS VIEW */}
        {activeTab === 'reviews' && dish && (
          <div className="max-w-4xl mx-auto space-y-4">
            <ReviewsAndRatingSection
              dishId={dish.id}
              dishName={dish.name}
              restaurantId={dish.restaurantId}
              restaurantName={restaurantName || 'Restaurant Partenaire'}
              currentUser={user}
            />
          </div>
        )}

        {/* TAB 4: TABLE RESERVATION VIEW */}
        {activeTab === 'reserve' && (
          <div className="max-w-2xl mx-auto bg-zinc-900/80 p-6 rounded-3xl border border-zinc-800 space-y-6">
            <h2 className="text-xl font-black text-white uppercase italic">Réserver une Table au Restaurant</h2>
            <form onSubmit={handleBookTable} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase">Date</label>
                  <input
                    type="date"
                    value={reservationDate}
                    onChange={(e) => setReservationDate(e.target.value)}
                    className="w-full bg-zinc-950 text-white p-3 rounded-xl border border-zinc-800 text-xs font-bold mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase">Heure</label>
                  <input
                    type="time"
                    value={reservationTime}
                    onChange={(e) => setReservationTime(e.target.value)}
                    className="w-full bg-zinc-950 text-white p-3 rounded-xl border border-zinc-800 text-xs font-bold mt-1"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Nombre de Personnes</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={reservationGuests}
                  onChange={(e) => setReservationGuests(Number(e.target.value))}
                  className="w-full bg-zinc-950 text-white p-3 rounded-xl border border-zinc-800 text-xs font-bold mt-1"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-[#FF5C00] hover:bg-[#ff6d1a] text-white font-black text-xs uppercase tracking-wider rounded-2xl cursor-pointer"
              >
                Confirmer ma Réservation
              </button>
            </form>
          </div>
        )}
      </div>

      {/* FULL-SCREEN HIGH-RESOLUTION LIGHTBOX GALLERY OVERLAY MODE */}
      {isLightboxOpen && activeLightboxMedia && (
        <div 
          id="modal-dish-lightbox"
          className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl text-white flex flex-col justify-between overflow-hidden animate-fadeIn select-none"
        >
          {/* Lightbox Header Bar */}
          <div className="h-16 px-4 md:px-8 bg-zinc-950/90 border-b border-zinc-800/80 flex items-center justify-between z-30 shrink-0">
            {/* Left: Media Title & Counter */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/10 border border-[#FF5C00]/30 flex items-center justify-center text-[#FF5C00] font-bold shrink-0">
                {activeLightboxMedia.type === 'video' ? <VideoIcon size={20} /> : <ImageIcon size={20} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-[#FF5C00] uppercase tracking-wider truncate">
                    {activeLightboxMedia.title}
                  </span>
                  <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700/80 px-2.5 py-0.5 rounded-full font-mono font-bold shrink-0">
                    {lightboxIndex + 1} / {mediaGallery.length}
                  </span>
                  {activeLightboxMedia.type === 'image' && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-black uppercase tracking-wider hidden sm:inline-block">
                      Ultra HD
                    </span>
                  )}
                </div>
                <h3 className="text-xs md:text-sm font-bold text-zinc-300 truncate">
                  {dish.name} {restaurantName && <span className="text-zinc-500 font-normal">• {restaurantName}</span>}
                </h3>
              </div>
            </div>

            {/* Center: Zoom Controls (for images) */}
            {activeLightboxMedia.type === 'image' && (
              <div className="hidden md:flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl px-2 py-1 shadow-inner">
                <button
                  onClick={() => setLightboxZoom(prev => Math.max(prev - 0.5, 1))}
                  disabled={lightboxZoom <= 1}
                  className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Dézoomer (-)"
                >
                  <ZoomOut size={16} />
                </button>

                <button
                  onClick={() => {
                    setLightboxZoom(1);
                    setLightboxPan({ x: 0, y: 0 });
                  }}
                  className="px-2 py-1 rounded-xl hover:bg-zinc-800 text-xs font-mono font-bold text-zinc-300 hover:text-[#FF5C00] transition-all cursor-pointer"
                  title="Réinitialiser le zoom (Touche 0)"
                >
                  {Math.round(lightboxZoom * 100)}%
                </button>

                <button
                  onClick={() => setLightboxZoom(prev => Math.min(prev + 0.5, 3))}
                  disabled={lightboxZoom >= 3}
                  className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Zoomer (+)"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
            )}

            {/* Right: Actions & Close */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Open high-res in new tab */}
              {activeLightboxMedia.type === 'image' && (
                <a
                  href={activeLightboxMedia.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 sm:px-3 sm:py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  title="Ouvrir l'image HD en taille réelle"
                >
                  <ExternalLink size={15} />
                  <span className="hidden lg:inline">HD</span>
                </a>
              )}

              {/* Video Audio toggle */}
              {activeLightboxMedia.type === 'video' && (
                <button
                  onClick={() => setIsLightboxMuted(!isLightboxMuted)}
                  className="p-2 sm:px-3 sm:py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold"
                  title={isLightboxMuted ? "Activer le son (M)" : "Couper le son (M)"}
                >
                  {isLightboxMuted ? <VolumeX size={18} className="text-amber-400" /> : <Volume2 size={18} className="text-emerald-400" />}
                  <span className="hidden sm:inline">{isLightboxMuted ? 'Muet' : 'Son'}</span>
                </button>
              )}

              {/* Close Lightbox */}
              <button
                id="btn-close-dish-lightbox"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 sm:px-3.5 sm:py-2 rounded-full bg-zinc-900 hover:bg-[#FF5C00] text-zinc-400 hover:text-white border border-zinc-800 hover:border-[#FF5C00] transition-all cursor-pointer flex items-center gap-2 text-xs font-black uppercase shadow-lg active:scale-95"
                title="Fermer la galerie (Touche Échap)"
              >
                <span className="hidden sm:inline">Fermer</span>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Lightbox Center Media Stage with Interactive Swipe, Zoom & Pan */}
          <div 
            className="relative flex-1 flex items-center justify-center p-3 md:p-6 overflow-hidden touch-pan-y"
            onTouchStart={(e) => {
              if (lightboxZoom === 1) {
                setTouchStartX(e.targetTouches[0].clientX);
                setTouchEndX(null);
              }
            }}
            onTouchMove={(e) => {
              if (lightboxZoom === 1) {
                setTouchEndX(e.targetTouches[0].clientX);
              }
            }}
            onTouchEnd={() => {
              if (lightboxZoom > 1) return;
              if (touchStartX === null || touchEndX === null) return;
              const distance = touchStartX - touchEndX;
              if (distance > 45) {
                setLightboxIndex(prev => (prev === mediaGallery.length - 1 ? 0 : prev + 1));
              } else if (distance < -45) {
                setLightboxIndex(prev => (prev === 0 ? mediaGallery.length - 1 : prev - 1));
              }
              setTouchStartX(null);
              setTouchEndX(null);
            }}
            onMouseDown={(e) => {
              if (lightboxZoom > 1) {
                setIsDraggingLightbox(true);
                setDragStartPos({ x: e.clientX - lightboxPan.x, y: e.clientY - lightboxPan.y });
              }
            }}
            onMouseMove={(e) => {
              if (isDraggingLightbox && lightboxZoom > 1) {
                setLightboxPan({
                  x: e.clientX - dragStartPos.x,
                  y: e.clientY - dragStartPos.y
                });
              }
            }}
            onMouseUp={() => setIsDraggingLightbox(false)}
            onMouseLeave={() => setIsDraggingLightbox(false)}
          >
            {/* Previous Floating Arrow */}
            {mediaGallery.length > 1 && (
              <button
                id="btn-lightbox-prev"
                onClick={() => setLightboxIndex(prev => (prev === 0 ? mediaGallery.length - 1 : prev - 1))}
                className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 z-40 w-11 h-11 md:w-14 md:h-14 rounded-full bg-black/80 hover:bg-[#FF5C00] text-white flex items-center justify-center border border-white/20 hover:border-[#FF5C00] transition-all cursor-pointer shadow-2xl backdrop-blur-md active:scale-95 group"
                title="Photo précédente (Flèche Gauche)"
              >
                <ChevronLeft size={28} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Next Floating Arrow */}
            {mediaGallery.length > 1 && (
              <button
                id="btn-lightbox-next"
                onClick={() => setLightboxIndex(prev => (prev === mediaGallery.length - 1 ? 0 : prev + 1))}
                className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 z-40 w-11 h-11 md:w-14 md:h-14 rounded-full bg-black/80 hover:bg-[#FF5C00] text-white flex items-center justify-center border border-white/20 hover:border-[#FF5C00] transition-all cursor-pointer shadow-2xl backdrop-blur-md active:scale-95 group"
                title="Photo suivante (Flèche Droite)"
              >
                <ChevronRight size={28} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Media Canvas Box */}
            <div className="relative max-w-6xl max-h-[72vh] w-full h-full flex items-center justify-center rounded-3xl overflow-hidden">
              {activeLightboxMedia.type === 'image' ? (
                <div 
                  className={`w-full h-full flex items-center justify-center overflow-hidden select-none ${
                    lightboxZoom > 1 ? (isDraggingLightbox ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
                  }`}
                  onDoubleClick={() => {
                    if (lightboxZoom === 1) {
                      setLightboxZoom(2);
                    } else {
                      setLightboxZoom(1);
                      setLightboxPan({ x: 0, y: 0 });
                    }
                  }}
                >
                  <img
                    src={activeLightboxMedia.url}
                    alt={activeLightboxMedia.title}
                    style={{
                      transform: `scale(${lightboxZoom}) translate(${lightboxPan.x / lightboxZoom}px, ${lightboxPan.y / lightboxZoom}px)`,
                      transition: isDraggingLightbox ? 'none' : 'transform 0.25s ease-out'
                    }}
                    className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl border border-zinc-800/80 pointer-events-auto"
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="w-full h-full max-h-[72vh] relative rounded-2xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-center shadow-2xl">
                  <BackgroundVideoPlayer
                    src={activeLightboxMedia.url}
                    isPlaying={true}
                    isMuted={isLightboxMuted}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-4 left-4 bg-purple-600/90 text-white px-3 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-lg flex items-center gap-1.5 border border-white/20">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Vidéo Dégustation 4K
                  </div>
                </div>
              )}
            </div>

            {/* Zoom Hint Tooltip overlay for double-click */}
            {activeLightboxMedia.type === 'image' && lightboxZoom === 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-60 hover:opacity-100 transition-opacity">
                <span className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-bold text-zinc-300 border border-white/10 flex items-center gap-1.5 shadow-lg">
                  <Maximize2 size={12} className="text-[#FF5C00]" />
                  Double-clic pour zoomer • Flèches pour naviguer
                </span>
              </div>
            )}
          </div>

          {/* Lightbox Footer Bar & Scrollable High-Res Thumbnails Strip */}
          <div className="bg-zinc-950/95 border-t border-zinc-800/80 p-3 md:p-5 md:px-8 z-30 shrink-0 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-6xl mx-auto">
              <div className="min-w-0">
                <h4 className="text-xs md:text-sm font-black text-white uppercase italic tracking-wide truncate">
                  {activeLightboxMedia.title}
                </h4>
                {activeLightboxMedia.caption && (
                  <p className="text-[11px] md:text-xs text-zinc-400 font-sans mt-0.5 max-w-xl line-clamp-1 sm:line-clamp-2">
                    {activeLightboxMedia.caption}
                  </p>
                )}
              </div>

              {/* Quick Add to Cart Action with Price */}
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-lg md:text-xl font-black font-mono ${
                  dish.isAvailable === false ? 'text-zinc-500 line-through' : 'text-[#FF5C00]'
                }`}>
                  {dish.price.toFixed(2)} €
                </span>
                <button
                  id="btn-lightbox-add-to-cart"
                  onClick={() => {
                    if (dish.isAvailable === false) return;
                    handleAdd(dish, quantity);
                  }}
                  disabled={dish.isAvailable === false}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                    dish.isAvailable === false
                      ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
                      : 'bg-[#FF5C00] hover:bg-[#ff6d1a] text-white cursor-pointer shadow-lg active:scale-95'
                  }`}
                >
                  {dish.isAvailable === false ? (
                    <>
                      <Ban size={14} className="stroke-[2.5]" />
                      <span>Épuisé</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="stroke-[3]" />
                      <span>Ajouter au panier</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* High-Resolution Thumbnails Rail (Horizontally Scrollable) */}
            <div 
              ref={lightboxThumbStripRef}
              className="flex items-center justify-start sm:justify-center gap-2.5 overflow-x-auto py-1 max-w-6xl mx-auto no-scrollbar scroll-smooth"
            >
              {mediaGallery.map((media, idx) => {
                const isSelected = lightboxIndex === idx;
                return (
                  <button
                    key={media.id}
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxZoom(1);
                      setLightboxPan({ x: 0, y: 0 });
                    }}
                    className={`relative w-16 sm:w-20 h-12 sm:h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer group ${
                      isSelected
                        ? 'border-[#FF5C00] ring-2 ring-[#FF5C00]/40 scale-105 opacity-100 shadow-lg'
                        : 'border-zinc-800 opacity-50 hover:opacity-100 hover:border-zinc-700'
                    }`}
                    title={media.title}
                  >
                    <img
                      src={media.type === 'image' ? media.url : (media.thumbnailUrl || media.url)}
                      alt={media.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {media.type === 'video' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play size={14} className="text-white fill-white drop-shadow" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#FF5C00]/15" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* 🎬 POPUP MODAL: SHORT COOKING & PREPARATION VIDEO */}
      {isCookingVideoOpen && cookingVideoData && (
        <div 
          id="modal-cooking-video-popup"
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6 select-none"
          onClick={() => setIsCookingVideoOpen(false)}
        >
          <div 
            className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Header Bar */}
            <div className="px-5 py-3.5 bg-zinc-900/95 border-b border-zinc-800/90 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF5C00] to-red-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Flame size={20} className="animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#FF5C00] bg-[#FF5C00]/10 border border-[#FF5C00]/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <ChefHat size={11} /> En direct des fourneaux
                    </span>
                    <span className="text-[10px] bg-red-600 text-white font-black uppercase px-2 py-0.5 rounded-md tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      Vidéo Cuisson Minute
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white truncate mt-0.5">
                    {dish.name} <span className="text-zinc-400 font-normal text-xs">• {restaurantName || 'En cuisine'}</span>
                  </h3>
                </div>
              </div>

              {/* Close Button */}
              <button
                id="btn-close-cooking-video-popup"
                onClick={() => setIsCookingVideoOpen(false)}
                className="p-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-all cursor-pointer shadow-md"
                title="Fermer la vidéo (Échap)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Video Viewport Stage */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden group">
              <BackgroundVideoPlayer
                src={cookingVideoData.url}
                isPlaying={isCookingVideoPlaying}
                isMuted={isCookingVideoMuted}
                loop={true}
                allowInteractive={true}
                className="w-full h-full object-contain cursor-pointer"
                onClick={handleToggleCookingVideoPlay}
              />

              {/* Floating Play / Pause Overlay on Paused */}
              {!isCookingVideoPlaying && (
                <div 
                  onClick={handleToggleCookingVideoPlay}
                  className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer z-20"
                >
                  <div className="w-16 h-16 rounded-full bg-[#FF5C00] text-white flex items-center justify-center shadow-2xl scale-110 hover:scale-125 transition-transform">
                    <Play size={28} className="fill-white translate-x-0.5" />
                  </div>
                </div>
              )}

              {/* Top-Right Audio Mute Toggle */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                <button
                  id="btn-cooking-video-mute"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextMute = !isCookingVideoMuted;
                    setIsCookingVideoMuted(nextMute);
                    if (cookingVideoRef.current) {
                      cookingVideoRef.current.muted = nextMute;
                    }
                  }}
                  className="px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer shadow-lg"
                  title={isCookingVideoMuted ? "Activer le son (M)" : "Couper le son (M)"}
                >
                  {isCookingVideoMuted ? (
                    <>
                      <VolumeX size={14} className="text-amber-400" />
                      <span>Son coupé</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} className="text-emerald-400" />
                      <span>Son activé</span>
                    </>
                  )}
                </button>
              </div>

              {/* Bottom Floating Scrubber & Controls */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 z-20 flex flex-col gap-2">
                {/* Progress timeline bar */}
                <div 
                  className="w-full h-1.5 bg-white/20 hover:h-2.5 rounded-full overflow-hidden cursor-pointer transition-all relative"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickPos = (e.clientX - rect.left) / rect.width;
                    if (cookingVideoRef.current && cookingVideoDuration) {
                      cookingVideoRef.current.currentTime = clickPos * cookingVideoDuration;
                    }
                  }}
                >
                  <div 
                    className="h-full bg-gradient-to-r from-[#FF5C00] to-red-500 rounded-full transition-all"
                    style={{ width: `${cookingVideoProgress}%` }}
                  />
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between text-xs text-zinc-300 pt-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleToggleCookingVideoPlay}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
                      title={isCookingVideoPlaying ? "Pause (Espace)" : "Lecture (Espace)"}
                    >
                      {isCookingVideoPlaying ? <Pause size={16} /> : <Play size={16} className="fill-white" />}
                    </button>

                    <span className="font-mono text-[11px] text-zinc-300">
                      {formatVideoTime(cookingVideoCurrentTime)} / {formatVideoTime(cookingVideoDuration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cookingVideoRef.current) {
                          if (document.fullscreenElement) {
                            document.exitFullscreen().catch(() => {});
                          } else {
                            cookingVideoRef.current.requestFullscreen?.().catch(() => {});
                          }
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="Plein écran"
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Footer with Direct Ordering */}
            <div className="p-4 sm:p-5 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                {dish.imageUrl && (
                  <img 
                    src={dish.imageUrl} 
                    alt={dish.name} 
                    className="w-12 h-12 rounded-xl object-cover border border-zinc-700 shrink-0" 
                  />
                )}
                <div className="min-w-0 flex-1 sm:flex-initial">
                  <h4 className="text-sm font-black text-white truncate">{dish.name}</h4>
                  <p className="text-xs text-[#FF5C00] font-black mt-0.5">
                    {dish.price.toFixed(2)} €
                    {dish.originMeat && <span className="text-zinc-400 font-normal text-[11px] ml-2 truncate">• {dish.originMeat}</span>}
                  </p>
                </div>
              </div>

              {/* Order Direct CTA */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  id="btn-add-from-cooking-popup"
                  onClick={() => {
                    if (dish.isAvailable === false) return;
                    handleAdd(dish, quantity);
                  }}
                  disabled={dish.isAvailable === false}
                  className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
                    dish.isAvailable === false
                      ? 'bg-zinc-800 border border-zinc-700/60 text-zinc-500 cursor-not-allowed shadow-none'
                      : 'bg-[#FF5C00] hover:bg-[#ff6d1a] text-white shadow-[#FF5C00]/25 hover:scale-102 active:scale-95 cursor-pointer'
                  }`}
                >
                  {dish.isAvailable === false ? (
                    <>
                      <Ban size={16} className="stroke-[2.5]" />
                      <span>Plat Épuisé • Indisponible</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={16} />
                      <span>Ajouter au panier • {(dish.price * quantity).toFixed(2)} €</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* USER / RESTAURATEUR ADD MEDIA MODAL */}
      {isAddMediaOpen && (
        <div className="fixed inset-0 z-[350] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <UploadCloud size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Ajouter un Média</h3>
                  <p className="text-xs text-zinc-400">Enrichissez la galerie de « {dish?.name || 'ce plat'} »</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddMediaOpen(false)}
                className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddCustomMedia} className="p-5 space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-2xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setNewMediaType('image')}
                  className={`py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    newMediaType === 'image'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Camera size={15} />
                  <span>Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewMediaType('video')}
                  className={`py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    newMediaType === 'video'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Film size={15} />
                  <span>Vidéo</span>
                </button>
              </div>

              {/* Upload File or URL Input */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Fichier depuis votre appareil
                  </label>
                  <input
                    type="file"
                    accept={newMediaType === 'image' ? 'image/*' : 'video/*'}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNewMediaFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-zinc-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-zinc-800 file:text-white hover:file:bg-[#FF5C00] file:cursor-pointer bg-zinc-950 p-2 rounded-2xl border border-zinc-800"
                  />
                </div>

                <div className="flex items-center gap-2 text-zinc-600 text-xs font-bold justify-center uppercase">
                  <span>ou par lien web</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    URL {newMediaType === 'image' ? 'de l\'image' : 'de la vidéo (MP4/WebM)'}
                  </label>
                  <input
                    type="url"
                    value={newMediaUrl}
                    onChange={(e) => setNewMediaUrl(e.target.value)}
                    placeholder={newMediaType === 'image' ? 'https://images.unsplash.com/...' : 'https://example.com/video.mp4'}
                    className="w-full bg-zinc-950 text-white p-3 rounded-2xl border border-zinc-800 text-xs focus:border-[#FF5C00] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Titre du média (optionnel)
                  </label>
                  <input
                    type="text"
                    value={newMediaTitle}
                    onChange={(e) => setNewMediaTitle(e.target.value)}
                    placeholder={`Ex: Vue détaillée de ${dish?.name || 'la spécialité'}`}
                    className="w-full bg-zinc-950 text-white p-3 rounded-2xl border border-zinc-800 text-xs focus:border-[#FF5C00] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Description ou Légende (optionnel)
                  </label>
                  <input
                    type="text"
                    value={newMediaCaption}
                    onChange={(e) => setNewMediaCaption(e.target.value)}
                    placeholder="Ex: Dressage minute avec herbes fraîches et réduction de jus."
                    className="w-full bg-zinc-950 text-white p-3 rounded-2xl border border-zinc-800 text-xs focus:border-[#FF5C00] outline-none"
                  />
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMediaOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUploadingMedia}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUploadingMedia ? (
                    <span>Traitement...</span>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Ajouter à la Galerie</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📱 Mobile Sticky Bottom Checkout Bar (Tab 1: Order) */}
      {activeTab === 'order' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0e0e11]/95 backdrop-blur-xl border-t border-zinc-800 p-3 px-4 flex items-center justify-between gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shrink-0">
            <button 
              onClick={handleDecrement} 
              disabled={dish.isAvailable === false} 
              className="w-8 h-8 rounded-lg bg-zinc-800 text-white flex items-center justify-center font-bold active:scale-95 disabled:opacity-40"
            >
              <Minus size={14} />
            </button>
            <span className="text-sm font-black text-white w-6 text-center">{quantity}</span>
            <button 
              onClick={handleIncrement} 
              disabled={dish.isAvailable === false} 
              className="w-8 h-8 rounded-lg bg-zinc-800 text-white flex items-center justify-center font-bold active:scale-95 disabled:opacity-40"
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            id="btn-add-to-cart-drawer-mobile-sticky"
            onClick={() => handleAdd(dish, quantity)}
            disabled={dish.isAvailable === false}
            className={`flex-1 py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
              dish.isAvailable === false
                ? 'bg-zinc-900 border border-red-500/40 text-red-400 cursor-not-allowed'
                : showNotification
                ? 'bg-emerald-600 text-white'
                : 'bg-[#FF5C00] text-white shadow-[#FF5C00]/30 active:scale-95'
            }`}
          >
            {dish.isAvailable === false ? (
              <span>Plat Épuisé</span>
            ) : showNotification ? (
              <span>Ajouté au Panier !</span>
            ) : (
              <>
                <ShoppingBag size={15} />
                <span className="truncate">Ajouter • {((dish.price + selectedSupplements.reduce((sum, s) => sum + s.price, 0)) * quantity).toFixed(2)} €</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
