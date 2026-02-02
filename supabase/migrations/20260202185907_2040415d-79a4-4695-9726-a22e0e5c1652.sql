-- Create call_requests table for in-app call notifications
CREATE TABLE public.call_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'missed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 seconds')
);

-- Enable RLS
ALTER TABLE public.call_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own calls"
ON public.call_requests FOR SELECT
USING (caller_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can create call requests"
ON public.call_requests FOR INSERT
WITH CHECK (caller_id = auth.uid());

CREATE POLICY "Users can update calls they're part of"
ON public.call_requests FOR UPDATE
USING (caller_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can delete their own calls"
ON public.call_requests FOR DELETE
USING (caller_id = auth.uid());

-- Enable realtime for call_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_requests;

-- Create index for faster queries
CREATE INDEX idx_call_requests_recipient ON public.call_requests(recipient_id, status);
CREATE INDEX idx_call_requests_expires ON public.call_requests(expires_at) WHERE status = 'pending';