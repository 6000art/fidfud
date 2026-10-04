import React, { useState, useEffect } from 'react';
import { 
  X, User, ChefHat, LayoutGrid, KeyRound, LogOut, Bell, ShieldCheck, 
  Truck, Lock, CheckCircle, AlertCircle, Loader2, Play, Users, 
  Award, Sparkles, Gift, Coins, Copy, Check, ShoppingBag, TrendingUp, 
  ChevronDown, ChevronUp, Star 
} from 'lucide-react';
import { Order, UserRewardClaim } from '../types';
import { notify } from '../utils/notify';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; email: string; role: 'client' | 'restaurant' | 'admin' | 'courier' } | null;
  orders?: Order[];
  onOpenAuth: () => void;
  onLogout: () => void;
  currentRole: 'client' | 'restaurant' | 'courier';
  onChangeRole: (role: 'client' | 'restaurant' | 'courier') => void;
  onOpenAdmin: () => void;
  activeOrderCount: number;
  onOpenOrdersHistory: () => void;
  isAutoPlayEnabled: boolean;
  onToggleAutoPlay: () => void;
  onOpenContacts?: () => void;
}

const AVAILABLE_REWARDS = [
  { id: 'free-drink', type: 'free_drink', title: 'Boisson Fraîche Offerte', pointsCost: 200, icon: '🥤', description: 'Une canette ou soft artisanal offert' },
  { id: 'free-delivery', type: 'free_delivery', title: 'Livraison Offerte', pointsCost: 300, icon: '🚚', description: '0 € de frais de livraison sur votre commande' },
  { id: 'free-dessert', type: 'free_dessert', title: 'Dessert Artisanal Offert', pointsCost: 400, icon: '🍰', description: 'Tiramisu, cookie ou douceur du chef offerte' },
  { id: '10-percent', type: 'percentage_discount', title: 'Remise Exclusive -10%', pointsCost: 500, icon: '🎟️', description: '10% de réduction immédiate sur votre panier' }
];

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  orders = [],
  onOpenAuth,
  onLogout,
  currentRole,
  onChangeRole,
  onOpenAdmin,
  activeOrderCount,
  onOpenOrdersHistory,
  isAutoPlayEnabled,
  onToggleAutoPlay,
  onOpenContacts
}: ProfileModalProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Loyalty System state
  const [pointsBalance, setPointsBalance] = useState<number>(500);
  const [rewardClaims, setRewardClaims] = useState<UserRewardClaim[]>([]);
  const [isLoadingLoyalty, setIsLoadingLoyalty] = useState<boolean>(false);
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isOrdersExpanded, setIsOrdersExpanded] = useState<boolean>(false);
  const [isRewardsExpanded, setIsRewardsExpanded] = useState<boolean>(false);

  const effectiveUserId = user?.id || 'usr-client-1';

  // Calculate points earned from order totals
  const relevantOrders = orders.filter(o => {
    if (user?.id) {
      return o.userId === user.id;
    }
    // Demo guest user sees orders assigned to client or default
    return o.userId === 'usr-client-1' || !o.userId || o.userId === 'usr-i57y7v5';
  });

  const totalSpentOnOrders = relevantOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const totalPointsFromOrders = relevantOrders.reduce((sum, o) => {
    const pts = o.pointsEarned ?? Math.round(Number(o.totalAmount || 0) * 10);
    return sum + pts;
  }, 0);

  // Fetch points and reward claims on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchLoyaltyData = async () => {
      setIsLoadingLoyalty(true);
      try {
        const [pointsRes, rewardsRes] = await Promise.all([
          fetch(`/api/users/${effectiveUserId}/points`),
          fetch(`/api/users/${effectiveUserId}/rewards`)
        ]);

        if (pointsRes.ok) {
          const pointsData = await pointsRes.json();
          if (isMounted && pointsData.points !== undefined) {
            setPointsBalance(pointsData.points);
          }
        }

        if (rewardsRes.ok) {
          const rewardsData = await rewardsRes.json();
          if (isMounted && Array.isArray(rewardsData)) {
            setRewardClaims(rewardsData);
          }
        }
      } catch (err) {
        console.warn('Erreur chargement données fidélité:', err);
      } finally {
        if (isMounted) setIsLoadingLoyalty(false);
      }
    };

    fetchLoyaltyData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, effectiveUserId]);

  if (!isOpen) return null;

  // Extract username from email
  const getUsername = (emailStr: string) => {
    return emailStr.split('@')[0];
  };

  // Tier calculation
  const getLoyaltyTier = (pts: number) => {
    if (pts >= 1500) {
      return {
        name: 'Or Gourmet',
        color: 'from-amber-400 to-yellow-500',
        textColor: 'text-yellow-400',
        borderColor: 'border-yellow-400/40',
        bgBadge: 'bg-yellow-400/10',
        nextTier: null,
        ptsNeeded: 0,
        progress: 100
      };
    }
    if (pts >= 500) {
      return {
        name: 'Argent Foodie',
        color: 'from-zinc-300 to-slate-400',
        textColor: 'text-zinc-200',
        borderColor: 'border-zinc-300/40',
        bgBadge: 'bg-zinc-300/10',
        nextTier: 'Or Gourmet',
        ptsNeeded: 1500 - pts,
        progress: Math.min(100, Math.round(((pts - 500) / 1000) * 100))
      };
    }
    return {
      name: 'Bronze Gourmet',
      color: 'from-amber-700 to-amber-600',
      textColor: 'text-amber-500',
      borderColor: 'border-amber-600/40',
      bgBadge: 'bg-amber-600/10',
      nextTier: 'Argent Foodie',
      ptsNeeded: 500 - pts,
      progress: Math.min(100, Math.round((pts / 500) * 100))
    };
  };

  const currentTier = getLoyaltyTier(pointsBalance);

  // Redeem reward
  const handleRedeemReward = async (reward: typeof AVAILABLE_REWARDS[0]) => {
    if (pointsBalance < reward.pointsCost) {
      notify("Points insuffisants", `Il vous manque ${reward.pointsCost - pointsBalance} points pour débloquer cette récompense.`, "warn");
      return;
    }

    setIsRedeeming(reward.id);
    try {
      const res = await fetch(`/api/users/${effectiveUserId}/rewards/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rewardId: reward.id, 
          rewardName: reward.title, 
          pointsCost: reward.pointsCost,
          rewardType: reward.type 
        })
      });

      const data = await res.json();
      if (res.ok && data.claim) {
        setPointsBalance(data.points);
        setRewardClaims(prev => [data.claim, ...prev]);
        notify(
          "🎁 Récompense Débloquée !", 
          `Votre code ${data.claim.code} est actif ! Cliquez pour le copier.`, 
          "success"
        );
      } else {
        notify("Erreur d'échange", data.error || "Impossible d'échanger les points.", "warn");
      }
    } catch (err: any) {
      console.error(err);
      notify("Erreur réseau", "Impossible de joindre le serveur.", "warn");
    } finally {
      setIsRedeeming(null);
    }
  };

  // Copy promo code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    notify("Code copié !", `Le code ${code} a été copié dans votre presse-papier.`, "info");
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' });
      return;
    }
    setIsSubmittingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordMsg({ type: 'success', text: data.message || 'Mot de passe modifié avec succès !' });
        setNewPassword('');
        setTimeout(() => setShowPasswordForm(false), 2000);
      } else {
        setPasswordMsg({ type: 'error', text: data.error || 'Erreur lors de la modification.' });
      }
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Erreur réseau.' });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[#09090b] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 animate-fade-in text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-5 sticky top-0 bg-[#09090b]/95 backdrop-blur-md z-20">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#FF5C00] flex items-center gap-2 font-mono">
            <User size={16} />
            <span>Mon Espace FIDFUD</span>
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-6">
          {/* User Account Info Section */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                    <span className="text-xs font-black uppercase font-mono tracking-wider truncate max-w-[170px]">
                      {getUsername(user.email)}
                    </span>
                  </div>
                  <span className="text-[9px] bg-[#FF5C00]/25 text-[#FF5C00] border border-[#FF5C00]/30 font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                    {user.role}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                
                {/* Password modification form */}
                {!showPasswordForm ? (
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(true)}
                    className="w-full mt-1.5 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/5"
                  >
                    <Lock size={12} className="text-[#FF5C00]" />
                    <span>Changer de mot de passe</span>
                  </button>
                ) : (
                  <form onSubmit={handleChangePassword} className="mt-2 space-y-2.5 p-3 rounded-xl bg-zinc-950 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-zinc-400 font-mono">Nouveau mot de passe</span>
                      <button 
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordMsg(null);
                        }}
                        className="text-[9px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                    <input 
                      type="password"
                      placeholder="Minimum 6 caractères"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                      required
                    />
                    {passwordMsg && (
                      <div className={`p-2 rounded-lg text-[10px] flex items-center gap-1.5 ${
                        passwordMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {passwordMsg.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        <span>{passwordMsg.text}</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmittingPassword}
                      className="w-full py-2 rounded-lg bg-[#FF5C00] hover:bg-[#FF7A00] text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingPassword ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      <span>Mettre à jour</span>
                    </button>
                  </form>
                )}

                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-red-500/10"
                >
                  <LogOut size={12} />
                  <span>Se déconnecter</span>
                </button>
              </div>
            ) : (
              <div className="text-center space-y-3 py-1">
                <p className="text-xs text-zinc-400 font-medium">Rejoignez la communauté des gourmets et cumulez des points sur vos commandes !</p>
                <button
                  onClick={() => {
                    onOpenAuth();
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#FF5C00] hover:bg-[#FF7A00] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound size={13} />
                  <span>Se connecter / S'inscrire</span>
                </button>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* LOYALTY POINTS TRACKING SYSTEM                          */}
          {/* ======================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Award size={13} className="text-amber-400" />
                <span>Programme Fidélité & Récompenses</span>
              </label>
              <span className="text-[9px] text-zinc-400 font-mono">1 € = 10 pts</span>
            </div>

            {/* Hero Tier & Balance Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-[#FF5C00]/10 to-black border border-amber-500/30 shadow-lg space-y-3 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider font-mono border ${currentTier.bgBadge} ${currentTier.textColor} ${currentTier.borderColor} flex items-center gap-1`}>
                      <Star size={10} className="fill-current" />
                      <span>{currentTier.name}</span>
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-white font-mono tracking-tight">
                      {pointsBalance}
                    </span>
                    <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider font-mono">
                      PTS
                    </span>
                  </div>
                </div>

                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-[#FF5C00] flex items-center justify-center text-white shadow-md">
                  <Coins size={22} />
                </div>
              </div>

              {/* Progress to next tier */}
              {currentTier.nextTier ? (
                <div className="space-y-1.5 pt-1 border-t border-white/5">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-400">Prochain palier : <strong className="text-white">{currentTier.nextTier}</strong></span>
                    <span className="text-amber-400 font-semibold">{currentTier.ptsNeeded} pts restants</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-[#FF5C00] rounded-full transition-all duration-500"
                      style={{ width: `${currentTier.progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-1 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-amber-300 font-mono font-semibold">
                  <Sparkles size={12} />
                  <span>Niveau Ultime atteint ! Vous bénéficiez de tous les privilèges FIDFUD.</span>
                </div>
              )}
            </div>

            {/* Points Earned from Order Totals Calculation Card */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold text-white">Points Gagnés sur Commandes</span>
                </div>
                <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-black text-xs">
                  +{totalPointsFromOrders} PTS
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-black/40 p-2 rounded-xl border border-white/5">
                <div>
                  <span className="text-zinc-500 block">Commandes passées</span>
                  <span className="text-white font-bold">{relevantOrders.length} commande(s)</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Total dépensé</span>
                  <span className="text-white font-bold">{totalSpentOnOrders.toFixed(2)} €</span>
                </div>
              </div>

              {/* Order points breakdown toggle */}
              {relevantOrders.length > 0 ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsOrdersExpanded(!isOrdersExpanded)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-bold transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>Détail par commande ({relevantOrders.length})</span>
                    {isOrdersExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {isOrdersExpanded && (
                    <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {relevantOrders.map(order => {
                        const ptsEarned = order.pointsEarned ?? Math.round(Number(order.totalAmount || 0) * 10);
                        const shortId = order.id ? order.id.substring(order.id.length - 4).toUpperCase() : '001';
                        const dateFormatted = order.createdAt ? new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'Récent';

                        return (
                          <div 
                            key={order.id} 
                            className="p-2 rounded-lg bg-black/60 border border-white/5 flex items-center justify-between text-[10px]"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[#FF5C00] font-bold">#{shortId}</span>
                                <span className="text-zinc-500">• {dateFormatted}</span>
                              </div>
                              <p className="text-zinc-400 truncate text-[9px] mt-0.5">
                                {order.restaurantName || 'Restaurant Fidfud'} ({order.totalAmount.toFixed(2)} €)
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono font-bold text-[10px]">
                                +{ptsEarned} pts
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-zinc-400 text-center py-1">
                  Passez votre première commande pour commencer à cumuler 10 points par euro dépensé !
                </p>
              )}
            </div>

            {/* Redeem Rewards Section */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift size={14} className="text-[#FF5C00]" />
                  <span className="text-xs font-bold text-white">Convertir en Récompenses</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRewardsExpanded(!isRewardsExpanded)}
                  className="text-[10px] text-[#FF5C00] hover:underline font-mono font-bold cursor-pointer"
                >
                  {isRewardsExpanded ? 'Masquer' : 'Voir les 4 offres'}
                </button>
              </div>

              {isRewardsExpanded && (
                <div className="space-y-2 pt-1 animate-fade-in">
                  {AVAILABLE_REWARDS.map(reward => {
                    const canAfford = pointsBalance >= reward.pointsCost;
                    const isProcessing = isRedeeming === reward.id;

                    return (
                      <div 
                        key={reward.id} 
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          canAfford 
                            ? 'bg-black/50 border-white/10 hover:border-amber-500/40' 
                            : 'bg-black/20 border-white/5 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0">{reward.icon}</span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">{reward.title}</p>
                            <p className="text-[9px] text-zinc-400 font-sans truncate">{reward.description}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!canAfford || isProcessing}
                          onClick={() => handleRedeemReward(reward)}
                          className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-black font-mono uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                            canAfford 
                              ? 'bg-gradient-to-r from-amber-500 to-[#FF5C00] text-white hover:brightness-110 shadow-sm' 
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          {isProcessing ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <span>{reward.pointsCost} PTS</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Claimed Active Promo Codes List */}
            {rewardClaims.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-mono">
                    <Sparkles size={12} />
                    <span>Mes Bons & Codes Fidélité ({rewardClaims.filter(c => !c.isUsed).length} actifs)</span>
                  </span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {rewardClaims.map(claim => (
                    <div 
                      key={claim.id} 
                      className={`p-2 rounded-xl border flex items-center justify-between text-[10px] font-mono ${
                        claim.isUsed 
                          ? 'bg-black/30 border-white/5 text-zinc-500 line-through' 
                          : 'bg-black/60 border-amber-500/30 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[#FF5C00] font-black tracking-wider">{claim.code}</span>
                        <span className="text-[9px] text-zinc-400 font-sans truncate">({claim.rewardName || (claim as any).title})</span>
                      </div>

                      {!claim.isUsed ? (
                        <button
                          type="button"
                          onClick={() => handleCopyCode(claim.code)}
                          className="px-2 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[9px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                        >
                          {copiedCode === claim.code ? <Check size={10} /> : <Copy size={10} />}
                          <span>{copiedCode === claim.code ? 'Copié' : 'Copier'}</span>
                        </button>
                      ) : (
                        <span className="text-[9px] text-zinc-600 uppercase">Utilisé</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-zinc-400 font-sans leading-tight">
                  Collez simplement votre code promo lors de votre commande pour appliquer la réduction immédiate.
                </p>
              </div>
            )}
          </div>

          {/* Interactive Role Selector */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">Changer de mode d'interface</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => {
                  onChangeRole('client');
                  onClose();
                }}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  currentRole === 'client'
                    ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-[#FF5C00]'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
                }`}
              >
                <User size={15} />
                <span className="text-[8px] font-black uppercase tracking-wider">Foodie</span>
              </button>
              <button
                onClick={() => {
                  onChangeRole('restaurant');
                  onClose();
                }}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  currentRole === 'restaurant'
                    ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-[#FF5C00]'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
                }`}
              >
                <ChefHat size={15} />
                <span className="text-[8px] font-black uppercase tracking-wider">Chef</span>
              </button>
              <button
                onClick={() => {
                  onChangeRole('courier');
                  onClose();
                }}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  currentRole === 'courier'
                    ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-[#FF5C00]'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
                }`}
              >
                <Truck size={15} />
                <span className="text-[8px] font-black uppercase tracking-wider">Livreur</span>
              </button>
            </div>
          </div>

          {/* Preferences & Video Feed Settings */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">Préférences & Lecture Video</label>
            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl border transition-all ${
                    isAutoPlayEnabled 
                      ? 'bg-[#FF5C00]/10 border-[#FF5C00]/30 text-[#FF5C00]' 
                      : 'bg-zinc-800/50 border-white/5 text-zinc-400'
                  }`}>
                    <Play size={14} className={isAutoPlayEnabled ? 'fill-current' : ''} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">Lecture automatique</p>
                    <p className="text-[9px] text-zinc-400 font-sans leading-normal">
                      Lancer les vidéos automatiquement au défilement
                    </p>
                  </div>
                </div>
                
                {/* Custom Accessible Switch Button */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAutoPlayEnabled}
                  onClick={onToggleAutoPlay}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAutoPlayEnabled ? 'bg-[#FF5C00]' : 'bg-zinc-700'
                  }`}
                >
                  <span className="sr-only">Activer/Désactiver la lecture automatique</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isAutoPlayEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions Portal */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">Communauté & Commandes</label>
            <div className="space-y-2">
              {/* Google Contacts Link */}
              {onOpenContacts && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenContacts();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 hover:from-amber-500/20 hover:to-yellow-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-black uppercase transition-all flex items-center justify-between shadow-md cursor-pointer"
                  title="Mes Contacts Google — Inviter & Offrir un repas"
                >
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-amber-400" />
                    <span>Mes Contacts Google</span>
                  </div>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Inviter & Offrir
                  </span>
                </button>
              )}

              {/* Live Orders Tracker link */}
              {currentRole === 'client' && (
                <button
                  onClick={() => {
                    onOpenOrdersHistory();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-white text-[11px] font-bold uppercase transition-all flex items-center justify-between border border-white/5 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Bell size={13} className="text-[#FF5C00]" />
                    <span>Mes commandes en cours</span>
                  </div>
                  {activeOrderCount > 0 ? (
                    <span className="bg-[#FF5C00] text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                      {activeOrderCount} ACTIVE(S)
                    </span>
                  ) : (
                    <span className="text-[9px] text-zinc-500">Aucune</span>
                  )}
                </button>
              )}

              {/* Admin CMS controller inside profile modal (Only for super-administrator) */}
              {(user?.role === 'admin' || user?.email?.toLowerCase() === 'sybis.co@gmail.com') && (
                <button
                  onClick={() => {
                    onOpenAdmin();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-zinc-950 to-zinc-900 border border-amber-500/30 hover:border-amber-500 text-amber-400 text-[11px] font-black uppercase transition-all flex items-center justify-between shadow-md cursor-pointer"
                  title="Ouvrir le CMS Administrateur (Shopify-Style)"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">👑</span>
                    <span>Portail Admin CMS</span>
                  </div>
                  <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                    Shopify Style
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer info badge */}
        <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-center gap-1 text-[8px] text-zinc-600 font-mono">
          <ShieldCheck size={10} className="text-green-500" />
          <span>FIDFUD SECURE PLATFORM • PROGRAMME FIDÉLITÉ VÉRIFIÉ</span>
        </div>
      </div>
    </div>
  );
}
