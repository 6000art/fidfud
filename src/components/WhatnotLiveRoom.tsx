import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause,
  ShoppingBag, 
  Plus, 
  Eye, 
  Heart, 
  Sparkles, 
  Clock, 
  MapPin, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Gift, 
  ChevronLeft, 
  Share2, 
  Bookmark, 
  Maximize2, 
  Send,
  Star,
  Users,
  Award,
  Zap,
  Info,
  Leaf,
  BarChart2
} from 'lucide-react';
import { Video, Restaurant, Dish, User, Comment } from '../types';

interface WhatnotLiveRoomProps {
  video: Video;
  restaurants: Restaurant[];
  dishes: Dish[];
  user: User | null;
  onClose: () => void;
  onAddToCart: (dish: Dish, quantity: number) => void;
  accentColor: string;
  onOpenAuth: () => void;
}

const getMediaEmbed = (url: string): { type: 'instagram' | 'youtube' | 'tiktok' | 'file' | 'none'; embedUrl: string | null } => {
  if (!url) return { type: 'none', embedUrl: null };

  // Instagram
  const igMatch = url.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (igMatch && igMatch[1]) {
    return { type: 'instagram', embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed` };
  }

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&playlist=${ytMatch[1]}&loop=1` };
  }

  // TikTok
  const ttMatch = url.match(/(?:tiktok\.com)\/(?:@[\w.-]+\/video\/|embed\/v2\/)?(\d+)/i);
  if (ttMatch && ttMatch[1]) {
    return { type: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}` };
  }

  if (url.startsWith('http') || url.startsWith('/') || url.startsWith('.')) {
    return { type: 'file', embedUrl: url };
  }

  return { type: 'none', embedUrl: null };
};

export const WhatnotLiveRoom: React.FC<WhatnotLiveRoomProps> = ({
  video,
  restaurants,
  dishes,
  user,
  onClose,
  onAddToCart,
  accentColor,
  onOpenAuth
}) => {
  const restaurant = restaurants.find(r => r.id === video.restaurantId);
  const activeDish = dishes.find(d => d.id === video.associatedDishId) || dishes[0];
  const restaurantDishes = dishes.filter(d => d.restaurantId === video.restaurantId);

  // States
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isBoutiqueOpenMobile, setIsBoutiqueOpenMobile] = useState<boolean>(false);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [isLiveOnline, setIsLiveOnline] = useState<boolean>(true); // Simulated live status
  const [isCinemaModeLive, setIsCinemaModeLive] = useState<boolean>(false); // Clutter-free view toggle

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [boutiqueSearch, setBoutiqueSearch] = useState<string>('');
  const [boutiqueFilter, setBoutiqueFilter] = useState<'all' | 'enchere' | 'achat_direct'>('all');
  const [savedDishes, setSavedDishes] = useState<Record<string, boolean>>({});
  const [watcherCount, setWatcherCount] = useState<number>(213);
  const [chatMessages, setChatMessages] = useState<{ id: string; user: string; text: string; isSystem?: boolean; color?: string }[]>([]);
  const [newMsg, setNewMsg] = useState<string>('');
  const [currentBidPrice, setCurrentBidPrice] = useState<number>(activeDish ? Math.floor(activeDish.price * 0.7) : 12);
  const [bidCount, setBidCount] = useState<number>(14);
  const [highestBidder, setHighestBidder] = useState<string>('gourmet_lucas');
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [savedSuccessAlert, setSavedSuccessAlert] = useState<string | null>(null);

  // Poll & Recycle summary state
  const [poll, setPoll] = useState<{
    question: string;
    options: { text: string; votes: number }[];
    userVotedIndex: number | null;
  } | null>(null);

  const [recycleSummary, setRecycleSummary] = useState<string | null>(null);
  const [isGeneratingRecycle, setIsGeneratingRecycle] = useState<boolean>(false);

  const defaultPolls = [
    {
      question: "Quel accompagnement préférez-vous avec ce plat ?",
      options: [
        { text: "🍟 Frites de Patate Douce", votes: 24 },
        { text: "🥗 Salade de Quinoa Bio", votes: 15 },
        { text: "🥦 Légumes de Saison Rôtis", votes: 31 }
      ]
    },
    {
      question: "Quelle sauce accompagnera au mieux votre dégustation ?",
      options: [
        { text: "🍄 Sauce Truffe Noire Maison", votes: 42 },
        { text: "🌶️ Sauce Pimentée d'Antan", votes: 19 },
        { text: "🧄 Aïoli Léger de Provence", votes: 28 }
      ]
    }
  ];

  // Initialize poll with one of the options & reset recycle summary
  useEffect(() => {
    const pollIndex = video.id ? (video.id.charCodeAt(0) % defaultPolls.length) : 0;
    setPoll({
      question: defaultPolls[pollIndex].question,
      options: defaultPolls[pollIndex].options.map(o => ({ ...o })),
      userVotedIndex: null
    });
    setRecycleSummary(null);
  }, [video.id, video.associatedDishId]);

  const handleVote = (optionIndex: number) => {
    if (!poll || poll.userVotedIndex !== null) return;
    
    setPoll(prev => {
      if (!prev) return null;
      const updatedOptions = prev.options.map((opt, idx) => {
        if (idx === optionIndex) {
          return { ...opt, votes: opt.votes + 1 };
        }
        return opt;
      });
      return {
        ...prev,
        options: updatedOptions,
        userVotedIndex: optionIndex
      };
    });

    const userEmail = user?.email || 'imado94@whatnot.fr';
    const myUsername = userEmail.split('@')[0];
    const optionText = poll.options[optionIndex].text;
    setChatMessages(prev => [
      ...prev,
      {
        id: `poll-vote-${Date.now()}`,
        user: 'system',
        text: `📊 @${myUsername} a voté pour : "${optionText}" dans le sondage !`,
        isSystem: true
      }
    ]);
  };

  const handleGenerateRecycleSummary = async () => {
    if (!activeDish) return;
    setIsGeneratingRecycle(true);
    try {
      const res = await fetch('/api/ai/generate-recycle-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: activeDish.name, category: activeDish.category || '' })
      });
      const data = await res.json();
      if (data.success) {
        setRecycleSummary(data.summary);
      } else {
        setRecycleSummary("🌿 **Sourcing Éco-Responsable** : Ingrédients 100% locaux.");
      }
    } catch (e) {
      console.error(e);
      setRecycleSummary("🌿 **Sourcing Éco-Responsable** : Ingrédients de saison d'origine locale.");
    } finally {
      setIsGeneratingRecycle(false);
    }
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Synced play/pause
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(e => console.warn(e));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Initial fake chat messages list
  useEffect(() => {
    const initialComments = [
      { id: '1', user: 'foodie_marianne', text: 'Bonsoir ! Le direct à l’air fou 😍', color: 'text-amber-400' },
      { id: '2', user: 'chef_gabriel', text: 'Je recommande la spécialité, un délice !', color: 'text-emerald-400' },
      { id: '3', user: 'luc_gourmet', text: 'Est-ce que c’est fait maison ? 🍕', color: 'text-cyan-400' },
      { id: '4', user: 'system', text: '📢 Bienvenue sur le Live de notre restaurant ! 🍳', isSystem: true },
      { id: '5', user: 'ines_b', text: 'La cuisson est incroyable !', color: 'text-pink-400' },
      { id: '6', user: 'thomas_grill', text: 'Trop hâte de commander mon plat !! 😋', color: 'text-orange-400' },
    ];
    setChatMessages(initialComments);

    // Periodically fluctuate watcher counts
    const watcherInterval = setInterval(() => {
      setWatcherCount(prev => Math.max(10, prev + Math.floor(Math.random() * 7) - 3));
    }, 5000);

    return () => clearInterval(watcherInterval);
  }, []);

  // Periodic simulated user comments & fake bids rolling in
  useEffect(() => {
    const users = ['zoe_cook', 'antoine_k', 'sylvie_resto', 'baker_jean', 'mimi_croque', 'gourmand94', 'pierre_feu'];
    const comments = [
      'Ça donne trop envie !! 😋',
      'C’est quel type de fromage ? 🧀',
      'Incroyable recette !',
      'Le chef est super sympa ! 👍',
      'On peut l’avoir en livraison à domicile ?',
      'Miam ! Je viens de commander ! 😍',
      'Trop hâte de recevoir mon plat ! 🛵',
      'Une tuerie visuelle !',
      'Foncez c’est trop bon !',
    ];
    const colors = ['text-sky-400', 'text-yellow-400', 'text-indigo-400', 'text-purple-400', 'text-teal-400', 'text-rose-400'];

    const interval = setInterval(() => {
      // 70% chance of standard comment, 30% chance of automated rival bid!
      if (Math.random() > 0.35) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomText = comments[Math.floor(Math.random() * comments.length)];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        setChatMessages(prev => [
          ...prev, 
          { id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, user: randomUser, text: randomText, color: randomColor }
        ].slice(-40)); // keep last 40 comments
      } else {
        // Simulated automatic rival purchase!
        const randomUser = users[Math.floor(Math.random() * users.length)];
        setBidCount(c => c + 1);
        setHighestBidder(randomUser);
        
        setChatMessages(prevChat => [
          ...prevChat,
          { 
            id: `order-sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, 
            user: 'system', 
            text: `🔥 @${randomUser} a commandé en direct ! (Achat immédiat) 🛵`, 
            isSystem: true 
          }
        ].slice(-40));
      }
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat to bottom if the user is already near the bottom
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    // Check if user is scrolled near bottom (e.g., within 180px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 180;

    if (isFirstRender.current || isNearBottom) {
      container.scrollTop = container.scrollHeight;
      isFirstRender.current = false;
    }
  }, [chatMessages]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    const userEmail = user?.email || 'imado94@whatnot.fr';
    const myUsername = userEmail.split('@')[0];

    setChatMessages(prev => [
      ...prev,
      { id: `msg-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, user: myUsername, text: newMsg, color: 'text-[#FF5C00]' }
    ]);
    setNewMsg('');
  };

  const handlePlaceOrder = () => {
    if (!activeDish) return;
    const userEmail = user?.email || 'imado94@whatnot.fr';
    const myUsername = userEmail.split('@')[0];

    onAddToCart(activeDish, 1);

    // Trigger temporary fireworks / micro-animations
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2500);

    setHighestBidder(myUsername);
    setBidCount(c => c + 1);

    // Add to chat
    setChatMessages(prevChat => [
      ...prevChat,
      { 
        id: `order-self-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, 
        user: 'system', 
        text: `🎉 VOUS AVEZ COMMANDÉ ! [${activeDish.name}] ajouté au panier ! 🛵`, 
        isSystem: true 
      }
    ]);
  };

  const toggleSaveDish = (dishId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedDishes(prev => {
      const updated = { ...prev, [dishId]: !prev[dishId] };
      if (updated[dishId]) {
        setSavedSuccessAlert("Ajouté aux favoris !");
        setTimeout(() => setSavedSuccessAlert(null), 2000);
      }
      return updated;
    });
  };

  const handleBoutiqueAdd = (dish: Dish, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(dish, 1);
    setSavedSuccessAlert(`Ajouté au panier !`);
    setTimeout(() => setSavedSuccessAlert(null), 2000);
  };

  const media = getMediaEmbed(video.videoUrl);

  // Filter boutique products
  const filteredBoutique = restaurantDishes.filter(dish => {
    if (boutiqueSearch.trim()) {
      const q = boutiqueSearch.toLowerCase();
      if (!dish.name.toLowerCase().includes(q) && !dish.description.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (boutiqueFilter === 'enchere') {
      return dish.isPopular; // Spécialités (popular)
    }
    if (boutiqueFilter === 'achat_direct') {
      return !dish.isPopular; // Classiques (regular)
    }
    return true;
  });

  return (
    <div className="w-full bg-[#050506] text-white min-h-[calc(100vh-70px)] flex flex-col relative select-none">
      
      {/* Top Breadcrumb / Control line & Simulated Live Toggle */}
      <div className="bg-zinc-950/85 border-b border-white/5 px-4 py-2.5 flex flex-wrap gap-3 items-center justify-between z-10 shrink-0">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} className="text-[#FF5C00]" />
          Retour au Marché
        </button>

        <div className="flex items-center gap-4">
          {/* Simulated live online/offline switch */}
          <div className="flex items-center bg-zinc-900 border border-white/5 rounded-xl p-1 gap-1">
            <span className="text-[8.5px] uppercase font-mono font-black px-2 text-zinc-400">Statut:</span>
            <button
              onClick={() => {
                setIsLiveOnline(true);
                setChatMessages(prev => [
                  ...prev,
                  { id: `sys-${Date.now()}`, user: 'system', text: '🟢 Le Host est maintenant EN DIRECT ! Venez échanger !', isSystem: true }
                ]);
              }}
              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                isLiveOnline 
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/10' 
                  : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              En Ligne 🟢
            </button>
            <button
              onClick={() => {
                setIsLiveOnline(false);
                setChatMessages(prev => [
                  ...prev,
                  { id: `sys-${Date.now()}`, user: 'system', text: '🔴 Le Host est maintenant HORS LIGNE (The live is off). Restez connecté !', isSystem: true }
                ]);
              }}
              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                !isLiveOnline 
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/10' 
                  : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Hors Ligne 🔴
            </button>
          </div>

          <span className={`text-[10px] px-2 py-1 rounded font-mono font-black uppercase tracking-widest ${
            isLiveOnline ? 'bg-red-600/20 text-red-500 animate-pulse border border-red-500/10' : 'bg-zinc-900 text-zinc-500 border border-white/5'
          }`}>
            {isLiveOnline ? 'EN DIRECT • LIVE' : 'HORS LIGNE • OFFLINE'}
          </span>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        
        {/* ================= COLUMN 1: BOUTIQUE (Left Sidebar) ================= */}
        <section className={`${isMobileView ? 'hidden' : 'flex'} w-full lg:w-[320px] bg-zinc-950/40 border-r border-white/5 flex-col justify-between shrink-0 h-[calc(100vh-120px)] overflow-hidden lg:h-[auto]`}>
          <div className="p-4 flex flex-col h-full overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-[#FF5C00]" />
                Boutique du Host
              </h3>
              <span className="text-[9px] font-mono text-zinc-500 font-bold">
                ({filteredBoutique.length}) Produits
              </span>
            </div>

            {/* Search Input inside Boutique */}
            <div className="relative mb-3">
              <input
                type="text"
                value={boutiqueSearch}
                onChange={(e) => setBoutiqueSearch(e.target.value)}
                placeholder="Rechercher un plat..."
                className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/10"
              />
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 shrink-0 scrollbar-none">
              {[
                { id: 'all', label: 'Tout le menu' },
                { id: 'enchere', label: 'Spécialités' },
                { id: 'achat_direct', label: 'Classiques' }
              ].map(pill => {
                const isActive = (pill.id === 'all' && boutiqueFilter === 'all') || 
                                 (pill.id === 'enchere' && boutiqueFilter === 'enchere') ||
                                 (pill.id === 'achat_direct' && boutiqueFilter === 'achat_direct');
                return (
                  <button
                    key={pill.id}
                    onClick={() => {
                      if (pill.id === 'enchere') setBoutiqueFilter('enchere');
                      else if (pill.id === 'achat_direct') setBoutiqueFilter('achat_direct');
                      else setBoutiqueFilter('all');
                    }}
                    className={`px-3 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider shrink-0 transition-all border ${
                      isActive 
                        ? 'bg-white text-zinc-950 border-white' 
                        : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:border-white/10 hover:text-white'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {/* Product List */}
            <div className="space-y-2.5 flex-1 overflow-y-auto scrollbar-none">
              {filteredBoutique.map((dish) => {
                const isSaved = !!savedDishes[dish.id];
                return (
                  <div 
                    key={dish.id}
                    className="p-2 rounded-xl bg-zinc-900/30 border border-white/5 hover:border-white/10 transition-all flex gap-2.5 relative group"
                  >
                    {/* Left image cover */}
                    <div className="w-14 h-14 rounded-lg bg-zinc-800 overflow-hidden relative shrink-0">
                      {dish.imageUrl ? (
                        <img 
                          src={dish.imageUrl} 
                          alt={dish.name} 
                          loading="lazy"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <ShoppingBag size={16} />
                        </div>
                      )}
                      
                      {/* Save/Bookmark Button */}
                      <button
                        onClick={(e) => toggleSaveDish(dish.id, e)}
                        className={`absolute top-0.5 left-0.5 p-1 rounded bg-zinc-950/85 border transition-all ${
                          isSaved 
                            ? 'border-amber-400 text-amber-400' 
                            : 'border-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Bookmark size={8} className={isSaved ? 'fill-current' : ''} />
                      </button>
                    </div>

                    {/* Right side info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[10px] font-black text-white uppercase truncate tracking-wide pr-3">{dish.name}</h4>
                        <p className="text-[9.5px] text-amber-400 font-mono font-black mt-0.5">{dish.price.toFixed(2)} €</p>
                      </div>

                      <div className="flex items-center justify-between mt-1 gap-1">
                        <span className="text-[8px] font-mono text-zinc-500 font-bold">
                          Stock {dish.isPopular ? '12' : '35'}
                        </span>
                        
                        <button
                          onClick={(e) => handleBoutiqueAdd(dish, e)}
                          className="px-2 py-1 rounded bg-zinc-100 hover:bg-white text-zinc-950 text-[8.5px] font-black uppercase tracking-wider transition-all scale-95 hover:scale-100 active:scale-95 cursor-pointer"
                        >
                          Acheter
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= COLUMN 2: VERTICAL INNOVATIVE LIVE ROOM (Middle Centerpiece) ================= */}
        <section className="flex-1 bg-zinc-950 flex flex-col items-center justify-start p-2 sm:p-4 relative overflow-hidden h-[calc(100vh-120px)] lg:h-auto">
          
          <div className="w-full max-w-[460px] h-full flex flex-col bg-zinc-900/60 rounded-3xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
            
            {/* A. THE VIDEO STREAM AREA (Top - 240px/270px) */}
            <div className="relative h-[240px] sm:h-[270px] bg-black shrink-0 overflow-hidden border-b border-white/5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="w-full h-full relative"
                >
                  {isLiveOnline ? (
                    /* LIVE MODE ACTIVE: Render real interactive video or embed */
                    <div className="w-full h-full relative flex items-center justify-center">
                      {media.type === 'file' ? (
                        <video
                          ref={videoRef}
                          src={media.embedUrl || undefined}
                          className="w-full h-full object-cover"
                          loop
                          muted={isMuted}
                          playsInline
                          autoPlay
                          onError={(e) => {
                            console.warn("[WhatnotLiveRoom] Video error, falling back");
                            e.currentTarget.src = 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
                          }}
                        />
                      ) : media.type !== 'none' && media.embedUrl ? (
                        <iframe
                          src={media.embedUrl}
                          className="w-full h-full border-0 absolute inset-0 pointer-events-auto"
                          allow="autoplay; encrypted-media; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        /* Fallback elegant presentation poster */
                        <div className="relative w-full h-full">
                          {activeDish?.imageUrl ? (
                            <img 
                              src={activeDish.imageUrl} 
                              alt={video.title} 
                              loading="lazy"
                              className="w-full h-full object-cover opacity-90 filter brightness-95"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex flex-col items-center justify-center text-zinc-600">
                              <Zap size={40} className="text-[#FF5C00] animate-pulse" />
                              <span className="text-[10px] font-mono mt-2">DÉMO EN COURS</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dark video gradients overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/50 pointer-events-none" />
                    </div>
                  ) : (
                    /* OFFLINE FALLBACK MODE: EXACTLY matching your request "The live is off" */
                    <div className="relative w-full h-full bg-zinc-950 flex flex-col items-center justify-center text-center p-6">
                      {/* Background blurred splash of dish */}
                      {activeDish?.imageUrl && (
                        <img 
                          src={activeDish.imageUrl} 
                          alt="Offline backdrop" 
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-lg brightness-50"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      
                      {/* Offline banner card */}
                      <div className="relative z-10 space-y-3.5 flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full bg-zinc-900/90 border border-white/10 flex items-center justify-center shadow-xl">
                          <Users size={22} className="text-zinc-500" />
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[9.5px] font-mono uppercase bg-red-600/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full font-black tracking-widest inline-block animate-pulse">
                            🔴 HORS LIGNE
                          </span>
                          <h3 className="text-sm font-black uppercase text-zinc-300 tracking-wider mt-1.5">
                            "The live is off"
                          </h3>
                          <p className="text-[10.5px] text-zinc-400 font-sans max-w-[280px] leading-relaxed">
                            Le direct de <span className="text-amber-400 font-bold">@{restaurant?.name || 'Chef'}</span> est éteint. Heureusement, sa boutique, les commentaires et la commande restent actifs ci-dessous !
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OVERLAYS ON THE VIDEO SECTION (Only shown if Cinema Mode is off) */}
                  {!isCinemaModeLive && (
                    <>
                      {/* 1. Host profile badge & followers indicator */}
                      <div className="absolute top-3 left-3 flex items-center gap-2 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/5 z-10">
                        <div className="w-6 h-6 rounded-full bg-zinc-900 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
                          {restaurant?.logoUrl ? (
                            <img src={restaurant.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Users size={11} className="text-[#FF5C00]" />
                          )}
                        </div>
                        <div className="min-w-0 pr-1">
                          <h4 className="text-[9px] font-black text-white truncate max-w-[85px] leading-none">
                            {restaurant?.name || 'Chef Resto'}
                          </h4>
                          <div className="flex items-center gap-0.5 mt-0.5 leading-none">
                            <Star size={7} className="fill-amber-400 text-amber-400" />
                            <span className="text-[7.5px] text-zinc-400 font-mono font-bold">4.9</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsFollowing(prev => !prev)}
                          className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase transition-all ${
                            isFollowing 
                              ? 'bg-zinc-800 text-zinc-400' 
                              : 'bg-[#FF5C00] text-white hover:bg-[#FF7A00]'
                          }`}
                        >
                          {isFollowing ? '✔' : 'Suivre'}
                        </button>
                      </div>

                      {/* 2. Interactive Viewers Counter */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-mono font-bold border border-white/5 z-10 text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                        <span>{watcherCount} spectateurs</span>
                      </div>

                      {/* 3. Floating Quick Control Tools over video (Son, Mode Épuré) */}
                      <div className="absolute right-3 bottom-3 flex flex-col gap-2 z-10">
                        {/* Volume Mute Toggle */}
                        <button
                          onClick={() => setIsMuted(prev => !prev)}
                          className="w-7.5 h-7.5 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                          title={isMuted ? "Activer le son" : "Désactiver le son"}
                        >
                          {isMuted ? <VolumeX size={12} className="text-zinc-400" /> : <Volume2 size={12} className="text-[#FF5C00]" />}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Clutter-Free View Trigger Button (Always visible so users can toggle cleanly) */}
                  <button
                    onClick={() => setIsCinemaModeLive(prev => !prev)}
                    className="absolute left-3 bottom-3 z-15 px-2.5 py-1 rounded-lg bg-zinc-950/85 backdrop-blur-md border border-white/10 text-[8.5px] font-mono text-zinc-400 hover:text-white uppercase tracking-wider flex items-center gap-1 transition-all"
                  >
                    <Eye size={10} className={isCinemaModeLive ? "text-[#FF5C00]" : "text-zinc-500"} />
                    <span>{isCinemaModeLive ? "Mode normal" : "Cinéma épuré"}</span>
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* B. HIGH-PRIORITY PURCHASE & INTERACTIVE AREA (Just below the video, before comments) */}
            <div className="p-3 bg-zinc-900 border-b border-white/10 shrink-0 space-y-2.5 z-10">
              {/* Product Info Row */}
              {activeDish && (
                <div className="p-2 rounded-2xl bg-zinc-950/80 border border-white/5 flex gap-2.5 shadow-lg relative shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden shrink-0 relative">
                    {activeDish.imageUrl ? (
                      <img 
                        src={activeDish.imageUrl} 
                        alt={activeDish.name} 
                        loading="lazy"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900">
                        <ShoppingBag size={12} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[7px] bg-[#FF5C00]/15 text-[#FF5C00] border border-[#FF5C00]/20 font-black px-1.5 py-0.5 rounded font-mono uppercase tracking-widest animate-pulse">
                        EN DIRECT
                      </span>
                      {activeDish.stockCount !== undefined && activeDish.stockCount < 5 && (
                        <span className="text-[7px] bg-red-600/25 text-red-500 border border-red-500/20 font-black px-1.5 py-0.5 rounded font-mono uppercase tracking-widest">
                          Stock Faible
                        </span>
                      )}
                    </div>
                    <h4 className="text-[10px] font-black text-white truncate uppercase tracking-wide mt-0.5 leading-none">
                      {activeDish.name}
                    </h4>
                    <p className="text-[9.5px] text-amber-400 font-mono font-black mt-0.5">{activeDish.price.toFixed(2)} €</p>
                  </div>

                  {/* Stock countdown indicator */}
                  <div className="text-right flex flex-col justify-center pr-1 shrink-0">
                    <span className="text-[7.5px] text-zinc-500 font-bold uppercase">Disponibles</span>
                    <span className="text-[10.5px] font-mono text-[#FF5C00] font-black">
                      {activeDish.stockCount !== undefined ? `${activeDish.stockCount} portions` : `${bidCount} portions`}
                    </span>
                  </div>
                </div>
              )}

              {/* Purchase Actions (High visibility, right under video) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (activeDish) {
                      onAddToCart(activeDish, 1);
                      setSavedSuccessAlert("Ajouté au panier !");
                      setTimeout(() => setSavedSuccessAlert(null), 1500);
                    }
                  }}
                  className="py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white font-black uppercase text-[9px] tracking-wider text-center transition-all border border-white/5 hover:border-white/20 active:scale-95 cursor-pointer"
                >
                  Ajouter au panier
                </button>

                <button
                  onClick={handlePlaceOrder}
                  className="py-2.5 rounded-xl bg-[#FF5C00] hover:bg-[#FF7A00] text-zinc-950 font-black uppercase text-[9px] tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-lg shadow-[#FF5C00]/10"
                >
                  <Zap size={11} className="fill-zinc-950 text-zinc-950" />
                  Acheter : {activeDish ? activeDish.price.toFixed(2) : currentBidPrice} €
                </button>
              </div>

              {/* Interactive Video Polls & Recycle Summary Generation Section */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                {/* 1. Poll Module */}
                {poll ? (
                  <div className="p-2 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[8px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-0.5">
                        <BarChart2 size={9} />
                        Sondage Live
                      </h5>
                      {poll.userVotedIndex !== null && (
                        <span className="text-[7px] font-mono text-emerald-400 font-bold uppercase">Voté !</span>
                      )}
                    </div>
                    <p className="text-[8.5px] font-black text-zinc-200 leading-tight truncate">
                      {poll.question}
                    </p>
                    <div className="space-y-0.5">
                      {poll.options.map((opt, idx) => {
                        const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0) || 1;
                        const percent = Math.round((opt.votes / totalVotes) * 100);
                        const isVoted = poll.userVotedIndex === idx;

                        return (
                          <button
                            key={idx}
                            disabled={poll.userVotedIndex !== null}
                            onClick={() => handleVote(idx)}
                            className={`w-full relative overflow-hidden rounded-md p-1 text-left text-[8px] font-bold transition-all flex items-center justify-between border ${
                              isVoted
                                ? 'border-[#FF5C00] bg-[#FF5C00]/10 text-[#FF5C00]'
                                : 'border-white/5 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300'
                            } disabled:cursor-default`}
                          >
                            {/* Vote percentage bar overlay */}
                            {poll.userVotedIndex !== null && (
                              <div 
                                className="absolute left-0 top-0 bottom-0 bg-white/5 transition-all duration-500 pointer-events-none" 
                                style={{ width: `${percent}%` }}
                              />
                            )}
                            <span className="relative z-10 truncate max-w-[80px]">{opt.text}</span>
                            <span className="relative z-10 font-mono text-[7.5px] font-black text-zinc-400">
                              {poll.userVotedIndex !== null ? `${percent}%` : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-zinc-950/40 border border-white/5 flex items-center justify-center text-zinc-600 text-[8px] font-bold uppercase">
                    Pas de sondage
                  </div>
                )}

                {/* 2. Recycle Summary Module */}
                <div className="p-2 rounded-xl bg-zinc-950/40 border border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[8px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-0.5">
                      <Leaf size={9} className="text-emerald-500" />
                      Éco-Tri IA
                    </h5>
                    {!recycleSummary && (
                      <button
                        onClick={handleGenerateRecycleSummary}
                        disabled={isGeneratingRecycle}
                        className="text-[7px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isGeneratingRecycle ? "Calcul..." : "Consignes"}
                      </button>
                    )}
                  </div>

                  {isGeneratingRecycle ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-1 text-center bg-zinc-950/60 rounded-lg mt-1">
                      <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-[7px] font-mono text-zinc-500 animate-pulse mt-0.5">Gemini analyse l'impact...</p>
                    </div>
                  ) : recycleSummary ? (
                    <div className="text-[7.5px] text-zinc-300 bg-zinc-950/80 p-1.5 rounded-lg border border-emerald-500/10 leading-normal font-sans max-h-[58px] overflow-y-auto scrollbar-thin whitespace-pre-line mt-1">
                      {recycleSummary}
                    </div>
                  ) : (
                    <p className="text-[7.5px] text-zinc-500 leading-tight mt-1">
                      Cliquez sur "Consignes" pour obtenir le sourcing et l'impact de ce plat.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* C. THE COMMENTS AREA (Middle - Takes up remaining scroll space) */}
            {/* Exactly as requested: Comments scrollable directly below the purchase elements */}
            <div className="flex-1 flex flex-col min-h-0 bg-zinc-950/40">
              
              {/* Leader banner indicator */}
              <div className="px-3 py-1 bg-zinc-900 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 text-[8.5px] uppercase tracking-wide font-black text-amber-400">
                  <Sparkles size={10} className="animate-pulse text-[#FF5C00]" />
                  <span>Acheteur Direct : @{highestBidder}</span>
                </div>
                <span className="text-[8.5px] font-mono text-zinc-500 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-white/5">
                  Plat : {activeDish ? activeDish.price.toFixed(2) : currentBidPrice} €
                </span>
              </div>

              {/* Live Comment Scrolling Feed */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {chatMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`text-[10px] ${
                      msg.isSystem 
                        ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/20 p-1.5 rounded-xl text-zinc-200' 
                        : 'bg-white/[0.02] p-1.5 rounded-xl border border-white/5 hover:bg-white/[0.04] transition-all'
                    }`}
                  >
                    {!msg.isSystem ? (
                      <p className="leading-tight">
                        <span className={`font-black uppercase text-[8.5px] tracking-wide mr-1.5 ${msg.color || 'text-zinc-400'}`}>
                          @{msg.user}
                        </span>
                        <span className="text-zinc-200 font-sans font-medium">{msg.text}</span>
                      </p>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[#FF5C00] shrink-0 animate-pulse" />
                        <p className="text-[8.5px] font-bold text-amber-300 leading-normal">{msg.text}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* In-Live Chat Form */}
              <div className="p-2 border-t border-white/5 bg-zinc-950/80 shrink-0">
                <form onSubmit={handleSendChat} className="flex gap-1.5">
                  <input
                    type="text"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    placeholder="Discuter en direct..."
                    className="flex-1 bg-zinc-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-[10px] text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5C00]"
                  />
                  <button
                    type="submit"
                    style={{ backgroundColor: accentColor }}
                    className="p-1.5 rounded-xl text-zinc-950 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <Send size={11} className="text-zinc-950" />
                  </button>
                </form>
              </div>
            </div>

          </div>

          {/* Micro confirmation toast inside stream room */}
          {savedSuccessAlert && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/10 text-[#FF5C00] px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-2xl z-50 flex items-center gap-1.5 animate-fade-in">
              <Sparkles size={11} className="animate-pulse" />
              {savedSuccessAlert}
            </div>
          )}

          {/* Simulated hearts or sparkles flying on bid action */}
          {showConfetti && (
            <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 30 + Math.random() * 100;
                const tx = Math.cos(angle) * distance;
                const ty = Math.sin(angle) * distance;
                const size = 10 + Math.random() * 14;
                const rotation = Math.random() * 360;
                return (
                  <span
                    key={i}
                    className="absolute text-amber-400 text-lg select-none animate-ping duration-1000"
                    style={{
                      transform: `translate(${tx}px, ${ty}px) rotate(${rotation}deg)`,
                      fontSize: `${size}px`,
                      animationDuration: '1.2s'
                    }}
                  >
                    {['🔥', '🍕', '🎉', '🍔', '🌮', '👑'][i % 6]}
                  </span>
                );
              })}
            </div>
          )}

        </section>

      </div>

    </div>
  );
};

export default WhatnotLiveRoom;
