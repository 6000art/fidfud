import React, { useState, useEffect } from 'react';
import EngagementPromptModal from './EngagementPromptModal';
import { 
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
  CheckCircle, 
  AlertCircle,
  FileImage,
  DollarSign,
  Star,
  Eye,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Search,
  Gift
} from 'lucide-react';
import { Compass, MapPin, Map as MapIcon, Globe } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Restaurant, Dish, Video, Order, OrderStatus } from '../types';

interface AdminCMSProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  dishes: Dish[];
  videos: Video[];
  orders: Order[];
  onRefreshData: () => void;
  designSettings: any;
  onUpdateDesignSettings: (settings: any) => void;
  onSaveDesignSettings?: (settings: any) => Promise<boolean>;
}

const getSafeVideoUrl = (url: string): string => {
  if (!url) return 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
  return url;
};

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
  restaurants,
  dishes,
  videos,
  orders,
  onRefreshData,
  designSettings,
  onUpdateDesignSettings,
  onSaveDesignSettings
}: AdminCMSProps) {
  
  const [isSavingDesign, setIsSavingDesign] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEngagementModalOpen, setIsEngagementModalOpen] = useState(false);

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
  
  // Tabs: 'design' | 'accueil' | 'orders' | 'restaurants' | 'clients' | 'delivery' | 'promotions' | 'showcase' | 'interactions' | 'leader' | 'formulas' | 'media' | 'backup'
  const [activeTab, setActiveTab] = useState<'design' | 'accueil' | 'orders' | 'restaurants' | 'clients' | 'delivery' | 'promotions' | 'showcase' | 'interactions' | 'leader' | 'formulas' | 'media' | 'backup'>('design');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

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
  const [restDispositionShop, setRestDispositionShop] = useState('');
  const [restShortName, setRestShortName] = useState('');
  const [restLatitude, setRestLatitude] = useState(48.8566);
  const [restLongitude, setRestLongitude] = useState(2.3522);
  const [restVideoUrl, setRestVideoUrl] = useState('');
  const [restVideoTitle, setRestVideoTitle] = useState('');
  const [restSubscriptionTier, setRestSubscriptionTier] = useState<'free' | 'pro' | 'gold'>('free');

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
  const [websiteUrlToExtract, setWebsiteUrlToExtract] = useState('');
  const [isExtractingWebsite, setIsExtractingWebsite] = useState(false);
  const [extractionStatusText, setExtractionStatusText] = useState('');

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
    if (!websiteUrlToExtract || !websiteUrlToExtract.trim()) {
      alert('Veuillez saisir une URL de site web de restaurant valide.');
      return;
    }
    setIsExtractingWebsite(true);
    setExtractionStatusText('🔍 Analyse du nom de domaine et du thème...');
    
    try {
      setTimeout(() => setExtractionStatusText('🍽️ Extraction du menu, des prix et des variations...'), 1200);
      setTimeout(() => setExtractionStatusText('🎨 Génération automatique de l\'identité visuelle (Logo, Bannière, Slogan)...'), 2500);
      setTimeout(() => setExtractionStatusText('✨ Publication de la vidéo du restaurant en tête du feed...'), 3800);

      const res = await fetch('/api/extract-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrlToExtract })
      });
      const data = await res.json();
      if (res.ok) {
        setTimeout(() => {
          setIsExtractingWebsite(false);
          setWebsiteUrlToExtract('');
          onRefreshData();
          alert(`✨ Extraction réussie ! Le restaurant "${data.restaurant.name}" avec ${data.dishes.length} plats et sa vidéo ont été créés et publiés.`);
        }, 4500);
      } else {
        setIsExtractingWebsite(false);
        alert(`Erreur d'extraction : ${data.error}`);
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
      const data = await res.json();
      if (res.ok) {
        onRefreshData();
        alert(`✨ ${data.count} restaurants ont été créés par lot pour la ville de ${bulkCity} (${bulkDistrict || 'Arrondissements multiples'}) avec succès !`);
        setBulkNamesText('');
        setBulkDistrict('');
        setShowBulkRestForm(false);
      } else {
        alert(`Erreur lors de la création : ${data.error}`);
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
      const data = await res.json();
      if (res.ok && data.success) {
        setRadarResults(data.results);
        setRadarProgress(prev => [...prev, `✅ Scan terminé avec succès ! ${data.results.length} pépites culinaires localisées.`]);
      } else {
        alert(`Erreur de scan : ${data.error || 'Erreur inconnue'}`);
        setRadarProgress(prev => [...prev, `❌ Échec du scan radar.`]);
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
      const data = await res.json();
      if (res.ok && data.success) {
        setImportedRadarIds(prev => [...prev, item.name]);
        onRefreshData();
        if (selectedRadarResult && selectedRadarResult.name === item.name) {
          setSelectedRadarResult(prev => prev ? { ...prev, isAlreadyImported: true } : null);
        }
      } else {
        alert(`Erreur d'importation : ${data.error || 'Erreur inconnue'}`);
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

  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez déposer une image valide (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('L\'image dépasse la taille maximale autorisée de 2 Mo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onUpdateDesignSettings({ logoUrl: e.target.result as string });
        alert('✨ Icône de logo personnalisé importé avec succès !');
      }
    };
    reader.readAsDataURL(file);
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
    setRestCategory(rest.category || 'Italien & Pizza');
    setRestDispositionShop(rest.dispositionShop || '');
    setRestShortName(rest.shortName || '');
    setRestLatitude(rest.latitude !== undefined ? rest.latitude : 48.8566);
    setRestLongitude(rest.longitude !== undefined ? rest.longitude : 2.3522);
    
    // Auto-load current video associated with this restaurant
    const associatedVideo = videos.find(v => v.restaurantId === rest.id);
    setRestVideoUrl(associatedVideo ? associatedVideo.videoUrl : '');
    setRestVideoTitle(associatedVideo ? associatedVideo.title : '');
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

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restName || !restAddress) return;

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
      description: restDescription,
      isFavorite: !!restIsFavorite,
      isPublished: !!restIsPublished,
      category: restCategory,
      dispositionShop: restDispositionShop,
      shortName: restShortName || restName,
      latitude: Number(restLatitude),
      longitude: Number(restLongitude),
      videoUrl: restVideoUrl,
      videoTitle: restVideoTitle,
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
        setShowRestaurantForm(false);
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
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
          const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
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
      <aside className={`w-64 border-r border-white/5 bg-[#0A0A0B] flex flex-col justify-between shrink-0 h-full select-none z-50 md:relative fixed inset-y-0 left-0 transform md:transform-none transition-transform duration-300 md:translate-x-0 ${
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
              <Layout size={14} className={activeTab === 'design' ? 'text-[#FF5C00]' : ''} />
              <span>1. Design & Branding</span>
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
              <span>1b. Gérer l'Accueil</span>
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
              {activeTab === 'design' && '🎨 Design & Branding'}
              {activeTab === 'accueil' && '🏡 Page d\'Accueil (Configuration Complète)'}
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
              {activeTab === 'backup' && '💾 Historique de Sauvegarde & Restauration'}
            </h2>
            <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-400 hidden sm:inline-block">
              {activeTab}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onRefreshData();
                alert('Données synchronisées en temps réel avec Firebase Firestore !');
              }}
              className="p-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white border border-transparent hover:border-white/5 transition-all cursor-pointer"
              title="Rafraîchir"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-black uppercase text-zinc-300 hover:text-white bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-full flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <X size={14} />
              Quitter le CMS
            </button>
          </div>
        </header>

        {/* Content Box */}
        <section className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#050505]">
          
          {/* 1. DESIGN TAB */}
          {activeTab === 'design' && (
            <div className="max-w-4xl space-y-8 pb-12">
              
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
                        onChange={(e) => onUpdateDesignSettings({ logoUrl: e.target.value })}
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
                          placeholder="Ex: https://assets.mixkit.co/videos/preview/mixkit-top-view-of-cooking-fresh-pasta-41617-large.mp4"
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
                          placeholder="Ex: https://assets.mixkit.co/videos/preview/mixkit-cutting-vegetables-with-a-sharp-knife-on-a-wooden-board-41613-large.mp4"
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

                      {uploadedFileType === 'image' && (
                        <img 
                          src={uploadedFileUrl} 
                          alt="Previsualisation" 
                          className="h-24 object-cover rounded-lg border border-white/10 mx-auto" 
                        />
                      )}
                      {uploadedFileType === 'video' && (
                        <video 
                          src={uploadedFileUrl} 
                          controls 
                          muted 
                          className="h-24 object-cover rounded-lg border border-white/10 mx-auto" 
                          onError={(e) => {
                            console.warn('[AdminCMS] Uploaded video preview failed, falling back');
                            e.currentTarget.src = 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
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
                            {ad.mediaUrl && (
                              <div className="w-16 h-12 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center">
                                {ad.mediaType === 'video' ? (
                                  <video 
                                    src={getSafeVideoUrl(ad.mediaUrl)} 
                                    muted 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                      console.warn('[AdminCMS] Ad video preview failed, falling back');
                                      e.currentTarget.src = 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
                                    }}
                                  />
                                ) : (
                                  <img src={ad.mediaUrl} alt={ad.title} className="w-full h-full object-cover" />
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
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl overflow-hidden">
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
                              <div className="flex justify-end gap-1.5">
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
                                  <option value="delivered">Livrée</option>
                                  <option value="cancelled">Annulée</option>
                                </select>
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
                    Création instantanée par IA (Scraper de Site Web)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                    Saisissez l'adresse URL d'un site web de restaurant (ou n'importe quel restaurant imaginaire ou réel) : notre moteur d'IA va instantanément naviguer sur le site, extraire sa charte graphique, créer l'établissement, configurer son menu complet, ses plats avec photos de haute qualité, ses tarifs, et lui associer une vidéo immersive de préparation culinaire en haut du feed Fidfud.
                  </p>
                </div>

                <form onSubmit={handleExtractWebsite} className="flex flex-col sm:flex-row gap-2.5">
                  <input 
                    type="url" 
                    required
                    value={websiteUrlToExtract}
                    onChange={(e) => setWebsiteUrlToExtract(e.target.value)}
                    placeholder="https://www.lavenue-paris.com ou https://julia-pizza.fr"
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
                  
                  {/* Section 1: Identité */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold text-[#FF5C00] uppercase tracking-wider">1. Identité du restaurant</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Nom complet (Public)</label>
                        <input 
                          id="restaurant-name-input"
                          type="text" 
                          required
                          value={restName}
                          onChange={(e) => setRestName(e.target.value)}
                          placeholder="ex: Pizzeria Bella Italia"
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Petit nom / Surnom (Shorthand)</label>
                        <input 
                          type="text" 
                          value={restShortName}
                          onChange={(e) => setRestShortName(e.target.value)}
                          placeholder="ex: Bella Italia"
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Catégorie culinaire</label>
                        <select 
                          value={restCategory}
                          onChange={(e) => setRestCategory(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        >
                          <option value="Italien & Pizza">Italien & Pizza 🍕</option>
                          <option value="Japonais & Ramen">Japonais & Ramen 🍜</option>
                          <option value="Burgers & Street Food">Burgers & Street Food 🍔</option>
                          <option value="Français & Traditionnel">Français & Traditionnel 🥩</option>
                          <option value="Mexicain & Tacos">Mexicain & Tacos 🌮</option>
                          <option value="Café & Goûter">Café & Goûter 🥞</option>
                          <option value="Salades & Healthy">Salades & Healthy 🥗</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Accroche / Slogan court</label>
                        <input 
                          type="text" 
                          value={restLogoUrl && !restName.includes('🍳') ? (editingRestaurant?.slogan || '') : ''} 
                          onChange={(e) => {
                            if (editingRestaurant) {
                              editingRestaurant.slogan = e.target.value;
                            }
                          }}
                          placeholder="Slogan accrocheur..."
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Description complète</label>
                      <textarea 
                        value={restDescription}
                        onChange={(e) => setRestDescription(e.target.value)}
                        placeholder="Racontez l'histoire du restaurant, ses spécialités..."
                        rows={2}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00] resize-none"
                      />
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

                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Adresse complète physique</label>
                      <input 
                        type="text" 
                        required
                        value={restAddress}
                        onChange={(e) => setRestAddress(e.target.value)}
                        placeholder="ex: 14 Rue de Charonne, 75011 Paris"
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
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

                    {/* Pre-filled Video Selector */}
                    <div className="bg-zinc-950/60 p-3 rounded-2xl border border-white/5 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Vidéo associée dans le feed TikTok</label>
                        <span className="text-[8px] font-mono text-zinc-600">Pixabay & Mixkit Premium</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { label: '🍕 Pizza au Four', url: 'https://assets.mixkit.co/videos/preview/mixkit-chef-cutting-a-freshly-baked-pizza-40245-large.mp4', desc: 'Pizza croustillante' },
                          { label: '🍜 Ramen Fumant', url: 'https://assets.mixkit.co/videos/preview/mixkit-fresh-vegetables-and-meat-sizzling-in-a-wok-pan-40242-large.mp4', desc: 'Bouillon coulant' },
                          { label: '🍔 Double Smash', url: 'https://assets.mixkit.co/videos/preview/mixkit-putting-ketchup-on-a-freshly-prepared-hamburger-40246-large.mp4', desc: 'Viande smashée' },
                          { label: '🥞 Pancakes Sirop', url: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-hot-chocolate-on-a-pancake-41617-large.mp4', desc: 'Sucre coulant' },
                          { label: '🍣 Sauce Sushi', url: 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-fresh-vegetable-salad-in-the-kitchen-40243-large.mp4', desc: 'Sushi dipping' },
                          { label: '🔥 Chef Flamme', url: 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4', desc: 'Chef en cuisine' }
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
                      className="bg-[#FF5C00] hover:bg-[#E04F00] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_10px_20px_rgba(255,92,0,0.15)]"
                    >
                      Enregistrer
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
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowClientForm(true)}
                  className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_10px_20px_rgba(255,92,0,0.15)]"
                >
                  <Plus size={14} />
                  Nouvel Utilisateur
                </button>
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
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-950/40 border-b border-white/5 text-zinc-400 uppercase font-bold text-[10px] tracking-wider">
                      <th className="p-4">Identifiant</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Rôle</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 text-right">Action sécurité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-white/[0.02]">
                        <td className="p-4 font-mono font-bold text-white">{usr.id}</td>
                        <td className="p-4 font-bold">{usr.email}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            usr.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                            usr.role === 'restaurant' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            'bg-zinc-800 text-zinc-300'
                          }`}>
                            {usr.role}
                          </span>
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
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl overflow-hidden">
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

              {/* Like / Views Manager */}
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">🎥 Ajustement des likes & vues sur les vidéos du Feed</h3>
                
                <div className="space-y-3">
                  {videos.map((vid) => (
                    <div key={vid.id} className="bg-zinc-950/60 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-xs font-black text-white">{vid.title}</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">ID: {vid.id} • Restaurant ID: {vid.restaurantId}</p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-xs font-mono text-zinc-400">
                          <span className="font-extrabold text-[#FF5C00]">{vid.likesCount}</span> likes
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleUpdateLikes(vid.id, false)}
                            className="bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
                          >
                            -50 Likes
                          </button>
                          <button
                            onClick={() => handleUpdateLikes(vid.id, true)}
                            className="bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
                          >
                            +50 Likes
                          </button>
                          <button
                            onClick={() => handleAddComment(vid.id)}
                            className="bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
                          >
                            <MessageSquare size={11} /> Commentaire
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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

          {/* 11. MEDIA MANAGER TAB */}
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
                                  src={media.url} 
                                  className="w-full h-full object-cover" 
                                  muted 
                                  playsInline 
                                  onError={(e) => {
                                    console.warn('[AdminCMS] Media library video failed, falling back');
                                    e.currentTarget.src = 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
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

        </section>
      </main>

      <EngagementPromptModal
        isOpen={isEngagementModalOpen}
        onClose={() => setIsEngagementModalOpen(false)}
        designSettings={designSettings}
        onUpdateDesignSettings={onUpdateDesignSettings}
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
