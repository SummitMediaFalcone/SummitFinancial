"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Plus, Trash2, Loader2, AlertCircle, RefreshCw,
  Package, Search, X, ChevronDown, ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useCompany } from "@/lib/company-context"
import { formatCents } from "@/lib/utils"
import { createInvoiceAction } from "@/app/actions/billing"
import type { BillingClient, SubscriptionPlan, BillingProduct } from "@/lib/billing-types"

interface LineItem {
  description: string
  quantity: string
  unit_price: string
}

interface Props {
  onComplete: () => void
}

export function NewInvoiceDialog({ onComplete }: Props) {
  const { companies, selectedCompanyId } = useCompany()
  const [companyId, setCompanyId] = useState(selectedCompanyId ?? "")
  const [clientId, setClientId] = useState("")
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split("T")[0]
  })
  const [notes, setNotes] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceInterval, setRecurrenceInterval] = useState<"month" | "year">("month")
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [discountPct, setDiscountPct] = useState("")
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: "1", unit_price: "" },
  ])
  const [clients, setClients] = useState<BillingClient[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [products, setProducts] = useState<BillingProduct[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Product picker state
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [productSearch, setProductSearch] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/billing/clients").then(r => r.json()),
      fetch("/api/billing/plans").then(r => r.json()),
      fetch("/api/billing/products").then(r => r.json()),
    ]).then(([c, p, prod]) => {
      if (Array.isArray(c)) setClients(c)
      if (Array.isArray(p)) setPlans(p)
      if (Array.isArray(prod)) setProducts(prod)
    })
  }, [])

  // When a plan is selected, auto-populate one line item
  function handlePlanSelect(planId: string) {
    setSelectedPlanId(planId)
    const plan = plans.find(p => p.id === planId)
    if (plan) {
      setIsRecurring(true)
      setRecurrenceInterval(plan.billing_interval)
      setItems([{
        description: `${plan.name} — ${plan.billing_interval === "year" ? "Annual" : "Monthly"} subscription`,
        quantity: "1",
        unit_price: (plan.amount_cents / 100).toFixed(2),
      }])
    }
  }

  // Add a product from the catalog as a new line item
  function addProductAsLineItem(product: BillingProduct) {
    setItems(prev => [
      ...prev.filter(i => i.description !== "" || i.unit_price !== ""), // remove empty trailing rows
      {
        description: product.name + (product.description ? ` — ${product.description}` : ""),
        quantity: "1",
        unit_price: (product.unit_price_cents / 100).toFixed(2),
      },
    ])
    setShowProductPicker(false)
    setProductSearch("")
  }

  function addItem() {
    setItems(prev => [...prev, { description: "", quantity: "1", unit_price: "" }])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const subtotalCents = items.reduce((s, item) => {
    const qty = parseFloat(item.quantity || "0")
    const price = parseFloat(item.unit_price || "0")
    return s + Math.round(qty * price * 100)
  }, 0)

  const discountCents = discountPct
    ? Math.round(subtotalCents * (parseFloat(discountPct) / 100))
    : 0

  const totalCents = subtotalCents - discountCents

  const availableClients = companyId
    ? clients.filter(c => c.company_id === companyId)
    : clients

  const availablePlans = companyId
    ? plans.filter(p => p.company_id === companyId)
    : plans

  const availableProducts = (companyId
    ? products.filter(p => p.company_id === companyId)
    : products
  ).filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(productSearch.toLowerCase())
  )

  function handleSubmit() {
    setError(null)
    if (!companyId) return setError("Select a company")
    if (!clientId) return setError("Select a client")
    if (items.some(i => !i.description || !i.unit_price)) return setError("Fill in all line items")

    startTransition(async () => {
      const result = await createInvoiceAction({
        company_id: companyId,
        client_id: clientId,
        due_date: dueDate,
        notes: notes || undefined,
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurrenceInterval : undefined,
        subscription_plan_id: selectedPlanId || undefined,
        items: items.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity || "1"),
          unit_price_cents: Math.round(parseFloat(item.unit_price || "0") * 100),
        })),
        discount_cents: discountCents,
      })

      if (result.error) {
        setError(result.error)
      } else {
        onComplete()
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />{error}
        </div>
      )}

      {/* Company & Client */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Company (Billed From)</Label>
          <Select value={companyId} onValueChange={v => { setCompanyId(v); setClientId("") }}>
            <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Client (Billed To)</Label>
          <Select value={clientId} onValueChange={setClientId} disabled={!companyId}>
            <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
            <SelectContent>
              {availableClients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Issue Date</Label>
          <Input type="date" value={new Date().toISOString().split("T")[0]} disabled />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Due Date</Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>

      {/* Subscription Plan Quick-fill */}
      {availablePlans.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label className="flex items-center gap-2">
            <RefreshCw className="size-3.5 text-muted-foreground" />
            Quick-fill from Subscription Plan
          </Label>
          <Select value={selectedPlanId} onValueChange={handlePlanSelect}>
            <SelectTrigger><SelectValue placeholder="Select a plan to auto-fill…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">— Manual entry —</SelectItem>
              {availablePlans.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — {formatCents(p.amount_cents)}/{p.billing_interval}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Recurring Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">Recurring Invoice</span>
          <span className="text-xs text-muted-foreground">Marks this as a subscription cycle invoice</span>
        </div>
        <div className="flex items-center gap-3">
          {isRecurring && (
            <Select value={recurrenceInterval} onValueChange={v => setRecurrenceInterval(v as "month" | "year")}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
        </div>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Line Items</CardTitle>
            {availableProducts.length > 0 || productSearch ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => setShowProductPicker(v => !v)}
              >
                <Package className="size-3.5" />
                Add from Catalog
                {showProductPicker ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {/* ── Product Picker Panel ── */}
          {showProductPicker && (
            <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">
                  Product & Service Catalog
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => { setShowProductPicker(false); setProductSearch("") }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search products…"
                  className="pl-8 h-8 text-xs"
                  autoFocus
                />
              </div>

              {/* Product list */}
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {availableProducts.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    {companyId
                      ? "No products yet for this company. Create them in Billing → Products & Services."
                      : "Select a company first to see its products."}
                  </div>
                ) : availableProducts.map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProductAsLineItem(product)}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-left hover:bg-background transition-colors group border border-transparent hover:border-border"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium text-foreground leading-tight">{product.name}</span>
                      {product.description && (
                        <span className="text-xs text-muted-foreground truncate">{product.description}</span>
                      )}
                      {product.category && (
                        <Badge variant="secondary" className="text-xs w-fit mt-0.5">{product.category}</Badge>
                      )}
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {formatCents(product.unit_price_cents)}
                      </p>
                      <p className="text-xs text-muted-foreground">per {product.unit_label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
            <span className="col-span-6">Description</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-3 text-right">Unit Price</span>
            <span className="col-span-1" />
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <Input
                className="col-span-6 text-sm"
                placeholder="Service or product description"
                value={item.description}
                onChange={e => updateItem(idx, "description", e.target.value)}
              />
              <Input
                className="col-span-2 text-center text-sm"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="1"
                value={item.quantity}
                onChange={e => updateItem(idx, "quantity", e.target.value)}
              />
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  className="pl-6 text-sm text-right"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={item.unit_price}
                  onChange={e => updateItem(idx, "unit_price", e.target.value)}
                />
              </div>
              <div className="col-span-1 flex justify-center">
                {items.length > 1 && (
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1.5 size-3.5" />Add Line Item
              </Button>
              {products.filter(p => !companyId || p.company_id === companyId).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setShowProductPicker(v => !v)}
                >
                  <Package className="mr-1.5 size-3.5" />From Catalog
                </Button>
              )}
            </div>
            {/* Row totals */}
            <div className="text-xs text-muted-foreground text-right space-y-0.5">
              {items.map((item, idx) => {
                const rowTotal = Math.round(parseFloat(item.quantity || "0") * parseFloat(item.unit_price || "0") * 100)
                return rowTotal > 0 ? (
                  <div key={idx} className="tabular-nums">{formatCents(rowTotal)}</div>
                ) : null
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="flex flex-col gap-2 items-end">
        <div className="flex items-center gap-8 text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium tabular-nums w-32 text-right">{formatCents(subtotalCents)}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Discount (%)</span>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
            value={discountPct}
            onChange={e => setDiscountPct(e.target.value)}
            className="w-20 text-right"
          />
          {discountCents > 0 && (
            <span className="text-sm text-emerald-600 tabular-nums w-32 text-right">
              −{formatCents(discountCents)}
            </span>
          )}
        </div>
        <Separator className="w-48" />
        <div className="flex items-center gap-8 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums w-32 text-right text-foreground">{formatCents(totalCents)}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <Label>Notes (optional)</Label>
        <Textarea
          placeholder="Payment instructions, thank you message, etc."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isPending || !companyId || !clientId || subtotalCents === 0}
        size="lg"
        className="w-full"
      >
        {isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Creating…</> : "Create Invoice"}
      </Button>
    </div>
  )
}
