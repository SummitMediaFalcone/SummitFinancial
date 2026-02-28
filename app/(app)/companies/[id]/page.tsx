"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Building2, Users, CreditCard, Receipt, Settings, MapPin, Phone } from "lucide-react"
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
import {
  getCompanyById,
  getLinkedContractors,
  getPaymentsForCompany,
  getExpensesForCompany,
  getContractorById,
  getContractorName,
  formatCents,
  formatAddress,
} from "@/lib/mock-data"
import type { Company } from "@/lib/types"

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PRINTED: "bg-primary/10 text-primary",
  VOID: "bg-destructive/10 text-destructive",
  CLEARED: "bg-success/10 text-success",
}

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const company = getCompanyById(id)

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Company not found</p>
        <Button variant="ghost" asChild className="mt-4">
          <Link href="/companies">
            <ArrowLeft className="mr-2 size-4" />
            Back to Companies
          </Link>
        </Button>
      </div>
    )
  }

  const linkedContractorIds = getLinkedContractors(id)
  const linkedContractors = linkedContractorIds.map(getContractorById).filter(Boolean)
  const companyPayments = getPaymentsForCompany(id)
  const companyExpenses = getExpensesForCompany(id)

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
                  {formatAddress(company.address)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4 shrink-0" />
                  {company.phone}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">EIN: {company.einMasked}</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-foreground">Banking</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Bank:</span> {company.bankName || "Not set"}</p>
                <p><span className="font-medium text-foreground">Routing:</span> {company.routingMasked || "****"}</p>
                <p><span className="font-medium text-foreground">Account:</span> {company.accountMasked || "****"}</p>
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
                    {formatCents(companyPayments.filter(p => p.status !== "VOID").reduce((s, p) => s + p.amountCents, 0))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payments</p>
                  <p className="text-2xl font-bold text-foreground">{companyPayments.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expenses</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCents(companyExpenses.reduce((s, e) => s + e.amountCents, 0))}
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
                    <TableHead className="text-right">Total Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedContractors.map((c) => {
                    if (!c) return null
                    const totalPaid = companyPayments
                      .filter((p) => p.contractorId === c.id && p.status !== "VOID")
                      .reduce((s, p) => s + p.amountCents, 0)
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link href={`/contractors/${c.id}`} className="font-medium text-foreground hover:underline">
                            {getContractorName(c)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{c.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{c.tinMasked}</Badge>
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
                  {companyPayments.map((p) => {
                    const contractor = getContractorById(p.contractorId)
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground">{p.paymentDate}</TableCell>
                        <TableCell className="font-medium text-foreground">
                          {contractor ? getContractorName(contractor) : "Unknown"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.memo}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {p.checkNumber ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColors[p.status]}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-foreground">
                          {formatCents(p.amountCents)}
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
                  {companyExpenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-muted-foreground">{e.expenseDate}</TableCell>
                      <TableCell className="font-medium text-foreground">{e.vendor}</TableCell>
                      <TableCell className="text-muted-foreground">{e.category}</TableCell>
                      <TableCell className="text-muted-foreground">{e.method}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-foreground">
                        {formatCents(e.amountCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <CompanySettings company={company} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CompanySettings({ company }: { company: Company }) {
  const [layout, setLayout] = useState(company.checkLayoutType)
  const [offsetX, setOffsetX] = useState(company.printOffsetX.toString())
  const [offsetY, setOffsetY] = useState(company.printOffsetY.toString())
  const [startNum, setStartNum] = useState(company.checkStartNumber.toString())

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-foreground">Check Settings</CardTitle>
          <CardDescription>Configure check layout and numbering</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Check Layout</Label>
            <Select value={layout} onValueChange={(v) => setLayout(v as "top" | "3-per-page")}>
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
            <Input
              type="number"
              value={startNum}
              onChange={(e) => setStartNum(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Print Offset X (mm)</Label>
              <Input
                type="number"
                value={offsetX}
                onChange={(e) => setOffsetX(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Print Offset Y (mm)</Label>
              <Input
                type="number"
                value={offsetY}
                onChange={(e) => setOffsetY(e.target.value)}
              />
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
            <Input defaultValue={company.bankName} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Phone</Label>
            <Input defaultValue={company.phone} />
          </div>
          <Button type="button">Update Company</Button>
        </CardContent>
      </Card>
    </div>
  )
}
