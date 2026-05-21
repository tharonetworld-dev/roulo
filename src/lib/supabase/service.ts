import { createClient } from "@supabase/supabase-js"

// Service-role client — bypasses RLS. Used only in webhook route.
// NEVER import this in client components or expose to the browser.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
