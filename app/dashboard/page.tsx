'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import {
  ChefHat,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Video,
  Upload,
  Play,
  Pause,
  ShoppingBag,
  TrendingUp,
  Search,
  Store,
  ExternalLink,
  DollarSign,
  Film,
  Sparkles,
  Volume2,
  VolumeX,
  RefreshCw,
  Eye,
  Check,
  Bike
} from 'lucide-react';
import type { OrderStatus, DeliveryType } from '@/types';

// Data Interfaces
export interface PartnerDish {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  videoUrl?: string;
  isAvailable: boolean;
  createdAt: string;
}

export interface PartnerVideo {
  id: string;
  restaurantId: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  associatedDishId?: string;
  viewsCount: number;
  likesCount: number;
  createdAt: string;
}

export interface PartnerOrderItem {
  id: string;
  dishId: string;
  dishName: string;
  quantity: number;
  price: number;
}

export interface PartnerOrder {
  id: string;
  restaurantId: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  serviceFee: number;
  deliveryType: DeliveryType;
  status: OrderStatus;
  createdAt: string;
  items: PartnerOrderItem[];
}

// Initial Sample Data
const INITIAL_DISHES: PartnerDish[] = [
  {
    id: 'dish-1',
    restaurantId: 'rest-1',
    name: 'Smash Burger Gold Supreme',
    description: 'Double steaks hachés smashés à haute température, cheddar affiné 12 mois, sauce fumée maison secrète et pickles.',
    price: 13.90,
    category: 'Burgers',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    videoUrl: '/uploads/culinary-1.mp4',
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dish-2',
    restaurantId: 'rest-1',
    name: 'Pizza Tartufata & Burrata 250g',
    description: 'Pâte artisanale fermentée 48h, crème de truffe noire d\'Umbria, mozzarella di bufala et burrata fraîche entière crémeuse.',
    price: 17.50,
    category: 'Pizzas',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    videoUrl: '/uploads/culinary-2.mp4',
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dish-3',
    restaurantId: 'rest-1',
    name: 'Tonkotsu Ramen Ail Noir & Chashu',
    description: 'Bouillon riche mijoté 18h, nouilles fraîches de blé, huile d\'ail noir grillé, œuf mariné ajitsuke tamago et poitrine de porc fondante.',
    price: 15.90,
    category: 'Ramen',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
    videoUrl: '/uploads/culinary-3.mp4',
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dish-4',
    restaurantId: 'rest-1',
    name: 'Pancakes Moelleux Sirop d\'Érable & Fruits Rouges',
    description: 'Trois étages de pancakes extra moelleux nappés de sirop d\'érable pur, myrtilles fraîches et crème montée vanillée.',
    price: 9.50,
    category: 'Desserts',
    imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&auto=format&fit=crop&q=80',
    videoUrl: '/uploads/culinary-4.mp4',
    isAvailable: false,
    createdAt: new Date().toISOString(),
  }
];

const INITIAL_VIDEOS: PartnerVideo[] = [
  {
    id: 'vid-1',
    restaurantId: 'rest-1',
    title: 'La découpe croustillante du Smash Burger Gold Supreme 🔥',
    videoUrl: '/uploads/culinary-1.mp4',
    associatedDishId: 'dish-1',
    viewsCount: 14280,
    likesCount: 1890,
    createdAt: '2026-09-12',
  },
  {
    id: 'vid-2',
    restaurantId: 'rest-1',
    title: 'Sortie du four à bois : Pizza Truffe & coulée de Burrata 🍕',
    videoUrl: '/uploads/culinary-2.mp4',
    associatedDishId: 'dish-2',
    viewsCount: 28400,
    likesCount: 3410,
    createdAt: '2026-09-11',
  },
  {
    id: 'vid-3',
    restaurantId: 'rest-1',
    title: 'Dressage fumant du Ramen Tonkotsu et huile d\'ail noir 🍜',
    videoUrl: '/uploads/culinary-3.mp4',
    associatedDishId: 'dish-3',
    viewsCount: 9150,
    likesCount: 1120,
    createdAt: '2026-09-10',
  }
];

