
-- Step 1: Add new roles to the app_role enum only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'digital_marketer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'graphic_designer';
