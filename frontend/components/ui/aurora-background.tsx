'use client';

import { cn } from '@/lib/utils';

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  showRadialGradient?: boolean;
}

const floatingParticles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: (i * 37) % 100,
  top: (i * 53 + 17) % 100,
  duration: 15 + ((i * 7) % 20),
  delay: (i * 3) % 10,
}));

export function AuroraBackground({
  children,
  className,
  showRadialGradient = true,
}: AuroraBackgroundProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Aurora gradient layers */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Layer 1: Emerald flow */}
        <div 
          className="absolute -top-[40%] -left-[20%] w-[140%] h-[140%] opacity-50"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(13, 124, 102, 0.4) 0%, transparent 60%)',
            animation: 'aurora-flow-1 25s ease-in-out infinite',
          }}
        />
        
        {/* Layer 2: Amber/Gold flow */}
        <div 
          className="absolute -top-[30%] -right-[20%] w-[140%] h-[140%] opacity-40"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.35) 0%, transparent 60%)',
            animation: 'aurora-flow-2 20s ease-in-out infinite',
          }}
        />
        
        {/* Layer 3: Sunset pink */}
        <div 
          className="absolute top-[20%] -left-[30%] w-[160%] h-[160%] opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(220, 20, 60, 0.25) 0%, transparent 50%)',
            animation: 'aurora-flow-3 30s ease-in-out infinite',
          }}
        />
        
        {/* Layer 4: Cyan accent */}
        <div 
          className="absolute top-[40%] right-[10%] w-[100%] h-[100%] opacity-25"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.3) 0%, transparent 50%)',
            animation: 'aurora-flow-4 22s ease-in-out infinite',
          }}
        />

        {/* Radial overlay for depth */}
        {showRadialGradient && (
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, transparent 0%, rgba(15, 23, 42, 0.8) 70%)',
            }}
          />
        )}
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingParticles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 rounded-full bg-white/20"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animation: `float-particle ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Simpler version for cards
export function AuroraGlow({ 
  className,
  color = 'emerald',
}: { 
  className?: string;
  color?: 'emerald' | 'amber' | 'sunset' | 'cyan';
}) {
  const colorMap = {
    emerald: 'rgba(13, 124, 102, 0.3)',
    amber: 'rgba(245, 158, 11, 0.3)',
    sunset: 'rgba(220, 20, 60, 0.25)',
    cyan: 'rgba(6, 182, 212, 0.25)',
  };

  return (
    <div 
      className={cn("absolute inset-0 -z-10 blur-3xl opacity-50", className)}
      style={{
        background: `radial-gradient(ellipse at center, ${colorMap[color]} 0%, transparent 70%)`,
      }}
    />
  );
}
