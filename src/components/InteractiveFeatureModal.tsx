import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, MapPin, QrCode, Bike, Mail, Bell, Sparkles } from 'lucide-react';
import { Restaurant } from '../types';

interface InteractiveFeatureModalProps {
  feature: {
    id: string;
    title: string;
    description: string;
    badge?: string;
    icon?: string;
    cta?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  accentColor: string;
  userEmail?: string;
}

export default function InteractiveFeatureModal({
  feature,
  isOpen,
  onClose,
  restaurants,
  accentColor,
  userEmail
}: InteractiveFeatureModalProps) {
  if (!isOpen || !feature) return null;

  // Local state for Express Pickup (feat-1)
  const [selectedPickupRest, setSelectedPickupRest] = useState<string>(restaurants[0]?.id || '');
  const [pickupCodeSaved, setPickupCodeSaved] = useState<boolean>(false);
  const pickupCode = "FID-EXP-" + String(selectedPickupRest).slice(0, 4).toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000);

  // Local state for Eco Delivery (feat-2)
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [isCalculatingEco, setIsCalculatingEco] = useState<boolean>(false);
  const [ecoResults, setEcoResults] = useState<boolean>(false);

  // Local state for Dynamic CMS Features
  const [customEmail, setCustomEmail] = useState<string>(userEmail || '');
  const [promoCode, setPromoCode] = useState<string>('');
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [customActivated, setCustomActivated] = useState<boolean>(false);

  // Determine standard categories
  const isExpressPickup = feature.id === 'feat-1' || feature.title.toLowerCase().includes('retrait') || feature.title.toLowerCase().includes('express');
  const isEcoDelivery = feature.id === 'feat-2' || feature.title.toLowerCase().includes('éco') || feature.title.toLowerCase().includes('velo') || feature.title.toLowerCase().includes('vélo');

