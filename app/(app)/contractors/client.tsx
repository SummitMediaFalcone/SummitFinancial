"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Search, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table"
import { useCompany } from "@/lib/company-context"
import { formatCents, getContractorDisplayName } from "@/lib/utils"
import { NewContractorDialog } from "./new-contractor-dialog"

interface Contractor {
    id: string
    first_name: string
    last_name: string
    business_name: string | null
    email: string
    tin_type: string
    tin_masked: string
    w9_file_path: string | null
    contractor_company_links: { company_id: string; companies: { name: string } | null }[]
    payments: { amount_cents: number; status: string }[]
}

export function ContractorsClient() {
    const { selectedCompanyId } = useCompany()
    const [contractors, setContractors] = useState<Contractor[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    async function loadContractors() {
        setLoading(true)
        try {
            const res = await fetch("/api/contractors")
            const data = await res.json()
            if (Array.isArray(data)) setContractors(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadContractors() }, [])

    const filtered = useMemo(() => {
        let list = contractors
        if (selectedCompanyId) {
            list = list.filter((c) =>
                c.contractor_company_links?.some((l) => l.company_id === selectedCompanyId)
            )
        }
        if (search) {
            const q = search.toLowerCase()
            list = list.filter((c) =>
                getContractorDisplayName(c).toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q)
            )
        }
        return list
    }, [contractors, selectedCompanyId, search])

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Contractors</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage independent contractor records and W-9 files
                    </p>
                </div>
                <NewContractorDialog activeCompanyId={selectedCompanyId} onSuccess={loadContractors} />
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
                <CardContent className="p-0 overflow-x-auto">
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
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6}>
                                            <div className="h-8 rounded bg-muted animate-pulse" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : filtered.map((c) => {
                                const linkedCompanyNames = c.contractor_company_links
                                    ?.map((l) => l.companies?.name?.split(" ")[0])
                                    .filter(Boolean)
                                    .join(", ")

                                const totalPaid = c.payments
                                    ?.filter((p) => p.status !== "VOID")
                                    .reduce((s, p) => s + p.amount_cents, 0) || 0

                                return (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            <Link
                                                href={`/contractors/${c.id}`}
                                                className="font-medium text-foreground hover:underline"
                                            >
                                                {getContractorDisplayName(c)}
                                            </Link>
                                            {c.business_name && (
                                                <p className="text-xs text-muted-foreground">
                                                    {c.first_name} {c.last_name}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{c.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {c.tin_type}: {c.tin_masked}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                                            {linkedCompanyNames || "—"}
                                        </TableCell>
                                        <TableCell>
                                            {c.w9_file_path ? (
                                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                                                    <FileText className="mr-1 size-3" />On file
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
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
                            {!loading && filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        {contractors.length === 0
                                            ? "No contractors yet. Add one to get started."
                                            : "No contractors match your filter."}
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
