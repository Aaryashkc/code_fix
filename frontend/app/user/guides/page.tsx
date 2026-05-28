'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search, Star, MapPin, Filter, X, Banknote, Languages,
  CheckCircle, SlidersHorizontal, Clock, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatNPR } from '@/lib/currency';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { GuideListSkeleton } from '@/components/ui/skeleton-cards';
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';

interface Guide {
  _id: string; name: string; avatar?: string; bio?: string;
  rating: number; reviewCount: number;
  languages: Array<{ code: string; name: string }>;
  specializations: string[]; pricePerDay: number;
  experience?: string; available: boolean; verified: boolean; location?: string;
}

const LANGUAGE_OPTIONS      = ['All', 'English', 'Nepali', 'Hindi', 'Chinese', 'Japanese', 'Korean'];
const SPECIALIZATION_OPTIONS = ['All', 'Trekking', 'Cultural Tours', 'Adventure', 'Photography', 'Wildlife', 'Spiritual'];
const NORMALIZED_LANG        = LANGUAGE_OPTIONS.map(l => l.toLowerCase());
const NORMALIZED_SPEC        = SPECIALIZATION_OPTIONS.map(s => s.toLowerCase());
const PRICE_MAX              = 50000;

/* ── Cover gradient per specialization ── */
const SPEC_GRADIENT: Record<string, string> = {
  'Trekking':       'from-emerald-700 to-emerald-500',
  'Cultural Tours': 'from-amber-700 to-amber-500',
  'Adventure':      'from-orange-700 to-red-500',
  'Photography':    'from-violet-700 to-violet-500',
  'Wildlife':       'from-green-800 to-emerald-600',
  'Spiritual':      'from-sky-700 to-blue-500',
  'default':        'from-[hsl(228_65%_20%)] to-[hsl(228_55%_35%)]',
};

function coverGrad(specializations: string[]) {
  if (!specializations?.length) return SPEC_GRADIENT.default;
  return SPEC_GRADIENT[specializations[0]] ?? SPEC_GRADIENT.default;
}

