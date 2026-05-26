"use client"

import { Star, Mountain } from "lucide-react"
import { testimonials } from "@/lib/data"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
}

function TestimonialCard({ t, featured = false }: { t: (typeof testimonials)[0]; featured?: boolean }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className={`group relative rounded-2xl border border-border/50 bg-background transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/5 ${featured ? "p-8 lg:p-10" : "p-6"}`}
    >
      {/* Typographic quote mark */}
      <span className={`leading-none font-serif text-primary/10 select-none ${featured ? "text-7xl" : "text-5xl"}`}>
        {"\u201C"}
      </span>

      <p className={`mt-1 leading-relaxed text-foreground/90 ${featured ? "text-base" : "text-sm"}`}>
        {`"${t.quote}"`}
      </p>

      {/* Trip type badge */}
      {"tripType" in t && t.tripType && (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Mountain className="h-3 w-3" />
          {t.tripType}
        </div>
      )}

      {/* Star rating */}
      <div className="mt-3 flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={`star-${t.id}-${i}`}
            className={`${featured ? "h-4 w-4" : "h-3.5 w-3.5"} ${i < t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
          />
        ))}
      </div>

      {/* Author */}
      <div className={`flex items-center gap-3 border-t border-border/50 ${featured ? "mt-5 pt-5" : "mt-4 pt-4"}`}>
        <motion.div
          whileHover={{ scale: 1.1 }}
          className={`flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 font-bold text-primary-foreground shadow-md ${featured ? "h-11 w-11 text-sm" : "h-9 w-9 text-xs"}`}
        >
          {t.name.charAt(0)}
        </motion.div>
        <div>
          <p className="text-sm font-semibold text-foreground">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.country}</p>
        </div>
      </div>
    </motion.div>
  )
}

export function Testimonials() {
  const [featured, ...rest] = testimonials

  return (
    <section id="testimonials" className="relative bg-card py-24 lg:py-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/[0.06] blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/[0.06] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            Loved by Travelers
          </span>
          <h2 className="mt-6 text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            What Our Travelers Say
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Real stories from real adventurers who explored Nepal with Yatra
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-16 grid gap-6 lg:grid-cols-12"
        >
          {/* Featured testimonial - larger card */}
          <div className="lg:col-span-5">
            <TestimonialCard t={featured} featured />
          </div>

          {/* Remaining testimonials */}
          <div className="lg:col-span-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {rest.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