  const selectedRestObj = restaurants.find(r => r.id === selectedPickupRest);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-[#0F0F11] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh] text-white"
        >
          {/* Accent glow corner */}
          <div 
            className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: accentColor }}
          />

          {/* Header */}
          <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center relative z-10 bg-zinc-950/40">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{feature.icon || '✨'}</span>
              <div>
                <span 
                  style={{ color: accentColor, borderColor: `${accentColor}30`, backgroundColor: `${accentColor}10` }}
                  className="text-[8px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full"
                >
                  {feature.badge || 'SERVICE ACTIF'}
                </span>
                <h3 className="text-sm font-black uppercase tracking-tight italic text-white mt-0.5">{feature.title}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body Container */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 relative z-10 font-sans">
            <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.02] p-3 rounded-2xl border border-white/5">
              {feature.description}
            </p>

            {/* 1. RENDER RETRAIT EXPRESS PICKUP SCHEME */}
            {isExpressPickup && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1">
                    <MapPin size={11} style={{ color: accentColor }} />
                    Choisir votre restaurant de retrait
                  </label>
                  <select
                    value={selectedPickupRest}
                    onChange={(e) => {
                      setSelectedPickupRest(e.target.value);
                      setPickupCodeSaved(false);
                    }}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-accent font-sans cursor-pointer"
                  >
                    {restaurants.map(rest => (
                      <option key={rest.id} value={rest.id} className="bg-zinc-900 text-white">
                        {rest.name} — {rest.category || 'Gourmet'} (Moins de 2 km)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 text-center space-y-3">
                  <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest block">
                    VOTRE PASS COMPTOIR SANS ATTENTE
                  </span>

                  {/* QR Code Graphic simulation */}
                  <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl flex items-center justify-center shadow-lg shadow-black/40">
                    <div className="w-full h-full border border-zinc-900 rounded-lg flex flex-col items-center justify-center p-1 bg-zinc-50">
                      <QrCode className="w-24 h-24 text-zinc-950" strokeWidth={1.5} />
                    </div>
                  </div>

                  <p className="font-mono text-xs font-black tracking-widest uppercase text-white p-1.5 bg-white/5 rounded-lg border border-white/10 inline-block">
                    {pickupCode}
                  </p>

                  <div className="text-[10.5px] text-zinc-400 font-sans leading-relaxed text-left space-y-1 px-1">
                    <p className="text-white font-bold">📍 Adresse de retrait :</p>
                    <p className="text-zinc-300">{selectedRestObj?.address || "18 Rue de la Roquette, 75011 Paris"}</p>
                    <p className="text-[9px] text-zinc-500 italic mt-1">
                      * Présentez simplement ce code ou QR Code au guichet prioritaires "Fidfud Express".
                    </p>
                  </div>
                </div>

                {pickupCodeSaved ? (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-2.5 text-green-400">
                    <CheckCircle size={16} className="shrink-0" />
                    <span className="text-[10.5px] font-bold">Lien de retrait enregistré ! Un SMS de rappel vous a été envoyé. 📱</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setPickupCodeSaved(true)}
                    style={{ backgroundColor: accentColor }}
                    className="w-full py-2.5 text-zinc-950 hover:bg-white hover:text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    Enregistrer mon code de retrait
                  </button>
                )}
              </div>
            )}

            {/* 2. RENDER LIVRAISON ÉCO-LOCALE SCHEME */}
            {isEcoDelivery && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1">
                    <Bike size={11} style={{ color: accentColor }} />
                    Saisir votre adresse de livraison (Paris & Proche banlieue)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ex: 45 Rue Oberkampf, 75011 Paris"
                      value={deliveryAddress}
                      onChange={(e) => {
                        setDeliveryAddress(e.target.value);
                        setEcoResults(false);
                      }}
                      className="w-full bg-black/60 border border-white/10 rounded-xl pl-3 pr-16 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-accent"
                    />
                    <button
                      disabled={!deliveryAddress || isCalculatingEco}
                      onClick={() => {
                        setIsCalculatingEco(true);
                        setTimeout(() => {
                          setIsCalculatingEco(false);
                          setEcoResults(true);
                        }, 1200);
                      }}
                      style={{ color: accentColor }}
                      className="absolute right-2 top-2 text-[9px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isCalculatingEco ? 'Calcul...' : 'Valider'}
                    </button>
                  </div>
                </div>

                {ecoResults && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-[#10B981]/5 border border-[#10B981]/25 space-y-3.5"
                  >
                    <div className="flex items-start gap-2 text-[#10B981]">
                      <CheckCircle size={15} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black uppercase font-mono tracking-wide">ADRESSE ÉLIGIBLE ! 🌍</p>
                        <p className="text-[11px] text-zinc-300 font-sans mt-0.5 leading-relaxed">
                          La livraison à vélo est 100% disponible pour l'adresse <strong>{deliveryAddress}</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/60 border border-white/5 space-y-1 text-center font-mono text-[10px]">
                      <p className="text-[#10B981] font-black text-xs">🍀 -450g CO₂ ÉPARGNÉS !</p>
                      <p className="text-zinc-500 leading-normal">
                        Ce plat arrivera chaud en moins de 22 min grâce au réseau local de coursiers Fidfud.
                      </p>
                    </div>

                    {/* Live delivery cyclist list */}
                    <div className="space-y-2">
                      <span className="text-[8.5px] text-zinc-500 font-black tracking-widest uppercase font-mono block">
                        🚲 LIVREURS DISPONIBLES DANS VOTRE ZONE :
                      </span>
                      <div className="divide-y divide-white/5 space-y-2 text-[10px]">
                        <div className="flex justify-between items-center pt-2">
                          <span className="font-bold text-white">🚴 Thomas (Vélo Cargo)</span>
                          <span className="text-[#10B981] font-mono font-bold">À 4 min de vous</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="font-bold text-white">🚴 Amélie (Fixie Rapide)</span>
                          <span className="text-[#10B981] font-mono font-bold">À 7 min de vous</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!ecoResults && (
                  <div className="p-3 bg-zinc-950 rounded-2xl border border-white/5 flex flex-col justify-center items-center text-center py-5 space-y-1.5">
                    <Bike size={24} className="text-zinc-600 animate-bounce" />
                    <p className="text-[10px] text-zinc-400 max-w-xs leading-normal">
                      Saisissez votre adresse ci-dessus pour estimer les temps de trajet et le bilan carbone de votre commande Fidfud.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3. RENDER CUSTOM CMS CREATED FEATURE */}
            {!isExpressPickup && !isEcoDelivery && (
              <div className="space-y-4">
                {customActivated ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-2xl bg-zinc-950 border border-white/10 text-center space-y-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto text-green-400">
                      <CheckCircle size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase text-white italic">SERVICE ACTIVÉ AVEC SUCCÈS !</h4>
                      <p className="text-[11px] text-zinc-400 leading-normal">
                        Le service <strong>{feature.title}</strong> est désormais pleinement opérationnel pour l'adresse <strong>{customEmail}</strong>.
                      </p>
                    </div>
                    {promoCode && (
                      <span className="inline-block text-[9px] font-mono bg-[#FF5C00]/15 text-[#FF5C00] border border-[#FF5C00]/20 px-2 py-1 rounded-md uppercase font-bold">
                        CODE APPLIQUÉ : {promoCode.toUpperCase()}
                      </span>
                    )}
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1">
                        <Mail size={11} style={{ color: accentColor }} />
                        Adresse Email d'activation
                      </label>
                      <input
                        type="email"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="nom@exemple.com"
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1">
                        <Sparkles size={11} style={{ color: accentColor }} />
                        Saisir un Code Promo ou Coupon (Optionnel)
                      </label>
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Ex: WELCOME50"
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-accent font-mono uppercase"
                      />
                    </div>

                    {/* Direct notifications toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/5">
                      <div className="flex items-center gap-2">
                        <Bell size={13} style={{ color: accentColor }} />
                        <span className="text-[10.5px] font-bold">Notifications en temps réel</span>
                      </div>
                      <button
                        onClick={() => setPushEnabled(!pushEnabled)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${pushEnabled ? 'bg-green-500' : 'bg-zinc-700'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${pushEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <button
                      disabled={!customEmail}
                      onClick={() => setCustomActivated(true)}
                      style={{ backgroundColor: accentColor }}
                      className="w-full mt-2 py-2.5 text-zinc-950 hover:bg-white hover:text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Enregistrer & Activer le service
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer branding */}
          <div className="p-4 border-t border-white/5 text-center text-[9px] text-zinc-500 font-mono bg-zinc-950/20">
            FIDFUD CONNECTED CHROME GOURMET SYSTEM ©
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
