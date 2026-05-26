'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  MapPin, 
  MapPinned,
  Clock3,
  CheckCircle2,
  XCircleIcon,
  Filter,
  ArrowUpRight,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Place {
  _id: string;
  name: string;
  category: string;
  region: string;
  description: string;
  location: {
    coordinates: [number, number];
    address: string;
  };
  verificationStatus: string;
  addedBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
}

type PlaceFilter = 'all' | 'pending' | 'approved' | 'rejected';
type PlaceAction = 'approve' | 'reject';

const PLACE_FILTERS: readonly PlaceFilter[] = ['all', 'pending', 'approved', 'rejected'];
const isPlaceFilter = (value: string): value is PlaceFilter =>
  PLACE_FILTERS.includes(value as PlaceFilter);

type PlaceStatusConfig = {
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  color: string;
  bg: string;
  icon: typeof Clock3;
};

export default function AdminPlacesPage() {
  const searchParams = useSearchParams();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<PlaceFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, PlaceAction>>({});

  useEffect(() => {
    fetchPlaces();
  }, []);

  useEffect(() => {
    const filterFromQuery = searchParams.get('filter');
    if (filterFromQuery && isPlaceFilter(filterFromQuery)) {
      setFilter(filterFromQuery);
    }
  }, [searchParams]);

  const fetchPlaces = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    if (!showRefreshing) setLoading(true);
    try {
      const response = await api.get('/destinations');
      setPlaces(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch places:', error);
      toast.error('Failed to load places');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const withLoading = async (placeId: string, action: PlaceAction, fn: () => Promise<void>) => {
    setActionLoading((prev) => ({ ...prev, [placeId]: action }));
    try {
      await fn();
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[placeId];
        return next;
      });
    }
  };

  const handleApprove = async (placeId: string) => {
    withLoading(placeId, 'approve', async () => {
      await api.patch(`/destinations/${placeId}/verify`, { status: 'approved' });
      toast.success('Place approved successfully');
      fetchPlaces(true);
    }).catch(() => {
      toast.error('Failed to approve place');
    });
  };

  const handleReject = async (placeId: string) => {
    withLoading(placeId, 'reject', async () => {
      await api.patch(`/destinations/${placeId}/verify`, { status: 'rejected' });
      toast.success('Place rejected');
      fetchPlaces(true);
    }).catch(() => {
      toast.error('Failed to reject place');
    });
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, PlaceStatusConfig> = {
      pending: { 
        variant: 'secondary', 
        color: 'text-amber-600', 
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        icon: Clock3
      },
      approved: { 
        variant: 'default', 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        icon: CheckCircle2
      },
      rejected: { 
        variant: 'destructive', 
        color: 'text-red-600', 
        bg: 'bg-red-50 dark:bg-red-950/30',
        icon: XCircleIcon
      },
    };
    return configs[status] || configs.pending;
  };

  const filteredPlaces = places
    .filter((place) => {
      if (filter !== 'all') return place.verificationStatus === filter;
      return true;
    })
    .filter((place) =>
      place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      place.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const stats = [
    { 
      label: 'Total Places', 
      value: places.length,
      icon: MapPinned,
      color: 'from-violet-500 to-violet-600',
      trend: '+5%'
    },
    { 
      label: 'Pending', 
      value: places.filter(p => p.verificationStatus === 'pending').length,
      icon: Clock3,
      color: 'from-amber-500 to-amber-600',
      trend: '+2%'
    },
    { 
      label: 'Approved', 
      value: places.filter(p => p.verificationStatus === 'approved').length,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-emerald-600',
      trend: '+8%'
    },
    { 
      label: 'Rejected', 
      value: places.filter(p => p.verificationStatus === 'rejected').length,
      icon: XCircleIcon,
      color: 'from-red-500 to-red-600',
      trend: '-1%'
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-5 flex gap-4">
              <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Places</h1>
        <p className="text-muted-foreground mt-1">Approve or reject place submissions</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isNegative = stat.trend.startsWith('-');
          return (
            <div key={stat.label} className="group">
              <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${isNegative ? 'text-red-500' : 'text-emerald-500'}`}>
                      <ArrowUpRight className={`h-3 w-3 ${isNegative ? 'rotate-90' : ''}`} />
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
            placeholder="Search places by name or category..."
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
              if (isPlaceFilter(value)) {
                setFilter(value);
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Places</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            disabled={refreshing}
            onClick={() => fetchPlaces(true)}
            title="Refresh places"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Places Grid */}
      {filteredPlaces.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <MapPinned className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No places found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPlaces.map((place) => {
            const statusConfig = getStatusConfig(place.verificationStatus);
            const StatusIcon = statusConfig.icon;
            const currentAction = actionLoading[place._id];
            const isBusy = Boolean(currentAction);
            return (
              <Card key={place._id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon/Status */}
                    <div className={`p-3 rounded-xl ${statusConfig.bg} flex-shrink-0`}>
                      <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{place.name}</h3>
                        <Badge 
                          variant={statusConfig.variant}
                          className={`capitalize gap-1.5 px-2.5 py-1 ${statusConfig.bg} border-0`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {place.verificationStatus}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{place.location.address}</span>
                      </div>

                      <div className="flex gap-2 mb-3 flex-wrap">
                        <Badge variant="outline" className="font-medium">{place.category}</Badge>
                        <Badge variant="outline">{place.region}</Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {place.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {place.addedBy && (
                          <span>Submitted by <span className="font-medium text-foreground">{place.addedBy.name}</span></span>
                        )}
                        <span>{new Date(place.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    {place.verificationStatus === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(place._id)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={isBusy}
                        >
                          {currentAction === 'approve' ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(place._id)}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          disabled={isBusy}
                        >
                          {currentAction === 'reject' ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
