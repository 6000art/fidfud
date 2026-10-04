'use client';

import React, { useState } from 'react';
import { ShoppingCart, Bike, Store, ArrowRight, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { CartItem, DeliveryType } from '@/types';

interface OrderSummaryProps {
  items: CartItem[];
  onUpdateQuantity: (dishId: string, delta: number) => void;
  onRemoveItem: (dishId: string) => void;
  onProceedToCheckout: (deliveryType: DeliveryType) => void;
  isLoading?: boolean;
}

export default function OrderSummary({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  isLoading = false,
}: OrderSummaryProps) {
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('click_and_collect');

  const foodSubtotal = items.reduce(
    (acc, item) => acc + item.dish.price * item.quantity,
    0
  );
  const serviceFee = items.length > 0 ? 0.99 : 0;
  const deliveryFee = deliveryType === 'restaurant_delivery' && items.length > 0 ? 2.5 : 0;
  const totalAmount = foodSubtotal + serviceFee + deliveryFee;

  return (
    <Card className="rounded-3xl border-border/60 bg-card shadow-lg">
      <CardHeader className="pb-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <ShoppingCart size={18} className="text-[#FF5C00]" />
            <span>Votre Commande</span>
          </CardTitle>
          <Badge variant="orange" className="font-bold">
            {items.reduce((sum, item) => sum + item.quantity, 0)} articles
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Delivery Type Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-2xl border border-border/50">
          <button
            type="button"
            onClick={() => setDeliveryType('click_and_collect')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              deliveryType === 'click_and_collect'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Store size={15} className="text-[#FF5C00]" />
            <span>À Emporter</span>
          </button>
          <button
            type="button"
            onClick={() => setDeliveryType('restaurant_delivery')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              deliveryType === 'restaurant_delivery'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bike size={15} className="text-[#FF5C00]" />
            <span>Livraison</span>
          </button>
        </div>

        {/* Cart Item List */}
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Votre panier est vide. Sélectionnez un plat délicieux dans le feed ou chez nos restaurants.
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.dish.id}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/20 border border-border/30 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{item.dish.name}</p>
                  <p className="text-muted-foreground">{formatCurrency(item.dish.price)} / unité</p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-border bg-background">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.dish.id, -1)}
                      className="px-2 py-1 text-muted-foreground hover:text-foreground cursor-pointer font-bold"
                    >
                      -
                    </button>
                    <span className="px-2 font-mono font-bold text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.dish.id, 1)}
                      className="px-2 py-1 text-muted-foreground hover:text-foreground cursor-pointer font-bold"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.dish.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cost Breakdown */}
        {items.length > 0 && (
          <div className="pt-3 border-t border-border/40 space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Sous-total plats</span>
              <span className="font-mono">{formatCurrency(foodSubtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Frais de service Fidfud</span>
              <span className="font-mono">{formatCurrency(serviceFee)}</span>
            </div>
            {deliveryType === 'restaurant_delivery' && (
              <div className="flex justify-between text-muted-foreground">
                <span>Frais de livraison</span>
                <span className="font-mono">{formatCurrency(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm text-foreground pt-2 border-t border-border/40">
              <span>Total TTC</span>
              <span className="font-mono text-base text-[#FF5C00]">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2">
        <Button
          variant="orange"
          size="lg"
          disabled={items.length === 0 || isLoading}
          onClick={() => onProceedToCheckout(deliveryType)}
          className="w-full gap-2 rounded-2xl font-bold shadow-lg shadow-[#FF5C00]/20"
        >
          {isLoading ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              <span>Commander ({formatCurrency(totalAmount)})</span>
              <ArrowRight size={16} />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
