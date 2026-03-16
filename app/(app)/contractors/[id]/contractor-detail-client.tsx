"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Mail, Phone, MapPin, FileText, Printer,
  TrendingUp, DollarSign, Receipt, CheckCircle2, Clock, Ban
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import { formatCents, getContractorDisplayName } from "@/lib/utils"
import { ReprintCheckButton } from "./reprint-check-button"
import { DriversLicenseUpload } from "@/components/drivers-license-upload"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground border-border", icon: <Clock className="size-3" /> },
  PRINTED: { label: "Printed", className: "bg-blue-500/10 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800", icon: <Printer className="size-3" /> },
  CLEARED: { label: "Cleared", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800", icon: <CheckCircle2 className="size-3" /> },
  VOID: { label: "Void", className: "bg-red-500/10 text-red-500 border-red-200 dark:border-red-900 line-through", icon: <Ban className="size-3" /> },
}

interface Payment {
  id: string
  amount_cents: number
  payment_date: string
  check_number: number | null
  status: string
  memo: string
  category: string
  companies: any
}

interface Contractor {
  id: string
  first_name: string
  last_name: string
  business_name: string | null
  email: string
  phone: string
  address_line1: string
  address_line2: string | null
  address_city: string
  address_state: string
  address_zip: string
  tin_type: string
  tin_masked: string
  w9_file_path: string | null
  drivers_license_path: string | null
  contractor_company_links: { companies: { id: string; name: string; dba: string | null } | null }[]
  payments: Payment[]
}

interface ContractorDetailClientProps {
  contractor: Contractor
}

// Custom tooltip for the chart
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-primary">{formatCents(payload[0].value * 100)}</p>
    </div>
  )
}

