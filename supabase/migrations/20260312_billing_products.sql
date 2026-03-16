-- ============================================================
-- BILLING PRODUCTS / SERVICES CATALOG
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  unit_price_cents int  NOT NULL,
  unit_label       text NOT NULL DEFAULT 'each',   -- e.g. "hour", "month", "each", "project"
  category         text,
  is_active        boolean NOT NULL DEFAULT true,
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE billing_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_products_select" ON billing_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid() AND company_id = billing_products.company_id
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "billing_products_insert" ON billing_products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid() AND company_id = billing_products.company_id
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "billing_products_update" ON billing_products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid() AND company_id = billing_products.company_id
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "billing_products_delete" ON billing_products
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

-- Updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'billing_products_updated_at') THEN
    CREATE TRIGGER billing_products_updated_at
      BEFORE UPDATE ON billing_products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
