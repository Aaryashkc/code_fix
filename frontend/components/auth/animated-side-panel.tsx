"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin } from "lucide-react"

const slides = [
  {
    image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&q=80",
    title: "Trek to the Top of the World",
    subtitle: "Everest Base Camp with experienced Sherpa guides",
    location: "Everest Region",
  },
  {
    image: "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=1200&q=80",
    title: "Temples & Living Heritage",
    subtitle: "Centuries-old culture in the Kathmandu Valley",
    location: "Kathmandu Valley",
  },
  {
    image: "https://images.unsplash.com/photo-1528375020190-3001bb30b71d?w=1200&q=80",
    title: "The Annapurna Circuit",
    subtitle: "Breathtaking mountain trails and warm hospitality",
    location: "Annapurna Region",
  },
  {
    image: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1200&q=80",
    title: "Gateway to the Himalayas",
    subtitle: "Serene lakes and stunning mountain reflections",
    location: "Pokhara",
  },
]

export function AnimatedSidePanel() {
  const [current, setCurrent] = useState(0)

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length)
  }, [])

  useEffect(() => {
    const timer = setInterval(nextSlide, 6000)
    return () => clearInterval(timer)
  }, [nextSlide])

  const slide = slides[current]

  return (
    <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden">
      {/* Background images with crossfade */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={current}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.05, opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover"
            sizes="40vw"
            priority={current === 0}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => {
          // Fixed deterministic positions for each particle
          const positions = [
            { x: 99, y: 1 }, { x: 64, y: 73 }, { x: 60, y: 10 },
            { x: 34, y: 97 }, { x: 98, y: 26 }, { x: 89, y: 6 },
            { x: 30, y: 42 }, { x: 95, y: 93 }, { x: 58, y: 84 },
            { x: 26, y: 21 }, { x: 4, y: 67 }, { x: 11, y: 18 }
          ];
          
          const pos = positions[i % positions.length];
          const durations = [8, 10, 12, 6, 14, 9, 11, 7, 13, 15, 8, 10];
          const duration = durations[i % durations.length];
          
          return (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-white/15"
              initial={{
                x: `${pos.x}%`,
                y: `${pos.y}%`,
                opacity: 0,
              }}
              animate={{
                y: [`${pos.y}%`, `${(pos.y + 15) % 100}%`],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
            />
          );
        })}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between p-10 w-full">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <span 
            className="text-2xl font-bold text-white"
            style={{
              fontFamily: "'Playfair Display', 'Georgia', serif",
              letterSpacing: "0.02em"
            }}
          >
            Yātra
          </span>
        </Link>

        {/* Text content */}
        <div>
          {/* Location badge */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`loc-${current}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.4 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm"
            >
              <MapPin className="h-3 w-3 text-accent" />
              <span className="text-xs font-medium text-white/80">{slide.location}</span>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div key={`text-${current}`}>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="text-balance font-serif text-3xl font-bold leading-tight text-white"
              >
                {slide.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                className="mt-3 text-sm leading-relaxed text-white/70 max-w-xs"
              >
                {slide.subtitle}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Slide indicators */}
          <div className="mt-8 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="relative h-1.5 overflow-hidden rounded-full transition-all duration-500"
                style={{ width: i === current ? 28 : 8 }}
                aria-label={`Slide ${i + 1}`}
              >
                <span className="absolute inset-0 rounded-full bg-white/25" />
                {i === current && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-white"
                    initial={{ scaleX: 0, transformOrigin: "left" }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 6, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-white/30">2026 Yatra. All rights reserved.</p>
      </div>
    </div>
  )
}
