'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import DishItem from '@/components/DishItem';
import OrderSummary from '@/components/OrderSummary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowLeft, Store, X } from 'lucide-react';
import Link from 'next/link';
import type { Dish, CartItem, DeliveryType } from '@/types';

interface RestaurantPageProps {
  params: {
    id: string;
  };
}

const SAMPLE_DISHES: Dish[] = [
  {
    id: 'dish-1',
    restaurantId: 'rest-1',
    name: 'Pizza Margherita Di Bufala DOP',
    description: 'Sauce tomate San Marzano biologique, mozzarella di bufala campana, basilic frais, huile d’olive extra vierge.',
    price: 14.50,
    isAvailable: true,
    category: 'Pizzas',
    imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dish-2',
    restaurantId: 'rest-1',
    name: 'Pizza Tartufo & Funghi',
    description: 'Crème de truffe noire d’Alba, fior di latte, champignons sautés, copeaux de parmesan 24 mois.',
    price: 18.90,
    isAvailable: true,
    category: 'Pizzas',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dish-3',
    restaurantId: 'rest-1',
    name: 'Tiramisù Tradizionale al Mascarpone',
    description: 'Biscuits Savoiardi imbibés d’espresso Illy, crème onctueuse au mascarpone frais, cacao amer Valrhona.',
    price: 7.50,
    isAvailable: true,
    category: 'Desserts',
    imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  }
];

export default function RestaurantDetailPage({ params }: RestaurantPageProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addedDishIds, setAddedDishIds] = useState<Record<string, boolean>>({});

  const handleAddToCart = (dish: Dish) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.dish.id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.dish.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { dish, quantity: 1, restaurantId: dish.restaurantId }];
    });

    setAddedDishIds((prev) => ({ ...prev, [dish.id]: true }));
    setTimeout(() => {
      setAddedDishIds((prev) => ({ ...prev, [dish.id]: false }));
    }, 1500);
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

  const handleProceedToCheckout = (deliveryType: DeliveryType) => {
    window.location.href = `/checkout?deliveryType=${deliveryType}`;
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar cartItemCount={totalCartCount} onOpenCart={() => setIsCartOpen(true)} />

      {/* Hero Banner */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-muted">
        <img
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&auto=format&fit=crop&q=80"
          alt="Restaurant Banner"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="absolute top-6 left-4 sm:left-8">
          <Link href="/restaurants">
            <Button size="sm" variant="secondary" className="gap-2 rounded-xl backdrop-blur-md bg-black/60 text-white border border-white/10">
              <ArrowLeft size={16} />
              <span>Retour aux restaurants</span>
            </Button>
          </Link>
        </div>

        {/* Restaurant Header Details */}
        <div className="absolute bottom-6 left-4 sm:left-8 right-4 sm:right-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <Badge variant="orange" className="font-bold">
              Cuisine Italienne Artisanale
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground">
              Pizzeria Bella Napoli
            </h1>
            <p className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
              <MapPin size={15} className="text-[#FF5C00]" />
              <span>14 Rue Oberkampf, 75011 Paris • Ouvert de 11h30 à 23h</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="orange"
              onClick={() => setIsCartOpen(true)}
              className="rounded-xl font-bold shadow-lg shadow-[#FF5C00]/20"
            >
              Voir le panier ({totalCartCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="container mx-auto max-w-7xl flex-1 px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu Items List */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground">
                Notre Carte du Moment
              </h2>
              <p className="text-xs text-muted-foreground">
                Plats préparés à la commande avec des ingrédients frais importés directement de Campanie.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {SAMPLE_DISHES.map((dish) => (
                <DishItem
                  key={dish.id}
                  dish={dish}
                  onAddToCart={handleAddToCart}
                  isAdded={addedDishIds[dish.id]}
                />
              ))}
            </div>
          </div>

          {/* Desktop Sticky Order Summary */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <OrderSummary
                items={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onProceedToCheckout={handleProceedToCheckout}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Cart Sheet */}
      {isCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md">
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-white cursor-pointer"
            >
              <X size={24} />
            </button>
            <OrderSummary
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onProceedToCheckout={handleProceedToCheckout}
            />
          </div>
        </div>
      )}
    </div>
  );
}
