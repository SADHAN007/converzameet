import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Search, Users, Loader2, X, Check, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  is_active: boolean | null;
}

interface StartCallDialogProps {
  trigger?: React.ReactNode;
}

export default function StartCallDialog({ trigger }: StartCallDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [calling, setCalling] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!open) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles_public')
          .select('id, full_name, email, avatar_url, is_active')
          .eq('is_active', true)
          .order('full_name', { ascending: true });

        if (error) throw error;
        
        // Filter out current user
        const filteredUsers = (data || []).filter(u => u.id !== currentUserId);
        setUsers(filteredUsers);
      } catch (error: any) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [open, currentUserId]);

  const filteredUsers = users.filter(user => {
    const searchLower = search.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const toggleUser = (user: Profile) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const initiateCall = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'Select users',
        description: 'Please select at least one user to call',
        variant: 'destructive',
      });
      return;
    }

    setCalling(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create call requests for each selected user
      const callRequests = selectedUsers.map(recipient => ({
        caller_id: user.id,
        recipient_id: recipient.id,
      }));

      const { error } = await supabase
        .from('call_requests')
        .insert(callRequests);

      if (error) throw error;

      toast({
        title: '📞 Calling...',
        description: `Calling ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`,
      });

      setSelectedUsers([]);
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate call',
        variant: 'destructive',
      });
    } finally {
      setCalling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
              'bg-gradient-to-r from-emerald-500 to-green-500 text-white',
              'shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40'
            )}
          >
            <Phone className="h-4 w-4" />
            <span>Start Call</span>
          </motion.button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-emerald-500" />
            Start a Call
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected users */}
          <AnimatePresence>
            {selectedUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2"
              >
                {selectedUsers.map(user => (
                  <motion.div
                    key={user.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Badge
                      variant="secondary"
                      className="pl-1 pr-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-destructive/20"
                      onClick={() => toggleUser(user)}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-emerald-500 text-white">
                          {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 
                           user.email.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{user.full_name || user.email.split('@')[0]}</span>
                      <X className="h-3 w-3" />
                    </Badge>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* User list */}
          <ScrollArea className="h-[280px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user, index) => {
                  const isSelected = selectedUsers.some(u => u.id === user.id);
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => toggleUser(user)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all',
                        'border hover:border-emerald-500/50',
                        isSelected 
                          ? 'bg-emerald-500/10 border-emerald-500/50' 
                          : 'border-transparent hover:bg-muted/50'
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-green-500 text-white">
                            {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 
                             user.email.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.is_active && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {user.full_name || user.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center"
                          >
                            <Check className="h-4 w-4 text-white" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Call button */}
          <Button
            onClick={initiateCall}
            disabled={selectedUsers.length === 0 || calling}
            className={cn(
              'w-full gap-2',
              'bg-gradient-to-r from-emerald-500 to-green-500',
              'hover:from-emerald-600 hover:to-green-600'
            )}
          >
            {calling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Calling...
              </>
            ) : (
              <>
                <PhoneCall className="h-4 w-4" />
                Call {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
