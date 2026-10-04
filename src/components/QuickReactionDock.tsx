import React from 'react';
import { Sparkles } from 'lucide-react';
import { REACTION_EMOJIS } from './VideoFeed';

interface QuickReactionDockProps {
  videoId: string;
  onTriggerReaction: (videoId: string, emoji: string, clientX?: number, clientY?: number, e?: React.MouseEvent) => void;
  reactionCounts?: Record<string, number>;
  onOpenExpandedPicker?: () => void;
}

export const QuickReactionDock: React.FC<QuickReactionDockProps> = ({
  videoId,
  onTriggerReaction,
  reactionCounts = {},
  onOpenExpandedPicker,
}) => {
  // Top fast-tap emojis as requested: 😋, 🔥, 🤤, ❤️
  const topReactions = [
    { emoji: '😋', label: 'Miam !', glow: 'rgba(255, 140, 0, 0.7)' },
    { emoji: '🔥', label: 'Feu !', glow: 'rgba(255, 60, 0, 0.8)' },
    { emoji: '🤤', label: 'Bave', glow: 'rgba(16, 185, 129, 0.7)' },
    { emoji: '❤️', label: 'Love', glow: 'rgba(239, 68, 68, 0.8)' },
    { emoji: '💯', label: '10/10', glow: 'rgba(245, 158, 11, 0.8)' },
  ];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.65)] pointer-events-auto"
    >
      {topReactions.map((item) => {
        const count = reactionCounts[item.emoji] || 0;
        return (
          <button
            key={item.emoji}
            id={`btn-quick-react-${item.emoji}-${videoId}`}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTriggerReaction(videoId, item.emoji, e.clientX, e.clientY, e);
            }}
            className="group relative flex flex-col items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 hover:scale-115 transition-all duration-150 cursor-pointer select-none"
            title={`Envoyer ${item.label}`}
          >
            <span className="text-base sm:text-xl group-hover:scale-125 transition-transform duration-150 leading-none">
              {item.emoji}
            </span>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 text-[8px] font-black text-white bg-[#FF5C00] px-1 py-0.2 rounded-full border border-black/50 leading-none shadow-md">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        );
      })}

      {onOpenExpandedPicker && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenExpandedPicker();
          }}
          className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FF5C00]/20 hover:bg-[#FF5C00]/40 border border-[#FF5C00]/40 text-amber-300 transition-all hover:scale-110 active:scale-95 cursor-pointer ml-0.5"
          title="Plus de réactions"
        >
          <Sparkles size={13} className="animate-spin-slow" />
        </button>
      )}
    </div>
  );
};
