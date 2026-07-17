import React from 'react';
import { Play, Pause, Volume2, VolumeX, Video } from 'lucide-react';

interface BackgroundVideoControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  desktopBgType: string;
  mobileBgType: string;
}

export const BackgroundVideoControls: React.FC<BackgroundVideoControlsProps> = ({
  isPlaying,
  isMuted,
  onTogglePlay,
  onToggleMute,
  desktopBgType,
  mobileBgType
}) => {
  const showOnDesktop = desktopBgType === 'video';
  const showOnMobile = mobileBgType === 'video';

  if (!showOnDesktop && !showOnMobile) return null;

  // Determine responsive visibility wrapper class
  const visibilityClass = showOnDesktop && showOnMobile 
    ? 'flex' 
    : showOnDesktop 
      ? 'hidden lg:flex' 
      : 'flex lg:hidden';

  return (
    <div 
      className={`fixed bottom-24 left-4 lg:bottom-6 lg:left-6 z-40 items-center gap-2 px-3 py-2 rounded-2xl bg-zinc-950/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-white/20 select-none ${visibilityClass}`}
    >
      <div className="flex items-center gap-1.5 pr-2 border-r border-white/5 mr-1 shrink-0">
        <Video size={13} className="text-[#FF5C00] animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 font-mono hidden sm:inline">Fond Animé</span>
      </div>

      {/* Play / Pause Toggle Button */}
      <button
        onClick={onTogglePlay}
        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-white transition-all cursor-pointer flex items-center justify-center min-w-[34px] min-h-[34px] border border-white/5"
        title={isPlaying ? "Mettre en pause l'arrière-plan" : "Lancer l'arrière-plan"}
      >
        {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
      </button>

      {/* Mute / Unmute Toggle Button */}
      <button
        onClick={onToggleMute}
        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-white transition-all cursor-pointer flex items-center justify-center min-w-[34px] min-h-[34px] border border-white/5"
        title={isMuted ? "Activer le son de l'arrière-plan" : "Couper le son de l'arrière-plan"}
      >
        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="text-emerald-400" />}
      </button>
    </div>
  );
};

export default BackgroundVideoControls;
