import { useState, useEffect } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { CreateLeadDialog } from '@/components/leads/CreateLeadDialog';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { LeadsAnalytics } from '@/components/leads/LeadsAnalytics';
import { LeadsImportExport } from '@/components/leads/LeadsImportExport';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, BarChart3, TableIcon } from 'lucide-react';
import { LeadStatus } from '@/types/leads';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function Leads() {
  const { isAdmin } = useAuth();
  const { isBdMarketing } = useUserRole();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  const canCreateLead = isAdmin || isBdMarketing;
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
    bulkImportLeads,
  } = useLeads();

  // Fetch team members for analytics
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-muted-foreground">
            Manage and track your business leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LeadsImportExport leads={leads} onImport={bulkImportLeads} />
          {canCreateLead && <CreateLeadDialog onSubmit={createLead} />}
        </div>
      </div>

      <Tabs defaultValue="table" className="space-y-6">
        <TabsList>
          <TabsTrigger value="table" className="gap-2">
            <TableIcon className="h-4 w-4" />
            Leads Table
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <LeadsAnalytics leads={leads} teamMembers={teamMembers} />
          )}
        </TabsContent>

        <TabsContent value="table" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <LeadFilters filters={filters} onFiltersChange={setFilters} teamMembers={teamMembers} />
            </CardContent>
          </Card>

          {/* Leads Table */}
          <Card>
            <CardContent className="pt-6">
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
                    isAdmin={isAdmin}
                  />

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalCount)} of {totalCount} leads
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page - 1)}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {page} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page + 1)}
                          disabled={page === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
