'use client';

import { useContext, useState } from 'react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AuthContext } from '@/context/AuthContext';
import { ChevronDown, Compass, LogOut, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SidebarItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: SidebarItem[];
}

interface AppSidebarProps {
  items: SidebarItem[];
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  variant?: 'discovery' | 'transaction';
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

const roleLabels: Record<string, string> = {
  admin:   'Admin Workspace',
  guide:   'Guide Workspace',
  tourist: 'Traveler Workspace',
};

const profileHrefs: Record<string, string> = {
  admin:   '/admin/settings',
  guide:   '/guide/profile',
  tourist: '/user/profile',
};

/* Role-accent dot colours (small pill beside name) */
const roleAccentClass: Record<string, string> = {
  admin:   'bg-violet-400',
  guide:   'bg-emerald-400',
  tourist: 'bg-sky-400',
};

export function AppSidebar({
  items,
  user,
  isMobile = false,
  isOpen   = true,
  onClose,
  className,
}: AppSidebarProps) {
  const pathname       = usePathname();
  const auth           = useContext(AuthContext);
  const [expanded, setExpanded] = useState<string[]>([]);

  const role       = user?.role ?? 'tourist';
  const accentDot  = roleAccentClass[role] ?? roleAccentClass.tourist;

  const isActive = (href: string) =>
    href === pathname || (href !== '/' && pathname.startsWith(`${href}/`));

  const toggleExpanded = (href: string) =>
    setExpanded(prev =>
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    );

  /* ── Avatar initials fallback ── */
  const initials = (name?: string) =>
    (name ?? 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  /* ── Render a single nav item ── */
  const renderItem = (item: SidebarItem, level = 0) => {
    const active      = isActive(item.href);
    const hasChildren = (item.children?.length ?? 0) > 0;
    const isExpanded  = expanded.includes(item.href);
    const Icon        = item.icon;

    const baseClass = cn(
      'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
      level > 0 && 'ml-4'
    );

    if (hasChildren) {
      return (
        <div key={item.href}>
          <button
            type="button"
            onClick={() => toggleExpanded(item.href)}
            className={cn(
              baseClass,
              active
                ? 'bg-white/15 text-white'
                : 'text-white/65 hover:bg-white/10 hover:text-white'
            )}
          >
            <span className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-150',
              active ? 'bg-white/20' : 'group-hover:bg-white/10'
            )}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1 truncate text-left">{item.label}</span>
            {item.badge ? (
              <Badge variant="secondary" className="h-5 min-w-5 justify-center bg-white/20 text-white border-0 text-[10px]">
                {item.badge}
              </Badge>
            ) : null}
            <ChevronDown className={cn(
              'h-3.5 w-3.5 opacity-60 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )} />
          </button>

          {isExpanded && (
            <div className="mt-0.5 space-y-0.5 overflow-hidden">
              {item.children?.map(child => renderItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => { if (isMobile) onClose?.(); }}
        className={cn(
          baseClass,
          active
            ? /* white pill — StayFun active style */
              'bg-white text-[hsl(228_72%_12%)] shadow-[0_2px_8px_rgba(0,0,0,0.20)] font-semibold'
            : 'text-white/65 hover:bg-white/10 hover:text-white'
        )}
      >
        <span className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-150',
          active
            ? 'bg-[hsl(228_72%_12%)]/10'
            : 'group-hover:bg-white/10'
        )}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge ? (
          <Badge
            variant={active ? 'outline' : 'secondary'}
            className={cn(
              'h-5 min-w-5 justify-center text-[10px] border-0',
              active ? 'bg-[hsl(228_72%_12%)]/10 text-[hsl(228_72%_12%)]' : 'bg-white/20 text-white'
            )}
          >
            {item.badge}
          </Badge>
        ) : null}
      </Link>
    );
  };

  const sidebarContent = (
    <aside
      className={cn(
        'flex h-full w-64 flex-col',
        /* Sidebar always uses the --sidebar-background token which is dark green */
        'bg-sidebar text-sidebar-foreground',
        /* subtle right separator */
        'border-r border-sidebar-border',
        className
      )}
    >
      {/* ── Brand header ── */}
      <div className="px-5 py-5">
        <Link
          href={user ? (profileHrefs[user.role] ?? '/') : '/'}
          className="flex items-center gap-3 group"
        >
          {/* Logo mark */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 transition-all group-hover:bg-white/20">
            <Compass className="h-5 w-5 text-white" />
          </div>

          <div>
            <p className="text-base font-bold leading-tight tracking-tight text-white">
              Yatra
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
              {user ? (roleLabels[user.role] ?? 'Workspace') : 'Workspace'}
            </p>
          </div>
        </Link>
      </div>

      {/* ── Divider ── */}
      <div className="mx-5 h-px bg-white/10" />

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {/* Section label */}
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Navigation
        </p>
        {items.map(item => renderItem(item))}
      </nav>

      {/* ── User footer ── */}
      {user ? (
        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl ring-2 ring-white/20">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/20 text-xs font-bold text-white">
                  {initials(user.name)}
                </div>
              )}
              {/* Online dot */}
              <span className={cn(
                'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-sidebar',
                accentDot
              )} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white leading-tight">
                {user.name}
              </p>
              <p className="truncate text-[11px] text-white/45 leading-tight capitalize">
                {user.role === 'tourist' ? 'Traveler' : user.role}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <Link
                href={profileHrefs[user.role] ?? '/'}
                onClick={() => { if (isMobile) onClose?.(); }}
                title="My Profile"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <User className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                title="Logout"
                onClick={() => auth?.logout()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-red-500/20 hover:text-red-300"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );

  if (!isMobile) {
    return sidebarContent;
  }

  return isOpen ? (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-0 top-0 z-50 h-full animate-in slide-in-from-left-3 duration-200">
        {sidebarContent}
      </div>
    </>
  ) : null;
}
