import React, { useState } from 'react';
import { X, CreditCard, ShoppingBag, Truck, MapPin, CheckCircle2, DollarSign, ExternalLink, ShieldCheck, Award, Sparkles, Gift } from 'lucide-react';
import { CartItem, DeliveryType, Order, StripeSplitResult } from '../types';
import { notify } from '../utils/notify';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onOrderCompleted: (order: Order) => void;
  onClearCart: () => void;
  user: { id: string; email: string; role: 'client' | 'restaurant' | 'admin' | 'courier' } | null;
  onOpenProfile?: () => void;
  onOpenOrdersHistory?: () => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  onOrderCompleted,
  onClearCart,
  user,
  onOpenProfile,
  onOpenOrdersHistory
}: CheckoutModalProps) {
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('click_and_collect');
  const [cardNumber, setCardNumber] = useState<string>('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState<string>('12/28');
  const [cvc, setCvc] = useState<string>('123');
  const [clientEmail, setClientEmail] = useState<string>(user?.email || 'foodie@fidfud.app');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('12 Rue de la Roquette, 75011 Paris');
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{
    order: Order;
    payoutBreakdown: StripeSplitResult;
    pointsEarned?: number;
    newPointsBalance?: number;
  } | null>(null);

  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<string>('');
  const [promoError, setPromoError] = useState<string>('');
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string>('');
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [isFreeDelivery, setIsFreeDelivery] = useState<boolean>(false);

  // Keep clientEmail synced if user logins/registers while checkout modal is loaded
  React.useEffect(() => {
    if (user?.email) {
      setClientEmail(user.email);
    }
  }, [user]);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + item.dish.price * item.quantity, 0);
  const serviceFee = isFreeDelivery ? 0.00 : 0.99;
  const discountVal = isFreeDelivery ? 0.00 : promoDiscount;
  const totalAmount = Math.max(0, subtotal + serviceFee - discountVal);
  const restaurantId = cartItems.length > 0 ? cartItems[0].restaurantId : '';
  const restaurantName = cartItems.length > 0 ? cartItems[0].restaurantName : '';

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError('');
    setPromoSuccessMsg('');
    try {
      const uId = user?.id || 'usr-client-1';
      const response = await fetch(`/api/users/${uId}/rewards`);
      if (response.ok) {
        const rewards = await response.json();
        const found = rewards.find(
          (r: any) => r.code.toLowerCase().trim() === promoCode.toLowerCase().trim() && !r.isUsed
        );
        if (found) {
          setAppliedPromo(found.code);
          let msg = 'Code promo appliqué avec succès !';
          if (found.rewardId.includes('10-percent')) {
            const disc = Number((subtotal * 0.1).toFixed(2));
            setPromoDiscount(disc);
            setIsFreeDelivery(false);
            msg = `Fidélité -10% appliquée (-${disc.toFixed(2)} €) !`;
          } else if (found.rewardId.includes('free-delivery')) {
            setPromoDiscount(0.99);
            setIsFreeDelivery(true);
            msg = 'Livraison / Frais de service Fidfud offerts (Économie de 0.99 €) !';
          } else if (found.rewardId.includes('free-dessert')) {
            setPromoDiscount(0);
            setIsFreeDelivery(false);
            msg = 'Cadeau Fidélité : Dessert offert validé ! 🍰';
          } else if (found.rewardId.includes('free-drink')) {
            setPromoDiscount(0);
            setIsFreeDelivery(false);
            msg = 'Cadeau Fidélité : Boisson offerte validée ! 🥤';
          }
          setPromoSuccessMsg(msg);
          notify("🎟️ CODE PROMO APPLIQUÉ", msg, "success");
        } else {
          setPromoError('Code promo invalide, expiré ou déjà utilisé.');
          notify("⚠️ CODE INVALID", 'Code promo invalide, expiré ou déjà utilisé.', "warn");
        }
      } else {
        setPromoError('Impossible de vérifier le code promo.');
      }
    } catch (err) {
      setPromoError('Erreur de communication avec le serveur.');
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    setIsSubmitting(true);

    try {
      // Map cartItems to the server payload format
      const formattedItems = cartItems.map(item => ({
        dishId: item.dish.id,
        quantity: item.quantity
      }));

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'usr-client-1', // Uses real logged-in account ID
          restaurantId,
          deliveryType,
          items: formattedItems,
          promoCode: appliedPromo
        })
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la validation de la commande");
      }

      const result = await response.json();
      setSuccessData(result);
      onOrderCompleted(result.order);
      onClearCart();
      const shortId = result.order.id ? result.order.id.substring(result.order.id.length - 4).toUpperCase() : '001';
      notify("🚀 COMMANDE CONFIRMÉE !", `Commande #${shortId} envoyée en cuisine chez ${restaurantName} !`, "success");
    } catch (err) {
      console.error(err);
      alert("Erreur de paiement : Impossible de joindre le serveur de paye Fidfud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      {/* Container Card */}
      <div className="relative w-full max-w-lg bg-[#0D0D0E]/95 backdrop-blur-md border border-white/5 rounded-[32px] overflow-hidden shadow-2xl my-8">
        
        {/* Header (Hidden on success screen) */}
        {!successData && (
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-[#050505]">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Finaliser ma commande</h3>
              <p className="text-xs text-zinc-500 font-sans mt-0.5">Paiement sécurisé via Stripe Connect</p>
            </div>
            <button 
              id="btn-close-checkout"
              onClick={onClose}
              className="p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Success View Screen */}
        {successData ? (
          <div className="p-6 text-center space-y-6">
            <div className="mx-auto w-14 h-14 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center border border-green-500/20">
              <CheckCircle2 size={32} className="stroke-[2]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white tracking-tight uppercase italic">Commande Validée !</h3>
              <p className="text-sm text-green-500 font-semibold font-mono">Paiement Stripe Connect traité avec succès.</p>
              <p className="text-xs text-zinc-400 font-sans">
                Votre commande a été envoyée en temps réel au restaurant <span className="text-[#FF5C00] font-black">{restaurantName}</span>.
              </p>
            </div>

            {/* Simulated Live Order Status */}
            <div className="p-4 rounded-2xl bg-[#121214] border border-[#1F1F23] text-left space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-xs text-zinc-500">ID COMMANDE</span>
                <span className="text-xs font-mono text-[#FF5E1A] font-bold">{successData.order.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">TYPE DE RETRAIT</span>
                <span className="text-xs font-semibold text-zinc-300">
                  {successData.order.deliveryType === 'click_and_collect' ? 'Click & Collect (Sur place)' : 'Livraison Maison (Restaurant)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">STATUT ACTUEL</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 animate-pulse">
                  En Attente du Restaurateur
                </span>
              </div>
            </div>

            {/* Earned Points Summary Card */}
            {(() => {
              const pointsEarned = successData.pointsEarned ?? successData.order.pointsEarned ?? Math.round(successData.order.totalAmount * 10);
              return (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-[#FF5C00]/10 to-orange-500/5 border border-amber-500/30 text-left space-y-3 relative overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-[#FF5C00] flex items-center justify-center text-white shadow-md">
                        <Award size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 font-mono flex items-center gap-1.5">
                          <span>Points Fidélité Gagnés</span>
                          <Sparkles size={13} className="text-amber-400" />
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-sans">Programme Récompenses & Fidélité FIDFUD</p>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-sm font-mono tracking-wider animate-pulse flex items-center gap-1 shadow-sm">
                      <span>+{pointsEarned} PTS</span>
                    </div>
                  </div>

                  <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Total de votre commande :</span>
                      <span className="text-white font-bold font-mono">{successData.order.totalAmount.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Règle de conversion :</span>
                      <span className="text-amber-400 font-mono font-semibold">1 € dépensé = 10 points fidélité</span>
                    </div>
                    {successData.newPointsBalance !== undefined && (
                      <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <span className="text-zinc-300 font-semibold">Nouveau solde fidélité :</span>
                        <span className="text-[#FF5C00] font-black font-mono text-sm">{successData.newPointsBalance} PTS</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-sans pt-0.5">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Gift size={13} className="text-amber-400 shrink-0" />
                      <span>Convertibles en réductions -10% et desserts offerts</span>
                    </span>
                    {onOpenProfile && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenProfile();
                        }}
                        className="text-[11px] font-bold text-[#FF5C00] hover:text-amber-400 underline underline-offset-2 transition-colors cursor-pointer shrink-0 ml-2"
                      >
                        Voir mon solde →
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Technical Detail: Stripe Split Payout breakdown */}
            <div className="p-5 rounded-2xl bg-[#09090A] border border-zinc-900 text-left space-y-4">
              <div className="flex items-center space-x-2 border-b border-zinc-900 pb-2.5">
                <DollarSign size={16} className="text-[#FF5E1A]" />
                <span className="text-xs font-black text-white tracking-wider uppercase">Fiche Technique Stripe Connect Split</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-zinc-500">Compte Connect Destinataire</p>
                  <p className="font-mono text-zinc-300 font-bold mt-1 text-[11px] truncate">
                    {successData.payoutBreakdown.stripeAccountId}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">Taux de Commission Retenu</p>
                  <p className="text-[#FF5E1A] font-bold mt-1 text-sm">
                    {successData.payoutBreakdown.commissionRateUsed}%
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-900/60 pt-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Commission Fidfud ({successData.payoutBreakdown.commissionRateUsed}%)</span>
                  <span className="text-zinc-300 font-bold">{successData.payoutBreakdown.fidfudCommissionAmount.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Frais de service (Fidfud)</span>
                  <span className="text-zinc-300 font-bold">{successData.payoutBreakdown.serviceFee.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-zinc-900/40">
                  <span className="text-zinc-400 font-semibold">Total Conservé par Fidfud (Marge)</span>
                  <span className="text-[#FF5E1A] font-bold">{successData.payoutBreakdown.fidfudTotalTake.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-zinc-900">
                  <span className="text-white font-bold">Transféré au Restaurateur (Payout)</span>
                  <span className="text-green-500 font-extrabold text-sm">{successData.payoutBreakdown.restaurantPayoutAmount.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProfile();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Award size={15} />
                  <span>Mon Espace Fidélité</span>
                </button>
              )}
              <button
                id="btn-success-close"
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenOrdersHistory) {
                    onOpenOrdersHistory();
                  }
                }}
                className={`w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-4 rounded-xl transition-all border border-zinc-800 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer ${!onOpenProfile ? 'sm:col-span-2' : ''}`}
              >
                <span>Suivre ma commande</span>
              </button>
            </div>
          </div>
        ) : (
          /* Checkout Payment Form */
          <form onSubmit={handleSubmitOrder} className="p-6 space-y-5">
            
            {/* Delivery type selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Mode de Retrait</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Click & Collect (5% Commission) */}
                <div 
                  onClick={() => setDeliveryType('click_and_collect')}
                  className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all duration-300 ${
                    deliveryType === 'click_and_collect' 
                      ? 'border-[#FF5E1A] bg-[#FF5E1A]/5 text-white' 
                      : 'border-zinc-800 bg-[#121214] text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <ShoppingBag size={18} className={deliveryType === 'click_and_collect' ? 'text-[#FF5E1A]' : 'text-zinc-500'} />
                    <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">
                      -5% com
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-bold">Click & Collect</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Retrait express sur place</p>
                  </div>
                </div>

                {/* Restaurant Delivery (15% Commission) */}
                <div 
                  onClick={() => setDeliveryType('restaurant_delivery')}
                  className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all duration-300 ${
                    deliveryType === 'restaurant_delivery' 
                      ? 'border-[#FF5E1A] bg-[#FF5E1A]/5 text-white' 
                      : 'border-zinc-800 bg-[#121214] text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Truck size={18} className={deliveryType === 'restaurant_delivery' ? 'text-[#FF5E1A]' : 'text-zinc-500'} />
                    <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">
                      -15% com
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-bold">Livraison Maison</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Gérée par le resto</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Details info */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Adresse e-mail client</label>
                <input 
                  type="email" 
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#121214] border border-[#1F1F23] rounded-xl text-sm text-white focus:outline-none focus:border-[#FF5E1A]"
                />
              </div>

              {/* Delivery Address input for Livraison Maison */}
              {deliveryType === 'restaurant_delivery' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={14} className="text-[#FF5E1A]" />
                      <span>Adresse de Livraison Maison</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((pos) => {
                            setDeliveryAddress(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (Paris 11e Voltaire)`);
                          }, () => {
                            setDeliveryAddress('12 Rue de la Roquette, 75011 Paris');
                          });
                        } else {
                          setDeliveryAddress('12 Rue de la Roquette, 75011 Paris');
                        }
                      }}
                      className="text-[10px] text-[#FF5E1A] hover:underline font-bold font-mono"
                    >
                      📍 Position GPS
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="12 Rue de la Roquette, 75011 Paris"
                    required={deliveryType === 'restaurant_delivery'}
                    className="w-full px-4 py-3 bg-[#121214] border border-[#1F1F23] rounded-xl text-sm text-white focus:outline-none focus:border-[#FF5E1A]"
                  />
                </div>
              )}
            </div>

            {/* Payment Details Stripe Card Form */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Détails de carte bancaire</label>
                <span className="flex items-center space-x-1 text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                  <ExternalLink size={10} />
                  <span>Stripe Secure</span>
                </span>
              </div>

              {/* Simulated Card input container */}
              <div className="bg-[#121214] border border-[#1F1F23] rounded-xl p-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <CreditCard className="text-zinc-500" size={18} />
                  <input 
                    type="text" 
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    required
                    className="bg-transparent text-sm text-white focus:outline-none w-full tracking-wider"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-900">
                  <div className="flex flex-col space-y-1">
                    <span className="text-[9px] text-zinc-500 font-extrabold uppercase">Date d'exp.</span>
                    <input 
                      type="text" 
                      value={expiry} 
                      onChange={e => setExpiry(e.target.value)}
                      placeholder="MM/AA" 
                      required
                      className="bg-transparent text-sm text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-[9px] text-zinc-500 font-extrabold uppercase">CVC</span>
                    <input 
                      type="password" 
                      value={cvc} 
                      onChange={e => setCvc(e.target.value)}
                      placeholder="•••" 
                      maxLength={3}
                      required
                      className="bg-transparent text-sm text-zinc-200 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Promo / Discount Code Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Code Avantage Fidélité</label>
                <span className="text-[10px] text-[#FF5C00] font-bold font-mono">Convertible depuis votre Profil</span>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value)}
                  placeholder="EX: FID10-XXXX"
                  className="flex-1 px-4 py-2.5 bg-[#121214] border border-[#1F1F23] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF5C00] uppercase font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Valider
                </button>
              </div>
              {promoError && (
                <p className="text-[11px] text-red-500 font-medium font-sans">{promoError}</p>
              )}
              {promoSuccessMsg && (
                <p className="text-[11px] text-green-500 font-medium font-sans">{promoSuccessMsg}</p>
              )}
            </div>

            {/* Bill Summary */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-900 text-xs space-y-2 font-sans">
              <div className="flex justify-between text-zinc-500">
                <span>Plats ({cartItems.length} articles)</span>
                <span>{subtotal.toFixed(2)} €</span>
              </div>

              {appliedPromo && (
                <div className="flex justify-between text-green-500 font-semibold text-[11px]">
                  <span>Avantage Fidélité ({appliedPromo.toUpperCase()})</span>
                  <span>{discountVal > 0 ? `-${discountVal.toFixed(2)} €` : 'Validé ✔'}</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-500">
                <span>Frais de service Fidfud (Fixe)</span>
                <span className={isFreeDelivery ? "text-green-500 font-bold" : ""}>
                  {isFreeDelivery ? 'OFFERTS' : '0.99 €'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400 font-bold pt-2 border-t border-zinc-900">
                <span>Montant Total</span>
                <span className="text-[#FF5C00] font-black text-base">{totalAmount.toFixed(2)} €</span>
              </div>
            </div>

            {/* Submit checkout payment button */}
            <button
              id="btn-stripe-pay-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 bg-[#FF5C00] hover:bg-[#FF7A00] disabled:bg-[#FF5C00]/50 text-white font-black uppercase text-sm py-4 rounded-xl transition-all duration-300 shadow-[0_20px_40px_rgba(255,92,0,0.25)] active:scale-[0.98] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Simulation Paiement Stripe...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Payer {totalAmount.toFixed(2)} €</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
