-- ============================================================
-- SUMMIT FINANCIAL OS — BILLING MODULE (FIXED)
-- Safe to run even if tables already partially exist.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- ── 1. update_updated_at trigger function (must be first) ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ── 2. ENUM types (safe if already exists) ──────────────────
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── 3. billing_clients ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_clients (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name               text        NOT NULL,
  email              text        NOT NULL,
  phone              text,
  address_line1      text,
  address_line2      text,
  address_city       text,
  address_state      text,
  address_zip        text,
  stripe_customer_id text,
  notes              text,
  created_by         uuid        REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE billing_clients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "billing_clients_all" ON billing_clients FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER billing_clients_updated_at
    BEFORE UPDATE ON billing_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── 4. subscription_plans ────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  description       text,
  billing_interval  text        NOT NULL CHECK (billing_interval IN ('month', 'year')),
  amount_cents      int         NOT NULL,
  stripe_price_id   text,
  stripe_product_id text,
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "plans_all" ON subscription_plans FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── 5. billing_products ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_products (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  description      text,
  unit_price_cents int         NOT NULL,
  unit_label       text        NOT NULL DEFAULT 'each',
  category         text,
  is_active        boolean     NOT NULL DEFAULT true,
  created_by       uuid        REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE billing_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "billing_products_all" ON billing_products FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER billing_products_updated_at
    BEFORE UPDATE ON billing_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── 6. invoices ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                       uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               uuid           NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id                uuid           NOT NULL REFERENCES billing_clients(id) ON DELETE RESTRICT,
  invoice_number           text           NOT NULL,
  status                   invoice_status NOT NULL DEFAULT 'DRAFT',
  issue_date               date           NOT NULL DEFAULT CURRENT_DATE,
  due_date                 date           NOT NULL,
  subtotal_cents           int            NOT NULL DEFAULT 0,
  discount_cents           int            NOT NULL DEFAULT 0,
  tax_cents                int            NOT NULL DEFAULT 0,
  total_cents              int            NOT NULL DEFAULT 0,
  notes                    text,
  stripe_invoice_id        text,
  stripe_payment_intent_id text,
  paid_at                  timestamptz,
  sent_at                  timestamptz,
  subscription_plan_id     uuid           REFERENCES subscription_plans(id),
  is_recurring             boolean        NOT NULL DEFAULT false,
  recurrence_interval      text           CHECK (recurrence_interval IN ('month', 'year')),
  created_by               uuid           REFERENCES auth.users(id),
  created_at               timestamptz    NOT NULL DEFAULT now(),
  updated_at               timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "invoices_all" ON invoices FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── 7. invoice_items ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       uuid        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description      text        NOT NULL,
  quantity         numeric(10,2) NOT NULL DEFAULT 1,
  unit_price_cents int         NOT NULL,
  total_cents      int         NOT NULL,
  sort_order       int         NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "invoice_items_all" ON invoice_items FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── 8. subscriptions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             uuid                NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id              uuid                NOT NULL REFERENCES billing_clients(id) ON DELETE CASCADE,
  plan_id                uuid                NOT NULL REFERENCES subscription_plans(id),
  status                 subscription_status NOT NULL DEFAULT 'ACTIVE',
  stripe_subscription_id text,
  current_period_start   date                NOT NULL DEFAULT CURRENT_DATE,
  current_period_end     date                NOT NULL,
  cancel_at_period_end   boolean             NOT NULL DEFAULT false,
  canceled_at            timestamptz,
  created_by             uuid                REFERENCES auth.users(id),
  created_at             timestamptz         NOT NULL DEFAULT now(),
  updated_at             timestamptz         NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "subscriptions_all" ON subscriptions FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── 9. company_bank_accounts ─────────────────────────────────
CREATE TABLE IF NOT EXISTS company_bank_accounts (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_name         text        NOT NULL,
  bank_name            text        NOT NULL,
  routing_number_enc   text        NOT NULL,
  routing_number_masked text       NOT NULL,
  account_number_enc   text        NOT NULL,
  account_number_masked text       NOT NULL,
  account_type         text        NOT NULL DEFAULT 'checking',
  is_default           boolean     NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_bank_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "bank_accounts_all" ON company_bank_accounts FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER company_bank_accounts_updated_at
    BEFORE UPDATE ON company_bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── 10. Auto-increment invoice number per company ────────────
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE company_id = p_company_id;
  RETURN 'INV-' || LPAD(v_count::text, 4, '0');
END;
$$;
