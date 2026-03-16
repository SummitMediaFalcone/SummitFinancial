import { AppShell } from "@/components/app-shell"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProductsClient } from "./client"

export const metadata = { title: "Products & Services — Summit Financial OS" }

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <AppShell userEmail={user.email}>
      <ProductsClient />
    </AppShell>
  )
}
