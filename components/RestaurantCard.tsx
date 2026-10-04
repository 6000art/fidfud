import React from 'react';
import Link from 'next/link';
import { MapPin, ArrowUpRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import type { Restaurant } from '@/types';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Card className="group overflow-hidden rounded-2xl border-border/50 bg-card/60 transition-all hover:border-[#FF5C00]/40 hover:shadow-xl hover:shadow-[#FF5C00]/5">
      {/* Banner / Media */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        <img
          src={restaurant.bannerUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80'}
          alt={restaurant.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Category Badge */}
        {restaurant.category && (
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-black/60 backdrop-blur text-white border-white/10 text-xs">
              {restaurant.category}
            </Badge>
          </div>
        )}

        {/* Logo Avatar */}
        <div className="absolute -bottom-4 left-4 h-12 w-12 rounded-2xl border-2 border-background bg-card overflow-hidden shadow-lg">
          <img
            src={restaurant.logoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&auto=format&fit=crop&q=80'}
            alt={restaurant.name}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      <CardContent className="pt-6 pb-5 px-4 space-y-3">
        <div>
          <h3 className="font-bold text-lg text-foreground group-hover:text-[#FF5C00] transition-colors line-clamp-1">
            {restaurant.name}
          </h3>
          {restaurant.slogan && (
            <p className="text-xs text-muted-foreground line-clamp-1 italic mt-0.5">
              "{restaurant.slogan}"
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin size={14} className="text-[#FF5C00] shrink-0" />
          <span className="line-clamp-1">{restaurant.address}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Sparkles size={13} className="text-amber-400" />
            <span>Click & Collect & Livraison</span>
          </div>

          <Link href={`/restaurants/${restaurant.id}`}>
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs font-bold hover:text-[#FF5C00]">
              <span>Voir menu</span>
              <ArrowUpRight size={14} />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
