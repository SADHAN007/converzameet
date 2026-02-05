import { Badge } from '@/components/ui/badge';
import { LeadStatus, LEAD_STATUS_OPTIONS } from '@/types/leads';
import { 
  Sparkles, 
  Phone, 
  Clock, 
  CalendarCheck, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Ban 
} from 'lucide-react';

interface LeadStatusBadgeProps {
  status: LeadStatus;
  showIcon?: boolean;
}

const STATUS_ICONS: Record<LeadStatus, React.ElementType> = {
  new_lead: Sparkles,
  contacted: Phone,
  follow_up_required: Clock,
  meeting_scheduled: CalendarCheck,
  proposal_sent: Send,
  converted: CheckCircle2,
  lost: XCircle,
  not_interested: Ban,
};

const STATUS_STYLES: Record<LeadStatus, string> = {
  new_lead: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/25',
  contacted: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/25',
  follow_up_required: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25',
  meeting_scheduled: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25',
  proposal_sent: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 hover:bg-orange-500/25',
  converted: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25',
  lost: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 hover:bg-red-500/25',
  not_interested: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/25',
};

export function LeadStatusBadge({ status, showIcon = true }: LeadStatusBadgeProps) {
  const statusOption = LEAD_STATUS_OPTIONS.find((opt) => opt.value === status);
  const Icon = STATUS_ICONS[status];
  const styleClass = STATUS_STYLES[status];
  
  if (!statusOption) {
    return <Badge variant="secondary">{status}</Badge>;
  }

  return (
    <Badge 
      variant="outline"
      className={`${styleClass} font-medium transition-all duration-200 gap-1.5 border`}
    >
      {showIcon && Icon && <Icon className="h-3 w-3" />}
      {statusOption.label}
    </Badge>
  );
}
