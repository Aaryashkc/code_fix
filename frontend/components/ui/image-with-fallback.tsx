'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  containerClassName?: string;
  fallbackClassName?: string;
  priority?: boolean;
  sizes?: string;
}

const categoryGradients: Record<string, string> = {
  Adventure: 'from-emerald-600/80 to-teal-800/80',
  Nature: 'from-green-600/80 to-emerald-800/80',
  Religious: 'from-amber-600/80 to-orange-800/80',
  Cultural: 'from-purple-600/80 to-pink-800/80',
  Urban: 'from-blue-600/80 to-indigo-800/80',
  default: 'from-slate-600/80 to-slate-800/80',
};

export function ImageWithFallback({
  src,
  alt,
  fill = false,
  width,
  height,
  className,
  containerClassName,
  fallbackClassName,
  priority = false,
  sizes,
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Determine gradient based on alt text or category hints
  const getGradient = () => {
    const altLower = alt.toLowerCase();
    for (const [category, gradient] of Object.entries(categoryGradients)) {
      if (altLower.includes(category.toLowerCase())) {
        return gradient;
      }
    }
    return categoryGradients.default;
  };

  const showFallback = error || !src || src === '/placeholder.svg';

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      {/* Loading skeleton */}
      {loading && !showFallback && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted animate-pulse" />
      )}
      
      {/* Actual image */}
      {!showFallback && (
        <Image
          src={src}
          alt={alt}
          fill={fill}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          className={cn(
            'object-cover transition-all duration-500',
            loading ? 'opacity-0 scale-105' : 'opacity-100 scale-100',
            className
          )}
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
          priority={priority}
          sizes={sizes}
        />
      )}
      
      {/* Fallback gradient background */}
      {showFallback && (
        <div 
          className={cn(
            'absolute inset-0 bg-gradient-to-br flex items-center justify-center',
            getGradient(),
            fallbackClassName
          )}
        >
          <div className="text-center p-4">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-white/60" />
            <p className="text-white/80 text-sm font-medium line-clamp-2">
              {alt}
            </p>
          </div>
        </div>
      )}
      
      {/* Gradient overlay for better text readability on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
}

// Shimmer loading placeholder
export function ImageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      <div className="absolute inset-0 shimmer" />
    </div>
  );
}
