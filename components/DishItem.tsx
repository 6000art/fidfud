import React from 'react';
import { Plus, Check } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { formatCurrency } from '@/lib/utils';
import type { Dish } from '@/types';

interface DishItemProps {
  dish: Dish;
  onAddToCart: (dish: Dish) => void;
  isAdded?: boolean;
}

export default function DishItem({ dish, onAddToCart, isAdded = false }: DishItemProps) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/50 bg-card/60 transition-all hover:border-[#FF5C00]/30 hover:shadow-md">
      <div className="flex flex-col sm:flex-row h-full">
        {/* Dish image */}
        {dish.imageUrl && (
          <div className="relative aspect-[4/3] sm:w-40 sm:aspect-square shrink-0 overflow-hidden bg-muted">
            <img
              src={dish.imageUrl}
              alt={dish.name}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              referrerPolicy="no-referrer"
            />
            {dish.category && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-black/70 backdrop-blur text-white text-[10px]">
                  {dish.category}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <CardContent className="flex flex-1 flex-col justify-between p-4">
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-bold text-base text-foreground line-clamp-1">{dish.name}</h4>
              <span className="font-black text-base text-[#FF5C00] shrink-0">
                {formatCurrency(dish.price)}
              </span>
            </div>
            {dish.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {dish.description}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between pt-2 border-t border-border/40">
            <div>
              {dish.isAvailable ? (
                <Badge variant="success" className="text-[10px]">
                  Disponible
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px]">
                  Épuisé
                </Badge>
              )}
            </div>

            <Button
              size="sm"
              variant={isAdded ? "outline" : "orange"}
              disabled={!dish.isAvailable}
              onClick={() => onAddToCart(dish)}
              className="h-8 gap-1.5 rounded-xl text-xs font-bold"
            >
              {isAdded ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  <span>Ajouté</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Ajouter</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
