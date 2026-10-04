import React, { useState, useEffect } from 'react';
import { getSafeVideoUrl } from '../utils/videoUtils';
import { motion, AnimatePresence } from 'motion/react';
import { X, Headphones, Tv, Youtube, Sparkles, ChevronRight, Play, ExternalLink, ArrowRight } from 'lucide-react';
import BackgroundVideoPlayer from './BackgroundVideoPlayer';

export interface PopupItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'dj_music' | 'culinary_channels' | 'food_youtubers' | string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  imageFit100?: boolean;
  ctaText: string;
  ctaLink?: string;
  active: boolean;
  displayDelaySeconds?: number;
}

interface PromotionalPopupModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenDJArea?: () => void;
  onSelectCategory?: (cat: string) => void;
  onOpenCulinaryChannels?: () => void;
  onOpenFoodYouTubers?: () => void;
  accentColor?: string;
}

const DEFAULT_FALLBACK_POPUPS: PopupItem[] = [
  {
    id: 'pop-1',
    title: '🎧 Session Live DJs & Sound Systems',
    subtitle: 'Rejoignez les espaces uniques où les DJs de renom écoutent de la musique, mixent en direct et créent l’ambiance des meilleurs spots gastronomiques !',
    category: 'dj_music',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1000',
    imageFit100: true,
    ctaText: '🎧 Écouter & Suivre les DJs',
    ctaLink: 'djs',
    active: true,
    displayDelaySeconds: 3
  },
  {
    id: 'pop-2',
    title: '🍳 Chaînes Culinaires & Crash-Tests',
    subtitle: 'Explorez les chaînes culinaires et émissions gourmandes qui testent, évaluent et révèlent en toute transparence les cuisines de restaurants !',
    category: 'culinary_channels',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1000',
    imageFit100: true,
    ctaText: '🍳 Explorer les Chaînes Culinaires',
    ctaLink: 'channels',
    active: true,
    displayDelaySeconds: 8
  },
  {
    id: 'pop-3',
    title: '📺 YouTubers Food & Dégustations Cash',
    subtitle: 'Suivez les YouTubers et créateurs food les plus célèbres qui dégustent les plats signatures et donnent leur avis sans filtre !',
    category: 'food_youtubers',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1000',
    imageFit100: true,
    ctaText: '📺 Regarder les YouTubers Food',
    ctaLink: 'youtubers',
    active: true,
    displayDelaySeconds: 15
  }
];

