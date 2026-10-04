import React, { useState, useEffect, useRef } from 'react';
import LazyImage from './components/LazyImage';
import Header from './components/Header';
import VideoFeed from './components/VideoFeed';
import DishDrawer from './components/DishDrawer';
import Cart from './components/Cart';
import CheckoutModal from './components/CheckoutModal';
import AuthModal from './components/AuthModal';
import OrdersHistory from './components/OrdersHistory';
import MerchantDashboard from './components/MerchantDashboard';
import AdminCMS from './components/AdminCMS';
import SearchDrawer from './components/SearchDrawer';
import ProfileModal from './components/ProfileModal';
import CourierDashboard from './components/CourierDashboard';
import InteractiveFeatureModal from './components/InteractiveFeatureModal';
import BackgroundVideoPlayer from './components/BackgroundVideoPlayer';
import BackgroundVideoControls from './components/BackgroundVideoControls';
import WhatnotLiveMarket from './components/WhatnotLiveMarket';
import WhatnotLiveRoom from './components/WhatnotLiveRoom';
import DarkStreamingFeed from './components/DarkStreamingFeed';
import { Home } from './components/Home';
import { FitfoodIntroSplash } from './components/FitfoodIntroSplash';
import OfflineSyncBanner from './components/OfflineSyncBanner';
import OfflineDownloadsDrawer from './components/OfflineDownloadsDrawer';
import GoogleContactsModal from './components/GoogleContactsModal';
import DJAreaModal from './components/DJAreaModal';
import PromotionalPopupModal from './components/PromotionalPopupModal';
import CulinaryShowsModal from './components/CulinaryShowsModal';
import FoodYouTubersModal from './components/FoodYouTubersModal';
import RecipeSectionModal from './components/RecipeSectionModal';
import DownloadAppModal from './components/DownloadAppModal';
import FavoritesDrawer from './components/FavoritesDrawer';
import { SavesHistoryModal } from './components/SavesHistoryModal';
import TasteProfileModal from './components/TasteProfileModal';
import { offlineCacheService } from './services/OfflineCacheService';
import { Video, Restaurant, Dish, Order, CartItem, SupplementOption, FeedSortOrder, User } from './types';
import { AlertCircle, Trash2, X, ShieldAlert, Key, ChevronLeft, ChevronRight, Home as HomeIcon, Plus, LayoutGrid, Bell, User as UserIcon, Video as VideoIcon, Tv, Truck, Disc, Search, ShoppingBag, Sliders, MousePointer, ShieldCheck, Users, Save, History, RotateCcw, Clock, Check } from 'lucide-react';
import { getFirebaseAuth, getFirebaseDB, testConnection, isFirestoreQuotaExhausted, handleQuotaExhausted, safeGetDoc } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    const saved = localStorage.getItem('fidfud_design_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.enableSplash !== false;
      } catch (e) {}
    }
    return true;
  });
  const [currentRole, setCurrentRole] = useState<'client' | 'restaurant' | 'courier'>('client');
  
  // User Session & Auth States
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('fidfud_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'signup' | 'forgot_password'>('login');
  
  // Data States
  const [videos, setVideos] = useState<Video[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; message: string; title: string; type: 'info' | 'success' | 'warn' }[]>([]);
  
  // Cart & UI States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [activeLiveVideoId, setActiveLiveVideoId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<any | null>(null);
  const [dishDrawerTab, setDishDrawerTab] = useState<'order' | 'menu' | 'reviews' | 'reserve'>('order');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isOrdersHistoryOpen, setIsOrdersHistoryOpen] = useState<boolean>(false);
  const [isAdminCMSOpen, setIsAdminCMSOpen] = useState<boolean>(false);
  const [isSavesHistoryOpen, setIsSavesHistoryOpen] = useState<boolean>(false);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState<boolean>(true);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
  const [isInstantSaving, setIsInstantSaving] = useState<boolean>(false);
  const [instantSaveToast, setInstantSaveToast] = useState<string | null>(null);

  // Auto-Save background effect (runs every 60 seconds when enabled for admins)
  useEffect(() => {
    if (!isAutoSaveEnabled) return;
    const isAdmin = user?.role === 'admin';
    if (!isAdmin) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/backups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isAutoSave: true })
        });
        if (res.ok) {
          setLastAutoSaveTime(new Date());
        }
      } catch (e) {
        console.warn('Auto-save background check failed:', e);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isAutoSaveEnabled, user]);

  const handleInstantAdminSave = async () => {
    setIsInstantSaving(true);
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAutoSave: false,
          name: `💾 Sauvegarde Admin Bar (${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')})`
        })
      });
      if (res.ok) {
        setInstantSaveToast("💾 Sauvegarde de l'Admin effectuée avec succès (Historique 25 max) !");
        setTimeout(() => setInstantSaveToast(null), 3500);
      } else {
        alert("Erreur lors de la création de la sauvegarde.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau.");
    } finally {
      setIsInstantSaving(false);
    }
  };

  const [isContactsModalOpen, setIsContactsModalOpen] = useState<boolean>(false);
  const [isDJAreaOpen, setIsDJAreaOpen] = useState<boolean>(false);
  const [isCulinaryShowsOpen, setIsCulinaryShowsOpen] = useState<boolean>(false);
  const [isFoodYouTubersOpen, setIsFoodYouTubersOpen] = useState<boolean>(false);
  const [isRecipeSectionOpen, setIsRecipeSectionOpen] = useState<boolean>(false);
  const [recipeInitialCategory, setRecipeInitialCategory] = useState<string>('all');
  const [isOfflineDownloadsOpen, setIsOfflineDownloadsOpen] = useState<boolean>(false);
  const [isDownloadAppModalOpen, setIsDownloadAppModalOpen] = useState<boolean>(false);
  const [merchantTab, setMerchantTab] = useState<'menu' | 'videos' | 'orders' | 'stripe' | 'vitrine' | 'premium' | 'secu_portefeuille'>('orders');
  const [isAdminTabExpanded, setIsAdminTabExpanded] = useState<boolean>(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lifted Search & Location Overlay States
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isFavoritesDrawerOpen, setIsFavoritesDrawerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isProximityFirst, setIsProximityFirst] = useState<boolean>(false);
  const [feedSortOrder, setFeedSortOrder] = useState<FeedSortOrder>('recommended');
  const [isTasteProfileModalOpen, setIsTasteProfileModalOpen] = useState<boolean>(false);
  const [proximityRadius, setProximityRadius] = useState<number>(5);
  const [isFastLane, setIsFastLane] = useState<boolean>(false);
  const [maxPrepTimeMinutes, setMaxPrepTimeMinutes] = useState<number>(20);
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([]);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fidfud_autoplay_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  const handleToggleAutoPlay = () => {
    setIsAutoPlayEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('fidfud_autoplay_enabled', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleDetectLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur. Utilisation de Paris 11e (coeur Fidfud) par défaut ! 📍");
      setUserLocation({ lat: 48.8524, lng: 2.3705 });
      setIsProximityFirst(true);
      setFeedSortOrder('distance');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsProximityFirst(true);
        setFeedSortOrder('distance');
        setIsLocating(false);
      },
      (error) => {
        console.warn("Geolocation error:", error);
        alert("Permission refusée ou problème de localisation. Nous simulons Paris 11e (Voltaire / Charonne) pour faciliter vos tests de proximité ! 📍");
        setUserLocation({ lat: 48.8524, lng: 2.3705 });
        setIsProximityFirst(true);
        setFeedSortOrder('distance');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  };

  // Dynamic Design Customisation
  const [designSettings, setDesignSettings] = useState(() => {
    const saved = localStorage.getItem('fidfud_design_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return {
      accentColor: '#FF5C00',
      backgroundColor: '#050506',
      textColor: '#FFFFFF',
      appName: 'Fitfood',
      logoUrl: '',
      heroTitle: 'Vidéos Gourmandes, Livraison Instantanée.',
      promoMessage: '⚡ COMMANDEZ EN DIRECT DEPUIS LE FEED VIDÉO ! 50% DE RÉDUCTION SUR VOTRE PREMIER PANIER ⚡',
      borderRadius: '16px',
      bannerUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&auto=format&fit=crop&q=80',
      typography: 'sans', // 'sans' | 'mono' | 'serif' | 'display' or any Google Font family name
      layoutPreset: 'dark_streaming', // 'dark_streaming' | 'whatnot' | 'immersive' | 'bento' | 'editorial'
      engagementInterval: 20, // customizable engagement interval in seconds
      enableEngagementAnimations: true, // toggle booster prompts on the video feed
      enableFireworks: true, // toggle full-screen fireworks on video likes/tips
      sectionsVisible: {
        showHero: true,
        showFeaturedProducts: true,
        showChefSpotlight: true,
        showVideoFeed: true,
        showLoyaltyClubBanner: true
      },
      featuredDishIds: [], // holds dish IDs selected by user to feature
      customFeatures: {
        enableLoyaltyPoints: true,
        enableTipsAndFlowers: true,
        enableLiveOrdersHistory: true,
        enableStripeCommissionSplit: true,
        enableDeliveryCouriers: true,
        enableLeaderOfTheMonth: true
      },
      createdFeatures: [
        {
          id: 'feat-1',
          title: 'Retrait Express 🏃‍♂️',
          badge: 'PRATIQUE',
          description: 'Commandez en direct et retirez votre plat sans attente en restaurant.',
          icon: '⚡',
          cta: 'Activer'
        },
        {
          id: 'feat-2',
          title: 'Livraison Éco-Locale 🚴',
          badge: 'VERT',
          description: 'Livré exclusivement par nos livreurs à vélo pour un impact carbone neutre.',
          icon: '🌿',
          cta: 'En savoir plus'
        }
      ],
      logoSizeMobile: 34,
      logoSizeTablet: 40,
      logoSizeDesktop: 48,
      desktopBgType: 'color',
      desktopBgColor: '#050506',
      desktopBgImage: '',
      desktopBgVideo: '',
      desktopBgAdClickUrl: '',
      desktopBgAdTitle: '',
      mobileBgType: 'color',
      mobileBgColor: '#050506',
      mobileBgImage: '',
      mobileBgVideo: '',
      mobileBgAdClickUrl: '',
      mobileBgAdTitle: '',
      autoSaveEnabled: false
    };
  });

  // State hooks for background video playback controls
  const [bgVideoPlaying, setBgVideoPlaying] = useState<boolean>(true);
  const [bgVideoMuted, setBgVideoMuted] = useState<boolean>(true);

  const handleUpdateDesignSettings = async (updated: Partial<any>) => {
    setDesignSettings(prev => {
      const newSettings = { ...prev, ...updated };
      localStorage.setItem('fidfud_design_settings', JSON.stringify(newSettings));
      
      // Always persist to server immediately so design settings and colors never revert
      fetch('/api/design-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      }).catch(err => console.warn('Failed to save design settings:', err));

      return newSettings;
    });
  };

  const handleSaveDesignSettings = async (settingsToSave = designSettings) => {
    try {
      const res = await fetch('/api/design-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.designSettings) {
          setDesignSettings(data.designSettings);
          localStorage.setItem('fidfud_design_settings', JSON.stringify(data.designSettings));
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Error saving design settings:', err);
      return false;
    }
  };

  // Switch Restaurant Basket Conflict Dialog
  const [conflictItem, setConflictItem] = useState<{ dish: Dish; quantity: number } | null>(null);

  // Auto-hide bottom navigation bar on scroll, reappear when scroll stops or on tap/idle
  const [isBottomNavVisible, setIsBottomNavVisible] = useState<boolean>(true);
  const hideNavTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Disappear on scroll up or down
      setIsBottomNavVisible(false);
      if (hideNavTimeoutRef.current) clearTimeout(hideNavTimeoutRef.current);
      // Reappear when scrolling stops (800ms idle)
      hideNavTimeoutRef.current = setTimeout(() => {
        setIsBottomNavVisible(true);
      }, 800);
    };

    const handleUserInteraction = () => {
      setIsBottomNavVisible(true);
      if (hideNavTimeoutRef.current) clearTimeout(hideNavTimeoutRef.current);
      hideNavTimeoutRef.current = setTimeout(() => {
        setIsBottomNavVisible(true);
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    window.addEventListener('mousemove', handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('mousemove', handleUserInteraction);
      if (hideNavTimeoutRef.current) clearTimeout(hideNavTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleNotify = (e: any) => {
      if (e.detail) {
        const { title, message, type } = e.detail;
        addNotification(title, message, type || 'info');
      }
    };
    window.addEventListener('fidfud-notify', handleNotify as EventListener);
    return () => window.removeEventListener('fidfud-notify', handleNotify as EventListener);
  }, []);

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, title, message, type }]);
    
    // Play a gentle audio sound for food order notification
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
      
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.25);
      }, 150);
    } catch (e) {
      // AudioContext not supported or gesture-locked
    }

    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const checkOrderStatusChanges = (oldOrders: Order[], newOrders: Order[]) => {
    newOrders.forEach(newOrd => {
      const oldOrd = oldOrders.find(o => o.id === newOrd.id);
      if (oldOrd && oldOrd.status !== newOrd.status) {
        let statusMessage = '';
        const title = `Commande #${newOrd.id.substring(newOrd.id.length - 4).toUpperCase()}`;
        
        switch (newOrd.status) {
          case 'preparing':
            statusMessage = `Votre commande chez ${newOrd.restaurantName || 'votre restaurant'} est maintenant en préparation en cuisine ! 🍳`;
            break;
          case 'ready':
            statusMessage = newOrd.deliveryType === 'click_and_collect' 
              ? `Bonne nouvelle ! Votre commande chez ${newOrd.restaurantName || 'votre restaurant'} est prête à être récupérée en Click & Collect ! 🏃‍♂️`
              : `Génial ! Votre livreur a récupéré votre commande chez ${newOrd.restaurantName || 'votre restaurant'} et est en route ! 🛵`;
            break;
          case 'delivered':
            statusMessage = `Votre commande chez ${newOrd.restaurantName || 'votre restaurant'} a bien été livrée ! Bon appétit ! 🌟`;
            break;
          case 'cancelled':
            statusMessage = `Malheureusement, votre commande chez ${newOrd.restaurantName || 'votre restaurant'} a été annulée.`;
            break;
          default:
            statusMessage = `Le statut de votre commande est désormais : ${newOrd.status}.`;
        }

        addNotification(title, statusMessage, newOrd.status === 'cancelled' ? 'warn' : 'success');
      }
    });
  };

  // Fetch current user session with Firebase Authentication token
  const fetchSession = async () => {
    try {
      const auth = getFirebaseAuth();
      let token = '';
      if (auth?.currentUser) {
        token = await auth.currentUser.getIdToken().catch(() => '');
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (user?.id) {
        headers['x-user-id'] = user.id;
      }

      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data && data.user) {
            setUser(data.user);
            try {
              localStorage.setItem('fidfud_user', JSON.stringify(data.user));
            } catch {}
          }
        } catch (jsonErr) {
          console.warn('Non-JSON response from /api/auth/me:', jsonErr);
        }
      }
    } catch (err: any) {
      console.warn('[Fidfud Session] Session not loaded:', err?.message || err);
    }
  };

  // Fetch complete Fidfud state from server
  const refreshAllData = async (skipSession = true) => {
    try {
      // 0. Fetch user session
      if (!skipSession) {
        await fetchSession();
      }

      // 1. Fetch Videos (all videos for management & feed)
      let currentFeed: Video[] = [];
      try {
        const videoRes = await fetch('/api/videos');
        if (videoRes.ok) {
          const text = await videoRes.text();
          currentFeed = JSON.parse(text) || [];
          const rawFeed = currentFeed || [];
          const uniqueFeed = Array.from(new Map(rawFeed.map((v: Video) => [v.id, v])).values()) as Video[];
          setVideos(uniqueFeed);
          offlineCacheService.saveVideos(uniqueFeed);
        } else {
          const feedRes = await fetch('/api/feed');
          if (feedRes.ok) {
            const text = await feedRes.text();
            const rawFeed = (JSON.parse(text) || []) as Video[];
            const uniqueFeed = Array.from(new Map(rawFeed.map((v: Video) => [v.id, v])).values()) as Video[];
            setVideos(uniqueFeed);
            offlineCacheService.saveVideos(uniqueFeed);
          }
        }
      } catch {
        const cached = await offlineCacheService.getCachedVideos();
        if (cached && cached.length > 0) {
          const uniqueCached = Array.from(new Map(cached.map((v: Video) => [v.id, v])).values()) as Video[];
          setVideos(uniqueCached);
        }
      }

      // 2. Fetch Restaurants & Dishes
      try {
        const restRes = await fetch('/api/restaurants');
        if (restRes.ok) {
          const text = await restRes.text();
          const restData = (JSON.parse(text) || []) as Restaurant[];
          const uniqueRestaurants = Array.from(new Map(restData.map((r: Restaurant) => [r.id, r])).values()) as Restaurant[];
          setRestaurants(uniqueRestaurants);
          offlineCacheService.saveRestaurants(uniqueRestaurants);

          // Fetch all dishes for all restaurants in parallel
          const dishesPromises = uniqueRestaurants.map((r: Restaurant) => 
            fetch(`/api/restaurants/${r.id}/dishes`)
              .then(async res => res.ok ? JSON.parse(await res.text()) : [])
              .catch(() => [])
          );
          const dishesLists = await Promise.all(dishesPromises);
          const flattenedDishes = dishesLists.flat() as Dish[];
          const uniqueDishes = Array.from(new Map(flattenedDishes.map((d: Dish) => [d.id, d])).values()) as Dish[];
          setAllDishes(uniqueDishes);
          offlineCacheService.saveDishes(uniqueDishes);
        } else {
          throw new Error('Restaurant response not ok');
        }
      } catch {
        const cachedR = await offlineCacheService.getCachedRestaurants();
        const cachedD = await offlineCacheService.getCachedDishes();
        if (cachedR && cachedR.length > 0) {
          setRestaurants(Array.from(new Map(cachedR.map((r: Restaurant) => [r.id, r])).values()) as Restaurant[]);
        }
        if (cachedD && cachedD.length > 0) {
          setAllDishes(Array.from(new Map(cachedD.map((d: Dish) => [d.id, d])).values()) as Dish[]);
        }
      }

      // 3. Fetch orders
      const ordersRes = await fetch('/api/orders');
      if (ordersRes.ok) {
        const text = await ordersRes.text();
        try {
          const ordersData = JSON.parse(text);
          if (orders.length > 0) {
            checkOrderStatusChanges(orders, ordersData);
          }
          setOrders(ordersData || []);
        } catch (jsonErr) {
          console.warn('Non-JSON response from /api/orders:', jsonErr);
        }
      }

      // 4. Fetch design settings
      const designRes = await fetch('/api/design-settings');
      if (designRes.ok) {
        try {
          const designData = await designRes.json();
          if (designData) {
            setDesignSettings(prev => ({ ...prev, ...designData }));
          }
        } catch (err) {
          console.warn('Failed to parse design settings:', err);
        }
      }
    } catch (err: any) {
      console.warn('[Fidfud Sync] State synchronization delayed (offline/sandbox boot):', err?.message || err);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  // Dedicated lightweight orders status poller for order tracker updates
  const pollOrdersOnly = async () => {
    try {
      const ordersRes = await fetch('/api/orders');
      if (ordersRes.ok) {
        const text = await ordersRes.text();
        try {
          const ordersData = JSON.parse(text);
          setOrders(prevOrders => {
            if (prevOrders.length > 0) {
              checkOrderStatusChanges(prevOrders, ordersData);
            }
            return ordersData || [];
          });
        } catch {
          // Ignore parse errors from non-JSON responses under rate-limiting
        }
      }
    } catch {
      // Ignore background fetch errors
    }
  };

  // Initial load & Firebase Auth state synchronization
  useEffect(() => {
    testConnection();
    refreshAllData();

    const auth = getFirebaseAuth();
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const db = getFirebaseDB();
            if (db && !isFirestoreQuotaExhausted()) {
              const uDoc = await safeGetDoc(doc(db, 'users', firebaseUser.uid));
              if (uDoc && uDoc.exists()) {
                const uData = uDoc.data();
                const resolvedUser: User = {
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || uData.email,
                  role: uData.role === 'admin' ? 'admin' : (uData.role || 'client'),
                  fullName: uData.fullName || firebaseUser.displayName || '',
                  phone: uData.phone || '',
                  address: uData.address || '',
                  siret: uData.siret || '',
                  restaurantName: uData.restaurantName || '',
                  cuisineType: uData.cuisineType || '',
                  vehicle: uData.vehicle || '',
                  zone: uData.zone || '',
                  verificationStatus: uData.verificationStatus || 'verified',
                  createdAt: uData.createdAt,
                  updatedAt: uData.updatedAt
                };
                setUser(resolvedUser);
                try {
                  localStorage.setItem('fidfud_user', JSON.stringify(resolvedUser));
                } catch {}
                return;
              }
            }
          } catch (e: any) {
            console.warn('[Firebase Auth State] Notice fetching user doc:', e?.message || e);
          }
          await fetchSession();
        } else {
          // If Firebase Auth confirms no user is logged in, invalidate any unverified localStorage cache
          setUser(null);
          try {
            localStorage.removeItem('fidfud_user');
          } catch {}
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // Handle URL admin query parameter securely (only open CMS if logged in as admin)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      if (user?.role === 'admin') {
        setIsAdminCMSOpen(true);
      } else if (!user) {
        setIsAuthOpen(true);
      }
    }
  }, [user]);

  // Periodic automatic polling to achieve "real-time updates" for both orders tracker & clients
  useEffect(() => {
    // 1. Poll orders frequently (every 8 seconds) for state/status changes
    const ordersInterval = setInterval(() => {
      pollOrdersOnly();
    }, 8000);

    // 2. Poll full data (feed, restaurants, dishes) less frequently (every 32 seconds) to avoid rate limits
    const fullDataInterval = setInterval(() => {
      refreshAllData(true);
    }, 32000);

    return () => {
      clearInterval(ordersInterval);
      clearInterval(fullDataInterval);
    };
  }, []);

  const handleSelectDish = (dishId: string, tab?: 'order' | 'menu' | 'reviews' | 'reserve') => {
    setSelectedDishId(dishId);
    if (tab) {
      setDishDrawerTab(tab);
    } else {
      setDishDrawerTab('order');
    }
  };

  // Add Item to cart with single restaurant boundary validation
  const handleAddToCart = (dish: Dish, quantity: number, selectedSupplements?: SupplementOption[]) => {
    const restaurant = restaurants.find(r => r.id === dish.restaurantId);
    const restaurantName = restaurant ? restaurant.name : 'Restaurant';

    // If basket already contains items, check if it belongs to same restaurant
    if (cart.length > 0 && cart[0].restaurantId !== dish.restaurantId) {
      // Basket Conflict! Store conflict item to trigger confirmation drawer
      setConflictItem({ dish, quantity });
      addNotification("⚠️ RESTAURANT DIFFÉRENT", `1 seul restaurant par commande ! Votre panier contient déjà des plats de "${cart[0].restaurantName || 'un autre restaurant'}".`, "warn");
      
      // Dispatch custom cart-shake event to trigger visual error vibration & boundary alert on all cart icons
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fidfud:cart-shake', { 
          detail: { 
            dish, 
            quantity, 
            currentRestaurant: cart[0].restaurantName,
            attemptedRestaurant: restaurantName 
          } 
        }));
      }
      return;
    }

    // Otherwise, add directly
    setCart(prev => {
      const suppKey = JSON.stringify(selectedSupplements || []);
      const existingIdx = prev.findIndex(item => 
        item.dish.id === dish.id && 
        JSON.stringify(item.selectedSupplements || []) === suppKey
      );

      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      } else {
        return [...prev, { dish, quantity, restaurantId: dish.restaurantId, restaurantName, selectedSupplements: selectedSupplements || [] }];
      }
    });

    const suppCount = selectedSupplements && selectedSupplements.length > 0 ? ` (+${selectedSupplements.length} suppléments)` : '';
    addNotification("🛒 PLAT AJOUTÉ AU PANIER", `${quantity}x ${dish.name}${suppCount} ajouté(s) au panier avec succès !`, "success");

    // Trigger smooth scale & bounce animation on Header cart icon
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fidfud:cart-add', { detail: { dish, quantity } }));
    }
  };

  // Resolve conflict by resetting cart and adding new restaurant item
  const handleResolveConflict = () => {
    if (conflictItem) {
      const { dish, quantity } = conflictItem;
      const restaurant = restaurants.find(r => r.id === dish.restaurantId);
      const restaurantName = restaurant ? restaurant.name : 'Restaurant';

      setCart([{ dish, quantity, restaurantId: dish.restaurantId, restaurantName }]);
      setConflictItem(null);
      setSelectedDishId(null);
      setIsCartOpen(true);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fidfud:cart-add', { detail: { dish, quantity } }));
      }
    }
  };

  const handleUpdateCartQuantity = (dishId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.dish.id === dishId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const handleRemoveCartItem = (dishId: string) => {
    setCart(prev => prev.filter(item => item.dish.id !== dishId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleAuthSuccess = (authUser: User) => {
    setUser(authUser);
    try {
      localStorage.setItem('fidfud_user', JSON.stringify(authUser));
    } catch {}
    // Automatically switch view modes depending on user role for fluid UX
    if (authUser.role === 'restaurant') {
      setCurrentRole('restaurant');
    } else if (authUser.role === 'courier') {
      setCurrentRole('courier');
    } else {
      setCurrentRole('client');
    }
    if (authUser.role === 'admin') {
      setIsAdminCMSOpen(true);
    }
    refreshAllData();
  };

  const handleLogout = async () => {
    try {
      const auth = getFirebaseAuth();
      if (auth) {
        await signOut(auth);
      }
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    try {
      localStorage.removeItem('fidfud_user');
    } catch {}
    setUser(null);
    setCurrentRole('client');
    setCart([]); // Clear cart to prevent cross-account leakage
    refreshAllData();
  };

  const handleOrderCompleted = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
  };

  // Compute selected dish info for drawer
  const activeDish = allDishes.find(d => d.id === selectedDishId);
  const activeDishRestaurant = activeDish ? restaurants.find(r => r.id === activeDish.restaurantId) : null;

  // Responsive full-screen background helper
  const renderBg = (
    type: 'color' | 'image' | 'video' | 'ad',
    color: string,
    image?: string,
    video?: string,
    adClickUrl?: string,
    adTitle?: string
  ) => {
    const isAd = type === 'ad';
    const hasLink = isAd && adClickUrl;

    const bgContent = (
      <div className="w-full h-full absolute inset-0">
        {/* Background color as fallback base */}
        <div className="absolute inset-0 transition-colors duration-500" style={{ backgroundColor: color || '#050506' }} />

        {/* Background Image or GIF */}
        {(type === 'image' || type === 'ad') && Boolean(image?.trim()) && (
          <img
            src={image.trim()}
            alt="Background"
            loading="lazy"
            className="w-full h-full object-cover absolute inset-0 opacity-85 transition-opacity duration-500"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Background Video */}
        {type === 'video' && Boolean(video?.trim()) && (
          <BackgroundVideoPlayer
            src={video.trim()}
            isPlaying={bgVideoPlaying}
            isMuted={bgVideoMuted}
            className="w-full h-full object-cover absolute inset-0 opacity-80 transition-opacity duration-500"
          />
        )}

        {/* Ad Badge indicator overlay if it is an advertisement */}
        {isAd && (
          <div className="absolute bottom-6 right-6 z-20 bg-amber-500 text-zinc-950 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest font-mono shadow-xl flex items-center gap-1.5 border border-amber-400 hover:scale-105 active:scale-95 transition-transform pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Sponsorisé {adTitle ? `: ${adTitle}` : ''}</span>
          </div>
        )}
      </div>
    );

    if (hasLink) {
      return (
        <a
          href={adClickUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-full block cursor-pointer pointer-events-auto"
          title={adTitle || "Visiter notre sponsor"}
        >
          {bgContent}
        </a>
      );
    }

    return bgContent;
  };

  // Typography helper
  const getTypographyClass = () => {
    switch (designSettings.typography) {
      case 'mono': return 'font-mono';
      case 'serif': return 'font-serif';
      case 'display': return 'font-display';
      case 'sans': return 'font-sans';
      default: return ''; // Will use dynamically loaded Google Font
    }
  };

  const accentColor = designSettings.accentColor || '#FF5C00';

  const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 92, 0';
  };

  const rgbAccent = hexToRgb(accentColor);

  // Client-facing filtered sets ensuring unpublished or untracked restaurants are cleanly handled
  const clientRestaurants = restaurants.filter(r => r.isPublished !== false);
  const clientVideos = videos.filter(v => {
    if (!v.restaurantId) return true;
    const r = restaurants.find(rest => rest.id === v.restaurantId);
    if (r && r.isPublished === false) return false;
    return true;
  });
  const clientDishes = allDishes.filter(d => {
    if (!d.restaurantId) return true;
    const r = restaurants.find(rest => rest.id === d.restaurantId);
    if (r && r.isPublished === false) return false;
    return true;
  });

  return (
    <div 
      className={`min-h-screen w-full overflow-x-hidden flex flex-col select-none antialiased transition-all duration-300 ${getTypographyClass()}`}
      style={{ 
        backgroundColor: designSettings.backgroundColor || '#050506',
        color: designSettings.textColor || '#FFFFFF',
        fontFamily: designSettings.typography && !['sans', 'mono', 'serif', 'display'].includes(designSettings.typography) ? `"${designSettings.typography}", sans-serif` : undefined
      }}
    >
      {showSplash && (
        <FitfoodIntroSplash onComplete={() => setShowSplash(false)} appName={designSettings.appName} designSettings={designSettings} />
      )}
      {/* Dynamic Style injection for real-time CSS overrides */}
      <style>{`
        ${designSettings.typography && !['sans', 'mono', 'serif', 'display'].includes(designSettings.typography) ? `
          @import url('https://fonts.googleapis.com/css2?family=${designSettings.typography.replace(/ /g, '+')}:wght@300;400;500;700;900&display=swap');
          
          body, html, #root, .font-sans, .font-serif, .font-display, .font-mono {
            font-family: "${designSettings.typography}", sans-serif !important;
          }
        ` : ''}
        :root {
          --primary-accent: ${accentColor};
          --primary-accent-rgb: ${rgbAccent};
          --border-radius-custom: ${designSettings.borderRadius || '16px'};
        }
        .text-accent {
          color: ${accentColor} !important;
        }
        .bg-accent {
          background-color: ${accentColor} !important;
        }
        .border-accent {
          border-color: ${accentColor} !important;
        }
        .custom-rounded {
          border-radius: ${designSettings.borderRadius || '16px'} !important;
        }

        /* DYNAMIC OVERRIDES OF DEFAULT FIDFUD ORANGE SO CHROME CUSTOMIZATION PROPAGATES EVERYWHERE */
        .bg-\[\#FF5C00\] {
          background-color: ${accentColor} !important;
        }
        .text-\[\#FF5C00\] {
          color: ${accentColor} !important;
        }
        .border-\[\#FF5C00\] {
          border-color: ${accentColor} !important;
        }
        .hover\:bg-\[\#FF7A00\]:hover {
          background-color: ${accentColor}f2 !important;
        }
        .hover\:text-\[\#FF5C00\]:hover {
          color: ${accentColor} !important;
        }
        .from-\[\#FF5C00\] {
          --tw-gradient-from: ${accentColor} !important;
          --tw-gradient-to: ${accentColor}cc !important;
          --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
        }
        .to-\[\#FF5C00\] {
          --tw-gradient-to: ${accentColor} !important;
        }
        .bg-\[\#FF5C00\]\/5 {
          background-color: rgba(${rgbAccent}, 0.05) !important;
        }
        .bg-\[\#FF5C00\]\/10 {
          background-color: rgba(${rgbAccent}, 0.1) !important;
        }
        .bg-\[\#FF5C00\]\/15 {
          background-color: rgba(${rgbAccent}, 0.15) !important;
        }
        .bg-\[\#FF5C00\]\/20 {
          background-color: rgba(${rgbAccent}, 0.2) !important;
        }
        .bg-\[\#FF5C00\]\/25 {
          background-color: rgba(${rgbAccent}, 0.25) !important;
        }
        .bg-\[\#FF5C00\]\/30 {
          background-color: rgba(${rgbAccent}, 0.3) !important;
        }
        .bg-\[\#FF5C00\]\/40 {
          background-color: rgba(${rgbAccent}, 0.4) !important;
        }
        .bg-\[\#FF5C00\]\/45 {
          background-color: rgba(${rgbAccent}, 0.45) !important;
        }
        .bg-\[\#FF5C00\]\/50 {
          background-color: rgba(${rgbAccent}, 0.5) !important;
        }
        .bg-\[\#FF5C00\]\/70 {
          background-color: rgba(${rgbAccent}, 0.7) !important;
        }
        .bg-\[\#FF5C00\]\/80 {
          background-color: rgba(${rgbAccent}, 0.8) !important;
        }
        .bg-\[\#FF5C00\]\/90 {
          background-color: rgba(${rgbAccent}, 0.9) !important;
        }
        .bg-\[\#FF5C00\]\/95 {
          background-color: rgba(${rgbAccent}, 0.95) !important;
        }
        .border-\[\#FF5C00\]\/40 {
          border-color: rgba(${rgbAccent}, 0.4) !important;
        }
        .border-\[\#FF5C00\]\/30 {
          border-color: rgba(${rgbAccent}, 0.3) !important;
        }
        .hover\:border-\[\#FF5C00\]\/40:hover {
          border-color: rgba(${rgbAccent}, 0.4) !important;
        }
        .text-\[\#FF5C00\]\/90 {
          color: rgba(${rgbAccent}, 0.9) !important;
        }
        .shadow-\[\#FF5C00\]\/40 {
          --tw-shadow-color: rgba(${rgbAccent}, 0.4) !important;
          --tw-shadow: var(--tw-shadow-style, 0 10px 15px -3px) var(--tw-shadow-color) !important;
        }
        .shadow-\[\#FF5C00\]\/50 {
          --tw-shadow-color: rgba(${rgbAccent}, 0.5) !important;
        }

        /* Hover states for interactive triggers and utility buttons */
        .hover\:bg-\[\#FF5C00\]\/10:hover {
          background-color: rgba(${rgbAccent}, 0.1) !important;
        }
        .hover\:bg-\[\#FF5C00\]\/15:hover {
          background-color: rgba(${rgbAccent}, 0.15) !important;
        }
        .hover\:bg-\[\#FF5C00\]\/25:hover {
          background-color: rgba(${rgbAccent}, 0.25) !important;
        }
        .hover\:border-\[\#FF5C00\]\/30:hover {
          border-color: rgba(${rgbAccent}, 0.3) !important;
        }
        .border-\[\#FF5C00\]\/15 {
          border-color: rgba(${rgbAccent}, 0.15) !important;
        }
        .border-\[\#FF5C00\]\/20 {
          border-color: rgba(${rgbAccent}, 0.2) !important;
        }
        .border-\[\#FF5C00\]\/45 {
          border-color: rgba(${rgbAccent}, 0.45) !important;
        }
        .focus\:border-\[\#FF5C00\]:focus {
          border-color: ${accentColor} !important;
        }
        .focus\:border-\[\#FF5C00\]\/80:focus {
          border-color: rgba(${rgbAccent}, 0.8) !important;
        }
        .text-\[\#FF5C00\]\/70 {
          color: rgba(${rgbAccent}, 0.7) !important;
        }
        .shadow-\[0_4px_12px_rgba\(255\,92\,0\,0\.4\)\] {
          box-shadow: 0 4px 12px rgba(${rgbAccent}, 0.4) !important;
        }
        .shadow-\[0_4px_20px_rgba\(255\,92\,0\,0\.2\)\] {
          box-shadow: 0 4px 20px rgba(${rgbAccent}, 0.2) !important;
        }
        .shadow-\[0_0_8px_rgba\(255\,92\,0\,0\.4\)\] {
          box-shadow: 0 0 8px rgba(${rgbAccent}, 0.4) !important;
        }
        .shadow-\[0_10px_20px_rgba\(255\,92\,0\,0\.15\)\] {
          box-shadow: 0 10px 20px rgba(${rgbAccent}, 0.15) !important;
        }
        .shadow-\[0_0_8px_rgba\(255\,92\,0\,0\.5\)\] {
          box-shadow: 0 0 8px rgba(${rgbAccent}, 0.5) !important;
        }

        :root {
          --logo-size-mobile: ${designSettings.logoSizeMobile || 34}px;
          --logo-size-tablet: ${designSettings.logoSizeTablet || 40}px;
          --logo-size-desktop: ${designSettings.logoSizeDesktop || 48}px;
        }
        .responsive-logo-size {
          width: var(--logo-size-mobile) !important;
          height: var(--logo-size-mobile) !important;
        }
        @media (min-width: 640px) {
          .responsive-logo-size {
            width: var(--logo-size-tablet) !important;
            height: var(--logo-size-tablet) !important;
          }
        }
        @media (min-width: 1024px) {
          .responsive-logo-size {
            width: var(--logo-size-desktop) !important;
            height: var(--logo-size-desktop) !important;
          }
        }
        @keyframes floatFade {
          0% {
            transform: translate(0, 0) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: 1;
            transform: translate(var(--tx, -15px), -10px) scale(1.1);
          }
          100% {
            transform: translate(var(--tx, -30px), -65px) scale(0.85);
            opacity: 0;
          }
        }
        .animate-float-fade {
          animation: floatFade 0.8s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }
      `}</style>

      {user === null ? (
        <Home
          videos={clientVideos}
          restaurants={clientRestaurants}
          dishes={clientDishes}
          onOpenAuth={(mode) => {
            setAuthModalInitialMode(mode || 'login');
            setIsAuthOpen(true);
          }}
          accentColor={accentColor}
          designSettings={designSettings}
        />
      ) : (
        <>
          {/* Dynamic Responsive Full-Screen Background Engine */}
      <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden select-none pointer-events-auto">
        {/* Computer (Desktop / Laptop) Background */}
        <div className="hidden lg:block w-full h-full relative">
          {renderBg(
            designSettings.desktopBgType || 'color',
            designSettings.desktopBgColor || designSettings.backgroundColor || '#050506',
            designSettings.desktopBgImage,
            designSettings.desktopBgVideo,
            designSettings.desktopBgAdClickUrl,
            designSettings.desktopBgAdTitle
          )}
        </div>

        {/* Mobile & Tablet Background */}
        <div className="block lg:hidden w-full h-full relative">
          {renderBg(
            designSettings.mobileBgType || 'color',
            designSettings.mobileBgColor || designSettings.backgroundColor || '#050506',
            designSettings.mobileBgImage,
            designSettings.mobileBgVideo,
            designSettings.mobileBgAdClickUrl,
            designSettings.mobileBgAdTitle
          )}
        </div>
      </div>

      {/* Floating Background Video Playback Controls */}
      <BackgroundVideoControls
        isPlaying={bgVideoPlaying}
        isMuted={bgVideoMuted}
        onTogglePlay={() => setBgVideoPlaying(prev => !prev)}
        onToggleMute={() => setBgVideoMuted(prev => !prev)}
        desktopBgType={designSettings.desktopBgType || 'color'}
        mobileBgType={designSettings.mobileBgType || 'color'}
      />
      
      {/* Offline Data Sync Status Banner */}
      <OfflineSyncBanner onOpenOfflineDownloads={() => setIsOfflineDownloadsOpen(true)} />

      {/* Master Top Navigation Bar - Render when not using embedded Dark Streaming Header */}
      {!(currentRole === 'client' && !activeLiveVideoId && (designSettings.layoutPreset === 'dark_streaming' || !designSettings.layoutPreset)) && (
        <Header
          currentRole={currentRole}
          onChangeRole={(role) => {
            setCurrentRole(role);
            if (role === 'client') {
              setActiveLiveVideoId(null);
            }
          }}
          cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
          onOpenCart={() => setIsCartOpen(true)}
          activeOrderCount={orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length}
          onOpenOrdersHistory={() => setIsOrdersHistoryOpen(true)}
          user={user}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          onOpenAdmin={() => setIsAdminCMSOpen(true)}
          onOpenSearch={() => setIsSearchDrawerOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          searchQuery={searchQuery}
          onSearchQueryChange={(query) => setSearchQuery(query)}
          designSettings={designSettings}
          onUpdateDesignSettings={handleUpdateDesignSettings}
          userLocation={userLocation}
          onDetectLocation={handleDetectLocation}
          isLocating={isLocating}
          onOpenContacts={() => setIsContactsModalOpen(true)}
          onOpenDJArea={() => setIsDJAreaOpen(true)}
          onOpenShows={() => setIsCulinaryShowsOpen(true)}
          onOpenYouTubers={() => setIsFoodYouTubersOpen(true)}
          onOpenRecipes={() => {
            setRecipeInitialCategory('all');
            setIsRecipeSectionOpen(true);
          }}
          onOpenDownloadApp={() => setIsDownloadAppModalOpen(true)}
          onOpenFavorites={() => setIsFavoritesDrawerOpen(true)}
        />
      )}

      {/* Main Dynamic View Content */}
      <main className="flex-1 w-full overflow-x-hidden p-0">
        {currentRole === 'client' ? (
          activeLiveVideoId ? (
            <WhatnotLiveRoom
              video={clientVideos.find(v => v.id === activeLiveVideoId) || clientVideos[0]}
              restaurants={clientRestaurants}
              dishes={clientDishes}
              user={user}
              onClose={() => setActiveLiveVideoId(null)}
              onAddToCart={handleAddToCart}
              accentColor={accentColor}
              onOpenAuth={() => setIsAuthOpen(true)}
              onSelectDish={handleSelectDish}
            />
          ) : (
            /* CLIENT-SIDE METAPLATE WITH MULTIPLE LAYOUT PRESETS */
            <div>
              {designSettings.layoutPreset === 'dark_streaming' || !designSettings.layoutPreset ? (
                <DarkStreamingFeed
                  videos={clientVideos}
                  restaurants={clientRestaurants}
                  dishes={clientDishes}
                  user={user}
                  orders={orders}
                  cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
                  cartTotal={cart.reduce((sum, item) => sum + (item.dish.price * item.quantity), 0)}
                  onAddToCart={handleAddToCart}
                  onSelectDish={handleSelectDish}
                  onSelectLiveVideo={setActiveLiveVideoId}
                  onOpenCart={() => setIsCartOpen(true)}
                  onOpenOrdersHistory={() => setIsOrdersHistoryOpen(true)}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  onLogout={handleLogout}
                  onLoginDemo={(role) => {
                    handleAuthSuccess({
                      id: role === 'admin' ? 'usr-admin-demo' : role === 'restaurant' ? 'usr-rest-demo' : 'usr-client-demo',
                      email: role === 'admin' ? 'admin@fidfud.ai' : role === 'restaurant' ? 'chef.robert@fidfud.ai' : 'alexandre.client@fidfud.ai',
                      role: role
                    });
                  }}
                  onOpenAdmin={() => setIsAdminCMSOpen(true)}
                  onOpenProfile={() => setIsProfileModalOpen(true)}
                  onOpenOfflineDownloads={() => setIsOfflineDownloadsOpen(true)}
                  onOpenDJArea={() => setIsDJAreaOpen(true)}
                  onOpenShows={() => setIsCulinaryShowsOpen(true)}
                  onOpenYouTubers={() => setIsFoodYouTubersOpen(true)}
                  onOpenRecipes={() => {
                    setRecipeInitialCategory('all');
                    setIsRecipeSectionOpen(true);
                  }}
                  onOpenFavorites={() => setIsFavoritesDrawerOpen(true)}
                  accentColor={accentColor}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  designSettings={designSettings}
                  isFastLane={isFastLane}
                  setIsFastLane={setIsFastLane}
                  maxPrepTimeMinutes={maxPrepTimeMinutes}
                  setMaxPrepTimeMinutes={setMaxPrepTimeMinutes}
                  onOpenSearch={() => setIsSearchDrawerOpen(true)}
                />
              ) : isMobile || designSettings.layoutPreset === 'immersive' ? (
                /* Immersive Classic TikTok full-feed */
                <div className="py-0">
                  <VideoFeed
                    videos={clientVideos}
                    orders={orders}
                    onSelectDish={handleSelectDish}
                    onSelectLiveVideo={setActiveLiveVideoId}
                    isLoading={isLoadingFeed}
                    user={user}
                    onOpenAuth={() => setIsAuthOpen(true)}
                    restaurants={clientRestaurants}
                    dishes={clientDishes}
                    searchQuery={searchQuery}
                    selectedCategory={selectedCategory}
                    userLocation={userLocation}
                    designSettings={designSettings}
                    isProximityFirst={isProximityFirst}
                    setIsProximityFirst={setIsProximityFirst}
                    feedSortOrder={feedSortOrder}
                    setFeedSortOrder={setFeedSortOrder}
                    proximityRadius={proximityRadius}
                    isFastLane={isFastLane}
                    maxPrepTimeMinutes={maxPrepTimeMinutes}
                    selectedDietaryTags={selectedDietaryTags}
                    isAutoPlayEnabled={isAutoPlayEnabled}
                    onDeleteVideo={(id) => setVideos(prev => prev.filter(v => v.id !== id))}
                    onRefreshData={refreshAllData}
                  />
                </div>
              ) : designSettings.layoutPreset === 'bento' ? (
              /* Split Bento Grid layout: Video on center-left, custom actions & features on sidebars */
              <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Column 1: Custom Branding / Loyalty Sidebar (Col span 4) */}
                <div className="md:col-span-4 space-y-5">
                  {/* Custom branded banner card */}
                  <div className="p-6 rounded-2xl bg-[#0F0F11] border border-white/5 space-y-4 relative overflow-hidden">
                    <div 
                      className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl opacity-20"
                      style={{ backgroundColor: accentColor }}
                    />
                    <div className="flex items-center gap-3">
                      {Boolean(designSettings?.logoUrl?.trim()) ? (
                        <img src={designSettings.logoUrl.trim()} alt="Logo" className="responsive-logo-size object-cover rounded-xl border border-white/10 shrink-0" />
                      ) : (
                        <div 
                          style={{ backgroundColor: accentColor }}
                          className="responsive-logo-size rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0"
                        >
                          🍳
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-black text-white uppercase italic">{designSettings.appName}</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Premium Hub</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">{designSettings.heroTitle}</p>
                    
                    {/* Promo ticker inside card */}
                    <div 
                      style={{ color: accentColor, borderColor: `${accentColor}25` }}
                      className="p-2.5 rounded-xl bg-zinc-950/60 border text-[10px] font-mono font-bold animate-pulse uppercase leading-tight"
                    >
                      {designSettings.promoMessage}
                    </div>
                  </div>

                  {/* Loyalty Balance Summary */}
                  {designSettings.customFeatures.enableLoyaltyPoints && (
                    <div className="p-5 rounded-2xl bg-[#0F0F11] border border-amber-500/10 space-y-3.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-amber-400 font-black tracking-widest uppercase font-mono">Club Fidélité Gourmet</span>
                        <span className="text-[10px] bg-amber-500/15 text-amber-400 font-bold px-2 py-0.5 rounded-full">Actif ✔</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-normal font-sans">
                        Accumulez des points en regardant nos chefs s’activer en direct et échangez-les contre des réductions !
                      </p>
                      <button 
                        onClick={() => setIsOrdersHistoryOpen(true)}
                        className="w-full bg-amber-400/5 hover:bg-amber-400/10 border border-amber-400/20 text-amber-400 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        🌟 Consulter mon solde & Cadeaux
                      </button>
                    </div>
                  )}

                  {/* Leader of the Month section */}
                  {designSettings.customFeatures.enableLeaderOfTheMonth && (
                    <div className="p-5 rounded-2xl bg-[#0F0F11] border border-white/5 space-y-3.5">
                      <span className="text-[10px] text-zinc-500 font-black tracking-widest uppercase font-mono">Chef Vedette de la Semaine 👑</span>
                      <div className="flex items-center gap-3">
                        <img 
                          src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=120&auto=format&fit=crop&q=80" 
                          alt="Chef" 
                          className="w-12 h-12 rounded-xl object-cover border border-white/10"
                        />
                        <div>
                          <p className="text-xs font-black text-white uppercase italic">Nonna Maria</p>
                          <p className="text-[10px] text-zinc-400 font-sans">Ambassadrice de la Cuisine Traditionnelle Italienne.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column 2: Aspect-Ratio Controlled Vertical Video Player Card (Col span 5) */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="w-full max-w-[390px] aspect-[9/16] bg-black rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative">
                    <VideoFeed
                      videos={clientVideos}
                      orders={orders}
                      onSelectDish={handleSelectDish}
                      isLoading={isLoadingFeed}
                      user={user}
                      onOpenAuth={() => setIsAuthOpen(true)}
                      restaurants={clientRestaurants}
                      dishes={clientDishes}
                      searchQuery={searchQuery}
                      selectedCategory={selectedCategory}
                      userLocation={userLocation}
                      designSettings={designSettings}
                      isProximityFirst={isProximityFirst}
                      setIsProximityFirst={setIsProximityFirst}
                      feedSortOrder={feedSortOrder}
                      setFeedSortOrder={setFeedSortOrder}
                      proximityRadius={proximityRadius}
                      isFastLane={isFastLane}
                      maxPrepTimeMinutes={maxPrepTimeMinutes}
                      selectedDietaryTags={selectedDietaryTags}
                      isAutoPlayEnabled={isAutoPlayEnabled}
                      onDeleteVideo={(id) => setVideos(prev => prev.filter(v => v.id !== id))}
                      onRefreshData={refreshAllData}
                    />
                  </div>
                </div>

                {/* Column 3: Featured Products / Custom Feature List (Col span 3) */}
                <div className="md:col-span-3 space-y-5">
                  
                  {/* Featured Products List */}
                  {designSettings.sectionsVisible.showFeaturedProducts && (
                    <div className="p-5 rounded-2xl bg-[#0F0F11] border border-white/5 space-y-3.5">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[10px] text-zinc-400 font-black tracking-widest uppercase font-mono">🍽️ Plats Vedettes</span>
                        <span className="text-[9px] text-accent font-black uppercase font-mono">Curated</span>
                      </div>
                      <div className="space-y-3">
                        {isLoadingFeed ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <div 
                              key={`bento-shimmer-${i}`} 
                              className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5 flex items-center gap-2.5 select-none animate-shimmer-sweep"
                            >
                              <div className="w-10 h-10 bg-zinc-800/80 border border-white/5 rounded-lg shrink-0 animate-shimmer-sweep" />
                              <div className="flex-1 space-y-1.5 min-w-0">
                                <div className="h-3 bg-zinc-800/80 rounded w-3/4 animate-shimmer-sweep" />
                                <div className="h-2.5 bg-zinc-800/60 rounded w-1/3 animate-shimmer-sweep" />
                              </div>
                              <div className="w-3 h-3 bg-[#FF5C00]/30 rounded shrink-0 animate-shimmer-brand" />
                            </div>
                          ))
                        ) : (
                          (designSettings.featuredDishIds && designSettings.featuredDishIds.length > 0
                            ? clientDishes.filter(d => designSettings.featuredDishIds.includes(d.id))
                            : clientDishes.slice(0, 3)
                          ).map(dish => (
                            <div 
                              key={dish.id} 
                              onClick={() => setSelectedDishId(dish.id)}
                              className="group p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-white/2 cursor-pointer transition-all flex items-center gap-2.5"
                            >
                              <LazyImage 
                                src={dish.imageUrl || (dish as any).image} 
                                alt={dish.name} 
                                sizeType="thumbnail"
                                containerClassName="w-10 h-10 rounded-lg shrink-0 overflow-hidden border border-white/5"
                                className="w-full h-full object-cover" 
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-extrabold text-white truncate group-hover:text-accent transition-colors uppercase italic">{dish.name}</p>
                                <p className="text-[10px] text-zinc-500 font-mono">{dish.price.toFixed(2)} €</p>
                              </div>
                              <span className="text-accent text-xs font-black">➔</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Custom Created Features List */}
                  {designSettings.createdFeatures && designSettings.createdFeatures.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest font-mono pl-1">Services de la Plateforme</p>
                      {designSettings.createdFeatures.map(feat => (
                        <div key={feat.id} className="p-4 rounded-xl bg-[#0F0F11] border border-white/5 relative overflow-hidden">
                          <span 
                            style={{ color: accentColor, backgroundColor: `${accentColor}15`, borderColor: `${accentColor}30` }}
                            className="absolute top-3 right-3 text-[8px] border font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono"
                          >
                            {feat.badge || 'ACTIF'}
                          </span>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-base">{feat.icon || '✨'}</span>
                            <h4 className="text-xs font-black text-white uppercase italic">{feat.title}</h4>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-normal font-sans">{feat.description}</p>
                          <button 
                            onClick={() => setSelectedFeature(feat)}
                            className="mt-2.5 px-3 py-1 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            {feat.cta || 'Découvrir'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            ) : designSettings.layoutPreset === 'whatnot' ? (
              /* Whatnot Live Market layout */
              <WhatnotLiveMarket
                videos={clientVideos}
                restaurants={clientRestaurants}
                dishes={clientDishes}
                user={user}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onSelectDish={handleSelectDish}
                onSelectLiveVideo={setActiveLiveVideoId}
                onAddToCart={handleAddToCart}
                onOpenAuth={() => setIsAuthOpen(true)}
                accentColor={accentColor}
                designSettings={designSettings}
              />
            ) : (
              /* Editorial Showcase layout: Full premium curation page, with video player embedded below */
              <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
                {/* Grand Hero Banner Card */}
                {designSettings.sectionsVisible.showHero && (
                  <div 
                    className="relative rounded-3xl overflow-hidden min-h-[280px] flex flex-col justify-end p-6 md:p-10 border border-white/5 bg-cover bg-center shadow-2xl"
                    style={{ backgroundImage: `linear-gradient(to top, rgba(5,5,6,0.95) 40%, rgba(5,5,6,0.2) 100%), url(${designSettings.bannerUrl})` }}
                  >
                    <div className="max-w-2xl space-y-3">
                      <span 
                        style={{ backgroundColor: accentColor }}
                        className="text-[10px] text-white font-black uppercase tracking-widest px-3 py-1 rounded-full w-max"
                      >
                        {designSettings.appName} GOURMET PORTAL
                      </span>
                      <h1 className="text-2xl md:text-4xl font-black text-white uppercase italic leading-tight tracking-tight">
                        {designSettings.heroTitle}
                      </h1>
                      <p className="text-xs md:text-sm text-zinc-300 font-sans leading-relaxed max-w-xl">
                        Explorez des créations culinaires exclusives cuisinées sous vos yeux par des artisans passionnés, prêtes à être livrées en un clic.
                      </p>
                    </div>
                    
                    {/* Floating Promo ribbon inside the banner */}
                    <div 
                      style={{ color: accentColor }}
                      className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse"
                    >
                      <span>⚡</span>
                      <span>{designSettings.promoMessage}</span>
                    </div>
                  </div>
                )}

                {/* Grid of Chef Spotlight & Custom Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {designSettings.customFeatures.enableLeaderOfTheMonth && (
                    <div className="p-6 rounded-2xl bg-[#0F0F11] border border-amber-500/10 space-y-3.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] text-amber-400 font-black tracking-widest uppercase font-mono">Chef de la Semaine 👑</span>
                        <h3 className="text-lg font-black text-white uppercase italic">Casa Della Nonna</h3>
                      </div>
                      <div className="flex gap-4 items-center">
                        <img 
                          src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=120&auto=format&fit=crop&q=80" 
                          alt="Kitchen" 
                          className="w-14 h-14 rounded-xl object-cover border border-white/5"
                        />
                        <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                          Dégustez la tradition italienne revisitée avec amour. Spécialité de pâtes fraîches maison étirées à la main.
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          const el = document.getElementById('gourmet-live-feed-player');
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth' });
                          } else {
                            setSelectedFeature({
                              id: 'nonna-maria',
                              title: 'Chef Nonna Maria 👑',
                              description: "Consultez les vidéos exclusives et les coulisses de la préparation de ses célèbres spécialités fraîches faites maison, prêtes à être commandées directement.",
                              badge: 'CHEF VEDETTE',
                              icon: '👑'
                            });
                          }
                        }}
                        className="w-full py-2.5 rounded-xl bg-amber-400 text-zinc-950 font-black uppercase text-xs hover:bg-amber-500 transition-all shadow-md cursor-pointer"
                      >
                        Voir ses vidéos gourmandes
                      </button>
                    </div>
                  )}

                  {/* Custom features map */}
                  {designSettings.createdFeatures?.slice(0, 2).map(feat => (
                    <div key={feat.id} className="p-6 rounded-2xl bg-[#0F0F11] border border-white/5 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span 
                          style={{ color: accentColor, backgroundColor: `${accentColor}10`, borderColor: `${accentColor}20` }}
                          className="text-[9px] border font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono w-max block"
                        >
                          {feat.badge || 'SERVICE'}
                        </span>
                        <h4 className="text-base font-black text-white uppercase italic flex items-center gap-1.5">
                          <span>{feat.icon || '🎁'}</span>
                          <span>{feat.title}</span>
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed font-sans">{feat.description}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedFeature(feat)}
                        className="mt-4 w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                      >
                        {feat.cta || 'Activer'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Featured Products grid section */}
                {designSettings.sectionsVisible.showFeaturedProducts && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <h2 className="text-base font-black text-white uppercase tracking-tight italic">⭐ Curations & Plats Vedettes</h2>
                      <span className="text-[10px] text-zinc-500 uppercase font-mono">Disponibilité immédiate</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {isLoadingFeed ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <div 
                            key={`editorial-shimmer-${i}`} 
                            className="p-3.5 rounded-2xl bg-[#0F0F11] border border-white/5 flex flex-col justify-between select-none space-y-4 animate-shimmer-sweep"
                          >
                            <div className="relative aspect-video rounded-xl bg-zinc-800/80 border border-white/5 overflow-hidden animate-shimmer-sweep" />
                            <div className="space-y-2">
                              <div className="h-3.5 bg-zinc-800/80 rounded w-3/4 animate-shimmer-sweep" />
                              <div className="space-y-1">
                                <div className="h-2.5 bg-zinc-800/60 rounded w-full animate-shimmer-sweep" />
                                <div className="h-2.5 bg-zinc-800/60 rounded w-5/6 animate-shimmer-sweep" />
                              </div>
                              <div className="flex justify-between items-center pt-2">
                                <div className="h-3 bg-[#FF5C00]/30 rounded w-1/4 animate-shimmer-brand" />
                                <div className="h-3.5 bg-zinc-800/80 rounded w-1/3 animate-shimmer-sweep" />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        (designSettings.featuredDishIds && designSettings.featuredDishIds.length > 0
                          ? clientDishes.filter(d => designSettings.featuredDishIds.includes(d.id))
                          : clientDishes.slice(0, 4)
                        ).map(dish => {
                          const rest = clientRestaurants.find(r => r.id === dish.restaurantId);
                          return (
                            <div 
                              key={dish.id} 
                              onClick={() => setSelectedDishId(dish.id)}
                              className="p-3.5 rounded-2xl bg-[#0F0F11] border border-white/5 hover:border-white/10 transition-all cursor-pointer flex flex-col justify-between group"
                            >
                              <div className="relative aspect-video rounded-xl overflow-hidden border border-white/5 mb-3">
                                <LazyImage 
                                  src={dish.imageUrl || (dish as any).image} 
                                  alt={dish.name} 
                                  sizeType="card"
                                  containerClassName="w-full h-full rounded-xl overflow-hidden"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                />
                                <div 
                                  style={{ color: accentColor }}
                                  className="absolute top-2 left-2 bg-black/75 px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono"
                                >
                                  {rest?.name || 'Gourmet'}
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <h4 className="text-xs font-black text-white uppercase group-hover:text-accent transition-colors italic truncate">{dish.name}</h4>
                                <p className="text-[10px] text-zinc-400 font-sans line-clamp-2 leading-relaxed">{dish.description}</p>
                                <div className="flex justify-between items-center pt-2">
                                  <span className="font-mono text-xs font-bold text-white">{dish.price.toFixed(2)} €</span>
                                  <span className="text-[10px] text-accent font-extrabold uppercase flex items-center gap-1 font-sans">
                                    Commander ➔
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Integrated Vertical Video Feed area below */}
                {designSettings.sectionsVisible.showVideoFeed && (
                  <div id="gourmet-live-feed-player" className="space-y-4 pt-4 scroll-mt-24">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <h2 className="text-base font-black text-white uppercase tracking-tight italic">🎥 Le Feed Vidéo Gourmet en Direct</h2>
                      <span className="text-[10px] text-zinc-500 uppercase font-mono animate-pulse">Swipez pour explorer</span>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-full max-w-[420px] aspect-[9/16] bg-black rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative">
                        <VideoFeed
                          videos={clientVideos}
                          orders={orders}
                          onSelectDish={handleSelectDish}
                          onSelectLiveVideo={setActiveLiveVideoId}
                          isLoading={isLoadingFeed}
                          user={user}
                          onOpenAuth={() => setIsAuthOpen(true)}
                          restaurants={clientRestaurants}
                          dishes={clientDishes}
                          searchQuery={searchQuery}
                          selectedCategory={selectedCategory}
                          userLocation={userLocation}
                          designSettings={designSettings}
                          isProximityFirst={isProximityFirst}
                          setIsProximityFirst={setIsProximityFirst}
                          feedSortOrder={feedSortOrder}
                          setFeedSortOrder={setFeedSortOrder}
                          proximityRadius={proximityRadius}
                          isFastLane={isFastLane}
                          maxPrepTimeMinutes={maxPrepTimeMinutes}
                          selectedDietaryTags={selectedDietaryTags}
                          isAutoPlayEnabled={isAutoPlayEnabled}
                          onDeleteVideo={(id) => setVideos(prev => prev.filter(v => v.id !== id))}
                          onRefreshData={refreshAllData}
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
          )
        ) : currentRole === 'restaurant' ? (
          /* MERCHANT-SIDE : FULLY FEATURED RESTAURATEUR PORTAL */
          <div className="bg-[#050506]">
            <MerchantDashboard
              restaurants={restaurants}
              dishes={allDishes}
              videos={videos}
              orders={orders}
              onRefreshData={refreshAllData}
              initialTab={merchantTab}
              user={user}
            />
          </div>
        ) : (
          /* COURIER-SIDE : PORTAL COURIER / LIVREUR */
          <div className="bg-[#050506]">
            <CourierDashboard
              user={user}
              onRefreshData={refreshAllData}
              accentColor={accentColor}
            />
          </div>
        )}
      </main>
        </>
      )}

      {/* MODAL: DISH CULINARY DRAWER */}
      {selectedDishId && (
        <DishDrawer
          dishId={selectedDishId}
          restaurantName={activeDishRestaurant ? activeDishRestaurant.name : null}
          isOrderingEnabled={activeDishRestaurant ? activeDishRestaurant.isOrderingEnabled !== false : true}
          dishes={allDishes}
          onClose={() => setSelectedDishId(null)}
          onAddToCart={handleAddToCart}
          user={user}
          onOpenAuth={() => setIsAuthOpen(true)}
          initialTab={dishDrawerTab}
          orders={orders}
        />
      )}

      {/* MODAL: SLIDING SHOPPING BASKET */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* MODAL: CHECKOUT TUNNEL */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cart}
        onClearCart={handleClearCart}
        onOrderCompleted={handleOrderCompleted}
        user={user}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenOrdersHistory={() => setIsOrdersHistoryOpen(true)}
      />

      {/* MODAL: AUTHENTICATION FLOW */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalInitialMode}
        designSettings={designSettings}
      />


      {/* MODAL: ORDERS STATUS TRACKING HISTORY PANEL */}
      <OrdersHistory
        isOpen={isOrdersHistoryOpen}
        onClose={() => setIsOrdersHistoryOpen(false)}
        orders={orders}
        user={user}
        restaurants={restaurants}
        userLocation={userLocation}
        dishes={allDishes}
        onAddToCart={handleAddToCart}
        onOpenCart={() => setIsCartOpen(true)}
        onOrderUpdated={(updated) => setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))}
      />

      {/* DIALOG: SINGLE RESTAURANT BASKET CONFLICT ALERTS */}
      {conflictItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0D0D0E] border border-red-500/20 rounded-3xl p-6 shadow-2xl text-center space-y-5">
            <div className="mx-auto w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20">
              <ShieldAlert size={26} className="stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h4 className="text-white text-base font-black tracking-tight">Vider le panier en cours ?</h4>
              <p className="text-xs text-zinc-400 font-sans leading-normal">
                Vous avez déjà des plats de <strong className="text-white">{cart[0]?.restaurantName}</strong> dans votre panier.
              </p>
              <p className="text-xs text-zinc-500 leading-normal">
                Pour garantir la rapidité de préparation, chaque commande Fidfud doit provenir d'un seul restaurant. Souhaitez-vous vider votre panier pour commander chez <strong className="text-white">{restaurants.find(r => r.id === conflictItem.dish.restaurantId)?.name}</strong> ?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setConflictItem(null)}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold py-3 rounded-xl text-xs transition-colors border border-zinc-800"
              >
                Conserver mon panier
              </button>
              <button
                onClick={handleResolveConflict}
                className="w-full bg-[#FF5E1A] hover:bg-[#FF3E00] text-white font-extrabold py-3 rounded-xl text-xs transition-colors shadow-md"
              >
                Vider & Remplacer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant Toast Notification Banner */}
      {instantSaveToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[150] bg-[#FF5C00] text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 font-black text-xs uppercase tracking-wider flex items-center gap-2 animate-bounce">
          <Check size={18} />
          <span>{instantSaveToast}</span>
        </div>
      )}

      {/* Retractable Left-Side Glossy Admin CMS Tab (Only for Super Admin) */}
      {user?.role === 'admin' && (
        <div className={`fixed left-0 top-[40%] -translate-y-1/2 z-[100] transition-all duration-300 flex items-stretch ${
          isAdminTabExpanded ? 'translate-x-0' : '-translate-x-[calc(100%-20px)]'
        }`}>
          {/* Glassmorphic Panel Content */}
          <div className="bg-black/85 backdrop-blur-xl border-y border-r border-white/15 rounded-r-2xl p-3 shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center gap-2">
            <span className="text-xl animate-bounce">👑</span>
            <div className="flex flex-col items-center">
              <span className="text-[7.5px] text-[#FF5C00] font-black tracking-widest uppercase font-mono">
                CMS
              </span>
              <span className="text-[9px] text-white font-extrabold uppercase tracking-wider font-sans">
                ADMIN
              </span>
            </div>

            <button
              onClick={() => setIsAdminCMSOpen(true)}
              className="mt-1 bg-gradient-to-r from-[#FF5C00] to-orange-600 hover:from-[#FF7A00] hover:to-orange-500 text-white text-[8.5px] font-black tracking-widest px-3 py-2 rounded-xl shadow-lg transition-all active:scale-95 uppercase whitespace-nowrap cursor-pointer border border-white/10 w-full"
            >
              Gérer
            </button>

            {/* Quick Save Button */}
            <button
              disabled={isInstantSaving}
              onClick={handleInstantAdminSave}
              className="bg-zinc-900 hover:bg-zinc-800 text-[#FF5C00] hover:text-white border border-[#FF5C00]/30 text-[8px] font-black tracking-wider p-2 rounded-xl shadow-md transition-all active:scale-95 uppercase w-full flex items-center justify-center gap-1 cursor-pointer"
              title="Sauvegarder immédiatement l'état complet de l'Admin"
            >
              {isInstantSaving ? (
                <span className="w-3 h-3 border-2 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={12} />
                  <span>Sauver</span>
                </>
              )}
            </button>

            {/* Auto Save Toggle */}
            <button
              onClick={() => setIsAutoSaveEnabled(!isAutoSaveEnabled)}
              className={`p-2 rounded-xl text-[8px] font-black tracking-wider transition-all cursor-pointer border uppercase w-full flex items-center justify-center gap-1 ${
                isAutoSaveEnabled 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                  : 'bg-zinc-900 text-zinc-500 border-white/5'
              }`}
              title="Activer/Désactiver l'enregistrement automatique"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAutoSaveEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span>Auto: {isAutoSaveEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Quick History Button */}
            <button
              onClick={() => setIsSavesHistoryOpen(true)}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-[8px] font-black tracking-wider p-2 rounded-xl shadow-md transition-all active:scale-95 uppercase w-full flex items-center justify-center gap-1 cursor-pointer"
              title="Historique des 25 sauvegardes"
            >
              <History size={12} />
              <span>Histo (25)</span>
            </button>
          </div>

          {/* Collapsible Toggle Handle with arrow */}
          <button
            onClick={() => setIsAdminTabExpanded(!isAdminTabExpanded)}
            className="bg-black/75 hover:bg-black/85 text-white w-5 rounded-r-xl border-y border-r border-white/15 flex items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all -ml-[1px]"
            title={isAdminTabExpanded ? "Masquer le panneau d'administration" : "Afficher le panneau d'administration"}
          >
            {isAdminTabExpanded ? (
              <ChevronLeft size={13} className="text-zinc-400 hover:text-white" />
            ) : (
              <ChevronRight size={13} className="text-[#FF5C00] animate-pulse" />
            )}
          </button>
        </div>
      )}

      {/* MODAL: ADMIN SAVES HISTORY (25 SAVES MAX) */}
      <SavesHistoryModal
        isOpen={isSavesHistoryOpen}
        onClose={() => setIsSavesHistoryOpen(false)}
        onRefreshAppData={refreshAllData}
        isAutoSaveEnabled={isAutoSaveEnabled}
        onToggleAutoSave={setIsAutoSaveEnabled}
        lastAutoSaveTime={lastAutoSaveTime}
      />

      {/* MODAL: ADMIN CMS CONTROL BOARD */}
      <AdminCMS
        isOpen={isAdminCMSOpen}
        onClose={() => setIsAdminCMSOpen(false)}
        user={user}
        restaurants={restaurants}
        dishes={allDishes}
        videos={videos}
        orders={orders}
        onRefreshData={refreshAllData}
        designSettings={designSettings}
        onUpdateDesignSettings={handleUpdateDesignSettings}
        onSaveDesignSettings={handleSaveDesignSettings}
        onInstantSaveAdmin={handleInstantAdminSave}
        isAutoSaveEnabled={isAutoSaveEnabled}
        onToggleAutoSave={() => setIsAutoSaveEnabled(!isAutoSaveEnabled)}
        onOpenSavesHistory={() => setIsSavesHistoryOpen(true)}
      />

      {/* DRAWER: TOP SEARCH & CULINARY FILTERS DECK */}
      <SearchDrawer
        isOpen={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        userLocation={userLocation}
        setUserLocation={setUserLocation}
        isLocating={isLocating}
        onDetectLocation={handleDetectLocation}
        restaurants={restaurants}
        dishes={allDishes}
        isProximityFirst={isProximityFirst}
        setIsProximityFirst={setIsProximityFirst}
        feedSortOrder={feedSortOrder}
        setFeedSortOrder={setFeedSortOrder}
        proximityRadius={proximityRadius}
        setProximityRadius={setProximityRadius}
        isFastLane={isFastLane}
        setIsFastLane={setIsFastLane}
        maxPrepTimeMinutes={maxPrepTimeMinutes}
        setMaxPrepTimeMinutes={setMaxPrepTimeMinutes}
        selectedDietaryTags={selectedDietaryTags}
        setSelectedDietaryTags={setSelectedDietaryTags}
        onSelectDish={handleSelectDish}
        onOpenTasteProfileModal={() => setIsTasteProfileModalOpen(true)}
      />

      {/* MODAL: AI TASTE PROFILE ENGINE DECK */}
      <TasteProfileModal
        isOpen={isTasteProfileModalOpen}
        onClose={() => setIsTasteProfileModalOpen(false)}
        orders={orders}
        user={user}
        dishes={allDishes}
        restaurants={restaurants}
        onApplyFilter={() => {
          setFeedSortOrder('taste_profile');
          setIsSearchDrawerOpen(false);
        }}
      />

      {/* MODAL: PROFILE, SETTINGS & ROLE CONTROL DECK */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        orders={orders}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        currentRole={currentRole}
        onChangeRole={(role) => setCurrentRole(role)}
        onOpenAdmin={() => setIsAdminCMSOpen(true)}
        activeOrderCount={orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length}
        onOpenOrdersHistory={() => setIsOrdersHistoryOpen(true)}
        isAutoPlayEnabled={isAutoPlayEnabled}
        onToggleAutoPlay={handleToggleAutoPlay}
        onOpenContacts={() => setIsContactsModalOpen(true)}
      />

      {/* MODAL: INTERACTIVE SERVICES ACTIVATOR */}
      <InteractiveFeatureModal
        feature={selectedFeature}
        isOpen={!!selectedFeature}
        onClose={() => setSelectedFeature(null)}
        restaurants={clientRestaurants}
        accentColor={accentColor}
        userEmail={user?.email}
      />

      {/* FLOATING SYSTEM NOTIFICATIONS TOAST */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[999] space-y-2 pointer-events-none">
        {notifications.map(n => (
          <div 
            key={n.id} 
            className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border flex flex-col space-y-1 transform transition-all duration-300 translate-y-0 opacity-100 bg-zinc-950/95 backdrop-blur-md ${
              n.type === 'success' 
                ? 'border-green-500/20 text-white' 
                : n.type === 'warn'
                  ? 'border-red-500/20 text-white'
                  : 'border-white/10 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-black tracking-widest text-[#FF5C00] flex items-center gap-1.5">
                🔔 ALERTE STATUT COMMANDE
              </span>
              <button 
                onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                className="text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer p-0.5"
              >
                ✕
              </button>
            </div>
            <p className="text-xs font-black text-white">{n.title}</p>
            <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">{n.message}</p>
          </div>
        ))}
      </div>

      {/* Super-Admin Visual Editor Floating Toolbar */}
      {designSettings.isVisualEditorActive && user?.role === 'admin' && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[90] bg-amber-500/95 text-black px-4 py-2 rounded-2xl border-2 border-black/20 shadow-2xl backdrop-blur-xl flex items-center gap-3 text-xs font-black animate-bounce">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            🛠️ Mode Éditeur Elementor Actif
          </span>

          <button
            onClick={() => setIsAdminCMSOpen(true)}
            className="px-2.5 py-1 bg-black text-amber-400 hover:bg-zinc-900 rounded-xl font-bold cursor-pointer transition-all"
          >
            Builder CMS
          </button>

          {(designSettings.hiddenElements || []).length > 0 && (
            <button
              onClick={() => handleUpdateDesignSettings({ hiddenElements: [] })}
              className="px-2.5 py-1 bg-black/20 text-black hover:bg-black/30 rounded-xl font-bold cursor-pointer transition-all"
            >
              Rétablir Tout ({designSettings.hiddenElements.length})
            </button>
          )}

          <button
            onClick={() => handleUpdateDesignSettings({ isVisualEditorActive: false })}
            className="p-1 bg-black/20 hover:bg-black/40 text-black rounded-lg cursor-pointer"
            title="Désactiver l'Éditeur"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Offline Downloads Drawer */}
      <OfflineDownloadsDrawer
        isOpen={isOfflineDownloadsOpen}
        onClose={() => setIsOfflineDownloadsOpen(false)}
      />

      {/* Google Contacts Modal */}
      <GoogleContactsModal
        isOpen={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
        onSendGiftDish={(contact) => {
          addNotification("🎁 CADEAU ENVOYÉ", `Un repas cadeau a été envoyé à ${contact.name} (${contact.email || contact.phone})`);
          setIsContactsModalOpen(false);
        }}
        onInviteToLive={(contact) => {
          addNotification("🎥 INVITATION SENT", `Invitation au Live transmise à ${contact.name}`);
          setIsContactsModalOpen(false);
        }}
        designSettings={designSettings}
      />

      {/* DJ Area & Live Lounge Modal */}
      <DJAreaModal
        isOpen={isDJAreaOpen}
        onClose={() => setIsDJAreaOpen(false)}
        restaurants={clientRestaurants}
        dishes={clientDishes}
        onAddToCart={handleAddToCart}
        onSelectDish={(dishId) => {
          setSelectedDishId(dishId);
          setIsDJAreaOpen(false);
        }}
        accentColor={accentColor}
      />

      {/* Promotional & Discovery Popups Modal */}
      <PromotionalPopupModal
        onOpenDJArea={() => setIsDJAreaOpen(true)}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
        onOpenCulinaryChannels={() => setIsCulinaryShowsOpen(true)}
        onOpenFoodYouTubers={() => setIsFoodYouTubersOpen(true)}
        accentColor={accentColor}
      />

      {/* Culinary Shows Modal */}
      <CulinaryShowsModal
        isOpen={isCulinaryShowsOpen}
        onClose={() => setIsCulinaryShowsOpen(false)}
        restaurants={clientRestaurants}
        dishes={clientDishes}
      />

      {/* Food YouTubers Modal */}
      <FoodYouTubersModal
        isOpen={isFoodYouTubersOpen}
        onClose={() => setIsFoodYouTubersOpen(false)}
      />

      {/* Recipe Section Modal */}
      <RecipeSectionModal
        isOpen={isRecipeSectionOpen}
        onClose={() => setIsRecipeSectionOpen(false)}
        initialCategory={recipeInitialCategory}
        currentUser={user ? { id: user.id, email: user.email, name: user.email, role: user.role } : null}
        onRefreshFeed={refreshAllData}
      />

      {/* PWA Download App Modal */}
      <DownloadAppModal
        isOpen={isDownloadAppModalOpen}
        onClose={() => setIsDownloadAppModalOpen(false)}
      />

      {/* Favorites / Saved Restaurants Drawer */}
      <FavoritesDrawer
        isOpen={isFavoritesDrawerOpen}
        onClose={() => setIsFavoritesDrawerOpen(false)}
        user={user}
        restaurants={clientRestaurants}
        dishes={clientDishes}
        onOpenDish={(dishId, tab) => {
          setSelectedDishId(dishId);
          if (tab) setDishDrawerTab(tab);
        }}
        onOpenAuth={() => {
          setAuthModalInitialMode('login');
          setIsAuthOpen(true);
        }}
      />

    </div>
  );
}
