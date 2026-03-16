-- ============================================================
-- DISABLE RLS FOR IN-HOUSE USE
-- Summit Financial OS — run in Supabase SQL Editor
-- This removes all row-level security so the app runs fast
-- without authentication overhead on every query.
-- ============================================================

alter table profiles                 disable row level security;
alter table companies                disable row level security;
alter table user_company_access      disable row level security;
alter table contractors              disable row level security;
alter table contractor_company_links disable row level security;
alter table payments                 disable row level security;
alter table expenses                 disable row level security;
alter table audit_logs               disable row level security;
