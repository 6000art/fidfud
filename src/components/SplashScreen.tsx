import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence onExitComplete={onFinish}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[99999] bg-[#050506] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden"
        >
          {/* Subtle Ambient Background Glow */}
          <div className="absolute w-[350px] h-[350px] bg-[#FF5C00]/25 rounded-full blur-[120px] pointer-events-none animate-pulse" />

          {/* Centered Logo Container */}
          <div className="relative flex flex-col items-center justify-center space-y-4">
            
            {/* Animated Flame */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0, y: -20 }}
              animate={{ 
                scale: [0.2, 1.25, 1], 
                opacity: 1, 
                y: 0,
              }}
              transition={{ 
                duration: 0.7, 
                ease: [0.34, 1.56, 0.64, 1] 
              }}
              className="relative"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.15, 1],
                  filter: [
                    'drop-shadow(0 0 25px rgba(255,92,0,0.85))',
                    'drop-shadow(0 0 45px rgba(255,140,0,1))',
                    'drop-shadow(0 0 25px rgba(255,92,0,0.85))'
                  ]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.1,
                  ease: 'easeInOut'
                }}
                className="text-6xl sm:text-8xl flex items-center justify-center"
              >
                🔥
              </motion.div>
            </motion.div>

            {/* Animated Brand Name: Feed Food */}
            <motion.div
              initial={{ y: 25, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.6, ease: 'easeOut' }}
              className="text-center"
            >
              <h1 className="text-4xl sm:text-6xl font-black italic tracking-tight font-sans bg-gradient-to-r from-[#FF5C00] via-amber-400 to-[#FF8C00] bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(255,92,0,0.4)]">
                Feed Food
              </h1>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
