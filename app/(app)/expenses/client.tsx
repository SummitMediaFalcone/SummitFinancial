"use client"

import { useEffect, useState, useMemo } from "react"
import { Plus, Search, Upload, Loader2 } from "lucide-react"
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
import { createClient } from "@/lib/supabase/client"
import { useCompany } from "@/lib/company-context"
import { formatCents } from "@/lib/utils"

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

interface Expense {
    id: string
    company_id: string
    amount_cents: number
    expense_date: string
    vendor: string
    category: string
    method: string
    notes: string | null
    receipt_url: string | null
    companies: { name: string } | null
}

export function ExpensesClient() {
    const { selectedCompanyId, companies } = useCompany()
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    const [formOpen, setFormOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const supabase = createClient()

    async function loadExpenses() {
        setLoading(true)
        let query = supabase
            .from("expenses")
            .select("*, companies(name)")
            .order("expense_date", { ascending: false })

        if (selectedCompanyId) {
            query = query.eq("company_id", selectedCompanyId)
        }

        const { data } = await query
        setExpenses((data as unknown as Expense[]) || [])
        setLoading(false)
    }

    useEffect(() => {
        loadExpenses()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCompanyId])

    const filtered = useMemo(() => {
        return expenses.filter((e) => {
            const matchesSearch =
                !search ||
                e.vendor.toLowerCase().includes(search.toLowerCase()) ||
                e.category.toLowerCase().includes(search.toLowerCase())
            return matchesSearch
        })
    }, [expenses, search])

    const totalExpenses = filtered.reduce((s, e) => s + e.amount_cents, 0)

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSubmitting(true)

        const formData = new FormData(e.currentTarget)
        const amountStr = formData.get("amount") as string
        const amountCents = Math.round(parseFloat(amountStr || "0") * 100)

        const { error } = await supabase.from("expenses").insert({
            company_id: formData.get("company_id") as string,
            vendor: formData.get("vendor") as string,
            amount_cents: amountCents,
            expense_date: formData.get("date") as string,
            category: formData.get("category") as string,
            method: formData.get("method") as string,
            notes: (formData.get("notes") as string) || null,
        })

        if (error) {
            alert("Error creating expense: " + error.message)
        } else {
            setFormOpen(false)
            await loadExpenses()
        }
        setSubmitting(false)
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Expenses</h2>
                    <p className="text-sm text-muted-foreground">
                        Track company expenses and receipts &middot; Total: {loading ? "..." : formatCents(totalExpenses)}
                    </p>
                </div>
                <Dialog open={formOpen} onOpenChange={setFormOpen}>
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
                        <form onSubmit={handleCreate} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <Label>Company</Label>
                                <Select name="company_id" required defaultValue={selectedCompanyId || undefined}>
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
                                    <Input name="vendor" placeholder="Office Depot" required />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label>Amount ($)</Label>
                                    <Input name="amount" type="number" step="0.01" placeholder="0.00" required min="0" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <Label>Date</Label>
                                    <Input name="date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label>Category</Label>
                                    <Select name="category" required>
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
                                <Select name="method" required>
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
                                <Textarea name="notes" placeholder="Additional details..." rows={2} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>Receipt</Label>
                                <div className="flex items-center gap-2 rounded-md border border-dashed p-4 opacity-50 cursor-not-allowed">
                                    <Upload className="size-5 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        Receipt upload not yet configured
                                    </span>
                                </div>
                            </div>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                                Save Expense
                            </Button>
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
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground animate-pulse">
                                        Loading expenses...
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((e) => (
                                <TableRow key={e.id}>
                                    <TableCell className="text-muted-foreground">{e.expense_date}</TableCell>
                                    <TableCell className="text-foreground">
                                        {e.companies?.name?.split(" ").slice(0, 2).join(" ") ?? "Unknown"}
                                    </TableCell>
                                    <TableCell className="font-medium text-foreground">{e.vendor}</TableCell>
                                    <TableCell className="text-muted-foreground">{e.category}</TableCell>
                                    <TableCell className="text-muted-foreground">{e.method}</TableCell>
                                    <TableCell>
                                        {e.receipt_url ? (
                                            <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                                                Attached
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">--</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                                        {formatCents(e.amount_cents)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && filtered.length === 0 && (
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
