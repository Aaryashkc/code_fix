'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import api, { cachedGet } from '@/lib/api';
import { fetchSnacksAlongRoute, type RouteSnackStop } from '@/lib/overpassService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowDown,
  ArrowUp,
  Compass,
  FolderOpen,
  Map as MapIcon,
  Plus,
  RefreshCw,
  Route,
  Save,
  Wand2,
  Trash2,
  Sparkles,
  CheckCircle2,
  Clock3,
  Utensils,
  Users,
} from 'lucide-react';
import type { ExploreMarker } from '@/components/map/UserExploreMap';

const UserExploreMap = dynamic(() => import('@/components/map/UserExploreMap'), { ssr: false });

interface Place {
  _id: string;
  name: string;
  category: string;
  images: string[];
  duration?: string;
  location: {
    coordinates: [number, number];
    address: string;
  };
}

interface SavedTripPlace {
  destination: Place;
  day: number;
  order: number;
}

interface SavedTrip {
  _id: string;
  name: string;
  places: SavedTripPlace[];
  createdAt: string;
}

interface PlannerStop {
  place: Place;
  day: number;
  order: number;
  daysNeeded: number;
}

type RouteSnackDetail = RouteSnackStop & {
  key: string;
  typeLabel: string;
  initials: string;
  segmentLabel: string;
  timingLabel: string;
  routeProgress: number;
  detourLabel: string;
};

const parseDurationDays = (duration?: string): number => {
  if (!duration) return 1;
  const normalized = duration.toLowerCase();
  if (normalized.includes('half')) return 1;

  const numericMatches = duration.match(/\d+/g);
  if (!numericMatches || numericMatches.length === 0) return 1;

  const values = numericMatches.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (values.length === 0) return 1;

  const maxValue = Math.max(...values);
  return Math.min(Math.max(maxValue, 1), 30);
};

const buildPlannerStops = (itinerary: Place[]): PlannerStop[] => {
  let runningDay = 1;
  return itinerary.map((place, index) => {
    const daysNeeded = parseDurationDays(place.duration);
    const stop = {
      place,
      day: runningDay,
      order: index,
      daysNeeded,
    };
    runningDay += daysNeeded;
    return stop;
  });
};

const createSignature = (tripName: string, itinerary: Place[]) =>
  JSON.stringify({
    tripName: tripName.trim(),
    itineraryIds: itinerary.map((place) => place._id),
  });

const CATEGORY_TO_SPECIALIZATION: Record<string, string> = {
  adventure: 'trekking',
  nature: 'wildlife',
  cultural: 'cultural tours',
  religious: 'spiritual',
  urban: 'photography',
};

const getRouteSnackKey = (snack: RouteSnackStop) => `${snack.type}-${snack.id}`;

const getFoodStopTypeLabel = (type: RouteSnackStop['type']) => {
  if (type === 'cafe') return 'Cafe';
  if (type === 'fast_food') return 'Quick Bite';
  return 'Restaurant';
};

const getFoodStopInitials = (type: RouteSnackStop['type']) => {
  if (type === 'cafe') return 'CF';
  if (type === 'fast_food') return 'QB';
  return 'RS';
};

