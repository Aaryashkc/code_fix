'use client';

import { ReactNode, useContext } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AuthContext } from '@/context/AuthContext';
import { NotificationContext } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Bell,
  Check,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
} from 'lucide-react';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  showBack?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  showUserMenu?: boolean;
  showMobileMenu?: boolean;
  className?: string;
  onBackClick?: () => void;
  onMobileMenuClick?: () => void;
}

const profileHrefs: Record<string, string> = {
  admin:   '/admin/settings',
  guide:   '/guide/profile',
  tourist: '/user/profile',
};

/* Avatar initials fallback */
const initials = (name?: string) =>
  (name ?? 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

export function AppHeader({
  title,
  subtitle,
  actions,
  showBack          = false,
  showSearch        = false,
  showNotifications = true,
  showUserMenu      = true,
  showMobileMenu    = true,
  className,
  onBackClick,
  onMobileMenuClick,
}: AppHeaderProps) {
  const router    = useRouter();
  const auth      = useContext(AuthContext);
  const notifCtx  = useContext(NotificationContext);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 h-16 w-full',
        'border-b border-border/60',
        'bg-background/90 backdrop-blur-xl',
        'shadow-[0_1px_0_hsl(var(--border)/0.6)]',
        '[env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)]',
        className
      )}
    >
      <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">

        {/* ── Left: hamburger + title ── */}
        <div className="flex min-w-0 items-center gap-2">
          {showMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary"
              onClick={onMobileMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary"
              onClick={onBackClick ?? (() => router.back())}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          {(title || subtitle) && (
            <div className="min-w-0">
              {title && (
                <h2 className="truncate text-sm font-semibold text-foreground leading-tight">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="truncate text-[11px] text-muted-foreground leading-tight">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Centre: search bar ── */}
        {showSearch ? (
          <div className="hidden max-w-xs flex-1 md:flex">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="search"
                placeholder="Search…"
                className={cn(
                  'h-9 w-full rounded-xl border border-border/60 bg-muted/40 pl-9 pr-3 text-sm',
                  'outline-none transition-all duration-200',
                  'placeholder:text-muted-foreground/50',
                  'focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary/40'
                )}
              />
            </div>
          </div>
        ) : (
          <div className="hidden md:block" />
        )}

        {/* ── Right: actions + notifications + theme + avatar ── */}
        <div className="flex items-center gap-1">
          {actions}

          {/* Notifications */}
          {showNotifications && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary"
                >
                  <Bell className="h-4 w-4" />
                  {notifCtx && notifCtx.unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 rounded-xl border border-border/70 shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">Notifications</p>
                    {notifCtx && notifCtx.unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="h-5 min-w-5 justify-center text-[10px] rounded-full"
                      >
                        {notifCtx.unreadCount}
                      </Badge>
                    )}
                  </div>
                  {notifCtx && notifCtx.unreadCount > 0 && (
                    <button
                      onClick={() => notifCtx.markAllAsRead()}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Check className="h-3 w-3" />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifCtx && notifCtx.notifications.length > 0 ? (
                    notifCtx.notifications.slice(0, 10).map(notif => (
                      <DropdownMenuItem
                        key={notif._id}
                        className={cn(
                          'cursor-pointer flex flex-col items-start gap-0.5 px-4 py-3',
                          !notif.read && 'bg-primary/5'
                        )}
                        onClick={() => {
                          if (!notif.read) notifCtx.markAsRead(notif._id);
                          if (notif.data?.bookingId) {
                            const role = auth?.user?.role;
                            router.push(role === 'guide' ? '/guide/bookings' : '/user/bookings');
                          }
                        }}
                      >
                        {!notif.read && (
                          <span className="mb-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                        <span className="text-sm font-medium">{notif.title}</span>
                        <span className="line-clamp-1 text-xs text-muted-foreground">{notif.message}</span>
                        <span className="text-xs text-muted-foreground/60">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      <Bell className="mx-auto mb-2 h-7 w-7 opacity-20" />
                      No notifications yet
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <ThemeToggle />

          {/* User menu */}
          {showUserMenu && auth?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-2 py-1.5',
                    'transition-colors hover:bg-muted/60',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
                  )}
                >
                  {/* Avatar */}
                  <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-border/60 bg-muted shrink-0">
                    {auth.user.avatar ? (
                      <Image
                        src={auth.user.avatar}
                        alt={auth.user.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/15 text-[10px] font-bold text-primary">
                        {initials(auth.user.name)}
                      </div>
                    )}
                  </div>
                  <div className="hidden max-w-[120px] text-left md:block">
                    <p className="truncate text-xs font-semibold leading-tight">
                      {auth.user.name}
                    </p>
                    <p className="truncate text-[10px] capitalize text-primary leading-tight font-medium">
                      {auth.user.role === 'tourist' ? 'Traveler' : auth.user.role}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl border border-border/70 shadow-xl"
              >
                <div className="border-b border-border/50 px-4 py-3">
                  <p className="text-sm font-semibold">{auth.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{auth.user.email}</p>
                </div>
                <DropdownMenuItem asChild>
                  <Link
                    href={profileHrefs[auth.user.role] ?? '/'}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                {auth.user.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/admin/settings"
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:bg-destructive/5 focus:text-destructive"
                  onClick={() => auth.logout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
