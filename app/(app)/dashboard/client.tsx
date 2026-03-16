"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
    DollarSign, Users, FileCheck, AlertCircle,
    Plus, UserPlus, Receipt, FileText, ArrowUpRight,
    TrendingUp, Printer, ChevronRight, Zap,
} from "lucide-react"
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCompany } from "@/lib/company-context"
import { formatCents, getContractorDisplayName } from "@/lib/utils"

interface Payment {
    id: string
    company_id: string
    contractor_id: string
    amount_cents: number
    payment_date: string
    status: string
    memo: string
    check_number: number | null
    contractors: { first_name: string; last_name: string; business_name: string | null } | null
    companies: { name: string } | null
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const STATUS_COLORS: Record<string, string> = {
    CLEARED:  "#10b981",
    PRINTED:  "#6366f1",
    DRAFT:    "#94a3b8",
    VOID:     "#ef4444",
}

const STAT_GRADIENTS = [
    { from: "#6366f1", to: "#8b5cf6", shadow: "shadow-indigo-500/20" },
    { from: "#10b981", to: "#059669", shadow: "shadow-emerald-500/20" },
    { from: "#f59e0b", to: "#d97706", shadow: "shadow-amber-500/20" },
    { from: "#ef4444", to: "#dc2626", shadow: "shadow-red-500/20" },
]

function CustomAreaTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl border border-border bg-card/90 backdrop-blur px-3 py-2 shadow-xl text-xs">
            <p className="font-semibold text-foreground mb-1">{label}</p>
            <p className="text-indigo-400">{formatCents(payload[0]?.value * 100 || 0)}</p>
        </div>
    )
}

function CustomPieTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl border border-border bg-card/90 backdrop-blur px-3 py-2 shadow-xl text-xs">
            <p className="font-semibold text-foreground">{payload[0].name}</p>
            <p style={{ color: payload[0].payload.fill }}>{formatCents(payload[0].value * 100)}</p>
        </div>
    )
}

