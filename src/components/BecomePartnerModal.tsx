import React, { useState } from 'react';
import AddressAutocomplete from './AddressAutocomplete';
import { 
  X, 
  Store, 
  Video, 
  ChefHat, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  DollarSign, 
  HelpCircle, 
  Tv, 
  Users, 
  Star, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Zap, 
  Building, 
  Globe, 
  Award,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { PartnerProfileType, MerchantApplication } from '../types';

interface BecomePartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  accentColor?: string;
  designSettings?: any;
}

export const BecomePartnerModal: React.FC<BecomePartnerModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  accentColor = '#FF5C00',
  designSettings
}) => {
  // State for active profile tab showcase
  const [selectedProfileTab, setSelectedProfileTab] = useState<PartnerProfileType>('restaurateur');

  // Revenue simulator state
  const [simProfile, setSimProfile] = useState<PartnerProfileType>('restaurateur');
  const [simFreq, setSimFreq] = useState<number>(3); // broadcasts/week
  const [simAudience, setSimAudience] = useState<number>(250); // viewers/show
  const [simTicket, setSimTicket] = useState<number>(22); // average €/order or ticket

  // Multi-step signup form state
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);
  const [formType, setFormType] = useState<PartnerProfileType>('restaurateur');
  
  // Form fields
  const [applicantName, setApplicantName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Paris');

  // Restaurateur fields
  const [establishmentName, setEstablishmentName] = useState('');
  const [siret, setSiret] = useState('');
  const [cuisineCategory, setCuisineCategory] = useState('Street Food / Burgers');

  // Foodie YouTuber fields
  const [channelName, setChannelName] = useState('');
  const [socialPlatform, setSocialPlatform] = useState<'youtube' | 'tiktok' | 'instagram' | 'other'>('youtube');
  const [platformHandle, setPlatformHandle] = useState('');
  const [followerCount, setFollowerCount] = useState('50K - 100K');

  // Masterclass host fields
  const [showTitle, setShowTitle] = useState('');
  const [cookingDiscipline, setCookingDiscipline] = useState('Pâtisserie & Desserts Gourmands');
  const [masterclassPrice, setMasterclassPrice] = useState('12.90');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<MerchantApplication | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // FAQ open state
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({ 0: true });

  if (!isOpen) return null;

  // Calculate estimated monthly revenue based on profile & sliders
  const calculateEstimatedEarnings = () => {
    const showsPerMonth = simFreq * 4.33;
    let conversionRate = 0.08; // 8% of viewers convert to order or ticket
    let commissionShare = 0.88; // Partner retains 88% on average

    if (simProfile === 'restaurateur') {
      conversionRate = 0.12; // High conversion for food delivery live
      commissionShare = 0.85; // 85% retained
    } else if (simProfile === 'foodie_reviewer') {
      conversionRate = 0.06; // 6% conversion on restaurant dish tags
      commissionShare = 0.10; // 10% affiliate commission on dish price
    } else if (simProfile === 'culinary_show_host') {
      conversionRate = 0.09; // 9% buys masterclass tickets or sends tips
      commissionShare = 0.85; // 85% ticket revenue retained
    }

    const monthlyOrdersOrTickets = Math.round(showsPerMonth * simAudience * conversionRate);
    const grossVolume = monthlyOrdersOrTickets * simTicket;
    const netRevenue = Math.round(grossVolume * commissionShare);

    return { monthlyOrdersOrTickets, grossVolume, netRevenue };
  };

  const earnings = calculateEstimatedEarnings();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const payload = {
        partnerType: formType,
        applicantName,
        email,
        phone,
        city,
        establishmentName: formType === 'restaurateur' ? establishmentName : undefined,
        siret: formType === 'restaurateur' ? siret : undefined,
        cuisineCategory: formType === 'restaurateur' ? cuisineCategory : undefined,
        channelName: formType === 'foodie_reviewer' ? channelName : undefined,
        socialPlatform: formType === 'foodie_reviewer' ? socialPlatform : undefined,
        platformHandle: formType === 'foodie_reviewer' ? platformHandle : undefined,
        followerCount: formType === 'foodie_reviewer' ? followerCount : undefined,
        showTitle: formType === 'culinary_show_host' ? showTitle : undefined,
        cookingDiscipline: formType === 'culinary_show_host' ? cookingDiscipline : undefined,
        masterclassPrice: formType === 'culinary_show_host' ? masterclassPrice : undefined,
      };

      const res = await fetch('/api/merchant-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la soumission de votre dossier.');
      }

      setSubmittedApp(data.application);
      setFormStep(4); // Confirmation step
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl overflow-y-auto font-sans text-white select-none">
      
      {/* 1. TOP ANNOUNCEMENT BANNER FOR CONSUMERS / EATERS */}
      <div className="bg-gradient-to-r from-amber-600 via-[#FF5C00] to-rose-600 px-4 py-2 text-center text-xs font-black uppercase tracking-wider flex items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-2 mx-auto truncate">
          <span className="bg-black/30 px-2 py-0.5 rounded-md text-[10px] font-mono">ESPACE PRO & CRÉATEURS</span>
          <span className="hidden sm:inline">Vous êtes un client gourmand qui cherche à commander ou regarder des lives ?</span>
          <span className="sm:hidden">Vous cherchez à commander un repas ?</span>
        </div>
        <button 
          onClick={() => {
            onClose();
            if (onOpenAuth) onOpenAuth('signup');
          }}
          className="bg-black text-white hover:bg-zinc-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 cursor-pointer transition-transform active:scale-95 flex items-center gap-1 shadow-md"
        >
          Espace Gourmand ➔
        </button>
      </div>

      {/* 2. MAIN HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#09090B]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            style={{ backgroundColor: accentColor }}
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(255,92,0,0.4)]"
          >
            🍳
          </div>
          <div>
            <span className="text-sm font-black uppercase tracking-tight italic flex items-center gap-1.5">
              FIDFUD <span className="text-[10px] bg-[#FF5C00]/20 text-[#FF5C00] border border-[#FF5C00]/40 font-mono px-2 py-0.5 rounded-full font-bold">PARTENAIRES</span>
            </span>
            <p className="text-[10px] text-zinc-400 hidden sm:block font-sans">
              La Marketplace Live-Shopping de la Gastronomie
            </p>
          </div>
        </div>

        {/* Quick Nav & Close */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              const el = document.getElementById('signup-form-anchor');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hidden md:flex bg-[#FF5C00] hover:bg-[#FF3E00] text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg transition-all cursor-pointer items-center gap-1.5"
          >
            Déposer ma Candidature
          </button>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* 3. HERO SECTION - INSPIRED BY UBER EATS MERCHANTS */}
      <section className="relative overflow-hidden py-12 md:py-20 px-4 sm:px-8 md:px-16 border-b border-white/10 bg-gradient-to-b from-[#0F0F11] via-[#09090B] to-[#050506]">
        {/* Background Mesh Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-40" />

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          
          {/* Left Column: Headlines & Key Value Props */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#FF5C00]/10 border border-[#FF5C00]/30 px-3.5 py-1.5 rounded-full">
              <Sparkles size={14} className="text-[#FF5C00]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5C00]">
                PROGRAMME PARTENAIRE & CRÉATEURS 2026
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-[1.05] text-white">
              Développez vos ventes et votre notoriété grâce au <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5C00] via-amber-400 to-rose-500">Live Cooking</span>
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-zinc-300 font-sans leading-relaxed">
              Fidfud est la première plateforme vidéo interactive qui réunit les <strong>restaurateurs</strong>, les <strong>YouTubers gourmands</strong> et les <strong>chefs animateurs</strong>. Présentez votre cuisine en direct, gérez les commandes de livraison en temps réel et monétisez votre savoir-faire.
            </p>

            {/* Key Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-md">
                <span className="text-xl font-black text-[#FF5C00] font-mono block">+35%</span>
                <span className="text-[10px] text-zinc-400 font-sans uppercase font-bold">Panier Moyen en Live</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-md">
                <span className="text-xl font-black text-amber-400 font-mono block">24h SLA</span>
                <span className="text-[10px] text-zinc-400 font-sans uppercase font-bold">Validation du Dossier</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-md col-span-2 sm:col-span-1">
                <span className="text-xl font-black text-emerald-400 font-mono block">Stripe 24h</span>
                <span className="text-[10px] text-zinc-400 font-sans uppercase font-bold">Encaissement Direct</span>
              </div>
            </div>

            {/* Direct Badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-1 font-sans">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-400" /> Zéro frais d'installation</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-400" /> Kit caméra fourni</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-400" /> Sans engagement</span>
            </div>
          </div>

          {/* Right Column: Quick Application Box */}
          <div className="lg:col-span-5">
            <div className="bg-[#121216] border border-white/15 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-5 relative">
              <div className="absolute -top-3 right-6 bg-gradient-to-r from-[#FF5C00] to-rose-600 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                ⚡ INSCRIPTION EN 2 MIN
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black uppercase italic text-white tracking-tight">
                  Rejoindre le Réseau Partenaire
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  Choisissez votre profil et commencez à diffuser en direct.
                </p>
              </div>

              {/* Profile selector buttons in quick box */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'restaurateur' as PartnerProfileType, icon: Store, title: 'Restaurateur' },
                  { type: 'foodie_reviewer' as PartnerProfileType, icon: Video, title: 'YouTuber Foodie' },
                  { type: 'culinary_show_host' as PartnerProfileType, icon: ChefHat, title: 'Show Culinaire' }
                ].map((p) => {
                  const Icon = p.icon;
                  const isSel = formType === p.type;
                  return (
                    <button
                      key={p.type}
                      type="button"
                      onClick={() => {
                        setFormType(p.type);
                        setSimProfile(p.type);
                      }}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
                        isSel 
                          ? 'bg-[#FF5C00]/20 border-[#FF5C00] text-white shadow-lg' 
                          : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <Icon size={20} className={isSel ? 'text-[#FF5C00]' : 'text-zinc-400'} />
                      <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{p.title}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  const el = document.getElementById('signup-form-anchor');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-gradient-to-r from-[#FF5C00] to-amber-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-[#FF5C00]/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                Remplir ma candidature ➔
              </button>

              <div className="pt-2 text-center border-t border-white/10">
                <p className="text-[10px] text-zinc-500 font-sans">
                  Déjà partenaire ?{' '}
                  <button 
                    onClick={() => {
                      onClose();
                      if (onOpenAuth) onOpenAuth('login');
                    }} 
                    className="text-white hover:underline font-bold"
                  >
                    Se connecter à l'espace marchand
                  </button>
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. THE 3 CORE PARTNER LEVELS / PROFILES SHOWCASE */}
      <section className="py-16 px-4 sm:px-8 md:px-16 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-[10px] font-black text-[#FF5C00] font-mono uppercase tracking-widest bg-[#FF5C00]/10 border border-[#FF5C00]/30 px-3 py-1 rounded-full">
            TROIS PARCOURS SUR MESURE
          </span>
          <h2 className="text-2xl sm:text-4xl font-black uppercase italic tracking-tight text-white">
            Choisissez votre profil partenaire
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
            Que vous soyez un établissement physique, un créateur de contenu vidéo ou un chef dispensant des formations, Fidfud s'adapte parfaitement à votre modèle.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center border-b border-white/10 overflow-x-auto">
          <div className="flex gap-2 sm:gap-4 pb-px">
            {[
              { id: 'restaurateur' as PartnerProfileType, icon: Store, label: '1. Restaurateur & Artisan', badge: 'Ventes & Livraison' },
              { id: 'foodie_reviewer' as PartnerProfileType, icon: Video, label: '2. YouTuber Foodie & Reviewer', badge: 'Critique & Affiliation' },
              { id: 'culinary_show_host' as PartnerProfileType, icon: ChefHat, label: '3. Show Culinaire & Masterclass', badge: 'Cours & Formations' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedProfileTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedProfileTab(tab.id)}
                  className={`px-4 py-3 border-b-2 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'border-[#FF5C00] text-white bg-white/5 rounded-t-xl'
                      : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5 rounded-t-xl'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-[#FF5C00]' : 'text-zinc-400'} />
                  <span>{tab.label}</span>
                  <span className="text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded text-zinc-300 font-normal">
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1 Content: RESTAURATEUR */}
        {selectedProfileTab === 'restaurateur' && (
          <div className="bg-[#0F0F12] border border-white/10 rounded-3xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in shadow-2xl">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
                <Store size={14} /> RESTAURATEUR / BOUTIQUE / DARK KITCHEN
              </div>

              <h3 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white">
                Filmez la vie de votre cuisine et vendez vos plats en direct !
              </h3>

              <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
                Transformez les moments de préparation en véritable levier de vente. Grâce au widget vidéo interactif Fidfud, les spectateurs voient vos cuisiniers à l'œuvre et commandent leurs plats préférés en un clic avec livraison immédiate ou Click & Collect.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex gap-3 items-start">
                  <CheckCircle2 size={18} className="text-[#FF5C00] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block font-bold">Overlay d'Achat Réactif en Direct</strong>
                    <span className="text-xs text-zinc-400 font-sans">Les fiches plats apparaissent sur l'écran pendant que vous cuisinez. Achat en 1 tap.</span>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <CheckCircle2 size={18} className="text-[#FF5C00] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block font-bold">Module Anti-Gaspillage & Ventes Flash</strong>
                    <span className="text-xs text-zinc-400 font-sans">Proposez vos surplus du jour avec un décompte en direct pour booster les commandes de fin de service.</span>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <CheckCircle2 size={18} className="text-[#FF5C00] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block font-bold">Flotte de Livreurs Partenaires Intégrée</strong>
                    <span className="text-xs text-zinc-400 font-sans">Vos plats sont emportés par nos éco-coursiers dès que la commande est prête.</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    setFormType('restaurateur');
                    const el = document.getElementById('signup-form-anchor');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-[#FF5C00] hover:bg-[#FF3E00] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg cursor-pointer transition-transform active:scale-95 inline-flex items-center gap-2"
                >
                  Devenir Restaurateur Partenaire ➔
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="aspect-video sm:aspect-square rounded-2xl overflow-hidden border border-white/10 relative shadow-xl">
                <img 
                  src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80" 
                  alt="Restaurateur en cuisine" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md p-3.5 rounded-xl border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                      ● LIVE KITCHEN ACTIF
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold">1,420 Vues</span>
                  </div>
                  <p className="text-xs font-black text-white italic">La Pizza Napolitaine du Chef Roberto</p>
                  <p className="text-[10px] text-zinc-300">14.50€ • Commande livrée en 18 min</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2 Content: FOODIE YOUTUBER & REVIEWER */}
        {selectedProfileTab === 'foodie_reviewer' && (
          <div className="bg-[#0F0F12] border border-white/10 rounded-3xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in shadow-2xl">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
                <Video size={14} /> YOUTUBER FOODIE / CRITIQUE / CRÉATEUR DE CONTENU
              </div>

              <h3 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white">
                Testez les restaurants en live et touchez des commissions d'affiliation !
              </h3>

              <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
                Vous réalisez des vlogs, des tests de restaurants ou des dégustations sur YouTube, TikTok ou Instagram ? Rejoignez Fidfud ! Diffusez vos testings en direct, attribuez vos notes et badges gourmands, et percevez des commissions sur chaque plat commandé par votre audience.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex gap-3 items-start">
                  <CheckCircle2 size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block font-bold">Affiliation Directe sur les Plats (5% à 12%)</strong>
                    <span className="text-xs text-zinc-400 font-sans">Chaque fois qu'un spectateur commande le plat que vous testez pendant votre live, vous touchez une commission d'affiliation.</span>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <CheckCircle2 size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block font-bold">Attribution de Badges & Notes Certifiées</strong>
                    <span className="text-xs text-zinc-400 font-sans">Votre note et votre avis "Foodie Certifié" sont épinglés sur la fiche du restaurant et renforcent sa réputation.</span>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <CheckCircle2 size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block font-bold">Repas Offerts & Invitations VIP</strong>
                    <span className="text-xs text-zinc-400 font-sans">Accédez aux dégustations exclusives organisées par les meilleurs restaurateurs de votre région.</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    setFormType('foodie_reviewer');
                    const el = document.getElementById('signup-form-anchor');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg cursor-pointer transition-transform active:scale-95 inline-flex items-center gap-2"
                >
                  Postuler comme Créateur Foodie ➔
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="aspect-video sm:aspect-square rounded-2xl overflow-hidden border border-white/10 relative shadow-xl">
                <img 
                  src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80" 
                  alt="YouTuber testing a restaurant" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md p-3.5 rounded-xl border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
                      ⭐ CRITIQUE EN DIRECT
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">+18 Commandes générées</span>
                  </div>
                  <p className="text-xs font-black text-white italic">"Le meilleur Smash Burger de Paris ?" - Test par @CamilleFoodieTV</p>
                  <p className="text-[10px] text-zinc-300">Note attribuée : 9.8/10 🏆 • Commission d'affiliation active</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3 Content: CULINARY SHOW HOST & MASTERCLASS */}
        {selectedProfileTab === 'culinary_show_host' && (
          <div className="bg-[#0F0F12] border border-white/10 rounded-3xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in shadow-2xl">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
                <ChefHat size={14} /> HÔTE DE SHOW CULINAIRE / MASTERCLASS / FORMATEUR
              </div>

              <h3 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white">
                Lancez votre chaîne de Shows Culinaires et de Masterclasses payantes !
              </h3>

              <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
                Vous aimez partager vos recettes secretes, dispenser des cours de cuisine ou animer des émissions gourmandes toute la journée ? Fidfud vous offre la suite complète pour monétiser vos diffusions via des billets de masterclass, des pourboires en live et la vente de kits d'ingrédients.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex gap-3 items-start">
                  <CheckCircle2 size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block font-bold">Billetterie de Masterclass & Cours Privés</strong>
                    <span className="text-xs text-zinc-400 font-sans">Fixez le prix de vos cours en direct (ex: 14.90€ / émission) et recevez votre billetterie directement sur votre compte.</span>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <CheckCircle2 size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block font-bold">Pourboires & Cadeaux Virtuels en Live</strong>
                    <span className="text-xs text-zinc-400 font-sans">Les spectateurs vous soutiennent en direct en vous envoyant des toques dorées, des ingrédient-tips et des dons.</span>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <CheckCircle2 size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block font-bold">Kits D'Ingrédients Livrés pour Cuisiner Ensemble</strong>
                    <span className="text-xs text-zinc-400 font-sans">Proposez le kit d'ingrédients de votre recette livré chez vos élèves 1h avant le début de votre émission.</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    setFormType('culinary_show_host');
                    const el = document.getElementById('signup-form-anchor');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg cursor-pointer transition-transform active:scale-95 inline-flex items-center gap-2"
                >
                  Créer ma Chaîne de Masterclass ➔
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="aspect-video sm:aspect-square rounded-2xl overflow-hidden border border-white/10 relative shadow-xl">
                <img 
                  src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=80" 
                  alt="Chef teaching a cooking masterclass" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md p-3.5 rounded-xl border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-rose-400 font-bold flex items-center gap-1">
                      🎓 MASTERCLASS INTERACTIVE
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">85 Élèves en direct</span>
                  </div>
                  <p className="text-xs font-black text-white italic">"Masterclass Ramen Maison & Bouillon Secret" par Chef Youssef</p>
                  <p className="text-[10px] text-zinc-300">Accès : 14.90€ • Kit d'ingrédients expédié</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 5. INTERACTIVE EARNINGS SIMULATOR */}
      <section className="py-16 px-4 sm:px-8 md:px-16 bg-[#0B0B0E] border-t border-b border-white/10">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-black text-amber-400 font-mono uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
              ESTIMATEUR DE REVENUS EN TEMPS RÉEL
            </span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase italic tracking-tight text-white">
              Calculez vos gains potentiels sur Fidfud
            </h2>
            <p className="text-xs text-zinc-400 font-sans max-w-xl mx-auto">
              Ajustez les curseurs ci-dessous en fonction de votre profil et de votre rythme de diffusion pour estimer votre chiffre d'affaires mensuel.
            </p>
          </div>

          <div className="bg-[#121217] border border-white/15 p-6 sm:p-10 rounded-3xl grid grid-cols-1 lg:grid-cols-12 gap-8 shadow-2xl">
            {/* Left Controls */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Profile selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">1. Type de Profil</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'restaurateur' as PartnerProfileType, label: '🏪 Restaurateur' },
                    { id: 'foodie_reviewer' as PartnerProfileType, label: '🎥 YouTuber Foodie' },
                    { id: 'culinary_show_host' as PartnerProfileType, label: '🍳 Masterclass Chef' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSimProfile(p.id)}
                      className={`p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                        simProfile === p.id 
                          ? 'bg-[#FF5C00] border-[#FF5C00] text-white shadow-md' 
                          : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider 1: Broadcast frequency */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-sans">
                  <span className="font-bold text-zinc-300">Émissions / Lives par semaine :</span>
                  <span className="font-black text-[#FF5C00] font-mono text-sm">{simFreq} lives / sem</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="14" 
                  value={simFreq} 
                  onChange={e => setSimFreq(Number(e.target.value))}
                  className="w-full accent-[#FF5C00] cursor-pointer"
                />
              </div>

              {/* Slider 2: Viewers count */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-sans">
                  <span className="font-bold text-zinc-300">Spectateurs moyens par émission :</span>
                  <span className="font-black text-amber-400 font-mono text-sm">{simAudience} spectateurs</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="2500" 
                  step="50"
                  value={simAudience} 
                  onChange={e => setSimAudience(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Slider 3: Ticket / Dish Price */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-sans">
                  <span className="font-bold text-zinc-300">Prix moyen commande / ticket masterclass :</span>
                  <span className="font-black text-emerald-400 font-mono text-sm">{simTicket} €</span>
                </div>
                <input 
                  type="range" 
                  min="8" 
                  max="60" 
                  value={simTicket} 
                  onChange={e => setSimTicket(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

            </div>

            {/* Right Output Box */}
            <div className="lg:col-span-5 bg-gradient-to-br from-black via-zinc-950 to-black p-6 rounded-2xl border border-white/10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold block">
                  ESTIMATION MENSUELLE NETTE
                </span>
                <div>
                  <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 font-mono">
                    {earnings.netRevenue.toLocaleString('fr-FR')} €
                  </span>
                  <span className="text-xs text-zinc-400 block font-sans mt-1">/ mois directement encaissés sur votre compte</span>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10 text-xs font-sans">
                  <div className="flex justify-between text-zinc-400">
                    <span>Volume de ventes brutes :</span>
                    <strong className="text-white font-mono">{earnings.grossVolume.toLocaleString('fr-FR')} €</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Commandes / Billets par mois :</span>
                    <strong className="text-white font-mono">~{earnings.monthlyOrdersOrTickets} unités</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const el = document.getElementById('signup-form-anchor');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Concrétiser mes revenus ➔
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. COMPARISON MATRIX ACROSS THE 3 LEVELS */}
      <section className="py-16 px-4 sm:px-8 md:px-16 max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white">
            Tableau Comparatif des Niveaux Partenaires
          </h2>
          <p className="text-xs text-zinc-400 font-sans">
            Toutes les réponses pour choisir la formule idéale adaptée à votre activité.
          </p>
        </div>

        <div className="overflow-x-auto border border-white/10 rounded-3xl bg-[#0F0F12]">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-zinc-300">
                <th className="p-4 font-black uppercase tracking-wider text-[10px]">Critère</th>
                <th className="p-4 font-black uppercase tracking-wider text-[10px] text-[#FF5C00]">1. Restaurateur & Artisan</th>
                <th className="p-4 font-black uppercase tracking-wider text-[10px] text-amber-400">2. YouTuber & Foodie Reviewer</th>
                <th className="p-4 font-black uppercase tracking-wider text-[10px] text-rose-400">3. Show Culinaire & Masterclass</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              <tr>
                <td className="p-4 font-bold text-white bg-white/5">Objectif Principal</td>
                <td className="p-4">Vendre des plats en direct & booster la livraison</td>
                <td className="p-4">Tester des restaurants & toucher de l'affiliation</td>
                <td className="p-4">Donner des cours de cuisine & vendre des masterclasses</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-white bg-white/5">Source de Revenus</td>
                <td className="p-4">Ventes de plats (85% reversés)</td>
                <td className="p-4">Commissions d'affiliation (5% à 12%) + Tips</td>
                <td className="p-4">Billetterie Masterclass + Tips + Kit Ingrédients</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-white bg-white/5">Équipement Requis</td>
                <td className="p-4">Smartphone ou Tablette de cuisine (Kit Fidfud fourni)</td>
                <td className="p-4">Smartphone 4K ou Caméra Vlogging</td>
                <td className="p-4">Micro-cravate + Caméra de cuisine bien éclairée</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-white bg-white/5">Gestion de la Livraison</td>
                <td className="p-4">Assurée par nos éco-livreurs partenaires ou Click & Collect</td>
                <td className="p-4">Non applicable (gérée par les restaurants testés)</td>
                <td className="p-4">Optionnelle (Expédition des kits d'ingrédients à domicile)</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-white bg-white/5">Délai de Validation</td>
                <td className="p-4">24h (Vérification SIRET & Hygiène)</td>
                <td className="p-4">24h (Vérification Chaîne / Portfolio)</td>
                <td className="p-4">24h (Validation du programme de cours)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. COMPLETE MULTI-STEP SIGNUP FORM */}
      <section id="signup-form-anchor" className="py-16 px-4 sm:px-8 md:px-16 bg-[#08080A] border-t border-white/10 scroll-mt-20">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-black text-[#FF5C00] font-mono uppercase tracking-widest bg-[#FF5C00]/10 border border-[#FF5C00]/30 px-3 py-1 rounded-full">
              FORMULAIRE INTELUIGENT D'INSCRIPTION
            </span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase italic tracking-tight text-white">
              Déposez votre dossier partenaire
            </h2>
            <p className="text-xs text-zinc-400 font-sans">
              Complétez les étapes ci-dessous pour soumettre votre candidature et accéder au Sandbox Fidfud.
            </p>
          </div>

          <div className="bg-[#121217] border border-[#FF5C00]/30 p-6 sm:p-10 rounded-3xl shadow-2xl relative space-y-6">
            
            {/* Step indicators */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 text-xs font-mono font-bold">
              <span className={`flex items-center gap-1.5 ${formStep >= 1 ? 'text-[#FF5C00]' : 'text-zinc-600'}`}>
                <span className="w-5 h-5 rounded-full bg-[#FF5C00]/20 border border-[#FF5C00] flex items-center justify-center text-[10px]">1</span>
                Profil
              </span>
              <span className="text-zinc-600">➔</span>
              <span className={`flex items-center gap-1.5 ${formStep >= 2 ? 'text-[#FF5C00]' : 'text-zinc-600'}`}>
                <span className="w-5 h-5 rounded-full bg-[#FF5C00]/20 border border-[#FF5C00] flex items-center justify-center text-[10px]">2</span>
                Détails
              </span>
              <span className="text-zinc-600">➔</span>
              <span className={`flex items-center gap-1.5 ${formStep >= 3 ? 'text-[#FF5C00]' : 'text-zinc-600'}`}>
                <span className="w-5 h-5 rounded-full bg-[#FF5C00]/20 border border-[#FF5C00] flex items-center justify-center text-[10px]">3</span>
                Coordonnées
              </span>
            </div>

            {errorMessage && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs font-sans">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* STEP 1: CHOOSE PROFILE */}
            {formStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase italic text-white tracking-wider">
                    Étape 1 : Choisissez votre profil de partenaire
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans">
                    Sélectionnez la catégorie qui décrit le mieux votre activité.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { 
                      type: 'restaurateur' as PartnerProfileType, 
                      icon: Store, 
                      title: '1. Restaurateur & Artisan', 
                      desc: 'Établissement physique, Dark kitchen, Pizzeria, Sushi, Burger...' 
                    },
                    { 
                      type: 'foodie_reviewer' as PartnerProfileType, 
                      icon: Video, 
                      title: '2. YouTuber Foodie', 
                      desc: 'Créateur de contenu vidéo, Testeur de restaurants, Reviewer...' 
                    },
                    { 
                      type: 'culinary_show_host' as PartnerProfileType, 
                      icon: ChefHat, 
                      title: '3. Masterclass Chef', 
                      desc: 'Chef formateur, Animateur de cours de cuisine en direct...' 
                    }
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSel = formType === p.type;
                    return (
                      <div
                        key={p.type}
                        onClick={() => setFormType(p.type)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                          isSel 
                            ? 'bg-[#FF5C00]/20 border-[#FF5C00] text-white shadow-xl' 
                            : 'bg-black/30 border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon size={24} className={isSel ? 'text-[#FF5C00]' : 'text-zinc-400'} />
                          {isSel && <CheckCircle2 size={16} className="text-[#FF5C00]" />}
                        </div>
                        <p className="text-xs font-black uppercase italic text-white">{p.title}</p>
                        <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">{p.desc}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setFormStep(2)}
                    className="bg-[#FF5C00] hover:bg-[#FF3E00] text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    Suivant : Informations de votre profil ➔
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PROFILE SPECIFIC DETAILS */}
            {formStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase italic text-white tracking-wider">
                    Étape 2 : Détails de votre profil ({formType.toUpperCase()})
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans">
                    Renseignez les données spécifiques à votre activité.
                  </p>
                </div>

                {/* Form fields for RESTAURATEUR */}
                {formType === 'restaurateur' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Nom de l'établissement / Restaurant</label>
                      <input 
                        type="text"
                        required
                        placeholder="Ex: Pizzeria La Nonna, Smash Lab..."
                        value={establishmentName}
                        onChange={e => setEstablishmentName(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Numéro SIRET (14 chiffres)</label>
                        <input 
                          type="text"
                          placeholder="Ex: 83489102400018"
                          value={siret}
                          onChange={e => setSiret(e.target.value)}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Catégorie Culinaire</label>
                        <select
                          value={cuisineCategory}
                          onChange={e => setCuisineCategory(e.target.value)}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none"
                        >
                          <option value="Pizza Artisanale">Pizza Artisanale 🍕</option>
                          <option value="Burgers & Grill">Burgers & Grill 🍔</option>
                          <option value="Ramen & Asiat">Ramen & Asiat 🍜</option>
                          <option value="Sushis & Japonais">Sushis & Japonais 🍣</option>
                          <option value="Cuisine Traditionnelle Française">Cuisine Traditionnelle 🍷</option>
                          <option value="Pâtisserie & Desserts">Pâtisserie & Desserts 🍰</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form fields for FOODIE REVIEWER */}
                {formType === 'foodie_reviewer' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Nom de votre chaîne / Marque média</label>
                      <input 
                        type="text"
                        required
                        placeholder="Ex: Camille Foodie Vlogs, Les Dégustations de Thomas..."
                        value={channelName}
                        onChange={e => setChannelName(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Plateforme Principale</label>
                        <select
                          value={socialPlatform}
                          onChange={e => setSocialPlatform(e.target.value as any)}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none"
                        >
                          <option value="youtube">YouTube</option>
                          <option value="tiktok">TikTok</option>
                          <option value="instagram">Instagram</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Handle / Lien de la chaîne</label>
                        <input 
                          type="text"
                          placeholder="Ex: @CamilleFoodieTV"
                          value={platformHandle}
                          onChange={e => setPlatformHandle(e.target.value)}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Taille de l'audience</label>
                        <select
                          value={followerCount}
                          onChange={e => setFollowerCount(e.target.value)}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none"
                        >
                          <option value="10K - 50K">10K - 50K abonnés</option>
                          <option value="50K - 100K">50K - 100K abonnés</option>
                          <option value="100K - 500K">100K - 500K abonnés</option>
                          <option value="500K+">Plus de 500K abonnés</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form fields for CULINARY SHOW HOST */}
                {formType === 'culinary_show_host' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Titre de votre émission / Masterclass</label>
                      <input 
                        type="text"
                        required
                        placeholder="Ex: L'Académie du Ramen, Les Secret de la Pâtisserie..."
                        value={showTitle}
                        onChange={e => setShowTitle(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Discipline / Spécialité</label>
                        <input 
                          type="text"
                          placeholder="Ex: Cuisine Méditerranéenne, Boulangerie, Veggie..."
                          value={cookingDiscipline}
                          onChange={e => setCookingDiscipline(e.target.value)}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Prix moyen masterclass (€)</label>
                        <input 
                          type="number"
                          placeholder="Ex: 14.90"
                          value={masterclassPrice}
                          onChange={e => setMasterclassPrice(e.target.value)}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setFormStep(1)}
                    className="border border-white/20 text-zinc-300 hover:text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                  >
                    ⬅ Étape précédente
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormStep(3)}
                    className="bg-[#FF5C00] hover:bg-[#FF3E00] text-white font-black text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    Suivant : Coordonnées de contact ➔
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CONTACT & VALIDATION */}
            {formStep === 3 && (
              <form onSubmit={handleFormSubmit} className="space-y-6 animate-fade-in">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase italic text-white tracking-wider">
                    Étape 3 : Coordonnées du responsable
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans">
                    Indiquez l'identité de la personne en charge pour recevoir les accès au Dashboard Marchand.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Nom & Prénom du responsable</label>
                    <input 
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Ex: Chef Robert Dubois"
                      value={applicantName}
                      onChange={e => setApplicantName(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Adresse email professionnelle</label>
                    <input 
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Ex: contact@etablissement.fr"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Numéro de téléphone</label>
                    <input 
                      type="tel"
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="Ex: 06 12 34 56 78"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">Ville ou Adresse d'implantation</label>
                    <AddressAutocomplete 
                      value={city}
                      onChange={setCity}
                      placeholder="Tapez le nom de votre ville ou rue..."
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#FF5C00] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" required id="terms-partner" className="accent-[#FF5C00]" />
                  <label htmlFor="terms-partner" className="text-[11px] text-zinc-400 font-sans cursor-pointer">
                    J'accepte les conditions générales du Programme Partenaire Fidfud et la politique de confidentialité.
                  </label>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setFormStep(2)}
                    className="border border-white/20 text-zinc-300 hover:text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                  >
                    ⬅ Étape précédente
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-[#FF5C00] to-rose-600 hover:brightness-110 text-white font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl transition-all shadow-xl shadow-[#FF5C00]/30 cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      '🚀 SOUMETTRE MA CANDIDATURE'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: CONFIRMATION STEP */}
            {formStep === 4 && submittedApp && (
              <div className="text-center space-y-6 py-6 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  ✓
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                    Dossier transmis avec succès • ID #{submittedApp.id}
                  </span>
                  <h3 className="text-2xl font-black uppercase italic text-white">
                    Félicitations {submittedApp.applicantName} !
                  </h3>
                  <p className="text-xs text-zinc-300 font-sans max-w-lg mx-auto leading-relaxed">
                    Votre candidature pour le profil <strong className="text-white uppercase">{submittedApp.partnerType}</strong> à <strong>{submittedApp.city}</strong> a bien été enregistrée par notre équipe de modération culinaire.
                  </p>
                </div>

                <div className="bg-black/50 border border-white/10 p-4 rounded-2xl max-w-md mx-auto text-left space-y-2 text-xs font-sans">
                  <p className="font-bold text-white uppercase text-[10px] font-mono">Prochaines Étapes :</p>
                  <p className="text-zinc-300 flex items-center gap-2">
                    <Clock size={14} className="text-[#FF5C00]" /> 1. Étude du dossier sous 24h par un responsable régional.
                  </p>
                  <p className="text-zinc-300 flex items-center gap-2">
                    <Smartphone size={14} className="text-amber-400" /> 2. Réception de vos accès au Dashboard Marchand par email.
                  </p>
                  <p className="text-zinc-300 flex items-center gap-2">
                    <Tv size={14} className="text-emerald-400" /> 3. Expédition de votre kit de diffusion ou accès studio.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="bg-[#FF5C00] hover:bg-[#FF3E00] text-white font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    Retourner à l'application Fidfud ➔
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* 8. TESTIMONIALS FROM REAL PARTNERS */}
      <section className="py-16 px-4 sm:px-8 md:px-16 max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-black text-emerald-400 font-mono uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
            TÉMOIGNAGES DU RÉSEAU
          </span>
          <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white">
            Ce que disent nos partenaires
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#121216] border border-white/10 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-1 text-amber-400">
              {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
            </div>
            <p className="text-xs text-zinc-300 italic font-sans leading-relaxed">
              "Fidfud a changé la donne pour ma pizzeria à Lyon. Quand on lance le live de 19h30, les commandes tombent en continu. Notre panier moyen a bondi de 35% !"
            </p>
            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center font-mono">
                CR
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase italic">Chef Roberto</p>
                <p className="text-[10px] text-zinc-500 font-sans">Restaurateur • Pizzeria La Nonna (Lyon)</p>
              </div>
            </div>
          </div>

          <div className="bg-[#121216] border border-white/10 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-1 text-amber-400">
              {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
            </div>
            <p className="text-xs text-zinc-300 italic font-sans leading-relaxed">
              "Mon audience YouTube adore suivre mes dégustations en direct. Les gens commandent les burgers en même temps que je les goûte, et les commissions tombent direct !"
            </p>
            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center font-mono">
                CV
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase italic">Camille Vlogs</p>
                <p className="text-[10px] text-zinc-500 font-sans">YouTuber Foodie • 145K Abonnés (Paris)</p>
              </div>
            </div>
          </div>

          <div className="bg-[#121216] border border-white/10 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-1 text-amber-400">
              {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
            </div>
            <p className="text-xs text-zinc-300 italic font-sans leading-relaxed">
              "J'anime 3 masterclasses de pâtisserie par semaine. Les élèves achètent leur accès en 1 clic et reçoivent les ingrédients livrés à domicile. Une expérience inégalée !"
            </p>
            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 font-black flex items-center justify-center font-mono">
                CY
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase italic">Chef Youssef</p>
                <p className="text-[10px] text-zinc-500 font-sans">Masterclass Chef • Marseille</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ ACCORDION */}
      <section className="py-16 px-4 sm:px-8 md:px-16 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white">
            Foire Aux Questions Partenaires
          </h2>
          <p className="text-xs text-zinc-400 font-sans">
            Des réponses claires pour aborder votre inscription en toute sérénité.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "De quel matériel ai-je besoin pour commencer ?",
              a: "Un simple smartphone récent ou une tablette connectée suffit ! Pour les restaurateurs, nous fournissons gratuitement un support caméra orientable et l'application Fidfud Live Kitchen installée."
            },
            {
              q: "Comment fonctionnent les paiements et les commissions ?",
              a: "Les paiements sont gérés via notre partenaire sécurisé Stripe Connect. L'argent des ventes ou des billets de masterclass vous est transféré directement sous 24h à 48h. Les commissions Fidfud sont transparentes (8% à 15% selon votre formule)."
            },
            {
              q: "Je suis déjà sur Uber Eats ou Deliveroo, puis-je cumuler avec Fidfud ?",
              a: "Absolument ! Fidfud ne demande aucune exclusivité. Vous pouvez continuer vos partenariats existants tout en générant un canal de ventes supplémentaire grâce au live-shopping."
            },
            {
              q: "Comment les YouTubers touchent-ils des commissions d'affiliation ?",
              a: "Lorsque vous lancez un live test d'un restaurant partenaire, des boutons 'Commander ce plat' s'affichent pour votre audience. Chaque commande générée contient votre code d'affiliation et crédite automatiquement votre solde Fidfud."
            }
          ].map((faq, idx) => {
            const isOpen = faqOpen[idx];
            return (
              <div key={idx} className="border border-white/10 rounded-2xl bg-[#0F0F12] overflow-hidden">
                <button
                  onClick={() => setFaqOpen(prev => ({ ...prev, [idx]: !prev[idx] }))}
                  className="w-full p-4 text-left font-black text-xs sm:text-sm uppercase italic text-white hover:text-[#FF5C00] flex justify-between items-center transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={16} className="text-[#FF5C00]" /> : <ChevronDown size={16} className="text-zinc-500" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-zinc-400 font-sans leading-relaxed border-t border-white/5 bg-black/20">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. BOTTOM FOOTER */}
      <footer className="bg-[#050506] border-t border-white/10 py-8 px-6 text-center text-xs text-zinc-500 font-sans space-y-3">
        <p>© {new Date().getFullYear()} FIDFUD Inc. Programme Partenaire Vendeurs & Créateurs. Tous droits réservés.</p>
        <p className="text-[10px] text-zinc-600 max-w-2xl mx-auto">
          Inspiré par la rigueur des standards Uber Eats Merchants, adapté au live-shopping culinaire interactif.
        </p>
      </footer>

    </div>
  );
};
