'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Clock, Store, Bike, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Order, OrderStatus } from '@/types';

const SAMPLE_ORDERS: Order[] = [
  {
    id: 'ord-8492',
    userId: 'usr-1',
    restaurantId: 'rest-1',
    restaurantName: 'Pizzeria Bella Napoli',
    totalAmount: 34.39,
    serviceFee: 0.99,
    deliveryType: 'click_and_collect',
    status: 'preparing',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    items: [
      { id: 'item-1', orderId: 'ord-8492', dishId: 'dish-1', dishName: 'Pizza Margherita Di Bufala DOP', quantity: 2, price: 14.50 },
      { id: 'item-2', orderId: 'ord-8492', dishId: 'dish-3', dishName: 'Tiramisù Tradizionale', quantity: 1, price: 7.50 },
    ],
  },
  {
    id: 'ord-7193',
    userId: 'usr-1',
    restaurantId: 'rest-2',
    restaurantName: 'The French Smash Bros',
    totalAmount: 17.39,
    serviceFee: 0.99,
    deliveryType: 'restaurant_delivery',
    status: 'delivered',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { id: 'item-3', orderId: 'ord-7193', dishId: 'dish-2', dishName: 'Smash Burger Supreme + Frites', quantity: 1, price: 13.90 },
    ],
  }
];

function getStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary" className="gap-1"><Clock size={12} /> Reçue</Badge>;
    case 'preparing':
      return <Badge variant="orange" className="gap-1 animate-pulse"><Clock size={12} /> En cuisine</Badge>;
    case 'ready':
      return <Badge variant="success" className="gap-1"><CheckCircle2 size={12} /> Prête</Badge>;
    case 'delivered':
      return <Badge variant="outline" className="gap-1 text-emerald-500 border-emerald-500/30"><CheckCircle2 size={12} /> Livrée / Retirée</Badge>;
    case 'cancelled':
      return <Badge variant="destructive" className="gap-1"><AlertCircle size={12} /> Annulée</Badge>;
  }
}

export default function OrdersPage() {
  const [orders] = useState<Order[]>(SAMPLE_ORDERS);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="container mx-auto max-w-4xl flex-1 px-4 py-8 space-y-6">
        <div className="border-b border-border/40 pb-4">
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Suivi de vos commandes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Visualisez le statut de vos commandes en temps réel et votre historique.
          </p>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="rounded-2xl border-border/60 bg-card overflow-hidden">
              <CardHeader className="p-4 sm:p-6 bg-muted/20 border-b border-border/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-foreground">
                        #{order.id}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.restaurantName || 'Restaurant partenaire'} • {new Date(order.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground">
                        {order.deliveryType === 'click_and_collect' ? 'À emporter' : 'Livraison'}
                      </p>
                      <p className="font-black text-base text-[#FF5C00]">
                        {formatCurrency(order.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-3">
                <div className="divide-y divide-border/20 text-xs">
                  {order.items?.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between">
                      <span className="text-foreground">
                        <span className="font-bold text-[#FF5C00] mr-2">{item.quantity}x</span>
                        {item.dishName || 'Plat cuisiné'}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs text-muted-foreground">
                  <span>Frais de service Fidfud inclus ({formatCurrency(order.serviceFee)})</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg">
                    Détail du reçu
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
