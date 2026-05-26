'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';
const MapAdvanced = dynamic(() => import('@/components/MapAdvanced'), { ssr: false });
const UserExploreMap = dynamic(() => import('@/components/map/UserExploreMap'), { ssr: false });
import { Skeleton } from '@/components/ui/skeleton';
import { useSocket } from '@/context/SocketContext';
import {
  buildLiveTripMarkers,
  buildLiveTripRoutePath,
  getLiveTripEventLabel,
  prependLiveTripEvent,
  type LiveTripEvent,
  LiveTripSession,
  upsertLiveTripSession,
} from '@/lib/liveTrip';
import type { ExploreMarker } from '@/components/map/UserExploreMap';
import { Activity, MapPinned, ShieldAlert } from 'lucide-react';

interface Place {
  _id: string;
  name: string;
  category: string;
  region: string;
  location: {
    coordinates: [number, number];
    address: string;
  };
  verificationStatus: string;
}

export default function AdminMapPage() {
  const { socket, isConnected, joinTripRoom, leaveTripRoom } = useSocket();
  const [places, setPlaces] = useState<Place[]>([]);
  const [liveTrips, setLiveTrips] = useState<LiveTripSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedLiveBookingId, setSelectedLiveBookingId] = useState('');

  const fetchPlaces = useCallback(async () => {
    try {
      const response = await api.get('/destinations');
      setPlaces(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch places:', error);
    }
  }, []);

  const fetchLiveTrips = useCallback(async () => {
    try {
      const response = await api.get('/live-trips');
      const sessions = response.data?.data || [];
      setLiveTrips(sessions);
      setSelectedLiveBookingId((current) => current || sessions[0]?.bookingId || '');
    } catch (error) {
      console.error('Failed to fetch live trips:', error);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void Promise.all([fetchPlaces(), fetchLiveTrips()]).finally(() => setLoading(false));
    });
  }, [fetchLiveTrips, fetchPlaces]);

  useEffect(() => {
    const interval = window.setInterval(fetchLiveTrips, 30000);
    return () => window.clearInterval(interval);
  }, [fetchLiveTrips]);

  useEffect(() => {
    if (!isConnected || !selectedLiveBookingId) return;

    void joinTripRoom(selectedLiveBookingId).catch(() => {});
    return () => {
      void leaveTripRoom(selectedLiveBookingId).catch(() => {});
    };
  }, [isConnected, joinTripRoom, leaveTripRoom, selectedLiveBookingId]);

  useEffect(() => {
    if (!socket) return;

    const handleState = (payload: LiveTripSession) => {
      setLiveTrips((current) => upsertLiveTripSession(current, payload));
    };

    const handleLocationUpdate = (payload: { bookingId: string; latestLocation: LiveTripSession['latestLocation'] }) => {
      setLiveTrips((current) => upsertLiveTripSession(current, {
        bookingId: payload.bookingId,
        latestLocation: payload.latestLocation,
        isLive: true,
      }));
    };

    const handleSos = (payload: {
      bookingId: string;
      message: string;
      triggeredAt: string;
      lat?: number | null;
      lng?: number | null;
      triggeredBy?: string;
      event?: LiveTripEvent;
    }) => {
      setLiveTrips((current) => upsertLiveTripSession(current, {
        bookingId: payload.bookingId,
        lastSOS: {
          message: payload.message,
          triggeredAt: payload.triggeredAt,
          lat: payload.lat,
          lng: payload.lng,
          triggeredBy: payload.triggeredBy,
        },
        isLive: true,
      }));
    };

    const handleEventRecorded = (payload: { bookingId: string; event: LiveTripEvent }) => {
      setLiveTrips((current) => prependLiveTripEvent(current, payload.bookingId, payload.event));
    };

    socket.on('liveTripState', handleState);
    socket.on('tripLocationUpdated', handleLocationUpdate);
    socket.on('SOS_ALERT', handleSos);
    socket.on('liveTripEventRecorded', handleEventRecorded);

    return () => {
      socket.off('liveTripState', handleState);
      socket.off('tripLocationUpdated', handleLocationUpdate);
      socket.off('SOS_ALERT', handleSos);
      socket.off('liveTripEventRecorded', handleEventRecorded);
    };
  }, [socket]);

  const markers = places
    .filter(place => place.location?.coordinates)
    .map((place) => ({
      position: [place.location.coordinates[1], place.location.coordinates[0]] as [number, number],
      title: place.name,
      category: place.category,
      onClick: () => setSelectedPlace(place),
    }));

  const selectedLiveTrip = useMemo(
    () => liveTrips.find((trip) => trip.bookingId === selectedLiveBookingId) || null,
    [liveTrips, selectedLiveBookingId]
  );

  const liveTripMarkers = useMemo<ExploreMarker[]>(
    () => buildLiveTripMarkers(selectedLiveTrip?.destinations || []),
    [selectedLiveTrip]
  );

  const liveTripRoutePath = useMemo(
    () => buildLiveTripRoutePath(selectedLiveTrip?.destinations || []),
    [selectedLiveTrip]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
        </div>
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Skeleton className="h-[600px] w-full rounded-xl" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Live Map</h1>
        <p className="text-muted-foreground mt-1">Monitor destinations, live trips, and emergency signals from one surface</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="premium-stat-card">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total Places</p>
            <p className="mt-2 text-2xl font-bold">{places.length}</p>
          </CardContent>
        </Card>
        <Card className="premium-stat-card">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Live Sessions</p>
            <p className="mt-2 text-2xl font-bold">{liveTrips.filter((trip) => trip.isLive).length}</p>
          </CardContent>
        </Card>
        <Card className="premium-stat-card">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">SOS Alerts</p>
            <p className="mt-2 text-2xl font-bold">{liveTrips.filter((trip) => trip.lastSOS).length}</p>
          </CardContent>
        </Card>
        <Card className="premium-stat-card">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Socket</p>
            <p className="mt-2 text-2xl font-bold">{isConnected ? 'Ready' : 'Offline'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="h-5 w-5 text-primary" />
              Live Trip Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedLiveTrip ? (
              <div className="h-[520px]">
                <UserExploreMap
                  markers={liveTripMarkers}
                  selectedMarkerId={liveTripMarkers[0]?.id}
                  onSelectMarker={() => {}}
                  userLocation={
                    selectedLiveTrip.latestLocation
                      ? [selectedLiveTrip.latestLocation.lat, selectedLiveTrip.latestLocation.lng]
                      : null
                  }
                  userLocationStatus={selectedLiveTrip.lastSOS ? 'sos' : 'default'}
                  routePath={liveTripRoutePath}
                />
              </div>
            ) : (
              <div className="flex h-[520px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No live sessions selected yet.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {liveTrips.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  No confirmed bookings available for monitoring.
                </div>
              ) : (
                liveTrips.map((trip) => (
                  <button
                    key={trip.bookingId}
                    onClick={() => setSelectedLiveBookingId(trip.bookingId)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      trip.bookingId === selectedLiveBookingId
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/35 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{trip.tourist?.name || 'Traveler'}</p>
                        <p className="text-xs text-muted-foreground">{trip.guide?.name || 'Guide pending'}</p>
                      </div>
                      <Badge variant={trip.lastSOS ? 'destructive' : trip.isLive ? 'default' : 'outline'}>
                        {trip.lastSOS ? 'SOS' : trip.isLive ? 'Live' : 'Standby'}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" />
                      {trip.latestLocation
                        ? `Updated ${new Date(trip.latestLocation.updatedAt).toLocaleTimeString()}`
                        : 'No live ping yet'}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {selectedLiveTrip && (
            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Selected Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Traveler</span>
                  <span className="font-medium">{selectedLiveTrip.tourist?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Guide</span>
                  <span className="font-medium">{selectedLiveTrip.guide?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Participants</span>
                  <span className="font-medium">{selectedLiveTrip.participantCount}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <ShieldAlert className={`h-4 w-4 ${selectedLiveTrip.lastSOS ? 'text-red-600' : 'text-muted-foreground'}`} />
                  <span className="text-sm">
                    {selectedLiveTrip.lastSOS
                      ? `SOS at ${new Date(selectedLiveTrip.lastSOS.triggeredAt).toLocaleTimeString()}`
                      : 'No current emergency alert'}
                  </span>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Recent evidence</p>
                  {selectedLiveTrip.recentEvents?.length ? (
                    <div className="space-y-2">
                      {selectedLiveTrip.recentEvents.slice(0, 5).map((event) => (
                        <div key={event._id} className="flex items-start justify-between gap-3 text-xs">
                          <div>
                            <p className={event.type === 'sos_triggered' ? 'font-semibold text-red-600' : 'font-medium'}>
                              {getLiveTripEventLabel(event)}
                            </p>
                            <p className="capitalize text-muted-foreground">{event.actorRole || 'system'}</p>
                          </div>
                          <span className="text-muted-foreground">
                            {new Date(event.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No persisted events yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              <MapAdvanced
                center={[27.7172, 85.324]}
                zoom={7}
                height="600px"
                markers={markers}
                snackFinderEnabled={false}
              />
            </CardContent>
          </Card>
        </div>

        {/* Selected Place Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Place Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPlace ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedPlace.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedPlace.location.address}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Badge variant="outline">{selectedPlace.category}</Badge>
                    <Badge variant="outline">{selectedPlace.region}</Badge>
                    <Badge variant={selectedPlace.verificationStatus === 'approved' ? 'default' : 'secondary'}>
                      {selectedPlace.verificationStatus}
                    </Badge>
                  </div>

                  <div className="text-sm">
                    <p className="text-muted-foreground">Coordinates:</p>
                    <p className="font-mono text-xs">
                      {selectedPlace.location.coordinates[1].toFixed(4)}, {selectedPlace.location.coordinates[0].toFixed(4)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Click on a marker to view details</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Places</span>
                <span className="font-semibold">{places.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Approved</span>
                <span className="font-semibold">
                  {places.filter(p => p.verificationStatus === 'approved').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="font-semibold">{places.filter(p => p.verificationStatus === 'pending').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Live sessions</span>
                <span className="font-semibold">{liveTrips.filter((trip) => trip.isLive).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">SOS count</span>
                <span className="font-semibold text-red-600">{liveTrips.filter((trip) => trip.lastSOS).length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

