'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
  variant?: 'discovery' | 'transaction';
  className?: string;
}

export function AppShell({ children, variant = 'discovery', className }: AppShellProps) {
  return (
    <div
      className={cn(
        'yatra-app-frame min-h-screen bg-background text-foreground',
        variant === 'transaction' ? 'yatra-transaction-mode' : 'yatra-discovery-mode',
        className
      )}
    >
      {children}
    </div>
  );
}
