import Link from "next/link"
import { Button } from "@/components/ui/button"

const FEATURES = [
  {
    icon: "🎯",
    title: "Spin to decide",
    desc: "Stop overthinking. Let the wheel pick for you in seconds.",
  },
  {
    icon: "✨",
    title: "AI-generated options",
    desc: "Describe your decision and Claude fills the wheel with smart choices.",
  },
  {
    icon: "🗂️",
    title: "Multiple wheels",
    desc: "Create a wheel for every recurring decision — dinner, tasks, games.",
  },
  {
    icon: "📋",
    title: "Spin history",
    desc: "See what the wheel decided before so you don't repeat yourself.",
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <span className="text-xl font-bold tracking-tight">Roulo</span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 gap-6">
        {/* Decorative wheel */}
        <div
          className="w-32 h-32 rounded-full mb-2"
          style={{
            background:
              "conic-gradient(#6366f1 0deg 45deg, #8b5cf6 45deg 90deg, #ec4899 90deg 135deg, #f59e0b 135deg 180deg, #10b981 180deg 225deg, #3b82f6 225deg 270deg, #f97316 270deg 315deg, #14b8a6 315deg 360deg)",
            boxShadow: "0 8px 40px rgba(99,102,241,0.25)",
          }}
        />

        <div className="space-y-3 max-w-xl">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            Stop debating.
            <br />
            <span className="text-primary">Start spinning.</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Roulo turns any decision into a satisfying spin of the wheel.
            Powered by AI, saved to your account, ready in seconds.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          <Button asChild size="lg" className="text-base px-8">
            <Link href="/login">Get started free</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-4xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-border bg-card p-5 flex gap-4 items-start"
          >
            <span className="text-2xl">{f.icon}</span>
            <div>
              <p className="font-semibold text-foreground">{f.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="text-center px-4 py-16 space-y-4">
        <p className="text-2xl font-bold">Ready to let fate decide?</p>
        <Button asChild size="lg">
          <Link href="/login">Create your first wheel</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Roulo — Built with Next.js &amp; Claude AI
      </footer>
    </main>
  )
}