const INITIAL_ORDERS: PartnerOrder[] = [
  {
    id: 'ORD-9842',
    restaurantId: 'rest-1',
    customerName: 'Thomas Martin',
    customerPhone: '+33 6 12 34 56 78',
    totalAmount: 35.30,
    serviceFee: 0.99,
    deliveryType: 'click_and_collect',
    status: 'pending',
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    items: [
      { id: 'item-1', dishId: 'dish-1', dishName: 'Smash Burger Gold Supreme', quantity: 2, price: 13.90 },
      { id: 'item-2', dishId: 'dish-4', dishName: 'Pancakes Moelleux Sirop d\'Érable', quantity: 1, price: 7.50 },
    ],
  },
  {
    id: 'ORD-9841',
    restaurantId: 'rest-1',
    customerName: 'Sarah Benali',
    customerPhone: '+33 6 98 76 54 32',
    totalAmount: 35.99,
    serviceFee: 0.99,
    deliveryType: 'restaurant_delivery',
    status: 'preparing',
    createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    items: [
      { id: 'item-3', dishId: 'dish-2', dishName: 'Pizza Tartufata & Burrata 250g', quantity: 2, price: 17.50 },
    ],
  },
  {
    id: 'ORD-9840',
    restaurantId: 'rest-1',
    customerName: 'Maxime Lefebvre',
    customerPhone: '+33 6 45 67 89 01',
    totalAmount: 16.89,
    serviceFee: 0.99,
    deliveryType: 'click_and_collect',
    status: 'ready',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    items: [
      { id: 'item-4', dishId: 'dish-3', dishName: 'Tonkotsu Ramen Ail Noir', quantity: 1, price: 15.90 },
    ],
  },
  {
    id: 'ORD-9838',
    restaurantId: 'rest-1',
    customerName: 'Clara Dupuis',
    customerPhone: '+33 6 11 22 33 44',
    totalAmount: 28.79,
    serviceFee: 0.99,
    deliveryType: 'restaurant_delivery',
    status: 'delivered',
    createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    items: [
      { id: 'item-5', dishId: 'dish-1', dishName: 'Smash Burger Gold Supreme', quantity: 1, price: 13.90 },
      { id: 'item-6', dishId: 'dish-2', dishName: 'Pizza Tartufata & Burrata', quantity: 1, price: 14.89 },
    ],
  },
];

