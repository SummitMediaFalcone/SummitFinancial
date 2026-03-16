"use client"

import { useEffect, useState } from "react"
import { Search, Filter, Shield } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCompany } from "@/lib/company-context"

interface AuditLog {
  id: string
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string
  company_id: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

const ACTION_COLORS: Record<string, string> = {
  CREATE_CLIENT: "bg-emerald-500/10 text-emerald-700",
  CREATE_INVOICE: "bg-blue-500/10 text-blue-700",
  SEND_INVOICE: "bg-violet-500/10 text-violet-700",
  MARK_INVOICE_PAID: "bg-emerald-500/10 text-emerald-700",
  VOID_INVOICE: "bg-red-500/10 text-red-700",
  CREATE_SUBSCRIPTION: "bg-blue-500/10 text-blue-700",
  CANCEL_SUBSCRIPTION: "bg-red-500/10 text-red-700",
  CREATE_PAYMENT: "bg-amber-500/10 text-amber-700",
  PRINT_CHECK: "bg-amber-500/10 text-amber-700",
  VOID_PAYMENT: "bg-red-500/10 text-red-700",
  CREATE_CONTRACTOR: "bg-sky-500/10 text-sky-700",
}

function actionLabel(action: string) {
  return action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function AuditLogClient() {
  const { selectedCompanyId } = useCompany()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("all")

  async function load() {
    setLoading(true)
    const res = await fetch("/api/reports/audit")
    const data = await res.json()
    if (Array.isArray(data)) setLogs(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = logs.filter(l => {
    if (selectedCompanyId && l.company_id && l.company_id !== selectedCompanyId) return false
    if (filterType !== "all" && !l.entity_type.toLowerCase().includes(filterType)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        l.action.toLowerCase().includes(q) ||
        (l.actor_email ?? "").toLowerCase().includes(q) ||
        l.entity_type.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Audit Log</h2>
        </div>
        <p className="text-sm text-muted-foreground">Every action taken in the system — who did what and when.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by action, user, or type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="mr-2 size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="invoice">Invoices</SelectItem>
            <SelectItem value="subscription">Subscriptions</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
            <SelectItem value="contractor">Contractors</SelectItem>
            <SelectItem value="client">Clients</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Log entries */}
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                <div className="ml-auto h-4 w-16 rounded bg-muted animate-pulse" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Shield className="size-10 mx-auto mb-3 opacity-20" />
              No audit entries found.
            </div>
          ) : filtered.map(log => (
            <div key={log.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
              <Badge
                variant="secondary"
                className={`text-xs self-start sm:self-auto shrink-0 ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"}`}
              >
                {actionLabel(log.action)}
              </Badge>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                  {log.entity_type}
                  <span className="text-muted-foreground font-normal"> · {log.entity_id.slice(0, 8)}…</span>
                </span>
                <span className="text-xs text-muted-foreground">{log.actor_email ?? "System"}</span>
              </div>
              <span className="text-xs text-muted-foreground sm:ml-auto shrink-0">
                {timeAgo(log.created_at)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {!loading && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filtered.length} of {logs.length} entries
        </p>
      )}
    </div>
  )
}
