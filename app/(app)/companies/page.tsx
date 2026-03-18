import Link from "next/link"
import { Building2, MapPin, Phone, CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { NewCompanyDialog } from "./new-company-dialog"
import { VoidedCheckButton } from "@/components/voided-check-button"

function formatAddress(line1: string, line2: string | null, city: string, state: string, zip: string) {
  const street = line2 ? `${line1} ${line2}` : line1
  return `${street}, ${city}, ${state} ${zip}`
}

export default async function CompaniesPage() {
  const supabase = await createClient()

  const { data: companies, error } = await supabase
    .from("companies")
    .select(`
      *,
      contractor_company_links (count),
      payments (count)
    `)
    .order("name")

  if (error) {
    console.error("Failed to load companies", error)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Companies</h2>
          <p className="text-sm text-muted-foreground">Manage your entities and their settings</p>
        </div>
        <NewCompanyDialog />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {companies?.map((company) => {
          const contractorCount = company.contractor_company_links[0]?.count ?? 0
          const paymentCount = company.payments[0]?.count ?? 0

          return (
            <div key={company.id} className="relative group">
              <Link href={`/companies/${company.id}`}>
                <Card className="transition-colors hover:bg-accent/50 cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-start gap-4 pb-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="size-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base text-foreground">{company.name}</CardTitle>
                      {company.dba && (
                        <p className="text-xs text-muted-foreground">DBA: {company.dba}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      EIN: {company.ein_masked}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" />
                      <span>{formatAddress(company.address_line1, company.address_line2, company.address_city, company.address_state, company.address_zip)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="size-3.5 shrink-0" />
                      <span>{company.phone}</span>
                    </div>
                    {company.bank_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CreditCard className="size-3.5 shrink-0" />
                        <span>{company.bank_name} &middot; Acct: {company.account_masked}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{contractorCount} contractors</span>
                        <span>{paymentCount} payments</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* Voided Check button — outside Link so it doesn't navigate */}
              <div className="absolute bottom-4 right-4">
                <VoidedCheckButton
                  company={{
                    id: company.id,
                    name: company.name,
                    dba: company.dba,
                    address_line1: company.address_line1,
                    address_line2: company.address_line2,
                    address_city: company.address_city,
                    address_state: company.address_state,
                    address_zip: company.address_zip,
                  }}
                />
              </div>
            </div>
          )
        })}
        {companies?.length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center py-12 text-muted-foreground">
            No companies found. Add one to get started!
          </div>
        )}
      </div>
    </div>
  )
}
