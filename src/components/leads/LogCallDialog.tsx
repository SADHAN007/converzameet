import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lead } from '@/types/leads';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  PhoneOff,
  PhoneMissed,
  PhoneIncoming,
  Ban,
  Clock,
  Phone,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Send,
  Building2,
} from 'lucide-react';

const CALL_OUTCOMES = [
  { value: 'received', label: 'Received', icon: PhoneIncoming, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  { value: 'not_received', label: 'Not Received', icon: PhoneMissed, color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  { value: 'switch_off', label: 'Switch Off', icon: PhoneOff, color: 'bg-red-500/10 text-red-600 border-red-500/30' },
  { value: 'busy', label: 'Busy', icon: Clock, color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  { value: 'call_back', label: 'Call Back', icon: Phone, color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  { value: 'number_not_valid', label: 'Number Not Valid', icon: Ban, color: 'bg-destructive/10 text-destructive border-destructive/30' },
] as const;

const INTEREST_OPTIONS = [
  { value: 'interested', label: 'Interested', icon: ThumbsUp, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  { value: 'not_interested', label: 'Not Interested', icon: ThumbsDown, color: 'bg-red-500/10 text-red-600 border-red-500/30' },
] as const;

interface LogCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onStatusUpdate: (id: string, status: string) => void;
}

export function LogCallDialog({ open, onOpenChange, lead, onStatusUpdate }: LogCallDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [callOutcome, setCallOutcome] = useState<string>('');
  const [interestStatus, setInterestStatus] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showInterestStep = callOutcome === 'received';

  const handleSubmit = async () => {
    if (!user || !callOutcome) return;

    setIsSubmitting(true);
    try {
      // Log the call
      const { error: logError } = await supabase
        .from('lead_call_logs')
        .insert({
          lead_id: lead.id,
          called_by: user.id,
          call_outcome: callOutcome,
          interest_status: showInterestStep ? interestStatus || null : null,
          notes: notes.trim() || null,
        } as any);

      if (logError) throw logError;

      // Update lead status based on outcome
      let newStatus = lead.status;
      if (callOutcome === 'received' && interestStatus === 'interested') {
        newStatus = 'follow_up_required';
      } else if (callOutcome === 'received' && interestStatus === 'not_interested') {
        newStatus = 'not_interested';
      } else if (callOutcome === 'call_back') {
        newStatus = 'follow_up_required';
      } else if (callOutcome === 'number_not_valid') {
        newStatus = 'lost';
      } else if (['not_received', 'switch_off', 'busy'].includes(callOutcome)) {
        newStatus = 'contacted';
      }

      if (newStatus !== lead.status) {
        onStatusUpdate(lead.id, newStatus);
      }

      // Log activity
      await supabase
        .from('lead_activities')
        .insert({
          lead_id: lead.id,
          user_id: user.id,
          activity_type: 'call_logged',
          new_value: callOutcome,
          note: `Call: ${CALL_OUTCOMES.find(o => o.value === callOutcome)?.label}${showInterestStep && interestStatus ? ` → ${INTEREST_OPTIONS.find(o => o.value === interestStatus)?.label}` : ''}${notes ? ` | ${notes}` : ''}`,
        });

      toast({
        title: 'Call Logged',
        description: `Call disposition recorded for ${lead.company_name}`,
      });

      // Reset & close
      setCallOutcome('');
      setInterestStatus('');
      setNotes('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error logging call:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to log call',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCallOutcome('');
      setInterestStatus('');
      setNotes('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span>Log Call</span>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-normal text-muted-foreground">{lead.company_name}</span>
                <Badge variant="outline" className="text-xs font-mono">{lead.serial_number}</Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Step 1: Call Outcome */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Call Outcome *</Label>
            <div className="grid grid-cols-2 gap-2">
              {CALL_OUTCOMES.map((outcome) => {
                const Icon = outcome.icon;
                const isSelected = callOutcome === outcome.value;
                return (
                  <button
                    key={outcome.value}
                    type="button"
                    onClick={() => {
                      setCallOutcome(outcome.value);
                      if (outcome.value !== 'received') setInterestStatus('');
                    }}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left text-sm font-medium',
                      isSelected
                        ? `${outcome.color} border-current shadow-sm`
                        : 'border-border/50 hover:border-border hover:bg-muted/50'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {outcome.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Interest (only if Received) */}
          {showInterestStep && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
              <Label className="text-sm font-medium">Lead Interest *</Label>
              <div className="grid grid-cols-2 gap-3">
                {INTEREST_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = interestStatus === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setInterestStatus(option.value)}
                      className={cn(
                        'flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-semibold',
                        isSelected
                          ? `${option.color} border-current shadow-md scale-[1.02]`
                          : 'border-border/50 hover:border-border hover:bg-muted/50'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="call-notes" className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              id="call-notes"
              placeholder="Add any notes about the call..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!callOutcome || (showInterestStep && !interestStatus) || isSubmitting}
            className="w-full gap-2"
            size="lg"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSubmitting ? 'Logging...' : 'Log Call'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
