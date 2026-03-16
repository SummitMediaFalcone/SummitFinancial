"use client"

import { useEffect, useState } from "react"
import { Plus, Star, Trash2, Building2, CreditCard, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useCompany } from "@/lib/company-context"
import {
  createBankAccountAction,
  setDefaultBankAccountAction,
  deleteBankAccountAction,
} from "@/app/actions/bank-accounts"

interface BankAccount {
  id: string
  company_id: string
  account_name: string
  bank_name: string
  routing_number_masked: string
  account_number_masked: string
  account_type: string
  is_default: boolean
}

export function BankAccountsManager() {
  const { selectedCompanyId, selectedCompanyName, companies } = useCompany()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [accountName, setAccountName] = useState("")
  const [bankName, setBankName] = useState("")
  const [routing, setRouting] = useState("")
  const [accountNum, setAccountNum] = useState("")
  const [accountType, setAccountType] = useState<"checking" | "savings">("checking")
  const [isDefault, setIsDefault] = useState(false)
  const [targetCompanyId, setTargetCompanyId] = useState<string>("")

  const companyId = selectedCompanyId ?? targetCompanyId ?? companies[0]?.id ?? ""

  async function load(cid: string) {
    setLoading(true)
    const res = await fetch(`/api/bank-accounts?company_id=${cid}`)
    const data = await res.json()
    if (Array.isArray(data)) setAccounts(data)
    setLoading(false)
  }

  useEffect(() => {
    if (companyId) load(companyId)
  }, [companyId])

  function resetForm() {
    setAccountName(""); setBankName(""); setRouting("")
    setAccountNum(""); setAccountType("checking"); setIsDefault(false)
    setError(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) { setError("Select a company first"); return }
    setSaving(true); setError(null)

    const result = await createBankAccountAction({
      company_id: companyId,
      account_name: accountName,
      bank_name: bankName,
      routing_number: routing,
      account_number: accountNum,
      account_type: accountType,
      is_default: isDefault || accounts.length === 0,
    })

    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      setOpen(false)
      resetForm()
      load(companyId)
      setSaving(false)
    }
  }

  async function handleSetDefault(id: string) {
    await setDefaultBankAccountAction(id, companyId)
    load(companyId)
  }

  async function handleDelete(id: string) {
    await deleteBankAccountAction(id)
    load(companyId)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Bank Accounts</CardTitle>
            <CardDescription>
              Manage bank accounts for{" "}
              <span className="font-medium text-foreground">{selectedCompanyName ?? "your companies"}</span>.
              The <span className="font-semibold">default</span> account prints on checks.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 size-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Bank Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="flex flex-col gap-4 mt-2">
                {companies.length > 1 && !selectedCompanyId && (
                  <div className="flex flex-col gap-2">
                    <Label>Company *</Label>
                    <Select value={targetCompanyId} onValueChange={setTargetCompanyId} required>
                      <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
                      <SelectContent>
                        {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label>Account Nickname *</Label>
                  <Input
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder='e.g. "Operating Account", "Payroll", "Telecom"'
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Bank Name *</Label>
                  <Input
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="Chase, Wells Fargo, Bank of America…"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Routing Number *</Label>
                    <Input
                      value={routing}
                      onChange={e => setRouting(e.target.value.replace(/\D/g, ""))}
                      placeholder="9 digits"
                      maxLength={9}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Account Number *</Label>
                    <Input
                      value={accountNum}
                      onChange={e => setAccountNum(e.target.value.replace(/\D/g, ""))}
                      placeholder="Account #"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Account Type</Label>
                  <Select value={accountType} onValueChange={(v: "checking" | "savings") => setAccountType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault || accounts.length === 0}
                    onChange={e => setIsDefault(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Set as default account (used on checks)</span>
                </label>

                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="size-3 shrink-0" />
                  Routing and account numbers are stored encrypted at rest.
                </p>

                {error && (
                  <p className="text-sm text-destructive font-semibold">{error}</p>
                )}

                <Button type="submit" disabled={saving}>
                  {saving ? "Adding…" : "Add Bank Account"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col divide-y divide-border">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-56 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <CreditCard className="size-8 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No bank accounts added yet.</p>
            <p className="text-xs mt-1">Add one to enable check printing.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center gap-4 px-6 py-4">
                {/* Icon */}
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="size-5 text-primary" />
                </div>

                {/* Details */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{acc.account_name}</span>
                    {acc.is_default && (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        <Star className="mr-1 size-2.5 fill-current" />
                        Default
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">{acc.account_type}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {acc.bank_name} · Routing {acc.routing_number_masked} · Acct {acc.account_number_masked}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!acc.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(acc.id)}
                      className="text-xs h-7"
                    >
                      <Star className="mr-1 size-3" />
                      Set Default
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{acc.account_name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove this bank account. It won't affect any existing checks.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(acc.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
