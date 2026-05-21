import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

// PUT /api/wheels/[id]/items — bulk-replace all items
export async function PUT(
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

  const { labels } = await request.json()
  if (!Array.isArray(labels) || labels.length < 2)
    return NextResponse.json({ error: "Need at least 2 labels" }, { status: 400 })

  // Delete existing items
  const { error: delError } = await supabase
    .from("wheel_items")
    .delete()
    .eq("wheel_id", params.id)
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  // Insert new items
  const newItems = labels.slice(0, 8).map((label: string, i: number) => ({
    wheel_id: params.id,
    label: label.trim(),
    weight: 1,
    position: i,
  }))

  const { data, error } = await supabase
    .from("wheel_items")
    .insert(newItems)
    .select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

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
