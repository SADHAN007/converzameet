-- Create chat_groups table
CREATE TABLE public.chat_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  is_direct_message BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_group_members table
CREATE TABLE public.chat_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group_messages table
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message_read_receipts table
CREATE TABLE public.message_read_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a group member
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE group_id = _group_id AND user_id = _user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS Policies for chat_groups
CREATE POLICY "Users can view groups they are members of"
ON public.chat_groups FOR SELECT
USING (public.is_group_member(id, auth.uid()));

CREATE POLICY "Users can create groups"
ON public.chat_groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
ON public.chat_groups FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE group_id = id AND user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Group admins can delete groups"
ON public.chat_groups FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE group_id = id AND user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for chat_group_members
CREATE POLICY "Users can view members of their groups"
ON public.chat_group_members FOR SELECT
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Group admins can add members"
ON public.chat_group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE group_id = chat_group_members.group_id AND user_id = auth.uid() AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.chat_groups
    WHERE id = chat_group_members.group_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Group admins can remove members"
ON public.chat_group_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_group_members AS m
    WHERE m.group_id = chat_group_members.group_id AND m.user_id = auth.uid() AND m.role = 'admin'
  )
  OR user_id = auth.uid()
);

-- RLS Policies for group_messages
CREATE POLICY "Users can view messages in their groups"
ON public.group_messages FOR SELECT
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Users can send messages to their groups"
ON public.group_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND public.is_group_member(group_id, auth.uid())
);

CREATE POLICY "Users can edit their own messages"
ON public.group_messages FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.group_messages FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for message_read_receipts
CREATE POLICY "Users can view read receipts for messages in their groups"
ON public.message_read_receipts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    WHERE gm.id = message_id AND public.is_group_member(gm.group_id, auth.uid())
  )
);

CREATE POLICY "Users can mark messages as read"
ON public.message_read_receipts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

-- Storage policies for chat attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_chat_groups_updated_at
BEFORE UPDATE ON public.chat_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_messages_updated_at
BEFORE UPDATE ON public.group_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();