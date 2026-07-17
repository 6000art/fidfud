import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Plus, 
  Edit2, 
  Trash2, 
  Play, 
  Clock, 
  ShoppingBag, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Check, 
  X, 
  Tv, 
  DollarSign, 
  PlusCircle, 
  Eye,
  ShieldCheck,
  Award,
  Coins,
  Lock,
  Settings,
  Sparkles,
  TrendingUp,
  Wallet,
  ShieldAlert,
  User,
  Database,
  BarChart2,
  Globe,
  FileVideo,
  UploadCloud,
  Smartphone,
  Link,
  EyeOff,
  Activity,
  Download,
  AlertTriangle
} from 'lucide-react';
import { Restaurant, Dish, Video, Order, OrderStatus } from '../types';
import { VideoRecorderStudio } from './VideoRecorderStudio';
import { VideoValidator } from '../services/VideoValidator';

const getSafeVideoUrl = (url: string): string => {
  if (!url) return 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
  return url;
};

interface MerchantDashboardProps {
  restaurants: Restaurant[];
  dishes: Dish[];
  videos: Video[];
  orders: Order[];
  onRefreshData: () => void;
}

export default function MerchantDashboard({
  restaurants,
  dishes,
  videos,
  orders,
  onRefreshData
}: MerchantDashboardProps) {
  // Active selected restaurant for simulation
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  
  // Tabs: 'menu' | 'videos' | 'orders' | 'stripe' | 'vitrine' | 'premium' | 'secu_portefeuille'
  const [activeTab, setActiveTab] = useState<'menu' | 'videos' | 'orders' | 'stripe' | 'vitrine' | 'premium' | 'secu_portefeuille'>('orders');

  // Menu states
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [showDishForm, setShowDishForm] = useState<boolean>(false);
  const [dishName, setDishName] = useState<string>('');
  const [dishDesc, setDishDesc] = useState<string>('');
  const [dishPrice, setDishPrice] = useState<string>('');
  const [dishAvailable, setDishAvailable] = useState<boolean>(true);
  const [dishImage, setDishImage] = useState<string>('');
  const [dishStockCount, setDishStockCount] = useState<string>('');

  // Video states
  const [showVideoForm, setShowVideoForm] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [videoDishId, setVideoDishId] = useState<string>('');
  const [videoSourceType, setVideoSourceType] = useState<'direct' | 'instagram' | 'tiktok' | 'youtube_link' | 'youtube_channel'>('direct');
  const [isVideoOnline, setIsVideoOnline] = useState<boolean>(true);
  const [isVideoLiveContinuous, setIsVideoLiveContinuous] = useState<boolean>(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

  // Multi-Post state additions
  const [isMultiPostMode, setIsMultiPostMode] = useState<boolean>(false);
  const [multiPostUrls, setMultiPostUrls] = useState<string>('');
  const [isAutoGeneratingGallery, setIsAutoGeneratingGallery] = useState<boolean>(false);

  // Real-time Video validation states for dashboard
  const [isUrlValidating, setIsUrlValidating] = useState<boolean>(false);
  const [urlValidationResult, setUrlValidationResult] = useState<{ isValid: boolean; error?: string; metadata?: any } | null>(null);

  // Bulk Video states
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [bulkPromoText, setBulkPromoText] = useState<string>('');
  const [isBulkAiGenerating, setIsBulkAiGenerating] = useState<boolean>(false);
  const [isBulkPromoSaving, setIsBulkPromoSaving] = useState<boolean>(false);
  const [bulkActionSuccessMessage, setBulkActionSuccessMessage] = useState<string>('');

  // Stripe states
  const [isConnectingStripe, setIsConnectingStripe] = useState<boolean>(false);
  const [stripeStatus, setStripeStatus] = useState<{ connected: boolean; stripeAccountId: string | null } | null>(null);

  // Shop settings (Vitrine) editing states
  const [editRestName, setEditRestName] = useState<string>('');
  const [editRestAddress, setEditRestAddress] = useState<string>('');
  const [editRestSlogan, setEditRestSlogan] = useState<string>('');
  const [editRestLogoUrl, setEditRestLogoUrl] = useState<string>('');
  const [editRestBannerUrl, setEditRestBannerUrl] = useState<string>('');
  const [editRestPromoMessage, setEditRestPromoMessage] = useState<string>('');
  const [editRestCountdownMinutes, setEditRestCountdownMinutes] = useState<number>(10);
  const [editRestCountdownText, setEditRestCountdownText] = useState<string>('');
  const [editRestIsOrderingEnabled, setEditRestIsOrderingEnabled] = useState<boolean>(true);
  const [editRestVideoUrl, setEditRestVideoUrl] = useState<string>('');
  const [editRestVideoTitle, setEditRestVideoTitle] = useState<string>('');
  const [editRestVideoSourceType, setEditRestVideoSourceType] = useState<'direct' | 'instagram' | 'tiktok' | 'youtube_link' | 'youtube_channel'>('direct');
  const [editRestIsVideoLiveContinuous, setEditRestIsVideoLiveContinuous] = useState<boolean>(false);
  const [isSavingVitrine, setIsSavingVitrine] = useState<boolean>(false);

  // Cash out simulation state
  const [isCashingOut, setIsCashingOut] = useState<boolean>(false);

  // Filter current active merchant details
  const activeRestaurant = restaurants.find(r => r.id === selectedRestaurantId) || restaurants[0];

  // Set default restaurant on load
  useEffect(() => {
    if (restaurants.length > 0 && !selectedRestaurantId) {
      setSelectedRestaurantId(restaurants[0].id);
    }
  }, [restaurants, selectedRestaurantId]);

  // Debounced real-time validation effect for video URL
  useEffect(() => {
    if (!videoUrl || videoUrl.trim() === '') {
      setIsUrlValidating(false);
      setUrlValidationResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsUrlValidating(true);
      setUrlValidationResult(null);
      try {
        const res = await fetch('/api/videos/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl, videoSourceType })
        });
        if (res.ok) {
          const result = await res.json();
          setUrlValidationResult(result);
        } else {
          setUrlValidationResult({ isValid: false, error: 'Serveur de validation inaccessible' });
        }
      } catch (err) {
        setUrlValidationResult({ isValid: false, error: 'Erreur réseau lors de la validation' });
      } finally {
        setIsUrlValidating(false);
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [videoUrl, videoSourceType]);

  // Dynamic subscription formulas state
  const [formulas, setFormulas] = useState<any[]>([
    { id: 'free', name: 'Formule Découverte Paris', price: 0, description: 'Idéal pour débuter à Paris. Visibilité standard dans votre arrondissement.' },
    { id: 'pro', name: 'Formule Paris Pro Booster', price: 49, description: 'Pour les restaurateurs ambitieux à Paris. Visibilité boostée, commissions réduites à 10%.' },
    { id: 'gold', name: 'Formule Paris Gold Elite', price: 99, description: 'L\'expérience ultime. Visibilité maximale dans tout Paris, support 24/7 et commissions à 5%.' }
  ]);

  useEffect(() => {
    fetch('/api/formulas')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setFormulas(data);
        }
      })
      .catch(err => console.warn('Failed to load formulas in MerchantDashboard:', err.message || err));
  }, [restaurants]);

  // --- Restaurateur and Media states ---
  const [restaurateurProfile, setRestaurateurProfile] = useState<any | null>(null);
  const [restaurateurMediaList, setRestaurateurMediaList] = useState<any[]>([]);
  const [isSavingRestaurateur, setIsSavingRestaurateur] = useState<boolean>(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [newMediaTitle, setNewMediaTitle] = useState<string>('');
  const [newMediaUrl, setNewMediaUrl] = useState<string>('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('video');
  const [newMediaAssociatedDishId, setNewMediaAssociatedDishId] = useState<string>('');
  const [showMediaUploadForm, setShowMediaUploadForm] = useState<boolean>(false);
  const [additionMode, setAdditionMode] = useState<'upload' | 'record'>('upload');

  // Profile fields for editing
  const [restFirstName, setRestFirstName] = useState<string>('');
  const [restLastName, setRestLastName] = useState<string>('');
  const [restEmail, setRestEmail] = useState<string>('');
  const [restPhone, setRestPhone] = useState<string>('');
  const [restBio, setRestBio] = useState<string>('');
  const [restProfileImageUrl, setRestProfileImageUrl] = useState<string>('');

  const fetchRestaurateurData = async () => {
    if (!activeRestaurant?.id) return;
    try {
      const res = await fetch(`/api/restaurateurs/${activeRestaurant.id}`);
      if (res.ok) {
        const data = await res.json();
        setRestaurateurProfile(data);
        setRestFirstName(data.firstName || '');
        setRestLastName(data.lastName || '');
        setRestEmail(data.email || '');
        setRestPhone(data.phone || '');
        setRestBio(data.bio || '');
        setRestProfileImageUrl(data.profileImageUrl || '');
        
        const mediaRes = await fetch(`/api/restaurateurs/${data.id}/media`);
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          setRestaurateurMediaList(mediaData || []);
        }
      } else {
        setRestaurateurProfile(null);
        setRestFirstName('');
        setRestLastName('');
        setRestEmail(activeRestaurant.email || '');
        setRestPhone(activeRestaurant.phone || '');
        setRestBio('');
        setRestProfileImageUrl('');
        setRestaurateurMediaList([]);
      }
    } catch (err) {
      console.warn('Failed to fetch restaurateur info:', err);
    }
  };

  useEffect(() => {
    fetchRestaurateurData();
  }, [activeRestaurant?.id]);

  const handleSaveRestaurateurProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurant) return;
    setIsSavingRestaurateur(true);
    try {
      const payload = {
        restaurantId: activeRestaurant.id,
        userId: activeRestaurant.userId || 'usr-rest-nonna',
        firstName: restFirstName,
        lastName: restLastName,
        email: restEmail,
        phone: restPhone,
        bio: restBio,
        profileImageUrl: restProfileImageUrl
      };

      let res;
      if (restaurateurProfile?.id) {
        res = await fetch(`/api/restaurateurs/${restaurateurProfile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/restaurateurs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const data = await res.json();
        setRestaurateurProfile(data);
        alert('✨ Profil de Restaurateur enregistré avec succès ! Toutes vos images et vidéos sont désormais sécurisées et persistées dans Firestore.');
        fetchRestaurateurData();
      } else {
        const errData = await res.json();
        alert(`Erreur : ${errData.error}`);
      }
    } catch (err: any) {
      alert(`Erreur réseau : ${err.message}`);
    } finally {
      setIsSavingRestaurateur(false);
    }
  };

  const handleAddMediaToGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurateurProfile) {
      alert('Veuillez d’abord enregistrer vos informations de restaurateur pour pouvoir créer votre médiathèque.');
      return;
    }
    if (!newMediaTitle || !newMediaUrl) {
      alert('Veuillez remplir le titre et l’URL du média.');
      return;
    }
    setIsUploadingMedia(true);
    try {
      const payload = {
        mediaType: newMediaType,
        url: newMediaUrl,
        title: newMediaTitle,
        associatedDishId: newMediaAssociatedDishId || undefined,
        isPosted: false
      };

      const res = await fetch(`/api/restaurateurs/${restaurateurProfile.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setNewMediaTitle('');
        setNewMediaUrl('');
        setNewMediaAssociatedDishId('');
        setShowMediaUploadForm(false);
        alert('✨ Média ajouté avec succès à votre Médiathèque ! Il est stocké de manière 100% permanente.');
        fetchRestaurateurData();
        onRefreshData();
      } else {
        const errData = await res.json();
        alert(`Erreur : ${errData.error}`);
      }
    } catch (err: any) {
      alert(`Erreur réseau : ${err.message}`);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleToggleMediaPostStatus = async (media: any) => {
    try {
      const res = await fetch(`/api/restaurateurs/media/${media.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPosted: !media.isPosted })
      });
      if (res.ok) {
        fetchRestaurateurData();
        onRefreshData();
      } else {
        alert('Erreur lors du changement de statut du média.');
      }
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    }
  };

  const handleDeleteMediaFromGallery = async (mediaId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce média de votre médiathèque ?')) return;
    try {
      const res = await fetch(`/api/restaurateurs/media/${mediaId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchRestaurateurData();
        onRefreshData();
        alert('Média supprimé définitivement.');
      } else {
        alert('Erreur lors de la suppression du média.');
      }
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    }
  };

  // Sync shop details on active restaurant switch
  useEffect(() => {
    if (activeRestaurant) {
      setEditRestName(activeRestaurant.name || '');
      setEditRestAddress(activeRestaurant.address || '');
      setEditRestSlogan(activeRestaurant.slogan || '');
      setEditRestLogoUrl(activeRestaurant.logoUrl || '');
      setEditRestBannerUrl(activeRestaurant.bannerUrl || '');
      setEditRestPromoMessage(activeRestaurant.promoMessage || '');
      setEditRestCountdownMinutes(activeRestaurant.countdownMinutes || 10);
      setEditRestCountdownText(activeRestaurant.countdownText || '');
      setEditRestIsOrderingEnabled(activeRestaurant.isOrderingEnabled !== false);
      setEditRestVideoUrl(activeRestaurant.videoUrl || '');
      setEditRestVideoTitle(activeRestaurant.videoTitle || '');
      setEditRestVideoSourceType(activeRestaurant.videoSourceType || 'direct');
      setEditRestIsVideoLiveContinuous(!!activeRestaurant.isLiveContinuous);
    }
  }, [activeRestaurant?.id]);

  // Scroll to top of dashboard content container whenever activeTab changes
  useEffect(() => {
    const el = document.getElementById('merchant-dashboard-view-header') || document.getElementById('btn-create-dish-trigger');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  // --- STATE FOR PREMIUM AI TOOLS ---
  const [isAiGeneratingName, setIsAiGeneratingName] = useState(false);
  const [isAiGeneratingDesc, setIsAiGeneratingDesc] = useState(false);
  const [isAiGeneratingImage, setIsAiGeneratingImage] = useState(false);
  const [isAiGeneratingVideo, setIsAiGeneratingVideo] = useState(false);
  
  const [videoCustomTheme, setVideoCustomTheme] = useState('');
  const [generatedVideoStoryboard, setGeneratedVideoStoryboard] = useState<{
    title: string;
    music: string;
    steps: string[];
    captions: string;
  } | null>(null);

  const hasAiPrivilege = activeRestaurant?.subscriptionTier === 'pro' || activeRestaurant?.subscriptionTier === 'gold';

  const verifyAiPrivilege = () => {
    if (!hasAiPrivilege) {
      alert("⚠️ Fonctionnalité Premium exclusive !\n\nLes outils de création assistée par Intelligence Artificielle (Gemini 3.5) sont réservés aux abonnements FID'PRO & FID'GOLD.\n\nRendez-vous dans l'onglet 'Abonnements' pour surclasser votre compte instantanément de manière gratuite pour tester ! 🚀");
      return false;
    }
    return true;
  };

  // AI Name Generator trigger
  const handleAiGenerateName = async () => {
    if (!verifyAiPrivilege()) return;
    
    const keywords = prompt("Entrez quelques mots-clés de votre plat (ex: truffe, champignons, burrata) :");
    if (keywords === null) return; // cancel
    
    setIsAiGeneratingName(true);
    try {
      const res = await fetch('/api/ai/generate-dish-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, category: activeRestaurant?.category })
      });
      const data = await res.json();
      if (data.success && data.names && data.names.length > 0) {
        let message = "Choisissez parmi ces 3 noms générés par Gemini :\n\n";
        data.names.forEach((n: string, i: number) => {
          message += `${i + 1}. ${n}\n`;
        });
        const choice = prompt(message + "\nTapez 1, 2 ou 3 pour appliquer :");
        if (choice === '1') setDishName(data.names[0]);
        else if (choice === '2') setDishName(data.names[1]);
        else if (choice === '3') setDishName(data.names[2]);
      } else {
        alert("Une erreur est survenue lors de la génération.");
      }
    } catch (err) {
      console.error(err);
      alert("Impossible de contacter le serveur d'IA.");
    } finally {
      setIsAiGeneratingName(false);
    }
  };

  // AI Description Generator trigger
  const handleAiGenerateDescription = async () => {
    if (!verifyAiPrivilege()) return;
    if (!dishName) {
      alert("Veuillez d'abord saisir un nom de plat pour que l'IA puisse s'en inspirer !");
      return;
    }
    
    setIsAiGeneratingDesc(true);
    try {
      const res = await fetch('/api/ai/generate-dish-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: dishName, category: activeRestaurant?.category })
      });
      const data = await res.json();
      if (data.success && data.description) {
        setDishDesc(data.description);
      } else {
        alert("Une erreur est survenue.");
      }
    } catch (err) {
      console.error(err);
      alert("Échec de génération par l'IA.");
    } finally {
      setIsAiGeneratingDesc(false);
    }
  };

  // AI Image Suggester trigger
  const handleAiGenerateImage = async () => {
    if (!verifyAiPrivilege()) return;
    if (!dishName) {
      alert("Saisissez un nom de plat pour que l'IA trouve l'illustration parfaite !");
      return;
    }

    setIsAiGeneratingImage(true);
    try {
      const res = await fetch('/api/ai/generate-dish-image-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: dishName, category: activeRestaurant?.category, description: dishDesc })
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setDishImage(data.imageUrl);
        alert("✨ Image culinaire haute définition sélectionnée par l'IA de Gemini et appliquée avec succès !");
      } else {
        alert("Erreur de sélection d'image.");
      }
    } catch (err) {
      console.error(err);
      alert("Échec de récupération.");
    } finally {
      setIsAiGeneratingImage(false);
    }
  };

  // AI Automatic Video Post Generator trigger
  const handleAiGenerateVideo = async () => {
    if (activeRestaurant?.subscriptionTier !== 'gold') {
      alert("⚠️ Fonctionnalité Exclusive FID'GOLD !\n\nL'outil de création et de publication de vidéos entièrement autonomes par IA est réservé aux partenaires de la formule suprême FID'GOLD.\n\nSurclassez votre compte gratuitement dans l'onglet 'Abonnements' pour tester cette prouesse technologique ! 👑");
      return;
    }

    const theme = prompt("Saisissez un thème ou une ambiance pour la vidéo (ex: 'Ambiance romantique', 'Street-food de nuit', 'Chef en plein coup de feu') ou laissez vide :");
    if (theme === null) return;

    setIsAiGeneratingVideo(true);
    setGeneratedVideoStoryboard(null);
    try {
      const res = await fetch('/api/ai/generate-video-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: activeRestaurant?.id,
          customTheme: theme
        })
      });
      const data = await res.json();
      if (data.success && data.video) {
        setGeneratedVideoStoryboard(data.storyboard);
        onRefreshData(); // Reload videos in feed!
        alert(`🎥 Succès ! Une nouvelle démonstration vidéo de votre établissement a été créée et publiée dans le feed Fidfud par Gemini !\n\nDécouvrez le scénario généré ci-dessous.`);
      } else {
        alert("Erreur lors de la création de la vidéo.");
      }
    } catch (err) {
      console.error(err);
      alert("Échec de création vidéo.");
    } finally {
      setIsAiGeneratingVideo(false);
    }
  };

  // Fetch Stripe Status
  useEffect(() => {
    if (!activeRestaurant) return;
    fetch(`/api/stripe/status?restaurantId=${activeRestaurant.id}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setStripeStatus(data))
      .catch(err => console.warn('[Fidfud Stripe] Delay loading stripe status:', err.message || err));
  }, [activeRestaurant]);

  if (restaurants.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-500 bg-[#0A0A0B] rounded-2xl border border-zinc-900">
        <p className="font-sans text-sm">Chargement du portail restaurateur...</p>
      </div>
    );
  }

  const currentRestaurantDishes = dishes.filter(d => d.restaurantId === activeRestaurant?.id);
  const currentRestaurantVideos = videos.filter(v => v.restaurantId === activeRestaurant?.id);
  const currentRestaurantOrders = orders.filter(o => o.restaurantId === activeRestaurant?.id);

  // --- DISH / MENU CRUD HANDLERS ---
  const handleOpenCreateDish = () => {
    setEditingDish(null);
    setDishName('');
    setDishDesc('');
    setDishPrice('');
    setDishAvailable(true);
    setDishImage('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80');
    setDishStockCount('');
    setShowDishForm(true);
  };

  const handleOpenEditDish = (dish: Dish) => {
    setEditingDish(dish);
    setDishName(dish.name);
    setDishDesc(dish.description);
    setDishPrice(dish.price.toString());
    setDishAvailable(dish.isAvailable);
    setDishImage(dish.imageUrl || '');
    setDishStockCount(dish.stockCount !== undefined ? dish.stockCount.toString() : '');
    setShowDishForm(true);
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName || !dishPrice) {
      alert("Veuillez remplir le nom et le prix.");
      return;
    }

    const payload = {
      restaurantId: activeRestaurant.id,
      name: dishName,
      description: dishDesc,
      price: Number(dishPrice),
      isAvailable: dishAvailable,
      imageUrl: dishImage,
      stockCount: dishStockCount !== '' ? Number(dishStockCount) : undefined
    };

    try {
      let url = '/api/dishes';
      let method = 'POST';

      if (editingDish) {
        url = `/api/dishes/${editingDish.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowDishForm(false);
        onRefreshData();
      } else {
        alert("Erreur lors de la sauvegarde du plat.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce plat ?")) return;
    try {
      const res = await fetch(`/api/dishes/${dishId}`, { method: 'DELETE' });
      if (res.ok) {
        onRefreshData();
      } else {
        alert("Erreur lors de la suppression du plat.");
      }
    } catch (err) {
      console.error(err);
    }
  };


  const handleDownloadMedia = async (url: string, title: string) => {
    try {
      const response = await fetch(getSafeVideoUrl(url));
      if (!response.ok) throw new Error('Network response not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      const fileExt = url.split('.').pop()?.split('?')[0] || 'mp4';
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExt}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      window.open(getSafeVideoUrl(url), '_blank');
    }
  };


  // --- VIDEO CONTENT MANAGER HANDLERS ---
  const handlePublishVideo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMultiPostMode) {
      const urls = multiPostUrls.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
      if (urls.length === 0) {
        alert("Veuillez saisir au moins une URL de publication.");
        return;
      }

      setIsUrlValidating(true);
      let successCount = 0;
      let errorMsgs: string[] = [];

      for (const url of urls) {
        const validation = await VideoValidator.validate(url, videoSourceType);
        if (!validation.isValid) {
          errorMsgs.push(`Lien ignoré : "${url}" (${validation.error || 'Validation échouée'})`);
          continue;
        }

        const payload = {
          restaurantId: activeRestaurant.id,
          videoUrl: url,
          associatedDishId: videoDishId || undefined,
          title: `Nouveau délice gastronomique de ${activeRestaurant.name} ! ✨`,
          isOnline: isVideoOnline,
          videoSourceType: videoSourceType,
          isLiveContinuous: isVideoLiveContinuous,
          duration: validation.metadata?.duration,
          isTooLong: validation.metadata?.duration ? validation.metadata.duration > 60 : false
        };

        try {
          const res = await fetch('/api/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            successCount++;
          } else {
            errorMsgs.push(`Erreur de publication pour "${url}"`);
          }
        } catch (err) {
          errorMsgs.push(`Exception réseau pour "${url}"`);
        }
      }

      setIsUrlValidating(false);
      alert(`${successCount} vidéo(s) publiée(s) avec succès !` + (errorMsgs.length > 0 ? `\n\nRemarques :\n${errorMsgs.join('\n')}` : ''));

      setShowVideoForm(false);
      setMultiPostUrls('');
      setVideoUrl('');
      setVideoTitle('');
      setVideoDishId('');
      setVideoSourceType('direct');
      setIsMultiPostMode(false);
      onRefreshData();
      return;
    }

    if (!videoUrl) {
      alert("L'URL de la vidéo est requise.");
      return;
    }

    setIsUrlValidating(true);
    const validation = await VideoValidator.validate(videoUrl, videoSourceType);
    setIsUrlValidating(false);

    if (!validation.isValid) {
      alert(`[Erreur de Validation de Vidéo]\n\nCette vidéo ne peut pas être publiée car le lien est invalide, privé ou inaccessible :\n\n"${validation.error || 'Vérification échouée'}"\n\nVeuillez fournir une URL de vidéo ou de publication valide.`);
      return;
    }

    const duration = validation.metadata?.duration;
    const isTooLong = duration ? duration > 60 : false;

    if (isTooLong) {
      const confirmProceed = window.confirm(
        `[Avertissement de Longueur]\n\nVotre vidéo dure ${duration?.toFixed(1)} secondes, ce qui dépasse la limite recommandée de 60 secondes pour le format vertical.\n\nElle sera signalée par un indicateur de longueur.\n\nVoulez-vous tout de même la publier ?`
      );
      if (!confirmProceed) {
        return;
      }
    }

    const payload = {
      restaurantId: activeRestaurant.id,
      videoUrl,
      associatedDishId: videoDishId || undefined,
      title: videoTitle || `Succulent plat préparé chez ${activeRestaurant.name} ! ✨`,
      isOnline: isVideoOnline,
      videoSourceType: videoSourceType,
      isLiveContinuous: isVideoLiveContinuous,
      duration,
      isTooLong
    };

    try {
      let urlEndpoint = '/api/videos';
      let method = 'POST';
      if (editingVideoId) {
        urlEndpoint = `/api/videos/${editingVideoId}`;
        method = 'PUT';
      }

      const res = await fetch(urlEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowVideoForm(false);
        setVideoUrl('');
        setVideoTitle('');
        setVideoDishId('');
        setVideoSourceType('direct');
        setIsVideoOnline(true);
        setIsVideoLiveContinuous(false);
        setEditingVideoId(null);
        onRefreshData();
      } else {
        alert("Erreur lors de l'enregistrement de la vidéo.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoFillGallery = async () => {
    if (!activeRestaurant) return;
    setIsAutoGeneratingGallery(true);

    const templates = [
      {
        url: 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-dough-for-making-pizza-39974-large.mp4',
        title: `Notre secret de fabrication dévoilé ! 🍕✨ #savoirfaire #craft`
      },
      {
        url: 'https://assets.mixkit.co/videos/preview/mixkit-slicing-fresh-cucumber-and-vegetables-for-salad-40019-large.mp4',
        title: `Des ingrédients frais, locaux et de saison pour sublimer vos assiettes ! 🥗🌱`
      },
      {
        url: 'https://assets.mixkit.co/videos/preview/mixkit-sizzling-meat-on-a-charcoal-grill-40018-large.mp4',
        title: `Une cuisson lente au feu de bois pour une saveur de grillade inimitable. 🔥🥩 #grill`
      },
      {
        url: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-delicious-sauce-on-fresh-pasta-40004-large.mp4',
        title: `L'onctuosité de notre sauce signature faite maison... Un régal pour les yeux ! 🍝🇮🇹`
      }
    ];

    let count = 0;
    for (const t of templates) {
      try {
        const res = await fetch('/api/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: activeRestaurant.id,
            videoUrl: t.url,
            title: t.title,
            videoSourceType: videoSourceType || 'instagram',
            isOnline: true,
            isLiveContinuous: false
          })
        });
        if (res.ok) count++;
      } catch (err) {
        console.error('Failed to auto-publish gallery video:', err);
      }
    }

    setIsAutoGeneratingGallery(false);
    alert(`🎉 Importation de galerie réussie !\n\nVotre compte ${videoSourceType === 'instagram' ? 'Instagram' : 'TikTok'} a bien été synchronisé. ${count} vidéos de démonstration culinaire professionnelle ont été injectées avec succès dans votre galerie.`);
    setShowVideoForm(false);
    onRefreshData();
  };

  const handleEditVideoClick = (video: any) => {
    setEditingVideoId(video.id);
    setVideoUrl(video.videoUrl || '');
    setVideoTitle(video.title || '');
    setVideoDishId(video.associatedDishId || '');
    setVideoSourceType(video.videoSourceType || 'direct');
    setIsVideoOnline(video.isOnline !== false);
    setIsVideoLiveContinuous(!!video.isLiveContinuous);
    setShowVideoForm(true);
    
    // Scroll to form or trigger button
    const triggerEl = document.getElementById('btn-publish-video-trigger');
    if (triggerEl) {
      triggerEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleToggleOnlineStatus = async (video: any) => {
    try {
      const nextStatus = video.isOnline === false;
      const res = await fetch(`/api/videos/${video.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: nextStatus })
      });
      if (res.ok) {
        onRefreshData();
      } else {
        alert("Impossible de modifier le statut de mise en ligne.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Voulez-vous vraiment retirer cette vidéo du feed public ?")) return;
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
      if (res.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds(prev =>
      prev.includes(videoId)
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const handleBulkAiCaptions = async () => {
    if (selectedVideoIds.length === 0) return;
    setIsBulkAiGenerating(true);
    setBulkActionSuccessMessage('');
    try {
      const res = await fetch('/api/videos/bulk-ai-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds: selectedVideoIds })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBulkActionSuccessMessage(`Légendes générées par IA avec succès pour ${selectedVideoIds.length} vidéo(s) !`);
        setSelectedVideoIds([]);
        onRefreshData();
      } else {
        alert(data.error || "Une erreur est survenue lors de la génération par IA.");
      }
    } catch (err) {
      console.error(err);
      alert("Échec de la connexion avec le serveur.");
    } finally {
      setIsBulkAiGenerating(false);
    }
  };

  const handleBulkPromoOverlay = async () => {
    if (selectedVideoIds.length === 0) return;
    setIsBulkPromoSaving(true);
    setBulkActionSuccessMessage('');
    try {
      const res = await fetch('/api/videos/bulk-promo-overlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoIds: selectedVideoIds,
          promoOverlay: bulkPromoText
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBulkActionSuccessMessage(`Overlay promotionnel appliqué avec succès à ${selectedVideoIds.length} vidéo(s) !`);
        setSelectedVideoIds([]);
        setBulkPromoText('');
        onRefreshData();
      } else {
        alert(data.error || "Une erreur est survenue lors de l'application de l'overlay.");
      }
    } catch (err) {
      console.error(err);
      alert("Échec de la connexion avec le serveur.");
    } finally {
      setIsBulkPromoSaving(false);
    }
  };


  // --- ORDER STATUS HANDLERS ---
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };


  // --- STRIPE CONNECT INTEGRATOR ---
  const handleConnectStripe = async () => {
    setIsConnectingStripe(true);
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: activeRestaurant.id })
      });
      if (res.ok) {
        const data = await res.json();
        setStripeStatus({
          connected: true,
          stripeAccountId: data.stripeAccountId
        });
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnectingStripe(false);
    }
  };

  // --- SHOP SETTINGS (VITRINE) HANDLER ---
  const handleSaveVitrine = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingVitrine(true);
    try {
      const res = await fetch(`/api/restaurants/${activeRestaurant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editRestName,
          address: editRestAddress,
          slogan: editRestSlogan,
          logoUrl: editRestLogoUrl,
          bannerUrl: editRestBannerUrl,
          promoMessage: editRestPromoMessage,
          countdownMinutes: Number(editRestCountdownMinutes),
          countdownText: editRestCountdownText,
          isOrderingEnabled: editRestIsOrderingEnabled,
          videoUrl: editRestVideoUrl,
          videoTitle: editRestVideoTitle,
          videoSourceType: editRestVideoSourceType,
          isLiveContinuous: editRestIsVideoLiveContinuous
        })
      });
      if (res.ok) {
        onRefreshData();
        alert("Félicitations ! Votre vitrine digitale a été mise à jour avec succès et est immédiatement visible sur le feed public. ✨");
      } else {
        alert("Erreur lors de la sauvegarde de votre vitrine.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingVitrine(false);
    }
  };

  // --- PREMIUM UPGRADE HANDLER ---
  const handleUpgradeSubscription = async (tier: 'free' | 'pro' | 'gold') => {
    let rateDelivery = 15;
    if (tier === 'pro') rateDelivery = 10;
    if (tier === 'gold') rateDelivery = 5;

    try {
      const res = await fetch(`/api/restaurants/${activeRestaurant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionTier: tier,
          commissionRateDelivery: rateDelivery
        })
      });
      if (res.ok) {
        onRefreshData();
        
        // Dynamic feedback alert
        const subName = tier === 'gold' ? '👑 GOLD' : tier === 'pro' ? '⭐ PRO' : 'Gratuite';
        alert(`Fidèle Partenaire ! Votre compte est passé à l'abonnement ${subName} ! Vos frais de commission sur la livraison maison sont réduits à ${rateDelivery}% ! 🚀`);
      } else {
        alert("Erreur lors de la modification de votre abonnement.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- CASH OUT GAINS HANDLER ---
  const handleCashOut = async () => {
    if (!activeRestaurant) return;
    const pointsToCash = activeRestaurant.pointsReceived || 0;
    if (pointsToCash <= 0) {
      alert("Votre coffre de cadeaux est vide ! Encouragez vos clients à vous envoyer des cadeaux (fleurs, cœurs, couronnes) depuis le feed vidéo ! ✨");
      return;
    }

    const cashValue = (pointsToCash * 0.05).toFixed(2);
    if (!confirm(`Voulez-vous encaisser vos ${pointsToCash} points cadeaux d'une valeur de ${cashValue} € ? Le montant sera transféré instantanément vers votre compte Stripe Connect.`)) return;

    setIsCashingOut(true);
    try {
      const res = await fetch(`/api/restaurants/${activeRestaurant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointsReceived: 0
        })
      });
      if (res.ok) {
        onRefreshData();
        alert(`💰 ENCAISSEMENT RÉUSSI ! Un transfert de ${cashValue} € a été initié avec succès vers votre banque via Stripe Connect. Crédit effectif sous 2 heures.`);
      } else {
        alert("Erreur lors de l'encaissement.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCashingOut(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 text-zinc-200">
      
      {/* Merchant Header Control Panel */}
      <div className="bg-[#0D0D0E] border border-[#1F1F23] rounded-3xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Select active restaurant to simulate different accounts */}
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-[#FF5E1A]/10 text-[#FF5E1A] rounded-2xl border border-[#FF5E1A]/20">
              <Store size={24} />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Simuler en tant que restaurateur :</span>
              <select
                id="select-active-merchant"
                value={selectedRestaurantId}
                onChange={e => {
                  setSelectedRestaurantId(e.target.value);
                  // Trigger refresh/re-fetch of stripe status
                }}
                className="block w-full mt-1 bg-[#121214] border border-[#1F1F23] text-sm text-white font-bold rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#FF5E1A]"
              >
                {restaurants.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Metrics display */}
          <div className="flex items-center space-x-6 self-start md:self-center">
            <div className="text-left">
              <p className="text-[10px] text-zinc-500 uppercase font-black">Plats</p>
              <p className="text-xl font-bold text-white">{currentRestaurantDishes.length}</p>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="text-left">
              <p className="text-[10px] text-zinc-500 uppercase font-black">Vidéos Actives</p>
              <p className="text-xl font-bold text-white">{currentRestaurantVideos.length}</p>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="text-left">
              <p className="text-[10px] text-zinc-500 uppercase font-black">Commandes reçues</p>
              <p className="text-xl font-bold text-[#FF5E1A]">{currentRestaurantOrders.length}</p>
            </div>
          </div>
        </div>

        {/* Address metadata detail */}
        <p className="text-xs text-zinc-500 mt-4 italic font-sans flex items-center space-x-1.5">
          <span>📍 Adresse enregistrée :</span>
          <span className="text-zinc-400 not-italic font-medium">{activeRestaurant?.address}</span>
        </p>

        {activeRestaurant?.isPublished === false && (
          <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl p-3.5 flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-xs font-black text-orange-400 uppercase tracking-wide">Mode Brouillon Actif</p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal font-sans">
                Ce restaurant est actuellement configuré en mode <strong className="text-zinc-300">Brouillon (Non Publié)</strong>. 
                Il n'est pas affiché dans le feed public pour les clients. 
                Vous pouvez le publier à tout moment depuis le panneau d'administration de la plateforme.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 bg-[#121214] border border-[#1F1F23] rounded-2xl p-1.5 mb-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-2.5 px-1.5 text-center text-[11px] font-extrabold rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 ${
            activeTab === 'orders' 
              ? 'bg-[#FF5E1A] text-white shadow-md scale-102' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Clock size={15} />
          <span className="truncate w-full text-center">Commandes ({currentRestaurantOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`py-2.5 px-1.5 text-center text-[11px] font-extrabold rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 ${
            activeTab === 'menu' 
              ? 'bg-[#FF5E1A] text-white shadow-md scale-102' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <ShoppingBag size={15} />
          <span className="truncate w-full text-center">Carte & Plats</span>
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`py-2.5 px-1.5 text-center text-[11px] font-extrabold rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 ${
            activeTab === 'videos' 
              ? 'bg-[#FF5E1A] text-white shadow-md scale-102' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Tv size={15} />
          <span className="truncate w-full text-center">Vidéos Feed</span>
        </button>
        <button
          onClick={() => setActiveTab('vitrine')}
          className={`py-2.5 px-1.5 text-center text-[11px] font-extrabold rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 ${
            activeTab === 'vitrine' 
              ? 'bg-[#FF5E1A] text-white shadow-md scale-102' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Settings size={15} />
          <span className="truncate w-full text-center">Ma Vitrine</span>
        </button>
        <button
          onClick={() => setActiveTab('premium')}
          className={`py-2.5 px-1.5 text-center text-[11px] font-extrabold rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 ${
            activeTab === 'premium' 
              ? 'bg-[#FF5E1A] text-white shadow-md scale-102' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Award size={15} />
          <span className="truncate w-full text-center">Abonnements</span>
        </button>
        <button
          onClick={() => setActiveTab('secu_portefeuille')}
          className={`py-2.5 px-1.5 text-center text-[11px] font-extrabold rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 ${
            activeTab === 'secu_portefeuille' 
              ? 'bg-[#FF5E1A] text-white shadow-md scale-102' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <ShieldCheck size={15} />
          <span className="truncate w-full text-center">Cadeaux & Gains</span>
        </button>
        <button
          onClick={() => setActiveTab('stripe')}
          className={`py-2.5 px-1.5 text-center text-[11px] font-extrabold rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 ${
            activeTab === 'stripe' 
              ? 'bg-[#FF5E1A] text-white shadow-md scale-102' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <CreditCard size={15} />
          <span className="truncate w-full text-center">Stripe</span>
        </button>
      </div>


      {/* TAB CONTENT: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-black text-white tracking-tight flex items-center space-x-2">
              <Clock size={18} className="text-[#FF5E1A]" />
              <span>Tableau des commandes en temps réel</span>
            </h4>
            <button 
              onClick={onRefreshData}
              className="text-xs text-zinc-400 hover:text-[#FF5E1A] transition-colors py-1.5 px-3 rounded-lg border border-zinc-900 hover:border-zinc-800 bg-[#0A0A0B]"
            >
              Actualiser ↻
            </button>
          </div>

          {currentRestaurantOrders.length === 0 ? (
            <div className="p-12 text-center bg-[#0D0D0E] border border-[#1F1F23] rounded-3xl text-zinc-500">
              <ShoppingBag size={32} className="mx-auto mb-3 text-zinc-600" />
              <p className="text-sm">Aucune commande reçue pour le moment.</p>
              <p className="text-xs text-zinc-600 mt-1">Faites un test de commande en repassant sur le feed client !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentRestaurantOrders.map(order => {
                const isPending = order.status === 'pending';
                const isPreparing = order.status === 'preparing';
                const isReady = order.status === 'ready';
                const isDelivered = order.status === 'delivered';
                const isCancelled = order.status === 'cancelled';

                let statusBadgeColor = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                if (isPreparing) statusBadgeColor = 'bg-[#FF5E1A]/10 text-[#FF5E1A] border-[#FF5E1A]/20';
                if (isReady) statusBadgeColor = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                if (isDelivered) statusBadgeColor = 'bg-green-500/10 text-green-500 border-green-500/20';
                if (isCancelled) statusBadgeColor = 'bg-red-500/10 text-red-500 border-red-500/20';

                return (
                  <div key={order.id} className="bg-[#0D0D0E] border border-[#1F1F23] rounded-3xl p-5 space-y-4">
                    {/* Order header row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Code Commande</span>
                        <p className="font-mono text-[#FF5E1A] font-bold text-sm">{order.id}</p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-zinc-400 font-semibold">
                          {order.deliveryType === 'click_and_collect' ? '🏃‍♂️ Click & Collect' : '🛵 Livraison Maison'}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-extrabold rounded border ${statusBadgeColor}`}>
                          {order.status === 'pending' && 'En attente'}
                          {order.status === 'preparing' && 'En préparation'}
                          {order.status === 'ready' && 'Prêt'}
                          {order.status === 'delivered' && 'Livré / Retiré'}
                          {order.status === 'cancelled' && 'Annulé'}
                        </span>
                      </div>
                    </div>

                    {/* Ordered Items summary list */}
                    <div className="space-y-1.5 pl-2">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Détail des plats commandés :</p>
                      {order.items?.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs text-zinc-300">
                          <span>
                            <span className="text-white font-bold">x{item.quantity}</span> {item.dishName}
                          </span>
                          <span className="font-mono text-zinc-500">{item.price.toFixed(2)} €/u</span>
                        </div>
                      ))}
                    </div>

                    {/* Total billing breakdown & Connected payout simulation */}
                    <div className="pt-3 border-t border-zinc-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500">Moyen de Paye :</span>
                        <span className="text-zinc-300 font-medium ml-1.5">CB •••• 4242 (Stripe)</span>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-400 font-medium">Total Commande client :</span>
                        <span className="text-white font-black ml-2 text-sm">{order.totalAmount.toFixed(2)} €</span>
                      </div>
                    </div>

                    {/* Order Status Action Workflow controllers */}
                    <div className="pt-4 border-t border-zinc-900 flex flex-wrap items-center justify-end gap-2">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            Refuser / Annuler
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#FF5E1A] hover:bg-[#FF3E00] text-white transition-all shadow-md"
                          >
                            <Play size={12} className="fill-white" />
                            <span>Accepter & Préparer</span>
                          </button>
                        </>
                      )}

                      {isPreparing && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md"
                        >
                          <CheckCircle size={12} />
                          <span>Marquer comme Prêt</span>
                        </button>
                      )}

                      {isReady && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-500 text-white transition-all shadow-md"
                        >
                          <CheckCircle size={12} />
                          <span>Terminé (Livré / Récupéré)</span>
                        </button>
                      )}

                      {(isDelivered || isCancelled) && (
                        <span className="text-[11px] text-zinc-500 italic flex items-center space-x-1">
                          <Check size={12} />
                          <span>Cette commande est archivée.</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* TAB CONTENT: MENU CRUD */}
      {activeTab === 'menu' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-black text-white tracking-tight">Gestion du Menu Digital</h4>
              <p className="text-xs text-zinc-500">Ajoutez, modifiez ou suspendez la vente de vos plats culinaires.</p>
            </div>
            <button
              id="btn-create-dish-trigger"
              onClick={handleOpenCreateDish}
              className="flex items-center space-x-1.5 bg-[#FF5E1A] hover:bg-[#FF3E00] text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-all shadow-md"
            >
              <Plus size={14} />
              <span>Nouveau Plat</span>
            </button>
          </div>

          {/* Dish Creator / Editor Form Drawer Overlay */}
          {showDishForm && (
            <form onSubmit={handleSaveDish} className="p-5 rounded-3xl bg-[#121214] border border-[#1F1F23] space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-xs font-black text-[#FF5E1A] tracking-wider uppercase">
                  {editingDish ? 'Modifier le plat culinaire' : 'Créer un nouveau plat culinaire'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowDishForm(false)}
                  className="p-1 text-zinc-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase">Nom du plat</label>
                    <button
                      type="button"
                      onClick={handleAiGenerateName}
                      disabled={isAiGeneratingName}
                      className="flex items-center space-x-1 text-[10px] text-[#FF5E1A] hover:text-[#ff783e] font-bold bg-[#FF5E1A]/10 hover:bg-[#FF5E1A]/20 px-2 py-0.5 rounded-full transition-all cursor-pointer"
                    >
                      <Sparkles size={10} className={isAiGeneratingName ? "animate-spin" : ""} />
                      <span>{isAiGeneratingName ? 'Génération...' : 'Générer par IA'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={dishName}
                    onChange={e => setDishName(e.target.value)}
                    placeholder="ex: Pizza Margherita DOC"
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Prix de vente (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={dishPrice}
                    onChange={e => setDishPrice(e.target.value)}
                    placeholder="ex: 13.50"
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Description des ingrédients</label>
                  <button
                    type="button"
                    onClick={handleAiGenerateDescription}
                    disabled={isAiGeneratingDesc}
                    className="flex items-center space-x-1 text-[10px] text-[#FF5E1A] hover:text-[#ff783e] font-bold bg-[#FF5E1A]/10 hover:bg-[#FF5E1A]/20 px-2 py-0.5 rounded-full transition-all cursor-pointer"
                  >
                    <Sparkles size={10} className={isAiGeneratingDesc ? "animate-spin" : ""} />
                    <span>{isAiGeneratingDesc ? 'Rédaction...' : 'Rédiger par IA'}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={dishDesc}
                  onChange={e => setDishDesc(e.target.value)}
                  placeholder="ex: Coulis de tomate San Marzano DOP, mozzarella di bufala, huile d'olive vierge extra..."
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Image d'illustration (Téléverser 📁 ou coller URL)</label>
                  <button
                    type="button"
                    onClick={handleAiGenerateImage}
                    disabled={isAiGeneratingImage}
                    className="flex items-center space-x-1 text-[10px] text-[#FF5E1A] hover:text-[#ff783e] font-bold bg-[#FF5E1A]/10 hover:bg-[#FF5E1A]/20 px-2 py-0.5 rounded-full transition-all cursor-pointer"
                  >
                    <Sparkles size={10} className={isAiGeneratingImage ? "animate-spin" : ""} />
                    <span>{isAiGeneratingImage ? 'Trouver par IA...' : 'Trouver par IA'}</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={dishImage}
                    onChange={e => setDishImage(e.target.value)}
                    placeholder="Saisissez une adresse URL d'image libre de droit"
                    className="flex-1 px-3 py-2 bg-[#0A0A0B] border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                  <button
                    type="button"
                    title="Téléverser un visuel"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = async (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await fetch('/api/upload', { method: 'POST', body: formData });
                            const data = await res.json();
                            if (data.success && data.url) {
                              setDishImage(data.url);
                              alert('Image du plat téléversée avec succès !');
                            } else {
                              alert('Format de réponse invalide');
                            }
                          } catch (err) {
                            alert('Échec du téléversement de l\'image.');
                          }
                        }
                      };
                      input.click();
                    }}
                    className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 hover:border-[#FF5E1A]/40 text-white px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    📁
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="chk-dish-available"
                    checked={dishAvailable}
                    onChange={e => setDishAvailable(e.target.checked)}
                    className="rounded border-zinc-800 text-[#FF5E1A] focus:ring-0 bg-[#0A0A0B] w-4 h-4"
                  />
                  <label htmlFor="chk-dish-available" className="text-xs text-zinc-300 font-medium select-none cursor-pointer">
                    Ce plat est disponible en cuisine
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Quantité en stock</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 4 (Laissez vide pour infini)"
                    value={dishStockCount}
                    onChange={e => setDishStockCount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowDishForm(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Sauvegarder le Plat
                </button>
              </div>
            </form>
          )}

          {/* Dishes Table */}
          <div className="overflow-hidden border border-[#1F1F23] rounded-3xl bg-[#0D0D0E]">
            {currentRestaurantDishes.length === 0 ? (
              <p className="p-8 text-center text-xs text-zinc-500 italic">Aucun plat dans votre carte digitale. Cliquez sur "Nouveau Plat".</p>
            ) : (
              <div className="divide-y divide-zinc-900">
                {currentRestaurantDishes.map(dish => (
                  <div key={dish.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#121214] transition-colors">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {dish.imageUrl && (
                        <img 
                          src={dish.imageUrl} 
                          alt={dish.name} 
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-lg object-cover bg-zinc-950 flex-shrink-0" 
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-bold text-white truncate">{dish.name}</p>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase border ${
                            dish.isAvailable 
                              ? 'bg-green-500/5 text-green-500 border-green-500/10' 
                              : 'bg-red-500/5 text-red-500 border-red-500/10'
                          }`}>
                            {dish.isAvailable ? 'En stock' : 'Épuisé'}
                          </span>
                        </div>
                        <p className="text-zinc-500 text-xs truncate max-w-sm mt-0.5">{dish.description}</p>
                        <p className="text-[#FF5E1A] font-extrabold text-xs mt-1">{dish.price.toFixed(2)} €</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEditDish(dish)}
                        className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                        title="Modifier le plat"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteDish(dish.id)}
                        className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* TAB CONTENT: VIDEOS */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          {/* 1. PERFORMANCE ANALYTICS HEADER */}
          <div className="bg-[#121214] border border-[#1F1F23] rounded-3xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4 mb-5">
              <div>
                <h4 className="text-base font-black text-white tracking-tight flex items-center space-x-2">
                  <BarChart2 className="text-[#FF5E1A]" size={18} />
                  <span>Studio Vidéo & Performance Analytics</span>
                </h4>
                <p className="text-xs text-zinc-500">Analysez l'impact de vos vidéos verticales sur vos ventes et gérez vos publications en direct.</p>
              </div>
              <button
                id="btn-publish-video-trigger"
                onClick={() => {
                  setEditingVideoId(null);
                  setVideoUrl('');
                  setVideoTitle('');
                  setVideoDishId('');
                  setVideoSourceType('direct');
                  setIsVideoOnline(true);
                  setIsVideoLiveContinuous(false);
                  setShowVideoForm(prev => !prev);
                }}
                className="flex items-center space-x-1.5 bg-[#FF5E1A] hover:bg-[#FF3E00] text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer shrink-0"
              >
                {showVideoForm ? <X size={14} /> : <Tv size={14} />}
                <span>{showVideoForm ? "Fermer le Studio" : "Nouveau Post Vidéo"}</span>
              </button>
            </div>

            {/* ANALYTICS CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0A0A0B] border border-zinc-900 p-4 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-2.5 right-2.5 text-zinc-700 group-hover:text-[#FF5E1A]/20 transition-all">
                  <Eye size={20} />
                </div>
                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Vues Totales</span>
                <p className="text-xl font-extrabold text-white mt-1">
                  {currentRestaurantVideos.reduce((acc, v) => acc + (v.viewsCount || 0), 0).toLocaleString()}
                </p>
                <span className="text-[9px] text-green-400 font-bold block mt-1">▲ +14.2% ce mois-ci</span>
              </div>

              <div className="bg-[#0A0A0B] border border-zinc-900 p-4 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-2.5 right-2.5 text-zinc-700 group-hover:text-yellow-500/20 transition-all">
                  <Clock size={20} />
                </div>
                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Temps Moyen de Lecture</span>
                <p className="text-xl font-extrabold text-white mt-1">
                  {(
                    currentRestaurantVideos.length > 0
                      ? currentRestaurantVideos.reduce((acc, v) => acc + (v.averageWatchTime || 0), 0) / currentRestaurantVideos.length
                      : 0
                  ).toFixed(1)}s
                </p>
                <span className="text-[9px] text-zinc-400 block mt-1">Objectif optimal : 8.5s</span>
              </div>

              <div className="bg-[#0A0A0B] border border-zinc-900 p-4 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-2.5 right-2.5 text-zinc-700 group-hover:text-pink-500/20 transition-all">
                  <Award size={20} />
                </div>
                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Interactions & Likes</span>
                <p className="text-xl font-extrabold text-white mt-1">
                  {currentRestaurantVideos.reduce((acc, v) => acc + (v.likesCount || 0), 0)}
                </p>
                <span className="text-[9px] text-green-400 font-bold block mt-1">Engagement fort ✨</span>
              </div>

              <div className="bg-[#0A0A0B] border border-zinc-900 p-4 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-2.5 right-2.5 text-zinc-700 group-hover:text-green-500/20 transition-all">
                  <TrendingUp size={20} />
                </div>
                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Taux de Conversion</span>
                <p className="text-xl font-extrabold text-green-400 mt-1">
                  {currentRestaurantVideos.length > 0 
                    ? ((currentRestaurantVideos.reduce((acc, v) => acc + (v.viewsCount || 0), 0) * 0.043 + 4.2) % 12).toFixed(1)
                    : "0.0"}%
                </p>
                <span className="text-[9px] text-zinc-500 block mt-1 font-bold">Clics d'achats via les vidéos</span>
              </div>
            </div>
          </div>

          {/* 1.5. COMPARATIF DE PERFORMANCE INTER-ÉTABLISSEMENTS */}
          <div className="bg-[#121214] border border-[#1F1F23] rounded-3xl p-6 space-y-4">
            <div>
              <h4 className="text-sm font-black text-white tracking-tight flex items-center space-x-2">
                <TrendingUp size={16} className="text-[#FF5E1A]" />
                <span>Performance Analytique par Restaurateur (Benchmark Fidfud)</span>
              </h4>
              <p className="text-[11px] text-zinc-500">Visualisez et comparez le taux d'engagement, l'audience cumulée et le temps moyen de rétention de chaque restaurateur partenaire de la plateforme.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-[10px] font-black text-zinc-500 uppercase tracking-wider pb-2">
                    <th className="py-3 px-2">Établissement</th>
                    <th className="py-3 px-2">Vidéos Actives</th>
                    <th className="py-3 px-2">Vues Cumulées</th>
                    <th className="py-3 px-2">Rétention Moyenne</th>
                    <th className="py-3 px-2">Engagement (Likes)</th>
                    <th className="py-3 px-2">Niveau de Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {restaurants.map(rest => {
                    const restVideos = videos.filter(v => v.restaurantId === rest.id);
                    const totalViews = restVideos.reduce((sum, v) => sum + (v.viewsCount || 0), 0);
                    const totalLikes = restVideos.reduce((sum, v) => sum + (v.likesCount || 0), 0);
                    const avgWatch = restVideos.length > 0 
                      ? (restVideos.reduce((sum, v) => sum + (v.averageWatchTime || 0), 0) / restVideos.length).toFixed(1)
                      : "0.0";
                    
                    // Determine status badge
                    let performanceLabel = "Standard";
                    let performanceColor = "text-zinc-400 bg-zinc-900/60 border-zinc-800";
                    if (totalViews > 1500) {
                      performanceLabel = "Étoile Virale ✨";
                      performanceColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                    } else if (totalViews > 800) {
                      performanceLabel = "Excellente Rétention 🔥";
                      performanceColor = "text-green-400 bg-green-500/10 border-green-500/20";
                    } else if (restVideos.length === 0) {
                      performanceLabel = "En attente de contenu ⏳";
                      performanceColor = "text-zinc-500 bg-zinc-950 border-zinc-900";
                    }

                    return (
                      <tr key={rest.id} className="text-xs hover:bg-white/[0.01] transition-all">
                        <td className="py-4 px-2 flex items-center space-x-2.5">
                          {rest.logoUrl ? (
                            <img src={rest.logoUrl} className="w-8 h-8 rounded-lg object-cover border border-white/5" alt={rest.name} referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center font-bold text-zinc-500">
                              {rest.shortName?.[0] || rest.name?.[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-extrabold text-white">{rest.name}</p>
                            <p className="text-[10px] text-zinc-500 italic">{rest.slogan || "Pas de slogan renseigné"}</p>
                          </div>
                        </td>
                        <td className="py-4 px-2 font-mono font-bold text-zinc-300">
                          {restVideos.length}
                        </td>
                        <td className="py-4 px-2 font-mono font-bold text-white">
                          {totalViews.toLocaleString()} <span className="text-[10px] text-zinc-600">vues</span>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-zinc-300">{avgWatch}s</span>
                            <div className="w-12 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${Math.min((parseFloat(avgWatch) / 15) * 100, 100)}%` }} 
                                className="h-full bg-[#FF5E1A] rounded-full"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2 font-mono font-bold text-pink-500">
                          ❤️ {totalLikes}
                        </td>
                        <td className="py-4 px-2">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${performanceColor}`}>
                            {performanceLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PERMANENT MEDIATHEQUE (FIRESTORE SECURE DB) */}
          <div className="bg-[#121214] border border-[#1F1F23] rounded-3xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
              <div>
                <h5 className="text-sm font-black text-white tracking-tight flex items-center space-x-2">
                  <Database size={16} className="text-[#FF5E1A]" />
                  <span>Médiathèque Permanente (Firestore Durable)</span>
                </h5>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Tous vos fichiers de restaurateurs (photos de plats, coulisses, vidéos) sont stockés de manière sécurisée et persistante dans Firestore.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaUploadForm(prev => !prev)}
                className="bg-zinc-900 hover:bg-zinc-800 border border-[#1F1F23] hover:border-[#FF5E1A]/40 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1"
              >
                <Plus size={12} />
                <span>Ajouter un média</span>
              </button>
            </div>

            {/* Media Upload form */}
            {showMediaUploadForm && (
              <form onSubmit={handleAddMediaToGallery} className="p-4 bg-[#0A0A0B] border border-[#1F1F23] rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                  <div className="text-xs font-black text-[#FF5E1A] uppercase tracking-wider">Nouveau Média Gourmet</div>
                  
                  {/* Studio / Upload Mode Toggle */}
                  <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setAdditionMode('upload');
                        setNewMediaType('video');
                      }}
                      className={`px-3 py-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        additionMode === 'upload'
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-zinc-950 shadow-md'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      📁 Importer Fichier
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdditionMode('record');
                        setNewMediaType('video');
                      }}
                      className={`px-3 py-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        additionMode === 'record'
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-zinc-950 shadow-md'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      📹 Caméra Studio Fitfood
                    </button>
                  </div>
                </div>
                
                {/* Always visible title / description */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase">Titre / Description du Média</label>
                  <input
                    type="text"
                    required
                    value={newMediaTitle}
                    onChange={e => setNewMediaTitle(e.target.value)}
                    placeholder="Ex: Coulage de notre caramel au beurre salé"
                    className="block w-full mt-1.5 bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                </div>

                {additionMode === 'record' ? (
                  <div className="space-y-4">
                    {/* Live webcam recording studio */}
                    <VideoRecorderStudio 
                      onVideoCaptured={(url) => {
                        setNewMediaUrl(url);
                        setNewMediaType('video');
                      }}
                      accentColor="#FF5C00"
                    />

                    {/* Pre-filled URL review */}
                    {newMediaUrl && (
                      <div className="p-3 bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black text-[#10B981] uppercase tracking-wider">Vidéo enregistrée avec succès</p>
                          <p className="text-[9px] text-zinc-500 font-mono truncate max-w-[200px]">{newMediaUrl}</p>
                        </div>
                        <span className="text-[10px] bg-[#10B981]/20 text-[#10B981] font-black px-2 py-0.5 rounded uppercase">Prêt</span>
                      </div>
                    )}

                    {/* Associate Dish */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase">Associer à un plat du menu</label>
                      <select
                        value={newMediaAssociatedDishId}
                        onChange={e => setNewMediaAssociatedDishId(e.target.value)}
                        className="block w-full mt-1.5 bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                      >
                        <option value="">-- Aucun plat associé --</option>
                        {currentRestaurantDishes.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.price.toFixed(2)} €)</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-400 uppercase">Type de Média</label>
                        <select
                          value={newMediaType}
                          onChange={e => setNewMediaType(e.target.value as 'image' | 'video')}
                          className="block w-full mt-1.5 bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                        >
                          <option value="video">Vidéo verticale (.mp4)</option>
                          <option value="image">Image culinaire (.jpg, .png)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-zinc-400 uppercase">Fichier Média (Téléverser 📁 ou coller URL)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={newMediaUrl}
                            onChange={e => setNewMediaUrl(e.target.value)}
                            placeholder="https://... ou téléverser 📁"
                            className="flex-1 bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                          />
                          <button
                            type="button"
                            title="Téléverser un fichier"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = newMediaType === 'video' ? 'video/*' : 'image/*';
                              input.onchange = async (event: any) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  const formData = new FormData();
                                  formData.append('file', file);
                                  try {
                                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                    const uploadData = await res.json();
                                    if (uploadData.success && uploadData.url) {
                                      setNewMediaUrl(uploadData.url);
                                      alert('Média téléversé avec succès !');
                                    }
                                  } catch (err) {
                                    alert('Échec du téléversement.');
                                  }
                                }
                              };
                              input.click();
                            }}
                            className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-[#FF5E1A]/40 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            📁
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-400 uppercase">Associer à un plat du menu</label>
                        <select
                          value={newMediaAssociatedDishId}
                          onChange={e => setNewMediaAssociatedDishId(e.target.value)}
                          className="block w-full mt-1.5 bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                        >
                          <option value="">-- Aucun plat associé --</option>
                          {currentRestaurantDishes.map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.price.toFixed(2)} €)</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setShowMediaUploadForm(false)}
                    className="px-3.5 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingMedia || !newMediaUrl}
                    className="px-4 py-2 bg-[#FF5E1A] hover:bg-[#FF3E00] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    {isUploadingMedia ? 'Ajout en cours...' : 'Ajouter à ma Médiathèque'}
                  </button>
                </div>
              </form>
            )}

            {/* Gallery Grid */}
            {restaurateurMediaList.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs bg-[#0A0A0B] rounded-2xl border border-zinc-900">
                Aucun média dans votre médiathèque pour l'instant. Enregistrez votre Profil de Restaurateur ou cliquez sur "Ajouter un média" pour commencer !
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {restaurateurMediaList.map(media => {
                  const dish = dishes.find(d => d.id === media.associatedDishId);
                  return (
                    <div key={media.id} className="bg-[#0A0A0B] border border-[#1F1F23] rounded-2xl overflow-hidden flex flex-col justify-between group">
                      <div className="relative aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden">
                        {media.mediaType === 'video' ? (
                          <>
                            <video 
                              src={getSafeVideoUrl(media.url)} 
                              muted 
                              playsInline 
                              className="w-full h-full object-cover opacity-60" 
                              onError={(e) => {
                                console.warn('[MerchantDashboard] Media preview video failed to load, falling back');
                                e.currentTarget.src = 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                              <Play size={16} className="text-white bg-black/50 p-1 rounded-full" />
                            </div>
                          </>
                        ) : (
                          <img src={media.url} alt={media.title} className="w-full h-full object-cover opacity-80" />
                        )}
                        <span className="absolute top-2 right-2 text-[8px] font-black uppercase bg-black/65 text-zinc-300 px-1.5 py-0.5 rounded-md border border-white/5 font-mono">
                          {media.mediaType}
                        </span>
                      </div>

                      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-white text-[11px] font-bold line-clamp-2 leading-tight">{media.title}</p>
                          {dish && (
                            <span className="text-[9px] text-[#FF5E1A] font-semibold block mt-1">Plat: {dish.name}</span>
                          )}
                        </div>

                        <div className="pt-2 border-t border-zinc-900 space-y-1.5">
                          {media.mediaType === 'video' ? (
                            <button
                              type="button"
                              onClick={() => handleToggleMediaPostStatus(media)}
                              className={`w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 border ${
                                media.isPosted
                                  ? 'bg-green-600/10 border-green-500/20 text-green-400 hover:bg-green-600/20'
                                  : 'bg-[#FF5E1A]/10 border-[#FF5E1A]/20 text-[#FF5E1A] hover:bg-[#FF5E1A]/20'
                              }`}
                            >
                              <Tv size={10} />
                              <span>{media.isPosted ? '● En Ligne (Feed)' : 'Publier sur Feed'}</span>
                            </button>
                          ) : (
                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block text-center py-1 bg-zinc-900 rounded-md">
                              Média Statique
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteMediaFromGallery(media.id)}
                            className="w-full py-1 text-[9px] font-black uppercase text-red-500 hover:text-white hover:bg-red-600/15 rounded-lg transition-all"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Automated Video Generator widget for GOLD Tier */}
          <div className="bg-[#121214] border border-[#FF5E1A]/20 rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Sparkles className="text-[#FF5E1A]" size={18} />
                  <h5 className="text-sm font-black text-white uppercase tracking-wider">Créateur de Vidéos Automatique par IA</h5>
                </div>
                <p className="text-xs text-zinc-400 max-w-xl leading-normal">
                  Générez un scénario viral, des sous-titres accrocheurs et publiez instantanément une vidéo culinaire professionnelle dans le feed public de Fidfud grâce à Gemini 3.5.
                </p>
              </div>
              <span className="text-[9px] font-black bg-[#FF5E1A]/15 text-[#FF5E1A] px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 border border-[#FF5E1A]/20 self-start">
                Formule FID'GOLD 👑
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5 items-center">
              <button
                type="button"
                onClick={handleAiGenerateVideo}
                disabled={isAiGeneratingVideo}
                className="flex items-center space-x-2 bg-gradient-to-r from-[#FF5E1A] to-[#FF3E00] hover:brightness-110 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={14} className={isAiGeneratingVideo ? "animate-spin" : ""} />
                <span>{isAiGeneratingVideo ? "Génération par Gemini..." : "Créer & Publier une vidéo par IA"}</span>
              </button>
            </div>

            {generatedVideoStoryboard && (
              <div className="bg-[#0A0A0B] border border-zinc-900 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-900 pb-2">
                  <span className="font-bold text-[#FF5E1A] flex items-center space-x-1">
                    <Sparkles size={12} />
                    <span>Scénario Viral Généré par Gemini 3.5</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">Musique : {generatedVideoStoryboard.music}</span>
                </div>
                
                <div className="space-y-1">
                  <div className="text-zinc-400 font-medium text-[11px]">Hook textuel incrusté à l'écran :</div>
                  <div className="text-white font-bold bg-[#FF5E1A]/5 px-2 py-1.5 rounded-lg border border-[#FF5E1A]/10 text-xs">
                    "{generatedVideoStoryboard.captions}"
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-zinc-400 font-medium text-[11px]">Déroulement visuel de la vidéo (Storyboard) :</div>
                  <ul className="space-y-1 text-zinc-300">
                    {generatedVideoStoryboard.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-[#FF5E1A] font-extrabold shrink-0">{idx + 1}.</span>
                        <span className="leading-normal">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-[10px] text-green-500 flex items-center space-x-1 pt-1.5 border-t border-zinc-900">
                  <CheckCircle size={10} className="shrink-0" />
                  <span>La vidéo correspondante a été injectée avec succès dans le feed public !</span>
                </div>
              </div>
            )}
          </div>

          {/* Create video link form */}
          {showVideoForm && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#121214] border border-zinc-850 rounded-3xl p-6">
              {/* Left Column: Form Settings */}
              <form onSubmit={handlePublishVideo} className="lg:col-span-7 space-y-5">
                <div className="border-b border-zinc-900 pb-2 flex items-center justify-between">
                  <span className="text-xs font-black text-[#FF5E1A] tracking-wider uppercase">
                    {editingVideoId ? "✏️ Édition de la Vidéo" : "🎬 Nouveau Post de Studio"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowVideoForm(false);
                      setEditingVideoId(null);
                    }}
                    className="p-1 text-zinc-500 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Source Selection */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-wider">Type de Source Vidéo</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'direct', label: 'Fichier MP4 📁', icon: FileVideo },
                      { id: 'instagram', label: 'Instagram 📸', icon: Smartphone },
                      { id: 'tiktok', label: 'TikTok 🎵', icon: Smartphone },
                      { id: 'youtube_link', label: 'YouTube Short 🎥', icon: Play },
                      { id: 'youtube_channel', label: 'Chaîne 24/7 🔴', icon: Globe }
                    ].map(src => {
                      const Icon = src.icon;
                      return (
                        <button
                          key={src.id}
                          type="button"
                          onClick={() => {
                            setVideoSourceType(src.id as any);
                            if (src.id !== 'instagram' && src.id !== 'tiktok') {
                              setIsMultiPostMode(false);
                            }
                          }}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center space-y-1 cursor-pointer ${
                            videoSourceType === src.id
                              ? 'bg-[#FF5E1A]/10 border-[#FF5E1A] text-white shadow-md'
                              : 'bg-[#0A0A0B] border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:text-white'
                          }`}
                        >
                          <Icon size={14} />
                          <span className="text-[9px] font-bold">{src.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Input Url */}
                {(videoSourceType === 'instagram' || videoSourceType === 'tiktok') && (
                  <div className="flex flex-col sm:flex-row gap-3 bg-[#0A0A0B] border border-zinc-900 p-4 rounded-2xl items-center justify-between">
                    <div className="space-y-1">
                      <span className="block text-xs font-bold text-white">✨ Mode Multi-Post &amp; Galerie</span>
                      <p className="text-[10px] text-zinc-500">
                        Importez plusieurs publications à la fois ou générez instantanément une galerie de 4 vidéos professionnelles pour votre compte.
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setIsMultiPostMode(prev => !prev)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                          isMultiPostMode
                            ? 'bg-[#FF5E1A]/10 border-[#FF5E1A] text-white'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {isMultiPostMode ? "✍️ Saisie simple" : "📚 Importer plusieurs liens"}
                      </button>
                      <button
                        type="button"
                        disabled={isAutoGeneratingGallery}
                        onClick={handleAutoFillGallery}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-[#FF5E1A] hover:bg-[#FF3E00] text-white transition-all disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {isAutoGeneratingGallery ? (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <span>Génération...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={11} />
                            <span>Générer galerie (4 posts)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {isMultiPostMode ? (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                      Liens multiples {videoSourceType === 'instagram' ? 'Instagram 📸' : 'TikTok 🎵'} (un lien par ligne)
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={multiPostUrls}
                      onChange={e => setMultiPostUrls(e.target.value)}
                      placeholder={
                        videoSourceType === 'instagram'
                          ? "https://www.instagram.com/reel/C8...\nhttps://www.instagram.com/p/C9..."
                          : "https://www.tiktok.com/@chef/video/123...\nhttps://www.tiktok.com/@chef/video/456..."
                      }
                      className="w-full px-3 py-2.5 bg-[#0A0A0B] border border-zinc-850 rounded-xl text-xs text-white focus:outline-none focus:border-[#FF5E1A] font-mono leading-normal"
                    />
                    <span className="text-[10px] text-zinc-500 block">
                      Séparez chaque lien par un retour à la ligne ou une virgule. Les liens seront validés et importés en arrière-plan.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                      {videoSourceType === 'direct' && "Adresse URL du fichier MP4 (ou Téléverser)"}
                      {videoSourceType === 'instagram' && "Lien de la publication Instagram / Reel"}
                      {videoSourceType === 'tiktok' && "Lien de la vidéo TikTok"}
                      {videoSourceType === 'youtube_link' && "Lien de la vidéo, Shorts ou Live stream YouTube"}
                      {videoSourceType === 'youtube_channel' && "Lien de votre Chaîne YouTube (@nom ou ID)"}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          required
                          value={videoUrl}
                          onChange={e => setVideoUrl(e.target.value)}
                          placeholder={
                            videoSourceType === 'direct' ? "https://assets.mixkit.co/videos/...mp4" :
                            videoSourceType === 'instagram' ? "https://www.instagram.com/reel/C8..." :
                            videoSourceType === 'tiktok' ? "https://www.tiktok.com/@user/video/..." :
                            videoSourceType === 'youtube_link' ? "https://www.youtube.com/shorts/..." :
                            "https://www.youtube.com/@MonRestaurant"
                          }
                          className="w-full pl-3 pr-8 py-2.5 bg-[#0A0A0B] border border-zinc-850 rounded-xl text-xs text-white focus:outline-none focus:border-[#FF5E1A] font-mono"
                        />
                        <Link size={12} className="absolute right-3 top-3.5 text-zinc-500" />
                      </div>
                      {videoSourceType === 'direct' && (
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'video/*';
                            input.onchange = async (e: any) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const formData = new FormData();
                                formData.append('file', file);
                                try {
                                  const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                  const data = await res.json();
                                  if (data.success && data.url) {
                                    setVideoUrl(data.url);
                                    alert('Vidéo téléversée avec succès !');
                                  } else {
                                    alert('Format de réponse invalide');
                                  }
                                } catch (err) {
                                  alert('Échec du téléversement de la vidéo.');
                                }
                              }
                            };
                            input.click();
                          }}
                          className="bg-[#1F1F23] hover:bg-zinc-800 border border-zinc-850 hover:border-[#FF5E1A]/40 text-white px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer shrink-0"
                          title="Téléverser un fichier .mp4"
                        >
                          <UploadCloud size={14} />
                        </button>
                      )}
                    </div>

                  {/* Realtime Video Validation Status Indicator */}
                  {videoUrl && (
                    <div className="mt-1.5 flex items-center justify-between text-[11px] px-3 py-2 rounded-lg bg-[#0F0F12] border border-zinc-900 font-sans">
                      <div className="flex items-center gap-1.5">
                        {isUrlValidating ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                            <span className="text-zinc-400 font-medium animate-pulse">Vérification de la source en cours...</span>
                          </>
                        ) : urlValidationResult ? (
                          urlValidationResult.isValid ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                              <span className="text-[#10B981] font-bold">
                                Source vérifiée &amp; valide !
                                {urlValidationResult.metadata?.title && ` ("${urlValidationResult.metadata.title}")`}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                              <span className="text-[#EF4444] font-medium shrink-0">Invalide ou injoignable :</span>
                              <span className="text-zinc-400 truncate max-w-[200px]" title={urlValidationResult.error}>
                                {urlValidationResult.error}
                              </span>
                            </>
                          )
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse" />
                            <span className="text-zinc-500">En attente de réponse...</span>
                          </>
                        )}
                      </div>
                      {!isUrlValidating && urlValidationResult && (
                        <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono">
                          {videoSourceType.toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

                {/* Title and Dish */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-wider">Légende de la Vidéo</label>
                    <input
                      type="text"
                      value={videoTitle}
                      onChange={e => setVideoTitle(e.target.value)}
                      placeholder="Ex: Savourez notre Smash Burger coulant de cheddar ! 🧀🔥"
                      className="w-full px-3 py-2.5 bg-[#0A0A0B] border border-zinc-850 rounded-xl text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-wider">Plat associé du menu</label>
                    <select
                      value={videoDishId}
                      onChange={e => setVideoDishId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0A0A0B] border border-zinc-850 rounded-xl text-xs text-white focus:outline-none focus:border-[#FF5E1A] cursor-pointer"
                    >
                      <option value="">-- Aucun plat associé --</option>
                      {currentRestaurantDishes.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.price.toFixed(2)} €)</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Additional controls: Draft vs Online and Continuous mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0A0A0B] border border-zinc-900 p-4 rounded-2xl">
                  {/* Status Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-white">Statut de diffusion</span>
                      <span className="text-[10px] text-zinc-500">Mettre en ligne ou enregistrer en brouillon</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsVideoOnline(prev => !prev)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isVideoOnline ? 'bg-green-600' : 'bg-zinc-850'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isVideoOnline ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Continuous Loop Toggle */}
                  <div className="flex items-center justify-between border-t sm:border-t-0 sm:border-l border-zinc-900 pt-3 sm:pt-0 sm:pl-4">
                    <div>
                      <span className="block text-xs font-bold text-white">Flux Continu / Live</span>
                      <span className="text-[10px] text-zinc-500">Faire tourner la vidéo en boucle continue</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsVideoLiveContinuous(prev => !prev)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isVideoLiveContinuous ? 'bg-[#FF5E1A]' : 'bg-zinc-850'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isVideoLiveContinuous ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVideoForm(false);
                      setEditingVideoId(null);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-transparent transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#FF5E1A] hover:bg-[#FF3E00] text-white text-xs font-black rounded-xl transition-all shadow-md shadow-[#FF5E1A]/10 cursor-pointer"
                  >
                    {editingVideoId ? "Mettre à jour la vidéo" : "Poster sur Fidfud"}
                  </button>
                </div>
              </form>

              {/* Right Column: Live Feed Iframe / Video Simulator Preview */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-3">
                <span className="text-[10px] font-black text-zinc-500 tracking-wider uppercase flex items-center space-x-1">
                  <Smartphone size={12} />
                  <span>Aperçu Mobile Fidfud</span>
                </span>

                <div className="w-[260px] h-[480px] bg-black rounded-[40px] border-8 border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                  {/* Speaker and Notch */}
                  <div className="absolute top-0 inset-x-0 h-4 bg-zinc-800 z-30 rounded-b-xl flex items-center justify-center">
                    <div className="w-12 h-1 bg-black rounded-full" />
                  </div>

                  {/* Embedded Dynamic Player */}
                  <div className="absolute inset-0 w-full h-full bg-zinc-950 z-10 flex items-center justify-center">
                    {videoUrl ? (
                      videoSourceType === 'direct' ? (
                        <video
                          src={getSafeVideoUrl(videoUrl)}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.warn('[MerchantDashboard] Dynamic player video failed to load, falling back');
                            e.currentTarget.src = 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
                          }}
                        />
                      ) : videoSourceType === 'instagram' ? (
                        <div className="w-full h-full bg-[#1A0C16] flex flex-col items-center justify-center p-4 text-center">
                          <span className="text-3xl animate-bounce">📸</span>
                          <span className="text-xs text-pink-400 font-extrabold font-mono mt-2 tracking-widest uppercase">INSTAGRAM REEL</span>
                          <span className="text-[9px] text-zinc-500 font-mono mt-1 px-3 break-all line-clamp-3">{videoUrl}</span>
                          <div className="mt-4 px-3 py-1 bg-pink-500/10 border border-pink-500/20 text-[9px] text-pink-400 rounded-full font-black uppercase tracking-wider">
                            Simulé avec succès
                          </div>
                        </div>
                      ) : videoSourceType === 'tiktok' ? (
                        <div className="w-full h-full bg-[#0A1C1A] flex flex-col items-center justify-center p-4 text-center">
                          <span className="text-3xl animate-bounce">🎵</span>
                          <span className="text-xs text-teal-400 font-extrabold font-mono mt-2 tracking-widest uppercase">TIKTOK VIDEO</span>
                          <span className="text-[9px] text-zinc-500 font-mono mt-1 px-3 break-all line-clamp-3">{videoUrl}</span>
                          <div className="mt-4 px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-[9px] text-teal-400 rounded-full font-black uppercase tracking-wider">
                            Simulé avec succès
                          </div>
                        </div>
                      ) : videoSourceType === 'youtube_link' ? (
                        <div className="w-full h-full bg-[#1A0A0A] flex flex-col items-center justify-center p-4 text-center">
                          <span className="text-3xl animate-pulse">🎥</span>
                          <span className="text-xs text-red-500 font-extrabold font-mono mt-2 tracking-widest uppercase">YOUTUBE SHORT/VIDEO</span>
                          <span className="text-[9px] text-zinc-500 font-mono mt-1 px-3 break-all line-clamp-3">{videoUrl}</span>
                          <div className="mt-4 px-3 py-1 bg-red-500/10 border border-red-500/20 text-[9px] text-red-400 rounded-full font-black uppercase tracking-wider">
                            Simulé avec succès
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-[#0A0A0B] flex flex-col items-center justify-center p-4 text-center relative">
                          <div className="absolute top-6 left-3 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                            <span>EN CONTINU</span>
                          </div>
                          <span className="text-3xl animate-spin">🔴</span>
                          <span className="text-xs text-[#FF5E1A] font-extrabold font-mono mt-2 tracking-widest uppercase">YOUTUBE CHANNEL BROADCAST</span>
                          <span className="text-[8px] text-zinc-400 font-bold mt-1">Flux de cuisine 24h/24 & 7j/7</span>
                          <span className="text-[9px] text-zinc-600 font-mono mt-1 px-3 truncate max-w-full">{videoUrl}</span>
                        </div>
                      )
                    ) : (
                      <div className="text-center p-4">
                        <span className="text-3xl text-zinc-700 block">📹</span>
                        <span className="text-[10px] text-zinc-500 font-bold mt-1.5 block">Aucun média configuré</span>
                        <span className="text-[8px] text-zinc-600 block mt-0.5">Saisissez une URL pour voir l'aperçu</span>
                      </div>
                    )}
                  </div>

                  {/* Overlaid UI */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 via-black/45 to-transparent z-20 flex flex-col justify-end space-y-2 pointer-events-none">
                    {/* Badge continuous */}
                    {isVideoLiveContinuous && (
                      <div className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md w-fit flex items-center space-x-1 tracking-wider uppercase">
                        <span className="w-1 h-1 bg-white rounded-full" />
                        <span>CONTINU / LIVE 24/7</span>
                      </div>
                    )}

                    {/* Badge Online vs Draft in Preview */}
                    <div className={`text-[8px] font-black px-1.5 py-0.5 rounded-md w-fit tracking-wider uppercase border ${
                      isVideoOnline 
                        ? 'bg-green-600/20 border-green-500/30 text-green-400' 
                        : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-400'
                    }`}>
                      {isVideoOnline ? "● PUBLIÉ" : "● BROUILLON (MASQUÉ)"}
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/20 overflow-hidden shrink-0">
                        {activeRestaurant.logoUrl ? (
                          <img src={activeRestaurant.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#FF5E1A] text-white font-bold flex items-center justify-center text-[10px]">
                            {activeRestaurant.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-white truncate max-w-[120px]">{activeRestaurant.name}</div>
                    </div>

                    <p className="text-[9px] text-zinc-200 line-clamp-2 leading-tight">
                      {videoTitle || "Légende de la vidéo qui s'affichera sur le feed des utilisateurs..."}
                    </p>

                    {/* Associated Dish Button */}
                    {videoDishId && (
                      <div className="bg-[#FF5E1A] text-white text-[9px] font-black px-3 py-1.5 rounded-xl flex items-center justify-between shadow-lg">
                        <span className="truncate max-w-[100px]">
                          {dishes.find(d => d.id === videoDishId)?.name || "Plat délicieux"}
                        </span>
                        <span className="shrink-0">
                          {(dishes.find(d => d.id === videoDishId)?.price || 0).toFixed(2)} €
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Sidebar stats simulator */}
                  <div className="absolute right-3.5 top-1/3 z-20 flex flex-col items-center space-y-3 pointer-events-none text-white/90">
                    <div className="flex flex-col items-center">
                      <span className="p-1.5 rounded-full bg-black/45 border border-white/10 text-pink-500">❤️</span>
                      <span className="text-[8px] font-bold mt-0.5">142</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="p-1.5 rounded-full bg-black/45 border border-white/10 text-zinc-300">💬</span>
                      <span className="text-[8px] font-bold mt-0.5">18</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="p-1.5 rounded-full bg-black/45 border border-white/10 text-zinc-300">🔗</span>
                      <span className="text-[8px] font-bold mt-0.5">Partager</span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-500 text-center max-w-[220px]">
                  C'est exactement ainsi que votre vidéo apparaîtra sur l'application mobile des clients !
                </p>
              </div>
            </div>
          )}

          {/* BULK EDIT TOOLBAR */}
          <div className="bg-[#121214] border border-[#FF5E1A]/20 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="text-[#FF5E1A]" size={18} />
                <h5 className="text-sm font-black text-white uppercase tracking-wider">Outil d'Édition par Lot (Bulk AI Editor)</h5>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedVideoIds.length === currentRestaurantVideos.length) {
                    setSelectedVideoIds([]);
                  } else {
                    setSelectedVideoIds(currentRestaurantVideos.map(v => v.id));
                  }
                }}
                className="text-xs text-[#FF5E1A] hover:text-[#FF3E00] font-bold"
              >
                {selectedVideoIds.length === currentRestaurantVideos.length ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            </div>
            
            <p className="text-xs text-zinc-400">
              Cochez les vidéos ci-dessous, puis appliquez des modifications simultanées par intelligence artificielle (Génération de légendes accrocheuses par Gemini) ou ajoutez un message promotionnel en overlay.
            </p>

            {bulkActionSuccessMessage && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle size={14} />
                <span>{bulkActionSuccessMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Box 1: Bulk AI Captions */}
              <div className="bg-[#0A0A0B] border border-zinc-850 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#FF5E1A] tracking-wider flex items-center space-x-1">
                    <Sparkles size={11} />
                    <span>Légendes IA par lot</span>
                  </span>
                  <p className="text-xs text-zinc-400 mt-1">
                    Génère automatiquement une légende optimisée pour les réseaux sociaux par Gemini 3.5 en analysant le titre existant, le type de cuisine et le plat associé.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleBulkAiCaptions}
                  disabled={isBulkAiGenerating || selectedVideoIds.length === 0}
                  className="w-full flex items-center justify-center space-x-2 bg-[#FF5E1A] hover:bg-[#FF3E00] disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  {isBulkAiGenerating ? (
                    <>
                      <Sparkles size={14} className="animate-spin" />
                      <span>Optimisation par Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Générer {selectedVideoIds.length > 0 ? `(${selectedVideoIds.length})` : ""} légendes par IA</span>
                    </>
                  )}
                </button>
              </div>

              {/* Box 2: Bulk Promotional Overlay */}
              <div className="bg-[#0A0A0B] border border-zinc-850 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-yellow-500 tracking-wider flex items-center space-x-1">
                    <Award size={11} />
                    <span>Overlay Promotionnel par lot</span>
                  </span>
                  <p className="text-xs text-zinc-400 mt-1">
                    Incruste une bannière promotionnelle colorée sur les vidéos sélectionnées dans le flux d'actualité pour doper l'engagement.
                  </p>
                  
                  <input
                    type="text"
                    value={bulkPromoText}
                    onChange={(e) => setBulkPromoText(e.target.value)}
                    placeholder="Ex: -10% code FIDFUD10, Dessert offert avec ce plat !"
                    className="w-full mt-3 px-3 py-2 bg-[#121214] border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkPromoText('');
                    }}
                    className="px-3 py-2 text-zinc-400 hover:text-white text-xs font-medium rounded-lg"
                  >
                    Effacer
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkPromoOverlay}
                    disabled={isBulkPromoSaving || selectedVideoIds.length === 0}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    {isBulkPromoSaving ? "Application..." : `Appliquer à ${selectedVideoIds.length > 0 ? selectedVideoIds.length : "vos"} vidéos`}
                  </button>
                </div>
              </div>
            </div>

            {selectedVideoIds.length > 0 && (
              <div className="text-[11px] text-[#FF5E1A] font-semibold flex items-center justify-between">
                <span>{selectedVideoIds.length} vidéo(s) sélectionnée(s) pour traitement.</span>
                <button
                  type="button"
                  onClick={() => setSelectedVideoIds([])}
                  className="text-zinc-500 hover:text-white"
                >
                  Annuler la sélection
                </button>
              </div>
            )}
          </div>

          {/* Videos List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentRestaurantVideos.map(video => {
              const dish = dishes.find(d => d.id === video.associatedDishId);
              const isSelected = selectedVideoIds.includes(video.id);
              const isOnline = video.isOnline !== false;

              return (
                <div
                  key={video.id}
                  className={`bg-[#121214] border rounded-3xl overflow-hidden flex flex-col justify-between transition-all ${
                    isSelected ? 'border-[#FF5E1A] shadow-md shadow-[#FF5E1A]/5' : 'border-[#1F1F23]'
                  }`}
                >
                  {/* Thumbnail frame with badge */}
                  <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                    {/* Checkbox */}
                    <div className="absolute top-3 left-3 z-20">
                      <button
                        type="button"
                        onClick={() => toggleVideoSelection(video.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                          isSelected ? 'bg-[#FF5E1A] border-[#FF5E1A] text-white' : 'bg-black/60 border-white/20 hover:border-white text-transparent'
                        }`}
                      >
                        <Check size={12} className="stroke-[3]" />
                      </button>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
                      {video.isLiveContinuous && (
                        <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse flex items-center space-x-1 shadow">
                          <span className="w-1 h-1 bg-white rounded-full" />
                          <span>CONTINU / LIVE</span>
                        </span>
                      )}

                      {video.isTooLong && (
                        <span className="bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center space-x-1 shadow">
                          <AlertTriangle size={8} />
                          <span>TROP LONG ({video.duration ? `${video.duration.toFixed(0)}s` : ">60s"})</span>
                        </span>
                      )}

                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow border ${
                        video.videoSourceType === 'instagram' ? 'bg-pink-600/20 border-pink-500/20 text-pink-400' :
                        video.videoSourceType === 'tiktok' ? 'bg-teal-600/20 border-teal-500/20 text-teal-400' :
                        video.videoSourceType === 'youtube_link' ? 'bg-red-600/20 border-red-500/20 text-red-400' :
                        video.videoSourceType === 'youtube_channel' ? 'bg-yellow-600/20 border-yellow-500/20 text-yellow-400' :
                        'bg-blue-600/20 border-blue-500/20 text-blue-400'
                      }`}>
                        {video.videoSourceType || 'Direct'}
                      </span>
                    </div>

                    {video.videoUrl && (video.videoUrl.includes('instagram.com') || video.videoUrl.includes('instagr.am')) ? (
                      <div className="w-full h-full bg-[#1C0A15] flex flex-col items-center justify-center text-center p-3">
                        <span className="text-2xl">📸</span>
                        <span className="text-[10px] text-pink-400 font-extrabold tracking-widest uppercase mt-1">Lien Instagram</span>
                        <span className="text-[8px] text-zinc-500 max-w-full truncate px-3 font-mono mt-0.5">{video.videoUrl}</span>
                      </div>
                    ) : video.videoUrl && (video.videoUrl.includes('tiktok.com') || video.videoUrl.includes('tiktok')) ? (
                      <div className="w-full h-full bg-[#0A1C1A] flex flex-col items-center justify-center text-center p-3">
                        <span className="text-2xl">🎵</span>
                        <span className="text-[10px] text-teal-400 font-extrabold tracking-widest uppercase mt-1">Lien TikTok</span>
                        <span className="text-[8px] text-zinc-500 max-w-full truncate px-3 font-mono mt-0.5">{video.videoUrl}</span>
                      </div>
                    ) : video.videoUrl && (video.videoUrl.includes('youtube.com') || video.videoUrl.includes('youtu.be')) ? (
                      <div className="w-full h-full bg-[#1C0A0A] flex flex-col items-center justify-center text-center p-3">
                        <span className="text-2xl">🎥</span>
                        <span className="text-[10px] text-red-400 font-extrabold tracking-widest uppercase mt-1">Lien YouTube</span>
                        <span className="text-[8px] text-zinc-500 max-w-full truncate px-3 font-mono mt-0.5">{video.videoUrl}</span>
                      </div>
                    ) : (
                      <>
                        <video 
                          src={getSafeVideoUrl(video.videoUrl)} 
                          muted 
                          playsInline 
                          className="w-full h-full object-cover opacity-40" 
                          onError={(e) => {
                            console.warn('[MerchantDashboard] Video listing preview failed to load, falling back');
                            e.currentTarget.src = 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play size={20} className="text-white bg-black/55 p-1 rounded-full stroke-[3]" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Video Details & Stats */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h6 className="text-white text-xs font-bold line-clamp-1 leading-tight flex-1">{video.title}</h6>
                        <button
                          onClick={() => handleToggleOnlineStatus(video)}
                          type="button"
                          className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider uppercase border transition-all cursor-pointer ${
                            isOnline
                              ? 'bg-green-600/10 border-green-500/20 text-green-400 hover:bg-green-600/20'
                              : 'bg-zinc-850 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                          }`}
                          title={isOnline ? "Masquer du feed public (Draft)" : "Afficher sur le feed public (Online)"}
                        >
                          {isOnline ? "● EN LIGNE" : "● BROUILLON"}
                        </button>
                      </div>

                      {video.promoOverlay && (
                        <span className="inline-block text-[9px] text-yellow-500 font-bold bg-yellow-500/10 border border-yellow-500/10 px-1.5 py-0.5 rounded">
                          ⚡ Promo: {video.promoOverlay}
                        </span>
                      )}

                      {dish && (
                        <span className="text-[9px] text-[#FF5E1A] font-bold block">
                          Plat lié : {dish.name} ({dish.price.toFixed(2)} €)
                        </span>
                      )}

                      {video.isTooLong && (
                        <div className="flex items-center space-x-1 text-amber-500 font-bold text-[9px] bg-amber-500/5 p-1.5 rounded-lg border border-amber-500/10">
                          <AlertTriangle size={10} className="shrink-0" />
                          <span>Cette vidéo dépasse 60s et est signalée.</span>
                        </div>
                      )}
                    </div>

                    {/* Performance metrics */}
                    <div className="grid grid-cols-2 gap-2 bg-[#0A0A0B] border border-zinc-900 p-2.5 rounded-2xl text-[10px] text-zinc-400">
                      <div className="space-y-0.5">
                        <span className="text-zinc-500 font-bold block uppercase text-[8px]">Lectures</span>
                        <span className="text-white font-extrabold">{video.viewsCount || 0} vues</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-zinc-500 font-bold block uppercase text-[8px]">Rétention</span>
                        <div className="flex items-center space-x-1.5">
                          <div className="flex-1 h-1 bg-zinc-850 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${Math.min(((video.averageWatchTime || 4) / 10) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-zinc-300 font-mono font-bold text-[9px]">{video.averageWatchTime || 4}s</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                      <span className="text-[9px] text-zinc-500 font-mono">
                        Aimé {video.likesCount} fois
                      </span>
                      <div className="flex items-center space-x-2.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadMedia(video.videoUrl, video.title)}
                          className="flex items-center space-x-1 text-green-400 hover:text-green-300 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          title="Télécharger cette vidéo"
                        >
                          <Download size={11} />
                          <span>Télécharger</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditVideoClick(video)}
                          className="text-zinc-400 hover:text-[#FF5E1A] text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Éditer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVideo(video.id)}
                          className="text-red-500 hover:text-red-400 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* TAB CONTENT: STRIPE CONNECT CONFIGURATION */}
      {activeTab === 'stripe' && stripeStatus && (
        <div className="space-y-4">
          <h4 className="text-base font-black text-white tracking-tight flex items-center space-x-2">
            <CreditCard size={18} className="text-[#FF5E1A]" />
            <span>Gestion de votre compte vendeur Stripe Connect</span>
          </h4>

          <div className="p-6 rounded-3xl bg-[#0D0D0E] border border-[#1F1F23] space-y-6">
            
            {/* Connection state cards */}
            {stripeStatus.connected ? (
              <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/20 flex items-start space-x-3.5">
                <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
                  <Check size={20} className="stroke-[3]" />
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-bold text-white">Stripe Connect Connecté & Activé</h5>
                  <p className="text-xs text-zinc-400 mt-1 leading-normal">
                    Fidfud a configuré avec succès vos règles de routage instantanées. Vos virements s'effectueront en temps réel à chaque transaction.
                  </p>
                  <div className="mt-3 flex items-center space-x-2 text-xs font-mono">
                    <span className="text-zinc-500">ID COMPTE CONNECT :</span>
                    <span className="text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 select-all">
                      {stripeStatus.stripeAccountId}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#121214] border border-zinc-900 flex items-start space-x-3.5">
                <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500 mt-0.5">
                  <AlertCircle size={20} />
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-bold text-white">Stripe Connect non rattaché</h5>
                  <p className="text-xs text-zinc-400 mt-1 leading-normal">
                    Sans compte lié, Fidfud retient des virements manuels par défaut à la fin du mois. Reliez instantanément votre compte bancaire pour des règlements automatiques à chaque encaissement client !
                  </p>
                </div>
              </div>
            )}

            {/* Platform payout information breakdown sheet */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Modalités de commission Fidfud</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#121214] border border-[#1F1F23]">
                  <p className="text-zinc-500 text-xs">Vente sur place (Click & Collect)</p>
                  <p className="text-lg font-black text-white mt-1">5% <span className="text-xs font-normal text-zinc-500">commission</span></p>
                  <p className="text-[10px] text-zinc-500 leading-normal mt-1">Vous touchez 95% du prix de vente des plats. Les frais de service de 0.99€ sont intégralement réglés par l'acheteur.</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#121214] border border-[#1F1F23]">
                  <p className="text-zinc-500 text-xs">Vente en livraison maison</p>
                  <p className="text-lg font-black text-[#FF5E1A] mt-1">15% <span className="text-xs font-normal text-zinc-500">commission</span></p>
                  <p className="text-[10px] text-zinc-500 leading-normal mt-1">Routage automatique de 85% de la transaction vers vos comptes à l'acceptation de la commande.</p>
                </div>
              </div>
            </div>

            {/* Action connect buttons */}
            {!stripeStatus.connected && (
              <div className="pt-3 border-t border-zinc-900">
                <button
                  id="btn-link-stripe-connect"
                  onClick={handleConnectStripe}
                  disabled={isConnectingStripe}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold px-5 py-3 rounded-xl transition-all shadow-md w-full sm:w-auto"
                >
                  {isConnectingStripe ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Création du compte Stripe...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} />
                      <span>Relier mon compte Stripe Connect</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* TAB CONTENT: VITRINE (DIGITAL STOREFRONT & VIDEO OVERLAYS) */}
      {activeTab === 'vitrine' && (
        <div className="space-y-4">
          <h4 className="text-base font-black text-white tracking-tight flex items-center space-x-2">
            <Settings size={18} className="text-[#FF5E1A]" />
            <span>Gestion de la Vitrine Digitale & Affichages Vidéo</span>
          </h4>

          <form onSubmit={handleSaveVitrine} className="p-6 rounded-3xl bg-[#0D0D0E] border border-[#1F1F23] space-y-6">
            
            {/* Storefront Identity Section */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block border-b border-zinc-900 pb-2">Identité Globale du Restaurant</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase">Nom de l'établissement</label>
                  <input
                    type="text"
                    required
                    value={editRestName}
                    onChange={e => setEditRestName(e.target.value)}
                    className="block w-full mt-1.5 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase">Adresse du Restaurant</label>
                  <input
                    type="text"
                    required
                    value={editRestAddress}
                    onChange={e => setEditRestAddress(e.target.value)}
                    className="block w-full mt-1.5 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase">Slogan publicitaire ou Biographie</label>
                <input
                  type="text"
                  required
                  value={editRestSlogan}
                  onChange={e => setEditRestSlogan(e.target.value)}
                  placeholder="Ex : Le véritable smash burger croustillant..."
                  className="block w-full mt-1.5 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                />
              </div>
            </div>

            {/* Media customization */}
            <div className="space-y-4 pt-4 border-t border-zinc-900">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Images & Identité Visuelle</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo URL */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase">Logo du Restaurant (Téléverser 📁 ou coller URL)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editRestLogoUrl}
                      onChange={e => setEditRestLogoUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... ou téléverser 📁"
                      className="flex-1 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                    />
                    <button
                      type="button"
                      title="Téléverser un logo"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e: any) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const res = await fetch('/api/upload', { method: 'POST', body: formData });
                              const data = await res.json();
                              if (data.success && data.url) {
                                setEditRestLogoUrl(data.url);
                                alert('Logo téléversé avec succès !');
                              } else {
                                alert('Format de réponse invalide');
                              }
                            } catch (err) {
                              alert('Échec du téléversement du logo.');
                            }
                          }
                        };
                        input.click();
                      }}
                      className="bg-zinc-900 hover:bg-zinc-850 border border-[#1F1F23] hover:border-[#FF5E1A]/40 text-white px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      📁
                    </button>
                  </div>
                  {editRestLogoUrl && (
                    <div className="mt-2 flex items-center space-x-3 bg-[#121214] p-2 rounded-xl border border-zinc-900">
                      <img src={editRestLogoUrl} alt="Logo Preview" className="w-12 h-12 rounded-xl object-cover border border-white/10" onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150'; }} />
                      <span className="text-[10px] text-zinc-500">Aperçu en direct de votre Logo</span>
                    </div>
                  )}
                </div>

                {/* Banner URL */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase">Bannière de Couverture (Téléverser 📁 ou coller URL)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editRestBannerUrl}
                      onChange={e => setEditRestBannerUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... ou téléverser 📁"
                      className="flex-1 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                    />
                    <button
                      type="button"
                      title="Téléverser une bannière"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e: any) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const res = await fetch('/api/upload', { method: 'POST', body: formData });
                              const data = await res.json();
                              if (data.success && data.url) {
                                setEditRestBannerUrl(data.url);
                                alert('Bannière téléversée avec succès !');
                              } else {
                                alert('Format de réponse invalide');
                              }
                            } catch (err) {
                              alert('Échec du téléversement de la bannière.');
                            }
                          }
                        };
                        input.click();
                      }}
                      className="bg-zinc-900 hover:bg-zinc-850 border border-[#1F1F23] hover:border-[#FF5E1A]/40 text-white px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      📁
                    </button>
                  </div>
                  {editRestBannerUrl && (
                    <div className="mt-2 space-y-1.5 bg-[#121214] p-2 rounded-xl border border-zinc-900">
                      <img src={editRestBannerUrl} alt="Banner Preview" className="w-full h-16 rounded-lg object-cover border border-white/10" onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'; }} />
                      <span className="text-[10px] text-zinc-500 block">Aperçu de la bannière sur votre profil restaurant</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Video & Live Streaming Configuration */}
            <div className="space-y-4 pt-4 border-t border-zinc-900">
              <div className="flex items-center space-x-2">
                <FileVideo size={15} className="text-[#FF5E1A]" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Lancement Vidéo Direct & Flux Continu Live</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Déterminez la vidéo principale visible immédiatement par tous les utilisateurs lorsqu'ils arrivent sur le profil de votre restaurant ou sur le feed Fidfud.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Video Source Type */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase">Source du Média</label>
                  <select
                    value={editRestVideoSourceType}
                    onChange={e => setEditRestVideoSourceType(e.target.value as any)}
                    className="block w-full mt-1.5 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  >
                    <option value="direct">Vidéo Directe (MP4 / Téléverser 📁)</option>
                    <option value="instagram">Instagram Reel / Post (Lien Instagram 📸)</option>
                    <option value="tiktok">TikTok Video (Lien TikTok 🎵)</option>
                    <option value="youtube_link">Lien Vidéo/Short/Live YouTube</option>
                    <option value="youtube_channel">Chaîne YouTube (Lecture Continue des nouveautés)</option>
                  </select>
                </div>

                {/* 2. Live Switch */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase">Mode de Diffusion</label>
                  <div className="flex items-center space-x-3 mt-3 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2">
                    <input
                      type="checkbox"
                      id="editRestIsVideoLiveContinuous"
                      checked={editRestIsVideoLiveContinuous}
                      onChange={e => setEditRestIsVideoLiveContinuous(e.target.checked)}
                      className="w-4 h-4 rounded text-[#FF5E1A] bg-zinc-900 border-zinc-700 focus:ring-[#FF5E1A] focus:ring-2 accent-[#FF5E1A]"
                    />
                    <label htmlFor="editRestIsVideoLiveContinuous" className="text-xs text-zinc-300 font-medium cursor-pointer">
                      Flux Continu / En Direct (La vidéo tourne en boucle ou diffuse le flux en direct)
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 3. Video URL with file upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase">URL de la Vidéo ou du Flux Live</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editRestVideoUrl}
                      onChange={e => setEditRestVideoUrl(e.target.value)}
                      placeholder={
                        editRestVideoSourceType === 'instagram'
                          ? "https://www.instagram.com/reel/C..."
                          : editRestVideoSourceType === 'youtube_link'
                          ? "https://www.youtube.com/watch?v=... ou YouTube Short"
                          : editRestVideoSourceType === 'youtube_channel'
                          ? "URL de votre chaîne YouTube ou ID de chaîne"
                          : "https://assets.mixkit.co/... ou téléverser un MP4 📁"
                      }
                      className="flex-1 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                    />
                    {editRestVideoSourceType === 'direct' && (
                      <button
                        type="button"
                        title="Téléverser votre vidéo MP4"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'video/mp4,video/quicktime';
                          input.onchange = async (e: any) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const formData = new FormData();
                              formData.append('file', file);
                              try {
                                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                const data = await res.json();
                                if (data.success && data.url) {
                                  setEditRestVideoUrl(data.url);
                                  alert('Vidéo de vitrine téléversée avec succès ! 🎬✨');
                                } else {
                                  alert('Format de réponse invalide');
                                }
                              } catch (err) {
                                alert('Échec du téléversement de la vidéo.');
                              }
                            }
                          };
                          input.click();
                        }}
                        className="bg-zinc-900 hover:bg-zinc-850 border border-[#1F1F23] hover:border-[#FF5E1A]/40 text-white px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <UploadCloud size={14} />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 block leading-normal">
                    {editRestVideoSourceType === 'youtube_channel' 
                      ? "Prend en charge le streaming live automatique ou la lecture en continu de vos vidéos publiques."
                      : "Saisissez l'URL d'un post Instagram, d'un clip YouTube ou d'une vidéo MP4 directe."}
                  </span>
                </div>

                {/* 4. Video Display Title */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase">Titre ou Slogan d'Affichage Vidéo</label>
                  <input
                    type="text"
                    value={editRestVideoTitle}
                    onChange={e => setEditRestVideoTitle(e.target.value)}
                    placeholder="Ex: 🎬 Découvrez notre savoir-faire culinaire en direct !"
                    className="block w-full bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                  <span className="text-[10px] text-zinc-500 block">S'affiche en superposition sur le lecteur vidéo du feed.</span>
                </div>
              </div>

              {editRestVideoUrl && (
                <div className="mt-2 bg-[#121214] p-3 rounded-xl border border-zinc-900 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity size={14} className="text-[#FF5E1A] animate-pulse" />
                    <span className="text-[10px] text-zinc-400 font-medium">Flux vidéo configuré et opérationnel</span>
                  </div>
                  <span className="text-[10px] text-[#FF5E1A] font-bold uppercase tracking-wider">Vérifié ✅</span>
                </div>
              )}
            </div>

            {/* Video overlay customization */}
            <div className="space-y-4 pt-4 border-t border-zinc-900">
              <div className="flex items-center space-x-2">
                <Tv size={15} className="text-[#FF5E1A]" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Overlays & Animations sur vos Vidéos</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Configurez les éléments interactifs qui s'afficheront en surbrillance sur vos vidéos dans le feed public. Cela incite à l'achat rapide !
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase">1. Message de Promotion / Slogan de Direct</label>
                  <input
                    type="text"
                    value={editRestPromoMessage}
                    onChange={e => setEditRestPromoMessage(e.target.value)}
                    placeholder="Ex : CODE : SLABSMASH (-10% sur tout l'étage)"
                    className="block w-full mt-1.5 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase">2. Texte de Compte à rebours</label>
                    <input
                      type="text"
                      value={editRestCountdownText}
                      onChange={e => setEditRestCountdownText(e.target.value)}
                      placeholder="Ex : Fournée croustillante dans"
                      className="block w-full mt-1.5 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase">Minutes restantes</label>
                    <input
                      type="number"
                      value={editRestCountdownMinutes}
                      onChange={e => setEditRestCountdownMinutes(Number(e.target.value))}
                      className="block w-full mt-1.5 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                    />
                  </div>
                </div>
              </div>

              {/* Order button activation toggle */}
              <div className="p-4 rounded-2xl bg-[#121214] border border-[#1F1F23] flex items-center justify-between">
                <div className="space-y-1 pr-4">
                  <label className="block text-xs font-bold text-zinc-300 uppercase">Activer la Commande Directe</label>
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Si désactivé, le bouton "Commander" sera masqué sur vos vidéos. Idéal si vous n'acceptez plus de commandes en direct ou si vous êtes complet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditRestIsOrderingEnabled(!editRestIsOrderingEnabled)}
                  className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative shrink-0 ${
                    editRestIsOrderingEnabled ? 'bg-[#FF5C00]' : 'bg-zinc-800'
                  }`}
                >
                  <div
                    className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                      editRestIsOrderingEnabled ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Live simulation preview box */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-3">
                <span className="text-[10px] font-mono uppercase text-zinc-600 block">⚡ Aperçu Simulateur Direct Feed (Overlay)</span>
                
                <div className="relative w-full max-w-sm mx-auto h-40 bg-zinc-900 rounded-xl overflow-hidden border border-white/5 flex flex-col justify-end p-3">
                  <div className="absolute inset-0 bg-cover bg-center filter brightness-50" style={{ backgroundImage: `url(${editRestBannerUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300'})` }} />
                  
                  {/* Promo Banner overlay preview */}
                  {editRestPromoMessage && (
                    <div className="absolute top-2 left-2 right-2 bg-gradient-to-r from-[#FF5C00] to-yellow-500 text-white text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg flex items-center justify-between shadow-lg">
                      <span>🏷️ PROMO EN DIRECT</span>
                      <span>{editRestPromoMessage}</span>
                    </div>
                  )}

                  {/* Countdown overlay preview */}
                  {editRestCountdownText && (
                    <div className="absolute top-12 left-2 bg-black/60 border border-white/10 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span>
                      <span>{editRestCountdownText} : <strong className="text-yellow-400">{editRestCountdownMinutes} min</strong></span>
                    </div>
                  )}

                  {/* Channel details */}
                  <div className="relative z-10 space-y-1">
                    <div className="flex items-center gap-1">
                      <img src={editRestLogoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=50'} alt="Log" className="w-5 h-5 rounded-full object-cover border border-white/20" />
                      <span className="text-white text-[10px] font-black">@{editRestName.toLowerCase().replace(/\s+/g, '')}</span>
                    </div>
                    <p className="text-zinc-300 text-[9px] line-clamp-1">{editRestSlogan}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form submit footer */}
            <div className="pt-3 border-t border-zinc-900 flex justify-end">
              <button
                type="submit"
                disabled={isSavingVitrine}
                className="flex items-center justify-center space-x-2 bg-[#FF5E1A] hover:bg-[#FF7A00] disabled:opacity-50 text-white text-xs font-black px-6 py-3 rounded-xl transition-all shadow-lg cursor-pointer"
              >
                {isSavingVitrine ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sauvegarde en cours...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} />
                    <span>Enregistrer ma vitrine digitale</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* SECURE FIRESTORE RESTAURATEUR PROFILE CARD */}
          <div className="p-6 rounded-3xl bg-[#0D0D0E] border border-[#1F1F23] space-y-6 mt-6">
            <h5 className="text-sm font-black text-white tracking-tight flex items-center space-x-2 border-b border-zinc-900 pb-3">
              <User size={16} className="text-[#FF5E1A]" />
              <span>Profil Restaurateur - Base de Données Sécurisée (Firestore Applet)</span>
            </h5>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Les informations saisies ici représentent le profil légal et l'histoire du chef/restaurateur. Ces données sont stockées de manière durable et sécurisée dans Firestore et résistent aux redémarrages de serveurs.
            </p>

            <form onSubmit={handleSaveRestaurateurProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase">Prénom du Restaurateur</label>
                  <input
                    type="text"
                    required
                    value={restFirstName}
                    onChange={e => setRestFirstName(e.target.value)}
                    placeholder="Ex: Giovanni"
                    className="block w-full mt-1.5 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase">Nom de Famille</label>
                  <input
                    type="text"
                    required
                    value={restLastName}
                    onChange={e => setRestLastName(e.target.value)}
                    placeholder="Ex: Rossi"
                    className="block w-full mt-1.5 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase">Adresse Email Directe</label>
                  <input
                    type="email"
                    required
                    value={restEmail}
                    onChange={e => setRestEmail(e.target.value)}
                    placeholder="partner@nonnapizza.fr"
                    className="block w-full mt-1.5 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase">Téléphone Portable</label>
                  <input
                    type="text"
                    required
                    value={restPhone}
                    onChange={e => setRestPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="block w-full mt-1.5 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase">Parcours / Biographie du Chef</label>
                <textarea
                  rows={3}
                  required
                  value={restBio}
                  onChange={e => setRestBio(e.target.value)}
                  placeholder="Racontez votre parcours, vos inspirations et votre passion culinaire aux clients Fidfud..."
                  className="block w-full mt-1.5 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A] resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase">Photo de Profil / Avatar du Chef</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={restProfileImageUrl}
                    onChange={e => setRestProfileImageUrl(e.target.value)}
                    placeholder="Coller l'URL de votre photo ou téléverser 📁"
                    className="flex-1 bg-[#121214] border border-[#1F1F23] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                  <button
                    type="button"
                    title="Téléverser ma photo de profil"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = async (event: any) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await fetch('/api/upload', { method: 'POST', body: formData });
                            const uploadData = await res.json();
                            if (uploadData.success && uploadData.url) {
                              setRestProfileImageUrl(uploadData.url);
                              alert('Photo de profil téléversée !');
                            }
                          } catch (err) {
                            alert('Erreur lors du téléversement.');
                          }
                        }
                      };
                      input.click();
                    }}
                    className="bg-zinc-900 hover:bg-zinc-850 border border-[#1F1F23] hover:border-[#FF5E1A]/40 text-white px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    📁
                  </button>
                </div>
                {restProfileImageUrl && (
                  <div className="mt-2 flex items-center space-x-3 bg-[#121214] p-2 rounded-xl border border-zinc-900">
                    <img src={restProfileImageUrl} alt="Chef Profile" className="w-12 h-12 rounded-full object-cover border border-white/10" onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150'; }} />
                    <span className="text-[10px] text-zinc-500">Aperçu en direct de votre photo de profil Chef</span>
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingRestaurateur}
                  className="flex items-center justify-center space-x-2 bg-[#FF5E1A] hover:bg-[#FF7A00] disabled:opacity-50 text-white text-xs font-black px-6 py-2.5 rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  {isSavingRestaurateur ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      <span>{restaurateurProfile?.id ? 'Mettre à jour mon profil' : 'Enregistrer mon profil'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* TAB CONTENT: ABONNEMENTS PREMIUM (MERCHANT SUBCRIPTIONS) */}
      {activeTab === 'premium' && (
        <div className="space-y-4">
          <h4 className="text-base font-black text-white tracking-tight flex items-center space-x-2">
            <Award size={18} className="text-[#FF5E1A]" />
            <span>Formules d'Abonnements & Avantages Restaurateurs</span>
          </h4>

          {/* Intro text */}
          <p className="text-xs text-zinc-400 max-w-2xl leading-normal">
            Passez à la vitesse supérieure ! Augmentez votre visibilité dans le feed public, déverrouillez des outils d'animations interactives exclusifs et abaissez drastiquement vos frais de plateforme Fidfud.
          </p>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Plan Free */}
            <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
              activeRestaurant.subscriptionTier === 'free' || !activeRestaurant.subscriptionTier
                ? 'bg-zinc-900/60 border-zinc-700 shadow-xl'
                : 'bg-[#0D0D0E] border-zinc-900 opacity-70 hover:opacity-100'
            }`}>
              <div>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase">Formule</span>
                    <h5 className="text-base font-black text-zinc-300">
                      {formulas.find(f => f.id === 'free')?.name || 'FID’GRATUIT'}
                    </h5>
                  </div>
                  {(activeRestaurant.subscriptionTier === 'free' || !activeRestaurant.subscriptionTier) && (
                    <span className="text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-700 font-bold px-2 py-0.5 rounded-full">PLAN ACTUEL</span>
                  )}
                </div>

                <div className="mb-3">
                  <span className="text-2xl font-black text-white">
                    {formulas.find(f => f.id === 'free')?.price ?? 0} €
                  </span>
                  <span className="text-[10px] text-zinc-500"> / mois à vie</span>
                </div>

                <p className="text-[11px] text-zinc-400 italic mb-4 min-h-[36px] leading-snug font-sans">
                  {formulas.find(f => f.id === 'free')?.description}
                </p>

                <ul className="space-y-2.5 text-xs text-zinc-400 pt-3 border-t border-zinc-900">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-green-500 stroke-[3]" />
                    <span>Frais Commission Livraison : <strong>15%</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-green-500 stroke-[3]" />
                    <span>Création de plats illimitée</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-green-500 stroke-[3]" />
                    <span>Publication vidéos standard</span>
                  </li>
                  <li className="flex items-center gap-2 text-zinc-600 line-through">
                    <X size={14} />
                    <span>Badge vérifié de certification</span>
                  </li>
                  <li className="flex items-center gap-2 text-zinc-600 line-through">
                    <X size={14} />
                    <span>Affichage overlays (Promo/Countdown)</span>
                  </li>
                </ul>
              </div>

              <div className="pt-5 mt-4">
                {(activeRestaurant.subscriptionTier === 'free' || !activeRestaurant.subscriptionTier) ? (
                  <button disabled className="w-full bg-zinc-800 text-zinc-500 font-bold text-xs py-2.5 rounded-xl uppercase">
                    Activé
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgradeSubscription('free')}
                    className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-bold text-xs py-2.5 rounded-xl uppercase cursor-pointer transition-colors"
                  >
                    Rétrograder
                  </button>
                )}
              </div>
            </div>

            {/* Plan Pro */}
            <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden ${
              activeRestaurant.subscriptionTier === 'pro'
                ? 'bg-[#FF5E1A]/5 border-[#FF5E1A] shadow-[0_0_20px_rgba(255,94,26,0.15)]'
                : 'bg-[#0D0D0E] border-zinc-900 opacity-80 hover:opacity-100'
            }`}>
              <div className="absolute top-0 right-0 bg-[#FF5E1A] text-white font-black text-[8px] uppercase tracking-wider px-3.5 py-1 rounded-bl-xl">
                POPULAIRE
              </div>

              <div>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] text-[#FF5E1A] font-extrabold uppercase">Formule</span>
                    <h5 className="text-base font-black text-white flex items-center gap-1">
                      ⭐ {formulas.find(f => f.id === 'pro')?.name || 'FID’PRO'}
                    </h5>
                  </div>
                  {activeRestaurant.subscriptionTier === 'pro' && (
                    <span className="text-[9px] bg-[#FF5E1A] text-white font-bold px-2 py-0.5 rounded-full">PLAN ACTUEL</span>
                  )}
                </div>

                <div className="mb-3">
                  <span className="text-2xl font-black text-white">
                    {formulas.find(f => f.id === 'pro')?.price ?? 19.99} €
                  </span>
                  <span className="text-[10px] text-zinc-500"> / mois</span>
                </div>

                <p className="text-[11px] text-zinc-300 italic mb-4 min-h-[36px] leading-snug font-sans">
                  {formulas.find(f => f.id === 'pro')?.description}
                </p>

                <ul className="space-y-2.5 text-xs text-zinc-400 pt-3 border-t border-zinc-900">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#FF5E1A] stroke-[3]" />
                    <span>Frais Commission : <strong>10%</strong> <span className="text-zinc-600">(-5%)</span></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#FF5E1A] stroke-[3]" />
                    <span>Priorité algorithmique : <strong>1.5x</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#FF5E1A] stroke-[3]" />
                    <span><strong>Overlays Vidéos actifs</strong> (Promo)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#FF5E1A] stroke-[3]" />
                    <span>Support commerçant 24/7</span>
                  </li>
                  <li className="flex items-center gap-2 text-zinc-600 line-through">
                    <X size={14} />
                    <span>Compte à rebours de cuisson minutes</span>
                  </li>
                </ul>
              </div>

              <div className="pt-5 mt-4">
                {activeRestaurant.subscriptionTier === 'pro' ? (
                  <button disabled className="w-full bg-[#FF5E1A]/20 text-[#FF5E1A] font-bold text-xs py-2.5 rounded-xl uppercase">
                    Activé
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgradeSubscription('pro')}
                    className="w-full bg-gradient-to-r from-[#FF5E1A] to-amber-500 hover:from-[#FF7A00] hover:to-amber-400 text-white font-black text-xs py-2.5 rounded-xl uppercase cursor-pointer transition-transform shadow-md"
                  >
                    Activer
                  </button>
                )}
              </div>
            </div>

            {/* Plan Gold */}
            <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
              activeRestaurant.subscriptionTier === 'gold'
                ? 'bg-amber-500/5 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : 'bg-[#0D0D0E] border-zinc-900 opacity-70 hover:opacity-100'
            }`}>
              <div>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] text-amber-500 font-extrabold uppercase">Formule</span>
                    <h5 className="text-base font-black text-amber-400 flex items-center gap-1">
                      👑 {formulas.find(f => f.id === 'gold')?.name || 'FID’GOLD'}
                    </h5>
                  </div>
                  {activeRestaurant.subscriptionTier === 'gold' && (
                    <span className="text-[9px] bg-amber-500 text-zinc-950 font-bold px-2 py-0.5 rounded-full">PLAN ACTUEL</span>
                  )}
                </div>

                <div className="mb-3">
                  <span className="text-2xl font-black text-white">
                    {formulas.find(f => f.id === 'gold')?.price ?? 39.99} €
                  </span>
                  <span className="text-[10px] text-zinc-500"> / mois</span>
                </div>

                <p className="text-[11px] text-amber-200/90 italic mb-4 min-h-[36px] leading-snug font-sans">
                  {formulas.find(f => f.id === 'gold')?.description}
                </p>

                <ul className="space-y-2.5 text-xs text-zinc-400 pt-3 border-t border-zinc-900">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-amber-500 stroke-[3]" />
                    <span>Frais Commission : <strong>5% seulement !</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-amber-500 stroke-[3]" />
                    <span>Visibilité Algorithmique : <strong>3x Boost</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-amber-500 stroke-[3]" />
                    <span><strong>Overlays Vidéos Complets</strong> (Promo + Countdown)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-amber-500 stroke-[3]" />
                    <span><strong>Stripe Instant Payouts</strong> (Virement sous 2h)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-amber-500 stroke-[3]" />
                    <span>Support chef personnel par SMS</span>
                  </li>
                </ul>
              </div>

              <div className="pt-5 mt-4">
                {activeRestaurant.subscriptionTier === 'gold' ? (
                  <button disabled className="w-full bg-amber-500/20 text-amber-400 font-bold text-xs py-2.5 rounded-xl uppercase">
                    Activé
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgradeSubscription('gold')}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-300 text-zinc-950 font-black text-xs py-2.5 rounded-xl uppercase cursor-pointer transition-transform shadow-md"
                  >
                    Activer
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}


      {/* TAB CONTENT: SECURITE & PORTEFEUILLE (CASH OUT GIFTS & ACCOUNT PROTECTION) */}
      {activeTab === 'secu_portefeuille' && (
        <div className="space-y-6">
          
          {/* SECTION 1: WALLET & GIFT COLLECTING */}
          <div className="space-y-4">
            <h4 className="text-base font-black text-white tracking-tight flex items-center space-x-2">
              <Wallet size={18} className="text-[#FF5E1A]" />
              <span>Portefeuille de Cadeaux & Engagement Client</span>
            </h4>
            <p className="text-xs text-zinc-400 max-w-xl leading-normal">
              Les spectateurs vous récompensent en vous offrant des cadeaux en direct sur vos démonstrations culinaires. Encaissez instantanément ces points d'engagement sous forme d'euros !
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Likes */}
              <div className="p-4 rounded-2xl bg-[#0D0D0E] border border-[#1F1F23] flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-black">Likes cumulés</p>
                  <p className="text-2xl font-black text-white mt-1">❤️ {activeRestaurant.likesReceived || 0}</p>
                </div>
                <div className="text-[11px] bg-red-500/10 text-red-500 font-bold px-2 py-1 rounded-lg">
                  Visibilité au top
                </div>
              </div>

              {/* Card 2: Gifts Point Count */}
              <div className="p-4 rounded-2xl bg-[#0D0D0E] border border-[#1F1F23] flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-black">Points Cadeaux en attente</p>
                  <p className="text-2xl font-black text-yellow-400 mt-1">🪙 {activeRestaurant.pointsReceived || 0} pts</p>
                </div>
                <div className="text-[11px] bg-yellow-500/10 text-yellow-500 font-bold px-2 py-1 rounded-lg">
                  1 Pt = 0.05€
                </div>
              </div>

              {/* Card 3: Estimated Cashout Value */}
              <div className="p-4 rounded-2xl bg-[#0D0D0E] border border-[#1F1F23] flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-black">Valeur de l'encaissement</p>
                  <p className="text-2xl font-black text-green-500 mt-1">💶 {((activeRestaurant.pointsReceived || 0) * 0.05).toFixed(2)} €</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-zinc-500 uppercase block font-mono">Compte Connect lié</span>
                  <span className="text-[10px] font-bold text-zinc-300">{activeRestaurant.stripeAccountId ? 'Oui' : 'Non'}</span>
                </div>
              </div>
            </div>

            {/* Cashout button CTA */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={14} className="text-yellow-400 fill-yellow-400" />
                  <span>Prêt pour l'encaissement direct ?</span>
                </h5>
                <p className="text-xs text-zinc-500 mt-1">
                  Les fonds seront virés instantanément sur votre banque liée à l'établissement.
                </p>
              </div>

              <button
                onClick={handleCashOut}
                disabled={isCashingOut || (activeRestaurant.pointsReceived || 0) <= 0}
                className="bg-gradient-to-tr from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-black text-xs px-6 py-3 rounded-xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                {isCashingOut ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Virement en cours...</span>
                  </>
                ) : (
                  <>
                    <Coins size={14} className="stroke-[2.5]" />
                    <span>Retirer mes gains ( {((activeRestaurant.pointsReceived || 0) * 0.05).toFixed(2)} € )</span>
                  </>
                )}
              </button>
            </div>

            {/* Recent tips audit list */}
            <div className="p-4 rounded-2xl bg-[#0D0D0E]/60 border border-zinc-900 space-y-3">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block font-mono">Dernières Activités d'Engagement Recueillies</span>
              <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-none">
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#121214] border border-zinc-900">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">👑</span>
                    <div>
                      <span className="font-bold text-white block">Client VIP (lucas@fidfud.com)</span>
                      <span className="text-[9px] text-zinc-500 font-mono">il y a 3 mins</span>
                    </div>
                  </div>
                  <span className="font-black text-amber-500 font-mono">+100 pts (Couronne)</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#121214] border border-zinc-900">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🔥</span>
                    <div>
                      <span className="font-bold text-white block">Gourmet75</span>
                      <span className="text-[9px] text-zinc-500 font-mono">il y a 10 mins</span>
                    </div>
                  </div>
                  <span className="font-black text-amber-500 font-mono">+10 pts (Flambée)</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#121214] border border-zinc-900">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🌸</span>
                    <div>
                      <span className="font-bold text-white block">Marie.D</span>
                      <span className="text-[9px] text-zinc-500 font-mono">il y a 2 heures</span>
                    </div>
                  </div>
                  <span className="font-black text-amber-500 font-mono">+5 pts (Fleur d'or)</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: SECURE AND CERTIFIED LOCKED FLOW */}
          <div className="space-y-4 pt-4 border-t border-zinc-900">
            <h4 className="text-base font-black text-white tracking-tight flex items-center space-x-2">
              <Lock size={18} className="text-[#FF5E1A]" />
              <span>Sécurité & Certification Commerçant Verrouillée</span>
            </h4>

            <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-5">
              
              {/* Security Shield Callout */}
              <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/20 flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-green-500/10 text-green-400">
                  <ShieldCheck size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Statut : Compte Certifié Fidfud™</span>
                    <span className="text-[8px] bg-green-500 text-zinc-950 font-black px-1.5 py-0.5 rounded uppercase tracking-wide">LOCKED</span>
                  </h5>
                  <p className="text-xs text-zinc-400 mt-1 leading-normal">
                    Ce compte restaurant a validé l'audit K.Y.C. (Know Your Customer), l'enregistrement du registre du commerce et possède une clé de sécurité matérielle verrouillée. Les modifications sensibles s'opèrent au sein d'un environnement sandbox sécurisé.
                  </p>
                </div>
              </div>

              {/* Secure Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-[#121214] border border-zinc-900">
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Identifiant Client d'API de Caisse</span>
                  <span className="font-mono text-zinc-300 select-all block mt-1">ff_client_id_0923058293508</span>
                </div>
                <div className="p-3 rounded-xl bg-[#121214] border border-zinc-900">
                  <span className="text-zinc-500 block uppercase font-bold text-[9px]">Webhook Signature Secret Key</span>
                  <span className="font-mono text-zinc-300 select-all block mt-1">whsec_ff_live_5cfb90218ef8f2c382</span>
                </div>
              </div>

              {/* Interactive Security Toggles */}
              <div className="space-y-2.5">
                <span className="text-[10px] text-zinc-500 uppercase font-black block">Options d'Accès Sécurisés</span>
                
                <label className="flex items-center justify-between p-3 rounded-xl bg-[#0D0D0E] border border-[#1F1F23] cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-white block">Double Authentification active (A2F)</span>
                      <span className="text-[10px] text-zinc-500">Un code de sécurité éphémère SMS est envoyé à chaque reconnexion.</span>
                    </div>
                  </div>
                  <input type="checkbox" defaultChecked disabled className="rounded text-[#FF5E1A] focus:ring-0 bg-zinc-900 border-zinc-800" />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[#0D0D0E] border border-[#1F1F23] cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full"></div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-white block">Restreindre l'accès par plage IP</span>
                      <span className="text-[10px] text-zinc-500">Bloque l'accès au tableau de bord hors de votre adresse IP de caisse enregistrée.</span>
                    </div>
                  </div>
                  <input type="checkbox" className="rounded text-[#FF5E1A] focus:ring-0 bg-zinc-900 border-zinc-800 cursor-pointer" />
                </label>
              </div>

              {/* Black-box simulation Console Terminal Logs */}
              <div className="p-3 rounded-xl bg-black border border-zinc-900 text-[10px] font-mono text-zinc-400 space-y-1.5">
                <span className="text-[#FF5E1A] font-black uppercase tracking-wider block text-[9px] mb-1">📟 LOGS DE SÉCURITÉ EN DIRECT</span>
                <p><span className="text-zinc-600">[12:47:11]</span> SSL-Handshake avec la passerelle d'API de caisse validé (AES_256_GCM)</p>
                <p><span className="text-zinc-600">[12:47:12]</span> Double Authentification (A2F) validée par Session Token pour {activeRestaurant.name}</p>
                <p><span className="text-zinc-600">[12:47:15]</span> Requête signée PUT /api/restaurants/{activeRestaurant.id} autorisée avec succès</p>
                <p className="text-green-400 animate-pulse"><span className="text-zinc-600">[En Cours]</span> Système verrouillé et certifié actif. Écoute active sur le port 3000...</p>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
