import React, { useState, useEffect } from 'react';
import { Youtube, X, Star, ExternalLink, Sparkles, Award, Play, Users } from 'lucide-react';
import { FoodYouTuber } from '../types';

interface FoodYouTubersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_YOUTUBERS: FoodYouTuber[] = [
  {
    id: 'yt-1',
    creatorName: 'Florian OnAir',
    channelName: 'Florian OnAir Food & Travel',
    subscribersCount: '850K',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    bio: 'Testeur de restos & pépites street food en France et à l’international. Revues honnêtes, dégustations généreuses et conseils gourmands.',
    youtubeChannelUrl: 'https://www.youtube.com/@FlorianOnAir',
    featuredVideoUrl: 'https://www.youtube.com',
    rating: 4.9,
    active: true
  },
  {
    id: 'yt-2',
    creatorName: 'Le Régal de Charles',
    channelName: 'Charles Food Review',
    subscribersCount: '420K',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80',
    bio: 'Passionné de gastronomie, burgers gourmets, pizzas napolitaines et bistrots traditionnels. Découvrez ses tops 10 du mois !',
    youtubeChannelUrl: 'https://www.youtube.com',
    featuredVideoUrl: 'https://www.youtube.com',
    rating: 4.8,
    active: true
  }
];

export default function FoodYouTubersModal({
  isOpen,
  onClose
}: FoodYouTubersModalProps) {
  const [youtubers, setYoutubers] = useState<FoodYouTuber[]>(INITIAL_YOUTUBERS);
  const [activeYouTuber, setActiveYouTuber] = useState<FoodYouTuber | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/food-youtubers')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setYoutubers(data.filter(y => y.active !== false));
            setActiveYouTuber(data[0]);
          } else {
            setActiveYouTuber(INITIAL_YOUTUBERS[0]);
          }
        })
        .catch(() => setActiveYouTuber(INITIAL_YOUTUBERS[0]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentYt = activeYouTuber || youtubers[0];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 md:p-6 animate-fade-in font-sans">
      <div className="bg-[#09090B] border border-red-500/30 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-white/10 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/10 rounded-2xl border border-red-500/30 text-red-500">
              <Youtube size={24} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                YouTubers Food & Dégustations
                <span className="bg-red-600 text-white text-[10px] font-mono font-black px-2 py-0.5 rounded-full">
                  CREATORS
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Suivez vos créateurs culinaires préférés et découvrez leurs chaînes YouTube</p>
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
          {/* Main Featured YouTuber */}
          {currentYt && (
            <div className="bg-zinc-950 border border-red-500/30 rounded-3xl overflow-hidden shadow-2xl relative group">
              <div className="relative aspect-video max-h-[380px] w-full bg-black">
                <img
                  src={currentYt.coverUrl || currentYt.mediaUrl || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800'}
                  alt={currentYt.creatorName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="bg-red-600 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-mono shadow-lg">
                    🔥 CRÉATEUR VEDETTE
                  </span>
                  <span className="bg-black/60 text-red-400 backdrop-blur-md border border-red-500/30 font-bold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Users size={12} />
                    {currentYt.subscribersCount} abonnés
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 space-y-2">
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">{currentYt.creatorName}</h3>
                  <p className="text-xs text-red-400 font-bold">{currentYt.channelName}</p>
                  <p className="text-xs text-zinc-300 max-w-2xl line-clamp-2">{currentYt.bio}</p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {currentYt.youtubeChannelUrl && (
                      <a
                        href={currentYt.youtubeChannelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-red-600 hover:bg-red-500 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                      >
                        <Youtube size={16} />
                        Accéder à la Chaîne YouTube
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid of All YouTubers */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider font-mono">
              Créateurs de contenu culinaire ({youtubers.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {youtubers.map((yt) => (
                <div
                  key={yt.id}
                  onClick={() => setActiveYouTuber(yt)}
                  className={`bg-zinc-950 border rounded-2xl p-4 space-y-3 transition-all cursor-pointer ${
                    currentYt?.id === yt.id
                      ? 'border-red-500 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                      : 'border-white/10 hover:border-red-500/40 hover:bg-zinc-900'
                  }`}
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                    <img src={yt.coverUrl || yt.mediaUrl || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400'} alt={yt.creatorName} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-red-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full">
                      {yt.subscribersCount}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-sm font-extrabold text-white truncate">{yt.creatorName}</h5>
                    <p className="text-xs text-red-400 font-bold">{yt.channelName}</p>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">{yt.bio}</p>
                  </div>

                  {yt.youtubeChannelUrl && (
                    <a
                      href={yt.youtubeChannelUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20"
                    >
                      <Youtube size={14} />
                      Chaîne YouTube →
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
