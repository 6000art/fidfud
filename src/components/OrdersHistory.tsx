import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  Clock, 
  Truck, 
  ShoppingBag, 
  ShieldCheck, 
  Copy, 
  Sparkles, 
  Coins, 
  Award, 
  Gift, 
  Check,
  RotateCcw,
  AlertTriangle,
  AlertOctagon,
  XCircle,
  Flame,
  ChefHat,
  Timer,
  Package
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Order, Restaurant, Dish } from '../types';

const API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (typeof process !== 'undefined' ? (process.env?.GOOGLE_MAPS_PLATFORM_KEY || '') : '') ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface OrdersHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  user?: any;
  restaurants: Restaurant[];
  userLocation?: { lat: number; lng: number } | null;
  dishes?: Dish[];
  onAddToCart?: (dish: Dish, quantity: number) => void;
  onOpenCart?: () => void;
  onOrderUpdated?: (updatedOrder: Order) => void;
}

const CANCEL_REASONS = [
  { id: 'too_long', label: "⏱️ Temps d'attente estimé trop long" },
  { id: 'wrong_items', label: "🛒 Erreur dans les plats commandés" },
  { id: 'wrong_address', label: "📍 Erreur d'adresse de livraison" },
  { id: 'schedule_change', label: "📅 Changement d'emploi du temps" },
  { id: 'other', label: "💬 Autre motif" }
];

interface CancelOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (orderId: string, reason: string) => Promise<void>;
}

