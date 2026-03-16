"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
    DollarSign, Users, FileCheck, AlertCircle,
    Plus, UserPlus, Receipt, FileText, ArrowUpRight, TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    created_at: string
    contractors: { first_name: string; last_name: string; business_name: string | null } | null
    companies: { name: string } | null
}

const statusColors: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    PRINTED: "bg-primary/10 text-primary",
    VOID: "bg-destructive/10 text-destructive",
    CLEARED: "bg-emerald-500/10 text-emerald-600",
}

export function DashboardClient() {
    const { selectedCompanyId } = useCompany()
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetch("/api/payments")
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    const filtered = selectedCompanyId
                        ? data.filter((p: Payment) => p.company_id === selectedCompanyId)
                        : data
                    setPayments(filtered)
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [selectedCompanyId])

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const nonVoid = payments.filter((p) => p.status !== "VOID")

    const paidThisMonth = nonVoid
        .filter((p) => {
            const d = new Date(p.payment_date)
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear
        })
        .reduce((s, p) => s + p.amount_cents, 0)

    const paidYTD = nonVoid
        .filter((p) => new Date(p.payment_date).getFullYear() === currentYear)
        .reduce((s, p) => s + p.amount_cents, 0)

    const contractorsOver600 = (() => {
        const totals: Record<string, number> = {}
        nonVoid
            .filter((p) => new Date(p.payment_date).getFullYear() === currentYear)
            .forEach((p) => {
                totals[p.contractor_id] = (totals[p.contractor_id] || 0) + p.amount_cents
            })
        return Object.values(totals).filter((v) => v >= 60000).length
    })()

    const openChecks = payments.filter(
        (p) => p.status === "PRINTED" || p.status === "DRAFT"
    ).length

    const recent = payments.slice(0, 5)

    return (
        <div className="flex flex-col gap-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Paid This Month</CardTitle>
                        <DollarSign className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {loading ? "—" : formatCents(paidThisMonth)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <TrendingUp className="inline-block size-3 mr-1" />Current billing period
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Paid YTD</CardTitle>
                        <DollarSign className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {loading ? "—" : formatCents(paidYTD)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Non-void payments {currentYear}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{"Contractors > $600"}</CardTitle>
                        <Users className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {loading ? "—" : contractorsOver600}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <FileCheck className="inline-block size-3 mr-1" />1099-NEC required
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Open Checks</CardTitle>
                        <AlertCircle className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {loading ? "—" : openChecks}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Draft or printed, not cleared</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Quick Actions */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-foreground">Quick Actions</CardTitle>
                        <CardDescription>Common tasks</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Button asChild className="justify-start">
                            <Link href="/payments?new=true">
                                <Plus className="mr-2 size-4" />New Payment
                            </Link>
                        </Button>
                        <Button variant="secondary" asChild className="justify-start">
                            <Link href="/contractors?new=true">
                                <UserPlus className="mr-2 size-4" />Add Contractor
                            </Link>
                        </Button>
                        <Button variant="secondary" asChild className="justify-start">
                            <Link href="/expenses?new=true">
                                <Receipt className="mr-2 size-4" />Add Expense
                            </Link>
                        </Button>
                        <Button variant="secondary" asChild className="justify-start">
                            <Link href="/reports/1099">
                                <FileText className="mr-2 size-4" />1099 Reports
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Payments */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground">Recent Payments</CardTitle>
                            <CardDescription>Latest contractor payments</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/payments">
                                View all <ArrowUpRight className="ml-1 size-3" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-3">
                            {loading
                                ? Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-14 rounded-lg border bg-muted/30 animate-pulse" />
                                ))
                                : recent.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-medium text-foreground">
                                                {p.contractors ? getContractorDisplayName(p.contractors) : "Unknown"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {p.companies?.name} · {p.memo}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className={statusColors[p.status] ?? ""}>
                                                {p.status}
                                            </Badge>
                                            <span className="text-sm font-semibold tabular-nums text-foreground">
                                                {formatCents(p.amount_cents)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            }
                            {!loading && recent.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No payments yet. Create your first payment to get started.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
