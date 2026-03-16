-- ============================================================
-- SUMMIT FINANCIAL OS — DATABASE HEALTH CHECK
-- Run this in Supabase SQL Editor to see what's installed
-- ============================================================

SELECT
  expected.table_name,
  CASE WHEN actual.tablename IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status
FROM (
  VALUES
    ('profiles'),
    ('companies'),
    ('user_company_access'),
    ('contractors'),
    ('contractor_company_links'),
    ('payments'),
    ('expenses'),
    ('audit_logs'),
    ('billing_clients'),
    ('billing_products'),
    ('subscription_plans'),
    ('invoices'),
    ('invoice_items'),
    ('subscriptions'),
    ('company_bank_accounts')
) AS expected(table_name)
LEFT JOIN pg_tables actual
  ON actual.schemaname = 'public'
  AND actual.tablename = expected.table_name
ORDER BY expected.table_name;
