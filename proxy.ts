import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_PATHS = ["/login"]
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

export async function proxy(request: NextRequest) {
    // Demo mode: skip auth entirely, let every request through
    if (IS_DEMO) {
        return NextResponse.next({ request })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // If env vars aren't set yet (local dev before .env.local is configured),
    // allow all routes through so the login page renders with a clear message.
    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                )
                supabaseResponse = NextResponse.next({ request })
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                )
            },
        },
    })

    // IMPORTANT: Do not write logic between createServerClient and getUser().
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

    if (!user && !isPublic) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = "/login"
        return NextResponse.redirect(loginUrl)
    }

    if (user && pathname === "/login") {
        const dashboardUrl = request.nextUrl.clone()
        dashboardUrl.pathname = "/dashboard"
        return NextResponse.redirect(dashboardUrl)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}
