'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  Clock3,
  Coffee,
  LocateFixed,
  MapPin,
  Navigation,
  Route,
  Utensils,
} from 'lucide-react';

const MapAdvanced = dynamic(() => import('@/components/MapAdvanced'), { ssr: false });

const foodModes = [
  {
    title: 'Tea break',
    detail: 'Cafes and small stops near your live position.',
    icon: Coffee,
  },
  {
    title: 'Quick bite',
    detail: 'Fast food and casual places for short route pauses.',
    icon: Clock3,
  },
  {
    title: 'Meal stop',
    detail: 'Restaurants that work better before longer travel legs.',
    icon: Utensils,
  },
];

export default function UserSnacksPage() {
  const [center, setCenter] = useState<[number, number]>([27.7172, 85.324]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => { /* fallback to Kathmandu */ }
    );
  }, []);

  return (
    <div className="space-y-5 pb-20 lg:pb-8">
      <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Food Finder</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Nearby Snacks</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Cafes, quick bites, and restaurants around your current route.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/user/explore">
              <Button size="sm" className="gap-2">
                <MapPin className="h-4 w-4" />
                Explore Places
              </Button>
            </Link>
            <Link href="/user/trips">
              <Button size="sm" variant="outline" className="gap-2">
                <Route className="h-4 w-4" />
                Trips
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {foodModes.map(({ title, detail, icon: Icon }) => (
          <Card key={title}>
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/70">
            <div>
              <CardTitle>Food Map</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Live location, nearby food points, and walking route preview
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <LocateFixed className="h-3.5 w-3.5" />
              3 km
            </Badge>
          </CardHeader>
          <CardContent className="p-3 md:p-4">
            <div className="h-[62vh] min-h-[440px] overflow-hidden rounded-lg border border-border">
              <MapAdvanced
                center={center}
                zoom={14}
                height="100%"
                snackFinderEnabled
                snackFinderAutoSearch
                snackSearchRadius={3000}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trip Fit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ['Closest first', 'Sorted by distance from your location.'],
                ['Route ready', 'Select a place to draw directions.'],
                ['Map focused', 'Results stay visible beside your current position.'],
              ].map(([title, detail]) => (
                <div key={title} className="flex gap-3 rounded-lg border border-border/70 p-3">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Navigation className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Continue planning</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Add food stops around saved destinations.
                  </p>
                </div>
                <Link
                  href="/user/wishlist"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Open saved places"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
