"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { writeAuditLog } from "@/lib/audit"
import { stripe } from "@/lib/stripe"
import { sendInvoiceEmail, sendReceiptEmail } from "@/lib/email"

// ─── Billing Clients ───────────────────────────────────────────────────────

export async function createBillingClientAction(data: {
  company_id: string
  name: string
  email: string
  phone?: string
  address_line1?: string
  address_line2?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  let stripeCustomerId: string | null = null

  // Create Stripe customer if Stripe is configured
  if (stripe) {
    try {
      const customer = await stripe.customers.create({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address_line1 ? {
          line1: data.address_line1,
          line2: data.address_line2 ?? undefined,
          city: data.address_city ?? undefined,
          state: data.address_state ?? undefined,
          postal_code: data.address_zip ?? undefined,
          country: "US",
        } : undefined,
      })
      stripeCustomerId = customer.id
    } catch (e) {
      console.error("Stripe customer creation failed:", e)
    }
  }

  const { data: client, error } = await supabase
    .from("billing_clients")
    .insert({
      ...data,
      stripe_customer_id: stripeCustomerId,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "CREATE_BILLING_CLIENT",
    entityType: "BillingClient",
    entityId: client.id,
    companyId: data.company_id,
    meta: { name: data.name },
  })

  revalidatePath("/billing/clients")
  return { success: true, id: client.id }
}

export async function updateBillingClientAction(id: string, data: {
  name?: string
  email?: string
  phone?: string
  address_line1?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("billing_clients")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/billing/clients")
  return { success: true }
}

// ─── Subscription Plans ────────────────────────────────────────────────────

export async function createPlanAction(data: {
  company_id: string
  name: string
  description?: string
  billing_interval: "month" | "year"
  amount_cents: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  let stripePriceId: string | null = null
  let stripeProductId: string | null = null

  // Sync to Stripe if configured
  if (stripe) {
    try {
      const product = await stripe.products.create({
        name: data.name,
        description: data.description,
      })
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: data.amount_cents,
        currency: "usd",
        recurring: { interval: data.billing_interval },
      })
      stripePriceId = price.id
      stripeProductId = product.id
    } catch (e) {
      console.error("Stripe plan sync failed:", e)
    }
  }

  const { data: plan, error } = await supabase
    .from("subscription_plans")
    .insert({
      ...data,
      stripe_price_id: stripePriceId,
      stripe_product_id: stripeProductId,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath("/billing/plans")
  return { success: true, id: plan.id }
}

// ─── Invoices ──────────────────────────────────────────────────────────────

export async function createInvoiceAction(data: {
  company_id: string
  client_id: string
  due_date: string
  notes?: string
  is_recurring?: boolean
  recurrence_interval?: "month" | "year"
  subscription_plan_id?: string
  items: Array<{
    description: string
    quantity: number
    unit_price_cents: number
  }>
  discount_cents?: number
  tax_cents?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  // Generate invoice number
  const { data: invoiceNum } = await supabase.rpc("get_next_invoice_number", {
    p_company_id: data.company_id,
  })

  const subtotal = data.items.reduce(
    (s, i) => s + Math.round(i.quantity * i.unit_price_cents), 0
  )
  const discount = data.discount_cents ?? 0
  const tax = data.tax_cents ?? 0
  const total = subtotal - discount + tax

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      company_id: data.company_id,
      client_id: data.client_id,
      invoice_number: invoiceNum ?? `INV-${Date.now()}`,
      status: "DRAFT",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: data.due_date,
      subtotal_cents: subtotal,
      discount_cents: discount,
      tax_cents: tax,
      total_cents: total,
      notes: data.notes ?? null,
      is_recurring: data.is_recurring ?? false,
      recurrence_interval: data.recurrence_interval ?? null,
      subscription_plan_id: data.subscription_plan_id ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Insert line items
  const itemsToInsert = data.items.map((item, idx) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price_cents: item.unit_price_cents,
    total_cents: Math.round(item.quantity * item.unit_price_cents),
    sort_order: idx,
  }))

  const { error: itemsError } = await supabase.from("invoice_items").insert(itemsToInsert)
  if (itemsError) return { error: itemsError.message }

  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "CREATE_INVOICE",
    entityType: "Invoice",
    entityId: invoice.id,
    companyId: data.company_id,
    meta: { invoice_number: invoiceNum, total_cents: total },
  })

  revalidatePath("/billing/invoices")
  return { success: true, id: invoice.id, invoice_number: invoiceNum }
}

