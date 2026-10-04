'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ShieldCheck, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function CheckoutPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');

  const [form, setForm] = useState({
    fullName: 'Alexandre Martin',
    email: 'alex.martin@example.com',
    address: '10 Rue de la Paix, 75002 Paris',
    cardNumber: '•••• •••• •••• 4242',
    expDate: '12/28',
    cvc: '•••',
  });

  const totalAmount = 34.39;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setOrderNumber(`ord-${Math.floor(1000 + Math.random() * 9000)}`);
      setIsSuccess(true);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="container mx-auto max-w-2xl flex-1 px-4 py-8">
        {isSuccess ? (
          <Card className="rounded-3xl border-emerald-500/30 bg-card p-6 text-center space-y-4 shadow-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-black text-foreground">
              Commande confirmée avec succès !
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Votre commande <span className="font-mono font-bold text-foreground">#{orderNumber}</span> a été transmise en cuisine. Le restaurateur commence la préparation minute.
            </p>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 text-xs space-y-1">
              <p className="text-muted-foreground">Règlement sécurisé Stripe Connect effectué : <span className="font-bold text-foreground">{formatCurrency(totalAmount)}</span></p>
              <p className="text-muted-foreground">Un email de confirmation vous a été adressé.</p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/orders">
                <Button variant="orange" className="rounded-xl font-bold">
                  Suivre ma commande en temps réel
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="rounded-xl">
                  Retour à l'accueil
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="rounded-3xl border-border/60 bg-card shadow-xl overflow-hidden">
            <CardHeader className="border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <CreditCard className="text-[#FF5C00]" size={20} />
                  <span>Paiement Sécurisé</span>
                </CardTitle>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock size={12} className="text-emerald-500" />
                  <span>SSL 256-bit</span>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 p-6">
                {/* Client Info */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-foreground">Informations de livraison</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="Nom complet"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      required
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <Input
                    placeholder="Adresse de livraison"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    required
                  />
                </div>

                {/* Card Info */}
                <div className="space-y-3 pt-4 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">Carte bancaire (Stripe)</label>
                    <Badge variant="secondary" className="text-[10px]">Stripe Connect Direct</Badge>
                  </div>
                  <Input
                    placeholder="Numéro de carte"
                    value={form.cardNumber}
                    onChange={(e) => setForm({ ...form, cardNumber: e.target.value })}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="MM/AA"
                      value={form.expDate}
                      onChange={(e) => setForm({ ...form, expDate: e.target.value })}
                      required
                    />
                    <Input
                      placeholder="CVC"
                      value={form.cvc}
                      onChange={(e) => setForm({ ...form, cvc: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Order Summary */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Articles (2x Pizza + Tiramisù)</span>
                    <span className="font-mono">{formatCurrency(33.40)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Frais de service Fidfud</span>
                    <span className="font-mono">{formatCurrency(0.99)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-foreground pt-2 border-t border-border/40">
                    <span>Total à payer</span>
                    <span className="text-[#FF5C00] font-mono text-base">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <Button
                  type="submit"
                  variant="orange"
                  size="lg"
                  disabled={isProcessing}
                  className="w-full rounded-2xl font-bold shadow-lg shadow-[#FF5C00]/20"
                >
                  {isProcessing ? (
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <span className="flex items-center gap-2">
                      <span>Payer {formatCurrency(totalAmount)}</span>
                      <ArrowRight size={16} />
                    </span>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
}
