import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { stripe, PRICE_MONTHLY, PRICE_YEARLY } from "@/lib/stripe"

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://roulo-six.vercel.app"

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { plan } = await request.json()
  if (plan !== "monthly" && plan !== "yearly")
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })

  const priceId = plan === "monthly" ? PRICE_MONTHLY : PRICE_YEARLY

  // Get or create Stripe customer
  const service = createServiceClient()
  const { data: profile } = await service
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single()

  let customerId: string = profile?.stripe_customer_id ?? ""

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    await service
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id)
  }

  // Create Checkout Session — no trial on Stripe side (trial tracked via trial_ends_at)
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${SITE}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE}/pricing`,
  })

  return NextResponse.json({ url: session.url })
}
