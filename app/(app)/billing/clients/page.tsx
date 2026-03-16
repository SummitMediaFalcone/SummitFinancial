import { AppShell } from "@/components/app-shell"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ClientsClient } from "./client"

export const metadata = { title: "Billing Clients — Summit Financial OS" }

export default async function BillingClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <AppShell userEmail={user.email}>
      <ClientsClient />
    </AppShell>
  )
}
