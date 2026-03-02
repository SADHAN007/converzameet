import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Lead, LEAD_STATUS_OPTIONS } from '@/types/leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, TrendingUp, PhoneCall, Clock, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AssignmentReportProps {
  teamMembers: TeamMember[];
}

interface UserStats {
  userId: string;
  name: string;
  totalAssigned: number;
  statusBreakdown: Record<string, number>;
  callsMade: number;
  converted: number;
  notInterested: number;
  followUps: number;
}

interface AssignmentHistory {
  id: string;
  lead_company: string;
  lead_serial: string;
  assigned_to_name: string;
  assigned_by_name: string;
  assigned_at: string;
  current_status: string;
}

export function AssignmentReport({ teamMembers }: AssignmentReportProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistory[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [leadsRes, callsRes, activitiesRes] = await Promise.all([
          supabase.from('leads').select('*').not('assigned_to', 'is', null),
          supabase.from('lead_call_logs').select('*'),
          supabase.from('lead_activities').select('*').eq('activity_type', 'assignment').order('created_at', { ascending: false }).limit(50),
        ]);

        const assignedLeads = (leadsRes.data as Lead[]) || [];
        const calls = callsRes.data || [];
        const activities = activitiesRes.data || [];

        setLeads(assignedLeads);
        setCallLogs(calls);

        // Build user stats
        const statsMap = new Map<string, UserStats>();
        teamMembers.forEach(m => {
          statsMap.set(m.id, {
            userId: m.id,
            name: m.full_name || m.email || 'Unknown',
            totalAssigned: 0,
            statusBreakdown: {},
            callsMade: 0,
            converted: 0,
            notInterested: 0,
            followUps: 0,
          });
        });

        assignedLeads.forEach(lead => {
          if (!lead.assigned_to) return;
          const stat = statsMap.get(lead.assigned_to);
          if (!stat) return;
          stat.totalAssigned++;
          stat.statusBreakdown[lead.status] = (stat.statusBreakdown[lead.status] || 0) + 1;
          if (lead.status === 'converted') stat.converted++;
          if (lead.status === 'not_interested') stat.notInterested++;
          if (lead.status === 'follow_up_required') stat.followUps++;
        });

        calls.forEach(call => {
          const stat = statsMap.get(call.called_by);
          if (stat) stat.callsMade++;
        });

        setUserStats(
          Array.from(statsMap.values())
            .filter(s => s.totalAssigned > 0)
            .sort((a, b) => b.totalAssigned - a.totalAssigned)
        );

        // Build assignment history
        const history: AssignmentHistory[] = activities.slice(0, 30).map((a: any) => {
          const lead = assignedLeads.find(l => l.id === a.lead_id);
          return {
            id: a.id,
            lead_company: lead?.company_name || 'Unknown',
            lead_serial: lead?.serial_number || '—',
            assigned_to_name: getMemberName(a.new_value, teamMembers),
            assigned_by_name: getMemberName(a.user_id, teamMembers),
            assigned_at: a.created_at,
            current_status: lead?.status || 'unknown',
          };
        });
        setAssignmentHistory(history);
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, teamMembers]);

  const getMemberName = (id: string | null, members: TeamMember[]) => {
    if (!id) return '—';
    const m = members.find(m => m.id === id);
    return m?.full_name || m?.email || '—';
  };

  const totalAssigned = leads.length;
  const totalConverted = leads.filter(l => l.status === 'converted').length;
  const totalPending = leads.filter(l => !['converted', 'lost', 'not_interested'].includes(l.status)).length;
  const conversionRate = totalAssigned > 0 ? ((totalConverted / totalAssigned) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAssigned}</p>
              <p className="text-sm text-muted-foreground">Total Assigned</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalConverted}</p>
              <p className="text-sm text-muted-foreground">Converted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{conversionRate}%</p>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User-wise Performance Table */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {userStats.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">No assignments yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead className="text-center">Assigned</TableHead>
                  <TableHead className="text-center">Calls Made</TableHead>
                  <TableHead className="text-center">Converted</TableHead>
                  <TableHead className="text-center">Not Interested</TableHead>
                  <TableHead className="text-center">Follow-ups</TableHead>
                  <TableHead className="text-center">Conversion %</TableHead>
                  <TableHead>Status Breakdown</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userStats.map(stat => {
                  const convPct = stat.totalAssigned > 0 ? ((stat.converted / stat.totalAssigned) * 100).toFixed(0) : '0';
                  return (
                    <TableRow key={stat.userId}>
                      <TableCell className="font-medium">{stat.name}</TableCell>
                      <TableCell className="text-center">{stat.totalAssigned}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <PhoneCall className="h-3 w-3 text-muted-foreground" />
                          {stat.callsMade}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 border-0">
                          {stat.converted}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default" className="bg-red-500/15 text-red-600 border-0">
                          {stat.notInterested}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default" className="bg-amber-500/15 text-amber-600 border-0">
                          {stat.followUps}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2">
                          <Progress value={Number(convPct)} className="h-2 w-16" />
                          <span className="text-xs font-medium">{convPct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(stat.statusBreakdown).map(([status, count]) => {
                            const opt = LEAD_STATUS_OPTIONS.find(o => o.value === status);
                            return (
                              <Badge key={status} variant="outline" className="text-xs">
                                {opt?.label || status}: {count}
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assignment History */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Assignment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {assignmentHistory.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">No assignment history</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Current Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentHistory.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.lead_serial}</TableCell>
                    <TableCell className="font-medium">{item.lead_company}</TableCell>
                    <TableCell>{item.assigned_to_name}</TableCell>
                    <TableCell>{item.assigned_by_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.assigned_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const opt = LEAD_STATUS_OPTIONS.find(o => o.value === item.current_status);
                        return opt ? (
                          <Badge variant="outline" className="text-xs">{opt.label}</Badge>
                        ) : (
                          <span className="text-xs">{item.current_status}</span>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
