import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-accent/20 text-accent' },
  approved: { label: 'Approved', className: 'bg-success/20 text-success' },
  rejected: { label: 'Rejected', className: 'bg-destructive/20 text-destructive' },
  expired: { label: 'Expired', className: 'bg-warning/20 text-warning' },
  pending: { label: 'Pending', className: 'bg-warning/20 text-warning' },
  partially_paid: { label: 'Partially Paid', className: 'bg-warning/20 text-warning' },
  paid: { label: 'Paid', className: 'bg-success/20 text-success' },
  overdue: { label: 'Overdue', className: 'bg-destructive/20 text-destructive' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
  submitted: { label: 'Submitted', className: 'bg-accent/20 text-accent' },
  verified: { label: 'Verified', className: 'bg-success/20 text-success' },
};

export default function BillingStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="outline" className={cn('font-medium border-0', config.className)}>
      {config.label}
    </Badge>
  );
}
