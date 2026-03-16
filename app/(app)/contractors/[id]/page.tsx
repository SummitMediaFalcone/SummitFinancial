import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, MapPin, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"
import { formatCents, getContractorDisplayName } from "@/lib/utils"
import { ReprintCheckButton } from "./reprint-check-button"

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PRINTED: "bg-primary/10 text-primary",
  VOID: "bg-destructive/10 text-destructive",
  CLEARED: "bg-success/10 text-success",
}

function formatAddress(line1: string, line2: string | null, city: string, state: string, zip: string) {
  const street = line2 ? `${line1} ${line2}` : line1
  return `${street}, ${city}, ${state} ${zip}`
}

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch contractor with companies and payments
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
          address_state, address_zip, print_offset_x, print_offset_y
        )
      )
    `)
    .eq("id", id)
    .order("payment_date", { referencedTable: "payments", ascending: false })
    .single()

  if (error || !contractor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Contractor not found or access denied</p>
        <Button variant="ghost" asChild className="mt-4">
          <Link href="/contractors">
            <ArrowLeft className="mr-2 size-4" />
            Back to Contractors
          </Link>
        </Button>
      </div>
    )
  }

  const linkedCompanies = contractor.contractor_company_links
    .map((l: any) => l.companies)
    .filter(Boolean)

  const allPayments = contractor.payments || []
  const totalPaid = allPayments
    .filter((p: any) => p.status !== "VOID")
    .reduce((s: number, p: any) => s + p.amount_cents, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contractors">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {getContractorDisplayName({
              first_name: contractor.first_name,
              last_name: contractor.last_name,
              business_name: contractor.business_name,
            })}
          </h2>
          {contractor.business_name && (
            <p className="text-sm text-muted-foreground">
              {contractor.first_name} {contractor.last_name}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-foreground">Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4 shrink-0" />
              <a href={`mailto:${contractor.email}`} className="hover:underline">
                {contractor.email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-4 shrink-0" />
              {contractor.phone}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              {formatAddress(
                contractor.address_line1,
                contractor.address_line2,
                contractor.address_city,
                contractor.address_state,
                contractor.address_zip
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tax Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-foreground">Tax Information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">TIN Type</span>
              <Badge variant="outline">{contractor.tin_type}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">TIN</span>
              <span className="font-mono text-sm text-foreground">{contractor.tin_masked}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">W-9 Status</span>
              {contractor.w9_file_path ? (
                <Badge variant="secondary" className="bg-success/10 text-success">
                  <FileText className="mr-1 size-3" />
                  On file
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-warning/10 text-warning-foreground">
                  Missing
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" className="mt-2" disabled>
              W-9 System Coming Soon
            </Button>
          </CardContent>
        </Card>

        {/* Linked Companies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-foreground">Linked Companies</CardTitle>
            <CardDescription>
              Total paid across all: {formatCents(totalPaid)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {linkedCompanies.map((c: any) => {
              const companyPayments = allPayments
                .filter((p: any) => p.companies?.id === c.id && p.status !== "VOID")
                .reduce((s: number, p: any) => s + p.amount_cents, 0)
              return (
                <Link
                  key={c.id}
                  href={`/companies/${c.id}`}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/50 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatCents(companyPayments)}
                  </span>
                </Link>
              )
            })}
            {linkedCompanies.length === 0 && (
              <p className="text-sm text-muted-foreground py-2 text-center">No companies linked.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Payment History</CardTitle>
          <CardDescription>{allPayments.length} total payments</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead>Check #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPayments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{p.payment_date}</TableCell>
                  <TableCell className="text-foreground">{p.companies?.name ?? "Unknown"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.memo}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {p.check_number ? `#${p.check_number}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[p.status]}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-foreground">
                    {formatCents(p.amount_cents)}
                  </TableCell>
                  <TableCell>
                    {p.companies && (
                      <ReprintCheckButton
                        payment={{
                          id: p.id,
                          check_number: p.check_number,
                          amount_cents: p.amount_cents,
                          payment_date: p.payment_date,
                          memo: p.memo,
                          status: p.status,
                        }}
                        company={{
                          id: p.companies.id,
                          name: p.companies.name,
                          address_line1: p.companies.address_line1,
                          address_line2: p.companies.address_line2,
                          address_city: p.companies.address_city,
                          address_state: p.companies.address_state,
                          address_zip: p.companies.address_zip,
                          print_offset_x: p.companies.print_offset_x ?? 0,
                          print_offset_y: p.companies.print_offset_y ?? 0,
                        }}
                        contractor={{
                          first_name: contractor.first_name,
                          last_name: contractor.last_name,
                          business_name: contractor.business_name,
                          address_line1: contractor.address_line1,
                          address_line2: contractor.address_line2,
                          address_city: contractor.address_city,
                          address_state: contractor.address_state,
                          address_zip: contractor.address_zip,
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {allPayments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No payments issued yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
