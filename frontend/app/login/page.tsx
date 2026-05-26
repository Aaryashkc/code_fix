"use client"

import { useState, useContext } from "react"
import Link from "next/link"
import { Mountain, Eye, EyeOff, ChevronRight, Mail, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthContext } from "@/context/AuthContext"
import { AnimatedSidePanel } from "@/components/auth/animated-side-panel"
import { motion } from "framer-motion"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const auth = useContext(AuthContext)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await auth?.login(email, password)
      // If we get here, redirect is happening
    } catch (err: any) {
      setError(err.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background" suppressHydrationWarning>
      {/* Animated left panel */}
      <AnimatedSidePanel />

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8" suppressHydrationWarning>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
          suppressHydrationWarning
        >
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center">
              <span 
                className="text-2xl font-bold text-foreground"
                style={{
                  fontFamily: "'Playfair Display', 'Georgia', serif",
                  letterSpacing: "0.02em"
                }}
              >
                Yātra
              </span>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <h2 className="font-serif text-2xl font-bold text-foreground">Sign in to your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary font-medium hover:underline">
                Register
              </Link>
            </p>
          </motion.div>

          {/* OTP Login Option */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-6 text-center"
          >
            <p className="text-sm text-muted-foreground mb-3">
              Or sign in without password
            </p>
            <Link href="/login-otp">
              <Button
                variant="outline"
                className="w-full group"
              >
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Login with OTP
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Button>
            </Link>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md"
            >
              <p className="text-sm text-red-600">{error}</p>
            </motion.div>
          )}

          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
            suppressHydrationWarning
          >
            <div suppressHydrationWarning>
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-11"
                suppressHydrationWarning
              />
            </div>
            <div suppressHydrationWarning>
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative mt-1.5" suppressHydrationWarning>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 h-11"
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  suppressHydrationWarning
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded border-border" />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button
                type="submit"
                disabled={loading}
                className="group w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 h-12 text-base font-semibold"
                size="lg"
              >
                {loading ? 'Signing in...' : (
                  <span className="flex items-center gap-2">
                    Sign In
                    <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                )}
              </Button>
            </motion.div>
          </motion.form>
        </motion.div>
      </div>
    </div>
  )
}
