import { AppShell } from "@/components/app-shell"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BillingDashboard } from "./client"

export const metadata = { title: "Billing — Summit Financial OS" }

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <AppShell userEmail={user.email}>
      <BillingDashboard />
    </AppShell>
  )
}
