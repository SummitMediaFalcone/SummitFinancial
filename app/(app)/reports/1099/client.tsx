"use client"

import { useState, useEffect, useTransition } from "react"
import { Download, AlertCircle, CheckCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { formatCents } from "@/lib/utils"
import { writeAuditLog } from "@/lib/audit"

interface Props {
    companies: { id: string; name: string }[]
}

interface Row1099 {
    contractor_id: string
    first_name: string
    last_name: string
    business_name: string | null
    email: string
    address_line1: string
    address_city: string
    address_state: string
    address_zip: string
    tin_masked: string
    tin_type: string
    w9_file_path: string | null
    total_cents: number
}

const THRESHOLD_CENTS = 60000 // $600

export function Report1099Client({ companies }: Props) {
    const currentYear = new Date().getFullYear()
    const [year, setYear] = useState(String(currentYear))
    const [companyId, setCompanyId] = useState<string>(
        companies[0]?.id ?? ""
    )
    const [rows, setRows] = useState<Row1099[]>([])
    const [loading, setLoading] = useState(false)
    const [isPending, startTransition] = useTransition()

    const supabase = createClient()

    async function load() {
        if (!companyId) return
        setLoading(true)
        try {
            const yearStart = `${year}-01-01`
            const yearEnd = `${year}-12-31`

            const { data: payments } = await supabase
                .from("payments")
                .select(
                    "contractor_id, amount_cents, contractors(first_name, last_name, business_name, email, address_line1, address_city, address_state, address_zip, tin_masked, tin_type, w9_file_path)"
                )
                .eq("company_id", companyId)
                .neq("status", "VOID")
                .gte("payment_date", yearStart)
                .lte("payment_date", yearEnd)

            if (!payments) { setRows([]); return }

            // Aggregate by contractor
            const map = new Map<string, Row1099>()
            for (const p of payments) {
                const c = p.contractors as unknown as Omit<Row1099, "contractor_id" | "total_cents"> | null
                if (!c) continue
                if (!map.has(p.contractor_id)) {
                    map.set(p.contractor_id, {
                        contractor_id: p.contractor_id,
                        first_name: c.first_name,
                        last_name: c.last_name,
                        business_name: c.business_name,
                        email: c.email,
                        address_line1: c.address_line1,
                        address_city: c.address_city,
                        address_state: c.address_state,
                        address_zip: c.address_zip,
                        tin_masked: c.tin_masked,
                        tin_type: c.tin_type,
                        w9_file_path: c.w9_file_path,
                        total_cents: 0,
                    })
                }
                map.get(p.contractor_id)!.total_cents += p.amount_cents
            }

            setRows(
                Array.from(map.values()).sort((a, b) => b.total_cents - a.total_cents)
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId, year])

    function buildCSV(): string {
        const company = companies.find((c) => c.id === companyId)
        const header = [
            "Payer Name",
            "Tax Year",
            "Payee First Name",
            "Payee Last Name",
            "Payee Business Name",
            "Payee TIN Type",
            "Payee TIN (masked)",
            "Payee Address",
            "Payee City",
            "Payee State",
            "Payee ZIP",
            "Payee Email",
            "NEC Box 1 Amount",
            "W-9 On File",
            "Requires 1099",
        ].join(",")

        const dataRows = rows
            .filter((r) => r.total_cents >= THRESHOLD_CENTS)
            .map((r) => {
                const requires = r.total_cents >= THRESHOLD_CENTS ? "YES" : "NO"
                const w9 = r.w9_file_path ? "YES" : "NO"
                const amount = (r.total_cents / 100).toFixed(2)
                return [
                    company?.name ?? "",
                    year,
                    r.first_name,
                    r.last_name,
                    r.business_name ?? "",
                    r.tin_type,
                    r.tin_masked,
                    r.address_line1,
                    r.address_city,
                    r.address_state,
                    r.address_zip,
                    r.email,
                    amount,
                    w9,
                    requires,
                ]
                    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                    .join(",")
            })

        return [header, ...dataRows].join("\n")
    }

    function downloadCSV() {
        startTransition(async () => {
            const csv = buildCSV()
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `1099-NEC_${companies.find((c) => c.id === companyId)?.name ?? companyId}_${year}.csv`
            a.click()
            URL.revokeObjectURL(url)

            // Log export (best-effort)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    await fetch("/api/audit", {
                        method: "POST",
                        body: JSON.stringify({
                            actorId: user.id,
                            actorEmail: user.email,
                            action: "EXPORT_1099",
                            entityType: "Report",
                            entityId: companyId,
                            companyId,
                            meta: { year },
                        }),
                        headers: { "Content-Type": "application/json" },
                    })
                }
            } catch { }
        })
    }

    const eligibleCount = rows.filter((r) => r.total_cents >= THRESHOLD_CENTS).length
    const missingW9Count = rows.filter(
        (r) => r.total_cents >= THRESHOLD_CENTS && !r.w9_file_path
    ).length

    const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i))

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">1099-NEC Reports</h2>
                    <p className="text-sm text-muted-foreground">
                        Contractor payment totals for IRS 1099-NEC filing
                    </p>
                </div>
                <Button
                    onClick={downloadCSV}
                    disabled={eligibleCount === 0 || isPending}
                >
                    <Download className="mr-2 size-4" />
                    Export CSV ({eligibleCount} eligible)
                </Button>
            </div>

            <div className="flex flex-wrap gap-3">
                <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                        {companies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map((y) => (
                            <SelectItem key={y} value={y}>
                                {y}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Contractors ≥ $600
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{eligibleCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">1099-NEC required</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Missing W-9
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            className={`text-2xl font-bold ${missingW9Count > 0 ? "text-destructive" : "text-foreground"
                                }`}
                        >
                            {missingW9Count}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Need W-9 before filing
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total NEC Payments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCents(
                                rows
                                    .filter((r) => r.total_cents >= THRESHOLD_CENTS)
                                    .reduce((s, r) => s + r.total_cents, 0)
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Box 1 total, {year}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Contractor</TableHead>
                                <TableHead>TIN</TableHead>
                                <TableHead>W-9</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total Paid</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No payments found for {year}.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((r) => {
                                    const eligible = r.total_cents >= THRESHOLD_CENTS
                                    return (
                                        <TableRow key={r.contractor_id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground">
                                                        {r.business_name || `${r.first_name} ${r.last_name}`}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {r.email}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {r.tin_type}: {r.tin_masked}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {r.w9_file_path ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600">
                                                        <CheckCircle className="mr-1 size-3" />
                                                        On file
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-amber-500/10 text-amber-600">
                                                        <AlertCircle className="mr-1 size-3" />
                                                        Missing
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {eligible ? (
                                                    <Badge className="bg-blue-500/10 text-blue-600">
                                                        <FileText className="mr-1 size-3" />
                                                        1099 Required
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-muted-foreground">
                                                        Under $600
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">
                                                {formatCents(r.total_cents)}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
