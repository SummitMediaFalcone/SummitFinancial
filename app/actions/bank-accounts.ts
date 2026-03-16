"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { encryptField } from "@/lib/encryption"

function maskNumber(raw: string) {
  const digits = raw.replace(/\D/g, "")
  return "****" + digits.slice(-4)
}

export async function createBankAccountAction(data: {
  company_id: string
  account_name: string
  bank_name: string
  routing_number: string
  account_number: string
  account_type: "checking" | "savings"
  is_default: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const routingRaw = data.routing_number.replace(/\D/g, "")
  const accountRaw = data.account_number.replace(/\D/g, "")

  if (routingRaw.length !== 9) return { error: "Routing number must be 9 digits" }
  if (accountRaw.length < 4) return { error: "Account number is too short" }

  let routingEnc: string, accountEnc: string
  try {
    routingEnc = encryptField(routingRaw)
    accountEnc = encryptField(accountRaw)
  } catch {
    return { error: "Encryption error — check FIELD_ENCRYPTION_KEY" }
  }

  // If this is being set as default, clear existing defaults first
  if (data.is_default) {
    await supabase
      .from("company_bank_accounts")
      .update({ is_default: false })
      .eq("company_id", data.company_id)
  }

  const { error } = await supabase.from("company_bank_accounts").insert({
    company_id: data.company_id,
    account_name: data.account_name,
    bank_name: data.bank_name,
    routing_number_enc: routingEnc,
    routing_number_masked: maskNumber(routingRaw),
    account_number_enc: accountEnc,
    account_number_masked: maskNumber(accountRaw),
    account_type: data.account_type,
    is_default: data.is_default,
  })

  if (error) return { error: error.message }

  revalidatePath("/settings")
  revalidatePath("/companies")
  return { success: true }
}

export async function setDefaultBankAccountAction(id: string, companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  // Clear existing defaults
  await supabase
    .from("company_bank_accounts")
    .update({ is_default: false })
    .eq("company_id", companyId)

  // Set new default
  const { error } = await supabase
    .from("company_bank_accounts")
    .update({ is_default: true })
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/settings")
  return { success: true }
}

export async function deleteBankAccountAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("company_bank_accounts")
    .delete()
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/settings")
  return { success: true }
}
