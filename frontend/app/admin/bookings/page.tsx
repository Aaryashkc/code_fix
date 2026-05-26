'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Search, 
  Banknote, 
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Booking {
  _id: string;
  tourist: {
    name: string;
    email: string;
  };
  guide: {
    name: string;
    email: string;
  };
  startDate: string;
  endDate: string;
  numberOfDays: number;
  groupSize: number;
  totalPrice: number;
  status: string;
  packageType: string;
  createdAt: string;
}

interface BookingListResponse {
  data?: Booking[];
  pages?: number;
}

type BookingFilter = 'all' | 'pending' | 'negotiating' | 'confirmed' | 'completed' | 'cancelled' | 'declined';

const BOOKING_FILTERS: readonly BookingFilter[] = ['all', 'pending', 'negotiating', 'confirmed', 'completed', 'cancelled', 'declined'];

const isBookingFilter = (value: string): value is BookingFilter =>
  BOOKING_FILTERS.includes(value as BookingFilter);

type BookingStatusConfig = {
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  color: string;
  bg: string;
  icon: typeof Clock;
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    if (!showRefreshing) setLoading(true);
    try {
      const allBookings: Booking[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await api.get<BookingListResponse>('/bookings', {
          params: { page, limit: 100 },
        });

        const pageData = response.data.data || [];
        const totalPages = response.data.pages ?? 1;
        allBookings.push(...pageData);
        page += 1;
        hasMore = page <= totalPages;
      }

      setBookings(allBookings);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, BookingStatusConfig> = {
      pending: { 
        variant: 'secondary', 
        color: 'text-amber-600', 
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        icon: Clock
      },
      confirmed: { 
        variant: 'default', 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        icon: CheckCircle2
      },
      negotiating: {
        variant: 'outline',
        color: 'text-violet-600',
        bg: 'bg-violet-50 dark:bg-violet-950/30',
        icon: Clock
      },
      completed: { 
        variant: 'outline', 
        color: 'text-blue-600', 
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        icon: CheckCircle2
      },
      cancelled: { 
        variant: 'destructive', 
        color: 'text-red-600', 
        bg: 'bg-red-50 dark:bg-red-950/30',
        icon: XCircle
      },
      declined: { 
        variant: 'destructive', 
        color: 'text-red-600', 
        bg: 'bg-red-50 dark:bg-red-950/30',
        icon: XCircle
      },
    };
    return configs[status] || configs.pending;
  };

  const filteredBookings = bookings
    .filter((booking) => {
      if (filter !== 'all') return booking.status === filter;
      return true;
    })
    .filter((booking) => {
      const touristName = booking.tourist?.name?.toLowerCase() || '';
      const guideName = booking.guide?.name?.toLowerCase() || '';
      const search = searchTerm.toLowerCase();
      return touristName.includes(search) || guideName.includes(search);
    });

  const stats = [
    { 
      label: 'Total Bookings', 
      value: bookings.length,
      icon: BookOpen,
      color: 'from-violet-500 to-violet-600',
      trend: '+12%'
    },
    { 
      label: 'Pending', 
      value: bookings.filter(b => b.status === 'pending').length,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      trend: '+3%'
    },
    { 
      label: 'Confirmed', 
      value: bookings.filter(b => b.status === 'confirmed').length,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-emerald-600',
      trend: '+8%'
    },
    { 
      label: 'Revenue', 
      value: `Rs. ${bookings.reduce((sum, b) => sum + b.totalPrice, 0).toLocaleString()}`,
      icon: Banknote,
      color: 'from-blue-500 to-blue-600',
      trend: '+15%'
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-5">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Bookings</h1>
        <p className="text-muted-foreground mt-1">View and manage all platform bookings</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="group">
              <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                      <ArrowUpRight className="h-3 w-3" />
                      {stat.trend}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tourist or guide..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={filter}
            onValueChange={(value) => {
              if (isBookingFilter(value)) {
                setFilter(value);
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="negotiating">Negotiating</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            disabled={refreshing}
            onClick={() => fetchBookings(true)}
            title="Refresh bookings"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Bookings Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {filteredBookings.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No bookings found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">Booking Details</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">Tourist</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">Guide</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">Dates</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">Amount</th>
                    <th className="text-center py-4 px-6 text-sm font-semibold text-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => {
                    const statusConfig = getStatusConfig(booking.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={booking._id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                              <BookOpen className={`h-4 w-4 ${statusConfig.color}`} />
                            </div>
                            <div>
                              <p className="font-medium">{booking.packageType || 'Tour Package'}</p>
                              <p className="text-xs text-muted-foreground">{booking.numberOfDays} days · {booking.groupSize} people</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium">{booking.tourist.name}</div>
                          <div className="text-sm text-muted-foreground">{booking.tourist.email}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium">{booking.guide.name}</div>
                          <div className="text-sm text-muted-foreground">{booking.guide.email}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm">
                              <div>{new Date(booking.startDate).toLocaleDateString()}</div>
                              <div className="text-muted-foreground">{new Date(booking.endDate).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="font-bold text-lg">Rs. {booking.totalPrice?.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">Booked {new Date(booking.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <Badge 
                            variant={statusConfig.variant}
                            className={`capitalize gap-1.5 px-2.5 py-1 ${statusConfig.bg} border-0`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {booking.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
