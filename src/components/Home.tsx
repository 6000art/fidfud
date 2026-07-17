import React, { useState } from 'react';
import { 
  Play, 
  ShoppingBag, 
  Plus, 
  Eye, 
  Heart, 
  Sparkles, 
  Clock, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare,
  Gift,
  Flame,
  Award,
  ChevronRight,
  Shield,
  Truck,
  X,
  Smartphone,
  CheckCircle,
  HelpCircle,
  Users,
  TrendingUp,
  ChefHat,
  Tv
} from 'lucide-react';
import { Video, Restaurant, Dish } from '../types';
import { motion } from 'motion/react';

interface HomeProps {
  videos: Video[];
  restaurants: Restaurant[];
  dishes: Dish[];
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  accentColor: string;
  designSettings: any;
}

export const Home: React.FC<HomeProps> = ({
  videos,
  restaurants,
  dishes,
  onOpenAuth,
  accentColor = '#FF5C00',
  designSettings
}) => {
  const [showCookieBanner, setShowCookieBanner] = useState(true);
  const [activeTab, setActiveTab] = useState<'buyer' | 'seller'>('buyer');
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({
    0: true, // First one open by default
  });
  const [showBecomeSellerModal, setShowBecomeSellerModal] = useState(false);
  const [sellerEmail, setSellerEmail] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerSpecialty, setSellerSpecialty] = useState('');
  const [sellerSubmitted, setSellerSubmitted] = useState(false);

  // Toggle FAQ item
  const toggleFaq = (index: number) => {
    setFaqOpen(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Simulated live room messages for phone mockup
  const liveMessages = [
    { user: 'Lucie_Gourmande', text: 'Incroyable cette cuisson ! 🔥' },
    { user: 'BurgerLover92', text: 'Je viens de commander le burger Signature ! 🍔' },
    { user: 'Chef_Yanis', text: 'Merci tout le monde, j\'ajoute des frites maison gratuites pour toutes les commandes en direct ! 🍟' },
    { user: 'Soso_Food', text: 'Livraison en combien de temps sur Paris 11 ?' },
    { user: 'Fidfud_Bot', text: '🚴 Éco-coursier en route : livraison estimée en 15-20 min !' }
  ];

  // FAQ Items adapted for FIDFUD
  const faqItems = [
    {
      q: "Qu'est-ce que FIDFUD ?",
      a: "FIDFUD est la première marketplace française de live-shopping dédiée à la gastronomie et au live cooking. Les chefs et restaurateurs lancent des émissions en direct pour cuisiner sous vos yeux, interagir avec vous et vous proposer de commander leurs créations culinaires et spécialités en direct."
    },
    {
      q: "Comment commander un plat en direct pendant le live ?",
      a: "Pendant que le chef cuisine en direct, les plats du menu s'affichent en temps réel. Cliquez sur le bouton d'achat direct ou sur 'Ajouter au panier' pour commander instantanément. Votre plat est préparé à la minute et livré immédiatement !"
    },
    {
      q: "Peut-on commander l'ensemble du menu ?",
      a: "Oui ! Chaque restaurant propose son menu complet sur sa boutique en direct. Vous pouvez explorer les différentes spécialités et classiques, composer votre panier à tout moment et valider votre commande en toute simplicité."
    },
    {
      q: "Comment devenir vendeur / chef sur FIDFUD ?",
      a: "C'est très simple ! Si vous êtes un restaurateur professionnel, un artisan ou un chef indépendant, vous pouvez soumettre votre candidature via notre formulaire en haut à droite. Une fois validé, vous aurez accès à notre outil de diffusion en direct pour fédérer votre communauté de gourmands."
    },
    {
      q: "Quels sont les modes et délais de livraison ?",
      a: "Nous privilégions une approche locale et écologique. Vos commandes sont livrées par nos coursiers partenaires à vélo dans un rayon de 4 km autour du restaurant afin de garantir des plats chauds et un impact carbone minimal. Les options de Click & Collect (retrait express) sont également disponibles."
    }
  ];

  const handleBecomeSellerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sellerEmail && sellerName) {
      setSellerSubmitted(true);
      setTimeout(() => {
        setSellerSubmitted(false);
        setShowBecomeSellerModal(false);
        setSellerName('');
        setSellerEmail('');
        setSellerSpecialty('');
        alert('Candidature reçue ! Notre équipe de modération culinaire va étudier votre dossier sous 24h. Préparez vos fourneaux ! 🍳');
      }, 1500);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#050506] text-white font-sans flex flex-col relative select-none">
      
      {/* 1. TOP BAR NAVBAR */}
      <header className="sticky top-0 z-[60] bg-[#050506]/95 backdrop-blur-md border-b border-white/5 py-2.5 sm:py-3.5 px-3 sm:px-6 md:px-12 flex items-center justify-between w-full">
        {/* Left Side: Logo (Not clickable, static display for guest users) */}
        <div className="flex items-center gap-2 shrink-0">
          {designSettings?.logoUrl ? (
            <img src={designSettings.logoUrl} alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-xl border border-white/10" />
          ) : (
            <div 
              style={{ backgroundColor: designSettings?.homeHeroBgGradientStart || accentColor }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-[0_0_15px_rgba(255,92,0,0.4)]"
            >
              🍳
            </div>
          )}
        </div>

        {/* Right Side Buttons - Fully Responsive on small screens */}
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-6 shrink-0">
          <button 
            onClick={() => setShowBecomeSellerModal(true)}
            className="hidden md:inline-block text-xs font-extrabold text-zinc-300 hover:text-white transition-colors uppercase tracking-wider font-sans cursor-pointer"
          >
            {designSettings?.homeBecomeSellerTitle || 'Devenir vendeur 🍳'}
          </button>
          
          <button 
            onClick={() => onOpenAuth('login')}
            className="bg-white text-black hover:bg-zinc-100 transition-all font-black text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest px-2.5 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-full shadow-lg cursor-pointer transform active:scale-95"
          >
            Se connecter
          </button>

          <button 
            onClick={() => onOpenAuth('signup')}
            className="border border-white/20 hover:border-white/50 text-white hover:bg-white/5 transition-all font-black text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest px-2.5 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-full cursor-pointer transform active:scale-95"
          >
            S'inscrire
          </button>
        </div>
      </header>

      {/* 2. GRAND HERO BANNER SECTION */}
      {designSettings?.homeShowHero !== false && (
        <section 
          className="relative w-full overflow-hidden py-12 md:py-24 px-4 sm:px-12 md:px-24 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 border-b border-white/5"
          style={{ 
            background: `radial-gradient(circle at 75% 30%, rgba(255, 92, 0, 0.15) 0%, rgba(5, 5, 6, 0) 65%), linear-gradient(135deg, ${designSettings?.homeHeroBgGradientStart || accentColor} 0%, ${designSettings?.homeHeroBgGradientStart || accentColor}dd 40%, ${designSettings?.homeHeroBgGradientEnd || '#150900'} 100%)`
          }}
        >
          {/* Background Mesh Decorative Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-25 pointer-events-none" />

          {/* Left Side: Text and QR Code */}
          <div className="flex-1 max-w-2xl space-y-4 md:space-y-8 text-white relative z-10">
            <span className="bg-black text-white font-black text-[9px] sm:text-[10px] tracking-widest px-3 py-1.5 rounded-full uppercase inline-block">
              {designSettings?.homeHeroBadge || '🔴 LE LIVE-SHOPPING CULINAIRE #1'}
            </span>
            
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-[1.05] uppercase italic text-white break-words">
                {designSettings?.homeHeroTitle ? (
                  designSettings.homeHeroTitle.split('\n').map((line: string, i: number) => (
                    <span key={i}>{line}<br /></span>
                  ))
                ) : (
                  <>La marketplace<br />du live shopping<br />gourmand</>
                )}
              </h1>
              <p className="text-zinc-200 text-xs sm:text-base leading-relaxed max-w-lg font-medium font-sans">
                {designSettings?.homeHeroSubtitle || 'Découvrez des créations culinaires et recettes exclusives préparées sous vos yeux en direct. Discutez, commandez et faites-vous livrer chaud en un clic !'}
              </p>
            </div>

            {/* QR Code and Actions Block */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
              <div className="bg-white p-2 sm:p-2.5 rounded-2xl shadow-2xl border border-black/5 flex items-center justify-center shrink-0">
                {/* High-fidelity Vector QR Code simulation */}
                <svg className="w-20 h-20 sm:w-24 sm:h-24" viewBox="0 0 100 100" fill="black">
                  {/* Outers */}
                  <path d="M5,5 h25 v25 h-25 z M10,10 h15 v15 h-15 z" />
                  <path d="M70,5 h25 v25 h-25 z M75,10 h15 v15 h-15 z" />
                  <path d="M5,70 h25 v25 h-25 z M10,75 h15 v15 h-15 z" />
                  {/* Random QR Code blocks */}
                  <rect x="35" y="5" width="10" height="10" />
                  <rect x="50" y="15" width="15" height="5" />
                  <rect x="40" y="25" width="5" height="15" />
                  <rect x="55" y="5" width="10" height="10" />
                  <rect x="15" y="35" width="10" height="5" />
                  <rect x="5" y="45" width="20" height="10" />
                  <rect x="35" y="50" width="15" height="15" />
                  <rect x="55" y="45" width="5" height="10" />
                  <rect x="70" y="35" width="25" height="5" />
                  <rect x="80" y="45" width="10" height="15" />
                  <rect x="75" y="70" width="10" height="10" />
                  <rect x="90" y="80" width="5" height="15" />
                  <rect x="35" y="75" width="15" height="10" />
                  <rect x="55" y="70" width="15" height="5" />
                  <rect x="60" y="85" width="15" height="10" />
                  {/* Center dot */}
                  <rect x="45" y="45" width="10" height="10" fill={designSettings?.homeHeroBgGradientStart || accentColor} />
                </svg>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <p className="text-white text-xs font-black uppercase tracking-widest">
                  {designSettings?.homeQrCodeText || 'Scannez pour commander'}
                </p>
                <p className="text-zinc-300 text-[11px] sm:text-xs leading-normal max-w-xs font-sans">
                  {designSettings?.homeQrCodeSubtitle || 'Disponible instantanément sur mobile et ordinateur. Profitez de 50% de réduction sur votre première commande !'}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button 
                    onClick={() => onOpenAuth('signup')}
                    className="bg-black hover:bg-zinc-900 text-white hover:scale-[1.02] active:scale-98 transition-all px-4 py-2 sm:py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Tv size={14} />
                    {designSettings?.homeCtaText || 'Regarder les Lives'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Animated Smartphone Mockup of Fidfud Live */}
          {designSettings?.homeShowPhoneMockup !== false && (
            <div className="flex-1 flex justify-center items-center relative z-10 w-full max-w-xs md:max-w-md">
              {/* Animated background glow behind phone */}
              <div 
                className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full blur-[60px] sm:blur-[80px] opacity-45 -z-10 animate-pulse"
                style={{ backgroundColor: '#ffffff' }}
              />
              
              {/* Main Simulated Phone Frame */}
              <div className="w-[260px] sm:w-[290px] h-[520px] sm:h-[580px] bg-zinc-950 rounded-[44px] p-2 sm:p-2.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-4 border-zinc-800 relative overflow-hidden ring-1 ring-white/10 flex flex-col">

            
            {/* Dynamic Island / Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-2xl z-50 flex items-center justify-between px-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80" />
              <span className="w-3.5 h-1 bg-zinc-900 rounded-full" />
            </div>

            {/* In-Phone Screen Container */}
            <div className="w-full h-full rounded-[34px] overflow-hidden relative flex flex-col bg-[#050506]">
              {/* Video background stream mockup */}
              <img 
                src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&auto=format&fit=crop&q=80" 
                alt="Chef Cooking Live" 
                className="absolute inset-0 w-full h-full object-cover opacity-90 scale-105"
              />
              {/* Dark overlay for UI visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/60 pointer-events-none" />

              {/* Top phone bar: Live indicator */}
              <div className="absolute top-8 left-3 right-3 flex items-center justify-between z-40">
                <div className="flex items-center gap-1.5 bg-black/65 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[8px] font-black tracking-widest text-white uppercase">DIRECT</span>
                  <span className="text-[7.5px] font-mono text-zinc-300">| Casa Della Nonna</span>
                </div>
                <div className="bg-red-500 text-white font-mono text-[7px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                  <span>👤</span> 2.3k
                </div>
              </div>

              {/* Bidding & Product card popup in live */}
              <div className="absolute bottom-[165px] left-3 right-3 bg-black/85 backdrop-blur-md rounded-2xl border border-[#FF5C00]/30 p-2.5 z-40 space-y-2 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] bg-[#FF5C00]/10 text-[#FF5C00] font-black tracking-wider px-1.5 py-0.5 rounded uppercase border border-[#FF5C00]/25">
                    🔥 OFFRE DIRECTE
                  </span>
                  <span className="text-[8px] text-zinc-400 font-mono flex items-center gap-1">
                    ⏱️ Prêt en 15 min
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <img 
                    src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&auto=format&fit=crop&q=80" 
                    alt="Burger" 
                    className="w-10 h-10 rounded-lg object-cover border border-white/5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9.5px] font-black text-white uppercase truncate italic">Burger Truffe & Cheddar Coulant</p>
                    <p className="text-[8.5px] text-zinc-400 font-sans truncate">Par le Chef nonna Maria</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                  <div>
                    <p className="text-[7px] text-zinc-500 uppercase font-mono">Prix direct</p>
                    <p className="text-[11px] font-black text-[#FF5C00] font-mono">14.00 €</p>
                  </div>
                  <button 
                    onClick={() => onOpenAuth('signup')}
                    className="bg-[#FF5C00] hover:bg-[#FF3E00] text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-md"
                  >
                    Commander
                  </button>
                </div>
              </div>

              {/* Simulated Live Chat */}
              <div className="absolute bottom-12 left-3 right-3 max-h-[110px] overflow-hidden space-y-1.5 pointer-events-none z-30 flex flex-col justify-end">
                {liveMessages.map((msg, i) => (
                  <div key={i} className="bg-black/45 backdrop-blur-[2px] px-2.5 py-1 rounded-xl border border-white/2 text-[8px] leading-snug w-fit max-w-[90%]">
                    <strong className="text-[#FF5C00] mr-1">{msg.user}</strong>
                    <span className="text-zinc-200 font-sans">{msg.text}</span>
                  </div>
                ))}
              </div>

              {/* Bottom live stream chat input bar */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 z-40">
                <div className="flex-1 bg-black/65 border border-white/10 px-2.5 py-1.5 rounded-xl text-[8.5px] text-zinc-500 font-sans">
                  Dire quelque chose... 💬
                </div>
                <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center text-[10px] text-white">
                  ❤️
                </div>
              </div>

            </div>
          </div>

            {/* Flying badge overlay */}
            <div className="absolute -bottom-4 -right-2 bg-zinc-950 p-3 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-2 max-w-[200px] animate-bounce">
              <span className="text-xl">🚴</span>
              <div>
                <p className="text-[9px] font-black text-[#FF5C00] uppercase tracking-wider font-mono">Livraison Éclair</p>
                <p className="text-[8px] text-zinc-400 font-sans font-medium">Vos plats livrés chauds directement chez vous !</p>
              </div>
            </div>
          </div>
          )}
        </section>
      )}

      {/* 3. TRUST & FEATURES */}
      {designSettings?.homeShowTrust !== false && (
        <section className="py-16 px-6 sm:px-12 md:px-24 bg-[#09090b] space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight italic">
              {designSettings?.homeFeaturesTitle || 'Une expérience culinaire interactive unique'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
              {designSettings?.homeFeaturesSubtitle || 'Fidfud combine le meilleur du divertissement en direct et de la livraison de repas pour vous connecter directement aux meilleurs restaurants culinaires.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-[#0F0F11] border border-white/5 space-y-4 hover:border-white/10 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-[#FF5C00]/10 border border-[#FF5C00]/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🎥
              </div>
              <h3 className="text-base font-black uppercase tracking-tight text-white italic">{designSettings?.homeFeat1Title || 'Transparence Totale'}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                {designSettings?.homeFeat1Desc || 'Voyez exactement comment votre plat est préparé, les ingrédients de qualité utilisés et l\'hygiène irréprochable de la cuisine en temps réel avant de commander. Finies les mauvaises surprises !'}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-[#0F0F11] border border-white/5 space-y-4 hover:border-white/10 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-[#FF5C00]/10 border border-[#FF5C00]/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                ⚡
              </div>
              <h3 className="text-base font-black uppercase tracking-tight text-white italic">{designSettings?.homeFeat2Title || 'Ventes Flash Direct'}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                {designSettings?.homeFeat2Desc || 'Profitez de prix promotionnels exclusifs et de ventes flash lancés en direct par les chefs pour commander vos spécialités préférées.'}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-[#0F0F11] border border-white/5 space-y-4 hover:border-white/10 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-[#FF5C00]/10 border border-[#FF5C00]/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🚴
              </div>
              <h3 className="text-base font-black uppercase tracking-tight text-white italic">{designSettings?.homeFeat3Title || 'Livraison Éco-Rapide'}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                {designSettings?.homeFeat3Desc || 'Dès la fin de la cuisson, nos éco-coursiers partenaires à vélo récupèrent vos plats chauds et foncent chez vous pour garantir une dégustation à température idéale.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 4. THE TWO SIDES: BUYERS & SELLERS */}
      <section className="py-16 px-6 sm:px-12 md:px-24 bg-[#050506] space-y-10">
        <div className="flex justify-center">
          <div className="bg-[#0F0F11] border border-white/10 p-1.5 rounded-2xl flex gap-1.5">
            <button 
              onClick={() => setActiveTab('buyer')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'buyer' 
                  ? 'bg-[#FF5C00] text-white shadow-lg shadow-[#FF5C00]/25' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              👩‍🍳 Pour les Gourmands
            </button>
            <button 
              onClick={() => setActiveTab('seller')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'seller' 
                  ? 'bg-[#FF5C00] text-white shadow-lg shadow-[#FF5C00]/25' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              💼 Pour les Restaurateurs
            </button>
          </div>
        </div>

        {activeTab === 'buyer' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-[9px] text-[#FF5C00] font-black tracking-widest uppercase font-mono">L'EXPÉRIENCE ACHETEUR</span>
              <h3 className="text-3xl font-black uppercase tracking-tight italic">Découvrez de nouvelles saveurs en direct de votre canapé</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                Fidfud transforme la commande de repas en un moment de partage convivial. Posez vos questions au chef en direct, demandez des ingrédients sur-mesure, applaudissez les grosses commandes et commandez en direct en un clic !
              </p>
              
              <div className="space-y-3.5 pt-2">
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                  <p className="text-xs font-medium text-zinc-200 font-sans"><strong className="text-white">Interactions réelles</strong> : Chattez directement avec la brigade du restaurant.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                  <p className="text-xs font-medium text-zinc-200 font-sans"><strong className="text-white">Fidélité récompensée</strong> : Gagnez des points d'expérience et débloquez des badges exclusifs.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                  <p className="text-xs font-medium text-zinc-200 font-sans"><strong className="text-white">Garantie fraîcheur</strong> : Les plats ne sont préparés qu'à la commande pour préserver les goûts.</p>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => onOpenAuth('signup')}
                  className="bg-white text-black hover:bg-zinc-100 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg cursor-pointer transition-transform active:scale-95"
                >
                  Découvrir la Marketplace ➔
                </button>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative aspect-video bg-zinc-950">
              <img 
                src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80" 
                alt="Delicious Food Grid" 
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex items-end p-6">
                <div className="flex items-center gap-3 bg-black/75 backdrop-blur-md p-3 rounded-2xl border border-white/10 w-full">
                  <span className="text-xl">🍔</span>
                  <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-wider font-mono">Bientôt en Live</p>
                    <p className="text-[9px] text-zinc-400 font-sans">Le food truck "Grill & Flame" revient en direct à 18h !</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative aspect-video bg-zinc-950 order-last lg:order-first">
              <img 
                src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&auto=format&fit=crop&q=80" 
                alt="Chef Cooking" 
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex items-end p-6">
                <div className="flex items-center gap-3 bg-black/75 backdrop-blur-md p-3 rounded-2xl border border-white/10 w-full">
                  <span className="text-xl">📈</span>
                  <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-wider font-mono">Booster vos Ventes</p>
                    <p className="text-[9px] text-zinc-400 font-sans">Les restaurateurs Fidfud constatent +35% de volume de commandes en Live !</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <span className="text-[9px] text-[#FF5C00] font-black tracking-widest uppercase font-mono">L'EXPÉRIENCE RESTAURATEUR</span>
              <h3 className="text-3xl font-black uppercase tracking-tight italic">Digitalisez votre restaurant et engagez votre communauté</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                Fidfud est l'outil parfait pour les restaurateurs modernes qui souhaitent valoriser leur savoir-faire, lutter contre le gaspillage, augmenter leur panier moyen et créer une relation authentique avec leurs clients.
              </p>
              
              <div className="space-y-3.5 pt-2">
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                  <p className="text-xs font-medium text-zinc-200 font-sans"><strong className="text-white">Outil de streaming inclus</strong> : Diffusez en 1 clic depuis notre application marchand.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                  <p className="text-xs font-medium text-zinc-200 font-sans"><strong className="text-white">Payouts simplifiés avec Stripe Connect</strong> : Encaissez les ventes et les tips directement.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                  <p className="text-xs font-medium text-zinc-200 font-sans"><strong className="text-white">Statistiques détaillées</strong> : Suivez l'engagement, les vues et votre chiffre d'affaires.</p>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => setShowBecomeSellerModal(true)}
                  className="bg-[#FF5C00] hover:bg-[#FF3E00] text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg cursor-pointer transition-transform active:scale-95"
                >
                  Déposer ma Candidature ➔
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 5. GOURMET CATEGORIES SHOWCASE */}
      <section className="py-16 px-6 sm:px-12 md:px-24 bg-[#09090b] border-t border-b border-white/5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
          <div>
            <span className="text-[9px] text-[#FF5C00] font-black tracking-widest uppercase font-mono">AU MENU DE FIDFUD</span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight italic">
              Nos catégories phares en Live
            </h2>
          </div>
          <span className="text-xs text-zinc-500 font-mono">Disponibles selon l'heure des services</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[
            { img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80', title: 'Burgers & Grill 🍔', count: '12 shows' },
            { img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80', title: 'Pizzas Artisanales 🍕', count: '8 shows' },
            { img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&auto=format&fit=crop&q=80', title: 'Ramen & Asiat 🍜', count: '15 shows' },
            { img: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=300&auto=format&fit=crop&q=80', title: 'Sucré & Dessert 🍰', count: '6 shows' },
            { img: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&auto=format&fit=crop&q=80', title: 'Sushis d\'Exception 🍣', count: '4 shows' }
          ].map((cat, i) => (
            <div 
              key={i} 
              onClick={() => onOpenAuth('signup')}
              className="p-3 bg-[#0F0F11] border border-white/5 rounded-2xl hover:border-white/10 hover:scale-[1.02] transition-all cursor-pointer group"
            >
              <div className="aspect-square rounded-xl overflow-hidden border border-white/5 mb-3 relative">
                <img src={cat.img} alt={cat.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 bg-[#FF5C00] text-white font-mono text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                  {cat.count}
                </span>
              </div>
              <p className="text-xs font-black text-white uppercase italic group-hover:text-[#FF5C00] transition-colors truncate">
                {cat.title}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FAQ ACCORDION SECTION */}
      {designSettings?.homeShowFaq !== false && (
        <section className="py-16 px-6 sm:px-12 md:px-24 bg-[#050506] max-w-4xl mx-auto w-full space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight italic text-white">
              {designSettings?.homeFaqTitle || 'Questions Fréquentes'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-sans">
              {designSettings?.homeFaqSubtitle || 'Vous avez des questions sur le live-shopping ? Voici nos réponses.'}
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: designSettings?.homeFaqQ1 || "Qu'est-ce que FIDFUD ?",
                a: designSettings?.homeFaqA1 || "FIDFUD est la première marketplace française de live-shopping dédiée à la gastronomie et au live cooking. Les chefs et restaurateurs lancent des émissions en direct pour cuisiner sous vos yeux, interagir avec vous et vous proposer de commander leurs créations culinaires et spécialités en direct."
              },
              {
                q: designSettings?.homeFaqQ2 || "Comment commander un plat en direct pendant le live ?",
                a: designSettings?.homeFaqA2 || "Pendant que le chef cuisine en direct, les plats du menu s'affichent en temps réel. Cliquez sur le bouton d'achat direct ou sur 'Ajouter au panier' pour commander instantanément. Votre plat est préparé à la minute et livré immédiatement !"
              },
              {
                q: designSettings?.homeFaqQ3 || "Peut-on commander l'ensemble du menu ?",
                a: designSettings?.homeFaqA3 || "Oui ! Chaque restaurant propose son menu complet sur sa boutique en direct. Vous pouvez explorer les différentes spécialités et classiques, composer votre panier à tout moment et valider votre commande en toute simplicité."
              },
              {
                q: designSettings?.homeFaqQ4 || "Comment devenir vendeur / chef sur FIDFUD ?",
                a: designSettings?.homeFaqA4 || "C'est très simple ! Si vous êtes un restaurateur professionnel, un artisan ou un chef indépendant, vous pouvez soumettre votre candidature via notre formulaire en haut à droite. Une fois validé, vous aurez accès à notre outil de diffusion en direct pour fédérer votre communauté de gourmands."
              },
              {
                q: designSettings?.homeFaqQ5 || "Quels sont les modes et délais de livraison ?",
                a: designSettings?.homeFaqA5 || "Nous privilégions une approche locale et écologique. Vos commandes sont livrées par nos coursiers partenaires à vélo dans un rayon de 4 km autour du restaurant afin de garantir des plats chauds et un impact carbone minimal. Les options de Click & Collect (retrait express) sont également disponibles."
              }
            ].map((item, idx) => {
              const isOpen = faqOpen[idx];
              return (
                <div 
                  key={idx}
                  className="border border-white/5 rounded-2xl bg-[#0F0F11] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full py-4.5 px-6 flex items-center justify-between text-left font-black uppercase tracking-tight text-white hover:text-[#FF5C00] transition-colors italic text-xs sm:text-sm"
                  >
                    <span>{item.q}</span>
                    {isOpen ? <ChevronUp size={16} className="text-[#FF5C00]" /> : <ChevronDown size={16} className="text-zinc-500" />}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs text-zinc-400 font-sans leading-relaxed border-t border-white/5 bg-black/20">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. COMPLETE SITEMAP FOOTER */}
      <footer className="mt-auto bg-[#09090b] border-t border-white/5 py-12 px-6 sm:px-12 md:px-24 text-zinc-500 text-xs font-sans">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1 */}
          <div className="space-y-3">
            <h4 className="text-white font-black uppercase tracking-widest text-[10px] font-sans">Produit</h4>
            <ul className="space-y-2">
              <li><button onClick={() => onOpenAuth('signup')} className="hover:text-white transition-colors">La Marketplace Live</button></li>
              <li><button onClick={() => setShowBecomeSellerModal(true)} className="hover:text-white transition-colors">Devenir Vendeur</button></li>
              <li><button onClick={() => onOpenAuth('signup')} className="hover:text-white transition-colors">S'inscrire</button></li>
              <li><button onClick={() => onOpenAuth('login')} className="hover:text-white transition-colors">Se connecter</button></li>
            </ul>
          </div>

          {/* Col 2 */}
          <div className="space-y-3">
            <h4 className="text-white font-black uppercase tracking-widest text-[10px] font-sans">Confiance & Sécurité</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Directives communautaires</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Garantie Fidfud</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Conditions de commande</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Signaler un abus</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-3">
            <h4 className="text-white font-black uppercase tracking-widest text-[10px] font-sans">Compagnie</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">À propos</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog culinaire</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Presse</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Carrières</a></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-3">
            <h4 className="text-white font-black uppercase tracking-widest text-[10px] font-sans">Contact & Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Centre d'aide</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Nous contacter</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Support restaurateurs</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Statut des serveurs</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-white/5">
          <p>© {new Date().getFullYear()} {designSettings?.appName || 'FIDFUD'} Inc. Tous droits réservés. Inspiré par Whatnot.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Mentions Légales</a>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">Données Personnelles</a>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">Cookies Settings</a>
          </div>
        </div>
      </footer>

      {/* 8. BECOME A SELLER MODAL */}
      {showBecomeSellerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F0F11] border border-[#FF5C00]/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6">
            <button 
              onClick={() => setShowBecomeSellerModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-2">
              <span className="text-3xl">👨‍🍳</span>
              <h3 className="text-xl font-black uppercase italic tracking-tight text-white">
                Rejoignez la brigade FIDFUD !
              </h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Remplissez vos informations pour lancer votre chaîne de live cooking et vendre vos créations culinaires en direct !
              </p>
            </div>

            <form onSubmit={handleBecomeSellerSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 font-sans block">Nom de votre établissement / Chef</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Le Camion Gourmet, Chef Robert"
                  value={sellerName}
                  onChange={e => setSellerName(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 font-sans block">Adresse email de contact</label>
                <input 
                  type="email" 
                  required
                  placeholder="Ex: contact@monrestau.com"
                  value={sellerEmail}
                  onChange={e => setSellerEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 font-sans block">Spécialité culinaire</label>
                <input 
                  type="text" 
                  placeholder="Ex: Smash burgers, Pizzas napolitaines, Ramen..."
                  value={sellerSpecialty}
                  onChange={e => setSellerSpecialty(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans"
                />
              </div>

              <button 
                type="submit"
                disabled={sellerSubmitted}
                className="w-full bg-[#FF5C00] hover:bg-[#FF3E00] text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-[#FF5C00]/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {sellerSubmitted ? 'Envoi en cours... ⏳' : 'Soumettre ma candidature'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 9. COOKIE CONSENT BANNER */}
      {showCookieBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white text-black p-4 md:p-6 border-t border-zinc-200 shadow-[0_-10px_30px_rgba(0,0,0,0.15)] animate-fade-in flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-4xl">
            <h4 className="text-sm font-black font-sans uppercase tracking-tight text-zinc-900 flex items-center gap-1.5">
              <span>🍪</span> Nous respectons votre vie privée
            </h4>
            <p className="text-xs text-zinc-600 font-sans leading-relaxed">
              Nous utilisons des cookies pour améliorer votre expérience de navigation, diffuser des publicités ou des contenus personnalisés et analyser notre trafic. En cliquant sur « Tout accepter », vous acceptez notre utilisation des cookies.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0 w-full md:w-auto">
            <button 
              onClick={() => setShowCookieBanner(false)}
              className="flex-1 md:flex-none border border-zinc-300 hover:border-zinc-500 text-zinc-700 py-2.5 px-5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              Personnaliser
            </button>
            <button 
              onClick={() => setShowCookieBanner(false)}
              className="flex-1 md:flex-none border border-zinc-300 hover:border-zinc-500 text-zinc-700 py-2.5 px-5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              Tout rejeter
            </button>
            <button 
              onClick={() => setShowCookieBanner(false)}
              className="flex-1 md:flex-none bg-black hover:bg-zinc-900 text-white py-2.5 px-5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer shadow-md"
            >
              Accepter tout
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export const Accueil = Home;
export default Home;