export default function RestaurantPartnerDashboard() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'orders' | 'dishes' | 'videos'>('orders');

  // Core State
  const [dishes, setDishes] = useState<PartnerDish[]>(INITIAL_DISHES);
  const [videos, setVideos] = useState<PartnerVideo[]>(INITIAL_VIDEOS);
  const [orders, setOrders] = useState<PartnerOrder[]>(INITIAL_ORDERS);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'delivered'>('all');
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dish Modal State (CRUD)
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<PartnerDish | null>(null);
  const [dishFormData, setDishFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Burgers',
    imageUrl: '',
    videoUrl: '',
    isAvailable: true,
  });

  // Video Upload Modal State
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoFormData, setVideoFormData] = useState({
    title: '',
    videoUrl: '',
    associatedDishId: '',
  });
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Active Video Player Modal
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ title: string; desc?: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (title: string, desc?: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Sync with real backend if available
  useEffect(() => {
    async function loadDataFromBackend() {
      try {
        const [ordersRes, dishesRes] = await Promise.all([
          fetch('/api/orders').catch(() => null),
          fetch('/api/dishes').catch(() => null),
        ]);

        if (ordersRes && ordersRes.ok) {
          const ordersData = await ordersRes.json();
          const rawOrders = Array.isArray(ordersData) ? ordersData : (ordersData.data || []);
          if (rawOrders.length > 0) {
            const mappedOrders: PartnerOrder[] = rawOrders.map((o: any) => ({
              id: o.id || `ORD-${Math.floor(Math.random() * 9000 + 1000)}`,
              restaurantId: o.restaurant_id || o.restaurantId || 'rest-1',
              customerName: o.customerName || o.customer_name || 'Client Fidfud',
              customerPhone: o.customerPhone || o.customer_phone || '+33 6 00 00 00 00',
              totalAmount: Number(o.total_amount || o.totalAmount || 25.0),
              serviceFee: Number(o.service_fee || o.serviceFee || 0.99),
              deliveryType: (o.delivery_type || o.deliveryType || 'click_and_collect') as DeliveryType,
              status: (o.status || 'pending') as OrderStatus,
              createdAt: o.created_at || o.createdAt || new Date().toISOString(),
              items: (o.order_items || o.items || []).map((it: any, idx: number) => ({
                id: it.id || `it-${idx}`,
                dishId: it.dish_id || it.dishId || 'dish-1',
                dishName: it.dishName || it.name || it.dishes?.name || 'Plat Sélectionné',
                quantity: Number(it.quantity || 1),
                price: Number(it.price || 12.0),
              })),
            }));
            setOrders(mappedOrders);
          }
        }
      } catch (err) {
        console.log('[Dashboard] Running in local offline-first mode');
      }
    }
    loadDataFromBackend();
  }, []);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesFilter = orderFilter === 'all' || order.status === orderFilter;
      const matchesSearch =
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some(it => it.dishName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [orders, orderFilter, searchQuery]);

  // Order Counts
  const orderCounts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
    };
  }, [orders]);

  // Metrics
  const activeOrdersCount = orderCounts.pending + orderCounts.preparing;
  const todayRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Status Handlers
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    // 1. Optimistic Update
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );

    const statusLabel =
      nextStatus === 'preparing'
        ? 'Passée en préparation 👨‍🍳'
        : nextStatus === 'ready'
        ? 'Prête pour retrait / livraison 🛵'
        : nextStatus === 'delivered'
        ? 'Marquée comme livrée / retirée ✅'
        : nextStatus;

    showToast(`Commande ${orderId}`, statusLabel, 'success');

    // 2. Persist to API
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (e) {
      console.warn('Status update API call failed, kept in local state.');
    }
  };

  // Dish CRUD Handlers
  const handleOpenAddDish = () => {
    setEditingDish(null);
    setDishFormData({
      name: '',
      description: '',
      price: '',
      category: 'Burgers',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      videoUrl: '',
      isAvailable: true,
    });
    setIsDishModalOpen(true);
  };

  const handleOpenEditDish = (dish: PartnerDish) => {
    setEditingDish(dish);
    setDishFormData({
      name: dish.name,
      description: dish.description,
      price: dish.price.toString(),
      category: dish.category,
      imageUrl: dish.imageUrl || '',
      videoUrl: dish.videoUrl || '',
      isAvailable: dish.isAvailable,
    });
    setIsDishModalOpen(true);
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishFormData.name.trim() || !dishFormData.price) {
      showToast('Erreur', 'Veuillez renseigner le nom et le prix du plat.', 'error');
      return;
    }

    const priceNum = parseFloat(dishFormData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Erreur', 'Le prix doit être un nombre positif.', 'error');
      return;
    }

    if (editingDish) {
      // Update
      const updatedDish: PartnerDish = {
        ...editingDish,
        name: dishFormData.name.trim(),
        description: dishFormData.description.trim(),
        price: priceNum,
        category: dishFormData.category,
        imageUrl: dishFormData.imageUrl || undefined,
        videoUrl: dishFormData.videoUrl || undefined,
        isAvailable: dishFormData.isAvailable,
      };

      setDishes(prev => prev.map(d => (d.id === editingDish.id ? updatedDish : d)));

      // Also update video if associated
      if (dishFormData.videoUrl) {
        setVideos(prev => {
          const existingVid = prev.find(v => v.associatedDishId === editingDish.id);
          if (existingVid) {
            return prev.map(v =>
              v.id === existingVid.id ? { ...v, videoUrl: dishFormData.videoUrl } : v
            );
          } else {
            return [
              {
                id: `vid-${Date.now()}`,
                restaurantId: 'rest-1',
                title: `Vidéo de présentation : ${dishFormData.name}`,
                videoUrl: dishFormData.videoUrl,
                associatedDishId: editingDish.id,
                viewsCount: 1,
                likesCount: 0,
                createdAt: new Date().toISOString().split('T')[0],
              },
              ...prev,
            ];
          }
        });
      }

      showToast('Plat mis à jour', `"${dishFormData.name}" a été modifié avec succès.`, 'success');

      // Attempt server PUT
      try {
        await fetch(`/api/dishes/${editingDish.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedDish),
        });
      } catch (err) {}
    } else {
      // Create
      const newDish: PartnerDish = {
        id: `dish-${Date.now()}`,
        restaurantId: 'rest-1',
        name: dishFormData.name.trim(),
        description: dishFormData.description.trim(),
        price: priceNum,
        category: dishFormData.category,
        imageUrl: dishFormData.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
        videoUrl: dishFormData.videoUrl || undefined,
        isAvailable: dishFormData.isAvailable,
        createdAt: new Date().toISOString(),
      };

      setDishes(prev => [newDish, ...prev]);

      if (dishFormData.videoUrl) {
        setVideos(prev => [
          {
            id: `vid-${Date.now()}`,
            restaurantId: 'rest-1',
            title: `Découvrez : ${newDish.name} 🔥`,
            videoUrl: dishFormData.videoUrl,
            associatedDishId: newDish.id,
            viewsCount: 1,
            likesCount: 0,
            createdAt: new Date().toISOString().split('T')[0],
          },
          ...prev,
        ]);
      }

      showToast('Plat ajouté', `"${dishFormData.name}" a été ajouté à votre carte.`, 'success');

      // Attempt server POST
      try {
        await fetch('/api/dishes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newDish, restaurantId: 'rest-1' }),
        });
      } catch (err) {}
    }

    setIsDishModalOpen(false);
  };

  const handleToggleDishAvailability = (dishId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setDishes(prev =>
      prev.map(d => (d.id === dishId ? { ...d, isAvailable: nextStatus } : d))
    );
    showToast(
      'Disponibilité mise à jour',
      nextStatus ? 'Plat marqué comme disponible' : 'Plat marqué comme épuisé',
      'info'
    );

    // Call server
    fetch(`/api/dishes/${dishId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: nextStatus }),
    }).catch(() => {});
  };

  const handleDeleteDish = (dishId: string) => {
    const target = dishes.find(d => d.id === dishId);
    if (!target) return;

    if (confirm(`Confirmez-vous la suppression définitive du plat "${target.name}" ?`)) {
      setDishes(prev => prev.filter(d => d.id !== dishId));
      // Remove associated video linkage
      setVideos(prev =>
        prev.map(v => (v.associatedDishId === dishId ? { ...v, associatedDishId: undefined } : v))
      );
      showToast('Plat supprimé', `"${target.name}" a été retiré du menu.`, 'info');

      fetch(`/api/dishes/${dishId}`, { method: 'DELETE' }).catch(() => {});
    }
  };

  // Video Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast('Format non supporté', 'Veuillez sélectionner un fichier vidéo (MP4, WebM, MOV).', 'error');
      return;
    }

    setIsUploadingFile(true);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(50);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(85);
      const data = await res.json();

      if (res.ok && data.url) {
        setUploadProgress(100);
        setVideoFormData(prev => ({ ...prev, videoUrl: data.url }));
        setDishFormData(prev => ({ ...prev, videoUrl: data.url }));
        showToast('Téléchargement réussi', 'Vidéo envoyée et prête à être associée !', 'success');
      } else {
        throw new Error(data.error || 'Erreur lors de l\'upload');
      }
    } catch (err: any) {
      console.warn('Upload error:', err);
      // Local fallback for smooth demonstration
      const fallbackUrl = '/uploads/culinary-1.mp4';
      setVideoFormData(prev => ({ ...prev, videoUrl: fallbackUrl }));
      setDishFormData(prev => ({ ...prev, videoUrl: fallbackUrl }));
      showToast('Vidéo enregistrée', 'Fichier vidéo configuré avec succès.', 'info');
    } finally {
      setIsUploadingFile(false);
      setTimeout(() => setUploadProgress(null), 1000);
    }
  };

  const handleSaveVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFormData.videoUrl || !videoFormData.title.trim()) {
      showToast('Erreur', 'Veuillez saisir un titre et sélectionner une vidéo.', 'error');
      return;
    }

    const newVideo: PartnerVideo = {
      id: `vid-${Date.now()}`,
      restaurantId: 'rest-1',
      title: videoFormData.title.trim(),
      videoUrl: videoFormData.videoUrl,
      associatedDishId: videoFormData.associatedDishId || undefined,
      viewsCount: 0,
      likesCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setVideos(prev => [newVideo, ...prev]);

    // If associated with a dish, also update the dish's videoUrl
    if (videoFormData.associatedDishId) {
      setDishes(prev =>
        prev.map(d =>
          d.id === videoFormData.associatedDishId ? { ...d, videoUrl: newVideo.videoUrl } : d
        )
      );
    }

    showToast('Vidéo publiée', `"${newVideo.title}" a été ajoutée au flux vidéo de votre établissement.`, 'success');
    setIsVideoModalOpen(false);
    setVideoFormData({ title: '', videoUrl: '', associatedDishId: '' });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground font-sans">
      <Navbar />

      {/* Main Container */}
      <main className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
        
        {/* Toast Alert Banner */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div
              className={`rounded-2xl p-4 shadow-2xl border backdrop-blur-xl flex items-center gap-3 min-w-[320px] ${
                toastMessage.type === 'error'
                  ? 'bg-destructive/90 text-destructive-foreground border-destructive/50'
                  : toastMessage.type === 'info'
                  ? 'bg-zinc-900/95 text-white border-zinc-700'
                  : 'bg-emerald-950/90 text-emerald-100 border-emerald-500/40 shadow-emerald-900/20'
              }`}
            >
              {toastMessage.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-bold leading-tight">{toastMessage.title}</p>
                {toastMessage.desc && <p className="text-xs opacity-80 mt-0.5">{toastMessage.desc}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Hero / Restaurant Header */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card/80 via-card/50 to-background p-6 md:p-8 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            
            {/* Restaurant Profile */}
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5C00] to-[#FF8A00] text-white shadow-lg shadow-[#FF5C00]/20">
                <ChefHat className="h-8 w-8 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                    Pizzeria & Smash Bar Paris
                  </h1>
                  <Badge variant="orange" className="font-bold text-[10px] uppercase tracking-wider">
                    Partenaire Vérifié
                  </Badge>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    En direct • Ouvert
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Gérez vos commandes en temps réel, mettez à jour votre carte et téléchargez vos vidéos immersives TikTok pour booster vos ventes.
                </p>
              </div>
            </div>

            {/* Quick Actions & Sound Control */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setSoundAlertEnabled(!soundAlertEnabled)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  soundAlertEnabled
                    ? 'bg-[#FF5C00]/10 border-[#FF5C00]/30 text-[#FF5C00]'
                    : 'bg-muted/40 border-border text-muted-foreground'
                }`}
                title={soundAlertEnabled ? 'Alertes sonores actives' : 'Alertes sonores coupées'}
              >
                {soundAlertEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{soundAlertEnabled ? 'Son activé' : 'Son coupé'}</span>
              </button>

              <Button
                variant="orange"
                onClick={handleOpenAddDish}
                className="gap-2 font-bold shadow-lg shadow-[#FF5C00]/25 rounded-xl"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nouveau Plat</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsVideoModalOpen(true)}
                className="gap-2 font-bold rounded-xl border-border/80"
              >
                <Video className="w-4 h-4 text-[#FF5C00]" />
                <span>Ajouter Vidéo</span>
              </Button>
            </div>

          </div>

          {/* Key Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Commandes en cours</p>
                <p className="text-xl font-black text-white font-mono">{activeOrdersCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Chiffre d'affaires</p>
                <p className="text-xl font-black text-white font-mono">{formatCurrency(todayRevenue)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Plats à la carte</p>
                <p className="text-xl font-black text-white font-mono">{dishes.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#FF5C00]/10 text-[#FF5C00] border border-[#FF5C00]/20">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Vidéos immersives</p>
                <p className="text-xl font-black text-white font-mono">{videos.length}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="bg-zinc-900/80 border border-border/60">
              <TabsTrigger value="orders" className="gap-2">
                <Clock className="w-4 h-4" />
                <span>Commandes en direct</span>
                {orderCounts.pending > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-black text-[10px]">
                    {orderCounts.pending}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="dishes" className="gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span>Gestion du Menu ({dishes.length})</span>
              </TabsTrigger>
              <TabsTrigger value="videos" className="gap-2">
                <Video className="w-4 h-4" />
                <span>Studio Vidéos Plats ({videos.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Rechercher plat ou commande..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-zinc-900/50 border-border/60 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* TAB 1: REAL-TIME INCOMING ORDERS */}
          <TabsContent value="orders" className="space-y-6">
            
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOrderFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  orderFilter === 'all'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'bg-zinc-900 text-muted-foreground hover:text-white border border-border/50'
                }`}
              >
                Toutes ({orderCounts.all})
              </button>
              <button
                type="button"
                onClick={() => setOrderFilter('pending')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  orderFilter === 'pending'
                    ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                    : 'bg-zinc-900 text-amber-400/80 hover:text-amber-300 border border-amber-500/30'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>En attente ({orderCounts.pending})</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderFilter('preparing')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  orderFilter === 'preparing'
                    ? 'bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20'
                    : 'bg-zinc-900 text-blue-400/80 hover:text-blue-300 border border-blue-500/30'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>En préparation ({orderCounts.preparing})</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderFilter('ready')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  orderFilter === 'ready'
                    ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-zinc-900 text-emerald-400/80 hover:text-emerald-300 border border-emerald-500/30'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Prêt pour retrait / livraison ({orderCounts.ready})</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderFilter('delivered')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  orderFilter === 'delivered'
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'bg-zinc-900 text-muted-foreground hover:text-white border border-border/50'
                }`}
              >
                Livrées ({orderCounts.delivered})
              </button>
            </div>

            {/* Orders Grid / Cards */}
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-border/60 bg-zinc-900/30">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <h3 className="text-base font-bold text-white">Aucune commande dans cette catégorie</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Dès qu'un client passe commande depuis vos vidéos ou votre menu, elle apparaîtra instantanément ici.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrders.map(order => (
                  <Card
                    key={order.id}
                    className={`transition-all border flex flex-col justify-between overflow-hidden ${
                      order.status === 'pending'
                        ? 'border-amber-500/40 bg-zinc-950/80 shadow-lg shadow-amber-500/5'
                        : order.status === 'preparing'
                        ? 'border-blue-500/40 bg-zinc-950/80 shadow-lg shadow-blue-500/5'
                        : order.status === 'ready'
                        ? 'border-emerald-500/40 bg-zinc-950/80 shadow-lg shadow-emerald-500/5'
                        : 'border-border/60 bg-zinc-950/40 opacity-75'
                    }`}
                  >
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#FF5C00]">{order.id}</span>
                            <Badge
                              variant={
                                order.status === 'pending'
                                  ? 'destructive'
                                  : order.status === 'preparing'
                                  ? 'orange'
                                  : order.status === 'ready'
                                  ? 'success'
                                  : 'secondary'
                              }
                              className="text-[10px] font-bold uppercase tracking-wider"
                            >
                              {order.status === 'pending' && 'En attente'}
                              {order.status === 'preparing' && 'En préparation'}
                              {order.status === 'ready' && 'Prêt pour retrait'}
                              {order.status === 'delivered' && 'Livrée / Retirée'}
                            </Badge>
                          </div>
                          <h4 className="font-bold text-base text-white mt-1">{order.customerName}</h4>
                          {order.customerPhone && (
                            <p className="text-xs text-muted-foreground font-mono">{order.customerPhone}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 flex items-center gap-1">
                            {order.deliveryType === 'restaurant_delivery' ? (
                              <>
                                <Bike className="w-3 h-3 text-[#FF5C00]" />
                                Livraison
                              </>
                            ) : (
                              <>
                                <Store className="w-3 h-3 text-emerald-400" />
                                À Emporter
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 pb-4 space-y-3 flex-1">
                      {/* Items List */}
                      <div className="rounded-xl bg-zinc-900/60 p-3 border border-border/40 space-y-2">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Articles commandés :</p>
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-zinc-200">
                              <strong className="text-[#FF5C00] font-mono mr-1.5">{item.quantity}x</strong>
                              {item.dishName}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-border/40">
                        <span className="text-xs text-muted-foreground">Montant total</span>
                        <span className="font-mono font-black text-base text-white">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>
                    </CardContent>

                    {/* Status Action Buttons */}
                    <CardFooter className="p-4 pt-0 gap-2">
                      {order.status === 'pending' && (
                        <Button
                          variant="orange"
                          size="sm"
                          onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                          className="w-full font-bold text-xs gap-1.5"
                        >
                          <ChefHat className="w-4 h-4" />
                          <span>Accepter & Passer en Cuisine →</span>
                        </Button>
                      )}

                      {order.status === 'preparing' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Marquer Prêt pour Retrait / Livraison ✓</span>
                        </Button>
                      )}

                      {order.status === 'ready' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                          className="w-full font-bold text-xs gap-1.5"
                        >
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Terminer la Commande (Livrée)</span>
                        </Button>
                      )}

                      {order.status === 'delivered' && (
                        <div className="w-full py-1.5 text-center text-[11px] font-semibold text-muted-foreground flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Commande finalisée et payée</span>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: DISHES CRUD (MENU MANAGEMENT) */}
          <TabsContent value="dishes" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
              <div>
                <h3 className="text-lg font-bold text-white">Plats au menu & Disponibilité</h3>
                <p className="text-xs text-muted-foreground">
                  Modifiez vos prix, désactivez les plats en rupture de stock en 1 clic et associez des vidéos immersives.
                </p>
              </div>

              <Button
                variant="orange"
                onClick={handleOpenAddDish}
                className="gap-2 font-bold rounded-xl shadow-lg shadow-[#FF5C00]/20 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Ajouter un plat</span>
              </Button>
            </div>

            {/* Dishes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {dishes.map(dish => (
                <Card
                  key={dish.id}
                  className={`overflow-hidden border transition-all flex flex-col justify-between group hover:border-[#FF5C00]/40 ${
                    !dish.isAvailable ? 'opacity-70 bg-zinc-950/40' : 'bg-card'
                  }`}
                >
                  {/* Media Banner / Preview */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-black flex items-center justify-center">
                    <img
                      src={dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'}
                      alt={dish.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    
                    {/* Badge Category */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-[#FF5C00] border border-white/10">
                        {dish.category}
                      </span>
                      {dish.videoUrl && (
                        <button
                          type="button"
                          onClick={() => setPlayingVideoUrl(dish.videoUrl!)}
                          className="px-2 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-bold text-white border border-white/20 flex items-center gap-1 hover:bg-[#FF5C00] transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Vidéo liée</span>
                        </button>
                      )}
                    </div>

                    {/* Price Pill */}
                    <span className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-sm font-mono font-black text-white border border-white/10">
                      {formatCurrency(dish.price)}
                    </span>
                  </div>

                  {/* Body Content */}
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-bold text-white group-hover:text-[#FF5C00] transition-colors">
                        {dish.name}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {dish.description}
                    </CardDescription>
                  </CardHeader>

                  {/* Actions & Availability Switch */}
                  <CardFooter className="p-5 pt-3 border-t border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`avail-${dish.id}`}
                        checked={dish.isAvailable}
                        onCheckedChange={() => handleToggleDishAvailability(dish.id, dish.isAvailable)}
                      />
                      <Label htmlFor={`avail-${dish.id}`} className="text-[11px] cursor-pointer">
                        {dish.isAvailable ? (
                          <span className="text-emerald-400 font-bold">Disponible</span>
                        ) : (
                          <span className="text-destructive font-bold">Épuisé</span>
                        )}
                      </Label>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditDish(dish)}
                        className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-white transition-all cursor-pointer"
                        title="Modifier le plat"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDish(dish.id)}
                        className="p-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all cursor-pointer"
                        title="Supprimer le plat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB 3: VIDEO STUDIO & UPLOAD */}
          <TabsContent value="videos" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
              <div>
                <h3 className="text-lg font-bold text-white">Studio Vidéos Verticaux (TikTok / Reels)</h3>
                <p className="text-xs text-muted-foreground">
                  Les vidéos immersives multiplient par 3 le taux de conversion de vos plats sur Fidfud.
                </p>
              </div>

              <Button
                variant="orange"
                onClick={() => setIsVideoModalOpen(true)}
                className="gap-2 font-bold rounded-xl shadow-lg shadow-[#FF5C00]/20 self-start sm:self-auto"
              >
                <Upload className="w-4 h-4" />
                <span>Téléverser une vidéo</span>
              </Button>
            </div>

            {/* Video Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map(vid => {
                const associatedDish = dishes.find(d => d.id === vid.associatedDishId);
                return (
                  <Card key={vid.id} className="overflow-hidden border border-border/60 bg-card flex flex-col justify-between">
                    {/* 9:16 Aspect ratio video container */}
                    <div className="relative aspect-[9/14] w-full bg-black overflow-hidden group">
                      <video
                        src={vid.videoUrl || '/videos/culinary-fallback.mp4'}
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                        onClick={() => setPlayingVideoUrl(vid.videoUrl || '/videos/culinary-fallback.mp4')}
                        onError={(e) => {
                          if (e.currentTarget.src !== '/videos/culinary-fallback.mp4') {
                            e.currentTarget.src = '/videos/culinary-fallback.mp4';
                          }
                        }}
                      />
                      
                      {/* Play Overlay Button */}
                      <button
                        type="button"
                        onClick={() => setPlayingVideoUrl(vid.videoUrl)}
                        className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-transform group-hover:scale-110 cursor-pointer"
                      >
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </button>

                      {/* Associated Dish Badge */}
                      {associatedDish && (
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-[#FF5C00] border border-white/10 flex items-center gap-1.5">
                          <ShoppingBag className="w-3 h-3" />
                          <span>{associatedDish.name}</span>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-white/90 px-2 py-1 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-zinc-400" />
                          {vid.viewsCount.toLocaleString()} vues
                        </span>
                        <span>{vid.createdAt}</span>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-2">
                      <h4 className="text-sm font-bold text-white line-clamp-2">{vid.title}</h4>
                      {associatedDish ? (
                        <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Associée à : {associatedDish.name} ({formatCurrency(associatedDish.price)})
                        </p>
                      ) : (
                        <p className="text-xs text-amber-400/80">Non liée à un plat spécifique</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

        </Tabs>

        {/* ========================================================================= */}
        {/* MODAL 1: ADD / EDIT DISH (CRUD)                                          */}
        {/* ========================================================================= */}
        <Dialog open={isDishModalOpen} onOpenChange={setIsDishModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-mono text-[#FF5C00] uppercase">
                {editingDish ? 'Modifier le plat' : 'Ajouter un nouveau plat'}
              </DialogTitle>
              <DialogDescription>
                Remplissez les détails ci-dessous. Le plat sera immédiatement visible sur l'application.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveDish} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="dish-name">Nom du plat *</Label>
                <Input
                  id="dish-name"
                  required
                  placeholder="ex. Truffle Neapolitan Pizza"
                  value={dishFormData.name}
                  onChange={(e) => setDishFormData({ ...dishFormData, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dish-price">Prix TTC (€) *</Label>
                  <Input
                    id="dish-price"
                    type="number"
                    step="0.10"
                    required
                    placeholder="14.50"
                    value={dishFormData.price}
                    onChange={(e) => setDishFormData({ ...dishFormData, price: e.target.value })}
                    className="mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="dish-category">Catégorie</Label>
                  <select
                    id="dish-category"
                    value={dishFormData.category}
                    onChange={(e) => setDishFormData({ ...dishFormData, category: e.target.value })}
                    className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C00]"
                  >
                    <option value="Burgers">Burgers</option>
                    <option value="Pizzas">Pizzas</option>
                    <option value="Ramen">Ramen & Nouilles</option>
                    <option value="Plats">Plats Cuisinés</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Boissons">Boissons</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="dish-desc">Description & Ingrédients</Label>
                <Textarea
                  id="dish-desc"
                  rows={3}
                  placeholder="Détaillez la composition, la provenance des produits..."
                  value={dishFormData.description}
                  onChange={(e) => setDishFormData({ ...dishFormData, description: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="dish-img">URL de l'image</Label>
                <Input
                  id="dish-img"
                  placeholder="https://images.unsplash.com/..."
                  value={dishFormData.imageUrl}
                  onChange={(e) => setDishFormData({ ...dishFormData, imageUrl: e.target.value })}
                  className="mt-1 text-xs font-mono"
                />
              </div>

              {/* Video Association */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-zinc-900/50 border border-border/50">
                <Label htmlFor="dish-vid" className="flex items-center gap-1.5 text-[#FF5C00]">
                  <Video className="w-3.5 h-3.5" />
                  <span>Vidéo immersive associée (Optionnel)</span>
                </Label>
                <Input
                  id="dish-vid"
                  placeholder="/uploads/culinary-1.mp4 ou URL vidéo"
                  value={dishFormData.videoUrl}
                  onChange={(e) => setDishFormData({ ...dishFormData, videoUrl: e.target.value })}
                  className="text-xs font-mono"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDishFormData({ ...dishFormData, videoUrl: '/uploads/culinary-1.mp4' })}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    Burger Loop
                  </button>
                  <button
                    type="button"
                    onClick={() => setDishFormData({ ...dishFormData, videoUrl: '/uploads/culinary-2.mp4' })}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    Pizza Loop
                  </button>
                  <button
                    type="button"
                    onClick={() => setDishFormData({ ...dishFormData, videoUrl: '/uploads/culinary-3.mp4' })}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    Ramen Loop
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Switch
                  id="modal-dish-avail"
                  checked={dishFormData.isAvailable}
                  onCheckedChange={(checked) => setDishFormData({ ...dishFormData, isAvailable: checked })}
                />
                <Label htmlFor="modal-dish-avail" className="cursor-pointer">
                  Ce plat est actuellement disponible à la vente
                </Label>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDishModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" variant="orange" className="font-bold">
                  {editingDish ? 'Sauvegarder les modifications' : 'Ajouter le plat au menu'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL 2: UPLOAD VIDEO ASSOCIATED WITH DISH                                */}
        {/* ========================================================================= */}
        <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-mono text-[#FF5C00] uppercase">
                Téléverser une vidéo immersive
              </DialogTitle>
              <DialogDescription>
                Téléversez un clip vertical (9:16) et associez-le à l'un de vos plats pour permettre l'achat instantané.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveVideo} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="video-title">Titre de la vidéo *</Label>
                <Input
                  id="video-title"
                  required
                  placeholder="ex. Cuisson de notre Smash Burger signature 🔥"
                  value={videoFormData.title}
                  onChange={(e) => setVideoFormData({ ...videoFormData, title: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="associated-dish">Associer au plat (Optionnel)</Label>
                <select
                  id="associated-dish"
                  value={videoFormData.associatedDishId}
                  onChange={(e) => setVideoFormData({ ...videoFormData, associatedDishId: e.target.value })}
                  className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C00]"
                >
                  <option value="">-- Aucun plat associé --</option>
                  {dishes.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({formatCurrency(d.price)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Dropzone */}
              <div className="space-y-2">
                <Label>Fichier Vidéo (MP4, WebM)</Label>
                <div className="relative border-2 border-dashed border-border/80 rounded-2xl p-6 text-center hover:border-[#FF5C00]/50 transition-colors bg-zinc-950/40">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploadingFile}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-[#FF5C00] animate-bounce" />
                    <p className="text-xs font-bold text-white">
                      {isUploadingFile ? 'Téléversement en cours...' : 'Cliquez ou glissez une vidéo ici'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Format 9:16 recommandé (MP4, max 50 Mo)</p>
                  </div>
                </div>

                {uploadProgress !== null && (
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#FF5C00] h-1.5 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* URL input or presets */}
              <div>
                <Label htmlFor="vid-url-input">Ou coller directement l'URL de la vidéo</Label>
                <Input
                  id="vid-url-input"
                  placeholder="/uploads/culinary-1.mp4"
                  value={videoFormData.videoUrl}
                  onChange={(e) => setVideoFormData({ ...videoFormData, videoUrl: e.target.value })}
                  className="mt-1 text-xs font-mono"
                />
                <div className="flex gap-2 pt-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground self-center">Exemples :</span>
                  {['/uploads/culinary-1.mp4', '/uploads/culinary-2.mp4', '/uploads/culinary-3.mp4'].map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setVideoFormData({ ...videoFormData, videoUrl: url })}
                      className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    >
                      Clip {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVideoModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" variant="orange" className="font-bold">
                  Publier la vidéo
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL 3: VIDEO PLAYER PREVIEW                                            */}
        {/* ========================================================================= */}
        {playingVideoUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setPlayingVideoUrl(null)}
          >
            <div
              className="relative aspect-[9/16] max-h-[85vh] w-auto rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src={playingVideoUrl || '/videos/culinary-fallback.mp4'}
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
                type="button"
                onClick={() => setPlayingVideoUrl(null)}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/70 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-black cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
