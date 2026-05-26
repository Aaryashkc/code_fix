'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** 'flat' = standard card | 'elevated' = stronger shadow | 'hero' = coloured accent top border */
  variant?: 'flat' | 'elevated' | 'hero';
  /** Whether to animate in on mount */
  animated?: boolean;
  /** Lift card on hover */
  hover?: boolean;
}

/**
 * SurfaceCard — a clean, solid-background card that replaces the old
 * glassmorphism GlassCard. Drop-in compatible: exports as both
 * `GlassCard` (backwards compat) and `SurfaceCard`.
 */
const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>(
  (
    {
      children,
      className,
      variant = 'flat',
        animated = false,
      hover = true,
      ...props
    },
    ref
  ) => {
    const base =
      'relative overflow-hidden rounded-lg border border-border/80 bg-card transition-all duration-200';

    const variantStyles: Record<string, string> = {
      flat:     'shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
      elevated: 'shadow-[0_4px_12px_rgba(15,23,42,0.09)]',
      hero:     'shadow-[0_4px_12px_rgba(15,23,42,0.09)] border-t-2 border-t-primary',
    };

    const hoverStyles = hover
      ? 'hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,0.10)]'
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          base,
          variantStyles[variant],
          hoverStyles,
          animated && 'animate-in fade-in slide-in-from-bottom-2 duration-300',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SurfaceCard.displayName = 'SurfaceCard';

/** Backwards-compatible alias */
const GlassCard = SurfaceCard;

export { SurfaceCard, GlassCard };
export type { SurfaceCardProps as GlassCardProps };
