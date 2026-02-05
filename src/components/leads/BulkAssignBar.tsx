import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface BulkAssignBarProps {
  selectedCount: number;
  onAssign: (userId: string) => Promise<void>;
  onClearSelection: () => void;
  isProcessing: boolean;
}

export function BulkAssignBar({
  selectedCount,
  onAssign,
  onClearSelection,
  isProcessing,
}: BulkAssignBarProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCount > 0) {
      fetchTeamMembers();
    }
  }, [selectedCount]);

  const fetchTeamMembers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('is_active', true)
        .order('full_name');
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser) return;
    await onAssign(selectedUser);
    setSelectedUser('');
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl",
            "bg-card border border-border",
            "backdrop-blur-lg"
          )}>
            {/* Selection Count */}
            <div className="flex items-center gap-2 pr-3 border-r border-border">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium text-sm">
                {selectedCount} lead{selectedCount !== 1 ? 's' : ''} selected
              </span>
            </div>

            {/* Team Member Select */}
            <div className="flex items-center gap-2">
              <Select value={selectedUser} onValueChange={setSelectedUser} disabled={loading}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.full_name, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[120px]">
                          {member.full_name || member.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                onClick={handleAssign}
                disabled={!selectedUser || isProcessing}
                className="gap-1.5"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Assign
              </Button>
            </div>

            {/* Clear Selection */}
            <Button
              size="icon"
              variant="ghost"
              onClick={onClearSelection}
              disabled={isProcessing}
              className="h-8 w-8 ml-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