export const PromotionalPopupModal: React.FC<PromotionalPopupModalProps> = ({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  onOpenDJArea,
  onSelectCategory,
  onOpenCulinaryChannels,
  onOpenFoodYouTubers,
  accentColor = '#FF5C00'
}) => {
  const [popups, setPopups] = useState<PopupItem[]>(DEFAULT_FALLBACK_POPUPS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const [dismissedToday, setDismissedToday] = useState<boolean>(false);

  // Fetch popups from backend API with fallback
  const fetchPopups = async () => {
    try {
      const res = await fetch('/api/popups');
      if (res.ok) {
        const data = await res.json();
        const activeOnly = data.filter((p: PopupItem) => p.active !== false);
        if (activeOnly.length > 0) {
          setPopups(activeOnly);
        }
      }
    } catch (err) {
      console.warn('[PromotionalPopupModal] Failed to load popups from API, using default fallbacks.');
    }
  };

  useEffect(() => {
    fetchPopups();
  }, []);

  // Handle auto-trigger after delay on initial launch
  useEffect(() => {
    if (dismissedToday) return;

    // Check if user dismissed popups in session
    const isDismissed = sessionStorage.getItem('fidfud_popups_dismissed') === 'true';
    if (isDismissed) return;

    if (externalIsOpen !== undefined) {
      setInternalIsOpen(externalIsOpen);
      return;
    }

    if (popups.length > 0) {
      const firstPopup = popups[0];
      const delay = (firstPopup.displayDelaySeconds || 3) * 1000;
      const timer = setTimeout(() => {
        setInternalIsOpen(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [popups, externalIsOpen, dismissedToday]);

  const handleDismiss = () => {
    setInternalIsOpen(false);
    sessionStorage.setItem('fidfud_popups_dismissed', 'true');
    if (externalOnClose) externalOnClose();
  };

  const handleDismissForever = () => {
    setDismissedToday(true);
    setInternalIsOpen(false);
    sessionStorage.setItem('fidfud_popups_dismissed', 'true');
    if (externalOnClose) externalOnClose();
  };

  const handleNext = () => {
    if (popups.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % popups.length);
  };

  const handlePrev = () => {
    if (popups.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + popups.length) % popups.length);
  };

  const currentPopup = popups[currentIndex];

  const handleCtaClick = (popup: PopupItem) => {
    handleDismiss();

    if (popup.category === 'dj_music' || popup.ctaLink === 'djs') {
      if (onOpenDJArea) onOpenDJArea();
    } else if (popup.category === 'culinary_channels' || popup.ctaLink === 'channels') {
      if (onOpenCulinaryChannels) {
        onOpenCulinaryChannels();
      } else if (onSelectCategory) {
        onSelectCategory('culinary');
      }
    } else if (popup.category === 'food_youtubers' || popup.ctaLink === 'youtubers') {
      if (onOpenFoodYouTubers) {
        onOpenFoodYouTubers();
      } else if (onSelectCategory) {
        onSelectCategory('youtubers');
      }
    } else if (popup.ctaLink && popup.ctaLink.startsWith('http')) {
      window.open(popup.ctaLink, '_blank');
    }
  };

  const showModal = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  if (!showModal || !currentPopup) return null;

  const getBadgeIcon = (category: string) => {
    switch (category) {
      case 'dj_music':
        return <Headphones size={15} className="text-[#FF5C00]" />;
      case 'culinary_channels':
        return <Tv size={15} className="text-amber-400" />;
      case 'food_youtubers':
        return <Youtube size={15} className="text-red-500" />;
      default:
        return <Sparkles size={15} className="text-[#FF5C00]" />;
    }
  };

  const getBadgeText = (category: string) => {
    switch (category) {
      case 'dj_music':
        return 'DJs & Musique Live';
      case 'culinary_channels':
        return 'Chaînes Culinaires';
      case 'food_youtubers':
        return 'YouTubers Food';
      default:
        return 'Découverte Exclusive';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-zinc-950 border border-white/15 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col my-auto"
        >
          {/* Header Bar with Category Badge & Close */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-900/60">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                {getBadgeIcon(currentPopup.category)}
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 font-mono">
                  {getBadgeText(currentPopup.category)}
                </span>
                <p className="text-xs font-bold text-white">Recommandation FIDFUD</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {popups.length > 1 && (
                <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono text-zinc-400">
                  <span>{currentIndex + 1}</span>
                  <span>/</span>
                  <span>{popups.length}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleDismiss}
                className="p-2 bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
                title="Fermer le pop-up"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* 100% Image/Video Media Stage */}
          <div className="relative w-full bg-black overflow-hidden flex items-center justify-center min-h-[220px] max-h-[380px]">
            {currentPopup.mediaType === 'video' ? (
              <BackgroundVideoPlayer
                src={getSafeVideoUrl(currentPopup.mediaUrl)}
                isPlaying={true}
                isMuted={true}
                className={`w-full h-full ${currentPopup.imageFit100 ? 'w-full object-cover' : 'object-contain'} max-h-[360px]`}
              />
            ) : (
              <div className="w-full relative">
                <img
                  src={currentPopup.mediaUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'}
                  alt={currentPopup.title}
                  className={`w-full ${currentPopup.imageFit100 ? 'w-full object-cover max-h-[340px]' : 'object-contain max-h-[340px] mx-auto'}`}
                  style={{ width: '100%' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent pointer-events-none" />
              </div>
            )}

            {/* Category Overlay Tag */}
            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-bold text-white flex items-center gap-1.5">
              <Sparkles size={12} className="text-[#FF5C00]" />
              <span>{getBadgeText(currentPopup.category)}</span>
            </div>
          </div>

          {/* Text Content & Action Buttons */}
          <div className="p-5 sm:p-6 space-y-4 bg-zinc-950 text-white">
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-black text-white leading-snug tracking-tight">
                {currentPopup.title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                {currentPopup.subtitle}
              </p>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => handleCtaClick(currentPopup)}
                className="w-full flex-1 py-3.5 px-6 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-[0_10px_30px_rgba(255,92,0,0.3)] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                <span>{currentPopup.ctaText || 'Découvrir'}</span>
                <ArrowRight size={18} />
              </button>

              {popups.length > 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full sm:w-auto py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer shrink-0"
                >
                  <span>Suivant</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>

            {/* Bottom Footer Actions & Stepper Dots */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <button
                type="button"
                onClick={handleDismissForever}
                className="hover:text-zinc-300 underline transition-colors cursor-pointer"
              >
                Ne plus afficher aujourd'hui
              </button>

              {popups.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {popups.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === currentIndex ? 'w-6 bg-[#FF5C00]' : 'w-2 bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PromotionalPopupModal;
