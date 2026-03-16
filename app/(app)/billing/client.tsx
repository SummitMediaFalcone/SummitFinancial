"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  FileText, Users, RefreshCw, TrendingUp, DollarSign,
  AlertCircle, CheckCircle2, Clock, ArrowUpRight, Plus, Zap,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCompany } from "@/lib/company-context"
import { formatCents } from "@/lib/utils"
import type { Invoice, Subscription } from "@/lib/billing-types"

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-500/10 text-blue-600",
  PAID: "bg-emerald-500/10 text-emerald-600",
  OVERDUE: "bg-red-500/10 text-red-600",
  VOID: "bg-muted/50 text-muted-foreground",
}

export function BillingDashboard() {
  const { selectedCompanyId } = useCompany()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/billing/invoices").then(r => r.json()),
      fetch("/api/billing/subscriptions").then(r => r.json()),
    ]).then(([invData, subData]) => {
      const filteredInv = Array.isArray(invData) ? (
        selectedCompanyId ? invData.filter((i: Invoice) => i.company_id === selectedCompanyId) : invData
      ) : []
      const filteredSub = Array.isArray(subData) ? (
        selectedCompanyId ? subData.filter((s: Subscription) => s.company_id === selectedCompanyId) : subData
      ) : []
      setInvoices(filteredInv)
      setSubscriptions(filteredSub)
    }).catch(console.error).finally(() => setLoading(false))
  }, [selectedCompanyId])

  const nonVoidInvoices = invoices.filter(i => i.status !== "VOID")
  const paidThisMonth = nonVoidInvoices
    .filter(i => i.status === "PAID" && new Date(i.paid_at ?? "").getMonth() === new Date().getMonth())
    .reduce((s, i) => s + i.total_cents, 0)
  const outstanding = nonVoidInvoices
    .filter(i => i.status === "SENT" || i.status === "OVERDUE")
    .reduce((s, i) => s + i.total_cents, 0)
  const overdue = nonVoidInvoices.filter(i => i.status === "OVERDUE").length
  const activeSubscriptions = subscriptions.filter(s => s.status === "ACTIVE").length
  const mrr = subscriptions
    .filter(s => s.status === "ACTIVE")
    .reduce((s, sub) => {
      const plan = sub.subscription_plans
      if (!plan) return s
      return s + (plan.billing_interval === "year" ? Math.round(plan.amount_cents / 12) : plan.amount_cents)
    }, 0)

  const recentInvoices = invoices.slice(0, 6)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Billing & Invoicing</h2>
          <p className="text-sm text-muted-foreground">Manage clients, subscriptions, and invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/billing/clients">
              <Users className="mr-2 size-4" />Clients
            </Link>
          </Button>
          <Button asChild>
            <Link href="/billing/invoices?new=true">
              <Plus className="mr-2 size-4" />New Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected This Month</CardTitle>
            <DollarSign className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{loading ? "—" : formatCents(paidThisMonth)}</div>
            <p className="text-xs text-muted-foreground mt-1">Paid invoices</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            <Clock className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{loading ? "—" : formatCents(outstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">Sent & unpaid</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR</CardTitle>
            <TrendingUp className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{loading ? "—" : formatCents(mrr)}</div>
            <p className="text-xs text-muted-foreground mt-1">{loading ? "—" : activeSubscriptions} active subs</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <AlertCircle className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{loading ? "—" : overdue}</div>
            <p className="text-xs text-muted-foreground mt-1">Need attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Zap className="size-4 text-primary" />Quick Actions
            </CardTitle>
            <CardDescription>Common billing tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild className="justify-start w-full">
              <Link href="/billing/invoices?new=true">
                <FileText className="mr-2 size-4" />Create Invoice
              </Link>
            </Button>
            <Button variant="secondary" asChild className="justify-start w-full">
              <Link href="/billing/subscriptions?new=true">
                <RefreshCw className="mr-2 size-4" />New Subscription
              </Link>
            </Button>
            <Button variant="secondary" asChild className="justify-start w-full">
              <Link href="/billing/clients?new=true">
                <Users className="mr-2 size-4" />Add Client
              </Link>
            </Button>
            <Button variant="secondary" asChild className="justify-start w-full">
              <Link href="/billing/plans">
                <TrendingUp className="mr-2 size-4" />Manage Plans
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Recent Invoices</CardTitle>
              <CardDescription>Latest billing activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/billing/invoices">View all <ArrowUpRight className="ml-1 size-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg border bg-muted/30 animate-pulse" />
                ))
              ) : recentInvoices.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="size-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No invoices yet.</p>
                  <Button asChild className="mt-3" size="sm">
                    <Link href="/billing/invoices?new=true">Create your first invoice</Link>
                  </Button>
                </div>
              ) : recentInvoices.map(inv => (
                <Link
                  key={inv.id}
                  href={`/billing/invoices/${inv.id}`}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{inv.invoice_number}</span>
                      <Badge variant="secondary" className={`text-xs ${statusColors[inv.status]}`}>
                        {inv.status}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {inv.billing_clients?.name ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">Due {inv.due_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCents(inv.total_cents)}
                    </span>
                    <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Subscriptions */}
      {subscriptions.filter(s => s.status === "ACTIVE").length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <RefreshCw className="size-4 text-primary" />Active Subscriptions
              </CardTitle>
              <CardDescription>Recurring billing overview</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/billing/subscriptions">View all <ArrowUpRight className="ml-1 size-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subscriptions.filter(s => s.status === "ACTIVE").slice(0, 6).map(sub => (
                <div key={sub.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{sub.billing_clients?.name}</span>
                    <span className="text-xs text-muted-foreground">{sub.subscription_plans?.name}</span>
                    <span className="text-xs text-muted-foreground">Renews {sub.current_period_end}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground tabular-nums">
                      {formatCents(sub.subscription_plans?.amount_cents ?? 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      / {sub.subscription_plans?.billing_interval}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
