"use client"

import { useState, useContext, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Mail, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AnimatedSidePanel } from "@/components/auth/animated-side-panel"
import { motion } from "framer-motion"
import { AuthContext } from "@/context/AuthContext"
import api from "@/lib/api"

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      response?: { data?: { message?: string } }
      message?: string
    }

    return maybeError.response?.data?.message || maybeError.message || fallback
  }

  return fallback
}

export default function OTPLoginPage() {
  const router = useRouter()
  const auth = useContext(AuthContext)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState("")
  const [devOtpHint, setDevOtpHint] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendDisabled, setResendDisabled] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setDevOtpHint("")
    setLoading(true)

    try {
      const response = await api.post('/auth/request-otp', { email })
      
      if (response.data.success) {
        setOtpSent(true)
        if (response.data?.emailDeliveryFailed && response.data?.devOtp) {
          setDevOtpHint(String(response.data.devOtp))
        }
        startResendCountdown()
      } else {
        setError(response.data.message || 'Failed to send OTP')
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to send OTP'))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await api.post('/auth/verify-otp', { email, otp })

      if (response.data.success) {
        localStorage.removeItem('token')
        await auth?.refreshUser()
        const role = response.data.user?.role
        if (role === 'admin') router.push('/admin/dashboard')
        else if (role === 'guide') router.push('/guide/dashboard')
        else router.push('/user/dashboard')
      } else {
        setError(response.data.message || 'Invalid OTP')
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'OTP verification failed'))
    } finally {
      setLoading(false)
    }
  }

  const startResendCountdown = () => {
    setResendDisabled(true)
    setCountdown(120)
    
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          setResendDisabled(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleResendOTP = async () => {
    await handleRequestOTP({ preventDefault: () => {} } as React.FormEvent)
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
          {/* Logo */}
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

          {/* Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold font-serif text-foreground mb-2">
              {otpSent ? 'Enter OTP' : 'Login with OTP'}
            </h1>
            <p className="text-muted-foreground">
              {otpSent 
                ? `If an account exists for ${email}, enter the 6-digit code from your email`
                : 'Enter your email to receive a one-time password'
              }
            </p>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          {devOtpHint && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-sm"
            >
              Email delivery failed in local mode. Use OTP: <span className="font-semibold tracking-widest">{devOtpHint}</span>
            </motion.div>
          )}

          {!otpSent ? (
            /* Request OTP Form */
            <form onSubmit={handleRequestOTP} className="space-y-6" suppressHydrationWarning>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </Label>
                <div className="relative" suppressHydrationWarning>
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send OTP
                    </>
                  )}
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary"
                  initial={false}
                  whileHover={{ x: ["-100%", "0%"] }}
                  transition={{ duration: 0.4 }}
                />
              </Button>
            </form>
          ) : (
            /* Verify OTP Form */
            <form onSubmit={handleVerifyOTP} className="space-y-6" suppressHydrationWarning>
              <div>
                <Label htmlFor="otp" className="text-sm font-medium text-foreground">
                  One-Time Password
                </Label>
                <div className="relative" suppressHydrationWarning>
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-10 text-center text-lg tracking-widest"
                    maxLength={6}
                    required
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Verify & Login
                    </>
                  )}
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary"
                  initial={false}
                  whileHover={{ x: ["-100%", "0%"] }}
                  transition={{ duration: 0.4 }}
                />
              </Button>

              {/* Resend OTP */}
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={resendDisabled}
                  onClick={handleResendOTP}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {resendDisabled 
                    ? `Resend OTP in ${countdown}s`
                    : "Resend OTP"
                  }
                </Button>
              </div>
            </form>
          )}

          {/* Back to password login */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link 
                href="/login" 
                className="text-primary hover:underline font-medium"
              >
                Login with password
              </Link>
            </p>
          </div>

          {/* Register link */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link 
                href="/register" 
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
