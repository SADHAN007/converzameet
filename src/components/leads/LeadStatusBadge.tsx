import { Badge } from '@/components/ui/badge';
import { LeadStatus, LEAD_STATUS_OPTIONS } from '@/types/leads';

interface LeadStatusBadgeProps {
  status: LeadStatus;
}

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const statusOption = LEAD_STATUS_OPTIONS.find((opt) => opt.value === status);
  
  if (!statusOption) {
    return <Badge variant="secondary">{status}</Badge>;
  }

  return (
    <Badge className={`${statusOption.color} text-white`}>
      {statusOption.label}
    </Badge>
  );
}
