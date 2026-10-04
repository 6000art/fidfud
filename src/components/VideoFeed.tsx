import React, { useRef, useState, useEffect } from 'react';
import DietaryBadges from './DietaryBadges';
import LazyImage, { getOptimizedImageUrl } from './LazyImage';
import { 
  Heart, 
  Share2, 
  ShoppingCart, 
  Info, 
  MapPin, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Gift, 
  Plus, 
  Check, 
  Coins, 
  Send, 
  Sparkles,
  Search,
  Maximize2,
  Minimize2,
  BookOpen,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Play,
  Eye,
  EyeOff,
  AlertTriangle,
  Flame,
  Award,
  Trash2,
  Film,
  CheckSquare,
  Square,
  Zap
} from 'lucide-react';
import { offlineCacheService } from '../services/OfflineCacheService';
import { videoPreloadService } from '../services/VideoPreloadService';
import { Video, Comment, Tip, Restaurant, Dish, Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import CustomIcon from './CustomIcon';
import { notify } from '../utils/notify';
import { checkDishMatchesDietaryTag, checkRestaurantMatchesDietaryTag } from '../utils/dietaryUtils';
import { getSafeVideoUrl, STABLE_CULINARY_FALLBACK_VIDEOS, parseVideoSource, getVideoThumbnail, isDirectPlayableVideo } from '../utils/videoUtils';
import { MLRecommendationEngine, MLScoreResult } from '../services/MLRecommendationEngine';
import { AITasteProfileEngine } from '../services/AITasteProfileEngine';
import { TasteMatchScore, FeedSortOrder } from '../types';
import TasteProfileModal from './TasteProfileModal';
import { FloatingReactionOverlay, FloatingReactionParticle, ComboTracker } from './FloatingReactionOverlay';
import { QuickReactionDock } from './QuickReactionDock';
import { ReactionAudioService } from '../services/ReactionAudioService';

export const getBaseVideoId = (id: string): string => {
  if (!id) return '';
  return id.split('__loop_')[0].split('-inf-')[0];
};

export const createLoopedFeed = (baseItems: Video[], cycles = 8): Video[] => {
  if (!baseItems || baseItems.length === 0) return [];
  const looped: Video[] = [];
  for (let c = 0; c < cycles; c++) {
    baseItems.forEach((item) => {
      looped.push({
        ...item,
        id: `${item.id}__loop_${c}`,
      });
    });
  }
  return looped;
};

export const appendFeedCycles = (currentList: Video[], baseItems: Video[], numCycles = 4): Video[] => {
  if (!baseItems || baseItems.length === 0) return currentList;
  let maxCycle = 0;
  currentList.forEach(item => {
    const match = item.id.match(/__loop_(\d+)$/);
    if (match) {
      maxCycle = Math.max(maxCycle, parseInt(match[1], 10));
    }
  });

  const newItems: Video[] = [];
  for (let c = 1; c <= numCycles; c++) {
    const cycleNum = maxCycle + c;
    baseItems.forEach((item) => {
      newItems.push({
        ...item,
        id: `${item.id}__loop_${cycleNum}`,
      });
    });
  }
  return [...currentList, ...newItems];
};

const getMediaEmbed = (url: string): { type: 'instagram' | 'youtube' | 'youtube_channel' | 'tiktok' | 'none'; embedUrl: string | null } => {
  if (!url) return { type: 'none', embedUrl: null };
  const parsed = parseVideoSource(url, { isPlaying: true, isMuted: true, loop: true, controls: false });
  if (parsed.isEmbed && parsed.embedUrl) {
    let embedType: 'instagram' | 'youtube' | 'youtube_channel' | 'tiktok' | 'none' = 'none';
    if (parsed.type === 'youtube' || parsed.type === 'youtube_shorts') embedType = 'youtube';
    else if (parsed.type === 'youtube_live') embedType = 'youtube_channel';
    else if (parsed.type === 'instagram') embedType = 'instagram';
    else if (parsed.type === 'tiktok') embedType = 'tiktok';
    return { type: embedType, embedUrl: parsed.embedUrl };
  }
  return { type: 'none', embedUrl: null };
};

const getInstagramEmbedUrl = (url: string): string | null => {
  return getMediaEmbed(url).embedUrl;
};

interface VideoFeedProps {
  videos: Video[];
  orders?: Order[];
  onSelectDish: (dishId: string, tab?: 'order' | 'menu' | 'reviews' | 'reserve') => void;
  onSelectLiveVideo?: (videoId: string) => void;
  isLoading: boolean;
  user: any;
  onOpenAuth: () => void;
  restaurants: Restaurant[];
  dishes?: Dish[];
  // Optional lifted search and location states
  searchQuery?: string;
  selectedCategory?: string;
  userLocation?: { lat: number; lng: number } | null;
  designSettings?: any;
  isProximityFirst?: boolean;
  setIsProximityFirst?: (val: boolean) => void;
  feedSortOrder?: FeedSortOrder;
  setFeedSortOrder?: (val: FeedSortOrder) => void;
  proximityRadius?: number;
  isFastLane?: boolean;
  maxPrepTimeMinutes?: number;
  selectedDietaryTags?: string[];
  isAutoPlayEnabled?: boolean;
  onDeleteVideo?: (videoId: string) => void;
  onRefreshData?: () => void;
}

interface FlyingElement {
  id: string;
  x: number; // Left position %
  icon: string;
}

export const REACTION_EMOJIS = [
  { emoji: '😋', label: 'Miam !', baseCount: 65, color: 'from-[#FF5C00] to-yellow-500', glow: 'rgba(255, 140, 0, 0.9)' },
  { emoji: '🔥', label: 'Feu !', baseCount: 42, color: 'from-amber-500 to-orange-500', glow: 'rgba(255, 60, 0, 0.9)' },
  { emoji: '🤤', label: 'Bave', baseCount: 38, color: 'from-emerald-500 to-teal-500', glow: 'rgba(16, 185, 129, 0.9)' },
  { emoji: '❤️', label: 'Cœur', baseCount: 88, color: 'from-pink-500 to-red-500', glow: 'rgba(255, 48, 64, 0.9)' },
  { emoji: '💯', label: '10/10', baseCount: 51, color: 'from-amber-400 to-[#FF5C00]', glow: 'rgba(245, 158, 11, 0.9)' },
  { emoji: '👨‍🍳', label: 'Chef', baseCount: 24, color: 'from-indigo-500 to-purple-500', glow: 'rgba(129, 140, 248, 0.9)' },
  { emoji: '👏', label: 'Bravo', baseCount: 19, color: 'from-yellow-400 to-amber-500', glow: 'rgba(234, 179, 8, 0.9)' },
  { emoji: '🍕', label: 'Pizza', baseCount: 33, color: 'from-red-500 to-amber-500', glow: 'rgba(239, 68, 68, 0.9)' },
  { emoji: '🍔', label: 'Burger', baseCount: 29, color: 'from-amber-600 to-orange-600', glow: 'rgba(217, 119, 6, 0.9)' },
  { emoji: '⭐', label: 'Top', baseCount: 45, color: 'from-yellow-300 to-amber-400', glow: 'rgba(251, 191, 36, 0.9)' },
];

function getDishOrderStats(dishId: string | undefined, orders: Order[] = []): { count: number; isTrending: boolean; badgeType: 'popular' | 'trending' | null } {
  if (!dishId) return { count: 0, isTrending: false, badgeType: null };

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  let realCount = 0;
  if (Array.isArray(orders)) {
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate >= oneDayAgo && order.items) {
        order.items.forEach(item => {
          if (item.dishId === dishId) {
            realCount += item.quantity;
          }
        });
      }
    });
  }

  const getDeterministicSeed = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const seed = getDeterministicSeed(dishId);
  const simulatedPastCount = (seed % 64) + 12; 

  const totalCount = realCount + simulatedPastCount;

  if (totalCount > 50) {
    const badgeType = (seed % 2 === 0) ? 'trending' : 'popular';
    return { count: totalCount, isTrending: true, badgeType };
  }

  return { count: totalCount, isTrending: false, badgeType: null };
}

export function getVideoPreparationTime(video: Video, restaurants: Restaurant[] = [], dishes: Dish[] = []): number {
  const dish = dishes.find(d => d.id === video.associatedDishId) || video.associatedDish;
  if (dish?.preparationTimeMinutes !== undefined && dish.preparationTimeMinutes > 0) {
    return dish.preparationTimeMinutes;
  }
  const rest = restaurants.find(r => r.id === video.restaurantId);
  if (rest?.preparationTimeMinutes !== undefined && rest.preparationTimeMinutes > 0) {
    return rest.preparationTimeMinutes;
  }
  if (rest?.avgPreparationTimeMinutes !== undefined && rest.avgPreparationTimeMinutes > 0) {
    return rest.avgPreparationTimeMinutes;
  }
  const titleLower = ((video.title || '') + ' ' + (dish?.name || '') + ' ' + (dish?.category || '')).toLowerCase();
  if (titleLower.includes('boisson') || titleLower.includes('café') || titleLower.includes('smoothie') || titleLower.includes('cocktail') || titleLower.includes('dessert') || titleLower.includes('cookie') || titleLower.includes('tiramisu') || titleLower.includes('croissant') || titleLower.includes('donut')) {
    return 5;
  }
  if (titleLower.includes('smash') || titleLower.includes('wrap') || titleLower.includes('tacos') || titleLower.includes('sandwich') || titleLower.includes('salad') || titleLower.includes('salade') || titleLower.includes('roll') || titleLower.includes('sushi') || titleLower.includes('poke') || titleLower.includes('bagel') || titleLower.includes('omelette') || titleLower.includes('hot dog')) {
    return 8;
  }
  const code = (video.id || rest?.id || '0').split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0);
  return 5 + (code % 15);
}

