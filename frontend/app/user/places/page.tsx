'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Star, MapPin, X, Grid3x3, List, Sparkles, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface Place {
  _id: string;
  name: string;
  category: string;
  region: string;
  images: string[];
  rating: number;
  reviewCount: number;
  location: { address: string; coordinates: [number, number] };
  shortDescription?: string;
  description: string;
  difficulty?: string;
  duration?: string;
}

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories = ['All', 'Religious', 'Nature', 'Adventure', 'Cultural', 'Urban'];
  const regions = ['All', 'Eastern', 'Central', 'Western', 'Far-Western'];

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    try {
      const response = await api.get('/destinations');
      setPlaces(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch places:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPlaces = useCallback(() => {
    let filtered = [...places];

    if (searchTerm) {
      filtered = filtered.filter((place) =>
        place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.location.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((place) => place.category.toLowerCase() === categoryFilter);
    }

    if (regionFilter !== 'all') {
      filtered = filtered.filter((place) => place.region.toLowerCase() === regionFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating': return b.rating - a.rating;
        case 'popular': return b.reviewCount - a.reviewCount;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

    setFilteredPlaces(filtered);
  }, [places, searchTerm, categoryFilter, regionFilter, sortBy]);

  useEffect(() => {
    filterAndSortPlaces();
  }, [filterAndSortPlaces]);

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setRegionFilter('all');
    setSortBy('rating');
  };

  const hasActiveFilters = searchTerm || categoryFilter !== 'all' || regionFilter !== 'all';

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
          <Skeleton className="h-10 w-36" />
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
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Discover</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Explore Places</h1>
          <p className="text-sm text-muted-foreground">
            Discover trusted destinations across Nepal with better filters and smoother planning.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'All Places',  value: places.length },
            { label: 'Showing',     value: filteredPlaces.length },
            { label: 'Categories',  value: categories.length - 1 },
          ].map((c) => (
            <div key={c.label} className="flex flex-col rounded-xl p-3.5 ring-1 bg-muted/40 ring-border/60">
              <span className="text-2xl font-bold tabular-nums text-foreground">{c.value}</span>
              <span className="mt-0.5 text-xs font-medium text-muted-foreground">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4 md:p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Search & Filters
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search places by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat.toLowerCase()}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Region Filter */}
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((reg) => (
                <SelectItem key={reg} value={reg.toLowerCase()}>
                  {reg}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary">
                Search: {searchTerm}
                <button onClick={() => setSearchTerm('')} className="ml-2">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {categoryFilter !== 'all' && (
              <Badge variant="secondary">
                Category: {categoryFilter}
                <button onClick={() => setCategoryFilter('all')} className="ml-2">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {regionFilter !== 'all' && (
              <Badge variant="secondary">
                Region: {regionFilter}
                <button onClick={() => setRegionFilter('all')} className="ml-2">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredPlaces.length} of {places.length} places
      </div>

      {filteredPlaces.length === 0 ? (
        <Card className="border border-dashed border-border/60 shadow-none">
          <CardContent className="py-1 text-center">
            <p className="text-muted-foreground">No places found matching your criteria</p>
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          : 'space-y-4'
        }>
          {filteredPlaces.map((place) => (
            <Link key={place._id} href={`/places/${place._id}`}>
              <Card className={`group overflow-hidden transition-all ${
                viewMode === 'grid' ? 'hover:-translate-y-1' : ''
              }`}>
                {viewMode === 'grid' ? (
                  <>
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={place.images[0] || '/placeholder.svg'}
                        alt={place.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs">
                        {place.category}
                      </Badge>
                      {place.difficulty && (
                        <Badge className="absolute top-3 right-3 bg-secondary text-secondary-foreground text-xs">
                          {place.difficulty}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-1">{place.name}</h3>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{place.location.address}</span>
                      </div>
                      {place.shortDescription && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {place.shortDescription}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-sm font-medium">{place.rating}</span>
                          <span className="text-xs text-muted-foreground">
                            ({place.reviewCount})
                          </span>
                        </div>
                        {place.duration && (
                          <span className="text-xs text-muted-foreground">{place.duration}</span>
                        )}
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="p-4 flex gap-4">
                    <div className="relative w-48 h-32 flex-shrink-0 overflow-hidden rounded-md">
                      <Image
                        src={place.images[0] || '/placeholder.svg'}
                        alt={place.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{place.name}</h3>
                          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{place.location.address}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{place.category}</Badge>
                          {place.difficulty && (
                            <Badge variant="secondary">{place.difficulty}</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {place.shortDescription || place.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-sm font-medium">{place.rating}</span>
                          <span className="text-xs text-muted-foreground">
                            ({place.reviewCount} reviews)
                          </span>
                        </div>
                        {place.duration && (
                          <span className="text-sm text-muted-foreground">⏱ {place.duration}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
