-- Create storage bucket for MOM attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('mom-attachments', 'mom-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for mom-attachments bucket
CREATE POLICY "Authenticated users can upload MOM attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mom-attachments');

CREATE POLICY "Anyone can view MOM attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'mom-attachments');

CREATE POLICY "Users can delete their own MOM attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mom-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create mom_attachments table
CREATE TABLE public.mom_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mom_id UUID NOT NULL REFERENCES public.moms(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on mom_attachments
ALTER TABLE public.mom_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for mom_attachments
CREATE POLICY "Users can view attachments if project member"
ON public.mom_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM moms m 
    WHERE m.id = mom_attachments.mom_id 
    AND is_project_member(auth.uid(), m.project_id)
  )
);

CREATE POLICY "Users can add attachments if MOM creator"
ON public.mom_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM moms m 
    WHERE m.id = mom_attachments.mom_id 
    AND (m.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Users can delete attachments if MOM creator or admin"
ON public.mom_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM moms m 
    WHERE m.id = mom_attachments.mom_id 
    AND (m.created_by = auth.uid() OR is_admin(auth.uid()))
  ) OR uploaded_by = auth.uid()
);