const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onConfirmCancel
}) => {
  if (!isOpen || !order) return null;

  const [selectedReasonId, setSelectedReasonId] = useState<string>('too_long');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Calculate elapsed time in minutes
  const createdMs = new Date(order.createdAt).getTime();
  const minutesElapsed = Math.max(0, Math.floor((Date.now() - createdMs) / (1000 * 60)));

  const isPending = order.status === 'pending';
  const isPreparing = order.status === 'preparing';
  const isReadyOrEnRoute = order.status === 'ready' || order.status === 'delivered' || order.courierStatus === 'en_route';

  // Condition 1: pending OR <= 5 minutes ago => 100% full refund
  // Condition 2: preparing AND > 5 minutes ago => 50% partial refund
  // Condition 3: ready / en_route => Cannot cancel
  const isEligibleFullRefund = isPending || (isPreparing && minutesElapsed <= 5);
  const isEligiblePartialRefund = isPreparing && minutesElapsed > 5;
  const isBlocked = isReadyOrEnRoute;

  const refundPercentage = isEligibleFullRefund ? 100 : isEligiblePartialRefund ? 50 : 0;
  const refundAmount = (order.totalAmount * refundPercentage) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked || isSubmitting) return;

    setIsSubmitting(true);
    const preset = CANCEL_REASONS.find(r => r.id === selectedReasonId)?.label || 'Autre motif';
    const finalReason = customNotes.trim() ? `${preset} - ${customNotes.trim()}` : preset;

    await onConfirmCancel(order.id, finalReason);
    setIsSubmitting(false);
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#0D0D0E] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-left my-auto"
      >
        
        {/* Header */}
        <div className="flex justify-between items-start sticky top-0 bg-[#0D0D0E]/95 backdrop-blur-md pt-1 pb-3 z-10 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center font-black shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase italic tracking-wide">Annulation de Commande</h3>
              <p className="text-[10px] text-zinc-400 font-mono">ID: #{order.id.slice(-6).toUpperCase()} • {order.restaurantName}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-white/10 cursor-pointer transition-colors shrink-0"
            title="Fermer la fenêtre"
          >
            <X size={16} />
          </button>
        </div>

        {/* Condition Box */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-2.5 ${
          isEligibleFullRefund 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : isEligiblePartialRefund 
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1.5">
              <ShieldCheck size={14} />
              Condition d'Annulation
            </span>
            <span className="text-[9.5px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-black/50 border border-white/10 uppercase">
              {isEligibleFullRefund ? '🟢 Remboursement 100%' : isEligiblePartialRefund ? '🟠 Remboursement 50%' : '🔴 Non Annulable'}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed font-sans text-zinc-200">
            {isEligibleFullRefund && (
              <>
                <strong>Gratuit & Remboursement Intégral (100%) :</strong> Votre commande est récente ({minutesElapsed} min écoulée{minutesElapsed > 1 ? 's' : ''}). L'annulation est totalement gratuite et un remboursement de <strong>{refundAmount.toFixed(2)} €</strong> sera re-crédité sur votre moyen de paiement.
              </>
            )}
            {isEligiblePartialRefund && (
              <>
                <strong>Préparation en Cuisine Débutée (50%) :</strong> La commande a été passée il y a {minutesElapsed} minutes et les produits sont déjà en cours de préparation en cuisine. Un remboursement partiel de <strong>{refundAmount.toFixed(2)} € (50%)</strong> s'applique.
              </>
            )}
            {isBlocked && (
              <>
                <strong>L'annulation directe est bloquée :</strong> La commande est déjà prête ou en cours de livraison par le coursier. Merci de contacter directement l'établissement ou le livreur.
              </>
            )}
          </p>

          <div className="pt-2 flex items-center justify-between text-[10px] text-zinc-400 border-t border-white/10 font-mono flex-wrap gap-1">
            <span>Montant total: {order.totalAmount.toFixed(2)} €</span>
            <span className="font-bold text-white">Remboursement: {refundAmount.toFixed(2)} €</span>
          </div>
        </div>

        {/* Reason selector (if not blocked) */}
        {!isBlocked && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider font-mono block">
                Motif d'annulation <span className="text-red-500">*</span>
              </label>
              <div className="space-y-1.5">
                {CANCEL_REASONS.map(reason => (
                  <button
                    type="button"
                    key={reason.id}
                    onClick={() => setSelectedReasonId(reason.id)}
                    className={`w-full p-2.5 rounded-xl border text-xs text-left transition-all flex items-center justify-between cursor-pointer ${
                      selectedReasonId === reason.id
                        ? 'bg-[#FF5C00]/15 border-[#FF5C00] text-white font-bold'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-300 hover:bg-zinc-800/80'
                    }`}
                  >
                    <span className="truncate pr-2">{reason.label}</span>
                    {selectedReasonId === reason.id && <Check size={14} className="text-[#FF5C00] shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom details */}
            <div className="space-y-1">
              <label className="text-[9.5px] text-zinc-400 font-sans block">Commentaire ou précision (facultatif)</label>
              <textarea
                rows={2}
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="Ex : Je dois m'absenter en urgence..."
                className="w-full text-xs bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00] resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors border border-white/5"
              >
                Garder la commande
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider cursor-pointer transition-all shadow-lg shadow-red-600/20 active:scale-95 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Valider ({refundAmount.toFixed(2)} €)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {isBlocked && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors border border-white/10"
            >
              Fermer la fenêtre
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const REWARDS_CATALOG = [
  {
    id: 'free-delivery',
    title: 'Frais de Service Offerts',
    cost: 60,
    description: 'Supprime les 0,99 € de frais sur votre panier en cours.',
    icon: '🛵'
  },
  {
    id: 'free-drink',
    title: 'Une Boisson Offerte',
    cost: 80,
    description: 'Une boisson fraîche au choix offerte par le restaurant.',
    icon: '🥤'
  },
  {
    id: '10-percent',
    title: 'Remise Spéciale -10%',
    cost: 100,
    description: 'Bénéficiez de 10% de réduction sur tout votre panier.',
    icon: '⚡'
  },
  {
    id: 'free-dessert',
    title: 'Un Dessert Offert',
    cost: 150,
    description: 'Un délicieux dessert sucré de votre choix offert.',
    icon: '🍰'
  }
];

interface PreparingCountdownTimerProps {
  createdAt: string;
  estimatedPrepMinutes?: number;
  deliveryType?: string;
}

const PreparingCountdownTimer: React.FC<PreparingCountdownTimerProps> = ({
  createdAt,
  estimatedPrepMinutes = 15,
  deliveryType
}) => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const createdMs = new Date(createdAt).getTime();
  const totalPrepSeconds = Math.max(60, (estimatedPrepMinutes || 15) * 60);
  const elapsedSeconds = Math.max(0, Math.floor((now - createdMs) / 1000));
  const remainingSeconds = Math.max(0, totalPrepSeconds - elapsedSeconds);
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalPrepSeconds) * 100));

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Stage description
  let stageText = "Préparation des ingrédients & découpe";
  let stageIcon = "🔪";
  if (progressPercent >= 75) {
    stageText = "Dressage & emballage isotherme";
    stageIcon = "📦";
  } else if (progressPercent >= 35) {
    stageText = "Cuisson haute température par le chef";
    stageIcon = "🍳";
  }

  if (remainingSeconds === 0) {
    stageText = "Finition imminente ! Plat bientôt prêt !";
    stageIcon = "✨";
  }

  return (
    <div className="bg-gradient-to-br from-amber-950/40 via-zinc-950 to-orange-950/40 border border-[#FF5C00]/30 rounded-2xl p-3.5 space-y-3 relative overflow-hidden shadow-lg shadow-[#FF5C00]/10 animate-fadeIn">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-[#FF5C00]/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header with live status badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#FF5C00]/20 flex items-center justify-center border border-[#FF5C00]/40 text-[#FF5C00] shrink-0">
            <Flame size={15} className="animate-pulse text-[#FF5C00]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-[#FF5C00] uppercase tracking-wider font-mono block truncate">
              ⏱️ Temps de Préparation Estimé
            </span>
            <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
              <span>{stageIcon}</span>
              <span className="truncate">{stageText}</span>
            </span>
          </div>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 px-2 py-1 rounded-full shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#FF5C00] animate-ping shrink-0" />
          <span className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-widest">
            En direct
          </span>
        </div>
      </div>

      {/* Main Big Timer Display */}
      <div className="bg-zinc-950/80 border border-white/5 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider">
            Compte à Rebours Cuisine :
          </p>
          <div className="text-2xl font-black font-mono tracking-wider text-amber-400 drop-shadow-[0_0_12px_rgba(255,165,0,0.3)] flex items-baseline gap-1">
            <span>{formattedTime}</span>
            <span className="text-xs font-semibold text-zinc-500">min:sec</span>
          </div>
        </div>

        <div className="text-right font-mono text-[10px] text-zinc-400 space-y-0.5">
          <p>Estimé: <strong className="text-white">{estimatedPrepMinutes} min</strong></p>
          <p>Écoulé: <strong className="text-amber-400">{Math.floor(elapsedSeconds / 60)}m {String(elapsedSeconds % 60).padStart(2, '0')}s</strong></p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[9px] font-mono font-bold text-zinc-400">
          <span>Progression ({Math.round(progressPercent)}%)</span>
          <span>{remainingSeconds === 0 ? "Finition 🔥" : "Cuisine Active 🍳"}</span>
        </div>
        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 via-[#FF5C00] to-emerald-400 rounded-full transition-all duration-1000 ease-linear shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const OrderStepTracker = ({ status, courierStatus, deliveryType }: { status: string; courierStatus?: string; deliveryType?: string }) => {
  const isClickCollect = deliveryType === 'click_and_collect';

  const stepsList = [
    {
      id: 'placed',
      label: 'Placed',
      labelFr: 'Passée',
      desc: 'Commande enregistrée',
      icon: ShoppingBag
    },
    {
      id: 'preparing',
      label: 'Preparing',
      labelFr: 'En cuisine',
      desc: 'Préparation des plats',
      icon: ChefHat
    },
    {
      id: 'ready',
      label: 'Ready',
      labelFr: 'Prête',
      desc: isClickCollect ? 'Prêt pour retrait' : 'Prête au restaurant',
      icon: Package
    },
    {
      id: 'out_for_delivery',
      label: 'Out for Delivery',
      labelFr: isClickCollect ? 'En chemin' : 'En livraison',
      desc: isClickCollect ? 'En cours de déplacement' : 'Livreur en route',
      icon: isClickCollect ? Clock : Truck
    },
    {
      id: 'delivered',
      label: 'Delivered',
      labelFr: 'Livrée',
      desc: 'Remise effectuée',
      icon: CheckCircle
    }
  ];

  const getActiveStepIndex = () => {
    if (status === 'delivered' || courierStatus === 'delivered') return 4;
    if (courierStatus === 'en_route') return 3;
    if (status === 'ready') {
      if (courierStatus === 'en_route') return 3;
      return 2;
    }
    if (status === 'preparing') return 1;
    if (status === 'pending') return 0;
    return 0;
  };

  const activeIndex = getActiveStepIndex();
  const progressPercent = (activeIndex / 4) * 100;
  const activeStep = stepsList[activeIndex] || stepsList[0];

  return (
    <div className="py-3 px-3.5 bg-zinc-950/80 rounded-2xl border border-white/10 space-y-3.5 shadow-inner">
      {/* Top Header Row with status badge */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5C00] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5C00]"></span>
          </span>
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            Suivi Temps Réel
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-[#FF5C00] bg-[#FF5C00]/15 px-2.5 py-0.5 rounded-full border border-[#FF5C00]/30 shadow-sm">
            {activeStep.label} • {activeStep.labelFr}
          </span>
          <span className="text-[10px] text-zinc-500 font-bold">
            {activeIndex + 1}/5
          </span>
        </div>
      </div>

      {/* Step-based Visual Progress Bar */}
      <div className="relative pt-1 pb-1">
        {/* Progress Track Background */}
        <div className="absolute top-4 left-[10%] right-[10%] h-1.5 bg-zinc-800 rounded-full z-0" />

        {/* Animated Active Fill Line */}
        <div
          className="absolute top-4 left-[10%] h-1.5 bg-gradient-to-r from-amber-500 via-[#FF5C00] to-emerald-400 rounded-full z-0 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(255,92,0,0.6)]"
          style={{
            width: activeIndex === 0 ? '0%' : `calc(${progressPercent}% * 0.8)`
          }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_8px_#FF5C00] animate-pulse" />
        </div>

        {/* 5 Step Nodes */}
        <div className="relative z-10 flex justify-between items-start">
          {stepsList.map((step, idx) => {
            const isCompleted = idx < activeIndex;
            const isActive = idx === activeIndex;
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center text-center w-1/5 group">
                {/* Circle Icon */}
                <div
                  className={`w-7 sm:w-8 h-7 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 border ${
                    isActive
                      ? 'bg-[#FF5C00] border-[#FF5C00] text-white scale-110 ring-4 ring-[#FF5C00]/25 shadow-[0_0_14px_rgba(255,92,0,0.6)] font-bold'
                      : isCompleted
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-zinc-900/90 border-zinc-800 text-zinc-600'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={13} className="stroke-[3]" />
                  ) : (
                    <StepIcon size={13} className={isActive ? 'animate-pulse' : ''} />
                  )}
                </div>

                {/* Primary Step Label */}
                <span
                  className={`text-[8.5px] sm:text-[9.5px] font-black uppercase mt-1.5 tracking-tight leading-none ${
                    isActive
                      ? 'text-[#FF5C00]'
                      : isCompleted
                      ? 'text-emerald-400'
                      : 'text-zinc-500'
                  }`}
                >
                  {step.label}
                </span>

                {/* Secondary French Subtext */}
                <span className="text-[7.5px] text-zinc-400 font-medium font-sans truncate max-w-full block mt-0.5">
                  {step.labelFr}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function Polyline({ path }: { path: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || typeof window === 'undefined' || !(window as any).google) return;
    const polyline = new (window as any).google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#FF5C00',
      strokeOpacity: 0.8,
      strokeWeight: 4,
    });
    polyline.setMap(map);
    return () => polyline.setMap(null);
  }, [map, path]);
  return null;
}

function MapController({ 
  restCoords, 
  userCoords, 
  courierCoords 
}: { 
  restCoords: { lat: number; lng: number }; 
  userCoords: { lat: number; lng: number }; 
  courierCoords?: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || typeof window === 'undefined' || !(window as any).google) return;
    const bounds = new (window as any).google.maps.LatLngBounds();
    bounds.extend(restCoords);
    bounds.extend(userCoords);
    if (courierCoords) {
      bounds.extend(courierCoords);
    }
    map.fitBounds(bounds);
    
    const listener = (window as any).google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      const currentZoom = map.getZoom();
      if (currentZoom && currentZoom > 15) {
        map.setZoom(15);
      }
    });
    return () => {
      if ((window as any).google) {
        (window as any).google.maps.event.removeListener(listener);
      }
    };
  }, [map, restCoords, userCoords, courierCoords?.lat, courierCoords?.lng]);
  return null;
}

const MapRoutePreview = ({ 
  order, 
  restaurants, 
  userLocation 
}: { 
  order: Order; 
  restaurants: Restaurant[]; 
  userLocation?: { lat: number; lng: number } | null;
}) => {
  const [liveOrder, setLiveOrder] = useState<Order>(order);
  const [courierDetails, setCourierDetails] = useState<{ vehicle?: string; rating?: string; phone?: string } | null>(null);
  const [courierProgress, setCourierProgress] = useState(15);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);

  // Synchronize liveOrder state with any incoming updates from props
  useEffect(() => {
    setLiveOrder(order);
  }, [order]);

  // Periodically poll for updates on this specific order to enable live GPS tracking updates
  useEffect(() => {
    if (order.status === 'delivered' || order.status === 'cancelled') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders`);
        if (res.ok) {
          const allOrders: Order[] = await res.json();
          const updated = allOrders.find(o => o.id === order.id);
          if (updated) {
            setLiveOrder(updated);
          }
        }
      } catch (err) {
        console.error('Error polling active order tracking:', err);
      }
    }, 3000); // Check every 3 seconds for active delivery positioning

    return () => clearInterval(interval);
  }, [order.id, order.status]);

  // Fetch further Courier details (vehicle, rating) when a courier is assigned
  useEffect(() => {
    if (!liveOrder.courierId) {
      setCourierDetails(null);
      return;
    }

    const fetchCourierInfo = async () => {
      try {
        const res = await fetch('/api/couriers');
        if (res.ok) {
          const couriers: any[] = await res.json();
          const matched = couriers.find(c => c.id === liveOrder.courierId);
          if (matched) {
            setCourierDetails({
              vehicle: matched.vehicle,
              rating: matched.rating || '4.9',
              phone: matched.phone || '06 12 34 56 78'
            });
          }
        }
      } catch (err) {
        console.error('Error fetching courier info details:', err);
      }
    };

    fetchCourierInfo();
  }, [liveOrder.courierId]);

  // Progress simulation fallback only for click & collect
  useEffect(() => {
    if (order.deliveryType !== 'click_and_collect') return;

    const timer = setInterval(() => {
      setCourierProgress(prev => {
        if (prev >= 95) return 15;
        return prev + 1;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [order.deliveryType]);

  const restaurant = restaurants.find(r => r.id === order.restaurantId);
  const isClickCollect = order.deliveryType === 'click_and_collect';

  const restLat = restaurant?.latitude || 48.8566;
  const restLng = restaurant?.longitude || 2.3522;

  const userLat = userLocation?.lat || (restLat + 0.005);
  const userLng = userLocation?.lng || (restLng + 0.007);

  const hasCourierAssigned = !isClickCollect && liveOrder.courierId;
  const hasCourierPosition = hasCourierAssigned && liveOrder.courierLat !== undefined && liveOrder.courierLng !== undefined;

  let courierLat = restLat;
  let courierLng = restLng;

  if (hasCourierPosition) {
    courierLat = liveOrder.courierLat!;
    courierLng = liveOrder.courierLng!;
  } else if (isClickCollect) {
    courierLat = restLat + (userLat - restLat) * (courierProgress / 100);
    courierLng = restLng + (userLng - restLng) * (courierProgress / 100);
  }

  const path = [
    { lat: restLat, lng: restLng },
    { lat: userLat, lng: userLng }
  ];

  const courierCoordsForMap = hasCourierPosition || isClickCollect ? { lat: courierLat, lng: courierLng } : null;

  let statusText = "En attente";
  let statusDescription = "Votre commande attend d'être validée par l'établissement.";

  if (liveOrder.status === 'preparing') {
    statusText = "En cuisine";
    statusDescription = "Le chef prépare vos succulents plats avec soin !";
  } else if (liveOrder.status === 'ready') {
    statusText = isClickCollect ? "À retirer !" : "Livraison en cours";
    statusDescription = isClickCollect 
      ? "Votre commande est prête à être récupérée au restaurant." 
      : "Le livreur a récupéré votre commande et se hâte vers vous !";
  } else if (liveOrder.status === 'delivered') {
    statusText = "Arrivé";
    statusDescription = "Commande livrée avec succès ! Profitez bien de votre repas.";
  }

  // Refine text descriptions based on courier-specific live updates
  if (!isClickCollect && liveOrder.courierId) {
    if (liveOrder.courierStatus === 'assigned') {
      statusText = "Livreur assigné";
      statusDescription = `${liveOrder.courierName} se dirige vers l'établissement pour récupérer votre commande.`;
    } else if (liveOrder.courierStatus === 'at_restaurant') {
      statusText = "Livreur au restaurant";
      statusDescription = `${liveOrder.courierName} est arrivé au restaurant et attend que vos plats soient prêts.`;
    } else if (liveOrder.courierStatus === 'en_route') {
      statusText = "En route chez vous !";
      statusDescription = `${liveOrder.courierName} a récupéré votre commande bien chaude et se dirige vers votre domicile.`;
    } else if (liveOrder.courierStatus === 'delivered') {
      statusText = "Livré";
      statusDescription = "Commande remise en main propre. Bon appétit de la part de l'équipe Fidfud !";
    }
  }

  const getVehicleEmoji = (v?: string) => {
    if (v === 'Velo') return '🚴';
    if (v === 'Scooter') return '🛵';
    if (v === 'Voiture') return '🚗';
    return '🛵';
  };

  const getVehicleLabel = (v?: string) => {
    if (v === 'Velo') return 'Vélo Électrique';
    if (v === 'Scooter') return 'Scooter';
    if (v === 'Voiture') return 'Voiture Hybride';
    return 'Coursier Partenaire';
  };

  const handleSimulateCall = () => {
    if (!liveOrder.courierName) return;
    const phone = courierDetails?.phone || '06 12 34 56 78';
    
    const callToast = document.createElement('div');
    callToast.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-zinc-950 text-white px-5 py-4 rounded-2xl font-sans text-xs tracking-wide shadow-2xl flex flex-col gap-2 border border-green-500/30 animate-fadeIn w-80 max-w-[90%]';
    callToast.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 animate-pulse text-lg">📞</div>
        <div>
          <p class="font-black text-white uppercase text-[10px]">Appel Sortant (Simulation)</p>
          <p class="text-zinc-400 text-[9px] font-mono mt-0.5">${liveOrder.courierName} • ${phone}</p>
        </div>
      </div>
      <p class="text-[9.5px] text-zinc-400 leading-relaxed mt-1">« Allô ? Oui bonjour, c'est votre livreur Fidfud ! Je suis actuellement en chemin avec votre commande bien chaude et j'arrive d'ici quelques minutes ! »</p>
      <button id="btn-mock-call-hangup" class="mt-1.5 w-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase rounded-lg tracking-wider transition-colors" onclick="this.parentElement.remove()">Raccrocher</button>
    `;
    document.body.appendChild(callToast);
  };

  if (!hasValidKey) {
    // Compute progress % between 25% and 80% on our SVG line
    const totalLatDiff = userLat - restLat;
    const totalLngDiff = userLng - restLng;
    let computedProgress = 25;
    if (liveOrder.courierStatus === 'at_restaurant') {
      computedProgress = 25;
    } else if (liveOrder.courierStatus === 'en_route') {
      if (Math.abs(totalLatDiff) > 0.0001 || Math.abs(totalLngDiff) > 0.0001) {
        const courierLatDiff = (liveOrder.courierLat || restLat) - restLat;
        const courierLngDiff = (liveOrder.courierLng || restLng) - restLng;
        const dotProduct = (courierLatDiff * totalLatDiff) + (courierLngDiff * totalLngDiff);
        const pathLenSq = (totalLatDiff * totalLatDiff) + (totalLngDiff * totalLngDiff);
        computedProgress = Math.max(25, Math.min(80, 25 + Math.round((dotProduct / pathLenSq) * 55)));
      } else {
        computedProgress = 25 + (courierProgress * 0.55);
      }
    } else if (liveOrder.courierStatus === 'delivered' || liveOrder.status === 'delivered') {
      computedProgress = 80;
    }

    const estimatedRemainingDist = liveOrder.status === 'delivered' ? '0.0 km' : `${Math.max(0, parseFloat((2.4 * (1 - (computedProgress - 25) / 55)).toFixed(1)))} km`;
    const estimatedTimeLeft = liveOrder.status === 'delivered' ? '0 min' : `${Math.max(0, Math.ceil(8 * (1 - (computedProgress - 25) / 55)))} min`;

    return (
      <div className="bg-zinc-950/80 border border-white/5 rounded-xl overflow-hidden p-2.5 space-y-2.5">
        <div className="flex items-center justify-between text-[8px] font-sans">
          <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
            📍 Suivi temps réel (Simulateur Virtuel)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSetupInstructions(!showSetupInstructions)}
              className="text-zinc-400 hover:text-[#FF5C00] font-bold uppercase tracking-widest text-[7.5px] cursor-pointer"
            >
              {showSetupInstructions ? "Voir le traceur radar 📡" : "🔑 Clé Google Maps ?"}
            </button>
            <span className="text-[#FF5C00] font-black font-mono animate-pulse uppercase">
              {statusText}
            </span>
          </div>
        </div>

        {showSetupInstructions ? (
          <div className="bg-zinc-950/95 border border-[#FF5C00]/25 rounded-xl p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-amber-500 font-black uppercase tracking-wider text-[10px]">
              ⚠️ Google Maps API Key Requis
            </div>
            <p className="text-zinc-400 text-[10px] leading-relaxed">
              Le suivi de livraison en direct sur une vraie carte interactive nécessite une clé API Google Maps configurée dans AI Studio.
            </p>
            <div className="bg-[#050505] p-2.5 rounded-lg border border-white/5 space-y-1 text-[9px] text-zinc-500 leading-relaxed font-mono">
              <p><strong>Étape 1 :</strong> Récupérez une clé sur Google Cloud Console.</p>
              <p><strong>Étape 2 :</strong> Allez dans <strong>Settings</strong> (⚙️ en haut à droite) &rarr; <strong>Secrets</strong> &rarr; ajoutez <code>GOOGLE_MAPS_PLATFORM_KEY</code>.</p>
            </div>
            <button
              onClick={() => setShowSetupInstructions(false)}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-zinc-300 cursor-pointer"
            >
              Retour au traceur radar
            </button>
          </div>
        ) : (
          <div className="relative h-44 bg-[#0a0a0c] border border-white/5 rounded-lg overflow-hidden flex flex-col justify-between p-3 select-none">
            {/* SVG Interactive radar map with moving courier emoji */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:14px_14px]"></div>
            
            {/* Ambient circular pulse */}
            {liveOrder.courierStatus === 'en_route' && (
              <div 
                className="absolute w-24 h-24 rounded-full bg-[#FF5C00]/5 border border-[#FF5C00]/10 animate-ping"
                style={{
                  left: `calc(${computedProgress}% - 40px)`,
                  top: '30px',
                  animationDuration: '3s'
                }}
              ></div>
            )}

            <div className="relative w-full h-full flex flex-col justify-center">
              {/* Connection vector path */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Dashed line */}
                <line 
                  x1="15%" 
                  y1="50%" 
                  x2="85%" 
                  y2="50%" 
                  stroke="rgba(255,92,0,0.15)" 
                  strokeWidth="3" 
                />
                <line 
                  x1="15%" 
                  y1="50%" 
                  x2={`${computedProgress}%`} 
                  y2="50%" 
                  stroke="#FF5C00" 
                  strokeWidth="3" 
                  strokeDasharray="4 3"
                  className="animate-pulse"
                />
              </svg>

              {/* Markers */}
              <div className="absolute left-[15%] -translate-x-1/2 flex flex-col items-center">
                <span className="text-xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] animate-pulse">🏪</span>
                <span className="text-[7px] font-black uppercase text-zinc-500 tracking-wider font-mono mt-1">Resto</span>
              </div>

              {/* Courier emoji moving */}
              {liveOrder.status !== 'delivered' && (
                <div 
                  className="absolute -translate-x-1/2 flex flex-col items-center transition-all duration-1000 ease-in-out"
                  style={{ left: `${computedProgress}%` }}
                >
                  <span className="text-2xl filter drop-shadow-[0_4px_12px_rgba(255,92,0,0.55)] animate-bounce">
                    {liveOrder.status === 'ready' ? '🏃‍♂️' : getVehicleEmoji(courierDetails?.vehicle)}
                  </span>
                  <span className="text-[7.5px] font-black text-[#FF5C00] font-mono mt-0.5 whitespace-nowrap bg-zinc-950/90 px-1 py-0.5 rounded border border-white/5 uppercase tracking-wide">
                    {liveOrder.courierName || 'Livreur'}
                  </span>
                </div>
              )}

              <div className="absolute left-[85%] -translate-x-1/2 flex flex-col items-center">
                <span className="text-xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">🏠</span>
                <span className="text-[7px] font-black uppercase text-zinc-500 tracking-wider font-mono mt-1">Client</span>
              </div>
            </div>

            {/* Bottom HUD bar */}
            <div className="relative z-10 flex justify-between items-center bg-zinc-950/90 border border-white/5 rounded-lg px-2.5 py-1.5 text-[8.5px] font-mono text-zinc-400">
              <div className="flex items-center gap-1">
                <span className="text-[#FF5C00]">📏 Distance:</span>
                <span className="text-white font-bold">{estimatedRemainingDist}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#FF5C00]">⏱️ Temps:</span>
                <span className="text-white font-bold">{estimatedTimeLeft}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">Traceur virtuel actif</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-950/80 border border-white/5 rounded-xl overflow-hidden p-2.5 space-y-2.5">
      <div className="flex items-center justify-between text-[8px] font-sans">
        <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
          📍 {isClickCollect ? "Itinéraire Click & Collect" : "Suivi de livraison en direct"}
        </span>
        <span className="text-[#FF5C00] font-black font-mono animate-pulse uppercase">
          {statusText}
        </span>
      </div>

      <div className="relative h-44 bg-[#0a0a0c] border border-white/5 rounded-lg overflow-hidden">
        {hasValidKey ? (
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={{ lat: (restLat + userLat) / 2, lng: (restLng + userLng) / 2 }}
              defaultZoom={14}
              mapId="DEMO_MAP_ID"
              gestureHandling="greedy"
              disableDefaultUI={true}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              <AdvancedMarker position={{ lat: restLat, lng: restLng }} title={order.restaurantName || "Restaurant"}>
                <div 
                  className="w-8 h-8 flex items-center justify-center bg-black border-2 border-[#FF5C00] rounded-full shadow-lg text-sm select-none"
                  style={{ width: '32px', height: '32px' }}
                >
                  🏪
                </div>
              </AdvancedMarker>

              <AdvancedMarker position={{ lat: userLat, lng: userLng }} title="Votre adresse">
                <div 
                  className="w-8 h-8 flex items-center justify-center bg-black border-2 border-blue-500 rounded-full shadow-lg text-sm select-none"
                  style={{ width: '32px', height: '32px' }}
                >
                  🏠
                </div>
              </AdvancedMarker>

              {(hasCourierPosition || isClickCollect) && liveOrder.status !== 'delivered' && (
                <AdvancedMarker position={{ lat: courierLat, lng: courierLng }} title={isClickCollect ? "Votre trajet" : "Livreur en route"}>
                  <div 
                    className="w-8 h-8 flex items-center justify-center bg-[#FF5C00] border-2 border-white rounded-full shadow-lg text-sm animate-bounce select-none"
                    style={{ width: '32px', height: '32px' }}
                  >
                    {isClickCollect ? "🏃‍♂️" : getVehicleEmoji(courierDetails?.vehicle)}
                  </div>
                </AdvancedMarker>
              )}

              <Polyline path={path} />
              <MapController 
                restCoords={{ lat: restLat, lng: restLng }} 
                userCoords={{ lat: userLat, lng: userLng }} 
                courierCoords={courierCoordsForMap}
              />
            </Map>
          </APIProvider>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-900/60 select-none">
            <span className="text-2xl mb-1">🗺️</span>
            <p className="text-[11px] font-bold text-zinc-300">
              {isClickCollect ? "Itinéraire Click & Collect" : "Suivi de livraison en direct"}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {order.restaurantName || "Restaurant"} ➔ {order.customerAddress || "Point de retrait"}
            </p>
          </div>
        )}

        <div className="absolute bottom-1 right-1 bg-black/85 px-1.5 py-0.5 rounded border border-white/5 text-[7px] font-bold font-mono text-zinc-400 z-10">
          ⏱️ {liveOrder.status === 'delivered' ? 'Livré' : liveOrder.status === 'ready' ? 'Prêt pour retrait' : hasCourierPosition ? 'GPS Actif' : `ETA: ~10 min (Progression: ${courierProgress}%)`}
        </div>
      </div>

      {/* Courier details and quick actions bar */}
      {!isClickCollect && liveOrder.courierId && (
        <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-2.5 space-y-2.5 font-sans">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF5C00]/20 to-[#FF5C00]/5 flex items-center justify-center border border-[#FF5C00]/25 text-base select-none">
                👨‍✈️
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-white uppercase">{liveOrder.courierName}</span>
                  <span className="text-[7.5px] bg-amber-400/10 border border-amber-400/20 text-amber-400 font-bold px-1 rounded font-mono">
                    ★ {courierDetails?.rating || '4.9'}
                  </span>
                </div>
                <p className="text-[8px] text-zinc-500 font-bold uppercase">
                  {getVehicleEmoji(courierDetails?.vehicle)} {getVehicleLabel(courierDetails?.vehicle)}
                </p>
              </div>
            </div>

            <button
              onClick={handleSimulateCall}
              className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white text-[8px] font-black uppercase rounded-lg tracking-wider transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-md"
            >
              <span>📞 Appeler</span>
            </button>
          </div>

          <div className="border-t border-white/5 pt-2 space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-zinc-400 font-black uppercase tracking-wider flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                Suivi GPS en direct
              </span>
              {hasCourierPosition && (
                <span className="text-zinc-600 font-mono text-[8px]">
                  Coords: {courierLat.toFixed(4)}, {courierLng.toFixed(4)}
                </span>
              )}
            </div>
            <p className="text-[9px] text-zinc-400 leading-relaxed italic">
              « {statusDescription} »
            </p>
          </div>
        </div>
      )}

      {/* When no courier is assigned yet */}
      {!isClickCollect && !liveOrder.courierId && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-2.5 space-y-1 font-sans text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">
              🛵 Attribution du Livreur
            </span>
            <span className="text-[#FF5C00] font-bold text-[8px] uppercase tracking-wide animate-pulse">
              {statusText}
            </span>
          </div>
          <p className="text-zinc-500 text-[9px] leading-relaxed">
            Nous recherchons actuellement le coursier Fidfud le plus proche de l'établissement pour prendre en charge vos plats.
          </p>
        </div>
      )}
    </div>
  );
};


const OrderReviewForm = ({ order, user, onReviewSubmitted }: { order: Order; user: any; onReviewSubmitted: (orderId: string, rating: number, text: string) => void }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${order.restaurantId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating,
          text: comment.trim(),
          userName: user?.name || user?.email?.split('@')[0] || "Gourmet Fidfud"
        })
      });

      if (res.ok) {
        onReviewSubmitted(order.id, rating, comment.trim());
      } else {
        const data = await res.json();
        setError(data.error || "Impossible d'envoyer l'avis.");
      }
    } catch (err) {
      console.error(err);
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2.5 p-2.5 bg-zinc-950/60 border border-[#FF5C00]/15 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-zinc-300 font-extrabold uppercase tracking-wider flex items-center gap-1">
          🌟 Donner mon avis sur {order.restaurantName}
        </span>
        <span className="text-[7.5px] text-zinc-500 font-mono">Achat vérifié</span>
      </div>

      {/* Star Selector */}
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="p-0.5 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
          >
            <svg 
              className={`w-4 h-4 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        <span className="text-[8.5px] text-zinc-400 font-bold ml-1 uppercase">
          {rating === 5 ? 'Excellent ! 😍' : rating === 4 ? 'Très bon 🙂' : rating === 3 ? 'Correct 😐' : rating === 2 ? 'Décevant 🙁' : 'Mauvais 😡'}
        </span>
      </div>

      {/* Feedback text area */}
      <div className="space-y-1">
        <textarea
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Rédigez votre commentaire culinaire ici..."
          className="w-full text-[10px] bg-zinc-900 border border-white/5 rounded-lg px-2 py-1.5 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/40 transition-colors resize-none"
          required
        />
      </div>

      {error && <p className="text-[8px] text-red-500 font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting || !comment.trim()}
        className="w-full py-1 bg-[#FF5C00] hover:bg-[#FF5C00]/90 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-[8.5px] font-black uppercase tracking-wider shadow-md transition-all active:scale-[0.98] cursor-pointer"
      >
        {isSubmitting ? 'Publication...' : 'Publier mon avis'}
      </button>
    </form>
  );
};

export default function OrdersHistory({ 
  isOpen, 
  onClose, 
  orders, 
  user, 
  restaurants, 
  userLocation,
  dishes = [],
  onAddToCart,
  onOpenCart,
  onOrderUpdated
}: OrdersHistoryProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'loyalty'>('orders');
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [rewardClaims, setRewardClaims] = useState<any[]>([]);
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [submittedReviews, setSubmittedReviews] = useState<Record<string, { rating: number; text: string }>>({});
  const [reorderToast, setReorderToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Cancellation Modal State
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState<Order | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);

  const handleConfirmCancelOrder = async (orderId: string, reason: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Custom interactive cancellation toast
        const cancelToast = document.createElement('div');
        cancelToast.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[150] bg-zinc-950 text-white px-5 py-3.5 rounded-2xl font-sans text-xs shadow-2xl flex flex-col gap-1 border border-red-500/30 animate-bounce w-80 max-w-[90%]';
        cancelToast.innerHTML = `
          <div class="flex items-center gap-2 text-red-400 font-black uppercase text-[10px] tracking-wider">
            <span>❌ Commande Annulée</span>
          </div>
          <p class="text-zinc-200 text-[10.5px] leading-snug">${data.message}</p>
        `;
        document.body.appendChild(cancelToast);
        setTimeout(() => cancelToast.remove(), 4500);

        if (onOrderUpdated && data.order) {
          onOrderUpdated(data.order);
        }

        setIsCancelModalOpen(false);
        setSelectedOrderToCancel(null);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Impossible d'annuler la commande.");
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert("Erreur réseau lors de la tentative d'annulation.");
    }
  };

  // Re-order handler that adds items back to cart if available in menu
  const handleReorderOrder = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      setReorderToast({ type: 'error', message: 'Cette commande ne contient aucun article.' });
      setTimeout(() => setReorderToast(null), 3000);
      return;
    }

    let addedCount = 0;
    let missingCount = 0;

    order.items.forEach(item => {
      // Find matching dish in available menu by id or dishName
      const dish = dishes.find(d => 
        d.id === item.dishId || 
        (item.dishName && d.name.toLowerCase().trim() === item.dishName.toLowerCase().trim())
      );

      if (dish && dish.isAvailable !== false) {
        if (onAddToCart) {
          onAddToCart(dish, item.quantity);
          addedCount += item.quantity;
        }
      } else {
        missingCount++;
      }
    });

    if (addedCount > 0) {
      const msg = missingCount > 0
        ? `🛒 ${addedCount} article(s) réajouté(s) au panier ! (${missingCount} indisponible)`
        : `🛒 ${addedCount} article(s) réajouté(s) au panier avec succès !`;
      setReorderToast({ type: 'success', message: msg });
      setTimeout(() => {
        setReorderToast(null);
        onClose();
        if (onOpenCart) onOpenCart();
      }, 1000);
    } else {
      setReorderToast({ 
        type: 'error', 
        message: 'Désolé, les articles de cette commande ne sont plus disponibles actuellement dans le menu.' 
      });
      setTimeout(() => setReorderToast(null), 3500);
    }
  };

  // Sync state on open & user change
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchPoints();
      fetchClaims();
    }
  }, [isOpen, user?.id]);

  const fetchPoints = async () => {
    try {
      const res = await fetch(`/api/users/${user?.id}/points`);
      if (res.ok) {
        const data = await res.json();
        setPointsBalance(data.points);
      }
    } catch (err) {
      console.error('Failed to fetch points balance:', err);
    }
  };

  const fetchClaims = async () => {
    try {
      const res = await fetch(`/api/users/${user?.id}/rewards`);
      if (res.ok) {
        const data = await res.json();
        setRewardClaims(data);
      }
    } catch (err) {
      console.error('Failed to fetch reward claims:', err);
    }
  };

  const handleRedeemReward = async (rewardId: string, cost: number) => {
    if (pointsBalance < cost) {
      alert("Votre solde de points fidélité est insuffisant pour débloquer ce cadeau ! Regardez d'autres vidéos gourmandes pour accumuler des points.");
      return;
    }
    
    setIsRedeeming(true);
    try {
      const res = await fetch(`/api/users/${user?.id}/rewards/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId })
      });
      if (res.ok) {
        const result = await res.json();
        
        // Custom interactive success notification
        const successToast = document.createElement('div');
        successToast.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-5 py-3.5 rounded-2xl font-black uppercase text-[11px] tracking-wider shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce';
        successToast.innerHTML = `🎁 Cadeau débloqué ! Utilisez le code: <strong>${result.claim.code}</strong>`;
        document.body.appendChild(successToast);
        setTimeout(() => successToast.remove(), 4000);

        fetchPoints();
        fetchClaims();
      } else {
        const errData = await res.json();
        alert(errData.error || "Erreur lors de l'échange de points.");
      }
    } catch (err) {
      console.error('Failed to redeem reward:', err);
      alert("Impossible de joindre le serveur de fidélité Fidfud.");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  // Filter orders relevant to this user if logged in
  const userOrders = user 
    ? orders.filter(o => o.userId === user.id) 
    : orders; // fallback to all for simplicity or testing

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/85 backdrop-blur-sm transition-opacity duration-300">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Panel Container */}
      <div className="relative w-full max-w-md h-full bg-[#0D0D0E]/95 backdrop-blur-md border-l border-white/5 shadow-2xl flex flex-col z-10 transition-transform duration-300 transform translate-x-0">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#050505]">
          <div className="flex items-center space-x-2">
            <Clock size={18} className="text-[#FF5C00]" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Espace Client</h3>
          </div>
          <button 
            id="btn-close-orders-history"
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dual Tab Switcher */}
        <div className="grid grid-cols-2 bg-[#050505] border-b border-white/5 p-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 text-xs font-black uppercase tracking-wider transition-all rounded-xl cursor-pointer ${
              activeTab === 'orders' 
                ? 'bg-zinc-900 text-[#FF5C00] shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            🛍️ Mes Commandes
          </button>
          <button
            onClick={() => setActiveTab('loyalty')}
            className={`py-3 text-xs font-black uppercase tracking-wider transition-all rounded-xl cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === 'loyalty' 
                ? 'bg-zinc-900 text-amber-400 shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Sparkles size={11} className={activeTab === 'loyalty' ? 'text-amber-400' : 'text-zinc-500'} />
            <span>Club Fidélité</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: ORDERS LIST */}
          {activeTab === 'orders' && (
            <>
              {reorderToast && (
                <div className={`p-3 rounded-xl border text-xs font-bold font-sans transition-all animate-fadeIn ${
                  reorderToast.type === 'success' 
                    ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                    : reorderToast.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {reorderToast.message}
                </div>
              )}

              {userOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="p-4 rounded-full bg-zinc-900/60 text-zinc-500 mb-4 border border-white/5">
                  <ShoppingBag size={36} className="stroke-[1.5]" />
                </div>
                <h4 className="text-white font-black uppercase text-sm mb-1 italic">Aucune commande en cours</h4>
                <p className="text-zinc-500 text-xs max-w-xs leading-relaxed font-sans">
                  Vous n'avez pas encore passé de commande culinaire. Ouvrez les détails d'un plat sur le feed pour commander !
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {userOrders.map(order => {
                  const isPending = order.status === 'pending';
                  const isPreparing = order.status === 'preparing';
                  const isReady = order.status === 'ready';
                  const isDelivered = order.status === 'delivered';
                  const isCancelled = order.status === 'cancelled';

                  // Status Badge styling
                  let statusText = 'En attente d’acceptation';
                  let statusColor = 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
                  if (isPreparing) {
                    statusText = 'En préparation en cuisine 🍳';
                    statusColor = 'text-[#FF5C00] bg-[#FF5C00]/10 border-[#FF5C00]/20';
                  } else if (isReady) {
                    statusText = order.deliveryType === 'click_and_collect' ? 'Prêt pour retrait express ! 🏃‍♂️' : 'Prêt ! En cours de livraison 🛵';
                    statusColor = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
                  } else if (isDelivered) {
                    statusText = 'Commande livrée / récupérée ✔';
                    statusColor = 'text-green-500 bg-green-500/10 border-green-500/20';
                  } else if (isCancelled) {
                    statusText = 'Commande annulée';
                    statusColor = 'text-red-500 bg-red-500/10 border-red-500/20';
                  }

                  return (
                    <div key={order.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3.5 hover:border-white/10 transition-colors">
                      
                      {/* Header bar of order */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black font-sans">Restaurant</p>
                          <p className="text-sm font-black text-white uppercase italic">{order.restaurantName}</p>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-500 font-bold">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div className={`p-2 rounded-xl text-xs font-black border text-center uppercase tracking-wide ${statusColor}`}>
                        {statusText}
                      </div>

                      {/* Step-based Progress Tracker */}
                      {!isCancelled && (
                        <OrderStepTracker status={order.status} courierStatus={order.courierStatus} deliveryType={order.deliveryType} />
                      )}

                      {/* Real-Time Countdown Timer for Preparing Orders */}
                      {isPreparing && (
                        <PreparingCountdownTimer 
                          createdAt={order.createdAt}
                          estimatedPrepMinutes={order.estimatedPrepMinutes || 15}
                          deliveryType={order.deliveryType}
                        />
                      )}

                      {/* Map preview with estimated route (Active orders only) */}
                      {!isCancelled && !isDelivered && (
                        <MapRoutePreview 
                          order={order}
                          restaurants={restaurants}
                          userLocation={userLocation}
                        />
                      )}

                      {/* Order items listing */}
                      <div className="divide-y divide-zinc-900/50 pt-2 space-y-1">
                        {order.items?.map(item => (
                          <div key={item.id} className="flex justify-between text-xs text-zinc-400 py-1">
                            <span>
                              <strong className="text-zinc-200 font-bold">x{item.quantity}</strong> {item.dishName}
                            </span>
                            <span className="font-mono text-zinc-500">{(item.price * item.quantity).toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>

                      {/* Total financial sum */}
                      <div className="border-t border-zinc-900 pt-2.5 flex justify-between items-center text-xs">
                        <span className="text-zinc-500 font-medium">Total payé (Stripe)</span>
                        <span className="text-white font-extrabold text-sm">{order.totalAmount.toFixed(2)} €</span>
                      </div>

                      {/* Re-order Button & Cancel Order Button */}
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        {!isCancelled && !isDelivered && (
                          <button
                            onClick={() => {
                              setSelectedOrderToCancel(order);
                              setIsCancelModalOpen(true);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                          >
                            <AlertOctagon size={13} className="text-red-400" />
                            <span>Annuler la commande (Conditions)</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleReorderOrder(order)}
                          className="w-full py-2 px-3 rounded-xl bg-[#FF5C00]/10 hover:bg-[#FF5C00] text-[#FF5C00] hover:text-white border border-[#FF5C00]/30 hover:border-[#FF5C00] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95 group"
                        >
                          <RotateCcw size={14} className="stroke-[2.5] group-hover:-rotate-90 transition-transform duration-300" />
                          <span>Recommander</span>
                        </button>
                      </div>

                      {/* Cancelled Details Banner */}
                      {isCancelled && (
                        <div className="mt-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs space-y-1.5 animate-fadeIn">
                          <div className="flex items-center justify-between text-red-400 font-black uppercase text-[10px] tracking-wider">
                            <span className="flex items-center gap-1">
                              <XCircle size={13} />
                              Commande Annulée
                            </span>
                            {order.cancelledAt && (
                              <span className="text-zinc-500 text-[8.5px] font-mono">
                                {new Date(order.cancelledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-300 font-medium italic text-[10.5px]">"{order.cancelReason || 'Annulée par le client'}"</p>
                          {order.cancellationRefundAmount !== undefined && (
                            <div className="pt-1.5 text-[10px] font-mono text-emerald-400 border-t border-red-500/15 flex items-center justify-between">
                              <span>Remboursement bancaire :</span>
                              <span className="font-bold">{order.cancellationRefundAmount.toFixed(2)} € récrédités</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Feedback Rating & Comment (Only for delivered/completed orders) */}
                      {isDelivered && (
                        submittedReviews[order.id] ? (
                          <div className="mt-2.5 p-2.5 bg-green-500/5 border border-green-500/10 rounded-xl text-[10px] space-y-1.5 animate-fadeIn">
                            <div className="flex items-center justify-between text-green-400 font-extrabold uppercase text-[9px] tracking-wider">
                              <span>✓ Avis envoyé avec succès</span>
                              <span className="text-zinc-500 text-[8px] font-mono font-normal">Achat vérifié</span>
                            </div>
                            <p className="text-zinc-300 italic font-sans">"{submittedReviews[order.id].text}"</p>
                            <div className="flex items-center space-x-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <svg 
                                  key={i}
                                  className={`w-3.5 h-3.5 ${i < submittedReviews[order.id].rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-800'}`} 
                                  viewBox="0 0 20 20" 
                                  fill="currentColor"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <OrderReviewForm 
                            order={order} 
                            user={user} 
                            onReviewSubmitted={(orderId, rat, txt) => {
                              setSubmittedReviews(prev => ({
                                ...prev,
                                [orderId]: { rating: rat, text: txt }
                              }));
                            }} 
                          />
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

          {/* TAB 2: LOYALTY CLUB & REWARDS */}
          {activeTab === 'loyalty' && (
            !user ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <div className="p-4 rounded-full bg-amber-500/10 text-amber-400 mb-4 border border-amber-500/20">
                  <Award size={36} className="stroke-[1.5]" />
                </div>
                <h4 className="text-white font-black uppercase text-sm mb-1 italic">Mode Invité</h4>
                <p className="text-zinc-500 text-xs max-w-xs leading-relaxed font-sans mb-4">
                  Connectez-vous ou créez un compte Fidfud pour accéder à notre Club Fidélité exclusif, accumuler des points en regardant des vidéos, et gagner des cadeaux !
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Points Balance Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-[#16161a] to-[#251f18] border border-amber-500/20 p-5 space-y-2 shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-zinc-400 text-[10px] font-black uppercase tracking-wider font-mono">
                      <Coins size={12} className="text-amber-400 animate-bounce" />
                      <span>Points Accumulés</span>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold px-2 py-0.5 rounded-full">
                      Club Gourmet
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-black text-amber-400 font-sans tracking-tight">
                      {pointsBalance}
                    </span>
                    <span className="text-zinc-400 text-xs font-semibold">Points Fidfud</span>
                  </div>

                  <p className="text-zinc-500 text-[11px] font-sans leading-relaxed">
                    ✨ Regardez des vidéos culinaires pendant au moins 5 secondes pour réclamer <strong>+15 points</strong> à chaque visionnage !
                  </p>
                </div>

                {/* Redeemable Rewards Catalog */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider flex items-center gap-1.5 font-mono">
                    <Gift size={13} className="text-[#FF5C00]" />
                    <span>Échanger mes Points Fidélité</span>
                  </h4>

                  <div className="grid grid-cols-1 gap-2.5">
                    {REWARDS_CATALOG.map(item => {
                      const canAfford = pointsBalance >= item.cost;
                      return (
                        <div 
                          key={item.id} 
                          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                            canAfford 
                              ? 'bg-zinc-900/60 border-white/5 hover:border-white/10' 
                              : 'bg-zinc-900/20 border-white/2 opacity-60'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <span className="text-2xl mt-0.5 filter drop-shadow-md">{item.icon}</span>
                            <div>
                              <p className="text-xs font-black text-white">{item.title}</p>
                              <p className="text-[10px] text-zinc-500 font-sans mt-0.5 max-w-[200px] leading-tight">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <button
                            disabled={!canAfford || isRedeeming}
                            onClick={() => handleRedeemReward(item.id, item.cost)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                              canAfford 
                                ? 'bg-amber-400 hover:bg-amber-500 text-zinc-950 shadow-md active:scale-95' 
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            <span>{item.cost} Pts</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active claimed Coupon Codes */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider flex items-center gap-1.5 font-mono">
                    <Award size={13} className="text-green-500" />
                    <span>Mes Bons Disponibles ({rewardClaims.filter(c => !c.isUsed).length})</span>
                  </h4>

                  {rewardClaims.filter(c => !c.isUsed).length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-white/5 bg-zinc-900/20 text-center text-[11px] text-zinc-600 italic font-sans">
                      Aucun code de réduction actif. Convertissez vos points ci-dessus pour générer un code promo !
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rewardClaims.filter(c => !c.isUsed).map(claim => {
                        const isCopied = copiedCode === claim.code;
                        const catalogItem = REWARDS_CATALOG.find(rc => claim.rewardId.includes(rc.id));
                        
                        return (
                          <div 
                            key={claim.id} 
                            className="p-3 rounded-xl bg-green-500/5 border border-green-500/20 flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-black text-zinc-200">
                                {catalogItem?.title || 'Cadeau Fidélité'}
                              </p>
                              <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                                Obtenu le {new Date(claim.createdAt).toLocaleDateString()}
                              </p>
                            </div>

                            <button
                              onClick={() => handleCopyCode(claim.code)}
                              className="flex items-center space-x-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-xs text-white font-extrabold px-3 py-1.5 rounded-lg font-mono transition-all cursor-pointer hover:border-[#FF5C00]"
                              title="Copier le code de réduction"
                            >
                              <span className="text-zinc-300 tracking-wide text-[10px]">{claim.code}</span>
                              {isCopied ? (
                                <Check size={11} className="text-green-500" />
                              ) : (
                                <Copy size={11} className="text-zinc-500" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Used historic claims */}
                {rewardClaims.filter(c => c.isUsed).length > 0 && (
                  <div className="space-y-2 pt-2 opacity-50">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider font-mono">Historique des cadeaux utilisés ({rewardClaims.filter(c => c.isUsed).length})</p>
                    <div className="space-y-1.5">
                      {rewardClaims.filter(c => c.isUsed).map(claim => (
                        <div key={claim.id} className="text-[10px] text-zinc-500 flex justify-between font-mono bg-zinc-950 p-2 rounded-lg border border-white/2">
                          <span>{REWARDS_CATALOG.find(rc => claim.rewardId.includes(rc.id))?.title || 'Avantage utilisé'}</span>
                          <span className="line-through">{claim.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

        </div>
      </div>

      {/* MODAL: CANCEL ORDER WITH CONDITIONS */}
      <CancelOrderModal
        order={selectedOrderToCancel}
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedOrderToCancel(null);
        }}
        onConfirmCancel={handleConfirmCancelOrder}
      />
    </div>
  );
}
