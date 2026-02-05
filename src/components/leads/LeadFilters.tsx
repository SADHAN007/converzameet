import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, X, Users, User } from 'lucide-react';
import { LeadFilters as LeadFiltersType, LEAD_STATUS_OPTIONS } from '@/types/leads';
import { useAuth } from '@/hooks/useAuth';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface LeadFiltersProps {
  filters: LeadFiltersType;
  onFiltersChange: (filters: LeadFiltersType) => void;
  teamMembers?: TeamMember[];
}

export function LeadFilters({ filters, onFiltersChange, teamMembers = [] }: LeadFiltersProps) {
  const { isAdmin } = useAuth();

  const handleReset = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      assignedTo: 'all',
      dateFrom: '',
      dateTo: '',
      viewMode: isAdmin ? 'all' : 'my',
    });
  };

  const hasActiveFilters = 
    filters.search || 
    filters.status !== 'all' || 
    filters.assignedTo !== 'all' || 
    filters.dateFrom || 
    filters.dateTo;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
      {isAdmin && (
        <ToggleGroup
          type="single"
          value={filters.viewMode}
          onValueChange={(value) => {
            if (value) onFiltersChange({ ...filters, viewMode: value as 'my' | 'all' });
          }}
          className="border rounded-md"
        >
          <ToggleGroupItem value="all" aria-label="All Leads" className="gap-1.5 px-3">
            <Users className="h-4 w-4" />
            All Leads
          </ToggleGroupItem>
          <ToggleGroupItem value="my" aria-label="My Leads" className="gap-1.5 px-3">
            <User className="h-4 w-4" />
            My Leads
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.status}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value as any })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {LEAD_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.assignedTo}
        onValueChange={(value) => onFiltersChange({ ...filters, assignedTo: value })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by user" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Users</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {teamMembers.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.full_name || member.email || 'Unknown'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        placeholder="From date"
        value={filters.dateFrom}
        onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
        className="w-[150px]"
      />

      <Input
        type="date"
        placeholder="To date"
        value={filters.dateTo}
        onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
        className="w-[150px]"
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
