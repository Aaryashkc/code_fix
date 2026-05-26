'use client';

import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Banknote,
  BookOpen,
  Clock3,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';

interface TrendPoint {
  month: string;
  bookings?: number;
  revenue?: number;
  users?: number;
}

interface DistributionPoint {
  name: string;
  value: number;
}

interface AnalyticsData {
  bookingsData: TrendPoint[];
  revenueData: TrendPoint[];
  categoryData: DistributionPoint[];
  bookingStatusData: DistributionPoint[];
  userGrowthData: TrendPoint[];
  summary: {
    totalBookings: number;
    totalUsers: number;
    totalGuides: number;
    totalRevenue: number;
    pendingBookings: number;
    completedBookings: number;
    paidBookings: number;
    averageBookingValue: number;
  };
}

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--chart-1))',
];

const currencyFormatter = new Intl.NumberFormat('en-NP', {
  style: 'currency',
  currency: 'NPR',
  maximumFractionDigits: 0,
});

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const wholeNumberFormatter = new Intl.NumberFormat('en-US');

const emptySummary = {
  totalBookings: 0,
  totalUsers: 0,
  totalGuides: 0,
  totalRevenue: 0,
  pendingBookings: 0,
  completedBookings: 0,
  paidBookings: 0,
  averageBookingValue: 0,
};

const chartAxisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
};

const formatCurrency = (value: number) => currencyFormatter.format(value);
const formatWholeNumber = (value: number) => wholeNumberFormatter.format(value);
const formatCompactNumber = (value: number) => compactNumberFormatter.format(value);

