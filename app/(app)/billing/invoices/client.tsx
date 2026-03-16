"use client"

import { useEffect, useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import {
  Plus, Search, Filter, Loader2, MoreHorizontal,
  FileText, Send, CheckCircle2, XCircle, Eye,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useCompany } from "@/lib/company-context"
import { formatCents } from "@/lib/utils"
import { sendInvoiceAction, markInvoicePaidAction, voidInvoiceAction } from "@/app/actions/billing"
import { NewInvoiceDialog } from "./new-invoice-dialog"
import Link from "next/link"
import type { Invoice } from "@/lib/billing-types"

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-500/10 text-blue-600",
  PAID: "bg-emerald-500/10 text-emerald-600",
  OVERDUE: "bg-red-500/10 text-red-600",
  VOID: "bg-muted/50 text-muted-foreground line-through",
}

export function InvoicesClient() {
  const { selectedCompanyId } = useCompany()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showNew, setShowNew] = useState(false)
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("new") === "true") setShowNew(true)
  }, [searchParams])

  async function loadInvoices() {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/invoices")
      const data = await res.json()
      if (Array.isArray(data)) setInvoices(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadInvoices() }, [])

  const filtered = invoices.filter(inv => {
    if (selectedCompanyId && inv.company_id !== selectedCompanyId) return false
    if (statusFilter !== "all" && inv.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.billing_clients?.name ?? "").toLowerCase().includes(q)
      )
    }
    return true
  })

  function handleSend(id: string) {
    startTransition(async () => {
      const r = await sendInvoiceAction(id)
      if (r.error) alert(r.error)
      else await loadInvoices()
    })
  }

  function handlePaid(id: string) {
    startTransition(async () => {
      const r = await markInvoicePaidAction(id)
      if (r.error) alert(r.error)
      else await loadInvoices()
    })
  }

  function handleVoid(id: string) {
    startTransition(async () => {
      if (!confirm("Void this invoice? This cannot be undone.")) return
      const r = await voidInvoiceAction(id)
      if (r.error) alert(r.error)
      else await loadInvoices()
    })
  }

  const totals = {
    draft: filtered.filter(i => i.status === "DRAFT").reduce((s, i) => s + i.total_cents, 0),
    sent: filtered.filter(i => i.status === "SENT").reduce((s, i) => s + i.total_cents, 0),
    paid: filtered.filter(i => i.status === "PAID").reduce((s, i) => s + i.total_cents, 0),
    overdue: filtered.filter(i => i.status === "OVERDUE").reduce((s, i) => s + i.total_cents, 0),
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Invoices</h2>
          <p className="text-sm text-muted-foreground">Create, send, and track client invoices</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 size-4" />New Invoice
        </Button>
      </div>

      {/* Summary Badges */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Draft", value: totals.draft, color: "bg-muted text-muted-foreground" },
          { label: "Sent", value: totals.sent, color: "bg-blue-500/10 text-blue-600" },
          { label: "Overdue", value: totals.overdue, color: "bg-red-500/10 text-red-600" },
          { label: "Paid", value: totals.paid, color: "bg-emerald-500/10 text-emerald-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${color}`}>
            <span>{label}:</span>
            <span className="font-bold">{formatCents(value)}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices or clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="mr-2 size-4" /><SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="VOID">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <div className="h-8 rounded bg-muted animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.map(inv => (
                <TableRow key={inv.id} className="group">
                  <TableCell>
                    <Link
                      href={`/billing/invoices/${inv.id}`}
                      className="font-mono text-sm text-primary hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {inv.billing_clients?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {inv.companies?.name?.split(" ").slice(0, 2).join(" ") ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{inv.issue_date}</TableCell>
                  <TableCell className={`whitespace-nowrap ${inv.status === "OVERDUE" ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                    {inv.due_date}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[inv.status]}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-foreground">
                    {formatCents(inv.total_cents)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isPending}>
                          {isPending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/billing/invoices/${inv.id}`}>
                            <Eye className="mr-2 size-4" />View Invoice
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {inv.status === "DRAFT" && (
                          <DropdownMenuItem onClick={() => handleSend(inv.id)}>
                            <Send className="mr-2 size-4" />Send to Client
                          </DropdownMenuItem>
                        )}
                        {(inv.status === "SENT" || inv.status === "OVERDUE") && (
                          <DropdownMenuItem onClick={() => handlePaid(inv.id)}>
                            <CheckCircle2 className="mr-2 size-4" />Mark as Paid
                          </DropdownMenuItem>
                        )}
                        {inv.status !== "VOID" && inv.status !== "PAID" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleVoid(inv.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <XCircle className="mr-2 size-4" />Void Invoice
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="size-10 mx-auto mb-3 opacity-20" />
                    {invoices.length === 0
                      ? "No invoices yet. Click 'New Invoice' to get started."
                      : "No invoices match your filter."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="w-full max-w-3xl sm:max-w-3xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          <NewInvoiceDialog
            onComplete={async () => {
              setShowNew(false)
              await loadInvoices()
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
