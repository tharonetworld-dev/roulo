"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const STORAGE_KEY = "roulo_launch_banner_dismissed_v1"

export function LaunchBanner() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Hide on /app routes
    if (pathname.startsWith("/app")) return

    // Hide if already dismissed
    if (localStorage.getItem(STORAGE_KEY) === "1") return

    // Hide if signed in
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) setVisible(true)
    })
  }, [pathname])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-blue-600 via-fuchsia-500 to-orange-400">
      <div className="relative flex items-center justify-center px-10 py-2.5">
        <p className="text-white font-medium text-sm text-center">
          <span className="hidden sm:inline">
            🎡 Launch deal — 30 days of Roulo Pro, free. No card. No catch.
          </span>
          <span className="sm:hidden text-xs">
            30 days Pro free — no card.
          </span>
        </p>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 text-white/80 hover:text-white text-lg leading-none transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  )
}
