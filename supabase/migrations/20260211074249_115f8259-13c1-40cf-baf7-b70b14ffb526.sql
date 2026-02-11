
-- Add logo_url column to projects
ALTER TABLE public.projects ADD COLUMN logo_url TEXT DEFAULT NULL;

-- Create storage bucket for project logos
INSERT INTO storage.buckets (id, name, public) VALUES ('project-logos', 'project-logos', true);

-- Allow authenticated users to upload project logos
CREATE POLICY "Authenticated users can upload project logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-logos' AND auth.role() = 'authenticated');

-- Allow public read access to project logos
CREATE POLICY "Project logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-logos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update project logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-logos' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete project logos
CREATE POLICY "Authenticated users can delete project logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-logos' AND auth.role() = 'authenticated');
