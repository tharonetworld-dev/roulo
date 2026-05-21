type Profile = { trial_ends_at: string | null }
type Sub = { status: string } | null

export function isPro(profile: Profile, sub: Sub): boolean {
  // Active Stripe subscription
  if (sub && ["active", "trialing"].includes(sub.status)) return true
  // Free trial (no card required — tracked on profile)
  if (profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date()) return true
  return false
}
