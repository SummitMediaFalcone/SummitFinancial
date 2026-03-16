export interface BillingProduct {
  id: string
  company_id: string
  name: string
  description: string | null
  unit_price_cents: number
  unit_label: string
  category: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID"
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING"
export type BillingInterval = "month" | "year"

export interface BillingClient {
  id: string
  company_id: string
  name: string
  email: string
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  stripe_customer_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionPlan {
  id: string
  company_id: string
  name: string
  description: string | null
  billing_interval: BillingInterval
  amount_cents: number
  stripe_price_id: string | null
  stripe_product_id: string | null
  is_active: boolean
  created_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price_cents: number
  total_cents: number
  sort_order: number
}

export interface Invoice {
  id: string
  company_id: string
  client_id: string
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string
  subtotal_cents: number
  discount_cents: number
  tax_cents: number
  total_cents: number
  notes: string | null
  stripe_invoice_id: string | null
  paid_at: string | null
  sent_at: string | null
  subscription_plan_id: string | null
  is_recurring: boolean
  recurrence_interval: BillingInterval | null
  created_at: string
  updated_at: string
  // Joined
  billing_clients?: { name: string; email: string } | null
  companies?: { name: string } | null
  invoice_items?: InvoiceItem[]
}

export interface Subscription {
  id: string
  company_id: string
  client_id: string
  plan_id: string
  status: SubscriptionStatus
  stripe_subscription_id: string | null
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at: string | null
  created_at: string
  // Joined
  billing_clients?: { name: string; email: string } | null
  subscription_plans?: { name: string; amount_cents: number; billing_interval: BillingInterval } | null
}
