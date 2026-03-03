
-- Junction table for billing clients <-> projects (many-to-many)
CREATE TABLE public.billing_client_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_client_id UUID NOT NULL REFERENCES public.billing_clients(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(billing_client_id, project_id)
);

ALTER TABLE public.billing_client_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage billing client projects" ON public.billing_client_projects
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients can view own project assignments" ON public.billing_client_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.billing_clients bc
      WHERE bc.id = billing_client_projects.billing_client_id AND bc.profile_id = auth.uid()
    )
  );
