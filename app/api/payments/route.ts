import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("payments")
        .select(`
            id, company_id, contractor_id, amount_cents, payment_date,
            status, memo, category, check_number, created_at,
            contractors (first_name, last_name, business_name),
            companies (name)
        `)
        .order("payment_date", { ascending: false })
        .limit(500)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
