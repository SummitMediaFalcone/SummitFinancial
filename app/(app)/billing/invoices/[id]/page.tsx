import { AppShell } from "@/components/app-shell"
import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { InvoiceDetailClient } from "./client"

export const metadata = { title: "Invoice Detail — Summit Financial OS" }

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, billing_clients(*), companies(*), invoice_items(*)")
    .eq("id", id)
    .single()

  if (!invoice) notFound()

  return (
    <AppShell userEmail={user.email}>
      <InvoiceDetailClient invoice={invoice as any} />
    </AppShell>
  )
}
