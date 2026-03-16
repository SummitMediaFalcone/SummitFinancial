-- ============================================================
-- SUMMIT FINANCIAL OS — BILLING MODULE MIGRATION
-- Run in Supabase SQL Editor
-- ============================================================

-- ── billing_clients ─────────────────────────────────────────
-- External clients (businesses / people) that receive invoices
CREATE TABLE IF NOT EXISTS billing_clients (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name             text NOT NULL,
  email            text NOT NULL,
  phone            text,
  address_line1    text,
  address_line2    text,
  address_city     text,
  address_state    text,
  address_zip      text,
  stripe_customer_id text,          -- Stripe Customer ID once created
  notes            text,
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE billing_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_clients_select" ON billing_clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid() AND company_id = billing_clients.company_id
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "billing_clients_insert" ON billing_clients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid() AND company_id = billing_clients.company_id
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "billing_clients_update" ON billing_clients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid() AND company_id = billing_clients.company_id
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "billing_clients_delete" ON billing_clients
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ── subscription_plans ──────────────────────────────────────
-- Reusable billing plans (e.g. "Basic $15/mo", "Pro $19.99/mo")
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name               text NOT NULL,
  description        text,
  billing_interval   text NOT NULL CHECK (billing_interval IN ('month', 'year')),
  amount_cents       int  NOT NULL,
  stripe_price_id    text,          -- Stripe Price ID once synced
  stripe_product_id  text,          -- Stripe Product ID once synced
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select" ON subscription_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid() AND company_id = subscription_plans.company_id
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "plans_insert" ON subscription_plans
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "plans_update" ON subscription_plans
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ── invoices ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS invoices (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id            uuid NOT NULL REFERENCES billing_clients(id) ON DELETE RESTRICT,
  invoice_number       text NOT NULL,
  status               invoice_status NOT NULL DEFAULT 'DRAFT',
  issue_date           date NOT NULL DEFAULT CURRENT_DATE,
  due_date             date NOT NULL,
  subtotal_cents       int  NOT NULL DEFAULT 0,
  discount_cents       int  NOT NULL DEFAULT 0,
  tax_cents            int  NOT NULL DEFAULT 0,
  total_cents          int  NOT NULL DEFAULT 0,
  notes                text,
  stripe_invoice_id    text,        -- Stripe Invoice ID once created
  stripe_payment_intent_id text,
  paid_at              timestamptz,
  sent_at              timestamptz,
  -- Subscription linkage (optional)
  subscription_plan_id uuid REFERENCES subscription_plans(id),
  is_recurring         boolean NOT NULL DEFAULT false,
  recurrence_interval  text CHECK (recurrence_interval IN ('month', 'year')),
  created_by           uuid REFERENCES auth.users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid() AND company_id = invoices.company_id
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid() AND company_id = invoices.company_id
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid() AND company_id = invoices.company_id
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ── invoice_items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description  text NOT NULL,
  quantity     numeric(10,2) NOT NULL DEFAULT 1,
  unit_price_cents int NOT NULL,
  total_cents  int NOT NULL,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_items_all" ON invoice_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices inv
      JOIN user_company_access uca ON uca.company_id = inv.company_id
      WHERE inv.id = invoice_items.invoice_id AND uca.user_id = auth.uid()
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ── subscriptions ────────────────────────────────────────────
-- Tracks active recurring subscriptions per client
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id            uuid NOT NULL REFERENCES billing_clients(id) ON DELETE CASCADE,
  plan_id              uuid NOT NULL REFERENCES subscription_plans(id),
  status               subscription_status NOT NULL DEFAULT 'ACTIVE',
  stripe_subscription_id text,
  current_period_start date NOT NULL DEFAULT CURRENT_DATE,
  current_period_end   date NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at          timestamptz,
  created_by           uuid REFERENCES auth.users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid() AND company_id = subscriptions.company_id
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "subscriptions_insert" ON subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid() AND company_id = subscriptions.company_id
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

CREATE POLICY "subscriptions_update" ON subscriptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid() AND company_id = subscriptions.company_id
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'Admin'
  );

-- ── Auto-increment invoice number per company ────────────────
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
  v_prefix text;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE company_id = p_company_id;

  -- Format: INV-0001, INV-0002, etc.
  v_prefix := 'INV-' || LPAD(v_count::text, 4, '0');
  RETURN v_prefix;
END;
$$;

-- ── Triggers ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'billing_clients_updated_at') THEN
    CREATE TRIGGER billing_clients_updated_at BEFORE UPDATE ON billing_clients
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'invoices_updated_at') THEN
    CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'subscriptions_updated_at') THEN
    CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ── Seed default plans for Summit Media Pro ─────────────────
-- NOTE: Replace the company_id below with Summit Media Pro's actual UUID after creation
-- INSERT INTO subscription_plans (company_id, name, description, billing_interval, amount_cents)
-- VALUES
--   ('<company_uuid>', 'Basic Monthly', 'Standard monthly plan', 'month', 1500),
--   ('<company_uuid>', 'Pro Monthly', 'Pro features monthly', 'month', 1999),
--   ('<company_uuid>', 'Basic Yearly', 'Standard annual plan (10% off)', 'year', 16200),
--   ('<company_uuid>', 'Pro Yearly', 'Pro features annual (10% off)', 'year', 21588);
