
-- Update SELECT policy on tasks to allow digital marketers to view all tasks
DROP POLICY IF EXISTS "Users can view tasks assigned to or by them" ON public.tasks;

CREATE POLICY "Users can view tasks assigned to or by them"
ON public.tasks
FOR SELECT
USING (
  is_admin(auth.uid())
  OR assigned_to = auth.uid()
  OR assigned_by = auth.uid()
  OR is_digital_marketer(auth.uid())
);
