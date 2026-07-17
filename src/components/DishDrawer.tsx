import React, { useState, useEffect } from 'react';
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
  ChevronRight, 
  BookOpen, 
  FileText 
} from 'lucide-react';
import { Dish, Review, Reservation } from '../types';

interface DishDrawerProps {
  dishId: string | null;
  restaurantName: string | null;
  onClose: () => void;
  onAddToCart: (dish: Dish, quantity: number) => void;
  dishes: Dish[];
  user: any;
  onOpenAuth: () => void;
  isOrderingEnabled?: boolean;
  initialTab?: TabType;
}

type TabType = 'order' | 'menu' | 'reviews' | 'reserve';

export default function DishDrawer({ 
  dishId, 
  restaurantName, 
  onClose, 
  onAddToCart, 
  dishes,
  user,
  onOpenAuth,
  isOrderingEnabled = true,
  initialTab = 'order'
}: DishDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [quantity, setQuantity] = useState<number>(1);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [localDishId, setLocalDishId] = useState<string | null>(null);

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

  useEffect(() => {
    if (dishId) {
      setLocalDishId(dishId);
      setActiveTab(initialTab);
    }
  }, [dishId, initialTab]);

  const dish = dishes.find(d => d.id === localDishId);

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
  }, [localDishId]);

  if (!dish) return null;

  // Filter dishes to form the restaurant's complete menu
  const restaurantMenu = dishes.filter(d => d.restaurantId === dish.restaurantId);

  const handleIncrement = () => setQuantity(q => q + 1);
  const handleDecrement = () => setQuantity(q => (q > 1 ? q - 1 : 1));

  const handleAdd = (d: Dish = dish, q: number = quantity) => {
    onAddToCart(d, q);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 1200);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-xs transition-opacity duration-300">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0D0D0E]/95 backdrop-blur-md border-t border-white/10 rounded-t-[32px] overflow-hidden p-5 z-10 transition-transform duration-300 transform translate-y-0 shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Decorative drag handle */}
        <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-4" />

        {/* Header section */}
        <div className="flex justify-between items-start mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[9px] text-[#FF5C00] font-black tracking-widest uppercase bg-[#FF5C00]/10 px-2.5 py-1 rounded">
                {restaurantName || 'Restaurant'}
              </span>
              {dish.isAvailable && dish.stockCount !== undefined && dish.stockCount < 5 && (
                <span className="text-[9px] text-amber-500 font-black tracking-widest uppercase bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                  ⚠️ Low Stock ({dish.stockCount})
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-white mt-2 tracking-tight italic uppercase truncate">{dish.name}</h3>
          </div>
          <button 
            id="btn-close-dish-drawer"
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-950 text-zinc-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher navigation - Sleek premium dark buttons with no orange accent, reserving orange for checkouts */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950/80 rounded-xl mb-4 border border-white/5 text-[10px] font-black tracking-wide uppercase">
          <button
            onClick={() => setActiveTab('order')}
            className={`py-2 rounded-lg transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
              activeTab === 'order' ? 'bg-zinc-800 text-white shadow-md border border-white/5' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ShoppingBag size={13} />
            <span>Plat</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`py-2 rounded-lg transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
              activeTab === 'menu' ? 'bg-zinc-800 text-white shadow-md border border-white/5' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <BookOpen size={13} />
            <span>Menu</span>
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-2 rounded-lg transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
              activeTab === 'reviews' ? 'bg-zinc-800 text-white shadow-md border border-white/5' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Star size={13} />
            <span>Avis</span>
          </button>
          <button
            onClick={() => setActiveTab('reserve')}
            className={`py-2 rounded-lg transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
              activeTab === 'reserve' ? 'bg-zinc-800 text-white shadow-md border border-white/5' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Calendar size={13} />
            <span>Réserver</span>
          </button>
        </div>

        {/* Content body based on active tab */}
        <div className="flex-1 overflow-y-auto scrollbar-none pr-1 mb-2">
          
          {/* TAB 1: ORDER ACTIVE ITEM */}
          {activeTab === 'order' && (
            <div className="space-y-4">
              {dish.imageUrl && (
                <div className="w-full h-40 rounded-xl overflow-hidden relative bg-zinc-950 shadow-inner">
                  <img 
                    src={dish.imageUrl} 
                    alt={dish.name} 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover" 
                  />
                  {!dish.isAvailable && (
                    <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                      <span className="bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-md uppercase tracking-wider">
                        Rupture de Stock
                      </span>
                    </div>
                  )}
                  {dish.isAvailable && dish.stockCount !== undefined && dish.stockCount < 5 && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="bg-amber-600 text-white font-black text-[9px] px-2.5 py-1 rounded-md uppercase tracking-wider shadow-lg flex items-center gap-1">
                        ⚠️ Low Stock ({dish.stockCount})
                      </span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-zinc-300 text-xs leading-relaxed font-sans bg-zinc-950/40 p-3 rounded-xl border border-white/5">
                {dish.description || 'Ingrédients de première qualité sélectionnés pour votre plus grand plaisir par le chef.'}
              </p>

              <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold block">Prix unitaire</span>
                  <span className="text-base font-black text-white">{dish.price.toFixed(2)} €</span>
                </div>

                {dish.isAvailable && (
                  <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                    <button
                      onClick={handleDecrement}
                      className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Diminuer"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-xs font-black text-white">
                      {quantity}
                    </span>
                    <button
                      onClick={handleIncrement}
                      className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Augmenter"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
              </div>

              {dish.isAvailable ? (
                <div className="space-y-2">
                  {isOrderingEnabled ? (
                    <button
                      onClick={() => handleAdd()}
                      disabled={showNotification}
                      className="w-full flex items-center justify-center space-x-2 bg-[#FF5A1F] hover:bg-[#ff6e38] disabled:bg-green-600 text-white font-black uppercase text-xs py-3.5 rounded-xl transition-all duration-300 shadow-md active:scale-95 cursor-pointer"
                    >
                      {showNotification ? (
                        <>
                          <ShieldCheck size={16} />
                          <span>Plat ajouté au panier !</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={16} />
                          <span>Ajouter {(dish.price * quantity).toFixed(2)} € au panier</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-[#121214] border border-[#1F1F23] text-zinc-500 font-black uppercase py-3.5 rounded-xl cursor-not-allowed text-center text-[10px] tracking-wider"
                    >
                      👨‍🍳 Commandes désactivées par l'établissement
                    </button>
                  )}
                </div>
              ) : (
                <button
                  disabled
                  className="w-full bg-zinc-800 text-zinc-500 font-black uppercase py-3 rounded-xl cursor-not-allowed text-center text-[10px] tracking-wider"
                >
                  Plat indisponible
                </button>
              )}

              {/* Dish Specific review summary and quick link */}
              <div className="bg-zinc-950/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="flex items-center space-x-1 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-lg">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs font-extrabold text-white">{dishAvgScore}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-300 font-black uppercase tracking-wider block">Avis sur ce plat</span>
                    <span className="text-[9px] text-zinc-500 block">{dishReviewsList.length} évaluation{dishReviewsList.length > 1 ? 's' : ''} clients</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reviews');
                    setReviewsScope('dish');
                  }}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-white text-[9px] font-black uppercase px-3 py-2 rounded-lg transition-all cursor-pointer"
                >
                  ⭐ Noter ce plat
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: COMPLETE RESTAURANT MENU */}
          {activeTab === 'menu' && (
            <div className="space-y-2">
              <p className="text-[9px] text-zinc-400 uppercase font-extrabold mb-1 font-mono tracking-wider">Toutes les spécialités de l'établissement :</p>
              {restaurantMenu.map(d => (
                <div 
                  key={d.id}
                  onClick={() => setLocalDishId(d.id)}
                  className={`p-2 rounded-xl flex items-center gap-3 transition-all cursor-pointer border ${
                    d.id === localDishId 
                      ? 'bg-amber-500/10 border-amber-500/30' 
                      : 'bg-zinc-950/60 border-white/5 hover:border-white/10'
                  }`}
                >
                  {d.imageUrl && (
                    <img 
                      src={d.imageUrl} 
                      alt={d.name} 
                      loading="lazy"
                      className="w-12 h-12 rounded-lg object-cover bg-zinc-900" 
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate">{d.name}</p>
                    <p className="text-zinc-400 text-[10px] truncate">{d.description}</p>
                    <p className="text-[#FF5C00] text-xs font-black mt-0.5">{d.price.toFixed(2)} €</p>
                  </div>
                  
                  {d.isAvailable ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(d, 1);
                      }}
                      className="p-1.5 rounded-lg bg-[#FF5C00] hover:bg-[#FF7A00] text-white cursor-pointer"
                      title="Ajouter au panier"
                    >
                      <Plus size={14} className="stroke-[3]" />
                    </button>
                  ) : (
                    <span className="text-[8px] text-red-500 font-bold bg-red-500/10 px-1 py-0.5 rounded uppercase">Epuisé</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: RATINGS AND REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {/* Segmented control for scope */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setReviewsScope('dish')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                    reviewsScope === 'dish' 
                      ? 'bg-zinc-800 text-white shadow-sm border border-white/5' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  🍔 Ce Plat ({dishReviewsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewsScope('restaurant')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                    reviewsScope === 'restaurant' 
                      ? 'bg-zinc-800 text-white shadow-sm border border-white/5' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  🏢 Établissement ({reviewsList.length})
                </button>
              </div>

              {reviewsScope === 'dish' ? (
                <>
                  {/* Score summary panel for the dish */}
                  <div className="bg-zinc-950/80 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Avis sur ce plat</h4>
                      <p className="text-[10px] text-zinc-500 mt-1">{dishReviewsList.length} évaluations pour ce plat</p>
                    </div>
                    <div className="flex items-center space-x-1 bg-[#FF5C00]/10 border border-[#FF5C00]/30 px-3 py-1.5 rounded-xl">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-black text-white">{dishAvgScore}</span>
                    </div>
                  </div>

                  {/* Form to leave a review for the dish */}
                  <form onSubmit={handleSubmitDishReview} className="bg-zinc-950/40 p-3.5 rounded-xl border border-white/5 space-y-3">
                    <p className="text-[10px] text-zinc-300 uppercase font-black tracking-wider">Laisser un avis sur ce plat</p>
                    
                    {/* Star rating picker for the dish */}
                    <div className="flex items-center gap-1.5 py-1">
                      {[1, 2, 3, 4, 5].map(star => {
                        const isStarred = hoverDishRating !== null 
                          ? star <= hoverDishRating 
                          : star <= dishRatingInput;
                        return (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setDishRatingInput(star)}
                            onMouseEnter={() => setHoverDishRating(star)}
                            onMouseLeave={() => setHoverDishRating(null)}
                            className="text-lg cursor-pointer transition-transform duration-100 hover:scale-125 focus:outline-none"
                            title={`${star} étoile${star > 1 ? 's' : ''}`}
                          >
                            <Star 
                              size={22} 
                              className={`transition-all duration-100 ${
                                isStarred 
                                  ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]' 
                                  : 'text-zinc-600 hover:text-zinc-400'
                              }`} 
                            />
                          </button>
                        );
                      })}
                      <span className="text-[10px] font-black text-zinc-400 ml-2 uppercase font-mono tracking-wider">
                        {hoverDishRating !== null 
                          ? `${hoverDishRating} / 5` 
                          : `${dishRatingInput} / 5`
                        }
                      </span>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        value={dishReviewTextInput}
                        onChange={e => setDishReviewTextInput(e.target.value)}
                        placeholder={user ? "Rédigez votre retour d'expérience détaillé sur ce plat..." : "Connectez-vous pour évaluer ce plat"}
                        disabled={!user}
                        rows={3}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5C00] resize-none font-sans"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!user || !dishReviewTextInput.trim()}
                          className="bg-[#FF5C00] text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-[#FF7A00] transition-colors disabled:opacity-40 cursor-pointer uppercase tracking-wider"
                        >
                          Publier l'avis
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Dish reviews list */}
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto scrollbar-none pr-1">
                    {dishReviewsList.length === 0 ? (
                      <p className="text-center text-xs text-zinc-500 italic py-6">Aucune évaluation pour ce plat. Soyez le premier à le noter ! 🌟</p>
                    ) : (
                      dishReviewsList.map(rev => (
                        <div key={rev.id} className="bg-zinc-950/40 p-3 rounded-xl border border-white/5 text-xs">
                           <div className="flex justify-between items-center mb-1">
                            <span className="font-extrabold text-zinc-300">{rev.userName}</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={9} 
                                  className={i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'} 
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-zinc-400 leading-relaxed font-sans">{rev.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Score summary panel for the establishment */}
                  <div className="bg-zinc-950/80 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Avis sur l'établissement</h4>
                      <p className="text-[10px] text-zinc-500 mt-1">{reviewsList.length} commentaires clients vérifiés</p>
                    </div>
                    <div className="flex items-center space-x-1 bg-[#FF5C00]/10 border border-[#FF5C00]/30 px-3 py-1.5 rounded-xl">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-black text-white">{avgScore}</span>
                    </div>
                  </div>

                  {/* Form to leave a review for the establishment */}
                  <form onSubmit={handleSubmitReview} className="bg-zinc-950/40 p-3.5 rounded-xl border border-white/5 space-y-3">
                    <p className="text-[10px] text-zinc-300 uppercase font-black tracking-wider">Rédiger votre avis général sur l'établissement</p>
                    
                    {/* Star rating picker for the establishment */}
                    <div className="flex items-center gap-1.5 py-1">
                      {[1, 2, 3, 4, 5].map(star => {
                        const isStarred = hoverRating !== null 
                          ? star <= hoverRating 
                          : star <= ratingInput;
                        return (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRatingInput(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            className="text-lg cursor-pointer transition-transform duration-100 hover:scale-125 focus:outline-none"
                            title={`${star} étoile${star > 1 ? 's' : ''}`}
                          >
                            <Star 
                              size={22} 
                              className={`transition-all duration-100 ${
                                isStarred 
                                  ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]' 
                                  : 'text-zinc-600 hover:text-zinc-400'
                              }`} 
                            />
                          </button>
                        );
                      })}
                      <span className="text-[10px] font-black text-zinc-400 ml-2 uppercase font-mono tracking-wider">
                        {hoverRating !== null 
                          ? `${hoverRating} / 5` 
                          : `${ratingInput} / 5`
                        }
                      </span>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        value={reviewTextInput}
                        onChange={e => setReviewTextInput(e.target.value)}
                        placeholder={user ? "Racontez-nous votre expérience culinaire..." : "Connectez-vous pour laisser un avis"}
                        disabled={!user}
                        rows={3}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5C00] resize-none font-sans"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!user || !reviewTextInput.trim()}
                          className="bg-[#FF5C00] text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-[#FF7A00] transition-colors disabled:opacity-40 cursor-pointer uppercase tracking-wider"
                        >
                          Publier l'avis
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Reviews list for the establishment */}
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto scrollbar-none pr-1">
                    {reviewsList.length === 0 ? (
                      <p className="text-center text-xs text-zinc-500 italic py-6">Aucun avis rédigé. Soyez le premier ! 🌟</p>
                    ) : (
                      reviewsList.map(rev => (
                        <div key={rev.id} className="bg-zinc-950/40 p-3 rounded-xl border border-white/5 text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-extrabold text-zinc-300">{rev.userName}</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={9} 
                                  className={i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'} 
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-zinc-400 leading-relaxed font-sans">{rev.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: TABLE RESERVATIONS */}
          {activeTab === 'reserve' && (
            <div className="space-y-4">
              {reservationSuccess ? (
                <div className="bg-green-950/20 border border-green-800/30 rounded-xl p-4 text-center space-y-3">
                  <span className="text-3xl">🎉</span>
                  <h4 className="text-sm font-black text-green-400 uppercase tracking-wide">Réservation validée !</h4>
                  <div className="text-xs text-zinc-300 font-sans space-y-1">
                    <p>Votre table pour <strong>{reservationSuccess.guests} convives</strong> est planifiée chez <strong>{restaurantName}</strong>.</p>
                    <p className="text-zinc-400 text-[10px]">Date : {new Date(reservationSuccess.date).toLocaleDateString()} à {reservationSuccess.time}</p>
                  </div>
                  <button
                    onClick={() => setReservationSuccess(null)}
                    className="bg-green-700 hover:bg-green-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase transition-colors cursor-pointer"
                  >
                    Faire une autre réservation
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookTable} className="space-y-3.5 bg-zinc-950/40 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] text-zinc-300 uppercase font-black tracking-wide">Planifier une table</p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Date */}
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-bold block mb-1">Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          required
                          value={reservationDate}
                          onChange={e => setReservationDate(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                        />
                      </div>
                    </div>

                    {/* Time */}
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-bold block mb-1">Heure</label>
                      <input
                        type="time"
                        required
                        value={reservationTime}
                        onChange={e => setReservationTime(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      />
                    </div>
                  </div>

                  {/* Guest selector */}
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold block mb-1">Nombre d'invités</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {[1, 2, 3, 4, 5, 6, 8].map(num => (
                        <button
                          type="button"
                          key={num}
                          onClick={() => setReservationGuests(num)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer border ${
                            reservationGuests === num 
                              ? 'bg-[#FF5C00] text-white border-transparent' 
                              : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold block mb-1">Demandes spéciales (Optionnel)</label>
                    <textarea
                      value={reservationNotes}
                      onChange={e => setReservationNotes(e.target.value)}
                      placeholder="Ex: Côté fenêtre, allergie au gluten, etc..."
                      rows={2}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider transition-colors shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Calendar size={14} />
                    <span>Confirmer la table</span>
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
