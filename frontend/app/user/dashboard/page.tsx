'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/context/AuthContext';
import { cachedGet } from '@/lib/api';
import { formatNPR } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPortalSkeleton } from '@/components/ui/skeleton-cards';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock3,
  Heart,
  RefreshCw,
  Route,
  Wallet,
  TrendingUp,
  MapPin,
  Sparkles,
  Utensils,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Booking {
  _id: string;
  status: string;
  startDate?: string;
  endDate?: string;
  totalPrice?: number;
  destinations?: Array<{ _id: string; name: string }>;
  guide?: { name?: string };
}

interface ApiListResponse<T> {
  data?: T[];
}

interface WishlistResponse {
  data?: {
    destinations?: Array<{ _id: string }>;
  };
}

interface DashboardStats {
  upcomingTrips: number;
  activeNegotiations: number;
  completedTrips: number;
  savedPlaces: number;
  totalCompletedSpend: number;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function buildSpendData(bookings: Booking[]) {
  const months: { month: string; spend: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const spend = bookings
      .filter((b) => b.status === 'completed' && (b.startDate || '').slice(0, 7) === ym)
      .reduce((s, b) => s + (b.totalPrice || 0), 0);
    months.push({ month: label, spend });
  }
  return months;
}

const ACTIVE_BOOKING_STATUSES = new Set(['pending', 'negotiating', 'confirmed']);

const statusBadgeClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50',
  negotiating: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/50',
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50',
  completed: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50',
  cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/50',
};

const isValidDate = (value?: string) => {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
};

