import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SetReminderDialogProps {
  leadId: string;
  companyName: string;
}

export function SetReminderDialog({ leadId, companyName }: SetReminderDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [hour, setHour] = useState<string>('09');
  const [minute, setMinute] = useState<string>('00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const handleSubmit = async () => {
    if (!date || !user) {
      toast({
        title: 'Error',
        description: 'Please select a date and time',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const reminderTime = new Date(date);
      reminderTime.setHours(parseInt(hour), parseInt(minute), 0, 0);

      if (reminderTime <= new Date()) {
        toast({
          title: 'Error',
          description: 'Reminder time must be in the future',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('lead_reminders').insert({
        lead_id: leadId,
        user_id: user.id,
        reminder_time: reminderTime.toISOString(),
      });

      if (error) throw error;

      toast({
        title: 'Reminder Set',
        description: `You'll be notified 30 and 15 minutes before ${format(reminderTime, 'PPP p')}`,
      });

      setOpen(false);
      setDate(undefined);
      setHour('09');
      setMinute('00');
    } catch (error: any) {
      console.error('Error setting reminder:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to set reminder',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Bell className="h-4 w-4" />
          Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Set Reminder
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Set a reminder for <span className="font-medium text-foreground">{companyName}</span>. 
            You'll receive notifications 30 and 15 minutes before.
          </p>

          <div className="space-y-3">
            <label className="text-sm font-medium">Select Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Select Time
            </label>
            <div className="flex gap-2">
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="flex items-center text-lg">:</span>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Minute" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {date && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">Reminder scheduled for:</p>
              <p className="text-muted-foreground">
                {format(
                  new Date(date.setHours(parseInt(hour), parseInt(minute))),
                  'EEEE, MMMM d, yyyy'
                )} at {hour}:{minute}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Notifications will be sent at 30 min and 15 min before.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!date || isSubmitting}>
            {isSubmitting ? 'Setting...' : 'Set Reminder'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
