import type {
  Company,
  Contractor,
  ContractorCompanyLink,
  Payment,
  Expense,
  AuditLog,
} from "./types"

export const companies: Company[] = [
  {
    id: "comp-1",
    name: "Summit Holdings LLC",
    dba: "Summit Group",
    einMasked: "**-***7890",
    address: { line1: "100 Summit Blvd", city: "Denver", state: "CO", zip: "80202" },
    phone: "(303) 555-0100",
    bankName: "First National Bank",
    routingMasked: "****1234",
    accountMasked: "****5678",
    checkStartNumber: 1001,
    checkLayoutType: "top",
    printOffsetX: 0,
    printOffsetY: 0,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "comp-2",
    name: "Alpine Construction Inc",
    einMasked: "**-***4321",
    address: { line1: "250 Mountain View Dr", city: "Boulder", state: "CO", zip: "80301" },
    phone: "(303) 555-0200",
    bankName: "Rocky Mountain Credit Union",
    routingMasked: "****9876",
    accountMasked: "****4321",
    checkStartNumber: 5001,
    checkLayoutType: "top",
    printOffsetX: 0,
    printOffsetY: 0,
    createdAt: "2024-02-01T10:00:00Z",
  },
  {
    id: "comp-3",
    name: "Peak Consulting Group",
    dba: "Peak Advisory",
    einMasked: "**-***5555",
    address: { line1: "400 Tech Center Dr", line2: "Suite 300", city: "Colorado Springs", state: "CO", zip: "80903" },
    phone: "(719) 555-0300",
    bankName: "Wells Fargo",
    routingMasked: "****6789",
    accountMasked: "****1111",
    checkStartNumber: 2001,
    checkLayoutType: "3-per-page",
    printOffsetX: 2,
    printOffsetY: -1,
    createdAt: "2024-03-10T10:00:00Z",
  },
  {
    id: "comp-4",
    name: "Crestline Property Management",
    einMasked: "**-***8888",
    address: { line1: "75 Lakeshore Drive", city: "Fort Collins", state: "CO", zip: "80524" },
    phone: "(970) 555-0400",
    bankName: "Chase Bank",
    routingMasked: "****3333",
    accountMasked: "****7777",
    checkStartNumber: 3001,
    checkLayoutType: "top",
    printOffsetX: 0,
    printOffsetY: 0,
    createdAt: "2024-04-20T10:00:00Z",
  },
]

export const contractors: Contractor[] = [
  {
    id: "con-1",
    firstName: "Maria",
    lastName: "Rodriguez",
    businessName: "Rodriguez Electric LLC",
    email: "maria@rodriguezelectric.com",
    phone: "(303) 555-1001",
    address: { line1: "123 Spark St", city: "Denver", state: "CO", zip: "80203" },
    tinType: "EIN",
    tinMasked: "**-***1234",
    w9FileUrl: "/uploads/w9-con-1.pdf",
    createdAt: "2024-01-20T10:00:00Z",
  },
  {
    id: "con-2",
    firstName: "James",
    lastName: "Chen",
    email: "james.chen@email.com",
    phone: "(303) 555-1002",
    address: { line1: "456 Oak Ave", city: "Boulder", state: "CO", zip: "80302" },
    tinType: "SSN",
    tinMasked: "***-**-4567",
    w9FileUrl: "/uploads/w9-con-2.pdf",
    createdAt: "2024-02-05T10:00:00Z",
  },
  {
    id: "con-3",
    firstName: "Sarah",
    lastName: "Thompson",
    businessName: "Thompson Design Studio",
    email: "sarah@thompsondesign.com",
    phone: "(719) 555-1003",
    address: { line1: "789 Creative Way", city: "Colorado Springs", state: "CO", zip: "80904" },
    tinType: "EIN",
    tinMasked: "**-***7890",
    notes: "Preferred graphic designer for all branding work",
    createdAt: "2024-02-15T10:00:00Z",
  },
  {
    id: "con-4",
    firstName: "David",
    lastName: "Nguyen",
    email: "david.nguyen@email.com",
    phone: "(970) 555-1004",
    address: { line1: "321 Pine Ln", city: "Fort Collins", state: "CO", zip: "80525" },
    tinType: "SSN",
    tinMasked: "***-**-8901",
    createdAt: "2024-03-01T10:00:00Z",
  },
  {
    id: "con-5",
    firstName: "Angela",
    lastName: "Patel",
    businessName: "Patel IT Solutions",
    email: "angela@patelit.com",
    phone: "(303) 555-1005",
    address: { line1: "654 Tech Park Blvd", city: "Denver", state: "CO", zip: "80204" },
    tinType: "EIN",
    tinMasked: "**-***2345",
    w9FileUrl: "/uploads/w9-con-5.pdf",
    createdAt: "2024-03-20T10:00:00Z",
  },
  {
    id: "con-6",
    firstName: "Robert",
    lastName: "Kim",
    email: "robert.kim@email.com",
    phone: "(303) 555-1006",
    address: { line1: "987 Elm St", city: "Denver", state: "CO", zip: "80205" },
    tinType: "SSN",
    tinMasked: "***-**-3456",
    createdAt: "2024-04-10T10:00:00Z",
  },
]