export function ContractorDetailClient({ contractor }: ContractorDetailClientProps) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear())

  const allPayments = contractor.payments || []

  // ── Stats ──────────────────────────────────────────────────
  const totalPaid = allPayments
    .filter(p => p.status !== "VOID")
    .reduce((s, p) => s + p.amount_cents, 0)

  const ytdPayments = allPayments.filter(p => {
    const year = new Date(p.payment_date).getFullYear()
    return year === new Date().getFullYear() && p.status !== "VOID"
  })
  const ytdTotal = ytdPayments.reduce((s, p) => s + p.amount_cents, 0)

  const lastPayment = allPayments
    .filter(p => p.status !== "VOID")
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date))[0]

  const checkCount = allPayments.filter(p =>
    p.status === "PRINTED" || p.status === "CLEARED"
  ).length

  // ── Monthly chart data for selected year ───────────────────
  const chartData = useMemo(() => {
    return MONTHS.map((month, i) => {
      const total = allPayments
        .filter(p => {
          const d = new Date(p.payment_date)
          return d.getFullYear() === yearFilter &&
            d.getMonth() === i &&
            p.status !== "VOID"
        })
        .reduce((s, p) => s + p.amount_cents, 0)
      return { month, amount: total / 100 }
    })
  }, [allPayments, yearFilter])

  const hasChartData = chartData.some(d => d.amount > 0)

  // ── Available years ────────────────────────────────────────
  const years = useMemo(() => {
    const ys = new Set(allPayments.map(p => new Date(p.payment_date).getFullYear()))
    ys.add(new Date().getFullYear())
    return Array.from(ys).sort((a, b) => b - a)
  }, [allPayments])

  // ── Filtered payments list ─────────────────────────────────
  const filtered = useMemo(() => {
    return allPayments
      .filter(p => !statusFilter || p.status === statusFilter)
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date))
  }, [allPayments, statusFilter])

  const linkedCompanies = contractor.contractor_company_links
    .map(l => l.companies).filter(Boolean)

  // Initials for avatar
  const initials = contractor.business_name
    ? contractor.business_name.slice(0, 2).toUpperCase()
    : `${contractor.first_name[0]}${contractor.last_name[0]}`.toUpperCase()

  const displayName = getContractorDisplayName({
    first_name: contractor.first_name,
    last_name: contractor.last_name,
    business_name: contractor.business_name,
  })

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/contractors"><ArrowLeft className="size-4" /></Link>
          </Button>

          {/* Avatar */}
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-sm">
            {initials}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">{displayName}</h1>
            {contractor.business_name && (
              <p className="text-sm text-muted-foreground">
                {contractor.first_name} {contractor.last_name}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="size-3" /> {contractor.email}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="size-3" /> {contractor.phone}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0 ml-18 sm:ml-0">
          <Badge variant="outline" className="font-mono text-xs self-start">
            {contractor.tin_type}: {contractor.tin_masked}
          </Badge>
          {contractor.w9_file_path ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs self-start">
              <FileText className="mr-1 size-3" /> W-9 On File
            </Badge>
          ) : (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs self-start">
              W-9 Missing
            </Badge>
          )}
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Paid</span>
              <DollarSign className="size-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatCents(totalPaid)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">All time</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">YTD Paid</span>
              <TrendingUp className="size-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatCents(ytdTotal)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{ytdPayments.length} payments this year</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Checks Issued</span>
              <Receipt className="size-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{checkCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{allPayments.length} total payments</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Last Payment</span>
              <CheckCircle2 className="size-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {lastPayment ? formatCents(lastPayment.amount_cents) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lastPayment ? lastPayment.payment_date : "No payments yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Chart + Company sidebar ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Bar chart — 2 cols wide */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-foreground">Payment Activity</CardTitle>
              <div className="flex gap-1">
                {years.map(y => (
                  <button
                    key={y}
                    onClick={() => setYearFilter(y)}
                    className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                      yearFilter === y
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hasChartData ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => v === 0 ? "" : `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--accent) / 0.5)", radius: 4 }} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.amount > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                        fillOpacity={entry.amount > 0 ? 1 : 0.4}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                No payments in {yearFilter}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company links sidebar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Linked Companies</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {linkedCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No companies linked</p>
            ) : linkedCompanies.map((c: any) => {
              const companyTotal = allPayments
                .filter(p => p.companies?.id === c.id && p.status !== "VOID")
                .reduce((s, p) => s + p.amount_cents, 0)
              return (
                <Link
                  key={c.id}
                  href={`/companies/${c.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {c.name[0]}
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{c.name}</span>
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground">{formatCents(companyTotal)}</span>
                </Link>
              )
            })}

            {/* Contact info */}
            <div className="mt-2 pt-3 border-t border-border flex flex-col gap-1.5">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3.5 mt-0.5 shrink-0" />
                <span>
                  {contractor.address_line1}{contractor.address_line2 ? `, ${contractor.address_line2}` : ""}<br />
                  {contractor.address_city}, {contractor.address_state} {contractor.address_zip}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Documents ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* W-9 status */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-foreground flex items-center gap-2">
              <FileText className="size-4" /> Tax Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">W-9 Form</p>
                <p className="text-xs text-muted-foreground">Required for 1099-NEC</p>
              </div>
              {contractor.w9_file_path ? (
                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle2 className="mr-1 size-3" /> On File
                </Badge>
              ) : (
                <Badge className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950 dark:text-amber-400">
                  Missing
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">TIN</span>
              <span className="font-mono text-sm font-semibold text-foreground">{contractor.tin_type}: {contractor.tin_masked}</span>
            </div>
          </CardContent>
        </Card>

        {/* Driver's License */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-foreground flex items-center gap-2">
              <Receipt className="size-4" /> Driver's License
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DriversLicenseUpload
              contractorId={contractor.id}
              currentPath={contractor.drivers_license_path}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Payment History ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-foreground">Transaction History</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{allPayments.length} total payments</p>
            </div>

            {/* Status filter pills */}
            <div className="flex gap-1.5 flex-wrap">
              {[null, "PRINTED", "CLEARED", "DRAFT", "VOID"].map(s => (
                <button
                  key={s ?? "all"}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {s ?? "All"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Check</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.DRAFT
                return (
                  <TableRow key={p.id} className="group">
                    <TableCell className="pl-6 text-muted-foreground text-sm whitespace-nowrap">
                      {new Date(p.payment_date + "T12:00:00").toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric"
                      })}
                    </TableCell>
                    <TableCell className="text-sm text-foreground font-medium">
                      {p.companies?.name ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm text-foreground truncate">{p.memo}</p>
                      {p.category && (
                        <p className="text-xs text-muted-foreground truncate">{p.category}</p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {p.check_number ? `#${p.check_number}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs gap-1 ${cfg.className}`}>
                        {cfg.icon}
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">
                      {formatCents(p.amount_cents)}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {p.companies && (
                        <ReprintCheckButton
                          payment={{
                            id: p.id,
                            check_number: p.check_number,
                            amount_cents: p.amount_cents,
                            payment_date: p.payment_date,
                            memo: p.memo,
                            status: p.status,
                          }}
                          company={{
                            id: p.companies.id,
                            name: p.companies.name,
                            address_line1: p.companies.address_line1,
                            address_line2: p.companies.address_line2,
                            address_city: p.companies.address_city,
                            address_state: p.companies.address_state,
                            address_zip: p.companies.address_zip,
                            print_offset_x: p.companies.print_offset_x ?? 0,
                            print_offset_y: p.companies.print_offset_y ?? 0,
                          }}
                          contractor={{
                            first_name: contractor.first_name,
                            last_name: contractor.last_name,
                            business_name: contractor.business_name,
                            address_line1: contractor.address_line1,
                            address_line2: contractor.address_line2,
                            address_city: contractor.address_city,
                            address_state: contractor.address_state,
                            address_zip: contractor.address_zip,
                          }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Receipt className="size-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No payments{statusFilter ? ` with status "${statusFilter}"` : " yet"}.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
