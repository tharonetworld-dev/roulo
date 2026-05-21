import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { LaunchBanner } from "@/components/LaunchBanner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Roulo",
  description:
    "Can't decide? Let Roulo decide. AI-powered decision wheels — type your dilemma, spin, settle it. 30 days Pro free, no credit card required.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LaunchBanner />
        {children}
      </body>
    </html>
  )
}
