'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import VideoFeed from '@/components/VideoFeed';
import OrderSummary from '@/components/OrderSummary';
import { Button } from '@/components/ui/button';
import { X, Sparkles } from 'lucide-react';
import type { CartItem, Dish, DeliveryType } from '@/types';

export default function HomePage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddDish = (dish: Dish) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.dish.id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.dish.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { dish, quantity: 1, restaurantId: dish.restaurantId }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (dishId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.dish.id === dishId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (dishId: string) => {
    setCartItems((prev) => prev.filter((item) => item.dish.id !== dishId));
  };

  const handleProceedToCheckout = async (deliveryType: DeliveryType) => {
    setIsSubmitting(true);
    try {
      if (cartItems.length === 0) return;
      // In a production Next.js app, redirect to /checkout
      window.location.href = `/checkout?deliveryType=${deliveryType}`;
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      <Navbar cartItemCount={totalCartCount} onOpenCart={() => setIsCartOpen(true)} />

      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
        {/* Video feed container */}
        <div className="w-full flex justify-center">
          <VideoFeed onOrderDish={handleAddDish} />
        </div>
      </main>

      {/* Cart Drawer / Modal Backdrop */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md">
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white cursor-pointer"
            >
              <X size={24} />
            </button>
            <OrderSummary
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onProceedToCheckout={handleProceedToCheckout}
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
