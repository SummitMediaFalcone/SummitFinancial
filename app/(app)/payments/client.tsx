"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
    Plus, Search, Loader2, MoreHorizontal, DollarSign,
    Printer, CheckCircle2, Clock, Ban, TrendingUp, Receipt,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCompany } from "@/lib/company-context"
import { formatCents, getContractorDisplayName } from "@/lib/utils"
import { NewPaymentFlow } from "@/components/new-payment-flow"
import { voidPaymentAction, clearPaymentAction } from "@/app/actions/payments"

interface Payment {
    id: string
    company_id: string
    contractor_id: string
    amount_cents: number
    payment_date: string
    status: "DRAFT" | "PRINTED" | "VOID" | "CLEARED"
    memo: string
    category: string
    check_number: number | null
    contractors: { first_name: string; last_name: string; business_name: string | null } | null
    companies: { name: string } | null
}

const STATUS_CONFIG = {
    DRAFT:   { label: "Draft",   dot: "#94a3b8", badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", icon: <Clock className="size-3" /> },
    PRINTED: { label: "Printed", dot: "#6366f1", badge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400", icon: <Printer className="size-3" /> },
    CLEARED: { label: "Cleared", dot: "#10b981", badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400", icon: <CheckCircle2 className="size-3" /> },
    VOID:    { label: "Void",    dot: "#ef4444", badge: "bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400 line-through", icon: <Ban className="size-3" /> },
}

const STAT_STYLES = [
    { from: "#6366f1", to: "#4f46e5", shadow: "shadow-indigo-500/20" },
    { from: "#10b981", to: "#059669", shadow: "shadow-emerald-500/20" },
    { from: "#f59e0b", to: "#d97706", shadow: "shadow-amber-500/20" },
    { from: "#ef4444", to: "#dc2626", shadow: "shadow-red-500/20" },
]

export function PaymentsClient() {
    const { selectedCompanyId } = useCompany()
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [showNewPayment, setShowNewPayment] = useState(false)
    const [isPending, startTransition] = useTransition()

    async function loadPayments() {
        setLoading(true)
        try {
            const res = await fetch("/api/payments")
            const data = await res.json()
            if (Array.isArray(data)) setPayments(data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { loadPayments() }, [])

    const base = useMemo(() => {
        return payments.filter(p => !selectedCompanyId || p.company_id === selectedCompanyId)
    }, [payments, selectedCompanyId])

    const filtered = useMemo(() => base.filter(p => {
        if (statusFilter && p.status !== statusFilter) return false
        if (search) {
            const q = search.toLowerCase()
            const name = p.contractors ? getContractorDisplayName(p.contractors) : ""
            if (!name.toLowerCase().includes(q) && !p.memo?.toLowerCase().includes(q)) return false
        }
        return true
    }), [base, statusFilter, search])

    // ── KPI stats ──────────────────────────────────────────────
    const nonVoid = base.filter(p => p.status !== "VOID")
    const now = new Date()
    const paidThisMonth = nonVoid
        .filter(p => { const d = new Date(p.payment_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
        .reduce((s, p) => s + p.amount_cents, 0)
    const totalYTD = nonVoid
        .filter(p => new Date(p.payment_date).getFullYear() === now.getFullYear())
        .reduce((s, p) => s + p.amount_cents, 0)
    const openChecks = base.filter(p => p.status === "PRINTED" || p.status === "DRAFT").length
    const voidCount = base.filter(p => p.status === "VOID").length

    const stats = [
        { label: "Paid This Month",  value: formatCents(paidThisMonth), sub: "Non-void",        icon: <DollarSign className="size-5" /> },
        { label: "Total YTD",        value: formatCents(totalYTD),       sub: `${now.getFullYear()}`,  icon: <TrendingUp className="size-5" /> },
        { label: "Open Checks",      value: String(openChecks),          sub: "Draft or printed", icon: <Printer className="size-5" /> },
        { label: "Voided",           value: String(voidCount),           sub: "All time",         icon: <Ban className="size-5" /> },
    ]

    function handleVoid(p: Payment) {
        startTransition(async () => {
            const reason = prompt("Reason for voiding this check:") ?? "Voided by user"
            const result = await voidPaymentAction(p.id, p.company_id, reason)
            if (result.error) alert(result.error)
            else await loadPayments()
        })
    }

    function handleClear(p: Payment) {
        startTransition(async () => {
            const result = await clearPaymentAction(p.id, p.company_id)
            if (result.error) alert(result.error)
            else await loadPayments()
        })
    }

    return (
        <div className="flex flex-col gap-6">
            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Payments</h1>
                    <p className="text-sm text-muted-foreground">Contractor payment ledger & check management</p>
                </div>
                <Button onClick={() => setShowNewPayment(true)}>
                    <Plus className="mr-2 size-4" /> New Payment
                </Button>
            </div>

            {/* ── Gradient stat cards ─────────────────────────── */}
            {!loading && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {stats.map((s, i) => (
                        <div key={i}
                            className={`relative overflow-hidden rounded-2xl p-5 shadow-lg ${STAT_STYLES[i].shadow}`}
                            style={{ background: `linear-gradient(135deg, ${STAT_STYLES[i].from}, ${STAT_STYLES[i].to})` }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold uppercase tracking-wider text-white/70">{s.label}</span>
                                <span className="text-white/80">{s.icon}</span>
                            </div>
                            <p className="text-3xl font-bold text-white tabular-nums leading-none mb-1">{s.value}</p>
                            <p className="text-xs text-white/60">{s.sub}</p>
                            <div className="absolute -right-4 -bottom-4 size-20 rounded-full opacity-10 bg-white" />
                            <div className="absolute -right-1 -bottom-8 size-28 rounded-full opacity-10 bg-white" />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Search + status filter pills ───────────────── */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="Search by name or memo…" value={search}
                        onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {[null, "PRINTED", "CLEARED", "DRAFT", "VOID"].map(s => (
                        <button key={s ?? "all"} onClick={() => setStatusFilter(s)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${statusFilter === s
                                ? "bg-primary text-primary-foreground border-primary"
                                : "text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"}`}
                        >
                            {s ?? "All"}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Payments feed ──────────────────────────────── */}
            <Card className="border-border">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col divide-y divide-border">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex items-center gap-3 px-6 py-4">
                                    <div className="size-10 rounded-xl bg-muted animate-pulse shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3.5 w-40 rounded bg-muted animate-pulse" />
                                        <div className="h-2.5 w-56 rounded bg-muted animate-pulse" />
                                    </div>
                                    <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Receipt className="size-10 opacity-20 mb-3" />
                            <p className="text-sm">{payments.length === 0 ? "No payments yet — create your first!" : "No payments match your filter."}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-border">
                            {filtered.map(p => {
                                const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.DRAFT
                                const name = p.contractors ? getContractorDisplayName(p.contractors) : "Unknown"
                                const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
                                return (
                                    <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-accent/30 transition-colors group">
                                        {/* Avatar */}
                                        <div className="size-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                                            style={{ backgroundColor: cfg.dot }}>
                                            {initials}
                                        </div>

                                        {/* Name + memo */}
                                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                            <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                                            <span className="text-xs text-muted-foreground truncate">
                                                {p.companies?.name} · {p.memo}
                                                {p.category ? ` · ${p.category}` : ""}
                                            </span>
                                        </div>

                                        {/* Date */}
                                        <span className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(p.payment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </span>

                                        {/* Check # */}
                                        {p.check_number && (
                                            <span className="hidden md:block text-xs font-mono text-muted-foreground">#{p.check_number}</span>
                                        )}

                                        {/* Status */}
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${cfg.badge}`}>
                                            {cfg.icon}{cfg.label}
                                        </span>

                                        {/* Amount */}
                                        <span className="text-sm font-bold tabular-nums text-foreground shrink-0 w-24 text-right">
                                            {formatCents(p.amount_cents)}
                                        </span>

                                        {/* Actions */}
                                        {p.status !== "VOID" && p.status !== "CLEARED" && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity" disabled={isPending}>
                                                        {isPending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {p.status === "PRINTED" && (
                                                        <DropdownMenuItem onClick={() => handleClear(p)}>
                                                            <CheckCircle2 className="mr-2 size-4 text-emerald-500" /> Mark Cleared
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleVoid(p)} className="text-destructive focus:text-destructive">
                                                        <Ban className="mr-2 size-4" /> Void Check
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showNewPayment} onOpenChange={setShowNewPayment}>
                <DialogContent className="w-full max-w-2xl sm:max-w-2xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
                    <DialogHeader><DialogTitle>New Payment</DialogTitle></DialogHeader>
                    <NewPaymentFlow onComplete={async () => { setShowNewPayment(false); await loadPayments() }} />
                </DialogContent>
            </Dialog>
        </div>
    )
}
