"use client"

import Link from "next/link"
import { Building2, Plus, MapPin, Phone, CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { companies, formatAddress, getLinkedContractors, getPaymentsForCompany } from "@/lib/mock-data"

export default function CompaniesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Companies</h2>
          <p className="text-sm text-muted-foreground">Manage your entities and their settings</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
              <DialogDescription>
                Add a new company entity to your account.
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Company Name</Label>
                <Input id="name" placeholder="Acme Corp LLC" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dba">DBA (optional)</Label>
                <Input id="dba" placeholder="Acme Corp" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ein">EIN</Label>
                  <Input id="ein" placeholder="XX-XXXXXXX" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="(555) 000-0000" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="123 Main St" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="Denver" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="CO" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input id="zip" placeholder="80202" />
                </div>
              </div>
              <Button type="button">Create Company</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {companies.map((company) => {
          const contractorCount = getLinkedContractors(company.id).length
          const paymentCount = getPaymentsForCompany(company.id).length
          return (
            <Link href={`/companies/${company.id}`} key={company.id}>
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
                    EIN: {company.einMasked}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span>{formatAddress(company.address)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-3.5 shrink-0" />
                    <span>{company.phone}</span>
                  </div>
                  {company.bankName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="size-3.5 shrink-0" />
                      <span>{company.bankName} &middot; Acct: {company.accountMasked}</span>
                    </div>
                  )}
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span>{contractorCount} contractors</span>
                    <span>{paymentCount} payments</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
