'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/ui/page-transition';

interface AppContentProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
  className?: string;
}

export function AppContent({
  children,
  maxWidth = '2xl',
  padding = true,
  className,
}: AppContentProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-[1280px]',
    full: 'max-w-full',
  };

  return (
    <main className="flex-1 overflow-y-auto bg-transparent">
      <PageTransition>
        <div
          className={cn(
            'yatra-container mx-auto',
            maxWidthClasses[maxWidth],
            padding ? 'p-4 pb-24 lg:p-6 lg:pb-8' : '',
            className
          )}
        >
          {children}
        </div>
      </PageTransition>
    </main>
  );
}
