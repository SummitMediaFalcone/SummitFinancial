"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, Users, Upload, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCompany } from "@/lib/company-context"
import {
  contractors,
  contractorCompanyLinks,
  getContractorName,
  getLinkedCompanies,
  getPaymentsForContractor,
  formatCents,
  getCompanyById,
} from "@/lib/mock-data"

export default function ContractorsPage() {
  const [search, setSearch] = useState("")
  const { selectedCompanyId } = useCompany()

  const filtered = contractors.filter((c) => {
    const matchesSearch =
      !search ||
      getContractorName(c).toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())

    const matchesCompany =
      !selectedCompanyId ||
      contractorCompanyLinks.some(
        (l) => l.contractorId === c.id && l.companyId === selectedCompanyId
      )

    return matchesSearch && matchesCompany
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Contractors</h2>
          <p className="text-sm text-muted-foreground">
            Manage independent contractor records and W-9 files
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add Contractor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Contractor</DialogTitle>
              <DialogDescription>
                Enter contractor details. You can upload the W-9 later.
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>First Name</Label>
                  <Input placeholder="John" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Last Name</Label>
                  <Input placeholder="Doe" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Business Name (optional)</Label>
                <Input placeholder="Doe Services LLC" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="john@example.com" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Phone</Label>
                  <Input placeholder="(555) 000-0000" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Address</Label>
                <Input placeholder="123 Main St" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>City</Label>
                  <Input placeholder="Denver" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>State</Label>
                  <Input placeholder="CO" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>ZIP</Label>
                  <Input placeholder="80202" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>TIN Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SSN">SSN</SelectItem>
                      <SelectItem value="EIN">EIN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>TIN</Label>
                  <Input placeholder="XX-XXXXXXX" />
                </div>
              </div>
              <Button type="button">Create Contractor</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search contractors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>TIN</TableHead>
                <TableHead>Companies</TableHead>
                <TableHead>W-9</TableHead>
                <TableHead className="text-right">Total Paid YTD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const linkedCompanyIds = getLinkedCompanies(c.id)
                const totalPaid = getPaymentsForContractor(c.id)
                  .filter((p) => p.status !== "VOID")
                  .reduce((s, p) => s + p.amountCents, 0)
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/contractors/${c.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {getContractorName(c)}
                      </Link>
                      {c.businessName && (
                        <p className="text-xs text-muted-foreground">
                          {c.firstName} {c.lastName}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {c.tinType}: {c.tinMasked}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {linkedCompanyIds
                        .map((id) => getCompanyById(id)?.name?.split(" ")[0])
                        .filter(Boolean)
                        .join(", ")}
                    </TableCell>
                    <TableCell>
                      {c.w9FileUrl ? (
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          <FileText className="mr-1 size-3" />
                          On file
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-warning/10 text-warning-foreground">
                          Missing
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatCents(totalPaid)}
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No contractors found.
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
