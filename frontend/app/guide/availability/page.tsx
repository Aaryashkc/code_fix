'use client';

import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, MapPin, Users, Info } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Booking {
  _id:          string;
  tourist:      { name: string; email: string };
  startDate:    string;
  endDate:      string;
  numberOfDays: number;
  status:       string;
  totalPrice:   number;
  groupSize:    number;
  destinations?:{ name: string }[];
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' });

export default function AvailabilityPage() {
  const auth = useContext(AuthContext);
  const [available,        setAvailable]        = useState((auth?.user as any)?.available !== false);
  const [toggling,         setToggling]         = useState(false);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [bookingsLoading,  setBookingsLoading]  = useState(true);

  useEffect(() => {
    api.get('/bookings/my-requests')
      .then(r => {
        const all: Booking[] = r.data.data ?? [];
        setUpcomingBookings(
          all.filter(b => b.status === 'confirmed' && new Date(b.startDate) >= new Date())
             .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        );
      })
      .catch(() => {}) // non-fatal
      .finally(() => setBookingsLoading(false));
  }, []);

  const handleToggle = async () => {
    setToggling(true);
    const next = !available;
    try {
      await api.put('/auth/me', { available: next });
      setAvailable(next);
      toast.success(next ? 'You are now accepting bookings' : 'You are now unavailable for bookings');
    } catch { toast.error('Failed to update availability'); }
    finally { setToggling(false); }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Availability</h1>
        <p className="text-sm text-muted-foreground mt-1">Control when travellers can send you booking requests</p>
      </div>

      {/* ── online/offline toggle ── */}
      <Card className={`border-2 transition-colors ${available ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20' : 'border-border/60 bg-muted/20'}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-base">
                {available ? 'Accepting new bookings' : 'Not accepting bookings'}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {available
                  ? 'Travellers can discover your profile and send requests.'
                  : 'Your profile is hidden from new booking requests.'}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <Badge variant={available ? 'default' : 'secondary'} className={available ? 'bg-emerald-600' : ''}>
                {available ? 'Available' : 'Unavailable'}
              </Badge>
              <Switch checked={available} onCheckedChange={handleToggle} disabled={toggling}
                className="data-[state=checked]:bg-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── info callout ── */}
      <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-4 text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Setting yourself as <strong className="text-foreground">unavailable</strong> hides your profile from the guide listing immediately.
          Existing confirmed bookings are not affected — only new requests are blocked.
        </p>
      </div>

      {/* ── upcoming confirmed tours ── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />Upcoming Confirmed Tours
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="space-y-3">
              {[1,2].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="rounded-xl border border-dashed py-10 text-center space-y-2">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No upcoming confirmed tours. Your calendar is free!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map(b => (
                <div key={b._id} className="rounded-xl border border-border/50 bg-muted/20 p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{b.tourist.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmt(b.startDate)} → {fmt(b.endDate)} · {b.numberOfDays} day{b.numberOfDays !== 1 ? 's' : ''}
                    </p>
                    {b.destinations && b.destinations.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <p className="text-xs text-muted-foreground truncate">
                          {b.destinations.map(d => d.name).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">Rs. {b.totalPrice?.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-1 justify-end text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />{b.groupSize} pax
                    </div>
                    <Badge variant="outline" className="mt-1 text-[10px]">Confirmed</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
