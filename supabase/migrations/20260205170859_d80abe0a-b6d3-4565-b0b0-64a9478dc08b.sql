-- Create function to check if user has bd_marketing role
CREATE OR REPLACE FUNCTION public.is_bd_marketing(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'bd_marketing'
  )
$$;

-- Drop existing insert policy and create new one for bd_marketing only
DROP POLICY IF EXISTS "Users can create leads" ON public.leads;

CREATE POLICY "BD Marketing can create leads"
ON public.leads
FOR INSERT
WITH CHECK (
  auth.uid() = created_by 
  AND (public.is_admin(auth.uid()) OR public.is_bd_marketing(auth.uid()))
);