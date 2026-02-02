import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Loader2, X, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface CallButtonProps {
  recipient: Profile;
  meetingId?: string;
  variant?: 'icon' | 'button';
  className?: string;
}

export default function CallButton({ 
  recipient, 
  meetingId,
  variant = 'icon',
  className 
}: CallButtonProps) {
  const { toast } = useToast();
  const [calling, setCalling] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [showCallingDialog, setShowCallingDialog] = useState(false);

  const initiateCall = async () => {
    setCalling(true);
    setShowCallingDialog(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('call_requests')
        .insert({
          caller_id: user.id,
          recipient_id: recipient.id,
          meeting_id: meetingId || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      setCallId(data.id);

      // Subscribe to call status changes
      const channel = supabase
        .channel(`call-${data.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'call_requests',
            filter: `id=eq.${data.id}`,
          },
          (payload) => {
            const newStatus = payload.new.status;
            if (newStatus === 'accepted') {
              toast({
                title: '📞 Call Accepted!',
                description: `${recipient.full_name || recipient.email} accepted your call`,
              });
              setShowCallingDialog(false);
              setCalling(false);
            } else if (newStatus === 'declined') {
              toast({
                title: 'Call Declined',
                description: `${recipient.full_name || recipient.email} declined your call`,
                variant: 'destructive',
              });
              setShowCallingDialog(false);
              setCalling(false);
            }
          }
        )
        .subscribe();

      // Auto-cancel after 30 seconds
      setTimeout(async () => {
        if (calling) {
          await supabase
            .from('call_requests')
            .update({ status: 'missed' })
            .eq('id', data.id)
            .eq('status', 'pending');
          
          setShowCallingDialog(false);
          setCalling(false);
          toast({
            title: 'No Answer',
            description: `${recipient.full_name || recipient.email} didn't answer`,
          });
        }
        channel.unsubscribe();
      }, 30000);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate call',
        variant: 'destructive',
      });
      setCalling(false);
      setShowCallingDialog(false);
    }
  };

  const cancelCall = async () => {
    if (callId) {
      await supabase
        .from('call_requests')
        .update({ status: 'cancelled' })
        .eq('id', callId);
    }
    setCalling(false);
    setShowCallingDialog(false);
    setCallId(null);
  };

  return (
    <>
      {variant === 'icon' ? (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={initiateCall}
          disabled={calling}
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center transition-all',
            'bg-gradient-to-br from-emerald-400 to-green-500 text-white',
            'shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40',
            'disabled:opacity-50',
            className
          )}
        >
          {calling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
        </motion.button>
      ) : (
        <Button
          onClick={initiateCall}
          disabled={calling}
          className={cn(
            'gap-2 bg-gradient-to-r from-emerald-500 to-green-500',
            'hover:from-emerald-600 hover:to-green-600',
            className
          )}
        >
          {calling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
          Call
        </Button>
      )}

      {/* Calling Dialog */}
      <Dialog open={showCallingDialog} onOpenChange={(open) => !open && cancelCall()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Calling...</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-8 space-y-6">
            {/* Animated avatar with rings */}
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full bg-emerald-500/20"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-emerald-500/20"
                animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
              <Avatar className="h-24 w-24 ring-4 ring-emerald-500/50">
                <AvatarImage src={recipient.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-emerald-400 to-green-500 text-white">
                  {recipient.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 
                   recipient.email.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="text-center">
              <p className="font-semibold text-lg">
                {recipient.full_name || recipient.email.split('@')[0]}
              </p>
              <p className="text-sm text-muted-foreground">{recipient.email}</p>
            </div>

            <motion.div
              className="flex items-center gap-2 text-muted-foreground"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <PhoneCall className="h-4 w-4" />
              <span className="text-sm">Ringing...</span>
            </motion.div>

            {/* Cancel button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={cancelCall}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-red-500/25"
            >
              <X className="h-6 w-6" />
            </motion.button>
            <p className="text-xs text-muted-foreground">Tap to cancel</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
