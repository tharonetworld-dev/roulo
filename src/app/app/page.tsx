import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SpinWheel } from "@/components/SpinWheel"

const DEFAULT_ITEMS = [
  { label: "Yes!", weight: 2 },
  { label: "No", weight: 2 },
  { label: "Maybe", weight: 1 },
  { label: "Definitely!", weight: 2 },
  { label: "Skip it", weight: 1 },
  { label: "Ask again", weight: 1 },
]

export default async function AppPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Fetch user's first wheel with items
  let { data: wheels } = await supabase
    .from("wheels")
    .select("*, wheel_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)

  // Seed a default wheel for new users
  if (!wheels || wheels.length === 0) {
    const { data: newWheel } = await supabase
      .from("wheels")
      .insert({ user_id: user.id, name: "My First Wheel" })
      .select()
      .single()

    if (newWheel) {
      await supabase.from("wheel_items").insert(
        DEFAULT_ITEMS.map((item, i) => ({
          wheel_id: newWheel.id,
          label: item.label,
          weight: item.weight,
          position: i,
        }))
      )

      const { data: refreshed } = await supabase
        .from("wheels")
        .select("*, wheel_items(*)")
        .eq("id", newWheel.id)
        .single()

      wheels = refreshed ? [refreshed] : []
    }
  }

  const wheel = wheels?.[0]
  const items = (wheel?.wheel_items ?? []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  )

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Roulo</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {wheel?.name ?? "My Wheel"}
            </p>
          </div>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Wheel */}
        {items.length > 0 ? (
          <SpinWheel wheelId={wheel!.id} items={items} />
        ) : (
          <p className="text-center text-muted-foreground py-16">
            No items on this wheel yet.
          </p>
        )}
      </div>
    </main>
  )
}
