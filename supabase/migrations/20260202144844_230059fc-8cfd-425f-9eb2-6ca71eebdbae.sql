-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.project_role AS ENUM ('owner', 'member', 'viewer');
CREATE TYPE public.meeting_status AS ENUM ('scheduled', 'completed', 'cancelled');

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create project_members junction table
CREATE TABLE public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role project_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Create chat_messages table (direct on project for simplicity)
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create moms (Minutes of Meeting) table
CREATE TABLE public.moms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create meetings table
CREATE TABLE public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    meeting_link TEXT,
    status meeting_status NOT NULL DEFAULT 'scheduled',
    is_recurring BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create meeting_participants table
CREATE TABLE public.meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_attending BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(meeting_id, user_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = 'admin'
    )
$$;

-- Create helper function to check project membership
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_admin(_user_id) OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE user_id = _user_id AND project_id = _project_id
    )
$$;

-- Create helper function to check meeting participation
CREATE OR REPLACE FUNCTION public.is_meeting_participant(_user_id UUID, _meeting_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_admin(_user_id) OR EXISTS (
        SELECT 1 FROM public.meeting_participants
        WHERE user_id = _user_id AND meeting_id = _meeting_id
    )
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_moms_updated_at BEFORE UPDATE ON public.moms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- RLS Policies for user_roles (admin-only management)
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS Policies for projects
CREATE POLICY "Admins can view all projects" ON public.projects FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Members can view assigned projects" ON public.projects FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid()));
CREATE POLICY "Admins can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update projects" ON public.projects FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- RLS Policies for project_members
CREATE POLICY "View project members if admin or member" ON public.project_members FOR SELECT TO authenticated 
    USING (public.is_admin(auth.uid()) OR public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Admins can manage project members" ON public.project_members FOR ALL TO authenticated 
    USING (public.is_admin(auth.uid()));

-- RLS Policies for chat_messages
CREATE POLICY "View messages if project member" ON public.chat_messages FOR SELECT TO authenticated 
    USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Send messages if project member" ON public.chat_messages FOR INSERT TO authenticated 
    WITH CHECK (public.is_project_member(auth.uid(), project_id) AND user_id = auth.uid());
CREATE POLICY "Delete own messages" ON public.chat_messages FOR DELETE TO authenticated 
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- RLS Policies for moms
CREATE POLICY "View MOMs if project member" ON public.moms FOR SELECT TO authenticated 
    USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Create MOMs if project member" ON public.moms FOR INSERT TO authenticated 
    WITH CHECK (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Update MOMs if project member" ON public.moms FOR UPDATE TO authenticated 
    USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Delete MOMs if admin" ON public.moms FOR DELETE TO authenticated 
    USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

-- RLS Policies for meetings
CREATE POLICY "View meetings if participant" ON public.meetings FOR SELECT TO authenticated 
    USING (public.is_admin(auth.uid()) OR public.is_meeting_participant(auth.uid(), id));
CREATE POLICY "Create meetings if project member" ON public.meetings FOR INSERT TO authenticated 
    WITH CHECK (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Update meetings if creator or admin" ON public.meetings FOR UPDATE TO authenticated 
    USING (public.is_admin(auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Delete meetings if admin or creator" ON public.meetings FOR DELETE TO authenticated 
    USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

-- RLS Policies for meeting_participants
CREATE POLICY "View participants if participant" ON public.meeting_participants FOR SELECT TO authenticated 
    USING (public.is_admin(auth.uid()) OR public.is_meeting_participant(auth.uid(), meeting_id));
CREATE POLICY "Manage participants if admin" ON public.meeting_participants FOR ALL TO authenticated 
    USING (public.is_admin(auth.uid()));

-- RLS Policies for notifications
CREATE POLICY "View own notifications" ON public.notifications FOR SELECT TO authenticated 
    USING (user_id = auth.uid());
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE TO authenticated 
    USING (user_id = auth.uid());
CREATE POLICY "Admin can create notifications" ON public.notifications FOR INSERT TO authenticated 
    WITH CHECK (public.is_admin(auth.uid()) OR user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_project_members_user ON public.project_members(user_id);
CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_chat_messages_project ON public.chat_messages(project_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX idx_moms_project ON public.moms(project_id);
CREATE INDEX idx_meetings_project ON public.meetings(project_id);
CREATE INDEX idx_meetings_start ON public.meetings(start_time);
CREATE INDEX idx_meeting_participants_user ON public.meeting_participants(user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;