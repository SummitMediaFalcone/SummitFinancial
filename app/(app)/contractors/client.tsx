"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Search, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useCompany } from "@/lib/company-context"
import { createClient } from "@/lib/supabase/client"
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
    contractor_company_links: { companies: { name: string } | null }[]
    payments: { amount_cents: number; status: string }[]
}

export function ContractorsClient() {
    const { selectedCompanyId } = useCompany()
    const [contractors, setContractors] = useState<Contractor[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    const supabase = createClient()

    async function loadContractors() {
        setLoading(true)

        // Using a more structured query to get nested relationships
        let query = supabase
            .from("contractors")
            .select(`
        id, first_name, last_name, business_name, email, tin_type, tin_masked, w9_file_path,
        contractor_company_links (
          company_id,
          companies (name)
        ),
        payments (amount_cents, status)
      `)
            .order("first_name")

        const { data, error } = await query
        if (error) {
            console.error(error)
            setLoading(false)
            return
        }

        // Client-side mapping + filtering if needed
        let result = (data as unknown as any[]) || []

        if (selectedCompanyId) {
            result = result.filter(c =>
                c.contractor_company_links?.some((link: any) => link.company_id === selectedCompanyId)
            )
        }

        setContractors(result)
        setLoading(false)
    }

    useEffect(() => {
        loadContractors()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCompanyId])

    const filtered = useMemo(() => {
        return contractors.filter((c) => {
            const name = getContractorDisplayName(c)
            const matchesSearch =
                !search ||
                name.toLowerCase().includes(search.toLowerCase()) ||
                c.email.toLowerCase().includes(search.toLowerCase())

            return matchesSearch
        })
    }, [contractors, search])

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Contractors</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage independent contractor records and W-9 files
                    </p>
                </div>
                <NewContractorDialog activeCompanyId={selectedCompanyId} />
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
                                    ?.map((l: any) => l.companies?.name?.split(" ")[0])
                                    .filter(Boolean)
                                    .join(", ")

                                const totalPaid = c.payments
                                    ?.filter((p: any) => p.status !== "VOID")
                                    .reduce((s: number, p: any) => s + p.amount_cents, 0) || 0

                                return (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            <Link
                                                href={`/contractors/${c.id}`}
                                                className="font-medium text-foreground hover:underline"
                                            >
                                                {getContractorDisplayName({
                                                    first_name: c.first_name,
                                                    last_name: c.last_name,
                                                    business_name: c.business_name,
                                                })}
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
                            {!loading && filtered.length === 0 && (
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
