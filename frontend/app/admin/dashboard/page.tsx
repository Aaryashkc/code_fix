'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatNPR } from '@/lib/currency';
import { AdminPortalSkeleton } from '@/components/ui/skeleton-cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Area, AreaChart,
  CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertCircle, ArrowRight, ArrowUpRight, BookOpen,
  MapPin, RefreshCw, Users, Wallet,
  ClipboardCheck, ShieldCheck, TrendingUp, Calendar,
} from 'lucide-react';

/* ─── types ── */
interface Stats {
  totalUsers: number; totalGuides: number; totalTourists: number;
  pendingGuides: number; totalDestinations: number; pendingDestinations: number;
  totalBookings: number; pendingBookings: number; totalRevenue: number;
}
interface Booking {
  _id: string;
  destinations?: Array<{ name: string }>;
  user?: { name?: string }; guide?: { name?: string }; tourist?: { name?: string };
  totalPrice: number; status: string; createdAt: string;
}
interface Guide { _id: string; name: string; email: string; verified: boolean; createdAt: string; }
interface TrendPoint { month: string; bookings?: number; revenue?: number; }

interface UserStatsApi        { data?: { total?: number; byRole?: { tourists?: number; guides?: number } } }
interface DestinationStatsApi { data?: { total?: number; pending?: number } }
interface BookingStatsApi     { data?: { total?: number; pending?: number; negotiating?: number; revenue?: number } }
interface ListApi<T>          { data?: T[]; total?: number; pages?: number }
interface AnalyticsApi        { data?: { bookingsData?: TrendPoint[]; revenueData?: TrendPoint[] } }

/* ─── status badge colours ── */
const STATUS_CLASS: Record<string, string> = {
  confirmed:   'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  pending:     'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
  completed:   'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
  cancelled:   'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40',
  negotiating: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/40',
};

