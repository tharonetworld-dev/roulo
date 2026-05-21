import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(
  _request: NextRequest,
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

  const { data, error } = await supabase
    .from("spin_history")
    .select("id, result")
    .eq("wheel_id", params.id)
    .order("id", { ascending: true })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
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

  const { error } = await supabase
    .from("spin_history")
    .delete()
    .eq("wheel_id", params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
