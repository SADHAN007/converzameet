import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MeetingResponseActionsProps {
  meetingId: string;
  participantId: string;
  isAttending: boolean | null;
  onResponseUpdate?: (isAttending: boolean | null) => void;
  compact?: boolean;
}

export default function MeetingResponseActions({
  meetingId,
  participantId,
  isAttending,
  onResponseUpdate,
  compact = false,
}: MeetingResponseActionsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleResponse = async (response: boolean) => {
    setLoading(response ? 'accept' : 'decline');
    try {
      const { error } = await supabase
        .from('meeting_participants')
        .update({ is_attending: response })
        .eq('id', participantId);

      if (error) throw error;

      if (response) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 1500);
      }

      onResponseUpdate?.(response);
      toast({
        title: response ? '🎉 Meeting Accepted!' : 'Meeting Declined',
        description: response
          ? "You're all set! See you at the meeting."
          : "You've declined this meeting invitation.",
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to respond to meeting',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  // Show animated status badge if already responded
  if (isAttending !== null) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-2"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-sm cursor-pointer transition-all',
            isAttending
              ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600 border border-green-200/50 hover:from-green-500/30 hover:to-emerald-500/30'
              : 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-600 border border-red-200/50 hover:from-red-500/30 hover:to-rose-500/30'
          )}
          onClick={() => handleResponse(!isAttending)}
        >
          {isAttending ? (
            <>
              <motion.div
                initial={{ rotate: -45 }}
                animate={{ rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                <Check className="h-4 w-4" />
              </motion.div>
              {!compact && <span>Accepted</span>}
            </>
          ) : (
            <>
              <X className="h-4 w-4" />
              {!compact && <span>Declined</span>}
            </>
          )}
        </motion.div>
        <span className="text-xs text-muted-foreground">
          {compact ? '' : 'Click to change'}
        </span>
      </motion.div>
    );
  }

  // Compact version for inline display
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <AnimatePresence>
          {showConfetti && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute"
            >
              <Sparkles className="h-6 w-6 text-yellow-500" />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center transition-all',
            'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/25',
            'hover:shadow-xl hover:shadow-green-500/40'
          )}
          onClick={() => handleResponse(true)}
          disabled={loading !== null}
        >
          {loading === 'accept' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center transition-all',
            'bg-gradient-to-br from-red-400 to-rose-500 text-white shadow-lg shadow-red-500/25',
            'hover:shadow-xl hover:shadow-red-500/40'
          )}
          onClick={() => handleResponse(false)}
          disabled={loading !== null}
        >
          {loading === 'decline' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </motion.button>
      </div>
    );
  }

  // Full version with prominent buttons
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute -top-2 left-1/2 transform -translate-x-1/2"
          >
            <Sparkles className="h-8 w-8 text-yellow-500" />
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex items-center gap-3">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            size="sm"
            className={cn(
              'gap-2 relative overflow-hidden',
              'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600',
              'text-white shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/40',
              'border-0'
            )}
            onClick={() => handleResponse(true)}
            disabled={loading !== null}
          >
            {loading === 'accept' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Accept
            <motion.div
              className="absolute inset-0 bg-white/20"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.5 }}
            />
          </Button>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              'gap-2 relative overflow-hidden',
              'border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300',
              'shadow-sm hover:shadow-md'
            )}
            onClick={() => handleResponse(false)}
            disabled={loading !== null}
          >
            {loading === 'decline' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Decline
          </Button>
        </motion.div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Respond to this meeting invitation
      </p>
    </motion.div>
  );
}
