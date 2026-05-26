'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import api, { cachedGet } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Compass,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
  Heart,
  Navigation,
  Sparkles,
} from 'lucide-react';
import type { ExploreMarker } from '@/components/map/UserExploreMap';

const UserExploreMap = dynamic(() => import('@/components/map/UserExploreMap'), { ssr: false });

interface DestinationApi {
  _id: string;
  name?: string;
  category?: string;
  rating?: number;
  slug?: string;
  location?: {
    coordinates?: [number, number];
    address?: string;
  };
}

const DEFAULT_CATEGORY = 'All';

export default function ExplorePage() {
  const [allDestinations, setAllDestinations] = useState<ExploreMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [selectedId, setSelectedId] = useState<string>('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [wishlistSavingId, setWishlistSavingId] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDestinations = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');
    try {
      const response = await cachedGet<{ data?: DestinationApi[] }>('/destinations', showRefreshing);
      const rawData = (response.data || []) as DestinationApi[];

      let invalidCoordinatesCount = 0;
      const normalized: ExploreMarker[] = rawData
        .map((destination) => {
          const lng = destination.location?.coordinates?.[0];
          const lat = destination.location?.coordinates?.[1];
          const hasValidCoordinates =
            typeof lat === 'number' &&
            typeof lng === 'number' &&
            !Number.isNaN(lat) &&
            !Number.isNaN(lng);

          if (!hasValidCoordinates) {
            invalidCoordinatesCount += 1;
            return null;
          }

          return {
            id: destination._id,
            name: destination.name || 'Untitled Destination',
            category: destination.category || 'Uncategorized',
            address: destination.location?.address || 'Nepal',
            lat,
            lng,
            rating: destination.rating || 0,
          };
        })
        .filter((destination): destination is ExploreMarker => Boolean(destination));

      setAllDestinations(normalized);
      setSelectedId((previous) => {
        if (previous && normalized.some((destination) => destination.id === previous)) {
          return previous;
        }
        return normalized[0]?.id || '';
      });

      if (invalidCoordinatesCount > 0) {
        toast.warning(`${invalidCoordinatesCount} destination(s) skipped due to invalid map coordinates.`);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load destinations:', error);
      setErrorMessage('Unable to load map data right now. Please try again.');
      setAllDestinations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  const categories = useMemo(() => {
    const unique = new Set(allDestinations.map((destination) => destination.category));
    return [DEFAULT_CATEGORY, ...Array.from(unique).sort()];
  }, [allDestinations]);

  const filteredDestinations = useMemo(() => {
    return allDestinations.filter((destination) => {
      const byCategory = category === DEFAULT_CATEGORY || destination.category === category;
      const normalizedSearch = search.trim().toLowerCase();
      const bySearch =
        normalizedSearch.length === 0 ||
        destination.name.toLowerCase().includes(normalizedSearch) ||
        destination.address.toLowerCase().includes(normalizedSearch) ||
        destination.category.toLowerCase().includes(normalizedSearch);
      return byCategory && bySearch;
    });
  }, [allDestinations, category, search]);

  useEffect(() => {
    if (!filteredDestinations.some((destination) => destination.id === selectedId)) {
      setSelectedId(filteredDestinations[0]?.id || '');
    }
  }, [filteredDestinations, selectedId]);

  const selectedDestination = useMemo(
    () => filteredDestinations.find((destination) => destination.id === selectedId) || null,
    [filteredDestinations, selectedId]
  );

  const stats = useMemo(() => {
    const avgRating =
      allDestinations.length > 0
        ? allDestinations.reduce((total, destination) => total + destination.rating, 0) / allDestinations.length
        : 0;
    return {
      total: allDestinations.length,
      filtered: filteredDestinations.length,
      categories: categories.length - 1,
      avgRating,
    };
  }, [allDestinations, filteredDestinations.length, categories.length]);

  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        toast.success('Your location has been detected.');
        setLocating(false);
      },
      () => {
        toast.error('Unable to detect your location. Please allow location permission.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleSaveToWishlist = useCallback(async (destinationId: string) => {
    try {
      setWishlistSavingId(destinationId);
      await api.post(`/wishlist/${destinationId}`);
      toast.success('Destination saved to your wishlist.');
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to save destination.';
      toast.error(message);
    } finally {
      setWishlistSavingId('');
    }
  }, []);

  const directionsLink = useMemo(() => {
    if (!selectedDestination) return '';
    const destinationPart = `${selectedDestination.lat},${selectedDestination.lng}`;
    if (!userLocation) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationPart)}`;
    }
    const originPart = `${userLocation[0]},${userLocation[1]}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originPart)}&destination=${encodeURIComponent(destinationPart)}&travelmode=driving`;
  }, [selectedDestination, userLocation]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-[65vh] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Discover</p>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Compass className="h-6 w-6 text-primary" />
            Explore Nepal
          </h1>
          <p className="text-sm text-muted-foreground">
            Discover destinations, compare ratings, and plan your perfect adventure.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total',      value: stats.total },
            { label: 'Showing',    value: stats.filtered },
            { label: 'Categories', value: stats.categories },
            { label: 'Avg Rating', value: `⭐ ${stats.avgRating.toFixed(1)}` },
          ].map((c) => (
            <div key={c.label} className="flex flex-col rounded-xl p-3 ring-1 bg-muted/40 ring-border/60">
              <span className="text-xl font-bold tabular-nums text-foreground">{c.value}</span>
              <span className="mt-0.5 text-xs font-medium text-muted-foreground">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4 md:p-5">
          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_180px_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by destination, address, or category"
                className="pl-9"
              />
            </div>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {categories.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={() => fetchDestinations(true)}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              onClick={handleDetectLocation}
              disabled={locating}
              className="gap-2"
            >
              <LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse' : ''}`} />
              My Location
            </Button>
          </div>

          {errorMessage && (
            <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          <div className="h-[60vh] min-h-[420px] w-full lg:h-[70vh]">
            <UserExploreMap
              markers={filteredDestinations}
              selectedMarkerId={selectedDestination?.id}
              userLocation={userLocation}
              onSelectMarker={setSelectedId}
            />
          </div>
        </Card>

        <div className="space-y-4">
          {selectedDestination ? (
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{selectedDestination.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{selectedDestination.category}</Badge>
                  <Badge variant="secondary">⭐ {selectedDestination.rating.toFixed(1)}</Badge>
                </div>

                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {selectedDestination.address}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/places/${selectedDestination.id}`}>
                    <Button className="w-full">View Details</Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => handleSaveToWishlist(selectedDestination.id)}
                    disabled={wishlistSavingId === selectedDestination.id}
                  >
                    <Heart className="h-4 w-4" />
                    Save
                  </Button>
                </div>

                {directionsLink && (
                  <a href={directionsLink} target="_blank" rel="noreferrer">
                    <Button variant="outline" className="w-full gap-2">
                      <Navigation className="h-4 w-4" />
                      Open Directions
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border/60 shadow-sm">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Select a destination from map or list to view details.
              </CardContent>
            </Card>
          )}

          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Destination List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredDestinations.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No destinations match your filters.
                </div>
              ) : (
                <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
                  {filteredDestinations.map((destination) => {
                    const isSelected = selectedDestination?.id === destination.id;
                    return (
                      <button
                        key={destination.id}
                        onClick={() => setSelectedId(destination.id)}
                        className={`w-full rounded-md border p-3 text-left transition ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40 hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{destination.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{destination.address}</p>
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0">
                            ⭐ {destination.rating.toFixed(1)}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
