import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year") ?? String(new Date().getFullYear())
  const companyId = searchParams.get("company_id")

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  // ── Revenue: paid invoices ──────────────────────────────────
  let revenueQ = supabase
    .from("invoices")
    .select("total_cents, paid_at, company_id")
    .eq("status", "PAID")
    .gte("paid_at", startDate)
    .lte("paid_at", endDate)
  if (companyId) revenueQ = revenueQ.eq("company_id", companyId)
  const { data: revenueRows } = await revenueQ

  // ── Expenses ────────────────────────────────────────────────
  let expQ = supabase
    .from("expenses")
    .select("amount_cents, expense_date, company_id")
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
  if (companyId) expQ = expQ.eq("company_id", companyId)
  const { data: expRows } = await expQ

  // ── Payouts: contractor payments ────────────────────────────
  let payQ = supabase
    .from("payments")
    .select("amount_cents, payment_date, company_id")
    .not("status", "eq", "VOID")
    .gte("payment_date", startDate)
    .lte("payment_date", endDate)
  if (companyId) payQ = payQ.eq("company_id", companyId)
  const { data: payRows } = await payQ

  // ── Aggregate by month ──────────────────────────────────────
  const months: Record<string, { revenue: number; expenses: number; payouts: number }> = {}

  function ensureMonth(m: string) {
    if (!months[m]) months[m] = { revenue: 0, expenses: 0, payouts: 0 }
  }

  for (const r of revenueRows ?? []) {
    const m = (r.paid_at as string).slice(0, 7)
    ensureMonth(m)
    months[m].revenue += r.total_cents ?? 0
  }

  for (const e of expRows ?? []) {
    const m = (e.expense_date as string).slice(0, 7)
    ensureMonth(m)
    months[m].expenses += e.amount_cents ?? 0
  }

  for (const p of payRows ?? []) {
    const m = (p.payment_date as string).slice(0, 7)
    ensureMonth(m)
    months[m].payouts += p.amount_cents ?? 0
  }

  // Fill all 12 months (even empty ones) and sort
  const result = Array.from({ length: 12 }, (_, i) => {
    const mo = String(i + 1).padStart(2, "0")
    const key = `${year}-${mo}`
    const d = months[key] ?? { revenue: 0, expenses: 0, payouts: 0 }
    return {
      month: key,
      revenue: d.revenue,
      expenses: d.expenses,
      payouts: d.payouts,
      net: d.revenue - d.expenses - d.payouts,
    }
  })

  return NextResponse.json(result)
}
