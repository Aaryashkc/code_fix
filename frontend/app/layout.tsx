import React from "react"
import type { Metadata, Viewport } from "next"
import { Manrope, Cormorant_Garamond } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/AuthContext"
import { NotificationProvider } from "@/context/NotificationContext"
import { SocketProvider } from "@/context/SocketContext"
import { ErrorBoundary } from "@/components/error-boundary"
import { AuthEventHandler } from "@/components/AuthEventHandler"
import { Toaster } from "@/components/ui/sonner"

import "./globals.css"

const inter = Manrope({ subsets: ["latin"], variable: "--font-inter" })
const playfair = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Yatra — Explore Nepal with Local Guides",
  description:
    "Connect with verified local guides, discover hidden Himalayan gems, and map your perfect Nepal journey. Your premium travel companion.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Yatra",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Yatra — Explore Nepal with Local Guides",
    description:
      "Discover Nepal's hidden gems with verified local guides. Premium Himalayan travel platform.",
    type: "website",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0D7C66" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1628" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`scroll-smooth ${inter.variable} ${playfair.variable}`}
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <AuthProvider>
              <SocketProvider>
                <NotificationProvider>
                  <AuthEventHandler />
                  {children}
                  <Toaster />
                </NotificationProvider>
              </SocketProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
