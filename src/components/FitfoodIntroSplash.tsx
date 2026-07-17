import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface FitfoodIntroSplashProps {
  onComplete?: () => void;
  appName?: string;
  designSettings?: any;
}

export const FitfoodIntroSplash: React.FC<FitfoodIntroSplashProps> = ({
  onComplete,
  appName = "Fitfood",
  designSettings
}) => {
  const [isExiting, setIsExiting] = useState(false);

  const durationSeconds = designSettings?.splashDuration ? parseFloat(designSettings.splashDuration) : 2.8;
  const glowColor1 = designSettings?.splashGlowColor1 || '#FF5C00';
  const glowColor2 = designSettings?.splashGlowColor2 || '#10B981';
  const splashTitle = designSettings?.splashTitle || designSettings?.appName || appName;
  const splashSubtitle = designSettings?.splashSubtitle || "Virtual Photo Studio & Gourmet Hub";
  const splashLogoUrl = designSettings?.splashLogoUrl || '';
  const splashCustomText = designSettings?.splashCustomText || "Chargement de la galerie vidéo...";

  useEffect(() => {
    // Auto-complete splash after configured duration
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, Math.max(500, durationSeconds * 1000 - 200));

    return () => clearTimeout(timer);
  }, [durationSeconds]);

  const handleAnimationComplete = () => {
    if (isExiting && onComplete) {
      onComplete();
    }
  };

  // Helper to split title for styling
  const renderTitle = () => {
    if (!splashTitle) return null;
    if (splashTitle.toLowerCase() === 'fitfood') {
      return (
        <>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-400">Fit</span>
          <span style={{ color: glowColor1, filter: `drop-shadow(0 0 15px ${glowColor1}66)` }}>food</span>
        </>
      );
    }
    return (
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-400">
        {splashTitle}
      </span>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {!isExiting && (
        <motion.div
          id="fitfood-splash-container"
          className="fixed inset-0 z-[9999] bg-[#050506] flex flex-col items-center justify-center overflow-hidden select-none px-4"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            y: -50,
            transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } 
          }}
          onAnimationComplete={handleAnimationComplete}
        >
          {/* Subtle Ambient Background Glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full opacity-10 blur-[80px] sm:blur-[100px]"
              style={{ backgroundColor: glowColor1 }}
              initial={{ scale: 0.6 }}
              animate={{ scale: [0.6, 1.2, 0.9] }}
              transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
            />
            <motion.div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] sm:w-[350px] h-[220px] sm:h-[350px] rounded-full opacity-15 blur-[60px] sm:blur-[80px]"
              style={{ backgroundColor: glowColor2 }}
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 0.5, 1.1] }}
              transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
            />
          </div>

          {/* Interactive Studio Framing Lines */}
          <div className="absolute inset-6 sm:inset-10 border border-white/[0.02] rounded-3xl pointer-events-none flex flex-col justify-between p-4 sm:p-6">
            <div className="flex justify-between text-[8px] sm:text-[10px] font-mono tracking-wider text-zinc-500 uppercase">
              <span>Studio Mode v3.5</span>
              <span>100% Mobile Responsive</span>
            </div>
            <div className="flex justify-between text-[8px] sm:text-[10px] font-mono tracking-wider text-zinc-500 uppercase">
              <span>Fitfood Premium UI</span>
              <span>System Ready</span>
            </div>
          </div>

          {/* Core Animated Logo Block */}
          <div className="relative z-10 flex flex-col items-center text-center px-2 max-w-xs sm:max-w-md">
            {/* Animated Logo Symbol */}
            <motion.div
              className="relative w-20 h-20 sm:w-28 sm:h-28 mb-6 sm:mb-8 flex items-center justify-center"
              initial={{ scale: 0.3, opacity: 0, rotate: -45 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ 
                duration: 1.2, 
                ease: [0.34, 1.56, 0.64, 1],
                delay: 0.2
              }}
            >
              {/* Spinning outer physical rings */}
              <motion.div 
                className="absolute inset-0 border border-emerald-500/30 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              />
              <motion.div 
                className="absolute inset-2 border-2 border-dashed border-[#FF5C00]/40 rounded-full"
                animate={{ rotate: -360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              />

              {/* Glowing backplate */}
              <motion.div 
                className="absolute inset-4 rounded-full bg-gradient-to-tr from-[#FF5C00] to-emerald-500 opacity-20 blur-xl"
                animate={{ opacity: [0.1, 0.4, 0.1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* The Central Icon Container */}
              <div className="relative w-12 h-12 sm:w-16 sm:h-16 bg-[#0F0F11] border border-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden group">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-tr from-[#FF5C00]/10 to-emerald-500/10"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {splashLogoUrl ? (
                  <img 
                    src={splashLogoUrl} 
                    alt="Logo Splash" 
                    className="w-full h-full object-cover relative z-10" 
                    onError={(e) => {
                      (e.target as any).style.display = 'none';
                    }}
                  />
                ) : (
                  /* Custom Elegant SVG Icon of Fitfood */
                  <svg className="w-6 h-6 sm:w-9 sm:h-9 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    {/* Left dumbbell weight */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" stroke="url(#logoGrad)" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8v8M3 9v6" stroke="#10B981" />
                    {/* Right dumbbell weight */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 8v8M21 9v6" stroke="#10B981" />
                    {/* Salad / healthy leaf elements intersecting the bar */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4c2.5 0 4 2 4 4s-1.5 4-4 4-4-2-4-4 1.5-4 4-4z" stroke="url(#logoGrad)" fill="url(#logoGrad)" fillOpacity="0.15" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12c-2.5 0-4 2-4 4s1.5 4 4 4 4-2 4-4-1.5-4-4-4z" stroke="#10B981" fill="#10B981" fillOpacity="0.15" />
                    
                    <defs>
                      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FF5C00" />
                        <stop offset="100%" stopColor="#FF8A00" />
                      </linearGradient>
                    </defs>
                  </svg>
                )}
              </div>
            </motion.div>

            {/* Site Title / Branding Text */}
            <motion.h1
              className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white uppercase italic font-sans flex items-center justify-center gap-1.5 flex-wrap"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {renderTitle()}
            </motion.h1>

            {/* Premium Subtitle */}
            <motion.p
              className="mt-2.5 sm:mt-3 text-[10px] sm:text-xs md:text-sm text-zinc-500 font-mono uppercase tracking-[0.15em] sm:tracking-[0.3em] font-medium leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
            >
              {splashSubtitle}
            </motion.p>

            {/* Sleek Line Accent */}
            <motion.div
              className="w-10 sm:w-12 h-0.5 sm:h-1 bg-gradient-to-r from-emerald-500 to-[#FF5C00] rounded-full mt-5 sm:mt-6"
              initial={{ width: 0 }}
              animate={{ width: 48 }}
              transition={{ duration: 1, delay: 1.1 }}
            />
          </div>

          {/* Micro Footer Indicator */}
          <motion.div
            className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] font-mono tracking-wider text-zinc-600 uppercase flex items-center gap-2 px-4 text-center justify-center max-w-[85vw]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 1.3 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">{splashCustomText}</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
