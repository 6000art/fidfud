'use client';

import React from 'react';
import Link from 'next/link';
import { UtensilsCrossed, Film, ShoppingBag, Store, ShieldCheck, ChefHat } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface NavbarProps {
  cartItemCount?: number;
  onOpenCart?: () => void;
}

export default function Navbar({ cartItemCount = 0, onOpenCart }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5C00] to-[#FF8A00] text-white shadow-md">
            <UtensilsCrossed size={20} className="stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-black tracking-tight text-xl text-foreground">
              FID<span className="text-[#FF5C00]">FUD</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground -mt-1">
              Food & Video
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <Film size={16} />
            <span>Feed Vidéo</span>
          </Link>
          <Link href="/restaurants" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <Store size={16} />
            <span>Restaurants</span>
          </Link>
          <Link href="/orders" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <ShieldCheck size={16} />
            <span>Mes Commandes</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-zinc-200 hover:text-[#FF5C00] transition-colors font-semibold">
            <ChefHat size={16} className="text-[#FF5C00]" />
            <span>Espace Restaurateur</span>
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Link href="/restaurants">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex rounded-xl">
              Découvrir
            </Button>
          </Link>

          <Button
            variant="orange"
            size="sm"
            onClick={onOpenCart}
            className="relative flex items-center gap-2 rounded-xl font-bold"
          >
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">Panier</span>
            {cartItemCount > 0 && (
              <Badge variant="default" className="bg-white text-[#FF5C00] px-1.5 py-0.2 text-[11px] font-black">
                {cartItemCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
