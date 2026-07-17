"use client";

import React, { useState } from 'react';
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
  MessageSquare,
  Star,
  Image as ImageIcon,
  ClipboardList,
  Clock,
  Bell,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface NextJsDish {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  category?: string;
}

interface NextJsOrderItem {
  id: string;
  dishName: string;
  quantity: number;
  price: number;
}

interface NextJsOrder {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: NextJsOrderItem[];
  totalAmount: number;
  status: 'received' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  createdAt: string;
}

export default function RestaurantDashboard() {
  // Tabs State
  const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('menu');

  // Notification / Toast states (replacing window.alert)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Mock initial digital menu
  const [dishes, setDishes] = useState<NextJsDish[]>([
    {
      id: 'dish-1',
      name: 'Smash Burger Gold',
      description: 'Double steaks de bœuf normand, cheddar affiné 12 mois croustillant, sauce secrète fumée.',
      price: 12.90,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300',
      isAvailable: true,
      category: 'Burgers'
    },
    {
      id: 'dish-2',
      name: 'Pizza Truffe Royale',
      description: 'Crème de truffe blanche d’Alba, mozzarella fior di latte, champignons portobello grillés, parmesan.',
      price: 18.50,
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300',
      isAvailable: true,
      category: 'Pizzas'
    },
    {
      id: 'dish-3',
      name: 'Tonkotsu Special Ramen',
      description: 'Bouillon mijoté 16 heures, nouilles fraîches de blé, chashu de porc rôti minute, œuf ajitama bio.',
      price: 15.00,
      imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300',
      isAvailable: false,
      category: 'Ramen'
    }
  ]);

  // Mock initial orders
  const [orders, setOrders] = useState<NextJsOrder[]>([
    {
      id: 'ORD-9842',
      customerName: 'Thomas Martin',
      customerPhone: '+33 6 12 34 56 78',
      items: [
        { id: 'item-1', dishName: 'Smash Burger Gold', quantity: 2, price: 12.90 },
        { id: 'item-2', dishName: 'Pizza Truffe Royale', quantity: 1, price: 18.50 }
      ],
      totalAmount: 44.30,
      status: 'received',
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 min ago
    },
    {
      id: 'ORD-9841',
      customerName: 'Sarah Lefevre',
      customerPhone: '+33 7 98 76 54 32',
      items: [
        { id: 'item-3', dishName: 'Tonkotsu Special Ramen', quantity: 1, price: 15.00 }
      ],
      totalAmount: 15.00,
      status: 'preparing',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 min ago
    },
    {
      id: 'ORD-9840',
      customerName: 'Lucas Dubois',
      customerPhone: '+33 6 55 44 33 22',
      items: [
        { id: 'item-4', dishName: 'Pizza Truffe Royale', quantity: 2, price: 18.50 }
      ],
      totalAmount: 37.00,
      status: 'ready',
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString() // 25 min ago
    }
  ]);

  // Form & CRUD states
  const [editingDish, setEditingDish] = useState<NextJsDish | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New/Edit Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formCategory, setFormCategory] = useState('Général');

  // Stats selectors
  const totalDishes = dishes.length;
  const availableDishes = dishes.filter(d => d.isAvailable).length;
  const averagePrice = dishes.reduce((acc, d) => acc + d.price, 0) / (totalDishes || 1);
  const activeOrdersCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormImageUrl('');
    setFormIsAvailable(true);
    setFormCategory('Général');
    setEditingDish(null);
    setShowAddForm(false);
  };

  const handleStartEdit = (dish: NextJsDish) => {
    setEditingDish(dish);
    setFormName(dish.name);
    setFormDescription(dish.description);
    setFormPrice(dish.price.toString());
    setFormImageUrl(dish.imageUrl || '');
    setFormIsAvailable(dish.isAvailable);
    setFormCategory(dish.category || 'Général');
    setShowAddForm(false);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formName.trim() || !formPrice.trim()) {
      triggerToast("Veuillez renseigner un nom et un prix valides.", "error");
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      triggerToast("Le prix doit être un nombre positif.", "error");
      return;
    }

    if (editingDish) {
      // Update action
      setDishes(prev => prev.map(d => {
        if (d.id === editingDish.id) {
          return {
            ...d,
            name: formName,
            description: formDescription,
            price: priceNum,
            imageUrl: formImageUrl || undefined,
            isAvailable: formIsAvailable,
            category: formCategory
          };
        }
        return d;
      }));
      triggerToast(`Plat "${formName}" mis à jour avec succès !`);
    } else {
      // Create action
      const newDish: NextJsDish = {
        id: `dish-${Date.now()}`,
        name: formName,
        description: formDescription,
        price: priceNum,
        imageUrl: formImageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300',
        isAvailable: formIsAvailable,
        category: formCategory
      };
      setDishes(prev => [...prev, newDish]);
      triggerToast(`Nouveau plat "${formName}" ajouté avec succès !`);
    }

    resetForm();
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      const deletedDish = dishes.find(d => d.id === deleteConfirmId);
      setDishes(prev => prev.filter(d => d.id !== deleteConfirmId));
      if (editingDish?.id === deleteConfirmId) {
        resetForm();
      }
      triggerToast(`Plat "${deletedDish?.name || 'Spécialité'}" supprimé de la carte.`, "info");
      setDeleteConfirmId(null);
    }
  };

  const toggleAvailability = (id: string) => {
    setDishes(prev => prev.map(d => {
      if (d.id === id) {
        const updatedAvailable = !d.isAvailable;
        triggerToast(`Disponibilité de "${d.name}" mise à jour.`, updatedAvailable ? 'success' : 'info');
        return { ...d, isAvailable: updatedAvailable };
      }
      return d;
    }));
  };

  // Order Management status updates
  const handleUpdateOrderStatus = (orderId: string, nextStatus: NextJsOrder['status']) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, status: nextStatus };
      }
      return o;
    }));
    
    let statusLabel = '';
    switch(nextStatus) {
      case 'preparing': statusLabel = 'en préparation'; break;
      case 'ready': statusLabel = 'prête pour retrait'; break;
      case 'delivered': statusLabel = 'livrée'; break;
      case 'cancelled': statusLabel = 'annulée'; break;
    }
    triggerToast(`Commande ${orderId} marquée ${statusLabel} !`);
  };

  // Simulate a random incoming order in real-time
  const simulateNewOrder = () => {
    if (dishes.length === 0) {
      triggerToast("Veuillez d'abord ajouter des plats au menu.", "error");
      return;
    }
    
    const randomDish1 = dishes[Math.floor(Math.random() * dishes.length)];
    const randomDish2 = dishes[Math.floor(Math.random() * dishes.length)];
    const randomQty1 = Math.floor(Math.random() * 2) + 1;
    const randomQty2 = Math.floor(Math.random() * 2) + 1;
    
    const randomNames = ['Sophie Bernard', 'Pierre Dupont', 'Camille Petit', 'Antoine Roux', 'Marie Durand', 'Julien Simon'];
    const randomPhones = ['+33 6 12 99 88 77', '+33 6 55 44 33 22', '+33 7 88 55 44 11', '+33 6 22 44 66 88'];
    
    const items = [
      { id: `item-sim-1-${Date.now()}`, dishName: randomDish1.name, quantity: randomQty1, price: randomDish1.price }
    ];
    
    let total = randomDish1.price * randomQty1;
    
    if (Math.random() > 0.5 && randomDish1.id !== randomDish2.id) {
      items.push({ id: `item-sim-2-${Date.now()}`, dishName: randomDish2.name, quantity: randomQty2, price: randomDish2.price });
      total += randomDish2.price * randomQty2;
    }

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: NextJsOrder = {
      id: orderId,
      customerName: randomNames[Math.floor(Math.random() * randomNames.length)],
      customerPhone: randomPhones[Math.floor(Math.random() * randomPhones.length)],
      items,
      totalAmount: parseFloat(total.toFixed(2)),
      status: 'received',
      createdAt: new Date().toISOString()
    };

    setOrders(prev => [newOrder, ...prev]);
    triggerToast(`⚡ Nouvelle commande reçue ! ID : ${orderId}`, "success");
  };

  return (
    <div className="w-full min-h-screen bg-[#050506] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Custom Toast Notification System */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 animate-slide-up flex items-center gap-3 bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl shadow-2xl max-w-sm">
            {toastType === 'success' && (
              <div className="w-7 h-7 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                <CheckCircle size={15} />
              </div>
            )}
            {toastType === 'error' && (
              <div className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertCircle size={15} />
              </div>
            )}
            {toastType === 'info' && (
              <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <ClipboardList size={15} />
              </div>
            )}
            <div>
              <p className="text-xs font-black uppercase text-zinc-400">Notification</p>
              <p className="text-xs text-white mt-0.5">{toastMessage}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-zinc-500 hover:text-white ml-2">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Custom Confirmation Dialog */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-3xl max-w-sm w-full space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
                <Trash2 size={20} />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-black uppercase tracking-wider text-white">Supprimer ce plat ?</h4>
                <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed">
                  Voulez-vous vraiment supprimer cette spécialité culinaire de votre carte ? Cette action est irréversible.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[11px] py-3 rounded-xl transition-all"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-black uppercase text-[11px] py-3 rounded-xl transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header Title with Subtitle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div>
            <div className="flex items-center gap-2 text-[#FF5C00] font-mono text-[10px] font-black uppercase tracking-widest mb-1.5">
              <Sparkles size={11} className="animate-pulse" />
              <span>Studio Partenaire Premium</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-white flex items-center gap-2.5">
              <Utensils className="text-[#FF5C00]" />
              Tableau de Bord Fidfud
            </h1>
            <p className="text-zinc-500 text-xs mt-1">
              Gérez en temps réel votre carte digitale et suivez les flux de commandes de vos clients gourmets.
            </p>
          </div>
          
          <div className="flex gap-2">
            {activeTab === 'orders' && (
              <button
                onClick={simulateNewOrder}
                className="bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-800 font-black uppercase tracking-wider text-[10px] px-3.5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
              >
                <Bell size={13} className="text-[#FF5C00] animate-bounce" />
                <span>Simuler Commande</span>
              </button>
            )}
            
            <button
              onClick={() => { resetForm(); setShowAddForm(true); setActiveTab('menu'); }}
              className="bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-black uppercase tracking-wider text-[10px] px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#FF5C00]/15"
            >
              <Plus size={14} />
              <span>Nouveau Plat</span>
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex border-b border-zinc-900 pb-px">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'menu'
                ? 'border-[#FF5C00] text-white bg-zinc-950/40'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Utensils size={14} className={activeTab === 'menu' ? 'text-[#FF5C00]' : ''} />
            <span>Carte Digitale ({totalDishes})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer relative ${
              activeTab === 'orders'
                ? 'border-[#FF5C00] text-white bg-zinc-950/40'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ClipboardList size={14} className={activeTab === 'orders' ? 'text-[#FF5C00]' : ''} />
            <span>Suivi Commandes</span>
            {activeOrdersCount > 0 && (
              <span className="bg-[#FF5C00] text-white text-[9px] font-mono font-black h-4 px-1.5 rounded-full flex items-center justify-center animate-pulse">
                {activeOrdersCount}
              </span>
            )}
          </button>
        </div>

        {/* Digital Menu Tab View */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* Analytics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-950 border border-zinc-900/60 p-4.5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-800">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Total Spécialités</span>
                  <span className="text-lg font-black text-white font-mono">{totalDishes}</span>
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-900/60 p-4.5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/10">
                  <Check size={20} />
                </div>
                <div>
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Disponibles</span>
                  <span className="text-lg font-black text-green-400 font-mono">{availableDishes} / {totalDishes}</span>
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-900/60 p-4.5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-[#FF5C00]/10 flex items-center justify-center text-[#FF5C00] border border-[#FF5C00]/10">
                  <DollarSign size={20} />
                </div>
                <div>
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Prix Moyen</span>
                  <span className="text-lg font-black text-[#FF5C00] font-mono">{averagePrice.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Dashboard Grid (Left: digital menu list, Right: CRUD Form) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Menu Items List */}
              <div className="lg:col-span-7 space-y-4">
                <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <span>Plats au Menu</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </h2>

                {dishes.length === 0 ? (
                  <div className="bg-zinc-950 border border-dashed border-zinc-800 p-12 text-center rounded-3xl space-y-4">
                    <p className="text-zinc-500 text-sm">Votre carte de spécialités est complètement vide.</p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="bg-zinc-900 border border-zinc-800 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl hover:bg-zinc-800 transition-colors"
                    >
                      Créer mon premier plat
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {dishes.map(dish => (
                      <div 
                        key={dish.id}
                        className={`bg-zinc-950 border transition-all rounded-2xl p-4 flex gap-4 ${
                          editingDish?.id === dish.id 
                            ? 'border-[#FF5C00] shadow-[0_0_15px_rgba(255,92,0,0.1)]' 
                            : 'border-zinc-900/80 hover:border-zinc-800'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shrink-0 relative">
                          {dish.imageUrl ? (
                            <img 
                              src={dish.imageUrl} 
                              alt={dish.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">🍔</div>
                          )}
                          
                          {/* Availability status badge */}
                          <span className={`absolute top-1 left-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            dish.isAvailable ? 'bg-green-500/90 text-black' : 'bg-red-500/90 text-white'
                          }`}>
                            {dish.isAvailable ? 'OK' : 'RUPTURE'}
                          </span>
                        </div>

                        {/* Dish Metadata */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="text-sm font-black uppercase text-white truncate">{dish.name}</h3>
                              <span className="text-sm font-black text-[#FF5C00] font-mono shrink-0">{dish.price.toFixed(2)} €</span>
                            </div>
                            <p className="text-zinc-500 text-[11px] leading-relaxed line-clamp-2 mt-1">
                              {dish.description || 'Aucune description rédigée.'}
                            </p>
                          </div>

                          {/* Control row */}
                          <div className="flex items-center justify-between border-t border-zinc-900 pt-2.5 mt-2">
                            <span className="text-[9px] font-bold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded uppercase">
                              {dish.category || 'Général'}
                            </span>
                            
                            <div className="flex items-center space-x-1.5">
                              {/* Toggle Availability Action */}
                              <button
                                onClick={() => toggleAvailability(dish.id)}
                                className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                title="Changer la disponibilité"
                              >
                                {dish.isAvailable ? (
                                  <ToggleRight size={18} className="text-green-500" />
                                ) : (
                                  <ToggleLeft size={18} className="text-zinc-600" />
                                )}
                              </button>

                              {/* Edit Action */}
                              <button
                                onClick={() => handleStartEdit(dish)}
                                className="p-1 text-zinc-400 hover:text-white transition-colors hover:bg-zinc-900 rounded-lg cursor-pointer"
                                title="Modifier"
                              >
                                <Edit2 size={13} />
                              </button>

                              {/* Delete Action */}
                              <button
                                onClick={() => handleDeleteClick(dish.id)}
                                className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CRUD Form / Actions Editor panel */}
              <div className="lg:col-span-5 space-y-4">
                {(showAddForm || editingDish) ? (
                  <div className="bg-[#09090B]/90 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 space-y-5 sticky top-6">
                    <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FF5C00]" />
                        {editingDish ? 'Modifier la Spécialité' : 'Nouveau Plat'}
                      </h3>
                      <button 
                        onClick={resetForm}
                        className="p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800/80 transition-colors cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <form onSubmit={handleSaveSubmit} className="space-y-4">
                      {/* Name field */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Nom du Plat</label>
                        <input
                          type="text"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="e.g. Pizza Royale Truffe"
                          required
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>

                      {/* Category and Price Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Catégorie</label>
                          <input
                            type="text"
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value)}
                            placeholder="e.g. Burgers, Pizza"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF5C00]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Prix (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formPrice}
                            onChange={(e) => setFormPrice(e.target.value)}
                            placeholder="12.90"
                            required
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF5C00] font-mono"
                          />
                        </div>
                      </div>

                      {/* Description field */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Description / Ingrédients</label>
                        <textarea
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Décrivez les délices du plat pour mettre l'eau à la bouche de vos clients..."
                          rows={3}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF5C00] leading-relaxed resize-none"
                        />
                      </div>

                      {/* Image URL field */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block flex items-center gap-1">
                          <ImageIcon size={10} />
                          <span>URL de l'image (Simulation)</span>
                        </label>
                        <input
                          type="url"
                          value={formImageUrl}
                          onChange={(e) => setFormImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>

                      {/* Availability toggle */}
                      <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">Disponible à la commande</span>
                          <span className="text-[9px] text-zinc-500">Désactiver en cas de rupture de stock.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormIsAvailable(prev => !prev)}
                          className="p-1 cursor-pointer"
                        >
                          {formIsAvailable ? (
                            <ToggleRight size={24} className="text-[#FF5C00]" />
                          ) : (
                            <ToggleLeft size={24} className="text-zinc-600" />
                          )}
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2.5 pt-2">
                        <button
                          type="submit"
                          className="flex-1 bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-black uppercase tracking-wider text-[11px] py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer text-center"
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          onClick={resetForm}
                          className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-black uppercase tracking-wider text-[11px] py-3 rounded-xl transition-all cursor-pointer text-center"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="bg-zinc-950 border border-zinc-900/60 rounded-3xl p-6 space-y-4 text-center text-zinc-500 py-10 sticky top-6">
                    <div className="w-10 h-10 bg-[#FF5C00]/10 border border-[#FF5C00]/20 rounded-full flex items-center justify-center mx-auto text-[#FF5C00]">
                      <Utensils size={18} />
                    </div>
                    <div>
                      <h4 className="text-white text-xs font-black uppercase tracking-wider mb-1 font-sans">Panneau d'actions</h4>
                      <p className="text-[10px] leading-relaxed max-w-[200px] mx-auto font-sans">
                        Sélectionnez un plat ou cliquez sur "Nouveau plat" pour ouvrir l'éditeur de carte.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Real-time Order Management Tab View */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            
            {/* Stats row for orders */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-950 border border-zinc-900/60 p-4 rounded-xl">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Reçues</span>
                <span className="text-lg font-black text-yellow-500 font-mono">
                  {orders.filter(o => o.status === 'received').length}
                </span>
              </div>
              <div className="bg-zinc-950 border border-zinc-900/60 p-4 rounded-xl">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">En cuisine</span>
                <span className="text-lg font-black text-orange-400 font-mono">
                  {orders.filter(o => o.status === 'preparing').length}
                </span>
              </div>
              <div className="bg-zinc-950 border border-zinc-900/60 p-4 rounded-xl">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Prêtes</span>
                <span className="text-lg font-black text-green-400 font-mono">
                  {orders.filter(o => o.status === 'ready').length}
                </span>
              </div>
              <div className="bg-zinc-950 border border-zinc-900/60 p-4 rounded-xl">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Total Clôturées</span>
                <span className="text-lg font-black text-zinc-400 font-mono">
                  {orders.filter(o => o.status === 'delivered' || o.status === 'cancelled').length}
                </span>
              </div>
            </div>

            {/* Orders Feed View */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-sans">
                  <span>Fil des commandes en direct</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00] animate-ping" />
                </h2>
                
                <span className="text-[10px] text-zinc-500 uppercase font-bold bg-zinc-950 border border-zinc-900 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  <Clock size={11} />
                  <span>Actualisation auto : active</span>
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-900 p-12 text-center rounded-3xl space-y-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 mx-auto">
                    <ClipboardList size={16} />
                  </div>
                  <p className="text-zinc-500 text-xs">Aucune commande enregistrée pour le moment.</p>
                  <button
                    onClick={simulateNewOrder}
                    className="bg-zinc-900 border border-zinc-800 text-white font-bold text-[10px] uppercase tracking-wider py-2 px-4 rounded-lg hover:bg-zinc-850 transition-all"
                  >
                    Simuler un flux de commande
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {orders.map(order => (
                    <div 
                      key={order.id}
                      className={`bg-zinc-950 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all ${
                        order.status === 'received' 
                          ? 'border-yellow-500/30 bg-yellow-500/[0.01]' 
                          : order.status === 'preparing'
                          ? 'border-orange-500/20'
                          : order.status === 'ready'
                          ? 'border-green-500/30 bg-green-500/[0.01]'
                          : 'border-zinc-900 text-zinc-400'
                      }`}
                    >
                      {/* Order Header Info */}
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-xs font-black text-white">{order.id}</span>
                            <span className="text-[10px] text-zinc-500 block font-mono">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <span className={`text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${
                            order.status === 'received'
                              ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                              : order.status === 'preparing'
                              ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                              : order.status === 'ready'
                              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                              : order.status === 'delivered'
                              ? 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {order.status === 'received' && 'reçue'}
                            {order.status === 'preparing' && 'cuisine'}
                            {order.status === 'ready' && 'prête'}
                            {order.status === 'delivered' && 'livrée'}
                            {order.status === 'cancelled' && 'annulée'}
                          </span>
                        </div>

                        {/* Customer Row */}
                        <div className="mt-3.5 border-t border-b border-zinc-900 py-2">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Gourmet</span>
                          <span className="text-xs font-black text-zinc-300">{order.customerName}</span>
                          {order.customerPhone && (
                            <span className="text-[10px] text-zinc-500 block font-mono">{order.customerPhone}</span>
                          )}
                        </div>

                        {/* Order Items list */}
                        <div className="mt-3 space-y-1.5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="text-zinc-400 font-sans">
                                <span className="font-mono font-black text-[#FF5C00]">{item.quantity}x</span> {item.dishName}
                              </span>
                              <span className="font-mono text-zinc-500 text-[11px]">
                                {(item.price * item.quantity).toFixed(2)} €
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total and Actions Row */}
                      <div className="pt-3 border-t border-zinc-900 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Total Commande</span>
                          <span className="text-sm font-black text-white font-mono">{order.totalAmount.toFixed(2)} €</span>
                        </div>

                        {/* Action controllers for status transitions */}
                        <div className="flex gap-2">
                          {order.status === 'received' && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase text-[9px] tracking-wider py-2.5 rounded-xl transition-all cursor-pointer text-center"
                              >
                                Lancer Cuisine
                              </button>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                                className="px-3 bg-zinc-900 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 border border-zinc-800 rounded-xl transition-all cursor-pointer"
                                title="Annuler"
                              >
                                <X size={12} />
                              </button>
                            </>
                          )}
                          
                          {order.status === 'preparing' && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[9px] tracking-wider py-2.5 rounded-xl transition-all cursor-pointer text-center"
                              >
                                Marquer Prêt
                              </button>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                                className="px-3 bg-zinc-900 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 border border-zinc-800 rounded-xl transition-all cursor-pointer"
                                title="Annuler"
                              >
                                <X size={12} />
                              </button>
                            </>
                          )}

                          {order.status === 'ready' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                              className="w-full bg-green-500 hover:bg-green-600 text-white font-black uppercase text-[9px] tracking-wider py-2.5 rounded-xl transition-all cursor-pointer text-center"
                            >
                              Confirmer Retrait
                            </button>
                          )}

                          {(order.status === 'delivered' || order.status === 'cancelled') && (
                            <div className="text-center w-full text-[9px] text-zinc-600 uppercase font-bold py-1 bg-zinc-950 rounded border border-zinc-900">
                              {order.status === 'delivered' ? 'Clôturée avec succès' : 'Annulée'}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
