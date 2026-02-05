-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view own or assigned leads" ON public.leads;

-- Create updated policy that allows admins to see all leads
CREATE POLICY "Users can view own or assigned leads, admins see all" 
ON public.leads 
FOR SELECT 
TO authenticated
USING (
  public.is_admin(auth.uid()) 
  OR created_by = auth.uid() 
  OR assigned_to = auth.uid()
);