export async function sendInvoiceAction(invoiceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: invoiceRaw } = await supabase
    .from("invoices")
    .select("*, billing_clients(*), companies(*), invoice_items(*)") 
    .eq("id", invoiceId)
    .single()

  // Cast to any to support the join shape — Supabase FK types are updated separately
  const invoice = invoiceRaw as any

  if (!invoice) return { error: "Invoice not found" }
  if (invoice.status !== "DRAFT") return { error: "Only DRAFT invoices can be sent" }

  let stripeInvoiceId: string | null = null

  // Create Stripe invoice & send if configured
  if (stripe && invoice.billing_clients?.stripe_customer_id) {
    try {
      const stripeInv = await stripe.invoices.create({
        customer: invoice.billing_clients.stripe_customer_id as string,
        collection_method: "send_invoice",
        days_until_due: 30,
        metadata: { summit_invoice_id: invoiceId },
      })

      // Add line items
      for (const item of (invoice.invoice_items ?? []) as Array<{ description: string; quantity: number; unit_price_cents: number }>) {
        await stripe.invoiceItems.create({
          customer: invoice.billing_clients.stripe_customer_id as string,
          invoice: stripeInv.id,
          description: item.description,
          quantity: item.quantity,
          unit_amount_decimal: String(item.unit_price_cents),
          currency: "usd",
        })
      }

      await stripe.invoices.finalizeInvoice(stripeInv.id)
      await stripe.invoices.sendInvoice(stripeInv.id)
      stripeInvoiceId = stripeInv.id
    } catch (e) {
      console.error("Stripe invoice send failed:", e)
    }
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "SENT",
      sent_at: new Date().toISOString(),
      stripe_invoice_id: stripeInvoiceId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)

  if (error) return { error: error.message }

  // Send email via Resend (non-blocking — don't fail the action if email fails)
  if (invoice.billing_clients?.email) {
    await sendInvoiceEmail({
      to: invoice.billing_clients.email,
      companyName: invoice.companies?.name ?? "Summit Media Pro",
      clientName: invoice.billing_clients.name,
      invoiceNumber: invoice.invoice_number,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      items: invoice.invoice_items ?? [],
      subtotalCents: invoice.subtotal_cents,
      discountCents: invoice.discount_cents,
      taxCents: invoice.tax_cents,
      totalCents: invoice.total_cents,
      notes: invoice.notes,
    })
  }

  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "SEND_INVOICE",
    entityType: "Invoice",
    entityId: invoiceId,
    companyId: invoice.company_id,
    meta: { stripe_invoice_id: stripeInvoiceId },
  })

  revalidatePath("/billing/invoices")
  return { success: true }
}

export async function markInvoicePaidAction(invoiceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: invoiceRaw } = await supabase
    .from("invoices")
    .select("*, billing_clients(*), companies(*), invoice_items(*)")
    .eq("id", invoiceId)
    .single()

  const invoice = invoiceRaw as any
  if (!invoice) return { error: "Invoice not found" }
  if (invoice.status === "PAID") return { error: "Already paid" }
  if (invoice.status === "VOID") return { error: "Cannot mark void invoice as paid" }

  const paidAt = new Date().toISOString()

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "PAID",
      paid_at: paidAt,
      updated_at: paidAt,
    })
    .eq("id", invoiceId)

  if (error) return { error: error.message }

  // Send paid receipt email
  if (invoice.billing_clients?.email) {
    await sendReceiptEmail({
      to: invoice.billing_clients.email,
      companyName: invoice.companies?.name ?? "Summit Media Pro",
      clientName: invoice.billing_clients.name,
      invoiceNumber: invoice.invoice_number,
      issueDate: invoice.issue_date,
      paidDate: paidAt.split("T")[0],
      items: invoice.invoice_items ?? [],
      subtotalCents: invoice.subtotal_cents,
      discountCents: invoice.discount_cents,
      taxCents: invoice.tax_cents,
      totalCents: invoice.total_cents,
      notes: invoice.notes,
    })
  }

  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "MARK_INVOICE_PAID",
    entityType: "Invoice",
    entityId: invoiceId,
    companyId: invoice.company_id,
  })

  revalidatePath("/billing/invoices")
  return { success: true }
}

export async function voidInvoiceAction(invoiceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("company_id, status, stripe_invoice_id")
    .eq("id", invoiceId)
    .single()

  if (!invoice) return { error: "Invoice not found" }
  if (invoice.status === "PAID") return { error: "Cannot void a paid invoice" }
  if (invoice.status === "VOID") return { error: "Already voided" }

  // Void in Stripe if applicable
  if (stripe && invoice.stripe_invoice_id) {
    try {
      await stripe.invoices.voidInvoice(invoice.stripe_invoice_id)
    } catch (e) {
      console.error("Stripe void failed:", e)
    }
  }

  const { error } = await supabase
    .from("invoices")
    .update({ status: "VOID", updated_at: new Date().toISOString() })
    .eq("id", invoiceId)

  if (error) return { error: error.message }

  revalidatePath("/billing/invoices")
  return { success: true }
}

// ─── Subscriptions ────────────────────────────────────────────────────────

