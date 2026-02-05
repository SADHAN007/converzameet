import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadStatusBadge } from './LeadStatusBadge';
import { LeadStatus } from '@/types/leads';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  Plus, 
  RefreshCw, 
  UserPlus, 
  DollarSign, 
  MessageSquare,
  Sparkles,
  Send,
  History
} from 'lucide-react';
import { toast } from 'sonner';

interface Activity {
  id: string;
  lead_id: string;
  user_id: string | null;
  activity_type: string;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  created_at: string;
  user?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface LeadActivityTimelineProps {
  leadId: string;
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  created: Sparkles,
  status_change: RefreshCw,
  assignment: UserPlus,
  deal_value: DollarSign,
  note: MessageSquare,
};

const ACTIVITY_COLORS: Record<string, string> = {
  created: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  status_change: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  assignment: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  deal_value: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  note: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
};

export function LeadActivityTimeline({ leadId }: LeadActivityTimelineProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      setLoading(false);
      return;
    }

    // Fetch user profiles for activities
    const userIds = [...new Set(data?.filter(a => a.user_id).map(a => a.user_id) || [])];
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      const activitiesWithUsers = data?.map(activity => ({
        ...activity,
        user: activity.user_id ? profileMap.get(activity.user_id) : undefined,
      }));

      setActivities(activitiesWithUsers || []);
    } else {
      setActivities(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`lead_activities_${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_activities',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;

    setSubmitting(true);
    const { error } = await supabase.from('lead_activities').insert({
      lead_id: leadId,
      user_id: user.id,
      activity_type: 'note',
      note: newNote.trim(),
    });

    if (error) {
      toast.error('Failed to add note');
      console.error('Error adding note:', error);
    } else {
      toast.success('Note added');
      setNewNote('');
      setIsAddingNote(false);
      fetchActivities();
    }
    setSubmitting(false);
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getActivityDescription = (activity: Activity) => {
    switch (activity.activity_type) {
      case 'created':
        return 'created this lead';
      case 'status_change':
        return (
          <span className="flex items-center gap-2 flex-wrap">
            changed status from{' '}
            <LeadStatusBadge status={activity.old_value as LeadStatus} showIcon={false} />
            to
            <LeadStatusBadge status={activity.new_value as LeadStatus} showIcon={false} />
          </span>
        );
      case 'assignment':
        if (!activity.old_value) {
          return 'assigned this lead';
        }
        return 'reassigned this lead';
      case 'deal_value':
        return (
          <span>
            updated deal value to{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(activity.new_value || '0')}
            </span>
          </span>
        );
      case 'note':
        return 'added a note';
      default:
        return activity.activity_type;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <History className="h-4 w-4 text-muted-foreground" />
          Activity Timeline
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingNote(!isAddingNote)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      {/* Add Note Form */}
      <AnimatePresence>
        {isAddingNote && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
              <Textarea
                placeholder="Write a note about this lead..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingNote(false);
                    setNewNote('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || submitting}
                  className="gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  Add Note
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No activity yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {activities.map((activity, index) => {
              const Icon = ACTIVITY_ICONS[activity.activity_type] || MessageSquare;
              const colorClass = ACTIVITY_COLORS[activity.activity_type] || ACTIVITY_COLORS.note;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="relative flex gap-4 pl-0"
                >
                  {/* Icon */}
                  <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${colorClass} border border-border`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-start gap-2 flex-wrap">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={activity.user?.avatar_url || ''} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(activity.user?.full_name, activity.user?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">
                        {activity.user?.full_name || activity.user?.email || 'System'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {getActivityDescription(activity)}
                      </span>
                    </div>

                    {/* Note content */}
                    {activity.note && (
                      <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm">
                        {activity.note}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      <span className="mx-1">•</span>
                      {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
