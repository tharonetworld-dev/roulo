import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { WheelView } from "@/components/WheelView"

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

  // Fetch all user wheels with items
  let { data: wheels } = await supabase
    .from("wheels")
    .select("*, wheel_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // Seed default wheel for new users
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

  const activeWheel = wheels![0]

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <WheelView
          initialWheels={wheels ?? []}
          activeWheelId={activeWheel.id}
        />
      </div>
    </main>
  )
}
