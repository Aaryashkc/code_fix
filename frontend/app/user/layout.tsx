'use client';

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppContent } from '@/components/layout/AppContent';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { ErrorBoundary } from '@/components/error-boundary';
import { UserPortalSkeleton } from '@/components/ui/skeleton-cards';
import { Calendar, Heart, LayoutDashboard, LocateFixed, MapPin, Route, User } from 'lucide-react';

const userNavItems = [
  { href: '/user/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/user/explore', label: 'Explore', icon: MapPin },
  { href: '/user/trips', label: 'Trips', icon: Route },
  { href: '/user/active-trip', label: 'Active Trip', icon: LocateFixed },
  { href: '/user/bookings', label: 'Bookings', icon: Calendar },
  { href: '/user/wishlist', label: 'Saved', icon: Heart },
  { href: '/user/profile', label: 'Profile', icon: User },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext);
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isPaymentCallbackRoute = pathname === '/user/bookings/payment-success' ||
    pathname === '/user/bookings/payment-failure';

  useEffect(() => {
    if (auth?.isLoading) return;

    if (isPaymentCallbackRoute) {
      return;
    }

    if (!auth?.user) {
      router.replace('/');
      return;
    }

    if (auth.user.role !== 'tourist') {
      if (auth.user.role === 'admin') router.replace('/admin/dashboard');
      else if (auth.user.role === 'guide') router.replace('/guide/dashboard');
      else router.replace('/');
    }
  }, [auth?.isLoading, auth?.user, isPaymentCallbackRoute, router]);

  const getPageTitle = () => {
    const item = userNavItems.find((nav) => nav.href === pathname || pathname.startsWith(`${nav.href}/`));
    return item?.label ?? 'Dashboard';
  };

  const getPageSubtitle = () => {
    switch (pathname) {
      case '/user/dashboard':
        return 'Your trip status and next actions';
      case '/user/explore':
        return 'Discover places across Nepal';
      case '/user/trips':
        return 'Build and organize your plans';
      case '/user/bookings':
        return 'Track requests and confirmations';
      case '/user/active-trip':
        return 'Share live location and trigger SOS';
      case '/user/wishlist':
        return 'Saved places for later';
      case '/user/profile':
        return 'Manage your traveler profile';
      default:
        return '';
    }
  };

  if (isPaymentCallbackRoute) {
    return <>{children}</>;
  }

  if (auth?.isLoading) return <UserPortalSkeleton />;
  if (!auth?.user || auth.user.role !== 'tourist') return null;

  return (
    <AppShell>
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="hidden lg:flex">
          <AppSidebar
            items={userNavItems}
            user={{
              name: auth.user.name,
              email: auth.user.email,
              avatar: auth.user.avatar,
              role: 'tourist',
            }}
          />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader
            title={getPageTitle()}
            subtitle={getPageSubtitle()}
            showBack={pathname !== '/user/dashboard'}
            showSearch={false}
            showNotifications={true}
            showUserMenu={true}
            showMobileMenu={true}
            onBackClick={() => router.back()}
            onMobileMenuClick={() => setSidebarOpen(true)}
          />

          <AppContent maxWidth="full">
            <ErrorBoundary>{children}</ErrorBoundary>
          </AppContent>
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      <AppSidebar
        items={userNavItems}
        user={{
          name: auth.user.name,
          email: auth.user.email,
          avatar: auth.user.avatar,
          role: 'tourist',
        }}
        isMobile={true}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar userRole="tourist" />
    </AppShell>
  );
}
