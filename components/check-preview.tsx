"use client"

import { formatAddress, formatCents, numberToWords } from "@/lib/utils"

interface CheckAddress {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
}

interface CheckCompany {
  name: string
  address: CheckAddress
  printOffsetX?: number
  printOffsetY?: number
}

interface CheckContractor {
  firstName: string
  lastName: string
  businessName?: string
  address?: CheckAddress
}

interface CheckPreviewProps {
  company: CheckCompany
  contractor: CheckContractor
  amountCents: number
  memo: string
  checkNumber: number | null
  date: string
  offsetX?: number
  offsetY?: number
}

export function CheckPreview({
  company,
  contractor,
  amountCents,
  memo,
  checkNumber,
  date,
  offsetX,
  offsetY,
}: CheckPreviewProps) {
  const ox = offsetX ?? company.printOffsetX ?? 0
  const oy = offsetY ?? company.printOffsetY ?? 0
  const payeeName =
    contractor.businessName ||
    `${contractor.firstName} ${contractor.lastName}`

  return (
    <div className="check-print-wrapper rounded-lg border-2 border-dashed border-border bg-card p-2 print:border-none print:p-0">
      <div
        id="check-body"
        className="relative mx-auto bg-white border border-border rounded-md print:rounded-none print:border-none print:shadow-none"
        style={{
          width: "100%",
          maxWidth: 680,
          aspectRatio: "8.5/3.67",
          padding: "16px 24px",
          transform: `translate(${ox}px, ${oy}px)`,
          fontFamily: "Georgia, serif",
          color: "#000",
        }}
      >
        {/* Company info top-left */}
        <div className="absolute left-6 top-4">
          <p className="text-xs font-semibold" style={{ color: "#000" }}>
            {company.name}
          </p>
          <p className="text-[10px] leading-tight" style={{ color: "#222" }}>
            {company.address.line1}
          </p>
          {company.address.line2 && (
            <p className="text-[10px] leading-tight" style={{ color: "#222" }}>
              {company.address.line2}
            </p>
          )}
          <p className="text-[10px] leading-tight" style={{ color: "#222" }}>
            {company.address.city}, {company.address.state}{" "}
            {company.address.zip}
          </p>
        </div>

        {/* Check number top-right */}
        <div className="absolute right-6 top-4">
          <p className="text-sm font-mono font-bold" style={{ color: "#000" }}>
            {checkNumber ? `#${checkNumber}` : "DRAFT"}
          </p>
        </div>

        {/* Date */}
        <div className="absolute right-6 top-14">
          <p className="text-[10px]" style={{ color: "#222" }}>
            Date:{" "}
            <span
              className="font-medium border-b pb-0.5 ml-1"
              style={{ color: "#000", borderColor: "#000" }}
            >
              {date}
            </span>
          </p>
        </div>

        {/* Pay to the order of */}
        <div className="absolute left-6 top-[72px] right-28">
          <p className="text-[10px] mb-0.5" style={{ color: "#555" }}>
            PAY TO THE ORDER OF
          </p>
          <p
            className="text-sm font-semibold border-b pb-0.5"
            style={{ color: "#000", borderColor: "#000" }}
          >
            {payeeName}
          </p>
        </div>

        {/* Amount box */}
        <div className="absolute right-6 top-[72px]">
          <div
            className="flex items-center rounded border px-3 py-1"
            style={{ borderColor: "#000" }}
          >
            <span className="text-xs font-mono font-bold" style={{ color: "#000" }}>
              {formatCents(amountCents)}
            </span>
          </div>
        </div>

        {/* Amount in words */}
        <div className="absolute left-6 top-[110px] right-6">
          <p
            className="text-[10px] border-b pb-0.5 truncate"
            style={{ color: "#000", borderColor: "#000" }}
          >
            {numberToWords(amountCents)}
          </p>
        </div>

        {/* Payee address (for window envelopes) */}
        {contractor.address && (
          <div className="absolute left-6 top-[134px]">
            <p className="text-[9px]" style={{ color: "#444" }}>
              {contractor.address.line1}
            </p>
            {contractor.address.line2 && (
              <p className="text-[9px]" style={{ color: "#444" }}>
                {contractor.address.line2}
              </p>
            )}
            <p className="text-[9px]" style={{ color: "#444" }}>
              {contractor.address.city}, {contractor.address.state}{" "}
              {contractor.address.zip}
            </p>
          </div>
        )}

        {/* Memo */}
        <div className="absolute left-6 bottom-[28px]">
          <p className="text-[10px]" style={{ color: "#555" }}>
            Memo:{" "}
            <span style={{ color: "#000" }} className="ml-1">
              {memo || "---"}
            </span>
          </p>
        </div>

        {/* Signature line */}
        <div className="absolute right-6 bottom-[28px]">
          <div className="w-40 border-b" style={{ borderColor: "#000" }} />
          <p className="text-[8px] text-center mt-0.5" style={{ color: "#666" }}>
            Authorized Signature
          </p>
        </div>

        {/* MICR placeholder */}
        <div className="absolute bottom-2 left-6 right-6">
          <p
            className="text-[8px] font-mono tracking-widest"
            style={{ color: "rgba(0,0,0,0.25)" }}
          >
            ⑆0000000000⑆ 000000000⑈ 0000000000⑈ (MICR placeholder — not
            for production use)
          </p>
        </div>
      </div>
    </div>
  )
}
