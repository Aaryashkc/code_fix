'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Star, MapPin, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Place {
  _id: string;
  name: string;
  category?: string;
  images: string[];
  rating: number;
  reviewCount?: number;
  location: { address?: string; coordinates?: [number, number] } | string;
  shortDescription?: string;
  priceRange?: string;
}

export default function WishlistPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const response = await api.get('/wishlist');
      // API returns { data: { destinations: [...] } }
      const wishlist = response.data.data;
      setPlaces(wishlist?.destinations || []);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (placeId: string) => {
    try {
      await api.delete(`/wishlist/${placeId}`);
      setPlaces(places.filter((p) => p._id !== placeId));
      toast.success('Removed from saved places');
    } catch (error) {
      toast.error('Failed to remove from wishlist');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden border">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Wishlist</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Saved Places</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Keep your dream destinations organized and jump back into planning anytime.
            </p>
          </div>
          <div className="flex flex-col items-center rounded-xl p-3.5 ring-1 bg-rose-50 ring-rose-200 dark:bg-rose-950/30 dark:ring-rose-800/50 min-w-[100px]">
            <span className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">{places.length}</span>
            <span className="mt-0.5 text-xs font-medium text-muted-foreground">Saved</span>
          </div>
        </div>
      </div>

      {places.length === 0 ? (
        <Card className="border border-dashed border-border/60 shadow-none">
          <CardContent className="py-16 text-center">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No saved places yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Start exploring and save your favorite places to plan your trip later
            </p>
            <Link href="/user/places">
              <Button className="mt-6">
                <MapPin className="h-4 w-4 mr-2" />
                Explore Places
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {places.map((place) => (
            <Card key={place._id} className="group overflow-hidden transition-all hover:-translate-y-1">
              <Link href={`/places/${place._id}`}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={place.images[0] || '/placeholder.svg'}
                    alt={place.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {place.category && (
                    <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs">
                      {place.category}
                    </Badge>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      removeFromWishlist(place._id);
                    }}
                    className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm transition-colors hover:bg-card"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </Link>
              <CardContent className="p-4">
                <Link href={`/places/${place._id}`}>
                  <h3 className="font-semibold line-clamp-1 hover:text-primary transition-colors">
                    {place.name}
                  </h3>
                </Link>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="line-clamp-1">
                    {typeof place.location === 'string' ? place.location : place.location?.address || 'Nepal'}
                  </span>
                </div>
                {place.shortDescription && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {place.shortDescription}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className="text-sm font-medium">{place.rating || 0}</span>
                  {place.reviewCount !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      ({place.reviewCount})
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
