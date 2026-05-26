'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/context/AuthContext';
import api from '@/lib/api';
import { formatNPR } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { GuidePortalSkeleton } from '@/components/ui/skeleton-cards';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertCircle, AlertTriangle, ArrowRight, Banknote, Calendar, CheckCircle,
  ChevronRight, Clock, MessageSquare, RefreshCw, Star, TrendingUp,
  Users, Wallet,
} from 'lucide-react';

/* ─── types ── */
interface Stats {
  totalBookings: number; pendingBookings: number; completedBookings: number;
  totalEarnings: number; recentBookings: RecentBooking[];
}
interface RecentBooking {
  _id: string; tourist?: { name?: string }; startDate: string; endDate: string;
  status: string; totalPrice: number; agreedPrice?: number; createdAt?: string;
}
interface Review {
  _id: string; reviewer: { name: string }; rating: number; comment: string; createdAt: string;
}
interface PayoutMeta { pendingBalance: number; pendingCommissionCount: number; hasActivePayout: boolean; }

const STATUS_PILL: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  negotiating: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300',
  confirmed:   'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  completed:   'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300',
  cancelled:   'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300',
};

const fmt = (d?: string) => {
  if (!d) return '—';
  const ts = new Date(d).getTime();
  return isFinite(ts) ? new Date(ts).toLocaleDateString() : '—';
};