export async function createSubscriptionAction(data: {
  company_id: string
  client_id: string
  plan_id: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  // Get plan details
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", data.plan_id)
    .single()

  if (!plan) return { error: "Plan not found" }

  // Get client
  const { data: client } = await supabase
    .from("billing_clients")
    .select("*")
    .eq("id", data.client_id)
    .single()

  if (!client) return { error: "Client not found" }

  const now = new Date()
  const periodEnd = new Date(now)
  if (plan.billing_interval === "year") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  let stripeSubId: string | null = null

  if (stripe && client.stripe_customer_id && plan.stripe_price_id) {
    try {
      const sub = await stripe.subscriptions.create({
        customer: client.stripe_customer_id,
        items: [{ price: plan.stripe_price_id }],
        metadata: { summit_client_id: data.client_id },
      })
      stripeSubId = sub.id
    } catch (e) {
      console.error("Stripe subscription creation failed:", e)
    }
  }

  const { data: sub, error } = await supabase
    .from("subscriptions")
    .insert({
      company_id: data.company_id,
      client_id: data.client_id,
      plan_id: data.plan_id,
      status: "ACTIVE",
      stripe_subscription_id: stripeSubId,
      current_period_start: now.toISOString().split("T")[0],
      current_period_end: periodEnd.toISOString().split("T")[0],
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Auto-generate first invoice
  await createInvoiceAction({
    company_id: data.company_id,
    client_id: data.client_id,
    due_date: periodEnd.toISOString().split("T")[0],
    is_recurring: true,
    recurrence_interval: plan.billing_interval as "month" | "year",
    subscription_plan_id: data.plan_id,
    items: [{
      description: `${plan.name} — ${plan.billing_interval === "year" ? "Annual" : "Monthly"} subscription`,
      quantity: 1,
      unit_price_cents: plan.amount_cents,
    }],
  })

  revalidatePath("/billing/subscriptions")
  revalidatePath("/billing/invoices")
  return { success: true, id: sub.id }
}

// ─── Renew Subscription (generate next period invoice) ────────────────────

export async function renewSubscriptionAction(subscriptionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: subRaw } = await supabase
    .from("subscriptions")
    .select("*, subscription_plans(*), billing_clients(*)")
    .eq("id", subscriptionId)
    .single()

  const sub = subRaw as any
  if (!sub) return { error: "Subscription not found" }
  if (sub.status !== "ACTIVE") return { error: "Only ACTIVE subscriptions can be renewed" }

  const plan = sub.subscription_plans
  const interval = plan?.billing_interval as "month" | "year"

  // Advance the period
  const newStart = new Date(sub.current_period_end)
  newStart.setDate(newStart.getDate() + 1)
  const newEnd = new Date(newStart)
  if (interval === "year") {
    newEnd.setFullYear(newEnd.getFullYear() + 1)
  } else {
    newEnd.setMonth(newEnd.getMonth() + 1)
  }

  // Update subscription period dates
  await supabase
    .from("subscriptions")
    .update({
      current_period_start: newStart.toISOString().split("T")[0],
      current_period_end: newEnd.toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId)

  // Generate invoice for new period
  const result = await createInvoiceAction({
    company_id: sub.company_id,
    client_id: sub.client_id,
    due_date: newEnd.toISOString().split("T")[0],
    is_recurring: true,
    recurrence_interval: interval,
    subscription_plan_id: sub.plan_id,
    items: [{
      description: `${plan.name} — ${interval === "year" ? "Annual" : "Monthly"} subscription (${newStart.toISOString().split("T")[0]} – ${newEnd.toISOString().split("T")[0]})`,
      quantity: 1,
      unit_price_cents: plan.amount_cents,
    }],
  })

  if (result.error) return { error: result.error }

  revalidatePath("/billing/subscriptions")
  revalidatePath("/billing/invoices")
  return { success: true, invoice_id: result.id }
}

export async function cancelSubscriptionAction(subscriptionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, company_id")
    .eq("id", subscriptionId)
    .single()

  if (stripe && sub?.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id)
    } catch (e) {
      console.error("Stripe cancel failed:", e)
    }
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "CANCELED",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId)

  if (error) return { error: error.message }

  revalidatePath("/billing/subscriptions")
  return { success: true }
}

// ─── Products & Services Catalog ─────────────────────────────────────────

export async function createProductAction(data: {
  company_id: string
  name: string
  description?: string
  unit_price_cents: number
  unit_label?: string
  category?: string
  is_active?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: product, error } = await supabase
    .from("billing_products")
    .insert({
      ...data,
      unit_label: data.unit_label ?? "each",
      is_active: data.is_active ?? true,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "CREATE_BILLING_PRODUCT",
    entityType: "BillingProduct",
    entityId: product.id,
    companyId: data.company_id,
    meta: { name: data.name, unit_price_cents: data.unit_price_cents },
  })

  revalidatePath("/billing/products")
  return { success: true, id: product.id }
}

export async function updateProductAction(id: string, data: {
  name?: string
  description?: string
  unit_price_cents?: number
  unit_label?: string
  category?: string
  is_active?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("billing_products")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/billing/products")
  return { success: true }
}

export async function deleteProductAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("billing_products")
    .delete()
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/billing/products")
  return { success: true }
}
