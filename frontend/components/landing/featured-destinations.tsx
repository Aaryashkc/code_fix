"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
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
    Adventure: "text-orange-600 dark:text-orange-400",
    Nature: "text-emerald-600 dark:text-emerald-400",
    Religious: "text-violet-600 dark:text-violet-400",
    Cultural: "text-amber-600 dark:text-amber-400",
    Urban: "text-blue-600 dark:text-blue-400",
  }
  return colors[category] || "text-primary"
}

const getDestinationImage = (name: string): string => {
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
        const destinationsData = response.data?.data || []
        setDestinations(destinationsData)
      } catch (error) {
        console.error('Failed to fetch featured destinations:', error)
        setDestinations([])
      } finally {
        setLoading(false)
      }
    }
    fetchDestinations()
  }, [])

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 340
      scrollRef.current.scrollBy({
        left: direction === "left" ? -amount : amount,
        behavior: "smooth",
      })
    }
  }

  return (
    <section id="destinations" className="relative bg-background py-24 lg:py-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,hsl(228_62%_25%_/_0.04),transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex items-end justify-between border-b border-border/60 pb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-xl"
          >
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80 dark:text-primary/95">
              Top Picks
            </span>
            <h2 className="mt-4 text-balance font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Featured Destinations
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Hand-picked escapes, curated itineraries, and unforgettable landmarks across Nepal.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="hidden gap-3 sm:flex"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-border text-foreground bg-card hover:bg-primary hover:text-white transition-all duration-300 h-10 w-10"
                onClick={() => scroll("left")}
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-border text-foreground bg-card hover:bg-primary hover:text-white transition-all duration-300 h-10 w-10"
                onClick={() => scroll("right")}
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {loading ? (
          <div className="mt-12 flex gap-6 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="min-w-[280px] max-w-[320px]"
              >
                <div className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />
                <div className="mt-5 space-y-3">
                  <div className="flex justify-between">
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : destinations.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/80 rounded-2xl bg-card/40">
            <p className="text-sm text-muted-foreground">No destinations currently available.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div
              ref={scrollRef}
              className="mt-12 flex gap-8 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: "none" }}
            >
              {destinations.map((dest) => (
                <motion.div
                  key={dest._id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="group min-w-[280px] max-w-[320px] snap-start overflow-hidden bg-transparent"
                >
                  <Link href={`/places/${dest._id}`}>
                    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getDestinationImage(dest.name)}
                        alt={dest.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    <div className="mt-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${getCategoryColor(dest.category)}`}>
                          {dest.category}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                          <span>★ {dest.rating}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">({dest.reviewCount})</span>
                        </div>
                      </div>
                      <h3 className="text-base font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
                        {dest.name}
                      </h3>
                      <p className="text-xs text-muted-foreground tracking-wide">{dest.location?.address}</p>
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
