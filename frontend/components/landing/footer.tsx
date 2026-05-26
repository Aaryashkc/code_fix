"use client"

import Link from "next/link"
import { ChevronRight, Facebook, Instagram, Twitter, Youtube } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

const columns = [
  {
    title: "About",
    links: [
      { label: "Our Story", href: "#" },
      { label: "Team", href: "#" },
      { label: "Careers", href: "#" },
    ],
  },
  {
    title: "Destinations",
    links: [
      { label: "Everest Region", href: "/destinations" },
      { label: "Annapurna Region", href: "/destinations" },
      { label: "Kathmandu Valley", href: "/destinations" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Guide Portal", href: "/login" },
      { label: "TAAN Verification", href: "#" },
      { label: "Travel Tips", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Safety", href: "#" },
      { label: "Contact Us", href: "#" },
      { label: "FAQs", href: "#" },
    ],
  },
]

const socials = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Youtube, href: "#", label: "YouTube" },
]

export function Footer() {
  return (
    <footer className="relative overflow-hidden">
      {/* ── CTA Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(228_72%_8%)] via-[hsl(228_65%_14%)] to-[hsl(228_58%_20%)] py-20 lg:py-28">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/[0.03]" />
        {/* Top separator */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative mx-auto max-w-4xl px-4 text-center"
        >
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80 mb-6">
            Start exploring
          </span>
          <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Ready to explore Nepal?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
            Join thousands of travelers discovering hidden gems with verified local guides.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  size="lg"
                  className="group bg-white text-[hsl(228_72%_12%)] hover:bg-white/95 px-10 py-7 text-base font-semibold shadow-2xl shadow-black/30 active:scale-[0.98]"
                >
                  Start Your Journey
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </motion.div>
            </Link>
            <Link href="/destinations">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/25 bg-white/5 text-white hover:bg-white/10 hover:border-white/40 px-10 py-7 text-base font-semibold active:scale-[0.98]"
                >
                  Browse Destinations
                </Button>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ── Main Footer ── */}
      <div className="bg-[hsl(228_72%_5%)] text-white/80">
        {/* Top rule */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-3">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(228_65%_35%)] via-[hsl(228_60%_48%)] to-[hsl(228_55%_58%)] shadow-lg shadow-[hsl(228_72%_5%)]/50">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 17l4.5-6 3.5 4 2.8-3.6 5.2 5.6" />
                    <path d="M5 19h14" />
                    <circle cx="17" cy="6.5" r="1.8" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                <span className="text-2xl font-bold text-white" style={{ letterSpacing: "0.02em" }}>
                  Yatra
                </span>
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-white/50">
                Connecting travelers with verified local guides for authentic Nepal experiences.
              </p>

              {/* Social icons */}
              <div className="mt-6 flex items-center gap-3">
                {socials.map((social) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    whileHover={{ scale: 1.15, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30 transition-all duration-300"
                    aria-label={social.label}
                  >
                    <social.icon className="h-4 w-4" />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-white/30">
                  {col.title}
                </h4>
                <ul className="mt-4 flex flex-col gap-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/50 hover:text-white transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.08] pt-8 sm:flex-row">
            <div className="flex items-center gap-2">
              <p className="text-xs text-white/30">
                &copy; 2026 Yatra. All rights reserved.
              </p>
              <span className="text-xs text-white/15">|</span>
              <span className="text-xs text-white/30">Made with ♥ in Nepal</span>
            </div>
            <div className="flex gap-6">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((label) => (
                <Link
                  key={label}
                  href="#"
                  className="text-xs text-white/30 hover:text-white/70 transition-colors duration-200"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
