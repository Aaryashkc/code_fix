"use client"

import { motion } from "framer-motion"

const features = [
  {
    tag: "01 / SAFETY",
    title: "Verified Local Guides",
    description: "All guides are TAAN-verified with rigorous background checks, ensuring safe and authentic alpine experiences.",
  },
  {
    tag: "02 / DISCOVERY",
    title: "Personal Travel Map",
    description: "Create pins, mark visited places, and build your own interactive travel map of Nepal's hidden paths.",
  },
  {
    tag: "03 / TAILORED",
    title: "Curated Recommendations",
    description: "Get personalized destination suggestions based on your interests, budget, and fitness level.",
  },
  {
    tag: "04 / ASSISTANCE",
    title: "24/7 Travel Support",
    description: "Round-the-clock assistance from our dedicated team, from booking queries to on-trail emergencies.",
  },
  {
    tag: "05 / CONFIDENCE",
    title: "Secure Booking",
    description: "Book with confidence through our secure payment system with free and transparent cancellation options.",
  },
  {
    tag: "06 / CONNECTION",
    title: "Cultural Immersion",
    description: "Go far beyond typical sightseeing with authentic local experiences, homestays, and deep cultural exchanges.",
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
}

export function Features() {
  return (
    <section className="relative bg-background py-24 lg:py-32 overflow-hidden">
      {/* Premium, ultra-subtle ambient background grid line */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10">
        <div className="absolute top-0 left-1/4 h-full w-px bg-gradient-to-b from-border via-transparent to-border" />
        <div className="absolute top-0 left-3/4 h-full w-px bg-gradient-to-b from-border via-transparent to-border" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-left max-w-3xl"
        >
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80 dark:text-primary/95">
            Architected for Travel
          </span>
          <h2 className="mt-4 text-balance font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Everything you need for the perfect Himalayan journey
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            From finding verified local experts to interactive navigation, we build the digital companion that makes exploring Nepal effortless.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-20 grid gap-x-12 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="group relative border-t border-border/80 pt-8 transition-all duration-300"
            >
              {/* Ultra-thin animating line under the top border */}
              <div className="absolute top-0 left-0 h-[1.5px] w-0 bg-primary transition-all duration-500 ease-out group-hover:w-full" />

              <span className="text-xs font-semibold tracking-widest text-primary/60 dark:text-primary-foreground/60 uppercase font-mono">
                {feature.tag}
              </span>
              
              <h3 className="mt-4 text-lg font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
                {feature.title}
              </h3>
              
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

