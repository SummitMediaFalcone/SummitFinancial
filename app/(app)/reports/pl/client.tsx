"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, DollarSign, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCompany } from "@/lib/company-context"
import { formatCents } from "@/lib/utils"

interface PLMonth {
  month: string          // "2026-03"
  revenue: number        // Paid invoice totals (cents)
  expenses: number       // Expense totals (cents)
  payouts: number        // Contractor payment totals (cents)
  net: number            // revenue - expenses - payouts
}

function MonthLabel(m: string) {
  const [y, mo] = m.split("-")
  return new Date(Number(y), Number(mo) - 1).toLocaleString("en-US", { month: "short", year: "numeric" })
}

export function PLReportClient() {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<PLMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(String(new Date().getFullYear()))

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ year })
    if (selectedCompanyId) params.set("company_id", selectedCompanyId)
    const res = await fetch(`/api/reports/pl?${params}`)
    const json = await res.json()
    if (Array.isArray(json)) setData(json)
    setLoading(false)
  }

  useEffect(() => { load() }, [year, selectedCompanyId])

  const totals = data.reduce(
    (acc, m) => ({
      revenue: acc.revenue + m.revenue,
      expenses: acc.expenses + m.expenses,
      payouts: acc.payouts + m.payouts,
      net: acc.net + m.net,
    }),
    { revenue: 0, expenses: 0, payouts: 0, net: 0 }
  )

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 4 }, (_, i) => String(currentYear - i))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Profit &amp; Loss</h2>
          <p className="text-sm text-muted-foreground">Revenue vs. expenses vs. contractor payouts by month</p>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Annual Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Revenue", value: totals.revenue, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Expenses", value: totals.expenses, icon: TrendingDown, color: "text-red-500" },
          { label: "Payouts", value: totals.payouts, icon: Minus, color: "text-amber-600" },
          { label: "Net Profit", value: totals.net, icon: DollarSign, color: totals.net >= 0 ? "text-emerald-600" : "text-red-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
                <Icon className={`size-4 ${color}`} />
              </div>
              <p className={`text-xl font-bold tabular-nums ${color}`}>
                {loading ? "—" : formatCents(Math.abs(value))}
              </p>
              {label === "Net Profit" && !loading && (
                <p className="text-xs text-muted-foreground mt-1">
                  {value >= 0 ? "Profitable" : "Net loss"} for {year}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly Breakdown — {year}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Month</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide">Revenue</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-red-500 uppercase tracking-wide">Expenses</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wide">Payouts</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Net</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    No data for {year}
                  </td>
                </tr>
              ) : data.map(m => (
                <tr key={m.month} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{MonthLabel(m.month)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-600 font-medium">
                    {formatCents(m.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-500">
                    {m.expenses > 0 ? `−${formatCents(m.expenses)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-600">
                    {m.payouts > 0 ? `−${formatCents(m.payouts)}` : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-semibold ${m.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {m.net >= 0 ? formatCents(m.net) : `−${formatCents(Math.abs(m.net))}`}
                  </td>
                </tr>
              ))}
            </tbody>
            {!loading && data.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-4 py-3 font-bold text-foreground">Total {year}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-600">{formatCents(totals.revenue)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-red-500">{totals.expenses > 0 ? `−${formatCents(totals.expenses)}` : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-amber-600">{totals.payouts > 0 ? `−${formatCents(totals.payouts)}` : "—"}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-bold text-lg ${totals.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {totals.net >= 0 ? formatCents(totals.net) : `−${formatCents(Math.abs(totals.net))}`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
