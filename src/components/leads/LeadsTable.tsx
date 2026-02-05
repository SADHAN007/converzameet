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
import { Lead, LEAD_STATUS_OPTIONS, LeadStatus } from '@/types/leads';
import { LeadStatusBadge } from './LeadStatusBadge';
import { AssignLeadDialog } from './AssignLeadDialog';
import { format } from 'date-fns';
import { ExternalLink, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface LeadsTableProps {
  leads: Lead[];
  onStatusChange: (id: string, status: LeadStatus) => void;
  onDelete: (id: string) => void;
  onAssign: (leadId: string, userId: string) => Promise<{ error: string | null }>;
  isAdmin: boolean;
}

export function LeadsTable({ leads, onStatusChange, onDelete, onAssign, isAdmin }: LeadsTableProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [assignees, setAssignees] = useState<Record<string, TeamMember>>({});

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

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No leads found. Create your first lead to get started.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serial No.</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>POC</TableHead>
              <TableHead>Requirements</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead>Created</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const assignee = lead.assigned_to ? assignees[lead.assigned_to] : null;

              return (
                <TableRow key={lead.id}>
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
                      onValueChange={(value) => onStatusChange(lead.id, value as LeadStatus)}
                    >
                      <SelectTrigger className="w-[150px] h-8">
                        <LeadStatusBadge status={lead.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(lead.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedLead && (
        <AssignLeadDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          leadId={selectedLead.id}
          leadName={selectedLead.company_name}
          currentAssignee={selectedLead.assigned_to}
          onAssign={onAssign}
        />
      )}
    </>
  );
}
