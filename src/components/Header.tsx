import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  Search, 
  User, 
  MessageSquare, 
  Bell, 
  ChevronRight, 
  MapPin, 
  Users, 
  Disc, 
  Headphones,
  Tv,
  Youtube,
  Menu, 
  X, 
  ShieldCheck, 
  Sliders, 
  Trash2, 
  MousePointer,
  Sparkles,
  LogOut,
  ChevronDown,
  Download,
  Smartphone,
  Heart,
  Wifi,
  WifiOff
} from 'lucide-react';
import CustomIcon from './CustomIcon';
import { CATEGORY_NAMES } from '../constants/categories';

const isDarkColor = (hex: string): boolean => {
  if (!hex) return true;
  const color = hex.startsWith('#') ? hex.substring(1) : hex;
  if (color.length === 3) {
    const r = parseInt(color[0] + color[0], 16);
    const g = parseInt(color[1] + color[1], 16);
    const b = parseInt(color[2] + color[2], 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
  }
  if (color.length === 6) {
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
  }
  return true;
};

interface HeaderProps {
  currentRole: 'client' | 'restaurant' | 'courier';
  onChangeRole: (role: 'client' | 'restaurant' | 'courier') => void;
  cartCount: number;
  onOpenCart: () => void;
  activeOrderCount: number;
  onOpenOrdersHistory: () => void;
  user: { id: string; email: string; role: 'client' | 'restaurant' | 'admin' | 'courier'; fullName?: string } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenSearch: () => void;
  onOpenProfile: () => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  designSettings?: any;
  onUpdateDesignSettings?: (updated: any) => void;
  userLocation?: { lat: number; lng: number } | null;
  onDetectLocation?: () => void;
  isLocating?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onOpenContacts?: () => void;
  onOpenDJArea?: () => void;
  onOpenShows?: () => void;
  onOpenYouTubers?: () => void;
  onOpenRecipes?: () => void;
  onOpenDownloadApp?: () => void;
  onOpenFavorites?: () => void;
}

const getSafeImageUrl = (url?: string): string => {
  if (!url || typeof url !== 'string' || !url.trim()) return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export default function Header({
  currentRole,
  onChangeRole,
  cartCount,
  onOpenCart,
  activeOrderCount,
  onOpenOrdersHistory,
  user,
  onOpenAuth,
  onLogout,
  onOpenAdmin,
  onOpenSearch,
  onOpenProfile,
  selectedCategory = '',
  onSelectCategory,
  designSettings,
  onUpdateDesignSettings,
  userLocation,
  onDetectLocation,
  isLocating,
  searchQuery = '',
  onSearchQueryChange,
  onOpenContacts,
  onOpenDJArea,
  onOpenShows,
  onOpenYouTubers,
  onOpenRecipes,
  onOpenDownloadApp,
  onOpenFavorites
}: HeaderProps) {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const [isCartShaking, setIsCartShaking] = useState(false);
  const [isBadgePopping, setIsBadgePopping] = useState(false);
  const [popBubbles, setPopBubbles] = useState<Array<{ id: number; text: string }>>([]);
  const [shakeBubbles, setShakeBubbles] = useState<Array<{ id: number; text: string }>>([]);
  const [logoError, setLogoError] = useState(false);
  const [isLiveMenuOpen, setIsLiveMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const liveMenuRef = useRef<HTMLDivElement>(null);
  const prevCartCountRef = useRef(cartCount);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (liveMenuRef.current && !liveMenuRef.current.contains(event.target as Node)) {
        setIsLiveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setLogoError(false);
  }, [designSettings?.logoUrl, designSettings?.headerConfig?.logoUrl]);

  // Extract Header Config & Hidden Elements from designSettings
  const headerConfig = designSettings?.headerConfig || {
    backgroundColor: designSettings?.backgroundColor || '#0B0B0C',
    backgroundOpacity: 95,
    enableBackdropBlur: true,
    logoUrl: designSettings?.logoUrl || '',
    logoPosition: 'left',
    logoSizeMobile: designSettings?.logoSizeMobile || 36,
    logoSizeDesktop: designSettings?.logoSizeDesktop || 48,
    visibleIcons: {
      hamburgerMenu: true,
      djLive: true,
      cart: true,
      account: true,
      searchBar: true,
      gpsLocation: false,
      ordersHistory: false,
    }
  };

  const hiddenElements: string[] = designSettings?.hiddenElements || [];
  const isVisualEditorActive: boolean = designSettings?.isVisualEditorActive || false;
  const isSuperAdmin = user && (user.role === 'admin' || user.email?.toLowerCase() === 'sybis.co@gmail.com');

  const accentColor = designSettings?.accentColor || '#FF5C00';
  const rawBgColor = headerConfig.backgroundColor || '#0B0B0C';
  const isBgDark = isDarkColor(rawBgColor);
  const opacityHex = Math.round(((headerConfig.backgroundOpacity ?? 95) / 100) * 255).toString(16).padStart(2, '0');
  const computedHeaderBg = `${rawBgColor}${opacityHex}`;

  const triggerCartBounce = () => {
    setIsCartBouncing(false);
    requestAnimationFrame(() => {
      setIsCartBouncing(true);
    });
    setTimeout(() => setIsCartBouncing(false), 700);
  };

  const triggerCartShake = () => {
    setIsCartShaking(false);
    requestAnimationFrame(() => {
      setIsCartShaking(true);
    });
    setTimeout(() => setIsCartShaking(false), 800);
  };

  const triggerShakeWarning = (text: string = '1 Seul Restaurant !') => {
    const newId = Date.now() + Math.random();
    setShakeBubbles(prev => [...prev.slice(-2), { id: newId, text }]);
    
    setTimeout(() => {
      setShakeBubbles(prev => prev.filter(b => b.id !== newId));
    }, 1500);
  };

  const triggerBadgePop = (qty: number = 1) => {
    const newId = Date.now() + Math.random();
    const text = `+${qty > 0 ? qty : 1}`;
    setPopBubbles(prev => [...prev.slice(-3), { id: newId, text }]);
    
    setIsBadgePopping(false);
    requestAnimationFrame(() => {
      setIsBadgePopping(true);
    });
    setTimeout(() => setIsBadgePopping(false), 600);

    setTimeout(() => {
      setPopBubbles(prev => prev.filter(b => b.id !== newId));
    }, 1150);
  };

  useEffect(() => {
    const handleCartAddEvent = (e: Event) => {
      triggerCartBounce();
      const customEvent = e as CustomEvent<{ quantity?: number }>;
      const qty = customEvent?.detail?.quantity || 1;
      triggerBadgePop(qty);
    };

    const handleCartShakeEvent = (e: Event) => {
      triggerCartShake();
      const customEvent = e as CustomEvent<{ attemptedRestaurant?: string; currentRestaurant?: string }>;
      const warningText = customEvent?.detail?.currentRestaurant 
        ? `⛔ 1 Seul Resto (${customEvent.detail.currentRestaurant})`
        : `⛔ 1 Seul Restaurant !`;
      triggerShakeWarning(warningText);
    };

    window.addEventListener('fidfud:cart-add', handleCartAddEvent);
    window.addEventListener('fidfud:cart-shake', handleCartShakeEvent);
    return () => {
      window.removeEventListener('fidfud:cart-add', handleCartAddEvent);
      window.removeEventListener('fidfud:cart-shake', handleCartShakeEvent);
    };
  }, []);

  useEffect(() => {
    if (cartCount > prevCartCountRef.current) {
      const diff = cartCount - prevCartCountRef.current;
      triggerCartBounce();
      triggerBadgePop(diff);
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  const categories = CATEGORY_NAMES;

  // 1-Click Hide Element Handler for Super Admin Visual Editor
  const handleHideElement = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateDesignSettings) return;
    if (!hiddenElements.includes(elementId)) {
      const updatedHidden = [...hiddenElements, elementId];
      onUpdateDesignSettings({ hiddenElements: updatedHidden });
    }
  };

  // Helper to check if an element is hidden
  const isHidden = (elementId: string) => hiddenElements.includes(elementId);

  return (
    <>
      <header 
        style={{
          backgroundColor: computedHeaderBg,
          backdropFilter: headerConfig.enableBackdropBlur ? 'blur(16px)' : 'none'
        }}
        className="sticky top-0 left-0 right-0 z-50 border-b border-white/5 select-none w-full max-w-full overflow-x-clip transition-all duration-300 shadow-xl"
      >
        {/* Dynamic top accent line */}
        <div className="h-[2.5px] w-full bg-gradient-to-r from-[#FF5C00] via-amber-500 to-[#FF5C00]" />

        {/* PRIMARY SPACIOUS HEADER BAR */}
        <div className="px-2.5 sm:px-6 py-2 sm:py-2.5 lg:max-w-7xl lg:mx-auto flex items-center justify-between gap-1.5 sm:gap-3 w-full max-w-full min-w-0">
          
          {/* LEFT SECTION: Hamburger Menu Button + Logo */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink min-w-0 max-w-[50%] xs:max-w-[60%] sm:max-w-none">
            
            {/* Hamburger Menu Toggle Button */}
            {!isHidden('header_hamburger') && (headerConfig.visibleIcons?.hamburgerMenu ?? true) && (
              <div className="relative group shrink-0">
                <button
                  onClick={() => setIsHamburgerOpen(true)}
                  className="p-2 sm:p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer border border-white/10 shadow-md active:scale-95 flex items-center justify-center"
                  title="Ouvrir le Menu Principal"
                >
                  <Menu size={18} className="stroke-[2.5] text-white" />
                </button>

                {/* Super Admin Edit Overlay */}
                {isVisualEditorActive && isSuperAdmin && (
                  <button
                    onClick={(e) => handleHideElement('header_hamburger', e)}
                    className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-lg z-10 cursor-pointer border border-white/40"
                    title="Masquer le bouton Hamburger (1-clic)"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            )}

            {/* Brand Logo */}
            {/* Brand Logo Container (Primary Logo + Secondary Logo) */}
            {headerConfig.logoPosition !== 'center' && !isHidden('header_logo') && (
              <div className="relative group shrink min-w-0">
                <div 
                  className="flex items-center space-x-1.5 sm:space-x-2 cursor-pointer hover:opacity-95 transition-all shrink min-w-0"
                  onClick={() => onChangeRole('client')}
                >
                  {/* Primary Logo (Icon) */}
                  {!logoError && Boolean(getSafeImageUrl(headerConfig.logoUrl || designSettings?.logoUrl)) ? (
                    <img 
                      src={getSafeImageUrl(headerConfig.logoUrl || designSettings?.logoUrl)} 
                      alt="Logo Principal" 
                      onError={() => setLogoError(true)}
                      style={{
                        height: `${Math.min(headerConfig.logoSizeMobile || 36, 36)}px`
                      }}
                      className="object-contain rounded-xl border border-white/15 shadow-md shadow-black/60 shrink-0" 
                    />
                  ) : (
                    <div 
                      style={{ 
                        backgroundColor: accentColor,
                        boxShadow: `0 0 16px ${accentColor}40`,
                        height: `${Math.min(headerConfig.logoSizeMobile || 36, 36)}px`,
                        minWidth: `${Math.min(headerConfig.logoSizeMobile || 36, 36)}px`
                      }}
                      className="rounded-xl px-2 sm:px-2.5 flex items-center justify-center gap-1 transition-all shrink-0 border border-white/20 bg-gradient-to-r from-[#FF5C00] to-[#FF8C00] text-white font-black text-xs italic shadow-lg"
                    >
                      <span>🍳</span>
                      <span className="font-black tracking-tight text-[11px] sm:text-xs truncate max-w-[80px] sm:max-w-none">{designSettings?.appName || 'FIDFUD'}</span>
                    </div>
                  )}

                  {/* Secondary Logo Option (Texte Vertical / Deuxième Image / Badge) */}
                  {(headerConfig.showSecondaryLogo ?? designSettings?.showSecondaryLogo ?? true) && (
                    <div className="hidden xs:flex items-center pl-1.5 border-l border-white/20 ml-1 shrink-0">
                      {(headerConfig.secondaryLogoType || designSettings?.secondaryLogoType) === 'image' && Boolean(getSafeImageUrl(headerConfig.secondaryLogoUrl || designSettings?.secondaryLogoUrl)) ? (
                        <img
                          src={getSafeImageUrl(headerConfig.secondaryLogoUrl || designSettings?.secondaryLogoUrl)}
                          alt="Deuxième Logo"
                          style={{ height: `${(headerConfig.logoSizeMobile || 36) * 0.9}px` }}
                          className="object-contain rounded-lg border border-white/15 shadow-sm"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (headerConfig.secondaryLogoType || designSettings?.secondaryLogoType) === 'badge' ? (
                        <span className="bg-gradient-to-r from-[#FF5C00]/25 to-amber-500/25 text-[#FF5C00] border border-[#FF5C00]/40 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono shadow-sm">
                          {headerConfig.secondaryLogoText || designSettings?.secondaryLogoText || 'PRO'}
                        </span>
                      ) : (
                        /* Texte Vertical (Lettres empilées verticalement) */
                        <div 
                          className="flex flex-col justify-center text-[7.5px] font-black uppercase tracking-widest leading-[0.9] text-[#FF5C00] font-mono select-none px-1 py-0.5 bg-black/60 rounded border border-[#FF5C00]/30 shadow-inner"
                          title="Deuxième Logo (Texte Vertical)"
                        >
                          {(headerConfig.secondaryLogoText || designSettings?.secondaryLogoText || 'STUDIO').split('').map((char, idx) => (
                            <span key={idx} className="block text-center">{char}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <span className="hidden sm:inline-block font-black tracking-tight text-white text-base italic">
                    {designSettings?.appName || 'FIDFUD'}
                  </span>
                </div>

                {/* Super Admin Edit Overlay */}
                {isVisualEditorActive && isSuperAdmin && (
                  <button
                    onClick={(e) => handleHideElement('header_logo', e)}
                    className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-lg z-10 cursor-pointer border border-white/40"
                    title="Masquer le Logo (1-clic)"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CENTER SECTION: Optional Centered Logo or Desktop Search Bar */}
          {headerConfig.logoPosition === 'center' && !isHidden('header_logo') && (
            <div className="flex-1 flex justify-center items-center">
              <div 
                className="flex items-center space-x-2 cursor-pointer hover:opacity-95 transition-all"
                onClick={() => onChangeRole('client')}
              >
                {!logoError && Boolean(getSafeImageUrl(headerConfig.logoUrl || designSettings?.logoUrl)) ? (
                  <img 
                    src={getSafeImageUrl(headerConfig.logoUrl || designSettings?.logoUrl)} 
                    alt="Logo" 
                    onError={() => setLogoError(true)}
                    style={{ height: `${headerConfig.logoSizeMobile || 36}px` }}
                    className="object-contain rounded-xl border border-white/15 shadow-md shrink-0" 
                  />
                ) : (
                  <div 
                    style={{ backgroundColor: accentColor }}
                    className="h-9 px-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-white/20 text-white font-black text-xs italic bg-gradient-to-r from-[#FF5C00] to-[#FF8C00]"
                  >
                    <span>🍳</span>
                    <span>{designSettings?.appName || 'FIDFUD'}</span>
                  </div>
                )}

                {/* Secondary Logo (Center Position) */}
                {(headerConfig.showSecondaryLogo ?? designSettings?.showSecondaryLogo ?? true) && (
                  <div className="flex items-center pl-2 border-l border-white/20 ml-1 shrink-0">
                    {(headerConfig.secondaryLogoType || designSettings?.secondaryLogoType) === 'image' && Boolean(getSafeImageUrl(headerConfig.secondaryLogoUrl || designSettings?.secondaryLogoUrl)) ? (
                      <img
                        src={getSafeImageUrl(headerConfig.secondaryLogoUrl || designSettings?.secondaryLogoUrl)}
                        alt="Deuxième Logo"
                        style={{ height: `${(headerConfig.logoSizeMobile || 36) * 0.9}px` }}
                        className="object-contain rounded-lg border border-white/15 shadow-sm"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div 
                        className="flex flex-col justify-center text-[7.5px] font-black uppercase tracking-widest leading-[0.9] text-[#FF5C00] font-mono select-none px-1 py-0.5 bg-black/60 rounded border border-[#FF5C00]/30 shadow-inner"
                      >
                        {(headerConfig.secondaryLogoText || designSettings?.secondaryLogoText || 'STUDIO').split('').map((char, idx) => (
                          <span key={idx} className="block text-center">{char}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <span className="font-black tracking-tight text-white text-base italic">
                  {designSettings?.appName || 'FIDFUD'}
                </span>
              </div>
            </div>
          )}

          {/* Desktop Search Bar (If enabled & not centered logo) */}
          {headerConfig.logoPosition !== 'center' && currentRole === 'client' && !isHidden('header_search') && (headerConfig.visibleIcons?.searchBar ?? true) && (
            <div className="hidden md:flex items-center flex-1 max-w-sm mx-6 relative group">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Rechercher un plat, un chef, un restaurant..."
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange?.(e.target.value)}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 focus:border-[#FF5C00] rounded-full py-2 pl-9 pr-4 text-xs text-white focus:outline-none transition-all placeholder-zinc-500 shadow-inner"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>

              {/* Super Admin Edit Overlay */}
              {isVisualEditorActive && isSuperAdmin && (
                <button
                  onClick={(e) => handleHideElement('header_search', e)}
                  className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-lg z-10 cursor-pointer border border-white/40"
                  title="Masquer la barre de recherche (1-clic)"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          )}

          {/* RIGHT SECTION: Primary High-Frequency Actions (Network Status, Espaces Live, Cart, Mon Compte) */}
          <div className="flex items-center space-x-1 sm:space-x-2.5 shrink-0 min-w-0">
            
            {/* Clean, Modern Online/Offline Status Indicator */}
            <div 
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all select-none ${
                isOnline 
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' 
                  : 'bg-red-950/60 text-red-400 border-red-500/50 animate-pulse'
              }`}
              title={isOnline ? "Système & Flux en direct connectés" : "Mode Hors Ligne"}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono">En ligne</span>
                </>
              ) : (
                <>
                  <WifiOff size={11} className="text-red-400" />
                  <span className="font-mono">Hors ligne</span>
                </>
              )}
            </div>

            {/* Install App PWA Button */}
            {onOpenDownloadApp && (
              <button
                onClick={onOpenDownloadApp}
                className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-[#FF5C00] border border-[#FF5C00]/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-md font-extrabold text-xs active:scale-95 shrink-0"
                title="Télécharger & Installer l'application Fidfud (Android & iOS)"
              >
                <Smartphone size={15} className="text-[#FF5C00] animate-bounce" />
                <span className="hidden md:inline-block text-[10px] font-black uppercase tracking-wider text-white">
                  Installer App
                </span>
              </button>
            )}
            
            {/* Unified Espaces Live & DJ Hub Button */}
            {(onOpenDJArea || onOpenShows || onOpenYouTubers) && !isHidden('header_dj') && (headerConfig.visibleIcons?.djLive ?? true) && (
              <div className="relative shrink-0" ref={liveMenuRef}>
                <button
                  onClick={() => setIsLiveMenuOpen(prev => !prev)}
                  className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-gradient-to-r from-[#FF5C00] via-purple-600 to-red-600 hover:opacity-90 text-white transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-lg shadow-purple-950/40 font-black text-xs border border-white/20 active:scale-95 animate-pulse"
                  title="Ouvrir le Hub Espaces Live (DJs, Émissions, YouTubers)"
                >
                  <Disc size={14} className="animate-spin-slow stroke-[2.5] shrink-0" />
                  <span className="hidden sm:inline-block text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap">
                    Espaces Live 🎧🔴
                  </span>
                  <ChevronDown size={12} className={`transition-transform duration-200 hidden xs:block ${isLiveMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu for Espaces Live */}
                {isLiveMenuOpen && (
                  <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-full mt-2 sm:w-72 bg-[#0C0C0E]/98 backdrop-blur-2xl border border-white/20 rounded-3xl p-3 shadow-2xl z-[120] flex flex-col gap-2 font-sans animate-fade-in text-left">
                    <div className="px-2 py-1 border-b border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                        <Sparkles size={12} className="text-[#FF5C00]" />
                        Hub Espaces Live
                      </span>
                      <button 
                        onClick={() => setIsLiveMenuOpen(false)}
                        className="text-zinc-500 hover:text-white p-0.5 rounded cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {/* 1. DJ Live */}
                    {onOpenDJArea && (
                      <button
                        onClick={() => {
                          setIsLiveMenuOpen(false);
                          onOpenDJArea();
                        }}
                        className="flex items-center gap-2.5 p-2 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-white transition-all cursor-pointer text-left w-full group"
                      >
                        <div className="p-2 rounded-xl bg-purple-500 text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
                          <Headphones size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black uppercase tracking-wider text-purple-300 truncate">🎧 Lounge DJs & Sets</div>
                          <div className="text-[9.5px] text-zinc-400 truncate">Sons en direct & demande de titres</div>
                        </div>
                      </button>
                    )}

                    {/* 2. Émissions Culinaires */}
                    {onOpenShows && (
                      <button
                        onClick={() => {
                          setIsLiveMenuOpen(false);
                          onOpenShows();
                        }}
                        className="flex items-center gap-2.5 p-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-white transition-all cursor-pointer text-left w-full group"
                      >
                        <div className="p-2 rounded-xl bg-amber-500 text-black shadow-md group-hover:scale-105 transition-transform shrink-0">
                          <Tv size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black uppercase tracking-wider text-amber-300 truncate">🍳 Émissions Culinaires</div>
                          <div className="text-[9.5px] text-zinc-400 truncate">Crash-tests & recettes des chefs</div>
                        </div>
                      </button>
                    )}

                    {/* 3. YouTubers Food */}
                    {onOpenYouTubers && (
                      <button
                        onClick={() => {
                          setIsLiveMenuOpen(false);
                          onOpenYouTubers();
                        }}
                        className="flex items-center gap-2.5 p-2 rounded-2xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-white transition-all cursor-pointer text-left w-full group"
                      >
                        <div className="p-2 rounded-xl bg-red-600 text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
                          <Youtube size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black uppercase tracking-wider text-red-300 truncate">📺 YouTubers Food</div>
                          <div className="text-[9.5px] text-zinc-400 truncate">Revues, tests & dégustations</div>
                        </div>
                      </button>
                    )}

                    {/* 4. Section Recettes & Astuces */}
                    {onOpenRecipes && (
                      <button
                        onClick={() => {
                          setIsLiveMenuOpen(false);
                          onOpenRecipes();
                        }}
                        className="flex items-center gap-2.5 p-2 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/30 text-white transition-all cursor-pointer text-left w-full group"
                      >
                        <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md group-hover:scale-105 transition-transform shrink-0 font-bold">
                          🍳
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black uppercase tracking-wider text-amber-300 truncate">👨‍🍳 Recettes & Astuces (&lt; 1 min)</div>
                          <div className="text-[9.5px] text-zinc-400 truncate">Omelettes, vidéos courtes & secrets de chef</div>
                        </div>
                      </button>
                    )}
                  </div>
                )}

                {/* Super Admin Edit Overlay */}
                {isVisualEditorActive && isSuperAdmin && (
                  <button
                    onClick={(e) => handleHideElement('header_dj', e)}
                    className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-lg z-10 cursor-pointer border border-white/40"
                    title="Masquer le bouton Espaces Live (1-clic)"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            )}

            {/* Favorites Trigger Button */}
            {onOpenFavorites && !isHidden('header_favorites') && (
              <div className="relative group shrink-0">
                <button
                  id="btn-header-favorites"
                  onClick={onOpenFavorites}
                  className="p-2 sm:p-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all flex items-center justify-center cursor-pointer shadow-md active:scale-95"
                  title="Mes Restaurants Favoris"
                >
                  <Heart size={16} className="stroke-[2.5] fill-red-500/20" />
                </button>

                {/* Super Admin Edit Overlay */}
                {isVisualEditorActive && isSuperAdmin && (
                  <button
                    onClick={(e) => handleHideElement('header_favorites', e)}
                    className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-lg z-10 cursor-pointer border border-white/40"
                    title="Masquer les Favoris (1-clic)"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            )}

            {/* Cart Trigger Button with Dynamic Floating Counter & Pop/Shake Animations */}
            {!isHidden('header_cart') && (headerConfig.visibleIcons?.cart ?? true) && (
              <div className="relative group shrink-0">
                {/* Floating Warning Bubbles on Single-Restaurant Boundary Restriction */}
                {shakeBubbles.map((bubble) => (
                  <div
                    key={bubble.id}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex items-center justify-center animate-shake-bubble-pop"
                  >
                    <span 
                      className="bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.9)] text-white font-black text-[9.5px] px-2.5 py-0.5 rounded-full border border-red-300 tracking-wider flex items-center gap-1 font-mono whitespace-nowrap drop-shadow-2xl select-none uppercase"
                    >
                      <span>{bubble.text}</span>
                    </span>
                  </div>
                ))}

                {/* Floating +N Flying Pop Bubbles */}
                {popBubbles.map((bubble) => (
                  <div
                    key={bubble.id}
                    className="absolute -top-7 -right-1 pointer-events-none z-50 flex items-center justify-center animate-float-add-bubble"
                  >
                    <span 
                      style={{ 
                        backgroundColor: accentColor,
                        boxShadow: `0 0 16px ${accentColor}cc`
                      }}
                      className="text-white font-black text-[10.5px] px-2 py-0.5 rounded-full border border-white/60 tracking-wider flex items-center gap-1 font-mono whitespace-nowrap drop-shadow-lg select-none"
                    >
                      <span>{bubble.text}</span>
                      <span className="text-[9px]">🛒</span>
                    </span>
                  </div>
                ))}

                <button
                  id="btn-header-cart"
                  onClick={onOpenCart}
                  className={`relative p-2 sm:p-2.5 rounded-2xl transition-all flex items-center justify-center cursor-pointer shadow-md border ${
                    isCartShaking
                      ? 'animate-cart-shake border-red-500 ring-2 ring-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.85)] bg-red-500/25 text-red-300'
                      : isCartBouncing 
                        ? 'animate-cart-bounce border-[#FF5C00] ring-2 ring-[#FF5C00]/60 shadow-[0_0_24px_rgba(255,92,0,0.65)] bg-[#FF5C00]/15 text-white' 
                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10 active:scale-95'
                  }`}
                  title={isCartShaking ? "1 seul restaurant par commande !" : "Mon Panier"}
                >
                  {/* Radial Halo Shockwave Ripple on Pop */}
                  {isBadgePopping && (
                    <span 
                      style={{ borderColor: accentColor }}
                      className="absolute inset-0 rounded-2xl border-2 animate-halo-ring pointer-events-none" 
                    />
                  )}

                  {/* Red Shockwave Ripple on Boundary Restriction Shake */}
                  {isCartShaking && (
                    <span 
                      className="absolute inset-0 rounded-2xl border-2 border-red-500 animate-cart-shake-ring pointer-events-none" 
                    />
                  )}

                  <div className={`transition-transform duration-300 flex items-center justify-center ${
                    isCartShaking 
                      ? 'animate-cart-shake text-red-400' 
                      : isCartBouncing 
                        ? 'animate-icon-bounce text-[#FF5C00]' 
                        : ''
                  }`}>
                    <CustomIcon iconKey="iconCart" defaultIcon={MessageSquare} designSettings={designSettings} size={16} />
                  </div>

                  {/* Floating Dynamic Counter Badge with Instant Pop Animation */}
                  {cartCount > 0 && (
                    <span 
                      key={`cart-badge-${cartCount}`}
                      style={{
                        backgroundColor: isCartShaking ? '#EF4444' : accentColor,
                        boxShadow: isCartShaking ? '0 0 16px rgba(239,68,68,0.9)' : `0 0 14px ${accentColor}cc`
                      }}
                      className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 text-white text-[10px] font-black rounded-full flex items-center justify-center border font-mono tracking-tight shadow-md select-none ${
                        isCartShaking 
                          ? 'bg-red-600 border-red-200 animate-cart-shake ring-2 ring-red-400'
                          : isBadgePopping 
                            ? 'bg-gradient-to-tr from-[#FF3B00] via-[#FF5C00] to-amber-400 border-white/70 animate-cart-badge-pop' 
                            : isCartBouncing 
                              ? 'bg-gradient-to-tr from-[#FF3B00] via-[#FF5C00] to-amber-400 border-white/70 animate-badge-pulse' 
                              : 'bg-gradient-to-tr from-[#FF3B00] via-[#FF5C00] to-amber-400 border-white/70 animate-count-pop'
                      }`}
                    >
                      <span className="leading-none">{cartCount > 99 ? '99+' : cartCount}</span>
                    </span>
                  )}
                </button>

                {/* Super Admin Edit Overlay */}
                {isVisualEditorActive && isSuperAdmin && (
                  <button
                    onClick={(e) => handleHideElement('header_cart', e)}
                    className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-lg z-10 cursor-pointer border border-white/40"
                    title="Masquer le Panier (1-clic)"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            )}

            {/* Prominent 'Mon Compte' Button */}
            {!isHidden('header_account') && (headerConfig.visibleIcons?.account ?? true) && (
              <div className="relative group shrink-0 min-w-0">
                <button
                  onClick={() => user ? onOpenProfile() : onOpenAuth()}
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-[#FF5C00] hover:bg-[#ff6d1a] text-white transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-lg shadow-[#FF5C00]/25 font-bold text-xs border border-white/15 active:scale-95 max-w-[110px] xs:max-w-[130px] sm:max-w-none"
                  title="Mon Compte / Profil"
                >
                  <User size={14} className="stroke-[2.5] shrink-0" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate max-w-[60px] xs:max-w-[85px] sm:max-w-none block">
                    {user ? (user.fullName || user.email.split('@')[0]) : 'Compte'}
                  </span>
                </button>

                {/* Super Admin Edit Overlay */}
                {isVisualEditorActive && isSuperAdmin && (
                  <button
                    onClick={(e) => handleHideElement('header_account', e)}
                    className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-lg z-10 cursor-pointer border border-white/40"
                    title="Masquer Mon Compte (1-clic)"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Desktop Category Bar */}
        {currentRole === 'client' && onSelectCategory && !isHidden('header_categories') && (
          <div className="hidden lg:flex items-center justify-center w-full max-w-7xl mx-auto px-4 pb-2.5">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {onOpenFavorites && (
                <button
                  id="btn-category-favorites"
                  onClick={onOpenFavorites}
                  className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Heart size={12} className="fill-red-400" />
                  <span>Favoris ❤️</span>
                </button>
              )}
              {categories.map((cat) => {
                const isSelected = cat === 'Tous' ? !selectedCategory : selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => onSelectCategory(cat === 'Tous' ? '' : cat)}
                    className={`px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border ${
                      isSelected
                        ? 'bg-[#FF5C00] text-white border-[#FF5C00] shadow-md shadow-[#FF5C00]/30 scale-105'
                        : 'bg-white/5 text-zinc-400 border-white/5 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* SLIDE-OUT HAMBURGER MENU DRAWER */}
      {isHamburgerOpen && (
        <div className="fixed inset-0 z-[100] flex animate-fadeIn">
          {/* Backdrop */}
          <div 
            onClick={() => setIsHamburgerOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
          />

          {/* Side Drawer Panel */}
          <aside className="relative w-full max-w-sm bg-[#0C0C0E] border-r border-white/10 text-white h-full flex flex-col justify-between shadow-2xl z-10 overflow-y-auto p-5 space-y-6">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#FF5C00] text-white flex items-center justify-center shadow-lg shadow-[#FF5C00]/30">
                  <Menu size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white uppercase tracking-wider">Navigation Fidfud</h3>
                  <p className="text-[10px] text-zinc-400">Toutes vos fonctionnalités en 1-clic</p>
                </div>
              </div>

              <button
                onClick={() => setIsHamburgerOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* User Account Card inside Drawer */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#FF5C00]/20 text-[#FF5C00] border border-[#FF5C00]/30 flex items-center justify-center font-black text-sm shrink-0">
                  {user ? (user.email[0].toUpperCase()) : '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate">
                    {user ? (user.fullName || user.email) : 'Invité'}
                  </p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                    Rôle: <span className="text-[#FF5C00]">{user?.role || 'Client'}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsHamburgerOpen(false);
                  user ? onOpenProfile() : onOpenAuth();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#FF5C00] hover:bg-[#ff6d1a] text-white text-xs font-bold shrink-0 cursor-pointer transition-all"
              >
                {user ? 'Gérer' : 'Connexion'}
              </button>
            </div>

            {/* Quick Search inside Drawer */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Recherche Rapide</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Plats, chefs, spécialités..."
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange?.(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-2.5 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5C00]"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>

            {/* Main Menu Links */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Menu & Navigation</label>
              
              <div className="grid grid-cols-1 gap-2">
                {/* Accueil / Feed button */}
                <button
                  onClick={() => {
                    setIsHamburgerOpen(false);
                    const firstVideo = document.getElementById('video-container-0') || document.querySelector('.snap-start');
                    if (firstVideo) {
                      firstVideo.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#FF5C00]/20 to-zinc-900 border border-[#FF5C00]/40 text-white flex items-center justify-between cursor-pointer transition-all hover:brightness-110"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-1.5 rounded-xl bg-[#FF5C00] text-white">🍳</span>
                    <span className="text-xs font-black uppercase tracking-wide">Accueil & Feed Vidéos</span>
                  </div>
                  <ChevronRight size={14} className="text-[#FF5C00]" />
                </button>

                {/* Favoris / Saved Restaurants */}
                {onOpenFavorites && (
                  <button
                    id="btn-hamburger-favorites"
                    onClick={() => {
                      setIsHamburgerOpen(false);
                      onOpenFavorites();
                    }}
                    className="w-full p-3 rounded-2xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-white flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Heart size={16} className="text-red-400 fill-red-400/30" />
                      <span className="text-xs font-bold text-red-300">Mes Restaurants Favoris ❤️</span>
                    </div>
                    <ChevronRight size={14} className="text-red-400" />
                  </button>
                )}

                {/* Explorer / Consulter */}
                <button
                  onClick={() => {
                    setIsHamburgerOpen(false);
                    onOpenSearch();
                  }}
                  className="w-full p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 text-white flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Tv size={16} className="text-[#FF5C00]" />
                    <span className="text-xs font-bold">Consulter & Explorer les Plats</span>
                  </div>
                  <ChevronRight size={14} className="text-zinc-500" />
                </button>

                {/* GPS Location button */}
                {onDetectLocation && (
                  <button
                    onClick={() => { setIsHamburgerOpen(false); onDetectLocation(); }}
                    className="w-full p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 text-white flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-[#FF5C00]" />
                      <span className="text-xs font-bold">Restaurants Autour de moi (GPS)</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-500" />
                  </button>
                )}

                {/* Orders tracking */}
                <button
                  onClick={() => { setIsHamburgerOpen(false); onOpenOrdersHistory(); }}
                  className="w-full p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 text-white flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Bell size={16} className="text-amber-400" />
                    <span className="text-xs font-bold">Suivi & Historique des Commandes</span>
                  </div>
                  {activeOrderCount > 0 && (
                    <span className="px-2 py-0.5 bg-[#FF5C00] text-white text-[10px] font-black rounded-full">
                      {activeOrderCount}
                    </span>
                  )}
                </button>

                {/* Espaces Live shortcuts */}
                {onOpenDJArea && (
                  <button
                    onClick={() => { setIsHamburgerOpen(false); onOpenDJArea(); }}
                    className="w-full p-3 rounded-2xl bg-gradient-to-r from-purple-950/60 to-zinc-900 border border-purple-500/30 text-white flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Headphones size={16} className="text-purple-400" />
                      <span className="text-xs font-bold">Lounge DJs & Sets Live 🎧</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-500" />
                  </button>
                )}

                {onOpenShows && (
                  <button
                    onClick={() => { setIsHamburgerOpen(false); onOpenShows(); }}
                    className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-950/60 to-zinc-900 border border-amber-500/30 text-white flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Tv size={16} className="text-amber-400" />
                      <span className="text-xs font-bold">Émissions Culinaires 🍳</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-500" />
                  </button>
                )}

                {onOpenYouTubers && (
                  <button
                    onClick={() => { setIsHamburgerOpen(false); onOpenYouTubers(); }}
                    className="w-full p-3 rounded-2xl bg-gradient-to-r from-red-950/60 to-zinc-900 border border-red-500/30 text-white flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Youtube size={16} className="text-red-400" />
                      <span className="text-xs font-bold">YouTubers Food & Revues 📺</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-500" />
                  </button>
                )}

                {/* Section Recettes & Astuces */}
                {onOpenRecipes && (
                  <button
                    onClick={() => { setIsHamburgerOpen(false); onOpenRecipes(); }}
                    className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-950/60 to-zinc-900 border border-amber-500/40 text-white flex items-center justify-between cursor-pointer transition-all hover:border-amber-400"
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-1 rounded-lg bg-amber-500 text-black text-xs font-bold">🍳</span>
                      <span className="text-xs font-bold text-amber-300">Recettes & Astuces (&lt; 1 min) 👨‍🍳</span>
                    </div>
                    <ChevronRight size={14} className="text-amber-400" />
                  </button>
                )}

                {/* Google Contacts & Invitations */}
                {onOpenContacts && (
                  <button
                    onClick={() => { setIsHamburgerOpen(false); onOpenContacts(); }}
                    className="w-full p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 text-white flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Users size={16} className="text-blue-400" />
                      <span className="text-xs font-bold">Inviter des amis (Contacts)</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-500" />
                  </button>
                )}

                {/* Super Admin CMS Link */}
                {isSuperAdmin && (
                  <button
                    onClick={() => { setIsHamburgerOpen(false); onOpenAdmin(); }}
                    className="w-full p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={16} className="text-amber-400" />
                      <span className="text-xs font-black uppercase tracking-wider">Panneau Super-Admin CMS</span>
                    </div>
                    <ChevronRight size={14} className="text-amber-400" />
                  </button>
                )}

                {/* Super Admin Live Visual Editor Toggle */}
                {isSuperAdmin && onUpdateDesignSettings && (
                  <button
                    onClick={() => onUpdateDesignSettings({ isVisualEditorActive: !isVisualEditorActive })}
                    className={`w-full p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      isVisualEditorActive
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MousePointer size={16} className={isVisualEditorActive ? 'text-amber-400 animate-bounce' : ''} />
                      <span className="text-xs font-bold">Mode Éditeur Visuel (Elementor)</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isVisualEditorActive ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                      {isVisualEditorActive ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Categories Section in Drawer */}
            {onSelectCategory && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Spécialités Culinaires</label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto no-scrollbar p-1 bg-zinc-900/40 rounded-2xl border border-white/5">
                  {categories.map((cat) => {
                    const isSelected = cat === 'Tous' ? !selectedCategory : selectedCategory.toLowerCase() === cat.toLowerCase();
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          onSelectCategory(cat === 'Tous' ? '' : cat);
                          setIsHamburgerOpen(false);
                        }}
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#FF5C00] text-white border-[#FF5C00]'
                            : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              {user ? (
                <button
                  onClick={() => { setIsHamburgerOpen(false); onLogout(); }}
                  className="w-full py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs border border-red-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <LogOut size={14} />
                  <span>Se Déconnecter</span>
                </button>
              ) : (
                <button
                  onClick={() => { setIsHamburgerOpen(false); onOpenAuth(); }}
                  className="w-full py-2.5 rounded-2xl bg-[#FF5C00] hover:bg-[#ff6d1a] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#FF5C00]/25 transition-all"
                >
                  <User size={14} />
                  <span>Se Connecter / Créer un compte</span>
                </button>
              )}
            </div>

          </aside>
        </div>
      )}
    </>
  );
}
