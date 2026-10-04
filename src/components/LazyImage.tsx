import React, { useState, useEffect, useRef } from 'react';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
  containerClassName?: string;
  sizeType?: 'avatar' | 'thumbnail' | 'card' | 'banner' | 'full';
  placeholderEmoji?: string;
  priority?: boolean;
  rootMargin?: string;
  aspectRatio?: string;
  onImageLoad?: () => void;
  onImageError?: () => void;
}

/**
 * Optimizes external image URLs (e.g. Unsplash) for mobile bandwidth
 * by overriding dimensions and compression quality.
 */
export function getOptimizedImageUrl(
  url?: string,
  sizeType: 'avatar' | 'thumbnail' | 'card' | 'banner' | 'full' = 'card'
): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // Unsplash URL optimization
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      let targetWidth = 400;
      let targetQuality = 65;

      switch (sizeType) {
        case 'avatar':
          targetWidth = 120;
          targetQuality = 50;
          break;
        case 'thumbnail':
          targetWidth = 240;
          targetQuality = 60;
          break;
        case 'card':
          targetWidth = 480;
          targetQuality = 65;
          break;
        case 'banner':
        case 'full':
          targetWidth = 800;
          targetQuality = 70;
          break;
      }

      parsed.searchParams.set('w', targetWidth.toString());
      parsed.searchParams.set('q', targetQuality.toString());
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      return parsed.toString();
    } catch {
      return url;
    }
  }

  return url;
}

export default function LazyImage({
  src,
  alt = 'Image',
  fallbackSrc = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=50',
  className = '',
  containerClassName = '',
  sizeType = 'card',
  placeholderEmoji,
  priority = false,
  rootMargin = '150px 0px',
  aspectRatio,
  onImageLoad,
  onImageError,
  style,
  referrerPolicy = 'no-referrer',
  ...restProps
}: LazyImageProps) {
  const [isVisible, setIsVisible] = useState<boolean>(priority);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Aggressive IntersectionObserver lazy loading
  useEffect(() => {
    if (priority || isVisible) return;

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (containerRef.current) {
              observer.unobserve(containerRef.current);
            }
          }
        });
      },
      {
        rootMargin, // Load slightly before coming into viewport
        threshold: 0.01
      }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [priority, isVisible, rootMargin]);

  const optimizedSrc = getOptimizedImageUrl(src, sizeType);
  const optimizedFallback = getOptimizedImageUrl(fallbackSrc, sizeType);

  const rawSrc = (hasError || !optimizedSrc) ? optimizedFallback : optimizedSrc;
  const finalSrc = rawSrc && rawSrc.trim() ? rawSrc.trim() : undefined;

  const handleLoad = () => {
    setIsLoaded(true);
    if (onImageLoad) onImageLoad();
  };

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
    }
    if (onImageError) onImageError();
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${containerClassName}`}
      style={{ aspectRatio, ...style }}
    >
      {/* Skeleton / Placeholder overlay */}
      {(!isLoaded || !isVisible) && (
        <div className="absolute inset-0 bg-zinc-900/80 animate-pulse flex items-center justify-center border border-white/5 z-0">
          {placeholderEmoji ? (
            <span className="text-sm opacity-60">{placeholderEmoji}</span>
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 bg-[length:200%_100%] animate-shimmer" />
          )}
        </div>
      )}

      {/* Actual Image Tag */}
      {isVisible && finalSrc && (
        <img
          src={finalSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'low'}
          referrerPolicy={referrerPolicy}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          {...restProps}
        />
      )}
    </div>
  );
}
