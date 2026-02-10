
-- Drop and recreate INSERT policy to allow digital marketers to upload on any task
DROP POLICY IF EXISTS "Users can add attachments to their tasks" ON public.task_attachments;

CREATE POLICY "Users can add attachments to their tasks"
ON public.task_attachments
FOR INSERT
WITH CHECK (
  (uploaded_by = auth.uid()) AND (
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
  )
);
