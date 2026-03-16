import { NextRequest, NextResponse } from "next/server"
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { sendReceiptEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 })
  }

  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      // ── Invoice paid via Stripe ────────────────────────────
      case "invoice.paid": {
        const stripeInvoice = event.data.object as { id: string; metadata?: { summit_invoice_id?: string } }
        const summitInvoiceId = stripeInvoice.metadata?.summit_invoice_id

        if (summitInvoiceId) {
          const paidAt = new Date().toISOString()
          await supabase
            .from("invoices")
            .update({
              status: "PAID",
              paid_at: paidAt,
              updated_at: paidAt,
            })
            .eq("id", summitInvoiceId)

          // Fetch full invoice for receipt email
          const { data: invRaw } = await supabase
            .from("invoices")
            .select("*, billing_clients(*), companies(*), invoice_items(*)")
            .eq("id", summitInvoiceId)
            .single()

          const inv = invRaw as any
          if (inv?.billing_clients?.email) {
            await sendReceiptEmail({
              to: inv.billing_clients.email,
              companyName: inv.companies?.name ?? "Summit Media Pro",
              clientName: inv.billing_clients.name,
              invoiceNumber: inv.invoice_number,
              issueDate: inv.issue_date,
              paidDate: paidAt.split("T")[0],
              items: inv.invoice_items ?? [],
              subtotalCents: inv.subtotal_cents,
              discountCents: inv.discount_cents,
              taxCents: inv.tax_cents,
              totalCents: inv.total_cents,
              notes: inv.notes,
            })
          }
        }
        break
      }


      // ── Invoice payment failed ──────────────────────────────
      case "invoice.payment_failed": {
        const stripeInvoice = event.data.object as { id: string; metadata?: { summit_invoice_id?: string } }
        const summitInvoiceId = stripeInvoice.metadata?.summit_invoice_id

        if (summitInvoiceId) {
          await supabase
            .from("invoices")
            .update({
              status: "OVERDUE",
              updated_at: new Date().toISOString(),
            })
            .eq("id", summitInvoiceId)
        }
        break
      }

      // ── Subscription updated ───────────────────────────────
      case "customer.subscription.updated": {
        const raw = event.data.object
        const stripeSubId = raw.id
        // Access period data from the Stripe event — structure in Stripe SDK is flat
        const subData = raw as unknown as {
          id: string
          status: string
          current_period_start: number
          current_period_end: number
        }
        const statusMap: Record<string, string> = {
          active: "ACTIVE",
          past_due: "PAST_DUE",
          canceled: "CANCELED",
          trialing: "TRIALING",
        }
        await supabase
          .from("subscriptions")
          .update({
            status: (statusMap[subData.status] ?? "ACTIVE") as "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING",
            current_period_start: new Date(subData.current_period_start * 1000).toISOString().split("T")[0],
            current_period_end: new Date(subData.current_period_end * 1000).toISOString().split("T")[0],
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", stripeSubId)
        break
      }

      // ── Subscription canceled ──────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as { id: string }
        await supabase
          .from("subscriptions")
          .update({
            status: "CANCELED",
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id)
        break
      }

      default:
        // Unhandled event type — just acknowledge
        break
    }
  } catch (err) {
    console.error("Webhook handler error:", err)
    return NextResponse.json({ error: "Handler error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
