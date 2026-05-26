'use client';

import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { NotificationContext } from '@/context/NotificationContext';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppContent } from '@/components/layout/AppContent';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { ErrorBoundary } from '@/components/error-boundary';
import { GuidePortalSkeleton } from '@/components/ui/skeleton-cards';
import { Switch } from '@/components/ui/switch';
import {
  BookOpen,
  Calendar,
  LayoutDashboard,
  LocateFixed,
  MapPin,
  Star,
  User,
  Wallet,
  Wifi,
  WifiOff,
} from 'lucide-react';

const guideNavItems = [
  { href: '/guide/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/guide/bookings',    label: 'Bookings',     icon: BookOpen },
  { href: '/guide/live',        label: 'Live Trips',   icon: LocateFixed },
  { href: '/guide/earnings',    label: 'Earnings',     icon: Wallet },
  { href: '/guide/reviews',     label: 'Reviews',      icon: Star },
  { href: '/guide/availability',label: 'Availability', icon: Calendar },
  { href: '/guide/places',      label: 'My Places',    icon: MapPin },
  { href: '/guide/profile',     label: 'Profile',      icon: User },
];

const pageMeta: Record<string, string> = {
  '/guide/dashboard':    'Requests, earnings, and profile health',
  '/guide/bookings':     'Manage incoming and active trips',
  '/guide/live':         'Monitor traveller location and SOS alerts',
  '/guide/earnings':     'Commission breakdown and payout requests',
  '/guide/reviews':      'What travellers say about you',
  '/guide/availability': 'Control when travellers can book you',
  '/guide/places':       'Destinations you currently cover',
  '/guide/profile':      'Public profile and pricing details',
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  const auth    = useContext(AuthContext);
  const notifCtx = useContext(NotificationContext);
  const router   = useRouter();
  const pathname = usePathname();

  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [isOnline,        setIsOnline]        = useState(false);
  const [togglingOnline,  setTogglingOnline]  = useState(false);

  useEffect(() => {
    if (!auth?.isLoading && (!auth?.user || auth.user.role !== 'guide')) {
      router.push('/login');
    }
  }, [auth, router]);

  useEffect(() => {
    if (auth?.user?.role === 'guide') setIsOnline(Boolean(auth.user.available));
  }, [auth?.user]);

  const handleToggleOnline = useCallback(async () => {
    if (togglingOnline) return;
    setTogglingOnline(true);
    const next = !isOnline;
    setIsOnline(next);
    try {
      await api.put('/guides/me/availability', { available: next });
      notifCtx?.socket?.emit('guide:toggle-online', { online: next });
    } catch {
      setIsOnline(!next);
    } finally {
      setTogglingOnline(false);
    }
  }, [isOnline, togglingOnline, notifCtx?.socket]);

  const pageTitle = () =>
    guideNavItems.find(
      (n) => n.href === pathname || pathname.startsWith(`${n.href}/`)
    )?.label ?? 'Dashboard';

  if (auth?.isLoading || !auth?.user || auth.user.role !== 'guide') {
    return <GuidePortalSkeleton />;
  }

  const onlineToggle = (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-1.5 backdrop-blur-sm">
      {isOnline
        ? <Wifi    className="h-4 w-4 text-primary" />
        : <WifiOff className="h-4 w-4 text-muted-foreground" />}
      <span className={`hidden text-xs font-semibold sm:inline ${isOnline ? 'text-primary' : 'text-muted-foreground'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
      <Switch
        checked={isOnline}
        onCheckedChange={handleToggleOnline}
        disabled={togglingOnline}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );

  const sidebarUser = {
    name:   auth.user.name,
    email:  auth.user.email,
    avatar: auth.user.avatar,
    role:   'guide' as const,
  };

  return (
    <AppShell>
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="hidden lg:flex">
          <AppSidebar items={guideNavItems} user={sidebarUser} />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader
            title={pageTitle()}
            subtitle={pageMeta[pathname] ?? ''}
            showBack={pathname !== '/guide/dashboard'}
            showSearch={false}
            showNotifications={true}
            showUserMenu={true}
            showMobileMenu={true}
            onBackClick={() => router.back()}
            onMobileMenuClick={() => setSidebarOpen(true)}
            actions={onlineToggle}
          />
          <AppContent maxWidth="full">
            <ErrorBoundary>{children}</ErrorBoundary>
          </AppContent>
        </div>
      </div>

      <AppSidebar
        items={guideNavItems}
        user={sidebarUser}
        isMobile={true}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <BottomTabBar userRole="guide" />
    </AppShell>
  );
}
