import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendInvoiceEmail } from "@/lib/email"

// Vercel cron: runs nightly at 8am UTC
// vercel.json: { "crons": [{ "path": "/api/cron/invoice-reminders", "schedule": "0 8 * * *" }] }

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // Verify cron secret so only Vercel can trigger this
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  // Find all SENT invoices that are past their due date (overdue)
  const { data: overdueRaw } = await supabase
    .from("invoices")
    .select("*, billing_clients(*), companies(*), invoice_items(*)")
    .eq("status", "SENT")
    .lt("due_date", today)

  const overdue = (overdueRaw ?? []) as any[]

  let sent = 0
  let failed = 0

  for (const inv of overdue) {
    if (!inv.billing_clients?.email) continue

    // Calculate how many days overdue
    const dueDate = new Date(inv.due_date)
    const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / 86400000)

    // Only send reminders at 7, 14, and 30 days overdue to avoid spamming
    if (![7, 14, 30].includes(daysOverdue)) continue

    const result = await sendInvoiceEmail({
      to: inv.billing_clients.email,
      companyName: inv.companies?.name ?? "Summit Media Pro",
      clientName: inv.billing_clients.name,
      invoiceNumber: inv.invoice_number,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      items: inv.invoice_items ?? [],
      subtotalCents: inv.subtotal_cents,
      discountCents: inv.discount_cents,
      taxCents: inv.tax_cents,
      totalCents: inv.total_cents,
      notes: inv.notes,
      isReminder: true,
      daysOverdue,
    })

    // Update invoice status to OVERDUE in DB
    await supabase
      .from("invoices")
      .update({ status: "OVERDUE", updated_at: new Date().toISOString() })
      .eq("id", inv.id)

    if (result.success) sent++
    else failed++
  }

  return NextResponse.json({
    success: true,
    processed: overdue.length,
    reminders_sent: sent,
    failed,
    date: today,
  })
}
