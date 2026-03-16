"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Plus, Search, Pencil, Trash2, Loader2, AlertCircle,
  Package, Tag, DollarSign, CheckCircle2, XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { useCompany } from "@/lib/company-context"
import { formatCents } from "@/lib/utils"
import { createProductAction, updateProductAction, deleteProductAction } from "@/app/actions/billing"
import type { BillingProduct } from "@/lib/billing-types"

const UNIT_LABELS = [
  "each", "hour", "day", "week", "month", "year",
  "project", "session", "seat", "license", "unit",
]

const CATEGORIES = [
  "Consulting", "Design", "Development", "Marketing",
  "Hosting", "Maintenance", "Support", "Subscription",
  "Software", "Hardware", "Training", "Other",
]

function emptyForm() {
  return {
    name: "",
    description: "",
    unit_price: "",
    unit_label: "each",
    category: "",
    companyId: "",
    is_active: true,
  }
}

export function ProductsClient() {
  const { companies, selectedCompanyId } = useCompany()
  const [products, setProducts] = useState<BillingProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<BillingProduct | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())

  async function loadProducts() {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/products")
      const data = await res.json()
      if (Array.isArray(data)) setProducts(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProducts() }, [])

  const allFiltered = products.filter(p => {
    if (selectedCompanyId && p.company_id !== selectedCompanyId) return false
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q)
      )
    }
    return true
  })

  const categories = Array.from(new Set(
    products.map(p => p.category).filter(Boolean) as string[]
  )).sort()

  function openNew() {
    setEditProduct(null)
    setForm({ ...emptyForm(), companyId: selectedCompanyId ?? companies[0]?.id ?? "" })
    setError(null)
    setShowForm(true)
  }

  function openEdit(product: BillingProduct) {
    setEditProduct(product)
    setForm({
      name: product.name,
      description: product.description ?? "",
      unit_price: (product.unit_price_cents / 100).toFixed(2),
      unit_label: product.unit_label,
      category: product.category ?? "",
      companyId: product.company_id,
      is_active: product.is_active,
    })
    setError(null)
    setShowForm(true)
  }

  function handleSave() {
    setError(null)
    if (!form.name.trim()) return setError("Product name is required")
    if (!form.companyId) return setError("Select a company")
    const cents = Math.round(parseFloat(form.unit_price || "0") * 100)
    if (cents <= 0) return setError("Price must be greater than $0.00")

    startTransition(async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        unit_price_cents: cents,
        unit_label: form.unit_label,
        category: form.category || undefined,
        is_active: form.is_active,
      }

      const result = editProduct
        ? await updateProductAction(editProduct.id, payload)
        : await createProductAction({ ...payload, company_id: form.companyId })

      if (result.error) {
        setError(result.error)
      } else {
        setShowForm(false)
        await loadProducts()
      }
    })
  }

  function handleDelete(id: string, name: string) {
    startTransition(async () => {
      if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
      const result = await deleteProductAction(id)
      if (result.error) alert(result.error)
      else await loadProducts()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Products & Services</h2>
          <p className="text-sm text-muted-foreground">
            Define your named offerings with custom pricing — use them on any invoice
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 size-4" />New Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <Tag className="mr-2 size-4 shrink-0" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary bar */}
      {!loading && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{allFiltered.length}</strong> products</span>
          <span>·</span>
          <span><strong className="text-foreground">{allFiltered.filter(p => p.is_active).length}</strong> active</span>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product / Service</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Per</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-8 rounded bg-muted animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : allFiltered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                    <Package className="size-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-medium">No products yet</p>
                    <p className="text-xs mt-1 mb-4">
                      Add your services, subscriptions, and products to quickly bill clients
                    </p>
                    <Button size="sm" onClick={openNew}>
                      <Plus className="mr-2 size-4" />Add First Product
                    </Button>
                  </TableCell>
                </TableRow>
              ) : allFiltered.map(product => {
                const companyName = companies.find(c => c.id === product.company_id)?.name
                return (
                  <TableRow key={product.id} className={!product.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">{product.name}</span>
                        {product.description && (
                          <span className="text-xs text-muted-foreground truncate max-w-xs">
                            {product.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {companyName?.split(" ").slice(0, 2).join(" ") ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.unit_label}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">
                      {formatCents(product.unit_price_cents)}
                    </TableCell>
                    <TableCell>
                      {product.is_active ? (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-xs">
                          <CheckCircle2 className="mr-1 size-3" />Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <XCircle className="mr-1 size-3" />Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(product)}
                          disabled={isPending}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(product.id, product.name)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditProduct(null); setError(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editProduct ? "Edit Product / Service" : "New Product / Service"}
            </DialogTitle>
            <DialogDescription>
              Set the name and price exactly how you want it to appear on invoices.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />{error}
              </div>
            )}

            {/* Company selector — only show when creating */}
            {!editProduct && (
              <div className="flex flex-col gap-2">
                <Label>Company</Label>
                <Select
                  value={form.companyId}
                  onValueChange={v => setForm(f => ({ ...f, companyId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Name */}
            <div className="flex flex-col gap-2">
              <Label>
                Product / Service Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Website Design, Social Media Management, Monthly Hosting"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                placeholder="What's included, or any notes that appear on the invoice line"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Price + Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>
                  Price <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.unit_price}
                    onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Charged Per</Label>
                <Select
                  value={form.unit_label}
                  onValueChange={v => setForm(f => ({ ...f, unit_label: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIT_LABELS.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Live preview */}
            {form.name && form.unit_price && parseFloat(form.unit_price) > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">Invoice line preview:</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{form.name}</p>
                    {form.description && (
                      <p className="text-xs text-muted-foreground">{form.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {formatCents(Math.round(parseFloat(form.unit_price || "0") * 100))}
                    </p>
                    <p className="text-xs text-muted-foreground">per {form.unit_label}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Category */}
            <div className="flex flex-col gap-2">
              <Label>Category <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select
                value={form.category || "__none__"}
                onValueChange={v => setForm(f => ({ ...f, category: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select a category…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No category</SelectItem>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active toggle */}
            {editProduct && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Active</p>
                  <p className="text-xs text-muted-foreground">Inactive products won't appear in invoice quick-add</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_active}
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    form.is_active ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      form.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={isPending}
              size="lg"
              className="w-full"
            >
              {isPending
                ? <><Loader2 className="mr-2 size-4 animate-spin" />{editProduct ? "Saving…" : "Creating…"}</>
                : editProduct ? "Save Changes" : "Create Product"
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
