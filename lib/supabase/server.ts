import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "./database.types"

export async function createClient() {
    // Call cookies() first to force Next.js to opt this route into dynamic rendering 
    // before evaluating environment variables during the static build phase.
    const cookieStore = await cookies()

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL

    // DEV MODE overrides anon key with service role key strictly on the server
    const isDev = process.env.DEV_SERVICE_ROLE === "true"
    const key = isDev
        ? process.env.SUPABASE_SERVICE_ROLE_KEY
        : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        throw new Error(
            "Missing Supabase env vars. Copy .env.example → .env.local and fill them in."
        )
    }
    return createServerClient<Database>(url, key, {
        cookies: {
            getAll() {
                return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                } catch {
                    // Server component — cookies can't be set, middleware handles refresh
                }
            },
        },
    })
}

export async function createServiceClient() {
    // Call cookies() first to force Next.js to opt this route into dynamic rendering 
    const cookieStore = await cookies()

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
        throw new Error(
            "Missing Supabase env vars for service client. " +
            "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
        )
    }

    return createServerClient<Database>(url, serviceKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll()
            },
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
