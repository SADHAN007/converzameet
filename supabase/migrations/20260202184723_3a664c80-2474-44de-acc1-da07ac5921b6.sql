-- Add RLS policy for users to update their own meeting participation
CREATE POLICY "Users can update own participation" 
ON public.meeting_participants 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());