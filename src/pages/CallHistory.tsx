import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  PhoneOff,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Calendar,
  User,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow } from 'date-fns';
import StartCallDialog from '@/components/call/StartCallDialog';

interface CallRecord {
  id: string;
  caller_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  caller_profile?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  recipient_profile?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

const statusConfig: Record<string, { icon: typeof Phone; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-500 bg-amber-500/10', label: 'Pending' },
  accepted: { icon: CheckCircle, color: 'text-emerald-500 bg-emerald-500/10', label: 'Accepted' },
  declined: { icon: XCircle, color: 'text-red-500 bg-red-500/10', label: 'Declined' },
  missed: { icon: PhoneMissed, color: 'text-orange-500 bg-orange-500/10', label: 'Missed' },
  cancelled: { icon: PhoneOff, color: 'text-muted-foreground bg-muted', label: 'Cancelled' },
};

export default function CallHistory() {
  const { user, isAdmin } = useAuth();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!user) return;

    const fetchCalls = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('call_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        // Non-admin users only see their own calls
        if (!isAdmin) {
          query = query.or(`caller_id.eq.${user.id},recipient_id.eq.${user.id}`);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Fetch profiles for all users involved
        const userIds = new Set<string>();
        (data || []).forEach(call => {
          userIds.add(call.caller_id);
          userIds.add(call.recipient_id);
        });

        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('id, full_name, email, avatar_url')
          .in('id', Array.from(userIds));

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enrichedCalls = (data || []).map(call => ({
          ...call,
          caller_profile: profileMap.get(call.caller_id),
          recipient_profile: profileMap.get(call.recipient_id),
        }));

        setCalls(enrichedCalls);
      } catch (error) {
        console.error('Error fetching calls:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('call-history')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_requests',
        },
        () => {
          fetchCalls();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, isAdmin]);

  const filteredCalls = calls.filter(call => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      call.caller_profile?.full_name?.toLowerCase().includes(searchLower) ||
      call.caller_profile?.email.toLowerCase().includes(searchLower) ||
      call.recipient_profile?.full_name?.toLowerCase().includes(searchLower) ||
      call.recipient_profile?.email.toLowerCase().includes(searchLower);

    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'incoming') return call.recipient_id === user?.id && matchesSearch;
    if (activeTab === 'outgoing') return call.caller_id === user?.id && matchesSearch;
    if (activeTab === 'missed') return call.status === 'missed' && matchesSearch;
    return matchesSearch;
  });

  const stats = {
    total: calls.length,
    incoming: calls.filter(c => c.recipient_id === user?.id).length,
    outgoing: calls.filter(c => c.caller_id === user?.id).length,
    missed: calls.filter(c => c.status === 'missed').length,
  };

  const CallItem = ({ call, index }: { call: CallRecord; index: number }) => {
    const isOutgoing = call.caller_id === user?.id;
    const otherUser = isOutgoing ? call.recipient_profile : call.caller_profile;
    const status = statusConfig[call.status] || statusConfig.pending;
    const StatusIcon = status.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, type: 'spring', stiffness: 300 }}
        className="group"
      >
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-all">
          {/* Direction icon */}
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
            isOutgoing 
              ? 'bg-blue-500/10 text-blue-500' 
              : 'bg-emerald-500/10 text-emerald-500'
          }`}>
            {isOutgoing ? (
              <PhoneOutgoing className="h-5 w-5" />
            ) : (
              <PhoneIncoming className="h-5 w-5" />
            )}
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={otherUser?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-accent text-white">
                  {otherUser?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 
                   otherUser?.email?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {otherUser?.full_name || otherUser?.email?.split('@')[0] || 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isOutgoing ? 'Outgoing call' : 'Incoming call'}
                </p>
              </div>
            </div>
          </div>

          {/* Status & time */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className={`${status.color} border-0`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium">
                {format(new Date(call.created_at), 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(call.created_at), 'h:mm a')}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-6 w-6 text-emerald-500" />
            Call History
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? 'All call activity across the platform' : 'Your call activity'}
          </p>
        </div>
        <StartCallDialog />
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Calls', value: stats.total, icon: Phone, color: 'bg-primary/10 text-primary' },
          { label: 'Incoming', value: stats.incoming, icon: PhoneIncoming, color: 'bg-emerald-500/10 text-emerald-500' },
          { label: 'Outgoing', value: stats.outgoing, icon: PhoneOutgoing, color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Missed', value: stats.missed, icon: PhoneMissed, color: 'bg-orange-500/10 text-orange-500' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Recent Calls</CardTitle>
              <CardDescription>
                {formatDistanceToNow(new Date(calls[0]?.created_at || new Date()), { addSuffix: true })} - now
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search calls..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="incoming">Incoming</TabsTrigger>
              <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
              <TabsTrigger value="missed">Missed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <motion.div
                    className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  />
                </div>
              ) : filteredCalls.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                >
                  <Phone className="h-12 w-12 mb-3 opacity-30" />
                  <p className="font-medium">No calls found</p>
                  <p className="text-sm">Start a call to see it here</p>
                </motion.div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    <AnimatePresence>
                      {filteredCalls.map((call, index) => (
                        <CallItem key={call.id} call={call} index={index} />
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