/* Build last-7-days bar chart data from booking list */
function buildWeeklyData(bookings: RecentBooking[]) {
  const days: { day: string; bookings: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = d.toISOString().slice(0, 10);
    const count = bookings.filter(b => (b.createdAt || '').slice(0, 10) === dateStr).length;
    days.push({ day: label, bookings: count });
  }
  return days;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-xl text-xs">
      <p className="font-semibold">{label}</p>
      <p className="text-primary font-medium">{payload[0].value} booking{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ─── component ── */
export default function GuideDashboard() {
  const auth = useContext(AuthContext);

  const [stats,   setStats]   = useState<Stats | null>(null);
  const [bookings,setBookings] = useState<RecentBooking[]>([]);
  const [reviews, setReviews]  = useState<Review[]>([]);
  const [payout,  setPayout]   = useState<PayoutMeta | null>(null);
  const [loading, setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,   setError]    = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const fetchAll = useCallback(async (showRefresh = false) => {
    showRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [statsRes, reqRes, reviewRes, payoutRes] = await Promise.allSettled([
        api.get('/bookings/guide/stats'),
        api.get('/bookings/my-requests'),
        api.get(`/reviews/guide/${auth?.user?.id}`),
        api.get('/payouts/my'),
      ]);
      if (statsRes.status === 'fulfilled')  setStats(statsRes.value.data.data ?? null);
      if (reqRes.status   === 'fulfilled')  setBookings(reqRes.value.data.data ?? []);
      if (reviewRes.status=== 'fulfilled')  setReviews((reviewRes.value.data.data ?? []).slice(0, 3));
      if (payoutRes.status=== 'fulfilled')  setPayout(payoutRes.value.data.data ?? null);
      setLastRefresh(new Date());
    } catch { setError('Unable to load dashboard data. Please refresh.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [auth?.user?.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* profile completion */
  const { pct: profilePct, missing } = useMemo(() => {
    if (!auth?.user) return { pct: 0, missing: [] as string[] };
    const checks: [boolean, string][] = [
      [!!auth.user.name, 'Full name'],
      [!!auth.user.bio, 'Bio'],
      [(auth.user.pricePerDay ?? 0) > 0, 'Price per day'],
      [(auth.user.languages?.length ?? 0) > 0, 'Languages'],
      [(auth.user.specializations?.length ?? 0) > 0, 'Specializations'],
      [!!auth.user.experience, 'Experience'],
      [!!auth.user.phone, 'Phone'],
      [!!auth.user.location, 'Location'],
    ];
    const m = checks.filter(([ok]) => !ok).map(([, l]) => l);
    return { pct: Math.round(((checks.length - m.length) / checks.length) * 100), missing: m };
  }, [auth?.user]);

  const pending  = useMemo(() => bookings.filter(b => ['pending','negotiating'].includes(b.status)).sort((a,b)=>new Date(b.createdAt??0).getTime()-new Date(a.createdAt??0).getTime()).slice(0,4), [bookings]);
  const upcoming = useMemo(() => bookings.filter(b => b.status==='confirmed' && new Date(b.endDate)>=new Date()).sort((a,b)=>new Date(a.startDate).getTime()-new Date(b.startDate).getTime()).slice(0,4), [bookings]);
  const weeklyData = useMemo(() => buildWeeklyData(bookings), [bookings]);

  const handleRequestPayout = async () => {
    setRequestingPayout(true);
    try { await api.post('/payouts/request', { paymentMethod: 'bank_transfer' }); await fetchAll(true); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Failed to submit payout request'); }
    finally { setRequestingPayout(false); }
  };

  if (loading) return <GuidePortalSkeleton />;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const statCards = [
    { label: 'Net Earnings', value: formatNPR(stats?.totalEarnings ?? 0), sub: 'after commission', icon: Wallet,  iconBg: 'bg-emerald-100 dark:bg-emerald-950/50', iconFg: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Total Trips',  value: stats?.totalBookings ?? 0,             sub: `${stats?.completedBookings??0} completed`, icon: Users,   iconBg: 'bg-sky-100 dark:bg-sky-950/50',     iconFg: 'text-sky-600 dark:text-sky-400'     },
    { label: 'Pending',      value: stats?.pendingBookings ?? 0,           sub: 'needs attention',  icon: Clock,   iconBg: 'bg-amber-100 dark:bg-amber-950/50',  iconFg: 'text-amber-600 dark:text-amber-400'  },
    { label: 'Rating',       value: (auth?.user?.rating ?? 0).toFixed(1),  sub: `${auth?.user?.reviewCount??0} reviews`,   icon: Star,    iconBg: 'bg-yellow-100 dark:bg-yellow-950/50', iconFg: 'text-yellow-600 dark:text-yellow-400' },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-8">

      {/* ── Greeting bar ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{today}</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
            {greeting()}, {auth?.user?.name?.split(' ')[0] ?? 'Guide'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here's your guide activity at a glance.
          </p>
        </div>
        <div className="flex gap-2 mt-3 sm:mt-0">
          <Link href="/guide/availability">
            <Button size="sm" className="font-semibold">
              Set Availability
            </Button>
          </Link>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => fetchAll(true)} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 60}ms` }}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.iconBg}`}>
                    <Icon className={`h-5 w-5 ${c.iconFg}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold tabular-nums tracking-tight">{c.value}</p>
                <p className="mt-0.5 text-sm font-medium text-foreground/70">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Payout alert ── */}
      {payout && payout.pendingBalance > 0 && (
        <Card className={`border ${payout.hasActivePayout ? 'border-sky-200 bg-sky-50 dark:bg-sky-950/20' : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20'}`}>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${payout.hasActivePayout ? 'bg-sky-100 dark:bg-sky-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'}`}>
                <Banknote className={`h-5 w-5 ${payout.hasActivePayout ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
              </div>
              <div>
                <p className="font-semibold text-sm">{payout.hasActivePayout ? 'Payout request submitted' : 'Earnings ready for payout'}</p>
                <p className="text-xs text-muted-foreground">{formatNPR(payout.pendingBalance)} from {payout.pendingCommissionCount} completed {payout.pendingCommissionCount === 1 ? 'trip' : 'trips'}</p>
              </div>
            </div>
            {payout.hasActivePayout ? (
              <Badge className="bg-sky-100 text-sky-700 border-sky-200 self-start sm:self-auto dark:bg-sky-950/40 dark:text-sky-300"><Clock className="h-3 w-3 mr-1" />Awaiting admin</Badge>
            ) : (
              <Button size="sm" className="shrink-0" onClick={handleRequestPayout} disabled={requestingPayout}>
                {requestingPayout ? 'Requesting…' : 'Request Payout'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Chart + Profile readiness ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Weekly activity chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Booking Activity</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">New requests this week</p>
            </div>
            <Link href="/guide/bookings">
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary">
                All bookings <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.5)' }} />
                <Bar dataKey="bookings" fill="hsl(228 62% 45%)" radius={[5, 5, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Profile readiness */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Profile Readiness</CardTitle>
            <p className="text-xs text-muted-foreground">Complete profile = more bookings</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Completion</span>
                <span className={`text-sm font-bold ${profilePct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : profilePct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{profilePct}%</span>
              </div>
              <Progress value={profilePct} className="h-2.5" />
            </div>

            {missing.length > 0 ? (
              <div className="rounded-xl border border-amber-200/60 bg-amber-50 dark:bg-amber-950/30 p-3">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />Missing details
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {missing.slice(0, 5).map(f => (
                    <span key={f} className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">{f}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Profile is complete!</p>
              </div>
            )}

            <Link href="/guide/profile" className="block">
              <Button className="w-full" variant={missing.length > 0 ? 'default' : 'outline'} size="sm">
                {missing.length > 0 ? 'Complete Profile' : 'Edit Profile'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ── Pending requests + upcoming trips ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Pending requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Requests To Handle</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Pending &amp; negotiating</p>
            </div>
            <Link href="/guide/bookings"><Button variant="outline" size="sm" className="text-xs">View all</Button></Link>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center bg-muted/20">
                <CheckCircle className="mx-auto h-7 w-7 text-emerald-400 mb-2" />
                <p className="text-sm text-muted-foreground">All clear — no pending requests.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pending.map(b => (
                  <Link key={b._id} href="/guide/bookings">
                    <div className="group flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-3.5 hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer">
                      <div>
                        <p className="text-sm font-semibold">{b.tourist?.name ?? 'Traveller'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmt(b.startDate)} — {fmt(b.endDate)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold">{formatNPR(b.agreedPrice ?? b.totalPrice)}</p>
                        <Badge className={`border text-xs capitalize ${STATUS_PILL[b.status] ?? ''}`}>{b.status}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming trips + Reviews */}
        <div className="space-y-4">
          {/* Upcoming */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Upcoming Trips</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Confirmed &amp; scheduled</p>
              </div>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center bg-muted/20">
                  <Calendar className="mx-auto h-7 w-7 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming trips yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.map(b => (
                    <div key={b._id} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-3.5">
                      <div>
                        <p className="text-sm font-semibold">{b.tourist?.name ?? 'Traveller'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{fmt(b.startDate)} — {fmt(b.endDate)}
                        </p>
                      </div>
                      <p className="text-sm font-bold">{formatNPR(b.agreedPrice ?? b.totalPrice)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent reviews */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Reviews</CardTitle>
              <Link href="/guide/reviews"><Button variant="outline" size="sm" className="text-xs">See all</Button></Link>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center bg-muted/20">
                  <MessageSquare className="mx-auto h-7 w-7 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No reviews yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map(r => (
                    <div key={r._id} className="rounded-xl border border-border/50 bg-muted/20 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{r.reviewer.name}</p>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`h-3 w-3 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
