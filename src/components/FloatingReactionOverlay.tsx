import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface FloatingReactionParticle {
  id: string;
  videoId: string;
  emoji: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  scale: number;
  rotation: number;
  swayDistance: number;
  duration: number;
  glowColor?: string;
  senderName?: string;
  isBurst?: boolean;
}

export interface ComboTracker {
  videoId: string;
  emoji: string;
  count: number;
  lastUpdated: number;
}

interface FloatingReactionOverlayProps {
  videoId: string;
  particles: FloatingReactionParticle[];
  combo: ComboTracker | null;
  doubleTapAnimation: { videoId: string; x: number; y: number; id: string; emoji?: string } | null;
}

export const FloatingReactionOverlay: React.FC<FloatingReactionOverlayProps> = ({
  videoId,
  particles,
  combo,
  doubleTapAnimation
}) => {
  const activeParticles = particles.filter(p => p.videoId === videoId);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none">
      {/* Floating Particles Stream */}
      <AnimatePresence>
        {activeParticles.map((particle) => {
          const swayDirection = particle.rotation >= 0 ? 1 : -1;
          const sway1 = particle.swayDistance * swayDirection;
          const sway2 = -particle.swayDistance * 0.7 * swayDirection;
          const sway3 = particle.swayDistance * 1.2 * swayDirection;

          return (
            <motion.div
              key={particle.id}
              initial={{
                opacity: 0,
                scale: 0.2,
                x: `${particle.x}%`,
                y: `${particle.y}%`,
                rotate: particle.rotation * 0.5,
              }}
              animate={{
                opacity: [0, 1, 1, 0.85, 0],
                scale: [
                  0.3,
                  particle.scale * (particle.isBurst ? 1.4 : 1.2),
                  particle.scale,
                  particle.scale * 0.9,
                  particle.scale * 0.5,
                ],
                x: [
                  `${particle.x}%`,
                  `${particle.x + sway1}%`,
                  `${particle.x + sway2}%`,
                  `${particle.x + sway3}%`,
                  `${particle.x + sway1 * 1.5}%`,
                ],
                y: [
                  `${particle.y}%`,
                  `${particle.y - 18}%`,
                  `${particle.y - 42}%`,
                  `${particle.y - 68}%`,
                  `${particle.y - 95}%`,
                ],
                rotate: [
                  particle.rotation,
                  particle.rotation + (swayDirection * 15),
                  particle.rotation - (swayDirection * 12),
                  particle.rotation + (swayDirection * 25),
                ],
              }}
              exit={{ opacity: 0, scale: 0.2 }}
              transition={{
                duration: particle.duration || 2.2,
                ease: [0.25, 0.1, 0.25, 1],
                times: [0, 0.12, 0.5, 0.8, 1],
              }}
              style={{
                left: 0,
                top: 0,
                filter: particle.glowColor
                  ? `drop-shadow(0 0 14px ${particle.glowColor})`
                  : 'drop-shadow(0 4px 14px rgba(0,0,0,0.85))',
                willChange: 'transform, opacity',
              }}
              className="absolute flex items-center gap-1.5 transform-gpu"
            >
              <span className="text-3xl sm:text-4xl select-none leading-none">
                {particle.emoji}
              </span>
              
              {/* Optional live user badge for simulated crowd reactions */}
              {particle.senderName && (
                <span className="text-[9px] font-black text-white/95 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 shadow-md font-sans whitespace-nowrap">
                  {particle.senderName}
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Combo Counter Burst Overlay */}
      <AnimatePresence>
        {combo && combo.videoId === videoId && combo.count >= 2 && (
          <motion.div
            key={`combo-${combo.videoId}-${combo.count}`}
            initial={{ scale: 0.4, opacity: 0, y: 20 }}
            animate={{
              scale: [0.6, 1.25, 1],
              opacity: 1,
              y: 0,
            }}
            exit={{ scale: 0.7, opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute bottom-28 right-16 sm:right-20 pointer-events-none z-40 flex flex-col items-center"
          >
            <div className="relative px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-[#FF5C00] via-purple-600 to-pink-600 border border-white/30 shadow-[0_0_25px_rgba(255,92,0,0.6)] backdrop-blur-xl flex items-center gap-2">
              <span className="text-xl animate-bounce">{combo.emoji}</span>
              <div className="flex flex-col">
                <span className="text-[13px] font-black text-white tracking-wider font-mono leading-none">
                  x{combo.count} COMBO!
                </span>
                <span className="text-[8px] font-extrabold text-amber-200 uppercase tracking-widest leading-none mt-0.5">
                  {combo.count >= 15 ? '🔥 SUPRA HYPÉ !' : combo.count >= 8 ? '⚡ ULTRA GOURMAND' : '✨ EN FEU !'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-Tap Heart / Emoji Burst */}
      <AnimatePresence>
        {doubleTapAnimation && doubleTapAnimation.videoId === videoId && (
          <motion.div
            key={doubleTapAnimation.id}
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.3, 1.4, 1.2, 1.7],
              rotate: [0, -10, 10, 0],
            }}
            transition={{ duration: 0.75, times: [0, 0.2, 0.7, 1] }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center filter drop-shadow-[0_0_35px_rgba(255,48,64,0.95)] pointer-events-none z-40"
            style={{ left: `${doubleTapAnimation.x}%`, top: `${doubleTapAnimation.y}%` }}
          >
            <span className="text-6xl sm:text-7xl animate-pulse select-none">
              {doubleTapAnimation.emoji || '❤️'}
            </span>
            <span className="text-white text-[11px] sm:text-xs font-black uppercase tracking-wider bg-black/85 px-3.5 py-1 rounded-full mt-2 backdrop-blur-md border border-white/30 shadow-2xl">
              J'adore ! {doubleTapAnimation.emoji || '❤️'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
