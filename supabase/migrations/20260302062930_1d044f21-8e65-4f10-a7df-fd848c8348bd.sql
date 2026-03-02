-- Add is_imported flag to distinguish imported leads from manually created ones
ALTER TABLE public.leads ADD COLUMN is_imported boolean NOT NULL DEFAULT false;