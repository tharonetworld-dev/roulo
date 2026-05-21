import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { label, weight } = await request.json()

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {}
  if (label !== undefined) updates.label = label.trim()
  if (weight !== undefined) updates.weight = weight

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })

  // Join through wheels to verify ownership
  const { data: item } = await supabase
    .from("wheel_items")
    .select("id, wheel_id, wheels!inner(user_id)")
    .eq("id", params.itemId)
    .eq("wheel_id", params.id)
    .single()

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data, error } = await supabase
    .from("wheel_items")
    .update(updates)
    .eq("id", params.itemId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify ownership via wheel
  const { data: item } = await supabase
    .from("wheel_items")
    .select("id, wheel_id, wheels!inner(user_id)")
    .eq("id", params.itemId)
    .eq("wheel_id", params.id)
    .single()

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { error } = await supabase
    .from("wheel_items")
    .delete()
    .eq("id", params.itemId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
