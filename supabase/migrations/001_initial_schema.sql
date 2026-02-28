-- ============================================================
-- Summit Financial OS — Supabase SQL Migration
-- Run this in the Supabase SQL Editor or via supabase db push
-- ============================================================

-- ─── Extensions ────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── Enums ─────────────────────────────────────────────────────────────────

create type user_role as enum ('Admin', 'Finance', 'Viewer');

-- ─── Profiles ──────────────────────────────────────────────────────────────

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        user_role not null default 'Finance',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, role)
  values (new.id, new.email, 'Finance')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Companies ─────────────────────────────────────────────────────────────

create table companies (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  dba                 text,
  ein_masked          text not null,
  ein_encrypted       text, -- AES-256-GCM encrypted, base64
  address_line1       text not null,
  address_line2       text,
  address_city        text not null,
  address_state       char(2) not null,
  address_zip         text not null,
  phone               text not null,
  bank_name           text,
  routing_masked      text,
  routing_encrypted   text,
  account_masked      text,
  account_encrypted   text,
  check_start_number  integer not null default 1001,
  check_layout_type   text not null default 'top' check (check_layout_type in ('top','3-per-page')),
  print_offset_x      integer not null default 0,
  print_offset_y      integer not null default 0,
  created_by          uuid references auth.users(id),
  updated_by          uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── User ↔ Company Access ─────────────────────────────────────────────────

create table user_company_access (
  user_id     uuid not null references auth.users(id) on delete cascade,
  company_id  uuid not null references companies(id) on delete cascade,
  granted_at  timestamptz not null default now(),
  primary key (user_id, company_id)
);

-- ─── Contractors ───────────────────────────────────────────────────────────

create table contractors (
  id              uuid primary key default gen_random_uuid(),
  first_name      text not null,
  last_name       text not null,
  business_name   text,
  email           text not null,
  phone           text not null,
  address_line1   text not null,
  address_line2   text,
  address_city    text not null,
  address_state   char(2) not null,
  address_zip     text not null,
  tin_type        text not null check (tin_type in ('SSN','EIN')),
  tin_masked      text not null, -- e.g. ***-**-6789
  tin_encrypted   text,          -- AES-256-GCM encrypted, base64
  w9_file_path    text,          -- path in Supabase Storage 'documents' bucket
  notes           text,
  created_by      uuid references auth.users(id),
  updated_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Contractor ↔ Company Links ────────────────────────────────────────────

create table contractor_company_links (
  contractor_id    uuid not null references contractors(id) on delete cascade,
  company_id       uuid not null references companies(id) on delete cascade,
  default_memo     text,
  default_category text,
  created_at       timestamptz not null default now(),
  primary key (contractor_id, company_id)
);

-- ─── Payments ──────────────────────────────────────────────────────────────

create table payments (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete restrict,
  contractor_id  uuid not null references contractors(id) on delete restrict,
  amount_cents   integer not null check (amount_cents > 0),
  payment_date   date not null,
  method         text not null default 'CHECK' check (method = 'CHECK'),
  check_number   integer,
  status         text not null default 'DRAFT'
                   check (status in ('DRAFT','PRINTED','VOID','CLEARED')),
  memo           text not null,
  category       text not null,
  created_by     uuid references auth.users(id),
  updated_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Prevent two payments in same company from having the same check number
create unique index payments_company_check_number_idx
  on payments (company_id, check_number)
  where check_number is not null;

-- ─── Atomic Check Number Assignment ───────────────────────────────────────

create or replace function get_next_check_number(p_company_id uuid)
returns integer language plpgsql security definer as $$
declare
  v_next integer;
begin
  -- Lock the company row to prevent concurrent assignment
  select check_start_number into v_next
  from companies
  where id = p_company_id
  for update;

  -- Advance the counter atomically
  update companies
  set check_start_number = check_start_number + 1,
      updated_at = now()
  where id = p_company_id;

  return v_next;
end;
$$;

-- ─── Expenses ──────────────────────────────────────────────────────────────

create table expenses (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete restrict,
  vendor            text not null,
  amount_cents      integer not null check (amount_cents > 0),
  expense_date      date not null,
  category          text not null,
  method            text not null,
  receipt_file_path text,
  notes             text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── Audit Logs ────────────────────────────────────────────────────────────

create table audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references auth.users(id),
  actor_email  text,
  action       text not null,
  entity_type  text not null,
  entity_id    text not null,
  company_id   uuid references companies(id),
  meta         jsonb,
  created_at   timestamptz not null default now()
);

-- Audit logs are append-only — no updates or deletes
create rule audit_logs_no_update as on update to audit_logs do instead nothing;
create rule audit_logs_no_delete as on delete to audit_logs do instead nothing;

-- ─── Updated_at Trigger ────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_companies_updated_at
  before update on companies
  for each row execute procedure set_updated_at();

create trigger set_contractors_updated_at
  before update on contractors
  for each row execute procedure set_updated_at();

create trigger set_payments_updated_at
  before update on payments
  for each row execute procedure set_updated_at();

create trigger set_expenses_updated_at
  before update on expenses
  for each row execute procedure set_updated_at();

-- ─── Storage Bucket ────────────────────────────────────────────────────────
-- Run in Supabase Dashboard > Storage, or via management API:
-- Create a private bucket named "documents"
-- Set max file size to 10MB and allowed MIME types:
-- application/pdf, image/jpeg, image/png, image/webp

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict do nothing;
