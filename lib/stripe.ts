import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is not set — Stripe features will be disabled")
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    })
  : null

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ""

/** Convert cents to Stripe amount (already in cents for USD) */
export const centsToStripe = (cents: number) => cents

/** Human-readable interval label */
export const intervalLabel = (interval: string) =>
  interval === "year" ? "/ year" : "/ month"
