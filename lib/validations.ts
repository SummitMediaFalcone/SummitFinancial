// Zod validation schemas for all major forms

import { z } from "zod"

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
})

// ─── Company ─────────────────────────────────────────────────────────────────

export const companySchema = z.object({
    name: z.string().trim().min(2, "Company name is required"),
    dba: z.string().trim().optional(),
    ein: z
        .string()
        .trim()
        .regex(/^\d{2}-\d{7}$/, "EIN must be in format XX-XXXXXXX (with dash)")
        .optional()
        .or(z.literal("")),
    phone: z.string().trim().min(7, "Phone is required"),
    address_line1: z.string().trim().min(3, "Address is required"),
    address_line2: z.string().trim().optional(),
    address_city: z.string().trim().min(2, "City is required"),
    address_state: z.string().trim().min(2, "State must be exactly 2 letters").max(2),
    address_zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code (use 5 digits)"),
    bank_name: z.string().trim().optional(),
    routing_number: z
        .string()
        .trim()
        .regex(/^\d{9}$/, "Routing number must be exactly 9 digits")
        .optional()
        .or(z.literal("")),
    account_number: z.string().trim().optional(),
    check_layout_type: z.enum(["top", "3-per-page"]).default("top"),
    print_offset_x: z.coerce.number().default(0),
    print_offset_y: z.coerce.number().default(0),
})

export type CompanyFormData = z.infer<typeof companySchema>

// ─── Contractor ───────────────────────────────────────────────────────────────

export const contractorSchema = z.object({
    first_name: z.string().optional().default(""),
    last_name: z.string().optional().default(""),
    business_name: z.string().optional().default(""),
    email: z.string().email("Invalid email"),
    phone: z.string().min(7, "Phone is required"),
    address_line1: z.string().min(3, "Address is required"),
    address_line2: z.string().optional(),
    address_city: z.string().min(2, "City is required"),
    address_state: z.string().length(2, "State must be 2 letters"),
    address_zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP"),
    tin_type: z.enum(["SSN", "EIN"]),
    tin: z
        .string()
        .min(9, "TIN must be 9 digits")
        .regex(/^[\d-]+$/, "TIN must contain only digits and dashes"),
    notes: z.string().optional(),
    company_ids: z.array(z.string()).min(1, "At least one company must be selected"),
}).superRefine((data, ctx) => {
    if (data.tin_type === "SSN") {
        // Individual — must have first and last name
        if (!data.first_name || data.first_name.trim().length < 1) {
            ctx.addIssue({ code: "custom", path: ["first_name"], message: "First name is required for individuals" })
        }
        if (!data.last_name || data.last_name.trim().length < 1) {
            ctx.addIssue({ code: "custom", path: ["last_name"], message: "Last name is required for individuals" })
        }
    } else {
        // Business — must have business name
        if (!data.business_name || data.business_name.trim().length < 1) {
            ctx.addIssue({ code: "custom", path: ["business_name"], message: "Business name is required" })
        }
    }
})


export type ContractorFormData = z.infer<typeof contractorSchema>

// ─── Payment ──────────────────────────────────────────────────────────────────

export const paymentSchema = z.object({
    company_id: z.string().uuid("Select a company"),
    contractor_id: z.string().uuid("Select a contractor"),
    amount: z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid dollar amount")
        .refine((v) => parseFloat(v) > 0, "Amount must be greater than $0"),
    payment_date: z.string().min(1, "Payment date is required"),
    memo: z.string().min(1, "Memo is required").max(200),
    category: z.string().min(1, "Category is required"),
})

export type PaymentFormData = z.infer<typeof paymentSchema>

// ─── Expense ──────────────────────────────────────────────────────────────────

export const expenseSchema = z.object({
    company_id: z.string().uuid("Select a company"),
    vendor: z.string().min(1, "Vendor name is required"),
    amount: z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid dollar amount")
        .refine((v) => parseFloat(v) > 0, "Amount must be > $0"),
    expense_date: z.string().min(1, "Date is required"),
    category: z.string().min(1, "Category is required"),
    method: z.string().min(1, "Payment method is required"),
    notes: z.string().optional(),
})

export type ExpenseFormData = z.infer<typeof expenseSchema>