export default function UserDashboard() {
  const auth = useContext(AuthContext);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    upcomingTrips: 0,
    activeNegotiations: 0,
    completedTrips: 0,
    savedPlaces: 0,
    totalCompletedSpend: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setErrorMessage('');

      try {
        const [bookingsRes, wishlistRes] = await Promise.allSettled([
          cachedGet<ApiListResponse<Booking>>('/bookings/my-bookings', showRefreshing),
          cachedGet<WishlistResponse>('/wishlist', showRefreshing),
        ]);

        let bookingsData: Booking[] = [];
        if (bookingsRes.status === 'fulfilled') {
          bookingsData = bookingsRes.value.data || [];
          setBookings(bookingsData);
        } else {
          setBookings([]);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingTrips = bookingsData.filter((booking) => {
          if (!ACTIVE_BOOKING_STATUSES.has(booking.status)) return false;
          if (!isValidDate(booking.endDate)) return true;
          return new Date(booking.endDate as string) >= today;
        }).length;

        const activeNegotiations = bookingsData.filter(
          (booking) => booking.status === 'negotiating'
        ).length;
        const completedTrips = bookingsData.filter(
          (booking) => booking.status === 'completed'
        ).length;
        const totalCompletedSpend = bookingsData
          .filter((booking) => booking.status === 'completed')
          .reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);

        let savedPlaces = auth?.user?.stats?.pinsCreated || 0;
        if (wishlistRes.status === 'fulfilled') {
          savedPlaces = wishlistRes.value.data?.destinations?.length || 0;
        }

        if (bookingsRes.status === 'rejected' && wishlistRes.status === 'rejected') {
          setErrorMessage('Unable to load dashboard data right now. Please try again.');
        } else if (
          bookingsRes.status === 'rejected' ||
          wishlistRes.status === 'rejected'
        ) {
          setErrorMessage('Some data could not be loaded. Refresh to try again.');
        }

        setStats({
          upcomingTrips,
          activeNegotiations,
          completedTrips,
          savedPlaces,
          totalCompletedSpend,
        });
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch user dashboard data:', error);
        setErrorMessage('Unable to load dashboard data right now. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [auth?.user?.stats?.pinsCreated]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const activeBookings = useMemo(
    () =>
      bookings
        .filter((booking) => ACTIVE_BOOKING_STATUSES.has(booking.status))
        .sort((a, b) => {
          const aTime = isValidDate(a.startDate)
            ? new Date(a.startDate as string).getTime()
            : Number.MAX_SAFE_INTEGER;
          const bTime = isValidDate(b.startDate)
            ? new Date(b.startDate as string).getTime()
            : Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        })
        .slice(0, 5),
    [bookings]
  );

  if (loading) {
    return <UserPortalSkeleton />;
  }

  const spendData = buildSpendData(bookings);

  const statCards = [
    {
      label: 'Upcoming Trips',
      value: stats.upcomingTrips,
      icon: Route,
      gradient: 'from-[hsl(228_62%_28%)] to-[hsl(228_55%_48%)]',
      bg: 'bg-[hsl(228_62%_97%)] dark:bg-[hsl(228_62%_10%)]/30',
      ring: 'ring-[hsl(228_62%_88%)] dark:ring-[hsl(228_62%_20%)]/50',
    },
    {
      label: 'Negotiations',
      value: stats.activeNegotiations,
      icon: TrendingUp,
      gradient: 'from-violet-500 to-purple-500',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      ring: 'ring-violet-100 dark:ring-violet-900/50',
    },
    {
      label: 'Completed Trips',
      value: stats.completedTrips,
      icon: Sparkles,
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      ring: 'ring-blue-100 dark:ring-blue-900/50',
    },
    {
      label: 'Saved Places',
      value: stats.savedPlaces,
      icon: Heart,
      gradient: 'from-rose-500 to-pink-500',
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      ring: 'ring-rose-100 dark:ring-rose-900/50',
    },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* ── Greeting bar ── */}
      <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {greeting()},
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {auth?.user?.name?.split(' ')[0] ?? 'Traveler'} 👋
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/user/guides">
              <Button size="sm" className="gap-2 font-semibold">
                <MapPin className="h-4 w-4" />
                Find a Guide
              </Button>
            </Link>
            <Link href="/user/trips">
              <Button size="sm" variant="outline" className="gap-2">
                <Route className="h-4 w-4" />
                Trip Planner
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="gap-2 text-muted-foreground hover:text-foreground"
              title={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Refresh'}
            >
              <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              <span className="hidden sm:inline text-xs">
                {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Refresh'}
              </span>
            </Button>
          </div>
        </div>
      </section>

      {/* Error banner */}
      {errorMessage ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      ) : null}

      {/* Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Card className={`border-0 ring-1 ${card.ring} ${card.bg} shadow-sm hover:shadow-md transition-shadow duration-200`}>
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${card.gradient} shadow-sm`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{card.value}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {card.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </section>

      {/* ── Spend Trend + Total Spend ── */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Spend area chart */}
        <Card className="lg:col-span-2 border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Travel Spending</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">Last 6 months · completed trips</p>
              </div>
              <span className="text-xl font-bold tabular-nums text-foreground">
                {formatNPR(stats.totalCompletedSpend)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pb-4 pt-0">
            {spendData.some((d) => d.spend > 0) ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={spendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: 12 }}
                    formatter={(v: number) => [formatNPR(v), 'Spend']}
                  />
                  <Area type="monotone" dataKey="spend" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#spendGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/20">
                <Wallet className="h-7 w-7 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">Spending data appears after completed trips</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick stats col */}
        <div className="flex flex-col gap-4">
          <Card className="border border-border/60 shadow-sm flex-1">
            <CardContent className="flex items-center gap-4 p-5 h-full">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{formatNPR(stats.totalCompletedSpend)}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Total travel spend</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-sm flex-1">
            <CardContent className="flex items-center gap-4 p-5 h-full">
              <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg shadow-sm bg-gradient-to-br ${stats.activeNegotiations > 0 ? 'from-amber-500 to-orange-500' : 'from-[hsl(228_62%_28%)] to-[hsl(228_55%_48%)]'}`}>
                <Clock3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">
                  {stats.activeNegotiations > 0 ? `${stats.activeNegotiations} active` : 'On track'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stats.activeNegotiations > 0 ? 'Negotiations pending' : 'No pending replies'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bookings + Actions */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Active Bookings */}
        <Card className="lg:col-span-2 border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Active Bookings</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Your current trips and requests
              </p>
            </div>
            <Link href="/user/bookings">
              <Button size="sm" variant="outline" className="rounded-xl text-xs">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activeBookings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
                <MapPin className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No active bookings right now.</p>
                <Link href="/user/explore">
                  <Button size="sm" variant="ghost" className="mt-3 text-primary text-xs">
                    Explore destinations →
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeBookings.map((booking) => (
                  <div
                    key={booking._id}
                    className={[
                      'flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-3.5',
                      'sm:flex-row sm:items-center sm:justify-between',
                      'hover:border-primary/30 hover:bg-primary/5 transition-colors duration-200',
                    ].join(' ')}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {booking.destinations?.[0]?.name || 'Trip request'}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {booking.startDate
                            ? new Date(booking.startDate).toLocaleDateString()
                            : 'Date pending'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Wallet className="h-3.5 w-3.5" />
                          {formatNPR(booking.totalPrice || 0)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      className={`w-fit border capitalize text-xs ${statusBadgeClass[booking.status] ?? 'bg-muted text-foreground border-border'}`}
                    >
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Actions */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Priority Actions</CardTitle>
            <p className="text-xs text-muted-foreground">High-value tasks for your next trip</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              {
                href: '/user/explore',
                title: 'Find destinations',
                desc: 'Discover new places for your next trip.',
                badge: null,
                icon: MapPin,
              },
              {
                href: '/user/trips',
                title: 'Plan food stops',
                desc: 'Build draft itineraries and save route pauses before booking.',
                badge: null,
                icon: Utensils,
              },
              {
                href: '/user/bookings',
                title: 'Respond to negotiations',
                desc: 'Keep pricing conversations moving.',
                badge: stats.activeNegotiations > 0 ? stats.activeNegotiations : null,
                icon: TrendingUp,
              },
              {
                href: '/user/wishlist',
                title: 'Review saved places',
                desc: 'Shortlist your next stop.',
                badge: null,
                icon: Heart,
              },
            ].map(({ href, title, desc, badge, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-start gap-3 rounded-xl border border-border/50 p-3.5',
                  'hover:border-primary/30 hover:bg-primary/5 transition-all duration-200',
                ].join(' ')}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{title}</p>
                    {badge ? (
                      <Badge className="border-amber-200 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50 text-xs flex-shrink-0">
                        {badge}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Bottom CTA */}
      <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
        <span className="text-sm text-muted-foreground">
          Ready to plan your next journey?
        </span>
        <Link
          href="/user/bookings"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Open bookings workspace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
