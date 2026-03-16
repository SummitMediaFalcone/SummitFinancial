import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

if (!resend) {
  console.warn("RESEND_API_KEY not set — email features disabled")
}

const FROM = process.env.EMAIL_FROM ?? "billing@summitmediapro.com"
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "info@summitmediapro.com"

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function invoiceHtml({
  companyName,
  clientName,
  invoiceNumber,
  issueDate,
  dueDate,
  items,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
  notes,
  status,
  paymentLink,
  isReminder,
  daysOverdue,
}: {
  companyName: string
  clientName: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  items: { description: string; quantity: number; unit_price_cents: number; total_cents: number }[]
  subtotalCents: number
  discountCents: number
  taxCents: number
  totalCents: number
  notes?: string | null
  status: "SENT" | "PAID"
  paymentLink?: string | null
  isReminder?: boolean
  daysOverdue?: number
}) {
  const isPaid = status === "PAID"
  const statusBadge = isPaid
    ? `<span style="background:#d1fae5;color:#065f46;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;">PAID</span>`
    : isReminder
    ? `<span style="background:#fef2f2;color:#dc2626;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;">OVERDUE ${daysOverdue}d</span>`
    : `<span style="background:#dbeafe;color:#1e40af;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;">DUE ${dueDate}</span>`

  const reminderBanner = isReminder ? `
    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px 32px;">
      <p style="margin:0;font-size:14px;font-weight:600;color:#dc2626;">⚠️ Payment Overdue — ${daysOverdue} day${(daysOverdue ?? 0) > 1 ? 's' : ''} past due</p>
      <p style="margin:4px 0 0;font-size:13px;color:#7f1d1d;">Please arrange payment at your earliest convenience. Contact us if you have any questions.</p>
    </div>` : ""

  const payButton = paymentLink ? `
    <div style="padding:24px 32px 0;text-align:center;">
      <a href="${paymentLink}" style="display:inline-block;background:#0f172a;color:#ffffff;font-size:15px;font-weight:600;padding:14px 40px;border-radius:8px;text-decoration:none;letter-spacing:0.01em;">Pay Now — ${formatCents(totalCents)}</a>
    </div>` : ""


  const itemRows = items.map(item => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;">${item.description}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;text-align:right;">${formatCents(item.unit_price_cents)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;color:#0f172a;text-align:right;">${formatCents(item.total_cents)}</td>
    </tr>
  `).join("")

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:620px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background:#0f172a;padding:32px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${companyName}</h1>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">${isPaid ? "Payment Receipt" : isReminder ? "Payment Reminder" : "Invoice"}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Invoice</p>
          <p style="margin:2px 0 0;color:#ffffff;font-size:18px;font-weight:700;font-family:monospace;">${invoiceNumber}</p>
          <div style="margin-top:8px;">${statusBadge}</div>
        </div>
      </div>
    </div>

    ${reminderBanner}
    ${payButton}

    <!-- Billed To + Dates -->
    <div style="padding:24px 32px;display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;">
      <div>
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:600;">BILLED TO</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${clientName}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:600;">ISSUE DATE</p>
        <p style="margin:0 0 12px;font-size:13px;color:#334155;">${issueDate}</p>
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:600;">${isPaid ? "PAID ON" : "DUE DATE"}</p>
        <p style="margin:0;font-size:13px;color:${isPaid ? "#065f46" : "#334155"};font-weight:${isPaid ? "600" : "400"};">${dueDate}</p>
      </div>
    </div>

    <!-- Line Items -->
    <div style="padding:24px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;padding-bottom:8px;border-bottom:2px solid #f1f5f9;font-weight:600;">Description</th>
            <th style="text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;padding-bottom:8px;border-bottom:2px solid #f1f5f9;font-weight:600;">Qty</th>
            <th style="text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;padding-bottom:8px;border-bottom:2px solid #f1f5f9;font-weight:600;">Unit Price</th>
            <th style="text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;padding-bottom:8px;border-bottom:2px solid #f1f5f9;font-weight:600;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- Totals -->
      <div style="margin-top:16px;border-top:2px solid #f1f5f9;padding-top:16px;">
        ${subtotalCents !== totalCents ? `
        <div style="display:flex;justify-content:flex-end;gap:48px;margin-bottom:8px;">
          <span style="font-size:13px;color:#64748b;">Subtotal</span>
          <span style="font-size:13px;font-weight:500;color:#334155;min-width:80px;text-align:right;">${formatCents(subtotalCents)}</span>
        </div>` : ""}
        ${discountCents > 0 ? `
        <div style="display:flex;justify-content:flex-end;gap:48px;margin-bottom:8px;">
          <span style="font-size:13px;color:#64748b;">Discount</span>
          <span style="font-size:13px;color:#059669;min-width:80px;text-align:right;">−${formatCents(discountCents)}</span>
        </div>` : ""}
        ${taxCents > 0 ? `
        <div style="display:flex;justify-content:flex-end;gap:48px;margin-bottom:8px;">
          <span style="font-size:13px;color:#64748b;">Tax</span>
          <span style="font-size:13px;color:#334155;min-width:80px;text-align:right;">${formatCents(taxCents)}</span>
        </div>` : ""}
        <div style="display:flex;justify-content:flex-end;gap:48px;margin-top:12px;padding-top:12px;border-top:2px solid #e2e8f0;">
          <span style="font-size:16px;font-weight:700;color:#0f172a;">Total ${isPaid ? "Paid" : "Due"}</span>
          <span style="font-size:16px;font-weight:700;color:${isPaid ? "#059669" : "#0f172a"};min-width:80px;text-align:right;">${formatCents(totalCents)}</span>
        </div>
      </div>
    </div>

    ${notes ? `
    <div style="padding:0 32px 24px;">
      <div style="background:#f8fafc;border-radius:8px;padding:16px;">
        <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:600;">Notes</p>
        <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">${notes}</p>
      </div>
    </div>` : ""}

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #f1f5f9;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">Thank you for your business · ${companyName}</p>
    </div>
  </div>
</body>
</html>`
}

// ─── Send Invoice Email ─────────────────────────────────────────────────────

export async function sendInvoiceEmail({
  to,
  companyName,
  clientName,
  invoiceNumber,
  issueDate,
  dueDate,
  items,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
  notes,
  paymentLink,
  isReminder,
  daysOverdue,
}: {
  to: string
  companyName: string
  clientName: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  items: { description: string; quantity: number; unit_price_cents: number; total_cents: number }[]
  subtotalCents: number
  discountCents: number
  taxCents: number
  totalCents: number
  notes?: string | null
  paymentLink?: string | null
  isReminder?: boolean
  daysOverdue?: number
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) return { success: false, error: "Email not configured (RESEND_API_KEY missing)" }

  try {
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: isReminder
        ? `⚠️ Payment Overdue (${daysOverdue} days) — Invoice ${invoiceNumber} — ${formatCents(totalCents)}`
        : `Invoice ${invoiceNumber} from ${companyName} — ${formatCents(totalCents)} due ${dueDate}`,
      html: invoiceHtml({
        companyName, clientName, invoiceNumber, issueDate, dueDate,
        items, subtotalCents, discountCents, taxCents, totalCents, notes,
        status: "SENT", paymentLink, isReminder, daysOverdue,
      }),
    })
    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    console.error("[email] sendInvoiceEmail failed:", msg)
    return { success: false, error: msg }
  }
}

// ─── Send Paid Receipt Email ────────────────────────────────────────────────

export async function sendReceiptEmail({
  to,
  companyName,
  clientName,
  invoiceNumber,
  issueDate,
  paidDate,
  items,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
  notes,
}: {
  to: string
  companyName: string
  clientName: string
  invoiceNumber: string
  issueDate: string
  paidDate: string
  items: { description: string; quantity: number; unit_price_cents: number; total_cents: number }[]
  subtotalCents: number
  discountCents: number
  taxCents: number
  totalCents: number
  notes?: string | null
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) return { success: false, error: "Email not configured (RESEND_API_KEY missing)" }

  try {
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: `✅ Payment received — ${invoiceNumber} — $${(totalCents / 100).toFixed(2)}`,
      html: invoiceHtml({
        companyName, clientName, invoiceNumber, issueDate, dueDate: paidDate,
        items, subtotalCents, discountCents, taxCents, totalCents, notes, status: "PAID",
      }),
    })
    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    console.error("[email] sendReceiptEmail failed:", msg)
    return { success: false, error: msg }
  }
}