export default function VideoFeed({ 
  videos, 
  orders = [],
  onSelectDish, 
  onSelectLiveVideo,
  isLoading, 
  user, 
  onOpenAuth,
  restaurants,
  dishes = [],
  searchQuery,
  selectedCategory,
  userLocation,
  designSettings,
  isProximityFirst: propIsProximityFirst,
  setIsProximityFirst: propSetIsProximityFirst,
  feedSortOrder: propFeedSortOrder,
  setFeedSortOrder: propSetFeedSortOrder,
  proximityRadius = 5,
  isFastLane = false,
  maxPrepTimeMinutes = 20,
  selectedDietaryTags = [],
  isAutoPlayEnabled = true,
  onDeleteVideo,
  onRefreshData
}: VideoFeedProps) {
  const [feedVideos, setFeedVideos] = useState<Video[]>([]);
  const [mlScoresMap, setMlScoresMap] = useState<Record<string, MLScoreResult>>({});
  const [tasteScoresMap, setTasteScoresMap] = useState<Record<string, TasteMatchScore>>({});
  const [isTasteProfileModalOpen, setIsTasteProfileModalOpen] = useState<boolean>(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>({});
  const [loadedVideos, setLoadedVideos] = useState<Record<string, boolean>>({});
  const [videoFallbackUrls, setVideoFallbackUrls] = useState<Record<string, string>>({});
  const [videoErrorRetries, setVideoErrorRetries] = useState<Record<string, number>>({});
  const [localLikes, setLocalLikes] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [pausedVideos, setPausedVideos] = useState<Record<string, boolean>>({});

  // Video Management & Bulk Delete States
  const [isManagerDrawerOpen, setIsManagerDrawerOpen] = useState<boolean>(false);
  const [selectedBulkVideoIds, setSelectedBulkVideoIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteToastMessage, setDeleteToastMessage] = useState<string | null>(null);

  const handleSingleDeleteVideo = async (videoId: string) => {
    try {
      setIsDeleting(true);
      offlineCacheService.purgeVideoFromLocalCache(videoId);

      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
      if (!res.ok) {
        await fetch(`/api/videos/${videoId}/delete`, { method: 'POST' }).catch(() => {});
      }

      setFeedVideos(prev => prev.filter(v => v.id !== videoId));
      if (onDeleteVideo) onDeleteVideo(videoId);
      if (onRefreshData) onRefreshData();

      setDeleteToastMessage('🗑️ Vidéo supprimée définitivement du feed !');
      setTimeout(() => setDeleteToastMessage(null), 3000);
    } catch (err) {
      console.error('Erreur suppression vidéo:', err);
      alert('Erreur lors de la suppression de la vidéo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteVideos = async () => {
    if (selectedBulkVideoIds.length === 0) return;
    if (!confirm(`Voulez-vous vraiment supprimer définitivement ces ${selectedBulkVideoIds.length} vidéo(s) ? Cette action est irréversible.`)) return;

    try {
      setIsDeleting(true);
      const idsToDelete = [...selectedBulkVideoIds];

      idsToDelete.forEach(id => offlineCacheService.purgeVideoFromLocalCache(id));

      const res = await fetch('/api/videos/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete })
      });

      if (!res.ok) {
        await Promise.all(idsToDelete.map(id => fetch(`/api/videos/${id}`, { method: 'DELETE' }).catch(() => {})));
      }

      setFeedVideos(prev => prev.filter(v => !idsToDelete.includes(v.id)));
      idsToDelete.forEach(id => onDeleteVideo?.(id));
      if (onRefreshData) onRefreshData();

      setSelectedBulkVideoIds([]);
      setIsManagerDrawerOpen(false);
      setDeleteToastMessage(`🗑️ ${idsToDelete.length} vidéo(s) supprimée(s) en masse avec succès !`);
      setTimeout(() => setDeleteToastMessage(null), 3500);
    } catch (err) {
      console.error('Erreur suppression en masse:', err);
      alert('Erreur lors de la suppression en masse.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // New Innovative and Cinema States
  const [feedContentTab, setFeedContentTab] = useState<'restaurants' | 'recipes' | 'all'>('restaurants');
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);
  const [scrollMode, setScrollMode] = useState<'standard' | 'kinetic' | 'elevator'>('kinetic');
  const [isAutopilot, setIsAutopilot] = useState<boolean>(false);
  
  const [localFeedSortOrder, setLocalFeedSortOrder] = useState<FeedSortOrder>(
    designSettings?.feedDefaultSort || 'recent'
  );
  const feedSortOrder = propFeedSortOrder !== undefined ? propFeedSortOrder : localFeedSortOrder;
  const setFeedSortOrder = propSetFeedSortOrder !== undefined ? propSetFeedSortOrder : setLocalFeedSortOrder;

  useEffect(() => {
    if (designSettings?.feedDefaultSort) {
      setFeedSortOrder(designSettings.feedDefaultSort);
    }
  }, [designSettings?.feedDefaultSort]);

  // Unified Validation Service: Pre-emptively self-heal known invalid external sources
  useEffect(() => {
    // Disabled fallback mapping so that the user's online video is never replaced with fallbacks.
  }, [videos]);
  
  // New Interactive States
  const [isCommentsOpen, setIsCommentsOpen] = useState<boolean>(false);
  const [isTipsOpen, setIsTipsOpen] = useState<boolean>(false);
  
  // Discreet Search, Categories & Geolocation States
  const [localSearchQuery, setLocalSearchQuery] = useState<string>('');
  const [localSelectedCategory, setLocalSelectedCategory] = useState<string>('');
  const [localUserLocation, setLocalUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [localIsProximityFirst, setLocalIsProximityFirst] = useState<boolean>(false);
  const isProximityFirst = propIsProximityFirst !== undefined ? propIsProximityFirst : localIsProximityFirst;
  const setIsProximityFirst = propSetIsProximityFirst !== undefined ? propSetIsProximityFirst : setLocalIsProximityFirst;

  const watchIdRef = useRef<number | null>(null);
  
  const activeSearchQuery = searchQuery !== undefined ? searchQuery : localSearchQuery;
  const activeSelectedCategory = selectedCategory !== undefined ? selectedCategory : localSelectedCategory;
  const activeUserLocation = userLocation !== undefined ? userLocation : localUserLocation;

  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState<string>('');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  
  const [userPoints, setUserPoints] = useState<number>(0);
  const [selectedGift, setSelectedGift] = useState<{ icon: string; points: number }>({ icon: '🌸', points: 5 });
  const [flyingElements, setFlyingElements] = useState<FlyingElement[]>([]);
  const [fireworks, setFireworks] = useState<{
    id: string;
    x: number;
    y: number;
    particles: {
      id: string;
      tx: number;
      ty: number;
      color: string;
      emoji?: string;
      size: number;
    }[];
  }[]>([]);

  const triggerFirework = (x: number, y: number, emoji?: string) => {
    const particleColors = ['#FF5C00', '#FF3040', '#FFD700', '#FF00FF', '#00FFFF', '#39FF14'];
    const particleCount = 20;
    const particles = Array.from({ length: particleCount }).map((_, i) => {
      const angle = (i * 2 * Math.PI) / particleCount + (Math.random() * 0.4 - 0.2);
      const distance = 50 + Math.random() * 110;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      return {
        id: `p-${i}-${Math.random()}`,
        tx,
        ty,
        color,
        emoji: emoji || (Math.random() > 0.6 ? '✨' : ''),
        size: Math.random() > 0.5 ? 12 : 8
      };
    });

    const newFirework = {
      id: `fw-${Date.now()}-${Math.random()}`,
      x,
      y,
      particles
    };

    setFireworks(prev => [...prev, newFirework]);

    setTimeout(() => {
      setFireworks(prev => prev.filter(f => f.id !== newFirework.id));
    }, 1300);
  };

  const [subscriptions, setSubscriptions] = useState<string[]>([]); // Array of followed restaurantId's
  const [overlayCycleIndex, setOverlayCycleIndex] = useState<number>(0);
  const [localIsFullscreen, setLocalIsFullscreen] = useState<boolean>(false);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(true);

  // Real-time video progress and duration states
  const [activeVideoTime, setActiveVideoTime] = useState<number>(0);
  const [activeVideoDuration, setActiveVideoDuration] = useState<number>(1);

  // Intelligent Blob & Stream Preloader for 0-latency vertical scrolling
  const [preloadedBlobUrls, setPreloadedBlobUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = videoPreloadService.subscribe((cacheMap) => {
      setPreloadedBlobUrls(cacheMap);
    });
    return () => unsubscribe();
  }, []);

  // Reset active video progress on index change
  useEffect(() => {
    setActiveVideoTime(0);
    setActiveVideoDuration(1);
  }, [activeVideoIndex]);

  // Cycle overlays every 5 seconds to stagger popups beautifully without cluttering
  useEffect(() => {
    setOverlayCycleIndex(0);
    const interval = setInterval(() => {
      setOverlayCycleIndex(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeVideoIndex]);

  // --- Booster d'Engagement Engine (Auto-cycles Interactive Prompts) ---
  const [activeBooster, setActiveBooster] = useState<{
    type: 'like' | 'comment' | 'gift';
    message: string;
    visible: boolean;
  } | null>(null);

  useEffect(() => {
    if (designSettings?.enableEngagementAnimations === false) {
      setActiveBooster(null);
      return;
    }

    const intervalSeconds = designSettings?.engagementInterval || 20;
    let cycleCount = 0;

    const runBoosterCycle = () => {
      const types: ('like' | 'comment' | 'gift')[] = ['like', 'comment', 'gift'];
      const currentType = types[cycleCount % types.length];
      cycleCount++;

      let msg = '';
      let particles: string[] = [];

      if (currentType === 'like') {
        msg = "Clique pour envoyer un Super Like ! ❤️";
        particles = ['❤️', '🔥', '❤️', '💖', '🔥'];
      } else if (currentType === 'comment') {
        msg = "Donne ton avis en commentaire ! 💬";
        particles = ['💬', '😋', '🍳', '👨‍🍳', '💬'];
      } else {
        msg = "Offre un cadeau de force au chef ! 🎁";
        particles = ['🎁', '🌸', '✨', '⭐', '🎉'];
      }

      // 1. Show booster
      setActiveBooster({
        type: currentType,
        message: msg,
        visible: true
      });

      // 2. Trigger automatic flying elements (particles) like a mini firework!
      const newElements: FlyingElement[] = Array.from({ length: 12 }).map((_, i) => ({
        id: `booster-fly-${Date.now()}-${i}-${Math.random()}`,
        x: 10 + Math.random() * 80, // spread across width
        icon: particles[Math.floor(Math.random() * particles.length)]
      }));
      setFlyingElements(prev => [...prev, ...newElements]);
      setTimeout(() => {
        setFlyingElements(prev => prev.filter(el => !newElements.some(ne => ne.id === el.id)));
      }, 2000);

      // 3. Hide booster after 7.5 seconds
      setTimeout(() => {
        setActiveBooster(prev => prev ? { ...prev, visible: false } : null);
      }, 7500);
    };

    // Run first time after a short delay (e.g. 6 seconds into video feed)
    const initialTimeout = setTimeout(() => {
      runBoosterCycle();
    }, 6000);

    // Set up recurring interval
    const intervalId = setInterval(() => {
      runBoosterCycle();
    }, intervalSeconds * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [activeVideoIndex, designSettings?.engagementInterval, designSettings?.enableEngagementAnimations, feedVideos]);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const observerRefs = useRef<Record<string, IntersectionObserver | null>>({});
  const prevActiveVideoIdRef = useRef<string | null>(null);
  const baseVideosRef = useRef<Video[]>([]);
  const prevBaseIdsKeyRef = useRef<string>('');

  const currentVideo = feedVideos[activeVideoIndex];

  // Helper to smoothly jump to any video index
  const scrollToIndex = (targetIndex: number, smooth = true) => {
    const container = containerRef.current;
    if (!container || feedVideos.length === 0) return;
    const clampedIndex = Math.max(0, Math.min(targetIndex, feedVideos.length - 1));
    const targetVideo = feedVideos[clampedIndex];
    if (targetVideo) {
      const targetElement = document.getElementById(`video-container-${targetVideo.id}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
        setActiveVideoIndex(clampedIndex);
        return;
      }
    }
    const targetTop = clampedIndex * container.clientHeight;
    container.scrollTo({
      top: targetTop,
      behavior: smooth ? 'smooth' : 'auto'
    });
    setActiveVideoIndex(clampedIndex);
  };

  const handleScrollNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    scrollToIndex(activeVideoIndex + 1);
  };

  const handleScrollPrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (activeVideoIndex > 0) {
      scrollToIndex(activeVideoIndex - 1);
    }
  };

  // Keyboard navigation for desktop users (ArrowDown/ArrowUp/j/k)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'PageDown') {
        e.preventDefault();
        handleScrollNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'PageUp') {
        e.preventDefault();
        handleScrollPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeVideoIndex, feedVideos.length]);

  // Geolocation helpers
  const getDistance = (rest: Restaurant): number | null => {
    if (!activeUserLocation || rest.latitude === undefined || rest.longitude === undefined) return null;
    const lat1 = activeUserLocation.lat;
    const lon1 = activeUserLocation.lng;
    const lat2 = rest.latitude;
    const lon2 = rest.longitude;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Number((R * c).toFixed(1)); // Distance in km
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur. Utilisation de Paris 11e (coeur Fidfud) par défaut ! 📍");
      setLocalUserLocation({ lat: 48.8524, lng: 2.3705 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocalUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.warn("Geolocation error:", error);
        alert("Permission refusée ou problème de localisation. Nous simulons Paris 11e (Voltaire / Charonne) pour faciliter vos tests de proximité ! 📍");
        setLocalUserLocation({ lat: 48.8524, lng: 2.3705 });
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  };

  // Dynamic watchPosition to update localUserLocation dynamically as the user moves
  useEffect(() => {
    if (isProximityFirst) {
      if (!navigator.geolocation) {
        console.warn("Geolocation not supported. Proximity-First using Paris 11e default.");
        setLocalUserLocation({ lat: 48.8524, lng: 2.3705 });
        return;
      }

      console.log("[Proximity-First] Starting real-time position watch.");
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          console.log("[Proximity-First] Real-time position update:", lat, lng);
          setLocalUserLocation({ lat, lng });
        },
        (error) => {
          console.warn("[Proximity-First] Watch position error:", error);
          // If we don't have any location, fall back to default
          setLocalUserLocation(prev => prev || { lat: 48.8524, lng: 2.3705 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      if (watchIdRef.current !== null) {
        console.log("[Proximity-First] Clearing position watch.");
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        console.log("[Proximity-First] Cleaning up position watch.");
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isProximityFirst]);

  // Sync, search, categorize & sort feed by location proximity
  useEffect(() => {
    // 0. Auto-recover videos from restaurants/shops if they have a videoUrl not yet listed in videos
    let allVideos = [...(videos || [])];
    if (restaurants && restaurants.length > 0) {
      restaurants.forEach(rest => {
        if (rest.videoUrl && rest.videoUrl.trim() !== '') {
          const exists = allVideos.some(v => v.restaurantId === rest.id || v.videoUrl === rest.videoUrl);
          if (!exists) {
            allVideos.push({
              id: `recovered_video_${rest.id}`,
              title: `${rest.name} — Direct & Coulisses Culinaire`,
              description: rest.description || `Découvrez la cuisine en direct chez ${rest.name}`,
              videoUrl: rest.videoUrl,
              thumbnailUrl: rest.bannerUrl || rest.logoUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80',
              restaurantId: rest.id,
              likesCount: 142,
              sharesCount: 38,
              isOnline: true,
              isLiveContinuous: true
            });
          }
        }
      });
    }

    // Fallback: If no videos exist at all, synthesize showcase streams from restaurants so a black screen NEVER appears
    if (allVideos.length === 0 && restaurants && restaurants.length > 0) {
      restaurants.forEach(rest => {
        allVideos.push({
          id: `fallback_video_${rest.id}`,
          title: `${rest.name} — Vitrine Culinaire & Spécialités`,
          description: rest.description || `Bienvenue chez ${rest.name}`,
          videoUrl: rest.videoUrl || STABLE_CULINARY_FALLBACK_VIDEOS[0],
          thumbnailUrl: rest.bannerUrl || rest.logoUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80',
          restaurantId: rest.id,
          likesCount: 98,
          sharesCount: 15,
          isOnline: true,
          isLiveContinuous: true
        });
      });
    }

    if (allVideos.length === 0) {
      setFeedVideos([]);
      return;
    }

    // Include all online videos with valid URLs
    let result = allVideos.filter(v => v.isOnline !== false && !!v.videoUrl && v.videoUrl.trim() !== '');

    // 0. Tab filter: Restaurants vs Recettes vs Tout
    if (feedContentTab === 'restaurants') {
      result = result.filter(v => !v.isRecipe && !v.recipeId);
    } else if (feedContentTab === 'recipes') {
      result = result.filter(v => v.isRecipe || !!v.recipeId);
    }

    // Strict Deduplication: NEVER allow a restaurant or video to appear in double on the feed!
    const seenRestIds = new Set<string>();
    const seenVideoIds = new Set<string>();
    const deduplicatedResult: Video[] = [];

    for (const v of result) {
      const baseId = getBaseVideoId(v.id);
      if (seenVideoIds.has(baseId)) continue;
      seenVideoIds.add(baseId);

      // Enforce: each restaurant has AT MOST ONE entry on the feed
      if (v.restaurantId) {
        if (seenRestIds.has(v.restaurantId)) {
          continue; // Skip duplicate restaurant entry
        }
        seenRestIds.add(v.restaurantId);
      }
      deduplicatedResult.push(v);
    }
    result = deduplicatedResult;

    // 1. Filter by category first (if any)
    if (activeSelectedCategory) {
      result = result.filter(v => {
        const rest = restaurants.find(r => r.id === v.restaurantId);
        if (!rest) return false;
        const cat = rest.category || '';
        return cat.toLowerCase().includes(activeSelectedCategory.toLowerCase());
      });
    }

    // 2. Filter by Search Query (title, associated dish details, category or restaurant name)
    if (activeSearchQuery.trim()) {
      const query = activeSearchQuery.toLowerCase().trim();
      result = result.filter(v => {
        const rest = restaurants.find(r => r.id === v.restaurantId);
        const restName = (rest?.name || '').toLowerCase();
        const restCategory = (rest?.category || '').toLowerCase();
        const restDesc = (rest?.description || '').toLowerCase();
        const videoTitle = v.title.toLowerCase();
        const dishName = (v.associatedDish?.name || '').toLowerCase();
        const dishDesc = (v.associatedDish?.description || '').toLowerCase();
        
        return (
          restName.includes(query) ||
          restCategory.includes(query) ||
          restDesc.includes(query) ||
          videoTitle.includes(query) ||
          dishName.includes(query) ||
          dishDesc.includes(query)
        );
      });
    }

    // 3. Filter by radius if Proximity-First is active
    if (isProximityFirst && activeUserLocation) {
      result = result.filter(v => {
        const rest = restaurants.find(r => r.id === v.restaurantId);
        if (!rest) return false;
        const dist = getDistance(rest);
        return dist !== null && dist <= proximityRadius;
      });
    }

    // 4. Filter and prioritize by Fast Lane preparation time if Fast Lane mode is active (< 10 min or custom maxPrepTimeMinutes)
    if (isFastLane) {
      const effectiveMax = maxPrepTimeMinutes !== undefined && maxPrepTimeMinutes > 0 ? maxPrepTimeMinutes : 10;
      result = result.filter(v => {
        const prepTime = getVideoPreparationTime(v, restaurants, dishes);
        return prepTime <= effectiveMax;
      });
      // Prioritize and sort dishes with shortest prep time first (< 10 min items placed right at the top)
      result.sort((a, b) => {
        const prepA = getVideoPreparationTime(a, restaurants, dishes);
        const prepB = getVideoPreparationTime(b, restaurants, dishes);
        return prepA - prepB;
      });
    }

    // 5. Filter by Dietary Preferences if any selected
    if (selectedDietaryTags && selectedDietaryTags.length > 0) {
      result = result.filter(v => {
        const rest = restaurants.find(r => r.id === v.restaurantId);
        const dish = dishes.find(d => d.id === v.associatedDishId) || v.associatedDish;
        
        return selectedDietaryTags.every(tag => {
          const dishMatch = dish ? checkDishMatchesDietaryTag(dish, tag) : false;
          const restMatch = rest ? checkRestaurantMatchesDietaryTag(rest, tag, dishes) : false;
          return dishMatch || restMatch;
        });
      });
    }

    // Sort by chosen feedSortOrder (AI Taste Profile, ML Recommendation Engine, or alternative order)
    if (feedSortOrder === 'taste_profile') {
      const { rankedVideos, scoresMap: tasteScores } = AITasteProfileEngine.rankVideosByTasteProfile(
        result,
        orders,
        user,
        dishes,
        restaurants,
        {
          searchQuery: activeSearchQuery,
          categoryFilter: activeSelectedCategory,
          subscriptions
        }
      );
      result = rankedVideos;
      setTasteScoresMap(tasteScores);

      const { scoresMap: mlScores } = MLRecommendationEngine.rankVideos(
        result,
        orders,
        user,
        dishes,
        restaurants,
        activeSearchQuery,
        activeSelectedCategory
      );
      setMlScoresMap(mlScores);
    } else if (feedSortOrder === 'recommended' || !feedSortOrder) {
      const { rankedVideos, scoresMap } = MLRecommendationEngine.rankVideos(
        result,
        orders,
        user,
        dishes,
        restaurants,
        activeSearchQuery,
        activeSelectedCategory
      );
      result = rankedVideos;
      setMlScoresMap(scoresMap);

      // Also compute taste scores for overlay badges
      const { scoresMap: tasteScores } = AITasteProfileEngine.rankVideosByTasteProfile(
        result,
        orders,
        user,
        dishes,
        restaurants,
        {
          searchQuery: activeSearchQuery,
          categoryFilter: activeSelectedCategory,
          subscriptions
        }
      );
      setTasteScoresMap(tasteScores);
    } else {
      // Generate ML scores and Taste scores for overlay badges even when sorted by other criteria
      const { scoresMap } = MLRecommendationEngine.rankVideos(
        result,
        orders,
        user,
        dishes,
        restaurants,
        activeSearchQuery,
        activeSelectedCategory
      );
      setMlScoresMap(scoresMap);

      const { scoresMap: tasteScores } = AITasteProfileEngine.rankVideosByTasteProfile(
        result,
        orders,
        user,
        dishes,
        restaurants,
        {
          searchQuery: activeSearchQuery,
          categoryFilter: activeSelectedCategory,
          subscriptions
        }
      );
      setTasteScoresMap(tasteScores);

      if (feedSortOrder === 'distance' && activeUserLocation) {
        result.sort((a, b) => {
          const restA = restaurants.find(r => r.id === a.restaurantId);
          const restB = restaurants.find(r => r.id === b.restaurantId);
          if (!restA || !restB) return 0;
          
          const distA = getDistance(restA) ?? 999999;
          const distB = getDistance(restB) ?? 999999;
          return distA - distB;
        });
      } else if (feedSortOrder === 'likes') {
        result.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
      } else if (feedSortOrder === 'oldest') {
        result.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });
      } else {
        // 'recent': newest first
        result.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
      }
    }

    // Strictly prioritize Restaurant videos over Recipe videos
    result.sort((a, b) => {
      const aIsRecipe = a.isRecipe || !!a.recipeId ? 1 : 0;
      const bIsRecipe = b.isRecipe || !!b.recipeId ? 1 : 0;
      if (aIsRecipe !== bIsRecipe) {
        return aIsRecipe - bIsRecipe; // Restaurant (0) before Recipe (1)
      }
      return 0;
    });

    baseVideosRef.current = result;
    const currentBaseIdsKey = result.map(v => v.id).join('|');

    if (currentBaseIdsKey !== prevBaseIdsKeyRef.current) {
      const isInitialMount = !prevBaseIdsKeyRef.current;
      const currentActiveVid = feedVideos[activeVideoIndex];
      const prevActiveBaseId = currentActiveVid ? getBaseVideoId(currentActiveVid.id) : null;
      prevBaseIdsKeyRef.current = currentBaseIdsKey;

      if (result.length === 0) {
        setFeedVideos([]);
        setActiveVideoIndex(0);
      } else {
        setFeedVideos(result);

        if (prevActiveBaseId && !isInitialMount) {
          const matchIdx = result.findIndex(v => getBaseVideoId(v.id) === prevActiveBaseId);
          if (matchIdx >= 0) {
            setActiveVideoIndex(matchIdx);
          } else {
            setActiveVideoIndex(0);
            if (containerRef.current) {
              containerRef.current.scrollTop = 0;
            }
          }
        } else if (isInitialMount) {
          setActiveVideoIndex(0);
          if (containerRef.current) {
            containerRef.current.scrollTop = 0;
          }
        }
      }
    } else {
      // Base video order unchanged: update items in place without altering list length or scroll positions
      setFeedVideos(result);
    }
  }, [videos, activeSearchQuery, activeSelectedCategory, activeUserLocation, restaurants, dishes, isProximityFirst, feedSortOrder, proximityRadius, isFastLane, maxPrepTimeMinutes, selectedDietaryTags, orders, user, feedContentTab]);

  // Setup Robust Intersection Observer and Scroll-Snapping Tracker
  useEffect(() => {
    const container = containerRef.current;
    if (!container || feedVideos.length === 0) return;

    // High precision, fast-acting Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            const indexAttr = entry.target.getAttribute('data-index');
            if (indexAttr !== null) {
              const idx = parseInt(indexAttr, 10);
              if (!isNaN(idx) && idx >= 0 && idx < feedVideos.length) {
                setActiveVideoIndex(prev => (prev !== idx ? idx : prev));
              }
            }
          }
        });
      },
      {
        root: container,
        threshold: [0.55, 0.8]
      }
    );

    // Immediate requestAnimationFrame scroll position tracker for 0-lag active video synchronization
    let isTicking = false;
    const handleScroll = () => {
      if (!isTicking) {
        window.requestAnimationFrame(() => {
          const scrollTop = container.scrollTop;
          const containerHeight = container.clientHeight;
          if (containerHeight > 0) {
            const calculatedIndex = Math.round(scrollTop / containerHeight);
            if (calculatedIndex >= 0 && calculatedIndex < feedVideos.length) {
              setActiveVideoIndex(prev => (prev !== calculatedIndex ? calculatedIndex : prev));
            }
          }
          isTicking = false;
        });
        isTicking = true;
      }
    };

    feedVideos.forEach((video, index) => {
      const elementId = `video-container-${video.id}`;
      const element = document.getElementById(elementId);
      if (element) {
        element.setAttribute('data-index', index.toString());
        observer.observe(element);
      }
    });

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', handleScroll);
    };
  }, [feedVideos]);

  // Proactive Multi-Video GPU & Blob Preloader: Pre-warms buffer & downloads next video blobs (index+1, index+2)
  useEffect(() => {
    if (feedVideos.length === 0) return;
    
    // 1. Immediately request intelligent blob preload for index+1 (and index+2)
    videoPreloadService.preloadNext(activeVideoIndex, feedVideos);

    // 2. Pre-warm media buffer in DOM for preceding & upcoming videos
    [-1, 1, 2].forEach(offset => {
      const targetVid = feedVideos[activeVideoIndex + offset];
      if (targetVid && targetVid.videoUrl && !targetVid.videoUrl.includes('youtube') && !targetVid.videoUrl.includes('instagram')) {
        const vidEl = videoRefs.current[targetVid.id];
        if (vidEl && vidEl.readyState < 2) {
          vidEl.preload = "auto";
          try {
            vidEl.load();
          } catch (_) {}
        }
      }
    });
  }, [activeVideoIndex, feedVideos]);

  // Robust Play/Pause Engine: Play active video, strictly pause inactive background ones
  useEffect(() => {
    if (feedVideos.length === 0) return;
    const activeVideo = feedVideos[activeVideoIndex];
    if (!activeVideo) return;

    const activeVideoIdChanged = prevActiveVideoIdRef.current !== activeVideo.id;
    prevActiveVideoIdRef.current = activeVideo.id;

    feedVideos.forEach((video) => {
      const vidEl = videoRefs.current[video.id];
      if (vidEl) {
        if (video.id === activeVideo.id) {
          vidEl.muted = isMuted;
          vidEl.playsInline = true;
          
          if (activeVideoIdChanged && vidEl.readyState >= 1) {
            vidEl.currentTime = 0;
          }

          if (isAutoPlayEnabled) {
            const safePlay = () => {
              const playPromise = vidEl.play();
              if (playPromise !== undefined) {
                playPromise.then(() => {
                  setLoadedVideos(prev => ({ ...prev, [video.id]: true }));
                  setPausedVideos(prev => ({ ...prev, [video.id]: false }));
                }).catch(err => {
                  if (err.name === 'AbortError' || err.message?.includes('interrupted')) {
                    return;
                  }
                  // Fallback to muted playing to bypass browser sandbox
                  vidEl.muted = true;
                  setIsMuted(true);
                  vidEl.play().catch(() => {});
                });
              }
            };

            if (vidEl.readyState >= 2) {
              safePlay();
            } else {
              const handleCanPlay = () => {
                safePlay();
              };
              vidEl.addEventListener('canplay', handleCanPlay, { once: true });
              if (vidEl.readyState === 0) {
                try {
                  vidEl.load();
                } catch (_) {}
              }
            }
          } else {
            if (!vidEl.paused) {
              vidEl.pause();
            }
            setPausedVideos(prev => ({ ...prev, [video.id]: true }));
            setLoadedVideos(prev => ({ ...prev, [video.id]: true }));
          }
        } else {
          // Pause and mute background videos
          if (!vidEl.paused) {
            vidEl.pause();
          }
          vidEl.muted = true;
        }
      }
    });

    // Fast safety net: Set active video as loaded to unblock skeleton after 400ms
    const safetyTimer = setTimeout(() => {
      setLoadedVideos(prev => {
        if (!prev[activeVideo.id]) {
          return { ...prev, [activeVideo.id]: true };
        }
        return prev;
      });
    }, 400);

    return () => {
      clearTimeout(safetyTimer);
    };
  }, [activeVideoIndex, isMuted, isAutoPlayEnabled]);

  // Analytics tracking for video views and watch time
  useEffect(() => {
    if (feedVideos.length === 0) return;
    const activeVideo = feedVideos[activeVideoIndex];
    if (!activeVideo) return;

    // Track when user starts watching
    const startTime = Date.now();
    const videoId = activeVideo.id.split('-inf-')[0]; // strip the infinite scroll suffix if present

    // Increment view immediately
    fetch(`/api/videos/${videoId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchTime: 0 }) // Just register the view first
    }).catch(err => console.warn('Failed to send view analytic:', err));

    return () => {
      // Calculate watch duration on exit
      const durationWatched = (Date.now() - startTime) / 1000; // in seconds
      if (durationWatched >= 1.5) { // Only log watch time if watched for more than 1.5s
        fetch(`/api/videos/${videoId}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ watchTime: Math.min(durationWatched, 60) }) // cap watch time at 60s for outliers
        }).catch(err => console.warn('Failed to save watch time:', err));
      }
    };
  }, [activeVideoIndex, feedVideos]);

  // Sync mute state strictly: ONLY active video is unmuted when isMuted=false; ALL inactive videos stay muted
  useEffect(() => {
    const activeVideo = feedVideos[activeVideoIndex];
    Object.entries(videoRefs.current).forEach(([vId, vidEl]) => {
      if (vidEl) {
        if (activeVideo && vId === activeVideo.id) {
          vidEl.muted = isMuted;
        } else {
          vidEl.muted = true;
          if (!vidEl.paused) {
            vidEl.pause();
          }
        }
      }
    });
  }, [isMuted, feedVideos, activeVideoIndex]);

  // Fetch comments and points when current video changes
  useEffect(() => {
    if (!currentVideo) return;
    
    // Fetch comments count and list
    fetch(`/api/videos/${currentVideo.id}/comments`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setCommentsList(data);
        setCommentCounts(prev => ({ ...prev, [currentVideo.id]: data.length }));
      })
      .catch(err => console.warn('[Fidfud Comments] Delay loading comments:', err.message || err));

    // Fetch user points if logged in
    if (user?.id) {
      fetch(`/api/users/${user.id}/points`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => setUserPoints(data.points))
        .catch(err => console.warn('[Fidfud Points] Delay loading user points:', err.message || err));

      fetch(`/api/users/${user.id}/subscriptions`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => setSubscriptions(data.map((s: any) => s.restaurantId)))
        .catch(err => console.warn('[Fidfud Subscriptions] Delay loading subscriptions:', err.message || err));
    }
  }, [currentVideo, user?.id]);

  // Video watching loyalty points claim system
  const [hasClaimedVideo, setHasClaimedVideo] = useState<Record<string, boolean>>({});
  const [showClaimButton, setShowClaimButton] = useState<boolean>(false);
  
  // New Interactive states for delayed popups
  const [showOrderPopup, setShowOrderPopup] = useState<boolean>(false);
  const [showMarketingOverlays, setShowMarketingOverlays] = useState<boolean>(false);

  // Timer for order button suggestion popup (default: 5 seconds)
  useEffect(() => {
    setShowOrderPopup(false);
    if (!currentVideo) return;

    const videoRestaurant = restaurants.find(r => r.id === currentVideo.restaurantId);
    const delaySec = videoRestaurant?.orderButtonDelaySeconds !== undefined 
      ? videoRestaurant.orderButtonDelaySeconds 
      : 5;

    const timer = setTimeout(() => {
      setShowOrderPopup(true);
    }, delaySec * 1000);

    return () => clearTimeout(timer);
  }, [activeVideoIndex, currentVideo?.id, restaurants]);

  // Timer for marketing promotional/countdown/loyalty overlays (default: 30 seconds)
  useEffect(() => {
    setShowMarketingOverlays(false);
    if (!currentVideo) return;

    const videoRestaurant = restaurants.find(r => r.id === currentVideo.restaurantId);
    const delaySec = videoRestaurant?.marketingPopupDelaySeconds !== undefined 
      ? videoRestaurant.marketingPopupDelaySeconds 
      : 30;

    const timer = setTimeout(() => {
      setShowMarketingOverlays(true);
    }, delaySec * 1000);

    return () => clearTimeout(timer);
  }, [activeVideoIndex, currentVideo?.id, restaurants]);

  useEffect(() => {
    setShowClaimButton(false);
    if (!currentVideo || !user?.id) return;
    
    // If already claimed for this video in this session, skip
    if (hasClaimedVideo[currentVideo.id]) return;

    // Set a timeout to show the Claim button after 5 seconds of active watching!
    const timer = setTimeout(() => {
      setShowClaimButton(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeVideoIndex, currentVideo?.id, user?.id, hasClaimedVideo]);

  const handleClaimLoyaltyPoints = async () => {
    if (!currentVideo || !user?.id) return;
    try {
      const res = await fetch(`/api/users/${user.id}/points/earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: 15,
          reason: `Visionnage de la vidéo : ${currentVideo.title}`
        })
      });
      if (res.ok) {
        setHasClaimedVideo(prev => ({ ...prev, [currentVideo.id]: true }));
        setShowClaimButton(false);

        // Show a gorgeous loyalty points earned toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 z-[100] bg-[#FF5C00] text-white px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-wider shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce';
        toast.innerHTML = '✨ <strong>+15 Points Fidélité</strong> ajoutés à votre profil !';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    } catch (err) {
      console.error('Failed to claim loyalty points:', err);
    }
  };

  // Handle subscribe toggle
  const handleSubscribe = async (restaurantId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onOpenAuth();
      return;
    }

    const restObj = restaurants.find(r => r.id === restaurantId);
    if (restObj && (restObj.userId === user.id || (user.email && restObj.email && user.email.toLowerCase() === restObj.email.toLowerCase()))) {
      // Restaurateurs cannot follow themselves
      return;
    }

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.subscribed) {
          setSubscriptions(prev => [...prev, restaurantId]);
        } else {
          setSubscriptions(prev => prev.filter(id => id !== restaurantId));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Post a Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentVideo) return;
    if (!user) {
      onOpenAuth();
      return;
    }

    try {
      const res = await fetch(`/api/videos/${currentVideo.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: commentText,
          userId: user.id,
          userEmail: user.email
        })
      });
      if (res.ok) {
        const newComment = await res.json();
        setCommentsList(prev => [newComment, ...prev]);
        setCommentCounts(prev => ({ ...prev, [currentVideo.id]: (prev[currentVideo.id] || 0) + 1 }));
        setCommentText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Post Restaurateur Reply to a Comment
  const handlePostReply = async (commentId: string) => {
    if (!replyText.trim() || !user) return;
    try {
      const res = await fetch(`/api/comments/${commentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantUserId: user.id,
          replyText: replyText.trim()
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCommentsList(prev => prev.map(c => c.id === commentId ? { ...c, chefReply: data.comment.chefReply } : c));
        setReplyingCommentId(null);
        setReplyText('');
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur lors de l’envoi de la réponse');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Buy Points presets
  const handleBuyPoints = async (amount: number) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}/points/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        const data = await res.json();
        setUserPoints(data.points);
        
        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-wider shadow-2xl';
        toast.innerText = `Achat réussi ! +${amount} points crédités.`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send Tip
  const handleSendTip = async () => {
    if (!currentVideo) return;
    if (!user) {
      onOpenAuth();
      return;
    }

    if (userPoints < selectedGift.points) {
      // Prompt user to purchase points
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-wider shadow-2xl';
      toast.innerText = `Solde insuffisant ! Achetez des points ci-dessous.`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
      return;
    }

    try {
      const res = await fetch(`/api/videos/${currentVideo.id}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          icon: selectedGift.icon,
          points: selectedGift.points
        })
      });

      if (res.ok) {
        const data = await res.json();
        setUserPoints(data.userPoints);

        // Show confirmation toast without cluttering floating animations
        const toast = document.createElement('div');
        toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900 text-amber-400 px-5 py-3 rounded-2xl font-black uppercase text-xs tracking-wider shadow-2xl flex items-center gap-2 border border-amber-500/30';
        toast.innerHTML = `🎁 <strong>Cadeau ${selectedGift.icon} envoyé !</strong> (+${(selectedGift.points / 100).toFixed(2)}€ crédités au restaurateur)`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);

        // Increment likes count visually in feed
        setFeedVideos(prev => 
          prev.map(v => v.id === currentVideo.id ? { ...v, likesCount: v.likesCount + 1 } : v)
        );
      } else {
        const errData = await res.json();
        alert(errData.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMuted(prev => !prev);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>, videoId: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const vidEl = videoRefs.current[videoId];
    if (vidEl && !isNaN(vidEl.duration)) {
      const targetTime = percentage * vidEl.duration;
      vidEl.currentTime = targetTime;
      setActiveVideoTime(targetTime);
    }
  };

  const handleVideoClick = (videoId: string) => {
    const vidEl = videoRefs.current[videoId];
    if (vidEl) {
      if (vidEl.paused) {
        vidEl.play()
          .then(() => setPausedVideos(prev => ({ ...prev, [videoId]: false })))
          .catch(err => {
            console.warn('[Feed Click Play Error]', err);
            // Fallback to muted
            vidEl.muted = true;
            setIsMuted(true);
            vidEl.play().catch(e => console.error(e));
          });
      } else {
        vidEl.pause();
        setPausedVideos(prev => ({ ...prev, [videoId]: true }));
      }
    }
  };

  // Interactive Floating Reactions State
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionParticle[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<string, number>>>({});
  const [isReactionBarOpen, setIsReactionBarOpen] = useState<Record<string, boolean>>({});
  const [comboState, setComboState] = useState<ComboTracker | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<Record<string, number>>({});
  const [doubleTapAnimation, setDoubleTapAnimation] = useState<{ videoId: string; x: number; y: number; id: string; emoji?: string } | null>(null);

  // Trigger floating reaction with audio feedback, combo multipliers, and fluid floating trajectories
  const triggerFloatingReaction = (
    videoId: string,
    emoji: string,
    clientX?: number,
    clientY?: number,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();

    // 1. Play synthesized audio pop & trigger mobile haptic
    ReactionAudioService.playReactionPop(emoji);

    // 2. Update reaction counts in state
    setReactionCounts(prev => {
      const vCounts = prev[videoId] || {};
      const itemConfig = REACTION_EMOJIS.find(r => r.emoji === emoji);
      const currentEmojiCount = vCounts[emoji] ?? (itemConfig ? itemConfig.baseCount : 30);
      return {
        ...prev,
        [videoId]: {
          ...vCounts,
          [emoji]: currentEmojiCount + 1
        }
      };
    });

    // 3. Mark video as liked if heart or fire
    if (emoji === '❤️' || emoji === '🔥') {
      setLikedVideos(prev => ({ ...prev, [videoId]: true }));
    }

    // 4. Update or escalate combo counter
    const now = Date.now();
    setComboState(prev => {
      if (prev && prev.videoId === videoId && prev.emoji === emoji && (now - prev.lastUpdated < 1500)) {
        return {
          videoId,
          emoji,
          count: prev.count + 1,
          lastUpdated: now
        };
      }
      return {
        videoId,
        emoji,
        count: 1,
        lastUpdated: now
      };
    });

    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    comboTimeoutRef.current = setTimeout(() => {
      setComboState(null);
    }, 1800);

    // 5. Compute relative start coordinates (%)
    let startX = 84; // Default right sidebar %
    let startY = 72; // Default height %

    if (clientX !== undefined && clientY !== undefined) {
      const container = document.getElementById(`video-container-${videoId}`);
      if (container) {
        const rect = container.getBoundingClientRect();
        startX = Math.max(10, Math.min(90, ((clientX - rect.left) / rect.width) * 100));
        startY = Math.max(10, Math.min(90, ((clientY - rect.top) / rect.height) * 100));
      }
    }

    // 6. Trigger particle explosion / fireworks effect
    triggerFirework(startX, startY, emoji);

    // 7. Find glow color for emoji
    const emojiConfig = REACTION_EMOJIS.find(r => r.emoji === emoji);
    const glowColor = emojiConfig?.glow || 'rgba(255, 92, 0, 0.85)';

    // 8. Generate 5-8 floating particles rising upwards with swaying physics
    const particleCount = 6;
    const newParticles: FloatingReactionParticle[] = Array.from({ length: particleCount }).map((_, idx) => {
      const angle = (Math.random() - 0.5) * 50;
      const swayDist = 8 + Math.random() * 16;
      const duration = 1.9 + Math.random() * 0.8;
      const scale = 0.85 + Math.random() * 0.75;

      return {
        id: `react-${Date.now()}-${idx}-${Math.random()}`,
        videoId,
        emoji,
        x: startX + (Math.random() - 0.5) * 14,
        y: startY + (Math.random() - 0.5) * 8,
        scale,
        rotation: angle,
        swayDistance: swayDist,
        duration,
        glowColor,
        isBurst: idx === 0,
      };
    });

    setFloatingReactions(prev => [...prev, ...newParticles]);

    // Clean up particles after duration
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, 2800);
  };

  // Ambient simulated live stream crowd reactions
  useEffect(() => {
    const activeVideo = feedVideos[activeVideoIndex];
    if (!activeVideo || isCinemaMode) return;

    const ambientInterval = setInterval(() => {
      const randomEmojis = ['😋', '🔥', '🤤', '❤️', '👨‍🍳', '💯'];
      const randomNames = ['Sophie', 'Marc_Food', 'Camille', 'Gourmet_Paris', 'Léa', 'Lucas', 'Chef_Nico'];
      const chosenEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
      const chosenName = randomNames[Math.floor(Math.random() * randomNames.length)];
      const startX = 75 + Math.random() * 12;
      const startY = 82 + Math.random() * 8;

      const ambientParticle: FloatingReactionParticle = {
        id: `ambient-${Date.now()}-${Math.random()}`,
        videoId: activeVideo.id,
        emoji: chosenEmoji,
        x: startX,
        y: startY,
        scale: 0.85 + Math.random() * 0.4,
        rotation: (Math.random() - 0.5) * 30,
        swayDistance: 10 + Math.random() * 12,
        duration: 2.4 + Math.random() * 0.6,
        glowColor: 'rgba(255, 92, 0, 0.75)',
        senderName: `${chosenName} ${chosenEmoji}`,
      };

      setFloatingReactions(prev => [...prev, ambientParticle]);

      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(p => p.id !== ambientParticle.id));
      }, 3200);
    }, 12000);

    return () => clearInterval(ambientInterval);
  }, [activeVideoIndex, feedVideos, isCinemaMode]);

  const handleVideoSurfaceClick = (videoId: string, e: React.MouseEvent<HTMLDivElement | HTMLVideoElement>) => {
    const now = Date.now();
    const lastTap = lastTapTimeRef.current[videoId] || 0;

    if (now - lastTap < 320) {
      // Double tap!
      e.stopPropagation();
      e.preventDefault();
      triggerFloatingReaction(videoId, '❤️', e.clientX, e.clientY);

      const container = document.getElementById(`video-container-${videoId}`);
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        const animId = `dt-${Date.now()}`;
        setDoubleTapAnimation({ videoId, x, y, id: animId });
        setTimeout(() => {
          setDoubleTapAnimation(null);
        }, 900);
      }

      lastTapTimeRef.current[videoId] = 0;
    } else {
      lastTapTimeRef.current[videoId] = now;
      setTimeout(() => {
        if (lastTapTimeRef.current[videoId] === now) {
          handleVideoClick(videoId);
        }
      }, 330);
    }
  };

  const handleLike = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const baseId = getBaseVideoId(videoId);
    const isNowLiked = !likedVideos[baseId];

    // Optimistically update local liked status and feed video likes count across all loop instances
    setLikedVideos(prev => ({ ...prev, [baseId]: isNowLiked, [videoId]: isNowLiked }));
    setFeedVideos(prev =>
      prev.map(v => {
        if (getBaseVideoId(v.id) === baseId) {
          const currentCount = v.likesCount || 0;
          return {
            ...v,
            likesCount: isNowLiked ? currentCount + 1 : Math.max(0, currentCount - 1)
          };
        }
        return v;
      })
    );

    triggerFloatingReaction(videoId, '❤️', e.clientX, e.clientY, e);

    const targetVideo = feedVideos.find(v => v.id === videoId);
    if (isNowLiked) {
      notify("❤️ AJOUTÉ AUX FAVORIS", `Vous avez aimé la création de ${targetVideo?.restaurantName || 'ce chef'} !`, "success");
    } else {
      notify("🤍 RETIRÉ DES FAVORIS", "Vidéo retirée de vos favoris", "info");
    }

    // Call backend API endpoint to persist the like count update using baseId
    try {
      const res = await fetch(`/api/videos/${baseId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: isNowLiked })
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.likesCount === 'number') {
          setFeedVideos(prev =>
            prev.map(v => getBaseVideoId(v.id) === baseId ? { ...v, likesCount: data.likesCount } : v)
          );
        }
      }
    } catch (err) {
      console.error('Error syncing video like with backend:', err);
    }
  };

  const handleShare = (video: Video, e: React.MouseEvent) => {
    e.stopPropagation();
    notify("🔗 LIEN COPIÉ", `Lien de la vidéo de ${video.restaurantName} copié dans votre presse-papier !`, "info");
    if (navigator.share) {
      navigator.share({
        title: `Commande ce plat sur FIDFUD : ${video.associatedDish?.name || ''}`,
        text: video.title,
        url: window.location.href
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleVideoCanPlay = (videoId: string) => {
    setLoadedVideos(prev => ({ ...prev, [videoId]: true }));
  };

  const handleVideoError = (videoId: string, originalUrl: string, eventTarget?: HTMLVideoElement) => {
    console.warn(`[Self-Healing Video Feed] Source event warning for video ${videoId}. URL: ${originalUrl}`);
    
    // Only skip fallback if it's an in-progress local recording (blob or data urls)
    if (originalUrl && (originalUrl.startsWith('blob:') || originalUrl.startsWith('data:'))) {
      console.log(`[Self-Healing Video Feed] Preserving in-progress local recording/blob URL: ${originalUrl}`);
      return;
    }

    // Curated high-quality, fully public, CORS-enabled gourmet/food sample videos
    const fallbackPool = STABLE_CULINARY_FALLBACK_VIDEOS;

    const hash = videoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const fallbackUrl = fallbackPool[hash % fallbackPool.length];

    setVideoFallbackUrls(prev => ({ ...prev, [videoId]: fallbackUrl }));

    const vidEl = eventTarget || videoRefs.current[videoId];
    if (vidEl) {
      if (vidEl.src !== fallbackUrl) {
        vidEl.src = fallbackUrl;
        vidEl.load();
        vidEl.play().catch(() => {});
      }
    }
  };

  if (isLoading) {
    return (
      <div className={localIsFullscreen ? "fixed inset-0 z-[100] w-screen h-screen bg-[#050505] max-w-none overflow-hidden" : "relative w-full max-w-md mx-auto bg-[#050505] h-[100dvh] h-screen shadow-2xl overflow-hidden select-none"}>
        {/* Fluid Shimmer/Skeleton structure matching Video Feed layout */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 overflow-hidden">
          {/* Background Ambient Shimmer Layer */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/40 via-zinc-950/70 to-[#050505] animate-shimmer-sweep" />

          {/* Top category & filter bar placeholder */}
          <div className="relative z-20 flex justify-center space-x-2.5 pt-3">
            <div className="h-7 bg-[#FF5C00]/25 border border-[#FF5C00]/40 rounded-full w-16 animate-shimmer-brand shadow-lg shadow-[#FF5C00]/10" />
            <div className="h-7 bg-zinc-800/80 border border-white/10 rounded-full w-20 animate-shimmer-sweep" />
            <div className="h-7 bg-zinc-800/80 border border-white/10 rounded-full w-16 animate-shimmer-sweep" />
            <div className="h-7 bg-zinc-800/80 border border-white/10 rounded-full w-20 animate-shimmer-sweep hidden sm:block" />
          </div>

          {/* Center Spinner & Connection Cue */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
            <div className="relative flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#FF5C00]/50 border-t-[#FF5C00] animate-spin" />
              <div className="absolute w-10 h-10 rounded-full bg-[#FF5C00]/20 backdrop-blur-md border border-[#FF5C00]/40 flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(255,92,0,0.4)]">
                <span className="text-sm">🔥</span>
              </div>
            </div>
            <div className="space-y-1.5 bg-black/70 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl">
              <p className="text-[10px] uppercase font-mono tracking-widest text-[#FF5C00] font-black animate-pulse">
                ⚡ FIDFUD LIVE FEED
              </p>
              <p className="text-xs font-black text-zinc-300 uppercase italic tracking-tight">
                Chargement des vidéos en direct...
              </p>
            </div>
          </div>

          {/* Right sidebar actions placeholder */}
          <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center space-y-3">
            {/* Restaurant Avatar Placeholder */}
            <div className="relative mb-1">
              <div className="w-11 h-11 rounded-full bg-zinc-800 border-2 border-[#FF5C00]/50 animate-shimmer-sweep shadow-lg" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#FF5C00] border border-black animate-pulse" />
            </div>

            {/* Side Action Buttons Shimmer */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`sidebar-shimmer-${i}`} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-zinc-900/90 border border-white/10 animate-shimmer-sweep" />
                <div className="h-2 bg-zinc-800/80 rounded w-6 animate-shimmer-sweep" />
              </div>
            ))}
          </div>

          {/* Bottom metadata & pinned dish drawer placeholder */}
          <div className="absolute bottom-0 left-0 right-0 pl-4 pr-16 pb-4 pt-16 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent z-20 space-y-3">
            {/* Restaurant info row */}
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/10 animate-shimmer-sweep" />
              <div className="h-3.5 bg-zinc-800 rounded-md w-28 animate-shimmer-sweep" />
              <div className="h-4 bg-[#FF5C00]/20 border border-[#FF5C00]/30 rounded-full w-14 animate-shimmer-brand" />
              <div className="h-4 bg-emerald-500/20 border border-emerald-500/30 rounded-full w-16 animate-shimmer-sweep" />
            </div>

            {/* Video title/caption shimmer lines */}
            <div className="space-y-1.5">
              <div className="h-3.5 bg-zinc-800/90 rounded-md w-11/12 animate-shimmer-sweep" />
              <div className="h-3 bg-zinc-800/70 rounded-md w-3/4 animate-shimmer-sweep" />
            </div>

            {/* Pinned Product Card Shimmer */}
            <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 flex items-center justify-between shadow-2xl animate-shimmer-sweep">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 shrink-0 border border-white/5 animate-shimmer-sweep" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-3.5 bg-zinc-800 rounded-md w-3/4 animate-shimmer-sweep" />
                  <div className="h-2.5 bg-zinc-800/80 rounded-md w-1/2 animate-shimmer-sweep" />
                  <div className="h-3 bg-[#FF5C00]/30 rounded-md w-1/3 animate-shimmer-brand" />
                </div>
              </div>
              <div className="ml-2 w-28 h-9 bg-gradient-to-r from-[#FF5C00] to-orange-600 rounded-xl shrink-0 border border-white/10 animate-shimmer-brand flex items-center justify-center">
                <div className="h-3 bg-white/40 rounded w-16 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (feedVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] h-screen bg-[#050505] px-4 text-center">
        {isProximityFirst ? (
          <div className="space-y-4 animate-fade-in">
            <div className="w-16 h-16 bg-[#FF5C00]/10 border border-[#FF5C00]/25 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <MapPin size={28} className="text-[#FF5C00]" />
            </div>
            <p className="font-sans text-white text-lg font-black uppercase italic tracking-tight">Aucun délice à moins de 5 km ! 📍</p>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed mx-auto">
              Il n'y a pas de restaurants partenaires Fidfud dans un rayon de 5 km de votre position ({activeUserLocation ? `${activeUserLocation.lat.toFixed(4)}, ${activeUserLocation.lng.toFixed(4)}` : 'Inconnue'}).
            </p>
            <button
              onClick={() => setIsProximityFirst(false)}
              className="mt-2 bg-[#FF5C00] hover:bg-[#FF7A00] text-white text-[11px] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#FF5C00]/20 active:scale-95 cursor-pointer font-sans"
            >
              Élargir la recherche (Désactiver 5km)
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-sans text-[#8E8E93] text-lg font-black uppercase italic mb-4">Aucun délice dans le catalogue pour le moment</p>
            <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">Le chef prépare de nouveaux contenus. Connectez-vous côté Restaurateur pour publier vos premières vidéos !</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={localIsFullscreen ? "fixed inset-0 z-[100] w-screen h-[100dvh] bg-black max-w-none shadow-none overflow-hidden" : "relative w-full max-w-none lg:max-w-7xl mx-auto h-[100dvh] lg:h-[calc(100vh-140px)] shadow-2xl lg:shadow-none overflow-hidden flex lg:gap-6 select-none"}>
      
      {/* 1. Left Sidebar Panel (Desktop only - collapsible design to avoid cluttered 3-column look) */}
      {!localIsFullscreen && (
        <div 
          style={{ backgroundColor: 'rgba(15,14,19,0.45)' }}
          className={`hidden lg:flex flex-col backdrop-blur-xl rounded-3xl border border-white/5 p-4 overflow-y-auto h-full shrink-0 transition-all duration-300 scrollbar-none ${
            isLeftSidebarCollapsed ? 'w-16 items-center space-y-6' : 'w-80 space-y-4'
          }`}
        >
          {isLeftSidebarCollapsed ? (
            /* Collapsed Fine/Minimalist View */
            <div className="flex flex-col items-center space-y-6 w-full">
              {/* Toggle Expand Button */}
              <button 
                onClick={() => setIsLeftSidebarCollapsed(false)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-zinc-400 hover:text-white cursor-pointer shadow-md"
                title="Déplier le menu"
              >
                <Menu size={18} />
              </button>

              <div className="h-px w-6 bg-white/10" />

              {/* Minimalist Profile/Branding Indicator */}
              <div 
                onClick={() => setIsLeftSidebarCollapsed(false)}
                className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-white text-lg font-black shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform border border-white/10 overflow-hidden"
                title={designSettings?.appName || 'FIDFUD'}
              >
                {designSettings?.logoUrl ? (
                  <img src={designSettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  '🍳'
                )}
              </div>

              {/* Minimalist Points Indicator */}
              <button
                onClick={() => setIsLeftSidebarCollapsed(false)}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all text-amber-400 cursor-pointer"
                title="Club Fidélité"
              >
                <Coins size={16} />
                <span className="text-[9px] font-black mt-1 font-mono">{userPoints}</span>
              </button>

              {/* Quick Partner Resto Indicator */}
              <button
                onClick={() => setIsLeftSidebarCollapsed(false)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer"
                title="Restaurants Partenaires"
              >
                <BookOpen size={16} />
              </button>
            </div>
          ) : (
            /* Expanded Elegant View */
            <div className="flex flex-col h-full space-y-4 w-full">
              {/* Top Row with Close/Collapse Button */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/20 font-black px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                  {designSettings?.appName || 'FIDFUD'} Live
                </span>
                <button 
                  onClick={() => setIsLeftSidebarCollapsed(true)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Masquer le menu"
                >
                  <ChevronLeft size={15} />
                </button>
              </div>

              {/* Branding Card */}
              <div className="p-4 rounded-2xl bg-zinc-950/40 border border-white/5 relative overflow-hidden flex items-center gap-3">
                {designSettings?.logoUrl && (
                  <img src={designSettings.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-lg shrink-0" />
                )}
                <div>
                  <h3 className="text-white text-base font-black uppercase tracking-tight leading-tight">
                    {designSettings?.appName || 'FIDFUD'}
                  </h3>
                  <p className="text-zinc-400 text-[10px] mt-1 leading-normal font-sans">
                    {designSettings?.heroTitle || 'Vidéos Gourmandes, Livraison Instantanée.'}
                  </p>
                </div>
              </div>

              {/* Loyalty Club Panel */}
              <div className="bg-zinc-950/20 p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Coins size={13} className="text-yellow-400" />
                    <span>Fid&apos;Club</span>
                  </h4>
                  <span className="text-[10px] bg-yellow-400/10 text-yellow-400 font-extrabold px-2 py-0.5 rounded-full border border-yellow-400/20 font-mono">
                    {userPoints} Pts
                  </span>
                </div>
                <p className="text-zinc-400 text-[10px] leading-relaxed font-sans">
                  Gagnez des points en commandant et offrez des cadeaux aux chefs en direct.
                </p>
                <button 
                  onClick={() => setIsTipsOpen(true)}
                  className="w-full bg-zinc-900/60 hover:bg-zinc-800 text-white text-[10px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all border border-white/5 active:scale-95 cursor-pointer"
                >
                  Acheter des points 💳
                </button>
              </div>

              {/* Partner Restaurants Info list */}
              <div className="bg-zinc-950/20 p-4 rounded-2xl border border-white/5 flex-1 overflow-y-auto space-y-3 min-h-[200px] scrollbar-none">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  🍳 PARTENAIRES
                </h4>
                <div className="space-y-2">
                  {restaurants.map(rest => {
                    const isSubscribed = subscriptions.includes(rest.id);
                    const dist = activeUserLocation ? getDistance(rest) : null;
                    return (
                      <div key={rest.id} className="flex items-center justify-between p-2 rounded-xl bg-white/2 hover:bg-white/5 transition-all border border-white/5">
                        <div className="flex items-center space-x-2 min-w-0">
                          <LazyImage 
                            src={rest.logoUrl} 
                            alt={rest.name} 
                            sizeType="avatar"
                            containerClassName="w-7 h-7 rounded-full border border-white/10 shrink-0 overflow-hidden"
                            className="w-full h-full object-cover"
                            placeholderEmoji="🏪"
                          />
                          <div className="min-w-0">
                            <h5 className="text-white text-[11px] font-black uppercase tracking-tight truncate leading-tight flex items-center gap-1">
                              <span>{rest.name}</span>
                              {rest.isCertified && <span className="text-[7px] text-blue-400">✓</span>}
                            </h5>
                            <p className="text-zinc-500 text-[9px] truncate">
                              {rest.category} {dist !== null && `• 📍 ${dist.toFixed(1)} km`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleSubscribe(rest.id, e)}
                          className={`text-[8px] font-extrabold px-2 py-1 rounded-full border transition-all shrink-0 cursor-pointer ${
                            isSubscribed 
                              ? 'bg-green-600/10 text-green-400 border-green-600/20' 
                              : 'bg-[#FF5A1F]/10 text-[#FF5A1F] border-[#FF5A1F]/20 hover:bg-[#FF5A1F]/20'
                          }`}
                        >
                          {isSubscribed ? 'SUIVI' : 'SUIVRE'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Center Column Panel (Vertical TikTok feed player - perfectly centered on desktop) */}
      <div className={localIsFullscreen ? "w-full h-full relative" : "flex-1 h-[100dvh] lg:h-full relative flex items-center justify-center bg-black lg:bg-[#0B0B0C]"}>
        
        <div className={localIsFullscreen ? "w-full h-full relative" : "w-full h-[100dvh] max-w-none lg:max-w-[410px] lg:h-[97%] lg:aspect-[9/16] relative bg-black rounded-none lg:rounded-[32px] overflow-hidden lg:border lg:border-white/10 lg:shadow-2xl flex flex-col animate-fade-in"}>
          
      {/* Bento Elevator Shaft Navigation Overlay (only active when scrollMode is 'elevator') */}
      {scrollMode === 'elevator' && (
        <div className="absolute left-3.5 top-24 bottom-24 w-10 z-40 flex flex-col items-center justify-center gap-1 bg-zinc-950/85 backdrop-blur-md rounded-2xl border border-white/10 p-1.5 shadow-2xl animate-fade-in">
          <span className="text-[7px] font-black text-[#FF5C00] uppercase tracking-widest font-mono text-center rotate-180 writing-mode-vertical my-1">ELEV</span>
          <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col gap-1.5 w-full items-center py-1">
            {feedVideos.map((vid, idx) => {
              const isActive = idx === activeVideoIndex;
              return (
                <button
                  key={`elevator-btn-${vid.id}`}
                  onClick={() => {
                    const targetEl = document.getElementById(`video-container-${vid.id}`);
                    if (targetEl) {
                      targetEl.scrollIntoView({ behavior: 'smooth' });
                      setActiveVideoIndex(idx);
                    }
                  }}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black transition-all ${
                    isActive 
                      ? 'bg-[#FF5C00] text-zinc-950 scale-110 shadow-md shadow-[#FF5C00]/30' 
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                  title={vid.title}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Vertical Next / Previous Navigation Controls */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 hidden sm:flex flex-col items-center gap-2 pointer-events-none">
        {activeVideoIndex > 0 && (
          <button
            onClick={handleScrollPrev}
            className="w-8 h-8 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white/80 hover:text-white hover:bg-black/90 hover:scale-110 active:scale-95 transition-all shadow-lg flex items-center justify-center cursor-pointer pointer-events-auto"
            title="Vidéo précédente (Flèche Haut)"
          >
            <ChevronUp size={18} />
          </button>
        )}
        <button
          onClick={handleScrollNext}
          className="w-8 h-8 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white/80 hover:text-white hover:bg-black/90 hover:scale-110 active:scale-95 transition-all shadow-lg flex items-center justify-center cursor-pointer pointer-events-auto"
          title="Vidéo suivante (Flèche Bas)"
        >
          <ChevronDown size={18} />
        </button>
      </div>

      {/* 🚀 Centered Top Tab Switcher (Restaurants vs Recettes vs Tout) - Perfectly Centered */}
      <div className={`absolute top-3.5 left-1/2 -translate-x-1/2 z-40 flex items-center bg-black/85 backdrop-blur-xl border border-white/25 rounded-full p-0.5 sm:p-1 shadow-[0_4px_25px_rgba(0,0,0,0.8)] transition-all duration-300 pointer-events-auto ${isCinemaMode || localIsFullscreen ? 'opacity-0 pointer-events-none -translate-y-3' : 'opacity-100 translate-y-0'}`}>
        <button
          id="btn-feed-tab-restaurants"
          onClick={() => {
            setFeedContentTab('restaurants');
            setActiveVideoIndex(0);
            if (containerRef.current) containerRef.current.scrollTop = 0;
          }}
          className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
            feedContentTab === 'restaurants'
              ? 'bg-gradient-to-r from-[#FF5C00] to-orange-500 text-white shadow-md shadow-[#FF5C00]/40 font-black'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <span>🍽️</span>
          <span>Restaurants</span>
        </button>

        <button
          id="btn-feed-tab-recipes"
          onClick={() => {
            setFeedContentTab('recipes');
            setActiveVideoIndex(0);
            if (containerRef.current) containerRef.current.scrollTop = 0;
          }}
          className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
            feedContentTab === 'recipes'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/40 font-black'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <span>👨‍🍳</span>
          <span>Recettes</span>
        </button>

        <button
          id="btn-feed-tab-all"
          onClick={() => {
            setFeedContentTab('all');
            setActiveVideoIndex(0);
            if (containerRef.current) containerRef.current.scrollTop = 0;
          }}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
            feedContentTab === 'all'
              ? 'bg-white/20 text-white border border-white/30'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <span>✨</span>
          <span>Tout</span>
        </button>
      </div>

      {/* Main Snap-Scrolling Container */}
      <div 
        ref={containerRef}
        className="w-full h-[100dvh] lg:h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none overscroll-y-contain transform-gpu"
        style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {feedVideos.map((video, index) => {
          const baseId = getBaseVideoId(video.id);
          const isLiked = !!likedVideos[baseId] || !!likedVideos[video.id];
          const hasDish = !!video.associatedDish;
          const hasFallback = !!videoFallbackUrls[video.id];
          const activeUrl = hasFallback ? videoFallbackUrls[video.id] : video.videoUrl;
          const parsedMedia = parseVideoSource(activeUrl, { isPlaying: index === activeVideoIndex, isMuted, loop: true });
          const isEmbed = parsedMedia.isEmbed && !!parsedMedia.embedUrl;
          const isLoaded = !!loadedVideos[video.id] || isEmbed;
          const isNearActive = Math.abs(index - activeVideoIndex) <= 3;

          const restaurantObj = restaurants.find(r => r.id === video.restaurantId);
          const posterUrl = video.thumbnailUrl || video.associatedDish?.imageUrl || restaurantObj?.bannerUrl || restaurantObj?.logoUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200';

          const commentsCount = commentCounts[baseId] || commentCounts[video.id] || 0;
          const isSubby = subscriptions.includes(video.restaurantId);

          return (
            <div 
              key={video.id}
              id={`video-container-${video.id}`}
              className="w-full h-[100dvh] min-h-[100dvh] lg:h-full lg:min-h-0 snap-start snap-always relative flex items-center justify-center bg-black overflow-hidden group/card shrink-0"
              style={localIsFullscreen ? { minHeight: '100vh', height: '100vh' } : { minHeight: '100dvh', height: '100dvh' }}
            >
              {/* 1. Seamless Poster / Thumbnail Background Underlay - Completely eliminates black screens during scroll & decode */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-500 pointer-events-none"
                style={{ 
                  backgroundImage: `url(${posterUrl})`,
                  backgroundColor: '#09090b',
                  zIndex: 0
                }}
              />

              {/* 2. HTML5 Video or Embed Element (TikTok / Reels style fluid playback) */}
              {isNearActive && (
                isEmbed ? (
                  index === activeVideoIndex && parsedMedia.embedUrl ? (
                    <div className="relative z-10 w-full h-full flex items-center justify-center bg-black p-0">
                      <iframe
                        src={parsedMedia.embedUrl}
                        title={video.title || "Lecteur vidéo direct"}
                        className="w-full h-full border-0 shadow-none pointer-events-auto"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        style={{ height: '100%' }}
                      />
                      {(parsedMedia.type === 'instagram' || parsedMedia.type === 'tiktok' || parsedMedia.type.startsWith('youtube')) && (
                        <a
                          href={activeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-4 right-4 z-40 px-3 py-1.5 bg-black/80 hover:bg-black text-white text-[11px] font-bold rounded-full backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-xl transition-all hover:scale-105"
                          title="Ouvrir le flux directement"
                        >
                          <span>{parsedMedia.type === 'instagram' ? '📸 Instagram' : parsedMedia.type === 'tiktok' ? '🎵 TikTok' : '▶️ YouTube Direct'}</span>
                          <span className="text-[10px]">↗</span>
                        </a>
                      )}
                    </div>
                  ) : null
                ) : (
                  <div className="relative z-10 w-full h-full">
                    <video
                      ref={el => { videoRefs.current[video.id] = el; }}
                      src={(preloadedBlobUrls[video.videoUrl] || videoFallbackUrls[video.id] || getSafeVideoUrl(video.videoUrl))?.trim() || STABLE_CULINARY_FALLBACK_VIDEOS[0] || undefined}
                      poster={posterUrl || undefined}
                      autoPlay={index === activeVideoIndex}
                      loop={true}
                      playsInline
                      muted={index === activeVideoIndex ? isMuted : true}
                      preload="metadata"
                      onCanPlay={() => handleVideoCanPlay(video.id)}
                      onCanPlayThrough={() => handleVideoCanPlay(video.id)}
                      onLoadedData={() => handleVideoCanPlay(video.id)}
                      onPlay={() => {
                        handleVideoCanPlay(video.id);
                        setPausedVideos(prev => ({ ...prev, [video.id]: false }));
                        // Preload the next video blob in cache as soon as the current video starts
                        videoPreloadService.preloadNext(index, feedVideos);
                      }}
                      onPlaying={() => {
                        handleVideoCanPlay(video.id);
                        setPausedVideos(prev => ({ ...prev, [video.id]: false }));
                        videoPreloadService.preloadNext(index, feedVideos);
                      }}
                      onPause={() => {
                        setPausedVideos(prev => ({ ...prev, [video.id]: true }));
                      }}
                      onError={(e) => handleVideoError(video.id, video.videoUrl, e.currentTarget)}
                      onClick={(e) => handleVideoSurfaceClick(video.id, e)}
                      onEnded={(e) => {
                        try {
                          e.currentTarget.currentTime = 0;
                          if (index === activeVideoIndex) {
                            e.currentTarget.play().catch(() => {});
                          }
                        } catch (_) {}
                      }}
                      onTimeUpdate={(e) => {
                        const vid = e.currentTarget;
                        if (index === activeVideoIndex) {
                          if (vid.duration > 0 && vid.currentTime >= vid.duration - 0.08) {
                            if (vid.currentTime !== 0 && !vid.seeking) {
                              vid.currentTime = 0;
                            }
                          }
                          setActiveVideoTime(vid.currentTime);
                          setActiveVideoDuration(vid.duration || 1);
                        }
                      }}
                      onLoadedMetadata={(e) => {
                        if (index === activeVideoIndex) {
                          setActiveVideoDuration(e.currentTarget.duration || 1);
                        }
                      }}
                      className="w-full h-full object-cover cursor-pointer select-none"
                    />
                  </div>
                )
              )}

              {/* Floating Reaction Particles & Combo Burst Overlay */}
                    <FloatingReactionOverlay
                      videoId={video.id}
                      particles={floatingReactions}
                      combo={comboState}
                      doubleTapAnimation={doubleTapAnimation}
                    />

                    {/* Fitfood Outro End Card Animation - Disabled to allow clean infinite loop without interruptions */}
                    {false && index === activeVideoIndex && !isEmbed && activeVideoDuration > 1 && (activeVideoDuration - activeVideoTime <= 3) && (
                      <motion.div
                        id="fitfood-outro-overlay"
                        className="absolute inset-0 z-40 bg-[#050506]/95 flex flex-col items-center justify-center text-center p-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        {/* Subtle Glowing Background elements */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl" />
                          <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-[#FF5C00]/10 blur-3xl" />
                        </div>

                        {/* Animated Outro Core */}
                        <motion.div
                          className="relative w-20 h-20 mb-4 flex items-center justify-center bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl"
                          initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
                          animate={{ scale: 1.1, rotate: 0, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 100, damping: 10, delay: 0.1 }}
                        >
                          <motion.div 
                            className="absolute -inset-1 border border-emerald-500/20 rounded-2xl"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                          />
                          <motion.div 
                            className="absolute -inset-2 border-2 border-dashed border-[#FF5C00]/20 rounded-2xl"
                            animate={{ rotate: -360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          />

                          {/* Dumbbell & salad fork micro SVG icon */}
                          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" stroke="#FF5C00" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8v8M3 9v6" stroke="#10B981" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 8v8M21 9v6" stroke="#10B981" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4c2.5 0 4 2 4 4s-1.5 4-4 4-4-2-4-4 1.5-4 4-4z" stroke="#FF5C00" fill="#FF5C00" fillOpacity="0.1" />
                          </svg>
                        </motion.div>

                        {/* Title and message */}
                        <motion.h4
                          className="text-lg font-black tracking-tight text-white uppercase italic"
                          initial={{ y: 15, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          Fit<span className="text-[#FF5C00]">food</span> Studio
                        </motion.h4>

                        <motion.p
                          className="text-[9.5px] text-zinc-500 font-mono tracking-widest uppercase mt-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                        >
                          RÉALISÉ & CRÉÉ SUR FITFOOD
                        </motion.p>

                        {/* Divider */}
                        <motion.div
                          className="w-10 h-[2px] bg-gradient-to-r from-emerald-500 to-[#FF5C00] rounded-full my-3"
                          initial={{ width: 0 }}
                          animate={{ width: 40 }}
                          transition={{ duration: 0.6, delay: 0.5 }}
                        />

                        {/* Action buttons */}
                        <motion.div
                          className="flex flex-col gap-2 w-full max-w-[200px]"
                          initial={{ y: 10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.6 }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const vidEl = videoRefs.current[video.id];
                              if (vidEl) {
                                vidEl.currentTime = 0;
                                vidEl.play();
                              }
                            }}
                            className="w-full bg-[#1F1F24] hover:bg-zinc-800 border border-white/5 text-white py-1.5 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer pointer-events-auto"
                          >
                            <span>🔁 Revoir</span>
                          </button>

                          {video.associatedDish && onSelectDish && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDish(video.associatedDishId || '');
                              }}
                              className="w-full bg-gradient-to-r from-emerald-600 to-[#FF5C00] hover:opacity-90 text-zinc-950 py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer pointer-events-auto text-white shadow-lg shadow-[#FF5C00]/20 btn-order-glow"
                            >
                              <span>🥗 Commander le plat</span>
                            </button>
                          )}
                        </motion.div>

                        {/* Subtle countdown/skip */}
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Jump to the next video index automatically
                            const nextIdx = activeVideoIndex + 1;
                            if (nextIdx < feedVideos.length) {
                              const nextVid = feedVideos[nextIdx];
                              const targetEl = document.getElementById(`video-container-${nextVid.id}`);
                              if (targetEl) {
                                targetEl.scrollIntoView({ behavior: 'smooth' });
                                setActiveVideoIndex(nextIdx);
                              }
                            }
                          }}
                          className="mt-4 text-[9px] text-zinc-500 hover:text-zinc-400 font-bold uppercase tracking-wider pointer-events-auto cursor-pointer flex items-center gap-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.7 }}
                          transition={{ delay: 0.8 }}
                        >
                          <span>Suivant ➔</span>
                        </motion.button>
                      </motion.div>
                    )}

                    {/* Premium Large Centered Play Button Overlay for Mobile / Autoplay Bypass */}
                    {pausedVideos[video.id] !== false && (
                      <div 
                        onClick={() => handleVideoClick(video.id)}
                        className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 cursor-pointer transition-all duration-300"
                      >
                        <div className="bg-black/60 hover:bg-black/70 text-white p-5 rounded-full backdrop-blur-md border border-white/10 transform hover:scale-110 active:scale-95 transition-all shadow-2xl">
                          <Play size={28} className="fill-current text-white translate-x-0.5" />
                        </div>
                      </div>
                    )}

              {(() => {
                const videoRestaurant = restaurants.find(r => r.id === video.restaurantId);
                const isActive = index === activeVideoIndex;
                if (!isActive) return null;
                if (!showMarketingOverlays) return null;

                const availableOverlays: Array<{ type: 'promo' | 'countdown' | 'claim' | 'taste_profile' | 'fast_lane'; element: React.ReactNode }> = [];

                const prepTime = getVideoPreparationTime(video, restaurants, dishes);
                const isReadyToGrab = prepTime <= 10;
                if (isReadyToGrab || isFastLane) {
                  availableOverlays.push({
                    type: 'fast_lane',
                    element: (
                      <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-black text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-xl shadow-amber-500/30 border border-amber-300 flex items-center gap-1.5 backdrop-blur-md animate-pulse">
                        <Zap size={13} className="fill-black text-black shrink-0" />
                        <span>Ready to grab</span>
                        <span className="bg-black/20 text-black px-1.5 py-0.2 rounded font-mono font-black text-[9px]">
                          {prepTime} min
                        </span>
                      </div>
                    )
                  });
                }

                if (video.promoOverlay) {
                  availableOverlays.push({
                    type: 'promo',
                    element: (
                      <div className="bg-gradient-to-r from-amber-500/95 to-[#FF5E1A]/95 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-lg border border-white/20 flex items-center gap-1.5 backdrop-blur-md animate-pulse">
                        <span>🔥 OFFRE :</span>
                        <span>{video.promoOverlay}</span>
                      </div>
                    )
                  });
                }

                if (videoRestaurant?.promoMessage && videoRestaurant?.showPromoPopup !== false) {
                  availableOverlays.push({
                    type: 'promo',
                    element: (
                      <div className="bg-gradient-to-r from-red-500/90 to-[#FF5C00]/90 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-lg border border-white/10 flex items-center gap-1.5 backdrop-blur-md">
                        <span>⚡</span>
                        <span>PROMO : {videoRestaurant.promoMessage}</span>
                      </div>
                    )
                  });
                }

                if (videoRestaurant?.countdownText && videoRestaurant?.showCountdownPopup !== false) {
                  availableOverlays.push({
                    type: 'countdown',
                    element: (
                      <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                        </span>
                        <span>{videoRestaurant.countdownText} : <strong className="text-yellow-400 font-mono">{videoRestaurant.countdownMinutes || 5} min</strong></span>
                      </div>
                    )
                  });
                }

                const canClaim = showClaimButton && user && !hasClaimedVideo[video.id] && videoRestaurant?.showLoyaltyPopup !== false;
                if (canClaim) {
                  availableOverlays.push({
                    type: 'claim',
                    element: (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaimLoyaltyPoints();
                        }}
                        className="flex items-center space-x-1.5 bg-gradient-to-r from-[#FF5C00] to-yellow-500 hover:from-[#FF7A00] hover:to-yellow-400 text-white font-black text-[10px] uppercase px-4 py-1.5 rounded-full shadow-[0_4px_12px_rgba(255,92,0,0.4)] border border-white/20 animate-pulse transition-all hover:scale-105 active:scale-95 cursor-pointer font-sans"
                      >
                        <Sparkles size={11} className="text-yellow-200 fill-yellow-200 animate-spin" />
                        <span>Réclamer +15 Pts Fidélité ! 🎁</span>
                      </button>
                    )
                  });
                }

                const tasteScore = tasteScoresMap[video.id];
                if (tasteScore && (tasteScore.score >= 60 || feedSortOrder === 'taste_profile')) {
                  availableOverlays.push({
                    type: 'taste_profile',
                    element: (
                      <button
                        id={`btn-taste-badge-${video.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsTasteProfileModalOpen(true);
                        }}
                        className="bg-gradient-to-r from-[#FF5C00]/95 via-purple-900/95 to-black/95 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-xl border border-[#FF5C00]/50 hover:border-[#FF5C00] flex items-center gap-2 backdrop-blur-md animate-fade-in cursor-pointer hover:scale-105 active:scale-95 transition-all text-left"
                        title="Cliquez pour personnaliser votre profil de goûts IA"
                      >
                        <Sparkles size={12} className="text-amber-300 fill-amber-300 animate-pulse shrink-0" />
                        <span className="text-white font-black">{tasteScore.badgeLabel}</span>
                        {tasteScore.tasteBadges.length > 0 && (
                          <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-black tracking-normal shrink-0">
                            {tasteScore.tasteBadges[0]}
                          </span>
                        )}
                        <span className="hidden sm:inline text-[9px] text-zinc-300 font-normal normal-case border-l border-white/20 pl-2 max-w-[180px] truncate">
                          {tasteScore.matchReason}
                        </span>
                      </button>
                    )
                  });
                }

                const mlScore = mlScoresMap[video.id];
                if (mlScore && !tasteScore) {
                  availableOverlays.push({
                    type: 'promo',
                    element: (
                      <div className="bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-black/90 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-xl border border-purple-400/40 flex items-center gap-2 backdrop-blur-md animate-fade-in group/ml cursor-pointer" title={mlScore.matchReason}>
                        <Sparkles size={12} className="text-purple-300 fill-purple-300 animate-pulse" />
                        <span className="text-purple-200">{mlScore.badgeLabel}</span>
                        <span className="hidden sm:inline text-[9px] text-zinc-300 font-normal normal-case border-l border-purple-500/40 pl-2 max-w-[180px] truncate">
                          {mlScore.matchReason}
                        </span>
                      </div>
                    )
                  });
                }

                if (availableOverlays.length === 0) return null;

                const activeOverlay = availableOverlays[overlayCycleIndex % availableOverlays.length];
                return (
                  <div className={`absolute top-13 sm:top-14 left-3 sm:left-4 z-20 max-w-[calc(100%-120px)] transition-all duration-500 animate-fade-in ${isCinemaMode ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
                    {activeOverlay.element}
                  </div>
                );
              })()}

              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes gentle-float {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-4px); }
                }
                @keyframes pulse-ring {
                  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 92, 0, 0.5); }
                  70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(255, 92, 0, 0); }
                  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 92, 0, 0); }
                }
                @keyframes bounce-short {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-6px); }
                }
                @keyframes pulse-btn-glow {
                  0%, 100% {
                    box-shadow: 0 0 6px rgba(255, 92, 0, 0.5), 0 0 12px rgba(255, 92, 0, 0.25);
                    filter: brightness(1);
                  }
                  50% {
                    box-shadow: 0 0 20px rgba(255, 92, 0, 0.95), 0 0 35px rgba(255, 92, 0, 0.6);
                    filter: brightness(1.2);
                  }
                }
                .group\\/card:hover .btn-order-glow {
                  animation: pulse-btn-glow 1.4s ease-in-out infinite;
                  border-color: rgba(255, 255, 255, 0.65) !important;
                  transform: scale(1.05);
                }
                .animate-gentle-float-1 {
                  animation: gentle-float 3s ease-in-out infinite;
                }
                .animate-gentle-float-2 {
                  animation: gentle-float 3.3s ease-in-out infinite;
                  animation-delay: 0.2s;
                }
                .animate-gentle-float-3 {
                  animation: gentle-float 2.8s ease-in-out infinite;
                  animation-delay: 0.4s;
                }
                .animate-pulse-orange-ring {
                  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                .animate-bounce-short {
                  animation: bounce-short 1.5s ease-in-out infinite;
                }
                @keyframes particle-explode {
                  0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 1;
                  }
                  100% {
                    transform: translate(var(--tx), var(--ty)) scale(0.4);
                    opacity: 0;
                  }
                }
                .animate-firework-particle {
                  animation: particle-explode 1.1s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
                }
              `}} />

              {/* Sidebar Action Overlays (Right Side) - Compact & flexible to fit all buttons on screen above bottom menu */}
              <div 
                className={`absolute right-2 z-20 flex flex-col items-center justify-evenly gap-1 transition-all duration-300 ${isCinemaMode ? 'opacity-0 pointer-events-none scale-90 translate-x-2' : 'opacity-100 scale-100 translate-x-0'} ${
                  localIsFullscreen 
                    ? 'top-[3%] bottom-[2%] py-1' 
                    : 'top-4 sm:top-8 bottom-16 sm:bottom-20 py-1'
                }`}
                style={{ height: localIsFullscreen ? '94%' : 'calc(100% - 60px)', maxHeight: 'calc(100% - 40px)' }}
              >
                
                {/* 1. Combined Restaurant Avatar & Subscribe Hub - AT THE TOP */}
                {(() => {
                  const sidebarRest = restaurants.find(r => r.id === video.restaurantId);
                  const isOwnRest = Boolean(
                    user && sidebarRest && (
                      sidebarRest.userId === user.id ||
                      (user.email && sidebarRest.email && user.email.toLowerCase() === sidebarRest.email.toLowerCase())
                    )
                  );
                  if (sidebarRest) {
                    return (
                      <div className="flex flex-col items-center relative group">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            // Access the restaurant directly
                            const firstDish = dishes.find(d => d.restaurantId === video.restaurantId);
                            const dishIdToUse = video.associatedDishId || firstDish?.id;
                            if (dishIdToUse) {
                              onSelectDish(dishIdToUse, 'menu');
                            } else {
                              alert("Le menu de ce restaurant n'est pas encore disponible.");
                            }
                            
                            if (!isSubby && !isOwnRest) {
                              handleSubscribe(video.restaurantId, e);
                            }
                          }}
                          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full p-0.5 cursor-pointer hover:scale-110 active:scale-95 transition-all flex items-center justify-center bg-black/60 shadow-xl ${
                            isOwnRest ? 'border-2 border-amber-400' : (isSubby ? 'border border-zinc-500/60' : 'border-2 border-[#FF5C00] animate-pulse-orange-ring')
                          }`}
                          title={isOwnRest ? "Mon Restaurant" : "Accéder au menu & S'abonner"}
                        >
                          <LazyImage 
                            src={sidebarRest.logoUrl} 
                            alt={sidebarRest.name} 
                            sizeType="avatar"
                            containerClassName="w-full h-full rounded-full overflow-hidden"
                            className="w-full h-full object-cover"
                            placeholderEmoji="👨‍🍳"
                          />

                          {/* Floating Plus / Checkmark Badge */}
                          {!isOwnRest && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubscribe(video.restaurantId, e);
                              }}
                              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center text-white border border-[#0d0d0e] transition-colors shadow-md cursor-pointer ${
                                isSubby ? 'bg-green-600 hover:bg-green-700' : 'bg-[#FF5C00] hover:bg-[#FF7A00]'
                              }`}
                            >
                              {isSubby ? <Check size={7} className="stroke-[3]" /> : <Plus size={7} className="stroke-[3]" />}
                            </div>
                          )}
                        </div>
                        
                        <span className="text-[6.5px] sm:text-[7px] text-zinc-300 font-extrabold mt-0.5 sm:mt-1 font-sans tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase text-center max-w-[42px] sm:max-w-[50px] truncate leading-none">
                          {isOwnRest ? 'Mon Resto' : (isSubby ? 'Abonné' : 'Rejoindre')}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 1.5. Dedicated Discreetly Animated Menu / Carte Button */}
                <div className="flex flex-col items-center">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const firstDish = dishes.find(d => d.restaurantId === video.restaurantId);
                      const dishIdToUse = video.associatedDishId || firstDish?.id;
                      if (dishIdToUse) {
                        onSelectDish(dishIdToUse, 'menu');
                        notify("📖 LA CARTE DU CHEF", `Ouverture de la carte de ${video.restaurantName || 'ce restaurant'}`, "info");
                      } else {
                        notify("⚠️ INDISPONIBLE", "Le menu de ce restaurant n'est pas disponible", "warn");
                      }
                    }}
                    style={{ outline: 'none' }}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-amber-500/90 via-[#FF5C00]/90 to-red-600/90 backdrop-blur-md border border-amber-300/50 flex items-center justify-center text-white hover:scale-115 active:scale-90 transition-all shadow-xl cursor-pointer shrink-0 animate-menu-pulse"
                    title="Voir la carte complète du restaurant"
                  >
                    <BookOpen size={17} className="text-white animate-menu-icon-float filter drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
                  </button>
                  <span className="text-[6.5px] sm:text-[7.5px] text-amber-300 font-black mt-0.5 font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                    Menu 📖
                  </span>
                </div>

                {/* 2. Audio Button */}
                <div className="flex flex-col items-center">
                  <button 
                    onClick={toggleMute}
                    style={{ outline: 'none' }}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-lg hover:bg-black/70 cursor-pointer shrink-0"
                    title={isMuted ? "Activer le son" : "Désactiver le son"}
                  >
                    {isMuted ? <VolumeX size={17} className="text-zinc-400" /> : <Volume2 size={17} className="text-[#FF5C00]" />}
                  </button>
                  <span className="text-[6.5px] sm:text-[7.5px] text-zinc-300 font-extrabold mt-0.5 font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase tracking-wider shrink-0">
                    {isMuted ? 'Mute' : 'Son'}
                  </span>
                </div>

                {/* 3. Like Button */}
                <div className="flex flex-col items-center animate-gentle-float-1 relative">
                  <button 
                    onClick={(e) => handleLike(video.id, e)}
                    style={{ outline: 'none' }}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:scale-115 hover:shadow-[0_0_12px_rgba(255,48,64,0.4)] active:scale-90 transition-all shadow-lg hover:bg-black/70 cursor-pointer shrink-0"
                  >
                    <Heart size={17} className={isLiked ? 'text-[#FF3040] fill-[#FF3040] filter drop-shadow-[0_0_4px_rgba(255,48,64,0.6)]' : 'text-white'} />
                  </button>
                  <span className="text-[6.5px] sm:text-[7.5px] text-zinc-300 font-extrabold mt-0.5 font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase tracking-wider shrink-0">
                    {video.likesCount || 0}
                  </span>

                  {/* 🚀 Interactive Engagement Booster Prompt (Fires alternately) - Styled as a discreet tooltip next to the heart button */}
                  {(index === activeVideoIndex) && activeBooster && activeBooster.visible && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeBooster.type === 'like') {
                          handleLike(video.id, e as any);
                        } else if (activeBooster.type === 'comment') {
                          setIsCommentsOpen(true);
                        } else if (activeBooster.type === 'gift') {
                          setIsTipsOpen(true);
                        }
                      }}
                      className="absolute right-[44px] sm:right-[52px] top-1/2 -translate-y-1/2 z-50 bg-black/85 hover:bg-black/95 backdrop-blur-md border border-[#FF5C00]/45 rounded-xl p-2 shadow-2xl animate-fade-in cursor-pointer pointer-events-auto transition-all w-[140px] sm:w-[150px] pr-5 select-none"
                    >
                      {/* Close button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveBooster(null);
                        }}
                        className="absolute top-1 right-1 text-zinc-400 hover:text-white transition-colors cursor-pointer p-0.5"
                      >
                        <X size={9} />
                      </button>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00] animate-pulse" />
                          <span className="text-[6.5px] text-[#FF5C00] font-black uppercase tracking-wider font-mono">
                            {activeBooster.type === 'like' ? 'SUPER LIKE' : activeBooster.type === 'comment' ? 'AVIS' : 'CADEAU'}
                          </span>
                        </div>
                        <p className="text-[8px] sm:text-[8.5px] leading-tight text-zinc-200 font-bold font-sans">
                          {activeBooster.message}
                        </p>
                      </div>

                      {/* Small triangle pointer pointing to the heart icon */}
                      <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[4px] border-y-transparent border-l-[4px] border-l-black/85" />
                    </div>
                  )}
                </div>

                {/* 3.5. Expandable Emoji Reactions Button in Sidebar */}
                <div className="flex flex-col items-center relative animate-gentle-float-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsReactionBarOpen(prev => ({ ...prev, [video.id]: !prev[video.id] }));
                    }}
                    style={{ outline: 'none' }}
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full backdrop-blur-md border flex items-center justify-center text-white transition-all shadow-lg cursor-pointer shrink-0 ${
                      isReactionBarOpen[video.id] 
                        ? 'bg-[#FF5C00] border-amber-300 scale-110 shadow-[0_0_15px_rgba(255,92,0,0.6)]' 
                        : 'bg-black/55 border-white/10 hover:bg-black/70 hover:scale-110 active:scale-90'
                    }`}
                    title="Réagir au plat"
                  >
                    <Sparkles size={17} className="text-amber-400 fill-amber-400 animate-pulse" />
                  </button>
                  <span className="text-[6.5px] sm:text-[7.5px] text-amber-300 font-extrabold mt-0.5 font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase tracking-wider shrink-0">
                    Réagir
                  </span>

                  {/* Expandable Reaction Emoji Picker Popup */}
                  {isReactionBarOpen[video.id] && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-[44px] sm:right-[52px] top-1/2 -translate-y-1/2 z-50 bg-black/92 backdrop-blur-2xl border border-amber-500/50 rounded-2xl p-2.5 shadow-[0_0_30px_rgba(0,0,0,0.85)] flex flex-col gap-2 animate-fade-in w-[195px] pointer-events-auto"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#FF5C00] animate-ping" />
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-amber-300 font-mono">
                            Réagir en direct
                          </span>
                        </div>
                        <button 
                          onClick={() => setIsReactionBarOpen(prev => ({ ...prev, [video.id]: false }))}
                          className="text-zinc-400 hover:text-white p-0.5 cursor-pointer transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {REACTION_EMOJIS.map((item) => {
                          const currentCount = (reactionCounts[video.id] && reactionCounts[video.id][item.emoji]) ?? item.baseCount;
                          return (
                            <button
                              key={item.emoji}
                              id={`btn-react-popup-${item.emoji}-${video.id}`}
                              onClick={(e) => {
                                triggerFloatingReaction(video.id, item.emoji, undefined, undefined, e);
                              }}
                              className="group relative flex flex-col items-center justify-center p-1.5 bg-white/5 hover:bg-amber-500/25 border border-white/10 hover:border-amber-400/80 rounded-xl transition-all duration-150 hover:scale-115 active:scale-90 cursor-pointer shadow-sm"
                            >
                              <span className="text-xl group-hover:scale-125 transition-transform duration-150 leading-none">
                                {item.emoji}
                              </span>
                              <span className="text-[7px] font-extrabold text-zinc-300 group-hover:text-amber-200 font-mono mt-0.5 leading-none">
                                {currentCount > 999 ? `${(currentCount / 1000).toFixed(1)}k` : currentCount}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-1 border-t border-white/10 text-center">
                        <span className="text-[7.5px] font-bold text-zinc-400 tracking-tight">
                          💡 Tap rapide ou répété pour envoyer des bursts !
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Comment Button (Float Animated) */}
                <div className="flex flex-col items-center animate-gentle-float-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCommentsOpen(true);
                    }}
                    style={{ outline: 'none' }}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:scale-115 hover:shadow-[0_0_12px_rgba(255,92,0,0.3)] active:scale-90 transition-all shadow-lg hover:bg-black/70 cursor-pointer shrink-0"
                  >
                    <MessageSquare size={17} className="text-white" />
                  </button>
                  <span className="text-[6.5px] sm:text-[7.5px] text-zinc-300 font-extrabold mt-0.5 font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase tracking-wider shrink-0">
                    {commentsCount}
                  </span>
                </div>

                {/* 5. Tipping / Gift Button (Float Animated) */}
                <div className="flex flex-col items-center animate-gentle-float-3">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTipsOpen(true);
                    }}
                    style={{ outline: 'none' }}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:scale-115 hover:shadow-[0_0_12px_rgba(250,204,21,0.4)] active:scale-90 transition-all shadow-lg hover:bg-black/70 cursor-pointer shrink-0"
                    title="Envoyer un cadeau"
                  >
                    <Gift size={17} className="text-yellow-400 stroke-[1.8]" />
                  </button>
                  <span className="text-[6.5px] sm:text-[7.5px] text-zinc-300 font-extrabold mt-0.5 font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase tracking-wider shrink-0">
                    Cadeau
                  </span>
                </div>

                {/* 6. Info / Dish Drawer trigger */}
                {hasDish && (
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={() => onSelectDish(video.associatedDishId!)}
                      style={{ outline: 'none' }}
                      className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-lg hover:bg-black/70 cursor-pointer shrink-0"
                      title="Détails du plat"
                    >
                      <Info size={17} className="text-white" />
                    </button>
                    <span className="text-[6.5px] sm:text-[7.5px] text-zinc-300 font-extrabold mt-0.5 font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase tracking-wider shrink-0">
                      Infos
                    </span>
                  </div>
                )}

                {/* 7. Share Button */}
                <div className="flex flex-col items-center">
                  <button 
                    onClick={(e) => handleShare(video, e)}
                    style={{ outline: 'none' }}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-lg hover:bg-black/70 cursor-pointer shrink-0"
                  >
                    <Share2 size={17} className="text-white" />
                  </button>
                  <span className="text-[6.5px] sm:text-[7.5px] text-zinc-300 font-extrabold mt-0.5 font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase tracking-wider shrink-0">
                    Partager
                  </span>
                </div>

                {/* 7.5. Taste Profile AI Trigger */}
                <div className="flex flex-col items-center">
                  <button 
                    id={`btn-taste-profile-sidebar-${video.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTasteProfileModalOpen(true);
                    }}
                    style={{ outline: 'none' }}
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full backdrop-blur-md border flex items-center justify-center text-white hover:scale-115 active:scale-90 transition-all shadow-lg cursor-pointer shrink-0 ${
                      feedSortOrder === 'taste_profile'
                        ? 'bg-gradient-to-tr from-[#FF5C00] to-purple-600 border-[#FF5C00] shadow-[0_0_12px_rgba(255,92,0,0.5)]'
                        : 'bg-black/55 border-purple-400/40 hover:bg-purple-950/60'
                    }`}
                    title="Mon Profil Gustatif IA"
                  >
                    <span className="text-sm sm:text-base leading-none">👅</span>
                  </button>
                  <span className="text-[6.5px] sm:text-[7.5px] text-purple-300 font-extrabold mt-0.5 font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase tracking-wider shrink-0">
                    Goûts IA
                  </span>
                </div>

                {/* 8. Combined Grand Écran & Version Épurée Button */}
                <div className="flex flex-col items-center">
                  <button 
                    id={`btn-feed-fullscreen-${video.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextState = !localIsFullscreen;
                      setLocalIsFullscreen(nextState);
                      setIsCinemaMode(nextState);
                    }}
                    style={{ outline: 'none' }}
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer shrink-0 ${
                      localIsFullscreen
                        ? 'bg-gradient-to-tr from-[#FF5C00] via-orange-500 to-amber-500 text-white border-white shadow-[0_0_20px_rgba(255,92,0,0.8)] scale-110'
                        : 'bg-black/55 hover:bg-black/75 text-white border-white/15 hover:border-amber-400/80 hover:scale-105 active:scale-95'
                    }`}
                    title={localIsFullscreen ? "Quitter le Grand Écran (Réafficher l'interface)" : "Grand Écran (Mode Épuré)"}
                  >
                    {localIsFullscreen ? <Minimize2 size={17} className="text-white" /> : <Maximize2 size={17} className="text-white" />}
                  </button>
                  <span className="text-[6.5px] sm:text-[7.5px] text-zinc-300 font-extrabold mt-0.5 font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase tracking-wider shrink-0 whitespace-nowrap">
                    {localIsFullscreen ? "Normal" : "Grand Écran"}
                  </span>
                </div>
              </div>

              {/* Bottom Content Description & CTA Card Overlay - Crystal Clear Gradient Scrim (No foggy cotton veil) */}
              <div className={`absolute left-0 right-0 pl-3.5 pr-14 pb-6 sm:pb-8 pt-10 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10 pointer-events-none transition-all duration-300 ${isCinemaMode ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'} bottom-0`}>
                {/* Clickable Triggers to show direct order popup, buy button & menu */}
                <div className="flex items-center gap-2 mb-2 pointer-events-auto flex-wrap">
                  {onSelectLiveVideo && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLiveVideo(video.id);
                      }}
                      className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-orange-500 via-[#FF5C00] to-red-600 hover:from-orange-600 hover:to-red-700 text-white border border-white/20 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all scale-100 hover:scale-105 active:scale-95 cursor-pointer pointer-events-auto flex items-center gap-2 shadow-xl shadow-orange-950/50 w-fit animate-pulse-orange-ring"
                    >
                      <span className="w-2 h-2 bg-white rounded-full animate-ping shrink-0" />
                      <span>Acheter ce plat</span>
                    </button>
                  )}

                  {hasDish && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOrderPopup(prev => !prev);
                      }}
                      className="bg-gradient-to-r from-orange-500 to-[#FF5C00] hover:from-orange-600 hover:to-[#FF7A00] text-white text-[9.5px] sm:text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/20 shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 animate-pulse-orange-ring btn-order-glow"
                    >
                      <ShoppingCart size={11} />
                      <span>{showOrderPopup ? "Masquer Commande" : "Commander"}</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const firstDish = dishes.find(d => d.restaurantId === video.restaurantId);
                      const dishIdToUse = video.associatedDishId || firstDish?.id;
                      if (dishIdToUse) {
                        onSelectDish(dishIdToUse, 'menu');
                        notify("LA CARTE DU CHEF", `Ouverture du menu de ${video.restaurantName || 'ce restaurant'}`, "info");
                      } else {
                        notify("INDISPONIBLE", "Le menu de ce restaurant n'est pas disponible", "warn");
                      }
                    }}
                    className="bg-black/80 hover:bg-black/95 text-amber-300 hover:text-white border border-amber-500/40 text-[9.5px] sm:text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 animate-menu-pulse backdrop-blur-md"
                    title="Consulter le menu complet du restaurant"
                  >
                    <BookOpen size={12} className="animate-menu-icon-float text-amber-400" />
                    <span>Menu</span>
                  </button>
                </div>

                {/* Restaurant Badge info */}
                <div className="flex items-center space-x-1.5 mb-1.5 flex-wrap gap-y-1 pointer-events-auto">
                  {(() => {
                    const videoRestaurant = restaurants.find(r => r.id === video.restaurantId);
                    return (
                      <>
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            const firstDish = dishes.find(d => d.restaurantId === video.restaurantId);
                            const dishIdToUse = video.associatedDishId || firstDish?.id;
                            if (dishIdToUse) {
                              onSelectDish(dishIdToUse, 'menu');
                            } else {
                              alert("Le menu de ce restaurant n'est pas encore disponible.");
                            }
                          }}
                          className="flex items-center space-x-1 py-0.5 cursor-pointer hover:text-[#FF5C00] transition-colors"
                          title="Accéder au menu du restaurant"
                        >
                          {videoRestaurant?.logoUrl ? (
                            <img 
                              src={videoRestaurant.logoUrl} 
                              alt="Logo" 
                              className="w-5.5 h-5.5 rounded-full object-cover border border-white/40 shadow-md shrink-0" 
                              onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=50'; }}
                            />
                          ) : (
                            <MapPin size={11} className="text-[#FF5C00]" />
                          )}
                          <span className="text-xs sm:text-sm font-black text-white tracking-wide font-sans flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                            <span>{videoRestaurant?.name || video.restaurantName}</span>
                            {videoRestaurant?.isCertified && (
                              <span className="w-3.5 h-3.5 rounded-full bg-blue-500/90 text-white flex items-center justify-center text-[8px] font-black shrink-0 border border-white/20" title="Compte Certifié">✓</span>
                            )}
                          </span>
                        </div>

                        {(() => {
                          if (videoRestaurant) {
                            const dist = getDistance(videoRestaurant);
                            if (dist !== null) {
                              return (
                                <span className="text-[9px] bg-black/45 text-[#FF5C00] border border-white/10 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-md font-mono">
                                  📍 {dist} km
                                </span>
                              );
                            }
                          }
                          return null;
                        })()}

                        {videoRestaurant?.subscriptionTier === 'gold' && (
                          <span className="text-[8px] bg-amber-500 text-zinc-950 font-black px-1.5 py-0.5 rounded tracking-wider flex items-center gap-0.5 shadow-sm" title="Partenaire Gold Fidfud">
                            👑 GOLD
                          </span>
                        )}
                        {videoRestaurant?.subscriptionTier === 'pro' && (
                          <span className="text-[8px] bg-white/10 text-white border border-white/20 font-extrabold px-1.5 py-0.5 rounded tracking-wider flex items-center gap-0.5 shadow-sm" title="Partenaire Pro Fidfud">
                            ⭐ PRO
                          </span>
                        )}
                      </>
                    );
                  })()}

                  {/* Follow/Subscribe Toggle Button */}
                  {(() => {
                    const videoRest = restaurants.find(r => r.id === video.restaurantId);
                    const isOwnRest = Boolean(
                      user && videoRest && (
                        videoRest.userId === user.id ||
                        (user.email && videoRest.email && user.email.toLowerCase() === videoRest.email.toLowerCase())
                      )
                    );

                    if (isOwnRest) {
                      return (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          VOUS 👨‍🍳
                        </span>
                      );
                    }

                    return (
                      <button
                        onClick={(e) => handleSubscribe(video.restaurantId, e)}
                        className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full transition-all flex items-center gap-0.5 cursor-pointer shadow-md ${
                          isSubby 
                            ? 'bg-white/10 text-zinc-300 border border-white/10 hover:bg-white/20' 
                            : 'bg-transparent text-white border border-white/50 hover:bg-white/10'
                        }`}
                      >
                        {isSubby ? (
                          <>
                            <Check size={9} className="stroke-[3]" />
                            <span>SUIVI</span>
                          </>
                        ) : (
                          <>
                            <Plus size={9} className="stroke-[3]" />
                            <span>SUIVRE</span>
                          </>
                        )}
                      </button>
                    );
                  })()}

                  <span className="text-[8px] bg-red-600/90 text-white font-extrabold px-2 py-0.5 rounded tracking-widest animate-pulse flex items-center gap-1 border border-white/10">
                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                    LIVE SHOPPING
                  </span>
                </div>

                {/* Video Caption & Certification Symbols */}
                <div className="space-y-0.5 mb-1">
                  <p className="text-white text-xs sm:text-sm font-semibold line-clamp-2 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.95)] leading-relaxed font-sans pointer-events-auto">
                    {video.title}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <DietaryBadges item={video.associatedDish || restaurants.find(r => r.id === video.restaurantId)} size="xs" className="mt-0.5 pointer-events-auto" />
                    {(() => {
                      const prepTime = getVideoPreparationTime(video, restaurants, dishes);
                      if (prepTime <= 10) {
                        return (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-black tracking-wider uppercase text-black bg-gradient-to-r from-amber-400 to-orange-400 border border-amber-300 px-2 py-0.5 rounded-md drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pointer-events-auto w-fit animate-pulse">
                            <Zap size={9} className="fill-black text-black" />
                            <span>Ready to grab ({prepTime}m)</span>
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  {video.isTooLong && (
                    <span className="inline-flex items-center gap-1 text-[8.5px] font-black tracking-wider uppercase text-amber-400 bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded-md drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] pointer-events-auto w-fit">
                      <AlertTriangle size={10} />
                      <span>Vidéo Trop Longue ({video.duration?.toFixed(0)}s)</span>
                    </span>
                  )}
                </div>

                {/* Sleek, interactive premium playback progress bar with remaining duration */}
                {index === activeVideoIndex && !isEmbed && (
                  <div 
                    onClick={(e) => handleProgressBarClick(e, video.id)}
                    className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/15 hover:bg-white/25 z-30 pointer-events-auto cursor-pointer transition-all flex items-end group/progress"
                  >
                    <div 
                      className="h-full bg-gradient-to-r from-[#FF5C00] to-orange-500 transition-all duration-100 ease-out shadow-[0_0_8px_#FF5C00] relative flex items-center justify-end"
                      style={{ width: `${(activeVideoTime / activeVideoDuration) * 100}%` }}
                    >
                      {/* Active glowing thumb on hover */}
                      <div className="absolute right-0 w-3 h-3 rounded-full bg-white border-2 border-[#FF5C00] scale-0 group-hover/progress:scale-100 transition-transform shadow-[0_0_8px_rgba(255,92,0,0.8)]" />
                    </div>
                    {/* Remaining duration display */}
                    {activeVideoDuration > 1 && (
                      <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-mono text-zinc-300 font-extrabold border border-white/10 flex items-center gap-1 shadow-lg pointer-events-none select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00] animate-pulse" />
                        <span>-{Math.ceil(activeVideoDuration - activeVideoTime)}s</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chef Suggestion Interactive delayed Pop-Up - slides in after orderButtonDelaySeconds */}
              {hasDish && (index === activeVideoIndex) && showOrderPopup && (() => {
                const videoRestaurant = restaurants.find(r => r.id === video.restaurantId);
                const isOrderingEnabled = videoRestaurant?.isOrderingEnabled !== false;
                if (!isOrderingEnabled) return null;

                return (
                  <motion.div 
                    drag
                    dragMomentum={false}
                    dragElastic={0.1}
                    className={`absolute left-2.5 right-12 z-35 animate-fade-in pointer-events-auto cursor-grab active:cursor-grabbing select-none transition-all duration-300 ${
                      localIsFullscreen 
                        ? 'bottom-[90px] sm:bottom-[105px]' 
                        : 'bottom-[100px] sm:bottom-[120px]'
                    }`}
                  >
                    <div className="bg-[#09090B]/95 backdrop-blur-xl border border-[#FF5C00]/40 rounded-xl p-2 sm:p-2.5 shadow-[0_4px_20px_rgba(255,92,0,0.2)] flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {video.associatedDish?.imageUrl ? (
                          <LazyImage 
                            src={video.associatedDish.imageUrl} 
                            alt={video.associatedDish.name || "Plat"}
                            sizeType="thumbnail"
                            containerClassName="w-9 h-9 rounded-lg shrink-0 border border-white/10 overflow-hidden"
                            className="w-full h-full object-cover"
                            placeholderEmoji="🍔"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0">🍔</div>
                        )}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[7.5px] uppercase tracking-wider font-mono text-[#FF5C00] font-bold block">🔥 Commande Directe</span>
                            {(() => {
                              const prep = getVideoPreparationTime(video, restaurants, dishes);
                              if (prep <= 10) {
                                return (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-amber-400 text-black border border-amber-300 text-[6.5px] font-black uppercase rounded tracking-widest font-mono shrink-0">
                                    <Zap size={7} className="fill-black text-black" /> Ready to grab ({prep}m)
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {(() => {
                              const stats = getDishOrderStats(video.associatedDishId, orders);
                              if (!stats.isTrending) return null;
                              if (stats.badgeType === 'trending') {
                                return (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-red-500/15 text-red-400 border border-red-500/25 text-[6.5px] font-black uppercase rounded tracking-widest font-mono shrink-0">
                                    <Flame size={7} className="animate-pulse text-red-400 shrink-0" /> Tendance ({stats.count})
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/25 text-[6.5px] font-black uppercase rounded tracking-widest font-mono shrink-0">
                                    <Award size={7} className="text-amber-400 shrink-0" /> Top Choix ({stats.count})
                                  </span>
                                );
                              }
                            })()}
                          </div>
                          <h4 className="text-[10.5px] font-black uppercase tracking-tight text-white truncate leading-none">{video.associatedDish?.name}</h4>
                          <DietaryBadges item={video.associatedDish} size="xs" className="mt-0.5" />
                          <span className="text-[9.5px] font-mono text-[#FF5C00] font-black">{video.associatedDish?.price.toFixed(2)} €</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 pl-1.5 shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDish(video.associatedDishId!, 'order');
                          }}
                          className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white text-[8.5px] font-black tracking-wider uppercase px-2.5 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-1 cursor-pointer btn-order-glow"
                        >
                          <ShoppingCart size={9} />
                          <span>Commander</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowOrderPopup(false);
                          }}
                          className="text-zinc-500 hover:text-white p-1 cursor-pointer shrink-0"
                          title="Fermer"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}



              {/* Floating Quick Restore / Exit Button when in Grand Écran / Cinema Mode */}
              {(localIsFullscreen || isCinemaMode) && index === activeVideoIndex && (
                <div className="absolute bottom-4 right-3 z-50 pointer-events-auto">
                  <button
                    id="btn-feed-exit-fullscreen-floating"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalIsFullscreen(false);
                      setIsCinemaMode(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/90 hover:bg-black text-amber-300 hover:text-white border border-amber-400/80 shadow-[0_0_18px_rgba(251,191,36,0.6)] backdrop-blur-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer"
                    title="Quitter le Grand Écran (Réafficher l'interface)"
                  >
                    <Minimize2 size={13} className="text-amber-400 shrink-0" />
                    <span className="whitespace-nowrap">Quitter Grand Écran</span>
                  </button>
                </div>
              )}

              {/* Space reservation for video feed bottom container */}
            </div>
          );
        })}
      </div>

      {/* OVERLAY PANEL: COMMENTS BOTTOM SHEET */}
      {isCommentsOpen && currentVideo && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-[100] flex flex-col justify-end">
          <div className="absolute inset-0" onClick={() => setIsCommentsOpen(false)} />
          
          <div className="relative w-full h-[65%] bg-[#0D0D0E]/95 backdrop-blur-md border-t border-white/10 rounded-t-[24px] flex flex-col z-[101] p-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-2">
              <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <MessageSquare size={16} className="text-[#FF5C00]" />
                <span>Commentaires ({commentsList.length})</span>
              </h4>
              <button 
                onClick={() => setIsCommentsOpen(false)}
                className="text-xs font-extrabold text-zinc-500 hover:text-white uppercase tracking-wider"
              >
                Fermer
              </button>
            </div>

            {/* Scrollable list of comments */}
            <div className="flex-1 overflow-y-auto scrollbar-none space-y-3 py-2">
              {onSelectLiveVideo && (
                <div 
                  onClick={() => {
                    setIsCommentsOpen(false);
                    onSelectLiveVideo(currentVideo.id);
                  }}
                  className="bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 p-2.5 rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-between text-xs mb-2 shadow-lg hover:scale-[1.01] active:scale-99"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                    <div>
                      <p className="font-extrabold text-white text-[10.5px] uppercase tracking-wider">REJOINDRE LE LIVE EN DIRECT 🔴</p>
                      <p className="text-[9px] text-zinc-400 font-medium font-sans">Cliquez pour commander en direct !</p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-red-600 hover:bg-red-500 text-white font-black px-2 py-1 rounded-lg uppercase tracking-wider shrink-0 transition-transform font-mono">
                    GO ⚡
                  </span>
                </div>
              )}

              {commentsList.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-xs italic font-sans">
                  Soyez le premier à commenter cette vidéo ! 💬
                </div>
              ) : (
                commentsList.map(cmt => {
                  const currentRest = currentVideo ? restaurants.find(r => r.id === currentVideo.restaurantId) : null;
                  const isRestOwner = Boolean(
                    user && currentRest && (
                      currentRest.userId === user.id ||
                      (user.email && currentRest.email && user.email.toLowerCase() === currentRest.email.toLowerCase())
                    )
                  );
                  const canReply = isRestOwner;

                  return (
                    <div key={cmt.id} className="text-xs bg-white/2 p-2.5 rounded-xl border border-white/5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-zinc-300">
                          {cmt.userEmail ? cmt.userEmail.split('@')[0] : 'Client'}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          {new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-zinc-200 leading-relaxed font-sans">{cmt.text}</p>

                      {/* Display existing Chef reply if present */}
                      {cmt.chefReply && (
                        <div className="mt-2 pl-3 border-l-2 border-[#FF5C00] bg-zinc-900/80 p-2 rounded-r-xl">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-black uppercase text-[#FF5C00] bg-[#FF5C00]/10 px-1.5 py-0.5 rounded border border-[#FF5C00]/20 flex items-center gap-1">
                              👨‍🍳 Réponse du Restaurateur
                            </span>
                          </div>
                          <p className="text-zinc-300 text-[11px] font-medium leading-normal">{cmt.chefReply.text}</p>
                        </div>
                      )}

                      {/* Chef Reply Trigger & Input Form */}
                      {canReply && !cmt.chefReply && (
                        <div className="pt-1">
                          {replyingCommentId === cmt.id ? (
                            <div className="flex gap-1.5 mt-1">
                              <input
                                type="text"
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Votre réponse de restaurateur..."
                                className="flex-1 bg-zinc-900 border border-[#FF5C00]/40 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-[#FF5C00]"
                                autoFocus
                              />
                              <button
                                onClick={() => handlePostReply(cmt.id)}
                                disabled={!replyText.trim()}
                                className="bg-[#FF5C00] text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-[#FF7A00] disabled:opacity-40 cursor-pointer"
                              >
                                Envoyer
                              </button>
                              <button
                                onClick={() => { setReplyingCommentId(null); setReplyText(''); }}
                                className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg text-[10px] font-bold hover:text-white cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setReplyingCommentId(cmt.id); setReplyText(''); }}
                              className="text-[10px] font-extrabold text-[#FF5C00] hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                            >
                              💬 Répondre à ce client
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handlePostComment} className="pt-3 border-t border-white/5 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={user ? "Ajouter un commentaire de chef..." : "Connectez-vous pour commenter"}
                disabled={!user}
                className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!user || !commentText.trim()}
                className="bg-[#FF5C00] text-white p-2.5 rounded-xl hover:bg-[#FF7A00] transition-colors disabled:opacity-40 flex items-center justify-center cursor-pointer"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* OVERLAY PANEL: TIPPING & POINTS PURCHASE BOTTOM SHEET */}
      {isTipsOpen && currentVideo && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-[100] flex flex-col justify-end">
          <div className="absolute inset-0" onClick={() => setIsTipsOpen(false)} />
          
          <div className="relative w-full bg-[#0D0D0E]/95 backdrop-blur-md border-t border-white/10 rounded-t-[24px] flex flex-col z-[101] p-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <h4 className="text-sm font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Gift size={16} />
                <span>Encourager le Restaurateur</span>
              </h4>
              <button 
                onClick={() => setIsTipsOpen(false)}
                className="text-xs font-extrabold text-zinc-500 hover:text-white uppercase tracking-wider"
              >
                Fermer
              </button>
            </div>

            {/* User Points balance */}
            <div className="bg-zinc-900/60 rounded-xl p-3 border border-white/5 flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Coins className="text-yellow-400" size={18} />
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Votre Solde de Jetons</p>
                  <p className="text-sm font-black text-white">{userPoints} pts</p>
                </div>
              </div>
              
              {user && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleBuyPoints(100)}
                    className="bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-400 text-[9px] font-black px-2 py-1 rounded-lg uppercase cursor-pointer"
                  >
                    +100 (1€)
                  </button>
                  <button
                    onClick={() => handleBuyPoints(500)}
                    className="bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-400 text-[9px] font-black px-2 py-1 rounded-lg uppercase cursor-pointer"
                  >
                    +500 (4€)
                  </button>
                </div>
              )}
            </div>

            {!user ? (
              <div className="text-center py-6 text-zinc-500 text-xs">
                Veuillez vous connecter pour acheter des jetons et envoyer des cadeaux !
              </div>
            ) : (
              <>
                {/* Gifts selectors list */}
                <p className="text-[10px] text-zinc-400 uppercase font-extrabold mb-2 font-mono tracking-wider">Choisissez un cadeau à envoyer en live :</p>
                <div className="grid grid-cols-4 gap-2.5 mb-4">
                  {[
                    { icon: '🌸', name: 'Fleur d\'or', points: 5 },
                    { icon: '🔥', name: 'Flambée', points: 10 },
                    { icon: '💖', name: 'Coup de Cœur', points: 25 },
                    { icon: '👑', name: 'Couronne', points: 100 }
                  ].map(gift => {
                    const isSelected = selectedGift.icon === gift.icon;
                    return (
                      <button
                        key={gift.icon}
                        onClick={() => setSelectedGift(gift)}
                        className={`p-2.5 rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-500/10 border-amber-400 text-white scale-105 shadow-md' 
                            : 'bg-zinc-900 border-white/5 hover:border-white/10 text-zinc-400'
                        }`}
                      >
                        <span className="text-2xl mb-1">{gift.icon}</span>
                        <span className="text-[9px] font-bold text-center block leading-none truncate w-full">{gift.name}</span>
                        <span className="text-[8px] font-mono font-extrabold text-amber-400 mt-1">{gift.points} pts</span>
                      </button>
                    );
                  })}
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendTip}
                  className="w-full bg-gradient-to-tr from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-zinc-950 font-black text-xs py-3 rounded-xl uppercase tracking-wider shadow-lg flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 transition-transform"
                >
                  <Sparkles size={14} className="stroke-[2.5]" />
                  <span>Envoyer {selectedGift.icon} ({selectedGift.points} pts)</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Close the snap-scroll container and center column panel wrapper */}
      </div></div>
 
      {/* 3. Right Sidebar Panel (Desktop only - pure glassmorphism & zero thick borders) */}
      {!localIsFullscreen && (
        <div 
          style={{ backgroundColor: 'rgba(15,14,19,0.35)' }}
          className="hidden lg:flex flex-col w-80 backdrop-blur-xl rounded-[28px] border border-white/5 p-4 overflow-y-auto space-y-4 h-full shrink-0 scrollbar-none shadow-2xl"
        >
          
          {/* Dynamic AI-Configured Ad Spot */}
          {designSettings?.desktopAds?.map((ad: any) => {
            if (!ad.isActive) return null;
            return (
              <a 
                key={ad.id}
                href={ad.clickUrl || '#'}
                onClick={e => { if (ad.clickUrl === '#') e.preventDefault(); }}
                className="block group relative p-3 rounded-2xl bg-gradient-to-br from-[#FF5A1F]/5 to-zinc-900/40 border border-white/5 hover:border-[#FF5A1F]/30 transition-all duration-300 overflow-hidden shadow-lg shrink-0"
              >
                {/* Background shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                
                {/* Ad Badge */}
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[7px] font-black uppercase tracking-widest font-mono z-10">
                  Sponsorisé
                </div>

                <div className="space-y-1.5">
                  {Boolean(ad.mediaUrl?.trim()) && (
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/40 border border-white/5">
                      {ad.mediaType === 'video' ? (
                        <video 
                          src={getSafeVideoUrl(ad.mediaUrl)?.trim() || STABLE_CULINARY_FALLBACK_VIDEOS[0] || undefined} 
                          autoPlay 
                          loop 
                          muted 
                          playsInline 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.warn('[VideoFeed Sponsor] Ad video failed to load, falling back');
                            e.currentTarget.src = STABLE_CULINARY_FALLBACK_VIDEOS[0];
                          }}
                        />
                      ) : (
                        <img 
                          src={ad.mediaUrl.trim()} 
                          alt={ad.title} 
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                        />
                      )}
                    </div>
                  )}
                  <div className="px-1">
                    <h5 className="text-white text-[11px] font-black uppercase tracking-tight leading-tight flex items-center gap-1.5">
                      {ad.title}
                    </h5>
                    <p className="text-zinc-400 text-[9.5px] mt-0.5 font-sans leading-snug">
                      {ad.subtitle}
                    </p>
                  </div>
                </div>
              </a>
            );
          })}

          {/* Active Video Chef / Restaurant Profile */}
          {currentVideo && (() => {
            const videoRestaurant = restaurants.find(r => r.id === currentVideo.restaurantId);
            if (!videoRestaurant) return null;
            const dist = activeUserLocation ? getDistance(videoRestaurant) : null;
            const isSubby = subscriptions.includes(currentVideo.restaurantId);
            return (
              <div className="bg-white/[0.02] hover:bg-white/[0.04] p-4 rounded-2xl border border-white/5 space-y-3 transition-colors duration-300">
                <div className="flex items-center space-x-2.5">
                  <LazyImage 
                    src={videoRestaurant.logoUrl} 
                    alt={videoRestaurant.name} 
                    sizeType="avatar"
                    containerClassName="w-9 h-9 rounded-full border border-white/10 shrink-0 overflow-hidden"
                    className="w-full h-full object-cover"
                    placeholderEmoji="🏪"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-xs font-black uppercase tracking-tight truncate leading-none flex items-center gap-1.5">
                      <span>{videoRestaurant.name}</span>
                      {videoRestaurant.isCertified && <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[7.5px] font-black shrink-0">✓</span>}
                    </h4>
                    <p className="text-zinc-400 text-[10px] mt-1.5 font-sans leading-none truncate">
                      {videoRestaurant.category} {dist !== null && `• 📍 ${dist.toFixed(1)} km`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleSubscribe(videoRestaurant.id, e)}
                    className={`text-[9px] font-extrabold px-3 py-1.5 rounded-full border transition-all shrink-0 cursor-pointer ${
                      isSubby 
                        ? 'bg-zinc-800 text-zinc-400 border-zinc-700/50' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-white/10'
                    }`}
                  >
                    {isSubby ? 'Suivi' : 'Suivre'}
                  </button>
                </div>
                <p className="text-zinc-400 text-[10.5px] leading-relaxed font-sans line-clamp-2">
                  {videoRestaurant.description || "Découvrez nos préparations culinaires fraîches et de qualité supérieure préparées sous vos yeux."}
                </p>
              </div>
            );
          })()}
 
          {/* Associated Dish Details and Direct Order Card */}
          {currentVideo && currentVideo.associatedDish && (
            <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-4 rounded-2xl border border-white/5 space-y-3 relative overflow-hidden shadow-lg">
              <div className="flex gap-3">
                <LazyImage 
                  src={currentVideo.associatedDish.imageUrl} 
                  alt={currentVideo.associatedDish.name} 
                  sizeType="thumbnail"
                  containerClassName="w-16 h-16 rounded-xl border border-white/10 shrink-0 overflow-hidden"
                  className="w-full h-full object-cover"
                  placeholderEmoji="🍲"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[8px] bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/20 font-black px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                      COMMANDE EN DIRECT
                    </span>
                    {(() => {
                      const stats = getDishOrderStats(currentVideo.associatedDishId, orders);
                      if (!stats.isTrending) return null;
                      if (stats.badgeType === 'trending') {
                        return (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-500/15 text-red-400 border border-red-500/25 text-[7px] font-black uppercase rounded tracking-widest font-mono shrink-0">
                            <Flame size={7} className="animate-pulse text-red-400 shrink-0" /> Tendance ({stats.count})
                          </span>
                        );
                      } else {
                        return (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/25 text-[7px] font-black uppercase rounded tracking-widest font-mono shrink-0">
                            <Award size={7} className="text-amber-400 shrink-0" /> Top Choix ({stats.count})
                          </span>
                        );
                      }
                    })()}
                  </div>
                  <h4 className="text-white text-xs font-black uppercase tracking-tight truncate leading-tight">
                    {currentVideo.associatedDish.name}
                  </h4>
                  <p className="text-[#FF5A1F] text-xs font-black font-mono">
                    {currentVideo.associatedDish.price.toFixed(2)} €
                  </p>
                  <DietaryBadges item={currentVideo.associatedDish} size="xs" className="mt-1" />
                </div>
              </div>
              <p className="text-zinc-400 text-[10.5px] leading-relaxed font-sans line-clamp-2">
                {currentVideo.associatedDish.description || "Ingrédients frais sélectionnés par le chef pour une expérience gustative inoubliable."}
              </p>
              <button 
                onClick={() => onSelectDish(currentVideo.associatedDishId!, 'order')}
                className="w-full bg-[#FF5A1F] hover:bg-[#ff6c36] text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-white/10 font-sans btn-order-glow"
              >
                <ShoppingCart size={12} />
                <span>Commander Directement</span>
              </button>
            </div>
          )}
 
          {/* Comments Live Feed */}
          <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex-1 flex flex-col space-y-3 h-[250px] min-h-[200px] shadow-sm">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <MessageSquare size={13} className="text-zinc-400" />
                <span>Commentaires ({commentsList.length})</span>
              </h4>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-none space-y-2.5 pr-1">
              {onSelectLiveVideo && (
                <div 
                  onClick={() => {
                    onSelectLiveVideo(currentVideo.id);
                  }}
                  className="bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 p-2 rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-between text-[10px] mb-1.5 shadow-md hover:scale-[1.01] active:scale-99"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <div className="truncate">
                      <p className="font-extrabold text-white text-[9.5px] uppercase tracking-wider truncate">LIVE EN DIRECT 🔴</p>
                      <p className="text-[8px] text-zinc-400 font-medium truncate font-sans">Rejoindre le direct !</p>
                    </div>
                  </div>
                  <span className="text-[8px] bg-red-600 hover:bg-red-500 text-white font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 font-mono">
                    GO ⚡
                  </span>
                </div>
              )}

              {commentsList.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-[10px] italic">
                  Aucun commentaire pour le moment. Laissez le premier ! 💬
                </div>
              ) : (
                commentsList.map(cmt => (
                  <div key={cmt.id} className="text-[10px] bg-white/[0.01] hover:bg-white/[0.03] p-2 rounded-xl border border-white/5 space-y-0.5 animate-fade-in transition-colors duration-300">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-zinc-300">
                        {cmt.userEmail.split('@')[0]}
                      </span>
                      <span className="text-[8px] text-zinc-500 font-mono">
                        {new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-zinc-400 font-sans leading-normal">{cmt.text}</p>
                  </div>
                ))
              )}
            </div>
 
            {/* Direct comment input for PC */}
            <form onSubmit={handlePostComment} className="flex gap-1.5 pt-2 border-t border-white/5">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={user ? "Écrire un commentaire..." : "Connectez-vous pour commenter"}
                disabled={!user}
                className="flex-1 bg-zinc-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-zinc-700"
              />
              <button
                type="submit"
                disabled={!user || !commentText.trim()}
                className="bg-zinc-800 hover:bg-zinc-700 text-white p-1.5 rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Send size={11} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Banner for Video Deletion */}
      {deleteToastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[150] bg-[#FF5C00] text-white px-5 py-3 rounded-2xl font-black uppercase text-xs tracking-wider shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <span>{deleteToastMessage}</span>
        </div>
      )}

      {/* Bulk Video Manager Modal / Drawer */}
      {isManagerDrawerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            onClick={() => setIsManagerDrawerOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 max-h-[85vh] flex flex-col text-white space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Film size={20} className="text-[#FF5C00]" />
                <h3 className="text-sm font-black uppercase tracking-wider italic text-white">
                  Gestion & Suppression en Masse des Vidéos
                </h3>
              </div>
              <button
                onClick={() => setIsManagerDrawerOpen(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Select All & Action bar */}
            <div className="flex items-center justify-between bg-zinc-900/80 p-3 rounded-2xl border border-white/5 shrink-0">
              <button
                onClick={() => {
                  if (selectedBulkVideoIds.length === feedVideos.length) {
                    setSelectedBulkVideoIds([]);
                  } else {
                    setSelectedBulkVideoIds(feedVideos.map(v => v.id));
                  }
                }}
                className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer"
              >
                {selectedBulkVideoIds.length === feedVideos.length && feedVideos.length > 0 ? (
                  <CheckSquare size={16} className="text-[#FF5C00]" />
                ) : (
                  <Square size={16} className="text-zinc-500" />
                )}
                <span>Tout sélectionner ({feedVideos.length})</span>
              </button>

              {selectedBulkVideoIds.length > 0 && (
                <button
                  onClick={handleBulkDeleteVideos}
                  disabled={isDeleting}
                  className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Supprimer la sélection ({selectedBulkVideoIds.length})</span>
                </button>
              )}
            </div>

            {/* Videos Grid list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {feedVideos.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs italic">
                  Aucune vidéo dans le feed actuellement.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {feedVideos.map(v => {
                    const isSelected = selectedBulkVideoIds.includes(v.id);
                    const rest = restaurants.find(r => r.id === v.restaurantId);
                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          setSelectedBulkVideoIds(prev => 
                            prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id]
                          );
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected 
                            ? 'bg-red-950/30 border-red-500/50 text-white' 
                            : 'bg-zinc-900/40 border-white/5 hover:border-white/20 text-zinc-300'
                        }`}
                      >
                        <div className="shrink-0 text-[#FF5C00]">
                          {isSelected ? <CheckSquare size={18} className="text-red-500" /> : <Square size={18} className="text-zinc-600" />}
                        </div>
                        <img 
                          src={v.thumbnailUrl || (v as any).imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=120&q=80'} 
                          alt={v.title}
                          className="w-12 h-16 rounded-xl object-cover shrink-0 border border-white/10"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black uppercase truncate text-white">{v.title || 'Vidéo Culinaire'}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{rest?.name || 'Restaurant'}</p>
                          <p className="text-[9px] text-zinc-500 font-mono mt-1">ID: {v.id.slice(0, 10)}...</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Supprimer cette vidéo ?")) {
                              handleSingleDeleteVideo(v.id);
                            }
                          }}
                          className="p-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition-colors cursor-pointer"
                          title="Supprimer individuellement"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Taste Profile Modal */}
      <TasteProfileModal
        isOpen={isTasteProfileModalOpen}
        onClose={() => setIsTasteProfileModalOpen(false)}
        orders={orders}
        user={user}
        dishes={dishes}
        restaurants={restaurants}
        onApplyFilter={() => {
          if (setFeedSortOrder) {
            setFeedSortOrder('taste_profile');
          }
          notify("👅 PROFIL GUSTATIF APPLIQUÉ", "Votre feed vidéo a été réorganisé selon vos affinités de saveurs !", "success");
        }}
      />

    </div>
  );
}
