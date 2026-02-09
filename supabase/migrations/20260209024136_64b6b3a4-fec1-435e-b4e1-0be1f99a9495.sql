
-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'in_review', 'approved', 'rejected', 'completed');

-- Create task priority enum
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deadline TIMESTAMP WITH TIME ZONE,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'todo',
  remark TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task attachments table
CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_digital_marketer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'digital_marketer'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_graphic_designer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'graphic_designer'
  )
$$;

-- Tasks RLS
CREATE POLICY "Admins can manage all tasks" ON public.tasks FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Digital marketers can create tasks" ON public.tasks FOR INSERT WITH CHECK (is_digital_marketer(auth.uid()) AND assigned_by = auth.uid());
CREATE POLICY "Digital marketers can update their tasks" ON public.tasks FOR UPDATE USING (is_digital_marketer(auth.uid()) AND assigned_by = auth.uid());
CREATE POLICY "Digital marketers can delete their tasks" ON public.tasks FOR DELETE USING (is_digital_marketer(auth.uid()) AND assigned_by = auth.uid());
CREATE POLICY "Users can view tasks assigned to or by them" ON public.tasks FOR SELECT USING (is_admin(auth.uid()) OR assigned_to = auth.uid() OR assigned_by = auth.uid());
CREATE POLICY "Assigned users can update task status" ON public.tasks FOR UPDATE USING (assigned_to = auth.uid());

-- Task attachments RLS
CREATE POLICY "Admins can manage all task attachments" ON public.task_attachments FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can view attachments of their tasks" ON public.task_attachments FOR SELECT USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id AND (t.assigned_to = auth.uid() OR t.assigned_by = auth.uid() OR is_admin(auth.uid()))));
CREATE POLICY "Users can add attachments to their tasks" ON public.task_attachments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id AND (t.assigned_to = auth.uid() OR t.assigned_by = auth.uid())) AND uploaded_by = auth.uid());
CREATE POLICY "Users can delete own attachments" ON public.task_attachments FOR DELETE USING (uploaded_by = auth.uid() OR is_admin(auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Authenticated users can upload task attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "Task attachments are publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'task-attachments');
CREATE POLICY "Users can delete own task attachments" ON storage.objects FOR DELETE USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

-- Trigger
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