export function DashboardClient() {
    const { selectedCompanyId, selectedCompanyName } = useCompany()
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetch("/api/payments")
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setPayments(selectedCompanyId ? data.filter((p: Payment) => p.company_id === selectedCompanyId) : data)
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [selectedCompanyId])

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear  = now.getFullYear()

    const nonVoid = payments.filter(p => p.status !== "VOID")

    // ── KPI calcs ──────────────────────────────────────────────
    const paidThisMonth = nonVoid
        .filter(p => {
            const d = new Date(p.payment_date)
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear
        })
        .reduce((s, p) => s + p.amount_cents, 0)

    const paidYTD = nonVoid
        .filter(p => new Date(p.payment_date).getFullYear() === currentYear)
        .reduce((s, p) => s + p.amount_cents, 0)

    const contractorsOver600 = (() => {
        const totals: Record<string, number> = {}
        nonVoid
            .filter(p => new Date(p.payment_date).getFullYear() === currentYear)
            .forEach(p => { totals[p.contractor_id] = (totals[p.contractor_id] || 0) + p.amount_cents })
        return Object.values(totals).filter(v => v >= 60000).length
    })()

    const openChecks = payments.filter(p => p.status === "PRINTED" || p.status === "DRAFT").length

    // ── Monthly chart data ─────────────────────────────────────
    const monthlyData = useMemo(() => MONTHS.map((month, i) => ({
        month,
        amount: nonVoid
            .filter(p => {
                const d = new Date(p.payment_date)
                return d.getFullYear() === currentYear && d.getMonth() === i
            })
            .reduce((s, p) => s + p.amount_cents, 0) / 100,
    })), [payments, currentYear])

    // ── Status breakdown pie ───────────────────────────────────
    const pieData = useMemo(() => {
        const groups: Record<string, number> = {}
        payments.forEach(p => { groups[p.status] = (groups[p.status] || 0) + p.amount_cents })
        return Object.entries(groups).map(([name, value]) => ({
            name,
            value: value / 100,
            fill: STATUS_COLORS[name] ?? "#94a3b8",
        }))
    }, [payments])

    // ── Recent 6 ──────────────────────────────────────────────
    const recent = [...payments]
        .sort((a, b) => b.payment_date.localeCompare(a.payment_date))
        .slice(0, 6)

    const stats = [
        {
            label: "Paid This Month",
            value: loading ? "—" : formatCents(paidThisMonth),
            sub: MONTHS[currentMonth],
            icon: <DollarSign className="size-5" />,
            ...STAT_GRADIENTS[0],
        },
        {
            label: "Total Paid YTD",
            value: loading ? "—" : formatCents(paidYTD),
            sub: `${currentYear}`,
            icon: <TrendingUp className="size-5" />,
            ...STAT_GRADIENTS[1],
        },
        {
            label: "1099 Required",
            value: loading ? "—" : String(contractorsOver600),
            sub: "Contractors over $600",
            icon: <Users className="size-5" />,
            ...STAT_GRADIENTS[2],
        },
        {
            label: "Open Checks",
            value: loading ? "—" : String(openChecks),
            sub: "Draft or printed",
            icon: <AlertCircle className="size-5" />,
            ...STAT_GRADIENTS[3],
        },
    ]

    const quickActions = [
        { href: "/payments?new=true", icon: <Plus className="size-4" />, label: "New Payment", color: "bg-indigo-500 hover:bg-indigo-600 text-white" },
        { href: "/contractors?new=true", icon: <UserPlus className="size-4" />, label: "Add Contractor", color: "bg-emerald-500 hover:bg-emerald-600 text-white" },
        { href: "/expenses?new=true", icon: <Receipt className="size-4" />, label: "Log Expense", color: "bg-amber-500 hover:bg-amber-600 text-white" },
        { href: "/billing/invoices?new=true", icon: <FileText className="size-4" />, label: "New Invoice", color: "bg-violet-500 hover:bg-violet-600 text-white" },
        { href: "/reports/1099", icon: <FileCheck className="size-4" />, label: "1099 Report", color: "bg-slate-500 hover:bg-slate-600 text-white" },
        { href: "/payments", icon: <Printer className="size-4" />, label: "Print Checks", color: "bg-rose-500 hover:bg-rose-600 text-white" },
    ]

    return (
        <div className="flex flex-col gap-6">

            {/* ── Hero greeting ─────────────────────────────── */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <Zap className="size-5 text-primary" />
                    <h1 className="text-2xl font-bold text-foreground">
                        Summit Financial OS
                    </h1>
                </div>
                <p className="text-sm text-muted-foreground">
                    {selectedCompanyName
                        ? `Viewing data for ${selectedCompanyName}`
                        : "All companies · " + now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
            </div>

            {/* ── KPI stat cards ────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map((s, i) => (
                    <div
                        key={i}
                        className={`relative overflow-hidden rounded-2xl p-5 shadow-lg ${s.shadow}`}
                        style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-white/70">{s.label}</span>
                            <span className="text-white/80">{s.icon}</span>
                        </div>
                        <p className="text-3xl font-bold text-white tabular-nums leading-none mb-1">
                            {s.value}
                        </p>
                        <p className="text-xs text-white/60">{s.sub}</p>

                        {/* Decorative circle */}
                        <div className="absolute -right-4 -bottom-4 size-20 rounded-full opacity-10 bg-white" />
                        <div className="absolute -right-1 -bottom-8 size-28 rounded-full opacity-10 bg-white" />
                    </div>
                ))}
            </div>

            {/* ── Chart row ─────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                {/* Area chart - cash out by month */}
                <Card className="lg:col-span-2 border-border">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-foreground">Monthly Cash Out — {currentYear}</CardTitle>
                            <Link href="/reports/pl" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                                Full P&L <ArrowUpRight className="size-3" />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={monthlyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                    axisLine={false} tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                    axisLine={false} tickLine={false}
                                    tickFormatter={v => v === 0 ? "" : `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                                />
                                <Tooltip content={<CustomAreaTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#6366f1"
                                    strokeWidth={2.5}
                                    fill="url(#cashGradient)"
                                    dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                                    activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Pie - status breakdown */}
                <Card className="border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-foreground">Payment Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pieData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={150}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={42}
                                            outerRadius={65}
                                            paddingAngle={3}
                                            dataKey="value"
                                            strokeWidth={0}
                                        >
                                            {pieData.map((entry, i) => (
                                                <Cell key={i} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomPieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-col gap-1.5 mt-1">
                                    {pieData.map((d, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <div className="size-2 rounded-full" style={{ background: d.fill }} />
                                                <span className="text-muted-foreground capitalize">{d.name.toLowerCase()}</span>
                                            </div>
                                            <span className="font-medium text-foreground">{formatCents(d.value * 100)}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
                                No payment data yet
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Quick actions + recent ─────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                {/* Quick actions */}
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-foreground">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                        {quickActions.map((a, i) => (
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

                {/* Recent payments */}
                <Card className="lg:col-span-2 border-border">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-foreground">Recent Payments</CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/payments">View all <ArrowUpRight className="ml-1 size-3" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex flex-col divide-y divide-border">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="flex items-center gap-3 px-6 py-3">
                                        <div className="size-8 rounded-full bg-muted animate-pulse" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                                            <div className="h-2.5 w-48 rounded bg-muted animate-pulse" />
                                        </div>
                                        <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        ) : recent.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">
                                No payments yet — create your first!
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y divide-border">
                                {recent.map(p => {
                                    const name = p.contractors ? getContractorDisplayName(p.contractors) : "Unknown"
                                    const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
                                    const statusColor = STATUS_COLORS[p.status] ?? "#94a3b8"
                                    return (
                                        <div key={p.id} className="flex items-center gap-3 px-6 py-3 hover:bg-accent/30 transition-colors">
                                            {/* Avatar */}
                                            <div
                                                className="size-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                                style={{ backgroundColor: statusColor }}
                                            >
                                                {initials}
                                            </div>
                                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {p.companies?.name} · {p.memo}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="text-sm font-bold text-foreground tabular-nums">
                                                    {formatCents(p.amount_cents)}
                                                </span>
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                                    style={{ background: `${statusColor}20`, color: statusColor }}>
                                                    {p.status}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
