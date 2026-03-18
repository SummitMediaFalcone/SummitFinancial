"use server"

import { createClient } from "@/lib/supabase/server"
import { decryptField } from "@/lib/encryption"

export interface CompanyBankInfo {
  id: string
  routing: string
  account: string
  bankName: string
  accountName: string
  accountType: string
  isDefault: boolean
}

/**
 * Fetches and decrypts ALL bank accounts for a company so the user
 * can choose which one to print a voided check for.
 */
export async function getCompanyBankAccountsAction(companyId: string): Promise<CompanyBankInfo[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("company_bank_accounts")
    .select("id, routing_number_enc, account_number_enc, bank_name, account_name, account_type, is_default")
    .eq("company_id", companyId)
    .order("is_default", { ascending: false })

  if (error || !data) return []

  const results: CompanyBankInfo[] = []
  for (const row of data) {
    try {
      results.push({
        id: row.id,
        routing: decryptField(row.routing_number_enc),
        account: decryptField(row.account_number_enc),
        bankName: row.bank_name,
        accountName: row.account_name,
        accountType: row.account_type,
        isDefault: row.is_default,
      })
    } catch (e) {
      console.error("Failed to decrypt bank account:", row.id, e)
    }
  }
  return results
}

/**
 * Legacy: get single default bank account (used by check reprint).
 */
export async function getCompanyBankInfoAction(companyId: string): Promise<CompanyBankInfo | null> {
  const accounts = await getCompanyBankAccountsAction(companyId)
  return accounts.find(a => a.isDefault) ?? accounts[0] ?? null
}
