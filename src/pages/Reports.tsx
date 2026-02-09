import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderKanban,
  Users,
  Target,
  Calendar,
  FileText,
  Phone,
  ClipboardList,
  MessagesSquare,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import StatsCard from '@/components/dashboard/StatsCard';

interface ModuleStats {
  projects: { total: number };
  leads: { total: number; newLeads: number; contacted: number; followUp: number; meetingScheduled: number; proposalSent: number; converted: number; lost: number; notInterested: number; conversionRate: number; totalDealValue: number };
  tasks: { total: number; todo: number; inProgress: number; inReview: number; approved: number; rejected: number; completed: number; completionRate: number };
  meetings: { total: number; scheduled: number; completed: number; cancelled: number; completionRate: number };
  moms: { total: number; sent: number; draft: number };
  calls: { total: number; missed: number; answered: number; missedRate: number };
  messages: { total: number };
}

const initialStats: ModuleStats = {
  projects: { total: 0 },
  leads: { total: 0, newLeads: 0, contacted: 0, followUp: 0, meetingScheduled: 0, proposalSent: 0, converted: 0, lost: 0, notInterested: 0, conversionRate: 0, totalDealValue: 0 },
  tasks: { total: 0, todo: 0, inProgress: 0, inReview: 0, approved: 0, rejected: 0, completed: 0, completionRate: 0 },
  meetings: { total: 0, scheduled: 0, completed: 0, cancelled: 0, completionRate: 0 },
  moms: { total: 0, sent: 0, draft: 0 },
  calls: { total: 0, missed: 0, answered: 0, missedRate: 0 },
  messages: { total: 0 },
};

