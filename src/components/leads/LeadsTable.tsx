import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Lead, LEAD_STATUS_OPTIONS, LeadStatus } from '@/types/leads';
import { LeadStatusBadge } from './LeadStatusBadge';
import { AssignLeadDialog } from './AssignLeadDialog';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import { SetReminderDialog } from './SetReminderDialog';
import { BulkAssignBar } from './BulkAssignBar';
import { ViewLeadDialog } from './ViewLeadDialog';
import { EditLeadDialog } from './EditLeadDialog';
import { LogCallDialog } from './LogCallDialog';
import { format } from 'date-fns';
import { ExternalLink, Trash2, UserPlus, IndianRupee, Eye, TableIcon, Pencil, PhoneCall } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface LeadsTableProps {
  leads: Lead[];
  onStatusChange: (id: string, status: LeadStatus, extras?: { deal_value?: number | null; conversion_date?: string | null }) => void;
  onDelete: (id: string) => void;
  onAssign: (leadId: string, userId: string) => Promise<{ error: string | null }>;
  onBulkAssign: (leadIds: string[], userId: string) => Promise<{ error: string | null }>;
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<{ error: string | null }>;
  isAdmin: boolean;
}

export function LeadsTable({ leads, onStatusChange, onDelete, onAssign, onBulkAssign, onUpdateLead, isAdmin }: LeadsTableProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [logCallDialogOpen, setLogCallDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [assignees, setAssignees] = useState<Record<string, TeamMember>>({});
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // Fetch assignee profiles for display
  useEffect(() => {
    const assignedIds = leads
      .map((l) => l.assigned_to)
      .filter((id): id is string => !!id);

    if (assignedIds.length === 0) return;

    const fetchAssignees = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', assignedIds);

      if (data) {
        const map: Record<string, TeamMember> = {};
        data.forEach((p) => {
          map[p.id] = p;
        });
        setAssignees(map);
      }
    };

    fetchAssignees();
  }, [leads]);

  const handleOpenAssign = (lead: Lead) => {
    setSelectedLead(lead);
    setAssignDialogOpen(true);
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setViewDialogOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setEditDialogOpen(true);
  };

  const handleLogCall = (lead: Lead) => {
    setSelectedLead(lead);
    setLogCallDialogOpen(true);
  };

  const handleStatusSelect = (lead: Lead, newStatus: LeadStatus) => {
    if (newStatus === 'converted' && lead.status !== 'converted') {
      setSelectedLead(lead);
      setConvertDialogOpen(true);
    } else {
      onStatusChange(lead.id, newStatus);
    }
  };

  const handleConvert = async (dealValue: number | null, conversionDate: string) => {
    if (selectedLead) {
      onStatusChange(selectedLead.id, 'converted', {
        deal_value: dealValue,
        conversion_date: conversionDate,
      });
    }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const toggleLeadSelection = (leadId: string) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId);
    } else {
      newSelection.add(leadId);
    }
    setSelectedLeads(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)));
    }
  };

  const handleBulkAssign = async (userId: string) => {
    setIsBulkAssigning(true);
    const result = await onBulkAssign(Array.from(selectedLeads), userId);
    setIsBulkAssigning(false);
    if (!result.error) {
      setSelectedLeads(new Set());
    }
  };

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <TableIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No leads found</h3>
        <p className="text-muted-foreground max-w-sm">
          Create your first lead or adjust your filters to see results.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {isAdmin && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedLeads.size === leads.length && leads.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead className="font-semibold">Serial No.</TableHead>
              <TableHead className="font-semibold">Company</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">POC</TableHead>
              <TableHead className="font-semibold">Requirements</TableHead>
              <TableHead className="font-semibold">Assigned To</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Deal Value</TableHead>
              <TableHead className="font-semibold">Follow-up</TableHead>
              <TableHead className="font-semibold">Created</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead, index) => {
              const assignee = lead.assigned_to ? assignees[lead.assigned_to] : null;

              return (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className={`border-b transition-colors hover:bg-muted/50 ${selectedLeads.has(lead.id) ? 'bg-primary/5' : ''}`}
                >
                  {isAdmin && (
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.has(lead.id)}
                        onCheckedChange={() => toggleLeadSelection(lead.id)}
                        aria-label={`Select ${lead.company_name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-sm">{lead.serial_number}</TableCell>
                  <TableCell>
                    <div className="font-medium">{lead.company_name}</div>
                    {lead.website && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Website
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>{lead.contact_number}</div>
                    {lead.address && (
                      <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {lead.address}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.poc_name ? (
                      <div>
                        <div className="font-medium">{lead.poc_name}</div>
                        {lead.poc_number && (
                          <div className="text-xs text-muted-foreground">{lead.poc_number}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {lead.requirements.slice(0, 2).map((req) => (
                        <span
                          key={req}
                          className="text-xs bg-secondary px-2 py-0.5 rounded"
                        >
                          {req}
                        </span>
                      ))}
                      {lead.requirements.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{lead.requirements.length - 2} more
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={assignee.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {getInitials(assignee.full_name, assignee.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate max-w-[100px]">
                          {assignee.full_name || assignee.email}
                        </span>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleOpenAssign(lead)}
                          >
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ) : isAdmin ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleOpenAssign(lead)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.status}
                      onValueChange={(value) => handleStatusSelect(lead, value as LeadStatus)}
                    >
                      <SelectTrigger className="w-auto h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden">
                        <LeadStatusBadge status={lead.status} showDropdownIndicator />
                      </SelectTrigger>
                      <SelectContent className="min-w-[180px]">
                        {LEAD_STATUS_OPTIONS.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value}
                            className="cursor-pointer"
                          >
                            <LeadStatusBadge status={option.value as LeadStatus} compact />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {lead.deal_value ? (
                      <div className="flex items-center gap-1 text-green-600 font-medium">
                        <IndianRupee className="h-3 w-3" />
                        {formatCurrency(lead.deal_value).replace('₹', '')}
                      </div>
                    ) : lead.status === 'converted' ? (
                      <span className="text-muted-foreground text-sm">Not set</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                    {lead.conversion_date && (
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(lead.conversion_date), 'MMM dd')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.follow_up_date ? (
                      <span className="text-sm">
                        {format(new Date(lead.follow_up_date), 'MMM dd, yyyy')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(lead.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewLead(lead)}
                        title="View lead details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleLogCall(lead)}
                        title="Log call"
                        className="text-primary hover:text-primary"
                      >
                        <PhoneCall className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditLead(lead)}
                        title="Edit lead"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <SetReminderDialog leadId={lead.id} companyName={lead.company_name} />
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(lead.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedLead && (
        <>
          <AssignLeadDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            leadId={selectedLead.id}
            leadName={selectedLead.company_name}
            currentAssignee={selectedLead.assigned_to}
            onAssign={onAssign}
          />
          <ConvertLeadDialog
            open={convertDialogOpen}
            onOpenChange={setConvertDialogOpen}
            leadName={selectedLead.company_name}
            onConvert={handleConvert}
          />
          <ViewLeadDialog
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            lead={selectedLead}
            assigneeName={selectedLead.assigned_to ? assignees[selectedLead.assigned_to]?.full_name || assignees[selectedLead.assigned_to]?.email : null}
          />
          <EditLeadDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            lead={selectedLead}
            onSave={onUpdateLead}
          />
          <LogCallDialog
            open={logCallDialogOpen}
            onOpenChange={setLogCallDialogOpen}
            lead={selectedLead}
            onStatusUpdate={(id, status) => onStatusChange(id, status as LeadStatus)}
          />
        </>
      )}

      {isAdmin && (
        <BulkAssignBar
          selectedCount={selectedLeads.size}
          onAssign={handleBulkAssign}
          onClearSelection={() => setSelectedLeads(new Set())}
          isProcessing={isBulkAssigning}
        />
      )}
    </>
  );
}