function EmptyChartState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 text-center">
      <div className="max-w-xs space-y-2 px-6">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  helper: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{helper}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setError(null);
        const response = await api.get('/analytics');
        setAnalytics(response.data.data);
      } catch (fetchError) {
        console.error('Failed to fetch analytics:', fetchError);
        setError('Analytics data could not be loaded. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    void fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-56" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-xl border p-6">
            <Skeleton className="mb-4 h-6 w-44" />
            <Skeleton className="h-80 w-full" />
          </div>
          <div className="rounded-xl border p-6">
            <Skeleton className="mb-4 h-6 w-36" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const bookingsData = analytics?.bookingsData ?? [];
  const revenueData = analytics?.revenueData ?? [];
  const categoryData = analytics?.categoryData ?? [];
  const bookingStatusData = analytics?.bookingStatusData ?? [];
  const userGrowthData = analytics?.userGrowthData ?? [];
  const summary = analytics?.summary ?? emptySummary;

  const statusTotal = bookingStatusData.reduce((total, item) => total + item.value, 0);
  const bookingCompletionRate =
    summary.totalBookings > 0
      ? Math.round((summary.completedBookings / summary.totalBookings) * 100)
      : 0;
  const paidBookingRate =
    summary.totalBookings > 0 ? Math.round((summary.paidBookings / summary.totalBookings) * 100) : 0;

  const hasBookingsTrend = bookingsData.some((item) => (item.bookings ?? 0) > 0);
  const hasRevenueTrend = revenueData.some((item) => (item.revenue ?? 0) > 0);
  const hasUserGrowth = userGrowthData.some((item) => (item.users ?? 0) > 0);
  const hasCategoryData = categoryData.some((item) => item.value > 0);
  const hasStatusData = bookingStatusData.some((item) => item.value > 0);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Six-month operational view with booking health, revenue momentum, and demand mix.
        </p>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Bookings"
          value={formatWholeNumber(summary.totalBookings)}
          helper={`${formatWholeNumber(summary.pendingBookings)} pending right now`}
          icon={BookOpen}
          tone="bg-info/10 text-info"
        />
        <SummaryCard
          title="Booked Revenue"
          value={formatCurrency(summary.totalRevenue)}
          helper={`${formatCurrency(summary.averageBookingValue)} average ticket`}
          icon={Banknote}
          tone="bg-success/10 text-success"
        />
        <SummaryCard
          title="Total Users"
          value={formatWholeNumber(summary.totalUsers)}
          helper={`${formatWholeNumber(summary.paidBookings)} paid bookings recorded`}
          icon={Users}
          tone="bg-primary/10 text-primary"
        />
        <SummaryCard
          title="Active Guides"
          value={formatWholeNumber(summary.totalGuides)}
          helper="Available and not suspended"
          icon={UserCheck}
          tone="bg-secondary/10 text-secondary-foreground"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Bookings Trend</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Filled month buckets make low-volume periods readable instead of collapsing to a single point.
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Last 6 months
            </div>
          </CardHeader>
          <CardContent>
            {hasBookingsTrend ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={bookingsData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" strokeOpacity={0.35} />
                  <XAxis dataKey="month" {...chartAxisProps} />
                  <YAxis {...chartAxisProps} allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.18 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '16px',
                    }}
                    formatter={(value) => [formatWholeNumber(Number(value ?? 0)), 'Bookings']}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="bookings"
                    name="Bookings"
                    stroke="hsl(var(--primary))"
                    fill="url(#bookingsGradient)"
                    strokeWidth={3}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState
                title="No booking activity yet"
                description="Once bookings start coming in, this trend line will show month-by-month volume instead of isolated single-month points."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Status Mix</CardTitle>
            <p className="text-sm text-muted-foreground">
              A donut works better here than a category pie because admins need operational status share at a glance.
            </p>
          </CardHeader>
          <CardContent>
            {hasStatusData ? (
              <div className="space-y-5">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={bookingStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={102}
                      paddingAngle={3}
                      stroke="hsl(var(--card))"
                      strokeWidth={4}
                    >
                      {bookingStatusData.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '16px',
                      }}
                      formatter={(value) => [formatWholeNumber(Number(value ?? 0)), 'Bookings']}
                    />
                    <text
                      x="50%"
                      y="46%"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="hsl(var(--foreground))"
                      fontSize="14"
                      fontWeight="500"
                    >
                      {formatWholeNumber(statusTotal)}
                    </text>
                    <text
                      x="50%"
                      y="56%"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="hsl(var(--muted-foreground))"
                      fontSize="12"
                    >
                      total bookings
                    </text>
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  {bookingStatusData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-sm text-foreground">{item.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatWholeNumber(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyChartState
                title="No booking status data yet"
                description="Status distribution appears after the first booking enters the system."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-warning/10 p-3 text-warning">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Queue</p>
              <p className="text-xl font-semibold">{formatWholeNumber(summary.pendingBookings)}</p>
              <p className="text-xs text-muted-foreground">Bookings waiting for action</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-success/10 p-3 text-success">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-xl font-semibold">{bookingCompletionRate}%</p>
              <p className="text-xs text-muted-foreground">
                {formatWholeNumber(summary.completedBookings)} completed bookings
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-info/10 p-3 text-info">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Coverage</p>
              <p className="text-xl font-semibold">{paidBookingRate}%</p>
              <p className="text-xs text-muted-foreground">
                {formatWholeNumber(summary.paidBookings)} paid bookings logged
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
            <p className="text-sm text-muted-foreground">
              Revenue is grouped by month using confirmed and completed bookings.
            </p>
          </CardHeader>
          <CardContent>
            {hasRevenueTrend ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={revenueData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" strokeOpacity={0.35} />
                  <XAxis dataKey="month" {...chartAxisProps} />
                  <YAxis
                    {...chartAxisProps}
                    tickFormatter={(value) => formatCompactNumber(Number(value))}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--primary))', fillOpacity: 0.08 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '16px',
                    }}
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Revenue']}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--accent))" radius={[10, 10, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState
                title="No revenue has landed yet"
                description="Revenue bars will appear once bookings move into confirmed or completed states."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Booked Categories</CardTitle>
            <p className="text-sm text-muted-foreground">
              This now reflects category demand from bookings, with destination inventory used only as a fallback.
            </p>
          </CardHeader>
          <CardContent>
            {hasCategoryData ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ top: 8, right: 12, left: 28, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="4 4" strokeOpacity={0.3} />
                  <XAxis
                    type="number"
                    {...chartAxisProps}
                    tickFormatter={(value) => formatCompactNumber(Number(value))}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    {...chartAxisProps}
                    width={96}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--primary))', fillOpacity: 0.06 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '16px',
                    }}
                    formatter={(value) => [formatWholeNumber(Number(value ?? 0)), 'Bookings']}
                  />
                  <Bar dataKey="value" name="Bookings" fill="hsl(var(--primary))" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState
                title="No category demand yet"
                description="As soon as bookings include destinations, the system will highlight the most selected travel categories."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
          <p className="text-sm text-muted-foreground">
            User signups are also zero-filled across the same rolling window so new environments read correctly.
          </p>
        </CardHeader>
        <CardContent>
          {hasUserGrowth ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" strokeOpacity={0.35} />
                <XAxis dataKey="month" {...chartAxisProps} />
                <YAxis {...chartAxisProps} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '16px',
                  }}
                  formatter={(value) => [formatWholeNumber(Number(value ?? 0)), 'Users']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  name="Users"
                  stroke="hsl(var(--success))"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState
              title="No user growth in this window"
              description="This chart updates as new users are created over the rolling six-month period."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
