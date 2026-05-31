'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Loader2,
  Pencil,
  ArrowLeft,
  FolderOpen,
  ImagePlus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';

interface Place {
  _id: string;
  name: string;
  category: string;
  region: string;
  description: string;
  shortDescription: string;
  images: string[];
  media?: PlaceMedia[];
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

type PlaceMedia = {
  _id?: string;
  publicId?: string;
  url: string;
};
type PlaceFilter = 'all' | 'pending' | 'approved' | 'rejected';
type PlaceAction = 'approve' | 'reject';
type EditForm = Pick<Place, 'name' | 'category' | 'region' | 'description' | 'shortDescription'>;
type PlaceStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  byRegion?: Array<{ _id: string; count: number }>;
  pendingByRegion?: Array<{ _id: string; count: number }>;
};

const PLACE_FILTERS: readonly PlaceFilter[] = ['all', 'pending', 'approved', 'rejected'];
const REGIONS = ['Eastern', 'Central', 'Western', 'Far-Western'] as const;
const MAX_IMAGES = 10;
type RegionFolder = (typeof REGIONS)[number] | null;
const PAGE_SIZE = 8;
const isPlaceFilter = (value: string): value is PlaceFilter =>
  PLACE_FILTERS.includes(value as PlaceFilter);
const apiErrorMessage = (error: unknown, fallback: string) => (
  (error as { response?: { data?: { message?: string } } }).response?.data?.message || fallback
);

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
  const [regionFolder, setRegionFolder] = useState<RegionFolder>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, PlaceAction>>({});
  const [editPlace, setEditPlace] = useState<Place | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statsSummary, setStatsSummary] = useState<PlaceStats>({
    total: 0, pending: 0, approved: 0, rejected: 0,
  });

  useEffect(() => {
    const filterFromQuery = searchParams.get('filter');
    if (filterFromQuery && isPlaceFilter(filterFromQuery)) {
      setFilter(filterFromQuery);
    }
  }, [searchParams]);

  const fetchPlaces = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    if (!showRefreshing) setLoading(true);
    try {
      if (!regionFolder) {
        const statsResponse = await api.get('/destinations/stats');
        setPlaces([]);
        setTotal(0);
        setPages(1);
        setStatsSummary(statsResponse.data.data || { total: 0, pending: 0, approved: 0, rejected: 0 });
        return;
      }

      const [response, statsResponse] = await Promise.all([
        api.get('/destinations/admin', {
          params: {
            page,
            limit: PAGE_SIZE,
            verificationStatus: filter === 'all' ? undefined : filter,
            region: regionFolder,
            search: searchTerm.trim() || undefined,
          },
        }),
        api.get('/destinations/stats'),
      ]);
      setPlaces(response.data.data || []);
      setTotal(response.data.total ?? 0);
      setPages(Math.max(1, response.data.pages ?? 1));
      setStatsSummary(statsResponse.data.data || { total: 0, pending: 0, approved: 0, rejected: 0 });
    } catch (error) {
      console.error('Failed to fetch places:', error);
      toast.error('Failed to load places');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, page, regionFolder, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [filter, regionFolder, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchPlaces(), searchTerm.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [fetchPlaces, searchTerm]);

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

  const beginEdit = (place: Place) => {
    setEditPlace(place);
    setEditForm({
      name: place.name,
      category: place.category,
      region: place.region,
      description: place.description,
      shortDescription: place.shortDescription || ''
    });
  };

  const closeEdit = () => {
    if (savingEdit || mediaBusy) return;
    setEditPlace(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editPlace || !editForm) return;

    setSavingEdit(true);
    try {
      const response = await api.put(`/destinations/${editPlace._id}`, editForm);
      const updatedPlace = response.data.data as Place;
      setPlaces((current) => current.map((place) => (
        place._id === updatedPlace._id ? { ...place, ...updatedPlace } : place
      )));
      toast.success('Place updated successfully');
      setEditPlace(null);
      setEditForm(null);
    } catch (error) {
      console.error('Failed to update place:', error);
      toast.error('Failed to update place');
    } finally {
      setSavingEdit(false);
    }
  };

  const applyUpdatedPlace = (updatedPlace: Place) => {
    setEditPlace(updatedPlace);
    setPlaces((current) => current.map((place) => (
      place._id === updatedPlace._id ? { ...place, ...updatedPlace } : place
    )));
  };

  const editableMedia = (place: Place) => (
    place.media?.length === place.images.length
      ? place.media
      : place.images.map((url) => ({ url }))
  );

  const handleUploadImages = async (files: FileList | null) => {
    if (!editPlace || !files?.length) return;
    if (editPlace.images.length + files.length > MAX_IMAGES) {
      toast.error(`You can add up to ${MAX_IMAGES} photos per destination`);
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('images', file));
    setMediaBusy(true);
    try {
      const response = await api.post(`/destinations/${editPlace._id}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      applyUpdatedPlace(response.data.data);
      toast.success('Photos uploaded');
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, 'Failed to upload photos'));
    } finally {
      setMediaBusy(false);
    }
  };

  const handleReorderImage = async (index: number, nextIndex: number) => {
    if (!editPlace || nextIndex < 0 || nextIndex >= editPlace.images.length) return;
    const media = [...editableMedia(editPlace)];
    [media[index], media[nextIndex]] = [media[nextIndex], media[index]];
    setMediaBusy(true);
    try {
      const response = await api.put(`/destinations/${editPlace._id}/media`, { media });
      applyUpdatedPlace(response.data.data);
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, 'Failed to reorder photos'));
    } finally {
      setMediaBusy(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    if (!editPlace) return;
    setMediaBusy(true);
    try {
      const response = await api.delete(`/destinations/${editPlace._id}/media/${index}`);
      applyUpdatedPlace(response.data.data);
      toast.success('Photo removed');
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, 'Failed to remove photo'));
    } finally {
      setMediaBusy(false);
    }
  };

  const handleReplaceImage = async (index: number, files: FileList | null) => {
    if (!editPlace || !files?.[0]) return;
    const formData = new FormData();
    formData.append('image', files[0]);
    setMediaBusy(true);
    try {
      const response = await api.post(`/destinations/${editPlace._id}/media/${index}/replace`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      applyUpdatedPlace(response.data.data);
      toast.success('Photo replaced');
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, 'Failed to replace photo'));
    } finally {
      setMediaBusy(false);
    }
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

  const stats = [
    { 
      label: 'Total Places', 
      value: statsSummary.total,
      icon: MapPinned,
      color: 'from-violet-500 to-violet-600',
      trend: '+5%'
    },
    { 
      label: 'Pending', 
      value: statsSummary.pending,
      icon: Clock3,
      color: 'from-amber-500 to-amber-600',
      trend: '+2%'
    },
    { 
      label: 'Approved', 
      value: statsSummary.approved,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-emerald-600',
      trend: '+8%'
    },
    { 
      label: 'Rejected', 
      value: statsSummary.rejected,
      icon: XCircleIcon,
      color: 'from-red-500 to-red-600',
      trend: '-1%'
    },
  ];
  const regionCount = (region: (typeof REGIONS)[number]) => (
    statsSummary.byRegion?.find((entry) => entry._id === region)?.count || 0
  );
  const pendingRegionCount = (region: (typeof REGIONS)[number]) => (
    statsSummary.pendingByRegion?.find((entry) => entry._id === region)?.count || 0
  );

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
        <p className="text-muted-foreground mt-1">Organize destinations by region, curate photos, and moderate submissions.</p>
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

      {!regionFolder ? (
        <section className="rounded-2xl border bg-card p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Destination Folders</h2>
            <p className="mt-1 text-sm text-muted-foreground">Open a region to view and manage its places.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Destination folders">
            {REGIONS.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => {
                  setRegionFolder(region);
                  setFilter(pendingRegionCount(region) > 0 ? 'pending' : 'all');
                }}
                className="group relative flex min-h-44 flex-col justify-between rounded-2xl border bg-muted/20 p-5 text-left transition hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
              >
                {pendingRegionCount(region) > 0 && (
                  <span className="absolute right-4 top-4 inline-flex min-w-6 items-center justify-center rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-sm" aria-label={`${pendingRegionCount(region)} pending approvals`}>
                    {pendingRegionCount(region)}
                  </span>
                )}
                <FolderOpen className="h-14 w-14 fill-primary/15 text-primary transition group-hover:fill-primary/25" />
                <span>
                  <span className="block text-lg font-semibold">{region}</span>
                  <span className="text-sm text-muted-foreground">{regionCount(region)} places</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setRegionFolder(null);
                  setFilter('all');
                  setSearchTerm('');
                }}
                aria-label="Back to folders"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-xl font-semibold">{regionFolder} Places</h2>
                <p className="text-sm text-muted-foreground">Showing {places.length} of {total} places in this folder</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search in ${regionFolder}...`}
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
                  if (isPlaceFilter(value)) setFilter(value);
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
              <Button variant="outline" size="icon" disabled={refreshing} onClick={() => fetchPlaces(true)} title="Refresh places">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {places.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <MapPinned className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No places found in {regionFolder}</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {places.map((place) => {
            const statusConfig = getStatusConfig(place.verificationStatus);
            const StatusIcon = statusConfig.icon;
            const currentAction = actionLoading[place._id];
            const isBusy = Boolean(currentAction);
            return (
              <Card key={place._id} className="overflow-hidden border-0 shadow-md transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="relative aspect-[16/9] bg-muted">
                      <Image
                        src={place.images?.[0] || '/placeholder.svg'}
                        alt={`${place.name} cover`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                      <Badge className={`absolute left-3 top-3 capitalize gap-1.5 ${statusConfig.bg} ${statusConfig.color} border-0`}>
                        <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
                        {place.verificationStatus}
                      </Badge>
                    </div>
                <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{place.name}</h3>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{place.location.address}</span>
                      </div>

                      <div className="flex gap-2 mb-3 flex-wrap">
                        <Badge variant="outline" className="font-medium">{place.category}</Badge>
                        <Badge variant="outline">{place.region}</Badge>
                      </div>

                      <p className="min-h-10 text-sm text-muted-foreground mb-4 line-clamp-2">
                        {place.description}
                      </p>

                      <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
                        {place.addedBy && (
                          <span>Submitted by <span className="font-medium text-foreground">{place.addedBy.name}</span></span>
                        )}
                        <span>{new Date(place.createdAt).toLocaleDateString()}</span>
                      </div>
                    <div className="flex flex-wrap gap-2 border-t pt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => beginEdit(place)}
                        disabled={isBusy}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      {place.verificationStatus === 'pending' && (
                        <>
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
                        </>
                      )}
                    </div>
                </CardContent>
              </Card>
            );
          })}
              </div>
              {pages > 1 && (
                <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={page === 1}
                  className={page === 1 ? 'pointer-events-none opacity-50' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem className="px-3 text-sm text-muted-foreground">
                Page <span className="font-semibold text-foreground">{page}</span> of {pages}
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={page === pages}
                  className={page === pages ? 'pointer-events-none opacity-50' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    if (page < pages) setPage(page + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </>
      )}

      <Dialog open={Boolean(editPlace)} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Place</DialogTitle>
            <DialogDescription>
              Update destination details and arrange its traveler-facing gallery.
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="grid gap-4 py-2">
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Destination Photos</p>
                    <p className="text-xs text-muted-foreground">
                      The first photo is the cover image. {editPlace?.images.length || 0}/{MAX_IMAGES} uploaded.
                    </p>
                  </div>
                  <label className={`inline-flex cursor-pointer items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground ${mediaBusy ? 'pointer-events-none opacity-60' : ''}`}>
                    {mediaBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                    Add Photos
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      disabled={mediaBusy}
                      onChange={(event) => {
                        void handleUploadImages(event.target.files);
                        event.target.value = '';
                      }}
                    />
                  </label>
                </div>
                {editPlace && editPlace.images.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {editPlace.images.map((image, index) => (
                      <div key={`${image}-${index}`} className="overflow-hidden rounded-xl border bg-card">
                        <div className="relative aspect-[16/9]">
                          <Image src={image} alt={`${editPlace.name} photo ${index + 1}`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                          {index === 0 && (
                            <Badge className="absolute left-2 top-2 gap-1 bg-primary">
                              <Star className="h-3 w-3 fill-current" />
                              Cover
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 p-2">
                          {index > 0 && (
                            <Button type="button" size="sm" variant="secondary" disabled={mediaBusy} onClick={() => void handleReorderImage(index, 0)}>
                              Set Cover
                            </Button>
                          )}
                          <Button type="button" size="icon" variant="ghost" disabled={mediaBusy || index === 0} onClick={() => void handleReorderImage(index, index - 1)} title="Move earlier">
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" disabled={mediaBusy || index === editPlace.images.length - 1} onClick={() => void handleReorderImage(index, index + 1)} title="Move later">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <label className={`ml-auto cursor-pointer rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted ${mediaBusy ? 'pointer-events-none opacity-60' : ''}`}>
                            Replace
                            <input
                              type="file"
                              className="hidden"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              disabled={mediaBusy}
                              onChange={(event) => {
                                void handleReplaceImage(index, event.target.files);
                                event.target.value = '';
                              }}
                            />
                          </label>
                          <Button type="button" size="icon" variant="ghost" className="text-destructive" disabled={mediaBusy} onClick={() => void handleRemoveImage(index)} title="Remove photo">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Add a cover photo and gallery images for this destination.
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <label htmlFor="place-name" className="text-sm font-medium">Name</label>
                <Input
                  id="place-name"
                  value={editForm.name}
                  onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={editForm.category}
                    onValueChange={(category) => setEditForm({ ...editForm, category })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Religious', 'Nature', 'Adventure', 'Cultural', 'Urban'].map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Region</label>
                  <Select
                    value={editForm.region}
                    onValueChange={(region) => setEditForm({ ...editForm, region })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Eastern', 'Central', 'Western', 'Far-Western'].map((region) => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <label htmlFor="place-short-description" className="text-sm font-medium">Short Description</label>
                <Input
                  id="place-short-description"
                  value={editForm.shortDescription}
                  onChange={(event) => setEditForm({ ...editForm, shortDescription: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="place-description" className="text-sm font-medium">Description</label>
                <Textarea
                  id="place-description"
                  rows={5}
                  value={editForm.description}
                  onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit} disabled={savingEdit || mediaBusy}>Cancel</Button>
            <Button onClick={() => void handleSaveEdit()} disabled={savingEdit || mediaBusy || !editForm?.name.trim()}>
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
