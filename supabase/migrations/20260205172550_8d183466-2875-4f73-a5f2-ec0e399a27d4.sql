-- Drop overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can create leads" ON public.leads;

-- Create proper INSERT policy that still allows all users but ensures ownership
CREATE POLICY "Users can create their own leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Also add policy so users can view leads they created (in addition to assigned leads)
DROP POLICY IF EXISTS "Users can view assigned leads" ON public.leads;

CREATE POLICY "Users can view own or assigned leads"
ON public.leads
FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR assigned_to = auth.uid());