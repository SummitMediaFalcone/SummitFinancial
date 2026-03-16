import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ContractorDetailClient } from "./contractor-detail-client"

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: contractor, error } = await supabase
    .from("contractors")
    .select(`
      *,
      contractor_company_links (
        companies (id, name, dba)
      ),
      payments (
        id, amount_cents, payment_date, check_number, status, memo, category,
        companies (
          id, name, address_line1, address_line2, address_city,
          address_state, address_zip, print_offset_x, print_offset_y, check_layout_type
        )
      )
    `)
    .eq("id", id)
    .single()

  if (error || !contractor) notFound()

  return <ContractorDetailClient contractor={contractor as any} />
}
