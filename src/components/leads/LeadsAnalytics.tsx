import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Lead } from '@/types/leads';
import { TrendingUp, Users, Target, Award, BarChart3, CalendarIcon, X } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface LeadsAnalyticsProps {
  leads: Lead[];
  teamMembers: TeamMember[];
}

const STATUS_COLORS: Record<string, string> = {
  new_lead: 'hsl(var(--primary))',
  contacted: 'hsl(var(--accent))',
  follow_up_required: 'hsl(38, 92%, 50%)',
  meeting_scheduled: 'hsl(var(--secondary))',
  proposal_sent: 'hsl(280, 65%, 60%)',
  converted: 'hsl(142, 76%, 36%)',
  lost: 'hsl(var(--destructive))',
  not_interested: 'hsl(var(--muted-foreground))',
};

const STATUS_LABELS: Record<string, string> = {
  new_lead: 'New',
  contacted: 'Contacted',
  follow_up_required: 'Follow-up',
  meeting_scheduled: 'Meeting',
  proposal_sent: 'Proposal',
  converted: 'Converted',
  lost: 'Lost',
  not_interested: 'Not Interested',
};

export function LeadsAnalytics({ leads, teamMembers }: LeadsAnalyticsProps) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Filter leads by date range
  const filteredLeads = useMemo(() => {
    if (!dateFrom && !dateTo) return leads;
    
    return leads.filter((lead) => {
      const leadDate = new Date(lead.created_at);
      
      if (dateFrom && dateTo) {
        return isWithinInterval(leadDate, {
          start: startOfDay(dateFrom),
          end: endOfDay(dateTo),
        });
      }
      if (dateFrom) {
        return leadDate >= startOfDay(dateFrom);
      }
      if (dateTo) {
        return leadDate <= endOfDay(dateTo);
      }
      return true;
    });
  }, [leads, dateFrom, dateTo]);

  const clearDateFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const analytics = useMemo(() => {
    const total = filteredLeads.length;
    const converted = filteredLeads.filter((l) => l.status === 'converted').length;
    const lost = filteredLeads.filter((l) => l.status === 'lost' || l.status === 'not_interested').length;
    const active = total - converted - lost;
    const conversionRate = total > 0 ? (converted / total) * 100 : 0;

    // Deal value calculations
    const totalDealValue = filteredLeads
      .filter((l) => l.status === 'converted' && l.deal_value)
      .reduce((sum, l) => sum + (l.deal_value || 0), 0);
    
    const avgDealValue = converted > 0 ? totalDealValue / converted : 0;

    // Status distribution
    const statusCounts: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });

    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || 'hsl(var(--muted))',
    }));

    // Team performance with deal values
    const teamPerformance = teamMembers.map((member) => {
      const memberLeads = filteredLeads.filter((l) => l.assigned_to === member.id);
      const memberConverted = memberLeads.filter((l) => l.status === 'converted').length;
      const memberTotal = memberLeads.length;
      const memberRate = memberTotal > 0 ? (memberConverted / memberTotal) * 100 : 0;
      const memberDealValue = memberLeads
        .filter((l) => l.status === 'converted' && l.deal_value)
        .reduce((sum, l) => sum + (l.deal_value || 0), 0);

      return {
        name: member.full_name?.split(' ')[0] || member.email?.split('@')[0] || 'Unknown',
        fullName: member.full_name || member.email || 'Unknown',
        total: memberTotal,
        converted: memberConverted,
        rate: Math.round(memberRate),
        dealValue: memberDealValue,
      };
    }).filter((m) => m.total > 0).sort((a, b) => b.dealValue - a.dealValue);

    // Unassigned leads
    const unassignedCount = filteredLeads.filter((l) => !l.assigned_to).length;

    return {
      total,
      converted,
      lost,
      active,
      conversionRate,
      totalDealValue,
      avgDealValue,
      statusData,
      teamPerformance,
      unassignedCount,
    };
  }, [filteredLeads, teamMembers]);

  const formatCurrency = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(1)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Filter by date:</span>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "From date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "To date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}

            {(dateFrom || dateTo) && (
              <span className="text-sm text-muted-foreground">
                Showing {filteredLeads.length} of {leads.length} leads
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.unassignedCount} unassigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {analytics.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.converted} of {analytics.total} leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Deal Value</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(analytics.totalDealValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(analytics.avgDealValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Pipeline</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.active}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analytics.teamPerformance.length > 0 ? (
              <>
                <div className="text-2xl font-bold truncate">
                  {analytics.teamPerformance[0].name}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(analytics.teamPerformance[0].dealValue)}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">No data</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={analytics.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {analytics.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.teamPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.teamPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      value,
                      name === 'total' ? 'Total Leads' : 'Converted'
                    ]}
                    labelFormatter={(label) => {
                      const member = analytics.teamPerformance.find(m => m.name === label);
                      return member?.fullName || label;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="converted" name="Converted" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                No team assignments yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Leaderboard */}
      {analytics.teamPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.teamPerformance.slice(0, 5).map((member, index) => (
                <div key={member.fullName} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{member.fullName}</div>
                    <div className="text-sm text-muted-foreground">
                      {member.total} leads • {member.converted} converted
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{formatCurrency(member.dealValue)}</div>
                    <div className="text-xs text-muted-foreground">{member.rate}% conversion</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User-wise Performance Cards */}
      {analytics.teamPerformance.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Individual Performance Breakdown</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analytics.teamPerformance.map((member) => {
              const statusBreakdown = filteredLeads
                .filter((l) => l.assigned_to === teamMembers.find(t => t.full_name === member.fullName || t.email === member.fullName)?.id)
                .reduce((acc, lead) => {
                  acc[lead.status] = (acc[lead.status] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

              const pendingFollowUps = filteredLeads.filter(
                (l) => l.assigned_to === teamMembers.find(t => t.full_name === member.fullName || t.email === member.fullName)?.id 
                  && l.follow_up_date 
                  && new Date(l.follow_up_date) <= new Date()
              ).length;

              return (
                <Card key={member.fullName} className="overflow-hidden">
                  <CardHeader className="pb-2 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{member.fullName}</CardTitle>
                        <p className="text-xs text-muted-foreground">{member.total} leads assigned</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <div className="text-lg font-bold text-primary">{member.rate}%</div>
                        <div className="text-xs text-muted-foreground">Conversion</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <div className="text-lg font-bold text-primary">{formatCurrency(member.dealValue)}</div>
                        <div className="text-xs text-muted-foreground">Revenue</div>
                      </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status Breakdown</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(statusBreakdown).map(([status, count]) => (
                          <span
                            key={status}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${STATUS_COLORS[status]}20`,
                              color: STATUS_COLORS[status],
                            }}
                          >
                            {STATUS_LABELS[status] || status}: {count}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Converted</span>
                        <span className="font-medium">{member.converted} / {member.total}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${member.rate}%` }}
                        />
                      </div>
                    </div>

                    {/* Pending Follow-ups */}
                    {pendingFollowUps > 0 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive">
                        <CalendarIcon className="h-4 w-4" />
                        <span className="text-xs font-medium">{pendingFollowUps} pending follow-ups</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
