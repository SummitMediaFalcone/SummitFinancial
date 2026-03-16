import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("billing_products")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