export default function Reports() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ModuleStats>(initialStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      try {
        const [projectsRes, leadsRes, tasksRes, meetingsRes, momsRes, callsRes, messagesRes] = await Promise.all([
          supabase.from('projects').select('id', { count: 'exact', head: true }),
          supabase.from('leads').select('status, deal_value'),
          supabase.from('tasks').select('status'),
          supabase.from('meetings').select('status'),
          supabase.from('moms').select('is_sent'),
          supabase.from('call_requests').select('status'),
          supabase.from('group_messages').select('id', { count: 'exact', head: true }),
        ]);

        // Leads
        const leads = leadsRes.data || [];
        const totalLeads = leads.length;
        const newLeads = leads.filter(l => l.status === 'new_lead').length;
        const contacted = leads.filter(l => l.status === 'contacted').length;
        const followUp = leads.filter(l => l.status === 'follow_up_required').length;
        const meetingScheduled = leads.filter(l => l.status === 'meeting_scheduled').length;
        const proposalSent = leads.filter(l => l.status === 'proposal_sent').length;
        const converted = leads.filter(l => l.status === 'converted').length;
        const lost = leads.filter(l => l.status === 'lost').length;
        const notInterested = leads.filter(l => l.status === 'not_interested').length;
        const totalDealValue = leads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);

        // Tasks
        const tasks = tasksRes.data || [];
        const totalTasks = tasks.length;
        const todo = tasks.filter(t => t.status === 'todo').length;
        const inProgress = tasks.filter(t => t.status === 'in_progress').length;
        const inReview = tasks.filter(t => t.status === 'in_review').length;
        const approved = tasks.filter(t => t.status === 'approved').length;
        const rejected = tasks.filter(t => t.status === 'rejected').length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;

        // Meetings
        const meetings = meetingsRes.data || [];
        const totalMeetings = meetings.length;
        const scheduled = meetings.filter(m => m.status === 'scheduled').length;
        const completedMeetings = meetings.filter(m => m.status === 'completed').length;
        const cancelled = meetings.filter(m => m.status === 'cancelled').length;

        // MOMs
        const moms = momsRes.data || [];
        const totalMoms = moms.length;
        const sentMoms = moms.filter(m => m.is_sent).length;

        // Calls
        const calls = callsRes.data || [];
        const totalCalls = calls.length;
        const missedCalls = calls.filter(c => c.status === 'missed' || c.status === 'expired').length;
        const answeredCalls = calls.filter(c => c.status === 'accepted').length;

        setStats({
          projects: { total: projectsRes.count || 0 },
          leads: {
            total: totalLeads, newLeads, contacted, followUp, meetingScheduled, proposalSent, converted, lost, notInterested,
            conversionRate: totalLeads > 0 ? (converted / totalLeads) * 100 : 0,
            totalDealValue,
          },
          tasks: {
            total: totalTasks, todo, inProgress, inReview, approved, rejected, completed: completedTasks,
            completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
          },
          meetings: {
            total: totalMeetings, scheduled, completed: completedMeetings, cancelled,
            completionRate: totalMeetings > 0 ? (completedMeetings / totalMeetings) * 100 : 0,
          },
          moms: { total: totalMoms, sent: sentMoms, draft: totalMoms - sentMoms },
          calls: {
            total: totalCalls, missed: missedCalls, answered: answeredCalls,
            missedRate: totalCalls > 0 ? (missedCalls / totalCalls) * 100 : 0,
          },
          messages: { total: messagesRes.count || 0 },
        });
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
      </div>
    );
  }

  const overviewCards = [
    { label: 'Projects', value: stats.projects.total, icon: FolderKanban, color: 'bg-primary' },
    { label: 'Total Leads', value: stats.leads.total, icon: Users, color: 'bg-accent' },
    { label: 'Tasks', value: stats.tasks.total, icon: ClipboardList, color: 'bg-success' },
    { label: 'Meetings', value: stats.meetings.total, icon: Calendar, color: 'bg-warning' },
    { label: 'Minutes', value: stats.moms.total, icon: FileText, color: 'bg-destructive' },
    { label: 'Calls', value: stats.calls.total, icon: Phone, color: 'bg-primary' },
    { label: 'Messages', value: stats.messages.total, icon: MessagesSquare, color: 'bg-accent' },
    { label: 'Deal Value', value: `₹${stats.leads.totalDealValue.toLocaleString()}`, icon: Target, color: 'bg-success' },
  ];

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Aggregated insights across all modules</p>
      </motion.div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {overviewCards.map((card, i) => (
          <StatsCard key={card.label} label={card.label} value={card.value} icon={card.icon} color={card.color} delay={i * 0.05} />
        ))}
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
          <TabsTrigger value="moms">Minutes</TabsTrigger>
        </TabsList>

        {/* Leads Tab */}
        <TabsContent value="leads">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Pipeline</CardTitle>
                <CardDescription>Status breakdown of all leads</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <StatusBar label="New" count={stats.leads.newLeads} total={stats.leads.total} color="bg-primary" />
                <StatusBar label="Contacted" count={stats.leads.contacted} total={stats.leads.total} color="bg-accent" />
                <StatusBar label="Follow-up Required" count={stats.leads.followUp} total={stats.leads.total} color="bg-warning" />
                <StatusBar label="Meeting Scheduled" count={stats.leads.meetingScheduled} total={stats.leads.total} color="bg-primary" />
                <StatusBar label="Proposal Sent" count={stats.leads.proposalSent} total={stats.leads.total} color="bg-accent" />
                <StatusBar label="Converted" count={stats.leads.converted} total={stats.leads.total} color="bg-success" />
                <StatusBar label="Lost" count={stats.leads.lost} total={stats.leads.total} color="bg-destructive" />
                <StatusBar label="Not Interested" count={stats.leads.notInterested} total={stats.leads.total} color="bg-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricRow icon={TrendingUp} label="Conversion Rate" value={`${stats.leads.conversionRate.toFixed(1)}%`} accent="text-success" />
                <MetricRow icon={Target} label="Total Deal Value" value={`₹${stats.leads.totalDealValue.toLocaleString()}`} accent="text-primary" />
                <MetricRow icon={Users} label="Active Leads" value={stats.leads.total - stats.leads.converted - stats.leads.lost - stats.leads.notInterested} accent="text-accent" />
                <MetricRow icon={TrendingDown} label="Lost Leads" value={stats.leads.lost + stats.leads.notInterested} accent="text-destructive" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <StatusBar label="To Do" count={stats.tasks.todo} total={stats.tasks.total} color="bg-muted-foreground" />
                <StatusBar label="In Progress" count={stats.tasks.inProgress} total={stats.tasks.total} color="bg-primary" />
                <StatusBar label="In Review" count={stats.tasks.inReview} total={stats.tasks.total} color="bg-warning" />
                <StatusBar label="Approved" count={stats.tasks.approved} total={stats.tasks.total} color="bg-success" />
                <StatusBar label="Rejected" count={stats.tasks.rejected} total={stats.tasks.total} color="bg-destructive" />
                <StatusBar label="Completed" count={stats.tasks.completed} total={stats.tasks.total} color="bg-success" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricRow icon={PieChart} label="Completion Rate" value={`${stats.tasks.completionRate.toFixed(1)}%`} accent="text-success" />
                <MetricRow icon={ClipboardList} label="Pending Tasks" value={stats.tasks.todo + stats.tasks.inProgress + stats.tasks.inReview} accent="text-warning" />
                <MetricRow icon={TrendingUp} label="Approved" value={stats.tasks.approved} accent="text-success" />
                <MetricRow icon={TrendingDown} label="Rejected" value={stats.tasks.rejected} accent="text-destructive" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meeting Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <StatusBar label="Scheduled" count={stats.meetings.scheduled} total={stats.meetings.total} color="bg-primary" />
                <StatusBar label="Completed" count={stats.meetings.completed} total={stats.meetings.total} color="bg-success" />
                <StatusBar label="Cancelled" count={stats.meetings.cancelled} total={stats.meetings.total} color="bg-destructive" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meeting Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricRow icon={PieChart} label="Completion Rate" value={`${stats.meetings.completionRate.toFixed(1)}%`} accent="text-success" />
                <MetricRow icon={Calendar} label="Upcoming" value={stats.meetings.scheduled} accent="text-primary" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calls Tab */}
        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Call Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricRow icon={Phone} label="Total Calls" value={stats.calls.total} accent="text-primary" />
              <MetricRow icon={TrendingUp} label="Answered" value={stats.calls.answered} accent="text-success" />
              <MetricRow icon={TrendingDown} label="Missed / Expired" value={stats.calls.missed} accent="text-destructive" />
              <MetricRow icon={PieChart} label="Missed Rate" value={`${stats.calls.missedRate.toFixed(1)}%`} accent="text-warning" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOMs Tab */}
        <TabsContent value="moms">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Minutes of Meeting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricRow icon={FileText} label="Total" value={stats.moms.total} accent="text-primary" />
              <MetricRow icon={TrendingUp} label="Sent" value={stats.moms.sent} accent="text-success" />
              <MetricRow icon={TrendingDown} label="Drafts" value={stats.moms.draft} accent="text-warning" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{count}</Badge>
          <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
        </div>
      </div>
      <Progress value={pct} className={`h-2 [&>div]:${color}`} />
    </div>
  );
}

function MetricRow({ icon: Icon, label, value, accent }: { icon: typeof TrendingUp; label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${accent}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className={`text-lg font-bold ${accent}`}>{value}</span>
    </div>
  );
}
