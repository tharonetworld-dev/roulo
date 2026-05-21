import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function BillingSuccessPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4 gap-6">
      <div
        className="w-20 h-20 rounded-full"
        style={{
          background:
            "conic-gradient(#6366f1 0deg 45deg, #8b5cf6 45deg 90deg, #ec4899 90deg 135deg, #f59e0b 135deg 180deg, #10b981 180deg 225deg, #3b82f6 225deg 270deg, #f97316 270deg 315deg, #14b8a6 315deg 360deg)",
        }}
      />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">You&apos;re all set!</h1>
        <p className="text-muted-foreground">
          Your Roulo Pro subscription is active. Time to spin.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/app">Go to the app</Link>
      </Button>
    </main>
  )
}
