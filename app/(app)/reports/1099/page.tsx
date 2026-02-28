import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Report1099Client } from "./client"

export const dynamic = 'force-dynamic'

export default async function Report1099Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Fetch companies accessible to this user (RLS enforced)
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name")

  return <Report1099Client companies={companies ?? []} />
}
