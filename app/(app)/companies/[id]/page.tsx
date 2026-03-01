import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Building2, MapPin, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"
import { formatCents } from "@/lib/utils"

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

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: company, error } = await supabase
    .from("companies")
    .select(`
      *,
      contractor_company_links (
        contractor_id,
        contractors (id, first_name, last_name, business_name, email, tin_masked)
      ),
      payments (
        id, amount_cents, payment_date, check_number, status, memo,
        contractors (first_name, last_name, business_name)
      ),
      expenses (
        id, amount_cents, expense_date, vendor, category, method
      )
    `)
    .eq("id", id)
    .single()

  if (error || !company) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Company not found or access denied</p>
        <Button variant="ghost" asChild className="mt-4">
          <Link href="/companies">
            <ArrowLeft className="mr-2 size-4" />
            Back to Companies
          </Link>
        </Button>
      </div>
    )
  }

  const linkedContractors = company.contractor_company_links
    .map((l: any) => l.contractors)
    .filter(Boolean)

  const companyPayments = company.payments || []
  const companyExpenses = company.expenses || []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/companies">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{company.name}</h2>
            {company.dba && (
              <p className="text-sm text-muted-foreground">DBA: {company.dba}</p>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contractors">Contractors ({linkedContractors.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({companyPayments.length})</TabsTrigger>
          <TabsTrigger value="expenses">Expenses ({companyExpenses.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-foreground">Company Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0" />
                  {formatAddress(company.address_line1, company.address_line2, company.address_city, company.address_state, company.address_zip)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4 shrink-0" />
                  {company.phone}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">EIN: {company.ein_masked}</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-foreground">Banking</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Bank:</span> {company.bank_name || "Not set"}</p>
                <p><span className="font-medium text-foreground">Routing:</span> {company.routing_masked || "****"}</p>
                <p><span className="font-medium text-foreground">Account:</span> {company.account_masked || "****"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-foreground">Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Contractors</p>
                  <p className="text-2xl font-bold text-foreground">{linkedContractors.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCents(companyPayments.filter((p: any) => p.status !== "VOID").reduce((s: number, p: any) => s + p.amount_cents, 0))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payments</p>
                  <p className="text-2xl font-bold text-foreground">{companyPayments.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expenses</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCents(companyExpenses.reduce((s: number, e: any) => s + e.amount_cents, 0))}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contractors" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>TIN</TableHead>
                    <TableHead className="text-right">Total Paid by Company</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedContractors.map((c: any) => {
                    const totalPaid = companyPayments
                      .filter((p: any) => p.contractors?.id === c.id && p.status !== "VOID")
                      .reduce((s: number, p: any) => s + p.amount_cents, 0)
                    const displayName = c.business_name || `${c.first_name} ${c.last_name}`
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link href={`/contractors/${c.id}`} className="font-medium text-foreground hover:underline">
                            {displayName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{c.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{c.tin_masked}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-foreground">
                          {formatCents(totalPaid)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Memo</TableHead>
                    <TableHead>Check #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyPayments.map((p: any) => {
                    const cName = p.contractors ? (p.contractors.business_name || `${p.contractors.first_name} ${p.contractors.last_name}`) : "Unknown"
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground">{p.payment_date}</TableCell>
                        <TableCell className="font-medium text-foreground">{cName}</TableCell>
                        <TableCell className="text-muted-foreground">{p.memo}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {p.check_number ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColors[p.status]}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-foreground">
                          {formatCents(p.amount_cents)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyExpenses.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-muted-foreground">{e.expense_date}</TableCell>
                      <TableCell className="font-medium text-foreground">{e.vendor}</TableCell>
                      <TableCell className="text-muted-foreground">{e.category}</TableCell>
                      <TableCell className="text-muted-foreground">{e.method}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-foreground">
                        {formatCents(e.amount_cents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-foreground">Check Settings</CardTitle>
                <CardDescription>Configure check layout and numbering</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Check Layout</Label>
                  <Select defaultValue={company.check_layout_type}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top Check (standard)</SelectItem>
                      <SelectItem value="3-per-page">3-Per-Page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Starting Check Number</Label>
                  <Input type="number" defaultValue={company.check_start_number} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Print Offset X (mm)</Label>
                    <Input type="number" defaultValue={company.print_offset_x} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Print Offset Y (mm)</Label>
                    <Input type="number" defaultValue={company.print_offset_y} />
                  </div>
                </div>
                <Button type="button">Save Settings</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-foreground">Company Information</CardTitle>
                <CardDescription>Update company details</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Company Name</Label>
                  <Input defaultValue={company.name} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Bank Name</Label>
                  <Input defaultValue={company.bank_name || ""} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Phone</Label>
                  <Input defaultValue={company.phone || ""} />
                </div>
                <Button type="button">Update Company</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
