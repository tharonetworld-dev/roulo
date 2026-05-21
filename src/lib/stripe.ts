import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
})

export const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY!
export const PRICE_YEARLY = process.env.STRIPE_PRICE_YEARLY!
