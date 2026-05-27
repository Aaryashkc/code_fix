"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Star, Heart, Sun, Clock, MountainIcon, MapPin, Filter, X,
  SlidersHorizontal, Loader2, Search, Compass, ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination"
import api from "@/lib/api"
import type { DestinationCategory } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Navbar } from "@/components/landing/navbar"

interface ApiDestination {
  _id: string
  name: string
  slug: string
  category: DestinationCategory
  region: "Eastern" | "Central" | "Western" | "Far-Western"
  description: string
  shortDescription: string
  images: string[]
  rating: number
  reviewCount: number
  priceRange: "Rs" | "Rs Rs" | "Rs Rs Rs"
  bestSeason: string
  duration: string
  difficulty: "Easy" | "Moderate" | "Challenging" | "Expert"
  location: { coordinates: [number, number]; address: string }
  features: string[]
  nearbyAttractions: string[]
}

const allCategories: DestinationCategory[] = ["Religious", "Nature", "Adventure", "Cultural", "Urban"]
const regions = ["Eastern", "Central", "Western", "Far-Western"]
const difficulties = ["Easy", "Moderate", "Challenging", "Expert"]
const PAGE_SIZE = 9

function FilterPanel({
  selectedCategories,
  toggleCategory,
  selectedRegion,
  setSelectedRegion,
  selectedDifficulty,
  setSelectedDifficulty,
  onClear,
}: {
  selectedCategories: string[]
  toggleCategory: (c: string) => void
  selectedRegion: string
  setSelectedRegion: (r: string) => void
  selectedDifficulty: string
  setSelectedDifficulty: (d: string) => void
  onClear: () => void
}) {
  return (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h4 className="text-sm font-semibold text-foreground">Category</h4>
        <div className="mt-3 space-y-2">
          {allCategories.map((cat) => (
            <Label key={cat} className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
              <Checkbox
                checked={selectedCategories.includes(cat)}
                onCheckedChange={() => toggleCategory(cat)}
              />
              {cat}
            </Label>
          ))}
        </div>
      </div>

      {/* Region */}
      <div>
        <h4 className="text-sm font-semibold text-foreground">Region</h4>
        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="All Regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Difficulty */}
      <div>
        <h4 className="text-sm font-semibold text-foreground">Difficulty</h4>
        <div className="mt-3 space-y-2">
          {difficulties.map((d) => (
            <Label key={d} className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
              <Checkbox
                checked={selectedDifficulty === d}
                onCheckedChange={() => setSelectedDifficulty(selectedDifficulty === d ? "" : d)}
              />
              {d}
            </Label>
          ))}
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
        Clear All
      </Button>
    </div>
  )
}

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<ApiDestination[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedRegion, setSelectedRegion] = useState("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState("")
  const [sortBy, setSortBy] = useState("popular")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [wishlist, setWishlist] = useState<string[]>([])
  const [detailDest, setDetailDest] = useState<ApiDestination | null>(null)

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await api.get('/destinations')
        setDestinations(response.data.data || [])
      } catch (error) {
        console.error('Failed to fetch destinations:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDestinations()
  }, [])

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedRegion("all")
    setSelectedDifficulty("")
    setSearchQuery("")
  }

  const filtered = useMemo(() => {
    let result = [...destinations]
    const query = searchQuery.trim().toLowerCase()
    if (query)
      result = result.filter((d) =>
        [d.name, d.shortDescription, d.category, d.region, d.location?.address]
          .some((value) => value?.toLowerCase().includes(query))
      )
    if (selectedCategories.length > 0)
      result = result.filter((d) => selectedCategories.includes(d.category))
    if (selectedRegion !== "all")
      result = result.filter((d) => d.region === selectedRegion)
    if (selectedDifficulty)
      result = result.filter((d) => d.difficulty === selectedDifficulty)

    switch (sortBy) {
      case "rating":
        result.sort((a, b) => b.rating - a.rating)
        break
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      default:
        result.sort((a, b) => b.reviewCount - a.reviewCount)
    }
    return result
  }, [destinations, searchQuery, selectedCategories, selectedRegion, selectedDifficulty, sortBy])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visibleDestinations = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const activeFilterCount =
    selectedCategories.length + (selectedRegion !== "all" ? 1 : 0) + (selectedDifficulty ? 1 : 0)

  useEffect(() => {
    setPage(1)
  }, [searchQuery, selectedCategories, selectedRegion, selectedDifficulty, sortBy])

  useEffect(() => {
    if (page > pages) setPage(pages)
  }, [page, pages])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading destinations</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar solid />

      <section className="relative overflow-hidden border-b border-border/60 bg-card pt-28 pb-10 lg:pt-32 lg:pb-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,hsl(var(--primary)/0.14),transparent_36%),radial-gradient(circle_at_8%_70%,hsl(var(--accent)/0.12),transparent_32%)]" />
        <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4 gap-2 rounded-full px-3 py-1 text-primary">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              Explore Nepal
            </Badge>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Find a destination made for your journey
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Search mountain trails, heritage sites, and relaxing escapes, then connect with a local guide.
            </p>
          </div>

          <form
            className="mt-8 max-w-3xl rounded-2xl border border-border/70 bg-background p-2 shadow-lg shadow-primary/5"
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
            }}
          >
            <label htmlFor="destination-search" className="sr-only">Search destinations</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="destination-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search places, regions, or experiences"
                  className="h-12 w-full rounded-xl border-0 bg-transparent pl-12 pr-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button type="submit" className="h-12 rounded-xl px-6" aria-label="Show matching destinations">
                Search
              </Button>
            </div>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="flex gap-8">
          {/* Desktop filters */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Filters</h2>
                {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
              </div>
              <div className="mt-4">
                <FilterPanel
                  selectedCategories={selectedCategories}
                  toggleCategory={toggleCategory}
                  selectedRegion={selectedRegion}
                  setSelectedRegion={setSelectedRegion}
                  selectedDifficulty={selectedDifficulty}
                  setSelectedDifficulty={setSelectedDifficulty}
                  onClear={clearFilters}
                />
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1">
            {/* Sort & mobile filter */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div aria-live="polite">
                <p className="text-lg font-semibold text-foreground">
                  {searchQuery ? `Results for "${searchQuery}"` : "All destinations"}
                </p>
                <p className="text-sm text-muted-foreground">{filtered.length} destinations found</p>
              </div>
              <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden gap-2 text-foreground border-border bg-card">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && <Badge className="ml-1 h-5 px-1.5">{activeFilterCount}</Badge>}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterPanel
                      selectedCategories={selectedCategories}
                      toggleCategory={toggleCategory}
                      selectedRegion={selectedRegion}
                      setSelectedRegion={setSelectedRegion}
                      selectedDifficulty={selectedDifficulty}
                      setSelectedDifficulty={setSelectedDifficulty}
                      onClear={clearFilters}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44 bg-card" aria-label="Sort destinations">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="name">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>

            {/* Active filters */}
            {(searchQuery || activeFilterCount > 0) && (
              <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="Active filters">
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1.5 py-1">
                    Search: {searchQuery}
                    <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}
                {selectedCategories.map((c) => (
                  <Badge key={c} variant="secondary" className="gap-1.5 py-1">
                    {c}
                    <button type="button" onClick={() => toggleCategory(c)} aria-label={`Remove ${c} filter`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))}
                {selectedRegion !== "all" && (
                  <Badge variant="secondary" className="gap-1.5 py-1">
                    {selectedRegion}
                    <button type="button" onClick={() => setSelectedRegion("all")} aria-label="Clear region filter">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}
                {selectedDifficulty && (
                  <Badge variant="secondary" className="gap-1.5 py-1">
                    {selectedDifficulty}
                    <button type="button" onClick={() => setSelectedDifficulty("")} aria-label="Clear difficulty filter">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all</Button>
              </div>
            )}

            {/* Grid */}
            {filtered.length > 0 ? (
              <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {visibleDestinations.map((dest) => (
                  <Card
                    key={dest._id}
                    className="group overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:-translate-y-1 hover:shadow-lg focus-within:ring-2 focus-within:ring-ring"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={dest.images[0] || "/placeholder.svg"}
                        alt={dest.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs">
                        {dest.category}
                      </Badge>
                      <button
                        type="button"
                        onClick={() =>
                          setWishlist((prev) =>
                            prev.includes(dest._id) ? prev.filter((id) => id !== dest._id) : [...prev, dest._id]
                          )
                        }
                        className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm transition hover:bg-card"
                        aria-label={wishlist.includes(dest._id) ? `Remove ${dest.name} from saved places` : `Save ${dest.name}`}
                      >
                        <Heart className={cn("h-4 w-4", wishlist.includes(dest._id) ? "fill-primary text-primary" : "text-foreground")} />
                      </button>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-lg font-semibold text-foreground">{dest.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{dest.shortDescription}</p>
                      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {dest.location?.address}
                      </div>
                      <div className="mt-3 flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                        <span className="text-sm font-medium text-foreground">{dest.rating}</span>
                        <span className="text-xs text-muted-foreground">({dest.reviewCount} reviews)</span>
                      </div>

                      {/* Features */}
                      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Sun className="h-3 w-3" /> {dest.bestSeason}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {dest.duration}</span>
                        <span className="flex items-center gap-1"><MountainIcon className="h-3 w-3" /> {dest.difficulty}</span>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Link href={`/places/${dest._id}`} className="flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-foreground border-border bg-transparent"
                          >
                            View Details
                          </Button>
                        </Link>
                        <Link href="/user/guides" className="flex-1">
                          <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                            Find Guide
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {pages > 1 && (
                <Pagination className="mt-8">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        aria-disabled={page === 1}
                        className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                        onClick={(event) => {
                          event.preventDefault()
                          if (page > 1) setPage(page - 1)
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
                        className={page === pages ? "pointer-events-none opacity-50" : undefined}
                        onClick={(event) => {
                          event.preventDefault()
                          if (page < pages) setPage(page + 1)
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground/30" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">No destinations found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters</p>
                <Button variant="outline" className="mt-4 text-foreground border-border bg-transparent" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <section className="border-t border-border/60 bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-10 sm:flex-row sm:items-center lg:px-8">
          <div>
            <h2 className="text-xl font-semibold">Want to plan on the map?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to save destinations and build an itinerary.</p>
          </div>
          <Link href="/user/explore">
            <Button className="gap-2 rounded-xl">
              Open Map Explorer
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Detail Dialog */}
      <Dialog open={!!detailDest} onOpenChange={() => setDetailDest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailDest && (
            <>
              <div className="relative aspect-video overflow-hidden rounded-lg">
                <Image
                  src={detailDest.images[0] || "/placeholder.svg"}
                  alt={detailDest.name}
                  fill
                  className="object-cover"
                />
              </div>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">{detailDest.name}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{detailDest.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-foreground">Best Time</span>
                      <p className="text-muted-foreground">{detailDest.bestSeason}</p>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Duration</span>
                      <p className="text-muted-foreground">{detailDest.duration}</p>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Difficulty</span>
                      <p className="text-muted-foreground">{detailDest.difficulty}</p>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Price Range</span>
                      <p className="text-muted-foreground">{detailDest.priceRange}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">Nearby Attractions</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {detailDest.nearbyAttractions.map((a) => (
                        <Badge key={a} variant="secondary">{a}</Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="details" className="mt-4 space-y-4">
                  <div>
                    <span className="text-sm font-medium text-foreground">Features</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {detailDest.features.map((f) => (
                        <Badge key={f} variant="outline">{f}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-foreground">Location</span>
                    <p className="text-muted-foreground">{detailDest.location?.address} ({detailDest.location?.coordinates?.[1]?.toFixed(4)}, {detailDest.location?.coordinates?.[0]?.toFixed(4)})</p>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 text-foreground border-border bg-transparent">
                  Add to Wishlist
                </Button>
                <Link href="/user/guides" className="flex-1">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Hire Guide
                  </Button>
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
