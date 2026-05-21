import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("wheels")
    .select("*, wheel_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, items } = await request.json()

  const { data: wheel, error: wheelError } = await supabase
    .from("wheels")
    .insert({ user_id: user.id, name })
    .select()
    .single()

  if (wheelError)
    return NextResponse.json({ error: wheelError.message }, { status: 500 })

  if (items?.length) {
    const { error: itemsError } = await supabase.from("wheel_items").insert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items.map((item: any, i: number) => ({
        wheel_id: wheel.id,
        label: item.label,
        weight: item.weight ?? 1,
        position: i,
      }))
    )
    if (itemsError)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json(wheel)
}
