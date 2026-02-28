"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"

type Company = Database["public"]["Tables"]["companies"]["Row"]

interface CompanyContextValue {
  companies: Company[]
  selectedCompanyId: string | null
  setSelectedCompanyId: (id: string | null) => void
  selectedCompanyName: string
  loading: boolean
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCompanies() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name")

      if (!error && data) {
        setCompanies(data)
      }
      setLoading(false)
    }
    loadCompanies()
  }, [])

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
