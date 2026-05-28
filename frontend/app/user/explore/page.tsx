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
  Star,
  X,
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

  const findGuidesHref = useMemo(() => {
    if (!selectedDestination) return '/user/guides';

    const params = new URLSearchParams({
      availability: 'available',
      destinationId: selectedDestination.id,
      destinationName: selectedDestination.name,
    });

    return `/user/guides?${params.toString()}`;
  }, [selectedDestination]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-[65vh] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <section className="premium-hero animate-in fade-in slide-in-from-bottom-2 p-5 duration-300 sm:p-7">
        <div className="relative z-10 flex flex-col gap-1">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Map Explorer
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight text-white">
            Where will Nepal take you next?
          </h1>
          <p className="mt-1 max-w-xl text-sm text-white/70">
            Search verified places, scan the map, and save the stops that belong in your next trip.
          </p>
        </div>
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
          {[
            { label: 'Total',      value: stats.total },
            { label: 'Showing',    value: stats.filtered },
            { label: 'Categories', value: stats.categories },
            { label: 'Avg Rating', value: stats.avgRating.toFixed(1) },
          ].map((c) => (
            <div key={c.label} className="flex flex-col rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <span className="flex items-center gap-1 text-xl font-bold tabular-nums text-white">
                {c.label === 'Avg Rating' && <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />}
                {c.value}
              </span>
              <span className="mt-0.5 text-xs font-medium text-white/65">{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardContent className="p-4 md:p-5">
          <div className="mb-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Search className="h-4 w-4 text-primary" aria-hidden="true" />
              Search destinations
            </p>
            <p className="text-xs text-muted-foreground">Filter the map and destination list together.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(240px,1fr)_180px_auto_auto]">
            <div className="relative">
              <label htmlFor="map-destination-search" className="sr-only">Search destinations on map</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="map-destination-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by destination, address, or category"
                className="h-11 rounded-xl pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear destination search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <label htmlFor="map-category-filter" className="sr-only">Filter by category</label>
            <select
              id="map-category-filter"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
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
              className="h-11 gap-2 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              onClick={handleDetectLocation}
              disabled={locating}
              className="h-11 gap-2 rounded-xl"
            >
              <LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse' : ''}`} />
              My Location
            </Button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Destination categories">
            {categories.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setCategory(entry)}
                aria-pressed={category === entry}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  category === entry
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {entry}
              </button>
            ))}
          </div>

          {errorMessage && (
            <div role="alert" className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden rounded-2xl border border-border/60 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 bg-card px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
              Map view
            </p>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {stats.filtered} visible places
              {lastUpdated ? ` | Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </p>
          </div>
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
            <Card className="rounded-2xl border border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{selectedDestination.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{selectedDestination.category}</Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                    {selectedDestination.rating.toFixed(1)}
                  </Badge>
                </div>

                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {selectedDestination.address}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/places/${selectedDestination.id}`}>
                    <Button className="w-full">View Details</Button>
                  </Link>
                  <Link href={findGuidesHref}>
                    <Button variant="secondary" className="w-full">Find Guides</Button>
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => handleSaveToWishlist(selectedDestination.id)}
                    disabled={wishlistSavingId === selectedDestination.id}
                  >
                    <Heart className="h-4 w-4" />
                    Save
                  </Button>
                  {directionsLink && (
                    <a href={directionsLink} target="_blank" rel="noreferrer">
                      <Button variant="outline" className="w-full gap-2">
                      <Navigation className="h-4 w-4" />
                      Open Directions
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-border/60 shadow-sm">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Select a destination from map or list to view details.
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Destinations</CardTitle>
                <Badge variant="secondary" aria-live="polite">{filteredDestinations.length} results</Badge>
              </div>
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
                        type="button"
                        onClick={() => setSelectedId(destination.id)}
                        aria-pressed={isSelected}
                        className={`w-full rounded-xl border p-3 text-left transition ${
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
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                              {destination.rating.toFixed(1)}
                            </span>
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
