import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Heart, MessageSquare, Gift, Clock, ToggleLeft, CheckCircle, RefreshCw } from 'lucide-react';

interface EngagementPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  designSettings: any;
  onUpdateDesignSettings: (settings: any) => void;
}

export default function EngagementPromptModal({
  isOpen,
  onClose,
  designSettings,
  onUpdateDesignSettings
}: EngagementPromptModalProps) {
  const accentColor = designSettings?.accentColor || '#FF5C00';

  // Local state for live customization
  const [enableBooster, setEnableBooster] = useState<boolean>(designSettings.enableEngagementAnimations !== false);
  const [interval, setIntervalVal] = useState<number>(designSettings.engagementInterval || 20);
  const [promptType, setPromptType] = useState<'alternate' | 'like' | 'comment' | 'gift'>(
    designSettings.engagementPromptType || 'alternate'
  );
  const [customLikeMsg, setCustomLikeMsg] = useState<string>(
    designSettings.customLikeMsg || "Double-tapez ou cliquez ici pour envoyer un super J'aime ! ❤️"
  );
  const [customCommentMsg, setCustomCommentMsg] = useState<string>(
    designSettings.customCommentMsg || "Cliquez ici pour laisser un commentaire ou donner votre avis ! 💬"
  );
  const [customGiftMsg, setCustomGiftMsg] = useState<string>(
    designSettings.customGiftMsg || "Soutenez le chef ! Cliquez pour lui offrir un cadeau de force ! 🎁"
  );
  const [isSaved, setIsSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateDesignSettings({
      enableEngagementAnimations: enableBooster,
      engagementInterval: interval,
      engagementPromptType: promptType,
      customLikeMsg,
      customCommentMsg,
      customGiftMsg
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  // Preview helper
  const getPreviewMsg = () => {
    if (promptType === 'like') return customLikeMsg;
    if (promptType === 'comment') return customCommentMsg;
    if (promptType === 'gift') return customGiftMsg;
    return "🔄 Mode Alterné : Change toutes les " + interval + "s entre Likes, Commentaires & Cadeaux !";
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className="relative w-full max-w-lg bg-[#0F0F11] border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10 flex flex-col max-h-[90vh] text-white"
        >
          {/* Accent glow background blur */}
          <div 
            className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: accentColor }}
          />

          {/* Header */}
          <div className="px-6 py-4.5 border-b border-white/5 flex justify-between items-center bg-zinc-950/40 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF5C00] to-orange-600 flex items-center justify-center text-white shadow-lg">
                <Sparkles size={14} className="animate-pulse text-white" />
              </div>
              <div>
                <span className="text-[8px] bg-[#FF5C00] text-white px-2 py-0.5 rounded-full font-black tracking-widest uppercase">
                  CMS BOOSTER
                </span>
                <h3 className="text-sm font-black uppercase tracking-tight italic text-zinc-100 mt-0.5">
                  Booster d'Engagement Video
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body Content (Scrollable) */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
            {/* Toggle Enable/Disable */}
            <div className="flex items-center justify-between p-4 bg-zinc-950/60 rounded-2xl border border-white/5">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-zinc-200">Activer le booster automatique</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-sans leading-normal">
                  Affiche des fenêtres d’interactions élégantes à vos clients en direct.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={enableBooster} 
                  onChange={(e) => setEnableBooster(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#FF5C00]"></div>
              </label>
            </div>

            {enableBooster && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-5"
              >
                {/* 1. Time Interval Definition */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Clock size={11} className="text-[#FF5C00]" />
                    <span>Intervalle de Déclenchement (Secondes)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 20, 30].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setIntervalVal(t)}
                        className={`py-2 px-3 rounded-xl border text-[11px] font-black uppercase transition-all flex flex-col items-center justify-center cursor-pointer ${
                          interval === t 
                            ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-[#FF5C00] scale-102 font-black' 
                            : 'bg-zinc-950 border-white/10 text-zinc-400 hover:border-white/20'
                        }`}
                      >
                        <span>{t}s</span>
                        <span className="text-[7.5px] text-zinc-500 font-normal mt-0.5">
                          {t === 10 ? 'Très rapide' : t === 20 ? 'Recommandé' : 'Standard'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Choose Prompt type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <RefreshCw size={11} className="text-[#FF5C00]" />
                    <span>Comportement de l'Animation</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPromptType('alternate')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        promptType === 'alternate'
                          ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-white'
                          : 'bg-zinc-950 border-white/10 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <div className="mt-0.5 text-orange-400">⚡</div>
                      <div>
                        <p className="text-[10px] font-black uppercase">Boucle Alternée</p>
                        <p className="text-[8px] text-zinc-500 font-sans mt-0.5 leading-normal">Alterne entre Likes, Commentaires et Cadeaux automatiquement.</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPromptType('like')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        promptType === 'like'
                          ? 'bg-red-500/10 border-red-500 text-white'
                          : 'bg-zinc-950 border-white/10 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <Heart size={13} className="text-red-500 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase">Likes Uniquement</p>
                        <p className="text-[8px] text-zinc-500 font-sans mt-0.5 leading-normal">Se focalise sur la génération de super likes sur le live.</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPromptType('comment')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        promptType === 'comment'
                          ? 'bg-blue-500/10 border-blue-500 text-white'
                          : 'bg-zinc-950 border-white/10 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <MessageSquare size={13} className="text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase">Commentaires</p>
                        <p className="text-[8px] text-zinc-500 font-sans mt-0.5 leading-normal">Incite les utilisateurs à commenter la préparation.</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPromptType('gift')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        promptType === 'gift'
                          ? 'bg-yellow-500/10 border-yellow-500 text-white'
                          : 'bg-zinc-950 border-white/10 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <Gift size={13} className="text-yellow-400 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase">Cadeaux Uniquement</p>
                        <p className="text-[8px] text-zinc-500 font-sans mt-0.5 leading-normal">Encourage l'envoi de fleurs, couronnes et jetons de soutien.</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3. Text Prompts Customize */}
                <div className="space-y-3 bg-zinc-950/40 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">Personnaliser les Slogans :</p>
                  
                  {['alternate', 'like'].includes(promptType) && (
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase block">Texte d’Incitation aux Likes</label>
                      <input 
                        type="text" 
                        value={customLikeMsg}
                        onChange={(e) => setCustomLikeMsg(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </div>
                  )}

                  {['alternate', 'comment'].includes(promptType) && (
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase block">Texte d’Incitation aux Commentaires</label>
                      <input 
                        type="text" 
                        value={customCommentMsg}
                        onChange={(e) => setCustomCommentMsg(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </div>
                  )}

                  {['alternate', 'gift'].includes(promptType) && (
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase block">Texte d’Incitation aux Cadeaux</label>
                      <input 
                        type="text" 
                        value={customGiftMsg}
                        onChange={(e) => setCustomGiftMsg(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </div>
                  )}
                </div>

                {/* 4. Live Visual Mockup (FidFud style) */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-mono">Aperçu Réel sur Écran Client :</p>
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Simulated video background */}
                    <div className="absolute inset-0 bg-gradient-to-t from-orange-950/20 to-zinc-950/80 z-0" />
                    
                    {/* Floating simulated prompt */}
                    <div className="w-full bg-gradient-to-r from-black/95 via-zinc-950/95 to-black/95 border border-[#FF5C00]/60 rounded-xl p-2.5 shadow-[0_0_15px_rgba(255,92,0,0.35)] relative z-10 flex items-center gap-2 max-w-sm">
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 bg-[#FF5C00]/35 rounded-full blur-sm animate-ping" />
                        <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-[#FF5C00] to-orange-600 flex items-center justify-center text-white">
                          {promptType === 'like' || promptType === 'alternate' ? (
                            <Heart size={11} className="text-white fill-white animate-pulse" />
                          ) : promptType === 'comment' ? (
                            <MessageSquare size={11} className="text-white fill-white animate-pulse" />
                          ) : (
                            <Gift size={11} className="text-white animate-pulse" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[6.5px] bg-[#FF5C00] text-white px-1 rounded font-black uppercase font-mono tracking-wider">
                          {promptType === 'like' ? 'SUPER LIKE' : promptType === 'comment' ? 'CONVERSATION' : promptType === 'gift' ? 'CADEAU DU CHEF' : 'BOOSTER'}
                        </span>
                        <p className="text-[9px] font-extrabold text-zinc-100 truncate font-sans leading-tight mt-0.5">
                          {getPreviewMsg()}
                        </p>
                      </div>
                      <span className="text-[#FF5C00] text-[9px] shrink-0 font-black animate-pulse">➔</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-zinc-950/50">
            <span className="text-[9px] text-zinc-500 font-sans">S'applique en direct sans recharger l'application</span>
            <button
              onClick={handleSave}
              className="bg-gradient-to-r from-[#FF5C00] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-zinc-950 hover:text-white font-black text-[11px] px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all duration-300 shadow-lg shadow-[#FF5C00]/10 flex items-center gap-1.5 cursor-pointer"
            >
              {isSaved ? (
                <>
                  <CheckCircle size={13} className="text-zinc-950 animate-bounce" />
                  <span>Enregistré !</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Sauvegarder</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
