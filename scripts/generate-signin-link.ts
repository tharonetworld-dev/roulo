import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceKey)

const USER_EMAIL = "tharonetworld@gmail.com"

async function generateSignInLink() {
  console.log("🔗 Generating sign-in link for", USER_EMAIL)

  // First, check if user exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  let user = existingUsers.users.find((u) => u.email === USER_EMAIL)

  if (!user) {
    console.log("📝 User not found, creating new user...")
    const { data, error } = await supabase.auth.admin.createUser({
      email: USER_EMAIL,
      email_confirm: true,
    })
    if (error) throw error
    user = data.user
    console.log("✅ User created:", user.id)
  } else {
    console.log("✅ User exists:", user.id)
  }

  // Mark as Pro
  const { error: profileError } = await supabase
    .from("subscriptions")
    .upsert({
      id: `sub_${user.id}`,
      user_id: user.id,
      status: "active",
      price_id: "price_monthly_pro",
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
    })

  if (profileError) {
    console.error("⚠️ Could not mark as Pro:", profileError)
  } else {
    console.log("✅ Marked as Pro")
  }

  // Generate magic link
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: USER_EMAIL,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://roulo-six.vercel.app"}/auth/callback`,
    },
  })

  if (error) {
    console.error("❌ Failed to generate link:", error.message)
    throw error
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ FRESH SIGN-IN LINK GENERATED

Email: ${USER_EMAIL}
Account: Pro (1 year)

LINK (click to sign in):
${data.properties.action_link}

Or if that doesn't work, paste this URL:
${data.properties.action_link}

⏰ This link will work for 24 hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)
}

generateSignInLink().catch(console.error)
