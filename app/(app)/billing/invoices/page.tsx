import { AppShell } from "@/components/app-shell"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { InvoicesClient } from "./client"

export const metadata = { title: "Invoices — Summit Financial OS" }

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <AppShell userEmail={user.email}>
      <InvoicesClient />
    </AppShell>
  )
}
