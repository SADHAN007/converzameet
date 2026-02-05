-- Drop the restrictive BD Marketing INSERT policy
DROP POLICY IF EXISTS "BD Marketing can create leads" ON public.leads;

-- Create new policy allowing all authenticated users to create leads
CREATE POLICY "Authenticated users can create leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);