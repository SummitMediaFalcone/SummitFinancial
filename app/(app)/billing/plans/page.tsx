import { AppShell } from "@/components/app-shell"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PlansClient } from "./client"

export const metadata = { title: "Subscription Plans — Summit Financial OS" }

export default async function PlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <AppShell userEmail={user.email}>
      <PlansClient />
    </AppShell>
  )
}
