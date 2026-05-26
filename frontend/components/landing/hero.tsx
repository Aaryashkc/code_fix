"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ChevronRight, Play, MapPin } from "lucide-react"

const heroSlides = [
  {
    image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1920&q=80",
    title: "Discover the Roof of the World",
    subtitle: "Trek to Everest Base Camp with experienced Sherpa guides",
    location: "Everest Region, Nepal",
  },
  {
    image: "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=1920&q=80",
    title: "Ancient Temples & Living Culture",
    subtitle: "Explore centuries-old heritage in the Kathmandu Valley",
    location: "Kathmandu Valley, Nepal",
  },
  {
    image: "https://images.unsplash.com/photo-1528375020190-3001bb30b71d?w=1920&q=80",
    title: "Annapurna Awaits You",
    subtitle: "Experience breathtaking mountain trails and warm hospitality",
    location: "Annapurna Circuit, Nepal",
  },
  {
    image: "https://images.unsplash.com/photo-1526712318848-5f38e2740d44?w=1920&q=80",
    title: "Wildlife in the Terai Plains",
    subtitle: "Safari through Chitwan and spot one-horned rhinos",
    location: "Chitwan National Park, Nepal",
  },
  {
    image: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1920&q=80",
    title: "Serenity at Phewa Lake",
    subtitle: "Unwind in Pokhara, the gateway to the Himalayas",
    location: "Pokhara, Nepal",
  },
]

const stats = [
  { value: "46+", label: "Destinations" },
  { value: "50+", label: "Verified Guides" },
  { value: "1000+", label: "Happy Travelers" },
]

// Static particles - no animation, just decoration
const particles = [
  { x: 15, y: 20, opacity: 0.3 },
  { x: 75, y: 35, opacity: 0.2 },
  { x: 30, y: 70, opacity: 0.25 },
  { x: 85, y: 60, opacity: 0.2 },
  { x: 50, y: 45, opacity: 0.3 },
]

export function Hero() {
  const [current, setCurrent] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % heroSlides.length)
  }, [])

  useEffect(() => {
    if (!isAutoPlaying) return
    const timer = setInterval(nextSlide, 5000)
    return () => clearInterval(timer)
  }, [isAutoPlaying, nextSlide])

  const slide = heroSlides[current]

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background images - optimized transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0 will-change-[opacity]"
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover"
            priority={current === 0}
            sizes="100vw"
          />
        </motion.div>
      </AnimatePresence>

      {/* Static gradient overlays - no animation */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 pointer-events-none" />

      {/* Static particles - no animation for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/20"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: p.opacity,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 text-center">
        {/* Location badge - no blur, simple fade */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`loc-${current}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2"
          >
            <MapPin className="h-3.5 w-3.5 text-white/80" />
            <span className="text-sm font-medium text-white/90">
              {slide.location}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Animated heading */}
        <AnimatePresence mode="wait">
          <motion.div key={`text-${current}`}>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl md:text-6xl lg:text-7xl tracking-tight font-[family-name:var(--font-inter)]"
              style={{ 
                textShadow: '0 4px 30px rgba(0,0,0,0.3)'
              }}
            >
              {slide.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
              className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg md:text-xl font-[family-name:var(--font-inter)]"
              style={{ 
                textShadow: '0 2px 20px rgba(0,0,0,0.2)'
              }}
            >
              {slide.subtitle}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* CTA Button - optimized, no spring physics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link href="/register" className="group">
            <Button
              size="lg"
              className="relative overflow-hidden bg-white text-[hsl(228_72%_12%)] px-10 py-7 text-base font-bold shadow-2xl shadow-black/30 transition-all duration-200 hover:bg-white/95 hover:shadow-3xl hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Your Journey
                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </Button>
          </Link>

          <Link href="/destinations" className="group">
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white/25 bg-white/5 px-10 py-7 text-base font-semibold text-white transition-all duration-200 hover:bg-white/15 hover:border-white/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="mr-2 h-4 w-4 opacity-70 transition-transform duration-200 group-hover:scale-110" />
              Explore Destinations
            </Button>
          </Link>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
          className="mt-16 mx-auto max-w-lg will-change-[opacity,transform]"
        >
          <div className="flex items-center justify-center gap-0 rounded-2xl border border-white/10 bg-black/20 divide-x divide-white/10 overflow-hidden backdrop-blur-sm">
            {stats.map((stat) => (
              <div key={stat.label} className="flex-1 py-4 text-center">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {stat.value}
                </p>
                <p className="text-[11px] font-medium text-white/55 mt-0.5 uppercase tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrent(i)
              setIsAutoPlaying(false)
              setTimeout(() => setIsAutoPlaying(true), 10000)
            }}
            className="group relative h-[3px] overflow-hidden rounded-full transition-all duration-500"
            style={{ width: i === current ? 36 : 10, opacity: i === current ? 1 : 0.4 }}
            aria-label={`Go to slide ${i + 1}`}
          >
            <span className="absolute inset-0 rounded-full bg-white/40" />
            {i === current && (
              <motion.span
                className="absolute inset-0 rounded-full bg-white"
                initial={{ scaleX: 0, transformOrigin: "left" }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 5, ease: "linear" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}
