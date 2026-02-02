import { useState } from 'react';
import { Check, X, Loader2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

  const handleResponse = async (response: boolean) => {
    setLoading(response ? 'accept' : 'decline');
    try {
      const { error } = await supabase
        .from('meeting_participants')
        .update({ is_attending: response })
        .eq('id', participantId);

      if (error) throw error;

      onResponseUpdate?.(response);
      toast({
        title: response ? 'Meeting accepted' : 'Meeting declined',
        description: response
          ? 'You have accepted the meeting invitation'
          : 'You have declined the meeting invitation',
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

  // Show status badge if already responded
  if (isAttending !== null) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-2">
          <Badge
            variant={isAttending ? 'default' : 'secondary'}
            className={cn(
              'gap-1',
              isAttending
                ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
            )}
          >
            {isAttending ? (
              <>
                <Check className="h-3 w-3" />
                {!compact && 'Accepted'}
              </>
            ) : (
              <>
                <X className="h-3 w-3" />
                {!compact && 'Declined'}
              </>
            )}
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleResponse(!isAttending)}
              >
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Change to {isAttending ? 'decline' : 'accept'}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  // Show accept/decline buttons if not yet responded
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-500/10"
          onClick={() => handleResponse(true)}
          disabled={loading !== null}
        >
          {loading === 'accept' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-500/10"
          onClick={() => handleResponse(false)}
          disabled={loading !== null}
        >
          {loading === 'decline' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300"
        onClick={() => handleResponse(true)}
        disabled={loading !== null}
      >
        {loading === 'accept' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
        Accept
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        onClick={() => handleResponse(false)}
        disabled={loading !== null}
      >
        {loading === 'decline' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <X className="h-3 w-3" />
        )}
        Decline
      </Button>
    </div>
  );
}
