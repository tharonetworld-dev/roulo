"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PricingPage() {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null)
  const [error, setError] = useState("")

  async function handleCheckout(plan: "monthly" | "yearly") {
    setLoading(plan)
    setError("")
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Something went wrong")
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout failed")
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Roulo
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link href="/app">Back to app</Link>
        </Button>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Simple pricing</h1>
          <p className="text-muted-foreground text-lg">
            Try free for 30 days — no card required.
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Monthly */}
          <div className="rounded-2xl border border-border bg-card p-8 flex flex-col gap-5">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
                Monthly
              </p>
              <p className="text-4xl font-bold mt-1">
                $4.99
                <span className="text-base font-normal text-muted-foreground">
                  /mo
                </span>
              </p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground text-left flex-1">
              <li>✓ Unlimited wheels</li>
              <li>✓ Unlimited AI generations</li>
              <li>✓ Full spin history</li>
              <li>✓ Cancel any time</li>
            </ul>
            <Button
              onClick={() => handleCheckout("monthly")}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === "monthly" ? "Redirecting…" : "Start 30-day free trial"}
            </Button>
          </div>

          {/* Yearly */}
          <div className="rounded-2xl border-2 border-primary bg-card p-8 flex flex-col gap-5 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
              Best value
            </span>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
                Yearly
              </p>
              <p className="text-4xl font-bold mt-1">
                $39
                <span className="text-base font-normal text-muted-foreground">
                  /yr
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                $3.25/mo — save 35%
              </p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground text-left flex-1">
              <li>✓ Everything in Monthly</li>
              <li>✓ 35% savings vs monthly</li>
              <li>✓ Priority support</li>
            </ul>
            <Button
              onClick={() => handleCheckout("yearly")}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === "yearly" ? "Redirecting…" : "Start 30-day free trial"}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground max-w-sm">
          No credit card required to start your 30-day trial. You&apos;ll only
          be charged if you choose to subscribe after the trial ends.
        </p>
      </section>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        <Link href="/" className="hover:underline">
          ← Back to Roulo
        </Link>
      </footer>
    </main>
  )
}
