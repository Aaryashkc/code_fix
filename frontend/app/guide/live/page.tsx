'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import {
  buildLiveTripMarkers,
  getLiveTripEventLabel,
  prependLiveTripEvent,
  type LiveTripEvent,
  LiveTripSession,
  upsertLiveTripSession,
} from '@/lib/liveTrip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Bed, MapPinned, ShieldAlert, Radio, Utensils } from 'lucide-react';
import type { ExploreMarker } from '@/components/map/UserExploreMap';
import { fetchSnacksAlongRoute, type RouteSnackStop } from '@/lib/overpassService';
import { fetchRoadRoute } from '@/lib/routeService';
import {
  buildLiveTripWaypoints,
  formatNearbyDistance,
  formatRouteDistance,
  getRouteStopKey,
  getRouteStopLabel,
  isLodgingStop,
} from '@/lib/liveTripRoute';

const UserExploreMap = dynamic(() => import('@/components/map/UserExploreMap'), { ssr: false });

export default function GuideLiveTripsPage() {
  const searchParams = useSearchParams();
  const requestedBookingId = searchParams.get('bookingId');
  const { socket, isConnected, joinTripRoom, leaveTripRoom } = useSocket();
  const [sessions, setSessions] = useState<LiveTripSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [roadRoutePath, setRoadRoutePath] = useState<[number, number][]>([]);
  const [roadRouteDistance, setRoadRouteDistance] = useState<number | null>(null);
  const [routeStops, setRouteStops] = useState<RouteSnackStop[]>([]);
  const [routeStopsLoading, setRouteStopsLoading] = useState(false);
  const [selectedRouteStopKey, setSelectedRouteStopKey] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await api.get('/live-trips');
      const nextSessions = response.data?.data || [];
      setSessions(nextSessions);
      setSelectedBookingId((current) => {
        if (current && nextSessions.some((session: LiveTripSession) => session.bookingId === current)) {
          return current;
        }

        if (requestedBookingId && nextSessions.some((session: LiveTripSession) => session.bookingId === requestedBookingId)) {
          return requestedBookingId;
        }

        return nextSessions[0]?.bookingId || '';
      });
    } catch (error) {
      console.error('Failed to load guide live trips:', error);
      toast.error('Failed to load live trip monitor');
    } finally {
      setLoading(false);
    }
  }, [requestedBookingId]);

  useEffect(() => {
    fetchSessions();
    const interval = window.setInterval(fetchSessions, 25000);
    return () => window.clearInterval(interval);
  }, [fetchSessions]);

  useEffect(() => {
    if (!isConnected || !selectedBookingId) return;

    void joinTripRoom(selectedBookingId).catch((error: Error) => {
      toast.error(error.message || 'Unable to join trip room');
    });

    return () => {
      void leaveTripRoom(selectedBookingId).catch(() => {});
    };
  }, [isConnected, joinTripRoom, leaveTripRoom, selectedBookingId]);

  useEffect(() => {
    if (!socket) return;

    const handleState = (payload: LiveTripSession) => {
      setSessions((current) => upsertLiveTripSession(current, payload));
    };

    const handleLocationUpdate = (payload: { bookingId: string; latestLocation: LiveTripSession['latestLocation'] }) => {
      setSessions((current) => upsertLiveTripSession(current, {
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
      event?: LiveTripEvent;
    }) => {
      setSessions((current) => upsertLiveTripSession(current, {
        bookingId: payload.bookingId,
        lastSOS: {
          message: payload.message,
          triggeredAt: payload.triggeredAt,
          lat: payload.lat,
          lng: payload.lng,
        },
        isLive: true,
      }));

      toast.error(`SOS alert from booking ${payload.bookingId}`);
    };

    const handleEventRecorded = (payload: { bookingId: string; event: LiveTripEvent }) => {
      setSessions((current) => prependLiveTripEvent(current, payload.bookingId, payload.event));
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

  const selectedSession = useMemo(
    () => sessions.find((session) => session.bookingId === selectedBookingId) || null,
    [sessions, selectedBookingId]
  );

  const mapMarkers = useMemo<ExploreMarker[]>(
    () => buildLiveTripMarkers(selectedSession?.destinations || []),
    [selectedSession]
  );

  const routeWaypoints = useMemo(() => buildLiveTripWaypoints(selectedSession), [selectedSession]);
  const routePath = roadRoutePath.length > 1 ? roadRoutePath : routeWaypoints;

  useEffect(() => {
    let cancelled = false;

    async function loadRouteDetails() {
      setRoadRoutePath([]);
      setRoadRouteDistance(null);
      setRouteStops([]);
      setSelectedRouteStopKey(null);

      if (routeWaypoints.length < 2) {
        setRouteStopsLoading(false);
        return;
      }

      setRouteStopsLoading(true);
      try {
        const roadRoute = await fetchRoadRoute(routeWaypoints);
        const path = roadRoute?.coordinates?.length ? roadRoute.coordinates : routeWaypoints;
        if (cancelled) return;

        setRoadRoutePath(path);
        setRoadRouteDistance(roadRoute?.distanceMeters || null);
        const stops = await fetchSnacksAlongRoute(path, 800);
        if (!cancelled) {
          setRouteStops(stops);
          setSelectedRouteStopKey(stops[0] ? getRouteStopKey(stops[0]) : null);
        }
      } catch (error) {
        console.error('Failed to load guide live route details:', error);
        if (!cancelled) {
          setRoadRoutePath(routeWaypoints);
          setRoadRouteDistance(null);
          setRouteStops([]);
        }
      } finally {
        if (!cancelled) setRouteStopsLoading(false);
      }
    }

    loadRouteDetails();
    return () => {
      cancelled = true;
    };
  }, [routeWaypoints]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-[60vh] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="premium-stat-card">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Confirmed Trips</p>
            <p className="mt-2 text-2xl font-bold">{sessions.length}</p>
          </CardContent>
        </Card>
        <Card className="premium-stat-card">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Live Right Now</p>
            <p className="mt-2 text-2xl font-bold">{sessions.filter((session) => session.isLive).length}</p>
          </CardContent>
        </Card>
        <Card className="premium-stat-card">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Connection</p>
            <p className="mt-2 text-2xl font-bold">{isConnected ? 'Ready' : 'Offline'}</p>
          </CardContent>
        </Card>
      </div>

      {sessions.length === 0 ? (
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Radio className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold">No active trips yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                When tourists book confirmed trips with you, they'll appear here for live monitoring.
                This dashboard will auto-refresh every 25 seconds.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Trips To Monitor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No confirmed trips are assigned to you yet.
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.bookingId}
                  onClick={() => setSelectedBookingId(session.bookingId)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    session.bookingId === selectedBookingId
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/35 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{session.tourist?.name || 'Traveler'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.booking.startDate).toLocaleDateString()} - {new Date(session.booking.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={session.isLive ? 'default' : 'outline'}>
                      {session.isLive ? 'Live' : 'Waiting'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {session.destinations.map((destination) => destination.name).slice(0, 2).join(', ')}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <MapPinned className="h-5 w-5 text-primary" />
                  Live Traveler Map
                  <Badge variant="outline" className="ml-auto">{formatRouteDistance(roadRouteDistance)}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSession ? (
                <div className="h-[480px]">
                  <UserExploreMap
                    markers={mapMarkers}
                    selectedMarkerId={mapMarkers[0]?.id}
                    onSelectMarker={() => {}}
                    userLocation={
                      selectedSession.latestLocation
                        ? [selectedSession.latestLocation.lat, selectedSession.latestLocation.lng]
                        : null
                    }
                    userLocationStatus={selectedSession.lastSOS ? 'sos' : 'default'}
                    routePath={routePath}
                    routeSnackStops={routeStops}
                    selectedRouteSnackKey={selectedRouteStopKey}
                    onSelectRouteSnack={setSelectedRouteStopKey}
                  />
                </div>
              ) : (
                <div className="flex h-[480px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  Select a trip to start monitoring.
                </div>
              )}
            </CardContent>
          </Card>

          {selectedSession && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Traveler</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-medium">{selectedSession.tourist?.name}</p>
                  <p className="text-muted-foreground">{selectedSession.tourist?.email}</p>
                  <p className="text-muted-foreground">{selectedSession.booking.packageType}</p>
                </CardContent>
              </Card>
              <Card className="border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Room Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Socket</span>
                    <Badge variant={isConnected ? 'default' : 'outline'}>{isConnected ? 'Connected' : 'Offline'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Participants</span>
                    <span className="font-medium">{selectedSession.participantCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Live update</span>
                    <span className="font-medium">
                      {selectedSession.latestLocation
                        ? new Date(selectedSession.latestLocation.updatedAt).toLocaleTimeString()
                        : 'Pending'}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Safety</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`h-4 w-4 ${selectedSession.lastSOS ? 'text-red-600' : 'text-muted-foreground'}`} />
                    <span className="font-medium">{selectedSession.lastSOS ? 'SOS active' : 'No current alert'}</span>
                  </div>
                  {selectedSession.lastSOS && (
                    <p className="text-red-700">
                      {selectedSession.lastSOS.message} at {new Date(selectedSession.lastSOS.triggeredAt).toLocaleTimeString()}
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="border border-border/60 shadow-sm lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base">Hotels & Restaurants Near Route</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {routeStopsLoading ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                      Drawing the road route and checking nearby places...
                    </div>
                  ) : routePath.length < 2 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                      The route appears after the traveler shares location or the booking has two mapped stops.
                    </div>
                  ) : routeStops.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                      No restaurants or hotels were found near this route yet.
                    </div>
                  ) : (
                    routeStops.slice(0, 9).map((stop) => {
                      const stopKey = getRouteStopKey(stop);
                      const selected = stopKey === selectedRouteStopKey;
                      const lodging = isLodgingStop(stop.type);

                      return (
                        <button
                          key={stopKey}
                          type="button"
                          onClick={() => setSelectedRouteStopKey(stopKey)}
                          className={`rounded-lg border p-3 text-left transition ${
                            selected ? 'border-primary bg-primary/5' : 'hover:border-primary/40 hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {lodging ? <Bed className="mt-0.5 h-4 w-4 text-blue-600" /> : <Utensils className="mt-0.5 h-4 w-4 text-orange-600" />}
                            <div className="min-w-0">
                              <p className="truncate font-medium">{stop.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {getRouteStopLabel(stop.type)} - {formatNearbyDistance(stop.distanceFromRoute)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </CardContent>
              </Card>
              <Card className="border border-border/60 shadow-sm lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base">Live Event History</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedSession.recentEvents?.length ? (
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      {selectedSession.recentEvents.slice(0, 4).map((event) => (
                        <div key={event._id} className="rounded-lg border p-3 text-sm">
                          <p className={event.type === 'sos_triggered' ? 'font-semibold text-red-600' : 'font-semibold'}>
                            {getLiveTripEventLabel(event)}
                          </p>
                          <p className="mt-1 text-xs capitalize text-muted-foreground">
                            {event.actorRole || 'system'} - {new Date(event.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Location checkpoints and SOS alerts will be saved here for review.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
