"use client"

import { useState } from "react"
import { FileX2, Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { getCompanyBankInfoAction } from "@/app/actions/bank"
import type { CompanyBankInfo } from "@/app/actions/bank"

interface VoidedCheckButtonProps {
  company: {
    id: string
    name: string
    dba: string | null
    address_line1: string
    address_line2: string | null
    address_city: string
    address_state: string
    address_zip: string
  }
}

function printVoidedCheck(company: VoidedCheckButtonProps["company"], bankInfo: CompanyBankInfo | null) {
  const existing = document.getElementById("check-print-frame")
  if (existing) existing.remove()

  const iframe = document.createElement("iframe")
  iframe.id = "check-print-frame"
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;"
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) return

  const routing = bankInfo?.routing?.replace(/\D/g, "") ?? null
  const account = bankInfo?.account?.replace(/\D/g, "") ?? null
  const micrLine = routing && account
    ? `⑆${routing}⑆  ⑈${account}⑈  00000000⑈`
    : "⑆ ROUTING NOT CONFIGURED ⑆  ⑈ ACCOUNT NOT CONFIGURED ⑈"

  const displayName = company.dba ? `${company.name} (DBA: ${company.dba})` : company.name

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: letter portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 8.5in; height: 11in;
      font-family: Arial, Helvetica, sans-serif;
      background: white; color: #000;
    }

    /* Instruction block at top */
    .instruction {
      padding: 0.4in 0.5in 0.25in;
      font-size: 9pt; color: #555;
      border-bottom: 1px dashed #ccc;
    }
    .instruction strong { color: #000; font-size: 10pt; }

    /* Check slot — 3.67in tall (Intuit/ANSI standard) */
    .check-slot {
      position: relative;
      width: 8.5in; height: 3.67in;
      overflow: hidden;
    }

    /* ── Check body ── */
    .check-body {
      position: relative; width: 100%; height: 100%;
      background: white;
    }

    .co-name {
      position: absolute; left: 0.17in; top: 0.17in;
      font-size: 12pt; font-weight: 700;
    }
    .co-addr {
      position: absolute; left: 0.17in; top: 0.38in;
      font-size: 9pt; line-height: 1.45; color: #111;
    }
    .check-num {
      position: absolute; right: 0.17in; top: 0.17in;
      font-size: 12pt; font-family: monospace; font-weight: 700;
    }
    .date-label {
      position: absolute; right: 0.17in; top: 0.88in;
      font-size: 9pt; color: #333;
    }
    .payto-label {
      position: absolute; left: 0.17in; top: 0.9in;
      font-size: 7.5pt; color: #444; text-transform: uppercase;
    }
    .payto-name {
      position: absolute; left: 0.17in; top: 1.06in; right: 1.7in;
      font-size: 13pt; font-weight: 700;
      border-bottom: 1px solid #000; padding-bottom: 2px;
    }
    .amount-box {
      position: absolute; right: 0.17in; top: 1.03in;
      border: 1.5px solid #000; padding: 3px 10px;
      font-size: 12pt; font-family: monospace; font-weight: 700;
      min-width: 1.4in; text-align: right;
    }
    .words-line {
      position: absolute; left: 0.17in; top: 1.33in; right: 0.17in;
      font-size: 10pt; border-bottom: 1px solid #000; padding-bottom: 2px;
    }
    .sig-line {
      position: absolute; right: 0.17in; bottom: 0.78in;
      width: 2.3in; border-bottom: 1.5px solid #000;
    }
    .sig-label {
      position: absolute; right: 0.17in; bottom: 0.6in;
      width: 2.3in; font-size: 7pt; text-align: center; color: #666;
    }
    .micr {
      position: absolute; bottom: 0.25in; left: 0.17in; right: 0.17in;
      font-size: 10pt; font-family: 'Courier New', monospace;
      letter-spacing: 3px; color: #000; font-weight: 700;
    }
    .bank-info {
      position: absolute; left: 0.17in; bottom: 0.72in;
      font-size: 8pt; color: #555;
    }

    /* ── VOID watermark — big red diagonal text ── */
    .void-watermark {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex; align-items: center; justify-content: center;
      pointer-events: none;
      z-index: 10;
    }
    .void-text {
      font-size: 120pt;
      font-weight: 900;
      font-family: Arial, sans-serif;
      color: rgba(220, 30, 30, 0.18);
      letter-spacing: 0.1em;
      transform: rotate(-30deg);
      user-select: none;
      line-height: 1;
    }

    /* Separator between check slots */
    .perf { border-top: 1px dashed #999; }

    /* Record stub below */
    .stub-slot {
      width: 8.5in; height: 3.67in;
      padding: 0.25in 0.3in;
      border-top: 1px dashed #aaa;
    }
    .stub-title {
      font-size: 9pt; font-weight: 700; color: #333;
      margin-bottom: 10px; padding-bottom: 6px;
      border-bottom: 1px solid #ddd;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .stub-row {
      display: flex; justify-content: space-between;
      border-bottom: 1px solid #f0f0f0; padding: 5px 0;
    }
    .stub-label { color: #888; font-size: 8pt; text-transform: uppercase; }
    .stub-val { font-weight: 700; color: #000; font-size: 9.5pt; }
  </style>
</head>
<body>
  <div class="instruction">
    <strong>VOIDED CHECK</strong> — For bank account verification purposes only.
    Do not use for payment. Provide this to your bank, payroll provider, or ACH partner.
    ${bankInfo ? `<br>Bank: ${bankInfo.bankName} · Account: ${bankInfo.accountName}` : ""}
  </div>

  <!-- Check slot -->
  <div class="check-slot">
    <div class="check-body">
      <!-- Company info -->
      <div class="co-name">${displayName}</div>
      <div class="co-addr">
        <div>${company.address_line1}</div>
        ${company.address_line2 ? `<div>${company.address_line2}</div>` : ""}
        <div>${company.address_city}, ${company.address_state} ${company.address_zip}</div>
        ${bankInfo ? `<div style="margin-top:2px;color:#555">${bankInfo.bankName}</div>` : ""}
      </div>

      <!-- Check number (VOID) -->
      <div class="check-num">VOID</div>

      <!-- Date -->
      <div class="date-label">Date: <span style="border-bottom:1px solid #000;margin-left:4px;font-weight:700">VOID</span></div>

      <!-- Pay to -->
      <div class="payto-label">PAY TO THE ORDER OF</div>
      <div class="payto-name">VOID</div>

      <!-- Amount -->
      <div class="amount-box">$0.00</div>
      <div class="words-line">VOID</div>

      <!-- Bank info / Memo -->
      <div class="bank-info">
        ${bankInfo ? `Bank: ${bankInfo.bankName}` : "Bank account not configured"}
      </div>

      <!-- Signature -->
      <div class="sig-line"></div>
      <div class="sig-label">Authorized Signature</div>

      <!-- MICR line with real routing/account -->
      <div class="micr">${micrLine}</div>

      <!-- VOID watermark -->
      <div class="void-watermark">
        <div class="void-text">VOID</div>
      </div>
    </div>
  </div>

  <!-- Record stub -->
  <div class="stub-slot">
    <div class="stub-title">Voided Check Record</div>
    <div class="stub-row">
      <span class="stub-label">Company</span>
      <span class="stub-val">${displayName}</span>
    </div>
    ${bankInfo ? `
    <div class="stub-row">
      <span class="stub-label">Bank</span>
      <span class="stub-val">${bankInfo.bankName}</span>
    </div>
    <div class="stub-row">
      <span class="stub-label">Account</span>
      <span class="stub-val">${bankInfo.accountName}</span>
    </div>
    <div class="stub-row">
      <span class="stub-label">Routing #</span>
      <span class="stub-val">${routing}</span>
    </div>
    <div class="stub-row">
      <span class="stub-label">Account #</span>
      <span class="stub-val">${account}</span>
    </div>
    ` : `
    <div class="stub-row">
      <span class="stub-label">Note</span>
      <span class="stub-val" style="color:#e00">No bank account configured</span>
    </div>
    `}
    <div class="stub-row">
      <span class="stub-label">Purpose</span>
      <span class="stub-val">Bank / ACH / Payroll Verification</span>
    </div>
    <div class="stub-row">
      <span class="stub-label">Printed</span>
      <span class="stub-val">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
    </div>
  </div>
</body>
</html>`

  doc.open()
  doc.write(html)
  doc.close()

  iframe.contentWindow?.focus()
  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => iframe.remove(), 3000)
  }, 500)
}

export function VoidedCheckButton({ company }: VoidedCheckButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bankInfo, setBankInfo] = useState<CompanyBankInfo | null | "unloaded">("unloaded")

  async function handleOpen() {
    setOpen(true)
    if (bankInfo === "unloaded") {
      setLoading(true)
      try {
        const info = await getCompanyBankInfoAction(company.id)
        setBankInfo(info)
      } catch {
        setBankInfo(null)
      } finally {
        setLoading(false)
      }
    }
  }

  function handlePrint() {
    printVoidedCheck(company, bankInfo === "unloaded" ? null : bankInfo)
  }

  const resolved = bankInfo === "unloaded" ? null : bankInfo

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={e => { e.preventDefault(); e.stopPropagation(); handleOpen() }}
      >
        <FileX2 className="size-3.5" />
        Voided Check
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileX2 className="size-5 text-red-500" />
              Voided Check — {company.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {loading ? (
              <div className="flex items-center gap-3 rounded-xl border border-border p-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading bank account info…</span>
              </div>
            ) : resolved ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-4 flex flex-col gap-1">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">✓ Bank account found</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">{resolved.bankName} · {resolved.accountName}</p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-600 font-mono mt-1">
                  Routing: {resolved.routing} · Account: {resolved.account}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">⚠ No bank account configured</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  The voided check will print without routing/account numbers.
                  Add a bank account in Settings → Bank Accounts first.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground flex flex-col gap-1.5">
              <p className="font-semibold text-foreground text-sm">What prints:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Full check with company name + address</li>
                <li>Large <strong className="text-red-500">VOID</strong> watermark across the face</li>
                <li>Real routing + account numbers in MICR line</li>
                <li>Record stub with bank details below</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handlePrint} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
                <Printer className="mr-2 size-4" />
                Print Voided Check
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
