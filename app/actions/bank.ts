"use server"

import { createClient } from "@/lib/supabase/server"
import { decryptField } from "@/lib/encryption"

export interface CompanyBankInfo {
  routing: string
  account: string
  bankName: string
  accountName: string
}

/**
 * Fetches and decrypts the default bank account for a company.
 * Returns null if no bank account is configured.
 */
export async function getCompanyBankInfoAction(companyId: string): Promise<CompanyBankInfo | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("company_bank_accounts")
    .select("routing_number_enc, account_number_enc, bank_name, account_name, is_default")
    .eq("company_id", companyId)
    .order("is_default", { ascending: false }) // default first
    .limit(1)
    .single()

  if (error || !data) return null

  try {
    const routing = decryptField(data.routing_number_enc)
    const account = decryptField(data.account_number_enc)
    return {
      routing,
      account,
      bankName: data.bank_name,
      accountName: data.account_name,
    }
  } catch (e) {
    console.error("Failed to decrypt bank info:", e)
    return null
  }
}
