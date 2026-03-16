"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
    FileText, Users, RefreshCw, TrendingUp, DollarSign,
    AlertCircle, Clock, ArrowUpRight, Plus, Package,
    ChevronRight, CheckCircle2, Ban, Send,
} from "lucide-react"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCompany } from "@/lib/company-context"
import { formatCents } from "@/lib/utils"
import type { Invoice, Subscription } from "@/lib/billing-types"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
    DRAFT:   { label: "Draft",   dot: "#94a3b8", badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
    SENT:    { label: "Sent",    dot: "#6366f1", badge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400" },
    PAID:    { label: "Paid",    dot: "#10b981", badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
    OVERDUE: { label: "Overdue", dot: "#ef4444", badge: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" },
    VOID:    { label: "Void",    dot: "#6b7280", badge: "bg-muted text-muted-foreground" },
}

const STAT_CARDS = [
    { key: "collected", label: "Collected This Month", from: "#10b981", to: "#059669", shadow: "shadow-emerald-500/20", icon: <DollarSign className="size-5" /> },
    { key: "outstanding", label: "Outstanding",         from: "#6366f1", to: "#4f46e5", shadow: "shadow-indigo-500/20",  icon: <Clock className="size-5" /> },
    { key: "mrr",        label: "Est. MRR",             from: "#f59e0b", to: "#d97706", shadow: "shadow-amber-500/20",  icon: <TrendingUp className="size-5" /> },
    { key: "overdue",    label: "Overdue Invoices",     from: "#ef4444", to: "#dc2626", shadow: "shadow-red-500/20",    icon: <AlertCircle className="size-5" /> },
]

const QUICK_ACTIONS = [
    { href: "/billing/invoices?new=true",    icon: <FileText className="size-4" />,  label: "New Invoice",      color: "bg-indigo-500 hover:bg-indigo-600 text-white" },
    { href: "/billing/clients?new=true",     icon: <Users className="size-4" />,     label: "Add Client",       color: "bg-emerald-500 hover:bg-emerald-600 text-white" },
    { href: "/billing/subscriptions?new=true", icon: <RefreshCw className="size-4" />, label: "New Subscription", color: "bg-violet-500 hover:bg-violet-600 text-white" },
    { href: "/billing/plans",                icon: <TrendingUp className="size-4" />, label: "Billing Plans",    color: "bg-amber-500 hover:bg-amber-600 text-white" },
    { href: "/billing/products",             icon: <Package className="size-4" />,   label: "Products",         color: "bg-sky-500 hover:bg-sky-600 text-white" },
    { href: "/billing/clients",              icon: <Users className="size-4" />,     label: "All Clients",      color: "bg-slate-500 hover:bg-slate-600 text-white" },
]

function AreaTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl border border-border bg-card/95 backdrop-blur px-3 py-2 shadow-xl text-xs">
            <p className="font-semibold text-foreground mb-1">{label}</p>
            <p className="text-emerald-400">{formatCents(payload[0]?.value * 100 || 0)}</p>
        </div>
    )
}

export function BillingDashboard() {
    const { selectedCompanyId, selectedCompanyName } = useCompany()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        Promise.all([
            fetch("/api/billing/invoices").then(r => r.json()),
            fetch("/api/billing/subscriptions").then(r => r.json()),
        ]).then(([invData, subData]) => {
            const fInv = Array.isArray(invData) ? (selectedCompanyId ? invData.filter((i: Invoice) => i.company_id === selectedCompanyId) : invData) : []
            const fSub = Array.isArray(subData) ? (selectedCompanyId ? subData.filter((s: Subscription) => s.company_id === selectedCompanyId) : subData) : []
            setInvoices(fInv)
            setSubscriptions(fSub)
        }).catch(console.error).finally(() => setLoading(false))
    }, [selectedCompanyId])

    const now = new Date()
    const nonVoid = invoices.filter(i => i.status !== "VOID")

    const collected = nonVoid
        .filter(i => i.status === "PAID" && new Date(i.paid_at ?? "").getMonth() === now.getMonth())
        .reduce((s, i) => s + i.total_cents, 0)
    const outstanding = nonVoid
        .filter(i => i.status === "SENT" || i.status === "OVERDUE")
        .reduce((s, i) => s + i.total_cents, 0)
    const overdueCount = nonVoid.filter(i => i.status === "OVERDUE").length
    const activeSubs = subscriptions.filter(s => s.status === "ACTIVE")
    const mrr = activeSubs.reduce((s, sub) => {
        const plan = sub.subscription_plans
        if (!plan) return s
        return s + (plan.billing_interval === "year" ? Math.round(plan.amount_cents / 12) : plan.amount_cents)
    }, 0)

    const statValues: Record<string, string> = {
        collected:   loading ? "—" : formatCents(collected),
        outstanding: loading ? "—" : formatCents(outstanding),
        mrr:         loading ? "—" : formatCents(mrr),
        overdue:     loading ? "—" : String(overdueCount),
    }
    const statSubs: Record<string, string> = {
        collected:   "Paid invoices",
        outstanding: "Sent & unpaid",
        mrr:         `${loading ? "—" : activeSubs.length} active subs`,
        overdue:     overdueCount > 0 ? "Need attention" : "All clear ✓",
    }

    // Monthly revenue chart data
    const chartData = useMemo(() => MONTHS.map((month, i) => ({
        month,
        amount: nonVoid
            .filter(inv => inv.status === "PAID" && new Date(inv.paid_at ?? "").getMonth() === i && new Date(inv.paid_at ?? "").getFullYear() === now.getFullYear())
            .reduce((s, inv) => s + inv.total_cents, 0) / 100,
    })), [invoices])

    const recentInvoices = [...invoices]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 6)

    return (
        <div className="flex flex-col gap-6">

            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Billing & Invoicing</h1>
                    <p className="text-sm text-muted-foreground">
                        {selectedCompanyName ?? "All companies"} · {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>
                </div>
                <Button asChild>
                    <Link href="/billing/invoices?new=true">
                        <Plus className="mr-2 size-4" />New Invoice
                    </Link>
                </Button>
            </div>

            {/* ── Gradient stat cards ─────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {STAT_CARDS.map((s) => (
                    <div
                        key={s.key}
                        className={`relative overflow-hidden rounded-2xl p-5 shadow-lg ${s.shadow}`}
                        style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-white/70">{s.label}</span>
                            <span className="text-white/80">{s.icon}</span>
                        </div>
                        <p className="text-3xl font-bold text-white tabular-nums leading-none mb-1">
                            {statValues[s.key]}
                        </p>
                        <p className="text-xs text-white/60">{statSubs[s.key]}</p>
                        <div className="absolute -right-4 -bottom-4 size-20 rounded-full opacity-10 bg-white" />
                        <div className="absolute -right-1 -bottom-8 size-28 rounded-full opacity-10 bg-white" />
                    </div>
                ))}
            </div>

            {/* ── Revenue chart + Quick actions ──────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                {/* Monthly revenue area chart */}
                <Card className="lg:col-span-2 border-border">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-foreground">Revenue Collected — {now.getFullYear()}</CardTitle>
                            <Link href="/reports/pl" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                                P&L Report <ArrowUpRight className="size-3" />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={190}>
                            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                    axisLine={false} tickLine={false}
                                    tickFormatter={v => v === 0 ? "" : `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                                />
                                <Tooltip content={<AreaTooltip />} />
                                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2.5}
                                    fill="url(#revenueGrad)"
                                    dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                                    activeDot={{ r: 5, fill: "#10b981", strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Quick actions grid */}
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-foreground">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                        {QUICK_ACTIONS.map((a, i) => (
                            <Link
                                key={i}
                                href={a.href}
                                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-center text-xs font-semibold transition-all hover:scale-[1.03] active:scale-95 ${a.color}`}
                            >
                                {a.icon}
                                {a.label}
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* ── Recent Invoices + Active Subs ──────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                {/* Recent invoices */}
                <Card className="lg:col-span-2 border-border">
                    <CardHeader className="pb-0 flex flex-row items-center justify-between">
                        <CardTitle className="text-foreground">Recent Invoices</CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/billing/invoices">View all <ArrowUpRight className="ml-1 size-3" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0 mt-1">
                        {loading ? (
                            <div className="flex flex-col divide-y divide-border">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="flex items-center gap-3 px-6 py-3.5">
                                        <div className="size-9 rounded-xl bg-muted animate-pulse shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3.5 w-36 rounded bg-muted animate-pulse" />
                                            <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
                                        </div>
                                        <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        ) : recentInvoices.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <FileText className="size-10 opacity-20 mb-3" />
                                <p className="text-sm mb-3">No invoices yet</p>
                                <Button size="sm" asChild>
                                    <Link href="/billing/invoices?new=true">Create first invoice</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y divide-border">
                                {recentInvoices.map(inv => {
                                    const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.DRAFT
                                    const clientName = inv.billing_clients?.name ?? "—"
                                    const initials = clientName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
                                    return (
                                        <Link
                                            key={inv.id}
                                            href={`/billing/invoices`}
                                            className="flex items-center gap-3 px-6 py-3.5 hover:bg-accent/30 transition-colors group"
                                        >
                                            {/* Client avatar */}
                                            <div
                                                className="size-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                                                style={{ backgroundColor: cfg.dot }}
                                            >
                                                {initials}
                                            </div>

                                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-foreground truncate">{clientName}</span>
                                                    <span className="text-xs font-mono text-muted-foreground shrink-0">{inv.invoice_number}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    Due {new Date(inv.due_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </span>
                                            </div>

                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="text-sm font-bold text-foreground tabular-nums">
                                                    {formatCents(inv.total_cents)}
                                                </span>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Active subscriptions */}
                <Card className="border-border">
                    <CardHeader className="pb-0 flex flex-row items-center justify-between">
                        <CardTitle className="text-foreground">Subscriptions</CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/billing/subscriptions">View all <ArrowUpRight className="ml-1 size-3" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0 mt-1">
                        {loading ? (
                            <div className="flex flex-col divide-y divide-border">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="px-6 py-3.5 space-y-1.5">
                                        <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
                                        <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        ) : activeSubs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                <RefreshCw className="size-8 opacity-20 mb-2" />
                                <p className="text-sm">No active subscriptions</p>
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y divide-border">
                                {activeSubs.slice(0, 5).map(sub => (
                                    <div key={sub.id} className="flex items-center justify-between px-6 py-3.5">
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className="text-sm font-semibold text-foreground truncate">
                                                {sub.billing_clients?.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {sub.subscription_plans?.name} · renews {
                                                    new Date(sub.current_period_end + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                                }
                                            </span>
                                        </div>
                                        <div className="text-right shrink-0 ml-3">
                                            <div className="text-sm font-bold text-foreground tabular-nums">
                                                {formatCents(sub.subscription_plans?.amount_cents ?? 0)}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                /{sub.subscription_plans?.billing_interval}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {activeSubs.length > 5 && (
                                    <Link href="/billing/subscriptions" className="flex items-center justify-center gap-1 py-3 text-xs text-muted-foreground hover:text-primary transition-colors">
                                        +{activeSubs.length - 5} more <ChevronRight className="size-3" />
                                    </Link>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
