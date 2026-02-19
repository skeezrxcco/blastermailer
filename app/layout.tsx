import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import MeshGradient from "@/components/mesh-gradient"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "AI Newsletter Agent",
  description: "AI-powered newsletter creation and campaign management UI",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <MeshGradient />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
