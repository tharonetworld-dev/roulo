import Stripe from "stripe"

// Lazy singleton — only instantiated at runtime when a request arrives,
// not at build time when STRIPE_SECRET_KEY is not available.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    })
  }
  return _stripe
}

export const PRICE_MONTHLY = () => process.env.STRIPE_PRICE_MONTHLY!
export const PRICE_YEARLY = () => process.env.STRIPE_PRICE_YEARLY!
