"use client"

import { useState, useTransition } from "react"
import {
  ArrowLeft, Send, CheckCircle2, XCircle, Printer,
  Loader2, RefreshCw, Building2, User, Calendar, Hash,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCents } from "@/lib/utils"
import { sendInvoiceAction, markInvoicePaidAction, voidInvoiceAction } from "@/app/actions/billing"
import type { Invoice, InvoiceItem } from "@/lib/billing-types"
import { useRouter } from "next/navigation"

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-500/10 text-blue-600",
  PAID: "bg-emerald-500/10 text-emerald-600",
  OVERDUE: "bg-red-500/10 text-red-600",
  VOID: "bg-muted/50 text-muted-foreground",
}

interface Props {
  invoice: Invoice & {
    billing_clients: { name: string; email: string; phone: string | null; address_line1: string | null; address_city: string | null; address_state: string | null; address_zip: string | null }
    companies: { name: string; address_line1: string; address_city: string; address_state: string; address_zip: string; phone: string }
    invoice_items: InvoiceItem[]
  }
}

export function InvoiceDetailClient({ invoice }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState(invoice.status)

  function handleSend() {
    startTransition(async () => {
      const r = await sendInvoiceAction(invoice.id)
      if (r.error) alert(r.error)
      else setLocalStatus("SENT")
    })
  }

  function handlePaid() {
    startTransition(async () => {
      const r = await markInvoicePaidAction(invoice.id)
      if (r.error) alert(r.error)
      else setLocalStatus("PAID")
    })
  }

  function handleVoid() {
    startTransition(async () => {
      if (!confirm("Void this invoice? This cannot be undone.")) return
      const r = await voidInvoiceAction(invoice.id)
      if (r.error) alert(r.error)
      else { setLocalStatus("VOID"); router.push("/billing/invoices") }
    })
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Back + Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/billing/invoices">
            <ArrowLeft className="mr-2 size-4" />Back to Invoices
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {localStatus === "DRAFT" && (
            <Button onClick={handleSend} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
              Send Invoice
            </Button>
          )}
          {(localStatus === "SENT" || localStatus === "OVERDUE") && (
            <Button onClick={handlePaid} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
              Mark Paid
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()} size="sm">
            <Printer className="mr-2 size-4" />Print / PDF
          </Button>
          {localStatus !== "VOID" && localStatus !== "PAID" && (
            <Button variant="outline" onClick={handleVoid} disabled={isPending} className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60">
              <XCircle className="mr-2 size-4" />Void
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Card — Print-ready */}
      <Card className="print:shadow-none print:border-0" id="invoice-print">
        <CardContent className="p-8">
          {/* Invoice Header */}
          <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
            {/* From (Company) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="size-5 text-primary" />
                <span className="text-lg font-bold text-foreground">{invoice.companies?.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{invoice.companies?.address_line1}</span>
              <span className="text-sm text-muted-foreground">
                {invoice.companies?.address_city}, {invoice.companies?.address_state} {invoice.companies?.address_zip}
              </span>
              <span className="text-sm text-muted-foreground">{invoice.companies?.phone}</span>
            </div>

            {/* Invoice Meta */}
            <div className="flex flex-col items-start sm:items-end gap-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-3xl font-bold text-foreground">INVOICE</span>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="size-3.5 text-muted-foreground" />
                <span className="font-mono text-lg font-semibold text-primary">{invoice.invoice_number}</span>
              </div>
              <Badge variant="secondary" className={`mt-1 ${statusColors[localStatus]}`}>
                {localStatus}
              </Badge>
              {invoice.is_recurring && (
                <Badge variant="outline" className="text-xs mt-0.5">
                  <RefreshCw className="mr-1 size-3" />Recurring / {invoice.recurrence_interval}
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Dates + Client */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">BILL TO</span>
              <div className="flex items-center gap-1.5 mt-1">
                <User className="size-3.5 text-muted-foreground" />
                <span className="font-semibold text-foreground">{invoice.billing_clients?.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{invoice.billing_clients?.email}</span>
              {invoice.billing_clients?.phone && (
                <span className="text-sm text-muted-foreground">{invoice.billing_clients.phone}</span>
              )}
              {invoice.billing_clients?.address_line1 && (
                <span className="text-sm text-muted-foreground">{invoice.billing_clients.address_line1}</span>
              )}
              {invoice.billing_clients?.address_city && (
                <span className="text-sm text-muted-foreground">
                  {invoice.billing_clients.address_city}, {invoice.billing_clients.address_state} {invoice.billing_clients.address_zip}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ISSUE DATE</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="size-3.5 text-muted-foreground" />
                <span className="text-foreground font-medium">{invoice.issue_date}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">DUE DATE</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="size-3.5 text-muted-foreground" />
                <span className={`font-medium ${localStatus === "OVERDUE" ? "text-red-600" : "text-foreground"}`}>
                  {invoice.due_date}
                </span>
              </div>
              {invoice.paid_at && (
                <span className="text-xs text-emerald-600 mt-1">Paid {new Date(invoice.paid_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Line Items */}
          <div className="flex flex-col gap-1">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-2 border-b">
              <span className="col-span-6">Description</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Unit Price</span>
              <span className="col-span-2 text-right">Total</span>
            </div>

            {invoice.invoice_items?.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 py-3 border-b border-dashed border-border/50">
                <span className="col-span-6 text-sm text-foreground">{item.description}</span>
                <span className="col-span-2 text-center text-sm text-muted-foreground tabular-nums">{item.quantity}</span>
                <span className="col-span-2 text-right text-sm text-muted-foreground tabular-nums">
                  {formatCents(item.unit_price_cents)}
                </span>
                <span className="col-span-2 text-right text-sm font-medium text-foreground tabular-nums">
                  {formatCents(item.total_cents)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="flex justify-end mt-6">
            <div className="flex flex-col gap-2 w-64">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums font-medium">{formatCents(invoice.subtotal_cents)}</span>
              </div>
              {invoice.discount_cents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="tabular-nums text-emerald-600">−{formatCents(invoice.discount_cents)}</span>
                </div>
              )}
              {invoice.tax_cents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="tabular-nums">{formatCents(invoice.tax_cents)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total Due</span>
                <span className="tabular-nums text-foreground">{formatCents(invoice.total_cents)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <>
              <Separator className="my-6" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</span>
                <p className="text-sm text-muted-foreground mt-1">{invoice.notes}</p>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Thank you for your business! · {invoice.companies?.name}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
