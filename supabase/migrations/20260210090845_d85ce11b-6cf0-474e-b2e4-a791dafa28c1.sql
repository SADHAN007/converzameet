
-- Create trigger to notify on task status changes
CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _title TEXT;
  _message TEXT;
  _target_user UUID;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'in_review' AND NEW.assigned_by IS NOT NULL THEN
    _target_user := NEW.assigned_by;
    _title := 'Task Sent for Approval';
    _message := 'Task "' || NEW.task_name || '" has been submitted for your approval.';
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_target_user, _title, _message, 'task_review');
  END IF;

  IF NEW.status = 'approved' AND NEW.assigned_to IS NOT NULL THEN
    _target_user := NEW.assigned_to;
    _title := 'Task Approved';
    _message := 'Your task "' || NEW.task_name || '" has been approved.';
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_target_user, _title, _message, 'task_approved');
  END IF;

  IF NEW.status = 'rejected' AND NEW.assigned_to IS NOT NULL THEN
    _target_user := NEW.assigned_to;
    _title := 'Task Rejected';
    _message := 'Your task "' || NEW.task_name || '" has been rejected. Please review and resubmit.';
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_target_user, _title, _message, 'task_rejected');
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists and recreate trigger
DROP TRIGGER IF EXISTS on_task_status_change ON public.tasks;
CREATE TRIGGER on_task_status_change
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_status_change();
