import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ContractorsClient } from "./client"

export default async function ContractorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return <ContractorsClient />
}
