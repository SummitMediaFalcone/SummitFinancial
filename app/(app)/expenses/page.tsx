"use client"

import { useState } from "react"
import { Plus, Search, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { expenses, companies, getCompanyById, formatCents } from "@/lib/mock-data"

const expenseCategories = [
  "Office Supplies",
  "Utilities",
  "Materials",
  "Software",
  "Shipping",
  "Travel",
  "Insurance",
  "Professional Services",
  "Other",
]

const paymentMethods = ["Credit Card", "ACH", "Cash", "Check", "Wire Transfer"]

export default function ExpensesPage() {
  const { selectedCompanyId } = useCompany()
  const [search, setSearch] = useState("")

  const filtered = expenses.filter((e) => {
    const matchesCompany = !selectedCompanyId || e.companyId === selectedCompanyId
    const matchesSearch =
      !search ||
      e.vendor.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
    return matchesCompany && matchesSearch
  })

  const totalExpenses = filtered.reduce((s, e) => s + e.amountCents, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Expenses</h2>
          <p className="text-sm text-muted-foreground">
            Track company expenses and receipts &middot; Total: {formatCents(totalExpenses)}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>Record a business expense.</DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Company</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Vendor</Label>
                  <Input placeholder="Office Depot" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Amount ($)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Date</Label>
                  <Input type="date" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Payment Method</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Notes (optional)</Label>
                <Textarea placeholder="Additional details..." rows={2} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Receipt</Label>
                <div className="flex items-center gap-2 rounded-md border border-dashed p-4">
                  <Upload className="size-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click or drag to upload receipt
                  </span>
                </div>
              </div>
              <Button type="button">Save Expense</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
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
                <TableHead>Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const company = getCompanyById(e.companyId)
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground">{e.expenseDate}</TableCell>
                    <TableCell className="text-foreground">
                      {company?.name?.split(" ").slice(0, 2).join(" ") ?? "Unknown"}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{e.vendor}</TableCell>
                    <TableCell className="text-muted-foreground">{e.category}</TableCell>
                    <TableCell className="text-muted-foreground">{e.method}</TableCell>
                    <TableCell>
                      {e.receiptUrl ? (
                        <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                          Attached
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatCents(e.amountCents)}
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No expenses found.
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
