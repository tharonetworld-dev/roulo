import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-5xl font-bold tracking-tight mb-3">Roulo</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Decide anything in one spin
      </p>
      <Button asChild size="lg">
        <Link href="/login">Get Started</Link>
      </Button>
    </main>
  )
}