/* ─── custom tooltip for chart ── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-xl text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.dataKey === 'revenue' ? formatNPR(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

/* ─── greeting ── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function AdminDashboard() {
  const [stats,          setStats]          = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings]  = useState<Booking[]>([]);
  const [recentGuides,   setRecentGuides]    = useState<Guide[]>([]);
  const [trendData,      setTrendData]       = useState<TrendPoint[]>([]);
  const [loading,        setLoading]         = useState(true);
  const [refreshing,     setRefreshing]      = useState(false);
  const [errorMessage,   setErrorMessage]    = useState('');
  const [lastRefresh,    setLastRefresh]     = useState<Date | null>(null);

  const fetchAll = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage('');
    try {
      const [userRes, destRes, bkRes, booksRes, guidesRes, analyticsRes] =
        await Promise.allSettled([
          api.get<UserStatsApi>('/auth/users/stats'),
          api.get<DestinationStatsApi>('/destinations/stats'),
          api.get<BookingStatsApi>('/bookings/stats'),
          api.get<ListApi<Booking>>('/bookings?limit=20'),
          api.get<ListApi<Guide>>('/auth/users?role=guide&limit=20'),
          api.get<AnalyticsApi>('/analytics'),
        ]);

      const dashboardResponses = [userRes, destRes, bkRes, booksRes, guidesRes, analyticsRes];
      const failedCount = dashboardResponses.filter(r => r.status === 'rejected').length;
      if (failedCount === dashboardResponses.length) setErrorMessage('Unable to load dashboard data. Please try again.');
      else if (failedCount > 0) setErrorMessage('Some sections could not be loaded.');

      const u  = userRes.status  === 'fulfilled' ? userRes.value.data.data  || {} : {};
      const d  = destRes.status  === 'fulfilled' ? destRes.value.data.data  || {} : {};
      const b  = bkRes.status    === 'fulfilled' ? bkRes.value.data.data    || {} : {};
      const bk = booksRes.status === 'fulfilled' ? booksRes.value.data.data || [] : [];
      const g  = guidesRes.status=== 'fulfilled' ? guidesRes.value.data.data|| [] : [];

      let pendingCount = g.filter(x => !x.verified).length;
      let totalGuides  = u.byRole?.guides || 0;
      if (!totalGuides && guidesRes.status === 'fulfilled') totalGuides = guidesRes.value.data.total || g.length;
      if (guidesRes.status === 'fulfilled') {
        const pages = guidesRes.value.data.pages ?? 1;
        for (let p = 2; p <= pages; p++) {
          try { const r = await api.get<ListApi<Guide>>('/auth/users', { params: { role: 'guide', limit: 20, page: p } }); pendingCount += (r.data.data || []).filter(x => !x.verified).length; }
          catch { break; }
        }
      }

      setStats({ totalUsers: u.total||0, totalGuides, totalTourists: u.byRole?.tourists||0, pendingGuides: pendingCount, totalDestinations: d.total||0, pendingDestinations: d.pending||0, totalBookings: b.total||0, pendingBookings: (b.pending||0)+(b.negotiating||0), totalRevenue: b.revenue||0 });
      setRecentBookings([...bk].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,7));
      setRecentGuides([...g].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,8));

      if (analyticsRes.status === 'fulfilled') {
        const ad = analyticsRes.value.data.data;
        setTrendData(ad?.bookingsData || []);
      }
      setLastRefresh(new Date());
    } catch { setErrorMessage('Unable to load dashboard data.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const pendingGuideList = useMemo(() => recentGuides.filter(g => !g.verified).slice(0, 5), [recentGuides]);

  if (loading) return <AdminPortalSkeleton />;

  /* today formatted */
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 pb-8">

      {/* ── Greeting bar ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{today}</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
            {greeting()}, Admin 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here's what's happening on your platform today.
          </p>
        </div>
        <Button
          variant="outline" size="sm"
          className="w-fit gap-2 mt-3 sm:mt-0"
          onClick={() => fetchAll(true)}
          disabled={refreshing}
        >
          <RefreshCw className={refreshing ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          Refresh
          {lastRefresh && (
            <span className="text-muted-foreground">· {lastRefresh.toLocaleTimeString()}</span>
          )}
        </Button>
      </div>

      {/* ── Error ── */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />{errorMessage}
        </div>
      )}

      {/* ── 4 KPI Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Users',       value: stats?.totalUsers ?? 0,           sub: `${stats?.totalGuides??0} guides · ${stats?.totalTourists??0} tourists`, icon: Users,         color: 'bg-sky-100 dark:bg-sky-950/50',      fg: 'text-sky-600 dark:text-sky-400',      trend: '+12%' },
          { label: 'Destinations',      value: stats?.totalDestinations ?? 0,     sub: `${stats?.pendingDestinations??0} pending`,              icon: MapPin,        color: 'bg-violet-100 dark:bg-violet-950/50', fg: 'text-violet-600 dark:text-violet-400', trend: '+3%',  href: '/admin/places' },
          { label: 'Total Bookings',    value: stats?.totalBookings ?? 0,         sub: `${stats?.pendingBookings??0} need attention`,           icon: BookOpen,      color: 'bg-amber-100 dark:bg-amber-950/50',  fg: 'text-amber-600 dark:text-amber-400',   trend: `${stats?.pendingBookings??0} pending`, href: '/admin/bookings' },
          { label: 'Platform Revenue',  value: formatNPR(stats?.totalRevenue??0), sub: 'All confirmed bookings',                                icon: Wallet,        color: 'bg-emerald-100 dark:bg-emerald-950/50', fg: 'text-emerald-600 dark:text-emerald-400', trend: 'confirmed' },
        ].map((c, i) => {
          const Icon = c.icon;
          const inner = (
            <Card key={c.label} className={`transition-all duration-200 ${c.href ? 'cursor-pointer hover:-translate-y-0.5 hover:border-border' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`} style={{ animationDelay: `${i * 60}ms` }}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.color}`}>
                    <Icon className={`h-5 w-5 ${c.fg}`} />
                  </div>
                  <span className="flex items-center gap-0.5 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <ArrowUpRight className="h-3 w-3" />{c.trend}
                  </span>
                </div>
                <p className="text-2xl font-bold tabular-nums tracking-tight">{c.value}</p>
                <p className="mt-0.5 text-sm font-medium text-foreground/70">{c.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.sub}</p>
              </CardContent>
            </Card>
          );
          return c.href ? <Link key={c.label} href={c.href}>{inner}</Link> : inner;
        })}
      </div>

      {/* ── Chart + Action Queue ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Bookings trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Booking Trends</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Monthly booking volume</p>
            </div>
            <Link href="/admin/analytics">
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary">
                Full analytics <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pb-4">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminBookingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(228 62% 45%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(228 62% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone" dataKey="bookings" name="Bookings"
                    stroke="hsl(228 62% 45%)" strokeWidth={2.5}
                    fill="url(#adminBookingGrad)"
                    dot={{ r: 3, fill: 'hsl(228 62% 45%)', strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/10 px-6 text-center">
                <div>
                  <p className="text-sm font-medium">No booking activity yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Booking trends will appear when bookings are recorded.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Queue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Action Queue</CardTitle>
            <p className="text-xs text-muted-foreground">Items needing your attention</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { label: 'Guide Verifications', count: stats?.pendingGuides??0,        icon: ShieldCheck,    color: 'text-primary bg-primary/10',         href: '/admin/guides'    },
              { label: 'Place Approvals',      count: stats?.pendingDestinations??0,  icon: MapPin,         color: 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950/40', href: '/admin/places'    },
              { label: 'Booking Escalations',  count: stats?.pendingBookings??0,      icon: ClipboardCheck, color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/40',    href: '/admin/bookings'  },
            ].map(({ label, count, icon: Icon, color, href }) => (
              <Link key={label} href={href}>
                <div className="flex items-center gap-3 rounded-xl border border-border/60 p-3.5 hover:border-primary/30 hover:bg-muted/40 transition-all group cursor-pointer">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-bold tabular-nums ${count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{count}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            ))}

            {/* Revenue summary */}
            <div className="mt-2 rounded-xl bg-primary/8 border border-primary/15 p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Revenue</p>
              </div>
              <p className="text-xl font-bold">{formatNPR(stats?.totalRevenue ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Confirmed bookings total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent activity ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Booking table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-base">Latest Bookings</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Most recently created</p>
            </div>
            <Link href="/admin/bookings">
              <Button variant="outline" size="sm" className="text-xs">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {recentBookings.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No bookings yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Destination</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Customer</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Amount</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((bk, i) => (
                      <tr key={bk._id} className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${i === recentBookings.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium truncate max-w-[160px]">{bk.destinations?.[0]?.name || 'Tour package'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 sm:hidden">{bk.tourist?.name || bk.user?.name || '—'}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <p className="truncate text-muted-foreground max-w-[140px]">{bk.tourist?.name || bk.user?.name || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatNPR(bk.totalPrice || 0)}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge className={`border capitalize text-[10px] ${STATUS_CLASS[bk.status] || 'bg-muted text-foreground border-border'}`}>
                            {bk.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* New guide signups */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">New Guides</CardTitle>
              <Badge variant="secondary" className="text-xs">{pendingGuideList.length} pending</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Awaiting verification</p>
          </CardHeader>
          <CardContent>
            {pendingGuideList.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                <ShieldCheck className="mx-auto mb-2 h-7 w-7 text-primary/30" />
                All verified — no queue.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingGuideList.map(guide => (
                  <div key={guide._id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3 hover:bg-muted/40 transition-colors">
                    {/* Avatar initials */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                      {guide.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{guide.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{guide.email}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{new Date(guide.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/admin/guides" className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              Open verifications <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
