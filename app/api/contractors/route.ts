import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("contractors")
        .select(`
            id, first_name, last_name, business_name, email, phone,
            tin_type, tin_masked, w9_file_path, notes,
            contractor_company_links (
                company_id,
                companies (name)
            ),
            payments (amount_cents, status)
        `)
        .order("first_name")

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
