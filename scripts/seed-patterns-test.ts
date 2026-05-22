import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceKey)

const TEST_USER_EMAIL = "patterns-test@example.com"
const TEST_USER_PASSWORD = "test-password-123"

async function seed() {
  console.log("🌱 Seeding patterns test data...")

  // 1. Create or get test user
  let userId: string

  const { data: existingUser } = await supabase.auth.admin.listUsers()
  const testUser = existingUser.users.find((u) => u.email === TEST_USER_EMAIL)

  if (testUser) {
    console.log(`ℹ️ Using existing user: ${TEST_USER_EMAIL}`)
    userId = testUser.id
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      email_confirm: true,
    })

    if (error) throw error
    userId = data.user.id
    console.log(`✅ Created test user: ${TEST_USER_EMAIL}`)
  }

  // 2. Mark as Pro (create subscription)
  await supabase
    .from("subscriptions")
    .upsert({
      id: `sub_test_${userId}`,
      user_id: userId,
      status: "active",
      price_id: "price_monthly_test",
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
    })

  console.log(`✅ User marked as Pro`)

  // 3. Create a wheel
  const { data: wheel } = await supabase
    .from("wheels")
    .insert({
      user_id: userId,
      name: "Test Decisions",
    })
    .select()
    .single()

  if (!wheel) throw new Error("Failed to create wheel")
  console.log(`✅ Created wheel: ${wheel.name}`)

  // 4. Add some items to the wheel
  const items = [
    "Coffee",
    "Tea",
    "Water",
    "Pizza",
    "Burger",
    "Salad",
    "Rest",
    "Exercise",
  ]

  await supabase.from("wheel_items").insert(
    items.map((label, i) => ({
      wheel_id: wheel.id,
      label,
      position: i,
      weight: 1,
    }))
  )

  console.log(`✅ Added ${items.length} items to wheel`)

  // 5. Insert 30 spins with varied results
  const resultOptions = items
  const spins = []

  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(i / 2) // Spread over 15 days
    const result = resultOptions[i % resultOptions.length]
    const spunAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

    spins.push({
      user_id: userId,
      wheel_id: wheel.id,
      result_option: result,
      all_options: resultOptions,
      spun_at: spunAt,
    })
  }

  const { error: spinError } = await supabase.from("wheel_spins").insert(spins)

  if (spinError) throw spinError
  console.log(`✅ Created ${spins.length} spins`)

  // 6. Insert varied outcomes
  const spinIds = spins.map((_, i) => `spin_${i}`) // Will be replaced by real IDs
  const { data: createdSpins } = await supabase
    .from("wheel_spins")
    .select("id")
    .eq("user_id", userId)
    .order("spun_at", { ascending: false })
    .limit(30)

  if (!createdSpins) throw new Error("Failed to fetch created spins")

  const outcomes = createdSpins.map((spin, i) => {
    // Distribute outcomes: 50% positive, 30% didnt_try, 20% negative
    let rating: "positive" | "negative" | "didnt_try"
    if (i % 10 < 5) {
      rating = "positive"
    } else if (i % 10 < 8) {
      rating = "didnt_try"
    } else {
      rating = "negative"
    }

    return {
      spin_id: spin.id,
      user_id: userId,
      rating,
    }
  })

  await supabase.from("wheel_outcomes").insert(outcomes)

  console.log(`✅ Created ${outcomes.length} outcomes`)

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Seed complete!

Test user: ${TEST_USER_EMAIL}
User ID: ${userId}
Wheel: ${wheel.name} (${wheel.id})
Spins: 30
Outcomes: ${outcomes.length}

Visit: http://localhost:3000/app/patterns
Log in with email: ${TEST_USER_EMAIL}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
}

seed().catch(console.error)
