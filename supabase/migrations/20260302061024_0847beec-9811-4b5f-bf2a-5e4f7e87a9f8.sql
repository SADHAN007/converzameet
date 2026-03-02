
-- Create lead_call_logs table for tracking call dispositions
CREATE TABLE public.lead_call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  called_by UUID NOT NULL,
  call_outcome TEXT NOT NULL,
  interest_status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_call_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can log calls on assigned/own leads"
ON public.lead_call_logs
FOR INSERT
WITH CHECK (
  called_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_call_logs.lead_id
    AND (is_admin(auth.uid()) OR leads.created_by = auth.uid() OR leads.assigned_to = auth.uid())
  )
);

CREATE POLICY "Users can view call logs for their leads"
ON public.lead_call_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_call_logs.lead_id
    AND (is_admin(auth.uid()) OR leads.created_by = auth.uid() OR leads.assigned_to = auth.uid())
  )
);

CREATE POLICY "Admins can delete call logs"
ON public.lead_call_logs
FOR DELETE
USING (is_admin(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_call_logs;
