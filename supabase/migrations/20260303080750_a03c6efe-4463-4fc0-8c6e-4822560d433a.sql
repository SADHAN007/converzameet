
-- Make profile_id nullable so clients can exist without a user account
ALTER TABLE public.billing_clients ALTER COLUMN profile_id DROP NOT NULL;

-- Add new fields
ALTER TABLE public.billing_clients
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS secondary_contact text,
  ADD COLUMN IF NOT EXISTS billing_frequency text DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS client_name text;
