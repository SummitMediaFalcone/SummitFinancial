-- Add driver's license storage to contractors
ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS drivers_license_path text,
  ADD COLUMN IF NOT EXISTS drivers_license_updated_at timestamptz;
