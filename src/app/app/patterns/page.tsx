import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { isPro } from "@/lib/access"
import { Button } from "@/components/ui/button"

export default async function PatternsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Check if Pro
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, trial_ends_at")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .single()

  const isProUser = isPro(profile, subscription)

  // If not Pro, show upgrade prompt
  if (!isProUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold mb-4">Unlock Your Patterns</h1>
          <p className="text-muted-foreground mb-8">
            See your decision history, win rates, and discover patterns in how Roulo helps you decide.
          </p>
          <Button asChild size="lg">
            <Link href="/pricing">Upgrade to Pro</Link>
          </Button>
        </div>
      </div>
    )
  }

  const service = createServiceClient()

  // Get spin stats for this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const { data: monthSpins } = await service
    .from("wheel_spins")
    .select("id, result_option, wheel_id, spun_at")
    .eq("user_id", user.id)
    .gte("spun_at", monthStart.toISOString())

  const totalSpins = monthSpins?.length ?? 0

  // Early return if <5 spins
  if (totalSpins < 5) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/app" className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block">
            ← Back
          </Link>
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-2">Your patterns are coming</h1>
            <p className="text-muted-foreground">
              Spin a few more wheels and your decision patterns will show up here.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Get outcomes for stats
  const { data: outcomes } = await service
    .from("wheel_outcomes")
    .select("spin_id, rating")
    .in(
      "spin_id",
      monthSpins?.map((s) => s.id) ?? []
    )

  // Calculate follow-through rate (positive + didn't_try vs negative)
  const ratedSpins = outcomes?.length ?? 0
  const positiveOrDidntTry = outcomes?.filter((o) => o.rating !== "negative").length ?? 0
  const followThroughRate = ratedSpins > 0 ? Math.round((positiveOrDidntTry / ratedSpins) * 100) : 0

  // Get most-spun wheel this month
  const { data: wheelStats } = await service
    .from("wheel_spins")
    .select("wheel_id, wheels(name)")
    .eq("user_id", user.id)
    .gte("spun_at", monthStart.toISOString())

  const wheelCounts: Record<string, { name: string; count: number }> = {}
  wheelStats?.forEach(
    (s: { wheel_id: string; wheels: { name: string } | null }) => {
      const wheelId = s.wheel_id
      const wheelName = s.wheels?.name || "Unknown"
      if (!wheelCounts[wheelId]) {
        wheelCounts[wheelId] = { name: wheelName, count: 0 }
      }
      wheelCounts[wheelId].count++
    }
  )

  const mostSpunWheel = Object.values(wheelCounts).sort((a, b) => b.count - a.count)[0]?.name ?? "—"

  // Get top winners (positive outcomes)
  const { data: topWinners } = await service
    .from("wheel_outcomes")
    .select("spin_id, wheel_spins(result_option)")
    .eq("rating", "positive")
    .in(
      "spin_id",
      monthSpins?.map((s) => s.id) ?? []
    )

  const optionCounts: Record<string, number> = {}
  topWinners?.forEach(
    (w: { wheel_spins: { result_option: string } | null }) => {
      const option = w.wheel_spins?.result_option || "Unknown"
      optionCounts[option] = (optionCounts[option] ?? 0) + 1
    }
  )

  const topFive = Object.entries(optionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([option, count]) => ({ option, count }))

  // Get bottom options (negative outcomes)
  const { data: bottomOptions } = await service
    .from("wheel_outcomes")
    .select("spin_id, wheel_spins(result_option)")
    .eq("rating", "negative")
    .in(
      "spin_id",
      monthSpins?.map((s) => s.id) ?? []
    )

  const negativeOptionCounts: Record<string, number> = {}
  bottomOptions?.forEach(
    (b: { wheel_spins: { result_option: string } | null }) => {
      const option = b.wheel_spins?.result_option || "Unknown"
      negativeOptionCounts[option] = (negativeOptionCounts[option] ?? 0) + 1
    }
  )

  const bottomFive = Object.entries(negativeOptionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([option, count]) => ({ option, count }))

  // Calculate decision streak (longest consecutive days with spins)
  const { data: allSpins } = await service
    .from("wheel_spins")
    .select("spun_at")
    .eq("user_id", user.id)
    .order("spun_at", { ascending: false })

  const spinDates = new Set(
    allSpins?.map((s) => new Date(s.spun_at).toDateString()) ?? []
  )

  let maxStreak = 0
  let currentStreak = 0
  let lastDate: Date | null = null

  Array.from(spinDates)
    .sort()
    .reverse()
    .forEach((dateStr) => {
      const date = new Date(dateStr)
      if (!lastDate) {
        currentStreak = 1
        lastDate = date
      } else {
        const diffDays = Math.floor(
          (lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (diffDays === 1) {
          currentStreak++
        } else {
          maxStreak = Math.max(maxStreak, currentStreak)
          currentStreak = 1
        }
        lastDate = date
      }
    })

  maxStreak = Math.max(maxStreak, currentStreak)

  // Get recent spins (last 20) with outcomes
  const { data: recentSpins } = await service
    .from("wheel_spins")
    .select("id, result_option, spun_at, wheel_id, wheels(name)")
    .eq("user_id", user.id)
    .order("spun_at", { ascending: false })
    .limit(20)

  const { data: recentOutcomes } = await service
    .from("wheel_outcomes")
    .select("spin_id, rating")
    .in(
      "spin_id",
      recentSpins?.map((s) => s.id) ?? []
    )

  const outcomeMap: Record<string, string> = {}
  recentOutcomes?.forEach((o) => {
    outcomeMap[o.spin_id] = o.rating
  })

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/app" className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block">
          ← Back
        </Link>

        <h1 className="text-3xl font-bold mb-8">Your Decision Patterns</h1>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* This month at a glance */}
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-4">
              This month
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold">{totalSpins}</p>
                <p className="text-xs text-muted-foreground">Spins</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{followThroughRate}%</p>
                <p className="text-xs text-muted-foreground">
                  Follow-through rate
                </p>
              </div>
              <div>
                <p className="text-lg font-semibold truncate">{mostSpunWheel}</p>
                <p className="text-xs text-muted-foreground">Most-spun wheel</p>
              </div>
            </div>
          </div>

          {/* Top winners */}
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-4">
              👍 Top winners
            </p>
            <div className="space-y-2">
              {topFive.length > 0 ? (
                topFive.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="truncate pr-2">{item.option}</span>
                    <span className="font-semibold text-emerald-600">{item.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No rated spins yet</p>
              )}
            </div>
          </div>

          {/* Bottom of the barrel */}
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-4">
              👎 Bottom of the barrel
            </p>
            <p className="text-xs text-muted-foreground mb-4 italic">
              Roulo is quietly down-weighting these.
            </p>
            <div className="space-y-2">
              {bottomFive.length > 0 ? (
                bottomFive.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="truncate pr-2">{item.option}</span>
                    <span className="font-semibold text-red-600">{item.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No negative ratings yet</p>
              )}
            </div>
          </div>

          {/* Decision streak */}
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-4">
              🔥 Decision streak
            </p>
            <div>
              <p className="text-4xl font-bold">{maxStreak}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Consecutive days with spins
              </p>
            </div>
          </div>
        </div>

        {/* Recent spins table */}
        <div className="rounded-lg border border-border bg-card">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">Recent spins</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Wheel
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Result
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentSpins?.map(
                  (spin: {
                    id: string
                    result_option: string
                    spun_at: string
                    wheels: { name: string } | null
                  }) => {
                    const rating = outcomeMap[spin.id]
                    const ratingLabel =
                      rating === "positive"
                        ? "👍 Positive"
                        : rating === "negative"
                          ? "👎 Negative"
                          : rating === "didnt_try"
                            ? "— Didn't try"
                            : "—"
                    const date = new Date(spin.spun_at).toLocaleDateString()

                    return (
                      <tr key={spin.id} className="border-b border-border hover:bg-muted/50">
                        <td className="px-6 py-4">
                          {spin.wheels?.name || "Unknown"}
                        </td>
                        <td className="px-6 py-4 font-medium">{spin.result_option}</td>
                        <td className="px-6 py-4 text-muted-foreground">{date}</td>
                        <td className="px-6 py-4">{ratingLabel}</td>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
