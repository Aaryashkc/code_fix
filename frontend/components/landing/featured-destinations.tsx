"use client"

import Image from "next/image"
import Link from "next/link"
import { Star, ChevronLeft, ChevronRight, ArrowRight, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"

interface Destination {
  _id: string
  name: string
  slug: string
  category: string
  images: string[]
  rating: number
  reviewCount: number
  location: { address: string; coordinates: [number, number] }
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Adventure: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
    Nature: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    Religious: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
    Cultural: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    Urban: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  }
  return colors[category] || "bg-primary/10 text-primary"
}

const getDestinationImage = (name: string): string => {
  // Use pexels.com images - reliable stock photos
  const images: Record<string, string> = {
    'Everest Base Camp Trek': 'https://images.pexels.com/photos/290113/pexels-photo-290113.jpeg?auto=compress&w=800',
    'Upper Mustang Trek': 'https://images.pexels.com/photos/2835436/pexels-photo-2835436.jpeg?auto=compress&w=800',
    'Pokhara & Phewa Lake': 'https://images.pexels.com/photos/674318/pexels-photo-674318.jpeg?auto=compress&w=800',
    'Pashupatinath Temple': 'https://images.pexels.com/photos/624376/pexels-photo-624376.jpeg?auto=compress&w=800',
    'Annapurna Circuit': 'https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&w=800',
    'Mardi Himal Trek': 'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&w=800',
    'Langtang Valley Trek': 'https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&w=800',
    'Manaslu Circuit Trek': 'https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg?auto=compress&w=800',
    'Gokyo Lakes Trek': 'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&w=800',
    'Annapurna Base Camp': 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&w=800',
    'Poon Hill Trek': 'https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&w=800',
    'Chitwan National Park': 'https://images.pexels.com/photos/247376/pexels-photo-247376.jpeg?auto=compress&w=800',
    'Lumbini': 'https://images.pexels.com/photos/773481/pexels-photo-773481.jpeg?auto=compress&w=800',
    'Boudhanath Stupa': 'https://images.pexels.com/photos/3054699/pexels-photo-3054699.jpeg?auto=compress&w=800',
    'Kathmandu Durbar Square': 'https://images.pexels.com/photos/2022044/pexels-photo-2022044.jpeg?auto=compress&w=800',
    'Bhaktapur Durbar Square': 'https://images.pexels.com/photos/2022045/pexels-photo-2022045.jpeg?auto=compress&w=800'
  }
  
  // Return specific image or default Nepal mountain image
  return images[name] || 'https://images.pexels.com/photos/290113/pexels-photo-290113.jpeg?auto=compress&w=800'
}

export function FeaturedDestinations() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await api.get('/destinations?limit=6')
        // Handle both successful data and empty arrays
        const destinationsData = response.data?.data || []
        setDestinations(destinationsData)
      } catch (error) {
        console.error('Failed to fetch featured destinations:', error)
        // Set empty array on error so UI doesn't break
        setDestinations([])
      } finally {
        setLoading(false)
      }
    }
    fetchDestinations()
  }, [])

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 370
      scrollRef.current.scrollBy({
        left: direction === "left" ? -amount : amount,
        behavior: "smooth",
      })
    }
  }

  return (
    <section id="destinations" className="relative bg-background py-24 lg:py-32 overflow-hidden">
      {/* Background accents — navy tones */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,hsl(228_62%_25%_/_0.06),transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex items-end justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              Top Picks
            </span>
            <h2 className="mt-6 text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
              Featured Destinations
            </h2>
            <p className="mt-3 text-muted-foreground max-w-md">
              Hand-picked destinations loved by travelers from around the world
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="hidden gap-2 sm:flex"
          >
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-border text-foreground bg-card hover:bg-muted h-11 w-11"
                onClick={() => scroll("left")}
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-border text-foreground bg-card hover:bg-muted h-11 w-11"
                onClick={() => scroll("right")}
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {loading ? (
          <div className="mt-12 flex gap-6 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="min-w-[320px] max-w-[350px] overflow-hidden rounded-2xl border border-border/50 bg-card"
              >
                <div className="aspect-[16/10] animate-pulse bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="flex items-center justify-between pt-2">
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : destinations.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center py-16 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">No destinations available at the moment.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div
              ref={scrollRef}
              className="mt-12 flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: "none" }}
            >
              {destinations.map((dest) => (
                <motion.div
                  key={dest._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="group min-w-[320px] max-w-[350px] snap-start overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <Link href={`/places/${dest._id}`}>
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getDestinationImage(dest.name)}
                        alt={dest.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Badge className={`absolute top-3 left-3 text-xs shadow-lg ${getCategoryColor(dest.category)}`}>
                        {dest.category}
                      </Badge>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                        {dest.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">{dest.location?.address}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-semibold text-foreground">{dest.rating}</span>
                          <span className="text-xs text-muted-foreground">({dest.reviewCount})</span>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          Explore <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
