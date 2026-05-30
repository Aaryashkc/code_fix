'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Banknote,
  CheckCircle,
  Clock,
  Filter,
  Languages,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  Users,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { formatNPR } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { GuideListSkeleton } from '@/components/ui/skeleton-cards';

interface Guide {
  _id: string;
  name: string;
  avatar?: string;
  bio?: string;
  rating: number;
  reviewCount: number;
  languages: Array<{ code: string; name: string }>;
  specializations: string[];
  pricePerDay: number;
  experience?: string;
  available: boolean;
  verified: boolean;
  location?: string;
}

const LANGUAGE_OPTIONS = ['All', 'English', 'Nepali', 'Hindi', 'Chinese', 'Japanese', 'Korean'];
const SPECIALIZATION_OPTIONS = ['All', 'Trekking', 'Cultural Tours', 'Adventure', 'Photography', 'Wildlife', 'Spiritual'];
const PRICE_MAX = 50000;
const PAGE_SIZE = 9;

const NORMALIZED_LANG = LANGUAGE_OPTIONS.map((language) => language.toLowerCase());
const NORMALIZED_SPEC = SPECIALIZATION_OPTIONS.map((specialization) => specialization.toLowerCase());

const SPEC_GRADIENT: Record<string, string> = {
  Trekking: 'from-emerald-700 to-teal-500',
  'Cultural Tours': 'from-amber-700 to-orange-500',
  Adventure: 'from-rose-700 to-orange-500',
  Photography: 'from-indigo-700 to-sky-500',
  Wildlife: 'from-lime-800 to-emerald-600',
  Spiritual: 'from-cyan-700 to-blue-500',
  default: 'from-slate-800 to-emerald-700',
};

const SORT_PARAM: Record<string, string> = {
  rating: '-rating',
  popular: '-reviewCount',
  'price-low': 'pricePerDay',
  'price-high': '-pricePerDay',
  name: 'name',
};

function coverGrad(specializations: string[] = []) {
  if (!specializations.length) return SPEC_GRADIENT.default;
  return SPEC_GRADIENT[specializations[0]] ?? SPEC_GRADIENT.default;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((word) => word[0]).slice(0, 2).join('').toUpperCase() || 'G';
}