export const contractorCompanyLinks: ContractorCompanyLink[] = [
  { contractorId: "con-1", companyId: "comp-1", defaultCategory: "Electrical" },
  { contractorId: "con-1", companyId: "comp-2", defaultCategory: "Electrical" },
  { contractorId: "con-2", companyId: "comp-1", defaultCategory: "Consulting" },
  { contractorId: "con-2", companyId: "comp-3", defaultCategory: "Consulting" },
  { contractorId: "con-3", companyId: "comp-1", defaultCategory: "Design" },
  { contractorId: "con-3", companyId: "comp-3", defaultCategory: "Design" },
  { contractorId: "con-4", companyId: "comp-2", defaultCategory: "Labor" },
  { contractorId: "con-4", companyId: "comp-4", defaultCategory: "Maintenance" },
  { contractorId: "con-5", companyId: "comp-1", defaultCategory: "IT Services" },
  { contractorId: "con-5", companyId: "comp-3", defaultCategory: "IT Services" },
  { contractorId: "con-5", companyId: "comp-4", defaultCategory: "IT Services" },
  { contractorId: "con-6", companyId: "comp-4", defaultCategory: "Labor" },
]

export const payments: Payment[] = [
  {
    id: "pay-1",
    companyId: "comp-1",
    contractorId: "con-1",
    amountCents: 450000,
    paymentDate: "2026-01-15",
    method: "CHECK",
    checkNumber: 1001,
    status: "CLEARED",
    memo: "Electrical wiring - Building A",
    category: "Electrical",
    createdBy: "admin@summit.com",
    createdAt: "2026-01-14T10:00:00Z",
    updatedAt: "2026-01-20T10:00:00Z",
  },
  {
    id: "pay-2",
    companyId: "comp-1",
    contractorId: "con-2",
    amountCents: 250000,
    paymentDate: "2026-01-22",
    method: "CHECK",
    checkNumber: 1002,
    status: "CLEARED",
    memo: "January consulting",
    category: "Consulting",
    createdBy: "admin@summit.com",
    createdAt: "2026-01-21T10:00:00Z",
    updatedAt: "2026-01-28T10:00:00Z",
  },
  {
    id: "pay-3",
    companyId: "comp-2",
    contractorId: "con-1",
    amountCents: 320000,
    paymentDate: "2026-02-01",
    method: "CHECK",
    checkNumber: 5001,
    status: "PRINTED",
    memo: "Panel installation - Phase 1",
    category: "Electrical",
    createdBy: "admin@summit.com",
    createdAt: "2026-01-31T10:00:00Z",
    updatedAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "pay-4",
    companyId: "comp-3",
    contractorId: "con-3",
    amountCents: 180000,
    paymentDate: "2026-02-05",
    method: "CHECK",
    checkNumber: 2001,
    status: "CLEARED",
    memo: "Logo redesign project",
    category: "Design",
    createdBy: "finance@summit.com",
    createdAt: "2026-02-04T10:00:00Z",
    updatedAt: "2026-02-12T10:00:00Z",
  },
  {
    id: "pay-5",
    companyId: "comp-1",
    contractorId: "con-5",
    amountCents: 750000,
    paymentDate: "2026-02-10",
    method: "CHECK",
    checkNumber: 1003,
    status: "PRINTED",
    memo: "Server migration project",
    category: "IT Services",
    createdBy: "admin@summit.com",
    createdAt: "2026-02-09T10:00:00Z",
    updatedAt: "2026-02-10T10:00:00Z",
  },
  {
    id: "pay-6",
    companyId: "comp-4",
    contractorId: "con-4",
    amountCents: 125000,
    paymentDate: "2026-02-15",
    method: "CHECK",
    checkNumber: 3001,
    status: "CLEARED",
    memo: "February maintenance",
    category: "Maintenance",
    createdBy: "finance@summit.com",
    createdAt: "2026-02-14T10:00:00Z",
    updatedAt: "2026-02-22T10:00:00Z",
  },
  {
    id: "pay-7",
    companyId: "comp-1",
    contractorId: "con-3",
    amountCents: 350000,
    paymentDate: "2026-02-18",
    method: "CHECK",
    checkNumber: 1004,
    status: "DRAFT",
    memo: "Brand guidelines update",
    category: "Design",
    createdBy: "admin@summit.com",
    createdAt: "2026-02-17T10:00:00Z",
    updatedAt: "2026-02-17T10:00:00Z",
  },
  {
    id: "pay-8",
    companyId: "comp-2",
    contractorId: "con-4",
    amountCents: 280000,
    paymentDate: "2026-02-20",
    method: "CHECK",
    checkNumber: 5002,
    status: "PRINTED",
    memo: "Framing labor - Lot 7",
    category: "Labor",
    createdBy: "admin@summit.com",
    createdAt: "2026-02-19T10:00:00Z",
    updatedAt: "2026-02-20T10:00:00Z",
  },
  {
    id: "pay-9",
    companyId: "comp-4",
    contractorId: "con-6",
    amountCents: 95000,
    paymentDate: "2026-02-22",
    method: "CHECK",
    checkNumber: null,
    status: "DRAFT",
    memo: "Landscaping work",
    category: "Labor",
    createdBy: "finance@summit.com",
    createdAt: "2026-02-21T10:00:00Z",
    updatedAt: "2026-02-21T10:00:00Z",
  },
  {
    id: "pay-10",
    companyId: "comp-3",
    contractorId: "con-5",
    amountCents: 420000,
    paymentDate: "2026-02-25",
    method: "CHECK",
    checkNumber: 2002,
    status: "VOID",
    memo: "Network setup - VOIDED",
    category: "IT Services",
    createdBy: "admin@summit.com",
    createdAt: "2026-02-24T10:00:00Z",
    updatedAt: "2026-02-25T10:00:00Z",
  },
]

