import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { isPro } from "@/lib/access"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.log("❌ No user found")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("✅ User:", user.id)
  const { wheel_id, result } = await request.json()
  console.log("📊 Spin request:", { wheel_id, result })

  // Check if user is Pro — only log spins for Pro users
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, trial_ends_at")
    .eq("id", user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle()

  console.log("📋 Profile:", profile)
  console.log("💳 Subscription:", subscription)
  console.log("🔐 isPro:", isPro(profile, subscription))

  // Always log to spin_history for recent spins display — must await so it completes before returning
  await supabase
    .from("spin_history")
    .insert({
      user_id: user.id,
      wheel_id,
      result,
    })

  // Fire-and-forget: if Pro, also log the spin to wheel_spins for patterns
  if (isPro(profile, subscription)) {
    console.log("✨ User is Pro, logging spin...")
    // Fetch wheel items to capture all_options
    const { data: wheelItems } = await supabase
      .from("wheel_items")
      .select("id, label, weight")
      .eq("wheel_id", wheel_id)
      .order("position")

    if (wheelItems && wheelItems.length > 0) {
      // Insert into wheel_spins asynchronously (fire-and-forget)
      const service = createServiceClient()
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      void service.from("wheel_spins").insert({
        user_id: user.id,
        wheel_id,
        result_option: result,
        all_options: wheelItems,
      })
    } else {
      console.log("⚠️ No wheel items found for wheel_id:", wheel_id)
    }
  }

  return NextResponse.json({ success: true })
}
