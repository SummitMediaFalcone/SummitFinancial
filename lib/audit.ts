import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/database.types"

type AuditAction =
    | "CREATE_PAYMENT"
    | "PRINT_CHECK"
    | "VOID_PAYMENT"
    | "CLEAR_PAYMENT"
    | "CREATE_CONTRACTOR"
    | "UPDATE_CONTRACTOR"
    | "CREATE_COMPANY"
    | "UPDATE_COMPANY"
    | "CREATE_EXPENSE"
    | "UPLOAD_W9"
    | "UPLOAD_RECEIPT"
    | "EXPORT_1099"

interface WriteAuditLogParams {
    actorId: string | null
    actorEmail: string | null
    action: AuditAction
    entityType: string
    entityId: string
    companyId?: string | null
    meta?: Record<string, unknown>
}

/**
 * Write an audit log entry via the service role (bypasses RLS).
 * Call this from Server Actions after mutating data.
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
    try {
        const supabase = await createClient()
        const { error } = await supabase.from("audit_logs").insert({
            actor_id: params.actorId ?? undefined,
            actor_email: params.actorEmail ?? undefined,
            action: params.action,
            entity_type: params.entityType,
            entity_id: params.entityId,
            company_id: params.companyId ?? undefined,
            meta: params.meta as Json | undefined,
        })
        if (error) {
            console.error("[audit_log] Failed to write audit log:", error.message)
        }
    } catch (err) {
        console.error("[audit_log] Exception writing audit log:", err)
    }
}
