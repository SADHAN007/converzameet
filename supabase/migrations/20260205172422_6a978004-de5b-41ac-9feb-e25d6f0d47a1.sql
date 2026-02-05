-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create leads" ON public.leads;

-- Create new permissive INSERT policy for all authenticated users
CREATE POLICY "Authenticated users can create leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (true);