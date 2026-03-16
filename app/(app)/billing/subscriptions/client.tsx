"use client"

import { useEffect, useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import {
  Plus, RefreshCw, AlertCircle, Loader2, XCircle,
  CheckCircle2, Calendar, User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { useCompany } from "@/lib/company-context"
import { formatCents } from "@/lib/utils"
import { createSubscriptionAction, cancelSubscriptionAction, renewSubscriptionAction } from "@/app/actions/billing"
import type { Subscription, BillingClient, SubscriptionPlan } from "@/lib/billing-types"

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600",
  PAST_DUE: "bg-red-500/10 text-red-600",
  CANCELED: "bg-muted text-muted-foreground",
  TRIALING: "bg-blue-500/10 text-blue-600",
}

export function SubscriptionsClient() {
  const { companies, selectedCompanyId } = useCompany()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // For new subscription form
  const [clients, setClients] = useState<BillingClient[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [newCompanyId, setNewCompanyId] = useState(selectedCompanyId ?? "")
  const [newClientId, setNewClientId] = useState("")
  const [newPlanId, setNewPlanId] = useState("")

  useEffect(() => {
    if (searchParams.get("new") === "true") setShowNew(true)
  }, [searchParams])

  async function loadAll() {
    setLoading(true)
    try {
      const [subs, cls, pls] = await Promise.all([
        fetch("/api/billing/subscriptions").then(r => r.json()),
        fetch("/api/billing/clients").then(r => r.json()),
        fetch("/api/billing/plans").then(r => r.json()),
      ])
      if (Array.isArray(subs)) setSubscriptions(subs)
      if (Array.isArray(cls)) setClients(cls)
      if (Array.isArray(pls)) setPlans(pls)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const filtered = subscriptions.filter(s =>
    !selectedCompanyId || s.company_id === selectedCompanyId
  )

  const availableClients = newCompanyId
    ? clients.filter(c => c.company_id === newCompanyId)
    : clients

  const availablePlans = newCompanyId
    ? plans.filter(p => p.company_id === newCompanyId)
    : plans

  function handleCreate() {
    setError(null)
    if (!newCompanyId || !newClientId || !newPlanId) return setError("Fill in all fields")
    startTransition(async () => {
      const r = await createSubscriptionAction({
        company_id: newCompanyId,
        client_id: newClientId,
        plan_id: newPlanId,
      })
      if (r.error) {
        setError(r.error)
      } else {
        setShowNew(false)
        setNewClientId(""); setNewPlanId(""); setError(null)
        await loadAll()
      }
    })
  }

  function handleCancel(id: string) {
    startTransition(async () => {
      if (!confirm("Cancel this subscription? The client will not be billed in the next cycle.")) return
      const r = await cancelSubscriptionAction(id)
      if (r.error) alert(r.error)
      else await loadAll()
    })
  }

  const active = filtered.filter(s => s.status === "ACTIVE")
  const mrr = active.reduce((sum, sub) => {
    const plan = sub.subscription_plans
    if (!plan) return sum
    return sum + (plan.billing_interval === "year" ? Math.round(plan.amount_cents / 12) : plan.amount_cents)
  }, 0)

  // Subscriptions whose period ends within 5 days (due for renewal)
  const today = new Date()
  const in5Days = new Date(today)
  in5Days.setDate(today.getDate() + 5)
  const dueForRenewal = active.filter(s => {
    const end = new Date(s.current_period_end)
    return end <= in5Days
  })

  function handleRenew(id: string) {
    startTransition(async () => {
      const r = await renewSubscriptionAction(id)
      if (r.error) alert(r.error)
      else await loadAll()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Subscriptions</h2>
          <p className="text-sm text-muted-foreground">
            Manage recurring billing for your clients
            {!loading && active.length > 0 && (
              <> · <span className="text-foreground font-medium">{formatCents(mrr)}/mo MRR</span></>
            )}
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 size-4" />New Subscription
        </Button>
      </div>

      {/* Status Summary */}
      {!loading && (
        <div className="flex flex-wrap gap-3">
          {[
            { status: "ACTIVE", label: "Active" },
            { status: "PAST_DUE", label: "Past Due" },
            { status: "TRIALING", label: "Trialing" },
            { status: "CANCELED", label: "Canceled" },
          ].map(({ status, label }) => {
            const count = filtered.filter(s => s.status === status).length
            if (count === 0) return null
            return (
              <div key={status} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${statusColors[status]}`}>
                <span>{label}:</span>
                <span className="font-bold">{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Renewal Alert Banner */}
      {!loading && dueForRenewal.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4">
          <Calendar className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {dueForRenewal.length} subscription{dueForRenewal.length > 1 ? "s" : ""} due for renewal
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              {dueForRenewal.map(s => s.billing_clients?.name).join(", ")} — click "Generate Invoice" to create next period invoices
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stripe</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-8 rounded bg-muted animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.map(sub => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="size-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{sub.billing_clients?.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{sub.billing_clients?.email}</span>
                  </TableCell>
                  <TableCell className="text-foreground">{sub.subscription_plans?.name}</TableCell>
                  <TableCell className="font-semibold tabular-nums text-foreground">
                    {formatCents(sub.subscription_plans?.amount_cents ?? 0)}
                    <span className="text-xs font-normal text-muted-foreground">
                      /{sub.subscription_plans?.billing_interval}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      <span>{sub.current_period_start}</span>
                      <span>→ {sub.current_period_end}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[sub.status]}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sub.stripe_subscription_id ? (
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                        <CheckCircle2 className="mr-1 size-3" />Synced
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {/* Days until renewal */}
                    {sub.status === "ACTIVE" && (() => {
                      const daysLeft = Math.ceil((new Date(sub.current_period_end).getTime() - today.getTime()) / 86400000)
                      return (
                        <span className={`text-xs font-medium ${
                          daysLeft <= 5 ? "text-amber-600" : "text-muted-foreground"
                        }`}>
                          {daysLeft <= 0 ? "Overdue" : `${daysLeft}d left`}
                        </span>
                      )
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {sub.status === "ACTIVE" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary hover:text-primary"
                          onClick={() => handleRenew(sub.id)}
                          disabled={isPending}
                          title="Generate next period invoice"
                        >
                          <RefreshCw className="mr-1 size-3.5" />Invoice
                        </Button>
                      )}
                      {sub.status === "ACTIVE" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive text-xs"
                          onClick={() => handleCancel(sub.id)}
                          disabled={isPending}
                        >
                          <XCircle className="mr-1 size-3.5" />Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="size-10 mx-auto mb-3 opacity-20" />
                    No subscriptions yet. Create one to start recurring billing.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Subscription Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="w-full max-w-md sm:max-w-md max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>Create Subscription</DialogTitle>
            <DialogDescription>
              This will start recurring billing and auto-generate the first invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />{error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Company</Label>
              <Select value={newCompanyId} onValueChange={v => { setNewCompanyId(v); setNewClientId(""); setNewPlanId("") }}>
                <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Client</Label>
              <Select value={newClientId} onValueChange={setNewClientId} disabled={!newCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                <SelectContent>
                  {availableClients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {newCompanyId && availableClients.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No clients for this company.{" "}
                  <a href="/billing/clients?new=true" className="text-primary underline">Add one first.</a>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Subscription Plan</Label>
              <Select value={newPlanId} onValueChange={setNewPlanId} disabled={!newCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select plan…" /></SelectTrigger>
                <SelectContent>
                  {availablePlans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatCents(p.amount_cents)}/{p.billing_interval}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newCompanyId && availablePlans.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No plans yet.{" "}
                  <a href="/billing/plans" className="text-primary underline">Create plans first.</a>
                </p>
              )}
            </div>

            {newPlanId && (
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Calendar className="size-3.5 shrink-0" />
                A first invoice will be auto-generated and the billing period starts today.
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={isPending || !newCompanyId || !newClientId || !newPlanId}
              className="w-full"
            >
              {isPending
                ? <><Loader2 className="mr-2 size-4 animate-spin" />Creating…</>
                : <><RefreshCw className="mr-2 size-4" />Start Subscription</>
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
