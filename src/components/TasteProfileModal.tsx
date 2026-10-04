import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  ChefHat, 
  Heart, 
  Flame, 
  Info, 
  Sliders, 
  RefreshCw, 
  TrendingUp, 
  Utensils, 
  Check, 
  ShoppingBag,
  Award,
  Zap
} from 'lucide-react';
import { Dish, Order, Restaurant, TasteProfile, User } from '../types';
import { AITasteProfileEngine, FLAVOR_ATTRIBUTES } from '../services/AITasteProfileEngine';
import { notify } from '../utils/notify';

interface TasteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  user: User | null;
  dishes: Dish[];
  restaurants: Restaurant[];
  subscriptions?: string[];
  onApplySortOrder?: (order: 'taste_profile') => void;
  onApplyFilter?: () => void;
}

export default function TasteProfileModal({
  isOpen,
  onClose,
  orders,
  user,
  dishes,
  restaurants,
  subscriptions = [],
  onApplySortOrder,
  onApplyFilter
}: TasteProfileModalProps) {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'customize' | 'how_it_works'>('profile');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Load and refresh profile
  const reloadProfile = () => {
    const p = AITasteProfileEngine.buildTasteProfile(orders, user, dishes, restaurants, subscriptions);
    setProfile(p);
    setCustomTags(p.customTasteTags || []);
  };

  useEffect(() => {
    if (isOpen) {
      reloadProfile();
    }
  }, [isOpen, orders, user, dishes, restaurants, subscriptions]);

  // Handle custom tag toggles
  const handleToggleTag = (tagId: string) => {
    setIsUpdating(true);
    let nextTags: string[];
    if (customTags.includes(tagId)) {
      nextTags = customTags.filter(t => t !== tagId);
    } else {
      nextTags = [...customTags, tagId];
    }
    setCustomTags(nextTags);
    AITasteProfileEngine.setCustomTasteTags(nextTags);

    // Rebuild profile
    setTimeout(() => {
      reloadProfile();
      setIsUpdating(false);
      notify("👅 PROFIL MIS À JOUR", "Vos préférences gustatives ont été appliquées au flux vidéo !", "success");
    }, 150);
  };

  const handleResetCustomTags = () => {
    setCustomTags([]);
    AITasteProfileEngine.setCustomTasteTags([]);
    reloadProfile();
    notify("🔄 RÉINITIALISÉ", "Les ajustements manuels ont été réinitialisés.", "info");
  };

  if (!isOpen || !profile) return null;

  return (
    <div 
      id="modal-taste-profile"
      className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(255,92,0,0.2)] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF5C00] via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-[#FF5C00]/25">
              <Sparkles size={22} className="animate-pulse text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5C00] bg-[#FF5C00]/10 border border-[#FF5C00]/20 px-2 py-0.5 rounded-md font-mono">
                  Moteur IA Prédictif
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                  Profil Gustatif
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate mt-0.5 flex items-center gap-2">
                <span>Mon Profil Gustatif IA</span>
                {isUpdating && <RefreshCw size={14} className="animate-spin text-[#FF5C00]" />}
              </h2>
            </div>
          </div>

          <button
            id="btn-close-taste-profile-modal"
            onClick={onClose}
            className="p-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-all cursor-pointer shadow-md"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 pb-2 bg-zinc-950 border-b border-zinc-850 flex items-center gap-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            id="tab-taste-overview"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-[#FF5C00] to-purple-600 text-white shadow-lg shadow-[#FF5C00]/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <Utensils size={14} />
            <span>Mon ADN Culinaire</span>
          </button>

          <button
            id="tab-taste-customize"
            onClick={() => setActiveTab('customize')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'customize'
                ? 'bg-gradient-to-r from-[#FF5C00] to-purple-600 text-white shadow-lg shadow-[#FF5C00]/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <Sliders size={14} />
            <span>Personnaliser mes goûts</span>
            {customTags.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-black font-black text-[9px] flex items-center justify-center">
                {customTags.length}
              </span>
            )}
          </button>

          <button
            id="tab-taste-how"
            onClick={() => setActiveTab('how_it_works')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'how_it_works'
                ? 'bg-gradient-to-r from-[#FF5C00] to-purple-600 text-white shadow-lg shadow-[#FF5C00]/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850 border border-zinc-800'
            }`}
          >
            <Info size={14} />
            <span>Algorithme IA</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-zinc-200 custom-scrollbar">

          {/* TAB 1: Profile Overview */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in">
              {/* Persona Card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950/40 via-zinc-900 to-black p-5 border border-purple-500/30 shadow-xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-[#FF5C00] flex items-center justify-center text-3xl shadow-lg shrink-0">
                    {profile.topFlavorAttributes[0]?.icon || '👑'}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1">
                      <Award size={12} /> Persona Gourmand Détecté
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                      {profile.personaTitle}
                    </h3>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      {profile.personaDescription}
                    </p>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10">
                  <div className="bg-black/40 rounded-2xl p-2.5 border border-white/5 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Sélections</span>
                    <span className="text-sm sm:text-base font-black text-white">{profile.totalDishSelectionsCount}</span>
                  </div>
                  <div className="bg-black/40 rounded-2xl p-2.5 border border-white/5 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Commandes</span>
                    <span className="text-sm sm:text-base font-black text-[#FF5C00]">{profile.totalOrdersCount}</span>
                  </div>
                  <div className="bg-black/40 rounded-2xl p-2.5 border border-white/5 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Budget Plat</span>
                    <span className="text-sm sm:text-base font-black text-emerald-400">{profile.preferredPriceRange.average.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* Flavor Affinities Spectrum */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Flame size={14} className="text-[#FF5C00]" />
                    <span>Spectre de Vos Affinités de Saveurs</span>
                  </h4>
                  <span className="text-[10px] text-zinc-400">Pondéré par commandes & likes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {profile.topFlavorAttributes.map((attr) => {
                    const maxScore = Math.max(1, profile.topFlavorAttributes[0]?.score || 1);
                    const percent = Math.min(100, Math.max(8, Math.round((attr.score / maxScore) * 100)));
                    const isTop = attr.score === maxScore && attr.score > 0;

                    return (
                      <div 
                        key={attr.attribute}
                        className={`p-3 rounded-2xl border transition-all ${
                          isTop 
                            ? 'bg-gradient-to-r from-[#FF5C00]/15 via-purple-500/10 to-transparent border-[#FF5C00]/40' 
                            : 'bg-zinc-900/60 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>{attr.icon}</span>
                            <span>{attr.label}</span>
                          </span>
                          <span className={`text-[10px] font-black font-mono ${isTop ? 'text-[#FF5C00]' : 'text-zinc-400'}`}>
                            {percent}% Match
                          </span>
                        </div>

                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isTop 
                                ? 'bg-gradient-to-r from-[#FF5C00] to-purple-500' 
                                : 'bg-gradient-to-r from-zinc-600 to-zinc-400'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Engaged Establishments */}
              {profile.topEngagedRestaurants.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <ChefHat size={14} className="text-purple-400" />
                    <span>Vos Établissements Fétiches</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {profile.topEngagedRestaurants.map((rest, idx) => (
                      <div 
                        key={rest.restaurantId}
                        className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-xs text-white shrink-0">
                            #{idx + 1}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-black text-white truncate">{rest.restaurantName}</h5>
                            <p className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                              {rest.orderCount > 0 && <span>🛍️ {rest.orderCount} commande(s)</span>}
                              {profile.favoriteRestaurantIds.includes(rest.restaurantId) && (
                                <span className="text-red-400 flex items-center gap-0.5">
                                  <Heart size={10} className="fill-red-400" /> Favori
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono shrink-0">
                          Top Match
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Customize Taste Preferences */}
          {activeTab === 'customize' && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent border border-amber-500/20 rounded-2xl p-4">
                <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={14} className="text-amber-400" />
                  <span>Ajuster Vos Goûts en Temps Réel</span>
                </h4>
                <p className="text-xs text-zinc-300 mt-1">
                  Activez ou désactivez les saveurs et envies du moment. L'algorithme priorise instantanément les vidéos et plats correspondants dans votre flux !
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase tracking-wider">Saveurs & Ambiances</span>
                  {customTags.length > 0 && (
                    <button 
                      onClick={handleResetCustomTags}
                      className="text-[10px] font-bold text-zinc-400 hover:text-red-400 underline cursor-pointer"
                    >
                      Réinitialiser tout
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FLAVOR_ATTRIBUTES.map((attr) => {
                    const isSelected = customTags.includes(attr.id);
                    return (
                      <button
                        key={attr.id}
                        onClick={() => handleToggleTag(attr.id)}
                        className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#FF5C00]/25 to-purple-600/25 border-[#FF5C00] shadow-lg shadow-[#FF5C00]/20 scale-[1.01]'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-850'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{attr.icon}</span>
                          <div>
                            <p className="text-xs font-black text-white">{attr.label}</p>
                            <p className="text-[10px] text-zinc-400 truncate max-w-[180px]">
                              {attr.keywords.slice(0, 3).join(', ')}...
                            </p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#FF5C00] border-[#FF5C00] text-white'
                            : 'border-zinc-700 bg-zinc-800'
                        }`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: How It Works */}
          {activeTab === 'how_it_works' && (
            <div className="space-y-4 animate-fade-in text-xs leading-relaxed">
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                <h4 className="font-black text-white uppercase text-xs flex items-center gap-2">
                  <Sparkles size={14} className="text-[#FF5C00]" />
                  <span>Architecture de l'Algorithme de Tri 'AI Taste Profile'</span>
                </h4>
                <p className="text-zinc-300">
                  Contrairement aux algorithmes génériques qui se contentent de mesurer la popularité brute, le moteur <strong>AI Taste Profile</strong> de Fidfud analyse 5 vecteurs de données en continu pour vous proposer les plats les plus irrésistibles :
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#FF5C00]/20 border border-[#FF5C00]/30 text-[#FF5C00] font-black text-xs flex items-center justify-center shrink-0">
                    35%
                  </div>
                  <div>
                    <h5 className="font-black text-white text-xs">Affinité Saveurs & Ingrédients du Plat</h5>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      Analyse textuelle et sémantique des ingrédients, tags diététiques (Halal, Bio, Fait Maison...) et associations culinaires par rapport à vos choix passés.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 font-black text-xs flex items-center justify-center shrink-0">
                    30%
                  </div>
                  <div>
                    <h5 className="font-black text-white text-xs">Fidélité & Engagement Établissement</h5>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      Bonus accordé aux restaurants où vous commandez régulièrement, ceux enregistrés en favoris et les chefs dont vous suivez la chaîne.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                    15%
                  </div>
                  <div>
                    <h5 className="font-black text-white text-xs">Cohérence Culinaro-Catégorielle</h5>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      Pondération de la cuisine du restaurant (italienne, japonaise, street food, gastronomique, burger...) selon vos commandes habituelles.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
                    10%
                  </div>
                  <div>
                    <h5 className="font-black text-white text-xs">Sweet Spot Budgétaire</h5>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      Calibration gaussienne autour de votre panier moyen habituel ({profile.preferredPriceRange.average.toFixed(2)} €) pour vous proposer des plats accessibles.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">
                    10%
                  </div>
                  <div>
                    <h5 className="font-black text-white text-xs">Sérendipité & Découvertes d'Élite</h5>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      Évite l'effet de bulle en injectant intelligemment de nouvelles pépites culinaires certifiées partageant des notes de saveurs avec votre profil.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Action */}
        <div className="p-5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs text-zinc-300 font-medium">Algorithme actif</span>
          </div>

          <div className="flex items-center gap-3">
            {(onApplySortOrder || onApplyFilter) && (
              <button
                id="btn-apply-taste-sort"
                onClick={() => {
                  if (onApplySortOrder) {
                    onApplySortOrder('taste_profile');
                  }
                  if (onApplyFilter) {
                    onApplyFilter();
                  }
                  onClose();
                  notify("👅 TRI ACTIVÉ", "Le feed vidéo est maintenant trié par votre Profil Gustatif IA !", "success");
                }}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF5C00] to-purple-600 hover:from-[#ff6d1a] hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-[#FF5C00]/25 cursor-pointer hover:scale-102 active:scale-95 transition-all"
              >
                <Sparkles size={14} />
                <span>Appliquer au Feed Vidéo</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
