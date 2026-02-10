
-- Drop and recreate the SELECT policy to include digital marketers
DROP POLICY IF EXISTS "Users can view attachments of their tasks" ON public.task_attachments;

CREATE POLICY "Users can view attachments of their tasks"
ON public.task_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_attachments.task_id
    AND (
      t.assigned_to = auth.uid()
      OR t.assigned_by = auth.uid()
      OR is_admin(auth.uid())
      OR is_digital_marketer(auth.uid())
    )
  )
);
