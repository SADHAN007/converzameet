-- Add meeting_type enum and column to meetings table
CREATE TYPE public.meeting_type AS ENUM ('online', 'offline');

ALTER TABLE public.meetings 
ADD COLUMN meeting_type public.meeting_type NOT NULL DEFAULT 'online';

-- Create a database function to send notifications when meeting participants are added
CREATE OR REPLACE FUNCTION public.notify_meeting_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    meeting_record RECORD;
BEGIN
    -- Get meeting details
    SELECT id, title, start_time, project_id 
    INTO meeting_record 
    FROM public.meetings 
    WHERE id = NEW.meeting_id;
    
    -- Insert notification for the participant
    INSERT INTO public.notifications (user_id, title, message, type, project_id)
    VALUES (
        NEW.user_id,
        'Meeting Invitation',
        'You have been invited to: ' || meeting_record.title || ' on ' || to_char(meeting_record.start_time, 'Mon DD, YYYY at HH12:MI AM'),
        'meeting_invite',
        meeting_record.project_id
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger to notify participants when added to a meeting
CREATE TRIGGER trigger_notify_meeting_participant
AFTER INSERT ON public.meeting_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_meeting_participant();

-- Create a function to notify MOM participants when MOM is sent
CREATE OR REPLACE FUNCTION public.notify_mom_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    participant_record RECORD;
BEGIN
    -- Only trigger when is_sent changes from false to true
    IF NEW.is_sent = true AND (OLD.is_sent = false OR OLD.is_sent IS NULL) THEN
        -- Notify all participants
        FOR participant_record IN 
            SELECT user_id FROM public.mom_participants WHERE mom_id = NEW.id
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, project_id)
            VALUES (
                participant_record.user_id,
                'New Meeting Minutes',
                'Meeting minutes "' || NEW.title || '" has been shared with you. Please review and approve.',
                'mom_sent',
                NEW.project_id
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to notify when MOM is sent
CREATE TRIGGER trigger_notify_mom_sent
AFTER UPDATE ON public.moms
FOR EACH ROW
EXECUTE FUNCTION public.notify_mom_sent();