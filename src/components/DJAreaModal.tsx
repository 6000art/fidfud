import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Disc, 
  Radio, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  X, 
  Music, 
  Heart, 
  Flame, 
  MessageCircle, 
  Send, 
  Plus, 
  ShoppingBag, 
  Check, 
  Sliders, 
  Maximize2, 
  Headphones, 
  Zap, 
  Coffee, 
  Award,
  Users,
  ChevronRight,
  ChevronLeft,
  Share2,
  DollarSign
} from 'lucide-react';
import { DJSession, DJTrackRequest, Dish, Restaurant } from '../types';
import BackgroundVideoPlayer from './BackgroundVideoPlayer';
import { STABLE_CULINARY_FALLBACK_VIDEOS } from '../utils/videoUtils';

interface DJAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  dishes: Dish[];
  onAddToCart: (dish: Dish, quantity: number) => void;
  onSelectDish?: (dishId: string) => void;
  accentColor?: string;
}

const INITIAL_DJ_SESSIONS: DJSession[] = [
  {
    id: 'dj-1',
    djName: 'DJ Alex Keys',
    djAvatar: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=200&auto=format&fit=crop&q=80',
    restaurantId: 'rest-1',
    restaurantName: 'Villa Gourmet - Paris 11e',
    genre: 'Deep House & Organic Lounge',
    currentMood: 'Deep House',
    listenersCount: 1420,
    videoUrl: STABLE_CULINARY_FALLBACK_VIDEOS[0],
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
    isLive: true,
    bpm: 124,
    currentTrack: {
      title: 'Midnight Aperitivo (Villa Mix)',
      artist: 'Alex Keys feat. Nora B',
      releaseYear: '2026'
    },
    upcomingTracks: [
      { title: 'Truffle & Synth Vibes', artist: 'Solomun Groove' },
      { title: 'Parisian Rooftop Sunset', artist: 'Kungs & Keinemusik' },
      { title: 'Flambé & Bass', artist: 'Black Coffee Edit' }
    ],
    bio: 'Artiste résident Fidfud. Fusionne beats électro chaleureux & cuivres jazz pour accompagner les repas gastronomiques.'
  },
  {
    id: 'dj-2',
    djName: 'DJ Nina Groove',
    djAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    restaurantId: 'rest-2',
    restaurantName: 'Le Bistro Mousse - Voltaire',
    genre: 'Nu-Jazz & Chillout Vinyl',
    currentMood: 'Sunset Chill',
    listenersCount: 890,
    videoUrl: STABLE_CULINARY_FALLBACK_VIDEOS[1],
    coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    isLive: true,
    bpm: 112,
    currentTrack: {
      title: 'Velvet Espresso Martini',
      artist: 'Nina Groove & St Germain',
      releaseYear: '2025'
    },
    upcomingTracks: [
      { title: 'Bossa Nova in the Kitchen', artist: 'Bebel Gilberto' },
      { title: 'Lo-Fi Burger Lounge', artist: 'Chillhop Beats' },
      { title: 'Slow Cooked Saxophone', artist: 'FKJ Style' }
    ],
    bio: 'Sets vinyles rares, soul, funk et bossa nova douce pour créer une atmosphère chaleureuse et intimiste.'
  },
  {
    id: 'dj-3',
    djName: 'DJ Marcus Bass',
    djAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    restaurantId: 'rest-3',
    restaurantName: 'Rooftop Afro-Grill & Cocktails',
    genre: 'Afro Beats & High Energy Grill',
    currentMood: 'Afro Beats',
    listenersCount: 2350,
    videoUrl: STABLE_CULINARY_FALLBACK_VIDEOS[2],
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    isLive: true,
    bpm: 128,
    currentTrack: {
      title: 'Amapiano Sunset & Braai',
      artist: 'Marcus Bass & Major League',
      releaseYear: '2026'
    },
    upcomingTracks: [
      { title: 'Kigali Night Market', artist: 'Burna Boy Remix' },
      { title: 'Suya Spicy Drums', artist: 'Uncle Waffles' },
      { title: 'Rooftop Cocktails & Bass', artist: 'Rampa & &ME' }
    ],
    bio: 'Perce percussionniste & DJ enflammant le rooftop chaque soir. Ambiance festive et énergique garantie !'
  }
];