export const expenses: Expense[] = [
  {
    id: "exp-1",
    companyId: "comp-1",
    vendor: "Office Depot",
    amountCents: 34599,
    expenseDate: "2026-01-10",
    category: "Office Supplies",
    method: "Credit Card",
    receiptUrl: "/uploads/receipt-exp-1.pdf",
    createdAt: "2026-01-10T10:00:00Z",
  },
  {
    id: "exp-2",
    companyId: "comp-1",
    vendor: "Comcast Business",
    amountCents: 18999,
    expenseDate: "2026-01-15",
    category: "Utilities",
    method: "ACH",
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "exp-3",
    companyId: "comp-2",
    vendor: "Home Depot",
    amountCents: 287543,
    expenseDate: "2026-01-20",
    category: "Materials",
    method: "Credit Card",
    receiptUrl: "/uploads/receipt-exp-3.pdf",
    createdAt: "2026-01-20T10:00:00Z",
  },
  {
    id: "exp-4",
    companyId: "comp-3",
    vendor: "Adobe Creative Cloud",
    amountCents: 5499,
    expenseDate: "2026-02-01",
    category: "Software",
    method: "Credit Card",
    createdAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "exp-5",
    companyId: "comp-4",
    vendor: "Xcel Energy",
    amountCents: 42375,
    expenseDate: "2026-02-05",
    category: "Utilities",
    method: "ACH",
    createdAt: "2026-02-05T10:00:00Z",
  },
  {
    id: "exp-6",
    companyId: "comp-1",
    vendor: "FedEx",
    amountCents: 8750,
    expenseDate: "2026-02-12",
    category: "Shipping",
    method: "Credit Card",
    receiptUrl: "/uploads/receipt-exp-6.pdf",
    createdAt: "2026-02-12T10:00:00Z",
  },
]

