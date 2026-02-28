"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { encryptField, maskBankNumber } from "@/lib/encryption"
import { writeAuditLog } from "@/lib/audit"
import { companySchema } from "@/lib/validations"
import type { CompanyFormData } from "@/lib/validations"

export async function createCompanyAction(data: CompanyFormData) {
    const parsed = companySchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.errors[0].message }
    const v = parsed.data

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    // Encrypt sensitive numbers
    let routingEncrypted: string | null = null
    let accountEncrypted: string | null = null
    let einEncrypted: string | null = null

    try {
        if (v.routing_number) {
            routingEncrypted = encryptField(v.routing_number)
        }
        if (v.account_number) {
            accountEncrypted = encryptField(v.account_number)
        }
        if (v.ein) {
            einEncrypted = encryptField(v.ein.replace(/\D/g, ""))
        }
    } catch {
        return { error: "Encryption configuration error. Check FIELD_ENCRYPTION_KEY." }
    }

    const { data: company, error } = await supabase
        .from("companies")
        .insert({
            name: v.name,
            dba: v.dba || null,
            ein_masked: v.ein ? `**-***${v.ein.replace(/\D/g, "").slice(-4)}` : "**-*****",
            ein_encrypted: einEncrypted,
            address_line1: v.address_line1,
            address_line2: v.address_line2 || null,
            address_city: v.address_city,
            address_state: v.address_state,
            address_zip: v.address_zip,
            phone: v.phone,
            bank_name: v.bank_name || null,
            routing_masked: v.routing_number ? maskBankNumber(v.routing_number) : null,
            routing_encrypted: routingEncrypted,
            account_masked: v.account_number ? maskBankNumber(v.account_number) : null,
            account_encrypted: accountEncrypted,
            check_layout_type: v.check_layout_type,
            print_offset_x: v.print_offset_x,
            print_offset_y: v.print_offset_y,
            created_by: user.id,
            updated_by: user.id,
        })
        .select()
        .single()

    if (error) return { error: error.message }

    // Grant the creating user access
    await supabase.from("user_company_access").insert({
        user_id: user.id,
        company_id: company.id,
    })

    await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email ?? null,
        action: "CREATE_COMPANY",
        entityType: "Company",
        entityId: company.id,
        companyId: company.id,
        meta: { name: v.name },
    })

    revalidatePath("/companies")
    return { success: true, id: company.id }
}

export async function updateCompanySettingsAction(
    companyId: string,
    data: Partial<CompanyFormData>
) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const updates: Record<string, unknown> = {
        updated_by: user.id,
        updated_at: new Date().toISOString(),
    }

    if (data.check_layout_type) updates.check_layout_type = data.check_layout_type
    if (data.print_offset_x !== undefined) updates.print_offset_x = data.print_offset_x
    if (data.print_offset_y !== undefined) updates.print_offset_y = data.print_offset_y
    if (data.bank_name !== undefined) updates.bank_name = data.bank_name

    try {
        if (data.routing_number) {
            updates.routing_encrypted = encryptField(data.routing_number)
            updates.routing_masked = maskBankNumber(data.routing_number)
        }
        if (data.account_number) {
            updates.account_encrypted = encryptField(data.account_number)
            updates.account_masked = maskBankNumber(data.account_number)
        }
    } catch {
        return { error: "Encryption error" }
    }

    const { error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", companyId)

    if (error) return { error: error.message }

    await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email ?? null,
        action: "UPDATE_COMPANY",
        entityType: "Company",
        entityId: companyId,
        companyId,
    })

    revalidatePath("/companies")
    revalidatePath(`/companies/${companyId}`)
    return { success: true }
}
