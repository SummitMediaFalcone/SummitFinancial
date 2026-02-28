export interface Company {
  id: string
  name: string
  dba?: string
  einMasked: string
  address: Address
  phone: string
  bankName?: string
  routingMasked?: string
  accountMasked?: string
  checkStartNumber: number
  checkLayoutType: "top" | "3-per-page"
  printOffsetX: number
  printOffsetY: number
  createdAt: string
}

export interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
}

export interface Contractor {
  id: string
  firstName: string
  lastName: string
  businessName?: string
  email: string
  phone: string
  address: Address
  tinType: "SSN" | "EIN"
  tinMasked: string
  w9FileUrl?: string
  notes?: string
  createdAt: string
}

export interface ContractorCompanyLink {
  contractorId: string
  companyId: string
  defaultMemo?: string
  defaultCategory?: string
}

export type PaymentStatus = "DRAFT" | "PRINTED" | "VOID" | "CLEARED"

export interface Payment {
  id: string
  companyId: string
  contractorId: string
  amountCents: number
  paymentDate: string
  method: "CHECK"
  checkNumber: number | null
  status: PaymentStatus
  memo: string
  category: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Expense {
  id: string
  companyId: string
  vendor: string
  amountCents: number
  expenseDate: string
  category: string
  method: string
  receiptUrl?: string
  notes?: string
  createdAt: string
}

export interface AuditLog {
  id: string
  actor: string
  action: string
  entityType: string
  entityId: string
  meta?: Record<string, string>
  createdAt: string
}

export type UserRole = "Admin" | "Finance" | "Viewer"
