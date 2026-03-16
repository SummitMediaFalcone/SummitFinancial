-- Expand payment method enum to support Zelle, Wire, ACH, Stripe, Cash
-- We change method from a fixed enum to a text with a check constraint so we can add types easily

ALTER TABLE payments
  ALTER COLUMN method TYPE text;

-- Drop old check constraint if any, add the new one
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_method_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_method_check
  CHECK (method IN ('CHECK', 'ZELLE', 'WIRE', 'ACH', 'STRIPE', 'CASH', 'OTHER'));

-- Also update the type in the TypeScript types manually (see database.types.ts)
