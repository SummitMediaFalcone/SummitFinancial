-- ============================================================
-- Summit Financial OS — Demo Seed Data
-- ============================================================
-- Run AFTER running migrations 001 and 002.
-- Steps:
--   1. Create two users in Supabase Auth Dashboard:
--      admin@summit.com   (remember the UUID — replace ADMIN_UUID below)
--      finance@summit.com (replace FINANCE_UUID below)
--   2. Replace the UUIDs below with your actual auth user UUIDs
--   3. Run this script in the Supabase SQL Editor
-- ============================================================

-- ── Replace these with your actual auth.users UUIDs ──────────────────────────
\set ADMIN_UUID   'aaaaaaaa-0000-0000-0000-000000000001'
\set FINANCE_UUID 'ffffffff-0000-0000-0000-000000000001'

-- ── Profiles ─────────────────────────────────────────────────────────────────

insert into profiles (id, email, full_name, role) values
  (:'ADMIN_UUID',   'admin@summit.com',   'Summit Admin',   'Admin'),
  (:'FINANCE_UUID', 'finance@summit.com', 'Finance User',   'Finance')
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;

-- ── Companies ────────────────────────────────────────────────────────────────

insert into companies (id, name, dba, ein_masked, address_line1, address_city, address_state, address_zip, phone, bank_name, routing_masked, account_masked, check_start_number, check_layout_type, created_by, updated_by) values
  ('11111111-0000-0000-0000-000000000001', 'Summit Holdings LLC',        'Summit Group',  '**-***7890', '100 Summit Blvd',       'Denver',          'CO', '80202', '(303) 555-0100', 'First National Bank',          '****1234', '****5678', 1001, 'top',         :'ADMIN_UUID', :'ADMIN_UUID'),
  ('11111111-0000-0000-0000-000000000002', 'Alpine Construction Inc',    null,            '**-***4321', '250 Mountain View Dr',  'Boulder',         'CO', '80301', '(303) 555-0200', 'Rocky Mountain Credit Union',  '****9876', '****4321', 5001, 'top',         :'ADMIN_UUID', :'ADMIN_UUID'),
  ('11111111-0000-0000-0000-000000000003', 'Peak Consulting Group',      'Peak Advisory', '**-***5555', '400 Tech Center Dr',    'Colorado Springs','CO', '80903', '(719) 555-0300', 'Wells Fargo',                  '****6789', '****1111', 2001, '3-per-page',  :'ADMIN_UUID', :'ADMIN_UUID'),
  ('11111111-0000-0000-0000-000000000004', 'Crestline Property Mgmt',    null,            '**-***8888', '75 Lakeshore Drive',    'Fort Collins',    'CO', '80524', '(970) 555-0400', 'Chase Bank',                   '****3333', '****7777', 3001, 'top',         :'ADMIN_UUID', :'ADMIN_UUID')
on conflict do nothing;

-- ── User Access ──────────────────────────────────────────────────────────────

-- Admin gets all companies
insert into user_company_access (user_id, company_id) values
  (:'ADMIN_UUID', '11111111-0000-0000-0000-000000000001'),
  (:'ADMIN_UUID', '11111111-0000-0000-0000-000000000002'),
  (:'ADMIN_UUID', '11111111-0000-0000-0000-000000000003'),
  (:'ADMIN_UUID', '11111111-0000-0000-0000-000000000004')
on conflict do nothing;

-- Finance gets comp-1 and comp-2 only
insert into user_company_access (user_id, company_id) values
  (:'FINANCE_UUID', '11111111-0000-0000-0000-000000000001'),
  (:'FINANCE_UUID', '11111111-0000-0000-0000-000000000002')
on conflict do nothing;

-- ── Contractors ──────────────────────────────────────────────────────────────

