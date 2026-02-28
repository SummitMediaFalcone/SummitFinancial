"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, MapPin, FileText, Upload, Building2 } from "lucide-react"
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
import {
  getContractorById,
  getContractorName,
  getLinkedCompanies,
  getCompanyById,
  getPaymentsForContractor,
  formatCents,
  formatAddress,
} from "@/lib/mock-data"

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PRINTED: "bg-primary/10 text-primary",
  VOID: "bg-destructive/10 text-destructive",
  CLEARED: "bg-success/10 text-success",
}

export default function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const contractor = getContractorById(id)

  if (!contractor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Contractor not found</p>
        <Button variant="ghost" asChild className="mt-4">
          <Link href="/contractors">
            <ArrowLeft className="mr-2 size-4" />
            Back to Contractors
          </Link>
        </Button>
      </div>
    )
  }

  const linkedCompanyIds = getLinkedCompanies(contractor.id)
  const linkedCompanies = linkedCompanyIds.map(getCompanyById).filter(Boolean)
  const allPayments = getPaymentsForContractor(contractor.id)
  const totalPaid = allPayments
    .filter((p) => p.status !== "VOID")
    .reduce((s, p) => s + p.amountCents, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contractors">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{getContractorName(contractor)}</h2>
          {contractor.businessName && (
            <p className="text-sm text-muted-foreground">
              {contractor.firstName} {contractor.lastName}
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
              {formatAddress(contractor.address)}
            </div>
            {contractor.notes && (
              <p className="text-xs text-muted-foreground border-t pt-3 mt-1">
                {contractor.notes}
              </p>
            )}
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
              <Badge variant="outline">{contractor.tinType}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">TIN</span>
              <span className="font-mono text-sm text-foreground">{contractor.tinMasked}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">W-9 Status</span>
              {contractor.w9FileUrl ? (
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
            <Button variant="outline" size="sm" className="mt-2">
              <Upload className="mr-2 size-4" />
              Upload W-9
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
            {linkedCompanies.map((c) => {
              if (!c) return null
              const companyPayments = allPayments
                .filter((p) => p.companyId === c.id && p.status !== "VOID")
                .reduce((s, p) => s + p.amountCents, 0)
              return (
                <Link
                  key={c.id}
                  href={`/companies/${c.id}`}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatCents(companyPayments)}
                  </span>
                </Link>
              )
            })}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPayments.map((p) => {
                const company = getCompanyById(p.companyId)
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{p.paymentDate}</TableCell>
                    <TableCell className="text-foreground">{company?.name ?? "Unknown"}</TableCell>
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
    </div>
  )
}