function filterLabel(value: string) {
  if (value === 'all') return 'All';
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function GuideCard({ guide, href, isOnline }: { guide: Guide; href: string; isOnline: boolean }) {
  const specializations = guide.specializations ?? [];
  const languages = guide.languages ?? [];
  const grad = coverGrad(specializations);

  return (
    <Link href={href} className="block h-full">
      <Card className="group flex h-full flex-col overflow-hidden border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-within:ring-2 focus-within:ring-ring">
        <div className={`relative min-h-52 bg-gradient-to-br ${grad}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.24),transparent_30%),linear-gradient(to_top,rgba(0,0,0,0.52),transparent_62%)]" />

          <div className="absolute left-3 right-3 top-3 z-10 flex items-start justify-between gap-2">
            {guide.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm backdrop-blur">
                <CheckCircle className="h-3 w-3" />
                Verified
              </span>
            ) : (
              <span />
            )}

            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
                <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Online
              </span>
            ) : guide.available ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Available
              </span>
            ) : (
              <span className="rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white/75 backdrop-blur-sm">
                Busy
              </span>
            )}
          </div>

          <div className="relative z-0 flex min-h-52 items-end justify-center px-5 pb-5 pt-14">
            <div className="relative h-28 w-28 overflow-hidden rounded-3xl border-4 border-white/90 bg-white/95 shadow-xl ring-1 ring-black/10 transition-transform duration-300 group-hover:scale-[1.03]">
              {guide.avatar ? (
                <Image
                  src={guide.avatar}
                  alt={guide.name}
                  fill
                  sizes="112px"
                  className="object-contain p-1"
                />
              ) : (
                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${grad} text-xl font-bold text-white`}>
                  {initials(guide.name)}
                </div>
              )}
            </div>
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col px-5 pb-5 pt-5 text-center">
          <h3 className="truncate text-base font-bold text-foreground">{guide.name}</h3>

          {guide.location && (
            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{guide.location}</span>
            </p>
          )}

          {guide.experience && (
            <p className="mt-1 text-xs text-muted-foreground">{guide.experience} experience</p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{guide.rating > 0 ? guide.rating.toFixed(1) : 'New'}</span>
              <span className="text-muted-foreground">({guide.reviewCount})</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Languages className="h-3.5 w-3.5" />
              {languages.length} lang{languages.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {guide.reviewCount} trips
            </span>
          </div>

          {specializations.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {specializations.slice(0, 3).map((spec) => (
                <span key={spec} className="rounded-lg bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {spec}
                </span>
              ))}
              {specializations.length > 3 && (
                <span className="rounded-lg bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  +{specializations.length - 3}
                </span>
              )}
            </div>
          )}

          {guide.bio && (
            <p className="mt-3 text-left text-xs leading-5 text-muted-foreground line-clamp-2">{guide.bio}</p>
          )}

          <div className="mt-auto pt-4">
            <div className="mb-4 h-px bg-border/60" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 text-left">
                <span className="text-lg font-bold text-primary sm:text-xl">{formatNPR(guide.pricePerDay)}</span>
                <span className="text-xs text-muted-foreground"> / day</span>
              </div>
              <Button size="sm" className="shrink-0 rounded-xl px-4 font-semibold">
                Book
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function GuidesPage() {
  const searchParams = useSearchParams();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [totalGuides, setTotalGuides] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [specFilter, setSpecFilter] = useState('all');
  const [availFilter, setAvailFilter] = useState('all');
  const [priceRange, setPriceRange] = useState<[number]>([PRICE_MAX]);
  const [sortBy, setSortBy] = useState('rating');
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const bookingContextQuery = useMemo(() => {
    const params = new URLSearchParams();
    const destinationId = searchParams.get('destinationId');
    const destinations = searchParams.get('destinations');
    const destinationName = searchParams.get('destinationName');

    if (destinationId) params.set('destinationId', destinationId);
    if (destinations) params.set('destinations', destinations);
    if (destinationName) params.set('destinationName', destinationName);

    return params.toString();
  }, [searchParams]);

  const selectedDestinationName = searchParams.get('destinationName');

  const fetchGuides = useCallback(async () => {
    try {
      setError('');
      setRefreshing(true);
      const response = await api.get('/guides', {
        params: {
          page,
          limit: PAGE_SIZE,
          search: searchTerm.trim() || undefined,
          language: languageFilter !== 'all' ? languageFilter : undefined,
          specialization: specFilter !== 'all' ? specFilter : undefined,
          available: availFilter === 'all' ? undefined : availFilter === 'available',
          maxPrice: priceRange[0] < PRICE_MAX ? priceRange[0] : undefined,
          sort: SORT_PARAM[sortBy] ?? SORT_PARAM.rating,
        },
      });

      setGuides(response.data.data || []);
      setTotalGuides(response.data.total ?? 0);
      setPages(Math.max(1, response.data.pages ?? 1));
    } catch {
      setError('Could not load guides right now. Please try again.');
      setGuides([]);
      setTotalGuides(0);
      setPages(1);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [availFilter, languageFilter, page, priceRange, searchTerm, sortBy, specFilter]);

  const fetchOnline = useCallback(async () => {
    try {
      const response = await api.get('/guides/online');
      setOnlineIds(response.data.data || []);
    } catch {
      setOnlineIds([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchGuides, 250);
    return () => clearTimeout(timer);
  }, [fetchGuides]);

  useEffect(() => {
    fetchOnline();
    const timer = setInterval(fetchOnline, 15000);
    return () => clearInterval(timer);
  }, [fetchOnline]);

  useEffect(() => {
    const query = searchParams.toString();
    if (!query) {
      setSearchTerm('');
      setLanguageFilter('all');
      setSpecFilter('all');
      setAvailFilter('all');
      setPriceRange([PRICE_MAX]);
      setSortBy('rating');
      return;
    }

    const params = new URLSearchParams(query);
    const language = (params.get('language') || 'all').toLowerCase();
    const specialization = (params.get('specialization') || 'all').toLowerCase();
    const availability = (params.get('availability') || 'all').toLowerCase();

    setSearchTerm(params.get('search') || params.get('q') || '');
    setLanguageFilter(NORMALIZED_LANG.includes(language) ? language : 'all');
    setSpecFilter(NORMALIZED_SPEC.includes(specialization) ? specialization : 'all');
    setAvailFilter(availability === 'available' || availability === 'unavailable' ? availability : 'all');
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [availFilter, languageFilter, priceRange, searchTerm, sortBy, specFilter]);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const clearFilters = () => {
    setSearchTerm('');
    setLanguageFilter('all');
    setSpecFilter('all');
    setAvailFilter('all');
    setPriceRange([PRICE_MAX]);
    setSortBy('rating');
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    languageFilter !== 'all' ||
    specFilter !== 'all' ||
    availFilter !== 'all' ||
    priceRange[0] < PRICE_MAX;

  const activeFilterCount = [
    searchTerm,
    languageFilter !== 'all',
    specFilter !== 'all',
    availFilter !== 'all',
    priceRange[0] < PRICE_MAX,
  ].filter(Boolean).length;

  if (loading) return <GuideListSkeleton count={PAGE_SIZE} />;

  return (
    <div className="space-y-6 pb-6">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary">Guide Directory</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Find Your Guide</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Compare verified local guides by specialty, language, price, and live availability.
              </p>
              {selectedDestinationName && (
                <Badge variant="secondary" className="mt-3 rounded-full px-3 py-1 text-primary">
                  Planning for {selectedDestinationName}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { value: totalGuides, label: hasActiveFilters ? 'Matches' : 'Total Guides' },
                { value: onlineIds.length, label: 'Online Now' },
                { value: guides.length, label: 'Showing' },
              ].map((stat) => (
                <div key={stat.label} className="flex min-w-20 flex-col rounded-xl border border-border/60 bg-muted/35 px-4 py-3 text-center">
                  <p className="text-xl font-bold tabular-nums text-foreground">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Search and filters
          </div>
          {refreshing && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Updating
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              placeholder="Search by name, location, or expertise..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Star className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>

          <Button variant={showFilters ? 'default' : 'outline'} onClick={() => setShowFilters((value) => !value)} className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant={showFilters ? 'secondary' : 'default'} className="ml-1 h-5 px-1.5 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap gap-3">
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-full sm:w-[170px]">
                  <Languages className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((language) => (
                    <SelectItem key={language} value={language.toLowerCase()}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={specFilter} onValueChange={setSpecFilter}>
                <SelectTrigger className="w-full sm:w-[190px]">
                  <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALIZATION_OPTIONS.map((specialization) => (
                    <SelectItem key={specialization} value={specialization.toLowerCase()}>
                      {specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={availFilter} onValueChange={setAvailFilter}>
                <SelectTrigger className="w-full sm:w-[170px]">
                  <Clock className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex items-center gap-2 whitespace-nowrap text-sm font-medium">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                Max Price
              </span>
              <Slider
                value={priceRange}
                onValueChange={(value) => setPriceRange(value as [number])}
                max={PRICE_MAX}
                min={500}
                step={500}
                className="flex-1 sm:max-w-sm"
              />
              <span className="text-sm font-semibold text-primary sm:min-w-[110px]">{formatNPR(priceRange[0])}/day</span>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1">
                    &quot;{searchTerm}&quot;
                    <button type="button" onClick={() => setSearchTerm('')} aria-label="Clear search">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {languageFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {filterLabel(languageFilter)}
                    <button type="button" onClick={() => setLanguageFilter('all')} aria-label="Clear language filter">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {specFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {filterLabel(specFilter)}
                    <button type="button" onClick={() => setSpecFilter('all')} aria-label="Clear specialty filter">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {availFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {filterLabel(availFilter)}
                    <button type="button" onClick={() => setAvailFilter('all')} aria-label="Clear availability filter">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {priceRange[0] < PRICE_MAX && (
                  <Badge variant="secondary" className="gap-1">
                    Under {formatNPR(priceRange[0])}
                    <button type="button" onClick={() => setPriceRange([PRICE_MAX])} aria-label="Clear price filter">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{guides.length}</span> of{' '}
            <span className="font-semibold text-foreground">{totalGuides}</span> guides
          </p>
          {selectedDestinationName && (
            <p className="text-xs text-primary">
              Booking place selected: <span className="font-semibold">{selectedDestinationName}</span>
            </p>
          )}
        </div>

        {guides.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {guides.filter((guide) => onlineIds.includes(guide._id)).length} online on this page
          </div>
        )}
      </div>

      {error ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <h3 className="mb-1 text-base font-semibold">Guide search failed</h3>
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={fetchGuides}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : guides.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Search className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="mb-1 text-base font-semibold">No guides found</h3>
            <p className="mb-4 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            <Button variant="outline" onClick={clearFilters}>
              Clear all filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={cn('grid gap-6 sm:grid-cols-2 xl:grid-cols-3', refreshing && 'opacity-80')}>
          {guides.map((guide) => (
            <GuideCard
              key={guide._id}
              guide={guide}
              href={`/guides/${guide._id}${bookingContextQuery ? `?${bookingContextQuery}` : ''}`}
              isOnline={onlineIds.includes(guide._id)}
            />
          ))}
        </div>
      )}

      {pages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page === 1}
                className={page === 1 ? 'pointer-events-none opacity-50' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
              />
            </PaginationItem>
            <PaginationItem className="px-3 text-sm text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> of {pages}
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page === pages}
                className={page === pages ? 'pointer-events-none opacity-50' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  if (page < pages) setPage(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
