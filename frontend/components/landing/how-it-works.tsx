"use client"

import { motion } from "framer-motion"

const steps = [
  {
    num: "01",
    title: "Define Your Vision",
    description: "Tell us about your interests, budget, physical fitness levels, and desired pacing.",
  },
  {
    num: "02",
    title: "Curate the Route",
    description: "Receive bespoke destination suggestions and tailored itinerary recommendations.",
  },
  {
    num: "03",
    title: "Secure Verified Guides",
    description: "Browse certified local experts, review profiles, and secure your perfect trail companion.",
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
}

const stepVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative bg-card py-24 lg:py-32 overflow-hidden">
      {/* Structural horizontal rules */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80 dark:text-primary/95">
            The Process
          </span>
          <h2 className="mt-4 text-balance font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            How It Works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            A seamless, three-stage journey to realizing your custom-made Himalayan adventure.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-20 grid gap-0 md:grid-cols-3 divide-y divide-border/60 md:divide-y-0 md:divide-x md:divide-border/40"
        >
          {steps.map((step) => (
            <motion.div
              key={step.num}
              variants={stepVariants}
              className="relative p-8 md:p-12 flex flex-col items-start transition-all duration-300 group hover:bg-background/40"
            >
              {/* Massive, elegant serif background number */}
              <div className="text-6xl md:text-7xl font-serif font-black tracking-tighter text-primary/10 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:text-primary/20 select-none">
                {step.num}
              </div>

              <h3 className="mt-6 text-lg font-bold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
                {step.title}
              </h3>
              
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

