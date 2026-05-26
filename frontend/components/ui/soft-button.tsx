'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const softButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 
          'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md',
        secondary: 
          'bg-secondary text-secondary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0',
        outline: 
          'border-2 border-primary/30 bg-transparent text-primary hover:bg-primary/5 hover:border-primary/50 active:bg-primary/10',
        ghost: 
          'hover:bg-primary/5 text-primary hover:text-primary',
        soft: 
          'bg-gradient-to-br from-white/80 to-white/60 text-foreground border border-white/40 shadow-lg backdrop-blur-sm hover:shadow-xl hover:from-white/90 hover:to-white/70 dark:from-white/10 dark:to-white/5 dark:text-white dark:border-white/20',
        glow: 
          'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(13,124,102,0.4)] hover:shadow-[0_0_30px_rgba(13,124,102,0.5)] hover:-translate-y-0.5 active:translate-y-0',
      },
      size: {
        default: 'h-11 px-6 py-2 text-sm',
        sm: 'h-9 px-4 py-1.5 text-xs',
        lg: 'h-13 px-8 py-3 text-base',
        icon: 'h-11 w-11 p-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface SoftButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof softButtonVariants> {
  animated?: boolean;
}

const SoftButton = React.forwardRef<HTMLButtonElement, SoftButtonProps>(
  ({ className, variant, size, animated = true, children, ...props }, ref) => {
    const button = (
      <button
        ref={ref}
        className={cn(softButtonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </button>
    );

    return animated ? <span className="inline-flex transition-transform active:scale-[0.98]">{button}</span> : button;
  }
);

SoftButton.displayName = 'SoftButton';

export { SoftButton, softButtonVariants };
export type { SoftButtonProps };
