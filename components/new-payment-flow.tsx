"use client"

import { useEffect, useState, useTransition } from "react"
import { Check, ChevronRight, Printer, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckPreview } from "@/components/check-preview"

import { createPaymentAction, printCheckAction } from "@/app/actions/payments"
import type { Database } from "@/lib/supabase/database.types"

type Company = Database["public"]["Tables"]["companies"]["Row"]
type Contractor = Database["public"]["Tables"]["contractors"]["Row"]
type Link = Database["public"]["Tables"]["contractor_company_links"]["Row"]

interface NewPaymentFlowProps {
  onComplete: () => void
}

const CATEGORY_SUGGESTIONS = [
  "AT&T Telecom Commission",
  "Consulting",
  "Design",
  "Electrical",
  "IT Services",
  "Labor",
  "Maintenance",
  "Marketing Services",
  "Materials",
  "Telecom Sales",
  "Website Retainer",
  "Other",
]

export function NewPaymentFlow({ onComplete }: NewPaymentFlowProps) {
  const [step, setStep] = useState(1)
  const [companyId, setCompanyId] = useState("")
  const [contractorId, setContractorId] = useState("")
  const [amount, setAmount] = useState("")
  const [memo, setMemo] = useState("")
  const [category, setCategory] = useState("")
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Data from Supabase
  const [companies, setCompanies] = useState<Company[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [links, setLinks] = useState<Link[]>([])

  // Created payment & check number after print
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [checkNumber, setCheckNumber] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const [compsRes, consRes] = await Promise.all([
        fetch("/api/companies").then((r) => r.json()),
        fetch("/api/contractors").then((r) => r.json()),
      ])
      if (Array.isArray(compsRes)) setCompanies(compsRes)
      if (Array.isArray(consRes)) {
        setContractors(consRes)
        // Build links from the nested contractor data
        const lnks: Link[] = []
        for (const c of consRes) {
          for (const l of (c.contractor_company_links ?? [])) {
            lnks.push({ contractor_id: c.id, company_id: l.company_id } as Link)
          }
        }
        setLinks(lnks)
      }
    }
    load()
  }, [])

  const company = companies.find((c) => c.id === companyId) ?? null
  const contractor = contractors.find((c) => c.id === contractorId) ?? null
  const amountCents = Math.round(parseFloat(amount || "0") * 100)

  const availableContractors = companyId
    ? contractors.filter((c) =>
      links.some((l) => l.company_id === companyId && l.contractor_id === c.id)
    )
    : contractors

  const steps = [
    { num: 1, label: "Company" },
    { num: 2, label: "Contractor" },
    { num: 3, label: "Details" },
    { num: 4, label: "Preview" },
    { num: 5, label: "Done" },
  ]

  function getContractorName(c: Contractor) {
    return c.business_name || `${c.first_name} ${c.last_name}`
  }

  function handleCreateAndPreview() {
    setError(null)
    startTransition(async () => {
      const result = await createPaymentAction({
        company_id: companyId,
        contractor_id: contractorId,
        amount,
        payment_date: paymentDate,
        memo,
        category,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      setPaymentId(result.id!)
      setStep(4)
    })
  }

  function handlePrint() {
    if (!paymentId || !companyId) return
    setError(null)
    startTransition(async () => {
      const result = await printCheckAction(paymentId, companyId)
      if (result.error) {
        setError(result.error)
        return
      }
      setCheckNumber(result.checkNumber!)
      // Trigger browser print dialog
      window.print()
      setStep(5)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex size-7 items-center justify-center rounded-full text-xs font-medium ${step > s.num
                ? "bg-primary text-primary-foreground"
                : step === s.num
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
                }`}
            >
              {step > s.num ? <Check className="size-3.5" /> : s.num}
            </div>
            <span
              className={`text-xs hidden sm:inline ${step >= s.num ? "text-foreground" : "text-muted-foreground"
                }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight className="size-3 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Company */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <Label>Select Company</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a company…" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!companyId}>
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Contractor */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <Label>Select Contractor</Label>
          <Select value={contractorId} onValueChange={setContractorId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a contractor…" />
            </SelectTrigger>
            <SelectContent>
              {availableContractors.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {getContractorName(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {contractor && !contractor.w9_file_path && (
            <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning-foreground">
              <AlertCircle className="size-3.5 shrink-0" />
              W-9 not on file for this contractor. A 1099 may still be required.
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={!contractorId}>
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-input">Category / Purpose</Label>
            <Input
              id="category-input"
              list="category-suggestions"
              placeholder="Type anything, e.g. AT&T Telecom Commission…"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              autoComplete="off"
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Memo</Label>
            <Textarea
              placeholder="Payment description…"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button
              onClick={handleCreateAndPreview}
              disabled={!amount || amountCents === 0 || !category || !memo || isPending}
            >
              {isPending ? (
                <><Loader2 className="mr-2 size-4 animate-spin" />Saving…</>
              ) : (
                <>Preview Check <ChevronRight className="ml-1 size-4" /></>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Check Preview */}
      {step === 4 && company && contractor && (
        <div className="flex flex-col gap-4">
          <CheckPreview
            company={{
              name: company.name,
              address: {
                line1: company.address_line1,
                line2: company.address_line2 ?? undefined,
                city: company.address_city,
                state: company.address_state,
                zip: company.address_zip,
              },
              printOffsetX: company.print_offset_x,
              printOffsetY: company.print_offset_y,
            }}
            contractor={{
              firstName: contractor.first_name,
              lastName: contractor.last_name,
              businessName: contractor.business_name ?? undefined,
              address: {
                line1: contractor.address_line1,
                line2: contractor.address_line2 ?? undefined,
                city: contractor.address_city,
                state: contractor.address_state,
                zip: contractor.address_zip,
              },
            }}
            amountCents={amountCents}
            memo={memo}
            checkNumber={null}
            date={paymentDate}
          />
          <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 p-3">
            <AlertCircle className="size-4 shrink-0 text-warning-foreground" />
            <span className="text-xs text-warning-foreground">
              MICR line is a placeholder only. This check preview is not intended for
              production use without proper MICR encoding.
            </span>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
            <Button onClick={handlePrint} disabled={isPending}>
              {isPending ? (
                <><Loader2 className="mr-2 size-4 animate-spin" />Processing…</>
              ) : (
                <><Printer className="mr-2 size-4" />Print Check</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Done */}
      {step === 5 && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="size-8 text-emerald-500" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">Check Printed</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Check #{checkNumber} has been recorded and marked as printed.
              <br />
              Payment of{" "}
              <span className="font-medium text-foreground">
                ${(amountCents / 100).toFixed(2)}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {contractor ? getContractorName(contractor) : ""}
              </span>
            </p>
          </div>
          <Button onClick={onComplete}>Done</Button>
        </div>
      )}
    </div>
  )
}
