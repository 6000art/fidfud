import React, { useRef, useState, useEffect } from 'react';
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
  Play,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { Video, Comment, Tip, Restaurant, Dish } from '../types';
import { motion } from 'motion/react';
import CustomIcon from './CustomIcon';

const getMediaEmbed = (url: string): { type: 'instagram' | 'youtube' | 'youtube_channel' | 'tiktok' | 'none'; embedUrl: string | null } => {
  if (!url) return { type: 'none', embedUrl: null };

  // Instagram
  const igMatch = url.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (igMatch && igMatch[1]) {
    return { type: 'instagram', embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed` };
  }

  // YouTube Videos (including shorts, live and watch links)
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&playlist=${ytMatch[1]}&loop=1` };
  }

  // YouTube Channel (e.g. youtube.com/@username or youtube.com/c/username or youtube.com/channel/UC...)
  const ytChannelMatch = url.match(/(?:youtube\.com)\/(?:@|c\/|channel\/)([\w.-]+)/i);
  if (ytChannelMatch && ytChannelMatch[1]) {
    // If it's a channel, we can embed an exciting gourmet food live stream or a looping continuous culinary playlist
    const demoLiveUrls = [
      'https://www.youtube.com/embed/5D-v7sYmKTM?autoplay=1&mute=1&loop=1&playlist=5D-v7sYmKTM', // Gordon Ramsay Cooking live/loop
      'https://www.youtube.com/embed/q_m_Y0pEonY?autoplay=1&mute=1&loop=1&playlist=q_m_Y0pEonY', // Street Food Tour Live loop
      'https://www.youtube.com/embed/F_8yHInZidg?autoplay=1&mute=1&loop=1&playlist=F_8yHInZidg'  // Culinary Masterclass
    ];
    // Hash channel name to pick one consistently
    const hash = ytChannelMatch[1].split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const selectedEmbed = demoLiveUrls[hash % demoLiveUrls.length];
    return { type: 'youtube_channel', embedUrl: selectedEmbed };
  }

  // TikTok
  const ttMatch = url.match(/(?:tiktok\.com)\/(?:@[\w.-]+\/video\/|embed\/v2\/)?(\d+)/i);
  if (ttMatch && ttMatch[1]) {
    return { type: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}` };
  }

  return { type: 'none', embedUrl: null };
};

const getInstagramEmbedUrl = (url: string): string | null => {
  return getMediaEmbed(url).embedUrl;
};

const getSafeVideoUrl = (url: string): string => {
  if (!url) return 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
  // Return the original URL directly to prevent replacing user's uploaded videos with standard fallback
  return url;
};

interface VideoFeedProps {
  videos: Video[];
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
  feedSortOrder?: 'recent' | 'oldest' | 'likes' | 'distance';
  setFeedSortOrder?: (val: 'recent' | 'oldest' | 'likes' | 'distance') => void;
}

interface FlyingElement {
  id: string;
  x: number; // Left position %
  icon: string;
}

export default function VideoFeed({ 
  videos, 
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
  setFeedSortOrder: propSetFeedSortOrder
}: VideoFeedProps) {
  const [feedVideos, setFeedVideos] = useState<Video[]>([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>({});
  const [loadedVideos, setLoadedVideos] = useState<Record<string, boolean>>({});
  const [videoFallbackUrls, setVideoFallbackUrls] = useState<Record<string, string>>({});
  const [localLikes, setLocalLikes] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [pausedVideos, setPausedVideos] = useState<Record<string, boolean>>({});
  
  // New Innovative and Cinema States
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);
  const [scrollMode, setScrollMode] = useState<'standard' | 'kinetic' | 'elevator'>('kinetic');
  const [isAutopilot, setIsAutopilot] = useState<boolean>(false);
  
  const [localFeedSortOrder, setLocalFeedSortOrder] = useState<'recent' | 'oldest' | 'likes' | 'distance'>(
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

  const currentVideo = feedVideos[activeVideoIndex];

  // Touch handlers for vertical swipe navigation (TikTok style)
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches && e.touches.length > 0) {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    if (e.changedTouches && e.changedTouches.length > 0) {
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndX = e.changedTouches[0].clientX;
      const deltaY = touchStartY.current - touchEndY;
      const deltaX = touchStartX.current - touchEndX;

      // Ensure the gesture is predominantly vertical and exceeds the 50px sensitivity threshold
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
        if (deltaY > 0) {
          // Swiped up -> navigate to next video
          const nextIndex = activeVideoIndex + 1;
          if (nextIndex < feedVideos.length) {
            const nextVideo = feedVideos[nextIndex];
            const nextElement = document.getElementById(`video-container-${nextVideo.id}`);
            if (nextElement) {
              nextElement.scrollIntoView({ behavior: 'smooth' });
            }
          }
        } else {
          // Swiped down -> navigate to previous video
          const prevIndex = activeVideoIndex - 1;
          if (prevIndex >= 0) {
            const prevVideo = feedVideos[prevIndex];
            const prevElement = document.getElementById(`video-container-${prevVideo.id}`);
            if (prevElement) {
              prevElement.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }
      }
    }
    // Reset values for next gesture
    touchStartY.current = null;
    touchStartX.current = null;
  };

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
    if (!videos || videos.length === 0) {
      setFeedVideos([]);
      return;
    }

    // Filter out videos that have been flagged as unreachable or invalid by the validator
    let result = videos.filter(v => v.validationStatus !== 'invalid');

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

    // 3. Filter by 5km radius if Proximity-First is active
    if (isProximityFirst && activeUserLocation) {
      result = result.filter(v => {
        const rest = restaurants.find(r => r.id === v.restaurantId);
        if (!rest) return false;
        const dist = getDistance(rest);
        return dist !== null && dist <= 5.0;
      });
    }

    // Sort by chosen feedSortOrder!
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
      // Default or 'recent': newest first
      result.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    setFeedVideos(result);
    setActiveVideoIndex(0); // Auto restart at index 0 on search/sorting update
  }, [videos, activeSearchQuery, activeSelectedCategory, activeUserLocation, restaurants, isProximityFirst, feedSortOrder]);

  // Infinite Scroll Trigger
  useEffect(() => {
    if (feedVideos.length > 0 && activeVideoIndex >= feedVideos.length - 2) {
      const moreVideos = videos.map(v => ({
        ...v,
        id: `${v.id}-inf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      }));
      setFeedVideos(prev => [...prev, ...moreVideos]);
    }
  }, [activeVideoIndex, feedVideos.length, videos]);

  // Setup Robust Intersection Observer and Scroll-Snapping Tracker
  useEffect(() => {
    const container = containerRef.current;
    if (!container || feedVideos.length === 0) return;

    // 1. High precision Intersection Observer (threshold: 0.6)
    // A high threshold ensures only the video occupying >60% of the screen triggers active state.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const indexAttr = entry.target.getAttribute('data-index');
            if (indexAttr !== null) {
              const idx = parseInt(indexAttr, 10);
              if (!isNaN(idx) && idx >= 0 && idx < feedVideos.length) {
                setActiveVideoIndex(idx);
              }
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6
      }
    );

    // 2. Active Scroll Listener Fallback for complete bulletproof coverage across mobile devices
    let scrollTimeoutId: any = null;
    const handleScroll = () => {
      if (scrollTimeoutId) clearTimeout(scrollTimeoutId);
      scrollTimeoutId = setTimeout(() => {
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        if (containerHeight === 0) return;

        const calculatedIndex = Math.round(scrollTop / containerHeight);
        if (calculatedIndex >= 0 && calculatedIndex < feedVideos.length) {
          setActiveVideoIndex((prev) => {
            if (prev !== calculatedIndex) {
              console.log('[Mobile Scroll Snapped] Active index sync:', calculatedIndex);
              return calculatedIndex;
            }
            return prev;
          });
        }
      }, 60);
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
      if (scrollTimeoutId) clearTimeout(scrollTimeoutId);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [feedVideos]);

  // Robust Play/Pause Engine: Play active video, strictly pause and reset inactive background ones
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
          // Unify element mute settings and inline plays
          vidEl.muted = isMuted;
          vidEl.playsInline = true;
          
          if (activeVideoIdChanged) {
            vidEl.currentTime = 0;
          }

          // Trigger play with secure promise handling
          const playPromise = vidEl.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log('[Autoplay Engaged] Successfully playing:', video.id);
              setLoadedVideos(prev => ({ ...prev, [video.id]: true }));
            }).catch(err => {
              if (err.name === 'AbortError' || err.message?.includes('interrupted')) {
                console.log('[Autoplay Info] Playback interrupted/aborted safely during source change or navigation:', video.id);
                return;
              }
              console.warn('[Autoplay Intercepted] Muted fallback triggered:', err);
              // Fallback to muted playing to bypass browser sandbox
              vidEl.muted = true;
              setIsMuted(true);
              vidEl.play().catch(criticalErr => {
                if (criticalErr.name === 'AbortError' || criticalErr.message?.includes('interrupted')) {
                  return;
                }
                console.warn('[Autoplay Fail] Browser playback prevented (self-healing will restore):', criticalErr);
              });
            });
          }
        } else {
          // Explicitly pause background/inactive videos to conserve resources and prevent conflicts
          if (!vidEl.paused) {
            vidEl.pause();
          }
          vidEl.currentTime = 0;
        }
      }
    });

    // Fast-acting safety net: Set active video as loaded to unblock skeleton after 600ms
    const safetyTimer = setTimeout(() => {
      setLoadedVideos(prev => {
        if (!prev[activeVideo.id]) {
          console.log('[Safety Unlock] Force-revealing video container:', activeVideo.id);
          return { ...prev, [activeVideo.id]: true };
        }
        return prev;
      });
    }, 600);

    return () => {
      clearTimeout(safetyTimer);
    };
  }, [activeVideoIndex, feedVideos, isMuted, videoFallbackUrls]);

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

  // Sync mute state
  useEffect(() => {
    (Object.values(videoRefs.current) as (HTMLVideoElement | null)[]).forEach((vidEl) => {
      if (vidEl) {
        vidEl.muted = isMuted;
      }
    });
  }, [isMuted, feedVideos]);

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

        // Fire flying animation!
        const newElements: FlyingElement[] = Array.from({ length: 8 }).map((_, i) => ({
          id: `fly-${Date.now()}-${i}-${Math.random()}`,
          x: 20 + Math.random() * 60, // Random percentage offset
          icon: selectedGift.icon
        }));

        setFlyingElements(prev => [...prev, ...newElements]);

        // Trigger premium exploding gift firework!
        triggerFirework(50, 45, selectedGift.icon);

        // Clean up flying elements after animation
        setTimeout(() => {
          setFlyingElements(prev => prev.filter(el => !newElements.some(ne => ne.id === el.id)));
        }, 2000);

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

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleLike = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowLiked = !likedVideos[videoId];
    setLikedVideos(prev => ({ ...prev, [videoId]: isNowLiked }));
    if (isNowLiked) {
      // Local subtle click reactions rising next to the sidebar Heart button
      const newLike1 = {
        id: `loc-like-${Date.now()}-1-${Math.random()}`,
        emoji: Math.random() > 0.45 ? '❤️' : '👍',
        x: -25 - Math.random() * 20,
        y: 10 + Math.random() * 15
      };
      const newLike2 = {
        id: `loc-like-${Date.now()}-2-${Math.random()}`,
        emoji: Math.random() > 0.5 ? '👍' : '❤️',
        x: -15 - Math.random() * 25,
        y: 20 + Math.random() * 20
      };
      setLocalLikes(prev => [...prev, newLike1, newLike2]);
      setTimeout(() => {
        setLocalLikes(prev => prev.filter(l => l.id !== newLike1.id && l.id !== newLike2.id));
      }, 800);

      if (designSettings?.enableFireworks !== false) {
        // Main screen center heart explosion
        triggerFirework(50, 48, '❤️');
        // Staggered side confetti explosions
        setTimeout(() => triggerFirework(30, 58, '✨'), 150);
        setTimeout(() => triggerFirework(70, 52, '🎉'), 300);
        setTimeout(() => triggerFirework(50, 68, '💖'), 450);
      }
    }
  };

  const handleShare = (video: Video, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: `Commande ce plat sur FIDFUD : ${video.associatedDish?.name || ''}`,
        text: video.title,
        url: window.location.href
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      const notifyToast = document.createElement('div');
      notifyToast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#FF5C00] text-white px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-wider shadow-2xl animate-bounce';
      notifyToast.innerText = `Lien copié ! Partagez le délice de ${video.restaurantName}`;
      document.body.appendChild(notifyToast);
      setTimeout(() => notifyToast.remove(), 2500);
    }
  };

  const handleVideoCanPlay = (videoId: string) => {
    setLoadedVideos(prev => ({ ...prev, [videoId]: true }));
  };

  const handleVideoError = (videoId: string, originalUrl: string) => {
    console.warn(`[Self-Healing Video Feed] Source failed for video ${videoId}. URL: ${originalUrl}`);
    
    // Only skip fallback if it's an in-progress local recording (blob or data urls)
    if (originalUrl && (originalUrl.startsWith('blob:') || originalUrl.startsWith('data:'))) {
      console.log(`[Self-Healing Video Feed] Preserving in-progress local recording/blob URL: ${originalUrl}`);
      return;
    }

    // Curated high-quality, fully public, CORS-enabled gourmet/food sample videos
    const fallbackPool = [
      'https://assets.mixkit.co/videos/preview/mixkit-chef-cutting-a-freshly-baked-pizza-40245-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-fresh-vegetables-and-meat-sizzling-in-a-wok-pan-40242-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-putting-ketchup-on-a-freshly-prepared-hamburger-40246-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-pouring-hot-chocolate-on-a-pancake-41617-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-fresh-vegetable-salad-in-the-kitchen-40243-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4'
    ];

    const hash = videoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const fallbackUrl = fallbackPool[hash % fallbackPool.length];

    setVideoFallbackUrls(prev => {
      if (prev[videoId] === fallbackUrl) {
        const ultimateFallback = 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
        return { ...prev, [videoId]: ultimateFallback };
      }
      return { ...prev, [videoId]: fallbackUrl };
    });
  };

  if (isLoading) {
    return (
      <div className={localIsFullscreen ? "fixed inset-0 z-[100] w-screen h-screen bg-[#050505] max-w-none overflow-hidden" : "relative w-full max-w-md mx-auto bg-[#050505] h-[100dvh] h-screen shadow-2xl overflow-hidden select-none"}>
        {/* Shimmer/Skeleton structure matching exactly the Live feed layout */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 animate-pulse">
          {/* Top category bar placeholder */}
          <div className="flex justify-center space-x-6 pt-4">
            <div className="h-4 bg-zinc-800 rounded-full w-14" />
            <div className="h-4 bg-zinc-800 rounded-full w-16" />
            <div className="h-4 bg-zinc-800 rounded-full w-12" />
          </div>

          {/* Center spinner overlay to maintain interactive load cue */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#FF5C00]/45 border-t-transparent animate-spin mb-4" />
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-mono tracking-widest text-[#FF5C00]/70 font-black">FIDFUD LIVE</p>
              <p className="text-xs font-black text-zinc-500 uppercase italic tracking-tight">CONNEXION AUX CHEFS EN DIRECT...</p>
            </div>
          </div>

          {/* Right sidebar actions placeholder (matching updated w-9 / h-9 circular icons) */}
          <div className="absolute right-2.5 bottom-14 z-20 flex flex-col items-center space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`sidebar-shimmer-${i}`} className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-zinc-800/60 border border-white/5" />
                <div className="h-2 bg-zinc-800/60 rounded w-6 mt-1.5" />
              </div>
            ))}
          </div>

          {/* Bottom metadata & CTA placeholder */}
          <div className="absolute bottom-0 left-0 right-0 pl-4 pr-16 pb-4 pt-20 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent z-10 space-y-3">
            {/* Restaurant Badge row */}
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <div className="w-5 h-5 rounded-full bg-zinc-800" />
              <div className="h-3 bg-zinc-800 rounded w-24" />
              <div className="h-4 bg-zinc-800 rounded-full w-12" />
              <div className="h-4 bg-zinc-800 rounded-full w-16" />
            </div>

            {/* Video caption lines */}
            <div className="space-y-1.5">
              <div className="h-3 bg-zinc-800 rounded w-5/6" />
              <div className="h-3 bg-zinc-800 rounded w-1/2" />
            </div>

            {/* Associated product drawer block (matching our updated compact p-2 structure) */}
            <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-2 flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <div className="w-8.5 h-8.5 rounded-lg bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="h-3 bg-zinc-800 rounded w-3/4" />
                  <div className="h-2.5 bg-zinc-800 rounded w-1/2" />
                  <div className="h-3 bg-zinc-800 rounded w-1/4 mt-1" />
                </div>
              </div>
              <div className="ml-2 w-24 h-8 bg-[#FF5C00]/20 border border-[#FF5C00]/15 rounded-lg shrink-0 animate-pulse" />
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
    <div className={localIsFullscreen ? "fixed inset-0 z-[100] w-screen h-screen bg-black max-w-none shadow-none overflow-hidden" : "relative w-full max-w-md lg:max-w-7xl mx-auto h-[100dvh] h-screen lg:h-[calc(100vh-140px)] shadow-2xl lg:shadow-none overflow-hidden flex lg:gap-6 select-none"}>
      
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
                          <img 
                            src={rest.logoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=50'} 
                            alt={rest.name} 
                            className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
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
      <div className={localIsFullscreen ? "w-full h-full relative" : "flex-1 h-full relative flex items-center justify-center bg-[#0B0B0C]"}>
        
        <div className={localIsFullscreen ? "w-full h-full relative" : "w-full h-full max-w-md lg:max-w-[410px] lg:h-[97%] lg:aspect-[9/16] relative bg-black rounded-none lg:rounded-[32px] overflow-hidden lg:border lg:border-white/10 lg:shadow-2xl flex flex-col animate-fade-in"}>
          
      {/* Flying Elements & Fireworks Floating Overlay */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden w-full h-full">
        {flyingElements.map(el => (
          <div 
            key={el.id}
            className="absolute bottom-24 text-3xl animate-float-up"
            style={{ left: `${el.x}%` }}
          >
            {el.icon}
          </div>
        ))}

        {fireworks.map(fw => (
          <div 
            key={fw.id}
            className="absolute"
            style={{ left: `${fw.x}%`, top: `${fw.y}%` }}
          >
            {fw.particles.map(p => (
              <div
                key={p.id}
                className="absolute animate-firework-particle flex items-center justify-center font-bold pointer-events-none"
                style={{
                  '--tx': `${p.tx}px`,
                  '--ty': `${p.ty}px`,
                  color: p.color,
                  fontSize: `${p.size}px`,
                  width: '20px',
                  height: '20px',
                  marginLeft: '-10px',
                  marginTop: '-10px',
                  textShadow: `0 0 6px ${p.color}`,
                } as React.CSSProperties}
              >
                {p.emoji || '•'}
              </div>
            ))}
          </div>
        ))}
      </div>

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

      {/* Main Snap-Scrolling Container */}
      <div 
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
        style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {feedVideos.map((video, index) => {
          const isLiked = !!likedVideos[video.id];
          const hasDish = !!video.associatedDish;
          const hasFallback = !!videoFallbackUrls[video.id];
          const embedInfo = hasFallback ? { type: 'none', embedUrl: null as any } : getMediaEmbed(video.videoUrl);
          const isEmbed = embedInfo.type !== 'none';
          const isLoaded = !!loadedVideos[video.id] || isEmbed;
          const isNearActive = Math.abs(index - activeVideoIndex) <= 1;

          const commentsCount = commentCounts[video.id] || 0;
          const isSubby = subscriptions.includes(video.restaurantId);

          return (
            <div 
              key={video.id}
              id={`video-container-${video.id}`}
              className="w-full h-full snap-start snap-always relative flex items-center justify-center bg-[#050505] overflow-hidden transition-all duration-500 ease-out hover:scale-[1.015] hover:shadow-[0_20px_50px_rgba(0,0,0,0.85)] group/card"
              style={localIsFullscreen ? { minHeight: '100vh', height: '100vh' } : { minHeight: '100%', height: '100%' }}
            >
              {/* Premium skeleton loading placeholder */}
              {(!isLoaded || !isNearActive) && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 text-zinc-400 p-6 text-center select-none">
                  <div className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-20" style={{ backgroundImage: `url(${video.associatedDish?.imageUrl || 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=300'})` }} />
                  <div className="relative z-10 space-y-4">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#FF5C00] border-t-transparent animate-spin mx-auto"></div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase font-mono tracking-widest text-[#FF5C00] font-black">FIDFUD LIVE</p>
                      <p className="text-sm font-black text-white uppercase italic tracking-tight">{video.associatedDish?.name || 'Le Chef cuisine en direct...'}</p>
                      <p className="text-[10px] text-zinc-500 font-sans">Chargement de la préparation culinaire...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* HTML5 Video or Embed Element */}
              {isNearActive && (
                isEmbed && embedInfo.embedUrl ? (
                   <div className="w-full h-full flex items-center justify-center bg-[#050505] p-1">
                    <iframe
                      src={embedInfo.embedUrl}
                      className="w-full h-full border-0 rounded-2xl max-w-[420px] shadow-2xl transition-all duration-500 group-hover/card:scale-102"
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                      style={{ height: 'calc(100% - 20px)' }}
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <video
                      ref={el => { videoRefs.current[video.id] = el; }}
                      src={videoFallbackUrls[video.id] || getSafeVideoUrl(video.videoUrl)}
                      loop={true}
                      playsInline
                      autoPlay
                      muted={isMuted}
                      preload="auto"
                      onCanPlay={() => handleVideoCanPlay(video.id)}
                      onLoadedData={() => handleVideoCanPlay(video.id)}
                      onPlay={() => {
                        handleVideoCanPlay(video.id);
                        setPausedVideos(prev => ({ ...prev, [video.id]: false }));
                      }}
                      onPlaying={() => {
                        handleVideoCanPlay(video.id);
                        setPausedVideos(prev => ({ ...prev, [video.id]: false }));
                      }}
                      onPause={() => {
                        setPausedVideos(prev => ({ ...prev, [video.id]: true }));
                      }}
                      onError={() => handleVideoError(video.id, video.videoUrl)}
                      onClick={() => handleVideoClick(video.id)}
                      onEnded={(e) => {
                        // Bulletproof loop fallback
                        e.currentTarget.currentTime = 0;
                        e.currentTarget.play().catch(err => console.warn('Failed to replay loop:', err));
                      }}
                      onTimeUpdate={(e) => {
                        if (index === activeVideoIndex) {
                          setActiveVideoTime(e.currentTarget.currentTime);
                          setActiveVideoDuration(e.currentTarget.duration || 1);
                        }
                      }}
                      onLoadedMetadata={(e) => {
                        if (index === activeVideoIndex) {
                          setActiveVideoDuration(e.currentTarget.duration || 1);
                        }
                      }}
                      className="w-full h-full object-cover cursor-pointer select-none transition-all duration-500 group-hover/card:scale-105 opacity-100"
                    />

                    {/* Subtle Fitfood Watermark Overlay */}
                    <div className="absolute top-4 right-4 z-30 pointer-events-none select-none flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/5 px-2.5 py-1 rounded-full shadow-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-100 font-sans">
                        Fit<span className="text-[#FF5C00]">food</span> Studio
                      </span>
                    </div>

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
                              className="w-full bg-gradient-to-r from-emerald-600 to-[#FF5C00] hover:opacity-90 text-zinc-950 py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer pointer-events-auto text-white shadow-lg shadow-[#FF5C00]/20"
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
                  </div>
                )
              )}

              {(() => {
                const videoRestaurant = restaurants.find(r => r.id === video.restaurantId);
                const isActive = index === activeVideoIndex;
                if (!isActive) return null;
                if (!showMarketingOverlays) return null;

                const availableOverlays: Array<{ type: 'promo' | 'countdown' | 'claim'; element: React.ReactNode }> = [];

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

                if (availableOverlays.length === 0) return null;

                const activeOverlay = availableOverlays[overlayCycleIndex % availableOverlays.length];
                return (
                  <div className={`absolute top-4 left-4 z-20 max-w-[calc(100%-120px)] transition-all duration-500 animate-fade-in ${isCinemaMode ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
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

              {/* Sidebar Action Overlays (Right Side) - Expanded to take up full vertical space */}
              <div 
                className={`absolute right-2.5 z-20 flex flex-col items-center justify-between transition-all duration-300 ${isCinemaMode ? 'opacity-0 pointer-events-none scale-90 translate-x-2' : 'opacity-100 scale-100 translate-x-0'} ${
                  localIsFullscreen 
                    ? 'top-[6%] bottom-[4%] py-2' 
                    : 'top-[95px] bottom-[72px] sm:bottom-[84px] py-3'
                }`}
                style={{ height: localIsFullscreen ? '88%' : 'calc(100% - 170px)', minHeight: '380px' }}
              >
                
                {/* 1. Combined Restaurant Avatar & Subscribe Hub - AT THE TOP */}
                {(() => {
                  const sidebarRest = restaurants.find(r => r.id === video.restaurantId);
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
                            
                            // Auto subscribe on click to make it extremely easy
                            if (!isSubby) {
                              handleSubscribe(video.restaurantId, e);
                            }
                          }}
                          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full p-0.5 cursor-pointer hover:scale-110 active:scale-95 transition-all flex items-center justify-center bg-black/60 shadow-xl ${
                            isSubby ? 'border border-zinc-500/60' : 'border-2 border-[#FF5C00] animate-pulse-orange-ring'
                          }`}
                          title="Accéder au menu & S'abonner"
                        >
                          <img 
                            src={sidebarRest.logoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=50'} 
                            alt={sidebarRest.name} 
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=50'; }}
                          />

                          {/* Floating Plus / Checkmark Badge */}
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
                        </div>
                        
                        <span className="text-[6.5px] sm:text-[7px] text-zinc-300 font-extrabold mt-0.5 sm:mt-1 font-sans tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase text-center max-w-[42px] sm:max-w-[50px] truncate leading-none">
                          {isSubby ? 'Abonné' : 'Rejoindre'}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

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

                {/* 3. Like Button (Float Animated) */}
                <div className="flex flex-col items-center animate-gentle-float-1 relative">
                  {/* Floating micro reaction indicators */}
                  {localLikes.map(like => (
                    <div
                      key={like.id}
                      className="absolute text-base font-bold animate-float-fade"
                      style={{
                        transform: `translate(${like.x}px, -${like.y}px)`,
                        pointerEvents: 'none',
                        zIndex: 50,
                      }}
                    >
                      {like.emoji}
                    </div>
                  ))}
                  <button 
                    onClick={(e) => handleLike(video.id, e)}
                    style={{ outline: 'none' }}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:scale-115 hover:shadow-[0_0_12px_rgba(255,48,64,0.4)] active:scale-90 transition-all shadow-lg hover:bg-black/70 cursor-pointer shrink-0"
                  >
                    <Heart size={17} className={isLiked ? 'text-[#FF3040] fill-[#FF3040] filter drop-shadow-[0_0_4px_rgba(255,48,64,0.6)]' : 'text-white'} />
                  </button>
                  <span className="text-[6.5px] sm:text-[7.5px] text-zinc-300 font-extrabold mt-0.5 font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase tracking-wider shrink-0">
                    {video.likesCount + (isLiked ? 1 : 0)}
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

                {/* 8. Fullscreen Toggle Button */}
                <div className="flex flex-col items-center">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalIsFullscreen(!localIsFullscreen);
                    }}
                    style={{ outline: 'none' }}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-lg hover:bg-black/70 cursor-pointer shrink-0"
                    title={localIsFullscreen ? "Quitter le plein écran" : "Plein écran"}
                  >
                    {localIsFullscreen ? <Minimize2 size={17} className="text-[#FF5C00]" /> : <Maximize2 size={17} className="text-white" />}
                  </button>
                  <span className="text-[6.5px] sm:text-[7.5px] text-zinc-300 font-extrabold mt-0.5 font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,1)] uppercase tracking-wider shrink-0">
                    {localIsFullscreen ? "Normal" : "Plein"}
                  </span>
                </div>
              </div>

              {/* Bottom Content Description & CTA Card Overlay */}
              <div className={`absolute left-0 right-0 pl-4 pr-16 pb-5 sm:pb-6 pt-20 bg-gradient-to-t from-black/95 via-black/45 to-transparent z-10 pointer-events-none transition-all duration-300 ${isCinemaMode ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'} ${
                localIsFullscreen ? 'bottom-0' : 'bottom-[56px] sm:bottom-[64px]'
              }`}>
                {/* 🛒 Clickable Trigger to show direct order popup on command */}
                {hasDish && (
                  <div className="flex items-center mb-1.5 pointer-events-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOrderPopup(prev => !prev);
                      }}
                      className="bg-gradient-to-r from-orange-500 to-[#FF5C00] hover:from-orange-600 hover:to-[#FF7A00] text-white text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/20 shadow-md flex items-center gap-1 cursor-pointer transition-all active:scale-95 animate-pulse-orange-ring"
                    >
                      <ShoppingCart size={9} />
                      <span>{showOrderPopup ? "Masquer Commande" : "🔥 COMMANDER DIRECTEMENT"}</span>
                    </button>
                  </div>
                )}

                {/* Restaurant Badge info */}
                <div className="flex items-center space-x-1.5 mb-2 flex-wrap gap-y-1 pointer-events-auto">
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
                              className="w-5 h-5 rounded-full object-cover border border-white/40 shadow-md shrink-0" 
                              onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=50'; }}
                            />
                          ) : (
                            <MapPin size={10} className="text-[#FF5C00]" />
                          )}
                          <span className="text-[11px] font-black text-white tracking-wide font-sans flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                            <span>{videoRestaurant?.name || video.restaurantName}</span>
                            {videoRestaurant?.isCertified && (
                              <span className="w-3 h-3 rounded-full bg-blue-500/90 text-white flex items-center justify-center text-[7px] font-black shrink-0 border border-white/20" title="Compte Certifié">✓</span>
                            )}
                          </span>
                        </div>

                        {(() => {
                          if (videoRestaurant) {
                            const dist = getDistance(videoRestaurant);
                            if (dist !== null) {
                              return (
                                <span className="text-[8px] bg-black/45 text-[#FF5C00] border border-white/10 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md font-mono">
                                  📍 {dist} km
                                </span>
                              );
                            }
                          }
                          return null;
                        })()}

                        {videoRestaurant?.subscriptionTier === 'gold' && (
                          <span className="text-[7px] bg-amber-500 text-zinc-950 font-black px-1.5 py-0.5 rounded tracking-wider flex items-center gap-0.5 shadow-sm" title="Partenaire Gold Fidfud">
                            👑 GOLD
                          </span>
                        )}
                        {videoRestaurant?.subscriptionTier === 'pro' && (
                          <span className="text-[7px] bg-white/10 text-white border border-white/20 font-extrabold px-1.5 py-0.5 rounded tracking-wider flex items-center gap-0.5 shadow-sm" title="Partenaire Pro Fidfud">
                            ⭐ PRO
                          </span>
                        )}
                      </>
                    );
                  })()}

                  {/* Follow/Subscribe Toggle Button - styled like "Suivre" in screenshot (thin white border, transparent bg) */}
                  <button
                    onClick={(e) => handleSubscribe(video.restaurantId, e)}
                    className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded-full transition-all flex items-center gap-0.5 cursor-pointer shadow-md ${
                      isSubby 
                        ? 'bg-white/10 text-zinc-300 border border-white/10 hover:bg-white/20' 
                        : 'bg-transparent text-white border border-white/50 hover:bg-white/10'
                    }`}
                  >
                    {isSubby ? (
                      <>
                        <Check size={8} className="stroke-[3]" />
                        <span>SUIVI</span>
                      </>
                    ) : (
                      <>
                        <Plus size={8} className="stroke-[3]" />
                        <span>SUIVRE</span>
                      </>
                    )}
                  </button>

                  <span className="text-[7.5px] bg-red-600/90 text-white font-extrabold px-1.5 py-0.5 rounded tracking-widest animate-pulse flex items-center gap-0.5 border border-white/10">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    LIVE SHOPPING
                  </span>
                </div>

                {/* Video Caption */}
                <div className="space-y-1 mb-2">
                  <p className="text-white text-[11px] font-semibold line-clamp-2 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.95)] leading-relaxed font-sans pointer-events-auto">
                    {video.title}
                  </p>
                  {video.isTooLong && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black tracking-wider uppercase text-amber-400 bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded-md drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] pointer-events-auto w-fit">
                      <AlertTriangle size={9} />
                      <span>Vidéo Trop Longue ({video.duration?.toFixed(0)}s)</span>
                    </span>
                  )}
                </div>

                {onSelectLiveVideo && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLiveVideo(video.id);
                    }}
                    className="mb-3 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all scale-100 hover:scale-102 active:scale-95 cursor-pointer pointer-events-auto flex items-center gap-1.5 shadow-lg shadow-red-900/30 w-fit"
                  >
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping shrink-0" />
                    <span>Rejoindre le Live 🔴</span>
                  </button>
                )}

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
                    className={`absolute left-3 right-14 z-35 animate-fade-in pointer-events-auto cursor-grab active:cursor-grabbing select-none transition-all duration-300 ${
                      localIsFullscreen 
                        ? 'bottom-[120px] sm:bottom-[135px]' 
                        : 'bottom-[180px] sm:bottom-[205px]'
                    }`}
                  >
                    <div className="bg-[#09090B]/95 backdrop-blur-xl border border-[#FF5C00]/40 rounded-xl p-2 sm:p-2.5 shadow-[0_4px_20px_rgba(255,92,0,0.2)] flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {video.associatedDish?.imageUrl ? (
                          <img 
                            src={video.associatedDish.imageUrl} 
                            alt="Plat" 
                            loading="lazy"
                            className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0" 
                            onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'; }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0">🍔</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="text-[7.5px] uppercase tracking-wider font-mono text-[#FF5C00] font-bold block">🔥 Commande Directe</span>
                          <h4 className="text-[10.5px] font-black uppercase tracking-tight text-white truncate leading-none">{video.associatedDish?.name}</h4>
                          <span className="text-[9.5px] font-mono text-[#FF5C00] font-black">{video.associatedDish?.price.toFixed(2)} €</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 pl-1.5 shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDish(video.associatedDishId!, 'order');
                          }}
                          className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white text-[8.5px] font-black tracking-wider uppercase px-2.5 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-1 cursor-pointer"
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



              {/* Space reservation for video feed bottom container */}
            </div>
          );
        })}
      </div>

      {/* OVERLAY PANEL: COMMENTS BOTTOM SHEET */}
      {isCommentsOpen && currentVideo && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-40 flex flex-col justify-end">
          <div className="absolute inset-0" onClick={() => setIsCommentsOpen(false)} />
          
          <div className="relative w-full h-[65%] bg-[#0D0D0E]/95 backdrop-blur-md border-t border-white/10 rounded-t-[24px] flex flex-col z-50 p-4">
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
                commentsList.map(cmt => (
                  <div key={cmt.id} className="text-xs bg-white/2 p-2.5 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-extrabold text-zinc-300">
                        {cmt.userEmail.split('@')[0]}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        {new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-zinc-200 leading-relaxed font-sans">{cmt.text}</p>
                  </div>
                ))
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
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-40 flex flex-col justify-end">
          <div className="absolute inset-0" onClick={() => setIsTipsOpen(false)} />
          
          <div className="relative w-full bg-[#0D0D0E]/95 backdrop-blur-md border-t border-white/10 rounded-t-[24px] flex flex-col z-50 p-4">
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
                  {ad.mediaUrl && (
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/40 border border-white/5">
                      {ad.mediaType === 'video' ? (
                        <video 
                          src={getSafeVideoUrl(ad.mediaUrl)} 
                          autoPlay 
                          loop 
                          muted 
                          playsInline 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.warn('[VideoFeed Sponsor] Ad video failed to load, falling back');
                            e.currentTarget.src = 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
                          }}
                        />
                      ) : (
                        <img 
                          src={ad.mediaUrl} 
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
                  <img 
                    src={videoRestaurant.logoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=50'} 
                    alt={videoRestaurant.name} 
                    className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
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
                <img 
                  src={currentVideo.associatedDish.imageUrl} 
                  alt={currentVideo.associatedDish.name} 
                  loading="lazy"
                  className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-[8px] bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/20 font-black px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                    COMMANDE EN DIRECT
                  </span>
                  <h4 className="text-white text-xs font-black uppercase tracking-tight truncate leading-tight">
                    {currentVideo.associatedDish.name}
                  </h4>
                  <p className="text-[#FF5A1F] text-xs font-black font-mono">
                    {currentVideo.associatedDish.price.toFixed(2)} €
                  </p>
                </div>
              </div>
              <p className="text-zinc-400 text-[10.5px] leading-relaxed font-sans line-clamp-2">
                {currentVideo.associatedDish.description || "Ingrédients frais sélectionnés par le chef pour une expérience gustative inoubliable."}
              </p>
              <button 
                onClick={() => onSelectDish(currentVideo.associatedDishId!, 'order')}
                className="w-full bg-[#FF5A1F] hover:bg-[#ff6c36] text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-white/10 font-sans"
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

    </div>
  );
}
