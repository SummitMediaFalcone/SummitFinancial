"use client"

import { useEffect, useState, useTransition } from "react"
import { Plus, Search, Filter, Loader2, MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCompany } from "@/lib/company-context"
import { formatCents, getContractorDisplayName } from "@/lib/utils"
import { NewPaymentFlow } from "@/components/new-payment-flow"
import { voidPaymentAction, clearPaymentAction } from "@/app/actions/payments"

interface Payment {
    id: string
    company_id: string
    contractor_id: string
    amount_cents: number
    payment_date: string
    status: "DRAFT" | "PRINTED" | "VOID" | "CLEARED"
    memo: string
    category: string
    check_number: number | null
    contractors: { first_name: string; last_name: string; business_name: string | null } | null
    companies: { name: string } | null
}

const statusColors: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    PRINTED: "bg-primary/10 text-primary",
    VOID: "bg-destructive/10 text-destructive",
    CLEARED: "bg-emerald-500/10 text-emerald-600",
}

export function PaymentsClient() {
    const { selectedCompanyId } = useCompany()
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [showNewPayment, setShowNewPayment] = useState(false)
    const [isPending, startTransition] = useTransition()

    async function loadPayments() {
        setLoading(true)
        try {
            const res = await fetch("/api/payments")
            const data = await res.json()
            if (Array.isArray(data)) setPayments(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadPayments() }, [])

    const filtered = payments.filter((p) => {
        if (selectedCompanyId && p.company_id !== selectedCompanyId) return false
        if (statusFilter !== "all" && p.status !== statusFilter) return false
        if (search) {
            const q = search.toLowerCase()
            const name = p.contractors ? getContractorDisplayName(p.contractors) : ""
            if (!name.toLowerCase().includes(q) && !p.memo.toLowerCase().includes(q)) return false
        }
        return true
    })

    function handleVoid(payment: Payment) {
        startTransition(async () => {
            const reason = prompt("Reason for voiding this check:") ?? "Voided by user"
            const result = await voidPaymentAction(payment.id, payment.company_id, reason)
            if (result.error) alert(result.error)
            else await loadPayments()
        })
    }

    function handleClear(payment: Payment) {
        startTransition(async () => {
            const result = await clearPaymentAction(payment.id, payment.company_id)
            if (result.error) alert(result.error)
            else await loadPayments()
        })
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Payments</h2>
                    <p className="text-sm text-muted-foreground">
                        Contractor payment ledger and check management
                    </p>
                </div>
                <Button onClick={() => setShowNewPayment(true)}>
                    <Plus className="mr-2 size-4" />New Payment
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search payments…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                        <Filter className="mr-2 size-4" />
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="PRINTED">Printed</SelectItem>
                        <SelectItem value="CLEARED">Cleared</SelectItem>
                        <SelectItem value="VOID">Void</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Contractor</TableHead>
                                <TableHead>Memo / Category</TableHead>
                                <TableHead>Check #</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={8}>
                                            <div className="h-8 rounded bg-muted animate-pulse" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                filtered.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="text-muted-foreground whitespace-nowrap">
                                            {p.payment_date}
                                        </TableCell>
                                        <TableCell className="text-foreground">
                                            {p.companies?.name?.split(" ").slice(0, 2).join(" ") ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-foreground">
                                                {p.contractors ? getContractorDisplayName(p.contractors) : "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm text-muted-foreground">{p.memo}</span>
                                                <span className="text-xs text-muted-foreground/70">{p.category}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-muted-foreground">
                                            {p.check_number ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={statusColors[p.status] ?? ""}>
                                                {p.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium tabular-nums text-foreground">
                                            {formatCents(p.amount_cents)}
                                        </TableCell>
                                        <TableCell>
                                            {p.status !== "VOID" && p.status !== "CLEARED" && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" disabled={isPending}>
                                                            {isPending
                                                                ? <Loader2 className="size-4 animate-spin" />
                                                                : <MoreHorizontal className="size-4" />}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {p.status === "PRINTED" && (
                                                            <DropdownMenuItem onClick={() => handleClear(p)}>
                                                                Mark Cleared
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleVoid(p)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            Void Check
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            {!loading && filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        {payments.length === 0
                                            ? "No payments yet. Click 'New Payment' to get started."
                                            : "No payments match your filter."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showNewPayment} onOpenChange={setShowNewPayment}>
                <DialogContent className="w-full max-w-2xl sm:max-w-2xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
                    <DialogHeader>
                        <DialogTitle>New Payment</DialogTitle>
                    </DialogHeader>
                    <NewPaymentFlow
                        onComplete={async () => {
                            setShowNewPayment(false)
                            await loadPayments()
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}
