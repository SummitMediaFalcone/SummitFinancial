import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

export function formatAddress(addr: {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
}): string {
  const parts = [addr.line1]
  if (addr.line2) parts.push(addr.line2)
  parts.push(`${addr.city}, ${addr.state} ${addr.zip}`)
  return parts.join(", ")
}

export function numberToWords(num: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ]
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ]

  if (num === 0) return "Zero and 00/100 Dollars"

  function convert(n: number): string {
    if (n < 20) return ones[n]
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "")
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 !== 0 ? " " + convert(n % 100) : "")
      )
    if (n < 1_000_000)
      return (
        convert(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 !== 0 ? " " + convert(n % 1000) : "")
      )
    return (
      convert(Math.floor(n / 1_000_000)) +
      " Million" +
      (n % 1_000_000 !== 0 ? " " + convert(n % 1_000_000) : "")
    )
  }

  const dollars = Math.floor(num / 100)
  const cents = num % 100
  return (
    convert(dollars) + " and " + cents.toString().padStart(2, "0") + "/100 Dollars"
  )
}

export function getContractorDisplayName(c: {
  business_name?: string | null
  first_name: string
  last_name: string
}): string {
  return c.business_name || `${c.first_name} ${c.last_name}`
}
