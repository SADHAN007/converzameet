-- Create a table for MOM participants (users tagged in MOM)
CREATE TABLE public.mom_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    mom_id UUID NOT NULL REFERENCES public.moms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    has_agreed BOOLEAN DEFAULT false,
    agreed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(mom_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.mom_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for mom_participants
CREATE POLICY "View participants if project member" 
ON public.mom_participants 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.moms m
        WHERE m.id = mom_id AND is_project_member(auth.uid(), m.project_id)
    )
);

CREATE POLICY "Add participants if MOM creator or admin" 
ON public.mom_participants 
FOR INSERT 
WITH CHECK (
    is_admin(auth.uid()) OR 
    EXISTS (
        SELECT 1 FROM public.moms m
        WHERE m.id = mom_id AND m.created_by = auth.uid()
    )
);

CREATE POLICY "Users can agree to their own participation" 
ON public.mom_participants 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Delete participants if MOM creator or admin" 
ON public.mom_participants 
FOR DELETE 
USING (
    is_admin(auth.uid()) OR 
    EXISTS (
        SELECT 1 FROM public.moms m
        WHERE m.id = mom_id AND m.created_by = auth.uid()
    )
);