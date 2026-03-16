"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { writeAuditLog } from "@/lib/audit"
import { paymentSchema } from "@/lib/validations"
import type { PaymentFormData } from "@/lib/validations"

export async function createPaymentAction(data: PaymentFormData) {
    const parsed = paymentSchema.safeParse(data)
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

    const { data: payment, error } = await supabase
        .from("payments")
        .insert({
            company_id: v.company_id,
            contractor_id: v.contractor_id,
            amount_cents: amountCents,
            payment_date: v.payment_date,
            method: (v as any).method ?? "CHECK",
            status: "DRAFT",
            memo: v.memo,
            category: v.category,
            created_by: user.id,
            updated_by: user.id,
        })
        .select()
        .single()

    if (error) return { error: error.code === '42501' ? 'Access Denied: RLS violation' : error.message }

    await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email ?? null,
        action: "CREATE_PAYMENT",
        entityType: "Payment",
        entityId: payment.id,
        companyId: v.company_id,
        meta: {
            amount_cents: amountCents,
            contractor_id: v.contractor_id,
        },
    })

    revalidatePath("/payments")
    revalidatePath("/dashboard")
    return { success: true, id: payment.id }
}

/**
 * Atomically assign the next check number and set status to PRINTED.
 * Uses a Postgres function to prevent race conditions.
 */
export async function printCheckAction(paymentId: string, companyId: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    // Call the atomic DB function to get next check number
    const { data: checkNum, error: fnError } = await supabase.rpc(
        "get_next_check_number",
        { p_company_id: companyId }
    )
    if (fnError) return { error: fnError.message }

    const { data: payment, error } = await supabase
        .from("payments")
        .update({
            status: "PRINTED",
            check_number: checkNum,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId)
        .eq("status", "DRAFT") // Prevent double-print
        .select()
        .single()

    if (error) return { error: error.message }
    if (!payment) return { error: "Payment not found or already printed" }

    await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email ?? null,
        action: "PRINT_CHECK",
        entityType: "Payment",
        entityId: paymentId,
        companyId,
        meta: { check_number: String(checkNum) },
    })

    revalidatePath("/payments")
    return { success: true, checkNumber: checkNum }
}

export async function voidPaymentAction(paymentId: string, companyId: string, reason: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const { error } = await supabase
        .from("payments")
        .update({
            status: "VOID",
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId)
        .in("status", ["DRAFT", "PRINTED"])

    if (error) return { error: error.message }

    await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email ?? null,
        action: "VOID_PAYMENT",
        entityType: "Payment",
        entityId: paymentId,
        companyId,
        meta: { reason },
    })

    revalidatePath("/payments")
    return { success: true }
}

export async function clearPaymentAction(paymentId: string, companyId: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const { error } = await supabase
        .from("payments")
        .update({
            status: "CLEARED",
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId)
        .eq("status", "PRINTED")

    if (error) return { error: error.message }

    await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email ?? null,
        action: "CLEAR_PAYMENT",
        entityType: "Payment",
        entityId: paymentId,
        companyId,
    })

    revalidatePath("/payments")
    return { success: true }
}

export async function deletePaymentAction(paymentId: string, companyId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    // Only allow deleting DRAFT or VOID payments
    const { data: payment } = await supabase
        .from("payments")
        .select("status")
        .eq("id", paymentId)
        .single()

    if (!payment) return { error: "Payment not found" }
    if (payment.status === "PRINTED" || payment.status === "CLEARED") {
        return { error: "Cannot delete a printed or cleared payment. Void it first." }
    }

    const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId)

    if (error) return { error: error.message }

    await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email ?? null,
        action: "DELETE_PAYMENT",
        entityType: "Payment",
        entityId: paymentId,
        companyId,
        meta: { status: payment.status },
    })

    revalidatePath("/payments")
    revalidatePath("/dashboard")
    return { success: true }
}
