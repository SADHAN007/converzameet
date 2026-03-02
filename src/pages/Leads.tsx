import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLeads } from '@/hooks/useLeads';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { CreateLeadDialog } from '@/components/leads/CreateLeadDialog';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { LeadsAnalytics } from '@/components/leads/LeadsAnalytics';
import { LeadsImportExport } from '@/components/leads/LeadsImportExport';
import { ImportedLeadsTab } from '@/components/leads/ImportedLeadsTab';
import { AssignmentReport } from '@/components/leads/AssignmentReport';
import { ImportRunHistory } from '@/components/leads/ImportRunHistory';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ChevronLeft, 
  ChevronRight, 
  BarChart3, 
  TableIcon, 
  Target,
  TrendingUp,
  Users,
  Sparkles,
  RefreshCw,
  Upload,
  ClipboardList,
  History
} from 'lucide-react';
import { LeadStatus } from '@/types/leads';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function Leads() {
  const { isAdmin } = useAuth();
  const { isBdMarketing } = useUserRole();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState('table');
  const [autoRefresh, setAutoRefresh] = useState(() => {
    const saved = localStorage.getItem('leads-auto-refresh');
    return saved === 'true';
  });
  
  const {
    leads,
    loading,
    page,
    setPage,
    totalPages,
    totalCount,
    filters,
    setFilters,
    createLead,
    updateLead,
    deleteLead,
    assignLead,
    bulkAssignLeads,
    bulkImportLeads,
    refetch,
  } = useLeads();

  // Auto-refresh functionality (admin only)
  useEffect(() => {
    if (!isAdmin || !autoRefresh) return;

    const intervalId = setInterval(() => {
      refetch();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isAdmin, autoRefresh, refetch]);

  // Persist auto-refresh preference
  const handleAutoRefreshToggle = useCallback((checked: boolean) => {
    setAutoRefresh(checked);
    localStorage.setItem('leads-auto-refresh', String(checked));
  }, []);

  // Quick stats
  const newLeadsCount = leads.filter(l => l.status === 'new_lead').length;
  const convertedCount = leads.filter(l => l.status === 'converted').length;
  const followUpCount = leads.filter(l => l.status === 'follow_up_required').length;

  useEffect(() => {
    const fetchTeamMembers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true);
      if (data) setTeamMembers(data);
    };
    fetchTeamMembers();
  }, []);

  const handleStatusChange = async (
    id: string, 
    status: LeadStatus, 
    extras?: { deal_value?: number | null; conversion_date?: string | null }
  ) => {
    await updateLead(id, { status, ...extras });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      await deleteLead(id);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Lead Management</h1>
              <p className="text-muted-foreground">
                Track and convert your business opportunities
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex items-center gap-3 flex-wrap"
        >
          {/* Auto Refresh Toggle - Admin Only */}
          {isAdmin && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              <Label htmlFor="auto-refresh" className="text-sm font-medium cursor-pointer">
                Auto Refresh
              </Label>
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={handleAutoRefreshToggle}
              />
              {autoRefresh && (
                <span className="text-xs text-muted-foreground">(5 min)</span>
              )}
            </div>
          )}
          <LeadsImportExport leads={leads} onImport={bulkImportLeads} />
          <CreateLeadDialog onSubmit={createLead} />
        </motion.div>
      </div>

      {/* Quick Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="glass border-border/50 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Sparkles className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{newLeadsCount}</p>
              <p className="text-sm text-muted-foreground">New Leads</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Users className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{followUpCount}</p>
              <p className="text-sm text-muted-foreground">Follow-ups</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{convertedCount}</p>
              <p className="text-sm text-muted-foreground">Converted</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-sm text-muted-foreground">Total Leads</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="table" className="gap-2 data-[state=active]:shadow-sm">
              <TableIcon className="h-4 w-4" />
              Leads Table
              <Badge variant="secondary" className="ml-1 text-xs">
                {totalCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="imported" className="gap-2 data-[state=active]:shadow-sm">
              <Upload className="h-4 w-4" />
              Imported Leads
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2 data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" />
              Assignment Report
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="import-history" className="gap-2 data-[state=active]:shadow-sm">
              <History className="h-4 w-4" />
              Import History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {loading ? (
                  <div className="grid gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : (
                  <LeadsAnalytics leads={leads} teamMembers={teamMembers} />
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="table" className="space-y-6">
              <motion.div
                key="table"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Filters */}
                <Card className="glass border-border/50 overflow-hidden">
                  <CardContent className="p-6">
                    <LeadFilters filters={filters} onFiltersChange={setFilters} teamMembers={teamMembers} />
                  </CardContent>
                </Card>

                {/* Leads Table */}
                <Card className="glass border-border/50 overflow-hidden">
                  <CardContent className="p-6">
                    {loading ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : (
                      <>
                        <LeadsTable
                          leads={leads}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDelete}
                          onAssign={assignLead}
                          onBulkAssign={bulkAssignLeads}
                          onUpdateLead={updateLead}
                          isAdmin={isAdmin}
                        />

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t mt-6"
                          >
                            <p className="text-sm text-muted-foreground">
                              Showing <span className="font-medium text-foreground">{(page - 1) * 20 + 1}</span> to{' '}
                              <span className="font-medium text-foreground">{Math.min(page * 20, totalCount)}</span> of{' '}
                              <span className="font-medium text-foreground">{totalCount}</span> leads
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                className="gap-1"
                              >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                              </Button>
                              <div className="flex items-center gap-1 px-2">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                  let pageNum;
                                  if (totalPages <= 5) {
                                    pageNum = i + 1;
                                  } else if (page <= 3) {
                                    pageNum = i + 1;
                                  } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                  } else {
                                    pageNum = page - 2 + i;
                                  }
                                  return (
                                    <Button
                                      key={pageNum}
                                      variant={page === pageNum ? "default" : "ghost"}
                                      size="sm"
                                      onClick={() => setPage(pageNum)}
                                      className="w-9 h-9"
                                    >
                                      {pageNum}
                                    </Button>
                                  );
                                })}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(page + 1)}
                                disabled={page === totalPages}
                                className="gap-1"
                              >
                                Next
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="imported" className="space-y-6">
              <motion.div
                key="imported"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ImportedLeadsTab teamMembers={teamMembers} />
              </motion.div>
            </TabsContent>

            <TabsContent value="assignments" className="space-y-6">
              <motion.div
                key="assignments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AssignmentReport teamMembers={teamMembers} />
              </motion.div>
            </TabsContent>

            <TabsContent value="import-history" className="space-y-6">
              <motion.div
                key="import-history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ImportRunHistory />
              </motion.div>
            </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
