import { createServiceClient } from "@/lib/supabase/service"
import { Resend } from "resend"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const resend = new Resend(process.env.RESEND_API_KEY)

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://roulo.app"

// Find spins from ~24 hours ago, send follow-up emails, mark as sent
export async function POST(request: Request) {
  // Simple auth: require a secret header to prevent unauthorized calls
  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${process.env.SPIN_FOLLOWUP_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const service = createServiceClient()

  // Find spins from 24-25 hours ago that haven't been followed up
  const now = new Date()
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const since25h = new Date(now.getTime() - 25 * 60 * 60 * 1000)

  const { data: spinsToFollowUp, error: queryError } = await service
    .from("wheel_spins")
    .select(
      `
      id,
      user_id,
      result_option,
      spun_at,
      profiles:user_id (email),
      wheels:wheel_id (name)
    `
    )
    .gte("spun_at", since25h.toISOString())
    .lte("spun_at", since24h.toISOString())
    .not(
      "id",
      "in",
      `(select spin_id from outcome_followups_sent)`
    )

  if (queryError) {
    console.error("Query error:", queryError)
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  if (!spinsToFollowUp || spinsToFollowUp.length === 0) {
    return NextResponse.json({
      message: "No spins to follow up",
      sent: 0,
    })
  }

  let sentCount = 0
  const errors: string[] = []

  // Send emails and track in outcome_followups_sent
  for (const spin of spinsToFollowUp) {
    const spinData = spin as unknown as {
      id: string
      result_option: string
      profiles: { email: string } | null
      wheels: { name: string } | null
    }
    const userEmail = spinData.profiles?.email
    const wheelName = spinData.wheels?.name || "Your Wheel"

    if (!userEmail) {
      errors.push(`Spin ${spin.id}: no email found`)
      continue
    }

    // Build rating links
    const ratePositive = `${SITE}/api/spins/${spinData.id}/rate?rating=positive`
    const rateNegative = `${SITE}/api/spins/${spinData.id}/rate?rating=negative`
    const rateDidntTry = `${SITE}/api/spins/${spinData.id}/rate?rating=didnt_try`

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>How did it work out?</h2>
        <p>You spun <strong>${wheelName}</strong> 24 hours ago and got:</p>
        <p style="font-size: 18px; font-weight: bold; color: #6366f1;">${spinData.result_option}</p>
        <p>Did it help you decide?</p>
        <div style="margin: 30px 0; display: flex; gap: 10px; flex-wrap: wrap;">
          <a href="${ratePositive}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            ✓ Positive
          </a>
          <a href="${rateNegative}" style="display: inline-block; padding: 12px 24px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            ✗ Negative
          </a>
          <a href="${rateDidntTry}" style="display: inline-block; padding: 12px 24px; background-color: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            — Didn't try
          </a>
        </div>
        <p style="font-size: 12px; color: #888; margin-top: 40px;">
          <a href="${SITE}" style="color: #6366f1; text-decoration: none;">Back to Roulo</a>
        </p>
      </div>
    `

    try {
      await resend.emails.send({
        from: "Roulo <noreply@roulo.app>",
        to: userEmail,
        subject: `How did "${spinData.result_option}" work out?`,
        html: emailHtml,
      })

      // Mark as sent
      await service.from("outcome_followups_sent").insert({
        spin_id: spinData.id,
      })

      sentCount++
    } catch (err) {
      errors.push(`Spin ${spinData.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({
    message: "Follow-up emails processed",
    sent: sentCount,
    total: spinsToFollowUp.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
