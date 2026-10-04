import React, { useEffect, useState } from 'react';
import { X, Download, Smartphone, CheckCircle, Share, PlusSquare, ArrowRight, ShieldCheck, Sparkles, Monitor } from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadAppModal({ isOpen, onClose }: DownloadAppModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Capture PWA beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert("Pour installer l'application Fidfud :\n\n- Android / Chrome : Cliquez sur le menu (⋮) puis 'Ajouter à l'écran d'accueil' ou 'Installer l'application'.\n- iPhone / Safari : Cliquez sur le bouton 'Partager' (⎘) puis 'Sur l'écran d'accueil'.");
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-md bg-[#09090b] border border-[#FF5C00]/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(255,92,0,0.25)] z-10 animate-fade-in text-white space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5C00] flex items-center justify-center text-white shadow-lg shadow-[#FF5C00]/30">
              <Smartphone size={22} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white italic">
                Application FIDFUD Mobile
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono">
                Installation Android & iOS • Sans passer par le Play Store
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        {isInstalled ? (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
            <CheckCircle size={36} className="text-emerald-400 mx-auto" />
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Application Fidfud Installée !</h4>
            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
              Fidfud est déjà présent sur votre écran d'accueil. Vous pouvez l'ouvrir à tout moment en mode application fluide et plein écran !
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Direct Install PWA Banner */}
            {deferredPrompt ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FF5C00]/20 to-amber-500/10 border border-[#FF5C00]/40 space-y-3 text-center">
                <Sparkles size={28} className="text-[#FF5C00] mx-auto animate-bounce" />
                <h4 className="text-xs font-black uppercase text-white tracking-wider">
                  Installation Instantanée Disponible !
                </h4>
                <p className="text-[11px] text-zinc-300 font-sans">
                  Cliquez ci-dessous pour ajouter Fidfud directement à votre écran d'accueil sans téléchargement d'APK lourd.
                </p>
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-[#FF5C00]/30 transition-all cursor-pointer active:scale-95"
                >
                  <Download size={18} />
                  <span>Installer l'application Fidfud maintenant</span>
                </button>
              </div>
            ) : (
              /* Step-by-step instructions based on platform */
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-[#FF5C00] font-mono">
                    {platform === 'ios' ? <Share size={16} /> : <Download size={16} />}
                    <span>
                      {platform === 'ios' ? 'Instructions iPhone / iPad (Safari)' : 'Instructions Android / Chrome'}
                    </span>
                  </div>

                  {platform === 'ios' ? (
                    <ol className="text-xs text-zinc-300 space-y-2 pl-2 font-sans">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Ouvrez le menu de partage de Safari (icône <Share size={12} className="inline mx-0.5" /> en bas).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Faites défiler vers le bas et appuyez sur <strong className="text-white">"Sur l'écran d'accueil"</strong> (<PlusSquare size={12} className="inline mx-0.5" />).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Validez sur <strong className="text-white">"Ajouter"</strong>. L'icône FIDFUD apparaîtra sur votre téléphone !</span>
                      </li>
                    </ol>
                  ) : (
                    <ol className="text-xs text-zinc-300 space-y-2 pl-2 font-sans">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Appuyez sur le menu du navigateur en haut à droite (les 3 petits points <strong className="text-white font-mono">⋮</strong>).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Sélectionnez <strong className="text-white">"Installer l'application"</strong> ou <strong className="text-white">"Ajouter à l'écran d'accueil"</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Confirmez pour lancer l'expérience native Fidfud !</span>
                      </li>
                    </ol>
                  )}
                </div>

                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold uppercase text-xs flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
                >
                  <Download size={16} className="text-[#FF5C00]" />
                  <span>Tester le déclencheur d'installation PWA</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Features badges */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400">
          <div className="p-2.5 rounded-xl bg-zinc-950 border border-white/5 flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>Mode Standalone 100% Hors-Ligne</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-950 border border-white/5 flex items-center gap-2">
            <Sparkles size={14} className="text-[#FF5C00] shrink-0" />
            <span>Plein Écran & Notifications</span>
          </div>
        </div>
      </div>
    </div>
  );
}
