"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MapPin, Bookmark, Calendar, Star, Heart, ChevronRight, Shield, Users, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import api from "@/lib/api"
import { useState, useContext, useEffect } from "react"
import { AuthContext } from "@/context/AuthContext"

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function DashboardPage() {
  const router = useRouter()
  const [wishlist, setWishlist] = useState<string[]>([])
  const [destinations, setDestinations] = useState<any[]>([])
  const [guides, setGuides] = useState<Array<{
    _id: string; name: string; avatar: string; rating: number; reviewCount: number;
    languages: { code: string; name: string }[]; specializations: string[];
  }>>([])
  const [loading, setLoading] = useState(true)
  const auth = useContext(AuthContext)

  // Redirect users to their role-specific dashboard
  useEffect(() => {
    if (auth?.isLoading) return;
    if (auth?.user?.role === 'admin') {
      router.replace('/admin/dashboard');
    } else if (auth?.user?.role === 'guide') {
      router.replace('/guide/dashboard');
    }
  }, [auth?.isLoading, auth?.user, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [destRes, guideRes] = await Promise.all([
          api.get('/destinations?limit=4'),
          api.get('/guides?limit=3'),
        ])
        setDestinations(destRes.data.data || [])
        setGuides(guideRes.data.data || [])
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const toggleWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((wid) => wid !== id) : [...prev, id]
    )
  }

  const userStats = auth?.user?.stats || { placesVisited: 0, pinsCreated: 0, upcomingTrips: 0 }

  const stats = [
    { label: "Places Visited", value: userStats.placesVisited, icon: MapPin, color: "text-primary" },
    { label: "Pins Created", value: userStats.pinsCreated, icon: Bookmark, color: "text-secondary" },
    { label: "Upcoming Trips", value: userStats.upcomingTrips, icon: Calendar, color: "text-accent" },
  ]

  const guideStats = [
    { label: "Total Trips", value: auth?.user?.totalTrips || 0, icon: Calendar, color: "text-primary" },
    { label: "Success Rate", value: `${auth?.user?.successRate || 0}%`, icon: Star, color: "text-accent" },
    { label: "Clients", value: auth?.user?.reviewCount || 0, icon: Users, color: "text-secondary" },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
          {getGreeting()}, {auth?.user?.name?.split(' ')[0] || 'Traveler'}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {auth?.user?.role === 'admin' ? "Manage the Yatra platform" : 
           auth?.user?.role === 'guide' ? "Your guide dashboard" :
           "Here's what's happening with your Nepal adventure"}
        </p>
        {auth?.user?.role && (
          <Badge className="mt-2 capitalize">
            {auth.user.role === 'admin' && <Shield className="mr-1 h-3 w-3" />}
            {auth.user.role}
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(auth?.user?.role === 'guide' ? guideStats : stats).map((stat) => (
          <Card key={stat.label} className="border-border">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Explore Map CTA */}
      {auth?.user?.role !== 'guide' && auth?.user?.role !== 'admin' && (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1">Explore Interactive Map</h3>
              <p className="text-sm text-muted-foreground">
                Discover attractions near any location in Nepal with our map tool
              </p>
            </div>
            <Link href="/user/explore">
              <Button>
                <MapPin className="h-4 w-4 mr-2" />
                Open Map
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recommended for You */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-foreground">Recommended for You</h2>
          <Link href="/destinations" className="flex items-center text-sm text-primary hover:underline">
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {destinations.map((dest) => (
            <Card
              key={dest._id}
              className="group overflow-hidden border-border transition-all hover:shadow-lg hover:-translate-y-1"
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
                  onClick={() => toggleWishlist(dest._id)}
                  className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm transition-colors hover:bg-card"
                  aria-label={wishlist.includes(dest._id) ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart
                    className={`h-4 w-4 ${wishlist.includes(dest._id) ? "fill-primary text-primary" : "text-foreground"}`}
                  />
                </button>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground">{dest.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{dest.location?.address || dest.location}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                    <span className="text-sm font-medium text-foreground">{dest.rating}</span>
                  </div>
                  <Link href="/user/guides">
                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-7">
                      Hire Guide
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured Guides */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-foreground">Featured Guides</h2>
          <Link href="/user/guides" className="flex items-center text-sm text-primary hover:underline">
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Card key={guide._id} className="border-border">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-primary/20">
                  <Image
                    src={guide.avatar || "/placeholder.svg"}
                    alt={guide.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{guide.name}</h3>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  {guide.languages?.map((l) => (
                    <span key={l.code} className="rounded bg-muted px-1.5 py-0.5 font-medium">
                      {l.code}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-1">
                  {guide.specializations?.slice(0, 2).map((spec) => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  <span className="text-sm font-medium text-foreground">{guide.rating}</span>
                  <span className="text-xs text-muted-foreground">({guide.reviewCount})</span>
                </div>
                <Link href={`/guides/${guide._id}`} className="mt-4">
                  <Button variant="outline" size="sm" className="text-foreground border-border bg-transparent">
                    View Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
