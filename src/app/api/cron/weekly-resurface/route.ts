import { createServiceClient } from "@/lib/supabase/service"
import { isPro } from "@/lib/access"
import { Resend } from "resend"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface DigestSpins {
  id: string
  result_option: string
  spun_at: string
  wheels: { name: string }
}

interface UserProfile {
  id: string
  email: string
  trial_ends_at: string | null
}

interface UserSubscription {
  status: string
}

interface UserWithDigest {
  user_id: string
  profiles: UserProfile
  subscriptions: UserSubscription | null
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (daysAgo === 1) return "1 day ago"
  if (daysAgo < 30) return `${daysAgo} days ago`
  const monthsAgo = Math.floor(daysAgo / 30)
  if (monthsAgo === 1) return "1 month ago"
  return `${monthsAgo} months ago`
}

function buildDigestEmail(spins: DigestSpins[], userName: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://roulo-six.vercel.app"

  const spinsHtml = spins
    .map((spin) => {
      const ratingPositive = `${baseUrl}/api/spins/${spin.id}/rate?rating=positive`
      const ratingNegative = `${baseUrl}/api/spins/${spin.id}/rate?rating=negative`
      const ratingDidntTry = `${baseUrl}/api/spins/${spin.id}/rate?rating=didnt_try`

      return `
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f8f8; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #1a1a1a;">
            ${spin.wheels.name}
          </p>
          <p style="margin: 0 0 12px 0; font-size: 16px; color: #333;">
            <strong>${spin.result_option}</strong> — ${formatRelativeDate(spin.spun_at)}
          </p>
          <div style="display: flex; gap: 10px;">
            <a href="${ratingPositive}" style="flex: 1; padding: 10px; text-align: center; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
              👍 Positive
            </a>
            <a href="${ratingNegative}" style="flex: 1; padding: 10px; text-align: center; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
              👎 Negative
            </a>
            <a href="${ratingDidntTry}" style="flex: 1; padding: 10px; text-align: center; background-color: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
              ⏭️ Didn't try
            </a>
          </div>
        </div>
      `
    })
    .join("")

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background-color: #1a1a1a; padding: 32px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; color: white; font-weight: 700;">
              5 decisions Roulo never heard back about
            </h1>
          </div>

          <!-- Content -->
          <div style="padding: 32px 20px;">
            <p style="margin: 0 0 24px 0; color: #666; font-size: 16px; line-height: 1.6;">
              Hey ${userName}! These decisions spun a while back. Let us know how they worked out so Roulo can learn your patterns better.
            </p>

            ${spinsHtml}

            <p style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #eee; color: #999; font-size: 13px; text-align: center;">
              You can change these ratings anytime in your Patterns dashboard.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f8f8; padding: 16px 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #999; font-size: 12px;">
              Roulo • Decision Wheel
            </p>
          </div>

        </div>
      </body>
    </html>
  `
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day
  return new Date(d.setUTCDate(diff))
}

async function checkRateLimit(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  emailType: string
): Promise<number> {
  const now = new Date()
  const weekStart = getWeekStart(now)

  const { data, error } = await service
    .from("email_rate_limit")
    .select("sent_at")
    .eq("user_id", userId)
    .eq("email_type", emailType)
    .gte("sent_at", weekStart.toISOString())

  if (error) {
    console.error("Rate limit check error:", error)
    return 0
  }

  return data?.length ?? 0
}

export async function POST(request: Request) {
  // Validate Bearer token
  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${process.env.WEEKLY_DIGEST_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const service = createServiceClient()
  const resend = new Resend(process.env.RESEND_API_KEY)

  let sent = 0
  let total = 0
  let skipped = 0
  const errors: string[] = []

  // Calculate date range: 30-365 days ago
  const now = new Date()
  const since365d = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get Pro users
  const { data: users, error: usersError } = await service
    .from("wheel_spins")
    .select(
      `
      user_id,
      profiles:user_id (id, email, trial_ends_at),
      subscriptions!inner (status)
    `,
      { count: "exact" }
    )
    .gte("spun_at", since365d.toISOString())
    .lte("spun_at", since30d.toISOString())

  if (usersError) {
    console.error("❌ Failed to fetch users:", usersError)
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  const uniqueUsers = Array.from(
    new Map(
      (users as UserWithDigest[])?.map((u) => [
        u.user_id,
        {
          userId: u.user_id,
          email: u.profiles.email,
          profile: u.profiles,
          subscription: u.subscriptions,
        },
      ]) || []
    ).values()
  )

  total = uniqueUsers.length

  console.log(`📊 Weekly digest: found ${total} unique Pro users with spins 30-365d ago`)

  for (const user of uniqueUsers) {
    try {
      // Check if Pro
      if (!isPro(user.profile, user.subscription)) {
        console.log(`⏭️ Skipping non-Pro user ${user.userId}`)
        skipped++
        continue
      }

      // Check idempotency: already sent this week?
      const weekStart = getWeekStart(now)
      const { data: alreadySent, error: idempotencyError } = await service
        .from("weekly_digests_sent")
        .select("user_id")
        .eq("user_id", user.userId)
        .gte("digest_week_start", weekStart.toISOString().split("T")[0])
        .single()

      if (idempotencyError && idempotencyError.code !== "PGRST116") {
        throw idempotencyError
      }

      if (alreadySent) {
        console.log(`⏭️ Already sent digest this week to ${user.userId}`)
        skipped++
        continue
      }

      // Check rate limit: max 4 transactional emails per week
      const followupCount = await checkRateLimit(service, user.userId, "spin_followup")
      const digestCount = await checkRateLimit(service, user.userId, "weekly_digest")
      const totalEmailsThisWeek = followupCount + digestCount

      if (totalEmailsThisWeek >= 4) {
        console.log(`📬 Rate limit reached for ${user.userId}: ${totalEmailsThisWeek}/4 emails this week`)
        skipped++
        continue
      }

      // Get unrated spins from 30-365 days ago
      const { data: candidateSpins, error: spinsError } = await service
        .from("wheel_spins")
        .select(`
          id,
          result_option,
          spun_at,
          wheels:wheel_id (name)
        `)
        .eq("user_id", user.userId)
        .gte("spun_at", since365d.toISOString())
        .lte("spun_at", since30d.toISOString())
        .not("id", "in", `(select spin_id from wheel_outcomes)`)
        .order("spun_at", { ascending: false })
        .limit(5)

      if (spinsError) {
        throw spinsError
      }

      const spins = (candidateSpins as DigestSpins[]) || []

      if (spins.length === 0) {
        console.log(`ℹ️ No unrated spins for ${user.userId} in 30-365d range`)
        skipped++
        continue
      }

      // Build and send email
      const emailHtml = buildDigestEmail(spins, user.email.split("@")[0])

      const { error: sendError } = await resend.emails.send({
        from: "Roulo <noreply@roulo.app>",
        to: user.email,
        subject: "5 decisions Roulo never heard back about",
        html: emailHtml,
      })

      if (sendError) {
        throw sendError
      }

      // Track sent digest
      const digestWeekStart = getWeekStart(now).toISOString().split("T")[0]
      await service.from("weekly_digests_sent").insert({
        user_id: user.userId,
        digest_week_start: digestWeekStart,
      })

      // Track rate limit
      await service.from("email_rate_limit").insert({
        user_id: user.userId,
        email_type: "weekly_digest",
      })

      console.log(`✅ Weekly digest sent to ${user.email} with ${spins.length} spins`)
      sent++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`❌ Error for user ${user.userId}:`, message)
      errors.push(`${user.userId}: ${message}`)
    }
  }

  return NextResponse.json({
    sent,
    total,
    skipped,
    errors,
    message: `Weekly digest: ${sent} sent, ${skipped} skipped, ${errors.length} errors`,
  })
}
