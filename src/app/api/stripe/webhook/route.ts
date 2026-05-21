import { NextResponse, type NextRequest } from "next/server"
import { stripe } from "@/lib/stripe"
import { createServiceClient } from "@/lib/supabase/service"
import Stripe from "stripe"

// CRITICAL: disable Next.js body parsing — Stripe needs the raw bytes to verify signature
export const config = { api: { bodyParser: false } }

// App Router equivalent: tell Next.js not to parse the body
export const runtime = "nodejs"

async function upsertSubscription(
  sub: Stripe.Subscription,
  service: ReturnType<typeof createServiceClient>
) {
  // Find user by stripe_customer_id
  const { data: profile } = await service
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", sub.customer as string)
    .single()

  if (!profile) {
    console.error("Webhook: no profile for customer", sub.customer)
    return
  }

  const priceId = sub.items.data[0]?.price.id ?? ""
  const periodEnd = new Date((sub as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000).toISOString()

  await service.from("subscriptions").upsert(
    {
      id: sub.id,
      user_id: profile.id,
      status: sub.status,
      price_id: priceId,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  )
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const sig = request.headers.get("stripe-signature") ?? ""

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const service = createServiceClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          await upsertSubscription(sub, service)
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        await upsertSubscription(sub, service)
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        await service
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("id", sub.id)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        console.warn("Payment failed for customer:", invoice.customer)
        // Future: trigger email notification
        break
      }

      default:
        // Acknowledge unhandled events — Stripe retries on 4xx/5xx
        break
    }
  } catch (err) {
    console.error("Webhook handler error:", err)
    // Return 200 anyway so Stripe doesn't retry — log and investigate separately
    return NextResponse.json({ error: "Handler error" }, { status: 200 })
  }

  return NextResponse.json({ received: true })
}
