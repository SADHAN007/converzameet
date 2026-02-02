import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  X, 
  Clock, 
  Send, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Phone,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import CallButton from '@/components/call/CallButton';

interface Participant {
  id: string;
  user_id: string;
  is_attending: boolean | null;
  profiles?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface MeetingParticipantStatusProps {
  meetingId: string;
  meetingTitle: string;
  participants: Participant[];
  isCreator: boolean;
  onParticipantUpdate?: () => void;
}

export default function MeetingParticipantStatus({
  meetingId,
  meetingTitle,
  participants,
  isCreator,
  onParticipantUpdate,
}: MeetingParticipantStatusProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const acceptedParticipants = participants.filter(p => p.is_attending === true);
  const declinedParticipants = participants.filter(p => p.is_attending === false);
  const pendingParticipants = participants.filter(p => p.is_attending === null);

  const handleResendInvitation = async (participantId: string, email: string) => {
    setSendingReminder(participantId);
    try {
      // Create a new notification for the participant
      const participant = participants.find(p => p.id === participantId);
      if (!participant) throw new Error('Participant not found');

      const { error } = await supabase.from('notifications').insert({
        user_id: participant.user_id,
        title: 'Meeting Reminder',
        message: `Reminder: Please respond to the meeting invitation for "${meetingTitle}"`,
        type: 'meeting_reminder',
      });

      if (error) throw error;

      toast({
        title: '📧 Reminder Sent!',
        description: `Reminder notification sent to ${email}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reminder',
        variant: 'destructive',
      });
    } finally {
      setSendingReminder(null);
    }
  };

  if (!isCreator || participants.length === 0) return null;

  const StatusBadge = ({ status }: { status: 'accepted' | 'declined' | 'pending' }) => {
    const config = {
      accepted: {
        icon: Check,
        label: 'Accepted',
        className: 'bg-green-500/10 text-green-600 border-green-200',
      },
      declined: {
        icon: X,
        label: 'Declined',
        className: 'bg-red-500/10 text-red-600 border-red-200',
      },
      pending: {
        icon: Clock,
        label: 'Pending',
        className: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
      },
    }[status];

    const Icon = config.icon;

    return (
      <Badge variant="outline" className={cn('gap-1 text-[10px]', config.className)}>
        <Icon className="h-2.5 w-2.5" />
        {config.label}
      </Badge>
    );
  };

  const ParticipantRow = ({ 
    participant, 
    status 
  }: { 
    participant: Participant; 
    status: 'accepted' | 'declined' | 'pending';
  }) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center justify-between gap-3 p-2 rounded-lg',
        status === 'accepted' && 'bg-green-500/5',
        status === 'declined' && 'bg-red-500/5',
        status === 'pending' && 'bg-yellow-500/5'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className={cn(
          'h-7 w-7 ring-2',
          status === 'accepted' && 'ring-green-500/50',
          status === 'declined' && 'ring-red-500/50',
          status === 'pending' && 'ring-yellow-500/50'
        )}>
          <AvatarImage src={participant.profiles?.avatar_url || undefined} />
          <AvatarFallback className="text-[10px]">
            {participant.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 
             participant.profiles?.email?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {participant.profiles?.full_name || participant.profiles?.email?.split('@')[0]}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {participant.profiles?.email}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        
        {/* Call button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <CallButton
                  recipient={{
                    id: participant.user_id,
                    full_name: participant.profiles?.full_name || null,
                    email: participant.profiles?.email || '',
                    avatar_url: participant.profiles?.avatar_url || null,
                  }}
                  meetingId={meetingId}
                  variant="icon"
                  className="h-6 w-6"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Call {participant.profiles?.full_name || 'participant'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {status === 'pending' && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => handleResendInvitation(participant.id, participant.profiles?.email || '')}
              disabled={sendingReminder === participant.id}
            >
              {sendingReminder === participant.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Resend
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="mt-3 rounded-lg border bg-card/50">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-2.5 hover:bg-muted/50 transition-colors rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Responses:</span>
              <div className="flex items-center gap-1.5">
                {acceptedParticipants.length > 0 && (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-medium"
                  >
                    <Check className="h-2.5 w-2.5" />
                    {acceptedParticipants.length}
                  </motion.div>
                )}
                {pendingParticipants.length > 0 && (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 text-[10px] font-medium"
                  >
                    <Clock className="h-2.5 w-2.5" />
                    {pendingParticipants.length}
                  </motion.div>
                )}
                {declinedParticipants.length > 0 && (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 text-[10px] font-medium"
                  >
                    <X className="h-2.5 w-2.5" />
                    {declinedParticipants.length}
                  </motion.div>
                )}
              </div>
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-2.5 pb-2.5 space-y-1">
            <AnimatePresence>
              {acceptedParticipants.map((p) => (
                <ParticipantRow key={p.id} participant={p} status="accepted" />
              ))}
              {pendingParticipants.map((p) => (
                <ParticipantRow key={p.id} participant={p} status="pending" />
              ))}
              {declinedParticipants.map((p) => (
                <ParticipantRow key={p.id} participant={p} status="declined" />
              ))}
            </AnimatePresence>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
