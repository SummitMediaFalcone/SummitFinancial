import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, billing_clients(name, email), subscription_plans(name, amount_cents, billing_interval)")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
