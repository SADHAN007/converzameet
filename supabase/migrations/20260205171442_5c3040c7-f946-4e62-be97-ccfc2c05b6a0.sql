-- Create lead_reminders table
CREATE TABLE public.lead_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reminder_time timestamp with time zone NOT NULL,
  notified_30min boolean DEFAULT false,
  notified_15min boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own reminders"
ON public.lead_reminders FOR SELECT
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can create own reminders"
ON public.lead_reminders FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminders"
ON public.lead_reminders FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own reminders"
ON public.lead_reminders FOR DELETE
USING (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_lead_reminders_updated_at
  BEFORE UPDATE ON public.lead_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_reminders;