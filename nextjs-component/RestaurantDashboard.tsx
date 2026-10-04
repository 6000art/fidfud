"use client";

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  DollarSign, 
  ToggleLeft, 
  ToggleRight, 
  Utensils, 
  LayoutGrid, 
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
  ClipboardList,
  Clock,
  Bell,
  CheckCircle,
  AlertCircle,
  Video as VideoIcon,
  Film,
  Play,
  Eye,
  Heart,
  Search,
  Filter,
  Upload,
  Link as LinkIcon,
  ShoppingBag,
  Info
} from 'lucide-react';

export interface NextJsDish {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  category: string;
  dietaryTags?: string[];
}

export interface NextJsVerticalVideo {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  associatedDishId?: string;
  viewsCount: number;
  likesCount: number;
  createdAt: string;
  hashtags?: string[];
}

export interface NextJsOrderItem {
  id: string;
  dishName: string;
  quantity: number;
  price: number;
}

export interface NextJsOrder {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: NextJsOrderItem[];
  totalAmount: number;
  status: 'received' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  createdAt: string;
}

export default function RestaurantDashboard() {
  // Navigation Tabs: 'menu' | 'videos' | 'orders' | 'analytics'
  const [activeTab, setActiveTab] = useState<'menu' | 'videos' | 'orders' | 'analytics'>('menu');

  // Custom Toast Notification System
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [deleteConfirmId, setDeleteConfirmId] = useState<{ id: string; type: 'dish' | 'video' } | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Initial Dishes State (CRUD)
  const [dishes, setDishes] = useState<NextJsDish[]>([
    {
      id: 'dish-1',
      name: 'Smash Burger Gold Supreme',
      description: 'Double steaks hachés smashés à chaud, cheddar affiné 12 mois, sauce fumée secrète et oignons caramélisés.',
      price: 13.90,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
      isAvailable: true,
      category: 'Burgers',
      dietaryTags: ['Halal', 'Gourmet']
    },
    {
      id: 'dish-2',
      name: 'Pizza Tartufata & Burrata 250g',
      description: 'Pâte artisanale fermentée 48h, crème de truffe noire d\'Umbria, mozzarella di bufala et burrata fraîche entière.',
      price: 17.50,
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
      isAvailable: true,
      category: 'Pizzas',
      dietaryTags: ['Végétarien', 'Artisanal']
    },
    {
      id: 'dish-3',
      name: 'Tonkotsu Black Garlic Ramen',
      description: 'Bouillon riche mijoté 18h, nouilles fraîches de blé, huile d\'ail noir fumé, ajitsuke tamago et chashu fondant.',
      price: 15.90,
      imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600',
      isAvailable: false,
      category: 'Ramen',
      dietaryTags: ['Spécialité Maison']
    }
  ]);

  // Initial Vertical Videos Dataset
  const [verticalVideos, setVerticalVideos] = useState<NextJsVerticalVideo[]>([
    {
      id: 'vid-1',
      title: 'Démonstration de la cuisson Smash Burger croustillant à la plancha 400°C ! 🍔🔥',
      videoUrl: '/videos/culinary-1.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
      associatedDishId: 'dish-1',
      viewsCount: 14250,
      likesCount: 1890,
      createdAt: '2026-08-10',
      hashtags: ['#SmashBurger', '#FidfudLive', '#StreetFood']
    },
    {
      id: 'vid-2',
      title: 'Service de la Burrata crémeuse sur notre Pizza Truffe Royale tout juste sortie du four ! 🍕✨',
      videoUrl: '/videos/culinary-2.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
      associatedDishId: 'dish-2',
      viewsCount: 28400,
      likesCount: 3410,
      createdAt: '2026-08-08',
      hashtags: ['#PizzaTruffe', '#BurrataGasm', '#Gourmet']
    }
  ]);

  // Initial Direct Orders State
  const [orders, setOrders] = useState<NextJsOrder[]>([
    {
      id: 'ORD-9842',
      customerName: 'Thomas Martin',
      customerPhone: '+33 6 12 34 56 78',
      items: [
        { id: 'item-1', dishName: 'Smash Burger Gold Supreme', quantity: 2, price: 13.90 },
        { id: 'item-2', dishName: 'Pizza Tartufata & Burrata 250g', quantity: 1, price: 17.50 }
      ],
      totalAmount: 45.30,
      status: 'received',
      createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString()
    },
    {
      id: 'ORD-9841',
      customerName: 'Sarah Lefevre',
      customerPhone: '+33 7 98 76 54 32',
      items: [
        { id: 'item-3', dishName: 'Tonkotsu Black Garlic Ramen', quantity: 1, price: 15.90 }
      ],
      totalAmount: 15.90,
      status: 'preparing',
      createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString()
    }
  ]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dish Form state (Modal / Drawer)
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<NextJsDish | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formCategory, setFormCategory] = useState('Burgers');
  const [formDietaryTags, setFormDietaryTags] = useState('');

  // Video Form state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<NextJsVerticalVideo | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoAssociatedDishId, setVideoAssociatedDishId] = useState('');
  const [videoHashtags, setVideoHashtags] = useState('');

  // Video Preview Modal State
  const [previewingVideo, setPreviewingVideo] = useState<NextJsVerticalVideo | null>(null);

  // Filtered Dishes
  const filteredDishes = useMemo(() => {
    return dishes.filter(dish => {
      const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            dish.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || dish.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [dishes, searchQuery, categoryFilter]);

  // Extract Categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    dishes.forEach(d => { if (d.category) set.add(d.category); });
    return Array.from(set);
  }, [dishes]);

  // Stats
  const totalDishes = dishes.length;
  const availableDishesCount = dishes.filter(d => d.isAvailable).length;
  const totalVideosCount = verticalVideos.length;
  const activeOrdersCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;

  // Reset Dish Form
  const resetDishForm = () => {
    setEditingDish(null);
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormImageUrl('');
    setFormIsAvailable(true);
    setFormCategory('Burgers');
    setFormDietaryTags('');
    setIsDishModalOpen(false);
  };

  // Open Edit Dish Form
  const handleStartEditDish = (dish: NextJsDish) => {
    setEditingDish(dish);
    setFormName(dish.name);
    setFormDescription(dish.description);
    setFormPrice(dish.price.toString());
    setFormImageUrl(dish.imageUrl || '');
    setFormIsAvailable(dish.isAvailable);
    setFormCategory(dish.category || 'Général');
    setFormDietaryTags(dish.dietaryTags?.join(', ') || '');
    setIsDishModalOpen(true);
  };

  // Save Dish Submit
  const handleSaveDish = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formPrice.trim()) {
      triggerToast("Veuillez remplir le nom et un prix valide.", "error");
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      triggerToast("Le prix doit être un chiffre positif.", "error");
      return;
    }

    const tagsArray = formDietaryTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (editingDish) {
      // Update
      setDishes(prev => prev.map(d => {
        if (d.id === editingDish.id) {
          return {
            ...d,
            name: formName.trim(),
            description: formDescription.trim(),
            price: priceNum,
            imageUrl: formImageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
            isAvailable: formIsAvailable,
            category: formCategory.trim() || 'Général',
            dietaryTags: tagsArray
          };
        }
        return d;
      }));
      triggerToast(`Plat "${formName}" mis à jour avec succès !`);
    } else {
      // Create
      const newDish: NextJsDish = {
        id: `dish-${Date.now()}`,
        name: formName.trim(),
        description: formDescription.trim(),
        price: priceNum,
        imageUrl: formImageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
        isAvailable: formIsAvailable,
        category: formCategory.trim() || 'Général',
        dietaryTags: tagsArray
      };
      setDishes(prev => [...prev, newDish]);
      triggerToast(`Nouveau plat "${formName}" créé avec succès !`);
    }

    resetDishForm();
  };

  // Fast Toggle Availability
  const toggleDishAvailability = (dishId: string) => {
    setDishes(prev => prev.map(d => {
      if (d.id === dishId) {
        const nextState = !d.isAvailable;
        triggerToast(`Disponibilité de "${d.name}" : ${nextState ? 'En Stock' : 'Rupture'}`, nextState ? 'success' : 'info');
        return { ...d, isAvailable: nextState };
      }
      return d;
    }));
  };

  // Reset Video Form
  const resetVideoForm = () => {
    setEditingVideo(null);
    setVideoTitle('');
    setVideoUrl('');
    setVideoAssociatedDishId(dishes[0]?.id || '');
    setVideoHashtags('');
    setIsVideoModalOpen(false);
  };

  // Open Edit Video Form
  const handleStartEditVideo = (video: NextJsVerticalVideo) => {
    setEditingVideo(video);
    setVideoTitle(video.title);
    setVideoUrl(video.videoUrl);
    setVideoAssociatedDishId(video.associatedDishId || '');
    setVideoHashtags(video.hashtags?.join(' ') || '');
    setIsVideoModalOpen(true);
  };

  // Save Vertical Video Submit
  const handleSaveVideo = (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoTitle.trim()) {
      triggerToast("Veuillez saisir un titre descriptif pour la vidéo.", "error");
      return;
    }

    const defaultSampleVideo = '/videos/culinary-1.mp4';
    const finalVideoUrl = videoUrl.trim() || defaultSampleVideo;

    const hashtagsArray = videoHashtags
      .split(' ')
      .map(h => h.trim())
      .filter(h => h.length > 0)
      .map(h => h.startsWith('#') ? h : `#${h}`);

    // Lookup thumbnail from associated dish if none
    const associatedDish = dishes.find(d => d.id === videoAssociatedDishId);

    if (editingVideo) {
      setVerticalVideos(prev => prev.map(v => {
        if (v.id === editingVideo.id) {
          return {
            ...v,
            title: videoTitle.trim(),
            videoUrl: finalVideoUrl,
            associatedDishId: videoAssociatedDishId || undefined,
            hashtags: hashtagsArray,
            thumbnailUrl: associatedDish?.imageUrl || v.thumbnailUrl
          };
        }
        return v;
      }));
      triggerToast("Vidéo verticale mise à jour !");
    } else {
      const newVideo: NextJsVerticalVideo = {
        id: `vid-${Date.now()}`,
        title: videoTitle.trim(),
        videoUrl: finalVideoUrl,
        thumbnailUrl: associatedDish?.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
        associatedDishId: videoAssociatedDishId || undefined,
        viewsCount: 1,
        likesCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
        hashtags: hashtagsArray
      };
      setVerticalVideos(prev => [newVideo, ...prev]);
      triggerToast("Nouvelle vidéo verticale ajoutée au feed !");
    }

    resetVideoForm();
  };

  // Confirm Delete Handler
  const confirmDeleteAction = () => {
    if (!deleteConfirmId) return;

    if (deleteConfirmId.type === 'dish') {
      const dishObj = dishes.find(d => d.id === deleteConfirmId.id);
      setDishes(prev => prev.filter(d => d.id !== deleteConfirmId.id));
      // Remove association from videos
      setVerticalVideos(prev => prev.map(v => v.associatedDishId === deleteConfirmId.id ? { ...v, associatedDishId: undefined } : v));
      triggerToast(`Plat "${dishObj?.name || ''}" supprimé de la carte.`, "info");
    } else {
      const videoObj = verticalVideos.find(v => v.id === deleteConfirmId.id);
      setVerticalVideos(prev => prev.filter(v => v.id !== deleteConfirmId.id));
      triggerToast(`Vidéo "${videoObj?.title.slice(0, 20)}..." supprimée.`, "info");
    }

    setDeleteConfirmId(null);
  };

  // Update Order Status
  const handleUpdateOrderStatus = (orderId: string, nextStatus: NextJsOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
    triggerToast(`Statut de la commande ${orderId} mis à jour.`);
  };

  return (
    <div className="w-full min-h-screen bg-[#09090b] text-zinc-100 font-sans p-4 md:p-8 selection:bg-[#FF5C00] selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 animate-bounce flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl max-w-sm">
            {toastType === 'success' && (
              <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 shrink-0">
                <CheckCircle size={18} />
              </div>
            )}
            {toastType === 'error' && (
              <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <AlertCircle size={18} />
              </div>
            )}
            {toastType === 'info' && (
              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Info size={18} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Studio Fidfud</p>
              <p className="text-xs text-white font-medium mt-0.5 leading-snug">{toastMessage}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-zinc-500 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl max-w-sm w-full space-y-5 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
                <Trash2 size={22} />
              </div>
              <div className="text-center space-y-1.5">
                <h4 className="text-sm font-black uppercase tracking-wider text-white">
                  Confirmer la suppression
                </h4>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={confirmDeleteAction}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[11px] tracking-wider py-3 rounded-xl transition-all shadow-lg shadow-red-500/20"
                >
                  Supprimer
                </button>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-black uppercase text-[11px] tracking-wider py-3 rounded-xl transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Header Dashboard Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#FF5C00] font-mono text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={13} className="animate-pulse" />
              <span>Tableau de Bord Partenaire Fast-Good</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-white flex items-center gap-3">
              <Utensils className="text-[#FF5C00]" />
              <span>Studio Restauration Fidfud</span>
            </h1>
            <p className="text-zinc-400 text-xs max-w-2xl leading-relaxed">
              Gérez votre carte digitale, uploadez des vidéos verticales 9:16 associées à vos spécialités et suivez vos commandes directes.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => { resetVideoForm(); setIsVideoModalOpen(true); }}
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-white font-black uppercase tracking-wider text-[11px] px-4 py-3 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
            >
              <Film size={15} className="text-[#FF5C00]" />
              <span>Ajouter Vidéo</span>
            </button>

            <button
              onClick={() => { resetDishForm(); setIsDishModalOpen(true); }}
              className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-black uppercase tracking-wider text-[11px] px-5 py-3 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#FF5C00]/20 cursor-pointer"
            >
              <Plus size={16} />
              <span>Nouveau Plat</span>
            </button>
          </div>
        </div>

        {/* Top Analytics Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-950 border border-zinc-800/80 p-4.5 rounded-2xl flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#FF5C00]">
              <Utensils size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Total Plats</span>
              <span className="text-xl font-black font-mono text-white">{totalDishes}</span>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 p-4.5 rounded-2xl flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
              <Check size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">En Stock</span>
              <span className="text-xl font-black font-mono text-green-400">{availableDishesCount} / {totalDishes}</span>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 p-4.5 rounded-2xl flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <VideoIcon size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Vidéos Verticales</span>
              <span className="text-xl font-black font-mono text-purple-400">{totalVideosCount}</span>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 p-4.5 rounded-2xl flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
              <ClipboardList size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Commandes Actives</span>
              <span className="text-xl font-black font-mono text-yellow-500">{activeOrdersCount}</span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-800 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2.5 px-6 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'menu'
                ? 'border-[#FF5C00] text-white bg-zinc-900/50'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Utensils size={16} className={activeTab === 'menu' ? 'text-[#FF5C00]' : ''} />
            <span>Gestion de la Carte ({totalDishes})</span>
          </button>

          <button
            onClick={() => setActiveTab('videos')}
            className={`flex items-center gap-2.5 px-6 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'videos'
                ? 'border-[#FF5C00] text-white bg-zinc-900/50'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Film size={16} className={activeTab === 'videos' ? 'text-purple-400' : ''} />
            <span>Vidéos Verticales 9:16 ({totalVideosCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2.5 px-6 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-[#FF5C00] text-white bg-zinc-900/50'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ClipboardList size={16} className={activeTab === 'orders' ? 'text-yellow-400' : ''} />
            <span>Suivi Commandes</span>
            {activeOrdersCount > 0 && (
              <span className="bg-[#FF5C00] text-white text-[9px] font-mono font-black px-2 py-0.5 rounded-full animate-pulse">
                {activeOrdersCount}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: MENU DISHES CRUD */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            
            {/* Search & Category Filter Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une spécialité par nom ou ingrédients..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={15} className="text-zinc-500" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#FF5C00]"
                >
                  <option value="all">Toutes Catégories</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dish Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDishes.map(dish => {
                const linkedVideosCount = verticalVideos.filter(v => v.associatedDishId === dish.id).length;

                return (
                  <div
                    key={dish.id}
                    className="bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 rounded-3xl overflow-hidden flex flex-col justify-between transition-all group shadow-lg"
                  >
                    <div>
                      {/* Dish Image Header */}
                      <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                        {dish.imageUrl ? (
                          <img
                            src={dish.imageUrl}
                            alt={dish.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🍔</div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />

                        {/* Availability Pill */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <button
                            onClick={() => toggleDishAvailability(dish.id)}
                            aria-label={`Changer disponibilité de ${dish.name}`}
                            className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md cursor-pointer transition-all ${
                              dish.isAvailable
                                ? 'bg-green-500/80 text-black shadow-lg shadow-green-500/20'
                                : 'bg-red-500/80 text-white shadow-lg shadow-red-500/20'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${dish.isAvailable ? 'bg-black' : 'bg-white'}`} />
                            <span>{dish.isAvailable ? 'EN STOCK' : 'RUPTURE'}</span>
                          </button>
                        </div>

                        {/* Price Badge */}
                        <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md border border-white/20 px-3 py-1 rounded-xl text-sm font-black font-mono text-[#FF5C00]">
                          {dish.price.toFixed(2)} €
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-sm font-black uppercase text-white tracking-wide">{dish.name}</h3>
                          <span className="text-[9px] font-black text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 uppercase shrink-0">
                            {dish.category}
                          </span>
                        </div>

                        <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2">
                          {dish.description}
                        </p>

                        {/* Dietary Tags */}
                        {dish.dietaryTags && dish.dietaryTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {dish.dietaryTags.map((tag, idx) => (
                              <span key={idx} className="text-[9px] font-bold text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded-full border border-zinc-800">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Controls */}
                    <div className="p-4 border-t border-zinc-900 flex items-center justify-between bg-zinc-950/50">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg">
                        <Film size={12} />
                        <span>{linkedVideosCount} vidéo(s) 9:16</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleStartEditDish(dish)}
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors cursor-pointer"
                          title="Modifier le plat"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId({ id: dish.id, type: 'dish' })}
                          className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: VERTICAL VIDEOS MANAGEMENT */}
        {activeTab === 'videos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 p-5 rounded-3xl border border-zinc-800">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                  <Film className="text-purple-400" size={18} />
                  <span>Bibliothèque de Vidéos Verticales 9:16</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Les vidéos apparaissent dans le feed TikTok interactif de Fidfud. Associez chaque vidéo à un plat pour déclencher le bouton de commande automatique.
                </p>
              </div>

              <button
                onClick={() => { resetVideoForm(); setIsVideoModalOpen(true); }}
                className="bg-purple-600 hover:bg-purple-500 text-white font-black uppercase text-[10px] tracking-wider px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/20"
              >
                <Upload size={14} />
                <span>Uploader Vidéo 9:16</span>
              </button>
            </div>

            {/* Video Cards Grid (9:16 Aspect Ratio Format) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {verticalVideos.map(video => {
                const associatedDish = dishes.find(d => d.id === video.associatedDishId);

                return (
                  <div
                    key={video.id}
                    className="bg-zinc-950 border border-zinc-800/80 rounded-3xl overflow-hidden flex flex-col justify-between group shadow-xl hover:border-purple-500/50 transition-all relative"
                  >
                    {/* Vertical Thumbnail / Play Preview Box */}
                    <div className="relative aspect-[9/16] bg-black overflow-hidden flex items-center justify-center">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                          <Film size={32} />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                      {/* Play Action Trigger */}
                      <button
                        onClick={() => setPreviewingVideo(video)}
                        className="absolute w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-2xl scale-95 group-hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Play size={20} className="ml-0.5 fill-white" />
                      </button>

                      {/* Stats Overlay Top */}
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-center text-[10px] font-black text-white">
                        <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1 font-mono">
                          <Eye size={11} className="text-purple-400" />
                          <span>{video.viewsCount.toLocaleString()}</span>
                        </span>
                        <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1 font-mono">
                          <Heart size={11} className="text-red-400" />
                          <span>{video.likesCount.toLocaleString()}</span>
                        </span>
                      </div>

                      {/* Associated Dish Badge Overlay Bottom */}
                      <div className="absolute bottom-3 left-3 right-3">
                        {associatedDish ? (
                          <div className="bg-zinc-900/90 backdrop-blur-md border border-[#FF5C00]/40 p-2 rounded-xl flex items-center gap-2">
                            <Utensils size={13} className="text-[#FF5C00] shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-[8px] font-black uppercase text-[#FF5C00] block">Plat Associé</span>
                              <p className="text-[10px] font-bold text-white truncate">{associatedDish.name}</p>
                            </div>
                            <span className="text-[10px] font-mono font-black text-[#FF5C00]">{associatedDish.price.toFixed(2)} €</span>
                          </div>
                        ) : (
                          <div className="bg-red-500/20 backdrop-blur-md border border-red-500/40 p-1.5 rounded-xl text-center">
                            <span className="text-[9px] font-black uppercase text-red-300">Aucun plat lié</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Video Card Meta */}
                    <div className="p-4 space-y-2">
                      <p className="text-xs font-bold text-zinc-200 line-clamp-2 leading-snug">{video.title}</p>
                      
                      {video.hashtags && (
                        <p className="text-[9px] font-mono text-purple-400 truncate">{video.hashtags.join(' ')}</p>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-zinc-900">
                        <button
                          onClick={() => handleStartEditVideo(video)}
                          className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={12} />
                          <span>Éditer</span>
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId({ id: video.id, type: 'video' })}
                          className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS MONITORING */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <span>Fil des commandes en temps réel</span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map(order => (
                <div key={order.id} className="bg-zinc-950 border border-zinc-800 p-5 rounded-3xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-black text-white">{order.id}</span>
                      <span className="text-[10px] text-zinc-500 block font-mono">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                      {order.status}
                    </span>
                  </div>

                  <div className="space-y-2 border-t border-b border-zinc-900 py-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Gourmet : {order.customerName}</span>
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-zinc-300"><span className="text-[#FF5C00] font-black">{item.quantity}x</span> {item.dishName}</span>
                        <span className="font-mono text-zinc-500">{(item.price * item.quantity).toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs font-black uppercase text-zinc-400">Total :</span>
                    <span className="text-sm font-black font-mono text-[#FF5C00]">{order.totalAmount.toFixed(2)} €</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: CREATE / EDIT DISH */}
        {isDishModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl max-w-lg w-full space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Utensils className="text-[#FF5C00]" size={18} />
                  <span>{editingDish ? 'Modifier le Plat' : 'Nouveau Plat au Menu'}</span>
                </h3>
                <button onClick={resetDishForm} className="text-zinc-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveDish} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Nom de la spécialité</label>
                  <input
                    type="text"
                    aria-label="Nom de la spécialité"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Smash Burger Gold Supreme"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Catégorie</label>
                    <input
                      type="text"
                      aria-label="Catégorie du plat"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      placeholder="Burgers, Pizzas..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF5C00]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Prix (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      aria-label="Prix en euros"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="13.90"
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white font-mono focus:outline-none focus:border-[#FF5C00]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Description / Ingrédients</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                    placeholder="Décrivez les ingrédients pour faire saliver vos clients..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white resize-none focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">URL Photo du Plat</label>
                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Tags Régime / Spécialités (séparés par une virgule)</label>
                  <input
                    type="text"
                    value={formDietaryTags}
                    onChange={(e) => setFormDietaryTags(e.target.value)}
                    placeholder="Halal, Végétarien, Maison..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Disponible en cuisine</span>
                  <button
                    type="button"
                    onClick={() => setFormIsAvailable(prev => !prev)}
                    className="cursor-pointer"
                  >
                    {formIsAvailable ? (
                      <ToggleRight size={26} className="text-[#FF5C00]" />
                    ) : (
                      <ToggleLeft size={26} className="text-zinc-600" />
                    )}
                  </button>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    className="flex-1 bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-black uppercase text-[11px] tracking-wider py-3 rounded-xl shadow-lg shadow-[#FF5C00]/20"
                  >
                    Enregistrer le Plat
                  </button>
                  <button
                    type="button"
                    onClick={resetDishForm}
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-black uppercase text-[11px] tracking-wider py-3 rounded-xl"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: UPLOAD / ASSOCIATE VERTICAL VIDEO */}
        {isVideoModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl max-w-lg w-full space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Film className="text-purple-400" size={18} />
                  <span>{editingVideo ? 'Éditer la Vidéo 9:16' : 'Ajouter une Vidéo Verticale'}</span>
                </h3>
                <button onClick={resetVideoForm} className="text-zinc-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveVideo} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Titre / Légende Vidéo</label>
                  <input
                    type="text"
                    aria-label="Titre / Légende Vidéo"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="e.g. Démonstration de la préparation Smash Burger en direct ! 🔥"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1">
                    <Utensils size={12} />
                    <span>Associer un plat du menu à cette vidéo</span>
                  </label>
                  <select
                    value={videoAssociatedDishId}
                    onChange={(e) => setVideoAssociatedDishId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                  >
                    <option value="">-- Aucun plat spécifique --</option>
                    {dishes.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.price.toFixed(2)} €)</option>
                    ))}
                  </select>
                  <p className="text-[9px] text-zinc-500 pt-0.5">
                    Permet d'afficher un bouton d'ajout rapide au panier sur la vidéo dans le feed TikTok.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">URL Fichier Vidéo (MP4 9:16)</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://assets.mixkit.co/videos/preview/..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Hashtags (séparés par un espace)</label>
                  <input
                    type="text"
                    value={videoHashtags}
                    onChange={(e) => setVideoHashtags(e.target.value)}
                    placeholder="#SmashBurger #Fidfud #Cuisine"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase text-[11px] tracking-wider py-3 rounded-xl shadow-lg shadow-purple-600/20"
                  >
                    Publier la Vidéo
                  </button>
                  <button
                    type="button"
                    onClick={resetVideoForm}
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-black uppercase text-[11px] tracking-wider py-3 rounded-xl"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PREVIEW VIDEO PLAYER MODAL */}
        {previewingVideo && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative w-full max-w-sm aspect-[9/16] bg-black rounded-3xl overflow-hidden border border-white/20 shadow-2xl flex flex-col justify-between">
              <video
                src={previewingVideo.videoUrl || '/videos/culinary-fallback.mp4'}
                autoPlay
                controls
                loop
                playsInline
                className="w-full h-full object-cover"
                onError={(e) => {
                  if (e.currentTarget.src !== '/videos/culinary-fallback.mp4') {
                    e.currentTarget.src = '/videos/culinary-fallback.mp4';
                  }
                }}
              />

              <button
                onClick={() => setPreviewingVideo(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
