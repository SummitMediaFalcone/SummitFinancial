"use client"

import { useState } from "react"
import { Printer, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckPreview } from "@/components/check-preview"
import { formatCents } from "@/lib/utils"
import { getCompanyBankInfoAction } from "@/app/actions/bank"
import type { CompanyBankInfo } from "@/app/actions/bank"

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
    check_layout_type?: string | null
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

// ── Inline amount-to-words (no server dep) ──────────────────
function amountInWords(cents: number): string {
  const dollars = Math.floor(cents / 100)
  const centsRem = cents % 100
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
  function say(n: number): string {
    if (n === 0) return ""
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "")
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + say(n % 100) : "")
  }
  function sayLarge(n: number): string {
    if (n === 0) return "Zero"
    let result = ""
    if (Math.floor(n / 1000000) > 0) { result += say(Math.floor(n / 1000000)) + " Million "; n %= 1000000 }
    if (Math.floor(n / 1000) > 0) { result += say(Math.floor(n / 1000)) + " Thousand "; n %= 1000 }
    if (n > 0) result += say(n)
    return result.trim()
  }
  return `${sayLarge(dollars)} and ${centsRem.toString().padStart(2, "0")}/100 Dollars`
}

// ── Build MICR line ─────────────────────────────────────────
// Standard MICR format: ⑆routing⑆ ⑈accountNumber⑈ checkNumber
function buildMicr(routing: string | null, account: string | null, checkNum: number | null): string {
  if (!routing || !account) {
    return "⑆ ROUTING NOT CONFIGURED ⑆  ⑈ ACCOUNT NOT CONFIGURED ⑈"
  }
  const r = routing.replace(/\D/g, "")
  const a = account.replace(/\D/g, "")
  const c = checkNum ? String(checkNum).padStart(8, "0") : "00000000"
  return `⑆${r}⑆  ⑈${a}⑈  ${c}⑈`
}