const MOOD_PRESETS = [
  { id: 'Sunset Chill', label: '🌅 Sunset Chill', bpm: 108, color: 'from-amber-500/20 to-orange-500/20', accent: '#F59E0B', desc: 'Ambiance lounge douce, aperitivo & cocktails' },
  { id: 'Deep House', label: '🎧 Deep House', bpm: 124, color: 'from-purple-500/20 to-pink-500/20', accent: '#A855F7', desc: 'Rythme enveloppant, idéal pour dîner entre amis' },
  { id: 'Afro Beats', label: '🔥 Afro Beats', bpm: 128, color: 'from-emerald-500/20 to-teal-500/20', accent: '#10B981', desc: 'Percussions vibrantes & grillades festives' },
  { id: 'Groove & Dine', label: '🎷 Groove & Dine', bpm: 115, color: 'from-rose-500/20 to-red-500/20', accent: '#F43F5E', desc: 'Funk, Disco & vibes pétillantes en salle' },
  { id: 'Electro Speakeasy', label: '🍸 Speakeasy', bpm: 120, color: 'from-blue-500/20 to-indigo-500/20', accent: '#6366F1', desc: 'Jazz feutré & basses électro élégantes' }
];

export default function DJAreaModal({
  isOpen,
  onClose,
  restaurants,
  dishes,
  onAddToCart,
  onSelectDish,
  accentColor = '#FF5C00'
}: DJAreaModalProps) {
  const [sessions, setSessions] = useState<DJSession[]>(INITIAL_DJ_SESSIONS);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/dj-sessions')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setSessions(data.filter((s: DJSession) => s.isLive !== false));
          }
        })
        .catch(err => console.error('[DJAreaModal] Error fetching live sessions:', err));
    }
  }, [isOpen]);
  const [activeSessionId, setActiveSessionId] = useState<string>(INITIAL_DJ_SESSIONS[0].id);
  const [activeMood, setActiveMood] = useState<string>(INITIAL_DJ_SESSIONS[0].currentMood);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Mobile Navigation Tab State
  const [mobileTab, setMobileTab] = useState<'stage' | 'chat' | 'requests' | 'menu'>('stage');

  // Reaction Counts
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({
    '🔥': 342,
    '🎧': 210,
    '💃': 188,
    '🥂': 415,
    '❤️': 560
  });

  // Track Request Form
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [requestTrackName, setRequestTrackName] = useState<string>('');
  const [requestArtistName, setRequestArtistName] = useState<string>('');
  const [requestMessage, setRequestMessage] = useState<string>('');
  const [requestTip, setRequestTip] = useState<number>(2);
  const [recentRequests, setRecentRequests] = useState<DJTrackRequest[]>([
    {
      id: 'req-1',
      djId: 'dj-1',
      senderName: 'Camille B. (Table 04)',
      trackName: 'Music Sounds Better With You',
      artistName: 'Stardust',
      message: 'Un grand merci au chef pour le tartare fabuleux ! 🔥',
      tipAmount: 5,
      createdAt: 'Il y a 3 min'
    },
    {
      id: 'req-2',
      djId: 'dj-1',
      senderName: 'Thomas R.',
      trackName: 'Cola',
      artistName: 'CamelPhat',
      message: 'Santé à toute l’équipe ! 🥂',
      tipAmount: 2,
      createdAt: 'Il y a 8 min'
    }
  ]);

  // Live Chat Stream & Overlay States
  const [chatInput, setChatInput] = useState<string>('');
  const [chatFilter, setChatFilter] = useState<'all' | 'dj' | 'requests'>('all');
  const [chatMessages, setChatMessages] = useState<{ id: string; user: string; avatar?: string; text: string; time: string; isTip?: boolean; isDJ?: boolean; role?: string }[]>([
    { id: 'm1', user: 'Sophie_L', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', text: 'Le son est dingue ce soir !! 🎧', time: '21:02', role: 'Table 04' },
    { id: 'm2', user: 'Marc_Gourmet', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', text: 'On vient de commander le Burger Signature en écoutant le set 🍔🔥', time: '21:04', role: 'VIP' },
    { id: 'm3', user: 'DJ Alex Keys', avatar: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=100&auto=format&fit=crop&q=80', text: 'Merci pour vos vibes ! Prochain morceau dans 2 minutes 🎶', time: '21:05', isDJ: true, role: 'DJ Résident' },
    { id: 'm4', user: 'Léa & Antoine', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80', text: 'Santé à tout le restaurant ! 🥂✨', time: '21:06', role: 'Table 12' }
  ]);

  // Periodic real-time simulated viewer interactions
  useEffect(() => {
    if (!isOpen) return;

    const simulatedNames = ['Julien_P', 'Clara_M', 'Lucas_Vibes', 'Emma_Bistro', 'Antoine_Foodie', 'Elena_Rooftop'];
    const simulatedAvatars = [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100&auto=format&fit=crop&q=80'
    ];
    const simulatedPhrases = [
      'Incroyable cette transition ! 🔥',
      'Ce track va tellement bien avec le cocktails 🍸',
      'Grosse force au DJ et à la cuisine 🍔🎶',
      'On adore la vibe depuis notre table !! 🎷',
      'Quelle est la référence du morceau SVP ? ❤️'
    ];

    const interval = setInterval(() => {
      const randomUser = simulatedNames[Math.floor(Math.random() * simulatedNames.length)];
      const randomAvatar = simulatedAvatars[Math.floor(Math.random() * simulatedAvatars.length)];
      const randomText = simulatedPhrases[Math.floor(Math.random() * simulatedPhrases.length)];
      
      setChatMessages(prev => [
        ...prev.slice(-25),
        {
          id: Date.now().toString(),
          user: randomUser,
          avatar: randomAvatar,
          text: randomText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          role: 'Auditeur Live'
        }
      ]);
    }, 9000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Added Dish Toast Feedback
  const [addedDishNotice, setAddedDishNotice] = useState<string | null>(null);

  const activeSession = useMemo(() => {
    const found = (sessions && sessions.length > 0) 
      ? (sessions.find(s => s.id === activeSessionId) || sessions[0])
      : INITIAL_DJ_SESSIONS[0];
    
    return {
      ...INITIAL_DJ_SESSIONS[0],
      ...found,
      djName: found?.djName || INITIAL_DJ_SESSIONS[0].djName,
      restaurantName: found?.restaurantName || INITIAL_DJ_SESSIONS[0].restaurantName,
      videoUrl: found?.videoUrl || INITIAL_DJ_SESSIONS[0].videoUrl,
      currentTrack: found?.currentTrack || INITIAL_DJ_SESSIONS[0].currentTrack,
      upcomingTracks: Array.isArray(found?.upcomingTracks) && found.upcomingTracks.length > 0
        ? found.upcomingTracks
        : INITIAL_DJ_SESSIONS[0].upcomingTracks
    };
  }, [sessions, activeSessionId]);

  const currentSessionIndex = useMemo(() => {
    const list = sessions && sessions.length > 0 ? sessions : INITIAL_DJ_SESSIONS;
    const idx = list.findIndex(s => s.id === activeSession.id);
    return idx >= 0 ? idx : 0;
  }, [sessions, activeSession]);

  const handleNextSession = () => {
    const list = sessions && sessions.length > 0 ? sessions : INITIAL_DJ_SESSIONS;
    const nextIdx = (currentSessionIndex + 1) % list.length;
    if (list[nextIdx]) {
      setActiveSessionId(list[nextIdx].id);
      if (list[nextIdx].currentMood) {
        setActiveMood(list[nextIdx].currentMood);
      }
    }
  };

  const handlePrevSession = () => {
    const list = sessions && sessions.length > 0 ? sessions : INITIAL_DJ_SESSIONS;
    const prevIdx = (currentSessionIndex - 1 + list.length) % list.length;
    if (list[prevIdx]) {
      setActiveSessionId(list[prevIdx].id);
      if (list[prevIdx].currentMood) {
        setActiveMood(list[prevIdx].currentMood);
      }
    }
  };

  const activeRestaurantDishes = useMemo(() => {
    return dishes.filter(d => d.restaurantId === activeSession.restaurantId || d.isAvailable).slice(0, 4);
  }, [dishes, activeSession]);

  // Auto-scroll chat to bottom
  const chatBottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  if (!isOpen) return null;

  const handleSendReaction = (emoji: string) => {
    setReactionCounts(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
  };

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTrackName.trim()) return;

    const newReq: DJTrackRequest = {
      id: Date.now().toString(),
      djId: activeSession.id,
      senderName: 'Vous (Auditeur Live)',
      trackName: requestTrackName,
      artistName: requestArtistName || 'Artiste Indépendant',
      message: requestMessage,
      tipAmount: requestTip,
      createdAt: 'À l’instant'
    };

    setRecentRequests(prev => [newReq, ...prev]);
    
    // Add to chat too
    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        user: 'Vous (Dédicace)',
        text: `🎵 Demande: "${requestTrackName}" (${requestTip > 0 ? `Pourboire ${requestTip}€ 🔥` : 'Gratuit'}) - ${requestMessage || 'Merci DJ !'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isTip: requestTip > 0
      }
    ]);

    setRequestTrackName('');
    setRequestArtistName('');
    setRequestMessage('');
    setShowRequestModal(false);

    setAddedDishNotice(`Dédicace envoyée au DJ ! 🎵 ${requestTip > 0 ? `Pourboire de ${requestTip}€ offert.` : ''}`);
    setTimeout(() => setAddedDishNotice(null), 4000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        user: 'Vous',
        text: chatInput,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setChatInput('');
  };

  const currentMoodConfig = MOOD_PRESETS.find(m => m.id === activeMood) || MOOD_PRESETS[1];

  return (
    <div className="fixed inset-0 z-[250] bg-zinc-950/95 backdrop-blur-2xl text-white flex flex-col overflow-hidden animate-fadeIn">
      
      {/* TOP BAR HEADER */}
      <div className="h-16 px-3 sm:px-6 border-b border-zinc-800/80 bg-zinc-950/90 flex items-center justify-between shrink-0 z-30 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#FF5C00]/15 border border-[#FF5C00]/40 flex items-center justify-center text-[#FF5C00] shadow-lg shadow-[#FF5C00]/20 shrink-0">
            <Disc size={20} className="animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#FF5C00] flex items-center gap-1">
                <Radio size={12} className="text-red-500 animate-pulse" />
                <span className="truncate">Espace DJ Live</span>
              </span>
              <span className="text-[9px] font-mono bg-red-500/20 text-red-400 border border-red-500/40 px-1.5 py-0.2 rounded-full font-bold shrink-0">
                DIRECT
              </span>
            </div>
            <h2 className="text-xs sm:text-sm font-black text-zinc-100 italic truncate">
              {activeSession.djName} @ {activeSession.restaurantName}
            </h2>
          </div>
        </div>

        {/* Action Controls Right */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mute/Unmute Audio Toggle */}
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              isAudioMuted
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
            title={isAudioMuted ? "Activer le son du DJ" : "Couper le son"}
          >
            {isAudioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span className="hidden sm:inline">{isAudioMuted ? 'Son Coupé' : 'Son On'}</span>
          </button>

          {/* Request Track Modal Trigger */}
          <button
            onClick={() => setShowRequestModal(true)}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-[#FF5C00] hover:bg-[#ff6d1a] text-white border border-[#FF5C00] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#FF5C00]/25 active:scale-95 transition-all"
          >
            <Music size={15} />
            <span className="hidden sm:inline">Dédicace</span>
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer active:scale-95"
            title="Fermer l'espace DJ"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* MOBILE NAVIGATION TAB BAR (lg:hidden) */}
      <div className="lg:hidden bg-zinc-950 border-b border-zinc-800 px-2 py-1.5 flex items-center justify-around gap-1 shrink-0 z-20 overflow-x-auto no-scrollbar">
        {[
          { id: 'stage', label: '📺 Direct & Son', icon: Disc },
          { id: 'chat', label: '💬 Chat Live', icon: MessageCircle },
          { id: 'requests', label: '🎵 Dédicaces', icon: Zap },
          { id: 'menu', label: '🍔 Carte Resto', icon: ShoppingBag }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = mobileTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                isActive
                  ? 'bg-[#FF5C00] text-white border-[#FF5C00] shadow-md shadow-[#FF5C00]/20'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 lg:grid-cols-12 gap-5 p-3 sm:p-5 max-w-7xl mx-auto w-full">
        
        {/* LEFT / CENTER COLUMN: MAIN LIVE DJ VIDEO STAGE & MOOD CONTROLS (8 COLS) */}
        <div className={`lg:col-span-8 flex flex-col gap-4 ${mobileTab === 'stage' || mobileTab === 'menu' ? 'block' : 'hidden lg:flex'}`}>
          
          {/* DJ SESSION CHANNEL SELECTOR BAR */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 shrink-0 font-mono pr-1">
              Scènes DJ:
            </span>
            {sessions.map(s => {
              const isActive = s.id === activeSessionId;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSessionId(s.id);
                    setActiveMood(s.currentMood);
                  }}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2.5 border ${
                    isActive
                      ? 'bg-[#FF5C00] text-white border-[#FF5C00] shadow-lg shadow-[#FF5C00]/30 scale-102'
                      : 'bg-zinc-900/80 text-zinc-300 hover:text-white border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  <img src={s.djAvatar} alt={s.djName} className="w-5 h-5 rounded-full object-cover" />
                  <div className="text-left">
                    <p className="leading-none text-[11px] font-black">{s.djName}</p>
                    <p className="text-[9px] opacity-70 font-mono leading-tight">{s.genre}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* MAIN STAGE DISPLAY CANVAS */}
          <div className="relative aspect-video w-full bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl group">
            
            {/* Background Video Player */}
            <BackgroundVideoPlayer
              src={activeSession.videoUrl}
              isPlaying={isPlaying}
              isMuted={isAudioMuted}
              className="w-full h-full object-cover"
            />

            {/* Ambient Lighting Overlay according to Mood */}
            <div className={`absolute inset-0 bg-gradient-to-t ${currentMoodConfig.color} pointer-events-none mix-blend-overlay transition-all duration-700`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />

            {/* Stage Top Badges */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-black text-white border border-white/20 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span>LIVE 4K</span>
              </div>
              <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-mono font-bold text-zinc-300 border border-white/10 flex items-center gap-1.5">
                <Users size={13} className="text-emerald-400" />
                <span>{activeSession.listenersCount.toLocaleString()} auditeurs</span>
              </div>
            </div>

            {/* PREVIOUS & NEXT STAGE SESSION BUTTONS */}
            <button
              type="button"
              onClick={handlePrevSession}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 bg-black/70 hover:bg-[#FF5C00] text-white rounded-full border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-2xl hover:scale-110 active:scale-95 group/btn"
              title="Scène DJ précédente"
            >
              <ChevronLeft size={22} className="group-hover/btn:-translate-x-0.5 transition-transform" />
            </button>
            <button
              type="button"
              onClick={handleNextSession}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 bg-black/70 hover:bg-[#FF5C00] text-white rounded-full border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-2xl hover:scale-110 active:scale-95 group/btn"
              title="Scène DJ suivante"
            >
              <ChevronRight size={22} className="group-hover/btn:translate-x-0.5 transition-transform" />
            </button>

            {/* Equalizer Sound Waves Animation Badge */}
            <div className="absolute top-4 right-4 z-20 bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 flex items-center gap-2">
              <div className="flex items-end gap-1 h-3.5">
                <span className="w-1 bg-[#FF5C00] rounded-full animate-bounce h-full" style={{ animationDelay: '0.1s' }} />
                <span className="w-1 bg-[#FF5C00] rounded-full animate-bounce h-2/3" style={{ animationDelay: '0.3s' }} />
                <span className="w-1 bg-[#FF5C00] rounded-full animate-bounce h-full" style={{ animationDelay: '0.2s' }} />
                <span className="w-1 bg-[#FF5C00] rounded-full animate-bounce h-1/2" style={{ animationDelay: '0.4s' }} />
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-400">{activeSession.bpm} BPM</span>
            </div>

            {/* Stage Bottom Info: Now Playing Track & Quick Reaction Bar */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-black/80 backdrop-blur-xl p-3.5 md:p-4 rounded-2xl border border-white/15">
              
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/20 border border-[#FF5C00]/40 flex items-center justify-center text-[#FF5C00] shrink-0">
                  <Music size={20} className="animate-spin-slow" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5C00]">En cours de lecture</span>
                    <span className="text-[10px] font-mono text-zinc-400">({currentMoodConfig.label})</span>
                  </div>
                  <h4 className="text-xs md:text-sm font-black text-white truncate">{activeSession.currentTrack.title}</h4>
                  <p className="text-[11px] text-zinc-400 font-sans truncate">{activeSession.currentTrack.artist}</p>
                </div>
              </div>

              {/* Quick Reactions Launcher */}
              <div className="flex items-center gap-1.5 self-end md:self-auto">
                {['🔥', '🎧', '💃', '🥂', '❤️'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-[#FF5C00] hover:text-white transition-all cursor-pointer text-sm flex items-center gap-1 active:scale-125 border border-white/10"
                    title={`Envoyer ${emoji}`}
                  >
                    <span>{emoji}</span>
                    <span className="text-[10px] font-mono font-bold opacity-80">{reactionCounts[emoji] || 0}</span>
                  </button>
                ))}
              </div>

            </div>

          </div>

          {/* SET THE MOOD (AMBIANCE SELECTOR) */}
          <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-[#FF5C00]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200 italic">
                  Définir l'Ambiance de la Salle ("Set the Mood")
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">Influencer la playlist & la lumière</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {MOOD_PRESETS.map(m => {
                const isSelected = activeMood === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveMood(m.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[70px] ${
                      isSelected
                        ? 'bg-zinc-800 border-[#FF5C00] ring-2 ring-[#FF5C00]/30 text-white shadow-md'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/80'
                    }`}
                  >
                    <span className="text-xs font-black truncate">{m.label}</span>
                    <p className="text-[9px] font-mono opacity-70 line-clamp-2">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LINKED RESTAURANT MENU: COMMANDER EN ÉCOUTANT */}
          <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200 italic">
                  Menu du Restaurant en Direct — {activeSession.restaurantName}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">Livraison à table ou à domicile ⚡</span>
            </div>

            {addedDishNotice && (
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl animate-fadeIn flex items-center justify-between">
                <span>{addedDishNotice}</span>
                <Check size={16} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeRestaurantDishes.map(dish => (
                <div
                  key={dish.id}
                  className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between gap-3 group"
                >
                  {dish.imageUrl && (
                    <img src={dish.imageUrl} alt={dish.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-extrabold text-white truncate group-hover:text-[#FF5C00] transition-colors">
                      {dish.name}
                    </h4>
                    <p className="text-[11px] font-mono font-bold text-amber-400">{dish.price.toFixed(2)} €</p>
                  </div>
                  <button
                    onClick={() => {
                      onAddToCart(dish, 1);
                      setAddedDishNotice(`"${dish.name}" ajouté au panier ! 🍔`);
                      setTimeout(() => setAddedDishNotice(null), 3000);
                    }}
                    className="p-2 bg-[#FF5C00] hover:bg-[#ff6d1a] text-white rounded-lg transition-all cursor-pointer active:scale-95 shrink-0"
                    title="Ajouter au panier"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: CHAT LIVE, DÉDICACES & PROCHAINS MORCEAUX (4 COLS) */}
        <div className={`lg:col-span-4 flex flex-col gap-4 ${mobileTab === 'chat' || mobileTab === 'requests' ? 'block' : 'hidden lg:flex'}`}>
          
          {/* UPCOMING TRACKS IN DJ SET */}
          <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2">
              <Headphones size={16} className="text-[#FF5C00]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200 italic">
                Prochains Morceaux du Set
              </h3>
            </div>

            <div className="space-y-2">
              {activeSession.upcomingTracks.map((t, i) => (
                <div key={i} className="p-2.5 bg-zinc-950/80 rounded-xl border border-zinc-800/80 flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-[10px] font-mono font-bold text-zinc-400 flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-200 truncate">{t.title}</p>
                    <p className="text-[10px] text-zinc-400 font-sans truncate">{t.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DÉDICACES & RECENT REQUESTS FEED */}
          <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200 italic">
                  Dédicaces Auditeurs
                </h3>
              </div>
              <button
                onClick={() => setShowRequestModal(true)}
                className="text-[10px] font-extrabold text-[#FF5C00] hover:underline cursor-pointer"
              >
                + Ajouter
              </button>
            </div>

            <div className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar">
              {recentRequests.map(r => (
                <div key={r.id} className="p-3 bg-zinc-950/90 rounded-xl border border-amber-500/20 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-extrabold text-amber-400">{r.senderName}</span>
                    <span className="font-mono text-zinc-500">{r.createdAt}</span>
                  </div>
                  <p className="text-xs font-black text-white">🎵 {r.trackName} — <span className="text-zinc-400 font-sans">{r.artistName}</span></p>
                  {r.message && <p className="text-[11px] text-zinc-300 italic font-sans">"{r.message}"</p>}
                  {r.tipAmount > 0 && (
                    <span className="inline-block text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 mt-1">
                      Pourboire DJ: {r.tipAmount}€ 🔥
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* LIVE CHAT STREAM */}
          <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 flex flex-col justify-between min-h-[320px]">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <MessageCircle size={16} className="text-[#FF5C00]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200 italic">
                    Tchat Salle & Ambiance
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Chat
                </span>
              </div>

              {/* Pinned DJ Announcement */}
              <div className="mt-2.5 p-2 bg-[#FF5C00]/15 border border-[#FF5C00]/30 rounded-xl flex items-center gap-2">
                <Sparkles size={14} className="text-[#FF5C00] shrink-0" />
                <p className="text-[10px] text-amber-200 font-bold leading-tight">
                  <span className="text-[#FF5C00] font-black uppercase">Annonce DJ:</span> N'hésitez pas à demander vos morceaux & dédicaces en direct ! 🎧
                </p>
              </div>

              {/* Chat Filters */}
              <div className="flex items-center gap-1 mt-2.5 pb-1">
                {[
                  { id: 'all', label: 'Tous' },
                  { id: 'dj', label: '🎧 DJ Only' },
                  { id: 'requests', label: '🎵 Dédicaces' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setChatFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all border ${
                      chatFilter === f.id
                        ? 'bg-[#FF5C00] text-white border-[#FF5C00]'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Box */}
            <div className="flex-1 overflow-y-auto max-h-60 my-3 space-y-2 pr-1 no-scrollbar">
              {chatMessages
                .filter(msg => {
                  if (chatFilter === 'dj') return msg.isDJ;
                  if (chatFilter === 'requests') return msg.isTip || msg.text.includes('Demande');
                  return true;
                })
                .map(msg => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl text-xs space-y-1 transition-all ${
                      msg.isDJ
                        ? 'bg-[#FF5C00]/15 border border-[#FF5C00]/40'
                        : msg.isTip
                        ? 'bg-amber-500/10 border border-amber-500/30'
                        : 'bg-zinc-950/80 border border-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {msg.avatar && (
                          <img src={msg.avatar} alt={msg.user} className="w-4 h-4 rounded-full object-cover shrink-0" />
                        )}
                        <span className={`font-black truncate ${msg.isDJ ? 'text-[#FF5C00]' : 'text-zinc-200'}`}>
                          {msg.user}
                        </span>
                        {msg.role && (
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 shrink-0">
                            {msg.role}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-zinc-500 shrink-0">{msg.time}</span>
                    </div>
                    <p className="text-zinc-200 font-sans leading-snug">{msg.text}</p>
                  </div>
                ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Response Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
              {[
                '🔥 Trop bon ce beat !',
                '🍔 Repas commandé !',
                '🎧 Bravo DJ !',
                '🥂 Santé à la salle'
              ].map(chip => (
                <button
                  key={chip}
                  onClick={() => {
                    setChatMessages(prev => [
                      ...prev,
                      {
                        id: Date.now().toString(),
                        user: 'Vous',
                        text: chip,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        role: 'Auditeur'
                      }
                    ]);
                  }}
                  className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 text-[10px] font-medium rounded-lg border border-zinc-800 shrink-0 transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleSendChat} className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Discutez avec le DJ et la salle..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5C00]"
              />
              <button
                type="submit"
                className="p-2 bg-[#FF5C00] hover:bg-[#ff6d1a] text-white rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
              >
                <Send size={15} />
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* TRACK REQUEST MODAL POPUP */}
      {showRequestModal && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Music size={18} className="text-[#FF5C00]" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Envoyer une Dédicace au DJ
                </h3>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendRequest} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Nom du morceau *</label>
                <input
                  type="text"
                  required
                  value={requestTrackName}
                  onChange={e => setRequestTrackName(e.target.value)}
                  placeholder="Ex: Stardust - Music Sounds Better With You"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Message ou Dédicace pour la salle</label>
                <textarea
                  rows={2}
                  value={requestMessage}
                  onChange={e => setRequestMessage(e.target.value)}
                  placeholder="Ex: Merci pour le super repas à la Table 5 ! 🔥"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Pourboire DJ (optionnel)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 2, 5, 10].map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setRequestTip(amount)}
                      className={`py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                        requestTip === amount
                          ? 'bg-[#FF5C00] text-white border-[#FF5C00]'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {amount === 0 ? 'Gratuit' : `${amount} €`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#FF5C00] hover:bg-[#ff6d1a] text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg"
                >
                  Envoyer 🎵
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
