-- ============================================================
-- Summit Financial OS — Row Level Security Policies
-- ============================================================
-- Run AFTER 001_initial_schema.sql

-- ─── Enable RLS ────────────────────────────────────────────

alter table profiles              enable row level security;
alter table companies             enable row level security;
alter table user_company_access   enable row level security;
alter table contractors           enable row level security;
alter table contractor_company_links enable row level security;
alter table payments              enable row level security;
alter table expenses              enable row level security;
alter table audit_logs            enable row level security;

-- ─── Helper: is_admin() ────────────────────────────────────

create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'Admin'
  )
$$;

-- ─── Profiles ──────────────────────────────────────────────

-- Users can read their own profile; Admins can read all
create policy "profiles_select"
  on profiles for select
  using (id = auth.uid() or is_admin());

-- Users can only update their own profile (name only)
create policy "profiles_update_self"
  on profiles for update
  using (id = auth.uid());

-- ─── Companies ─────────────────────────────────────────────

-- Admin sees all companies; others see only assigned ones
create policy "companies_select"
  on companies for select
  using (
    is_admin()
    or exists (
      select 1 from user_company_access
      where user_id = auth.uid() and company_id = id
    )
  );

-- Admin and Finance can insert companies
create policy "companies_insert"
  on companies for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('Admin', 'Finance')
    )
  );

-- Admin can update any company; Finance can update their assigned ones
create policy "companies_update"
  on companies for update
  using (
    is_admin()
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'Finance')
      and exists (
        select 1 from user_company_access
        where user_id = auth.uid() and company_id = id
      )
    )
  );

-- Only Admin can delete companies
create policy "companies_delete"
  on companies for delete
  using (is_admin());

-- ─── User Company Access ───────────────────────────────────

create policy "uca_select"
  on user_company_access for select
  using (user_id = auth.uid() or is_admin());

create policy "uca_insert"
  on user_company_access for insert
  with check (is_admin());

create policy "uca_delete"
  on user_company_access for delete
  using (is_admin());

-- ─── Contractors ───────────────────────────────────────────

-- Users can see contractors linked to their companies
create policy "contractors_select"
  on contractors for select
  using (
    is_admin()
    or exists (
      select 1
      from contractor_company_links ccl
      join user_company_access uca on uca.company_id = ccl.company_id
      where ccl.contractor_id = id
        and uca.user_id = auth.uid()
    )
  );

create policy "contractors_insert"
  on contractors for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('Admin', 'Finance')
    )
  );

create policy "contractors_update"
  on contractors for update
  using (
    is_admin()
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'Finance')
      and exists (
        select 1
        from contractor_company_links ccl
        join user_company_access uca on uca.company_id = ccl.company_id
        where ccl.contractor_id = id and uca.user_id = auth.uid()
      )
    )
  );

-- ─── Contractor Company Links ──────────────────────────────

create policy "ccl_select"
  on contractor_company_links for select
  using (
    is_admin()
    or exists (
      select 1 from user_company_access
      where user_id = auth.uid() and company_id = contractor_company_links.company_id
    )
  );

create policy "ccl_insert"
  on contractor_company_links for insert
  with check (
    is_admin()
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'Finance')
      and exists (
        select 1 from user_company_access
        where user_id = auth.uid() and company_id = contractor_company_links.company_id
      )
    )
  );

-- ─── Payments ──────────────────────────────────────────────

create policy "payments_select"
  on payments for select
  using (
    is_admin()
    or exists (
      select 1 from user_company_access
      where user_id = auth.uid() and company_id = payments.company_id
    )
  );

create policy "payments_insert"
  on payments for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('Admin','Finance'))
    and (
      is_admin()
      or exists (
        select 1 from user_company_access
        where user_id = auth.uid() and company_id = payments.company_id
      )
    )
  );

create policy "payments_update"
  on payments for update
  using (
    is_admin()
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'Finance')
      and exists (
        select 1 from user_company_access
        where user_id = auth.uid() and company_id = payments.company_id
      )
    )
  );

-- Viewer cannot delete; Finance cannot delete; only Admin
create policy "payments_delete"
  on payments for delete
  using (is_admin());

-- ─── Expenses ──────────────────────────────────────────────

create policy "expenses_select"
  on expenses for select
  using (
    is_admin()
    or exists (
      select 1 from user_company_access
      where user_id = auth.uid() and company_id = expenses.company_id
    )
  );

create policy "expenses_insert"
  on expenses for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('Admin','Finance'))
    and (
      is_admin()
      or exists (
        select 1 from user_company_access
        where user_id = auth.uid() and company_id = expenses.company_id
      )
    )
  );

create policy "expenses_update"
  on expenses for update
  using (
    is_admin()
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'Finance')
      and exists (
        select 1 from user_company_access
        where user_id = auth.uid() and company_id = expenses.company_id
      )
    )
  );

-- ─── Audit Logs ────────────────────────────────────────────

-- Anyone can insert their own logs; Admins see all; others see logs for their companies
create policy "audit_logs_insert"
  on audit_logs for insert
  with check (actor_id = auth.uid());

create policy "audit_logs_select"
  on audit_logs for select
  using (
    is_admin()
    or (
      actor_id = auth.uid()
    )
    or (
      company_id is not null
      and exists (
        select 1 from user_company_access
        where user_id = auth.uid() and company_id = audit_logs.company_id
      )
    )
  );

-- ─── Storage RLS ───────────────────────────────────────────

-- W-9 and receipt uploads: restrict to authenticated users
-- Policy is managed in Supabase Dashboard > Storage > Policies
-- Recommended: allow authenticated users to upload, only allow download via signed URLs from server

create policy "documents_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents');

create policy "documents_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');

create policy "documents_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
