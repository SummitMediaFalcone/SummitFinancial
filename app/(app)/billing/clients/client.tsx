"use client"

import { useEffect, useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, Search, Mail, Phone, Loader2, AlertCircle, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useCompany } from "@/lib/company-context"
import { createBillingClientAction } from "@/app/actions/billing"
import type { BillingClient } from "@/lib/billing-types"

export function ClientsClient() {
  const { companies, selectedCompanyId } = useCompany()
  const [clients, setClients] = useState<BillingClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Form state
  const [companyId, setCompanyId] = useState(selectedCompanyId ?? "")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [zip, setZip] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (searchParams.get("new") === "true") setShowNew(true)
  }, [searchParams])

  async function loadClients() {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/clients")
      const data = await res.json()
      if (Array.isArray(data)) setClients(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadClients() }, [])

  const filtered = clients.filter(c => {
    if (selectedCompanyId && c.company_id !== selectedCompanyId) return false
    if (search) {
      const q = search.toLowerCase()
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    }
    return true
  })

  function resetForm() {
    setName(""); setEmail(""); setPhone(""); setAddress("")
    setCity(""); setState(""); setZip(""); setNotes(""); setError(null)
  }

  function handleCreate() {
    setError(null)
    if (!companyId) return setError("Select a company")
    if (!name || !email) return setError("Name and email are required")

    startTransition(async () => {
      const result = await createBillingClientAction({
        company_id: companyId,
        name, email,
        phone: phone || undefined,
        address_line1: address || undefined,
        address_city: city || undefined,
        address_state: state || undefined,
        address_zip: zip || undefined,
        notes: notes || undefined,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setShowNew(false)
        resetForm()
        await loadClients()
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Billing Clients</h2>
          <p className="text-sm text-muted-foreground">Manage the clients you bill and invoice</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 size-4" />Add Client
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search clients…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="size-12 mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">
              {clients.length === 0
                ? "No clients yet. Add your first billing client to get started."
                : "No clients match your search."}
            </p>
            {clients.length === 0 && (
              <Button className="mt-4" onClick={() => setShowNew(true)}>
                <Plus className="mr-2 size-4" />Add First Client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(client => {
            const companyName = companies.find(c => c.id === client.company_id)?.name
            return (
              <Card key={client.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{client.name}</h3>
                      {companyName && (
                        <Badge variant="secondary" className="text-xs mt-1">{companyName}</Badge>
                      )}
                    </div>
                    {client.stripe_customer_id && (
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                        Stripe ✓
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address_city && (
                      <div className="flex items-center gap-2">
                        <Building2 className="size-3.5 shrink-0" />
                        <span>{client.address_city}, {client.address_state}</span>
                      </div>
                    )}
                  </div>
                  {client.notes && (
                    <p className="text-xs text-muted-foreground italic border-t pt-2">{client.notes}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* New Client Dialog */}
      <Dialog open={showNew} onOpenChange={v => { setShowNew(v); if (!v) resetForm() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Billing Client</DialogTitle>
            <DialogDescription>Client info will be synced to Stripe automatically.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />{error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Company (who bills this client)</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 col-span-2">
                <Label>Client / Business Name *</Label>
                <Input placeholder="Acme Corp" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="billing@acme.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Phone</Label>
                <Input placeholder="(555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2 col-span-2">
                <Label>Address</Label>
                <Input placeholder="123 Main St" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>City</Label>
                <Input placeholder="New York" value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-2">
                  <Label>State</Label>
                  <Input placeholder="NY" maxLength={2} value={state} onChange={e => setState(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>ZIP</Label>
                  <Input placeholder="10001" value={zip} onChange={e => setZip(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-2 col-span-2">
                <Label>Notes (optional)</Label>
                <Textarea placeholder="Internal notes about this client" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>

            <Button onClick={handleCreate} disabled={isPending} className="w-full">
              {isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Creating…</> : "Add Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