// ── Build one check HTML block ──────────────────────────────
function buildCheckBlock(
  payment: ReprintCheckButtonProps["payment"],
  company: ReprintCheckButtonProps["company"],
  contractor: ReprintCheckButtonProps["contractor"],
  bankInfo: CompanyBankInfo | null,
  ox: number,
  oy: number
): string {
  const payeeName = contractor.business_name || `${contractor.first_name} ${contractor.last_name}`
  const micrLine = buildMicr(bankInfo?.routing ?? null, bankInfo?.account ?? null, payment.check_number)
  const dollars = `$${(payment.amount_cents / 100).toFixed(2)}`
  const words = amountInWords(payment.amount_cents)

  return `
    <div class="check-body" style="transform:translate(${ox}px,${oy}px)">
      <div class="co-name">${company.name}</div>
      <div class="co-addr">
        <div>${company.address_line1}</div>
        ${company.address_line2 ? `<div>${company.address_line2}</div>` : ""}
        <div>${company.address_city}, ${company.address_state} ${company.address_zip}</div>
        ${bankInfo ? `<div style="margin-top:2px;color:#555">${bankInfo.bankName}</div>` : ""}
      </div>
      <div class="check-num">${payment.check_number ? `#${payment.check_number}` : "DRAFT"}</div>
      <div class="date-label">Date: <span class="date-val">${payment.payment_date}</span></div>
      <div class="payto-label">PAY TO THE ORDER OF</div>
      <div class="payto-name">${payeeName}</div>
      <div class="amount-box">${dollars}</div>
      <div class="words-line">${words}</div>
      <div class="payee-addr">
        <div>${contractor.address_line1}</div>
        ${contractor.address_line2 ? `<div>${contractor.address_line2}</div>` : ""}
        <div>${contractor.address_city}, ${contractor.address_state} ${contractor.address_zip}</div>
      </div>
      <div class="memo">Memo: <span class="memo-val">${payment.memo || "---"}</span></div>
      <div class="sig-line"></div>
      <div class="sig-label">Authorized Signature</div>
      <div class="micr">${micrLine}</div>
    </div>
  `
}

// ── Build a stub HTML block ─────────────────────────────────
function buildStubBlock(
  payment: ReprintCheckButtonProps["payment"],
  company: ReprintCheckButtonProps["company"],
  contractor: ReprintCheckButtonProps["contractor"]
): string {
  const payeeName = contractor.business_name || `${contractor.first_name} ${contractor.last_name}`
  const dollars = `$${(payment.amount_cents / 100).toFixed(2)}`

  return `
    <div class="stub-body">
      <div class="stub-row">
        <span class="stub-label">Check #</span>
        <span class="stub-val">${payment.check_number ? `#${payment.check_number}` : "DRAFT"}</span>
      </div>
      <div class="stub-row">
        <span class="stub-label">Date</span>
        <span class="stub-val">${payment.payment_date}</span>
      </div>
      <div class="stub-row">
        <span class="stub-label">Pay To</span>
        <span class="stub-val">${payeeName}</span>
      </div>
      <div class="stub-row">
        <span class="stub-label">Amount</span>
        <span class="stub-val" style="font-weight:700">${dollars}</span>
      </div>
      <div class="stub-row">
        <span class="stub-label">Memo</span>
        <span class="stub-val">${payment.memo || "---"}</span>
      </div>
      <div class="stub-row">
        <span class="stub-label">Company</span>
        <span class="stub-val">${company.name}</span>
      </div>
    </div>
  `
}

// ── Shared CSS for check elements ───────────────────────────
// ── QuickBooks / Intuit ANSI Laser Check Standard CSS ───────
// Each slot: 3.67in tall (11in ÷ 3). MICR within 0.375in of bottom.
// Field positions match Intuit Standard 3-per-page check layout.
const SHARED_CHECK_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: white; font-family: Arial, Helvetica, sans-serif; color: #000; }
  div { line-height: 1.2; }

  /* ── Check body (fills the 3.67in slot) ─────────────────── */
  .check-body {
    position: relative;
    width: 100%; height: 100%;
    background: white;
  }

  /* Company name — 0.17in from top, bold 12pt */
  .co-name {
    position: absolute; left: 0.17in; top: 0.17in;
    font-size: 12pt; font-weight: 700;
  }

  /* Company address — 0.33in from top, 9pt */
  .co-addr {
    position: absolute; left: 0.17in; top: 0.36in;
    font-size: 9pt; line-height: 1.45; color: #111;
  }

  /* Check number — top right */
  .check-num {
    position: absolute; right: 0.17in; top: 0.17in;
    font-size: 12pt; font-family: monospace; font-weight: 700;
  }

  /* Date label — right side, 0.88in from top */
  .date-label {
    position: absolute; right: 0.17in; top: 0.88in;
    font-size: 9pt; color: #333;
  }
  .date-val {
    font-weight: 700; border-bottom: 1px solid #000; margin-left: 4px;
  }

  /* "PAY TO THE ORDER OF" — left, 0.88in from top */
  .payto-label {
    position: absolute; left: 0.17in; top: 0.9in;
    font-size: 7.5pt; color: #444;
    text-transform: uppercase; letter-spacing: 0.05em;
  }

  /* Payee name — 1.06in from top, large underlined */
  .payto-name {
    position: absolute; left: 0.17in; top: 1.06in; right: 1.7in;
    font-size: 13pt; font-weight: 700;
    border-bottom: 1px solid #000; padding-bottom: 2px;
  }

  /* Amount box — right, 1.06in from top */
  .amount-box {
    position: absolute; right: 0.17in; top: 1.03in;
    border: 1.5px solid #000; padding: 3px 10px;
    font-size: 12pt; font-family: monospace; font-weight: 700;
    min-width: 1.4in; text-align: right;
  }

  /* Amount in words — 1.33in from top, full width underlined */
  .words-line {
    position: absolute; left: 0.17in; top: 1.33in; right: 0.17in;
    font-size: 10pt; border-bottom: 1px solid #000; padding-bottom: 2px;
    white-space: nowrap; overflow: hidden;
  }

  /* Payee address (window envelope) — 1.57in from top */
  .payee-addr {
    position: absolute; left: 0.17in; top: 1.57in;
    font-size: 9pt; line-height: 1.45; color: #222;
  }

  /* Memo — left, 0.72in from bottom of slot = 2.95in from top */
  .memo {
    position: absolute; left: 0.17in; bottom: 0.72in;
    font-size: 9pt; color: #333;
  }
  .memo-val { color: #000; margin-left: 5px; font-weight: 600; }

  /* Signature line — right, 0.78in from bottom */
  .sig-line {
    position: absolute; right: 0.17in; bottom: 0.78in;
    width: 2.3in; border-bottom: 1.5px solid #000;
  }
  /* "Authorized Signature" — right, 0.6in from bottom */
  .sig-label {
    position: absolute; right: 0.17in; bottom: 0.6in;
    width: 2.3in; font-size: 7pt; text-align: center; color: #666;
    letter-spacing: 0.03em;
  }

  /* MICR line — within 0.375in of bottom (ANSI standard) */
  .micr {
    position: absolute; bottom: 0.25in; left: 0.17in; right: 0.17in;
    font-size: 10pt; font-family: 'Courier New', monospace;
    letter-spacing: 3px; color: #000; font-weight: 700;
  }

  /* ── Stub (same slot height, record copy) ─────────────── */
  .stub-body {
    width: 100%; height: 100%;
    background: white; padding: 0.2in 0.25in;
    border-top: 1px dashed #aaa;
  }
  .stub-title {
    font-size: 8pt; font-weight: 700; color: #666;
    margin-bottom: 8px; padding-bottom: 4px;
    border-bottom: 1px solid #ddd;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .stub-row {
    display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 1px solid #f0f0f0; padding: 4px 0;
  }
  .stub-row:last-child { border-bottom: none; }
  .stub-label {
    color: #888; font-size: 8pt;
    text-transform: uppercase; letter-spacing: 0.04em;
    min-width: 1in;
  }
  .stub-val { font-weight: 700; color: #000; font-size: 9.5pt; text-align: right; }
`


// ── Inject iframe and print ─────────────────────────────────
function printViaIframe(bodyHTML: string, pageCSS: string) {
  const existing = document.getElementById("check-print-frame")
  if (existing) existing.remove()

  const iframe = document.createElement("iframe")
  iframe.id = "check-print-frame"
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;"
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) return

  doc.open()
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${SHARED_CHECK_CSS}${pageCSS}</style></head><body>${bodyHTML}</body></html>`)
  doc.close()

  iframe.contentWindow?.focus()
  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => iframe.remove(), 3000)
  }, 500)
}

// ── Main component ──────────────────────────────────────────
export function ReprintCheckButton({ payment, company, contractor }: ReprintCheckButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  if (payment.status === "VOID") return null

  const layoutType = company.check_layout_type ?? "top"
  const payeeName = contractor.business_name || `${contractor.first_name} ${contractor.last_name}`

  async function handlePrint() {
    setLoading(true)
    let bankInfo: CompanyBankInfo | null = null
    try {
      bankInfo = await getCompanyBankInfoAction(company.id)
    } catch (e) {
      console.error("Could not fetch bank info:", e)
    }
    setLoading(false)

    const ox = company.print_offset_x || 0
    const oy = company.print_offset_y || 0

    if (layoutType === "3-per-page") {
      // QuickBooks/Intuit standard: portrait 8.5×11, 3 slots of 3.67in each
      const pageCSS = `
        @page { size: letter portrait; margin: 0; }
        body { width: 8.5in; height: 11in; position: relative; overflow: hidden; }
        .slot { position: absolute; left: 0; width: 8.5in; height: 3.67in; overflow: hidden; }
        .slot-1 { top: 0in; }
        .slot-2 { top: 3.67in; }
        .slot-3 { top: 7.34in; }
      `
      const bodyHTML = `
        <div style="position:relative;width:8.5in;height:11in;">
          <div class="slot slot-1">
            ${buildCheckBlock(payment, company, contractor, bankInfo, ox, oy)}
          </div>
          <div class="slot slot-2">
            ${buildStubBlock(payment, company, contractor)}
          </div>
          <div class="slot slot-3">
            ${buildStubBlock(payment, company, contractor)}
          </div>
        </div>
      `
      printViaIframe(bodyHTML, pageCSS)
    } else {
      // Single landscape check
      const pageCSS = `
        @page { size: letter landscape; margin: 0; }
        body { width: 11in; height: 8.5in; padding: 0.5in; }
        .check-body { position: relative; width: 9in; height: 3.8in; }
      `
      const bodyHTML = buildCheckBlock(payment, company, contractor, bankInfo, ox, oy)
      printViaIframe(bodyHTML, pageCSS)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary"
        onClick={() => setOpen(true)}
      >
        <Printer className="size-3" />
        {payment.check_number ? "Reprint" : "Print"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <DialogTitle className="text-foreground">
                {payment.check_number ? `Check #${payment.check_number}` : "Draft Check"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {payeeName} · {formatCents(payment.amount_cents)} · {payment.payment_date}
                {" · "}{layoutType === "3-per-page" ? "3-per-page portrait" : "Single check landscape"}
              </p>
            </div>
            <Button onClick={handlePrint} disabled={loading} className="shrink-0">
              {loading
                ? <><Loader2 className="mr-2 size-4 animate-spin" /> Loading…</>
                : <><Printer className="mr-2 size-4" /> Print Check</>}
            </Button>
          </div>

          {/* Preview */}
          <div className="bg-muted/30 p-6 overflow-auto">
            <div className="mx-auto" style={{ maxWidth: 760 }}>
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
            </div>
            {layoutType === "3-per-page" && (
              <p className="text-center text-xs text-muted-foreground mt-3">
                Prints <strong>check on top</strong> + <strong>2 stubs below</strong> on 3-per-page laser check stock
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card">
            <p className="text-xs text-muted-foreground">
              Bank account numbers are fetched at print time · Layout: <strong>{layoutType === "3-per-page" ? "3-per-page" : "Single"}</strong>
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
              <Button size="sm" onClick={handlePrint} disabled={loading}>
                {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Printer className="mr-2 size-4" />}
                Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