insert into contractors (id, first_name, last_name, business_name, email, phone, address_line1, address_city, address_state, address_zip, tin_type, tin_masked, created_by, updated_by) values
  ('22222222-0000-0000-0000-000000000001', 'Maria',  'Rodriguez', 'Rodriguez Electric LLC', 'maria@rodriguezelectric.com', '(303) 555-1001', '123 Spark St',       'Denver',          'CO', '80203', 'EIN', '**-***1234', :'ADMIN_UUID', :'ADMIN_UUID'),
  ('22222222-0000-0000-0000-000000000002', 'James',  'Chen',      null,                     'james.chen@email.com',        '(303) 555-1002', '456 Oak Ave',        'Boulder',         'CO', '80302', 'SSN', '***-**-4567', :'ADMIN_UUID', :'ADMIN_UUID'),
  ('22222222-0000-0000-0000-000000000003', 'Sarah',  'Thompson',  'Thompson Design Studio', 'sarah@thompsondesign.com',    '(719) 555-1003', '789 Creative Way',   'Colorado Springs','CO', '80904', 'EIN', '**-***7890', :'ADMIN_UUID', :'ADMIN_UUID'),
  ('22222222-0000-0000-0000-000000000004', 'David',  'Nguyen',    null,                     'david.nguyen@email.com',      '(970) 555-1004', '321 Pine Ln',        'Fort Collins',    'CO', '80525', 'SSN', '***-**-8901', :'ADMIN_UUID', :'ADMIN_UUID'),
  ('22222222-0000-0000-0000-000000000005', 'Angela', 'Patel',     'Patel IT Solutions',     'angela@patelit.com',          '(303) 555-1005', '654 Tech Park Blvd', 'Denver',          'CO', '80204', 'EIN', '**-***2345', :'ADMIN_UUID', :'ADMIN_UUID'),
  ('22222222-0000-0000-0000-000000000006', 'Robert', 'Kim',       null,                     'robert.kim@email.com',        '(303) 555-1006', '987 Elm St',         'Denver',          'CO', '80205', 'SSN', '***-**-3456', :'ADMIN_UUID', :'ADMIN_UUID')
on conflict do nothing;

-- ── Contractor ↔ Company Links ───────────────────────────────────────────────

insert into contractor_company_links (contractor_id, company_id, default_category) values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Electrical'),
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'Electrical'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Consulting'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', 'Consulting'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Design'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Design'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', 'Labor'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'Maintenance'),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 'IT Services'),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000003', 'IT Services'),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000004', 'IT Services'),
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000004', 'Labor')
on conflict do nothing;

-- ── Payments ─────────────────────────────────────────────────────────────────

insert into payments (company_id, contractor_id, amount_cents, payment_date, check_number, status, memo, category, created_by, updated_by) values
  ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 450000, '2026-01-15', 1001, 'CLEARED',  'Electrical wiring - Building A',  'Electrical',  :'ADMIN_UUID', :'ADMIN_UUID'),
  ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 250000, '2026-01-22', 1002, 'CLEARED',  'January consulting',               'Consulting',  :'ADMIN_UUID', :'ADMIN_UUID'),
  ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 320000, '2026-02-01', 5001, 'PRINTED',  'Panel installation - Phase 1',     'Electrical',  :'ADMIN_UUID', :'ADMIN_UUID'),
  ('11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', 180000, '2026-02-05', 2001, 'CLEARED',  'Logo redesign project',            'Design',      :'FINANCE_UUID', :'FINANCE_UUID'),
  ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000005', 750000, '2026-02-10', 1003, 'PRINTED',  'Server migration project',         'IT Services', :'ADMIN_UUID', :'ADMIN_UUID'),
  ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000004', 125000, '2026-02-15', 3001, 'CLEARED',  'February maintenance',             'Maintenance', :'FINANCE_UUID', :'FINANCE_UUID'),
  ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', 350000, '2026-02-18', null, 'DRAFT',    'Brand guidelines update',          'Design',      :'ADMIN_UUID', :'ADMIN_UUID'),
  ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004', 280000, '2026-02-20', 5002, 'PRINTED',  'Framing labor - Lot 7',            'Labor',       :'ADMIN_UUID', :'ADMIN_UUID'),
  ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000006',  95000, '2026-02-22', null, 'DRAFT',    'Landscaping work',                 'Labor',       :'FINANCE_UUID', :'FINANCE_UUID'),
  ('11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000005', 420000, '2026-02-25', 2002, 'VOID',     'Network setup - VOIDED',           'IT Services', :'ADMIN_UUID', :'ADMIN_UUID')
on conflict do nothing;

-- ── Expenses ─────────────────────────────────────────────────────────────────

insert into expenses (company_id, vendor, amount_cents, expense_date, category, method, created_by) values
  ('11111111-0000-0000-0000-000000000001', 'Office Depot',       34599,  '2026-01-10', 'Office Supplies', 'Credit Card', :'ADMIN_UUID'),
  ('11111111-0000-0000-0000-000000000001', 'Comcast Business',   18999,  '2026-01-15', 'Utilities',       'ACH',         :'ADMIN_UUID'),
  ('11111111-0000-0000-0000-000000000002', 'Home Depot',         287543, '2026-01-20', 'Materials',       'Credit Card', :'ADMIN_UUID'),
  ('11111111-0000-0000-0000-000000000003', 'Adobe Creative Cloud', 5499, '2026-02-01', 'Software',        'Credit Card', :'FINANCE_UUID'),
  ('11111111-0000-0000-0000-000000000004', 'Xcel Energy',        42375,  '2026-02-05', 'Utilities',       'ACH',         :'FINANCE_UUID'),
  ('11111111-0000-0000-0000-000000000001', 'FedEx',               8750,  '2026-02-12', 'Shipping',        'Credit Card', :'ADMIN_UUID')
on conflict do nothing;
