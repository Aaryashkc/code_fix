"use client"

import { Heart, Search, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"

const steps = [
  {
    num: "01",
    icon: Heart,
    title: "Set Your Preferences",
    description: "Tell us about your interests, budget, fitness level, and travel style.",
    color: "from-rose-500 to-pink-600",
  },
  {
    num: "02",
    icon: Search,
    title: "Get Recommendations",
    description: "Receive personalized destination suggestions and curated itineraries.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    num: "03",
    icon: CheckCircle,
    title: "Book Your Guide",
    description: "Browse verified guides, compare profiles, and book your perfect match.",
    color: "from-[hsl(228_62%_30%)] to-[hsl(228_55%_50%)]",
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2 },
  },
}

const stepVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative bg-card py-24 lg:py-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            Simple Process
          </span>
          <h2 className="mt-6 text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            How It Works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Three simple steps to your perfect Nepal adventure
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="relative mt-20 grid gap-12 md:grid-cols-3 md:gap-8"
        >
          {/* Animated dashed connecting line (desktop) */}
          <div className="absolute top-[36px] left-[20%] hidden h-[2px] w-[60%] md:block overflow-hidden">
            <motion.div
              className="h-full w-full border-t-2 border-dashed border-primary/20"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
              style={{ transformOrigin: "left" }}
            />
          </div>

          {steps.map((step) => (
            <motion.div
              key={step.num}
              variants={stepVariants}
              className="relative flex flex-col items-center text-center"
            >
              {/* Step indicator - refined circle */}
              <motion.div
                whileHover={{ scale: 1.08 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="relative z-10"
              >
                <div className={`flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br ${step.color} shadow-lg shadow-primary/10`}>
                  <step.icon className="h-8 w-8 text-white" strokeWidth={1.75} />
                </div>
                <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-background border-2 border-border text-xs font-bold text-foreground shadow-sm">
                  {step.num}
                </div>
              </motion.div>

              <h3 className="mt-6 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
