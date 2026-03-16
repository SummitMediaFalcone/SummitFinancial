import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "./database.types"

/**
 * Server client — ALWAYS uses service role key.
 * This is an in-house tool, so we bypass RLS entirely.
 */
export async function createClient() {
    const cookieStore = await cookies()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!url || !key) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    }

    return createServerClient<Database>(url, key, {
        cookies: {
            getAll() { return cookieStore.getAll() },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                } catch { }
            },
        },
    })
}

// Alias — same thing, kept for backward compat with any imports
export const createServiceClient = createClient
