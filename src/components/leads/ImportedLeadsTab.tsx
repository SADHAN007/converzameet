import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Lead, LeadStatus, LEAD_STATUS_OPTIONS } from '@/types/leads';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadStatusBadge } from './LeadStatusBadge';
import { ViewLeadDialog } from './ViewLeadDialog';
import { LogCallDialog } from './LogCallDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Search, Upload, Eye, PhoneCall, ChevronLeft, ChevronRight } from 'lucide-react';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface ImportedLeadsTabProps {
  teamMembers: TeamMember[];
}

const PAGE_SIZE = 20;

export function ImportedLeadsTab({ teamMembers }: ImportedLeadsTabProps) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [assignTo, setAssignTo] = useState('');
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [callLead, setCallLead] = useState<Lead | null>(null);
  const [filterAssigned, setFilterAssigned] = useState<'all' | 'unassigned' | 'assigned'>('all');

  const fetchImportedLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('is_imported', true);

      if (search) {
        query = query.or(`company_name.ilike.%${search}%,contact_number.ilike.%${search}%,serial_number.ilike.%${search}%,city.ilike.%${search}%`);
      }

      if (filterAssigned === 'unassigned') {
        query = query.is('assigned_to', null);
      } else if (filterAssigned === 'assigned') {
        query = query.not('assigned_to', 'is', null);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setLeads((data as Lead[]) || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching imported leads:', error);
    } finally {
      setLoading(false);
    }
  }, [user, search, page, filterAssigned]);

  useEffect(() => {
    fetchImportedLeads();
  }, [fetchImportedLeads]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedLeads(checked ? leads.map(l => l.id) : []);
  };

  const handleSelectLead = (id: string, checked: boolean) => {
    setSelectedLeads(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const handleBulkAssign = async () => {
    if (!assignTo || selectedLeads.length === 0 || !user) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          assigned_to: assignTo,
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
        })
        .in('id', selectedLeads);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${selectedLeads.length} imported leads assigned successfully`,
      });
      setSelectedLeads([]);
      setAssignTo('');
      fetchImportedLeads();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign leads',
        variant: 'destructive',
      });
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await supabase.from('leads').update({ status: status as any }).eq('id', id);
      setCallLead(null);
      fetchImportedLeads();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getMemberName = (id: string | null) => {
    if (!id) return '—';
    const member = teamMembers.find(m => m.id === id);
    return member?.full_name || member?.email || '—';
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const unassignedCount = leads.filter(l => !l.assigned_to).length;

  return (
    <div className="space-y-4">
      {/* Filters & Bulk Assign */}
      <Card className="glass border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search imported leads..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAssigned} onValueChange={(v: any) => setFilterAssigned(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Imported</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="gap-1">
              <Upload className="h-3 w-3" />
              {totalCount} imported
            </Badge>
          </div>

          {/* Bulk Assign Bar */}
          {isAdmin && selectedLeads.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Badge>{selectedLeads.length} selected</Badge>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleBulkAssign} disabled={!assignTo} size="sm">
                <Users className="h-4 w-4 mr-1" />
                Assign
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Upload className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No imported leads found</p>
              <p className="text-sm">Import leads via CSV to see them here</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedLeads.length === leads.length && leads.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Serial</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Sectors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map(lead => (
                    <TableRow key={lead.id}>
                      {isAdmin && (
                        <TableCell>
                          <Checkbox
                            checked={selectedLeads.includes(lead.id)}
                            onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-xs">{lead.serial_number}</TableCell>
                      <TableCell className="font-medium">{lead.company_name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{lead.contact_number}</p>
                          {lead.poc_name && (
                            <p className="text-xs text-muted-foreground">{lead.poc_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{lead.email || '—'}</TableCell>
                      <TableCell className="text-sm">{lead.city || '—'}</TableCell>
                      <TableCell className="text-sm">{lead.state || '—'}</TableCell>
                      <TableCell>
                        {lead.sectors?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {lead.sectors.slice(0, 2).map(s => (
                              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                            ))}
                            {(lead.sectors?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-xs">+{(lead.sectors?.length || 0) - 2}</Badge>
                            )}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {getMemberName(lead.assigned_to)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewLead(lead)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCallLead(lead)}>
                            <PhoneCall className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {viewLead && (
        <ViewLeadDialog
          lead={viewLead}
          open={!!viewLead}
          onOpenChange={(open) => !open && setViewLead(null)}
          assigneeName={getMemberName(viewLead.assigned_to)}
        />
      )}
      {callLead && (
        <LogCallDialog
          lead={callLead}
          open={!!callLead}
          onOpenChange={(open) => !open && setCallLead(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}
