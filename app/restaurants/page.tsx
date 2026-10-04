'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import RestaurantCard from '@/components/RestaurantCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Store } from 'lucide-react';
import type { Restaurant } from '@/types';

const INITIAL_RESTAURANTS: Restaurant[] = [
  {
    id: 'rest-1',
    userId: 'usr-1',
    name: 'Pizzeria Bella Napoli',
    address: '14 Rue Oberkampf, 75011 Paris',
    commissionRate: 15,
    logoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    slogan: 'L’authentique pizza napolitaine cuite au feu de bois 🍕',
    category: 'Italien',
    isPublished: true,
    isOrderingEnabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rest-2',
    userId: 'usr-2',
    name: 'The French Smash Bros',
    address: '8 Boulevard Voltaire, 75011 Paris',
    commissionRate: 15,
    logoUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80',
    slogan: 'Smash burgers croustillants & frites maison 🍔🍟',
    category: 'Burgers',
    isPublished: true,
    isOrderingEnabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rest-3',
    userId: 'usr-3',
    name: 'Sakura Bento & Ramen Bar',
    address: '22 Rue Sainte-Anne, 75001 Paris',
    commissionRate: 15,
    logoUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=120&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
    slogan: 'Ramen mijotés 18h & gyozas faits main 🍜',
    category: 'Japonais',
    isPublished: true,
    isOrderingEnabled: true,
    createdAt: new Date().toISOString(),
  }
];

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(INITIAL_RESTAURANTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Italien', 'Burgers', 'Japonais', 'Street Food'];

  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || r.category?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="container mx-auto max-w-7xl flex-1 px-4 py-8 space-y-8">
        {/* Header Hero */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5C00]/10 border border-[#FF5C00]/20 text-[#FF5C00] text-xs font-black">
              <Store size={14} />
              <span>Nos Restaurateurs Partenaires</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Découvrez les meilleures tables de votre quartier
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Commandez en direct de nos chefs partenaires, en Click & Collect sans commission abusive ou en livraison rapide.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              type="text"
              placeholder="Rechercher un restaurant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-2xl bg-card border-border/60"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'orange' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="rounded-full text-xs font-bold shrink-0 capitalize"
            >
              {cat === 'all' ? 'Toutes les cuisines' : cat}
            </Button>
          ))}
        </div>

        {/* Restaurant Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>

        {filteredRestaurants.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Aucun restaurant ne correspond à votre recherche.
          </div>
        )}
      </main>
    </div>
  );
}
