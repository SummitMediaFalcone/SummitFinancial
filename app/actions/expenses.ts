"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { writeAuditLog } from "@/lib/audit"
import { expenseSchema } from "@/lib/validations"
import type { ExpenseFormData } from "@/lib/validations"

export async function createExpenseAction(data: ExpenseFormData) {
    const parsed = expenseSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.errors[0].message }
    const v = parsed.data

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const amountCents = Math.round(parseFloat(v.amount) * 100)

    // Defensive validation
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "Admin") {
        const { data: access } = await supabase
            .from("user_company_access")
            .select("company_id")
            .eq("user_id", user.id)
            .eq("company_id", v.company_id)
            .single()

        if (!access) {
            return { error: "You are not assigned to this company." }
        }
    }

    const { data: expense, error } = await supabase
        .from("expenses")
        .insert({
            company_id: v.company_id,
            vendor: v.vendor,
            amount_cents: amountCents,
            expense_date: v.expense_date,
            category: v.category,
            method: v.method,
            notes: v.notes || null,
            created_by: user.id,
        })
        .select()
        .single()

    if (error) return { error: error.code === '42501' ? 'Access Denied: RLS violation' : error.message }

    await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email ?? null,
        action: "CREATE_EXPENSE",
        entityType: "Expense",
        entityId: expense.id,
        companyId: v.company_id,
        meta: { vendor: v.vendor, amount_cents: amountCents },
    })

    revalidatePath("/expenses")
    return { success: true, id: expense.id }
}

export async function uploadReceiptAction(expenseId: string, formData: FormData) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const file = formData.get("file") as File | null
    if (!file) return { error: "No file provided" }

    const isValidType = ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
        file.type
    )
    if (!isValidType) return { error: "Only PDF or image files accepted" }
    if (file.size > 10 * 1024 * 1024) return { error: "File must be under 10 MB" }

    const ext = file.name.split(".").pop() || "pdf"
    const path = `receipts/${expenseId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) return { error: uploadError.message }

    await supabase
        .from("expenses")
        .update({ receipt_file_path: path })
        .eq("id", expenseId)

    await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email ?? null,
        action: "UPLOAD_RECEIPT",
        entityType: "Expense",
        entityId: expenseId,
    })

    revalidatePath("/expenses")
    return { success: true, path }
}

export async function getReceiptSignedUrlAction(filePath: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 3600)
    if (error) return { error: error.message }
    return { url: data.signedUrl }
}
