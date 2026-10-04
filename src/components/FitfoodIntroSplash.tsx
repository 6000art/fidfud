import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface FitfoodIntroSplashProps {
  onComplete?: () => void;
  appName?: string;
  designSettings?: any;
}

export const FitfoodIntroSplash: React.FC<FitfoodIntroSplashProps> = ({
  onComplete,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleAnimationComplete = () => {
    if (isExiting && onComplete) {
      onComplete();
    }
  };

  const handleDismiss = () => {
    setIsExiting(true);
  };

  return (
    <AnimatePresence mode="wait">
      {!isExiting && (
        <motion.div
          id="fitfood-splash-container"
          onClick={handleDismiss}
          className="fixed inset-0 z-[99999] bg-[#050506] flex flex-col items-center justify-center overflow-hidden select-none cursor-pointer"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.06,
            filter: 'blur(8px)',
            transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] } 
          }}
          onAnimationComplete={handleAnimationComplete}
        >
          {/* Subtle Ambient Flame Radial Glow */}
          <motion.div 
            className="absolute w-[280px] sm:w-[420px] h-[280px] sm:h-[420px] rounded-full bg-[#FF5C00]/20 blur-[100px] pointer-events-none"
            animate={{ scale: [0.8, 1.2, 0.95], opacity: [0.4, 0.8, 0.5] }}
            transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
          />

          {/* Clean Logo Container: Flame + Feed Food */}
          <div className="relative flex flex-col items-center justify-center space-y-3 sm:space-y-4">
            
            {/* Animated Flame Icon */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0, y: -25, rotate: -10 }}
              animate={{ 
                scale: [0.2, 1.2, 1], 
                opacity: 1, 
                y: 0,
                rotate: [-10, 5, 0]
              }}
              transition={{ 
                duration: 0.7, 
                ease: [0.34, 1.56, 0.64, 1] 
              }}
              className="relative"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.12, 1],
                  filter: [
                    'drop-shadow(0 0 20px rgba(255,92,0,0.85))',
                    'drop-shadow(0 0 40px rgba(255,140,0,1))',
                    'drop-shadow(0 0 20px rgba(255,92,0,0.85))'
                  ]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.1,
                  ease: 'easeInOut'
                }}
                className="text-6xl sm:text-8xl flex items-center justify-center select-none"
              >
                🔥
              </motion.div>
            </motion.div>

            {/* Animated Brand Name: Feed Food */}
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.55, ease: 'easeOut' }}
              className="text-center"
            >
              <h1 className="text-4xl sm:text-6xl font-black italic tracking-tight font-sans bg-gradient-to-r from-[#FF5C00] via-amber-400 to-[#FF8C00] bg-clip-text text-transparent drop-shadow-[0_4px_20px_rgba(255,92,0,0.45)]">
                Feed Food
              </h1>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
