import React, { useState, useEffect } from 'react';
import { Tv, X, Play, Youtube, Star, Utensils, ExternalLink, Sparkles, Award } from 'lucide-react';
import { CulinaryShow, Dish, Restaurant } from '../types';
import BackgroundVideoPlayer from './BackgroundVideoPlayer';
import { getSafeVideoUrl, STABLE_CULINARY_FALLBACK_VIDEOS } from '../utils/videoUtils';

interface CulinaryShowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  dishes: Dish[];
  onSelectRestaurant?: (restaurantId: string) => void;
}

const INITIAL_SHOWS: CulinaryShow[] = [
  {
    id: 'show-1',
    showName: 'Cuisine En Direct & Masterclasses',
    hostName: 'Chef Philippe Etchebest',
    coverUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=80',
    mediaType: 'video',
    mediaUrl: STABLE_CULINARY_FALLBACK_VIDEOS[0],
    description: 'Immersion en direct dans les coulisses des cuisines étoilées. Découvrez la réalisation des plats phares et les secrets des grands chefs.',
    youtubeChannelUrl: 'https://www.youtube.com',
    featuredRestaurantName: 'Villa Gourmet - Paris 11e',
    rating: 4.9,
    active: true
  },
  {
    id: 'show-2',
    showName: 'Crash-Test Culinaire & Dégustations',
    hostName: 'Mina & Alex - Street Food Hunters',
    coverUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
    description: 'Revue complète des meilleures tables parisiennes. On teste sans filtre les cartes, la rapidité de livraison et la fraîcheur des produits.',
    youtubeChannelUrl: 'https://www.youtube.com',
    featuredRestaurantName: 'Le Bistro Mousse',
    rating: 4.8,
    active: true
  }
];

export default function CulinaryShowsModal({
  isOpen,
  onClose,
  restaurants,
  onSelectRestaurant
}: CulinaryShowsModalProps) {
  const [shows, setShows] = useState<CulinaryShow[]>(INITIAL_SHOWS);
  const [activeShow, setActiveShow] = useState<CulinaryShow | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/culinary-shows')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setShows(data.filter(s => s.active !== false));
            setActiveShow(data[0]);
          } else {
            setActiveShow(INITIAL_SHOWS[0]);
          }
        })
        .catch(() => setActiveShow(INITIAL_SHOWS[0]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentShow = activeShow || shows[0];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 md:p-6 animate-fade-in font-sans">
      <div className="bg-[#09090B] border border-amber-500/30 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-white/10 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-amber-400">
              <Tv size={24} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                Émissions & Crash-Tests Culinaires
                <span className="bg-amber-500 text-black text-[10px] font-mono font-black px-2 py-0.5 rounded-full">
                  LIVE REVIEWS
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Suivez les reportages gastronomiques et visitez les chaînes des présentateurs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          {/* Main Featured Player */}
          {currentShow && (
            <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl relative group">
              <div className="relative aspect-video max-h-[380px] w-full bg-black">
                {currentShow.mediaUrl?.endsWith('.mp4') || currentShow.mediaType === 'video' || (currentShow.mediaUrl && (currentShow.mediaUrl.includes('youtube') || currentShow.mediaUrl.includes('youtu.be'))) ? (
                  <BackgroundVideoPlayer
                    src={getSafeVideoUrl(currentShow.mediaUrl)}
                    isPlaying={true}
                    isMuted={true}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={currentShow.coverUrl || currentShow.mediaUrl || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800'}
                    alt={currentShow.showName}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="bg-amber-500 text-black font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-mono shadow-lg">
                    📺 ÉMISSION VEDETTE
                  </span>
                  <span className="bg-black/60 text-amber-300 backdrop-blur-md border border-amber-500/30 font-bold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {currentShow.rating || 4.9} / 5.0
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 space-y-2">
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">{currentShow.showName}</h3>
                  <p className="text-xs text-amber-300 font-bold">Présenté par {currentShow.hostName}</p>
                  <p className="text-xs text-zinc-300 max-w-2xl line-clamp-2">{currentShow.description}</p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {currentShow.youtubeChannelUrl && (
                      <a
                        href={currentShow.youtubeChannelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-red-600 hover:bg-red-500 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                      >
                        <Youtube size={16} />
                        Voir la Chaîne YouTube Officielle
                        <ExternalLink size={12} />
                      </a>
                    )}

                    {currentShow.featuredRestaurantName && (
                      <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5">
                        <Utensils size={14} className="text-amber-400" />
                        Restaurant Cible : {currentShow.featuredRestaurantName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid of All Culinary Shows */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider font-mono">
              Toutes les émissions culinaires ({shows.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shows.map((show) => (
                <div
                  key={show.id}
                  onClick={() => setActiveShow(show)}
                  className={`bg-zinc-950 border rounded-2xl p-4 space-y-3 transition-all cursor-pointer ${
                    currentShow?.id === show.id
                      ? 'border-amber-500 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                      : 'border-white/10 hover:border-amber-500/40 hover:bg-zinc-900'
                  }`}
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                    <img src={show.coverUrl || show.mediaUrl} alt={show.showName} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Play size={28} className="text-amber-400 fill-amber-400" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-sm font-extrabold text-white truncate">{show.showName}</h5>
                    <p className="text-xs text-amber-400 font-bold">{show.hostName}</p>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">{show.description}</p>
                  </div>

                  {show.youtubeChannelUrl && (
                    <a
                      href={show.youtubeChannelUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20"
                    >
                      <Youtube size={14} />
                      Regarder la chaîne →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
