"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { encryptField, maskTin } from "@/lib/encryption"
import { writeAuditLog } from "@/lib/audit"
import { contractorSchema } from "@/lib/validations"
import type { ContractorFormData } from "@/lib/validations"

export async function createContractorAction(data: ContractorFormData) {
    const parsed = contractorSchema.safeParse(data)
    if (!parsed.success) {
        return { error: parsed.error.errors[0].message }
    }
    const v = parsed.data

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    // Encrypt TIN
    const tinMasked = maskTin(v.tin.replace(/\D/g, ""), v.tin_type)
    let tinEncrypted: string | null = null
    try {
        tinEncrypted = encryptField(v.tin.replace(/\D/g, ""))
    } catch (e) {
        console.error("Encryption failed:", e)
        return { error: "Encryption configuration error. Check FIELD_ENCRYPTION_KEY." }
    }

    // Defensive validation: ensure user is assigned to the requested companies
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "Admin") {
        if (!v.company_ids || v.company_ids.length === 0) {
            return { error: "Finance users must assign the contractor to at least one company." }
        }
        const { data: access } = await supabase
            .from("user_company_access")
            .select("company_id")
            .eq("user_id", user.id)
            .in("company_id", v.company_ids)

        if (!access || access.length !== v.company_ids.length) {
            return { error: "You are not assigned to one or more of the selected companies." }
        }
    }

    const { data: contractor, error } = await supabase
        .from("contractors")
        .insert({
            first_name: v.first_name,
            last_name: v.last_name,
            business_name: v.business_name || null,
            email: v.email,
            phone: v.phone,
            address_line1: v.address_line1,
            address_line2: v.address_line2 || null,
            address_city: v.address_city,
            address_state: v.address_state,
            address_zip: v.address_zip,
            tin_type: v.tin_type,
            tin_masked: tinMasked,
            tin_encrypted: tinEncrypted,
            notes: v.notes || null,
            created_by: user.id,
            updated_by: user.id,
        })
        .select()
        .single()

    if (error) return { error: error.code === '42501' ? 'Access Denied: RLS violation' : error.message }

    // Link to companies
    if (v.company_ids && v.company_ids.length > 0) {
        await supabase.from("contractor_company_links").insert(
            v.company_ids.map((cid) => ({
                contractor_id: contractor.id,
                company_id: cid,
            }))
        )
    }

    await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email ?? null,
        action: "CREATE_CONTRACTOR",
        entityType: "Contractor",
        entityId: contractor.id,
        meta: { name: `${v.first_name} ${v.last_name}` },
    })

    revalidatePath("/contractors")
    return { success: true, id: contractor.id }
}

export async function uploadW9Action(contractorId: string, formData: FormData) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const file = formData.get("file") as File | null
    if (!file) return { error: "No file provided" }
    if (file.type !== "application/pdf") return { error: "Only PDF files accepted" }
    if (file.size > 10 * 1024 * 1024) return { error: "File must be under 10 MB" }

    const path = `w9/${contractorId}/${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true, contentType: "application/pdf" })

    if (uploadError) return { error: uploadError.message }

    await supabase
        .from("contractors")
        .update({ w9_file_path: path, updated_by: user.id })
        .eq("id", contractorId)

    await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email ?? null,
        action: "UPLOAD_W9",
        entityType: "Contractor",
        entityId: contractorId,
    })

    revalidatePath(`/contractors/${contractorId}`)
    return { success: true, path }
}

export async function getW9SignedUrlAction(filePath: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 60 * 60) // 1 hour
    if (error) return { error: error.message }
    return { url: data.signedUrl }
}
