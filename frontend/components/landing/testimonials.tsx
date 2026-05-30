"use client"

import { testimonials } from "@/lib/data"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
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

function TestimonialCard({ t }: { t: (typeof testimonials)[0] }) {
  return (
    <motion.div
      variants={cardVariants}
      className="group relative rounded-2xl border border-border/60 bg-card p-8 pt-16 md:p-10 md:pt-16 transition-all duration-300 hover:bg-background hover:border-primary/30"
    >
      {/* Elegant large serif quote mark - highly visible */}
      <div className="absolute top-6 left-8 text-primary/30 dark:text-primary/50 font-serif text-8xl leading-none select-none">
        “
      </div>

      <div className="relative z-10">
        {/* Subtle star text representation */}
        <div className="text-xs tracking-wider text-amber-500/80 mb-4 select-none">
          {"★".repeat(t.rating) + "☆".repeat(5 - t.rating)}
        </div>

        <p className="font-serif leading-relaxed italic text-foreground/95 text-sm md:text-base">
          {`"${t.quote}"`}
        </p>

        {/* Clean, typographical signature footer */}
        <div className="mt-8 border-t border-border/50 pt-5 flex flex-col gap-0.5">
          <span className="text-sm font-bold tracking-tight text-foreground">{t.name}</span>
          <span className="text-xs text-muted-foreground tracking-wide uppercase font-semibold">
            {t.country} {("tripType" in t && t.tripType) ? `• ${t.tripType}` : ""}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export function Testimonials() {
  return (
    <section id="testimonials" className="relative bg-card py-24 lg:py-32 overflow-hidden">
      {/* Background structural lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80 dark:text-primary/95">
            Loved by Travelers
          </span>
          <h2 className="mt-4 text-balance font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            What Our Travelers Say
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            Bespoke accounts from global adventurers who experienced Nepal with Yatra.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-2"
        >
          {testimonials.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}


