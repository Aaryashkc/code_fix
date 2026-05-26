"use client"

import { useState, useContext, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Check, CheckCircle, Eye, EyeOff, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { AuthContext } from "@/context/AuthContext"
import { AnimatedSidePanel } from "@/components/auth/animated-side-panel"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/runtimeConfig"

const steps = ["Account", "Preferences", "Confirmation"]

const categories = [
  { id: "religious", label: "Religious Sites", icon: "om" },
  { id: "nature", label: "Nature & Wildlife", icon: "tree" },
  { id: "adventure", label: "Adventure Sports", icon: "mountain" },
  { id: "cultural", label: "Cultural Heritage", icon: "landmark" },
  { id: "urban", label: "Urban Exploration", icon: "building" },
]

type RegistrationApiError = {
  response?: {
    data?: {
      message?: string
      errors?: Array<{ field?: string; message?: string }>
    }
  }
  message?: string
}

function getRegistrationErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const registrationError = error as RegistrationApiError
    const fieldErrors = registrationError.response?.data?.errors
      ?.map((entry) => `${entry.field}: ${entry.message}`)
      .join(", ")

    return fieldErrors || registrationError.response?.data?.message || registrationError.message || "Registration failed"
  }

  return "Registration failed"
}

export default function RegisterPage() {
  const [step, setStep] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [emailOtpLoading, setEmailOtpLoading] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [devEmailOtpHint, setDevEmailOtpHint] = useState("")
  const auth = useContext(AuthContext)

  // Form state
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    country: "Nepal",
    phone: "",
    emailOtp: "",
    emergencyName: "",
    emergencyPhone: "",
    selectedCategories: [] as string[],
    budget: "Mid-range",
    fitness: "Medium",
    travelStyle: "Solo",
    duration: "1 week",
  })

  const updateForm = (key: string, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleCategory = (id: string) => {
    setForm((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(id)
        ? prev.selectedCategories.filter((c) => c !== id)
        : [...prev.selectedCategories, id],
    }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB")
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const getPasswordStrength = () => {
    const { password } = form
    if (password.length === 0) return { label: "", color: "" }
    if (password.length < 6) return { label: "Weak", color: "bg-destructive" }
    if (password.length < 10) return { label: "Medium", color: "bg-accent" }
    return { label: "Strong", color: "bg-success" }
  }

  const strength = getPasswordStrength()

  const sendEmailOtp = async () => {
    if (!form.email) return
    
    setEmailOtpLoading(true)
    setDevEmailOtpHint("")
    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-registration-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email })
      })
      
      const data = await response.json()
      if (data.success) {
        setEmailOtpSent(true)
        if (data?.emailDeliveryFailed && data?.devOtp) {
          setDevEmailOtpHint(String(data.devOtp))
          toast.error("Email delivery failed in local mode. Using fallback OTP.")
        } else {
          toast.success(`Verification code sent to ${form.email}`)
        }
      } else {
        toast.error(data.message || 'Failed to send verification code')
      }
    } catch {
      toast.error('Failed to send verification code')
    } finally {
      setEmailOtpLoading(false)
    }
  }
  
  const verifyEmailOtp = useCallback(async () => {
    if (!form.emailOtp || form.emailOtp.length !== 6) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-registration-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp: form.emailOtp })
      })
      
      const data = await response.json()
      if (data.success) {
        setEmailVerified(true)
        setError("")
      } else {
        setError(data.message || 'Invalid verification code')
        setEmailVerified(false)
      }
    } catch {
      setError('Failed to verify code')
      setEmailVerified(false)
    }
  }, [form.email, form.emailOtp])
  
  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (form.emailOtp?.length === 6 && !emailVerified) {
      verifyEmailOtp()
    }
  }, [emailVerified, form.emailOtp, verifyEmailOtp])

  const handleRegister = async () => {
    if (!form.fullName || !form.email || !form.password) {
      setError("Please fill in all required fields")
      return
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    // Check password requirements
    const hasUpperCase = /[A-Z]/.test(form.password)
    const hasLowerCase = /[a-z]/.test(form.password)
    const hasNumber = /\d/.test(form.password)
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, and one number")
      return
    }

    setLoading(true)
    setError("")

    try {
      await auth?.register({
        name: form.fullName,
        email: form.email,
        password: form.password,
        country: form.country,
        phone: form.phone ? `+977${form.phone}` : undefined,
        emergencyContact: form.emergencyName && form.emergencyPhone ? {
          name: form.emergencyName,
          phone: form.emergencyPhone
        } : undefined,
        preferences: {
          categories: form.selectedCategories,
          budget: form.budget,
          fitness: form.fitness,
          travelStyle: form.travelStyle,
          duration: form.duration
        }
      })
    } catch (err: unknown) {
      console.error('Registration error:', err)
      if (typeof err === "object" && err !== null && "response" in err) {
        console.error('Error response:', (err as RegistrationApiError).response?.data)
      }
      setError(getRegistrationErrorMessage(err))
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
          className="w-full max-w-lg"
          suppressHydrationWarning
        >
          {/* Mobile logo */}
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

          {/* Progress */}
          <div className="mb-10 flex items-center justify-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:inline",
                    i === step ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s}
                </span>
                {i < steps.length - 1 && <div className="h-px w-8 bg-border sm:w-12" />}
              </div>
            ))}
          </div>

          {/* Step 1: Account */}
          {step === 0 && (
            <div className="space-y-5" suppressHydrationWarning>
              <div>
                <h2 className="font-serif text-2xl font-bold text-foreground">Create your account</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary font-medium hover:underline">
                    Login
                  </Link>
                </p>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-4" suppressHydrationWarning>
                <div>
                  <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={form.fullName}
                    onChange={(e) => updateForm("fullName", e.target.value)}
                    className="mt-1"
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    className="mt-1"
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-foreground">Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={form.password}
                      onChange={(e) => updateForm("password", e.target.value)}
                      className="pr-10"
                      suppressHydrationWarning
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      suppressHydrationWarning
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.password.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", strength.color)}
                          style={{
                            width:
                              strength.label === "Weak"
                                ? "33%"
                                : strength.label === "Medium"
                                  ? "66%"
                                  : "100%",
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{strength.label}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={form.confirmPassword}
                    onChange={(e) => updateForm("confirmPassword", e.target.value)}
                    className="mt-1"
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
                  <div className="flex mt-1">
                    <div className="flex items-center justify-center px-3 py-2 border border-r-0 border-input rounded-l-md bg-muted text-muted-foreground text-sm font-medium">
                      +977
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9841234567"
                      value={form.phone}
                      onChange={(e) => updateForm("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="rounded-l-none flex-1"
                      maxLength={10}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Enter your 10-digit Nepali mobile number</p>
                </div>
                
                {/* Email Verification */}
                <div>
                  <Label htmlFor="emailOtp" className="text-foreground">Verify Email Address</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="emailOtp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={form.emailOtp}
                      onChange={(e) => updateForm("emailOtp", e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="flex-1"
                      maxLength={6}
                      disabled={!form.email || emailVerified}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={sendEmailOtp}
                      disabled={!form.email || emailOtpLoading || emailVerified}
                      className="whitespace-nowrap"
                    >
                      {emailOtpLoading ? "Sending..." : emailVerified ? "Verified" : emailOtpSent ? "Resend" : "Send Code"}
                    </Button>
                  </div>
                  {emailVerified && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Email verified successfully
                    </p>
                  )}
                  {emailOtpSent && !emailVerified && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Code sent to {form.email}. Valid for 10 minutes.
                    </p>
                  )}
                  {devEmailOtpHint && !emailVerified && (
                    <p className="text-xs text-amber-700 mt-1">
                      Email delivery failed in local mode. Use OTP: <span className="font-semibold tracking-widest">{devEmailOtpHint}</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyName" className="text-foreground">Emergency Contact</Label>
                    <Input
                      id="emergencyName"
                      placeholder="Contact name"
                      value={form.emergencyName}
                      onChange={(e) => updateForm("emergencyName", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone" className="text-foreground">Emergency Phone</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      placeholder="Phone number"
                      value={form.emergencyPhone}
                      onChange={(e) => updateForm("emergencyPhone", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                {/* Profile picture upload */}
                <div>
                  <Label className="text-foreground">Profile Picture (Optional)</Label>
                  <div className="mt-1 flex items-center gap-4">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-muted overflow-hidden">
                      {avatarPreview ? (
                        <Image
                          src={avatarPreview}
                          alt="Avatar preview"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-foreground border-border bg-transparent"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {avatarPreview ? "Change Photo" : "Upload Photo"}
                      </Button>
                      {avatarPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-2 text-destructive"
                          onClick={() => {
                            setAvatarPreview("")
                            if (fileInputRef.current) fileInputRef.current.value = ""
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-foreground">Travel Preferences</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Help us personalize your experience
                </p>
              </div>

              {/* Categories */}
              <div>
                <Label className="text-foreground font-medium">Interests (select multiple)</Label>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all",
                        form.selectedCategories.includes(cat.id)
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <span className="text-sm font-medium">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <Label className="text-foreground font-medium">Budget Level</Label>
                <RadioGroup
                  value={form.budget}
                  onValueChange={(v) => updateForm("budget", v)}
                  className="mt-3 flex gap-3"
                >
                  {["Budget", "Mid-range", "Luxury"].map((b) => (
                    <Label
                      key={b}
                      className={cn(
                        "flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-3 text-sm font-medium transition-all",
                        form.budget === b
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      <RadioGroupItem value={b} className="sr-only" />
                      {b}
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Fitness */}
              <div>
                <Label className="text-foreground font-medium">Fitness Level</Label>
                <RadioGroup
                  value={form.fitness}
                  onValueChange={(v) => updateForm("fitness", v)}
                  className="mt-3 flex gap-3"
                >
                  {[
                    { value: "Low", desc: "Light walks" },
                    { value: "Medium", desc: "Day hikes" },
                    { value: "High", desc: "Multi-day treks" },
                  ].map((f) => (
                    <Label
                      key={f.value}
                      className={cn(
                        "flex flex-1 cursor-pointer flex-col items-center rounded-lg border-2 p-3 text-center transition-all",
                        form.fitness === f.value
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                    >
                      <RadioGroupItem value={f.value} className="sr-only" />
                      <span className="text-sm font-medium text-foreground">{f.value}</span>
                      <span className="text-xs text-muted-foreground">{f.desc}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Travel Style */}
              <div>
                <Label className="text-foreground font-medium">Travel Style</Label>
                <RadioGroup
                  value={form.travelStyle}
                  onValueChange={(v) => updateForm("travelStyle", v)}
                  className="mt-3 flex gap-3"
                >
                  {["Solo", "Group", "Family"].map((s) => (
                    <Label
                      key={s}
                      className={cn(
                        "flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-3 text-sm font-medium transition-all",
                        form.travelStyle === s
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      <RadioGroupItem value={s} className="sr-only" />
                      {s}
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="duration" className="text-foreground font-medium">Duration of Stay</Label>
                <Select
                  value={form.duration}
                  onValueChange={(v) => updateForm("duration", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["1-3 days", "1 week", "2 weeks", "1 month+"].map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 2 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold text-foreground">
                  {"You're all set!"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {"Let's explore Nepal together"}
                </p>
              </div>

              {error && (
                <div className="mx-auto max-w-sm p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="mx-auto max-w-sm rounded-xl border border-border bg-card p-6 text-left">
                <h3 className="text-sm font-semibold text-foreground">Your Preferences</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Budget</dt>
                    <dd className="font-medium text-foreground">{form.budget}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Fitness</dt>
                    <dd className="font-medium text-foreground">{form.fitness}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Style</dt>
                    <dd className="font-medium text-foreground">{form.travelStyle}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Duration</dt>
                    <dd className="font-medium text-foreground">{form.duration}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Interests</dt>
                    <dd className="font-medium text-foreground text-right">
                      {form.selectedCategories.length > 0
                        ? categories
                            .filter((c) => form.selectedCategories.includes(c.id))
                            .map((c) => c.label)
                            .join(", ")
                        : "None selected"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="font-medium text-foreground">{form.phone}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Email Verified</dt>
                    <dd className="font-medium text-foreground">{emailVerified ? "Yes" : "No"}</dd>
                  </div>
                </dl>
              </div>
              <Button
                size="lg"
                onClick={handleRegister}
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 mt-4"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </Button>
            </div>
          )}

          {/* Navigation */}
          {step < 2 && (
            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="text-muted-foreground"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => {
                  // Validate password requirements on step 1
                  if (step === 0) {
                    if (!form.fullName || !form.email || !form.password || !form.confirmPassword) {
                      setError("Please fill in all required fields")
                      return
                    }
                    if (form.password !== form.confirmPassword) {
                      setError("Passwords do not match")
                      return
                    }
                    if (form.password.length < 8) {
                      setError("Password must be at least 8 characters")
                      return
                    }
                    const hasUpperCase = /[A-Z]/.test(form.password)
                    const hasLowerCase = /[a-z]/.test(form.password)
                    const hasNumber = /\d/.test(form.password)
                    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
                      setError("Password must contain at least one uppercase letter, one lowercase letter, and one number")
                      return
                    }
                    if (!emailVerified) {
                      setError("Please verify your email before continuing")
                      return
                    }
                    setError("")
                  }
                  setStep(Math.min(2, step + 1))
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Continue
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
