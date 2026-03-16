"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import type { Database } from "@/lib/supabase/database.types"

type Company = Database["public"]["Tables"]["companies"]["Row"]

interface CompanyContextValue {
  companies: Company[]
  selectedCompanyId: string | null
  setSelectedCompanyId: (id: string | null) => void
  selectedCompanyName: string
  loading: boolean
  reload: () => void
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCompanies(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [tick])

  const reload = () => setTick((t) => t + 1)

  const selectedCompanyName = selectedCompanyId
    ? (companies.find((c) => c.id === selectedCompanyId)?.name ?? "Unknown")
    : "All Companies"

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompanyId,
        setSelectedCompanyId,
        selectedCompanyName,
        loading,
        reload,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider")
  return ctx
}
