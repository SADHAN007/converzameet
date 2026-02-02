-- Add recurrence fields to meetings table
ALTER TABLE public.meetings 
ADD COLUMN recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
ADD COLUMN recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN recurrence_end_date DATE,
ADD COLUMN recurrence_days TEXT[]; -- For weekly: ['monday', 'wednesday', 'friday']

-- Add index for recurring meetings lookup
CREATE INDEX idx_meetings_recurring ON public.meetings(is_recurring) WHERE is_recurring = true;