export const auditLogs: AuditLog[] = [
  {
    id: "log-1",
    actor: "admin@summit.com",
    action: "CREATE_PAYMENT",
    entityType: "Payment",
    entityId: "pay-1",
    meta: { amount: "$4,500.00", contractor: "Maria Rodriguez" },
    createdAt: "2026-01-14T10:00:00Z",
  },
  {
    id: "log-2",
    actor: "admin@summit.com",
    action: "PRINT_CHECK",
    entityType: "Payment",
    entityId: "pay-1",
    meta: { checkNumber: "1001" },
    createdAt: "2026-01-15T08:00:00Z",
  },
  {
    id: "log-3",
    actor: "finance@summit.com",
    action: "MARK_CLEARED",
    entityType: "Payment",
    entityId: "pay-1",
    meta: { checkNumber: "1001" },
    createdAt: "2026-01-20T10:00:00Z",
  },
  {
    id: "log-4",
    actor: "admin@summit.com",
    action: "VOID_PAYMENT",
    entityType: "Payment",
    entityId: "pay-10",
    meta: { reason: "Duplicate payment" },
    createdAt: "2026-02-25T10:00:00Z",
  },
  {
    id: "log-5",
    actor: "admin@summit.com",
    action: "ADD_CONTRACTOR",
    entityType: "Contractor",
    entityId: "con-6",
    meta: { name: "Robert Kim" },
    createdAt: "2026-04-10T10:00:00Z",
  },
]

// Helper functions
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

export function formatAddress(addr: { line1: string; line2?: string; city: string; state: string; zip: string }): string {
  const parts = [addr.line1]
  if (addr.line2) parts.push(addr.line2)
  parts.push(`${addr.city}, ${addr.state} ${addr.zip}`)
  return parts.join(", ")
}

export function getCompanyById(id: string): Company | undefined {
  return companies.find((c) => c.id === id)
}

export function getContractorById(id: string): Contractor | undefined {
  return contractors.find((c) => c.id === id)
}

export function getContractorName(c: Contractor): string {
  return c.businessName || `${c.firstName} ${c.lastName}`
}

export function getPaymentsForCompany(companyId: string): Payment[] {
  return payments.filter((p) => p.companyId === companyId)
}

export function getPaymentsForContractor(contractorId: string): Payment[] {
  return payments.filter((p) => p.contractorId === contractorId)
}

export function getExpensesForCompany(companyId: string): Expense[] {
  return expenses.filter((e) => e.companyId === companyId)
}

export function getLinkedCompanies(contractorId: string): string[] {
  return contractorCompanyLinks
    .filter((l) => l.contractorId === contractorId)
    .map((l) => l.companyId)
}

export function getLinkedContractors(companyId: string): string[] {
  return contractorCompanyLinks
    .filter((l) => l.companyId === companyId)
    .map((l) => l.contractorId)
}

export function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
  
  if (num === 0) return "Zero"
  
  function convert(n: number): string {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "")
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convert(n % 100) : "")
    if (n < 1000000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "")
    return convert(Math.floor(n / 1000000)) + " Million" + (n % 1000000 !== 0 ? " " + convert(n % 1000000) : "")
  }
  
  const dollars = Math.floor(num / 100)
  const cents = num % 100
  return convert(dollars) + " and " + cents.toString().padStart(2, "0") + "/100 Dollars"
}
