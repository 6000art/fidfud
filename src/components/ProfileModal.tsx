import React from 'react';
import { X, User, ChefHat, LayoutGrid, KeyRound, LogOut, Bell, ShieldCheck, Truck } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; email: string; role: 'client' | 'restaurant' | 'admin' } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  currentRole: 'client' | 'restaurant' | 'courier';
  onChangeRole: (role: 'client' | 'restaurant' | 'courier') => void;
  onOpenAdmin: () => void;
  activeOrderCount: number;
  onOpenOrdersHistory: () => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  onOpenAuth,
  onLogout,
  currentRole,
  onChangeRole,
  onOpenAdmin,
  activeOrderCount,
  onOpenOrdersHistory
}: ProfileModalProps) {
  if (!isOpen) return null;

  // Extract username from email
  const getUsername = (emailStr: string) => {
    return emailStr.split('@')[0];
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-sm bg-[#09090b] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 animate-fade-in text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#FF5C00] flex items-center gap-1.5">
            <User size={15} />
            <span>Mon Espace FIDFUD</span>
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-6">
          {/* User Account Info Section */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                    <span className="text-xs font-black uppercase font-mono tracking-wider truncate max-w-[150px]">
                      {getUsername(user.email)}
                    </span>
                  </div>
                  <span className="text-[8px] bg-[#FF5C00]/25 text-[#FF5C00] border border-[#FF5C00]/30 font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                    {user.role}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-red-500/10"
                >
                  <LogOut size={12} />
                  <span>Se déconnecter</span>
                </button>
              </div>
            ) : (
              <div className="text-center space-y-3 py-1">
                <p className="text-xs text-zinc-400 font-medium">Rejoignez la communauté des gourmets et commandez vos plats en direct !</p>
                <button
                  onClick={() => {
                    onOpenAuth();
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#FF5C00] hover:bg-[#FF7A00] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound size={13} />
                  <span>Se connecter / S'inscrire</span>
                </button>
              </div>
            )}
          </div>

          {/* Interactive Role Selector */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">Changer de mode d'interface</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => {
                  onChangeRole('client');
                  onClose();
                }}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  currentRole === 'client'
                    ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-[#FF5C00]'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
                }`}
              >
                <User size={15} />
                <span className="text-[8px] font-black uppercase tracking-wider">Foodie</span>
              </button>
              <button
                onClick={() => {
                  onChangeRole('restaurant');
                  onClose();
                }}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  currentRole === 'restaurant'
                    ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-[#FF5C00]'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
                }`}
              >
                <ChefHat size={15} />
                <span className="text-[8px] font-black uppercase tracking-wider">Chef</span>
              </button>
              <button
                onClick={() => {
                  onChangeRole('courier');
                  onClose();
                }}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  currentRole === 'courier'
                    ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-[#FF5C00]'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
                }`}
              >
                <Truck size={15} />
                <span className="text-[8px] font-black uppercase tracking-wider">Livreur</span>
              </button>
            </div>
            <p className="text-[9px] text-zinc-500 font-sans text-center leading-normal">
              {currentRole === 'client' 
                ? 'Vous parcourez les vidéos culinaires en direct et commandez instantanément.' 
                : currentRole === 'restaurant'
                ? 'Vous gérez votre restaurant, vos commandes en temps réel et vos vidéos TikTok.'
                : 'Portail livreur : gérez votre compte, vos justificatifs, et effectuez vos livraisons GPS en direct.'}
            </p>
          </div>

          {/* Quick Actions Portal */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">Administration & Commandes</label>
            <div className="space-y-2">
              {/* Live Orders Tracker link */}
              {currentRole === 'client' && (
                <button
                  onClick={() => {
                    onOpenOrdersHistory();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-white text-[11px] font-bold uppercase transition-all flex items-center justify-between border border-white/5 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Bell size={13} className="text-[#FF5C00]" />
                    <span>Mes commandes en cours</span>
                  </div>
                  {activeOrderCount > 0 ? (
                    <span className="bg-[#FF5C00] text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                      {activeOrderCount} ACTIVE(S)
                    </span>
                  ) : (
                    <span className="text-[9px] text-zinc-500">Aucune</span>
                  )}
                </button>
              )}

              {/* Admin CMS controller inside profile modal as requested */}
              {user?.role === 'admin' && (
                <button
                  onClick={() => {
                    onOpenAdmin();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-zinc-950 to-zinc-900 border border-amber-500/30 hover:border-amber-500 text-amber-400 text-[11px] font-black uppercase transition-all flex items-center justify-between shadow-md cursor-pointer"
                  title="Ouvrir le CMS Administrateur (Shopify-Style)"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">👑</span>
                    <span>Portail Admin CMS</span>
                  </div>
                  <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                    Shopify Style
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer info badge */}
        <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-center gap-1 text-[8px] text-zinc-600 font-mono">
          <ShieldCheck size={10} className="text-green-500" />
          <span>FIDFUD SECURE PLATFORM • VERROUILLAGE SSL</span>
        </div>
      </div>
    </div>
  );
}
