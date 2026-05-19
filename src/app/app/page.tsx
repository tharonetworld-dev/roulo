import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function AppPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-3xl font-bold mb-2">Roulo</h1>
      <p className="text-muted-foreground mb-8">Hi {user.email} 👋</p>

      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        >
          Sign Out
        </button>
      </form>
    </main>
  )
}
