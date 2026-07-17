import React, { useState } from 'react';
import { ShoppingBag, Search, User, MessageSquare, Bell, Gift, ChevronDown, LayoutGrid, MapPin } from 'lucide-react';
import CustomIcon from './CustomIcon';

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
  user: { id: string; email: string; role: 'client' | 'restaurant' | 'admin' } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenSearch: () => void;
  onOpenProfile: () => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  designSettings?: {
    accentColor: string;
    appName: string;
    logoUrl?: string;
    typography?: string;
    layoutPreset?: 'immersive' | 'bento' | 'editorial';
    backgroundColor?: string;
    textColor?: string;
    logoSizeMobile?: number;
    logoSizeTablet?: number;
    logoSizeDesktop?: number;
  };
  onUpdateDesignSettings?: (updated: any) => void;
  userLocation?: { lat: number; lng: number } | null;
  onDetectLocation?: () => void;
  isLocating?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

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
  onSearchQueryChange
}: HeaderProps) {
  const accentColor = designSettings?.accentColor || '#FF5A1F';
  const isBgDark = !designSettings?.backgroundColor || isDarkColor(designSettings.backgroundColor);
  const headerBgColor = designSettings?.backgroundColor || '#0B0B0C';

  const textClass = isBgDark ? 'text-[#E4E4E7]' : 'text-zinc-800';
  const textHoverClass = isBgDark ? 'hover:text-white' : 'hover:text-black';
  const bgGlassClass = isBgDark ? 'bg-black/35 hover:bg-black/50 border-white/10' : 'bg-white/70 hover:bg-white/90 border-black/15';

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const categories = ['Tous', 'Végétarien', 'Italien', 'Rapide', 'Burgers', 'Japonais', 'Français'];

  return (
    <header 
      style={{
        background: isBgDark 
          ? 'linear-gradient(to bottom, rgba(11,11,12,0.95) 0%, rgba(11,11,12,0.6) 75%, rgba(11,11,12,0) 100%)' 
          : `linear-gradient(to bottom, ${headerBgColor} 0%, ${headerBgColor}f0 75%, rgba(255,255,255,0) 100%)`
      }}
      className="absolute lg:relative top-0 left-0 right-0 z-50 border-none select-none pointer-events-none lg:pointer-events-auto w-full overflow-x-hidden lg:bg-[#0B0B0C] lg:border-b lg:border-white/5"
    >
      {/* Dynamic top accent line */}
      <div className="h-[2px] w-full bg-[#FF5A1F]" />

      {/* Primary Compact Bar styled like the mock image */}
      <div className="px-3 sm:px-6 py-2 sm:py-3 lg:max-w-7xl lg:mx-auto flex items-center justify-between w-full pointer-events-auto">
        
        {/* Brand Logo - Beautifully integrated on the far left */}
        <div 
          className="flex items-center space-x-1.5 cursor-pointer hover:opacity-95 transition-all duration-300 shrink-0"
          onClick={() => onChangeRole('client')}
        >
          {designSettings?.logoUrl ? (
            <img 
              src={designSettings.logoUrl} 
              alt="Logo" 
              className="responsive-logo-size object-cover rounded-xl border border-white/20 shadow-md shadow-black/60" 
            />
          ) : (
            <div 
              style={{ 
                backgroundColor: accentColor,
                boxShadow: `0 0 14px ${accentColor}33`
              }}
              className="responsive-logo-size rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 border border-white/15"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9ZM16 6V14H18.5V22H21V2C18.24 2 16 4.24 16 6Z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Desktop-Only Center Search and Location Bar - Now sleek, fine, and modern without bulky GPS buttons */}
        {currentRole === 'client' && (
          <div className="hidden lg:flex items-center flex-1 max-w-md mx-8 gap-3 pointer-events-auto">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Rechercher un plat, un chef, un restaurant..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange?.(e.target.value)}
                className="w-full bg-[#151518]/90 hover:bg-[#18181c] border border-white/5 focus:border-[#FF5A1F] rounded-full py-2 pl-10 pr-4 text-xs text-white focus:outline-none transition-all placeholder-zinc-500 shadow-sm"
              />
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Right side icons with tight spacing on mobile */}
        <div className="flex items-center space-x-1 sm:space-x-2.5 shrink-0 relative">
          
          {/* Categories Dropdown Trigger */}
          {onSelectCategory && (
            <div className="relative lg:hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                }}
                className={`p-1.5 sm:p-2 rounded-full ${bgGlassClass} ${textClass} hover:text-[#FF5C00] transition-all flex items-center gap-0.5 sm:gap-1 cursor-pointer shadow-md backdrop-blur-md border border-white/10`}
                title="Filtrer par Catégorie"
              >
                <LayoutGrid size={13} />
                <ChevronDown size={9} className={`transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Elegant Dropdown Menu */}
              {isCategoryDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl py-2.5 shadow-2xl z-50 animate-fade-in text-left">
                    <p className="px-3.5 pb-1.5 mb-1.5 border-b border-white/5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                      Catégories
                    </p>
                    {categories.map((cat) => {
                      const isSelected = cat === 'Tous' ? !selectedCategory : selectedCategory.toLowerCase() === cat.toLowerCase();
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            onSelectCategory(cat === 'Tous' ? '' : cat);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-1.5 text-xs transition-colors flex items-center justify-between ${
                            isSelected 
                              ? 'text-[#FF5C00] font-black bg-white/5' 
                              : 'text-zinc-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span>{cat}</span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00]" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Chat / Cart Trigger (styled like speech bubble icon) */}
          <button
            onClick={onOpenCart}
            className={`relative p-1.5 sm:p-2 rounded-full ${bgGlassClass} ${textClass} hover:text-[#FF5C00] transition-all flex items-center justify-center cursor-pointer shadow-md backdrop-blur-md border border-white/10`}
            title="Mon Panier"
          >
            <CustomIcon iconKey="iconCart" defaultIcon={MessageSquare} designSettings={designSettings} size={13} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FF5C00] text-white text-[8px] font-black rounded-full h-4 w-4 flex items-center justify-center shadow-[0_0_8px_rgba(255,92,0,0.5)]">
                {cartCount}
              </span>
            )}
          </button>

          {/* Notifications Trigger (bell icon) */}
          <button
            onClick={onOpenOrdersHistory}
            className={`relative p-1.5 sm:p-2 rounded-full ${bgGlassClass} ${textClass} hover:text-[#FF5C00] transition-all flex items-center justify-center cursor-pointer shadow-md backdrop-blur-md border border-white/10`}
            title="Historique & Suivi des commandes"
          >
            <CustomIcon iconKey="iconOrder" defaultIcon={Bell} designSettings={designSettings} size={13} />
            {activeOrderCount > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#FF5C00] border border-zinc-950 animate-pulse"></span>
            )}
          </button>

          {/* Gift / Promotions Trigger (gift icon on circular yellow background exactly like Whatnot) */}
          <button
            onClick={onOpenProfile}
            className="p-1.5 sm:p-2 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black shadow-lg shadow-yellow-950/20 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer border border-yellow-500/30"
            title="Mon espace cadeau & Profil"
          >
            <CustomIcon iconKey="iconGift" defaultIcon={Gift} designSettings={designSettings} size={13} className="stroke-[2.5]" />
          </button>

          {/* Admin CMS Trigger (Only visible to the Super Admin) */}
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="bg-purple-600 hover:bg-purple-500 text-white text-[8px] sm:text-[9px] font-black tracking-wider sm:tracking-widest px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full shadow-md transition-all uppercase whitespace-nowrap cursor-pointer border border-white/10"
              title="Ouvrir le CMS Administrateur"
            >
              👑 Admin
            </button>
          )}

        </div>
      </div>

      {/* Sleek, fine & modern Search bar (Mobile only) */}
      {currentRole === 'client' && (
        <div className="flex lg:hidden flex-col items-center w-full px-4 pb-3 pointer-events-auto max-w-md mx-auto mt-1">
          <div className="flex items-center w-full gap-2">
            <div 
              onClick={onOpenSearch}
              className="flex-1 bg-[#151518]/90 hover:bg-[#18181c] border border-white/5 rounded-full py-2 px-4 flex items-center gap-2 cursor-pointer transition-all duration-300 shadow-md backdrop-blur-xl group"
              title="Rechercher des vidéos culinaires, plats ou chefs..."
            >
              <Search size={13} className="text-zinc-500 group-hover:text-white transition-colors shrink-0" />
              <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors truncate font-medium">
                Saisir un plat, chef ou restaurant...
              </span>
            </div>
            <button
              onClick={onOpenSearch}
              className="bg-[#FF5A1F] text-white p-2.5 rounded-full shadow-lg transition-all cursor-pointer border border-white/5 shrink-0 flex items-center justify-center hover:scale-105 active:scale-95"
              title="Rechercher"
            >
              <Search size={14} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Horizontal Category Bar - Only visible on desktop */}
      {currentRole === 'client' && onSelectCategory && (
        <div className="hidden lg:flex items-center justify-center w-full max-w-7xl mx-auto px-4 pb-3.5 pointer-events-auto">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {categories.map((cat) => {
              const isSelected = cat === 'Tous' ? !selectedCategory : selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat === 'Tous' ? '' : cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? 'bg-[#FF5C00] text-white border-[#FF5C00] shadow-lg shadow-[#FF5C00]/20 scale-105'
                      : 'bg-[#121214] text-zinc-400 border-white/5 hover:text-white hover:bg-zinc-800'
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
  );
}
