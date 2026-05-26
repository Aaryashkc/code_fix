"use client"

import { CheckCircle, MapPin, Compass, PhoneCall, Shield, Users } from "lucide-react"
import { motion } from "framer-motion"

const features = [
  {
    icon: CheckCircle,
    title: "Verified Local Guides",
    description: "All guides are TAAN-verified with background checks, ensuring safe and authentic experiences.",
    gradient: "from-[hsl(228_72%_25%)] to-[hsl(228_60%_48%)]",
    glow: "shadow-[hsl(228_62%_35%)]/25",
  },
  {
    icon: MapPin,
    title: "Personal Travel Map",
    description: "Create pins, mark visited places, and build your own interactive travel map of Nepal.",
    gradient: "from-blue-500 to-cyan-500",
    glow: "shadow-blue-500/20",
  },
  {
    icon: Compass,
    title: "Curated Recommendations",
    description: "Get personalized destination suggestions based on your interests, budget, and fitness level.",
    gradient: "from-amber-500 to-orange-500",
    glow: "shadow-amber-500/20",
  },
  {
    icon: PhoneCall,
    title: "24/7 Travel Support",
    description: "Round-the-clock assistance from our team, from booking queries to on-trail emergencies.",
    gradient: "from-rose-500 to-pink-500",
    glow: "shadow-rose-500/20",
  },
  {
    icon: Shield,
    title: "Secure Booking",
    description: "Book with confidence through our secure payment system with free cancellation options.",
    gradient: "from-teal-600 to-cyan-500",
    glow: "shadow-teal-500/20",
  },
  {
    icon: Users,
    title: "Cultural Immersion",
    description: "Go beyond sightseeing with authentic local experiences, homestays, and cultural exchanges.",
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/20",
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
}

export function Features() {
  return (
    <section className="relative bg-background py-24 lg:py-32 overflow-hidden">
      {/* Subtle background accent — navy tones */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(228_62%_25%_/_0.05),transparent_50%),radial-gradient(circle_at_70%_80%,hsl(228_62%_25%_/_0.05),transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            Why Yatra
          </span>
          <h2 className="mt-6 text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Everything you need for the perfect trip
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            From finding verified guides to planning your itinerary, we make exploring Nepal effortless
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-7 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              {/* Hover top accent line */}
              <div className={`absolute top-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r ${feature.gradient} to-transparent`} />

              {/* Gradient icon badge */}
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg ${feature.glow} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
              >
                <feature.icon className="h-6 w-6 text-white" strokeWidth={1.75} />
              </div>

              <h3 className="mt-5 text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
