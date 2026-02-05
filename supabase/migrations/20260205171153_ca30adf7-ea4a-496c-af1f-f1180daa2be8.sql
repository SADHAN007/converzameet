-- Create function to notify when a lead is assigned
CREATE OR REPLACE FUNCTION public.notify_lead_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when assigned_to is set or changed
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.assigned_to,
      'New Lead Assigned',
      'Lead "' || NEW.company_name || '" (Serial: ' || NEW.serial_number || ') has been assigned to you.',
      'lead_assigned'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for lead assignment notifications
DROP TRIGGER IF EXISTS trigger_lead_assignment_notification ON public.leads;
CREATE TRIGGER trigger_lead_assignment_notification
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lead_assignment();