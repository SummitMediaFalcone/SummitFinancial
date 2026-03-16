import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const companyId = new URL(req.url).searchParams.get("company_id")

  let q = supabase
    .from("company_bank_accounts")
    .select("id, company_id, account_name, bank_name, routing_number_masked, account_number_masked, account_type, is_default, created_at")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })

  if (companyId) q = q.eq("company_id", companyId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
