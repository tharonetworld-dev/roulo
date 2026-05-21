import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify wheel belongs to user
  const { data: wheel } = await supabase
    .from("wheels")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()
  if (!wheel) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { label, weight = 1 } = await request.json()
  if (!label?.trim())
    return NextResponse.json({ error: "Label required" }, { status: 400 })

  // Get current max position
  const { data: existing } = await supabase
    .from("wheel_items")
    .select("position")
    .eq("wheel_id", params.id)
    .order("position", { ascending: false })
    .limit(1)

  const nextPosition = existing?.[0]?.position !== undefined
    ? existing[0].position + 1
    : 0

  const { data, error } = await supabase
    .from("wheel_items")
    .insert({
      wheel_id: params.id,
      label: label.trim(),
      weight,
      position: nextPosition,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
