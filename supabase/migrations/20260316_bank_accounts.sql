-- Bank accounts table (multiple per company, encrypted)
CREATE TABLE IF NOT EXISTS company_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,           -- e.g., "Operating Account", "Payroll", "Telecom"
  bank_name TEXT NOT NULL,
  routing_number_enc TEXT NOT NULL,     -- encrypted
  routing_number_masked TEXT NOT NULL,  -- e.g., "****6789"
  account_number_enc TEXT NOT NULL,     -- encrypted
  account_number_masked TEXT NOT NULL,  -- e.g., "****4321"
  account_type TEXT NOT NULL DEFAULT 'checking', -- checking | savings
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one default per company
CREATE UNIQUE INDEX IF NOT EXISTS company_bank_accounts_default_idx
  ON company_bank_accounts (company_id)
  WHERE is_default = TRUE;

-- RLS
ALTER TABLE company_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bank accounts"
  ON company_bank_accounts FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
