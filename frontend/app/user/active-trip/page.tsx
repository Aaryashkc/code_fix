'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Activity, Loader2, LocateFixed, MapPinned, ShieldAlert, Siren, Wifi } from 'lucide-react';
import type { ExploreMarker } from '@/components/map/UserExploreMap';

const UserExploreMap = dynamic(() => import('@/components/map/UserExploreMap'), { ssr: false });

export default function ActiveTripPage() {
  const searchParams = useSearchParams();
  const requestedBookingId = searchParams.get('bookingId');
  const { socket, isConnected, joinTripRoom, leaveTripRoom, triggerSOS, updateLocation } = useSocket();

  const [sessions, setSessions] = useState<LiveTripSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [sharingLocation, setSharingLocation] = useState(false);
  const [sendingSOS, setSendingSOS] = useState(false);

  const selectedBookingIdRef = useRef('');
  const watchIdRef = useRef<number | null>(null);

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
      console.error('Failed to load live trips:', error);
      toast.error('Failed to load active trips');
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
    selectedBookingIdRef.current = selectedBookingId;
  }, [selectedBookingId]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.bookingId === selectedBookingId) || null,
    [sessions, selectedBookingId]
  );

  const mapMarkers = useMemo<ExploreMarker[]>(
    () => buildLiveTripMarkers(selectedSession?.destinations || []),
    [selectedSession]
  );

  const routePath = useMemo(
    () => buildLiveTripRoutePath(selectedSession?.destinations || []),
    [selectedSession]
  );

  useEffect(() => {
    if (!isConnected || !selectedBookingId) return;

    void joinTripRoom(selectedBookingId).catch((error: Error) => {
      toast.error(error.message || 'Unable to join live trip room');
    });

    return () => {
      void leaveTripRoom(selectedBookingId).catch(() => {});
    };
  }, [isConnected, joinTripRoom, leaveTripRoom, selectedBookingId]);

  useEffect(() => {
    if (!socket) return;

    const handleLiveTripState = (payload: LiveTripSession) => {
      setSessions((current) => upsertLiveTripSession(current, payload));
    };

    const handleTripLocationUpdated = (payload: { bookingId: string; latestLocation: LiveTripSession['latestLocation'] }) => {
      setSessions((current) => upsertLiveTripSession(current, {
        bookingId: payload.bookingId,
        latestLocation: payload.latestLocation,
        isLive: true,
      }));
    };

    const handleSosAlert = (payload: {
      bookingId: string;
      message: string;
      triggeredAt: string;
      lat?: number | null;
      lng?: number | null;
      triggeredBy?: string;
      event?: LiveTripEvent;
    }) => {
      setSessions((current) => upsertLiveTripSession(current, {
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

      if (payload.bookingId === selectedBookingIdRef.current) {
        toast.error(payload.message || 'SOS alert sent to guide and admin');
      }
    };

    const handleEventRecorded = (payload: { bookingId: string; event: LiveTripEvent }) => {
      setSessions((current) => prependLiveTripEvent(current, payload.bookingId, payload.event));
    };

    socket.on('liveTripState', handleLiveTripState);
    socket.on('tripLocationUpdated', handleTripLocationUpdated);
    socket.on('SOS_ALERT', handleSosAlert);
    socket.on('liveTripEventRecorded', handleEventRecorded);

    return () => {
      socket.off('liveTripState', handleLiveTripState);
      socket.off('tripLocationUpdated', handleTripLocationUpdated);
      socket.off('SOS_ALERT', handleSosAlert);
      socket.off('liveTripEventRecorded', handleEventRecorded);
    };
  }, [socket]);

  const stopSharing = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharingLocation(false);
  }, []);

  useEffect(() => stopSharing, [stopSharing]);

  const startSharing = useCallback(() => {
    if (!selectedBookingIdRef.current) {
      toast.error('Select a trip before starting live sharing');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser');
      return;
    }

    if (watchIdRef.current !== null) {
      toast.success('Live location sharing is already active');
      return;
    }

    setSharingLocation(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const payload = {
          bookingId: selectedBookingIdRef.current,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        };

        void updateLocation(payload)
          .then(() => {
            setSessions((current) => upsertLiveTripSession(current, {
              bookingId: payload.bookingId,
              latestLocation: {
                ...payload,
                updatedAt: new Date().toISOString(),
              },
              isLive: true,
            }));
          })
          .catch((error: Error) => {
            console.error('Failed to broadcast location:', error);
          });
      },
      (error) => {
        console.error('Geolocation watch failed:', error);
        toast.error('Unable to access your live location');
        stopSharing();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    toast.success('Live location sharing started');
  }, [stopSharing, updateLocation]);

  const handleTriggerSos = useCallback(async () => {
    if (!selectedSession) {
      toast.error('Select an active trip first');
      return;
    }

    setSendingSOS(true);
    try {
      await triggerSOS({
        bookingId: selectedSession.bookingId,
        message: 'Tourist requested emergency assistance',
        lat: selectedSession.latestLocation?.lat,
        lng: selectedSession.latestLocation?.lng,
      });
      toast.warning('🆘 SOS alert sent to your guide and admin');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to trigger SOS alert';
      toast.error(message);
    } finally {
      setSendingSOS(false);
    }
  }, [selectedSession, triggerSOS]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-[60vh] rounded-xl" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="border border-dashed border-border/60 shadow-none">
        <CardContent className="py-14 text-center">
          <LocateFixed className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="font-medium">No confirmed trips are ready for live tracking yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Once a guide confirms your booking, you can start live location sharing from here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Live Tracking</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Active Trip Console</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Start live location sharing and send an SOS alert instantly if needed.
            </p>
          </div>
          {isConnected ? (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Socket Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
              <span className="text-xs font-semibold text-muted-foreground">Socket Offline</span>
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Eligible Trips', value: sessions.length },
            { label: 'Socket',         value: isConnected ? 'Live' : 'Offline' },
            { label: 'Broadcasting',   value: sharingLocation ? 'On' : 'Off' },
          ].map((c) => (
            <div key={c.label} className="flex flex-col rounded-xl p-3.5 ring-1 bg-muted/40 ring-border/60">
              <span className="text-xl font-bold tabular-nums text-foreground">{c.value}</span>
              <span className="mt-0.5 text-xs font-medium text-muted-foreground">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>My Live Trips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.map((session) => {
              const isSelected = session.bookingId === selectedBookingId;
              return (
                <button
                  key={session.bookingId}
                  onClick={() => {
                    if (sharingLocation) stopSharing();
                    setSelectedBookingId(session.bookingId);
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/35 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{session.guide?.name || 'Assigned guide'}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.booking?.startDate ? new Date(session.booking.startDate).toLocaleDateString() : 'TBD'}
                        {' - '}
                        {session.booking?.endDate ? new Date(session.booking.endDate).toLocaleDateString() : 'TBD'}
                      </p>
                    </div>
                    <Badge variant={session.isLive ? 'default' : 'outline'}>
                      {session.isLive ? 'Live' : 'Ready'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {session.destinations.map((destination) => destination.name).slice(0, 2).join(', ')}
                    {session.destinations.length > 2 ? ` +${session.destinations.length - 2} more` : ''}
                  </p>
                  {session.lastSOS && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      Last SOS: {new Date(session.lastSOS.triggeredAt).toLocaleTimeString()}
                    </div>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border border-border/60 shadow-sm">
            <CardContent className="p-4 md:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">{selectedSession?.guide?.name || 'Guide not assigned'}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession?.booking.packageType} • {selectedSession?.booking.numberOfDays} days • {selectedSession?.booking.groupSize} traveler(s)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={sharingLocation ? 'outline' : 'default'}
                    className="gap-2"
                    onClick={sharingLocation ? stopSharing : startSharing}
                  >
                    {sharingLocation ? <Activity className="h-4 w-4" /> : <LocateFixed className="h-4 w-4" />}
                    {sharingLocation ? 'Stop Sharing' : 'Start Trip'}
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={handleTriggerSos}
                    disabled={sendingSOS}
                  >
                    {sendingSOS ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                    SOS
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPinned className="h-5 w-5 text-primary" />
                  Live Route
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[460px]">
                  <UserExploreMap
                    markers={mapMarkers}
                    selectedMarkerId={mapMarkers[0]?.id}
                    onSelectMarker={() => {}}
                    userLocation={
                      selectedSession?.latestLocation
                        ? [selectedSession.latestLocation.lat, selectedSession.latestLocation.lng]
                        : null
                    }
                    userLocationStatus={selectedSession?.lastSOS ? 'sos' : 'default'}
                    routePath={routePath}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Live Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Socket connection</span>
                    <Badge variant={isConnected ? 'default' : 'outline'}>{isConnected ? 'Connected' : 'Offline'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tracking</span>
                    <span className="font-medium">{sharingLocation ? 'Broadcasting' : 'Not sharing'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Participants in room</span>
                    <span className="font-medium">{selectedSession?.participantCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last update</span>
                    <span className="font-medium">
                      {selectedSession?.latestLocation
                        ? new Date(selectedSession.latestLocation.updatedAt).toLocaleTimeString()
                        : 'Waiting'}
                    </span>
                  </div>
                  {selectedSession?.lastSOS && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Siren className="h-4 w-4" />
                        SOS was triggered
                      </div>
                      <p className="mt-1 text-xs">
                        {new Date(selectedSession.lastSOS.triggeredAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Planned Stops</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedSession?.destinations.map((destination, index) => (
                    <div key={destination._id} className="rounded-lg border p-3">
                      <p className="font-medium">{index + 1}. {destination.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {destination.location?.address || destination.category}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Trip History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedSession?.recentEvents?.length ? (
                    selectedSession.recentEvents.slice(0, 4).map((event) => (
                      <div key={event._id} className="rounded-lg border p-3 text-sm">
                        <p className={event.type === 'sos_triggered' ? 'font-semibold text-red-600' : 'font-medium'}>
                          {getLiveTripEventLabel(event)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Your location checkpoints and SOS actions will appear here.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
