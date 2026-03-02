
CREATE TABLE public.lead_import_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_import_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all import runs" ON public.lead_import_runs
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own import runs" ON public.lead_import_runs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own import runs" ON public.lead_import_runs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own import runs" ON public.lead_import_runs
  FOR UPDATE USING (user_id = auth.uid());
