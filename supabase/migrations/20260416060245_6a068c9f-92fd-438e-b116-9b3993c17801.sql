
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present',
  check_in_time TIME,
  check_out_time TIME,
  notes TEXT,
  marked_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all attendance"
ON public.attendance FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own attendance"
ON public.attendance FOR SELECT
USING (employee_id = auth.uid());

CREATE POLICY "Managers can insert attendance"
ON public.attendance FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'manager'
  )
);

CREATE POLICY "Managers can update attendance"
ON public.attendance FOR UPDATE
USING (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'manager'
  )
);

CREATE INDEX idx_attendance_employee_date ON public.attendance(employee_id, date);
CREATE INDEX idx_attendance_date ON public.attendance(date);

ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
