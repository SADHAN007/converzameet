import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Lead } from '@/types/leads';
import { LeadStatusBadge } from './LeadStatusBadge';
import { format } from 'date-fns';
import { 
  Building2, 
  Phone, 
  User, 
  MapPin, 
  Globe, 
  Calendar,
  IndianRupee,
  FileText,
  Clock,
  Tag
} from 'lucide-react';

interface ViewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  assigneeName?: string | null;
}

export function ViewLeadDialog({ open, onOpenChange, lead, assigneeName }: ViewLeadDialogProps) {
  if (!lead) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            {lead.company_name}
            <Badge variant="outline" className="ml-2 font-mono text-xs">
              {lead.serial_number}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Status & Assignment */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <LeadStatusBadge status={lead.status} />
            </div>
            {assigneeName && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Assigned to:</span>
                <Badge variant="secondary">{assigneeName}</Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Contact Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
              <div>
                <p className="text-sm text-muted-foreground">Company Contact</p>
                <p className="font-medium">{lead.contact_number}</p>
              </div>
              {lead.website && (
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  <a 
                    href={lead.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    <Globe className="h-3 w-3" />
                    {lead.website}
                  </a>
                </div>
              )}
              {lead.address && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium flex items-start gap-1">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    {lead.address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* POC Information */}
          {(lead.poc_name || lead.poc_number) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Point of Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  {lead.poc_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{lead.poc_name}</p>
                    </div>
                  )}
                  {lead.poc_number && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{lead.poc_number}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Requirements */}
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Requirements
            </h4>
            <div className="flex flex-wrap gap-2 pl-6">
              {lead.requirements.length > 0 ? (
                lead.requirements.map((req) => (
                  <Badge key={req} variant="secondary">
                    {req}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">No requirements specified</span>
              )}
            </div>
            {lead.other_service && (
              <div className="pl-6">
                <p className="text-sm text-muted-foreground">Other Services</p>
                <p className="font-medium">{lead.other_service}</p>
              </div>
            )}
          </div>

          {/* Deal Information */}
          {(lead.deal_value || lead.conversion_date) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  Deal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  {lead.deal_value && (
                    <div>
                      <p className="text-sm text-muted-foreground">Deal Value</p>
                      <p className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(lead.deal_value)}</p>
                    </div>
                  )}
                  {lead.conversion_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Conversion Date</p>
                      <p className="font-medium">{format(new Date(lead.conversion_date), 'PPP')}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Additional Info */}
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Additional Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
              {lead.lead_source && (
                <div>
                  <p className="text-sm text-muted-foreground">Lead Source</p>
                  <p className="font-medium">{lead.lead_source}</p>
                </div>
              )}
              {lead.follow_up_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Follow-up Date</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(lead.follow_up_date), 'PPP')}
                  </p>
                </div>
              )}
              {lead.remarks && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Remarks</p>
                  <p className="font-medium">{lead.remarks}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <Separator />
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created: {format(new Date(lead.created_at), 'PPP')}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated: {format(new Date(lead.updated_at), 'PPP')}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
