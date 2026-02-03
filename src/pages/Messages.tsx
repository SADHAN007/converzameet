import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Paperclip, Search, Plus, Users, MessageSquare, 
  MoreVertical, Settings, Trash2, UserPlus, X, Check,
  CheckCheck, Image, File, Download, Hash
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import CallButton from '@/components/call/CallButton';

interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_direct_message: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message?: GroupMessage | null;
  unread_count?: number;
  members?: GroupMember[];
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  read_by?: string[];
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDMDialog, setShowDMDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch groups
  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchAllUsers();
    }
  }, [user]);

  // Fetch messages when group changes
  useEffect(() => {
    if (selectedGroup) {
      fetchMessages(selectedGroup.id);
      subscribeToMessages(selectedGroup.id);
      markMessagesAsRead(selectedGroup.id);
    }
  }, [selectedGroup?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchGroups = async () => {
    if (!user) return;
    
    try {
      // Fetch groups where user is a member
      const { data: memberData } = await supabase
        .from('chat_group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (!memberData || memberData.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const groupIds = memberData.map(m => m.group_id);
      
      const { data: groupsData } = await supabase
        .from('chat_groups')
        .select('*')
        .in('id', groupIds)
        .order('updated_at', { ascending: false });

      if (groupsData) {
        // Fetch members for each group
        const groupsWithMembers = await Promise.all(
          groupsData.map(async (group) => {
            const { data: members } = await supabase
              .from('chat_group_members')
              .select('*')
              .eq('group_id', group.id);

            if (members) {
              const userIds = members.map(m => m.user_id);
              const { data: profiles } = await supabase
                .from('profiles_public')
                .select('id, full_name, email, avatar_url')
                .in('id', userIds);

              const membersWithProfiles = members.map(m => ({
                ...m,
                profile: profiles?.find(p => p.id === m.user_id)
              }));

              return { ...group, members: membersWithProfiles };
            }
            return group;
          })
        );

        setGroups(groupsWithMembers);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from('profiles_public')
      .select('id, full_name, email, avatar_url')
      .eq('is_active', true);
    
    if (data) {
      setAllUsers(data.filter(u => u.id !== user?.id) as Profile[]);
    }
  };

  const fetchMessages = async (groupId: string) => {
    const { data: messagesData } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (messagesData) {
      // Fetch profiles and read receipts
      const userIds = [...new Set(messagesData.map(m => m.user_id))];
      const messageIds = messagesData.map(m => m.id);
      
      const [profilesRes, receiptsRes] = await Promise.all([
        supabase.from('profiles_public').select('id, full_name, email, avatar_url').in('id', userIds),
        supabase.from('message_read_receipts').select('message_id, user_id').in('message_id', messageIds)
      ]);

      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]));
      const receiptsMap = new Map<string, string[]>();
      receiptsRes.data?.forEach(r => {
        if (!receiptsMap.has(r.message_id)) {
          receiptsMap.set(r.message_id, []);
        }
        receiptsMap.get(r.message_id)!.push(r.user_id);
      });

      setMessages(messagesData.map(m => ({
        ...m,
        profile: profilesMap.get(m.user_id) as Profile | undefined,
        read_by: receiptsMap.get(m.id) || []
      })));
    }
  };

  const subscribeToMessages = (groupId: string) => {
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const newMsg = payload.new as GroupMessage;
          const { data: profile } = await supabase
            .from('profiles_public')
            .select('id, full_name, email, avatar_url')
            .eq('id', newMsg.user_id)
            .maybeSingle();

          setMessages(prev => [...prev, { ...newMsg, profile: profile as Profile | undefined, read_by: [] }]);
          
          // Mark as read if not our own message
          if (newMsg.user_id !== user?.id) {
            markMessageAsRead(newMsg.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_read_receipts',
        },
        (payload) => {
          const receipt = payload.new as { message_id: string; user_id: string };
          setMessages(prev => prev.map(m => 
            m.id === receipt.message_id 
              ? { ...m, read_by: [...(m.read_by || []), receipt.user_id] }
              : m
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markMessagesAsRead = async (groupId: string) => {
    if (!user) return;
    
    const { data: unreadMessages } = await supabase
      .from('group_messages')
      .select('id')
      .eq('group_id', groupId)
      .neq('user_id', user.id);

    if (unreadMessages) {
      for (const msg of unreadMessages) {
        await markMessageAsRead(msg.id);
      }
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    if (!user) return;
    
    await supabase
      .from('message_read_receipts')
      .upsert({ message_id: messageId, user_id: user.id }, { onConflict: 'message_id,user_id' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup || !user) return;

    setSending(true);
    try {
      await supabase.from('group_messages').insert({
        group_id: selectedGroup.id,
        user_id: user.id,
        content: newMessage.trim(),
      });

      // Update group's updated_at
      await supabase
        .from('chat_groups')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedGroup.id);

      setNewMessage('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      await supabase.from('group_messages').insert({
        group_id: selectedGroup.id,
        user_id: user.id,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      });

      await supabase
        .from('chat_groups')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedGroup.id);

      toast({ title: 'File sent!' });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const createGroup = async () => {
    if (!user || !groupName.trim() || selectedUsers.length === 0) return;

    try {
      // Create group
      const { data: group, error: groupError } = await supabase
        .from('chat_groups')
        .insert({
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          created_by: user.id,
          is_direct_message: false,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin
      await supabase.from('chat_group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
      });

      // Add selected members
      await supabase.from('chat_group_members').insert(
        selectedUsers.map(userId => ({
          group_id: group.id,
          user_id: userId,
          role: 'member',
        }))
      );

      toast({ title: 'Group created!' });
      setShowCreateDialog(false);
      setGroupName('');
      setGroupDescription('');
      setSelectedUsers([]);
      fetchGroups();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const startDirectMessage = async (otherUser: Profile) => {
    if (!user) return;

    try {
      // Check if DM already exists
      const { data: existingMembers } = await supabase
        .from('chat_group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (existingMembers) {
        for (const member of existingMembers) {
          const { data: group } = await supabase
            .from('chat_groups')
            .select('*')
            .eq('id', member.group_id)
            .eq('is_direct_message', true)
            .single();

          if (group) {
            const { data: otherMember } = await supabase
              .from('chat_group_members')
              .select('user_id')
              .eq('group_id', group.id)
              .eq('user_id', otherUser.id)
              .maybeSingle();

            if (otherMember) {
              // DM already exists, select it
              setSelectedGroup(group);
              setShowDMDialog(false);
              return;
            }
          }
        }
      }

      // Create new DM
      const dmName = `${user.email} & ${otherUser.email}`;
      const { data: group, error: groupError } = await supabase
        .from('chat_groups')
        .insert({
          name: dmName,
          created_by: user.id,
          is_direct_message: true,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add both users
      await supabase.from('chat_group_members').insert([
        { group_id: group.id, user_id: user.id, role: 'admin' },
        { group_id: group.id, user_id: otherUser.id, role: 'admin' },
      ]);

      toast({ title: `Started conversation with ${otherUser.full_name || otherUser.email}` });
      setShowDMDialog(false);
      fetchGroups();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      await supabase.from('chat_groups').delete().eq('id', groupId);
      toast({ title: 'Group deleted' });
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
      fetchGroups();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('chat_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      toast({ title: 'Left group' });
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
      fetchGroups();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getDMDisplayName = (group: ChatGroup) => {
    if (!group.is_direct_message || !group.members) return group.name;
    const otherMember = group.members.find(m => m.user_id !== user?.id);
    return otherMember?.profile?.full_name || otherMember?.profile?.email || group.name;
  };

  const getDMAvatar = (group: ChatGroup) => {
    if (!group.is_direct_message || !group.members) return null;
    const otherMember = group.members.find(m => m.user_id !== user?.id);
    return otherMember?.profile?.avatar_url || null;
  };

  const getOtherDMUser = (group: ChatGroup): Profile | null => {
    if (!group.is_direct_message || !group.members) return null;
    const otherMember = group.members.find(m => m.user_id !== user?.id);
    return otherMember?.profile as Profile | null;
  };

  const isGroupAdmin = (group: ChatGroup) => {
    return group.members?.some(m => m.user_id === user?.id && m.role === 'admin');
  };

  const filteredGroups = groups.filter(g => {
    const displayName = getDMDisplayName(g);
    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredUsers = allUsers.filter(u =>
    (u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const groupMessagesByDate = (messages: GroupMessage[]) => {
    const groups: { date: string; messages: GroupMessage[] }[] = [];
    let currentDate = '';

    messages.forEach(message => {
      const messageDate = formatMessageDate(message.created_at);
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: messageDate, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (type: string | null) => {
    return type?.startsWith('image/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-130px)] gap-4">
      {/* Groups sidebar */}
      <Card className="w-72 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Messages</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setShowDMDialog(true)}>
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-xs mt-1">Start a new message!</p>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <motion.button
                  key={group.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedGroup(group)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                    selectedGroup?.id === group.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={getDMAvatar(group) || group.avatar_url || undefined} />
                    <AvatarFallback className={cn(
                      'text-xs',
                      group.is_direct_message ? 'bg-primary/20' : 'bg-secondary'
                    )}>
                      {group.is_direct_message ? (
                        getInitials(getDMDisplayName(group), group.name)
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">
                      {getDMDisplayName(group)}
                    </p>
                    <p className={cn(
                      'text-xs truncate',
                      selectedGroup?.id === group.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      {group.is_direct_message ? 'Direct Message' : `${group.members?.length || 0} members`}
                    </p>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col">
        {selectedGroup ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getDMAvatar(selectedGroup) || selectedGroup.avatar_url || undefined} />
                  <AvatarFallback>
                    {selectedGroup.is_direct_message ? (
                      getInitials(getDMDisplayName(selectedGroup), selectedGroup.name)
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{getDMDisplayName(selectedGroup)}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedGroup.is_direct_message ? 'Direct Message' : `${selectedGroup.members?.length || 0} members`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedGroup.is_direct_message && getOtherDMUser(selectedGroup) && (
                  <CallButton recipient={getOtherDMUser(selectedGroup)!} variant="icon" />
                )}
                {!selectedGroup.is_direct_message && (
                  <Button variant="ghost" size="icon" onClick={() => setShowMembersDialog(true)}>
                    <Users className="h-4 w-4" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!selectedGroup.is_direct_message && (
                      <>
                        <DropdownMenuItem onClick={() => setShowMembersDialog(true)}>
                          <Users className="h-4 w-4 mr-2" />
                          View Members
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {isGroupAdmin(selectedGroup) && !selectedGroup.is_direct_message ? (
                      <DropdownMenuItem
                        onClick={() => deleteGroup(selectedGroup.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Group
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => leaveGroup(selectedGroup.id)}
                        className="text-destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Leave {selectedGroup.is_direct_message ? 'Chat' : 'Group'}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No messages yet</p>
                  <p className="text-sm text-muted-foreground/70">Send the first message!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupMessagesByDate(messages).map((group) => (
                    <div key={group.date}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground font-medium">{group.date}</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence initial={false}>
                          {group.messages.map((message) => {
                            const isOwn = message.user_id === user?.id;
                            const totalMembers = selectedGroup.members?.length || 0;
                            const readCount = message.read_by?.filter(id => id !== message.user_id).length || 0;
                            const allRead = readCount >= totalMembers - 1;

                            return (
                              <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                  'flex items-start gap-3',
                                  isOwn && 'flex-row-reverse'
                                )}
                              >
                                {!isOwn && (
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarImage src={message.profile?.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(message.profile?.full_name || null, message.profile?.email || '')}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className={cn(
                                  'max-w-[70%]',
                                  isOwn && 'text-right'
                                )}>
                                  {!isOwn && (
                                    <span className="text-xs text-muted-foreground mb-1 block">
                                      {message.profile?.full_name || message.profile?.email?.split('@')[0]}
                                    </span>
                                  )}
                                  <div className={cn(
                                    'rounded-2xl px-4 py-2',
                                    isOwn 
                                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                      : 'bg-muted rounded-tl-sm'
                                  )}>
                                    {message.content && (
                                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                    )}
                                    {message.file_url && (
                                      <div className="mt-1">
                                        {isImageFile(message.file_type) ? (
                                          <a href={message.file_url} target="_blank" rel="noopener noreferrer">
                                            <img 
                                              src={message.file_url} 
                                              alt={message.file_name || 'Image'} 
                                              className="max-w-full rounded-lg max-h-60 object-cover"
                                            />
                                          </a>
                                        ) : (
                                          <a 
                                            href={message.file_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className={cn(
                                              'flex items-center gap-2 p-2 rounded-lg',
                                              isOwn ? 'bg-primary-foreground/10' : 'bg-background'
                                            )}
                                          >
                                            <File className="h-5 w-5 flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-medium truncate">{message.file_name}</p>
                                              <p className="text-xs opacity-70">{formatFileSize(message.file_size || 0)}</p>
                                            </div>
                                            <Download className="h-4 w-4 flex-shrink-0" />
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className={cn(
                                    'flex items-center gap-1 mt-1',
                                    isOwn && 'justify-end'
                                  )}>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(message.created_at), 'h:mm a')}
                                    </span>
                                    {isOwn && (
                                      <span className={cn(
                                        'text-xs',
                                        allRead ? 'text-primary' : 'text-muted-foreground'
                                      )}>
                                        {allRead ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  disabled={sending || uploading}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!newMessage.trim() || sending || uploading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Your Messages</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Send private messages or create groups to collaborate with your team.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setShowDMDialog(true)} variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                New Message
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Group Name</label>
              <Input
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="What's this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Add Members</label>
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="mt-1 mb-2"
              />
              <ScrollArea className="h-40 border rounded-md p-2">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      if (selectedUsers.includes(u.id)) {
                        setSelectedUsers(prev => prev.filter(id => id !== u.id));
                      } else {
                        setSelectedUsers(prev => [...prev, u.id]);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors',
                      selectedUsers.includes(u.id) ? 'bg-primary/10' : 'hover:bg-muted'
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(u.full_name, u.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    {selectedUsers.includes(u.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </ScrollArea>
              {selectedUsers.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedUsers.length} member{selectedUsers.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createGroup}
              disabled={!groupName.trim() || selectedUsers.length === 0}
            >
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start DM Dialog */}
      <Dialog open={showDMDialog} onOpenChange={setShowDMDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <ScrollArea className="h-64">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => startDirectMessage(u)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-muted transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(u.full_name, u.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.full_name || u.email}</p>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Group Members</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-64">
            {selectedGroup?.members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-lg"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(member.profile?.full_name || null, member.profile?.email || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {member.profile?.full_name || member.profile?.email}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{member.profile?.email}</p>
                </div>
                {member.role === 'admin' && (
                  <Badge variant="secondary">Admin</Badge>
                )}
                {member.user_id !== user?.id && member.profile && (
                  <CallButton recipient={member.profile as Profile} variant="icon" />
                )}
              </div>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
