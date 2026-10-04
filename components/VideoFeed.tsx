'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Heart, Volume2, VolumeX, ShoppingBag, Store, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { Video, Dish } from '@/types';

interface VideoFeedProps {
  videos?: Video[];
  onOrderDish?: (dish: Dish) => void;
}

const DEFAULT_FALLBACK_VIDEOS: Video[] = [
  {
    id: 'vid-1',
    restaurantId: 'rest-1',
    videoUrl: '/videos/culinary-1.mp4',
    title: 'Pizza Napolitaine Authentique au feu de bois 🍕✨',
    likesCount: 248,
    viewsCount: 1420,
    createdAt: new Date().toISOString(),
    dish: {
      id: 'dish-1',
      restaurantId: 'rest-1',
      name: 'Pizza Margherita Di Bufala',
      description: 'Sauce tomate San Marzano DOP, mozzarella di bufala campana, basilic frais',
      price: 14.50,
      isAvailable: true,
      category: 'Pizzas',
      createdAt: new Date().toISOString(),
    },
    restaurant: {
      id: 'rest-1',
      userId: 'usr-1',
      name: 'Pizzeria Bella Napoli',
      address: '14 Rue Oberkampf, 75011 Paris',
      commissionRate: 15,
      isPublished: true,
      isOrderingEnabled: true,
      createdAt: new Date().toISOString(),
    }
  },
  {
    id: 'vid-2',
    restaurantId: 'rest-2',
    videoUrl: '/videos/culinary-2.mp4',
    title: 'Le Smash Burger Double Black Angus en direct de la plancha ! 🍔🔥',
    likesCount: 512,
    viewsCount: 3890,
    createdAt: new Date().toISOString(),
    dish: {
      id: 'dish-2',
      restaurantId: 'rest-2',
      name: 'Smash Burger Supreme',
      description: 'Double steak Black Angus smashé, cheddar maturé 18 mois, oignons caramélisés',
      price: 13.90,
      isAvailable: true,
      category: 'Burgers',
      createdAt: new Date().toISOString(),
    },
    restaurant: {
      id: 'rest-2',
      userId: 'usr-2',
      name: 'The French Smash Bros',
      address: '8 Boulevard Voltaire, 75011 Paris',
      commissionRate: 15,
      isPublished: true,
      isOrderingEnabled: true,
      createdAt: new Date().toISOString(),
    }
  }
];

export default function VideoFeed({ videos = DEFAULT_FALLBACK_VIDEOS, onOrderDish }: VideoFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const activeVideo = videos[currentIndex] || DEFAULT_FALLBACK_VIDEOS[0];

  useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (video) {
        if (idx === currentIndex) {
          video.currentTime = 0;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const toggleLike = (id: string) => {
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full max-w-md mx-auto overflow-hidden bg-black flex flex-col justify-center items-center rounded-3xl shadow-2xl border border-border/20">
      {/* Video stream */}
      <div className="relative h-full w-full bg-black overflow-hidden flex items-center justify-center">
        {videos.map((video, index) => (
          <div
            key={video.id}
            className={`absolute inset-0 transition-opacity duration-300 ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <video
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              src={video.videoUrl || '/videos/culinary-fallback.mp4'}
              className="h-full w-full object-cover"
              loop
              playsInline
              muted={isMuted}
              onClick={() => setIsMuted((prev) => !prev)}
              onError={(e) => {
                if (e.currentTarget.src !== '/videos/culinary-fallback.mp4') {
                  e.currentTarget.src = '/videos/culinary-fallback.mp4';
                }
              }}
            />
            {/* Top gradient shadow */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
            {/* Bottom gradient shadow */}
            <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
          </div>
        ))}

        {/* Floating Right Interaction Sidebar */}
        <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-4">
          {/* Mute / Unmute */}
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur border border-white/10 hover:bg-black/80 transition-all cursor-pointer"
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} className="text-[#FF5C00]" />}
          </button>

          {/* Like */}
          <button
            type="button"
            onClick={() => toggleLike(activeVideo.id)}
            className="flex flex-col items-center gap-1 cursor-pointer"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur border border-white/10 transition-all ${likedMap[activeVideo.id] ? 'text-red-500 scale-110' : 'text-white'}`}>
              <Heart size={18} fill={likedMap[activeVideo.id] ? 'currentColor' : 'none'} />
            </div>
            <span className="text-[11px] font-bold text-white shadow-sm">
              {(activeVideo.likesCount || 0) + (likedMap[activeVideo.id] ? 1 : 0)}
            </span>
          </button>

          {/* Up / Down Navigation Controls */}
          <div className="flex flex-col gap-1 mt-2">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={handlePrev}
              className="p-2 rounded-full bg-black/40 text-white disabled:opacity-30 hover:bg-black/70 cursor-pointer"
              title="Vidéo précédente"
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              disabled={currentIndex === videos.length - 1}
              onClick={handleNext}
              className="p-2 rounded-full bg-black/40 text-white disabled:opacity-30 hover:bg-black/70 cursor-pointer"
              title="Vidéo suivante"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Bottom Metadata & Fast Order Action */}
        <div className="absolute bottom-4 inset-x-4 z-20 space-y-3">
          {/* Restaurant pill */}
          {activeVideo.restaurant && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-black/60 backdrop-blur text-white border-white/20 text-xs py-1 px-2.5">
                <Store size={12} className="mr-1 text-[#FF5C00]" />
                {activeVideo.restaurant.name}
              </Badge>
            </div>
          )}

          {/* Title description */}
          <p className="text-sm font-semibold text-white line-clamp-2 drop-shadow-md">
            {activeVideo.title}
          </p>

          {/* Dish Quick-Order Card */}
          {activeVideo.dish && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 shadow-xl">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{activeVideo.dish.name}</p>
                <p className="text-sm font-black text-[#FF5C00]">
                  {formatCurrency(activeVideo.dish.price)}
                </p>
              </div>

              <Button
                size="sm"
                variant="orange"
                onClick={() => onOrderDish && onOrderDish(activeVideo.dish!)}
                className="h-9 gap-1.5 rounded-xl font-bold text-xs shrink-0 shadow-lg shadow-[#FF5C00]/30"
              >
                <ShoppingBag size={14} />
                <span>Commander</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
