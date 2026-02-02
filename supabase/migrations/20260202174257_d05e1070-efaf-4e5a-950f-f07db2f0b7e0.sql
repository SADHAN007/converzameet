-- Add is_sent column to moms table to track if MOM has been published to participants
ALTER TABLE public.moms ADD COLUMN is_sent BOOLEAN DEFAULT false;

-- Add sent_at timestamp to track when the MOM was sent
ALTER TABLE public.moms ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;