"use client"

import { useState, useEffect, useContext } from "react"
import Link from "next/link"
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { AuthContext, type UserRole } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Explore", href: "/destinations" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
]

function getDashboardRoute(role: UserRole): string {
  if (role === "admin") return "/admin/dashboard"
  if (role === "guide") return "/guide/dashboard"
  return "/user/dashboard"
}

export function Navbar({ solid = false }: { solid?: boolean }) {
  const auth = useContext(AuthContext)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dashboardRoute = auth?.user ? getDashboardRoute(auth.user.role) : "/"

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled || solid
          ? "bg-card/95 backdrop-blur-xl border-b border-border shadow-sm"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(228_72%_18%)] via-[hsl(228_65%_28%)] to-[hsl(228_55%_40%)] shadow-lg shadow-[hsl(228_72%_8%)]/40">
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
          <motion.span
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
            className={cn(
              "text-2xl font-bold tracking-tight transition-colors duration-500 ",
              scrolled || solid ? "text-foreground" : "text-white"
            )}
          >
            Yatra
          </motion.span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link, i) => (
            <motion.a
              key={link.href}
              href={link.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className={cn(
                "relative text-sm font-medium transition-colors duration-300 hover:text-primary",
                scrolled || solid ? "text-muted-foreground" : "text-white/80 hover:text-white"
              )}
            >
              {link.label}
            </motion.a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {!auth?.isLoading && (
            auth?.user ? (
              <>
                <Link href={dashboardRoute}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-2 font-medium transition-colors duration-300",
                      scrolled || solid
                        ? "text-foreground hover:bg-muted"
                        : "text-white hover:bg-white/10"
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={() => auth.logout()}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "font-medium transition-colors duration-300",
                      scrolled || solid
                        ? "text-foreground hover:bg-muted"
                        : "text-white hover:bg-white/10"
                    )}
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 font-medium"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className={cn(
            "md:hidden transition-colors",
            scrolled || solid ? "text-foreground" : "text-white"
          )}
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden bg-card border-b border-border"
          >
            <div className="flex flex-col gap-4 px-4 py-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-2">
                {!auth?.isLoading && (
                  auth?.user ? (
                    <>
                      <Link href={dashboardRoute} onClick={() => setOpen(false)}>
                        <Button variant="outline" className="w-full gap-2 text-foreground border-border bg-transparent">
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Button>
                      </Link>
                      <Button
                        onClick={() => {
                          setOpen(false)
                          auth.logout()
                        }}
                        className="w-full gap-2 bg-primary text-primary-foreground"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setOpen(false)}>
                        <Button variant="outline" className="w-full text-foreground border-border bg-transparent">
                          Login
                        </Button>
                      </Link>
                      <Link href="/register" onClick={() => setOpen(false)}>
                        <Button className="w-full bg-primary text-primary-foreground">
                          Get Started
                        </Button>
                      </Link>
                    </>
                  )
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
