"use client"

import { useState } from "react"
import { Printer, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckPreview } from "@/components/check-preview"
import { formatCents } from "@/lib/utils"

interface ReprintCheckButtonProps {
  payment: {
    id: string
    check_number: number | null
    amount_cents: number
    payment_date: string
    memo: string
    status: string
  }
  company: {
    id: string
    name: string
    address_line1: string
    address_line2: string | null
    address_city: string
    address_state: string
    address_zip: string
    print_offset_x: number
    print_offset_y: number
  }
  contractor: {
    first_name: string
    last_name: string
    business_name: string | null
    address_line1: string
    address_line2: string | null
    address_city: string
    address_state: string
    address_zip: string
  }
}

export function ReprintCheckButton({ payment, company, contractor }: ReprintCheckButtonProps) {
  const [open, setOpen] = useState(false)

  if (payment.status === "VOID") return null

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <Printer className="size-3" />
        {payment.check_number ? "Reprint" : "Print"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl w-full sm:max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                Check #{payment.check_number ?? "DRAFT"} — {formatCents(payment.amount_cents)}
              </DialogTitle>
            </div>
          </DialogHeader>

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
            amountCents={payment.amount_cents}
            memo={payment.memo}
            checkNumber={payment.check_number}
            date={payment.payment_date}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 size-4" />
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
