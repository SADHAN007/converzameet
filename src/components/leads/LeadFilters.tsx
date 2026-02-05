import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, X, Users, User, Filter, Calendar } from 'lucide-react';
import { LeadFilters as LeadFiltersType, LEAD_STATUS_OPTIONS } from '@/types/leads';
import { useAuth } from '@/hooks/useAuth';
import { LeadStatusBadge } from './LeadStatusBadge';

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

  const activeFilterCount = [
    filters.search,
    filters.status !== 'all',
    filters.assignedTo !== 'all',
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Top Row - View Toggle & Search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {isAdmin && (
          <ToggleGroup
            type="single"
            value={filters.viewMode}
            onValueChange={(value) => {
              if (value) onFiltersChange({ ...filters, viewMode: value as 'my' | 'all' });
            }}
            className="border rounded-lg p-1 bg-muted/50"
          >
            <ToggleGroupItem 
              value="all" 
              aria-label="All Leads" 
              className="gap-1.5 px-4 py-2 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md transition-all"
            >
              <Users className="h-4 w-4" />
              All Leads
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="my" 
              aria-label="My Leads" 
              className="gap-1.5 px-4 py-2 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md transition-all"
            >
              <User className="h-4 w-4" />
              My Leads
            </ToggleGroupItem>
          </ToggleGroup>
        )}

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by company, contact, or POC..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value as any })}
        >
          <SelectTrigger className="w-[180px] h-10 bg-background/50 border-border/50">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {LEAD_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <LeadStatusBadge status={option.value} showIcon={false} />
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.assignedTo}
          onValueChange={(value) => onFiltersChange({ ...filters, assignedTo: value })}
        >
          <SelectTrigger className="w-[180px] h-10 bg-background/50 border-border/50">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="unassigned">
              <span className="text-muted-foreground">Unassigned</span>
            </SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.full_name || member.email || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
            className="w-[140px] h-10 bg-background/50 border-border/50"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
            className="w-[140px] h-10 bg-background/50 border-border/50"
          />
        </div>

        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Clear {activeFilterCount > 1 && `(${activeFilterCount})`}
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
