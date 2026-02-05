-- Create lead_activities table for tracking history
CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID,
  activity_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_created_at ON public.lead_activities(created_at DESC);

-- RLS Policies: Users can view activities for leads they can access
CREATE POLICY "Users can view lead activities"
ON public.lead_activities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_activities.lead_id
    AND (
      public.is_admin(auth.uid())
      OR leads.created_by = auth.uid()
      OR leads.assigned_to = auth.uid()
    )
  )
);

-- Users can insert activities for leads they can access
CREATE POLICY "Users can create lead activities"
ON public.lead_activities
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_activities.lead_id
    AND (
      public.is_admin(auth.uid())
      OR leads.created_by = auth.uid()
      OR leads.assigned_to = auth.uid()
    )
  )
  AND user_id = auth.uid()
);

-- Admins can delete activities
CREATE POLICY "Admins can delete lead activities"
ON public.lead_activities
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create function to log lead status changes
CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_activities (lead_id, user_id, activity_type, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'status_change', OLD.status::TEXT, NEW.status::TEXT);
  END IF;
  
  -- Log assignment changes
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.lead_activities (lead_id, user_id, activity_type, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'assignment', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT);
  END IF;
  
  -- Log deal value changes
  IF OLD.deal_value IS DISTINCT FROM NEW.deal_value AND NEW.deal_value IS NOT NULL THEN
    INSERT INTO public.lead_activities (lead_id, user_id, activity_type, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'deal_value', OLD.deal_value::TEXT, NEW.deal_value::TEXT);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for logging changes
CREATE TRIGGER log_lead_changes
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_lead_status_change();

-- Create function to log lead creation
CREATE OR REPLACE FUNCTION public.log_lead_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.lead_activities (lead_id, user_id, activity_type, new_value)
  VALUES (NEW.id, auth.uid(), 'created', NEW.company_name);
  
  RETURN NEW;
END;
$$;

-- Create trigger for logging creation
CREATE TRIGGER log_lead_creation
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_lead_creation();

-- Enable realtime for lead_activities
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;