export default function TripPlannerPage() {
  const [aiForm, setAiForm] = useState({
    days: '5',
    budget: '25000',
    theme: 'Culture',
    destination: 'Nepal',
  });
  const [tripName, setTripName] = useState('My Nepal Adventure');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [availablePlaces, setAvailablePlaces] = useState<Place[]>([]);
  const [itinerary, setItinerary] = useState<Place[]>([]);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [optimizingRoute, setOptimizingRoute] = useState(false);
  const [generatingAiTrip, setGeneratingAiTrip] = useState(false);
  const [loadingRouteSnacks, setLoadingRouteSnacks] = useState(false);
  const [routeSnacks, setRouteSnacks] = useState<RouteSnackStop[]>([]);
  const [plannedRouteSnackKeys, setPlannedRouteSnackKeys] = useState<string[]>([]);
  const [deletingTripId, setDeletingTripId] = useState('');
  const [estimatedRouteDistance, setEstimatedRouteDistance] = useState<number | null>(null);

  const [addPlaceDialogOpen, setAddPlaceDialogOpen] = useState(false);
  const [savedTripsDialogOpen, setSavedTripsDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [baselineSignature, setBaselineSignature] = useState('');
  const [selectedMapStopId, setSelectedMapStopId] = useState('');
  const [selectedRouteSnackKey, setSelectedRouteSnackKey] = useState<string | null>(null);

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [placesResponse, tripsResponse] = await Promise.all([
        cachedGet<{ data?: Place[] }>('/destinations', showRefreshing),
        cachedGet<{ data?: SavedTrip[] }>('/trips', showRefreshing),
      ]);

      setAvailablePlaces(placesResponse.data || []);
      setSavedTrips(tripsResponse.data || []);
    } catch (error) {
      console.error('Failed to load planner data:', error);
      toast.error('Failed to load trip planner data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!baselineSignature) {
      setBaselineSignature(createSignature(tripName, itinerary));
    }
  }, [tripName, itinerary, baselineSignature]);

  const plannerStops = useMemo(() => buildPlannerStops(itinerary), [itinerary]);

  useEffect(() => {
    if (plannerStops.length === 0) {
      setSelectedMapStopId('');
      return;
    }

    if (!plannerStops.some((stop) => stop.place._id === selectedMapStopId)) {
      setSelectedMapStopId(plannerStops[0].place._id);
    }
  }, [plannerStops, selectedMapStopId]);

  const totalDays = useMemo(() => {
    if (plannerStops.length === 0) return 0;
    const last = plannerStops[plannerStops.length - 1];
    return last.day + last.daysNeeded - 1;
  }, [plannerStops]);

  const estimatedBudget = useMemo(() => totalDays * 4500, [totalDays]);

  const currentSignature = useMemo(() => createSignature(tripName, itinerary), [tripName, itinerary]);
  const hasUnsavedChanges = currentSignature !== baselineSignature;

  const categories = useMemo(() => {
    const unique = new Set(availablePlaces.map((place) => place.category));
    return ['all', ...Array.from(unique).sort()];
  }, [availablePlaces]);

  const filteredPlaces = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return availablePlaces.filter((place) => {
      const matchesCategory = categoryFilter === 'all' || place.category === categoryFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        place.name.toLowerCase().includes(normalizedSearch) ||
        place.location.address.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [availablePlaces, searchTerm, categoryFilter]);

  const mapMarkers = useMemo<ExploreMarker[]>(
    () =>
      plannerStops
        .filter(
          (stop) =>
            Array.isArray(stop.place.location?.coordinates) &&
            typeof stop.place.location.coordinates[0] === 'number' &&
            typeof stop.place.location.coordinates[1] === 'number'
        )
        .map((stop) => ({
          id: stop.place._id,
          name: `Day ${stop.day}: ${stop.place.name}`,
          category: stop.place.category,
          address: stop.place.location.address,
          lat: stop.place.location.coordinates[1],
          lng: stop.place.location.coordinates[0],
          rating: 4.5,
        })),
    [plannerStops]
  );

  const routePath = useMemo(
    () => mapMarkers.map((marker) => [marker.lat, marker.lng] as [number, number]),
    [mapMarkers]
  );

  useEffect(() => {
    let isCurrent = true;

    if (routePath.length < 2) {
      setRouteSnacks([]);
      setSelectedRouteSnackKey(null);
      setPlannedRouteSnackKeys([]);
      setLoadingRouteSnacks(false);
      return () => {
        isCurrent = false;
      };
    }

    setLoadingRouteSnacks(true);
    fetchSnacksAlongRoute(routePath)
      .then((snacks) => {
        if (!isCurrent) return;
        setRouteSnacks(snacks);
        setSelectedRouteSnackKey((current) =>
          current && snacks.some((snack) => getRouteSnackKey(snack) === current)
            ? current
            : snacks[0] ? getRouteSnackKey(snacks[0]) : null
        );
        setPlannedRouteSnackKeys((current) => {
          const validKeys = new Set(snacks.map(getRouteSnackKey));
          return current.filter((key) => validKeys.has(key));
        });
      })
      .catch((error) => {
        if (!isCurrent) return;
        console.error('Failed to load trip route snacks:', error);
        setRouteSnacks([]);
        setSelectedRouteSnackKey(null);
        setPlannedRouteSnackKeys([]);
      })
      .finally(() => {
        if (isCurrent) setLoadingRouteSnacks(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [routePath]);

  const routeSnackDetails = useMemo<RouteSnackDetail[]>(() => {
    const lastRouteIndex = Math.max(routePath.length - 1, 1);

    return routeSnacks.map((snack) => {
      const nearestIndex = Math.min(Math.max(snack.orderAlongRoute, 0), Math.max(mapMarkers.length - 1, 0));
      const segmentStartIndex = Math.min(nearestIndex, Math.max(mapMarkers.length - 2, 0));
      const fromStop = mapMarkers[segmentStartIndex];
      const toStop = mapMarkers[segmentStartIndex + 1];
      const anchorStop = mapMarkers[nearestIndex];
      const routeProgress = Math.round((nearestIndex / lastRouteIndex) * 100);

      return {
        ...snack,
        key: getRouteSnackKey(snack),
        typeLabel: getFoodStopTypeLabel(snack.type),
        initials: getFoodStopInitials(snack.type),
        segmentLabel: fromStop && toStop
          ? `Between ${fromStop.name.replace(/^Day \d+:\s*/, '')} and ${toStop.name.replace(/^Day \d+:\s*/, '')}`
          : anchorStop
            ? `Near ${anchorStop.name.replace(/^Day \d+:\s*/, '')}`
            : 'Near your route',
        timingLabel: anchorStop
          ? `Best around Day ${plannerStops[nearestIndex]?.day ?? 1}`
          : 'Good pause point',
        routeProgress,
        detourLabel: snack.distanceFromRoute < 0.1
          ? 'On route'
          : `${snack.distanceFromRoute.toFixed(1)} km detour`,
      };
    });
  }, [mapMarkers, plannerStops, routePath.length, routeSnacks]);

  const selectedRouteSnack = useMemo(
    () => routeSnackDetails.find((snack) => snack.key === selectedRouteSnackKey) || null,
    [routeSnackDetails, selectedRouteSnackKey]
  );

  const plannedRouteSnacks = useMemo(
    () => routeSnackDetails.filter((snack) => plannedRouteSnackKeys.includes(snack.key)),
    [plannedRouteSnackKeys, routeSnackDetails]
  );

  const togglePlannedRouteSnack = useCallback((snackKey: string) => {
    setPlannedRouteSnackKeys((current) =>
      current.includes(snackKey)
        ? current.filter((key) => key !== snackKey)
        : [...current, snackKey]
    );
    setSelectedRouteSnackKey(snackKey);
  }, []);

  const recommendedSpecialization = useMemo(() => {
    if (plannerStops.length === 0) return '';

    const categoryCounts = plannerStops.reduce<Record<string, number>>((acc, stop) => {
      const key = stop.place.category.toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCategories[0]?.[0];

    if (!topCategory) return '';
    return CATEGORY_TO_SPECIALIZATION[topCategory] || '';
  }, [plannerStops]);

  const findGuidesHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('availability', 'available');
    if (recommendedSpecialization) {
      params.set('specialization', recommendedSpecialization);
    }
    return `/user/guides?${params.toString()}`;
  }, [recommendedSpecialization]);

  const saveTrip = useCallback(async () => {
    const trimmedName = tripName.trim();
    if (!trimmedName) {
      toast.error('Trip name is required');
      return;
    }
    if (plannerStops.length === 0) {
      toast.error('Please add at least one place to your trip');
      return;
    }

    setSavingTrip(true);
    const payload = {
      name: trimmedName,
      places: plannerStops.map((stop) => ({
        destination: stop.place._id,
        day: stop.day,
        order: stop.order,
      })),
    };

    try {
      if (selectedTripId) {
        await api.put(`/trips/${selectedTripId}`, payload);
        toast.success('Trip updated successfully');
      } else {
        const response = await api.post('/trips', payload);
        setSelectedTripId(response.data?.data?._id || null);
        toast.success('Trip saved successfully');
      }

      await loadData(true);
      setBaselineSignature(createSignature(trimmedName, itinerary));
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to save trip';
      toast.error(message);
    } finally {
      setSavingTrip(false);
    }
  }, [tripName, plannerStops, selectedTripId, loadData, itinerary]);

  const applyTrip = useCallback((trip: SavedTrip, distanceKm?: number | null) => {
    const ordered = [...trip.places]
      .sort((a, b) => (a.day - b.day) || (a.order - b.order))
      .map((entry) => entry.destination)
      .filter((destination) => Boolean(destination?._id));

    setTripName(trip.name);
    setSelectedTripId(trip._id);
    setItinerary(ordered);
    setBaselineSignature(createSignature(trip.name, ordered));
    setEstimatedRouteDistance(distanceKm ?? null);
    setPlannedRouteSnackKeys([]);
    setSelectedRouteSnackKey(null);
  }, []);

  const startNewTrip = useCallback(() => {
    if (hasUnsavedChanges && itinerary.length > 0) {
      const shouldDiscard = window.confirm('You have unsaved changes. Start a new trip anyway?');
      if (!shouldDiscard) return;
    }

    const initialName = 'My Nepal Adventure';
    setTripName(initialName);
    setItinerary([]);
    setSelectedTripId(null);
    setBaselineSignature(createSignature(initialName, []));
    setEstimatedRouteDistance(null);
    setPlannedRouteSnackKeys([]);
    setSelectedRouteSnackKey(null);
    toast.success('Started a new trip draft');
  }, [hasUnsavedChanges, itinerary.length]);

  const loadTrip = useCallback((trip: SavedTrip) => {
    applyTrip(trip, null);
    setSavedTripsDialogOpen(false);
    toast.success(`Loaded "${trip.name}"`);
  }, [applyTrip]);

  const deleteTrip = useCallback(
    async (tripId: string) => {
      try {
        setDeletingTripId(tripId);
        await api.delete(`/trips/${tripId}`);
        toast.success('Trip deleted successfully');

        if (selectedTripId === tripId) {
          const initialName = 'My Nepal Adventure';
          setTripName(initialName);
          setSelectedTripId(null);
          setItinerary([]);
          setBaselineSignature(createSignature(initialName, []));
          setEstimatedRouteDistance(null);
          setPlannedRouteSnackKeys([]);
          setSelectedRouteSnackKey(null);
        }

        await loadData(true);
      } catch (error: unknown) {
        const message =
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
            : 'Failed to delete trip';
        toast.error(message);
      } finally {
        setDeletingTripId('');
      }
    },
    [selectedTripId, loadData]
  );

  const addPlace = useCallback(
    (place: Place) => {
      if (itinerary.some((entry) => entry._id === place._id)) {
        toast.error('Place already exists in itinerary');
        return;
      }
      setItinerary((previous) => [...previous, place]);
      setAddPlaceDialogOpen(false);
    },
    [itinerary]
  );

  const removePlace = useCallback((placeId: string) => {
    setItinerary((previous) => previous.filter((place) => place._id !== placeId));
  }, []);

  const movePlace = useCallback((index: number, direction: 'up' | 'down') => {
    setItinerary((previous) => {
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= previous.length) return previous;

      const cloned = [...previous];
      const [item] = cloned.splice(index, 1);
      cloned.splice(nextIndex, 0, item);
      return cloned;
    });
  }, []);

  const optimizeRoute = useCallback(async () => {
    if (!selectedTripId) {
      toast.error('Save your trip before optimizing the route');
      return;
    }

    setOptimizingRoute(true);
    try {
      const response = await api.post(`/trips/${selectedTripId}/optimize`);
      const optimizedTrip = response.data?.data as SavedTrip | undefined;

      if (!optimizedTrip) {
        toast.error('No optimized trip was returned');
        return;
      }

      applyTrip(optimizedTrip, response.data?.meta?.estimatedDistanceKm ?? null);
      await loadData(true);
      toast.success('Route optimized using nearest-stop sequencing');
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to optimize route';
      toast.error(message);
    } finally {
      setOptimizingRoute(false);
    }
  }, [applyTrip, loadData, selectedTripId]);

  const generateAiTrip = useCallback(async () => {
    const days = Number(aiForm.days);
    const budget = Number(aiForm.budget);

    if (!Number.isFinite(days) || days <= 0) {
      toast.error('Please enter a valid number of days');
      return;
    }

    setGeneratingAiTrip(true);
    try {
      const response = await api.post('/ai/generate-itinerary', {
        days,
        budget: Number.isFinite(budget) ? budget : 0,
        theme: aiForm.theme,
        destination: aiForm.destination,
      });

      const generatedTrip = response.data?.data as SavedTrip | undefined;
      if (!generatedTrip) {
        toast.error('Unable to generate itinerary right now');
        return;
      }

      applyTrip(generatedTrip, null);
      setAiDialogOpen(false);
      await loadData(true);
      toast.success(
        response.data?.provider === 'openai'
          ? 'AI itinerary generated successfully'
          : 'Smart itinerary generated successfully'
      );
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to generate AI itinerary';
      toast.error(message);
    } finally {
      setGeneratingAiTrip(false);
    }
  }, [aiForm.destination, aiForm.budget, aiForm.days, aiForm.theme, applyTrip, loadData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-[56vh] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Plan</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Trip Planner</h1>
          <p className="text-sm text-muted-foreground">
            Arrange destinations day-by-day, visualize routes, and keep your itinerary polished.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Stops',  value: plannerStops.length },
            { label: 'Days',   value: totalDays },
            { label: 'Saved',  value: savedTrips.length },
          ].map((c) => (
            <div key={c.label} className="flex flex-col rounded-xl p-3.5 ring-1 bg-muted/40 ring-border/60">
              <span className="text-2xl font-bold tabular-nums text-foreground">{c.value}</span>
              <span className="mt-0.5 text-xs font-medium text-muted-foreground">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <Compass className="h-6 w-6 text-primary" />
                Trip Planner
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Build a comfortable, day-wise itinerary and keep your travel plan organized.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={startNewTrip}>
                New Trip
              </Button>
              <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Wand2 className="h-4 w-4" />
                    AI Itinerary
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Generate AI Itinerary</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Days</label>
                        <Input
                          type="number"
                          min={1}
                          max={14}
                          value={aiForm.days}
                          onChange={(event) => setAiForm((current) => ({ ...current, days: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Budget (NPR)</label>
                        <Input
                          type="number"
                          min={0}
                          value={aiForm.budget}
                          onChange={(event) => setAiForm((current) => ({ ...current, budget: event.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Theme</label>
                        <select
                          value={aiForm.theme}
                          onChange={(event) => setAiForm((current) => ({ ...current, theme: event.target.value }))}
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="Culture">Culture</option>
                          <option value="Adventure">Adventure</option>
                          <option value="Nature">Nature</option>
                          <option value="Religious">Religious</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Destination Focus</label>
                        <Input
                          value={aiForm.destination}
                          onChange={(event) => setAiForm((current) => ({ ...current, destination: event.target.value }))}
                          placeholder="Nepal, Pokhara, Kathmandu Valley..."
                        />
                      </div>
                    </div>
                    <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                      The planner will create a structured trip from your constraints and save it directly to your trips.
                    </div>
                    <Button className="gap-2" onClick={generateAiTrip} disabled={generatingAiTrip}>
                      {generatingAiTrip ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {generatingAiTrip ? 'Generating...' : 'Generate Itinerary'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={savedTripsDialogOpen} onOpenChange={setSavedTripsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Saved Trips
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Saved Trips</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    {savedTrips.length === 0 ? (
                      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No saved trips yet.
                      </div>
                    ) : (
                      savedTrips.map((trip) => (
                        <Card key={trip._id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{trip.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {trip.places.length} places • {new Date(trip.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => loadTrip(trip)}>
                                  Load
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={deletingTripId === trip._id}
                                  onClick={() => deleteTrip(trip._id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" className="gap-2" disabled={refreshing} onClick={() => loadData(true)}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={optimizeRoute}
                disabled={optimizingRoute || plannerStops.length < 2 || !selectedTripId}
              >
                <Route className="h-4 w-4" />
                {optimizingRoute ? 'Optimizing...' : 'Optimize Route'}
              </Button>

              <Button className="gap-2" onClick={saveTrip} disabled={savingTrip}>
                <Save className="h-4 w-4" />
                {savingTrip ? 'Saving...' : selectedTripId ? 'Update Trip' : 'Save Trip'}
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
            <Input value={tripName} onChange={(event) => setTripName(event.target.value)} placeholder="Trip name" />
            <Badge variant={hasUnsavedChanges ? 'secondary' : 'outline'} className="h-10 px-3 text-xs">
              {hasUnsavedChanges ? 'Unsaved changes' : 'Saved'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="premium-stat-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Stops</p>
            <p className="mt-1 text-2xl font-bold">{plannerStops.length}</p>
          </CardContent>
        </Card>
        <Card className="premium-stat-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Estimated Days</p>
            <p className="mt-1 text-2xl font-bold">{totalDays}</p>
          </CardContent>
        </Card>
        <Card className="premium-stat-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Estimated Budget</p>
            <p className="mt-1 text-2xl font-bold">Rs. {estimatedBudget.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="premium-stat-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Mode</p>
            <p className="mt-1 text-2xl font-bold">{selectedTripId ? 'Edit' : 'Create'}</p>
          </CardContent>
        </Card>
        <Card className="premium-stat-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Route Estimate</p>
            <p className="mt-1 text-2xl font-bold">
              {estimatedRouteDistance !== null ? `${estimatedRouteDistance} km` : 'Not optimized'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-lg">
                  <Route className="h-5 w-5 text-primary" />
                  Itinerary
                </span>
                <Dialog open={addPlaceDialogOpen} onOpenChange={setAddPlaceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Place
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Add Place to Itinerary</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-2 md:grid-cols-[1fr_180px]">
                      <Input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search by place name or location"
                      />
                      <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value)}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {categories.map((entry) => (
                          <option key={entry} value={entry}>
                            {entry === 'all' ? 'All categories' : entry}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      {filteredPlaces.map((place) => {
                        const alreadyAdded = itinerary.some((entry) => entry._id === place._id);
                        return (
                          <button
                            key={place._id}
                            disabled={alreadyAdded}
                            onClick={() => addPlace(place)}
                            className={`w-full rounded-md border p-3 text-left transition ${
                              alreadyAdded
                                ? 'cursor-not-allowed border-border/50 bg-muted/40 opacity-70'
                                : 'border-border hover:border-primary/40 hover:bg-muted/30'
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-md">
                                <Image
                                  src={place.images?.[0] || '/placeholder.svg'}
                                  alt={place.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{place.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{place.location.address}</p>
                                <div className="mt-1 flex gap-1.5">
                                  <Badge variant="outline" className="text-xs">
                                    {place.category}
                                  </Badge>
                                  {place.duration && (
                                    <Badge variant="secondary" className="text-xs">
                                      {place.duration}
                                    </Badge>
                                  )}
                                  {alreadyAdded && (
                                    <Badge variant="secondary" className="text-xs">
                                      Added
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plannerStops.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Add destinations to start planning your trip.
                </div>
              ) : (
                plannerStops.map((stop, index) => (
                  <Card
                    key={stop.place._id}
                    className={selectedMapStopId === stop.place._id ? 'ring-1 ring-primary/40' : ''}
                  >
                    <CardContent className="p-3">
                      <div className="flex gap-3 cursor-pointer" onClick={() => setSelectedMapStopId(stop.place._id)}>
                        <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-md">
                          <Image
                            src={stop.place.images?.[0] || '/placeholder.svg'}
                            alt={stop.place.name}
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{stop.place.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{stop.place.location.address}</p>
                            </div>
                            <Badge variant="outline">Day {stop.day}</Badge>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge variant="secondary" className="text-xs">
                              {stop.place.category}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {stop.daysNeeded} day(s)
                            </Badge>
                          </div>

                          <div className="mt-3 flex gap-1.5">
                            <Button
                              size="icon"
                              variant="outline"
                              disabled={index === 0}
                              onClick={() => movePlace(index, 'up')}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              disabled={index === plannerStops.length - 1}
                              onClick={() => movePlace(index, 'down')}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => removePlace(stop.place._id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Comfort Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Keep 1 light day after long trek segments.</p>
              <p>• Add buffer time for weather-related delays in mountain regions.</p>
              <p>• Book guides early for high-demand seasons (Oct-Nov, Mar-Apr).</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapIcon className="h-5 w-5 text-primary" />
                Route Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mapMarkers.length === 0 ? (
                <div className="flex h-[420px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  Map preview will appear after adding places.
                </div>
              ) : (
                <div className="h-[420px]">
                  <UserExploreMap
                    markers={mapMarkers}
                    selectedMarkerId={selectedMapStopId}
                    onSelectMarker={setSelectedMapStopId}
                    userLocation={null}
                    routePath={routePath}
                    routeSnackStops={routeSnacks}
                    selectedRouteSnackKey={selectedRouteSnackKey}
                    plannedRouteSnackKeys={plannedRouteSnackKeys}
                    onSelectRouteSnack={setSelectedRouteSnackKey}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-3 text-lg">
                <span className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-orange-500" />
                  Food Stops Near Route
                </span>
                <span className="flex items-center gap-2">
                  {plannedRouteSnacks.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {plannedRouteSnacks.length} planned
                    </Badge>
                  )}
                  {loadingRouteSnacks && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {routePath.length < 2 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Add at least two destinations to scan for food stops along the route.
                </div>
              ) : loadingRouteSnacks ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Searching cafes, quick bites, and restaurants near this route...
                </div>
              ) : routeSnacks.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No food stops found in the current route corridor.
                </div>
              ) : (
                <>
                  {selectedRouteSnack && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-900/60 dark:bg-orange-950/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-orange-950 dark:text-orange-100">
                            {selectedRouteSnack.name}
                          </p>
                          <p className="mt-1 text-xs text-orange-900/75 dark:text-orange-100/75">
                            {selectedRouteSnack.segmentLabel}
                          </p>
                        </div>
                        <Badge className="bg-orange-500 text-white hover:bg-orange-500">
                          {selectedRouteSnack.detourLabel}
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <div className="h-1.5 overflow-hidden rounded-full bg-orange-200 dark:bg-orange-900/50">
                          <div
                            className="h-full rounded-full bg-orange-500"
                            style={{ width: `${Math.min(Math.max(selectedRouteSnack.routeProgress, 0), 100)}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-orange-900/70 dark:text-orange-100/70">
                          <span>Start</span>
                          <span>{selectedRouteSnack.routeProgress}% along route</span>
                          <span>Finish</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3 w-full gap-2"
                        variant={plannedRouteSnackKeys.includes(selectedRouteSnack.key) ? 'outline' : 'default'}
                        onClick={() => togglePlannedRouteSnack(selectedRouteSnack.key)}
                      >
                        {plannedRouteSnackKeys.includes(selectedRouteSnack.key) ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {plannedRouteSnackKeys.includes(selectedRouteSnack.key)
                          ? 'Planned as route pause'
                          : 'Add as route pause'}
                      </Button>
                    </div>
                  )}

                  {plannedRouteSnacks.length > 0 && (
                    <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-xs text-teal-950 dark:border-teal-900/60 dark:bg-teal-950/20 dark:text-teal-100">
                      <div className="mb-2 flex items-center gap-2 font-semibold">
                        <Clock3 className="h-3.5 w-3.5" />
                        Planned pauses
                      </div>
                      <div className="space-y-1">
                        {plannedRouteSnacks.map((snack) => (
                          <button
                            key={snack.key}
                            type="button"
                            className="block w-full truncate text-left hover:underline"
                            onClick={() => setSelectedRouteSnackKey(snack.key)}
                          >
                            {snack.timingLabel}: {snack.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {routeSnackDetails.slice(0, 8).map((snack) => {
                      const isSelected = snack.key === selectedRouteSnackKey;
                      const isPlanned = plannedRouteSnackKeys.includes(snack.key);

                      return (
                        <div
                          key={snack.key}
                          className={`rounded-md border p-3 transition ${
                            isSelected
                              ? 'border-orange-300 bg-orange-50 text-orange-950 dark:bg-orange-950/20 dark:text-orange-100'
                              : 'border-border hover:border-orange-300/60 hover:bg-muted/40'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedRouteSnackKey(snack.key)}
                            className="w-full text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                                  isPlanned ? 'bg-teal-700' : 'bg-orange-500'
                                }`}
                              >
                                {snack.initials}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{snack.name}</span>
                                <span className="block text-xs text-muted-foreground">
                                  {snack.typeLabel} | {snack.detourLabel}
                                </span>
                              </span>
                            </div>
                            <div className="mt-2 grid gap-1 pl-11 text-xs text-muted-foreground">
                              <span>{snack.segmentLabel}</span>
                              <span>{snack.timingLabel}</span>
                            </div>
                          </button>
                          <div className="mt-2 flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant={isPlanned ? 'outline' : 'secondary'}
                              className="h-8 gap-1.5"
                              onClick={() => togglePlannedRouteSnack(snack.key)}
                            >
                              {isPlanned ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                              {isPlanned ? 'Added' : 'Add pause'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Trip Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Stops</span>
                <span className="font-medium">{plannerStops.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Days</span>
                <span className="font-medium">{totalDays}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Budget Estimate</span>
                <span className="font-medium">Rs. {estimatedBudget.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Mode</span>
                <span className="font-medium">{selectedTripId ? 'Editing saved trip' : 'New draft'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Optimized Route</span>
                <span className="font-medium">
                  {estimatedRouteDistance !== null ? `${estimatedRouteDistance} km est.` : 'Not yet'}
                </span>
              </div>
              <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                Budget uses a rough comfort-travel estimate of <span className="font-semibold">Rs. 4,500/day</span>.
              </div>

              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  {plannerStops.length === 0
                    ? 'Add at least one destination to find matching guides.'
                    : recommendedSpecialization
                      ? `Recommended guide focus: ${recommendedSpecialization}`
                      : 'Find available local guides for your current plan.'}
                </p>
                {plannerStops.length === 0 ? (
                  <Button className="mt-3 w-full gap-2" disabled>
                    <Users className="h-4 w-4" />
                    Find Available Guides
                  </Button>
                ) : (
                  <Button asChild className="mt-3 w-full gap-2">
                    <Link href={findGuidesHref}>
                      <Users className="h-4 w-4" />
                      Find Available Guides
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
