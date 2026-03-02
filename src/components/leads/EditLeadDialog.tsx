import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Lead, LeadStatus, LEAD_STATUS_OPTIONS, SERVICE_OPTIONS, SECTOR_OPTIONS } from '@/types/leads';
import { Pencil, Save, X } from 'lucide-react';

interface EditLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onSave: (id: string, updates: Partial<Lead>) => Promise<{ error: string | null }>;
}

export function EditLeadDialog({ open, onOpenChange, lead, onSave }: EditLeadDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_number: '',
    email: '',
    poc_name: '',
    poc_number: '',
    address: '',
    city: '',
    pin: '',
    state: '',
    website: '',
    requirements: [] as string[],
    sectors: [] as string[],
    other_service: '',
    lead_source: '',
    status: 'new_lead' as LeadStatus,
    remarks: '',
    follow_up_date: '',
  });

  useEffect(() => {
    if (lead && open) {
      setFormData({
        company_name: lead.company_name || '',
        contact_number: lead.contact_number || '',
        email: lead.email || '',
        poc_name: lead.poc_name || '',
        poc_number: lead.poc_number || '',
        address: lead.address || '',
        city: lead.city || '',
        pin: lead.pin || '',
        state: lead.state || '',
        website: lead.website || '',
        requirements: lead.requirements || [],
        sectors: lead.sectors || [],
        other_service: lead.other_service || '',
        lead_source: lead.lead_source || '',
        status: lead.status,
        remarks: lead.remarks || '',
        follow_up_date: lead.follow_up_date ? lead.follow_up_date.split('T')[0] : '',
      });
    }
  }, [lead, open]);

  const handleRequirementToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.includes(service)
        ? prev.requirements.filter(r => r !== service)
        : [...prev.requirements, service],
    }));
  };

  const handleSectorToggle = (sector: string) => {
    setFormData(prev => ({
      ...prev,
      sectors: prev.sectors.includes(sector)
        ? prev.sectors.filter(s => s !== sector)
        : [...prev.sectors, sector],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const updates: Partial<Lead> = {
      company_name: formData.company_name,
      contact_number: formData.contact_number,
      email: formData.email || null,
      poc_name: formData.poc_name || null,
      poc_number: formData.poc_number || null,
      address: formData.address || null,
      city: formData.city || null,
      pin: formData.pin || null,
      state: formData.state || null,
      website: formData.website || null,
      requirements: formData.requirements,
      sectors: formData.sectors.length > 0 ? formData.sectors : null,
      other_service: formData.other_service || null,
      lead_source: formData.lead_source || null,
      status: formData.status,
      remarks: formData.remarks || null,
      follow_up_date: formData.follow_up_date || null,
    };

    const result = await onSave(lead.id, updates);
    setIsSubmitting(false);

    if (!result.error) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Lead - {lead?.serial_number}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Company Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="company@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_number">Mobile No *</Label>
                <Input
                  id="contact_number"
                  value={formData.contact_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_number: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">WebLink</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead_source">Lead Source</Label>
                <Input
                  id="lead_source"
                  placeholder="e.g., Website, Referral"
                  value={formData.lead_source}
                  onChange={(e) => setFormData(prev => ({ ...prev, lead_source: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="Street address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  placeholder="PIN code"
                  value={formData.pin}
                  onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Point of Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Point of Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poc_name">POC Name</Label>
                <Input
                  id="poc_name"
                  value={formData.poc_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, poc_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poc_number">POC Number</Label>
                <Input
                  id="poc_number"
                  value={formData.poc_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, poc_number: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Sectors */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Sectors</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SECTOR_OPTIONS.map((sector) => (
                <div key={sector} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-sector-${sector}`}
                    checked={formData.sectors.includes(sector)}
                    onCheckedChange={() => handleSectorToggle(sector)}
                  />
                  <Label htmlFor={`edit-sector-${sector}`} className="text-sm cursor-pointer">
                    {sector}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Requirements</h3>
            <div className="grid grid-cols-2 gap-3">
              {SERVICE_OPTIONS.filter(s => s !== 'Other').map((service) => (
                <div key={service} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-service-${service}`}
                    checked={formData.requirements.includes(service)}
                    onCheckedChange={() => handleRequirementToggle(service)}
                  />
                  <Label htmlFor={`edit-service-${service}`} className="text-sm cursor-pointer">
                    {service}
                  </Label>
                </div>
              ))}
            </div>
            {formData.requirements.includes('Other') || formData.other_service ? (
              <div className="space-y-2">
                <Label htmlFor="other_service">Other Service</Label>
                <Input
                  id="other_service"
                  placeholder="Specify other service"
                  value={formData.other_service}
                  onChange={(e) => setFormData(prev => ({ ...prev, other_service: e.target.value }))}
                />
              </div>
            ) : null}
          </div>

          {/* Status & Follow-up */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Status & Follow-up</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as LeadStatus }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="follow_up_date">Follow-up Date</Label>
                <Input
                  id="follow_up_date"
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="Additional notes about this lead..."
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