/* ── Initials avatar ── */
function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/* ── Guide Card (property card style) ── */
function GuideCard({ guide, href, isOnline }: { guide: Guide; href: string; isOnline: boolean }) {
  const grad = coverGrad(guide.specializations);

  return (
    <Link href={href}>
      <Card className="group h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(8,40,20,0.15)] cursor-pointer">
        {/* ── Cover image area ── */}
        <div className={`relative h-44 bg-gradient-to-br ${grad} overflow-hidden`}>
          {/* Decorative overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Online / availability pill */}
          <div className="absolute top-3 right-3">
            {isOnline ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-white animate-pulse" />Online
              </span>
            ) : guide.available ? (
              <span className="flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-2.5 py-1 text-[11px] font-semibold text-white">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />Available
              </span>
            ) : (
              <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-white/70">
                Busy
              </span>
            )}
          </div>

          {/* Verified badge */}
          {guide.verified && (
            <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-sky-500/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
              <CheckCircle className="h-3 w-3" />Verified
            </div>
          )}

          {/* Avatar — centred on cover */}
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-0 translate-y-1/2">
            <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-4 border-card shadow-lg ring-2 ring-white/20 group-hover:scale-105 transition-transform duration-300">
              {guide.avatar ? (
                <Image src={guide.avatar} alt={guide.name} fill className="object-cover" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${grad} text-white text-xl font-bold`}>
                  {initials(guide.name)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <CardContent className="pt-12 px-5 pb-5 text-center">
          {/* Name + location */}
          <h3 className="text-base font-bold truncate">{guide.name}</h3>
          {guide.location && (
            <p className="flex items-center justify-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />{guide.location}
            </p>
          )}
          {guide.experience && (
            <p className="mt-0.5 text-xs text-muted-foreground">{guide.experience} experience</p>
          )}

          {/* Rating + reviews + languages */}
          <div className="flex items-center justify-center gap-4 mt-3">
            <span className="flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{guide.rating > 0 ? guide.rating.toFixed(1) : 'New'}</span>
              <span className="text-muted-foreground">({guide.reviewCount})</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Languages className="h-3.5 w-3.5" />
              {guide.languages.length} lang{guide.languages.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {guide.reviewCount} trips
            </span>
          </div>

          {/* Specializations */}
          {guide.specializations.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {guide.specializations.slice(0, 3).map(spec => (
                <span key={spec} className="rounded-lg bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {spec}
                </span>
              ))}
              {guide.specializations.length > 3 && (
                <span className="rounded-lg bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  +{guide.specializations.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Bio snippet */}
          {guide.bio && (
            <p className="mt-3 text-xs text-muted-foreground line-clamp-2 text-left">{guide.bio}</p>
          )}

          {/* Separator */}
          <div className="my-4 h-px bg-border/60" />

          {/* Price + CTA */}
          <div className="flex items-center justify-between">
            <div className="text-left">
              <span className="text-xl font-bold text-primary">{formatNPR(guide.pricePerDay)}</span>
              <span className="text-xs text-muted-foreground"> / day</span>
            </div>
            <Button size="sm" className="rounded-xl font-semibold px-4">
              Book Guide
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ─── Page ── */
export default function GuidesPage() {
  const searchParams = useSearchParams();
  const [guides,          setGuides]          = useState<Guide[]>([]);
  const [totalGuides,     setTotalGuides]     = useState(0);
  const [page,            setPage]            = useState(1);
  const [pages,           setPages]           = useState(1);
  const [loading,         setLoading]         = useState(true);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [languageFilter,  setLanguageFilter]  = useState('all');
  const [specFilter,      setSpecFilter]      = useState('all');
  const [availFilter,     setAvailFilter]     = useState('all');
  const [priceRange,      setPriceRange]      = useState<[number]>([PRICE_MAX]);
  const [sortBy,          setSortBy]          = useState('rating');
  const [onlineIds,       setOnlineIds]       = useState<string[]>([]);
  const [showFilters,     setShowFilters]     = useState(false);

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
    const sort: Record<string, string> = {
      rating: '-rating',
      popular: '-reviewCount',
      'price-low': 'pricePerDay',
      'price-high': '-pricePerDay',
      name: 'name',
    };

    try {
      const r = await api.get('/guides', {
        params: {
          page,
          limit: 9,
          search: searchTerm.trim() || undefined,
          language: languageFilter !== 'all' ? languageFilter : undefined,
          specialization: specFilter !== 'all' ? specFilter : undefined,
          available: availFilter === 'all' ? undefined : availFilter === 'available',
          maxPrice: priceRange[0] < PRICE_MAX ? priceRange[0] : undefined,
          sort: sort[sortBy],
        },
      });
      setGuides(r.data.data || []);
      setTotalGuides(r.data.total ?? 0);
      setPages(Math.max(1, r.data.pages ?? 1));
    }
    catch { /* silent */ } finally { setLoading(false); }
  }, [availFilter, languageFilter, page, priceRange, searchTerm, sortBy, specFilter]);

  const fetchOnline = useCallback(async () => {
    try { const r = await api.get('/guides/online'); setOnlineIds(r.data.data || []); }
    catch { /* silent */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchGuides, 250);
    return () => clearTimeout(timer);
  }, [fetchGuides]);

  useEffect(() => {
    fetchOnline();
    const t = setInterval(fetchOnline, 15000);
    return () => clearInterval(t);
  }, [fetchOnline]);

  useEffect(() => {
    const q = searchParams.toString();
    if (!q) { setSearchTerm(''); setLanguageFilter('all'); setSpecFilter('all'); setAvailFilter('all'); setPriceRange([PRICE_MAX]); setSortBy('rating'); return; }
    const p = new URLSearchParams(q);
    const s = (p.get('search') || p.get('q') || '').toLowerCase();
    const l = (p.get('language') || 'all').toLowerCase();
    const sp = (p.get('specialization') || 'all').toLowerCase();
    const av = (p.get('availability') || 'all').toLowerCase();
    setSearchTerm(s);
    setLanguageFilter(NORMALIZED_LANG.includes(l) ? l : 'all');
    setSpecFilter(NORMALIZED_SPEC.includes(sp) ? sp : 'all');
    setAvailFilter(av === 'available' || av === 'unavailable' ? av : 'all');
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [availFilter, languageFilter, priceRange, searchTerm, sortBy, specFilter]);

  const clearFilters = () => { setSearchTerm(''); setLanguageFilter('all'); setSpecFilter('all'); setAvailFilter('all'); setPriceRange([PRICE_MAX]); setSortBy('rating'); };
  const hasActiveFilters = searchTerm || languageFilter !== 'all' || specFilter !== 'all' || availFilter !== 'all' || priceRange[0] < PRICE_MAX;

  if (loading) return <GuideListSkeleton />;

  return (
    <div className="space-y-6 pb-6">

      {/* ── Page header ── */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Browse</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Find Your Guide</h1>
            <p className="mt-0.5 text-sm text-muted-foreground max-w-xl">
              Expert locals who turn your Nepal journey into an unforgettable experience.
            </p>
          </div>
          {/* Quick stats */}
          <div className="flex gap-3">
            {[
              { val: totalGuides,           label: hasActiveFilters ? 'Matches' : 'Total Guides' },
              { val: onlineIds.length,      label: 'Online Now' },
              { val: guides.length,         label: 'Showing' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-center min-w-[80px]">
                <p className="text-xl font-bold text-foreground">{s.val}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Search + filter bar ── */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search guides by name, location, or expertise…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <Star className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="price-low">Price: Low → High</SelectItem>
              <SelectItem value="price-high">Price: High → Low</SelectItem>
              <SelectItem value="name">Name (A–Z)</SelectItem>
            </SelectContent>
          </Select>
          {/* Filter toggle */}
          <Button variant={showFilters ? 'default' : 'outline'} onClick={() => setShowFilters(v => !v)} className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />Filters
            {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-primary group-data-[variant=default]:bg-white" />}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-3.5 w-3.5 mr-1.5" />Clear
            </Button>
          )}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap gap-3">
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-[150px]">
                  <Languages className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map(l => <SelectItem key={l} value={l.toLowerCase()}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={specFilter} onValueChange={setSpecFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALIZATION_OPTIONS.map(s => <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={availFilter} onValueChange={setAvailFilter}>
                <SelectTrigger className="w-[150px]">
                  <Clock className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium flex items-center gap-2 whitespace-nowrap">
                <Banknote className="h-4 w-4 text-muted-foreground" />Max Price:
              </span>
              <Slider value={priceRange} onValueChange={v => setPriceRange(v as [number])} max={PRICE_MAX} min={500} step={500} className="flex-1 max-w-sm" />
              <span className="text-sm font-semibold text-primary min-w-[110px]">{formatNPR(priceRange[0])}/day</span>
            </div>
            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {searchTerm && <Badge variant="secondary" className="gap-1">&quot;{searchTerm}&quot; <button onClick={() => setSearchTerm('')}><X className="h-3 w-3" /></button></Badge>}
                {languageFilter !== 'all' && <Badge variant="secondary" className="gap-1 capitalize">{languageFilter} <button onClick={() => setLanguageFilter('all')}><X className="h-3 w-3" /></button></Badge>}
                {specFilter !== 'all' && <Badge variant="secondary" className="gap-1 capitalize">{specFilter} <button onClick={() => setSpecFilter('all')}><X className="h-3 w-3" /></button></Badge>}
                {availFilter !== 'all' && <Badge variant="secondary" className="gap-1 capitalize">{availFilter} <button onClick={() => setAvailFilter('all')}><X className="h-3 w-3" /></button></Badge>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Results count ── */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{guides.length}</span> of <span className="font-semibold text-foreground">{totalGuides}</span> guides
          </p>
          {selectedDestinationName && (
            <p className="text-xs text-primary">
              Booking place selected: <span className="font-semibold">{selectedDestinationName}</span>
            </p>
          )}
        </div>
        {guides.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {guides.filter(g => onlineIds.includes(g._id)).length} online on this page
          </div>
        )}
      </div>

      {/* ── Guide grid ── */}
      {guides.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Search className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-semibold text-base mb-1">No guides found</h3>
            <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filters</p>
            <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map(guide => (
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
