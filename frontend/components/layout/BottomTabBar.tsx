'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Calendar,
  LocateFixed,
  User,
  MapPin,
  Compass,
  LayoutDashboard,
  Users,
} from 'lucide-react';

interface BottomTabBarProps {
  userRole: 'tourist' | 'guide' | 'admin';
}

const touristTabs = [
  { href: '/user/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/user/explore', label: 'Explore', icon: Compass },
  { href: '/user/guides', label: 'Guides', icon: Users },
  { href: '/user/bookings', label: 'Bookings', icon: Calendar },
  { href: '/user/active-trip', label: 'Active', icon: LocateFixed },
];

const guideTabs = [
  { href: '/guide/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/guide/places', label: 'Places', icon: MapPin },
  { href: '/guide/live', label: 'Live', icon: LocateFixed },
  { href: '/guide/bookings', label: 'Bookings', icon: Calendar },
  { href: '/guide/profile', label: 'Profile', icon: User },
];

export function BottomTabBar({ userRole }: BottomTabBarProps) {
  const pathname = usePathname();
  const tabs = userRole === 'guide' ? guideTabs : touristTabs;

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex lg:hidden',
        'bg-background/95 backdrop-blur-xl',
        'border-t border-border/60',
        'shadow-[0_-4px_16px_rgba(0,0,0,0.06)]',
        'pb-[env(safe-area-inset-bottom,0px)]'
      )}
      aria-label="Mobile navigation"
    >
      {tabs.map((tab) => {
        const Icon   = tab.icon;
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/');

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center py-2.5 gap-0.5',
              'transition-all duration-200',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {/* Active top bar */}
            {active && (
              <span className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-primary" />
            )}

            {/* Icon container */}
            <span
              className={cn(
                'flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200',
                active ? 'bg-primary/12 scale-110' : 'bg-transparent'
              )}
            >
              <Icon className={cn('h-[18px] w-[18px] transition-all duration-200', active && 'stroke-[2.2]')} />
            </span>

            <span className={cn(
              'text-[10px] font-medium transition-all duration-200',
              active && 'font-semibold text-primary'
            )}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
