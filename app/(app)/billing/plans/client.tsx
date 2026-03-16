"use client"

import { useEffect, useState, useTransition } from "react"
import { Plus, Zap, Calendar, AlertCircle, Loader2, CheckCircle2, Percent } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useCompany } from "@/lib/company-context"
import { formatCents } from "@/lib/utils"
import { createPlanAction } from "@/app/actions/billing"
import type { SubscriptionPlan } from "@/lib/billing-types"

// Summit Media Pro preset plans
const PRESET_PLANS = [
  {
    name: "Basic Monthly",
    description: "Standard access — billed monthly",
    billing_interval: "month" as const,
    amount_cents: 1500,
  },
  {
    name: "Pro Monthly",
    description: "Pro features — billed monthly",
    billing_interval: "month" as const,
    amount_cents: 1999,
  },
  {
    name: "Basic Annual",
    description: "Standard access — billed yearly (10% off)",
    billing_interval: "year" as const,
    amount_cents: 16200,  // $15 × 12 × 0.9
  },
  {
    name: "Pro Annual",
    description: "Pro features — billed yearly (10% off)",
    billing_interval: "year" as const,
    amount_cents: 21588,  // $19.99 × 12 × 0.9
  },
]

export function PlansClient() {
  const { companies, selectedCompanyId } = useCompany()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [companyId, setCompanyId] = useState(selectedCompanyId ?? "")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month")
  const [amountDollars, setAmountDollars] = useState("")

  async function loadPlans() {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/plans")
      const data = await res.json()
      if (Array.isArray(data)) setPlans(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPlans() }, [])

  const filtered = plans.filter(p =>
    !selectedCompanyId || p.company_id === selectedCompanyId
  )

  function fillPreset(preset: typeof PRESET_PLANS[0]) {
    setName(preset.name)
    setDescription(preset.description)
    setBillingInterval(preset.billing_interval)
    setAmountDollars((preset.amount_cents / 100).toFixed(2))
  }

  function handleCreate() {
    setError(null)
    if (!companyId) return setError("Select a company")
    if (!name) return setError("Plan name is required")
    const cents = Math.round(parseFloat(amountDollars || "0") * 100)
    if (cents <= 0) return setError("Amount must be greater than 0")

    startTransition(async () => {
      const result = await createPlanAction({
        company_id: companyId,
        name,
        description: description || undefined,
        billing_interval: billingInterval,
        amount_cents: cents,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setShowNew(false)
        setName(""); setDescription(""); setAmountDollars(""); setError(null)
        await loadPlans()
      }
    })
  }

  // Group by interval
  const monthlyPlans = filtered.filter(p => p.billing_interval === "month")
  const yearlyPlans = filtered.filter(p => p.billing_interval === "year")

  function PlanCard({ plan }: { plan: SubscriptionPlan }) {
    const monthlyEquivalent = plan.billing_interval === "year"
      ? Math.round(plan.amount_cents / 12)
      : plan.amount_cents
    const companyName = companies.find(c => c.id === plan.company_id)?.name

    return (
      <Card className="relative overflow-hidden hover:border-primary/40 transition-colors">
        {plan.billing_interval === "year" && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">
              <Percent className="mr-1 size-2.5" />10% off
            </Badge>
          </div>
        )}
        <CardContent className="p-5 flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-foreground">{plan.name}</h3>
            {companyName && <p className="text-xs text-muted-foreground mt-0.5">{companyName}</p>}
          </div>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-foreground tabular-nums">
              {formatCents(plan.amount_cents)}
            </span>
            <span className="text-sm text-muted-foreground mb-1">
              / {plan.billing_interval}
            </span>
          </div>
          {plan.billing_interval === "year" && (
            <p className="text-xs text-muted-foreground">
              ≈ {formatCents(monthlyEquivalent)}/month
            </p>
          )}
          {plan.description && (
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {plan.stripe_price_id ? (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                <CheckCircle2 className="mr-1 size-3" />Stripe Synced
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Local Only
              </Badge>
            )}
            <Badge variant={plan.is_active ? "secondary" : "outline"} className="text-xs">
              {plan.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Subscription Plans</h2>
          <p className="text-sm text-muted-foreground">
            Define pricing tiers for your recurring billing
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 size-4" />New Plan
        </Button>
      </div>

      {/* Quick-start presets banner */}
      {plans.length === 0 && !loading && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="size-4 text-primary" />
              Quick Start — Summit Media Pro Plans
            </CardTitle>
            <CardDescription>
              Pre-configured plans matching your pricing structure. Select a company then click to create.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label>Company to create plans for</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select company…" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PRESET_PLANS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => { fillPreset(preset); setShowNew(true) }}
                  className="flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left hover:border-primary/40 hover:bg-muted/40 transition-colors"
                  disabled={!companyId}
                >
                  <span className="text-xs font-semibold text-foreground">{preset.name}</span>
                  <span className="text-lg font-bold text-primary tabular-nums">
                    {formatCents(preset.amount_cents)}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {preset.billing_interval}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Plans */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {monthlyPlans.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Calendar className="size-4" />Monthly Plans
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {monthlyPlans.map(p => <PlanCard key={p.id} plan={p} />)}
              </div>
            </div>
          )}

          {yearlyPlans.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Calendar className="size-4" />Annual Plans
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {yearlyPlans.map(p => <PlanCard key={p.id} plan={p} />)}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Zap className="size-12 mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">No plans yet.</p>
                <p className="text-muted-foreground text-xs mt-1">Create your first pricing plan or use the quick-start presets above.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* New Plan Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Subscription Plan</DialogTitle>
            <DialogDescription>Plans will be synced to Stripe automatically when your keys are configured.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />{error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Plan Name *</Label>
              <Input placeholder="e.g. Pro Monthly" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Description</Label>
              <Textarea placeholder="What's included in this plan?" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Billing Interval</Label>
                <Select value={billingInterval} onValueChange={v => setBillingInterval(v as "month" | "year")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Price ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={amountDollars}
                    onChange={e => setAmountDollars(e.target.value)}
                    className="pl-6"
                  />
                </div>
              </div>
            </div>

            {billingInterval === "year" && amountDollars && (
              <div className="rounded-md bg-emerald-500/5 border border-emerald-200/50 p-3 text-xs text-emerald-700">
                💡 Tip: Apply 10% discount. Monthly equivalent: ${(parseFloat(amountDollars || "0") / 12).toFixed(2)}/mo
              </div>
            )}

            <Button onClick={handleCreate} disabled={isPending} className="w-full">
              {isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Creating…</> : "Create Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
