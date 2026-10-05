import React, { useState, useEffect } from 'react';
import { safeApiJson } from '../utils/apiHelpers';
import { getSafeVideoUrl, STABLE_CULINARY_FALLBACK_VIDEOS, isDirectPlayableVideo } from '../utils/videoUtils';
import BackgroundVideoPlayer from './BackgroundVideoPlayer';
import EngagementPromptModal from './EngagementPromptModal';
import HeaderAndNavBuilder from './HeaderAndNavBuilder';
import ImportFromUrlModal from './ImportFromUrlModal';
import EditVideoModal from './EditVideoModal';
import { offlineCacheService } from '../services/OfflineCacheService';
import { 
  Home,
  X, 
  Menu,
  Layout, 
  LayoutGrid,
  ShoppingBag, 
  Store, 
  Users, 
  Truck, 
  Tag, 
  Heart, 
  Crown, 
  Sliders, 
  Plus, 
  Trash2, 
  Edit, 
  Upload, 
  Download,
  Check,
  CheckCircle, 
  AlertCircle,
  FileImage,
  DollarSign,
  Star,
  Eye,
  KeyRound,
  MessageSquare,
  Sparkles,
  Palette,
  RefreshCw,
  Search,
  Gift,
  Headphones,
  Tv,
  Youtube,
  UploadCloud,
  Video as VideoIcon
} from 'lucide-react';
import { Compass, MapPin, Map as MapIcon, Globe } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Restaurant, Dish, Video, Order, OrderStatus } from '../types';
import { getAuthBearerHeaders } from '../lib/firebase';

interface AdminCMSProps {
  isOpen: boolean;
  onClose: () => void;
  user?: { id: string; email: string; role: 'client' | 'restaurant' | 'admin' | 'courier' } | null;
  restaurants: Restaurant[];
  dishes: Dish[];
  videos: Video[];
  orders: Order[];
  onRefreshData: () => void;
  designSettings: any;
  onUpdateDesignSettings: (settings: any) => void;
  onSaveDesignSettings?: (settings: any) => Promise<boolean>;
  onInstantSaveAdmin?: () => Promise<void>;
  isAutoSaveEnabled?: boolean;
  onToggleAutoSave?: () => void;
  onOpenSavesHistory?: () => void;
}

// Custom types for new collections
interface Courier {
  id: string;
  name: string;
  phone: string;
  vehicle: 'Velo' | 'Scooter' | 'Voiture';
  status: 'available' | 'delivering' | 'offline';
  assignedOrderId?: string;
}

interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
}

interface Comment {
  id: string;
  videoId: string;
  videoTitle: string;
  username: string;
  text: string;
  createdAt: string;
}

export default function AdminCMS({
  isOpen,
  onClose,
  user,
  restaurants,
  dishes,
  videos,
  orders,
  onRefreshData,
  designSettings,
  onUpdateDesignSettings,
  onSaveDesignSettings,
  onInstantSaveAdmin,
  isAutoSaveEnabled = true,
  onToggleAutoSave,
  onOpenSavesHistory
}: AdminCMSProps) {
  
  const [isSavingDesign, setIsSavingDesign] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEngagementModalOpen, setIsEngagementModalOpen] = useState(false);

  const [cacheStats, setCacheStats] = useState<{
    totalEntries: number;
    lastClearedAt: string;
    autoClearIntervalMinutes: number;
    cacheDefaultTTLMinutes: number;
  } | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  const fetchCacheStats = async () => {
    try {
      const res = await fetch('/api/cache/status');
      if (res.ok) {
        const data = await res.json();
        setCacheStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch cache stats:', err);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      const res = await fetch('/api/cache/clear', { method: 'POST' });
      const data = await res.json();
      
      try {
        await offlineCacheService.clearAllLocalAndIndexedDBStorage();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Storage purge warning:', e);
      }

      setCacheMessage(data.message || 'Cache système, stockage et IndexedDB purgés avec succès !');
      await fetchCacheStats();
      if (onRefreshData) onRefreshData();
      setTimeout(() => setCacheMessage(null), 4000);
    } catch (err: any) {
      alert('Erreur lors du nettoyage du cache : ' + (err.message || String(err)));
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleUpdateCacheInterval = async (minutes: number) => {
    try {
      const res = await fetch('/api/cache/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoClearMinutes: minutes })
      });
      if (res.ok) {
        await fetchCacheStats();
        setCacheMessage(`Intervalle de purge automatique défini à ${minutes} min.`);
        setTimeout(() => setCacheMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to update cache settings:', err);
    }
  };

  useEffect(() => {
    fetchCacheStats();
  }, []);

  const handleManualSave = async () => {
    if (!onSaveDesignSettings) return;
    setIsSavingDesign(true);
    setSaveSuccess(false);
    const success = await onSaveDesignSettings(designSettings);
    setIsSavingDesign(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert("Erreur lors de la sauvegarde des paramètres de design.");
    }
  };

  // Media API Helpers
  const handleCreateOrUpdateMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle || !mediaUrl) {
      alert("Le titre et l'URL sont obligatoires !");
      return;
    }
    const tags = mediaTagsStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const body = {
      restaurantId: mediaRestaurantId,
      mediaType: mediaTypeState,
      url: mediaUrl,
      title: mediaTitle,
      tags,
      isPosted: mediaIsPosted
    };

    try {
      let res;
      if (editingMedia) {
        res = await fetch(`/api/admin/media/${editingMedia.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        res = await fetch('/api/admin/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      if (res.ok) {
        alert(editingMedia ? "Média mis à jour avec succès !" : "Média créé avec succès !");
        setShowMediaForm(false);
        setEditingMedia(null);
        setMediaTitle('');
        setMediaUrl('');
        setMediaTypeState('image');
        setMediaRestaurantId('');
        setMediaTagsStr('');
        setMediaIsPosted(false);
        // Refresh
        fetch('/api/admin/media')
          .then(r => r.json())
          .then(data => setAdminMediaList(data));
        onRefreshData(); // refresh app data
      } else {
        const err = await res.json();
        alert(`Erreur: ${err.error || "Une erreur est survenue"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur de réseau est survenue.");
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce média ?")) return;
    try {
      const res = await fetch(`/api/admin/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Média supprimé avec succès !");
        setAdminMediaList(prev => prev.filter(m => m.id !== id));
        onRefreshData();
      } else {
        alert("Erreur lors de la suppression.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Backups Helpers
  const handleCreateBackup = async () => {
    if (!newBackupName.trim()) {
      alert("Veuillez saisir un nom pour votre sauvegarde.");
      return;
    }
    setIsCreatingBackup(true);
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBackupName })
      });
      if (res.ok) {
        const newB = await res.json();
        setBackupsList(prev => [newB, ...prev]);
        setNewBackupName('');
        alert("Sauvegarde effectuée avec succès !");
      } else {
        alert("Erreur de création de sauvegarde.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (id: string) => {
    const isOriginal = id === 'original';
    const confirmMsg = isOriginal 
      ? "⚠️ Êtes-vous sûr de vouloir REVENIR À LA SAUVEGARDE D'ORIGINE ? Cette action écrasera TOUTES vos modifications actuelles pour restaurer la configuration de base propre de l'application."
      : "⚠️ Êtes-vous sûr de vouloir restaurer cette sauvegarde ? Cela écrasera l'état actuel de l'application.";
      
    if (!confirm(confirmMsg)) return;
    
    setIsRestoringBackupId(id);
    try {
      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId: id })
      });
      if (res.ok) {
        alert("La restauration s'est terminée avec succès ! L'application a été remise à son état parfait.");
        onRefreshData();
        setActiveTab('design');
      } else {
        const err = await res.json();
        alert(`Erreur de restauration: ${err.error || "Inconnue"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur de réseau lors de la restauration.");
    } finally {
      setIsRestoringBackupId(null);
    }
  };
  
  const handleExportDataJson = () => {
    window.location.href = '/api/data/export';
  };

  const handleImportDataJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.restaurants || !Array.isArray(parsed.restaurants)) {
        alert("Fichier JSON invalide. Il doit contenir une liste 'restaurants'.");
        return;
      }
      const confirmMsg = `Importer ce fichier (${parsed.restaurants.length} restaurants, ${parsed.dishes?.length || 0} plats, ${parsed.videos?.length || 0} vidéos) ? Cela mettra à jour votre base de données permanente.`;
      if (!confirm(confirmMsg)) return;

      const res = await fetch('/api/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Importation terminée avec succès !');
        if (onRefreshData) onRefreshData();
      } else {
        alert('Erreur: ' + (data.error || 'Impossible d\'importer les données'));
      }
    } catch (err: any) {
      alert('Erreur lors de la lecture du fichier : ' + (err.message || String(err)));
    } finally {
      e.target.value = '';
    }
  };

  // Tabs: 'design' | 'accueil' | 'layout_builder' | 'orders' | 'restaurants' | 'clients' | 'delivery' | 'promotions' | 'showcase' | 'interactions' | 'leader' | 'formulas' | 'media' | 'backup' | 'diagnostics' | 'applications' | 'popups' | 'djs_shows'
  const [activeTab, setActiveTab] = useState<'design' | 'accueil' | 'layout_builder' | 'orders' | 'restaurants' | 'clients' | 'delivery' | 'promotions' | 'showcase' | 'interactions' | 'leader' | 'formulas' | 'media' | 'backup' | 'diagnostics' | 'applications' | 'popups' | 'djs_shows'>('accueil');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Merchant Applications State
  const [merchantApps, setMerchantApps] = useState<any[]>([]);

  // Firebase Cloud Storage & Backup Hub States
  const [isSyncingFirebase, setIsSyncingFirebase] = useState<boolean>(false);
  const [isCleaningVideos, setIsCleaningVideos] = useState<boolean>(false);
  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null);

  // Diagnostics & Resolution Hub States
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [ticketSearch, setTicketSearch] = useState<string>('');
  const [isPurgingVideos, setIsPurgingVideos] = useState<boolean>(false);
  const [ticketResolutionModal, setTicketResolutionModal] = useState<{ ticket: any; notes: string; refundAmount: string } | null>(null);

  // Pop-ups Management States
  const [popupsList, setPopupsList] = useState<any[]>([]);
  const [isPopupsLoading, setIsPopupsLoading] = useState<boolean>(false);
  const [showPopupForm, setShowPopupForm] = useState<boolean>(false);
  const [editingPopup, setEditingPopup] = useState<any | null>(null);

  // Popup Form Fields
  const [popTitle, setPopTitle] = useState('');
  const [popSubtitle, setPopSubtitle] = useState('');
  const [popCategory, setPopCategory] = useState<string>('dj_music');
  const [popMediaType, setPopMediaType] = useState<'image' | 'video'>('image');
  const [popMediaUrl, setPopMediaUrl] = useState('');
  const [popImageFit100, setPopImageFit100] = useState<boolean>(true);
  const [popCtaText, setPopCtaText] = useState('Découvrir');
  const [popCtaLink, setPopCtaLink] = useState('djs');
  const [popActive, setPopActive] = useState<boolean>(true);
  const [popDisplayDelay, setPopDisplayDelay] = useState<number>(5);

  // DJ Sessions, Shows & YouTubers state
  const [djSessionsList, setDjSessionsList] = useState<any[]>([]);
  const [isDjSessionsLoading, setIsDjSessionsLoading] = useState<boolean>(false);
  const [djsSubTab, setDjsSubTab] = useState<'djs' | 'shows' | 'youtubers'>('djs');

  // Design & Branding Sub-Tab Navigation State
  const [designSubTab, setDesignSubTab] = useState<'logos' | 'header_nav' | 'theme_colors' | 'splash_login' | 'widgets_ads' | 'all'>('logos');

  // DJ Session form state
  const [showDjForm, setShowDjForm] = useState<boolean>(false);
  const [editingDjSession, setEditingDjSession] = useState<any | null>(null);
  const [djName, setDjName] = useState<string>('');
  const [djAvatar, setDjAvatar] = useState<string>('');
  const [djRestaurantName, setDjRestaurantName] = useState<string>('');
  const [djGenre, setDjGenre] = useState<string>('');
  const [djCurrentMood, setDjCurrentMood] = useState<string>('Deep House');
  const [djListenersCount, setDjListenersCount] = useState<number>(1200);
  const [djVideoUrl, setDjVideoUrl] = useState<string>('');
  const [djCoverImage, setDjCoverImage] = useState<string>('');
  const [djIsLive, setDjIsLive] = useState<boolean>(true);
  const [djBpm, setDjBpm] = useState<number>(124);
  const [djTrackTitle, setDjTrackTitle] = useState<string>('');
  const [djTrackArtist, setDjTrackArtist] = useState<string>('');
  const [djBio, setDjBio] = useState<string>('');
  const [djYoutubeUrl, setDjYoutubeUrl] = useState<string>('');

  // Culinary Shows state
  const [culinaryShowsList, setCulinaryShowsList] = useState<any[]>([]);
  const [isShowsLoading, setIsShowsLoading] = useState<boolean>(false);
  const [showShowForm, setShowShowForm] = useState<boolean>(false);
  const [editingShow, setEditingShow] = useState<any | null>(null);
  const [showName, setShowName] = useState<string>('');
  const [showHostName, setShowHostName] = useState<string>('');
  const [showAvatar, setShowAvatar] = useState<string>('');
  const [showCoverUrl, setShowCoverUrl] = useState<string>('');
  const [showMediaType, setShowMediaType] = useState<'image' | 'video'>('image');
  const [showMediaUrl, setShowMediaUrl] = useState<string>('');
  const [showDescription, setShowDescription] = useState<string>('');
  const [showYoutubeUrl, setShowYoutubeUrl] = useState<string>('');
  const [showFeaturedRestaurant, setShowFeaturedRestaurant] = useState<string>('');
  const [showRating, setShowRating] = useState<number>(4.9);
  const [showActive, setShowActive] = useState<boolean>(true);

  // Food YouTubers state
  const [foodYouTubersList, setFoodYouTubersList] = useState<any[]>([]);
  const [isYouTubersLoading, setIsYouTubersLoading] = useState<boolean>(false);
  const [showYouTuberForm, setShowYouTuberForm] = useState<boolean>(false);
  const [editingYouTuber, setEditingYouTuber] = useState<any | null>(null);
  const [ytCreatorName, setYtCreatorName] = useState<string>('');
  const [ytChannelName, setYtChannelName] = useState<string>('');
  const [ytSubscribers, setYtSubscribers] = useState<string>('');
  const [ytAvatar, setYtAvatar] = useState<string>('');
  const [ytCoverUrl, setYtCoverUrl] = useState<string>('');
  const [ytMediaType, setYtMediaType] = useState<'image' | 'video'>('image');
  const [ytMediaUrl, setYtMediaUrl] = useState<string>('');
  const [ytBio, setYtBio] = useState<string>('');
  const [ytYoutubeUrl, setYtYoutubeUrl] = useState<string>('');
  const [ytFeaturedVideoUrl, setYtFeaturedVideoUrl] = useState<string>('');
  const [ytRating, setYtRating] = useState<number>(4.9);
  const [ytActive, setYtActive] = useState<boolean>(true);

  // Verification and AI generation helpers
  const [isVerifyingYoutube, setIsVerifyingYoutube] = useState<boolean>(false);
  const [ytVerifyFeedback, setYtVerifyFeedback] = useState<string | null>(null);
  const [isGeneratingAiDesc, setIsGeneratingAiDesc] = useState<boolean>(false);

  const handleVerifyYoutubeUrl = async (url: string, onVerified: (data: any) => void) => {
    if (!url || !url.trim()) {
      alert("Veuillez saisir un lien YouTube (ex: https://youtube.com/@machaene ou https://youtu.be/watch?v=...)");
      return;
    }
    setIsVerifyingYoutube(true);
    setYtVerifyFeedback(null);
    try {
      const res = await fetch('/api/youtube/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (data.success) {
        setYtVerifyFeedback(data.message);
        onVerified(data);
      } else {
        alert(data.message || "Impossible de vérifier le lien YouTube.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Erreur réseau lors de la vérification YouTube.");
    } finally {
      setIsVerifyingYoutube(false);
    }
  };

  const handleGenerateAiDescription = async (
    entityType: 'restaurant' | 'dj' | 'youtuber' | 'culinary_show' | 'dish' | 'formula' | 'popup' | 'general',
    name: string,
    keywords: string,
    onGenerated: (desc: string) => void
  ) => {
    setIsGeneratingAiDesc(true);
    try {
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, name, keywords })
      });
      const data = await res.json();
      if (data.success && data.description) {
        onGenerated(data.description);
      } else {
        alert("Erreur lors de la génération de la description par l'IA.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de réseau lors de la génération IA.");
    } finally {
      setIsGeneratingAiDesc(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnosticsData();
      fetchMerchantApps();
      fetchPopupsAdmin();
      fetchDjSessionsAdmin();
      fetchCulinaryShowsAdmin();
      fetchFoodYouTubersAdmin();
    }
  }, [isOpen]);

  const fetchPopupsAdmin = async () => {
    setIsPopupsLoading(true);
    try {
      const res = await fetch('/api/popups');
      if (res.ok) {
        const data = await res.json();
        setPopupsList(data);
      }
    } catch (err) {
      console.warn('Erreur chargement popups admin:', err);
    } finally {
      setIsPopupsLoading(false);
    }
  };

  const handleSavePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: popTitle,
        subtitle: popSubtitle,
        category: popCategory,
        mediaType: popMediaType,
        mediaUrl: popMediaUrl,
        imageFit100: popImageFit100,
        ctaText: popCtaText,
        ctaLink: popCtaLink,
        active: popActive,
        displayDelaySeconds: Number(popDisplayDelay) || 5
      };

      let res;
      if (editingPopup) {
        res = await fetch(`/api/popups/${editingPopup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/popups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowPopupForm(false);
        setEditingPopup(null);
        fetchPopupsAdmin();
      }
    } catch (err) {
      console.error('Erreur sauvegarde pop-up:', err);
    }
  };

  const handleDeletePopup = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce pop-up promo ?')) return;
    try {
      const res = await fetch(`/api/popups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPopupsAdmin();
      }
    } catch (err) {
      console.error('Erreur suppression pop-up:', err);
    }
  };

  const handleTogglePopupActive = async (popup: any) => {
    try {
      const res = await fetch(`/api/popups/${popup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !popup.active })
      });
      if (res.ok) {
        fetchPopupsAdmin();
      }
    } catch (err) {
      console.error('Erreur changement statut popup:', err);
    }
  };

  // --- DJ SESSIONS HANDLERS ---
  const fetchDjSessionsAdmin = async () => {
    setIsDjSessionsLoading(true);
    try {
      const res = await fetch('/api/dj-sessions');
      if (res.ok) setDjSessionsList(await res.json());
    } catch (err) {
      console.warn('Erreur chargement DJ sessions:', err);
    } finally {
      setIsDjSessionsLoading(false);
    }
  };

  const handleSaveDjSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        djName,
        djAvatar,
        restaurantName: djRestaurantName,
        genre: djGenre,
        currentMood: djCurrentMood,
        listenersCount: Number(djListenersCount) || 1200,
        videoUrl: djVideoUrl,
        coverImage: djCoverImage,
        isLive: djIsLive,
        bpm: Number(djBpm) || 124,
        currentTrack: { title: djTrackTitle || 'Live Mix', artist: djTrackArtist || djName },
        bio: djBio,
        youtubeChannelUrl: djYoutubeUrl
      };

      let res;
      if (editingDjSession) {
        res = await fetch(`/api/dj-sessions/${editingDjSession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/dj-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowDjForm(false);
        setEditingDjSession(null);
        fetchDjSessionsAdmin();
      }
    } catch (err) {
      console.error('Erreur sauvegarde DJ session:', err);
    }
  };

  const handleDeleteDjSession = async (id: string) => {
    if (!confirm('Supprimer cette session DJ ?')) return;
    try {
      const res = await fetch(`/api/dj-sessions/${id}`, { method: 'DELETE' });
      if (res.ok) fetchDjSessionsAdmin();
    } catch (err) {
      console.error('Erreur suppression DJ session:', err);
    }
  };

  const handleToggleDjLive = async (session: any) => {
    try {
      const res = await fetch(`/api/dj-sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLive: !session.isLive })
      });
      if (res.ok) fetchDjSessionsAdmin();
    } catch (err) {
      console.error('Erreur changement statut DJ:', err);
    }
  };

  // --- CULINARY SHOWS HANDLERS ---
  const fetchCulinaryShowsAdmin = async () => {
    setIsShowsLoading(true);
    try {
      const res = await fetch('/api/culinary-shows');
      if (res.ok) setCulinaryShowsList(await res.json());
    } catch (err) {
      console.warn('Erreur chargement émission culinaire:', err);
    } finally {
      setIsShowsLoading(false);
    }
  };

  const handleSaveCulinaryShow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        showName,
        hostName: showHostName,
        avatar: showAvatar,
        coverUrl: showCoverUrl,
        mediaType: showMediaType,
        mediaUrl: showMediaUrl,
        description: showDescription,
        youtubeChannelUrl: showYoutubeUrl,
        featuredRestaurantName: showFeaturedRestaurant,
        rating: Number(showRating) || 4.9,
        active: showActive
      };

      let res;
      if (editingShow) {
        res = await fetch(`/api/culinary-shows/${editingShow.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/culinary-shows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowShowForm(false);
        setEditingShow(null);
        fetchCulinaryShowsAdmin();
      }
    } catch (err) {
      console.error('Erreur sauvegarde émission:', err);
    }
  };

  const handleDeleteCulinaryShow = async (id: string) => {
    if (!confirm('Supprimer cette émission culinaire ?')) return;
    try {
      const res = await fetch(`/api/culinary-shows/${id}`, { method: 'DELETE' });
      if (res.ok) fetchCulinaryShowsAdmin();
    } catch (err) {
      console.error('Erreur suppression émission:', err);
    }
  };

  const handleToggleShowActive = async (showItem: any) => {
    try {
      const res = await fetch(`/api/culinary-shows/${showItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !showItem.active })
      });
      if (res.ok) fetchCulinaryShowsAdmin();
    } catch (err) {
      console.error('Erreur toggle show active:', err);
    }
  };

  // --- FOOD YOUTUBERS HANDLERS ---
  const fetchFoodYouTubersAdmin = async () => {
    setIsYouTubersLoading(true);
    try {
      const res = await fetch('/api/food-youtubers');
      if (res.ok) setFoodYouTubersList(await res.json());
    } catch (err) {
      console.warn('Erreur chargement food YouTubers:', err);
    } finally {
      setIsYouTubersLoading(false);
    }
  };

  const handleSaveFoodYouTuber = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        creatorName: ytCreatorName,
        channelName: ytChannelName,
        subscribersCount: ytSubscribers,
        avatar: ytAvatar,
        coverUrl: ytCoverUrl,
        mediaType: ytMediaType,
        mediaUrl: ytMediaUrl,
        bio: ytBio,
        youtubeChannelUrl: ytYoutubeUrl,
        featuredVideoUrl: ytFeaturedVideoUrl,
        rating: Number(ytRating) || 4.9,
        active: ytActive
      };

      let res;
      if (editingYouTuber) {
        res = await fetch(`/api/food-youtubers/${editingYouTuber.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/food-youtubers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowYouTuberForm(false);
        setEditingYouTuber(null);
        fetchFoodYouTubersAdmin();
      }
    } catch (err) {
      console.error('Erreur sauvegarde YouTuber:', err);
    }
  };

  const handleDeleteFoodYouTuber = async (id: string) => {
    if (!confirm('Supprimer ce créateur YouTuber ?')) return;
    try {
      const res = await fetch(`/api/food-youtubers/${id}`, { method: 'DELETE' });
      if (res.ok) fetchFoodYouTubersAdmin();
    } catch (err) {
      console.error('Erreur suppression YouTuber:', err);
    }
  };

  const handleToggleYouTuberActive = async (yt: any) => {
    try {
      const res = await fetch(`/api/food-youtubers/${yt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !yt.active })
      });
      if (res.ok) fetchFoodYouTubersAdmin();
    } catch (err) {
      console.error('Erreur toggle YouTuber active:', err);
    }
  };

  const fetchMerchantApps = async () => {
    try {
      const res = await fetch('/api/merchant-applications');
      if (res.ok) {
        const data = await res.json();
        setMerchantApps(data);
      }
    } catch (err) {
      console.warn('Erreur chargement candidatures marchands:', err);
    }
  };

  const handleUpdateAppStatus = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    try {
      const res = await fetch(`/api/merchant-applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchMerchantApps();
      }
    } catch (err) {
      console.error('Erreur mise a jour statut candidature:', err);
    }
  };

  const fetchDiagnosticsData = async () => {
    try {
      const [resTickets, resLogs] = await Promise.all([
        fetch('/api/support/tickets').then(r => r.ok ? r.json() : []),
        fetch('/api/admin/system-logs').then(r => r.ok ? r.json() : [])
      ]);
      setSupportTickets(resTickets);
      setSystemLogs(resLogs);
    } catch (e) {
      console.warn('Erreur chargement diagnostics:', e);
    }
  };

  const handleExecuteAbsolutePurge = async () => {
    setDeleteModalState({
      isOpen: true,
      title: '🔥 PURGE ABSOLUE DES VIDÉOS INACTIVES',
      message: 'Êtes-vous absolument sûr de vouloir purger définitivement TOUTES les vidéos hors-ligne ou inactives ? Cette opération supprimera intégralement leurs commentaires, associations de plats et fichiers du stockage sans aucune possibilité de restauration.',
      onConfirm: async () => {
        setDeleteModalState(null);
        setIsPurgingVideos(true);
        try {
          const res = await fetch('/api/videos/purge-inactive', { method: 'POST' });
          const data = await res.json();
          if (res.ok) {
            // Scrub client local cache completely
            const validOnlineIds = videos.filter(v => v.isOnline !== false).map(v => v.id);
            const { offlineCacheService } = await import('../services/OfflineCacheService');
            offlineCacheService.purgeAllInactiveFromLocalCache(validOnlineIds);

            onRefreshData();
            fetchDiagnosticsData();
            setFeedbackToast({
              type: 'success',
              message: `🔥 Purge absolue réussie! ${data.purgedCount} vidéos & ${data.purgedCommentsCount || 0} commentaires purgés sans trace.`
            });
          } else {
            setFeedbackToast({ type: 'error', message: data.error || 'Erreur lors de la purge' });
          }
        } catch (err: any) {
          setFeedbackToast({ type: 'error', message: err.message || 'Erreur réseau lors de la purge' });
        } finally {
          setIsPurgingVideos(false);
        }
      }
    });
  };

  const handleExecuteRepairVideos = async () => {
    setIsPurgingVideos(true);
    try {
      const res = await fetch('/api/videos/repair-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        onRefreshData();
        fetchDiagnosticsData();
        setFeedbackToast({
          type: 'success',
          message: `🛡️ ${data.message || 'Toutes les vidéos ont été réparées, restaurées et verrouillées dans Firestore.'}`
        });
      } else {
        setFeedbackToast({ type: 'error', message: data.error || 'Erreur lors de la réparation des vidéos' });
      }
    } catch (err: any) {
      setFeedbackToast({ type: 'error', message: err.message || 'Erreur réseau lors de la réparation' });
    } finally {
      setIsPurgingVideos(false);
    }
  };

  const handleRefundOrderAction = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/refund`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        onRefreshData();
        fetchDiagnosticsData();
        setFeedbackToast({ type: 'success', message: `Commande #${orderId} remboursée instantanément.` });
      } else {
        setFeedbackToast({ type: 'error', message: data.error || 'Erreur de remboursement' });
      }
    } catch (e) {
      setFeedbackToast({ type: 'error', message: 'Erreur réseau remboursement' });
    }
  };

  const handleResolveTicketAction = async () => {
    if (!ticketResolutionModal) return;
    try {
      const res = await fetch(`/api/support/tickets/${ticketResolutionModal.ticket.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionNotes: ticketResolutionModal.notes,
          refundAmount: ticketResolutionModal.refundAmount ? Number(ticketResolutionModal.refundAmount) : undefined
        })
      });
      if (res.ok) {
        setTicketResolutionModal(null);
        onRefreshData();
        fetchDiagnosticsData();
        setFeedbackToast({ type: 'success', message: 'Ticket résolu et enregistrements mis à jour.' });
      }
    } catch (e) {
      setFeedbackToast({ type: 'error', message: 'Erreur résolution ticket' });
    }
  };


  // Media manager state
  const [adminMediaList, setAdminMediaList] = useState<any[]>([]);
  const [mediaLoading, setMediaLoading] = useState<boolean>(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('all'); // restaurantId or 'all'
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [mediaSearch, setMediaSearch] = useState<string>('');

  // Media creation / editing form
  const [showMediaForm, setShowMediaForm] = useState<boolean>(false);
  const [editingMedia, setEditingMedia] = useState<any | null>(null);
  const [mediaTitle, setMediaTitle] = useState<string>('');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaTypeState, setMediaTypeState] = useState<'image' | 'video'>('image');
  const [mediaRestaurantId, setMediaRestaurantId] = useState<string>('');
  const [mediaTagsStr, setMediaTagsStr] = useState<string>('');
  const [mediaIsPosted, setMediaIsPosted] = useState<boolean>(false);

  // Backup state
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [backupsLoading, setBackupsLoading] = useState<boolean>(false);
  const [newBackupName, setNewBackupName] = useState<string>('');
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [isRestoringBackupId, setIsRestoringBackupId] = useState<string | null>(null);

  // File drag & drop states
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileType, setUploadedFileType] = useState<'image' | 'video' | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);

  // Users, Couriers, Coupons and Comments states (simulated via API or state)
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

  // Candidacies filtering
  const [appSearchTerm, setAppSearchTerm] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState<string>('all');

  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  
  const [selectedGiftRestaurantId, setSelectedGiftRestaurantId] = useState('');
  const [selectedGiftType, setSelectedGiftType] = useState('rose');
  const [isSendingGiftSim, setIsSendingGiftSim] = useState(false);
  
  // Modals / Form states
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [restName, setRestName] = useState('');
  const [restAddress, setRestAddress] = useState('');
  const [restCommDelivery, setRestCommDelivery] = useState(15);
  const [restCommCollect, setRestCommCollect] = useState(5);
  const [restStripe, setRestStripe] = useState('');
  
  // Expanded fields
  const [restLogoUrl, setRestLogoUrl] = useState('');
  const [restBannerUrl, setRestBannerUrl] = useState('');
  const [restEmail, setRestEmail] = useState('');
  const [restPhone, setRestPhone] = useState('');
  const [restDescription, setRestDescription] = useState('');
  const [restIsFavorite, setRestIsFavorite] = useState(false);
  const [restIsPublished, setRestIsPublished] = useState(true);
  const [restCategory, setRestCategory] = useState('');
  const [restCategories, setRestCategories] = useState<string[]>(['Italien & Pizza 🍕']);
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [restSlogan, setRestSlogan] = useState<string>('');
  const [restSeoKeywords, setRestSeoKeywords] = useState<string[]>([]);
  const [restSeoMetaDescription, setRestSeoMetaDescription] = useState<string>('');
  const [isGeneratingAiCopy, setIsGeneratingAiCopy] = useState<boolean>(false);
  const [restVideoCategories, setRestVideoCategories] = useState<string[]>(['Dégustation 😋']);
  const [customVideoCategoryInput, setCustomVideoCategoryInput] = useState<string>('');
  const [isGeocodingAddress, setIsGeocodingAddress] = useState<boolean>(false);
  const [geocodedStatusText, setGeocodedStatusText] = useState<string>('');
  const [restDispositionShop, setRestDispositionShop] = useState('');
  const [restShortName, setRestShortName] = useState('');
  const [restLatitude, setRestLatitude] = useState(48.8566);
  const [restLongitude, setRestLongitude] = useState(2.3522);
  const [restVideoUrl, setRestVideoUrl] = useState('');
  const [restVideoTitle, setRestVideoTitle] = useState('');
  const [restSubscriptionTier, setRestSubscriptionTier] = useState<'free' | 'pro' | 'gold'>('free');
  const [isSavingRestaurant, setIsSavingRestaurant] = useState<boolean>(false);

  // Bulk Restaurant creation states
  const [showBulkRestForm, setShowBulkRestForm] = useState<boolean>(false);
  const [bulkNamesText, setBulkNamesText] = useState<string>('');
  const [bulkCity, setBulkCity] = useState<string>('Paris');
  const [bulkCategory, setBulkCategory] = useState<string>('Italien');
  const [bulkDistrict, setBulkDistrict] = useState<string>('');
  const [bulkSubscriptionTier, setBulkSubscriptionTier] = useState<'free' | 'pro' | 'gold'>('free');
  const [isBulkCreating, setIsBulkCreating] = useState<boolean>(false);

  // Google Maps Radar Sourcing states (Parano)
  const [showRadarForm, setShowRadarForm] = useState<boolean>(false);
  const [radarCity, setRadarCity] = useState<string>('Nice');
  const [isRadarScanning, setIsRadarScanning] = useState<boolean>(false);
  const [radarProgress, setRadarProgress] = useState<string[]>([]);
  const [radarResults, setRadarResults] = useState<any[]>([]);
  const [selectedRadarResult, setSelectedRadarResult] = useState<any | null>(null);
  const [importingRadarId, setImportingRadarId] = useState<string | null>(null);
  const [importedRadarIds, setImportedRadarIds] = useState<string[]>([]);
  const [radarCategoryFilter, setRadarCategoryFilter] = useState<string>('All');
  const [radarDistrictFilter, setRadarDistrictFilter] = useState<string>('All');
  const [radarSearchText, setRadarSearchText] = useState<string>('');

  // Formulas list and formulas edit states
  const [formulasList, setFormulasList] = useState<any[]>([]);
  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);
  const [editingFormulaName, setEditingFormulaName] = useState<string>('');
  const [editingFormulaPrice, setEditingFormulaPrice] = useState<number>(0);

  // Multi-select / Bulk operations on restaurants
  const [selectedRestIds, setSelectedRestIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [expandedRestDishes, setExpandedRestDishes] = useState<string | null>(null);
  const [isCleaningDatabase, setIsCleaningDatabase] = useState<boolean>(false);
  const [editingFormulaDesc, setEditingFormulaDesc] = useState<string>('');

  // Client states
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [clientRole, setClientRole] = useState<'client' | 'restaurant' | 'admin'>('client');
  const [clientStatus, setClientStatus] = useState<'active' | 'suspended'>('active');

  // Courier Form
  const [showCourierForm, setShowCourierForm] = useState(false);
  const [courierName, setCourierName] = useState('');
  const [courierPhone, setCourierPhone] = useState('');
  const [courierVehicle, setCourierVehicle] = useState<'Velo' | 'Scooter' | 'Voiture'>('Scooter');

  // Promo Coupon Form
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponVal, setCouponVal] = useState(10);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Reusable custom confirmation modal and toast states
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const [feedbackToast, setFeedbackToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const showFeedbackToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const askConfirmation = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    setDeleteModalState({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        try {
          await onConfirm();
        } catch (err) {
          console.error(err);
        } finally {
          setDeleteModalState(null);
        }
      }
    });
  };

  // Global settings state
  const [globalServiceFee, setGlobalServiceFee] = useState(0.99);
  const [globalDeliveryFee, setGlobalDeliveryFee] = useState(2.50);
  const [showcasePremiumPrice, setShowcasePremiumPrice] = useState(49.00);
  
  // Leader Config State
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>('rest-nonna');
  const [leaderTitle, setLeaderTitle] = useState('Chef de la Semaine 👑');
  const [leaderBadgeText, setLeaderBadgeText] = useState('Top Performance Smashed');

  // Custom Feature Builder local states
  const [featTitle, setFeatTitle] = useState('');
  const [featBadge, setFeatBadge] = useState('NOUVEAU');
  const [featDescription, setFeatDescription] = useState('');
  const [featIcon, setFeatIcon] = useState('✨');
  const [featCta, setFeatCta] = useState('En savoir plus');
  const [featBudget, setFeatBudget] = useState<number>(1000);
  const [featIsFeatured, setFeatIsFeatured] = useState<boolean>(false);

  // --- AI WEBSITE EXTRACTION STATES & HANDLERS ---
  const [isImportUrlModalOpen, setIsImportUrlModalOpen] = useState(false);
  const [importUrlPrefill, setImportUrlPrefill] = useState('');
  const [websiteUrlToExtract, setWebsiteUrlToExtract] = useState('');
  const [isExtractingWebsite, setIsExtractingWebsite] = useState(false);
  const [extractionStatusText, setExtractionStatusText] = useState('');

  // --- EDIT VIDEO DETAILS MODAL STATE ---
  const [isEditVideoModalOpen, setIsEditVideoModalOpen] = useState(false);
  const [editingVideoForModal, setEditingVideoForModal] = useState<Video | null>(null);

  // --- INSTAGRAM VIDEO IMPORT STATES & HANDLERS ---
  const [instagramVideoUrl, setInstagramVideoUrl] = useState('');
  const [instagramRestaurantId, setInstagramRestaurantId] = useState('');
  const [isExtractingInstagram, setIsExtractingInstagram] = useState(false);

  // --- GOOGLE FONTS SEARCH STATE ---
  const [googleFontSearchQuery, setGoogleFontSearchQuery] = useState('');

  // --- CUSTOM THEMING & LOGOS STATE ---
  const [showAddThemeForm, setShowAddThemeForm] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeEmoji, setNewThemeEmoji] = useState('🍕');
  const [newThemeColor, setNewThemeColor] = useState('#EF4444');

  // --- ADVERTISER MANAGEMENT STATE ---
  const [newAdvertiserName, setNewAdvertiserName] = useState('');
  const [newAdvertiserUrl, setNewAdvertiserUrl] = useState('');
  const [newAdvertiserBudget, setNewAdvertiserBudget] = useState(1000);
  const [newAdvertiserBanner, setNewAdvertiserBanner] = useState('');
  const [showAddAdvertiserForm, setShowAddAdvertiserForm] = useState(false);

  // --- HANDLERS ---
  const handleExtractWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = websiteUrlToExtract ? websiteUrlToExtract.trim() : '';
    if (!rawInput) {
      alert('Veuillez saisir une ou plusieurs URLs de sites web de restaurant.');
      return;
    }
    const isMulti = rawInput.includes('\n');
    setIsExtractingWebsite(true);
    setExtractionStatusText(isMulti ? '⚡ Extraction par lot en cours via l\'IA Scraper...' : '🔍 Analyse du domaine et du thème culinaire...');
    
    try {
      const res = await fetch('/api/extract-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawInput })
      });
      const apiResult = await safeApiJson(res, 'IA Scraper (/api/extract-website)');
      setIsExtractingWebsite(false);

      if (apiResult.ok && apiResult.data?.success) {
        const data = apiResult.data;
        setWebsiteUrlToExtract('');
        onRefreshData();
        if (data.isBulk) {
          alert(`✨ Import en masse réussi ! ${data.count} restaurants ont été créés/enrichis avec menus, tarifs réels, coordonnées GPS et vidéos.`);
        } else {
          alert(`✨ Extraction réussie ! Le restaurant "${data.restaurant?.name || 'Gourmand'}" avec ${data.countDishes || data.dishes?.length || 0} plats et sa capsule vidéo a été synchronisé.`);
        }
      } else {
        alert(apiResult.error || `Information d'extraction : ${apiResult.data?.error || 'Impossible d\'extraire les données'}`);
      }
    } catch (err: any) {
      setIsExtractingWebsite(false);
      alert(`Erreur de connexion au serveur : ${err.message}`);
    }
  };

  const handleBulkAddRestaurants = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = bulkNamesText.split('\n').map(n => n.trim()).filter(Boolean);
    if (names.length === 0) {
      alert('Veuillez saisir au moins un nom de restaurant.');
      return;
    }
    setIsBulkCreating(true);
    try {
      const res = await fetch('/api/restaurants/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          names,
          city: bulkCity,
          category: bulkCategory,
          district: bulkDistrict,
          subscriptionTier: bulkSubscriptionTier
        })
      });
      const apiResult = await safeApiJson(res, 'Création en masse (/api/restaurants/bulk)');
      if (apiResult.ok && apiResult.data) {
        const data = apiResult.data;
        onRefreshData();
        alert(`✨ ${data.count} restaurants ont été créés par lot pour la ville de ${bulkCity} (${bulkDistrict || 'Arrondissements multiples'}) avec succès !`);
        setBulkNamesText('');
        setBulkDistrict('');
        setShowBulkRestForm(false);
      } else {
        alert(apiResult.error || `Erreur lors de la création : ${apiResult.data?.error || 'Échec de la requête'}`);
      }
    } catch (err: any) {
      alert(`Erreur réseau : ${err.message}`);
    } finally {
      setIsBulkCreating(false);
    }
  };

  const handleRadarScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!radarCity.trim()) {
      alert('Veuillez saisir un nom de ville.');
      return;
    }
    setIsRadarScanning(true);
    setRadarProgress([]);
    setRadarResults([]);
    setSelectedRadarResult(null);

    const steps = [
      "Initialisation du Sourcing Radar par IA...",
      "Connexion au réseau Google Search Grounding...",
      "Analyse des ouvertures de restaurants de ces dernières années...",
      "Extraction des coordonnées géographiques précises...",
      "Génération des profils gastronomiques et taglines d'accueil..."
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setRadarProgress(prev => [...prev, steps[i]]);
    }

    try {
      const res = await fetch('/api/sourcing/radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: radarCity })
      });
      const apiResult = await safeApiJson(res, 'Sourcing Radar (/api/sourcing/radar)');
      if (apiResult.ok && apiResult.data?.success) {
        const data = apiResult.data;
        setRadarResults(data.results || []);
        setRadarProgress(prev => [...prev, `✅ Scan terminé avec succès ! ${(data.results || []).length} pépites culinaires localisées.`]);
      } else {
        const errorMsg = apiResult.error || `Erreur de scan : ${apiResult.data?.error || 'Erreur inconnue'}`;
        alert(errorMsg);
        setRadarProgress(prev => [...prev, `❌ ${errorMsg}`]);
      }
    } catch (err: any) {
      alert(`Erreur réseau : ${err.message}`);
      setRadarProgress(prev => [...prev, `❌ Échec de la connexion.`]);
    } finally {
      setIsRadarScanning(false);
    }
  };

  const handleImportRadarResult = async (item: any) => {
    setImportingRadarId(item.name);
    try {
      const res = await fetch('/api/restaurants/import-sourced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      const apiResult = await safeApiJson(res, 'Importation Radar (/api/restaurants/import-sourced)');
      if (apiResult.ok && apiResult.data?.success) {
        const data = apiResult.data;
        setImportedRadarIds(prev => [...prev, item.name]);
        onRefreshData();
        if (selectedRadarResult && selectedRadarResult.name === item.name) {
          setSelectedRadarResult(prev => prev ? { ...prev, isAlreadyImported: true } : null);
        }
      } else {
        alert(apiResult.error || `Erreur d'importation : ${apiResult.data?.error || 'Erreur inconnue'}`);
      }
    } catch (err: any) {
      alert(`Erreur réseau : ${err.message}`);
    } finally {
      setImportingRadarId(null);
    }
  };

  const handleUpdateFormula = async (id: string) => {
    try {
      const res = await fetch(`/api/formulas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingFormulaName,
          price: editingFormulaPrice,
          description: editingFormulaDesc
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Reload formulas list
        const formRes = await fetch('/api/formulas');
        const newData = await formRes.json();
        setFormulasList(newData);
        
        // Refresh parent
        onRefreshData();
        
        setEditingFormulaId(null);
        alert('✨ Formule mise à jour avec succès !');
      } else {
        alert(`Erreur : ${data.error}`);
      }
    } catch (err: any) {
      alert(`Erreur réseau : ${err.message}`);
    }
  };

  const startEditingFormula = (formula: any) => {
    setEditingFormulaId(formula.id);
    setEditingFormulaName(formula.name);
    setEditingFormulaPrice(formula.price);
    setEditingFormulaDesc(formula.description);
  };

  const handleImportInstagram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instagramVideoUrl || !instagramVideoUrl.trim() || !instagramRestaurantId) {
      alert('Veuillez saisir une URL Instagram valide et sélectionner un restaurant partenaire.');
      return;
    }
    setIsExtractingInstagram(true);
    try {
      const res = await fetch('/api/extract-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: instagramVideoUrl, restaurantId: instagramRestaurantId })
      });
      const data = await res.json();
      if (res.ok) {
        setIsExtractingInstagram(false);
        setInstagramVideoUrl('');
        onRefreshData();
        alert('✨ Succès ! La vidéo Instagram a été traitée par l\'IA et est désormais en cours de lecture automatique sur le feed client.');
      } else {
        setIsExtractingInstagram(false);
        alert(`Erreur d'importation Instagram : ${data.error}`);
      }
    } catch (err: any) {
      setIsExtractingInstagram(false);
      alert(`Erreur réseau : ${err.message}`);
    }
  };

  const [logoDragActive, setLogoDragActive] = useState(false);
  const [secondaryLogoDragActive, setSecondaryLogoDragActive] = useState(false);

  // AI Brand Customizer & Ad manager states
  const [aiThemePrompt, setAiThemePrompt] = useState('');
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  const [aiIconPrompt, setAiIconPrompt] = useState('');
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [selectedIconKey, setSelectedIconKey] = useState('iconCart');

  // Ad states
  const [adTitle, setAdTitle] = useState('');
  const [adSubtitle, setAdSubtitle] = useState('');
  const [adMediaUrl, setAdMediaUrl] = useState('');
  const [adMediaType, setAdMediaType] = useState('image');
  const [adClickUrl, setAdClickUrl] = useState('');

  const handleGenerateAITheme = async () => {
    if (!aiThemePrompt.trim()) return;
    setIsGeneratingTheme(true);
    try {
      const res = await fetch('/api/ai/generate-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiThemePrompt })
      });
      if (!res.ok) throw new Error('Échec de la génération du thème');
      const data = await res.json();
      if (data.theme) {
        onUpdateDesignSettings(data.theme);
        alert('✨ Charte graphique, slogan et ambiance générés et appliqués avec succès !');
        setAiThemePrompt('');
      } else {
        alert('L’IA n’a pas renvoyé de thème valide.');
      }
    } catch (err: any) {
      alert(`Erreur IA : ${err.message}`);
    } finally {
      setIsGeneratingTheme(false);
    }
  };

  const handleGenerateAIIcon = async () => {
    if (!aiIconPrompt.trim()) return;
    setIsGeneratingIcon(true);
    try {
      const res = await fetch('/api/ai/generate-icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiIconPrompt })
      });
      if (!res.ok) throw new Error('Échec de la génération d’icône');
      const data = await res.json();
      if (data.value) {
        const currentIcons = designSettings.customIcons || {};
        const updated = { ...currentIcons, [selectedIconKey]: data.value };
        onUpdateDesignSettings({ customIcons: updated });
        alert(`✨ Icône personnalisée "${data.value}" configurée avec succès pour le bouton !`);
        setAiIconPrompt('');
      } else {
        alert('L’IA n’a pas renvoyé de valeur d’icône valide.');
      }
    } catch (err: any) {
      alert(`Erreur d'icône IA : ${err.message}`);
    } finally {
      setIsGeneratingIcon(false);
    }
  };

  const handleAddDesktopAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adTitle.trim()) return;
    const newAd = {
      id: 'ad_' + Date.now(),
      title: adTitle,
      subtitle: adSubtitle,
      mediaUrl: adMediaUrl,
      mediaType: adMediaType,
      clickUrl: adClickUrl,
      isActive: true
    };
    const currentAds = designSettings.desktopAds || [];
    onUpdateDesignSettings({ desktopAds: [...currentAds, newAd] });
    alert('📢 Publicité ajoutée et activée sur ordinateur !');
    setAdTitle('');
    setAdSubtitle('');
    setAdMediaUrl('');
    setAdClickUrl('');
  };

  const uploadImageFileWithFallback = async (file: File, maxCanvasSize = 300): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          return data.url;
        }
      }
    } catch (err) {
      console.warn('[Upload] Server upload error, using canvas fallback:', err);
    }

    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxCanvasSize) {
              height = Math.round((height * maxCanvasSize) / width);
              width = maxCanvasSize;
            }
          } else {
            if (height > maxCanvasSize) {
              width = Math.round((width * maxCanvasSize) / height);
              height = maxCanvasSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png', 0.85));
          } else {
            resolve((e.target?.result as string) || '');
          }
        };
        img.onerror = () => resolve((e.target?.result as string) || '');
        img.src = (e.target?.result as string) || '';
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez déposer une image valide (PNG, JPG, WEBP, SVG).');
      return;
    }
    const logoUrl = await uploadImageFileWithFallback(file, 300);
    onUpdateDesignSettings({ 
      logoUrl,
      headerConfig: {
        ...(designSettings.headerConfig || {}),
        logoUrl
      }
    });
    alert('✨ Logo principal téléversé et enregistré avec succès !');
  };

  const handleSecondaryLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez déposer une image valide (PNG, JPG, WEBP, SVG).');
      return;
    }
    const secondaryLogoUrl = await uploadImageFileWithFallback(file, 300);
    onUpdateDesignSettings({ 
      secondaryLogoUrl,
      showSecondaryLogo: true,
      secondaryLogoType: 'image',
      headerConfig: {
        ...(designSettings.headerConfig || {}),
        secondaryLogoUrl,
        showSecondaryLogo: true,
        secondaryLogoType: 'image'
      }
    });
    alert('✨ Deuxième logo (image) téléversé et enregistré avec succès !');
  };

  const handleSplashLogoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez déposer une image valide (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onUpdateDesignSettings({ splashLogoUrl: e.target.result as string });
        alert('✨ Logo du splash d\'introduction importé !');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoginBgUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez déposer une image valide (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onUpdateDesignSettings({ loginBgImage: e.target.result as string });
        alert('✨ Image de fond de connexion importée !');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoginLogoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez déposer une image valide (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onUpdateDesignSettings({ loginLogoUrl: e.target.result as string });
        alert('✨ Logo de la page de connexion importé !');
      }
    };
    reader.readAsDataURL(file);
  };

  // Dynamically load Leaflet Map for Radar Sourcing
  useEffect(() => {
    if (!showRadarForm || radarResults.length === 0) return;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css-radar')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-radar';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    let mapInstance: any = null;

    const initMap = () => {
      const container = document.getElementById('radar-leaflet-map');
      if (!container) return;

      const L = (window as any).L;
      if (!L) return;

      // Find average lat/lng or default to Nice coordinates
      let centerLat = 43.7102;
      let centerLng = 7.2620;
      if (radarResults.length > 0) {
        const validCoords = radarResults.filter(r => r.latitude && r.longitude);
        if (validCoords.length > 0) {
          centerLat = validCoords[0].latitude;
          centerLng = validCoords[0].longitude;
        }
      }

      mapInstance = L.map('radar-leaflet-map', {
        zoomControl: false
      }).setView([centerLat, centerLng], 12);

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

      // Dark theme map layer (CartoDB Dark Matter)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstance);

      // Add markers
      radarResults.forEach((item: any) => {
        if (!item.latitude || !item.longitude) return;

        const isAdded = restaurants.some(r => r.name.toLowerCase() === item.name.toLowerCase()) || importedRadarIds.includes(item.name);

        const customMarkerHtml = `
          <div class="relative group flex items-center justify-center">
            <div class="w-8 h-8 rounded-full ${isAdded ? 'bg-emerald-500' : 'bg-[#FF5C00]'} border-2 border-white flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-200">
              <span class="text-xs text-white">${isAdded ? '✓' : '🍕'}</span>
            </div>
          </div>
        `;

        const markerIcon = L.divIcon({
          className: 'custom-div-icon',
          html: customMarkerHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        });

        const marker = L.marker([item.latitude, item.longitude], { icon: markerIcon }).addTo(mapInstance);

        // Custom Popup element
        const popupContent = document.createElement('div');
        popupContent.className = 'p-2 text-zinc-950 font-sans max-w-[200px] bg-white rounded-lg';
        popupContent.innerHTML = `
          <h4 class="font-bold text-xs" style="color: #0c0c0e !important; margin: 0 0 4px 0 !important;">${item.name}</h4>
          <p class="text-[9px] text-zinc-500 mt-1" style="margin: 0 0 2px 0 !important;">${item.category} • ${item.address}</p>
          <p class="text-[9px] text-zinc-600 italic mt-1 font-serif" style="margin: 0 0 6px 0 !important;">"${item.slogan || ''}"</p>
          <button id="radar-popup-btn-${item.name.replace(/\s+/g, '-')}" class="mt-2 w-full text-white text-[9px] font-black uppercase tracking-wider py-1.5 px-2 rounded transition-all cursor-pointer ${
            isAdded ? 'bg-emerald-600 cursor-default' : 'bg-[#FF5C00] hover:bg-orange-600'
          }">
            ${isAdded ? '✓ Déjà Ajouté' : '⚡ Ajouter en 1 Clic'}
          </button>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`radar-popup-btn-${item.name.replace(/\s+/g, '-')}`);
          if (btn && !isAdded) {
            btn.onclick = () => {
              handleImportRadarResult(item);
              marker.closePopup();
            };
          }
        });
      });
    };

    if (!(window as any).L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        initMap();
      };
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [showRadarForm, radarResults, importedRadarIds, restaurants]);

  // Load administrative media and backups when relevant tab is selected
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'media') {
        setMediaLoading(true);
        fetch('/api/admin/media')
          .then(res => res.json())
          .then(data => setAdminMediaList(data))
          .catch(err => console.error("Error fetching media:", err))
          .finally(() => setMediaLoading(false));
      } else if (activeTab === 'backup') {
        setBackupsLoading(true);
        fetch('/api/admin/backups')
          .then(res => res.json())
          .then(data => setBackupsList(data))
          .catch(err => console.error("Error fetching backups:", err))
          .finally(() => setBackupsLoading(false));
      }
    }
  }, [isOpen, activeTab]);

  // Load backend states & generate simulated collections
  useEffect(() => {
    if (isOpen) {
      // Fetch subscription formulas
      fetch('/api/formulas')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => setFormulasList(data))
        .catch(() => {
          setFormulasList([
            { id: 'free', name: 'Formule Découverte Paris', price: 0, description: 'Idéal pour débuter à Paris. Visibilité standard dans votre arrondissement.' },
            { id: 'pro', name: 'Formule Paris Pro Booster', price: 49, description: 'Pour les restaurateurs ambitieux à Paris. Visibilité boostée, commissions réduites à 10%.' },
            { id: 'gold', name: 'Formule Paris Gold Elite', price: 99, description: 'L\'expérience ultime. Visibilité maximale dans tout Paris, support 24/7 et commissions à 5%.' }
          ]);
        });

      // Fetch simulated users
      fetch('/api/users')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => setUsersList(data))
        .catch(() => {
          // Fallback mock
          setUsersList([
            { id: 'usr-client-1', email: 'foodie@fidfud.app', role: 'client', status: 'active' },
            { id: 'usr-rest-nonna', email: 'partner@nonnapizza.fr', role: 'restaurant', status: 'active' },
            { id: 'usr-rest-tokyo', email: 'contact@tokyoramen.jp', role: 'restaurant', status: 'active' },
            { id: 'usr-rest-burger', email: 'chef@burgerlab.com', role: 'restaurant', status: 'active' },
            { id: 'usr-admin-1', email: 'admin@fidfud.app', role: 'admin', status: 'active' }
          ]);
        });

      // Generate default couriers if none
      setCouriers([
        { id: 'cur-1', name: 'Karim Bensalah', phone: '06 12 34 56 78', vehicle: 'Scooter', status: 'available' },
        { id: 'cur-2', name: 'Sarah Meunier', phone: '07 89 45 12 63', vehicle: 'Velo', status: 'delivering', assignedOrderId: 'ord_example_1' },
        { id: 'cur-3', name: 'Maxime Giraud', phone: '06 99 88 77 66', vehicle: 'Voiture', status: 'offline' }
      ]);

      // Generate default coupons
      setCoupons([
        { id: 'cop-1', code: 'FIDFUD10', discountType: 'percentage', discountValue: 10, isActive: true },
        { id: 'cop-2', code: 'PROMOFREE', discountType: 'fixed', discountValue: 5, isActive: true },
        { id: 'cop-3', code: 'BURGERPOWER', discountType: 'percentage', discountValue: 15, isActive: false }
      ]);

      // Generate default comments
      setComments([
        { id: 'com-1', videoId: 'vid-nonna-1', videoTitle: '🍕 Marguerita D.O.C.', username: 'lucas_gourmand', text: 'Incroyable cette pâte ! On sent la fraîcheur', createdAt: 'Il y a 2h' },
        { id: 'com-2', videoId: 'vid-nonna-1', videoTitle: '🍕 Marguerita D.O.C.', username: 'emma_food', text: 'La mozzarella bufala a l’air si coulante 😍', createdAt: 'Il y a 5h' },
        { id: 'com-3', videoId: 'vid-tokyo-1', videoTitle: '🍜 Tonkotsu Ramen Impérial', username: 'ramen_lover', text: 'Meilleur bouillon de Paris sans aucun doute.', createdAt: 'Hier' }
      ]);
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const isUserAdmin = Boolean(user && user.role === 'admin');
  if (!isUserAdmin) return null;

  // File Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setIsUploadingFile(true);
    setUploadedFileName(file.name);
    
    if (file.type.startsWith('video/')) {
      setUploadedFileType('video');
    } else {
      setUploadedFileType('image');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Erreur serveur lors du téléversement');
      }

      const data = await res.json();
      if (data.success && data.url) {
        setUploadedFileUrl(data.url);
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      alert('Échec du téléversement du fichier sur le serveur. Veuillez réessayer.');
      setUploadedFileUrl('');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // --- CRUD RESTAURANT HANDLERS ---
  const handleOpenAddRest = () => {
    setEditingRestaurant(null);
    setRestName('');
    setRestAddress('');
    setRestCommDelivery(15);
    setRestCommCollect(5);
    setRestStripe('');
    setRestLogoUrl('');
    setRestBannerUrl('');
    setRestEmail('');
    setRestPhone('');
    setRestDescription('');
    setRestIsFavorite(false);
    setRestIsPublished(true);
    setRestCategory('Italien & Pizza');
    setRestCategories(['Italien & Pizza 🍕']);
    setCustomCategoryInput('');
    setRestSlogan('');
    setRestSeoKeywords([]);
    setRestSeoMetaDescription('');
    setRestVideoCategories(['Dégustation 😋']);
    setCustomVideoCategoryInput('');
    setGeocodedStatusText('');
    setRestDispositionShop('');
    setRestShortName('');
    setRestLatitude(48.8566);
    setRestLongitude(2.3522);
    setRestVideoUrl('');
    setRestVideoTitle('');
    setRestSubscriptionTier('free');
    setShowRestaurantForm(true);
    
    // Auto scroll directly to the form top and focus name input
    setTimeout(() => {
      const el = document.getElementById('restaurant-edit-form-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const inputEl = document.getElementById('restaurant-name-input');
      if (inputEl) {
        inputEl.focus();
      }
    }, 150);
  };

  const handleOpenEditRest = (rest: Restaurant) => {
    setEditingRestaurant(rest);
    setRestName(rest.name);
    setRestAddress(rest.address);
    setRestCommDelivery(rest.commissionRateDelivery);
    setRestCommCollect(rest.commissionRateCollect);
    setRestStripe(rest.stripeAccountId || '');
    setRestLogoUrl(rest.logoUrl || '');
    setRestBannerUrl(rest.bannerUrl || '');
    setRestEmail(rest.email || '');
    setRestPhone(rest.phone || '');
    setRestDescription(rest.description || '');
    setRestIsFavorite(!!rest.isFavorite);
    setRestIsPublished(rest.isPublished !== false);
    
    // Multiple categories parsing
    const cats = rest.categories && rest.categories.length > 0 
      ? rest.categories 
      : (rest.category ? rest.category.split(' • ') : ['Italien & Pizza 🍕']);
    setRestCategories(cats);
    setRestCategory(rest.category || cats[0] || 'Italien & Pizza');
    setCustomCategoryInput('');

    setRestSlogan(rest.slogan || '');
    setRestSeoKeywords(rest.seoKeywords || []);
    setRestSeoMetaDescription(rest.seoMetaDescription || '');

    setRestDispositionShop(rest.dispositionShop || '');
    setRestShortName(rest.shortName || '');
    setRestLatitude(rest.latitude !== undefined ? rest.latitude : 48.8566);
    setRestLongitude(rest.longitude !== undefined ? rest.longitude : 2.3522);
    
    // Auto-load current video associated with this restaurant
    const associatedVideo = videos.find(v => v.restaurantId === rest.id);
    setRestVideoUrl(associatedVideo ? associatedVideo.videoUrl : '');
    setRestVideoTitle(associatedVideo ? associatedVideo.title : '');
    const vidCats = associatedVideo?.categories && associatedVideo.categories.length > 0
      ? associatedVideo.categories
      : (rest.videoCategories || ['Dégustation 😋']);
    setRestVideoCategories(vidCats);
    setCustomVideoCategoryInput('');
    setGeocodedStatusText(`📍 Position GPS : Lat ${rest.latitude !== undefined ? rest.latitude : 48.8566}, Lng ${rest.longitude !== undefined ? rest.longitude : 2.3522}`);

    setRestSubscriptionTier(rest.subscriptionTier || 'free');
    
    setShowRestaurantForm(true);

    // Auto scroll directly to the form top and focus name input
    setTimeout(() => {
      const el = document.getElementById('restaurant-edit-form-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const inputEl = document.getElementById('restaurant-name-input');
      if (inputEl) {
        inputEl.focus();
      }
    }, 150);
  };

  const handleGenerateAiCopy = async () => {
    if (!restName) {
      alert('Veuillez d’abord indiquer le nom du restaurant.');
      return;
    }
    setIsGeneratingAiCopy(true);
    try {
      const res = await fetch('/api/ai/generate-restaurant-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: restName,
          categories: restCategories,
          address: restAddress
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.slogan) setRestSlogan(data.slogan);
        if (data.description) setRestDescription(data.description);
        if (data.seoKeywords) setRestSeoKeywords(data.seoKeywords);
        if (data.seoMetaDescription) setRestSeoMetaDescription(data.seoMetaDescription);
        showFeedbackToast('✨ Slogan, Description & SEO générés avec succès par Gemini IA !', 'success');
      }
    } catch (err) {
      console.error(err);
      showFeedbackToast('Erreur lors de la génération IA', 'error');
    } finally {
      setIsGeneratingAiCopy(false);
    }
  };

  const handleGeocodeAddress = async (addrToGeocode?: string) => {
    const targetAddress = addrToGeocode || restAddress;
    if (!targetAddress || targetAddress.trim().length < 3) {
      setGeocodedStatusText('⚠️ Veuillez saisir une adresse plus complète.');
      return;
    }

    setIsGeocodingAddress(true);
    setGeocodedStatusText('🔍 Recherche des coordonnées GPS de l’adresse...');

    try {
      const res = await fetch('/api/geocode-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: targetAddress })
      });
      const data = await res.json();
      if (data.success && data.lat && data.lng) {
        setRestLatitude(data.lat);
        setRestLongitude(data.lng);
        setGeocodedStatusText(`✅ Adresse localisée avec succès ! Lat: ${data.lat.toFixed(5)}, Lng: ${data.lng.toFixed(5)}`);
        showFeedbackToast('📍 Position GPS mise à jour automatiquement !', 'success');
      } else {
        setGeocodedStatusText('⚠️ Adresse non trouvée, position par défaut conservée.');
      }
    } catch (err) {
      console.error(err);
      setGeocodedStatusText('⚠️ Erreur réseau lors de la recherche GPS.');
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restName || !restAddress || isSavingRestaurant) return;

    setIsSavingRestaurant(true);
    const mainCategory = restCategories.length > 0 ? restCategories.join(' • ') : (restCategory || 'Gourmet');

    const payload = {
      name: restName,
      address: restAddress,
      commissionRateDelivery: Number(restCommDelivery),
      commissionRateCollect: Number(restCommCollect),
      stripeAccountId: restStripe || undefined,
      logoUrl: restLogoUrl,
      bannerUrl: restBannerUrl,
      email: restEmail,
      phone: restPhone,
      slogan: restSlogan,
      description: restDescription,
      seoKeywords: restSeoKeywords,
      seoMetaDescription: restSeoMetaDescription,
      isFavorite: !!restIsFavorite,
      isPublished: !!restIsPublished,
      category: mainCategory,
      categories: restCategories,
      dispositionShop: restDispositionShop,
      shortName: restShortName || restName,
      latitude: Number(restLatitude),
      longitude: Number(restLongitude),
      videoUrl: restVideoUrl,
      videoTitle: restVideoTitle,
      videoCategories: restVideoCategories,
      subscriptionTier: restSubscriptionTier
    };

    try {
      let endpoint = '/api/restaurants';
      let method = 'POST';

      if (editingRestaurant) {
        endpoint = `/api/restaurants/${editingRestaurant.id}`;
        method = 'PUT';
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showFeedbackToast('✨ Restaurant enregistré avec toutes ses catégories & coordonnées GPS !', 'success');
        setShowRestaurantForm(false);
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingRestaurant(false);
    }
  };

  const handleDeleteRestaurant = (id: string) => {
    const rest = restaurants.find(r => r.id === id);
    const name = rest ? rest.name : 'ce restaurant';
    askConfirmation(
      'Supprimer le restaurant',
      `Voulez-vous supprimer définitivement le restaurant "${name}" ? Tous les plats, vidéos, lives et historiques associés seront également purgés de la base de données de manière irréversible.`,
      async () => {
        try {
          const res = await fetch(`/api/restaurants/${id}`, { method: 'DELETE' });
          if (res.ok) {
            showFeedbackToast(`✨ Restaurant "${name}" supprimé avec succès !`, 'success');
            onRefreshData();
          } else {
            const errData = await res.json().catch(() => ({}));
            showFeedbackToast(`Erreur : ${errData.error || 'Impossible de supprimer le restaurant'}`, 'error');
          }
        } catch (err) {
          console.error(err);
          showFeedbackToast('Une erreur est survenue lors de la suppression.', 'error');
        }
      }
    );
  };

  const handleDeleteOrder = (orderId: string) => {
    askConfirmation(
      'Supprimer la commande',
      `Êtes-vous sûr de vouloir supprimer définitivement la commande "${orderId}" ?`,
      async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
          if (res.ok) {
            showFeedbackToast(`✨ Commande "${orderId}" supprimée avec succès !`, 'success');
            onRefreshData();
          } else {
            showFeedbackToast("Erreur lors de la suppression de la commande", 'error');
          }
        } catch (err) {
          console.error(err);
          showFeedbackToast("Erreur lors de la suppression de la commande", 'error');
        }
      }
    );
  };

  const handleDeleteDish = (dishId: string, dishName: string) => {
    askConfirmation(
      'Supprimer le plat',
      `Voulez-vous vraiment supprimer définitivement le plat "${dishName}" ? Cette action est irréversible et retirera le plat du catalogue et de la boutique live.`,
      async () => {
        try {
          const res = await fetch(`/api/dishes/${dishId}`, { method: 'DELETE' });
          if (res.ok) {
            showFeedbackToast(`✨ Plat "${dishName}" supprimé avec succès !`, 'success');
            onRefreshData();
          } else {
            const errData = await res.json().catch(() => ({}));
            showFeedbackToast(`Erreur : ${errData.error || 'Impossible de supprimer le plat'}`, 'error');
          }
        } catch (err) {
          console.error(err);
          showFeedbackToast('Une erreur est survenue lors de la suppression du plat.', 'error');
        }
      }
    );
  };

  const handleBulkDeleteRestaurants = () => {
    if (selectedRestIds.length === 0) return;
    askConfirmation(
      'Suppression par lot',
      `Êtes-vous sûr de vouloir supprimer définitivement les ${selectedRestIds.length} restaurants sélectionnés ? Tous leurs plats et vidéos associés seront également perdus de manière irréversible.`,
      async () => {
        setIsBulkDeleting(true);
        try {
          const res = await fetch('/api/restaurants/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedRestIds })
          });
          
          if (res.ok) {
            setSelectedRestIds([]);
            onRefreshData();
            showFeedbackToast(`✨ Les ${selectedRestIds.length} restaurants sélectionnés ont été supprimés.`, 'success');
          } else {
            const errData = await res.json().catch(() => ({}));
            showFeedbackToast(`Erreur : ${errData.error || 'Impossible de supprimer les restaurants'}`, 'error');
          }
        } catch (err) {
          console.error(err);
          showFeedbackToast('Une erreur est survenue lors de la suppression par lot.', 'error');
        } finally {
          setIsBulkDeleting(false);
        }
      }
    );
  };

  const handleDatabaseCleanup = () => {
    askConfirmation(
      'Nettoyage de la base de données',
      "Voulez-vous pruner la base de données ? Cela va supprimer définitivement de Firestore tous les restaurants, plats et vidéos obsolètes qui ne figurent pas dans cette liste d'administration locale.",
      async () => {
        setIsCleaningDatabase(true);
        try {
          const res = await fetch('/api/admin/database-cleanup', {
            method: 'POST'
          });
          
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            showFeedbackToast(`🧹 Nettoyage terminé ! Items purgés : ${data.deletedRestaurants || 0} restaurants, ${data.deletedDishes || 0} plats, ${data.deletedVideos || 0} vidéos.`, 'success');
            onRefreshData();
          } else {
            const errData = await res.json().catch(() => ({}));
            showFeedbackToast(`Erreur : ${errData.error || 'Impossible de nettoyer la base de données'}`, 'error');
          }
        } catch (err) {
          console.error(err);
          showFeedbackToast('Une erreur est survenue lors du nettoyage.', 'error');
        } finally {
          setIsCleaningDatabase(false);
        }
      }
    );
  };

  // --- CLIENTS CRUD ---
  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail) return;

    const newUser = {
      id: `usr-${Math.random().toString(36).substring(2, 9)}`,
      email: clientEmail,
      role: clientRole,
      status: clientStatus
    };

    setUsersList(prev => [...prev, newUser]);
    setClientEmail('');
    setShowClientForm(false);
    showFeedbackToast('✨ Utilisateur créé localement avec succès !', 'success');
  };

  const toggleUserStatus = (id: string) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'suspended' ? 'active' : 'suspended';
        showFeedbackToast(`Statut de l'utilisateur mis à jour : ${nextStatus === 'active' ? 'Actif' : 'Suspendu'}`, 'success');
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleDeleteUser = (id: string) => {
    askConfirmation(
      "Supprimer l'utilisateur",
      "Voulez-vous vraiment supprimer définitivement cet utilisateur de la base de données ?",
      async () => {
        try {
          const authHeaders = await getAuthBearerHeaders();
          const res = await fetch(`/api/users/${id}`, { 
            method: 'DELETE',
            headers: { ...authHeaders }
          });
          if (res.ok) {
            setUsersList(prev => prev.filter(u => u.id !== id));
            showFeedbackToast('✨ Utilisateur supprimé avec succès !', 'success');
            onRefreshData();
          } else {
            const errData = await res.json().catch(() => ({}));
            showFeedbackToast(`Erreur : ${errData.error || "Impossible de supprimer l'utilisateur"}`, 'error');
          }
        } catch (err) {
          console.error(err);
          showFeedbackToast('Une erreur est survenue lors de la suppression.', 'error');
        }
      }
    );
  };

  const handleAdminResetPassword = async (userId: string, userEmail: string) => {
    const newPass = prompt(`Entrez le nouveau mot de passe pour ${userEmail} (minimum 6 caractères) :`);
    if (!newPass) return;
    if (newPass.length < 6) {
      showFeedbackToast('Le mot de passe doit contenir au moins 6 caractères.', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedbackToast(data.message || 'Mot de passe réinitialisé avec succès !', 'success');
      } else {
        showFeedbackToast(data.error || 'Erreur lors de la réinitialisation.', 'error');
      }
    } catch (err: any) {
      showFeedbackToast(err.message || 'Erreur réseau.', 'error');
    }
  };

  const handleUserRoleChange = async (userId: string, newRole: string) => {
    try {
      const authHeaders = await getAuthBearerHeaders();
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
        showFeedbackToast(`✨ Rôle utilisateur mis à jour : ${newRole.toUpperCase()}`, 'success');
        onRefreshData();
      } else {
        const err = await res.json().catch(() => ({}));
        showFeedbackToast(`Erreur : ${err.error || "Impossible de changer le rôle"}`, 'error');
      }
    } catch (err: any) {
      showFeedbackToast(err.message || 'Erreur réseau.', 'error');
    }
  };

  const handleDeleteCourier = (id: string) => {
    askConfirmation(
      'Supprimer le livreur',
      'Voulez-vous vraiment supprimer ce livreur ?',
      () => {
        setCouriers(prev => prev.filter(c => c.id !== id));
        showFeedbackToast('✨ Livreur supprimé avec succès !', 'success');
      }
    );
  };

  // --- COURIER CRUD ---
  const handleSaveCourier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierName || !courierPhone) return;

    const newCourier: Courier = {
      id: `cur-${Math.random().toString(36).substring(2, 9)}`,
      name: courierName,
      phone: courierPhone,
      vehicle: courierVehicle,
      status: 'available'
    };

    setCouriers(prev => [...prev, newCourier]);
    setCourierName('');
    setCourierPhone('');
    setShowCourierForm(false);
    showFeedbackToast('✨ Livreur ajouté avec succès !', 'success');
  };

  const toggleCourierStatus = (id: string) => {
    setCouriers(prev => prev.map(c => {
      if (c.id === id) {
        const nextStatus: Courier['status'] = c.status === 'available' ? 'offline' : c.status === 'offline' ? 'available' : 'available';
        showFeedbackToast(`Statut du livreur mis à jour : ${nextStatus}`, 'success');
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  // --- PROMO COUPON CRUD ---
  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return;

    const newCoupon: Coupon = {
      id: `cop-${Math.random().toString(36).substring(2, 9)}`,
      code: couponCode.toUpperCase().trim(),
      discountType: couponType,
      discountValue: Number(couponVal),
      isActive: true
    };

    setCoupons(prev => [...prev, newCoupon]);
    setCouponCode('');
    setShowCouponForm(false);
    showFeedbackToast('✨ Code promo créé avec succès !', 'success');
  };

  const toggleCouponActive = (id: string) => {
    setCoupons(prev => prev.map(c => {
      if (c.id === id) {
        const nextState = !c.isActive;
        showFeedbackToast(`Code promo ${c.code} ${nextState ? 'activé' : 'désactivé'} !`, 'success');
        return { ...c, isActive: nextState };
      }
      return c;
    }));
  };

  const deleteCoupon = (id: string) => {
    askConfirmation(
      'Supprimer le code promo',
      'Voulez-vous vraiment supprimer définitivement ce code promo ?',
      () => {
        setCoupons(prev => prev.filter(c => c.id !== id));
        showFeedbackToast('✨ Code promo supprimé !', 'success');
      }
    );
  };

  // --- INTERACTION CMS HANDLERS ---
  const handleOpenEditVideo = (video: Video) => {
    setEditingVideoForModal(video);
    setIsEditVideoModalOpen(true);
  };

  const handleUpdateLikes = (videoId: string, increment: boolean) => {
    videos.forEach(v => {
      if (v.id === videoId) {
        v.likesCount = Math.max(0, v.likesCount + (increment ? 50 : -50));
      }
    });
    onRefreshData();
    showFeedbackToast(`Engagement mis à jour (${increment ? '+50' : '-50'} J'aime)`, 'success');
  };

  const handleDeleteComment = (id: string) => {
    askConfirmation(
      'Supprimer le commentaire',
      'Voulez-vous vraiment supprimer définitivement ce commentaire ?',
      async () => {
        try {
          const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setComments(prev => prev.filter(c => c.id !== id));
            showFeedbackToast('✨ Commentaire supprimé avec succès !', 'success');
            onRefreshData();
          } else {
            const errData = await res.json().catch(() => ({}));
            showFeedbackToast(`Erreur : ${errData.error || 'Impossible de supprimer le commentaire'}`, 'error');
          }
        } catch (err) {
          console.error(err);
          showFeedbackToast('Une erreur est survenue lors de la suppression du commentaire.', 'error');
        }
      }
    );
  };

  const handleAddComment = (videoId: string) => {
    const text = prompt("Entrez le texte de votre commentaire fictif :");
    if (!text) return;
    const v = videos.find(vid => vid.id === videoId);

    const newComment: Comment = {
      id: `com-${Math.random().toString(36).substring(2, 9)}`,
      videoId,
      videoTitle: v ? v.title.substring(0, 30) : 'Vidéo',
      username: 'studio_chef',
      text,
      createdAt: 'À l’instant'
    };
    setComments(prev => [newComment, ...prev]);
  };

  const handleSimulateGift = async () => {
    if (!selectedGiftRestaurantId) {
      alert("Veuillez sélectionner un restaurant.");
      return;
    }
    const rest = restaurants.find(r => r.id === selectedGiftRestaurantId);
    if (!rest) return;

    let ptsToAdd = 10;
    let likesToAdd = 5;
    let giftName = "🌹 Rose";

    if (selectedGiftType === 'tacos') {
      ptsToAdd = 50;
      likesToAdd = 25;
      giftName = "🌮 Tacos de Rue";
    } else if (selectedGiftType === 'champagne') {
      ptsToAdd = 200;
      likesToAdd = 100;
      giftName = "🍾 Champagne Premium";
    } else if (selectedGiftType === 'crown') {
      ptsToAdd = 1000;
      likesToAdd = 500;
      giftName = "👑 Couronne Royale";
    }

    setIsSendingGiftSim(true);
    try {
      const updatedPts = (rest.pointsReceived || 0) + ptsToAdd;
      const updatedLikes = (rest.likesReceived || 0) + likesToAdd;

      const res = await fetch(`/api/restaurants/${rest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointsReceived: updatedPts,
          likesReceived: updatedLikes
        })
      });

      if (res.ok) {
        alert(`Succès ! Vous avez offert un(e) ${giftName} à ${rest.name}. (+${ptsToAdd} points, +${likesToAdd} likes)`);
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi du cadeau.");
    } finally {
      setIsSendingGiftSim(false);
    }
  };

  // --- FIREBASE CLOUD STORAGE & BACKUP HANDLERS ---
  const handleSyncAllToFirestore = async () => {
    try {
      setIsSyncingFirebase(true);
      setSyncResultMsg(null);
      const res = await fetch('/api/backup/sync-all-to-firestore', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncResultMsg(`✅ Sauvegarde Firestore réussie ! ${data.stats?.restaurantsSynced || 0} restaurants et ${data.stats?.videosSynced || 0} vidéos verrouillés en permanence.`);
        showFeedbackToast('✨ Base synchronisée et verrouillée dans Firestore avec succès !', 'success');
      } else {
        setSyncResultMsg(`⚠️ ${data.error || 'Erreur de synchronisation Firestore.'}`);
        showFeedbackToast(data.error || 'Erreur de synchronisation', 'error');
      }
    } catch (err: any) {
      setSyncResultMsg(`❌ Erreur: ${err?.message || 'Échec de connexion.'}`);
      showFeedbackToast('Échec de la synchronisation Firestore', 'error');
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handleCleanDatabaseVideos = async () => {
    try {
      setIsCleaningVideos(true);
      setSyncResultMsg(null);
      const res = await fetch('/api/backup/clean-database-videos', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncResultMsg(`🧹 Nettoyage terminé avec succès ! ${data.videosCount} vidéos structurées (Restaurants en tête).`);
        showFeedbackToast('✨ Base de vidéos nettoyée et ordonnée (Restaurants en priorité) !', 'success');
        onRefreshData();
      } else {
        setSyncResultMsg(`⚠️ ${data.error || 'Erreur lors du nettoyage des vidéos.'}`);
        showFeedbackToast(data.error || 'Erreur lors du nettoyage', 'error');
      }
    } catch (err: any) {
      setSyncResultMsg(`❌ Erreur: ${err?.message || 'Échec du nettoyage.'}`);
      showFeedbackToast('Échec du nettoyage de la base vidéos', 'error');
    } finally {
      setIsCleaningVideos(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex bg-[#030303]/98 backdrop-blur-xl overflow-hidden font-sans">
      
      {/* Backdrop for mobile navigation menu */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Control Menu - Shopify CMS Style */}
      <aside className={`w-64 border-r border-white/5 bg-[#0A0A0B] flex flex-col justify-between shrink-0 h-full select-none z-50 md:relative fixed inset-y-0 left-0 transform md:transform-none transition-transform duration-300 md:translate-x-0 overflow-y-auto max-h-screen ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div>
          {/* Header Logo */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-tr from-[#FF5C00] to-[#FF8C00] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,92,0,0.3)]">
                <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9ZM16 6V14H18.5V22H21V2C18.24 2 16 4.24 16 6Z"/></svg>
              </div>
              <span className="text-lg font-black tracking-tighter italic text-white">FIDFUD <span className="text-[10px] text-orange-500 not-italic font-bold tracking-widest uppercase ml-1 bg-orange-500/10 px-1 py-0.5 rounded border border-orange-500/20">CMS</span></span>
            </div>
          </div>

          {/* CMS Categories */}
          <nav className="p-4 space-y-1">
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest px-3 mb-2 font-mono">PERSONNALISATION</p>
            
            <button
              onClick={() => { setActiveTab('design'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'design' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Palette size={14} className={activeTab === 'design' ? 'text-[#FF5C00]' : ''} />
              <span>1. Branding & Design</span>
            </button>

            <button
              onClick={() => { setActiveTab('accueil'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'accueil' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <LayoutGrid size={14} className={activeTab === 'accueil' ? 'text-[#FF5C00]' : ''} />
              <span>2. Gérer l'Accueil</span>
            </button>

            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest px-3 pt-4 mb-2 font-mono">COMMERCE & LOGISTIQUE</p>

            <button
              onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'orders' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <ShoppingBag size={14} className={activeTab === 'orders' ? 'text-[#FF5C00]' : ''} />
              <span className="flex-1 text-left">2. Commandes</span>
              {orders.length > 0 && (
                <span className="bg-red-500 text-white font-mono text-[9px] font-black h-4.5 min-w-4.5 px-1 rounded-full flex items-center justify-center">
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('restaurants'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'restaurants' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Store size={14} className={activeTab === 'restaurants' ? 'text-[#FF5C00]' : ''} />
              <span>3. Restaurants</span>
            </button>

            <button
              onClick={() => { setActiveTab('clients'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'clients' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Users size={14} className={activeTab === 'clients' ? 'text-[#FF5C00]' : ''} />
              <span>4. Clients</span>
            </button>

            <button
              onClick={() => { setActiveTab('delivery'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'delivery' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Truck size={14} className={activeTab === 'delivery' ? 'text-[#FF5C00]' : ''} />
              <span>5. Livreurs</span>
            </button>

            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest px-3 pt-4 mb-2 font-mono">MARKETING & TARIFS</p>

            <button
              onClick={() => { setActiveTab('promotions'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'promotions' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Tag size={14} className={activeTab === 'promotions' ? 'text-[#FF5C00]' : ''} />
              <span>6. Codes Promos</span>
            </button>

            <button
              onClick={() => { setActiveTab('showcase'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'showcase' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Sliders size={14} className={activeTab === 'showcase' ? 'text-[#FF5C00]' : ''} />
              <span>7. Mise en Avant & Tarifs</span>
            </button>

            <button
              onClick={() => { setActiveTab('formulas'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'formulas' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Sliders size={14} className={activeTab === 'formulas' ? 'text-[#FF5C00]' : ''} />
              <span>8. Formules & Abonnements</span>
            </button>

            <button
              onClick={() => { setActiveTab('applications'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'applications' 
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Store size={14} className={activeTab === 'applications' ? 'text-emerald-400' : ''} />
              <span className="flex-1 text-left">👨‍🍳 Candidatures Vendeurs</span>
              {merchantApps.filter(a => a.status === 'pending').length > 0 && (
                <span className="bg-[#FF5C00] text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {merchantApps.filter(a => a.status === 'pending').length}
                </span>
              )}
            </button>

            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest px-3 pt-4 mb-2 font-mono">SOCIAL & ENGAGEMENT</p>

            <button
              onClick={() => { setActiveTab('interactions'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'interactions' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Heart size={14} className={activeTab === 'interactions' ? 'text-[#FF5C00]' : ''} />
              <span>8. Likes, Views & Coms</span>
            </button>

            <button
              onClick={() => { setActiveTab('leader'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'leader' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Crown size={14} className={activeTab === 'leader' ? 'text-[#FF5C00]' : ''} />
              <span>9. Leaderboard</span>
            </button>

            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest px-3 pt-4 mb-2 font-mono">SYSTÈME & DONNÉES</p>

            <button
              onClick={() => { setActiveTab('diagnostics'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'diagnostics' 
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:text-white'
              }`}
            >
              <AlertCircle size={14} className={activeTab === 'diagnostics' ? 'text-amber-400 animate-pulse' : 'text-amber-500'} />
              <span className="flex-1 text-left">⚡ Diagnostic & Incidents</span>
              {supportTickets.filter(t => t.status === 'open').length > 0 && (
                <span className="bg-red-500 text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {supportTickets.filter(t => t.status === 'open').length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('djs_shows'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'djs_shows' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Headphones size={14} className={activeTab === 'djs_shows' ? 'text-[#FF5C00]' : ''} />
              <span className="flex-1 text-left">🎧 DJs, Émissions & YouTubers</span>
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {djSessionsList.length + culinaryShowsList.length + foodYouTubersList.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('popups'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'popups' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Sparkles size={14} className={activeTab === 'popups' ? 'text-[#FF5C00]' : ''} />
              <span className="flex-1 text-left">📣 Pop-ups Promos</span>
              {popupsList.filter(p => p.active).length > 0 && (
                <span className="bg-[#FF5C00] text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {popupsList.filter(p => p.active).length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('media'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'media' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <FileImage size={14} className={activeTab === 'media' ? 'text-[#FF5C00]' : ''} />
              <span>📁 Espace Média</span>
            </button>

            <button
              onClick={() => { setActiveTab('backup'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'backup' 
                  ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-white shadow-[0_0_12px_rgba(255,92,0,0.1)]' 
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <RefreshCw size={14} className={activeTab === 'backup' ? 'text-[#FF5C00]' : ''} />
              <span>💾 Sauvegardes</span>
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-6 border-t border-white/5 bg-zinc-950/40 text-[10px] text-zinc-500 font-mono">
          <p>STABLE RUN v2.8</p>
          <p className="mt-1 text-green-500">🟢 Firebase Connected</p>
        </div>
      </aside>

      {/* Main CMS Display area */}
      <main className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Dynamic CMS Header */}
        <header className="px-4 md:px-8 py-4 md:py-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#070708]">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-zinc-800 shrink-0"
              title="Ouvrir le menu"
            >
              <Menu size={18} />
            </button>

            <h2 className="text-xs md:text-xl font-extrabold text-white tracking-tight flex items-center gap-2 truncate">
              {activeTab === 'design' && (
                <span className="flex items-center gap-2">
                  <span>🎨 Branding & Design Studio</span>
                  <span className="text-xs font-semibold text-zinc-400 hidden lg:inline font-mono">
                    [{designSubTab === 'logos' ? 'Logos & Identité' : designSubTab === 'header_nav' ? 'Header & Nav' : designSubTab === 'theme_colors' ? 'Thèmes & Couleurs' : designSubTab === 'splash_login' ? 'Splash & Connexion' : designSubTab === 'widgets_ads' ? 'Annonces & Widgets' : 'Vue Complète'}]
                  </span>
                </span>
              )}
              {activeTab === 'accueil' && '🏡 Page d\'Accueil (Configuration Complète)'}
              {activeTab === 'layout_builder' && '🛠️ Layout, Header & Nav Builder (Elementor Super-Admin)'}
              {activeTab === 'orders' && '📦 Commandes & Commission Splits'}
              {activeTab === 'restaurants' && '🏪 Restaurants Partenaires'}
              {activeTab === 'clients' && '👥 Utilisateurs & Sécurité'}
              {activeTab === 'delivery' && '🛵 Flotte de Livrateurs'}
              {activeTab === 'promotions' && '🎟️ Codes Promos'}
              {activeTab === 'showcase' && '📈 Placement Premium & Tarifs'}
              {activeTab === 'formulas' && '💳 Formules & Abonnements'}
              {activeTab === 'interactions' && '💬 Likes, Vues & Coms'}
              {activeTab === 'leader' && '👑 Leaderboard du Mois'}
              {activeTab === 'media' && '📁 Espace Média & Gestionnaire de Dossiers'}
              {activeTab === 'popups' && '📣 Pop-ups Promos & Recommandations (DJs, Chaînes Culinaires & YouTubers Food)'}
              {activeTab === 'backup' && '💾 Historique de Sauvegarde & Restauration'}
              {activeTab === 'applications' && '👨‍🍳 Candidatures Vendeurs & Partenaires (3 Niveaux)'}
            </h2>
            <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-400 hidden sm:inline-block">
              {activeTab}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Home / Return to Homepage Button */}
            <button
              onClick={onClose}
              className="bg-[#FF5C00] hover:bg-[#FF3E00] text-white px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg shadow-[#FF5C00]/25 transition-all cursor-pointer shrink-0 active:scale-95"
              title="Retourner à la page d'accueil"
            >
              <Home size={15} />
              <span>Retour à l'accueil</span>
            </button>
          </div>
        </header>

        {/* Content Box */}
        <section className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#050505]">
          
          {/* LAYOUT & HEADER BUILDER TAB */}
          {activeTab === 'layout_builder' && (
            <HeaderAndNavBuilder
              designSettings={designSettings}
              onUpdateDesignSettings={onUpdateDesignSettings}
              onSaveDesignSettings={onSaveDesignSettings}
            />
          )}

          {/* 1. BRANDING & DESIGN TAB */}
          {activeTab === 'design' && (
            <div className="max-w-5xl space-y-6 pb-12">
              
              {/* Sticky Prominent Save Bar */}
              <div className="sticky top-0 z-30 bg-[#0A0A0C]/95 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/15 border border-[#FF5C00]/30 flex items-center justify-center text-[#FF5C00] shadow-[0_0_15px_rgba(255,92,0,0.15)] shrink-0">
                    <Palette size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Studio Branding & Design</h3>
                      {saveSuccess && (
                        <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 animate-pulse">
                          <Check size={11} /> Sauvegardé !
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans">
                      Gestionnaire unifié des logos, de la navigation, des couleurs et des widgets.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Auto-Save Toggle */}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-white/5 cursor-pointer text-xs select-none hover:bg-zinc-900 transition-colors">
                    <input 
                      type="checkbox"
                      checked={!!designSettings.autoSaveEnabled}
                      onChange={(e) => onUpdateDesignSettings({ autoSaveEnabled: e.target.checked })}
                      className="rounded text-[#FF5C00] accent-[#FF5C00] w-4 h-4 bg-zinc-900 border-white/10 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="text-[10px] font-extrabold text-white block leading-tight">Auto-save</span>
                      <span className={`text-[8.5px] font-mono font-bold ${designSettings.autoSaveEnabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {designSettings.autoSaveEnabled ? 'ACTIF ⚡' : 'MANUEL'}
                      </span>
                    </div>
                  </label>

                  {/* Prominent Save Button */}
                  <button
                    type="button"
                    disabled={isSavingDesign}
                    onClick={handleManualSave}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg ${
                      saveSuccess 
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' 
                        : 'bg-gradient-to-r from-[#FF5C00] to-orange-600 hover:from-[#FF7A00] hover:to-orange-500 text-white shadow-[0_4px_20px_rgba(255,92,0,0.3)] border border-white/10'
                    }`}
                  >
                    {isSavingDesign ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enregistrement...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check size={15} />
                        Enregistré !
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        Enregistrer le Design
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sub-Tab Navigation Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-white/5">
                {[
                  { id: 'logos', label: '1. Identité & Logos', icon: '🖼️' },
                  { id: 'header_nav', label: '2. Header & Navigation', icon: '🛠️' },
                  { id: 'theme_colors', label: '3. Thèmes & Couleurs', icon: '🎨' },
                  { id: 'splash_login', label: '4. Splash & Connexion', icon: '🚀' },
                  { id: 'widgets_ads', label: '5. Annonces & Widgets', icon: '📢' },
                  { id: 'all', label: '📋 Vue Complète', icon: '📋' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDesignSubTab(tab.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                      designSubTab === tab.id
                        ? 'bg-[#FF5C00] text-white border-[#FF5C00] font-black shadow-[0_0_15px_rgba(255,92,0,0.25)] scale-[1.02]'
                        : 'bg-zinc-950/80 text-zinc-400 hover:text-white hover:bg-zinc-900 border-white/5'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* SUB-TAB 1: IDENTITÉ & LOGOS */}
              {(designSubTab === 'logos' || designSubTab === 'all') && (
                <div className="space-y-6">
                  {/* Section A: Identité Visuelle & Logo */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders size={16} className="text-[#FF5C00]" />
                    1. Identité Visuelle & Logos de la Marque
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Configurez le nom de votre plateforme de commande vidéo et téléchargez votre logo personnalisé.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Nom de la Plateforme</label>
                      <input 
                        type="text" 
                        value={designSettings.appName || ''}
                        onChange={(e) => onUpdateDesignSettings({ appName: e.target.value })}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        placeholder="FIDFUD"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">URL du logo (Optionnel)</label>
                      <input 
                        type="text" 
                        value={designSettings.logoUrl || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          onUpdateDesignSettings({ 
                            logoUrl: val,
                            headerConfig: {
                              ...(designSettings.headerConfig || {}),
                              logoUrl: val
                            }
                          });
                        }}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>

                  {/* Drag & Drop Upload Area */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Glisser-déposer le Logo d'icône personnalisé</label>
                    <div 
                      onDragEnter={(e) => { e.preventDefault(); setLogoDragActive(true); }}
                      onDragOver={(e) => { e.preventDefault(); setLogoDragActive(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setLogoDragActive(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setLogoDragActive(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleLogoUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-4 text-center transition-all cursor-pointer relative ${
                        logoDragActive 
                          ? 'border-[#FF5C00] bg-[#FF5C00]/5' 
                          : 'border-white/10 bg-zinc-950 hover:border-white/20'
                      }`}
                    >
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleLogoUpload(e.target.files[0]);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {designSettings.logoUrl ? (
                        <div className="flex flex-col items-center gap-2">
                          <img 
                            src={designSettings.logoUrl} 
                            alt="Logo custom" 
                            className="w-12 h-12 object-contain rounded-lg border border-white/10 p-1 bg-black/50"
                          />
                          <p className="text-[10px] text-zinc-400 font-medium">Logo actif. Cliquez pour remplacer.</p>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateDesignSettings({ logoUrl: '' });
                            }}
                            className="text-[9px] text-red-500 hover:underline font-bold"
                          >
                            Supprimer le logo
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload size={20} className="text-zinc-500 mb-2" />
                          <p className="text-xs text-zinc-300 font-bold">Déposez votre logo ici ou cliquez</p>
                          <p className="text-[9px] text-zinc-500 mt-1">Formats supportés : PNG, JPG, WEBP (max 2Mo)</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 1B: DEUXIÈME LOGO / TEXTE VERTICAL / SECONDAIRE */}
                <div className="pt-5 border-t border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF5C00]" />
                        2. Deuxième Logo à côté (Texte Vertical ou Image)
                      </h4>
                      <p className="text-[10px] text-zinc-400">
                        Ajoutez un second logo avec du texte vertical ou une 2ème icône juste à côté du logo principal.
                      </p>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={designSettings.showSecondaryLogo ?? true}
                        onChange={(e) => {
                          const val = e.target.checked;
                          onUpdateDesignSettings({
                            showSecondaryLogo: val,
                            headerConfig: {
                              ...(designSettings.headerConfig || {}),
                              showSecondaryLogo: val
                            }
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF5C00]"></div>
                    </label>
                  </div>

                  {(designSettings.showSecondaryLogo ?? true) && (
                    <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 space-y-4">
                      {/* Type Selector */}
                      <div className="space-y-2">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Format du 2ème Logo</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[
                            { id: 'vertical_text', label: '🅰️ Texte Vertical', desc: 'Lettres empilées (ex: S-T-U-D-I-O)' },
                            { id: 'image', label: '🖼️ Deuxième Image', desc: 'Icône ou logo secondaire' },
                            { id: 'badge', label: '🏷️ Badge Horizontal', desc: 'Pilule de texte slogan' }
                          ].map(type => (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => {
                                onUpdateDesignSettings({
                                  secondaryLogoType: type.id as any,
                                  headerConfig: {
                                    ...(designSettings.headerConfig || {}),
                                    secondaryLogoType: type.id as any
                                  }
                                });
                              }}
                              className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                                (designSettings.secondaryLogoType || 'vertical_text') === type.id
                                  ? 'bg-[#FF5C00]/15 border-[#FF5C00] text-white'
                                  : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                              }`}
                            >
                              <div className="text-xs font-bold">{type.label}</div>
                              <div className="text-[9px] text-zinc-500 mt-0.5">{type.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Input for Vertical Text / Badge */}
                      {((designSettings.secondaryLogoType || 'vertical_text') === 'vertical_text' || (designSettings.secondaryLogoType) === 'badge') && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Texte du 2ème Logo</label>
                          <input
                            type="text"
                            value={designSettings.secondaryLogoText ?? 'STUDIO'}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              onUpdateDesignSettings({
                                secondaryLogoText: val,
                                headerConfig: {
                                  ...(designSettings.headerConfig || {}),
                                  secondaryLogoText: val
                                }
                              });
                            }}
                            placeholder="EX: STUDIO, PRO, VIP, FOOD"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-[#FF5C00]"
                          />
                          <p className="text-[9px] text-zinc-500">
                            Chaque lettre sera alignée verticalement juste à côté du logo principal.
                          </p>
                        </div>
                      )}

                      {/* Input / Drag & Drop for 2nd Logo Image */}
                      {(designSettings.secondaryLogoType) === 'image' && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">URL de la 2ème Image</label>
                            <input
                              type="text"
                              value={designSettings.secondaryLogoUrl || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                onUpdateDesignSettings({
                                  secondaryLogoUrl: val,
                                  headerConfig: {
                                    ...(designSettings.headerConfig || {}),
                                    secondaryLogoUrl: val
                                  }
                                });
                              }}
                              placeholder="https://example.com/logo2.png"
                              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                            />
                          </div>

                          <div
                            onDragEnter={(e) => { e.preventDefault(); setSecondaryLogoDragActive(true); }}
                            onDragOver={(e) => { e.preventDefault(); setSecondaryLogoDragActive(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setSecondaryLogoDragActive(false); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              setSecondaryLogoDragActive(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleSecondaryLogoUpload(e.dataTransfer.files[0]);
                              }
                            }}
                            className={`h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center transition-all cursor-pointer relative ${
                              secondaryLogoDragActive 
                                ? 'border-[#FF5C00] bg-[#FF5C00]/5' 
                                : 'border-white/10 bg-zinc-900 hover:border-white/20'
                            }`}
                          >
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleSecondaryLogoUpload(e.target.files[0]);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {designSettings.secondaryLogoUrl ? (
                              <div className="flex flex-col items-center gap-1.5">
                                <img 
                                  src={designSettings.secondaryLogoUrl} 
                                  alt="2nd Logo" 
                                  className="w-10 h-10 object-contain rounded-lg border border-white/10 p-1 bg-black/50"
                                />
                                <p className="text-[10px] text-zinc-400 font-medium">2ème logo actif. Cliquez pour remplacer.</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <Upload size={18} className="text-zinc-500 mb-1" />
                                <p className="text-xs text-zinc-300 font-bold">Glissez ou cliquez pour le 2ème logo</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Live Side-by-Side Preview */}
                      <div className="p-3 bg-black/60 rounded-xl border border-white/10 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Aperçu direct du Header :</span>
                        <div className="flex items-center space-x-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-white/10">
                          {designSettings.logoUrl ? (
                            <img src={designSettings.logoUrl} alt="Logo 1" className="h-8 object-contain rounded-lg" />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-[#FF5C00] flex items-center justify-center text-xs font-black text-white">🍳</div>
                          )}

                          {/* Secondary Logo */}
                          <div className="flex items-center pl-2 border-l border-white/20 ml-1">
                            {(designSettings.secondaryLogoType) === 'image' && designSettings.secondaryLogoUrl ? (
                              <img src={designSettings.secondaryLogoUrl} alt="Logo 2" className="h-7 object-contain rounded-md" />
                            ) : (designSettings.secondaryLogoType) === 'badge' ? (
                              <span className="bg-[#FF5C00]/20 text-[#FF5C00] border border-[#FF5C00]/40 px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono">
                                {designSettings.secondaryLogoText || 'PRO'}
                              </span>
                            ) : (
                              <div className="flex flex-col justify-center text-[7px] font-black uppercase tracking-widest leading-[0.9] text-[#FF5C00] font-mono select-none px-1 py-0.5 bg-black/60 rounded border border-[#FF5C00]/30">
                                {(designSettings.secondaryLogoText || 'STUDIO').split('').map((char, idx) => (
                                  <span key={idx} className="block text-center">{char}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          <span className="font-black text-white text-xs italic">{designSettings.appName || 'FIDFUD'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preset Vector / Foodie Emojis Fallbacks */}
                <div className="space-y-2 pt-2 border-t border-white/2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Ou choisissez un logo thématique prédéfini</label>
                    <button
                      type="button"
                      onClick={() => setShowAddThemeForm(!showAddThemeForm)}
                      className="text-[10px] text-[#FF5C00] hover:underline font-extrabold flex items-center gap-1 cursor-pointer bg-[#FF5C00]/5 px-2.5 py-1 rounded-lg border border-[#FF5C00]/10"
                    >
                      <Plus size={10} /> Ajouter un thème
                    </button>
                  </div>

                  {showAddThemeForm && (
                    <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 space-y-3.5 max-w-lg">
                      <p className="text-[10px] font-black text-white uppercase tracking-wider">Nouveau Thème Personnalisé</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] text-zinc-500 font-bold uppercase block">Nom du Thème</label>
                          <input
                            type="text"
                            value={newThemeName}
                            onChange={e => setNewThemeName(e.target.value)}
                            placeholder="Ex: Tacos Loco"
                            className="w-full bg-zinc-900 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] text-zinc-500 font-bold uppercase block">Émoji / Icône</label>
                          <select
                            value={newThemeEmoji}
                            onChange={e => setNewThemeEmoji(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="🍕">🍕 Pizza</option>
                            <option value="🍔">🍔 Burger</option>
                            <option value="🍣">🍣 Sushi</option>
                            <option value="🌮">🌮 Tacos</option>
                            <option value="🍦">🍦 Glace</option>
                            <option value="🍩">🍩 Donuts</option>
                            <option value="☕">☕ Café</option>
                            <option value="🍹">🍹 Cocktail</option>
                            <option value="🥩">🥩 Viande</option>
                            <option value="🥗">🥗 Salade</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] text-zinc-500 font-bold uppercase block">Couleur Accent</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={newThemeColor}
                              onChange={e => setNewThemeColor(e.target.value)}
                              className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={newThemeColor}
                              onChange={e => setNewThemeColor(e.target.value)}
                              className="w-full bg-zinc-900 border border-white/5 rounded-lg px-2 text-[10px] text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddThemeForm(false)}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 rounded-lg text-[10px] font-bold text-zinc-400"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          disabled={!newThemeName.trim()}
                          onClick={() => {
                            const customThemes = designSettings.customLogoThemes || [];
                            const newThemeObj = {
                              name: `${newThemeName} ${newThemeEmoji}`,
                              logo: '',
                              emoji: newThemeEmoji,
                              color: newThemeColor
                            };
                            onUpdateDesignSettings({
                              customLogoThemes: [...customThemes, newThemeObj]
                            });
                            setNewThemeName('');
                            setShowAddThemeForm(false);
                            alert(`Thème "${newThemeObj.name}" ajouté avec succès !`);
                          }}
                          className="px-3 py-1.5 bg-[#FF5C00] hover:bg-[#FF7A00] text-white rounded-lg text-[10px] font-black uppercase"
                        >
                          Ajouter la Thématique
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { name: 'Artisan Pizza 🍕', logo: '', emoji: '🍕', color: '#EF4444' },
                      { name: 'Gourmet Burger 🍔', logo: '', emoji: '🍔', color: '#F59E0B' },
                      { name: 'Tokyo Sushi 🍣', logo: '', emoji: '🍣', color: '#10B981' },
                      { name: 'Ramen Bowl 🍜', logo: '', emoji: '🍜', color: '#EC4899' },
                      { name: 'Chef Hat 🍳', logo: '', emoji: '🍳', color: '#6366F1' },
                      { name: 'Eco Avocado 🥑', logo: '', emoji: '🥑', color: '#84CC16' },
                      { name: 'Fine Wine 🍷', logo: '', emoji: '🍷', color: '#B91C1C' },
                      { name: 'Sweet Bakery 🍰', logo: '', emoji: '🍰', color: '#F472B6' },
                      ...(designSettings.customLogoThemes || [])
                    ].map((preset, index) => (
                      <button
                        key={`${preset.name}-${index}`}
                        type="button"
                        onClick={() => {
                          onUpdateDesignSettings({ 
                            logoUrl: '', 
                            appName: preset.name.split(' ')[0].toUpperCase(),
                            accentColor: preset.color
                          });
                          alert(`Logo mis à jour : Thème ${preset.name} sélectionné !`);
                        }}
                        className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-white/5 hover:border-white/10 transition-all text-left flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{preset.emoji}</span>
                          <span className="text-[10px] text-zinc-300 font-bold font-sans truncate">{preset.name}</span>
                        </div>
                        {index >= 8 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentThemes = designSettings.customLogoThemes || [];
                              onUpdateDesignSettings({
                                customLogoThemes: currentThemes.filter((_, idx) => idx !== (index - 8))
                              });
                            }}
                            className="text-red-500 hover:text-red-400 font-bold text-xs px-1 hover:scale-110 transition-transform shrink-0"
                            title="Supprimer ce thème"
                          >
                            ×
                          </button>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sizing & Persistence Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                  {/* Sizing Sliders */}
                  <div className="space-y-4">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                      Ajustement de la taille du logo par écran (px)
                    </label>
                    
                    <div className="space-y-3">
                      {/* Mobile Slider */}
                      <div className="bg-zinc-950 p-3 rounded-xl border border-white/2">
                        <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
                          <span className="font-medium text-[11px]">Smartphone / Mobile</span>
                          <span className="font-mono text-[#FF5C00] font-black">{designSettings.logoSizeMobile || 34}px</span>
                        </div>
                        <input 
                          type="range"
                          min="20"
                          max="100"
                          value={designSettings.logoSizeMobile || 34}
                          onChange={(e) => onUpdateDesignSettings({ logoSizeMobile: parseInt(e.target.value) })}
                          className="w-full accent-[#FF5C00] bg-zinc-900 rounded-lg appearance-none h-1.5 cursor-pointer"
                        />
                      </div>

                      {/* Tablet Slider */}
                      <div className="bg-zinc-950 p-3 rounded-xl border border-white/2">
                        <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
                          <span className="font-medium text-[11px]">Tablette (Écran moyen)</span>
                          <span className="font-mono text-[#FF5C00] font-black">{designSettings.logoSizeTablet || 40}px</span>
                        </div>
                        <input 
                          type="range"
                          min="24"
                          max="120"
                          value={designSettings.logoSizeTablet || 40}
                          onChange={(e) => onUpdateDesignSettings({ logoSizeTablet: parseInt(e.target.value) })}
                          className="w-full accent-[#FF5C00] bg-zinc-900 rounded-lg appearance-none h-1.5 cursor-pointer"
                        />
                      </div>

                      {/* Desktop Slider */}
                      <div className="bg-zinc-950 p-3 rounded-xl border border-white/2">
                        <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
                          <span className="font-medium text-[11px]">Ordinateur (Grand écran)</span>
                          <span className="font-mono text-[#FF5C00] font-black">{designSettings.logoSizeDesktop || 48}px</span>
                        </div>
                        <input 
                          type="range"
                          min="30"
                          max="150"
                          value={designSettings.logoSizeDesktop || 48}
                          onChange={(e) => onUpdateDesignSettings({ logoSizeDesktop: parseInt(e.target.value) })}
                          className="w-full accent-[#FF5C00] bg-zinc-900 rounded-lg appearance-none h-1.5 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Auto-save vs Manual Save Controls */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">
                        Sauvegarde de vos modifications
                      </label>
                      <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed font-sans">
                        Activez la sauvegarde automatique pour pousser instantanément chaque modification de design sur le serveur en temps réel, ou utilisez le bouton de sauvegarde manuelle.
                      </p>

                      {/* Auto Save Toggle */}
                      <label className="flex items-center gap-3 p-3.5 bg-zinc-950 hover:bg-zinc-900 border border-white/5 rounded-xl cursor-pointer transition-all select-none">
                        <input 
                          type="checkbox"
                          checked={!!designSettings.autoSaveEnabled}
                          onChange={(e) => onUpdateDesignSettings({ autoSaveEnabled: e.target.checked })}
                          className="rounded text-[#FF5C00] accent-[#FF5C00] w-4.5 h-4.5 bg-zinc-900 border-white/10"
                        />
                        <div className="text-left">
                          <p className="text-xs text-white font-black">Sauvegarde Automatique</p>
                          <p className="text-[9.5px] text-zinc-500 font-sans font-medium">Pousse automatiquement les modifications au cloud</p>
                        </div>
                      </label>
                    </div>

                    {/* Manual Save Button */}
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        disabled={isSavingDesign || designSettings.autoSaveEnabled}
                        onClick={handleManualSave}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${
                          designSettings.autoSaveEnabled
                            ? 'bg-zinc-900/40 border border-white/2 text-zinc-600 cursor-not-allowed'
                            : isSavingDesign
                              ? 'bg-zinc-850 text-zinc-400 cursor-wait'
                              : 'bg-gradient-to-r from-[#FF5C00] to-orange-600 hover:from-[#FF7A00] hover:to-orange-500 text-white shadow-md shadow-orange-950/20 cursor-pointer border border-white/10'
                        }`}
                      >
                        {isSavingDesign ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-[#FF5C00]/30 border-t-[#FF5C00] rounded-full animate-spin" />
                            Enregistrement...
                          </>
                        ) : designSettings.autoSaveEnabled ? (
                          'Sauvegarde auto activée'
                        ) : (
                          'Enregistrer le design'
                        )}
                      </button>
                      
                      {saveSuccess && (
                        <span className="text-[10px] text-emerald-500 font-bold font-mono animate-bounce shrink-0">
                          ✓ Enregistré !
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </div>
              )}

              {/* SUB-TAB 2: HEADER & NAVIGATION BUILDER */}
              {(designSubTab === 'header_nav' || designSubTab === 'all') && (
                <div className="space-y-6">
                  <HeaderAndNavBuilder
                    designSettings={designSettings}
                    onUpdateDesignSettings={onUpdateDesignSettings}
                    onSaveDesignSettings={onSaveDesignSettings}
                  />
                </div>
              )}

              {/* SUB-TAB 4: SPLASH & CONNEXION */}
              {(designSubTab === 'splash_login' || designSubTab === 'all') && (
                <div className="space-y-6">
                  {/* Section A.2: Page d'Intro Splash & Page de Connexion */}
                  <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders size={16} className="text-[#FF5C00]" />
                    Page d'Intro (Splash) & Page de Connexion
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Personnalisez le comportement et l'esthétique de la toute première page d'accueil (Splash d'animation) et de la page de connexion de vos utilisateurs.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* COORDONNÉES DE LA PAGE D'INTRO (SPLASH) */}
                  <div className="space-y-4 border-r border-white/5 pr-0 md:pr-6">
                    <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00]" />
                      1. Animation d'Introduction (Splash)
                    </h4>

                    {/* Enable Splash Option */}
                    <div className="flex items-center justify-between bg-zinc-950/60 p-3.5 rounded-2xl border border-white/2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">Activer le Splash d'intro</span>
                        <span className="text-[9px] text-zinc-500">Afficher l'animation à l'ouverture de l'application</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={designSettings.enableSplash !== false}
                          onChange={(e) => onUpdateDesignSettings({ enableSplash: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white"></div>
                      </label>
                    </div>

                    {/* Splash Title */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Titre du Splash</label>
                      <input 
                        type="text" 
                        value={designSettings.splashTitle || ''} 
                        onChange={(e) => onUpdateDesignSettings({ splashTitle: e.target.value })}
                        placeholder="Ex: Fitfood (Laissez vide pour le style par défaut)" 
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50"
                      />
                    </div>

                    {/* Splash Subtitle */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Sous-titre du Splash</label>
                      <input 
                        type="text" 
                        value={designSettings.splashSubtitle || ''} 
                        onChange={(e) => onUpdateDesignSettings({ splashSubtitle: e.target.value })}
                        placeholder="Ex: Virtual Photo Studio & Gourmet Hub" 
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50"
                      />
                    </div>

                    {/* Splash Loading text */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Texte de Chargement (Bas de page)</label>
                      <input 
                        type="text" 
                        value={designSettings.splashCustomText || ''} 
                        onChange={(e) => onUpdateDesignSettings({ splashCustomText: e.target.value })}
                        placeholder="Ex: Chargement de la galerie vidéo..." 
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50"
                      />
                    </div>

                    {/* Splash Duration & Colors */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Durée (sec)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          min="0.5"
                          max="10"
                          value={designSettings.splashDuration || '2.8'} 
                          onChange={(e) => onUpdateDesignSettings({ splashDuration: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Glow 1 (Primaire)</label>
                        <div className="flex items-center gap-1.5 bg-zinc-950 border border-white/5 rounded-xl p-1.5">
                          <input 
                            type="color" 
                            value={designSettings.splashGlowColor1 || '#FF5C00'} 
                            onChange={(e) => onUpdateDesignSettings({ splashGlowColor1: e.target.value })}
                            className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer shrink-0"
                          />
                          <span className="text-[9px] text-zinc-400 font-mono select-all truncate">
                            {designSettings.splashGlowColor1 || '#FF5C00'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Glow 2 (Secondaire)</label>
                        <div className="flex items-center gap-1.5 bg-zinc-950 border border-white/5 rounded-xl p-1.5">
                          <input 
                            type="color" 
                            value={designSettings.splashGlowColor2 || '#10B981'} 
                            onChange={(e) => onUpdateDesignSettings({ splashGlowColor2: e.target.value })}
                            className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer shrink-0"
                          />
                          <span className="text-[9px] text-zinc-400 font-mono select-all truncate">
                            {designSettings.splashGlowColor2 || '#10B981'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Splash custom Logo Upload */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans flex items-center justify-between">
                        <span>Logo du Splash personnalisé</span>
                        {designSettings.splashLogoUrl && (
                          <button 
                            type="button" 
                            onClick={() => onUpdateDesignSettings({ splashLogoUrl: '' })}
                            className="text-[9px] text-red-500 hover:underline flex items-center gap-1"
                          >
                            <Trash2 size={10} /> Réinitialiser
                          </button>
                        )}
                      </label>
                      <div className="flex items-center gap-3 bg-zinc-950/40 p-3 rounded-2xl border border-dashed border-white/10">
                        <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                          {designSettings.splashLogoUrl ? (
                            <img src={designSettings.splashLogoUrl} alt="Splash Custom Logo" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-[9px] text-zinc-600 uppercase font-black tracking-tighter">Par défaut</div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <span className="text-[10px] text-zinc-400 font-bold">Importez votre propre logo (PNG, JPG, WEBP)</span>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleSplashLogoUpload(e.target.files[0]);
                              }
                            }}
                            className="text-[9px] text-zinc-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9px] file:font-bold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COORDONNÉES DE LA PAGE DE CONNEXION */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00]" />
                      2. Design de la Page de Connexion
                    </h4>

                    {/* Enable Google Sign In Option */}
                    <div className="flex items-center justify-between bg-zinc-950/60 p-3.5 rounded-2xl border border-white/2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">Connexion Google</span>
                        <span className="text-[9px] text-zinc-500">Afficher l'option de connexion Google</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={designSettings.loginShowGoogle !== false}
                          onChange={(e) => onUpdateDesignSettings({ loginShowGoogle: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white"></div>
                      </label>
                    </div>

                    {/* Login Title */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Titre Personnalisé</label>
                      <input 
                        type="text" 
                        value={designSettings.loginTitle || ''} 
                        onChange={(e) => onUpdateDesignSettings({ loginTitle: e.target.value })}
                        placeholder="Ex: Connexion (Laissez vide pour par défaut)" 
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50"
                      />
                    </div>

                    {/* Login Subtitle */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Sous-titre de Connexion</label>
                      <input 
                        type="text" 
                        value={designSettings.loginSubtitle || ''} 
                        onChange={(e) => onUpdateDesignSettings({ loginSubtitle: e.target.value })}
                        placeholder="Ex: Accédez à vos commandes et favoris gourmands." 
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50"
                      />
                    </div>

                    {/* Custom Background Color & Accent color */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Fond du Formulaire</label>
                        <div className="flex items-center gap-1.5 bg-zinc-950 border border-white/5 rounded-xl p-1.5">
                          <input 
                            type="color" 
                            value={designSettings.loginBgColor || '#0D0D0E'} 
                            onChange={(e) => onUpdateDesignSettings({ loginBgColor: e.target.value })}
                            className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer shrink-0"
                          />
                          <span className="text-[9px] text-zinc-400 font-mono select-all truncate">
                            {designSettings.loginBgColor || '#0D0D0E'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Boutons & Accents</label>
                        <div className="flex items-center gap-1.5 bg-zinc-950 border border-white/5 rounded-xl p-1.5">
                          <input 
                            type="color" 
                            value={designSettings.loginAccentColor || '#FF5C00'} 
                            onChange={(e) => onUpdateDesignSettings({ loginAccentColor: e.target.value })}
                            className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer shrink-0"
                          />
                          <span className="text-[9px] text-zinc-400 font-mono select-all truncate">
                            {designSettings.loginAccentColor || '#FF5C00'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Custom image background and custom logo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Login Bg image upload */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans flex items-center justify-between">
                          <span>Image de fond</span>
                          {designSettings.loginBgImage && (
                            <button 
                              type="button" 
                              onClick={() => onUpdateDesignSettings({ loginBgImage: '' })}
                              className="text-[9px] text-red-500 hover:underline"
                            >
                              Reset
                            </button>
                          )}
                        </label>
                        <div className="flex items-center gap-2 bg-zinc-950/40 p-2.5 rounded-xl border border-dashed border-white/10">
                          <div className="w-8 h-8 rounded bg-zinc-950 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                            {designSettings.loginBgImage ? (
                              <img src={designSettings.loginBgImage} alt="Login Background" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-[8px] text-zinc-600 font-bold">Vide</div>
                            )}
                          </div>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleLoginBgUpload(e.target.files[0]);
                              }
                            }}
                            className="text-[8px] text-zinc-500 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[8px] file:bg-zinc-800 file:text-white cursor-pointer w-full"
                          />
                        </div>
                      </div>

                      {/* Login Logo image upload */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans flex items-center justify-between">
                          <span>Logo personnalisé</span>
                          {designSettings.loginLogoUrl && (
                            <button 
                              type="button" 
                              onClick={() => onUpdateDesignSettings({ loginLogoUrl: '' })}
                              className="text-[9px] text-red-500 hover:underline"
                            >
                              Reset
                            </button>
                          )}
                        </label>
                        <div className="flex items-center gap-2 bg-zinc-950/40 p-2.5 rounded-xl border border-dashed border-white/10">
                          <div className="w-8 h-8 rounded bg-zinc-950 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                            {designSettings.loginLogoUrl ? (
                              <img src={designSettings.loginLogoUrl} alt="Login Custom Logo" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-[8px] text-zinc-600 font-bold">Icone</div>
                            )}
                          </div>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleLoginLogoUpload(e.target.files[0]);
                              }
                            }}
                            className="text-[8px] text-zinc-500 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[8px] file:bg-zinc-800 file:text-white cursor-pointer w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
              )}

              {/* SUB-TAB 3: THÈMES & COULEURS */}
              {(designSubTab === 'theme_colors' || designSubTab === 'all') && (
                <div className="space-y-6">
                  {/* Section B: Thèmes de Couleur & Palettes */}
                  <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-[#FF5C00]" />
                    2. Couleur d’Accent & Palettes Prédéfinies
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Ajustez les codes hexa de votre marque ou appliquez l’une de nos chartes graphiques premium d’un seul clic.
                  </p>
                </div>

                {/* Preset Palettes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { name: 'Hot Chili 🌶️', accent: '#FF5C00', bg: '#050506', text: '#FFFFFF' },
                    { name: 'Royal Gold 👑', accent: '#F59E0B', bg: '#0A0908', text: '#F5F5F4' },
                    { name: 'Cyber Violet 🔮', accent: '#8B5CF6', bg: '#0F0C1B', text: '#EDE9FE' },
                    { name: 'Eco Avocado 🌿', accent: '#10B981', bg: '#060F0E', text: '#ECFDF5' },
                    { name: 'Pure Light ☀', accent: '#FF5C00', bg: '#FAFAFA', text: '#18181B' }
                  ].map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        onUpdateDesignSettings({
                          accentColor: p.accent,
                          backgroundColor: p.bg,
                          textColor: p.text
                        });
                        alert(`Nuancier "${p.name}" appliqué !`);
                      }}
                      className="p-2.5 rounded-xl border border-white/5 hover:border-white/10 text-left space-y-1.5 transition-all cursor-pointer"
                      style={{ backgroundColor: p.bg === '#FAFAFA' ? '#E4E4E7' : '#141416' }}
                    >
                      <span className="text-[10px] font-black uppercase text-zinc-300 block truncate">{p.name}</span>
                      <div className="flex gap-1">
                        <div className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: p.accent }} />
                        <div className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: p.bg }} />
                        <div className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: p.text }} />
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Color Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Accent Principal (Boutons, icônes)</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={designSettings.accentColor || '#FF5C00'}
                        onChange={(e) => onUpdateDesignSettings({ accentColor: e.target.value })}
                        className="w-9 h-9 rounded border-0 bg-transparent cursor-pointer shrink-0"
                      />
                      <input 
                        type="text" 
                        value={designSettings.accentColor || '#FF5C00'}
                        onChange={(e) => onUpdateDesignSettings({ accentColor: e.target.value })}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Couleur d’Arrière-plan (Fond d’écran)</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={designSettings.backgroundColor || '#050506'}
                        onChange={(e) => onUpdateDesignSettings({ backgroundColor: e.target.value })}
                        className="w-9 h-9 rounded border-0 bg-transparent cursor-pointer shrink-0"
                      />
                      <input 
                        type="text" 
                        value={designSettings.backgroundColor || '#050506'}
                        onChange={(e) => onUpdateDesignSettings({ backgroundColor: e.target.value })}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Couleur du Texte (Contrastée)</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={designSettings.textColor || '#FFFFFF'}
                        onChange={(e) => onUpdateDesignSettings({ textColor: e.target.value })}
                        className="w-9 h-9 rounded border-0 bg-transparent cursor-pointer shrink-0"
                      />
                      <input 
                        type="text" 
                        value={designSettings.textColor || '#FFFFFF'}
                        onChange={(e) => onUpdateDesignSettings({ textColor: e.target.value })}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* AI Theme & Style Generator Box */}
                <div className="mt-6 p-4.5 rounded-2xl bg-zinc-950 border border-amber-500/15 space-y-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400">
                      <Sparkles size={15} className="animate-pulse" />
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Génération d'Identité & Thème par IA (Gemini 🤖)</h4>
                      <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Saisissez un concept d’ambiance ou de restaurant pour que l’IA configure automatiquement les couleurs d’accent, le fond d'écran, le slogan et le design parfait !</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text"
                      value={aiThemePrompt}
                      onChange={(e) => setAiThemePrompt(e.target.value)}
                      placeholder="Ex: 'bar à tacos rétro néon rose et noir', 'bistrot parisien chic boisé et or', 'cyber bar à sushi flashy'"
                      className="flex-1 bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      disabled={isGeneratingTheme || !aiThemePrompt.trim()}
                      onClick={handleGenerateAITheme}
                      className="bg-amber-500 hover:bg-amber-450 disabled:bg-zinc-850 disabled:text-zinc-600 text-zinc-950 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 font-sans"
                    >
                      {isGeneratingTheme ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                          Création...
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          Générer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Section B.2: Gestion de l’Arrière-plan Grand Écran & Mobile (Background takeover & Ads) */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <LayoutGrid size={16} className="text-[#FF5C00]" />
                    2.2. Gestionnaire d'Arrière-plan Plein Écran & Publicités (Computers & Mobile) 🖥️📱
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Ajustez l’ambiance de fond ou transformez l'arrière-plan de votre site en <b>habillage publicitaire cliquable (Ad Takeover)</b> ultra-lucratif !
                  </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* COMPUTER / DESKTOP BACKGROUND CONFIG */}
                  <div className="p-4.5 rounded-2xl bg-zinc-950 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        <span>🖥️ Habillage Ordinateur (Desktop)</span>
                      </h4>
                      <span className="text-[9px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-500 font-mono">Largeurs &ge; 1024px</span>
                    </div>

                    {/* Mode selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Type d’arrière-plan PC</label>
                      <select
                        value={designSettings.desktopBgType || 'color'}
                        onChange={(e) => onUpdateDesignSettings({ desktopBgType: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="color">Couleur Solide / Thème 🎨</option>
                        <option value="image">Image personnalisée ou GIF animé 🖼️</option>
                        <option value="video">Vidéo d’ambiance MP4 🎥</option>
                        <option value="ad">Habillage Publicitaire Cliquable (Ad Takeover) 📢</option>
                      </select>
                    </div>

                    {/* Conditional inputs */}
                    {designSettings.desktopBgType === 'color' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Couleur d'arrière-plan PC</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={designSettings.desktopBgColor || '#050506'}
                            onChange={(e) => onUpdateDesignSettings({ desktopBgColor: e.target.value })}
                            className="w-9 h-9 rounded border-0 bg-transparent cursor-pointer shrink-0"
                          />
                          <input 
                            type="text" 
                            value={designSettings.desktopBgColor || '#050506'}
                            onChange={(e) => onUpdateDesignSettings({ desktopBgColor: e.target.value })}
                            className="w-full bg-zinc-905 border border-white/5 rounded-xl px-3.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {(designSettings.desktopBgType === 'image' || designSettings.desktopBgType === 'ad') && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">URL de l’image ou du GIF animé</label>
                          <input 
                            type="text" 
                            value={designSettings.desktopBgImage || ''}
                            onChange={(e) => onUpdateDesignSettings({ desktopBgImage: e.target.value })}
                            placeholder="Ex: https://media.giphy.com/media/.../giphy.gif"
                            className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                          />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onUpdateDesignSettings({ desktopBgImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&auto=format&fit=crop&q=80' })}
                            className="text-[9px] bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white px-2 py-1 rounded border border-white/5 transition-all cursor-pointer font-mono"
                          >
                            Taverne Cosy 🍷
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateDesignSettings({ desktopBgImage: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2k0MHQzbzBhOWxhc2pxczEzbDJzZWszMm40bzNmd2F5amwyMTNyYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LcoK2zRKbQlUs/giphy.gif' })}
                            className="text-[9px] bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white px-2 py-1 rounded border border-white/5 transition-all cursor-pointer font-mono"
                          >
                            Burger Néon GIF 🍔
                          </button>
                        </div>
                      </div>
                    )}

                    {designSettings.desktopBgType === 'video' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">URL de la vidéo MP4 directe</label>
                        <input 
                          type="text" 
                          value={designSettings.desktopBgVideo || ''}
                          onChange={(e) => onUpdateDesignSettings({ desktopBgVideo: e.target.value })}
                          placeholder="Ex: https://.../video.mp4"
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>
                    )}

                    {designSettings.desktopBgType === 'ad' && (
                      <div className="space-y-3 p-3 rounded-xl bg-[#FF5C00]/2 border border-[#FF5C00]/10">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">URL de redirection du Sponsor (Clic sur le fond)</label>
                          <input 
                            type="text" 
                            value={designSettings.desktopBgAdClickUrl || ''}
                            onChange={(e) => onUpdateDesignSettings({ desktopBgAdClickUrl: e.target.value })}
                            placeholder="Ex: https://notresponsor.com/campagne-ete"
                            className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Badge du Sponsor</label>
                          <input 
                            type="text" 
                            value={designSettings.desktopBgAdTitle || ''}
                            onChange={(e) => onUpdateDesignSettings({ desktopBgAdTitle: e.target.value })}
                            placeholder="Ex: Burger King Paris"
                            className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MOBILE & TABLET BACKGROUND CONFIG */}
                  <div className="p-4.5 rounded-2xl bg-zinc-950 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        <span>📱 Habillage Mobile & Tablette</span>
                      </h4>
                      <span className="text-[9px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-500 font-mono">Largeurs &lt; 1024px</span>
                    </div>

                    {/* Mode selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Type d’arrière-plan Mobile</label>
                      <select
                        value={designSettings.mobileBgType || 'color'}
                        onChange={(e) => onUpdateDesignSettings({ mobileBgType: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="color">Couleur Solide / Thème 🎨</option>
                        <option value="image">Image personnalisée ou GIF animé 🖼️</option>
                        <option value="video">Vidéo d’ambiance MP4 🎥</option>
                        <option value="ad">Habillage Publicitaire Cliquable (Ad Takeover) 📢</option>
                      </select>
                    </div>

                    {/* Conditional inputs */}
                    {designSettings.mobileBgType === 'color' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Couleur d'arrière-plan Mobile</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={designSettings.mobileBgColor || '#050506'}
                            onChange={(e) => onUpdateDesignSettings({ mobileBgColor: e.target.value })}
                            className="w-9 h-9 rounded border-0 bg-transparent cursor-pointer shrink-0"
                          />
                          <input 
                            type="text" 
                            value={designSettings.mobileBgColor || '#050506'}
                            onChange={(e) => onUpdateDesignSettings({ mobileBgColor: e.target.value })}
                            className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {(designSettings.mobileBgType === 'image' || designSettings.mobileBgType === 'ad') && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">URL de l’image ou du GIF animé</label>
                          <input 
                            type="text" 
                            value={designSettings.mobileBgImage || ''}
                            onChange={(e) => onUpdateDesignSettings({ mobileBgImage: e.target.value })}
                            placeholder="Ex: https://media.giphy.com/media/.../giphy.gif"
                            className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                          />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onUpdateDesignSettings({ mobileBgImage: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=600&auto=format&fit=crop&q=80' })}
                            className="text-[9px] bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white px-2 py-1 rounded border border-white/5 transition-all cursor-pointer font-mono"
                          >
                            Cocktail Néon 🍸
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateDesignSettings({ mobileBgImage: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdzB0YmVqZHQ3NHd1ZWhnaWN6MDc3bHVtdHVlMXZmdnV3d3p3dnA2diZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/YOnPXj68PH7vP7bJvN/giphy.gif' })}
                            className="text-[9px] bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white px-2 py-1 rounded border border-white/5 transition-all cursor-pointer font-mono"
                          >
                            Sushi GIF 🍣
                          </button>
                        </div>
                      </div>
                    )}

                    {designSettings.mobileBgType === 'video' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">URL de la vidéo MP4 directe</label>
                        <input 
                          type="text" 
                          value={designSettings.mobileBgVideo || ''}
                          onChange={(e) => onUpdateDesignSettings({ mobileBgVideo: e.target.value })}
                          placeholder="Ex: https://.../video.mp4"
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>
                    )}

                    {designSettings.mobileBgType === 'ad' && (
                      <div className="space-y-3 p-3 rounded-xl bg-[#FF5C00]/2 border border-[#FF5C00]/10">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">URL de redirection du Sponsor (Clic sur le fond)</label>
                          <input 
                            type="text" 
                            value={designSettings.mobileBgAdClickUrl || ''}
                            onChange={(e) => onUpdateDesignSettings({ mobileBgAdClickUrl: e.target.value })}
                            placeholder="Ex: https://notresponsor.com/promo-mobile"
                            className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Badge du Sponsor</label>
                          <input 
                            type="text" 
                            value={designSettings.mobileBgAdTitle || ''}
                            onChange={(e) => onUpdateDesignSettings({ mobileBgAdTitle: e.target.value })}
                            placeholder="Ex: Coca Cola Zero"
                            className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Section B.3: Liste des Encartés Publicitaires Actifs & Sponsors */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <LayoutGrid size={16} className="text-[#FF5C00]" />
                      2.3. Liste des Encartés Publicitaires Actifs & Partenaires 📢
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                      Visualisez, ajoutez et gérez les annonceurs partenaires qui financent votre plateforme et s'affichent en habillage média.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddAdvertiserForm(!showAddAdvertiserForm)}
                    className="bg-[#FF5C00]/10 hover:bg-[#FF5C00]/25 text-[#FF5C00] border border-[#FF5C00]/20 text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={12} />
                    Nouveau Sponsor
                  </button>
                </div>

                {showAddAdvertiserForm && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newAdvertiserName.trim()) return;
                      const newAd = {
                        id: `ad-${Date.now()}`,
                        name: newAdvertiserName,
                        url: newAdvertiserUrl || 'https://google.com',
                        budget: newAdvertiserBudget || 1000,
                        banner: newAdvertiserBanner || 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=600',
                        isFeatured: false,
                        isActive: true
                      };
                      const currentAds = designSettings.advertisers || [];
                      onUpdateDesignSettings({
                        advertisers: [...currentAds, newAd]
                      });
                      setNewAdvertiserName('');
                      setNewAdvertiserUrl('');
                      setNewAdvertiserBudget(1000);
                      setNewAdvertiserBanner('');
                      setShowAddAdvertiserForm(false);
                      alert(`Partenaire "${newAd.name}" ajouté avec succès !`);
                    }}
                    className="p-4 bg-zinc-950 rounded-2xl border border-white/5 space-y-4 max-w-2xl"
                  >
                    <p className="text-[10px] font-black text-white uppercase tracking-wider">Ajouter un Sponsor / Annonceur publicitaire</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase">Nom de l'Annonceur</label>
                        <input
                          type="text"
                          required
                          value={newAdvertiserName}
                          onChange={e => setNewAdvertiserName(e.target.value)}
                          placeholder="Ex: Coca Cola Zero"
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase">URL du site de redirection</label>
                        <input
                          type="text"
                          value={newAdvertiserUrl}
                          onChange={e => setNewAdvertiserUrl(e.target.value)}
                          placeholder="Ex: https://coca-cola.fr"
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase">Budget de Campagne (€)</label>
                        <input
                          type="number"
                          value={newAdvertiserBudget}
                          onChange={e => setNewAdvertiserBudget(parseInt(e.target.value) || 0)}
                          placeholder="Budget (ex: 2500)"
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase">Image Bannière / Logo URL</label>
                        <input
                          type="text"
                          value={newAdvertiserBanner}
                          onChange={e => setNewAdvertiserBanner(e.target.value)}
                          placeholder="URL d'image ou logo"
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddAdvertiserForm(false)}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 rounded-xl text-xs font-bold text-zinc-400"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#FF5C00] hover:bg-[#FF7A00] text-white rounded-xl text-xs font-black uppercase tracking-wider"
                      >
                        Enregistrer l'Annonceur
                      </button>
                    </div>
                  </form>
                )}

                {/* Advertiser list grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Current Active PC and Mobile Ads displays */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/10 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] bg-[#FF5C00]/10 border border-[#FF5C00]/20 text-[#FF5C00] font-black px-2 py-0.5 rounded uppercase font-mono">HABILLAGE PC</span>
                        <span className="text-[9px] text-zinc-500 font-mono">Campagne Directe</span>
                      </div>
                      <h4 className="text-xs font-black text-white mt-2 uppercase">{designSettings.desktopBgAdTitle || "Aucun sponsor PC"}</h4>
                      <p className="text-[10px] text-zinc-500 truncate font-mono mt-1">{designSettings.desktopBgAdClickUrl || "Pas d'URL d'action"}</p>
                    </div>
                    <div className="pt-2 border-t border-white/2 mt-3 flex justify-between items-center">
                      <span className="text-[9px] text-emerald-500 font-mono font-bold">Budget: Actif</span>
                      <span className="text-[9.5px] text-zinc-400 font-bold">★ Vedette Principale</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/10 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black px-2 py-0.5 rounded uppercase font-mono">HABILLAGE MOBILE</span>
                        <span className="text-[9px] text-zinc-500 font-mono">Campagne Directe</span>
                      </div>
                      <h4 className="text-xs font-black text-white mt-2 uppercase">{designSettings.mobileBgAdTitle || "Aucun sponsor Mobile"}</h4>
                      <p className="text-[10px] text-zinc-500 truncate font-mono mt-1">{designSettings.mobileBgAdClickUrl || "Pas d'URL d'action"}</p>
                    </div>
                    <div className="pt-2 border-t border-white/2 mt-3 flex justify-between items-center">
                      <span className="text-[9px] text-emerald-500 font-mono font-bold">Budget: Actif</span>
                      <span className="text-[9.5px] text-zinc-400 font-bold">★ Vedette Principale</span>
                    </div>
                  </div>

                  {/* Dynamic advertisers */}
                  {(designSettings.advertisers || [
                    { id: 'ad-1', name: 'Burger King Campaign', url: 'https://burgerking.fr', budget: 5000, banner: '', isFeatured: true, isActive: true },
                    { id: 'ad-2', name: 'Nespresso Premium', url: 'https://nespresso.fr', budget: 2500, banner: '', isFeatured: false, isActive: true }
                  ]).map((ad: any) => (
                    <div key={ad.id} className="p-4 rounded-2xl bg-zinc-950 border border-white/5 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase font-mono ${
                            ad.isFeatured ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500' : 'bg-zinc-900 border border-white/5 text-zinc-400'
                          }`}>
                            {ad.isFeatured ? 'VEDETTE ★' : 'PARTENAIRE'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const currentAds = designSettings.advertisers || [
                                { id: 'ad-1', name: 'Burger King Campaign', url: 'https://burgerking.fr', budget: 5000, banner: '', isFeatured: true, isActive: true },
                                { id: 'ad-2', name: 'Nespresso Premium', url: 'https://nespresso.fr', budget: 2500, banner: '', isFeatured: false, isActive: true }
                              ];
                              onUpdateDesignSettings({
                                advertisers: currentAds.filter((item: any) => item.id !== ad.id)
                              });
                            }}
                            className="text-red-500 hover:text-red-400 text-xs font-bold"
                            title="Supprimer"
                          >
                            ×
                          </button>
                        </div>
                        <h4 className="text-xs font-black text-white mt-2 uppercase truncate">{ad.name}</h4>
                        <p className="text-[10px] text-zinc-500 truncate font-mono mt-0.5">{ad.url}</p>
                      </div>

                      <div className="pt-2 border-t border-white/2 mt-3 flex justify-between items-center">
                        <span className="text-[9px] text-emerald-500 font-mono font-bold">Budget: {(ad.budget || 0).toLocaleString()} €</span>
                        <button
                          type="button"
                          onClick={() => {
                            const currentAds = designSettings.advertisers || [
                              { id: 'ad-1', name: 'Burger King Campaign', url: 'https://burgerking.fr', budget: 5000, banner: '', isFeatured: true, isActive: true },
                              { id: 'ad-2', name: 'Nespresso Premium', url: 'https://nespresso.fr', budget: 2500, banner: '', isFeatured: false, isActive: true }
                            ];
                            onUpdateDesignSettings({
                              advertisers: currentAds.map((item: any) => 
                                item.id === ad.id ? { ...item, isFeatured: !item.isFeatured } : item
                              )
                            });
                          }}
                          className={`text-[9px] font-black uppercase tracking-wider ${
                            ad.isFeatured ? 'text-zinc-500 hover:text-zinc-400' : 'text-amber-500 hover:text-amber-400'
                          }`}
                        >
                          {ad.isFeatured ? 'Standard' : 'Placer en Vedette'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section C: Typographies & Présentation de l’écran */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Layout size={16} className="text-[#FF5C00]" />
                    3. Typographies Google Fonts & Style de l'Applet
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Choisissez parmi les polices prédéfinies, recherchez parmi des dizaines de Google Fonts tendances, ou saisissez le nom exact de n’importe quelle Google Font pour l’appliquer dynamiquement.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Free-form Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#FF5C00] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={11} /> Saisie libre Google Font
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={designSettings.typography || ''}
                        onChange={(e) => onUpdateDesignSettings({ typography: e.target.value })}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        placeholder="Ex: Syne, Satoshi, Rubik, Sora..."
                      />
                      <button
                        type="button"
                        onClick={() => alert(`Police Google Font "${designSettings.typography}" chargée et appliquée sur l'ensemble de l'application !`)}
                        className="px-3 bg-[#FF5C00] hover:bg-[#E04F00] text-white text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer"
                      >
                        Appliquer
                      </button>
                    </div>
                    <p className="text-[9px] text-zinc-500 font-sans leading-normal">
                      N'importe quelle police disponible sur Google Fonts sera automatiquement téléchargée et injectée en temps réel.
                    </p>
                  </div>

                  {/* Border radius select */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Rayon de Courbure (Arrondis des éléments)</label>
                    <select
                      value={designSettings.borderRadius || '16px'}
                      onChange={(e) => onUpdateDesignSettings({ borderRadius: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                    >
                      <option value="0px">Carré Brutaliste (0px)</option>
                      <option value="8px">Discret Moderne (8px)</option>
                      <option value="16px">Doux Arrondi (16px - Standard)</option>
                      <option value="28px">Ultra Courbé Fluide (28px)</option>
                    </select>
                  </div>
                </div>

                {/* Google Fonts Dynamic Selection Catalog */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-[10px] text-zinc-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                      📖 Catalogue Google Fonts interactif
                    </label>
                    <input 
                      type="text"
                      value={googleFontSearchQuery}
                      onChange={(e) => setGoogleFontSearchQuery(e.target.value)}
                      className="bg-zinc-950 border border-white/5 rounded-lg px-3 py-1 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00] w-full sm:w-48"
                      placeholder="Filtrer les polices..."
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {[
                      { name: 'Inter', desc: 'Sans-serif moderne', type: 'sans' },
                      { name: 'Space Grotesk', desc: 'Brutaliste & géométrique', type: 'display' },
                      { name: 'Playfair Display', desc: 'Sérif classique élégant', type: 'serif' },
                      { name: 'JetBrains Mono', desc: 'Monospace développeur clean', type: 'mono' },
                      { name: 'Outfit', desc: 'Géométrique épuré chic', type: 'display' },
                      { name: 'Cabinet Grotesk', desc: 'Néo-grotesque condensé', type: 'display' },
                      { name: 'Bricolage Grotesk', desc: 'Expressif et rythmé', type: 'display' },
                      { name: 'Syne', desc: 'Large artistique audacieux', type: 'display' },
                      { name: 'Cinzel', desc: 'Sérif d\'inspiration romaine', type: 'serif' },
                      { name: 'Montserrat', desc: 'Sans-serif classique urbain', type: 'sans' },
                      { name: 'Poppins', desc: 'Rond et ultra-sympathique', type: 'sans' },
                      { name: 'Cormorant Garamond', desc: 'Sérif luxe haute-couture', type: 'serif' },
                      { name: 'Plus Jakarta Sans', desc: 'Moderne épuré indonésien', type: 'sans' },
                      { name: 'Satoshi', desc: 'Néo-grotesque suisse d\'élite', type: 'sans' },
                      { name: 'Manrope', desc: 'Grotesque moderne équilibré', type: 'sans' },
                      { name: 'Urbanist', desc: 'Sans-serif fluide et contemporain', type: 'display' }
                    ].filter(font => font.name.toLowerCase().includes(googleFontSearchQuery.toLowerCase()))
                     .map((font) => (
                      <button
                        key={font.name}
                        type="button"
                        onClick={() => {
                          onUpdateDesignSettings({ typography: font.name });
                          alert(`Police "${font.name}" appliquée live !`);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between h-18 transition-all cursor-pointer ${
                          designSettings.typography === font.name 
                            ? 'bg-[#FF5C00]/5 border-[#FF5C00]' 
                            : 'bg-zinc-950/50 border-white/5 hover:border-white/10 hover:bg-zinc-900/40'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-white block truncate" style={{ fontFamily: font.name }}>{font.name}</span>
                        <span className="text-[9px] text-zinc-500 font-sans truncate">{font.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section D: Layouts Présentation & Sections */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-[#FF5C00]" />
                    4. Gabarits de Thèmes & Templates de l'Applet
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Sélectionnez un modèle de design complet pré-configuré (combinaison harmonieuse de couleurs, typographie de luxe et gabarit de navigation) pour styliser instantanément votre espace client.
                  </p>
                </div>

                {/* Theme presets and templates catalog list */}
                <div className="space-y-2.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Templates thématiques premium</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { 
                        name: 'Nonna Margherita 🍕', 
                        desc: 'Warm Editorial', 
                        accent: '#FF5C00', 
                        bg: '#080706', 
                        text: '#FDFBF7', 
                        font: 'Playfair Display', 
                        preset: 'editorial' 
                      },
                      { 
                        name: 'Tokyo Neon 🍣', 
                        desc: 'Cyber Immersive', 
                        accent: '#EC4899', 
                        bg: '#05020C', 
                        text: '#E5E7EB', 
                        font: 'Space Grotesk', 
                        preset: 'immersive' 
                      },
                      { 
                        name: 'Avocado Fresh 🥑', 
                        desc: 'Eco Bento', 
                        accent: '#10B981', 
                        bg: '#040F08', 
                        text: '#F1F5F9', 
                        font: 'Inter', 
                        preset: 'bento' 
                      },
                      { 
                        name: 'Golden Palace 👑', 
                        desc: 'Luxury Gold', 
                        accent: '#F59E0B', 
                        bg: '#0A0908', 
                        text: '#F5F5F4', 
                        font: 'Cormorant Garamond', 
                        preset: 'editorial' 
                      },
                      { 
                        name: 'Solar Clean ☀️', 
                        desc: 'Minimal High-Contrast', 
                        accent: '#FF5C00', 
                        bg: '#FAFAFA', 
                        text: '#18181B', 
                        font: 'Outfit', 
                        preset: 'bento' 
                      }
                    ].map((tpl) => (
                      <button
                        key={tpl.name}
                        type="button"
                        onClick={() => {
                          onUpdateDesignSettings({
                            accentColor: tpl.accent,
                            backgroundColor: tpl.bg,
                            textColor: tpl.text,
                            typography: tpl.font,
                            layoutPreset: tpl.preset
                          });
                          alert(`Template "${tpl.name}" appliqué avec succès !`);
                        }}
                        className="p-3 rounded-2xl border border-white/5 hover:border-white/10 text-left space-y-2 transition-all cursor-pointer bg-zinc-950/40"
                      >
                        <span className="text-[10px] font-black uppercase text-white block truncate leading-tight">{tpl.name}</span>
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: tpl.accent }} />
                          <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: tpl.bg }} />
                          <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: tpl.text }} />
                        </div>
                        <div className="text-[8px] text-zinc-500 font-mono flex flex-col gap-0.5 leading-normal">
                          <span>Font: {tpl.font}</span>
                          <span>Layout: {tpl.preset}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-4">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Ou configurez uniquement la disposition (Gabarit)</label>
                  
                  {/* Preset layouts cards selection */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { 
                        id: 'immersive', 
                        title: 'TikTok Immersive 🎥', 
                        desc: 'Mise en page plein écran verticale classique. Priorité absolue aux flux vidéo et swipe de l’utilisateur.' 
                      },
                      { 
                        id: 'bento', 
                        title: 'Split Bento Hub 🍱', 
                        desc: 'Grille moderne bento multi-colonnes. Combine un lecteur vidéo central avec des barres d’exploration, points fidélité et plats phares.' 
                      },
                      { 
                        id: 'editorial', 
                        title: 'Gourmet Éditorial 📰', 
                        desc: 'Façon magazine gastronomique premium. Grande bannière promo, curations de plats, spotlight chef et feed vidéo en bas.' 
                      },
                      { 
                        id: 'whatnot', 
                        title: 'Whatnot Live Market 🛍️', 
                        desc: 'Mosaïque de streams et de ventes en direct inspirée de Whatnot, avec un menu de catégories latéral et boutons d’achats rapides.' 
                      }
                    ].map((lay) => (
                      <button
                        key={lay.id}
                        type="button"
                        onClick={() => {
                          onUpdateDesignSettings({ layoutPreset: lay.id });
                          alert(`Gabarit de mise en page "${lay.title}" activé avec succès !`);
                        }}
                        className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between h-40 ${
                          designSettings.layoutPreset === lay.id 
                            ? 'bg-[#FF5C00]/5 border-[#FF5C00] shadow-[0_0_15px_rgba(255,92,0,0.1)]' 
                            : 'bg-zinc-950/40 border-white/5 hover:border-white/10'
                        }`}
                      >
                      <div>
                        <h4 className="text-xs font-black text-white uppercase italic">{lay.title}</h4>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-normal font-sans">{lay.desc}</p>
                      </div>
                      <span className={`text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded-md ${
                        designSettings.layoutPreset === lay.id ? 'bg-[#FF5C00] text-white' : 'bg-zinc-900 text-zinc-500'
                      }`}>
                        {designSettings.layoutPreset === lay.id ? 'Actif ✔' : 'Choisir'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

                {/* Dynamic Landing Fields */}
                <div className="grid grid-cols-1 gap-4 pt-3 border-t border-white/2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Grand Titre Héro (Layout Éditorial)</label>
                    <input 
                      type="text" 
                      value={designSettings.heroTitle || ''}
                      onChange={(e) => onUpdateDesignSettings({ heroTitle: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="Vidéos Gourmandes, Livraison Instantanée."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Message d’en-tête promotionnel</label>
                    <input 
                      type="text" 
                      value={designSettings.promoMessage || ''}
                      onChange={(e) => onUpdateDesignSettings({ promoMessage: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="⚡ OFFRE SPECIALE DE COMMANDE EN DIRECT ⚡"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">URL Image de fond du Banner Éditorial</label>
                    <input 
                      type="text" 
                      value={designSettings.bannerUrl || ''}
                      onChange={(e) => onUpdateDesignSettings({ bannerUrl: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="https://images.unsplash.com/photo-..."
                    />
                  </div>
                </div>

                {/* Section Visibility Toggles */}
                <div className="space-y-3 pt-3 border-t border-white/2">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Affichage des Sections sur la Landing Page</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'showHero', label: 'Bannière Héro Principale' },
                      { key: 'showFeaturedProducts', label: 'Grille de Plats Vedettes' },
                      { key: 'showChefSpotlight', label: 'Portrait de Chef de la semaine' },
                      { key: 'showVideoFeed', label: 'Lecteur Vidéo Direct' },
                      { key: 'showLoyaltyClubBanner', label: 'Bannière de Fidélité points' }
                    ].map((sec) => {
                      const isVisible = designSettings.sectionsVisible?.[sec.key] !== false;
                      return (
                        <label 
                          key={sec.key} 
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-white/2 hover:bg-zinc-900 transition-colors cursor-pointer text-zinc-300 hover:text-white"
                        >
                          <input 
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => {
                              const currentSecs = designSettings.sectionsVisible || {
                                showHero: true,
                                showFeaturedProducts: true,
                                showChefSpotlight: true,
                                showVideoFeed: true,
                                showLoyaltyClubBanner: true
                              };
                              onUpdateDesignSettings({
                                sectionsVisible: {
                                  ...currentSecs,
                                  [sec.key]: !isVisible
                                }
                              });
                            }}
                            className="rounded border-white/10 text-[#FF5C00] focus:ring-0 bg-transparent"
                          />
                          <span className="text-[10px] font-bold uppercase font-sans tracking-wide">{sec.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 🚀 Booster d'Engagement - Popup & Animations */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>⚡</span> BOOSTER D'ENGAGEMENT DES VIDÉOS
                      </h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-sans leading-normal">
                        Encouragez automatiquement les utilisateurs à liker, commenter et envoyer des cadeaux à intervalles réguliers.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={designSettings.enableEngagementAnimations !== false} 
                        onChange={(e) => onUpdateDesignSettings({ enableEngagementAnimations: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF5C00]"></div>
                    </label>
                  </div>

                  {designSettings.enableEngagementAnimations !== false && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950/60 p-4 rounded-2xl border border-white/5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Intervalle d’Animation (en secondes)</label>
                          <select
                            value={designSettings.engagementInterval || 20}
                            onChange={(e) => onUpdateDesignSettings({ engagementInterval: parseInt(e.target.value) })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                          >
                            <option value="10">Chaque 10 secondes (Très rapide)</option>
                            <option value="15">Chaque 15 secondes</option>
                            <option value="20">Chaque 20 secondes (Recommandé)</option>
                            <option value="30">Chaque 30 secondes (Standard)</option>
                            <option value="45">Chaque 45 secondes</option>
                            <option value="60">Chaque 60 secondes (Doux)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Type de Booster Favori</label>
                          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">
                            {designSettings.engagementPromptType === 'like' ? '❤️ Likes Uniquement' : designSettings.engagementPromptType === 'comment' ? '💬 Commentaires Uniquement' : designSettings.engagementPromptType === 'gift' ? '🎁 Cadeaux Uniquement' : '🔄 Mode Alterné : Like, Commentaire & Cadeaux'}
                          </div>
                          <p className="text-[9px] text-zinc-500 leading-normal">
                            Configurez la boucle d'incitation en direct pour attirer l'attention des utilisateurs.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsEngagementModalOpen(true)}
                        className="w-full bg-[#FF5C00]/10 hover:bg-[#FF5C00]/20 border border-[#FF5C00]/35 hover:border-[#FF5C00] text-[#FF5C00] py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>⚙️</span> Configurer l'engagement & slogans (Modal)
                      </button>
                    </div>
                  )}

                  {/* Toggle of Fireworks and Click animations */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>🎆</span> ANIMATIONS DE FEU D'ARTIFICE ET CONFETTIS
                      </h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-sans leading-normal">
                        Activer ou désactiver les explosions festives de confetti ou feu d'artifice à l'écran lors du clic "J'aime" ou des envois de cadeaux.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={designSettings.enableFireworks !== false} 
                        onChange={(e) => onUpdateDesignSettings({ enableFireworks: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF5C00]"></div>
                    </label>
                  </div>
                </div>
              </div>
              </div>
              )}

              {/* SUB-TAB 5: ANNONCES & WIDGETS */}
              {(designSubTab === 'widgets_ads' || designSubTab === 'all') && (
                <div className="space-y-6">
                  {/* Section E: Choix des produits mis en avant (Featured Products list) */}
                  <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <ShoppingBag size={16} className="text-[#FF5C00]" />
                    5. Produits & Plats mis en avant (Featured Products)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Cochez les produits du catalogue que vous souhaitez faire figurer en première page sur les structures Bento ou Éditoriales.
                  </p>
                </div>

                <div className="bg-zinc-950 border border-white/5 rounded-2xl max-h-60 overflow-y-auto divide-y divide-white/2">
                  {dishes && dishes.length > 0 ? (
                    dishes.map((dish) => {
                      const currentFeatured = designSettings.featuredDishIds || [];
                      const isFeatured = currentFeatured.includes(dish.id);
                      
                      return (
                        <div key={dish.id} className="p-3 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                          <div className="flex items-center gap-3">
                            <img src={dish.imageUrl || (dish as any).image} alt={dish.name} className="w-10 h-10 object-cover rounded-lg border border-white/5" />
                            <div>
                              <p className="text-xs font-extrabold text-white uppercase italic">{dish.name}</p>
                              <p className="text-[10px] text-zinc-500 font-mono">{dish.price.toFixed(2)} €</p>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const updatedFeatured = isFeatured
                                ? currentFeatured.filter((id: string) => id !== dish.id)
                                : [...currentFeatured, dish.id];
                              onUpdateDesignSettings({ featuredDishIds: updatedFeatured });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                              isFeatured 
                                ? 'bg-[#FF5C00] text-white border-transparent shadow-[0_0_8px_rgba(255,92,0,0.3)]' 
                                : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                            }`}
                          >
                            {isFeatured ? '★ Mis en avant' : 'Placer en vedette'}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-zinc-500">Aucun produit disponible dans le catalogue.</div>
                  )}
                </div>
              </div>

              {/* Section F: Custom Feature Builder (Easily create/manage features) */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Plus size={16} className="text-[#FF5C00]" />
                    6. Créateur de Fonctionnalités & Widgets Actifs (Feature Builder)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Ajoutez instantanément de nouvelles fonctionnalités, innovations de services ou badges marketing sur votre espace client.
                  </p>
                </div>

                {/* Form to create feature */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!featTitle.trim()) return;
                    const newFeat = {
                      id: `feat-${Date.now()}`,
                      title: featTitle,
                      badge: featBadge.toUpperCase() || 'NOUVEAU',
                      description: featDescription,
                      icon: featIcon || '✨',
                      cta: featCta || 'Activer',
                      budget: featBudget || 0,
                      isFeatured: featIsFeatured
                    };
                    const currentFeats = designSettings.createdFeatures || [];
                    onUpdateDesignSettings({ createdFeatures: [...currentFeats, newFeat] });
                    setFeatTitle('');
                    setFeatBadge('NOUVEAU');
                    setFeatDescription('');
                    setFeatIcon('✨');
                    setFeatCta('En savoir plus');
                    setFeatBudget(1000);
                    setFeatIsFeatured(false);
                    alert(`Fonctionnalité "${newFeat.title}" créée avec succès et déployée en direct !`);
                  }}
                  className="bg-zinc-950 rounded-2xl p-5 border border-white/5 space-y-4"
                >
                  <p className="text-[10px] font-black text-white uppercase tracking-wide italic border-b border-white/5 pb-1.5">Créer un nouveau service / widget</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Titre de la fonctionnalité</label>
                      <input 
                        type="text" 
                        required
                        value={featTitle}
                        onChange={(e) => setFeatTitle(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        placeholder="Ex: Click & Collect Privilège 🚗"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Badge d’accroche</label>
                      <input 
                        type="text" 
                        value={featBadge}
                        onChange={(e) => setFeatBadge(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        placeholder="NOUVEAU, RAPIDE, EXCLUSIF"
                      />
                    </div>

                    <div className="space-y-1.5 col-span-3">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Description de l’offre ou du service</label>
                      <textarea 
                        required
                        value={featDescription}
                        onChange={(e) => setFeatDescription(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none h-16 resize-none"
                        placeholder="Expliquez brièvement le concept ou l’avantage à vos clients..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Émoji de l’icône</label>
                      <select
                        value={featIcon}
                        onChange={(e) => setFeatIcon(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="✨">Éclat ✨</option>
                        <option value="🚀">Fusée 🚀</option>
                        <option value="🚴">Vélo 🚴</option>
                        <option value="🌿">Feuille 🌿</option>
                        <option value="💎">Diamant 💎</option>
                        <option value="🎁">Cadeau 🎁</option>
                        <option value="🔥">Chaud 🔥</option>
                        <option value="🎉">Fête 🎉</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Texte du Bouton d’action</label>
                      <input 
                        type="text" 
                        value={featCta}
                        onChange={(e) => setFeatCta(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        placeholder="En savoir plus, Découvrir, Activer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Budget Actif (€)</label>
                      <input 
                        type="number" 
                        value={featBudget}
                        onChange={(e) => setFeatBudget(parseInt(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        placeholder="Budget requis (ex: 1500)"
                      />
                    </div>

                    <div className="col-span-3 flex items-center gap-3 bg-zinc-900/50 p-2.5 rounded-xl border border-white/2">
                      <input
                        type="checkbox"
                        id="featIsFeatured"
                        checked={featIsFeatured}
                        onChange={(e) => setFeatIsFeatured(e.target.checked)}
                        className="rounded text-[#FF5C00] accent-[#FF5C00] w-4 h-4 bg-zinc-900 border-white/10"
                      />
                      <label htmlFor="featIsFeatured" className="text-xs text-white font-extrabold cursor-pointer select-none">
                        Placer cette fonctionnalité en vedette (Mise en avant premium) 👑
                      </label>
                    </div>

                    <div className="col-span-3 flex justify-end pt-2">
                      <button
                        type="submit"
                        className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white py-2.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_5px_15px_rgba(255,92,0,0.15)]"
                      >
                        Créer le Widget
                      </button>
                    </div>
                  </div>
                </form>

                {/* List of existing custom features with delete action */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wide font-mono pl-1">Liste de vos Widgets / Services déploiyés</p>
                  
                  {designSettings.createdFeatures && designSettings.createdFeatures.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {designSettings.createdFeatures.map((feat: any) => (
                        <div key={feat.id} className="p-4 rounded-xl bg-zinc-950 border border-white/5 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-base shrink-0">{feat.icon || '✨'}</span>
                                <h4 className="text-xs font-extrabold text-white uppercase italic truncate">{feat.title}</h4>
                                {feat.isFeatured && (
                                  <span className="text-amber-400 shrink-0" title="En vedette">👑</span>
                                )}
                              </div>
                              <span className="text-[8px] bg-white/5 border border-white/10 text-zinc-400 font-bold px-2 py-0.5 rounded-full uppercase font-mono">
                                {feat.badge || 'PROMO'}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-normal font-sans">{feat.description}</p>
                            
                            {/* Budget & featured status */}
                            <div className="mt-2 flex gap-3 text-[9px] font-mono text-zinc-500">
                              <span>Budget Actif : <strong className="text-emerald-500 font-bold">{(feat.budget || 0).toLocaleString()} €</strong></span>
                              {feat.isFeatured && (
                                <span className="text-amber-500 font-bold">★ Vedette Active</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-white/2">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-zinc-500 font-mono font-bold">Bouton: {feat.cta}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentFeats = designSettings.createdFeatures || [];
                                  onUpdateDesignSettings({
                                    createdFeatures: currentFeats.map((f: any) => 
                                      f.id === feat.id ? { ...f, isFeatured: !f.isFeatured } : f
                                    )
                                  });
                                }}
                                className={`text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                                  feat.isFeatured ? 'text-zinc-500 hover:text-zinc-400' : 'text-amber-500 hover:text-amber-400'
                                }`}
                              >
                                {feat.isFeatured ? 'Désélectionner' : 'Placer en Vedette'}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                askConfirmation(
                                  'Supprimer le widget',
                                  'Voulez-vous vraiment supprimer définitivement ce widget / service ?',
                                  () => {
                                    const currentFeats = designSettings.createdFeatures || [];
                                    onUpdateDesignSettings({ createdFeatures: currentFeats.filter((f: any) => f.id !== feat.id) });
                                    showFeedbackToast('✨ Widget supprimé avec succès !', 'success');
                                  }
                                );
                              }}
                              className="text-[9px] text-red-500 hover:text-red-400 font-black uppercase tracking-wider cursor-pointer"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-zinc-950/40 border border-dashed border-white/5 text-center text-xs text-zinc-500">
                      Aucun widget créé. Utilisez le formulaire ci-dessus pour ajouter des innovations de services !
                    </div>
                  )}
                </div>
              </div>

              {/* Drag and Drop Zone requested by user */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Upload size={16} className="text-[#FF5C00]" />
                      Glisser-Déposer de Fichiers (Images/Vidéos)
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Glissez une image de bannière promo ou une vidéo libre de droits pour l’intégrer.</p>
                  </div>
                </div>

                <div 
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    dragActive 
                      ? 'border-[#FF5C00] bg-[#FF5C00]/5' 
                      : 'border-white/5 hover:border-white/15 bg-zinc-950/40'
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  <input 
                    id="file-upload-input"
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />

                  {isUploadingFile ? (
                    <div className="space-y-3">
                      <div className="w-14 h-14 bg-[#FF5C00]/10 border border-[#FF5C00]/20 rounded-full flex items-center justify-center mx-auto text-[#FF5C00] animate-spin">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <div className="text-xs">
                        <p className="font-extrabold text-white animate-pulse">Téléversement du média en cours...</p>
                        <p className="text-zinc-500 mt-0.5 font-mono truncate max-w-md">{uploadedFileName}</p>
                      </div>
                    </div>
                  ) : uploadedFileUrl ? (
                    <div className="space-y-3">
                      <div className="w-14 h-14 bg-[#FF5C00]/10 border border-[#FF5C00]/20 rounded-full flex items-center justify-center mx-auto text-[#FF5C00]">
                        <CheckCircle size={24} />
                      </div>
                      <div className="text-xs">
                        <p className="font-extrabold text-white">Fichier chargé avec succès !</p>
                        <p className="text-zinc-500 mt-0.5 font-mono truncate max-w-md">{uploadedFileName}</p>
                      </div>

                      {uploadedFileType === 'image' && Boolean(uploadedFileUrl?.trim()) && (
                        <img 
                          src={uploadedFileUrl.trim()} 
                          alt="Previsualisation" 
                          className="h-24 object-cover rounded-lg border border-white/10 mx-auto" 
                        />
                      )}
                      {uploadedFileType === 'video' && Boolean(uploadedFileUrl?.trim()) && (
                        <video 
                          src={getSafeVideoUrl(uploadedFileUrl) || STABLE_CULINARY_FALLBACK_VIDEOS[0]} 
                          controls 
                          muted 
                          className="h-24 object-cover rounded-lg border border-white/10 mx-auto" 
                          onError={(e) => {
                            console.warn('[AdminCMS] Uploaded video preview failed, falling back');
                            if (e.currentTarget.src !== STABLE_CULINARY_FALLBACK_VIDEOS[0]) {
                              e.currentTarget.src = STABLE_CULINARY_FALLBACK_VIDEOS[0];
                            }
                          }}
                        />
                      )}

                      <div className="flex justify-center gap-2 pt-2">
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateDesignSettings({ bannerUrl: uploadedFileUrl });
                            alert('Bannière mise à jour dans le CMS !');
                          }}
                          className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase"
                        >
                          Appliquer comme Bannière
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateDesignSettings({ logoUrl: uploadedFileUrl });
                            alert('Logo de l’application mis à jour avec le fichier chargé !');
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-zinc-950 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase"
                        >
                          Appliquer comme Logo
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFileUrl('');
                            setUploadedFileName('');
                            setUploadedFileType(null);
                          }}
                          className="bg-zinc-800 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase"
                        >
                          Effacer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 mb-3 group-hover:text-white">
                        <Upload size={18} />
                      </div>
                      <p className="text-xs font-bold text-zinc-300">Glissez-déposez votre image/vidéo ici</p>
                      <p className="text-[10px] text-zinc-500 mt-1 uppercase">ou cliquez pour explorer vos fichiers sur mobile / PC</p>
                    </>
                  )}
                </div>
              </div>

              {/* Section G: Customiseur d'Icônes IA & GIFs */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-[#FF5C00]" />
                    4. Customiseur d'Icônes Applicatives IA & GIFs 🤖
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Cliquez sur n’importe quel bouton clé du site pour remplacer son icône par un Lucide (ex: <i>Flame</i>), un émoji, ou l'URL d’un <b>GIF animé</b> pour ouvrir l'appétit !
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: 'iconCart', label: 'Bouton Panier (Header)', defaultVal: 'MessageSquare', desc: 'Icône du panier de commande' },
                    { key: 'iconOrder', label: 'Suivi de Commande (Header)', defaultVal: 'Bell', desc: 'Icône des notifications de commande' },
                    { key: 'iconGift', label: 'Espace Cadeaux / Profil (Header)', defaultVal: 'Gift', desc: 'Icône d’accès au profil / promotions' }
                  ].map((item) => {
                    const currentVal = designSettings.customIcons?.[item.key] || item.defaultVal;
                    const isSelected = selectedIconKey === item.key;
                    return (
                      <div 
                        key={item.key}
                        onClick={() => setSelectedIconKey(item.key)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer text-left space-y-2.5 ${
                          isSelected 
                            ? 'border-[#FF5C00] bg-[#FF5C00]/5 shadow-lg shadow-[#FF5C00]/10' 
                            : 'border-white/5 bg-zinc-950 hover:border-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-zinc-400">{item.label}</span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-[#FF5C00]" />}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-white font-mono text-xs overflow-hidden shrink-0">
                            {currentVal.startsWith('http') ? (
                              <img src={currentVal} alt="icon" className="w-7 h-7 object-contain" />
                            ) : currentVal.length <= 4 ? (
                              <span className="text-lg">{currentVal}</span>
                            ) : (
                              <span className="text-[9px] font-black text-amber-500 truncate px-1">{currentVal}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white truncate">{currentVal}</p>
                            <p className="text-[9.5px] text-zinc-500 truncate">{item.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI & Manual Editing Panel for Selected Icon */}
                <div className="p-4.5 rounded-2xl bg-zinc-950 border border-white/5 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Configuration de l'icône : <span className="text-[#FF5C00]">{(selectedIconKey === 'iconCart' ? 'Panier' : selectedIconKey === 'iconOrder' ? 'Suivi' : 'Profil')}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const current = designSettings.customIcons || {};
                        const { [selectedIconKey]: removed, ...rest } = current;
                        onUpdateDesignSettings({ customIcons: rest });
                        alert('Icône réinitialisée aux valeurs d’usine !');
                      }}
                      className="text-[9px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg border border-white/5 uppercase font-mono font-black transition-colors"
                    >
                      Réinitialiser
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Column 1: Manual Value */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Valeur personnalisée (Émoji, Lucide ou Lien GIF/Image)</label>
                      <input 
                        type="text"
                        value={designSettings.customIcons?.[selectedIconKey] || ''}
                        onChange={(e) => {
                          const current = designSettings.customIcons || {};
                          onUpdateDesignSettings({ customIcons: { ...current, [selectedIconKey]: e.target.value } });
                        }}
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]"
                        placeholder="Ex: ShoppingCart, 🔥, https://media.giphy.com/media/.../giphy.gif"
                      />
                      <p className="text-[9px] text-zinc-500 font-sans leading-relaxed">
                        Pour un GIF animé ou une icône personnalisée, collez simplement un lien direct <i>https://...</i>. Pour un émoji, collez l'émoji. Pour Lucide, saisissez le nom exact (ex: <i>Heart, Flame, Crown, Trash</i>).
                      </p>
                    </div>

                    {/* Column 2: AI Icon generator */}
                    <div className="space-y-2 bg-[#FF5C00]/2 p-3.5 rounded-xl border border-[#FF5C00]/10">
                      <label className="text-[10px] text-zinc-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={11} className="text-amber-400 animate-pulse" />
                        Générer avec l'IA Gemini 🤖
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={aiIconPrompt}
                          onChange={(e) => setAiIconPrompt(e.target.value)}
                          placeholder="Ex: 'un panier de course rétro doré', 'feu et piment'"
                          className="flex-1 bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]"
                        />
                        <button
                          type="button"
                          disabled={isGeneratingIcon || !aiIconPrompt.trim()}
                          onClick={handleGenerateAIIcon}
                          className="bg-amber-500 hover:bg-amber-450 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer font-sans"
                        >
                          {isGeneratingIcon ? 'Création...' : 'Suggérer'}
                        </button>
                      </div>
                      <p className="text-[8.5px] text-zinc-500 leading-normal font-sans">
                        L'IA va automatiquement chercher le meilleur nom d'icône Lucide, un émoji croustillant, ou un lien d'animation GIF en phase avec votre univers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section H: Gestion des Publicités PC */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Upload size={16} className="text-[#FF5C00]" />
                    5. Régie Publicitaire Ordinateur 🖥️
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Placez des bannières promotionnelles animées (<b>GIFs</b>, <b>Images</b>, <b>Vidéos</b>) sur l’interface PC (dans la barre latérale droite du flux vidéo en direct).
                  </p>
                </div>

                {/* Create Ad Form */}
                <form onSubmit={handleAddDesktopAd} className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-3.5">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">Créer un nouvel encart publicitaire</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase">Titre de la Publicité</label>
                      <input 
                        type="text" 
                        required
                        value={adTitle}
                        onChange={(e) => setAdTitle(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        placeholder="Ex: -50% sur votre premier Burger !"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase">Sous-titre / Slogan d’appel</label>
                      <input 
                        type="text" 
                        value={adSubtitle}
                        onChange={(e) => setAdSubtitle(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        placeholder="Ex: Commandez dès maintenant en un clic."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase">URL du média (Image, GIF ou Vidéo MP4)</label>
                      <input 
                        type="text" 
                        required
                        value={adMediaUrl}
                        onChange={(e) => setAdMediaUrl(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        placeholder="Ex: https://media.giphy.com/.../giphy.gif"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase">Type de Média</label>
                        <select 
                          value={adMediaType}
                          onChange={(e) => setAdMediaType(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                        >
                          <option value="image">Image ou GIF animé 🖼️</option>
                          <option value="video">Vidéo MP4 🎥</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase">URL de redirection (Optionnelle)</label>
                        <input 
                          type="text" 
                          value={adClickUrl}
                          onChange={(e) => setAdClickUrl(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                          placeholder="Ex: https://notresite.com/promo"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button 
                      type="submit"
                      className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                    >
                      Pousser la Publicité
                    </button>
                  </div>
                </form>

                {/* Ads List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wide pl-1">Liste des Encarts Publicitaires Actifs</h4>
                  {designSettings.desktopAds && designSettings.desktopAds.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {designSettings.desktopAds.map((ad: any) => (
                        <div key={ad.id} className="p-3.5 rounded-2xl bg-zinc-950 border border-white/5 flex flex-col justify-between space-y-3">
                          <div className="flex gap-3">
                            {Boolean(ad.mediaUrl?.trim()) && (
                              <div className="w-16 h-12 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center">
                                {ad.mediaType === 'video' ? (
                                  <video 
                                    src={getSafeVideoUrl(ad.mediaUrl.trim()) || STABLE_CULINARY_FALLBACK_VIDEOS[0]} 
                                    muted 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                      console.warn('[AdminCMS] Ad video preview failed, falling back');
                                      if (e.currentTarget.src !== STABLE_CULINARY_FALLBACK_VIDEOS[0]) {
                                        e.currentTarget.src = STABLE_CULINARY_FALLBACK_VIDEOS[0];
                                      }
                                    }}
                                  />
                                ) : (
                                  <img src={ad.mediaUrl.trim()} alt={ad.title} className="w-full h-full object-cover" />
                                )}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-white truncate uppercase">{ad.title}</h5>
                              <p className="text-[10px] text-zinc-500 truncate font-sans">{ad.subtitle || 'Aucun slogan'}</p>
                              <span className="text-[8px] bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.5 rounded uppercase mt-1 inline-block font-mono">
                                {ad.mediaType === 'video' ? 'Vidéo MP4' : 'Image/GIF'}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-white/2">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={ad.isActive}
                                onChange={(e) => {
                                  const updated = designSettings.desktopAds.map((a: any) => a.id === ad.id ? { ...a, isActive: e.target.checked } : a);
                                  onUpdateDesignSettings({ desktopAds: updated });
                                }}
                                className="rounded text-[#FF5C00] accent-[#FF5C00] w-3.5 h-3.5 bg-zinc-900"
                              />
                              <span className="text-[10px] font-bold text-zinc-400 uppercase">Actif</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                askConfirmation(
                                  'Supprimer la publicité',
                                  'Voulez-vous vraiment supprimer définitivement cette publicité ?',
                                  () => {
                                    const updated = designSettings.desktopAds.filter((a: any) => a.id !== ad.id);
                                    onUpdateDesignSettings({ desktopAds: updated });
                                    showFeedbackToast('✨ Publicité supprimée avec succès !', 'success');
                                  }
                                );
                              }}
                              className="text-[9px] text-red-500 hover:text-red-400 font-black uppercase tracking-wider font-mono cursor-pointer"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-zinc-950/40 border border-dashed border-white/5 text-center text-xs text-zinc-500">
                      Aucune publicité active pour le moment. Utilisez le formulaire ci-dessus pour en diffuser une.
                    </div>
                  )}
                </div>
              </div>
              </div>
              )}

              {/* Bottom Sticky Action Banner */}
              <div className="p-4 rounded-2xl bg-[#0A0A0C] border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Check size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider">Appliquer & Sauvegarder le Design</p>
                    <p className="text-[10px] text-zinc-400 font-sans">Toutes les modifications visuelles sont immédiatement synchronisées.</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSavingDesign}
                  onClick={handleManualSave}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg ${
                    saveSuccess 
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' 
                      : 'bg-gradient-to-r from-[#FF5C00] to-orange-600 hover:from-[#FF7A00] hover:to-orange-500 text-white shadow-[0_4px_20px_rgba(255,92,0,0.3)] border border-white/10'
                  }`}
                >
                  {isSavingDesign ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enregistrement...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check size={15} />
                      Enregistré !
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Sauvegarder Tout le Design
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 1c. ACCUEIL CMS TAB */}
          {activeTab === 'accueil' && (
            <div className="max-w-4xl space-y-8 pb-12">
              {/* Card A: Visibilité globale des Éléments de l'Accueil */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <LayoutGrid size={16} className="text-[#FF5C00]" />
                    1. Visibilité des Sections (Mise en page)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Activez ou masquez les différentes sections de votre page d'accueil en un clic.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-white uppercase">Section d'En-tête (Hero)</span>
                      <p className="text-[10px] text-zinc-500">Affiche le titre principal, les boutons d'action et le QR Code.</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={designSettings.homeShowHero !== false}
                      onChange={(e) => onUpdateDesignSettings({ homeShowHero: e.target.checked })}
                      className="rounded text-[#FF5C00] accent-[#FF5C00] w-4 h-4 bg-zinc-900 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-white uppercase">Smartphone 3D (Simulé)</span>
                      <p className="text-[10px] text-zinc-500">Affiche la démonstration animée du live dans un mockup de téléphone.</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={designSettings.homeShowPhoneMockup !== false}
                      onChange={(e) => onUpdateDesignSettings({ homeShowPhoneMockup: e.target.checked })}
                      className="rounded text-[#FF5C00] accent-[#FF5C00] w-4 h-4 bg-zinc-900 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-white uppercase">Section Avantages (Trust)</span>
                      <p className="text-[10px] text-zinc-500">Présente les 3 piliers phares (transparence, ventes en direct, éco-livraison).</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={designSettings.homeShowTrust !== false}
                      onChange={(e) => onUpdateDesignSettings({ homeShowTrust: e.target.checked })}
                      className="rounded text-[#FF5C00] accent-[#FF5C00] w-4 h-4 bg-zinc-900 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-white uppercase">Foire aux questions (FAQ)</span>
                      <p className="text-[10px] text-zinc-500">Affiche le module d'accordéon des questions fréquemment posées.</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={designSettings.homeShowFaq !== false}
                      onChange={(e) => onUpdateDesignSettings({ homeShowFaq: e.target.checked })}
                      className="rounded text-[#FF5C00] accent-[#FF5C00] w-4 h-4 bg-zinc-900 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Card B: Section d'En-tête (Hero) & Couleurs */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders size={16} className="text-[#FF5C00]" />
                    2. Personnalisation du Hero & Couleurs
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Modifiez les textes, boutons, QR codes et dégradés de couleurs de la partie supérieure.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Colors */}
                  <div className="space-y-4 md:col-span-2 p-4 rounded-2xl bg-zinc-950 border border-white/5">
                    <h4 className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Couleurs de l'arrière-plan du Hero</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase block">Dégradé : Couleur de Début</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={designSettings.homeHeroBgGradientStart || '#FF5C00'}
                            onChange={(e) => onUpdateDesignSettings({ homeHeroBgGradientStart: e.target.value })}
                            className="bg-transparent border-0 w-8 h-8 cursor-pointer rounded"
                          />
                          <input 
                            type="text" 
                            value={designSettings.homeHeroBgGradientStart || '#FF5C00'}
                            onChange={(e) => onUpdateDesignSettings({ homeHeroBgGradientStart: e.target.value })}
                            className="bg-zinc-900 border border-white/15 px-3 py-1.5 rounded-xl text-xs text-white uppercase font-mono w-28"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase block">Dégradé : Couleur de Fin</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={designSettings.homeHeroBgGradientEnd || '#150900'}
                            onChange={(e) => onUpdateDesignSettings({ homeHeroBgGradientEnd: e.target.value })}
                            className="bg-transparent border-0 w-8 h-8 cursor-pointer rounded"
                          />
                          <input 
                            type="text" 
                            value={designSettings.homeHeroBgGradientEnd || '#150900'}
                            onChange={(e) => onUpdateDesignSettings({ homeHeroBgGradientEnd: e.target.value })}
                            className="bg-zinc-900 border border-white/15 px-3 py-1.5 rounded-xl text-xs text-white uppercase font-mono w-28"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Texts */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Badge d'En-tête</label>
                    <input 
                      type="text"
                      value={designSettings.homeHeroBadge || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeHeroBadge: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="🔴 LE LIVE-SHOPPING CULINAIRE #1"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Bouton CTA Principal</label>
                    <input 
                      type="text"
                      value={designSettings.homeCtaText || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeCtaText: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="Regarder les Lives"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Titre du Hero (Saut de ligne avec Entrée)</label>
                    <textarea 
                      rows={3}
                      value={designSettings.homeHeroTitle || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeHeroTitle: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans leading-relaxed"
                      placeholder="La marketplace&#10;du live shopping&#10;gourmand"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Sous-titre / Description</label>
                    <textarea 
                      rows={3}
                      value={designSettings.homeHeroSubtitle || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeHeroSubtitle: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                      placeholder="Découvrez des créations culinaires et recettes exclusives préparées sous vos yeux en direct..."
                    />
                  </div>

                  {/* QR Code and Sellers button */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Titre d'Accroche du QR Code</label>
                    <input 
                      type="text"
                      value={designSettings.homeQrCodeText || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeQrCodeText: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="Scannez pour commander"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Bouton "Devenir Vendeur"</label>
                    <input 
                      type="text"
                      value={designSettings.homeBecomeSellerTitle || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeBecomeSellerTitle: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="Devenir vendeur 🍳"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Sous-titre d'Accroche du QR Code</label>
                    <textarea 
                      rows={2}
                      value={designSettings.homeQrCodeSubtitle || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeQrCodeSubtitle: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                      placeholder="Disponible instantanément sur mobile et ordinateur. Profitez de 50% de réduction..."
                    />
                  </div>

                  {/* Section Vidéo de Présentation */}
                  <div className="md:col-span-2 pt-4 border-t border-white/5 space-y-4">
                    <h4 className="text-xs font-black text-[#FF5C00] uppercase tracking-wider font-mono">
                      🎬 Vidéo de Présentation Officielle & Explications
                    </h4>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">URL de la Vidéo de Présentation (MP4 / WebM)</label>
                      <input 
                        type="text"
                        value={designSettings.homePresentationVideoUrl || ''}
                        onChange={(e) => onUpdateDesignSettings({ homePresentationVideoUrl: e.target.value })}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-mono"
                        placeholder="https://.../video.mp4"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Titre de la Section Vidéo</label>
                        <input 
                          type="text"
                          value={designSettings.homePresTitle || ''}
                          onChange={(e) => onUpdateDesignSettings({ homePresTitle: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                          placeholder="C'est quoi FID FUD ? Découverte en vidéo"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Sous-titre d'Explication</label>
                        <input 
                          type="text"
                          value={designSettings.homePresSubtitle || ''}
                          onChange={(e) => onUpdateDesignSettings({ homePresSubtitle: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                          placeholder="FIDFUD est la 1ère marketplace française de live-shopping culinaire..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card C: Section Avantages (Trust & Features) */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle size={16} className="text-[#FF5C00]" />
                    3. Textes de la Section Avantages (Trust)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Configurez le titre global de réassurance et les détails des 3 arguments clés.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Titre Principal de la Section</label>
                    <input 
                      type="text"
                      value={designSettings.homeFeaturesTitle || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFeaturesTitle: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="Une expérience culinaire interactive unique"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Sous-titre descriptif</label>
                    <textarea 
                      rows={2}
                      value={designSettings.homeFeaturesSubtitle || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFeaturesSubtitle: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                      placeholder="Fidfud combine le meilleur du divertissement en direct et de la livraison de repas..."
                    />
                  </div>

                  {/* Feature 1 */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-4">
                    <h4 className="text-xs font-black text-[#FF5C00] uppercase tracking-wider font-mono">Argument #1 (Ex: Transparence)</h4>
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase block">Titre de l'argument</label>
                      <input 
                        type="text"
                        value={designSettings.homeFeat1Title || ''}
                        onChange={(e) => onUpdateDesignSettings({ homeFeat1Title: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        placeholder="Transparence Totale"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase block">Description</label>
                      <textarea 
                        rows={3}
                        value={designSettings.homeFeat1Desc || ''}
                        onChange={(e) => onUpdateDesignSettings({ homeFeat1Desc: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                        placeholder="Voyez exactement comment votre plat est préparé, les ingrédients de qualité utilisés..."
                      />
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-4">
                    <h4 className="text-xs font-black text-[#FF5C00] uppercase tracking-wider font-mono">Argument #2 (Ex: Direct Live)</h4>
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase block">Titre de l'argument</label>
                      <input 
                        type="text"
                        value={designSettings.homeFeat2Title || ''}
                        onChange={(e) => onUpdateDesignSettings({ homeFeat2Title: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        placeholder="Ventes Flash et Exclusivités"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase block">Description</label>
                      <textarea 
                        rows={3}
                        value={designSettings.homeFeat2Desc || ''}
                        onChange={(e) => onUpdateDesignSettings({ homeFeat2Desc: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                        placeholder="Profitez de tarifs avantageux sur des créations gastronomiques uniques en direct..."
                      />
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-4 md:col-span-2">
                    <h4 className="text-xs font-black text-[#FF5C00] uppercase tracking-wider font-mono">Argument #3 (Ex: Livraison Éco-Rapide)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase block">Titre de l'argument</label>
                        <input 
                          type="text"
                          value={designSettings.homeFeat3Title || ''}
                          onChange={(e) => onUpdateDesignSettings({ homeFeat3Title: e.target.value })}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                          placeholder="Livraison Éco-Rapide"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase block">Description</label>
                        <textarea 
                          rows={3}
                          value={designSettings.homeFeat3Desc || ''}
                          onChange={(e) => onUpdateDesignSettings({ homeFeat3Desc: e.target.value })}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                          placeholder="Dès la fin de la cuisson, nos éco-coursiers partenaires à vélo..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card D: Gestion Complète de la Foire Aux Questions (FAQ) */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={16} className="text-[#FF5C00]" />
                    4. Foire Aux Questions (FAQ)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Modifiez le titre, la description et les cinq questions-réponses interactives de la FAQ.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Titre de la FAQ</label>
                    <input 
                      type="text"
                      value={designSettings.homeFaqTitle || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFaqTitle: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="Questions Fréquentes"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Sous-titre descriptif</label>
                    <input 
                      type="text"
                      value={designSettings.homeFaqSubtitle || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFaqSubtitle: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="Vous avez des questions sur le live-shopping ? Voici nos réponses."
                    />
                  </div>

                  {/* FAQ Q1 & A1 */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-3 md:col-span-2">
                    <h4 className="text-[11px] font-black text-[#FF5C00] uppercase font-mono">Question 1</h4>
                    <input 
                      type="text"
                      value={designSettings.homeFaqQ1 || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFaqQ1: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="Qu'est-ce que FIDFUD ?"
                    />
                    <textarea 
                      rows={2}
                      value={designSettings.homeFaqA1 || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFaqA1: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                      placeholder="Réponse 1..."
                    />
                  </div>

                  {/* FAQ Q2 & A2 */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-3 md:col-span-2">
                    <h4 className="text-[11px] font-black text-[#FF5C00] uppercase font-mono">Question 2</h4>
                    <input 
                      type="text"
                      value={designSettings.homeFaqQ2 || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFaqQ2: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="Comment fonctionne le système de commande en direct ?"
                    />
                    <textarea 
                      rows={2}
                      value={designSettings.homeFaqA2 || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFaqA2: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                      placeholder="Réponse 2..."
                    />
                  </div>

                  {/* FAQ Q3 & A3 */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-3 md:col-span-2">
                    <h4 className="text-[11px] font-black text-[#FF5C00] uppercase font-mono">Question 3</h4>
                    <input 
                      type="text"
                      value={designSettings.homeFaqQ3 || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFaqQ3: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="Puis-je commander en dehors du live ?"
                    />
                    <textarea 
                      rows={2}
                      value={designSettings.homeFaqA3 || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFaqA3: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                      placeholder="Réponse 3..."
                    />
                  </div>

                  {/* FAQ Q4 & A4 */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-3 md:col-span-2">
                    <h4 className="text-[11px] font-black text-[#FF5C00] uppercase font-mono">Question 4</h4>
                    <input 
                      type="text"
                      value={designSettings.homeFaqQ4 || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFaqQ4: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="Comment devenir vendeur / chef sur FIDFUD ?"
                    />
                    <textarea 
                      rows={2}
                      value={designSettings.homeFaqA4 || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFaqA4: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                      placeholder="Réponse 4..."
                    />
                  </div>

                  {/* FAQ Q5 & A5 */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-3 md:col-span-2">
                    <h4 className="text-[11px] font-black text-[#FF5C00] uppercase font-mono">Question 5</h4>
                    <input 
                      type="text"
                      value={designSettings.homeFaqQ5 || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFaqQ5: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      placeholder="Quels sont les modes et délais de livraison ?"
                    />
                    <textarea 
                      rows={2}
                      value={designSettings.homeFaqA5 || ''}
                      onChange={(e) => onUpdateDesignSettings({ homeFaqA5: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                      placeholder="Réponse 5..."
                    />
                  </div>
                </div>
              </div>

              {/* Card D: Ordre & Position du Feed Vidéo */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders size={16} className="text-[#FF5C00]" />
                    4. Ordre & Positionnement du Feed Vidéo (Gourmet Feed)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Définissez la position et l'ordre d'apparition par défaut des restaurants et vidéos dans le feed d'exploration.
                  </p>
                </div>

                <div className="space-y-4 p-4 rounded-2xl bg-zinc-950 border border-white/5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Ordre de tri par défaut du Feed</label>
                    <select
                      value={designSettings.feedDefaultSort || 'recent'}
                      onChange={(e) => onUpdateDesignSettings({ feedDefaultSort: e.target.value })}
                      className="bg-[#0C0C0E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00] w-full font-sans cursor-pointer"
                    >
                      <option value="recent">⏰ Plus récent d'abord (Date de création décroissante)</option>
                      <option value="oldest">⏳ Moins récent d'abord (Date de création croissante)</option>
                      <option value="likes">🔥 Les plus populaires d'abord (Nombre de J'aime)</option>
                      <option value="distance">📍 Proximité géographique d'abord (Distance la plus courte)</option>
                    </select>
                    <p className="text-[10px] text-zinc-500 mt-1 font-sans">
                      Ce réglage détermine l'ordre par défaut dans lequel les vidéos de restaurants s'affichent pour les clients lorsqu'ils ouvrent l'application.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card E: Champs d'Inscription & Formulaires (Obligatoires vs Optionnels) */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle size={16} className="text-[#FF5C00]" />
                    5. Champs d'Inscription & Formulaires (Obligatoire / Optionnel)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Choisissez les informations obligatoires (avec astérisque rouge <span className="text-red-500 font-bold">*</span>) ou optionnelles exigées lors de la création de compte par vos clients et restaurateurs.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-950 border border-white/5">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-white/5 hover:border-[#FF5C00]/30 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={designSettings.requirePhone !== false}
                      onChange={(e) => onUpdateDesignSettings({ requirePhone: e.target.checked })}
                      className="accent-[#FF5C00] w-4 h-4 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Exiger le Numéro de Téléphone <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-zinc-400 font-sans block">Rendre le numéro de téléphone obligatoire à la création de compte</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-white/5 hover:border-[#FF5C00]/30 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!designSettings.requireSiret}
                      onChange={(e) => onUpdateDesignSettings({ requireSiret: e.target.checked })}
                      className="accent-[#FF5C00] w-4 h-4 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Exiger le SIRET / Licence (Restaurateur)</span>
                      <span className="text-[10px] text-zinc-400 font-sans block">Si décoché, la licence reste 100% facultative (recommandé)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-white/5 hover:border-[#FF5C00]/30 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!designSettings.requireAddress}
                      onChange={(e) => onUpdateDesignSettings({ requireAddress: e.target.checked })}
                      className="accent-[#FF5C00] w-4 h-4 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Exiger l'Adresse de Livraison Client</span>
                      <span className="text-[10px] text-zinc-400 font-sans block">Exiger la saisie de l'adresse principale dès l'inscription</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-white/5 hover:border-[#FF5C00]/30 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={designSettings.requireRestaurantName !== false}
                      onChange={(e) => onUpdateDesignSettings({ requireRestaurantName: e.target.checked })}
                      className="accent-[#FF5C00] w-4 h-4 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Exiger le Nom de l'Établissement <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-zinc-400 font-sans block">Champ obligatoire pour les comptes Restaurateurs</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Card F: Gestion du Cache & Fluidité Système */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles size={16} className="text-[#FF5C00]" />
                      6. Gestion du Cache & Fluidité Système
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Garantissez la fluidité des opérations et purgez instantanément le cache serveur & navigateur pour empêcher la réapparition d'éléments supprimés.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchCacheStats}
                      className="p-2 rounded-xl bg-zinc-900 border border-white/5 hover:border-white/20 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      title="Rafraîchir l'état du cache"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={handleClearCache}
                      disabled={isClearingCache}
                      className="bg-[#FF5C00] hover:bg-[#FF3E00] text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-[#FF5C00]/20 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Trash2 size={14} />
                      {isClearingCache ? 'Nettoyage...' : 'Vider le Cache Système'}
                    </button>
                  </div>
                </div>

                {cacheMessage && (
                  <div className="p-3.5 rounded-2xl bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-xs font-bold text-[#FF5C00] flex items-center gap-2">
                    <CheckCircle size={16} />
                    {cacheMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Requêtes en Cache</span>
                    <span className="text-xl font-black text-white block">
                      {cacheStats ? `${cacheStats.totalEntries} entrées` : 'Chargement...'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block font-sans">Réponses API accélérées en mémoire</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Dernière Purge du Cache</span>
                    <span className="text-xs font-bold text-emerald-400 block truncate">
                      {cacheStats?.lastClearedAt ? new Date(cacheStats.lastClearedAt).toLocaleTimeString('fr-FR') : 'Instantané'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block font-sans">Nettoyage automatique des données périmées</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Purge Récurrente Auto</span>
                    <select
                      value={cacheStats?.autoClearIntervalMinutes || 15}
                      onChange={(e) => handleUpdateCacheInterval(Number(e.target.value))}
                      className="w-full mt-1 bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold cursor-pointer focus:outline-none focus:border-[#FF5C00]"
                    >
                      <option value={5}>Toutes les 5 minutes</option>
                      <option value={15}>Toutes les 15 minutes (recommandé)</option>
                      <option value={30}>Toutes les 30 minutes</option>
                      <option value={60}>Toutes les heures</option>
                      <option value={0}>Désactiver la purge auto</option>
                    </select>
                    <span className="text-[10px] text-zinc-400 block font-sans mt-0.5">Fréquence de vidage automatique</span>
                  </div>
                </div>
              </div>

              {/* Save bar */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-white uppercase block">Sauvegarde de la configuration</span>
                  <p className="text-[10px] text-zinc-500 font-sans">
                    Sauvegardez vos modifications pour les rendre visibles en production sur la page d'accueil de FIDFUD.
                  </p>
                </div>
                <button 
                  onClick={async () => {
                    if (onSaveDesignSettings) {
                      const success = await onSaveDesignSettings(designSettings);
                      if (success) {
                        alert('Félicitations ! Les paramètres de votre page d\'Accueil ont été enregistrés avec succès sur Firebase Firestore ! 🏡');
                      } else {
                        alert('Enregistrement réussi localement.');
                      }
                    } else {
                      alert('Enregistré localement.');
                    }
                  }}
                  className="bg-[#FF5C00] hover:bg-[#FF3E00] text-white px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-wider shadow-lg shadow-[#FF5C00]/25 cursor-pointer transition-all self-start sm:self-center shrink-0"
                >
                  Sauvegarder l'Accueil
                </button>
              </div>
            </div>
          )}

          {/* 2. ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* Filter */}
              <div className="flex gap-3 max-w-md">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Filtrer les commandes par ID ou restaurant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Orders Grid */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-950/40 border-b border-white/5 text-zinc-400 uppercase font-bold text-[10px] tracking-wider">
                      <th className="p-4">Numéro</th>
                      <th className="p-4">Restaurant</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Montant</th>
                      <th className="p-4">Prestation</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4">Commission</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {orders
                      .filter(o => o.id.includes(searchQuery) || o.restaurantName?.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((order) => {
                        const commissionRate = order.deliveryType === 'restaurant_delivery' ? 15 : 5;
                        const subtotal = order.totalAmount - order.serviceFee;
                        const commissionTake = Number((subtotal * (commissionRate / 100)).toFixed(2));
                        
                        return (
                          <tr key={order.id} className="hover:bg-white/[0.02]">
                            <td className="p-4 font-mono font-bold text-white">{order.id}</td>
                            <td className="p-4 font-bold">{order.restaurantName || 'Restaurant'}</td>
                            <td className="p-4 font-mono text-zinc-400">{order.userId}</td>
                            <td className="p-4 font-bold text-[#FF5C00]">{order.totalAmount.toFixed(2)} €</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900 border border-white/5 uppercase">
                                {order.deliveryType === 'restaurant_delivery' ? 'Livraison' : 'Emporter'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                order.status === 'delivered' ? 'bg-green-500/15 text-green-400' :
                                order.status === 'cancelled' ? 'bg-red-500/15 text-red-400' :
                                order.status === 'pending' ? 'bg-yellow-500/15 text-yellow-500 animate-pulse' :
                                'bg-orange-500/15 text-orange-400'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-zinc-400">
                              {commissionTake} € ({commissionRate}%)
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end items-center gap-1.5">
                                <select
                                  value={order.status}
                                  onChange={async (e) => {
                                    const nextStatus = e.target.value as OrderStatus;
                                    await fetch(`/api/orders/${order.id}/status`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: nextStatus })
                                    });
                                    onRefreshData();
                                  }}
                                  className="bg-zinc-950 border border-white/5 rounded px-2 py-1 text-[10px] font-bold text-white focus:outline-none focus:border-[#FF5C00]"
                                >
                                  <option value="pending">En attente</option>
                                  <option value="preparing">Préparation</option>
                                  <option value="ready">Prête</option>
                                  <option value="delivered">Livrée (Validée)</option>
                                  <option value="cancelled">Annulée</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="p-1 bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white rounded transition-colors cursor-pointer"
                                  title="Supprimer cette commande"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. RESTAURANTS TAB */}
          {activeTab === 'restaurants' && (
            <div className="space-y-6">
              
              {/* AI Auto-Extraction Tool Panel */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-[#FF5C00]" />
                    Import Officiel & Extraction Réelle (Crawler Multi-Pages & PDF)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Saisissez l'URL officielle du restaurant : le crawler explore automatiquement le domaine (jusqu'à 10 pages internes), extrait le logo officiel, la bannière haute définition, la galerie photos, l'adresse avec géolocalisation réelle, les contacts directs (téléphone, email) et le menu complet (HTML & PDF) avec prix réels.
                  </p>
                </div>

                <form onSubmit={handleExtractWebsite} className="flex flex-col sm:flex-row gap-2.5">
                  <input 
                    type="text" 
                    required
                    value={websiteUrlToExtract}
                    onChange={(e) => setWebsiteUrlToExtract(e.target.value)}
                    placeholder="https://peppepizzeria.fr (ou plusieurs URLs de restaurants)"
                    className="flex-1 bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                    disabled={isExtractingWebsite}
                  />
                  <button
                    type="submit"
                    disabled={isExtractingWebsite}
                    className="bg-[#FF5C00] hover:bg-[#E04F00] text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 font-sans"
                  >
                    {isExtractingWebsite ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Scraping IA en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        Créer le Restaurant par IA
                      </>
                    )}
                  </button>
                </form>

                {isExtractingWebsite && (
                  <div className="p-3 bg-zinc-950 rounded-xl border border-[#FF5C00]/10 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#FF5C00] animate-ping" />
                    <p className="text-[11px] text-[#FF5C00] font-sans font-bold">{extractionStatusText}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                <button
                  id="restaurant-tab-import-from-url-btn"
                  onClick={() => {
                    setImportUrlPrefill(websiteUrlToExtract || '');
                    setIsImportUrlModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-orange-600 via-[#FF5C00] to-amber-500 hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#FF5C00]/25 font-sans border border-orange-400/30"
                >
                  <Globe size={14} className="text-white animate-pulse" />
                  <span>Import from URL</span>
                  <span className="bg-white/20 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">IA Scraper</span>
                </button>
                <button
                  onClick={() => {
                    handleOpenAddRest();
                    setShowBulkRestForm(false);
                    setShowRadarForm(false);
                  }}
                  className="bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer font-sans"
                >
                  <Plus size={14} />
                  Saisie Manuelle Classique
                </button>
                <button
                  onClick={() => {
                    setShowBulkRestForm(prev => !prev);
                    setShowRestaurantForm(false);
                    setShowRadarForm(false);
                  }}
                  className="bg-[#0C0C0E] border border-white/5 hover:bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer font-sans"
                >
                  <Sparkles size={14} />
                  Créer par Lot (Bulk Import)
                </button>
                <button
                  onClick={() => {
                    setShowRadarForm(prev => !prev);
                    setShowBulkRestForm(false);
                    setShowRestaurantForm(false);
                  }}
                  className="bg-gradient-to-r from-orange-600 to-[#FF5C00] hover:opacity-90 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg font-sans"
                >
                  <Compass size={14} />
                  Radar Sourcing Google Maps & Gemini (Parano)
                </button>
              </div>

              {/* Bulk Form container */}
              {showBulkRestForm && (
                <form onSubmit={handleBulkAddRestaurants} className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 max-w-2xl space-y-5">
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <h4 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
                      <Sparkles className="text-[#FF5C00]" size={16} />
                      Ajout de Restaurants en Masse (Multi-création)
                    </h4>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Noms des restaurants (un par ligne)</label>
                      <textarea
                        required
                        value={bulkNamesText}
                        onChange={(e) => setBulkNamesText(e.target.value)}
                        placeholder={`Trattoria Bella\nSushi Express\nLe bistrot parisien\nBurger Lab Paris`}
                        rows={5}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Ville</label>
                        <input
                          type="text"
                          required
                          value={bulkCity}
                          onChange={(e) => setBulkCity(e.target.value)}
                          placeholder="Saisissez une ville (ex: Paris, Lyon, Nice...)"
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Catégorie culinaire</label>
                        <select
                          value={bulkCategory}
                          onChange={(e) => setBulkCategory(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                        >
                          <option value="Italien">🇮🇹 Italien</option>
                          <option value="Japonais">🇯🇵 Japonais / Sushi</option>
                          <option value="Burgers">🍔 Burgers & Street Food</option>
                          <option value="Français">🇫🇷 Français traditionnel</option>
                          <option value="Café">☕ Café / Brunch</option>
                          <option value="Tex-Mex">🇲🇽 Tex-Mex</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Arrondissement / Quartier (Optionnel)</label>
                        <input
                          type="text"
                          value={bulkDistrict}
                          onChange={(e) => setBulkDistrict(e.target.value)}
                          placeholder="Ex: 11e Arr. ou Part-Dieu"
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Formule d'abonnement initiale</label>
                        <select
                          value={bulkSubscriptionTier}
                          onChange={(e) => setBulkSubscriptionTier(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                        >
                          <option value="free">Formule Gratuite (Découverte)</option>
                          <option value="pro">Formule PRO (Booster)</option>
                          <option value="gold">Formule GOLD Elite</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isBulkCreating}
                      className="bg-[#FF5C00] hover:bg-[#E04F00] text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 w-full disabled:opacity-50"
                    >
                      {isBulkCreating ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Création du lot en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          Créer le Lot de Restaurants
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Google Maps Radar Sourcing container */}
              {showRadarForm && (
                <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Compass className="text-[#FF5C00]" size={18} />
                      <h4 className="text-sm font-black text-white uppercase italic tracking-wider">
                        Radar de Sourcing Google Maps & Gemini (Parano)
                      </h4>
                    </div>
                    <span className="text-[9px] bg-[#FF5C00]/10 text-[#FF5C00] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Mode IA Grounded
                    </span>
                  </div>

                  <form onSubmit={handleRadarScan} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                      <input
                        type="text"
                        required
                        value={radarCity}
                        onChange={(e) => setRadarCity(e.target.value)}
                        placeholder="Entrez le nom d'une ville (ex: Paris, Nice, Lyon, Bordeaux, Toulouse...)"
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isRadarScanning}
                      className="bg-[#FF5C00] hover:bg-[#E04F00] disabled:opacity-50 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg font-sans shrink-0"
                    >
                      {isRadarScanning ? (
                        <>
                          <RefreshCw className="animate-spin" size={13} />
                          Scan Radar en Cours...
                        </>
                      ) : (
                        <>
                          <Compass size={13} />
                          Activer le Radar Sourcing
                        </>
                      )}
                    </button>
                  </form>

                  {/* Progress logs & scanning animations */}
                  {isRadarScanning && (
                    <div className="p-5 bg-zinc-950 rounded-2xl border border-white/5 flex flex-col items-center justify-center py-8 space-y-4">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-[#FF5C00]/20 animate-ping duration-1000" />
                        <div className="absolute inset-2 rounded-full border border-orange-500/30 animate-pulse duration-700" />
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 flex items-center justify-center">
                          <Compass className="text-white animate-spin" size={16} style={{ animationDuration: '3s' }} />
                        </div>
                      </div>
                      <div className="text-center space-y-1.5 max-w-md">
                        <p className="text-xs font-black text-white uppercase tracking-wider">Balayage satellite en cours à {radarCity}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">Connexion sécurisée aux serveurs Google & modèle Gemini-3.5-Flash</p>
                      </div>
                      <div className="w-full max-w-sm bg-zinc-900 rounded-xl p-3 border border-white/5 font-mono text-[9px] text-zinc-400 space-y-1 text-left">
                        {radarProgress.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="text-[#FF5C00]">❯</span>
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Results Terminal (Map + List) */}
                  {!isRadarScanning && radarResults.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left: filters and listing */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 space-y-3 text-left">
                          <div className="flex justify-between items-center">
                            <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                              Filtres de Sourcing
                            </h5>
                            <span className="text-[10px] font-mono font-bold text-[#FF5C00]">
                              {radarResults.filter(r => {
                                const matchCat = radarCategoryFilter === 'All' || r.category === radarCategoryFilter;
                                const matchDist = radarDistrictFilter === 'All' || r.district === radarDistrictFilter;
                                const matchText = radarSearchText === '' || r.name.toLowerCase().includes(radarSearchText.toLowerCase()) || r.description.toLowerCase().includes(radarSearchText.toLowerCase());
                                return matchCat && matchDist && matchText;
                              }).length} pépites trouvées
                            </span>
                          </div>

                          <input
                            type="text"
                            value={radarSearchText}
                            onChange={(e) => setRadarSearchText(e.target.value)}
                            placeholder="Rechercher par mot-clé..."
                            className="w-full bg-zinc-900 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Secteur / Quartier</label>
                              <select
                                value={radarDistrictFilter}
                                onChange={(e) => setRadarDistrictFilter(e.target.value)}
                                className="w-full bg-zinc-900 border border-white/5 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                              >
                                <option value="All">Tous les secteurs</option>
                                {Array.from(new Set(radarResults.map(r => r.district))).filter(Boolean).map((dist, idx) => (
                                  <option key={idx} value={dist}>{dist}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Catégorie culinaire</label>
                              <select
                                value={radarCategoryFilter}
                                onChange={(e) => setRadarCategoryFilter(e.target.value)}
                                className="w-full bg-zinc-900 border border-white/5 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                              >
                                <option value="All">Toutes catégories</option>
                                {Array.from(new Set(radarResults.map(r => r.category))).filter(Boolean).map((cat, idx) => (
                                  <option key={idx} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* List cards */}
                        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                          {radarResults.filter(r => {
                            const matchCat = radarCategoryFilter === 'All' || r.category === radarCategoryFilter;
                            const matchDist = radarDistrictFilter === 'All' || r.district === radarDistrictFilter;
                            const matchText = radarSearchText === '' || r.name.toLowerCase().includes(radarSearchText.toLowerCase()) || r.description.toLowerCase().includes(radarSearchText.toLowerCase());
                            return matchCat && matchDist && matchText;
                          }).map((item, idx) => {
                            const isSelected = selectedRadarResult && selectedRadarResult.name === item.name;
                            const isImported = importedRadarIds.includes(item.name) || restaurants.some(r => r.name.toLowerCase() === item.name.toLowerCase());
                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedRadarResult(item)}
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left space-y-1.5 ${
                                  isSelected 
                                    ? 'bg-[#FF5C00]/10 border-[#FF5C00]' 
                                    : 'bg-zinc-950 border-white/5 hover:bg-zinc-900'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h5 className="text-xs font-black text-white font-sans">{item.name}</h5>
                                    <p className="text-[9px] text-[#FF5C00] font-sans font-bold uppercase tracking-wider">
                                      {item.category} • {item.district}
                                    </p>
                                  </div>
                                  {isImported ? (
                                    <span className="text-[8px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                                      ✓ Importé
                                    </span>
                                  ) : (
                                    <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                                      Sourcing Radar
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed font-sans">
                                  {item.description}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Map and detailed inspector */}
                      <div className="lg:col-span-7 flex flex-col space-y-4">
                        
                        {/* Map viewport */}
                        <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-white/5 bg-zinc-950">
                          {/* Leaflet Map Div Container */}
                          <div 
                            id="radar-leaflet-map" 
                            className="w-full h-full z-10"
                          />
                        </div>

                        {/* Detailed inspector drawer below map */}
                        {selectedRadarResult ? (
                          <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 space-y-3.5 text-left">
                            <div className="flex justify-between items-start border-b border-white/5 pb-2.5">
                              <div>
                                <h4 className="text-sm font-black text-white font-sans">{selectedRadarResult.name}</h4>
                                <p className="text-[10px] text-[#FF5C00] font-bold font-sans italic">{selectedRadarResult.slogan}</p>
                              </div>
                              <span className="text-[9px] font-mono bg-zinc-900 border border-white/5 px-2 py-0.5 rounded text-zinc-400">
                                {selectedRadarResult.district}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] font-sans">
                              <div className="space-y-1">
                                <span className="text-zinc-500 font-bold block uppercase tracking-wider">Cuisine & Catégorie</span>
                                <span className="text-white text-xs">{selectedRadarResult.category}</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-zinc-500 font-bold block uppercase tracking-wider">Adresse</span>
                                <span className="text-zinc-300 text-[10px] leading-tight block">{selectedRadarResult.address}</span>
                              </div>
                            </div>

                            <div className="space-y-1 text-[10px]">
                              <span className="text-zinc-500 font-bold block uppercase tracking-wider font-sans">Description & Analyse IA</span>
                              <p className="text-zinc-300 font-sans leading-relaxed text-[11px]">
                                {selectedRadarResult.description}
                              </p>
                            </div>

                            {selectedRadarResult.website && (
                              <div className="text-[10px] font-mono flex items-center gap-1.5">
                                <span className="text-zinc-500 font-sans font-bold uppercase tracking-wider">Site Web :</span>
                                <a href={selectedRadarResult.website} target="_blank" rel="noopener noreferrer" className="text-[#FF5C00] hover:underline truncate">
                                  {selectedRadarResult.website}
                                </a>
                              </div>
                            )}

                            <div className="pt-2 border-t border-white/5">
                              {importedRadarIds.includes(selectedRadarResult.name) || restaurants.some(r => r.name.toLowerCase() === selectedRadarResult.name.toLowerCase()) ? (
                                <div className="w-full bg-green-500/10 border border-green-500/20 text-green-400 p-2.5 rounded-xl text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 font-sans">
                                  <CheckCircle size={14} />
                                  Intégré & Publié au Feed Fidfud
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={importingRadarId !== null}
                                  onClick={() => handleImportRadarResult(selectedRadarResult)}
                                  className="w-full bg-[#FF5C00] hover:bg-[#E04F00] text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg font-sans"
                                >
                                  {importingRadarId === selectedRadarResult.name ? (
                                    <>
                                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      Importation & Publication IA...
                                    </>
                                  ) : (
                                    <>
                                      <Plus size={14} />
                                      Importer & Intégrer en 1-Clic
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 bg-zinc-950/40 rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center space-y-2 py-12">
                            <Compass className="text-zinc-700 animate-pulse" size={24} />
                            <p className="text-[11px] font-sans font-bold text-zinc-500">
                              Sélectionnez une pépite sur la carte ou dans la liste pour l'inspecter et l'importer.
                            </p>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* Form container */}
              {showRestaurantForm && (
                <form id="restaurant-edit-form-container" onSubmit={handleSaveRestaurant} className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 max-w-2xl space-y-5">
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <h4 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
                      <Store className="text-[#FF5C00]" size={16} />
                      {editingRestaurant ? 'Modifier le restaurant' : 'Ajouter un nouveau restaurant'}
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-white/5 px-2 py-0.5 rounded">
                      {editingRestaurant ? `ID: ${editingRestaurant.id}` : 'Nouveau'}
                    </span>
                  </div>
                  
                  {/* Section 1: Identité & Catégories Multiples */}
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-bold text-[#FF5C00] uppercase tracking-wider flex items-center gap-1.5">
                      <span>1.</span> Identité & Catégories du Restaurant
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Nom complet (Public)</label>
                        <input 
                          id="restaurant-name-input"
                          type="text" 
                          required
                          value={restName}
                          onChange={(e) => setRestName(e.target.value)}
                          placeholder="ex: Pizzeria Bella Italia"
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Petit nom / Surnom (Shorthand)</label>
                        <input 
                          type="text" 
                          value={restShortName}
                          onChange={(e) => setRestShortName(e.target.value)}
                          placeholder="ex: Bella Italia"
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>
                    </div>

                    {/* Multi-Categories Component */}
                    <div className="space-y-2 bg-zinc-950/80 p-3.5 rounded-2xl border border-white/10">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-zinc-200 font-black uppercase tracking-wider flex items-center gap-1.5">
                          <span>🏷️</span> Catégories culinaires de l'établissement ({restCategories.length})
                        </label>
                        <span className="text-[8.5px] text-zinc-500 font-mono">Ajoutez autant de catégories que souhaité</span>
                      </div>

                      {/* Selected Category Badges */}
                      <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-zinc-900 border border-white/5 rounded-xl items-center">
                        {restCategories.length === 0 ? (
                          <span className="text-[10px] text-zinc-500 italic">Aucune catégorie sélectionnée</span>
                        ) : (
                          restCategories.map((cat, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FF5C00]/15 text-[#FF5C00] border border-[#FF5C00]/30 shadow-sm animate-fade-in"
                            >
                              {cat}
                              <button
                                type="button"
                                onClick={() => setRestCategories(prev => prev.filter((_, i) => i !== idx))}
                                className="text-zinc-400 hover:text-white hover:bg-red-500/20 rounded p-0.5 ml-1 transition-colors cursor-pointer"
                                title="Supprimer cette catégorie"
                              >
                                ✕
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      {/* Preset Add & Custom Input */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1">
                          <span className="text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider block">Ajouter une catégorie prédéfinie</span>
                          <select
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && !restCategories.includes(val)) {
                                setRestCategories(prev => [...prev, val]);
                              }
                            }}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-[#FF5C00]"
                          >
                            <option value="">-- Choisir dans la liste --</option>
                            {[
                              'Italien & Pizza 🍕', 'Japonais & Ramen 🍜', 'Burgers & Street Food 🍔',
                              'Français & Traditionnel 🥩', 'Mexicain & Tacos 🌮', 'Café & Goûter 🥞',
                              'Salades & Healthy 🥗', 'Asiatique & Wok 🥢', 'Indien & Curry 🍛',
                              'Kebab & Grill 🥙', 'Pâtisserie & Desserts 🍰', 'Halal 🌙',
                              'Cascher ✡️', 'Bio & Végétalien 🌿', 'Brunch & Petit Déjeuner ☕',
                              'Tapas & Apéro 🍷', 'Africain & Grillades 🌍', 'Créole & Antillais 🌴'
                            ].filter(preset => !restCategories.includes(preset)).map(preset => (
                              <option key={preset} value={preset}>{preset}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider block">Catégorie sur-mesure</span>
                          <div className="flex gap-1.5">
                            <input 
                              type="text"
                              value={customCategoryInput}
                              onChange={(e) => setCustomCategoryInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (customCategoryInput.trim() && !restCategories.includes(customCategoryInput.trim())) {
                                    setRestCategories(prev => [...prev, customCategoryInput.trim()]);
                                    setCustomCategoryInput('');
                                  }
                                }
                              }}
                              placeholder="ex: Bistronomique..."
                              className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (customCategoryInput.trim() && !restCategories.includes(customCategoryInput.trim())) {
                                  setRestCategories(prev => [...prev, customCategoryInput.trim()]);
                                  setCustomCategoryInput('');
                                }
                              }}
                              className="bg-zinc-800 hover:bg-[#FF5C00] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                            >
                              + Ajouter
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Slogan, Description & SEO Generator */}
                    <div className="bg-gradient-to-r from-purple-950/40 via-zinc-950 to-orange-950/30 p-4 rounded-2xl border border-purple-500/20 space-y-3 shadow-md">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-2.5">
                        <div>
                          <h6 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                            <Sparkles size={15} className="text-purple-400 animate-pulse" />
                            Slogan, Description & SEO
                          </h6>
                          <p className="text-[9.5px] text-zinc-400">Générez et optimisez automatiquement vos contenus marketing avec Gemini AI !</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleGenerateAiCopy}
                          disabled={isGeneratingAiCopy}
                          className="bg-gradient-to-r from-purple-600 to-[#FF5C00] hover:opacity-90 text-white px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg transition-all shrink-0 border border-white/20 disabled:opacity-50"
                        >
                          {isGeneratingAiCopy ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Génération IA...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={13} />
                              <span>✨ Générer Slogan, Description & SEO (Gemini 🤖)</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {/* Slogan */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider flex items-center justify-between">
                            <span>Accroche / Slogan court</span>
                            <span className="text-[8px] font-mono text-zinc-500">Visible sur les cartes</span>
                          </label>
                          <input 
                            type="text" 
                            value={restSlogan} 
                            onChange={(e) => setRestSlogan(e.target.value)}
                            placeholder="ex: L'authenticité de la gastronomie thaïlandaise au cœur de Paris 🇹🇭✨"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                          />
                        </div>

                        {/* Description complète */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider flex items-center justify-between">
                            <span>Description complète de l'établissement</span>
                            <span className="text-[8px] font-mono text-zinc-500">Histoire, spécialités & savoir-faire</span>
                          </label>
                          <textarea 
                            value={restDescription}
                            onChange={(e) => setRestDescription(e.target.value)}
                            placeholder="Racontez l'histoire du restaurant, ses plats faits maison et son ambiance..."
                            rows={3}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00] resize-none"
                          />
                        </div>

                        {/* SEO Meta & Keywords */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
                          <div className="space-y-1">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">
                              🔍 Mots-clés SEO (Google)
                            </label>
                            <div className="flex flex-wrap gap-1 p-2 bg-zinc-900 border border-white/10 rounded-xl min-h-[36px] items-center">
                              {restSeoKeywords.length === 0 ? (
                                <span className="text-[9px] text-zinc-500 italic">Aucun mot-clé généré</span>
                              ) : (
                                restSeoKeywords.map((kw, i) => (
                                  <span key={i} className="text-[9px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    #{kw}
                                    <button 
                                      type="button" 
                                      onClick={() => setRestSeoKeywords(prev => prev.filter((_, idx) => idx !== i))}
                                      className="hover:text-white"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">
                              🌐 Méta Description SEO (Google Search)
                            </label>
                            <input
                              type="text"
                              value={restSeoMetaDescription}
                              onChange={(e) => setRestSeoMetaDescription(e.target.value)}
                              placeholder="Méta description optimisée pour le référencement Google..."
                              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Contact & Logistique */}
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <h5 className="text-[10px] font-bold text-[#FF5C00] uppercase tracking-wider">2. Coordonnées & Logistique</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Adresse email</label>
                        <input 
                          type="email" 
                          value={restEmail}
                          onChange={(e) => setRestEmail(e.target.value)}
                          placeholder="contact@restaurant.com"
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Téléphone de contact</label>
                        <input 
                          type="tel" 
                          value={restPhone}
                          onChange={(e) => setRestPhone(e.target.value)}
                          placeholder="+33 1 23 45 67 89"
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Livraison Comm. (%)</label>
                        <input 
                          type="number" 
                          required
                          value={restCommDelivery}
                          onChange={(e) => setRestCommDelivery(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">À Emporter Comm. (%)</label>
                        <input 
                          type="number" 
                          required
                          value={restCommCollect}
                          onChange={(e) => setRestCommCollect(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Stripe Connect ID (Simulé)</label>
                        <input 
                          type="text" 
                          value={restStripe}
                          onChange={(e) => setRestStripe(e.target.value)}
                          placeholder="acct_..."
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Abonnement Test</label>
                        <select 
                          value={restSubscriptionTier}
                          onChange={(e) => setRestSubscriptionTier(e.target.value as 'free' | 'pro' | 'gold')}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        >
                          <option value="free">FID'FREE (Standard) ❌</option>
                          <option value="pro">FID'PRO (Pro AI) ⭐</option>
                          <option value="gold">FID'GOLD (Gold AI) 👑</option>
                        </select>
                      </div>
                    </div>

                    {/* Physical Address & Auto Geocoding Button */}
                    <div className="space-y-2 bg-zinc-950/80 p-3.5 rounded-2xl border border-white/10">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] text-zinc-300 font-bold uppercase tracking-wider">Adresse complète physique de l'établissement</label>
                          <button
                            type="button"
                            onClick={() => handleGeocodeAddress()}
                            disabled={isGeocodingAddress}
                            className="text-[9.5px] bg-[#FF5C00]/15 hover:bg-[#FF5C00] text-[#FF5C00] hover:text-white border border-[#FF5C00]/30 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isGeocodingAddress ? (
                              <>
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                <span>Localisation GPS...</span>
                              </>
                            ) : (
                              <>
                                <span>⚡ Localiser & GPS Auto</span>
                              </>
                            )}
                          </button>
                        </div>
                        <input 
                          type="text" 
                          required
                          value={restAddress}
                          onChange={(e) => setRestAddress(e.target.value)}
                          onBlur={() => {
                            if (restAddress && restAddress.length > 5 && (!restLatitude || restLatitude === 48.8566)) {
                              handleGeocodeAddress(restAddress);
                            }
                          }}
                          placeholder="ex: 14 Rue de la Michodière, 75002 Paris"
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>

                      {/* Status banner for Geocoding */}
                      {geocodedStatusText && (
                        <div className="text-[10px] font-mono p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 flex items-center justify-between">
                          <span>{geocodedStatusText}</span>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${restLatitude},${restLongitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#FF5C00] hover:underline font-bold text-[9px] uppercase tracking-wider"
                          >
                            🗺️ Google Maps ↗
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 3: Médias */}
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <h5 className="text-[10px] font-bold text-[#FF5C00] uppercase tracking-wider">3. Visuels (Logo, Bannière & Vidéo)</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Logo du restaurant</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={restLogoUrl}
                            onChange={(e) => setRestLogoUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/... (Logo carré)"
                            className="flex-1 bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                          />
                          <button
                            type="button"
                            title="Téléverser un fichier de Logo"
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
                                      setRestLogoUrl(data.url);
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
                            className="bg-zinc-900 hover:bg-zinc-850 border border-white/5 hover:border-[#FF5C00]/40 text-white px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            📁
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Bannière du restaurant</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={restBannerUrl}
                            onChange={(e) => setRestBannerUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/... (Bannière large)"
                            className="flex-1 bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                          />
                          <button
                            type="button"
                            title="Téléverser un fichier de Bannière"
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
                                      setRestBannerUrl(data.url);
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
                            className="bg-zinc-900 hover:bg-zinc-850 border border-white/5 hover:border-[#FF5C00]/40 text-white px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            📁
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Video TikTok & Multi-Categories Manager for Video */}
                    <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-zinc-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span>🎬</span> Vidéo TikTok / Reel attachée à l'établissement
                        </label>
                        <span className="text-[8.5px] font-mono text-zinc-500">Flux continu Fidfud</span>
                      </div>

                      {/* Video Category Badges */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] text-purple-300 font-bold uppercase tracking-wider">
                            🏷️ Catégories attribuées à la vidéo ({restVideoCategories.length})
                          </label>
                          <span className="text-[8px] font-mono text-zinc-500">Taggez la vidéo pour les filtres du feed</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-zinc-900 border border-white/5 rounded-xl items-center">
                          {restVideoCategories.length === 0 ? (
                            <span className="text-[9px] text-zinc-500 italic">Aucune catégorie vidéo attribuée</span>
                          ) : (
                            restVideoCategories.map((vcat, vidx) => (
                              <span key={vidx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm">
                                {vcat}
                                <button
                                  type="button"
                                  onClick={() => setRestVideoCategories(prev => prev.filter((_, i) => i !== vidx))}
                                  className="text-zinc-400 hover:text-white rounded p-0.5 ml-1 transition-colors cursor-pointer"
                                >
                                  ✕
                                </button>
                              </span>
                            ))
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <select
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && !restVideoCategories.includes(val)) {
                                setRestVideoCategories(prev => [...prev, val]);
                              }
                            }}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
                          >
                            <option value="">-- Ajouter une catégorie vidéo --</option>
                            {[
                              'Dégustation 😋', 'Crash Test 💥', 'Recette & Cuisine 👨‍🍳', 'Ambiance & Décor 🌆',
                              'Review TikTok 📱', 'Tendance Food 🔥', 'Les Coulisses 🎬', 'Avis Client 🌟'
                            ].filter(preset => !restVideoCategories.includes(preset)).map(preset => (
                              <option key={preset} value={preset}>{preset}</option>
                            ))}
                          </select>

                          <div className="flex gap-1.5">
                            <input 
                              type="text"
                              value={customVideoCategoryInput}
                              onChange={(e) => setCustomVideoCategoryInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (customVideoCategoryInput.trim() && !restVideoCategories.includes(customVideoCategoryInput.trim())) {
                                    setRestVideoCategories(prev => [...prev, customVideoCategoryInput.trim()]);
                                    setCustomVideoCategoryInput('');
                                  }
                                }
                              }}
                              placeholder="ex: Live Chef..."
                              className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (customVideoCategoryInput.trim() && !restVideoCategories.includes(customVideoCategoryInput.trim())) {
                                  setRestVideoCategories(prev => [...prev, customVideoCategoryInput.trim()]);
                                  setCustomVideoCategoryInput('');
                                }
                              }}
                              className="bg-zinc-800 hover:bg-purple-600 text-white px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                            >
                              + Ajouter
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Pre-filled Video Selector */}
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { label: '🍕 Pizza au Four', url: STABLE_CULINARY_FALLBACK_VIDEOS[0], desc: 'Pizza croustillante' },
                          { label: '🍜 Ramen Fumant', url: STABLE_CULINARY_FALLBACK_VIDEOS[1], desc: 'Bouillon coulant' },
                          { label: '🍔 Double Smash', url: STABLE_CULINARY_FALLBACK_VIDEOS[2], desc: 'Viande smashée' },
                          { label: '🥞 Pancakes Sirop', url: STABLE_CULINARY_FALLBACK_VIDEOS[3], desc: 'Sucre coulant' },
                          { label: '🍣 Sauce Sushi', url: STABLE_CULINARY_FALLBACK_VIDEOS[4], desc: 'Sushi dipping' },
                          { label: '🔥 Chef Flamme', url: STABLE_CULINARY_FALLBACK_VIDEOS[5], desc: 'Chef en cuisine' }
                        ].map((item) => (
                          <button
                            type="button"
                            key={item.label}
                            onClick={() => {
                              setRestVideoUrl(item.url);
                              setRestVideoTitle(`Succulente démonstration gourmande - ${item.desc} ! 🔥🎥`);
                            }}
                            className={`p-2 rounded-xl border text-left transition-all ${
                              restVideoUrl === item.url 
                                ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-white' 
                                : 'bg-zinc-900 border-white/5 hover:border-white/10 text-zinc-300'
                            }`}
                          >
                            <span className="text-[10px] font-black block">{item.label}</span>
                            <span className="text-[8px] text-zinc-500 font-mono block truncate">{item.desc}</span>
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        <div className="space-y-1">
                          <label className="text-[8px] text-zinc-500 font-bold uppercase">URL Vidéo Personnalisée (Directe ou Instagram 📸)</label>
                          <div className="flex gap-1.5">
                            <input 
                              type="text" 
                              value={restVideoUrl}
                              onChange={(e) => setRestVideoUrl(e.target.value)}
                              placeholder="https://... ou lien Instagram 📸 ou 📁"
                              className="flex-1 bg-zinc-900 border border-white/5 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              title="Téléverser une vidéo"
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
                                        setRestVideoUrl(data.url);
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
                              className="bg-zinc-800 hover:bg-zinc-750 border border-white/5 text-white px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              📁
                            </button>
                          </div>
                          {restVideoUrl && (restVideoUrl.includes('instagram.com') || restVideoUrl.includes('instagr.am')) && (
                            <div className="text-[9px] text-[#FF5C00] font-mono flex items-center gap-1 mt-1 bg-[#FF5C00]/5 p-1.5 rounded border border-[#FF5C00]/10">
                              <span>📸</span>
                              <span>Lien Instagram détecté ! Le lecteur de feed Fidfud intégrera ce Reel automatiquement.</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] text-zinc-500 font-bold uppercase">Légende de la vidéo</label>
                          <input 
                            type="text" 
                            value={restVideoTitle}
                            onChange={(e) => setRestVideoTitle(e.target.value)}
                            placeholder="ex: Nos ramens faits à la main avec amour..."
                            className="w-full bg-zinc-900 border border-white/5 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Organisation & Position */}
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <h5 className="text-[10px] font-bold text-[#FF5C00] uppercase tracking-wider">4. Disposition & Géolocalisation</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Nom du Stand / Shop (ex: Boutique Voltaire)</label>
                        <input 
                          type="text" 
                          value={restDispositionShop}
                          onChange={(e) => setRestDispositionShop(e.target.value)}
                          placeholder="ex: Lab Bastille"
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>
                      <div className="flex flex-col gap-3 pt-4 sm:pt-5">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={restIsFavorite}
                            onChange={(e) => setRestIsFavorite(e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 bg-zinc-950 text-[#FF5C00] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                            Mettre en avant dans les Favoris ⭐
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={restIsPublished}
                            onChange={(e) => setRestIsPublished(e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 bg-zinc-950 text-[#FF5C00] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${restIsPublished ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`} />
                            Restaurant Publié (visible par les clients) 🌐
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="bg-zinc-950/60 p-3 rounded-2xl border border-white/5 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Position GPS de l'établissement</label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => { setRestLatitude(48.8524); setRestLongitude(2.3705); }}
                            className="text-[8px] bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white px-1.5 py-0.5 rounded font-mono"
                          >
                            Set Paris 11e
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRestLatitude(48.8665); setRestLongitude(2.3361); }}
                            className="text-[8px] bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white px-1.5 py-0.5 rounded font-mono"
                          >
                            Set Paris 1er
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="block text-[8px] text-zinc-500 font-bold uppercase font-mono">Latitude</span>
                          <input 
                            type="number" 
                            step="any"
                            value={restLatitude}
                            onChange={(e) => setRestLatitude(Number(e.target.value))}
                            className="w-full bg-zinc-900 border border-white/5 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="block text-[8px] text-zinc-500 font-bold uppercase font-mono">Longitude</span>
                          <input 
                            type="number" 
                            step="any"
                            value={restLongitude}
                            onChange={(e) => setRestLongitude(Number(e.target.value))}
                            className="w-full bg-zinc-900 border border-white/5 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Boutons Formulaire */}
                  <div className="flex gap-2 justify-end pt-3 border-t border-white/5">
                    <button 
                      type="button" 
                      onClick={() => setShowRestaurantForm(false)}
                      className="bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSavingRestaurant}
                      className={`bg-[#FF5C00] hover:bg-[#E04F00] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_10px_20px_rgba(255,92,0,0.15)] ${
                        isSavingRestaurant ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      {isSavingRestaurant ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </form>
              )}

              {/* Bulk operations and Database Maintenance controls */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Trash2 size={13} className="text-[#FF5C00]" />
                    Actions en Masse & Maintenance de la Base
                  </h4>
                  <p className="text-[10px] text-zinc-400 font-sans">
                    Sélectionnez des restaurants à supprimer en lot, ou synchronisez Firestore pour effacer tous les restaurants obsolètes.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {/* Select / Deselect All */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedRestIds.length === restaurants.length) {
                        setSelectedRestIds([]);
                      } else {
                        setSelectedRestIds(restaurants.map(r => r.id));
                      }
                    }}
                    className="bg-zinc-950 border border-white/5 hover:border-white/10 text-zinc-300 px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer font-sans"
                  >
                    {selectedRestIds.length === restaurants.length ? 'Désélectionner Tout' : 'Tout Sélectionner'}
                  </button>

                  {/* Bulk Delete Button */}
                  {selectedRestIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkDeleteRestaurants}
                      disabled={isBulkDeleting}
                      className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_4px_12px_rgba(220,38,38,0.25)] font-sans"
                    >
                      {isBulkDeleting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Suppression...
                        </>
                      ) : (
                        <>
                          <Trash2 size={12} />
                          Supprimer la Sélection ({selectedRestIds.length})
                        </>
                      )}
                    </button>
                  )}

                  {/* Database Sync / Cleanup Button */}
                  <button
                    type="button"
                    onClick={handleDatabaseCleanup}
                    disabled={isCleaningDatabase}
                    className="bg-zinc-950 border border-amber-500/20 hover:border-amber-500/40 text-amber-500 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 font-sans"
                  >
                    {isCleaningDatabase ? (
                      <>
                        <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        Nettoyage...
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} />
                        Effacer les restaurants hors Admin (Nettoyage Firestore)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Restaurant list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {restaurants.map((rest) => (
                  <div key={rest.id} className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-5 flex flex-col justify-between overflow-hidden relative group">
                    
                    {/* Highlight Badge if Favorite */}
                    {rest.isFavorite && (
                      <div className="absolute top-0 right-0 bg-[#FF5C00] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1 z-10">
                        <Star size={10} fill="currentColor" />
                        Favori
                      </div>
                    )}

                    {/* Publication Status Badge with integrated Checkbox */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/5">
                      <input
                        type="checkbox"
                        checked={selectedRestIds.includes(rest.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRestIds(prev => [...prev, rest.id]);
                          } else {
                            setSelectedRestIds(prev => prev.filter(id => id !== rest.id));
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-white/20 text-[#FF5C00] focus:ring-[#FF5C00] focus:ring-offset-zinc-950 cursor-pointer accent-[#FF5C00]"
                      />
                      <span className={`text-[8px] font-black uppercase tracking-wider ${rest.isPublished !== false ? 'text-green-400' : 'text-zinc-400'}`}>
                        {rest.isPublished !== false ? '● Publié' : '○ Brouillon'}
                      </span>
                    </div>

                    <div>
                      {/* Banner and Logo Thumbnail */}
                      <div className="relative w-full h-24 bg-zinc-950 rounded-2xl overflow-hidden mb-3 border border-white/5">
                        {rest.bannerUrl ? (
                          <img src={rest.bannerUrl} alt="banner" className="w-full h-full object-cover opacity-60" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-zinc-900 to-zinc-950" />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-end gap-2.5">
                          {rest.logoUrl ? (
                            <img src={rest.logoUrl} alt="logo" className="w-10 h-10 rounded-xl object-contain bg-black border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 shrink-0 flex items-center justify-center font-bold text-white text-sm uppercase">
                              {rest.name.substring(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-white truncate drop-shadow-sm flex items-center gap-1">
                              {rest.name}
                            </h4>
                            <p className="text-[10px] text-orange-400 truncate font-sans">{rest.category || 'Italien & Pizza'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Info lines */}
                      <div className="space-y-2 text-zinc-400 mb-4 text-[11px] font-sans">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Adresse :</span>
                          <span className="text-white truncate max-w-[180px] font-medium">{rest.address}</span>
                        </div>
                        
                        {(rest.email || rest.phone) && (
                          <div className="p-2 rounded-xl bg-zinc-950/40 border border-white/2 space-y-1">
                            {rest.email && (
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-600 font-bold font-mono">MAIL</span>
                                <span className="text-zinc-300 font-mono truncate max-w-[160px]">{rest.email}</span>
                              </div>
                            )}
                            {rest.phone && (
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-600 font-bold font-mono">TEL</span>
                                <span className="text-zinc-300 font-mono">{rest.phone}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {rest.dispositionShop && (
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Shop :</span>
                            <span className="text-zinc-300 font-mono text-[10px] bg-white/5 px-2 py-0.5 rounded font-black uppercase">
                              {rest.dispositionShop}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Position :</span>
                          <span className="text-zinc-300 font-mono text-[10px]">
                            {rest.latitude?.toFixed(4)}, {rest.longitude?.toFixed(4)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] mb-4 text-zinc-400">
                        <div className="bg-zinc-950/60 p-2 rounded-lg border border-white/5">
                          <span className="block text-[8px] text-zinc-600 font-bold uppercase">Commission Liv.</span>
                          <span className="font-bold text-white">{rest.commissionRateDelivery}%</span>
                        </div>
                        <div className="bg-zinc-950/60 p-2 rounded-lg border border-white/5">
                          <span className="block text-[8px] text-zinc-600 font-bold uppercase">Commission Coll.</span>
                          <span className="font-bold text-white">{rest.commissionRateCollect}%</span>
                        </div>
                      </div>

                      {/* Collapsible Dishes List for this Restaurant */}
                      {(() => {
                        const restDishes = dishes.filter(d => d.restaurantId === rest.id);
                        const isExpanded = expandedRestDishes === rest.id;
                        return (
                          <div className="mt-2 mb-4 pt-3 border-t border-white/5 space-y-2">
                            <button
                              type="button"
                              onClick={() => setExpandedRestDishes(isExpanded ? null : rest.id)}
                              className="flex items-center justify-between w-full text-[10px] text-zinc-400 hover:text-white font-black uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-1.5">
                                🍔 Plats du Menu ({restDishes.length})
                              </span>
                              <span className="text-[9px] bg-zinc-950 px-2 py-0.5 rounded border border-white/5 text-zinc-400 font-mono">
                                {isExpanded ? 'Masquer' : 'Gérer'}
                              </span>
                            </button>
                            
                            {isExpanded && (
                              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 bg-zinc-950/60 p-2 rounded-2xl border border-white/5">
                                {restDishes.length > 0 ? (
                                  restDishes.map(dish => (
                                    <div key={dish.id} className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-white/2 text-[10px] hover:bg-zinc-900 transition-colors">
                                      <div className="flex items-center gap-2 truncate">
                                        <img 
                                          src={dish.imageUrl || (dish as any).image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'} 
                                          alt={dish.name} 
                                          className="w-7 h-7 object-cover rounded-lg border border-white/5" 
                                        />
                                        <div className="truncate min-w-0">
                                          <span className="text-zinc-300 font-bold block truncate">{dish.name}</span>
                                          <span className="text-zinc-500 font-mono text-[8px]">{dish.price.toFixed(2)} €</span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteDish(dish.id, dish.name)}
                                        className="p-1 rounded bg-zinc-950 border border-white/5 text-zinc-500 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                                        title="Supprimer ce plat"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[10px] text-zinc-500 italic p-2 text-center">Aucun plat enregistré pour ce restaurant.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-white/5">
                      <span className="text-[9px] font-mono text-zinc-600 truncate max-w-[120px]">
                        Stripe: {rest.stripeAccountId || 'Non connecté'}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEditRest(rest)}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteRestaurant(rest.id)}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. CLIENTS TAB */}
          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
                    Gestion des Comptes Utilisateurs & Rôles
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans">
                    Super-administrez tous les comptes clients, restaurateurs, livreurs et administrateurs.
                  </p>
                </div>

                <button
                  onClick={() => setShowClientForm(true)}
                  className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_10px_20px_rgba(255,92,0,0.15)]"
                >
                  <Plus size={14} />
                  Nouvel Utilisateur
                </button>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={e => setUserSearchTerm(e.target.value)}
                    placeholder="Rechercher par nom, email, téléphone..."
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 mr-1">Rôle:</span>
                  {[
                    { id: 'all', label: 'Tous' },
                    { id: 'client', label: 'Clients' },
                    { id: 'restaurant', label: 'Restaurateurs' },
                    { id: 'courier', label: 'Livreurs' },
                    { id: 'admin', label: 'Admins' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setUserRoleFilter(tab.id)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                        userRoleFilter === tab.id
                          ? 'bg-[#FF5C00] text-white shadow-md'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client Form */}
              {showClientForm && (
                <form onSubmit={handleSaveClient} className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 max-w-md space-y-4">
                  <h4 className="text-sm font-black text-white uppercase italic">Créer un profil utilisateur</h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Adresse Email</label>
                    <input 
                      type="email" 
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Rôle</label>
                      <select
                        value={clientRole}
                        onChange={(e: any) => setClientRole(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="client">Client</option>
                        <option value="restaurant">Restaurateur</option>
                        <option value="courier">Livreur</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Statut initial</label>
                      <select
                        value={clientStatus}
                        onChange={(e: any) => setClientStatus(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="active">Actif</option>
                        <option value="suspended">Suspendu</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowClientForm(false)}
                      className="bg-zinc-900 text-zinc-400 px-4 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      className="bg-[#FF5C00] text-white px-5 py-2 rounded-xl text-xs font-black uppercase cursor-pointer"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
              )}

              {/* User List Table */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-950/40 border-b border-white/5 text-zinc-400 uppercase font-bold text-[10px] tracking-wider font-mono">
                      <th className="p-4">Identifiant</th>
                      <th className="p-4">Nom & Contact</th>
                      <th className="p-4">Changer de Rôle</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 text-right">Actions Sécurité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {usersList
                      .filter(u => {
                        if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
                        if (!userSearchTerm) return true;
                        const term = userSearchTerm.toLowerCase();
                        return (
                          (u.email || '').toLowerCase().includes(term) ||
                          (u.fullName || '').toLowerCase().includes(term) ||
                          (u.phone || '').toLowerCase().includes(term) ||
                          (u.address || '').toLowerCase().includes(term) ||
                          (u.id || '').toLowerCase().includes(term)
                        );
                      })
                      .map((usr) => (
                      <tr key={usr.id} className="hover:bg-white/[0.02]">
                        <td className="p-4 font-mono font-bold text-white text-[11px]">
                          {usr.id}
                          {usr.createdAt && (
                            <span className="block text-[9px] text-zinc-500 font-sans">
                              Inscrit: {new Date(usr.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          <strong className="text-white block font-bold text-xs">{usr.fullName || usr.email.split('@')[0]}</strong>
                          <span className="text-zinc-400 text-[11px] block">{usr.email}</span>
                          {(usr.phone || usr.address) && (
                            <span className="text-zinc-500 text-[10px] block font-mono">
                              {usr.phone ? `📞 ${usr.phone}` : ''} {usr.address ? `• 📍 ${usr.address}` : ''}
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          <select
                            value={usr.role || 'client'}
                            onChange={(e) => handleUserRoleChange(usr.id, e.target.value)}
                            className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1 text-[11px] text-white font-bold focus:border-[#FF5C00] focus:outline-none cursor-pointer"
                          >
                            <option value="client">👤 Client</option>
                            <option value="restaurant">👨‍🍳 Restaurateur</option>
                            <option value="courier">🛵 Livreur</option>
                            <option value="admin">⚡ Administrateur</option>
                          </select>
                        </td>

                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            usr.status === 'suspended' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                          }`}>
                            {usr.status || 'active'}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <button
                              onClick={() => handleAdminResetPassword(usr.id, usr.email)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                              title="Réinitialiser le mot de passe"
                            >
                              <KeyRound size={12} />
                              <span>Pass</span>
                            </button>
                            <button
                              onClick={() => toggleUserStatus(usr.id)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                                usr.status === 'suspended' 
                                  ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' 
                                  : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                              }`}
                            >
                              {usr.status === 'suspended' ? 'Activer' : 'Suspendre'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(usr.id)}
                              className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                              title="Supprimer l'utilisateur"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. DELIVERY TAB */}
          {activeTab === 'delivery' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowCourierForm(true)}
                  className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_10px_20px_rgba(255,92,0,0.15)]"
                >
                  <Plus size={14} />
                  Ajouter un Livreur
                </button>
              </div>

              {/* Courier Form */}
              {showCourierForm && (
                <form onSubmit={handleSaveCourier} className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 max-w-md space-y-4">
                  <h4 className="text-sm font-black text-white uppercase italic">Inscrire un nouveau livreur</h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Nom du Coursier</label>
                    <input 
                      type="text" 
                      required
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="Nom complet"
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Téléphone</label>
                      <input 
                        type="text" 
                        required
                        value={courierPhone}
                        onChange={(e) => setCourierPhone(e.target.value)}
                        placeholder="06..."
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Véhicule</label>
                      <select
                        value={courierVehicle}
                        onChange={(e: any) => setCourierVehicle(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="Velo">Vélo Électrique</option>
                        <option value="Scooter">Scooter thermique</option>
                        <option value="Voiture">Voiture hybride</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowCourierForm(false)}
                      className="bg-zinc-900 text-zinc-400 px-4 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      className="bg-[#FF5C00] text-white px-5 py-2 rounded-xl text-xs font-black uppercase cursor-pointer"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
              )}

              {/* Delivery list card grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {couriers.map((cur) => (
                  <div key={cur.id} className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-mono text-zinc-500">{cur.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          cur.status === 'available' ? 'bg-green-500/10 text-green-400' :
                          cur.status === 'delivering' ? 'bg-orange-500/10 text-orange-400 animate-pulse' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {cur.status === 'available' ? 'Disponible' : cur.status === 'delivering' ? 'En course' : 'Hors-ligne'}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-white">{cur.name}</h4>
                      <p className="text-xs text-zinc-400 mt-1">{cur.phone}</p>
                      
                      <div className="mt-3 text-[10px] text-zinc-500">
                        <span className="font-mono uppercase bg-zinc-950 px-2 py-1 rounded border border-white/5">Véhicule : {cur.vehicle}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-between items-center mt-5 pt-4 border-t border-white/5">
                      <button
                        onClick={() => toggleCourierStatus(cur.id)}
                        className="text-[10px] font-bold text-[#FF5C00] hover:underline cursor-pointer"
                      >
                        {cur.status === 'offline' ? 'Mettre en ligne' : 'Mettre hors-ligne'}
                      </button>

                      <div className="flex items-center gap-2">
                        {cur.status === 'delivering' && (
                          <span className="text-[10px] text-zinc-500 italic mr-1">ID Commande: Sar_02</span>
                        )}
                        <button
                          onClick={() => handleDeleteCourier(cur.id)}
                          className="p-1 rounded bg-zinc-950 border border-white/5 text-zinc-500 hover:text-red-500 cursor-pointer transition-colors"
                          title="Supprimer ce livreur"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. PROMOTIONS TAB */}
          {activeTab === 'promotions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowCouponForm(true)}
                  className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_10px_20px_rgba(255,92,0,0.15)]"
                >
                  <Plus size={14} />
                  Créer un Coupon
                </button>
              </div>

              {/* Coupon Form */}
              {showCouponForm && (
                <form onSubmit={handleSaveCoupon} className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 max-w-md space-y-4">
                  <h4 className="text-sm font-black text-white uppercase italic">Nouveau code promotionnel</h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Code promo</label>
                    <input 
                      type="text" 
                      required
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Ex: SPECIAL50"
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Type de réduction</label>
                      <select
                        value={couponType}
                        onChange={(e: any) => setCouponType(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="percentage">Pourcentage (%)</option>
                        <option value="fixed">Montant fixe (€)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Valeur</label>
                      <input 
                        type="number" 
                        required
                        value={couponVal}
                        onChange={(e) => setCouponVal(Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowCouponForm(false)}
                      className="bg-zinc-900 text-zinc-400 px-4 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      className="bg-[#FF5C00] text-white px-5 py-2 rounded-xl text-xs font-black uppercase cursor-pointer"
                    >
                      Créer le Code
                    </button>
                  </div>
                </form>
              )}

              {/* Coupons List */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-950/40 border-b border-white/5 text-zinc-400 uppercase font-bold text-[10px] tracking-wider">
                      <th className="p-4">Code Promo</th>
                      <th className="p-4">Type de Réduction</th>
                      <th className="p-4">Valeur de Remise</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {coupons.map((cop) => (
                      <tr key={cop.id} className="hover:bg-white/[0.02]">
                        <td className="p-4 font-mono font-black text-white tracking-widest">{cop.code}</td>
                        <td className="p-4 uppercase font-bold text-zinc-400">{cop.discountType === 'percentage' ? 'Pourcentage' : 'Fixe'}</td>
                        <td className="p-4 font-extrabold text-[#FF5C00]">
                          {cop.discountValue} {cop.discountType === 'percentage' ? '%' : '€'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            cop.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {cop.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => toggleCouponActive(cop.id)}
                              className="px-2 py-1 bg-zinc-900 border border-white/5 rounded text-[10px] text-zinc-300 hover:text-white"
                            >
                              {cop.isActive ? 'Désactiver' : 'Activer'}
                            </button>
                            <button
                              onClick={() => deleteCoupon(cop.id)}
                              className="p-1 rounded bg-zinc-900 border border-white/5 text-zinc-500 hover:text-red-500 cursor-pointer transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. SHOWCASE TAB */}
          {activeTab === 'showcase' && (
            <div className="max-w-3xl space-y-8">
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">💳 Commission de service & frais de livraison généraux</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Ces valeurs s’appliquent globalement à tous les clients lors du checkout du panier.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Commission Fidfud Service (€)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={globalServiceFee}
                      onChange={(e) => setGlobalServiceFee(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Frais de livraison standard (€)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={globalDeliveryFee}
                      onChange={(e) => setGlobalDeliveryFee(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">🌟 Boutique de Mise en Avant Restaurant</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Tarifs d’abonnement pour les restaurateurs voulant être visibles en top du feed.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Prix hebdomadaire visibilité premium (€)</label>
                    <input 
                      type="number" 
                      value={showcasePremiumPrice}
                      onChange={(e) => setShowcasePremiumPrice(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Nombre maximum de restaurants mis en avant</label>
                    <select className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none">
                      <option>3 restaurants (Recommandé)</option>
                      <option>5 restaurants</option>
                      <option>Illimité</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. INTERACTIONS TAB */}
          {activeTab === 'interactions' && (
            <div className="space-y-8">

              {/* Instagram Reel AI Video Importer */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-[#FF5C00]" />
                    Importateur Vidéo Instagram Reels par IA
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Saisissez un lien Instagram Reel ou n’importe quel lien vidéo MP4. Notre moteur d'IA va automatiquement extraire la vidéo, analyser la description de la publication pour générer un titre et des sous-titres hautement engageants, et l'associer au restaurant de votre choix dans le feed d'accueil.
                  </p>
                </div>

                <form onSubmit={handleImportInstagram} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Lien de la Vidéo Instagram / URL MP4</label>
                      <input 
                        type="text" 
                        required
                        value={instagramVideoUrl}
                        onChange={(e) => setInstagramVideoUrl(e.target.value)}
                        placeholder="Ex: https://instagram.com/reel/C8..."
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Associer au Restaurant Partenaire</label>
                      <select
                        required
                        value={instagramRestaurantId}
                        onChange={(e) => setInstagramRestaurantId(e.target.value)}
                        className="w-full bg-[#030303] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="">-- Choisir un restaurant --</option>
                        {restaurants.map((rest) => (
                          <option key={rest.id} value={rest.id}>{rest.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isExtractingInstagram}
                      className="bg-[#FF5C00] hover:bg-[#E04F00] text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 font-sans"
                    >
                      {isExtractingInstagram ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Importation IA en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          Importer la vidéo Instagram
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Like / Views & Video Manager */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 admin-cms-video-manager">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <VideoIcon size={16} className="text-[#FF5C00]" />
                      🎥 Gestionnaire des Vidéos, Détails & Plats Associés
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Modifiez les titres, descriptions, liens plats pour le panier et ajustez l'engagement live.
                    </p>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    {videos.length} vidéo{videos.length > 1 ? 's' : ''} au catalogue
                  </div>
                </div>
                
                <div className="space-y-3">
                  {videos.map((vid) => {
                    const matchingDish = dishes.find(d => d.id === vid.associatedDishId || d.id === vid.dishId);
                    const matchingRest = restaurants.find(r => r.id === vid.restaurantId);

                    return (
                      <div 
                        key={vid.id} 
                        className="bg-zinc-950/60 border border-white/5 hover:border-white/15 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="w-14 h-14 rounded-xl bg-black border border-white/10 overflow-hidden shrink-0 relative flex items-center justify-center">
                            {vid.thumbnailUrl ? (
                              <img src={vid.thumbnailUrl} alt={vid.title} className="w-full h-full object-cover" />
                            ) : (
                              <video 
                                src={(isDirectPlayableVideo(vid.videoUrl) ? getSafeVideoUrl(vid.videoUrl) : null) || STABLE_CULINARY_FALLBACK_VIDEOS[0]} 
                                muted 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  if (e.currentTarget.src !== STABLE_CULINARY_FALLBACK_VIDEOS[0]) {
                                    e.currentTarget.src = STABLE_CULINARY_FALLBACK_VIDEOS[0];
                                  }
                                }}
                              />
                            )}
                            <div className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${vid.isOnline !== false ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-zinc-600'}`} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-black text-white truncate">{vid.title}</h4>
                              {vid.isOnline === false && (
                                <span className="bg-zinc-800 text-zinc-400 border border-white/5 text-[9px] px-1.5 py-0.2 rounded font-mono uppercase">
                                  Brouillon
                                </span>
                              )}
                            </div>

                            {vid.description && (
                              <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5 font-sans">
                                {vid.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-1.5 text-[10px] flex-wrap">
                              <span className="text-zinc-500 font-mono">
                                ID: <strong className="text-zinc-400">{vid.id}</strong>
                              </span>
                              <span className="text-zinc-600">•</span>
                              <span className="text-amber-400/90 font-medium">
                                🏪 {matchingRest?.name || vid.restaurantName || vid.restaurantId}
                              </span>
                              <span className="text-zinc-600">•</span>
                              {matchingDish ? (
                                <span className="bg-[#FF5C00]/15 text-[#FF5C00] border border-[#FF5C00]/30 px-2 py-0.5 rounded-md font-bold font-mono inline-flex items-center gap-1">
                                  🍽️ {matchingDish.name} ({Number(matchingDish.price).toFixed(2)}€)
                                </span>
                              ) : (
                                <span className="bg-zinc-900 text-zinc-500 border border-white/5 px-2 py-0.5 rounded-md font-mono">
                                  🚫 Aucun plat associé
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                          <div className="text-xs font-mono text-zinc-400 pr-1">
                            <span className="font-extrabold text-[#FF5C00]">{vid.likesCount}</span> likes
                          </div>
                          
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Edit Video Details Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditVideo(vid)}
                              className="bg-[#FF5C00]/20 hover:bg-[#FF5C00] text-[#FF5C00] hover:text-white border border-[#FF5C00]/40 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-[#FF5C00]/25"
                              title="Modifier le titre, la description et l'association de plat"
                            >
                              <Edit size={13} />
                              <span>Edit Video Details</span>
                            </button>

                            <button
                              onClick={() => handleUpdateLikes(vid.id, false)}
                              className="bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-400 hover:text-white px-2.5 py-2 rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
                              title="Retirer 50 likes"
                            >
                              -50 Likes
                            </button>
                            <button
                              onClick={() => handleUpdateLikes(vid.id, true)}
                              className="bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-400 hover:text-white px-2.5 py-2 rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
                              title="Ajouter 50 likes"
                            >
                              +50 Likes
                            </button>
                            <button
                              onClick={() => handleAddComment(vid.id)}
                              className="bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-400 hover:text-white px-2.5 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Ajouter un commentaire"
                            >
                              <MessageSquare size={11} /> Commentaire
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comments Manager */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">💬 Flux de modération des commentaires</h3>
                
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {comments.map((com) => (
                    <div key={com.id} className="bg-zinc-950/40 border border-white/5 rounded-2xl p-4 flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-[#FF5C00]">@{com.username}</span>
                          <span className="text-[9px] text-zinc-600 font-mono">{com.createdAt}</span>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase bg-zinc-900 border border-white/5 px-1.5 py-0.2 rounded">
                            {com.videoTitle}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 font-sans">{com.text}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteComment(com.id)}
                        className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-500 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gift, Tip & Gains Simulation Controls */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Gift size={16} className="text-[#FF5C00]" />
                    🎁 Simulateur de Cadeaux & Gains (Tips & Engagement)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Simulez l'envoi de cadeaux en direct par les spectateurs (Rose, Tacos, Champagne, Couronne). Cela mettra à jour les points cadeaux et l'argent accumulé par le restaurateur, visibles en temps réel dans son tableau de bord "Cadeaux & Gains".
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-950/40 p-4 rounded-2xl border border-white/5 font-sans">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Restaurant Partenaire Bénéficiaire</label>
                      <select
                        value={selectedGiftRestaurantId}
                        onChange={(e) => setSelectedGiftRestaurantId(e.target.value)}
                        className="w-full bg-[#030303] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="">-- Choisir le restaurant --</option>
                        {restaurants.map((rest) => (
                          <option key={rest.id} value={rest.id}>{rest.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Sélectionner un Cadeau à envoyer</label>
                      <select
                        value={selectedGiftType}
                        onChange={(e) => setSelectedGiftType(e.target.value)}
                        className="w-full bg-[#030303] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="rose">🌹 Rose (+10 Points / +5 Likes) [Valeur: 0.50€]</option>
                        <option value="tacos">🌮 Tacos de Rue (+50 Points / +25 Likes) [Valeur: 2.50€]</option>
                        <option value="champagne">🍾 Champagne Premium (+200 Points / +100 Likes) [Valeur: 10.00€]</option>
                        <option value="crown">👑 Couronne Royale (+1000 Points / +500 Likes) [Valeur: 50.00€]</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulateGift}
                      disabled={isSendingGiftSim || !selectedGiftRestaurantId}
                      className="w-full bg-[#FF5C00] hover:bg-[#E04F00] text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 font-sans font-bold"
                    >
                      {isSendingGiftSim ? 'Envoi du cadeau...' : 'Offrir le Cadeau au Restaurant'}
                    </button>
                  </div>

                  {/* Summary display */}
                  <div className="bg-[#030303] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-mono uppercase text-zinc-600 block mb-2">💰 Tableau des Payouts & Engagement Actuel</span>
                    
                    <div className="space-y-3 overflow-y-auto max-h-44 pr-1">
                      {restaurants.map((rest) => (
                        <div key={rest.id} className="flex justify-between items-center text-[11px] border-b border-zinc-900 pb-1.5">
                          <span className="font-bold text-zinc-300 truncate max-w-[120px]">{rest.name}</span>
                          <div className="flex items-center gap-2 text-[10px] font-mono">
                            <span className="text-zinc-500">❤️ {rest.likesReceived || 0}</span>
                            <span className="text-yellow-500">🪙 {rest.pointsReceived || 0}</span>
                            <span className="text-green-500 font-bold">{((rest.pointsReceived || 0) * 0.05).toFixed(2)}€</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="text-[9px] text-zinc-500 text-center mt-3 border-t border-zinc-900 pt-2 font-mono">
                      Calculé sur un taux de change de 1 Pt = 0.05€
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 9. LEADER TAB */}
          {activeTab === 'leader' && (
            <div className="max-w-2xl space-y-8">
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Crown size={16} className="text-[#FF5C00]" />
                    Mise en avant du Leader de la semaine
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Désignez un restaurateur d’élite à propulser avec un badge exclusif sur l’application.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Sélectionner le restaurant d’élite</label>
                    <select
                      value={selectedLeaderId}
                      onChange={(e) => setSelectedLeaderId(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    >
                      {restaurants.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Titre de mise en avant</label>
                    <input 
                      type="text" 
                      value={leaderTitle}
                      onChange={(e) => setLeaderTitle(e.target.value)}
                      placeholder="Ex: Chef de la Semaine 👑"
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Texte du Badge d’Excellence</label>
                    <input 
                      type="text" 
                      value={leaderBadgeText}
                      onChange={(e) => setLeaderBadgeText(e.target.value)}
                      placeholder="Ex: Top Pizzaiolo Certifié"
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => {
                      alert('Félicitations ! Le Leaderboard a été re-calculé avec succès. Ce restaurant d’élite arborera sa couronne dorée dans le feed client.');
                    }}
                    className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider w-full shadow-[0_10px_20px_rgba(255,92,0,0.15)] cursor-pointer"
                  >
                    Valider le classement Leader
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 10. FORMULAS & SUBSCRIPTIONS TAB */}
          {activeTab === 'formulas' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders size={16} className="text-[#FF5C00]" />
                    Grille Tarifaire des Formules & Abonnements (Paris & National)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Modifiez en direct les tarifs, descriptions et titres des formules d'abonnements des restaurants partenaires. Ces formules s'afficheront instantanément dans le tableau de bord des restaurateurs.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formulasList.map((formula) => {
                    const isEditing = editingFormulaId === formula.id;
                    return (
                      <div 
                        key={formula.id} 
                        className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                          isEditing 
                            ? 'border-[#FF5C00] bg-[#FF5C00]/5 shadow-[0_0_20px_rgba(255,92,0,0.1)]' 
                            : 'border-white/5 bg-zinc-950/40 hover:bg-zinc-950'
                        }`}
                      >
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                              formula.id === 'gold' 
                                ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20' 
                                : formula.id === 'pro'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                            }`}>
                              ID: {formula.id}
                            </span>
                            
                            {!isEditing && (
                              <button 
                                onClick={() => startEditingFormula(formula)}
                                className="text-[10px] text-zinc-400 hover:text-white uppercase font-bold flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/5 transition-all cursor-pointer"
                              >
                                Modifier
                              </button>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-[9px] text-zinc-500 font-bold uppercase">Nom de la Formule</label>
                                <input 
                                  type="text"
                                  value={editingFormulaName}
                                  onChange={(e) => setEditingFormulaName(e.target.value)}
                                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] text-zinc-500 font-bold uppercase">Prix Mensuel (€)</label>
                                <input 
                                  type="number"
                                  value={editingFormulaPrice}
                                  onChange={(e) => setEditingFormulaPrice(Number(e.target.value))}
                                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] text-zinc-500 font-bold uppercase">Description & Avantages</label>
                                <textarea
                                  value={editingFormulaDesc}
                                  rows={3}
                                  onChange={(e) => setEditingFormulaDesc(e.target.value)}
                                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                                />
                              </div>

                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={() => handleUpdateFormula(formula.id)}
                                  className="flex-1 bg-[#FF5C00] hover:bg-[#E04F00] text-white py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  Enregistrer
                                </button>
                                <button
                                  onClick={() => setEditingFormulaId(null)}
                                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <h4 className="text-sm font-bold text-white tracking-tight">{formula.name}</h4>
                              <p className="text-xs text-zinc-400 leading-relaxed font-sans min-h-[50px]">{formula.description}</p>
                              <div className="pt-2 border-t border-white/5 flex items-baseline gap-1">
                                <span className="text-2xl font-black text-white font-mono">{formula.price}€</span>
                                <span className="text-[10px] text-zinc-500 font-sans">/ mois</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 11. POPUPS MANAGEMENT TAB */}
          {activeTab === 'popups' && (
            <div className="space-y-6 max-w-6xl w-full">
              {/* Pop-up Dashboard Header Banner */}
              <div className="bg-[#0C0C0E] border border-white/10 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2.5">
                    <Sparkles size={20} className="text-[#FF5C00]" />
                    Gestionnaire des Pop-ups Promos & Recommandations
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                    Créez et configurez les fenêtres pop-ups promotionnelles. Ces pop-ups invitent vos utilisateurs à découvrir les sessions DJs, les chaînes culinaires et les YouTubers food.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPopup(null);
                    setPopTitle('🎧 Session Live DJs & Sound Systems');
                    setPopSubtitle('Rejoignez les espaces uniques où les DJs de renom écoutent de la musique, mixent en direct et créent l’ambiance !');
                    setPopCategory('dj_music');
                    setPopMediaType('image');
                    setPopMediaUrl('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1000');
                    setPopImageFit100(true);
                    setPopCtaText('🎧 Écouter & Suivre les DJs');
                    setPopCtaLink('djs');
                    setPopActive(true);
                    setPopDisplayDelay(5);
                    setShowPopupForm(true);
                  }}
                  className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,92,0,0.3)] transition-all cursor-pointer shrink-0"
                >
                  <Plus size={16} />
                  Nouveau Pop-up Promo
                </button>
              </div>

              {/* Presets Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => {
                    setEditingPopup(null);
                    setPopTitle('🎧 Session Live DJs & Sound Systems');
                    setPopSubtitle('Rejoignez les espaces où les DJs de renom écoutent de la musique, mixent et créent l’ambiance des meilleurs lieux !');
                    setPopCategory('dj_music');
                    setPopMediaType('image');
                    setPopMediaUrl('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1000');
                    setPopImageFit100(true);
                    setPopCtaText('🎧 Écouter & Suivre les DJs');
                    setPopCtaLink('djs');
                    setPopActive(true);
                    setPopDisplayDelay(3);
                    setShowPopupForm(true);
                  }}
                  className="bg-zinc-950 border border-white/10 hover:border-[#FF5C00]/50 rounded-2xl p-4 cursor-pointer transition-all hover:bg-zinc-900 group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="p-2 rounded-xl bg-[#FF5C00]/10 text-[#FF5C00]">
                      <Headphones size={18} />
                    </span>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider group-hover:text-[#FF5C00] transition-colors">
                      1. DJs & Musique
                    </h4>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Inciter à aller là où les DJs écoutent de la musique et mixent en live.
                  </p>
                  <span className="text-[10px] font-bold text-[#FF5C00] uppercase tracking-wider mt-3 inline-block">
                    + Activer ce Pop-up →
                  </span>
                </div>

                <div
                  onClick={() => {
                    setEditingPopup(null);
                    setPopTitle('🍳 Chaînes Culinaires & Crash-Tests');
                    setPopSubtitle('Explorez les chaînes culinaires et émissions gourmandes qui testent, évaluent et révèlent en toute transparence les cuisines de restaurants !');
                    setPopCategory('culinary_channels');
                    setPopMediaType('image');
                    setPopMediaUrl('https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1000');
                    setPopImageFit100(true);
                    setPopCtaText('🍳 Explorer les Chaînes Culinaires');
                    setPopCtaLink('channels');
                    setPopActive(true);
                    setPopDisplayDelay(8);
                    setShowPopupForm(true);
                  }}
                  className="bg-zinc-950 border border-white/10 hover:border-amber-400/50 rounded-2xl p-4 cursor-pointer transition-all hover:bg-zinc-900 group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="p-2 rounded-xl bg-amber-400/10 text-amber-400">
                      <Tv size={18} />
                    </span>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                      2. Chaînes Culinaires
                    </h4>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Inciter à regarder les chaînes culinaires qui testent les restaurants.
                  </p>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mt-3 inline-block">
                    + Activer ce Pop-up →
                  </span>
                </div>

                <div
                  onClick={() => {
                    setEditingPopup(null);
                    setPopTitle('📺 YouTubers Food & Dégustations Cash');
                    setPopSubtitle('Suivez les YouTubers et créateurs food les plus célèbres qui dégustent les plats signatures et donnent leur avis cash !');
                    setPopCategory('food_youtubers');
                    setPopMediaType('image');
                    setPopMediaUrl('https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1000');
                    setPopImageFit100(true);
                    setPopCtaText('📺 Regarder les YouTubers Food');
                    setPopCtaLink('youtubers');
                    setPopActive(true);
                    setPopDisplayDelay(15);
                    setShowPopupForm(true);
                  }}
                  className="bg-zinc-950 border border-white/10 hover:border-red-500/50 rounded-2xl p-4 cursor-pointer transition-all hover:bg-zinc-900 group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="p-2 rounded-xl bg-red-500/10 text-red-500">
                      <Youtube size={18} />
                    </span>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider group-hover:text-red-500 transition-colors">
                      3. YouTubers Food
                    </h4>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Inciter à regarder les YouTubers qui analysent les plats food.
                  </p>
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider mt-3 inline-block">
                    + Activer ce Pop-up →
                  </span>
                </div>
              </div>

              {/* Popup Form Drawer/Modal */}
              {showPopupForm && (
                <form onSubmit={handleSavePopup} className="bg-[#0C0C0E] border border-[#FF5C00]/40 rounded-3xl p-6 space-y-5 shadow-2xl animate-fade-in">
                  <div className="flex justify-between items-center pb-3 border-b border-white/10">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles size={16} className="text-[#FF5C00]" />
                      {editingPopup ? '✏️ Éditer le Pop-up' : '➕ Nouveau Pop-up Promo'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => { setShowPopupForm(false); setEditingPopup(null); }}
                      className="text-zinc-500 hover:text-white p-1"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Titre du Pop-up</label>
                      <input
                        type="text"
                        required
                        value={popTitle}
                        onChange={(e) => setPopTitle(e.target.value)}
                        placeholder="Ex: 🎧 Session Live DJs & Sound Systems"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Catégorie Cible</label>
                      <select
                        value={popCategory}
                        onChange={(e) => setPopCategory(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="dj_music">🎧 DJs & Musique (Aller où les DJs écoutent de la musique)</option>
                        <option value="culinary_channels">🍳 Chaînes Culinaires (Chaînes qui testent les restos)</option>
                        <option value="food_youtubers">📺 YouTubers Food (Analyses & crash-tests de plats)</option>
                        <option value="general">✨ Promo Générale</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Description / Sous-titre</label>
                        <button
                          type="button"
                          onClick={() => handleGenerateAiDescription('popup', popTitle, popCategory, (desc) => setPopSubtitle(desc))}
                          disabled={isGeneratingAiDesc}
                          className="text-[10px] bg-[#FF5C00] hover:bg-[#FF5C00]/80 text-white font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50 shadow-md"
                        >
                          <Sparkles size={12} />
                          {isGeneratingAiDesc ? 'Génération IA...' : '✨ Générer par IA'}
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={popSubtitle}
                        onChange={(e) => setPopSubtitle(e.target.value)}
                        placeholder="Entrez le message explicatif pour inciter l'utilisateur..."
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Type de Média</label>
                      <select
                        value={popMediaType}
                        onChange={(e: any) => setPopMediaType(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="image">📸 Image (Photo HD / Banner)</option>
                        <option value="video">🎥 Vidéo (Teaser MP4 / Loop)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">URL du Média (Image ou Vidéo)</label>
                      <input
                        type="text"
                        required
                        value={popMediaUrl}
                        onChange={(e) => setPopMediaUrl(e.target.value)}
                        placeholder="Ex: https://images.unsplash.com/... ou téléversez ci-dessous"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      />
                    </div>

                    {/* Drag and Drop Upload Area for Images & Videos */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                        📂 Glisser-Déposer / Téléverser une Image ou Vidéo (Glisser & Déposer)
                      </label>
                      <div
                        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                          dragActive ? 'border-[#FF5C00] bg-[#FF5C00]/10' : 'border-white/15 hover:border-white/30 bg-zinc-950'
                        }`}
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragActive(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFile(e.dataTransfer.files[0]).then(() => {
                              if (uploadedFileUrl) setPopMediaUrl(uploadedFileUrl);
                            });
                          }
                        }}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*,video/*';
                          input.onchange = (e: any) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFile(e.target.files[0]).then(() => {
                                if (uploadedFileUrl) setPopMediaUrl(uploadedFileUrl);
                              });
                            }
                          };
                          input.click();
                        }}
                      >
                        {isUploadingFile ? (
                          <div className="space-y-2">
                            <RefreshCw size={24} className="animate-spin text-[#FF5C00] mx-auto" />
                            <p className="text-xs text-zinc-300 font-mono">Téléversement sur le serveur en cours...</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <UploadCloud size={28} className="text-[#FF5C00] mx-auto" />
                            <p className="text-xs font-bold text-white">
                              Glissez-déposez votre image ou vidéo ici, ou <span className="text-[#FF5C00] underline">parcourez vos fichiers</span>
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono">Formats supportés: PNG, JPG, WEBP, MP4, MOV (Max 50Mo)</p>
                          </div>
                        )}
                      </div>
                      {uploadedFileUrl && (
                        <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between text-xs text-green-400">
                          <span className="truncate">✅ Fichier téléversé: {uploadedFileUrl}</span>
                          <button
                            type="button"
                            onClick={() => setPopMediaUrl(uploadedFileUrl)}
                            className="bg-green-500 text-black px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase shrink-0"
                          >
                            Appliquer
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 100% Image Width Option */}
                    <div className="md:col-span-2 bg-zinc-950 p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <label htmlFor="popImageFit100" className="text-xs font-bold text-white cursor-pointer block">
                          🖼️ Afficher l'image à 100% de largeur (Full Cover / Plein Écran)
                        </label>
                        <p className="text-[10px] text-zinc-400">
                          Force l'image ou la vidéo à s'étendre sur 100% de la largeur du conteneur du pop-up sans marges blanches.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        id="popImageFit100"
                        checked={popImageFit100}
                        onChange={(e) => setPopImageFit100(e.target.checked)}
                        className="w-5 h-5 text-[#FF5C00] bg-zinc-900 border-zinc-700 rounded focus:ring-0 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Texte du Bouton d'Action (CTA)</label>
                      <input
                        type="text"
                        required
                        value={popCtaText}
                        onChange={(e) => setPopCtaText(e.target.value)}
                        placeholder="Ex: 🎧 Écouter & Suivre les DJs"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Action / Lien Cible</label>
                      <select
                        value={popCtaLink}
                        onChange={(e) => setPopCtaLink(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      >
                        <option value="djs">🎧 Ouvrir le Live Lounge DJs (DJAreaModal)</option>
                        <option value="channels">🍳 Filtrer les Chaînes Culinaires</option>
                        <option value="youtubers">📺 Filtrer les YouTubers Food</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Délai d'Apparition (Secondes)</label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={popDisplayDelay}
                        onChange={(e) => setPopDisplayDelay(Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      />
                    </div>

                    <div className="space-y-1.5 flex items-end">
                      <label className="flex items-center gap-3 bg-zinc-950 p-3 rounded-xl border border-white/10 w-full cursor-pointer">
                        <input
                          type="checkbox"
                          checked={popActive}
                          onChange={(e) => setPopActive(e.target.checked)}
                          className="w-4 h-4 text-[#FF5C00] bg-zinc-900 border-zinc-700 rounded focus:ring-0"
                        />
                        <span className="text-xs font-bold text-white">Activer ce pop-up immédiatement</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3 justify-end border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => { setShowPopupForm(false); setEditingPopup(null); }}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#FF5C00] hover:bg-[#FF7A00] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
                    >
                      {editingPopup ? 'Mettre à jour' : 'Enregistrer Pop-up'}
                    </button>
                  </div>
                </form>
              )}

              {/* Popups List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest font-mono">
                  📋 Pop-ups Configurés ({popupsList.length})
                </h4>

                {isPopupsLoading ? (
                  <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                    Chargement des pop-ups...
                  </div>
                ) : popupsList.length === 0 ? (
                  <div className="p-8 bg-zinc-950 border border-white/5 rounded-2xl text-center text-zinc-500 text-xs">
                    Aucun pop-up configuré pour le moment. Cliquez sur "Nouveau Pop-up Promo" pour en créer un.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {popupsList.map((popup) => (
                      <div
                        key={popup.id}
                        className={`bg-zinc-950 border rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
                          popup.active ? 'border-white/15' : 'border-white/5 opacity-60'
                        }`}
                      >
                        <div>
                          {/* Image Thumbnail with 100% width preview */}
                          <div className="relative h-36 bg-black overflow-hidden">
                            <img
                              src={popup.mediaUrl}
                              alt={popup.title}
                              className={`w-full h-full ${popup.imageFit100 ? 'w-full object-cover' : 'object-contain'}`}
                            />
                            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-md text-white border border-white/20">
                                {popup.category}
                              </span>
                              {popup.imageFit100 && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FF5C00] text-white">
                                  100% Largeur
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleTogglePopupActive(popup)}
                              className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                                popup.active ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {popup.active ? '● Actif' : '○ Inactif'}
                            </button>
                          </div>

                          <div className="p-4 space-y-2">
                            <h5 className="text-sm font-extrabold text-white leading-snug">
                              {popup.title}
                            </h5>
                            <p className="text-xs text-zinc-400 line-clamp-2">
                              {popup.subtitle}
                            </p>

                            <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                              <span>Bouton: <strong className="text-zinc-300">{popup.ctaText}</strong></span>
                              <span>Délai: <strong className="text-zinc-300">{popup.displayDelaySeconds || 5}s</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="p-3 bg-zinc-900/60 border-t border-white/5 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPopup(popup);
                              setPopTitle(popup.title || '');
                              setPopSubtitle(popup.subtitle || '');
                              setPopCategory(popup.category || 'dj_music');
                              setPopMediaType(popup.mediaType || 'image');
                              setPopMediaUrl(popup.mediaUrl || '');
                              setPopImageFit100(popup.imageFit100 ?? true);
                              setPopCtaText(popup.ctaText || 'Découvrir');
                              setPopCtaLink(popup.ctaLink || 'djs');
                              setPopActive(popup.active ?? true);
                              setPopDisplayDelay(popup.displayDelaySeconds || 5);
                              setShowPopupForm(true);
                            }}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Sliders size={12} />
                            Éditer
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePopup(popup.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                            title="Supprimer le pop-up"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* DJS, CULINARY SHOWS & FOOD YOUTUBERS TAB */}
          {activeTab === 'djs_shows' && (
            <div className="space-y-6 max-w-6xl w-full animate-fade-in">
              {/* Info Header Banner */}
              <div className="bg-[#0C0C0E] border border-purple-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Headphones size={20} className="text-purple-400" />
                      Gestionnaire Global : Lounge DJs, Émissions Culinaires & YouTubers Food
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Espace d'administration complet de A à Z. Gérez les sessions DJ live, intégrez les vidéos d'émissions culinaires et référencez les chaînes des YouTubers Food. Téléversez visuels HD / teasers vidéos par glisser-déposer ou renseignez leurs chaînes YouTube.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (djsSubTab === 'djs') {
                          setEditingDjSession(null);
                          setDjName('');
                          setDjAvatar('');
                          setDjRestaurantName('');
                          setDjGenre('Deep House & Organic Lounge');
                          setDjCurrentMood('Deep House');
                          setDjListenersCount(1200);
                          setDjVideoUrl('');
                          setDjCoverImage('');
                          setDjIsLive(true);
                          setDjBpm(124);
                          setDjTrackTitle('');
                          setDjTrackArtist('');
                          setDjBio('');
                          setDjYoutubeUrl('');
                          setShowDjForm(true);
                        } else if (djsSubTab === 'shows') {
                          setEditingShow(null);
                          setShowName('');
                          setShowHostName('');
                          setShowAvatar('');
                          setShowCoverUrl('');
                          setShowMediaType('image');
                          setShowMediaUrl('');
                          setShowDescription('');
                          setShowYoutubeUrl('');
                          setShowFeaturedRestaurant('');
                          setShowRating(4.9);
                          setShowActive(true);
                          setShowShowForm(true);
                        } else {
                          setEditingYouTuber(null);
                          setYtCreatorName('');
                          setYtChannelName('');
                          setYtSubscribers('500K');
                          setYtAvatar('');
                          setYtCoverUrl('');
                          setYtMediaType('image');
                          setYtMediaUrl('');
                          setYtBio('');
                          setYtYoutubeUrl('');
                          setYtFeaturedVideoUrl('');
                          setYtRating(4.9);
                          setYtActive(true);
                          setShowYouTuberForm(true);
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                      <Plus size={16} />
                      {djsSubTab === 'djs' && 'Ajouter un DJ / Session Live'}
                      {djsSubTab === 'shows' && 'Ajouter une Émission Culinaire'}
                      {djsSubTab === 'youtubers' && 'Ajouter un YouTuber Food'}
                    </button>
                  </div>
                </div>

                {/* Sub-Tabs Switcher */}
                <div className="flex items-center gap-2 border-t border-white/10 pt-4 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setDjsSubTab('djs')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                      djsSubTab === 'djs'
                        ? 'bg-purple-500 text-white shadow-lg'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <Headphones size={14} />
                    1. Lounge DJs & Sets Live ({djSessionsList.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setDjsSubTab('shows')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                      djsSubTab === 'shows'
                        ? 'bg-amber-500 text-black shadow-lg font-extrabold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <Tv size={14} />
                    2. Émissions & Crash-Tests ({culinaryShowsList.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setDjsSubTab('youtubers')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                      djsSubTab === 'youtubers'
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <Youtube size={14} />
                    3. YouTubers Food ({foodYouTubersList.length})
                  </button>
                </div>
              </div>

              {/* 1. DJs SUB TAB */}
              {djsSubTab === 'djs' && (
                <div className="space-y-6">
                  {/* DJ Form Modal */}
                  {showDjForm && (
                    <form onSubmit={handleSaveDjSession} className="bg-[#0C0C0E] border border-purple-500/40 rounded-3xl p-6 space-y-5 shadow-2xl animate-fade-in">
                      <div className="flex justify-between items-center pb-3 border-b border-white/10">
                        <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Headphones size={18} className="text-purple-400" />
                          {editingDjSession ? '✏️ Éditer la Session DJ' : '➕ Nouvelle Session DJ / Live'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => { setShowDjForm(false); setEditingDjSession(null); }}
                          className="text-zinc-500 hover:text-white p-1"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Nom du DJ / Artiste</label>
                          <input
                            type="text"
                            required
                            value={djName}
                            onChange={(e) => setDjName(e.target.value)}
                            placeholder="Ex: DJ Alex Keys"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Restaurant Associé</label>
                          <input
                            type="text"
                            value={djRestaurantName}
                            onChange={(e) => setDjRestaurantName(e.target.value)}
                            placeholder="Ex: Villa Gourmet - Paris 11e"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Genre Musical</label>
                          <input
                            type="text"
                            value={djGenre}
                            onChange={(e) => setDjGenre(e.target.value)}
                            placeholder="Ex: Deep House & Organic Lounge"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Lien Chaîne YouTube du DJ</label>
                            <button
                              type="button"
                              onClick={() => handleVerifyYoutubeUrl(djYoutubeUrl, (data) => {
                                if (data.authorName && !djName) setDjName(data.authorName);
                                if (data.description && !djBio) setDjBio(data.description);
                                if (data.thumbnailUrl && !djCoverImage) setDjCoverImage(data.thumbnailUrl);
                                if (data.avatar && !djAvatar) setDjAvatar(data.avatar);
                                if (data.embedUrl && !djVideoUrl) setDjVideoUrl(data.embedUrl);
                              })}
                              disabled={isVerifyingYoutube}
                              className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                            >
                              <CheckCircle size={12} />
                              {isVerifyingYoutube ? 'Vérification...' : '🔍 Vérifier & Extraire'}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={djYoutubeUrl}
                            onChange={(e) => setDjYoutubeUrl(e.target.value)}
                            placeholder="Ex: https://www.youtube.com/@AlexKeysDJ"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">URL Photo d'Avatar du DJ</label>
                          <input
                            type="text"
                            value={djAvatar}
                            onChange={(e) => setDjAvatar(e.target.value)}
                            placeholder="Ex: https://images.unsplash.com/..."
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">BPM Tempo & Auditeurs</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              value={djBpm}
                              onChange={(e) => setDjBpm(Number(e.target.value))}
                              placeholder="BPM (124)"
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                            <input
                              type="number"
                              value={djListenersCount}
                              onChange={(e) => setDjListenersCount(Number(e.target.value))}
                              placeholder="Auditeurs (1420)"
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">URL Vidéo / Stream MP4 (Glisser & Déposer un fichier ou Coller un lien)</label>
                          <input
                            type="text"
                            value={djVideoUrl}
                            onChange={(e) => setDjVideoUrl(e.target.value)}
                            placeholder="Ex: https://.../video.mp4 ou téléversez ci-dessous"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        {/* Drag & Drop Area for DJ Media */}
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                            📂 Téléverser un fichier Vidéo MP4 / Photo par Glisser-Déposer
                          </label>
                          <div
                            className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
                              dragActive ? 'border-purple-500 bg-purple-500/10' : 'border-white/15 hover:border-white/30 bg-zinc-950'
                            }`}
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragActive(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleFile(e.dataTransfer.files[0]).then(() => {
                                  if (uploadedFileUrl) setDjVideoUrl(uploadedFileUrl);
                                });
                              }
                            }}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*,video/*';
                              input.onchange = (e: any) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFile(e.target.files[0]).then(() => {
                                    if (uploadedFileUrl) setDjVideoUrl(uploadedFileUrl);
                                  });
                                }
                              };
                              input.click();
                            }}
                          >
                            {isUploadingFile ? (
                              <p className="text-xs text-purple-400 font-mono animate-pulse">⏳ Téléversement du média DJ...</p>
                            ) : (
                              <div className="space-y-1">
                                <UploadCloud size={24} className="text-purple-400 mx-auto" />
                                <p className="text-xs font-bold text-white">Glissez-déposez le fichier média ici, ou <span className="text-purple-400 underline">parcourez</span></p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Morceau Actuel (Titre & Artiste)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={djTrackTitle}
                              onChange={(e) => setDjTrackTitle(e.target.value)}
                              placeholder="Titre (Ex: Midnight Aperitivo)"
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                            <input
                              type="text"
                              value={djTrackArtist}
                              onChange={(e) => setDjTrackArtist(e.target.value)}
                              placeholder="Artiste (Ex: Alex Keys)"
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Biographie / Description du Style</label>
                            <button
                              type="button"
                              onClick={() => handleGenerateAiDescription('dj', djName, djGenre, (desc) => setDjBio(desc))}
                              disabled={isGeneratingAiDesc}
                              className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white font-black px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50 shadow-md"
                            >
                              <Sparkles size={12} />
                              {isGeneratingAiDesc ? 'Génération IA...' : '✨ Générer par IA'}
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={djBio}
                            onChange={(e) => setDjBio(e.target.value)}
                            placeholder="Avis, style musical, moments forts..."
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                          />
                        </div>

                        <div className="space-y-1.5 flex items-center md:col-span-2">
                          <label className="flex items-center gap-3 bg-zinc-950 p-3 rounded-xl border border-white/10 w-full cursor-pointer">
                            <input
                              type="checkbox"
                              checked={djIsLive}
                              onChange={(e) => setDjIsLive(e.target.checked)}
                              className="w-4 h-4 text-purple-500 bg-zinc-900 border-zinc-700 rounded focus:ring-0"
                            />
                            <span className="text-xs font-bold text-white">Activer le statut "EN DIRECT LIVE" immédiatement</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-3 justify-end border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => { setShowDjForm(false); setEditingDjSession(null); }}
                          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
                        >
                          {editingDjSession ? 'Mettre à jour Session DJ' : 'Créer Session DJ'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* DJ Sessions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {djSessionsList.map((dj) => (
                      <div key={dj.id} className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-purple-500/40 transition-all group">
                        <div>
                          <div className="relative h-40 bg-black overflow-hidden">
                            <BackgroundVideoPlayer
                              src={getSafeVideoUrl(dj.videoUrl)}
                              isPlaying={true}
                              isMuted={true}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                            
                            <button
                              type="button"
                              onClick={() => handleToggleDjLive(dj)}
                              className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-mono font-black uppercase transition-all cursor-pointer ${
                                dj.isLive ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {dj.isLive ? '🔴 LIVE ON AIR' : '⚪ HORS LIGNE'}
                            </button>

                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white font-bold">
                              <span className="truncate">{dj.restaurantName}</span>
                              <span className="text-purple-400 font-mono text-[10px] bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                                {dj.bpm} BPM
                              </span>
                            </div>
                          </div>

                          <div className="p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <img src={dj.djAvatar} alt={dj.djName} className="w-10 h-10 rounded-full object-cover border border-purple-500/40 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-extrabold text-white truncate">{dj.djName}</h4>
                                <p className="text-[11px] text-purple-400 font-medium truncate">{dj.genre}</p>
                              </div>
                            </div>

                            <p className="text-xs text-zinc-400 line-clamp-2">{dj.bio || 'Aucune biographie renseignée.'}</p>

                            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
                              <div className="text-zinc-500 font-mono text-[9px] uppercase font-bold">🎵 En cours de lecture:</div>
                              <div className="text-white font-bold truncate">{dj.currentTrack?.title || 'Live DJ Set'}</div>
                              <div className="text-zinc-400 text-[10px] truncate">{dj.currentTrack?.artist || dj.djName}</div>
                            </div>

                            {dj.youtubeChannelUrl && (
                              <a
                                href={dj.youtubeChannelUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-bold bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 transition-all"
                              >
                                <Youtube size={14} />
                                Voir la Chaîne YouTube →
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-zinc-900/60 border-t border-white/5 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDjSession(dj);
                              setDjName(dj.djName || '');
                              setDjAvatar(dj.djAvatar || '');
                              setDjRestaurantName(dj.restaurantName || '');
                              setDjGenre(dj.genre || '');
                              setDjCurrentMood(dj.currentMood || 'Deep House');
                              setDjListenersCount(dj.listenersCount || 1200);
                              setDjVideoUrl(dj.videoUrl || '');
                              setDjCoverImage(dj.coverImage || '');
                              setDjIsLive(dj.isLive ?? true);
                              setDjBpm(dj.bpm || 124);
                              setDjTrackTitle(dj.currentTrack?.title || '');
                              setDjTrackArtist(dj.currentTrack?.artist || '');
                              setDjBio(dj.bio || '');
                              setDjYoutubeUrl(dj.youtubeChannelUrl || '');
                              setShowDjForm(true);
                            }}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Sliders size={12} />
                            Éditer
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDjSession(dj.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                            title="Supprimer la session DJ"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. CULINARY SHOWS SUB TAB */}
              {djsSubTab === 'shows' && (
                <div className="space-y-6">
                  {/* Culinary Show Form */}
                  {showShowForm && (
                    <form onSubmit={handleSaveCulinaryShow} className="bg-[#0C0C0E] border border-amber-500/40 rounded-3xl p-6 space-y-5 shadow-2xl animate-fade-in">
                      <div className="flex justify-between items-center pb-3 border-b border-white/10">
                        <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Tv size={18} className="text-amber-400" />
                          {editingShow ? '✏️ Éditer l\'Émission Culinaire' : '➕ Nouvelle Émission / Crash-Test'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => { setShowShowForm(false); setEditingShow(null); }}
                          className="text-zinc-500 hover:text-white p-1"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Titre de l'Émission</label>
                          <input
                            type="text"
                            required
                            value={showName}
                            onChange={(e) => setShowName(e.target.value)}
                            placeholder="Ex: Cuisine En Direct & Masterclasses"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Animateur / Présentateur</label>
                          <input
                            type="text"
                            value={showHostName}
                            onChange={(e) => setShowHostName(e.target.value)}
                            placeholder="Ex: Chef Philippe"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Restaurant / Spot Vedette</label>
                          <input
                            type="text"
                            value={showFeaturedRestaurant}
                            onChange={(e) => setShowFeaturedRestaurant(e.target.value)}
                            placeholder="Ex: Villa Gourmet"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Lien Chaîne YouTube de l'Émission</label>
                            <button
                              type="button"
                              onClick={() => handleVerifyYoutubeUrl(showYoutubeUrl, (data) => {
                                if (data.title && !showName) setShowName(data.title);
                                if (data.description && !showDescription) setShowDescription(data.description);
                                if (data.thumbnailUrl && !showMediaUrl) setShowMediaUrl(data.thumbnailUrl);
                                if (data.avatar && !showAvatar) setShowAvatar(data.avatar);
                              })}
                              disabled={isVerifyingYoutube}
                              className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                            >
                              <CheckCircle size={12} />
                              {isVerifyingYoutube ? 'Vérification...' : '🔍 Vérifier & Extraire'}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={showYoutubeUrl}
                            onChange={(e) => setShowYoutubeUrl(e.target.value)}
                            placeholder="Ex: https://www.youtube.com/@MasterChefFrance"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">URL Média (Vidéo MP4 ou Image de Couverture)</label>
                          <input
                            type="text"
                            value={showMediaUrl}
                            onChange={(e) => setShowMediaUrl(e.target.value)}
                            placeholder="Ex: https://images.unsplash.com/... ou vidéo MP4"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Description & Concept de l'Émission</label>
                            <button
                              type="button"
                              onClick={() => handleGenerateAiDescription('culinary_show', showName, `${showHostName} - ${showFeaturedRestaurant}`, (desc) => setShowDescription(desc))}
                              disabled={isGeneratingAiDesc}
                              className="text-[10px] bg-amber-500 hover:bg-amber-400 text-black font-black px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50 shadow-md"
                            >
                              <Sparkles size={12} />
                              {isGeneratingAiDesc ? 'Génération IA...' : '✨ Générer par IA'}
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={showDescription}
                            onChange={(e) => setShowDescription(e.target.value)}
                            placeholder="Crash-tests en cuisine, recettes exclusives..."
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-3 justify-end border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => { setShowShowForm(false); setEditingShow(null); }}
                          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs uppercase tracking-wider shadow-lg cursor-pointer"
                        >
                          {editingShow ? 'Mettre à jour l\'Émission' : 'Créer l\'Émission'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Culinary Shows Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {culinaryShowsList.map((show) => (
                      <div key={show.id} className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-amber-500/40 transition-all">
                        <div>
                          <div className="relative h-40 bg-black overflow-hidden">
                            <img src={show.coverUrl || show.mediaUrl} alt={show.showName} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                            <button
                              type="button"
                              onClick={() => handleToggleShowActive(show)}
                              className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-mono font-black uppercase transition-all cursor-pointer ${
                                show.active ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {show.active ? '● ACTIF' : '○ INACTIF'}
                            </button>
                          </div>

                          <div className="p-4 space-y-2">
                            <h4 className="text-sm font-extrabold text-white">{show.showName}</h4>
                            <p className="text-xs text-amber-400 font-medium">Présenté par {show.hostName}</p>
                            <p className="text-xs text-zinc-400 line-clamp-2">{show.description}</p>

                            {show.youtubeChannelUrl && (
                              <a
                                href={show.youtubeChannelUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-bold bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 transition-all"
                              >
                                <Youtube size={14} />
                                Chaîne YouTube de l'Émission →
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-zinc-900/60 border-t border-white/5 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingShow(show);
                              setShowName(show.showName || '');
                              setShowHostName(show.hostName || '');
                              setShowAvatar(show.avatar || '');
                              setShowCoverUrl(show.coverUrl || '');
                              setShowMediaType(show.mediaType || 'image');
                              setShowMediaUrl(show.mediaUrl || '');
                              setShowDescription(show.description || '');
                              setShowYoutubeUrl(show.youtubeChannelUrl || '');
                              setShowFeaturedRestaurant(show.featuredRestaurantName || '');
                              setShowRating(show.rating || 4.9);
                              setShowActive(show.active ?? true);
                              setShowShowForm(true);
                            }}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Sliders size={12} />
                            Éditer
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCulinaryShow(show.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. FOOD YOUTUBERS SUB TAB */}
              {djsSubTab === 'youtubers' && (
                <div className="space-y-6">
                  {/* YouTuber Form */}
                  {showYouTuberForm && (
                    <form onSubmit={handleSaveFoodYouTuber} className="bg-[#0C0C0E] border border-red-500/40 rounded-3xl p-6 space-y-5 shadow-2xl animate-fade-in">
                      <div className="flex justify-between items-center pb-3 border-b border-white/10">
                        <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Youtube size={18} className="text-red-500" />
                          {editingYouTuber ? '✏️ Éditer le Créateur Food' : '➕ Nouveau YouTuber Food'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => { setShowYouTuberForm(false); setEditingYouTuber(null); }}
                          className="text-zinc-500 hover:text-white p-1"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Nom du Créateur</label>
                          <input
                            type="text"
                            required
                            value={ytCreatorName}
                            onChange={(e) => setYtCreatorName(e.target.value)}
                            placeholder="Ex: Florian OnAir"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Nombre d'Abonnés</label>
                          <input
                            type="text"
                            value={ytSubscribers}
                            onChange={(e) => setYtSubscribers(e.target.value)}
                            placeholder="Ex: 850K"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Lien de la Chaîne YouTube Officielle</label>
                            <button
                              type="button"
                              onClick={() => handleVerifyYoutubeUrl(ytYoutubeUrl, (data) => {
                                if (data.authorName && !ytCreatorName) setYtCreatorName(data.authorName);
                                if (data.channelName && !ytChannelName) setYtChannelName(data.channelName);
                                if (data.subscribers && !ytSubscribers) setYtSubscribers(data.subscribers);
                                if (data.thumbnailUrl && !ytCoverUrl) setYtCoverUrl(data.thumbnailUrl);
                                if (data.avatar && !ytAvatar) setYtAvatar(data.avatar);
                                if (data.description && !ytBio) setYtBio(data.description);
                              })}
                              disabled={isVerifyingYoutube}
                              className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                            >
                              <CheckCircle size={12} />
                              {isVerifyingYoutube ? 'Vérification...' : '🔍 Vérifier & Extraire'}
                            </button>
                          </div>
                          <input
                            type="text"
                            required
                            value={ytYoutubeUrl}
                            onChange={(e) => setYtYoutubeUrl(e.target.value)}
                            placeholder="Ex: https://www.youtube.com/@FlorianOnAir"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">URL Image de Couverture / Bannière</label>
                          <input
                            type="text"
                            value={ytCoverUrl}
                            onChange={(e) => setYtCoverUrl(e.target.value)}
                            placeholder="Ex: https://images.unsplash.com/..."
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Bio & Style de Dégustation</label>
                            <button
                              type="button"
                              onClick={() => handleGenerateAiDescription('youtuber', ytCreatorName || ytChannelName, ytSubscribers, (desc) => setYtBio(desc))}
                              disabled={isGeneratingAiDesc}
                              className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-black px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50 shadow-md"
                            >
                              <Sparkles size={12} />
                              {isGeneratingAiDesc ? 'Génération IA...' : '✨ Générer par IA'}
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={ytBio}
                            onChange={(e) => setYtBio(e.target.value)}
                            placeholder="Style de revues, avis sans filtre..."
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-3 justify-end border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => { setShowYouTuberForm(false); setEditingYouTuber(null); }}
                          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg cursor-pointer"
                        >
                          {editingYouTuber ? 'Mettre à jour YouTuber' : 'Créer YouTuber'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Food YouTubers Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {foodYouTubersList.map((yt) => (
                      <div key={yt.id} className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-red-500/40 transition-all">
                        <div>
                          <div className="relative h-40 bg-black overflow-hidden">
                            <img src={yt.coverUrl || yt.mediaUrl} alt={yt.creatorName} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                            <span className="absolute top-3 left-3 bg-red-600 text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                              {yt.subscribersCount} ABONNÉS
                            </span>
                          </div>

                          <div className="p-4 space-y-2">
                            <h4 className="text-sm font-extrabold text-white">{yt.creatorName}</h4>
                            <p className="text-xs text-zinc-400 line-clamp-2">{yt.bio}</p>

                            {yt.youtubeChannelUrl && (
                              <a
                                href={yt.youtubeChannelUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-bold bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 transition-all"
                              >
                                <Youtube size={14} />
                                Visiter la Chaîne YouTube →
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-zinc-900/60 border-t border-white/5 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingYouTuber(yt);
                              setYtCreatorName(yt.creatorName || '');
                              setYtChannelName(yt.channelName || '');
                              setYtSubscribers(yt.subscribersCount || '');
                              setYtAvatar(yt.avatar || '');
                              setYtCoverUrl(yt.coverUrl || '');
                              setYtMediaType(yt.mediaType || 'image');
                              setYtMediaUrl(yt.mediaUrl || '');
                              setYtBio(yt.bio || '');
                              setYtYoutubeUrl(yt.youtubeChannelUrl || '');
                              setYtFeaturedVideoUrl(yt.featuredVideoUrl || '');
                              setYtRating(yt.rating || 4.9);
                              setYtActive(yt.active ?? true);
                              setShowYouTuberForm(true);
                            }}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Sliders size={12} />
                            Éditer
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteFoodYouTuber(yt.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-6 max-w-6xl w-full">
              {/* Media Management Dashboard info */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <FileImage size={16} className="text-[#FF5C00]" />
                    Gestionnaire d'Espace Média Global
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Gérez et organisez l'intégralité des visuels de l'application (photos, logos, vidéos) classés par dossiers de restaurants et tags thématiques.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingMedia(null);
                    setMediaTitle('');
                    setMediaUrl('');
                    setMediaTypeState('image');
                    setMediaRestaurantId('');
                    setMediaTagsStr('');
                    setMediaIsPosted(false);
                    setShowMediaForm(true);
                  }}
                  className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(255,92,0,0.2)] cursor-pointer self-start md:self-auto"
                >
                  <Plus size={14} />
                  Ajouter un Média
                </button>
              </div>

              {/* Folder Selector (Horizontal scroll bar on mobile, beautiful badges/folders) */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">📁 Dossiers Restaurants Partenaires</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  <button
                    onClick={() => setSelectedFolder('all')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold tracking-tight transition-all shrink-0 flex items-center gap-1.5 border ${
                      selectedFolder === 'all'
                        ? 'bg-[#FF5C00]/10 border-[#FF5C00]/30 text-white shadow-[0_0_8px_rgba(255,92,0,0.1)]'
                        : 'bg-zinc-950 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    📂 Tous les Dossiers ({adminMediaList.length})
                  </button>
                  <button
                    onClick={() => setSelectedFolder('')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold tracking-tight transition-all shrink-0 flex items-center gap-1.5 border ${
                      selectedFolder === ''
                        ? 'bg-[#FF5C00]/10 border-[#FF5C00]/30 text-white shadow-[0_0_8px_rgba(255,92,0,0.1)]'
                        : 'bg-zinc-950 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    📁 Non Associés ({adminMediaList.filter(m => !m.restaurantId).length})
                  </button>
                  {restaurants.map((r) => {
                    const count = adminMediaList.filter(m => m.restaurantId === r.id).length;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedFolder(r.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold tracking-tight transition-all shrink-0 flex items-center gap-1.5 border ${
                          selectedFolder === r.id
                            ? 'bg-[#FF5C00]/10 border-[#FF5C00]/30 text-white shadow-[0_0_8px_rgba(255,92,0,0.1)]'
                            : 'bg-zinc-950 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                      >
                        📁 {r.name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filters Panel (Search and Tags system) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="bg-zinc-950 border border-white/5 rounded-2xl p-3 flex items-center gap-2">
                  <Search size={14} className="text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Rechercher par titre de média..."
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-white focus:outline-none placeholder-zinc-500"
                  />
                </div>

                {/* Tag Selection Row */}
                <div className="md:col-span-2 bg-zinc-950 border border-white/5 rounded-2xl p-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase shrink-0 px-2 flex items-center gap-1"><Tag size={12} /> Tags:</span>
                  {['all', 'menu', 'promo', 'ambiance', 'logo', 'video'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                        selectedTag === tag
                          ? 'bg-[#FF5C00] text-white'
                          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {tag === 'all' ? 'Tout' : tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Media Form popup/dropdown inside page */}
              {showMediaForm && (
                <form onSubmit={handleCreateOrUpdateMedia} className="bg-[#0C0C0E] border border-[#FF5C00]/30 rounded-3xl p-5 space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      {editingMedia ? '✏️ Éditer le Média' : '➕ Nouveau Média'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => { setShowMediaForm(false); setEditingMedia(null); }}
                      className="text-zinc-500 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Titre du Média</label>
                      <input
                        type="text"
                        required
                        value={mediaTitle}
                        onChange={(e) => setMediaTitle(e.target.value)}
                        placeholder="Ex: Pizza Burrata en plan serré"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">URL d'accès du fichier</label>
                      <input
                        type="text"
                        required
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        placeholder="Ex: https://images.unsplash.com/..."
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Type de Média</label>
                      <select
                        value={mediaTypeState}
                        onChange={(e: any) => setMediaTypeState(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="image">📸 Image (Menu / Ambiance / Logo)</option>
                        <option value="video">🎥 Vidéo (Feed principal)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Dossier Restaurant</label>
                      <select
                        value={mediaRestaurantId}
                        onChange={(e) => setMediaRestaurantId(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="">📁 Général / Non Associé</option>
                        {restaurants.map(r => (
                          <option key={r.id} value={r.id}>📁 {r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Glisser-déposer / Téléverser un fichier (Image ou Vidéo)</label>
                      <div
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                          dragActive ? 'border-[#FF5C00] bg-[#FF5C00]/10' : 'border-white/10 hover:border-white/20 bg-zinc-950'
                        }`}
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragActive(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFile(e.dataTransfer.files[0]).then(() => {
                              if (uploadedFileUrl) setMediaUrl(uploadedFileUrl);
                            });
                          }
                        }}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*,video/*';
                          input.onchange = (e: any) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFile(e.target.files[0]).then(() => {
                                if (uploadedFileUrl) setMediaUrl(uploadedFileUrl);
                              });
                            }
                          };
                          input.click();
                        }}
                      >
                        {isUploadingFile ? (
                          <p className="text-xs text-[#FF5C00] font-mono font-bold animate-pulse">
                            ⏳ Téléversement du fichier en cours...
                          </p>
                        ) : (
                          <div className="space-y-1">
                            <UploadCloud size={20} className="text-[#FF5C00] mx-auto" />
                            <p className="text-xs font-bold text-white">
                              Glissez-déposez la vidéo ou l'image ici, ou <span className="text-[#FF5C00] underline">parcourez</span>
                            </p>
                          </div>
                        )}
                      </div>
                      {uploadedFileUrl && (
                        <div className="mt-2 text-[10px] text-green-400 font-mono flex items-center justify-between bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                          <span className="truncate">URL: {uploadedFileUrl}</span>
                          <button
                            type="button"
                            onClick={() => setMediaUrl(uploadedFileUrl)}
                            className="bg-green-500 text-black px-2 py-0.5 rounded font-bold uppercase shrink-0"
                          >
                            Appliquer
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Tags Associés (Séparés par virgule)</label>
                      <input
                        type="text"
                        value={mediaTagsStr}
                        onChange={(e) => setMediaTagsStr(e.target.value)}
                        placeholder="Ex: menu, promo, ambiance, phare, burger"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      />
                      <p className="text-[9px] text-zinc-500 font-mono">Conseil: Saisissez "menu", "promo" ou "ambiance" pour l'intégration automatique aux filtres.</p>
                    </div>

                    <div className="md:col-span-2 flex items-center gap-3 bg-zinc-950 p-3 rounded-xl border border-white/5">
                      <input
                        type="checkbox"
                        id="mediaIsPosted"
                        checked={mediaIsPosted}
                        onChange={(e) => setMediaIsPosted(e.target.checked)}
                        className="w-4 h-4 text-[#FF5C00] bg-zinc-900 border-zinc-700 rounded focus:ring-0"
                      />
                      <label htmlFor="mediaIsPosted" className="text-xs text-zinc-300 font-sans cursor-pointer">
                        <strong>Publier automatiquement sur le Feed client ?</strong> (Si vidéo, s'ajoute directement au flux d'attraction client).
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setShowMediaForm(false); setEditingMedia(null); }}
                      className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 px-4 py-2.5 rounded-xl text-xs font-bold uppercase cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
                    >
                      {editingMedia ? 'Enregistrer les Modifications' : 'Créer le Média'}
                    </button>
                  </div>
                </form>
              )}

              {/* Media List Grid */}
              {mediaLoading ? (
                <div className="text-center py-12 text-zinc-500 font-mono text-xs animate-pulse">
                  Chargement de l'espace média...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {adminMediaList
                    .filter(m => {
                      if (selectedFolder === 'all') return true;
                      return (m.restaurantId === selectedFolder || (selectedFolder === '' && !m.restaurantId));
                    })
                    .filter(m => {
                      if (selectedTag === 'all') return true;
                      if (selectedTag === 'video') return m.mediaType === 'video';
                      if (selectedTag === 'logo') return m.tags?.includes('logo') || m.title.toLowerCase().includes('logo') || m.url.toLowerCase().includes('logo');
                      return m.tags?.includes(selectedTag);
                    })
                    .filter(m => {
                      if (!mediaSearch) return true;
                      return m.title.toLowerCase().includes(mediaSearch.toLowerCase());
                    })
                    .map((media) => {
                      const associatedRest = restaurants.find(r => r.id === media.restaurantId);
                      return (
                        <div key={media.id} className="bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden flex flex-col group hover:border-white/10 transition-all duration-300">
                          {/* Visual preview */}
                          <div className="aspect-video relative bg-zinc-900 overflow-hidden flex items-center justify-center">
                            {media.mediaType === 'video' ? (
                              <div className="w-full h-full relative">
                                <video 
                                  src={(isDirectPlayableVideo(media.url) ? getSafeVideoUrl(media.url) : null) || STABLE_CULINARY_FALLBACK_VIDEOS[0]} 
                                  className="w-full h-full object-cover" 
                                  muted 
                                  playsInline 
                                  onError={(e) => {
                                    console.warn('[AdminCMS] Media library video failed, falling back');
                                    if (e.currentTarget.src !== STABLE_CULINARY_FALLBACK_VIDEOS[0]) {
                                      e.currentTarget.src = STABLE_CULINARY_FALLBACK_VIDEOS[0];
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <span className="bg-black/70 border border-white/20 p-2 rounded-full text-white text-[10px] uppercase font-black tracking-wider flex items-center gap-1">
                                    🎥 Vidéo
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <img src={media.url} alt={media.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" referrerPolicy="no-referrer" />
                            )}
                            
                            {/* Toggle Publish state tag */}
                            <span className={`absolute top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                              media.isPosted
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-zinc-800 text-zinc-500 border-white/5'
                            }`}>
                              {media.isPosted ? '● En Ligne' : 'Brouillon'}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="p-3 flex-1 flex flex-col justify-between space-y-3">
                            <div className="space-y-1.5">
                              <h4 className="text-[11px] font-bold text-white tracking-tight leading-snug line-clamp-2" title={media.title}>
                                {media.title}
                              </h4>
                              
                              <p className="text-[9px] text-zinc-500 font-medium truncate flex items-center gap-1 font-mono">
                                📁 {associatedRest ? associatedRest.name : 'Général / Non Associé'}
                              </p>

                              {/* Tags pill list */}
                              <div className="flex flex-wrap gap-1">
                                {media.tags && media.tags.length > 0 ? (
                                  media.tags.map((t: string) => (
                                    <span key={t} className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-400">
                                      {t}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[8px] text-zinc-600 font-mono">aucun tag</span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1">
                              <button
                                onClick={() => {
                                  setEditingMedia(media);
                                  setMediaTitle(media.title);
                                  setMediaUrl(media.url);
                                  setMediaTypeState(media.mediaType);
                                  setMediaRestaurantId(media.restaurantId || '');
                                  setMediaTagsStr(media.tags?.join(', ') || '');
                                  setMediaIsPosted(!!media.isPosted);
                                  setShowMediaForm(true);
                                }}
                                className="flex-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleDeleteMedia(media.id)}
                                className="bg-red-950/20 hover:bg-red-900/30 text-red-400 p-1.5 rounded-lg border border-red-900/10 transition-all cursor-pointer"
                                title="Supprimer le média"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  
                  {adminMediaList.length === 0 && (
                    <div className="col-span-full py-16 text-center text-xs text-zinc-500 font-mono">
                      Aucun média trouvé dans cet espace de stockage.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 12. SYSTEM BACKUPS TAB */}
          {activeTab === 'backup' && (
            <div className="space-y-6 max-w-4xl w-full">
              {/* 🔥 Firebase Cloud Storage & Permanent Database Space */}
              <div className="bg-gradient-to-br from-[#0D0D11] via-[#121016] to-[#170E08] border border-orange-500/20 rounded-3xl p-6 space-y-5 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Firebase Firestore Connecté
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        Protection Anti-Effacement Active
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider mt-2 flex items-center gap-2">
                      🔥 Espace Cloud Firebase & Sauvegarde Définitive
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Vos restaurants et vidéos sont enregistrés et synchronisés sur le Cloud Firestore. Aucune modification ni mise à jour n'effacera vos données.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-2xl p-3 shrink-0">
                    <div className="text-center px-3 border-r border-white/10">
                      <p className="text-lg font-black text-white">{restaurants.length}</p>
                      <p className="text-[9px] text-zinc-400 uppercase font-mono">Restaurants</p>
                    </div>
                    <div className="text-center px-3">
                      <p className="text-lg font-black text-[#FF5C00]">{videos.length}</p>
                      <p className="text-[9px] text-zinc-400 uppercase font-mono">Vidéos</p>
                    </div>
                  </div>
                </div>

                {/* Status or Result Message Banner */}
                {syncResultMsg && (
                  <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs font-semibold text-orange-200 animate-fade-in flex items-center justify-between">
                    <span>{syncResultMsg}</span>
                    <button onClick={() => setSyncResultMsg(null)} className="text-zinc-400 hover:text-white text-xs ml-3 font-mono cursor-pointer">✕</button>
                  </div>
                )}

                {/* Action Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Button 1: Force Sync & Lock into Firestore */}
                  <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-4 flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>🔒</span> Synchroniser & Verrouiller dans Firebase
                      </h4>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Force la sauvegarde intégrale de tous les restaurants, vidéos, plats et recettes vers le stockage persistant Firestore.
                      </p>
                    </div>
                    <button
                      id="btn-sync-all-to-firestore"
                      disabled={isSyncingFirebase}
                      onClick={handleSyncAllToFirestore}
                      className="w-full bg-gradient-to-r from-[#FF5C00] to-orange-600 hover:brightness-110 text-white text-xs font-black uppercase tracking-wider py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSyncingFirebase ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Verrouillage en cours...</span>
                        </>
                      ) : (
                        <>
                          <span>💾</span>
                          <span>Sauvegarder tout dans Firebase</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Button 2: Clean and Organize Video Feed */}
                  <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-4 flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>🧹</span> Nettoyer la Base & Priorité Restaurants
                      </h4>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Supprime les vidéos orphelines sans restaurant, garantit une vidéo pour chaque restaurant et place les restaurants en tête du feed.
                      </p>
                    </div>
                    <button
                      id="btn-clean-database-videos"
                      disabled={isCleaningVideos}
                      onClick={handleCleanDatabaseVideos}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-200 hover:text-white text-xs font-black uppercase tracking-wider py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCleaningVideos ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Nettoyage en cours...</span>
                        </>
                      ) : (
                        <>
                          <span>✨</span>
                          <span>Nettoyer & Réordonner les Vidéos</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Button 3: Export JSON */}
                  <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-4 flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>📥</span> Exporter les Restaurants & Données (JSON)
                      </h4>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Téléchargez l'intégralité de vos restaurants, cartes, menus et configurations dans un fichier JSON pour sauvegarde physique.
                      </p>
                    </div>
                    <button
                      id="btn-export-data-json"
                      onClick={handleExportDataJson}
                      className="w-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-black uppercase tracking-wider py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Télécharger le Fichier JSON</span>
                    </button>
                  </div>

                  {/* Button 4: Import JSON */}
                  <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-4 flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>📤</span> Importer des Restaurants (JSON)
                      </h4>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Restaurez ou transférez vos restaurants depuis un fichier JSON sur n'importe quel appareil en toute sécurité.
                      </p>
                    </div>
                    <label className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-black uppercase tracking-wider py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-center">
                      <Upload size={14} />
                      <span>Sélectionner Fichier JSON à Importer</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportDataJson}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Backups Panel Core description */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <RefreshCw size={16} className="text-[#FF5C00]" />
                    Historique & Gestionnaire de Sauvegardes
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Enregistrez des clichés stables de la base de données de l'application et de ses configurations de design en temps réel. Restaurez votre espace à un état parfait en un clic.
                  </p>
                </div>

                {/* Big Shiny Restore Original Button */}
                <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-[#FF5C00]/10 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      ✨ Configuration d'Origine Sacrée
                    </h4>
                    <p className="text-[10px] text-zinc-400">
                      Rétablissez la version de référence certifiée propre du studio photo et de l'annuaire culinaire d'origine.
                    </p>
                  </div>
                  <button
                    disabled={isRestoringBackupId !== null}
                    onClick={() => handleRestoreBackup('original')}
                    className="bg-gradient-to-r from-yellow-500 via-amber-500 to-[#FF5C00] hover:brightness-110 text-white font-black uppercase tracking-widest text-[10px] px-5 py-3 rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.25)] transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
                  >
                    {isRestoringBackupId === 'original' ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      '🔄 REVENIR À LA SAUVEGARDE D\'ORIGINE'
                    )}
                  </button>
                </div>
              </div>

              {/* Create new manual backup form */}
              <div className="bg-zinc-950 border border-white/5 rounded-3xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">💾 Créer un Nouveau Point de Restauration</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Ex: Sauvegarde avant modification des logos du 15/07"
                    value={newBackupName}
                    onChange={(e) => setNewBackupName(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                  />
                  <button
                    disabled={isCreatingBackup}
                    onClick={handleCreateBackup}
                    className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isCreatingBackup ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Effectuer la sauvegarde'
                    )}
                  </button>
                </div>
              </div>

              {/* Backups List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">📋 Liste des Sauvegardes Disponibles ({backupsList.length})</h4>
                
                {backupsLoading ? (
                  <div className="text-center py-8 text-zinc-500 font-mono text-xs animate-pulse">
                    Chargement de l'historique de sauvegardes...
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {backupsList.map((bk) => (
                      <div key={bk.id} className="bg-zinc-950 border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-4 hover:border-white/10 transition-all">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">{bk.name}</span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                              bk.type === 'original'
                                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                : 'bg-zinc-900 text-zinc-400 border border-white/5'
                            }`}>
                              {bk.type === 'original' ? "D'origine" : 'Manuelle'}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            Créée le: {new Date(bk.createdAt).toLocaleString('fr-FR')} | ID: {bk.id}
                          </p>
                        </div>

                        <button
                          disabled={isRestoringBackupId !== null}
                          onClick={() => handleRestoreBackup(bk.id)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                            isRestoringBackupId === bk.id
                              ? 'bg-zinc-800 text-zinc-400'
                              : bk.type === 'original'
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400'
                                : 'bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300'
                          }`}
                        >
                          {isRestoringBackupId === bk.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-zinc-300 rounded-full animate-spin" />
                          ) : (
                            'Restaurer'
                          )}
                        </button>
                      </div>
                    ))}

                    {backupsList.length === 0 && (
                      <div className="text-center py-12 text-xs text-zinc-500 font-mono">
                        Aucun point de sauvegarde détecté dans la base Firestore.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 13. DIAGNOSTICS, INCIDENTS & VIDEO ABSOLUTE PURGE TAB */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6 max-w-6xl w-full">
              
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-amber-500/15 via-red-500/10 to-zinc-950 border border-amber-500/30 rounded-3xl p-6 space-y-4 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-wider animate-pulse">
                        SÉCURITÉ & STABILITÉ MAX
                      </span>
                      <span className="text-[10px] font-mono text-amber-400">FID-DIAGNOSTIC-v3.0</span>
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle className="text-amber-400" size={20} />
                      Centre de Diagnostic, Incidents & Purge Absolue
                    </h3>
                    <p className="text-xs text-zinc-300 font-sans">
                      Supervisez la santé du système en temps réel, résolvez les réclamations clients en un clic et effectuez la purge intégrale des vidéos inactives.
                    </p>
                  </div>

                  <button
                    onClick={fetchDiagnosticsData}
                    className="bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <RefreshCw size={14} />
                    Actualiser l'état
                  </button>
                </div>

                {/* System Health Status Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                  <div className="bg-zinc-950/80 border border-emerald-500/30 p-3 rounded-2xl flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase">API Serveur</span>
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      100% Opérationnel
                    </span>
                  </div>

                  <div className="bg-zinc-950/80 border border-emerald-500/30 p-3 rounded-2xl flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase">Base Firestore</span>
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Connecté & Sync
                    </span>
                  </div>

                  <div className="bg-zinc-950/80 border border-emerald-500/30 p-3 rounded-2xl flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase">Paiement Stripe / Apple</span>
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Robuste & Prêt
                    </span>
                  </div>

                  <div className="bg-zinc-950/80 border border-emerald-500/30 p-3 rounded-2xl flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase">Géolocalisation GPS</span>
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Haversine Actif
                    </span>
                  </div>

                  <div className="bg-zinc-950/80 border border-emerald-500/30 p-3 rounded-2xl flex flex-col gap-1 col-span-2 md:col-span-1">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase">Stockage Vidéos</span>
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Purge Active ({videos.filter(v => v.isOnline !== false).length} En ligne)
                    </span>
                  </div>
                </div>
              </div>

              {/* VIDEO REPAIR & FIRESTORE LOCKING BOX */}
              <div className="bg-gradient-to-r from-emerald-950/60 via-zinc-950 to-emerald-950/60 border border-emerald-500/40 p-6 rounded-3xl space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <VideoIcon className="text-emerald-400" size={20} />
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">
                        Restauration & Verrouillage Firestore du Feed Vidéo
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      Réparer, valider et ré-indexer <strong className="text-emerald-400">toutes les vidéos du catalogue</strong> dans la base de données Firestore et la sauvegarde locale. Résout définitivement tout problème de vidéos masquées ou disparues.
                    </p>
                  </div>

                  <button
                    disabled={isPurgingVideos}
                    onClick={handleExecuteRepairVideos}
                    className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:brightness-110 text-white font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap self-stretch md:self-auto shrink-0"
                  >
                    {isPurgingVideos ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <VideoIcon size={16} />
                        🛡️ RÉPARER & SYNCHRONISER TOUTES LES VIDÉOS (FIRESTORE)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ABSOLUTE VIDEO PURGE ACTION BOX */}
              <div className="bg-gradient-to-r from-red-950/60 via-zinc-950 to-red-950/60 border border-red-500/40 p-6 rounded-3xl space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <Trash2 className="text-red-500" size={20} />
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">
                        Règle Absolue : Purge Intégrale des Vidéos Inactives & Hors-Ligne
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      Conformément à votre exigence stricte, cet outil va rechercher et <strong className="text-white underline">effacer définitivement et sans laisser la moindre trace</strong> toutes les vidéos qui ne sont pas actuellement en ligne (brouillons, vidéos marquées offline, périmées ou dont les restaurants n'existent plus). Les commentaires associés et les fichiers en cache navigateur seront intégralement gommés.
                    </p>
                  </div>

                  <button
                    disabled={isPurgingVideos}
                    onClick={handleExecuteAbsolutePurge}
                    className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:brightness-110 text-white font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl shadow-[0_10px_30px_rgba(225,29,72,0.4)] transition-all flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap self-stretch md:self-auto shrink-0"
                  >
                    {isPurgingVideos ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={16} />
                        🔥 EXÉCUTER LA PURGE INTÉGRALE (0 TRACE)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CUSTOMER COMPLAINTS & INCIDENT RESOLUTION DESK */}
              <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className="text-[#FF5C00]" size={18} />
                      Espace Réclamations Clients & Support
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                      Identifiez immédiatement les problèmes de livraison, erreurs de paiement ou bugs et réglez-les instantanément.
                    </p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/5 p-1 rounded-xl text-[10px] font-bold uppercase tracking-wider">
                    {(['all', 'open', 'in_progress', 'resolved'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setTicketFilter(f)}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          ticketFilter === f ? 'bg-[#FF5C00] text-white shadow' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {f === 'all' ? 'Tous' : f === 'open' ? 'Ouverts' : f === 'in_progress' ? 'En cours' : 'Résolus'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tickets List */}
                <div className="space-y-3">
                  {supportTickets
                    .filter(t => ticketFilter === 'all' || t.status === ticketFilter)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-amber-500/30 transition-all"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-amber-400">#{t.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              t.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              t.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              {t.severity}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              t.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400 animate-pulse'
                            }`}>
                              {t.status === 'resolved' ? '✓ Résolu' : 'En attente'}
                            </span>
                            {t.orderId && (
                              <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                                Commande: #{t.orderId}
                              </span>
                            )}
                          </div>

                          <h5 className="text-xs font-black text-white">{t.title}</h5>
                          <p className="text-xs text-zinc-300 font-sans">{t.description}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            Client: {t.userEmail} • Reçu le: {new Date(t.createdAt).toLocaleString('fr-FR')}
                          </p>

                          {t.resolutionNotes && (
                            <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl text-[11px] text-emerald-300 font-sans mt-2">
                              <strong>Note de Résolution:</strong> {t.resolutionNotes}
                              {t.refundAmount && <span className="ml-2 font-bold">• Remboursé: {t.refundAmount}€</span>}
                            </div>
                          )}
                        </div>

                        {/* Ticket Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                          {t.orderId && (
                            <button
                              onClick={() => handleRefundOrderAction(t.orderId)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <DollarSign size={13} />
                              Rembourser Commande
                            </button>
                          )}

                          {t.status !== 'resolved' && (
                            <button
                              onClick={() => setTicketResolutionModal({ ticket: t, notes: '', refundAmount: '' })}
                              className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow transition-all cursor-pointer"
                            >
                              <CheckCircle size={13} />
                              Corriger & Clôturer
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                  {supportTickets.length === 0 && (
                    <div className="text-center py-10 text-xs text-zinc-500 font-mono">
                      Aucune réclamation client enregistrée.
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE SYSTEM LOGS & AUDIT CONSOLE */}
              <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="text-amber-400" size={18} />
                      Journal d'Événements & Logs Système
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                      Suivi automatisé des transactions, géolocalisation, statut vidéo et réconciliation des erreurs.
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      const { offlineCacheService } = await import('../services/OfflineCacheService');
                      offlineCacheService.clearAllErrorCaches();
                      setFeedbackToast({ type: 'success', message: 'Caches d\'erreurs client vidés avec succès.' });
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    🧹 Vider Caches d'Erreurs
                  </button>
                </div>

                <div className="bg-zinc-900/90 border border-white/5 rounded-2xl overflow-hidden max-h-80 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-950 border-b border-white/10 text-[9px] font-mono uppercase text-zinc-400 sticky top-0">
                      <tr>
                        <th className="p-3">Horodatage</th>
                        <th className="p-3">Niveau</th>
                        <th className="p-3">Module</th>
                        <th className="p-3">Message</th>
                        <th className="p-3">Détails</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[11px] font-mono">
                      {systemLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-zinc-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              log.level === 'ERROR' ? 'bg-red-500/20 text-red-400' :
                              log.level === 'WARN' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {log.level}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-amber-300 whitespace-nowrap">{log.module}</td>
                          <td className="p-3 text-white font-sans">{log.message}</td>
                          <td className="p-3 text-zinc-400 font-sans text-[10px]">{log.details || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* 14. MERCHANT & CREATOR PARTNER APPLICATIONS TAB */}
          {activeTab === 'applications' && (
            <div className="space-y-6 max-w-6xl w-full">
              
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-[#FF5C00]/20 via-amber-500/10 to-zinc-950 border border-[#FF5C00]/30 rounded-3xl p-6 space-y-4 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] border border-[#FF5C00]/30 text-[9px] font-black uppercase tracking-wider">
                        ESPACE VENDEURS & CRÉATEURS 3 NIVEAUX
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
                      Gestion des Candidatures Marchands & Créateurs
                    </h3>
                    <p className="text-xs text-zinc-400 font-sans">
                      Validez ou modérez les candidatures pour les 3 profils partenaires (Restaurateurs, YouTubers Foodie, Formateurs Masterclass).
                    </p>
                  </div>

                  <button
                    onClick={fetchMerchantApps}
                    className="bg-white/10 hover:bg-white/20 text-white font-mono text-xs px-3.5 py-2 rounded-xl border border-white/10 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    Actualiser
                  </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-black/40 border border-white/10 p-3.5 rounded-2xl">
                    <span className="text-2xl font-black text-white font-mono block">
                      {merchantApps.length}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans uppercase font-bold">Total Candidatures</span>
                  </div>

                  <div className="bg-black/40 border border-white/10 p-3.5 rounded-2xl">
                    <span className="text-2xl font-black text-[#FF5C00] font-mono block">
                      {merchantApps.filter(a => a.partnerType === 'restaurateur').length}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans uppercase font-bold">🏪 Restaurateurs</span>
                  </div>

                  <div className="bg-black/40 border border-white/10 p-3.5 rounded-2xl">
                    <span className="text-2xl font-black text-amber-400 font-mono block">
                      {merchantApps.filter(a => a.partnerType === 'foodie_reviewer').length}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans uppercase font-bold">🎥 YouTubers Foodie</span>
                  </div>

                  <div className="bg-black/40 border border-white/10 p-3.5 rounded-2xl">
                    <span className="text-2xl font-black text-rose-400 font-mono block">
                      {merchantApps.filter(a => a.partnerType === 'culinary_show_host').length}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans uppercase font-bold">🍳 Masterclass Chefs</span>
                  </div>
                </div>
              </div>

              {/* Table of Applications */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Store size={16} className="text-[#FF5C00]" />
                    Liste des Dossiers Déposés
                  </h4>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        value={appSearchTerm}
                        onChange={e => setAppSearchTerm(e.target.value)}
                        placeholder="Rechercher candidat, ville, email..."
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50"
                      />
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                      {[
                        { id: 'all', label: 'Toutes' },
                        { id: 'pending', label: '⏳ En Attente' },
                        { id: 'approved', label: '✓ Validées' },
                        { id: 'rejected', label: '✕ Refusées' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setAppStatusFilter(tab.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                            appStatusFilter === tab.id
                              ? 'bg-[#FF5C00] text-white shadow-md'
                              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-zinc-400 font-mono text-[10px] uppercase">
                        <th className="p-3">ID / Date</th>
                        <th className="p-3">Profil Partenaire</th>
                        <th className="p-3">Candidat & Contact</th>
                        <th className="p-3">Établissement / Chaîne / Show</th>
                        <th className="p-3">Statut</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300 font-sans">
                      {merchantApps
                        .filter(a => {
                          if (appStatusFilter !== 'all' && a.status !== appStatusFilter) return false;
                          if (!appSearchTerm) return true;
                          const term = appSearchTerm.toLowerCase();
                          return (
                            (a.applicantName || '').toLowerCase().includes(term) ||
                            (a.email || '').toLowerCase().includes(term) ||
                            (a.phone || '').toLowerCase().includes(term) ||
                            (a.city || '').toLowerCase().includes(term) ||
                            (a.establishmentName || '').toLowerCase().includes(term) ||
                            (a.showTitle || '').toLowerCase().includes(term)
                          );
                        }).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-zinc-500 font-mono text-xs">
                            Aucune candidature ne correspond aux critères de recherche.
                          </td>
                        </tr>
                      ) : (
                        merchantApps
                          .filter(a => {
                            if (appStatusFilter !== 'all' && a.status !== appStatusFilter) return false;
                            if (!appSearchTerm) return true;
                            const term = appSearchTerm.toLowerCase();
                            return (
                              (a.applicantName || '').toLowerCase().includes(term) ||
                              (a.email || '').toLowerCase().includes(term) ||
                              (a.phone || '').toLowerCase().includes(term) ||
                              (a.city || '').toLowerCase().includes(term) ||
                              (a.establishmentName || '').toLowerCase().includes(term) ||
                              (a.showTitle || '').toLowerCase().includes(term)
                            );
                          })
                          .map((app) => (
                          <tr key={app.id} className="hover:bg-white/[0.02]">
                            <td className="p-3 font-mono text-[11px]">
                              <span className="text-white font-bold block">{app.id}</span>
                              <span className="text-zinc-500 text-[10px]">
                                {new Date(app.createdAt).toLocaleDateString('fr-FR')}
                              </span>
                            </td>

                            <td className="p-3">
                              {app.partnerType === 'restaurateur' && (
                                <span className="bg-[#FF5C00]/20 text-[#FF5C00] border border-[#FF5C00]/30 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono inline-flex items-center gap-1">
                                  🏪 Restaurateur
                                </span>
                              )}
                              {app.partnerType === 'foodie_reviewer' && (
                                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono inline-flex items-center gap-1">
                                  🎥 YouTuber Foodie
                                </span>
                              )}
                              {app.partnerType === 'culinary_show_host' && (
                                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono inline-flex items-center gap-1">
                                  🍳 Masterclass Chef
                                </span>
                              )}
                            </td>

                            <td className="p-3">
                              <strong className="text-white block font-bold">{app.applicantName}</strong>
                              <span className="text-zinc-400 text-[11px] block">{app.email}</span>
                              <span className="text-zinc-500 text-[10px] font-mono">{app.phone} • {app.city}</span>
                            </td>

                            <td className="p-3 text-xs">
                              {app.establishmentName && (
                                <p className="text-white font-bold">{app.establishmentName}</p>
                              )}
                              {app.siret && (
                                <p className="text-zinc-400 text-[10px] font-mono">SIRET: {app.siret}</p>
                              )}
                              {app.cuisineCategory && (
                                <p className="text-[#FF5C00] text-[10px]">{app.cuisineCategory}</p>
                              )}

                              {app.channelName && (
                                <p className="text-amber-300 font-bold">{app.channelName} ({app.socialPlatform})</p>
                              )}
                              {app.platformHandle && (
                                <p className="text-zinc-400 text-[10px] font-mono">{app.platformHandle} • {app.followerCount}</p>
                              )}

                              {app.showTitle && (
                                <p className="text-rose-300 font-bold">{app.showTitle}</p>
                              )}
                              {app.cookingDiscipline && (
                                <p className="text-zinc-400 text-[10px]">{app.cookingDiscipline} • {app.masterclassPrice}€</p>
                              )}
                            </td>

                            <td className="p-3">
                              {app.status === 'approved' && (
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono">
                                  ✓ Validé
                                </span>
                              )}
                              {app.status === 'pending' && (
                                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono animate-pulse">
                                  ⏳ En Attente
                                </span>
                              )}
                              {app.status === 'rejected' && (
                                <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono">
                                  ✕ Refusé
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-right space-x-1">
                              {app.status !== 'approved' && (
                                <button
                                  onClick={() => handleUpdateAppStatus(app.id, 'approved')}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                  title="Approuver le dossier"
                                >
                                  Valider
                                </button>
                              )}
                              {app.status !== 'rejected' && (
                                <button
                                  onClick={() => handleUpdateAppStatus(app.id, 'rejected')}
                                  className="bg-red-600/80 hover:bg-red-600 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                  title="Refuser le dossier"
                                >
                                  Refuser
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </section>
      </main>

      <EngagementPromptModal
        isOpen={isEngagementModalOpen}
        onClose={() => setIsEngagementModalOpen(false)}
        designSettings={designSettings}
        onUpdateDesignSettings={onUpdateDesignSettings}
      />

      {/* Import from URL Modal Dialog */}
      <ImportFromUrlModal
        isOpen={isImportUrlModalOpen}
        onClose={() => setIsImportUrlModalOpen(false)}
        initialUrl={importUrlPrefill}
        onSuccess={(restaurant, dishes, videos) => {
          onRefreshData();
          showFeedbackToast(`✨ Restaurant "${restaurant.name}" importé et vérifié avec succès !`, 'success');
        }}
        onOpenRestaurantInCms={(restaurant) => {
          setActiveTab('restaurants');
          handleOpenEditRest(restaurant);
        }}
      />

      {/* Edit Video Details Modal Dialog */}
      <EditVideoModal
        isOpen={isEditVideoModalOpen}
        onClose={() => {
          setIsEditVideoModalOpen(false);
          setEditingVideoForModal(null);
        }}
        video={editingVideoForModal}
        restaurants={restaurants}
        dishes={dishes}
        onVideoUpdated={(updatedVideo) => {
          onRefreshData();
        }}
        showFeedbackToast={showFeedbackToast}
      />

      {/* Custom Confirmation Modal */}
      {deleteModalState?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#0F0E13] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl p-6 space-y-6 flex flex-col transform scale-100 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                {deleteModalState.title}
              </h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {deleteModalState.message}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteModalState(null)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-850 border border-white/5 text-zinc-300 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={deleteModalState.onConfirm}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-[0_10px_25px_rgba(239,68,68,0.2)] transition-all cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Alert */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 bg-[#0F0E13]/95 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl animate-fade-in-up">
          <div className={`w-2 h-2 rounded-full ${feedbackToast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs font-bold text-white font-sans">{feedbackToast.message}</span>
          <button 
            onClick={() => setFeedbackToast(null)}
            className="text-zinc-500 hover:text-white text-xs ml-2 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
