import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lead } from '@/types/leads';
import { LeadStatusBadge } from './LeadStatusBadge';
import { LeadActivityTimeline } from './LeadActivityTimeline';
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
  Tag,
  Info,
  History,
  Mail,
  Briefcase
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

  const fullAddress = [lead.address, lead.city, lead.state, lead.pin].filter(Boolean).join(', ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span>{lead.company_name}</span>
              <Badge variant="outline" className="ml-3 font-mono text-xs">
                {lead.serial_number}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Status & Assignment */}
        <div className="flex items-center gap-4 flex-wrap py-2">
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

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start bg-muted/50">
            <TabsTrigger value="details" className="gap-1.5">
              <Info className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5">
              <History className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="details" className="mt-0 p-1">
              <div className="space-y-6 pt-4">
                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Mobile No</p>
                      <p className="font-medium">{lead.contact_number}</p>
                    </div>
                    {lead.email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </p>
                      </div>
                    )}
                    {lead.website && (
                      <div>
                        <p className="text-sm text-muted-foreground">WebLink</p>
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
                    {fullAddress && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium flex items-start gap-1">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                          {fullAddress}
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

                {/* Sectors */}
                {lead.sectors && lead.sectors.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        Sectors
                      </h4>
                      <div className="flex flex-wrap gap-2 pl-6">
                        {lead.sectors.map((sector) => (
                          <Badge key={sector} variant="outline" className="bg-primary/5">
                            {sector}
                          </Badge>
                        ))}
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
                <div className="flex items-center gap-6 text-xs text-muted-foreground pb-2">
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
            </TabsContent>

            <TabsContent value="activity" className="mt-0 p-4">
              <LeadActivityTimeline leadId={lead.id} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
