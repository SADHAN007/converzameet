-- Add theme preference column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'navy';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.theme_preference IS 'User selected theme: navy, teal, purple, red';