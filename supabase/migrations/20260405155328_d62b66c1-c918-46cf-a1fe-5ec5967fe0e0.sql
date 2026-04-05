-- Add profile columns to organisations table
ALTER TABLE public.organisations 
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS org_type text NOT NULL DEFAULT 'school',
  ADD COLUMN IF NOT EXISTS join_approval_required boolean NOT NULL DEFAULT true;
