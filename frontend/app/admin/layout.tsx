'use client';

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppContent } from '@/components/layout/AppContent';
import { ErrorBoundary } from '@/components/error-boundary';
import { AdminPortalSkeleton } from '@/components/ui/skeleton-cards';
import { Button } from '@/components/ui/button';
import { BarChart3, BookOpen, LayoutDashboard, LocateFixed, MapPin, Settings, Shield, Users, Percent, Banknote } from 'lucide-react';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/guides', label: 'Guides', icon: Users },
  { href: '/admin/places', label: 'Places', icon: MapPin },
  { href: '/admin/map', label: 'Live Map', icon: LocateFixed },
  { href: '/admin/bookings', label: 'Bookings', icon: BookOpen },
  { href: '/admin/commissions', label: 'Commissions', icon: Percent },
  { href: '/admin/payouts', label: 'Payouts', icon: Banknote },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext);
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (auth?.isLoading) return;
    if (!auth?.user) {
      router.replace('/');
      return;
    }
    if (auth.user.role !== 'admin') {
      router.replace('/unauthorized');
    }
  }, [auth?.isLoading, auth?.user, router]);

  const getPageTitle = () => {
    const currentItem = adminNavItems.find((item) => item.href === pathname || pathname.startsWith(`${item.href}/`));
    return currentItem?.label ?? 'Dashboard';
  };

  const getPageSubtitle = () => {
    switch (pathname) {
      case '/admin/dashboard':
        return 'Platform health and action queues';
      case '/admin/analytics':
        return 'Performance and trend insights';
      case '/admin/guides':
        return 'Guide approvals and management';
      case '/admin/places':
        return 'Place verification and quality checks';
      case '/admin/bookings':
        return 'Booking monitoring and intervention';
      case '/admin/commissions':
        return 'Track platform commissions and guide earnings';
      case '/admin/payouts':
        return 'Manage and process payments to guides';
      case '/admin/map':
        return 'Live sessions, SOS alerts, and place coverage';
      case '/admin/settings':
        return 'Administration settings';
    }
  };

  if (auth?.isLoading) {
    return <AdminPortalSkeleton />;
  }

  if (!auth?.user) {
    return null;
  }

  if (auth.user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">Access Denied</h2>
          <p className="mb-4 text-muted-foreground">You do not have permission to access this area.</p>
          <Button onClick={() => router.push('/')}>Return to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <AppShell variant="transaction">
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="hidden lg:flex">
          <AppSidebar
            items={adminNavItems}
            user={{
              name: auth.user.name,
              email: auth.user.email,
              avatar: auth.user.avatar,
              role: 'admin',
            }}
            variant="transaction"
          />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader
            title={getPageTitle()}
            subtitle={getPageSubtitle()}
            showBack={pathname !== '/admin/dashboard'}
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

      <AppSidebar
        items={adminNavItems}
        user={{
          name: auth.user.name,
          email: auth.user.email,
          avatar: auth.user.avatar,
          role: 'admin',
        }}
        variant="transaction"
        isMobile={true}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </AppShell>
  );
}
