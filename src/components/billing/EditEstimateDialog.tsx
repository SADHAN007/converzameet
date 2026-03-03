import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useBillingClients, useBillingMutations, useEstimateLineItems, type LineItem } from '@/hooks/useBilling';
import LineItemsEditor from './LineItemsEditor';
import ClientSearchSelect from './ClientSearchSelect';

interface EditEstimateDialogProps {
  estimate: any;
  children: React.ReactNode;
}

export default function EditEstimateDialog({ estimate, children }: EditEstimateDialogProps) {
  const [open, setOpen] = useState(false);
  const { clients } = useBillingClients();
  const { updateEstimate } = useBillingMutations();
  const { data: existingLineItems = [] } = useEstimateLineItems(open ? estimate.id : undefined);

  const [clientId, setClientId] = useState(estimate.client_id);
  const [estimateNumber, setEstimateNumber] = useState(estimate.estimate_number || '');
  const [estimateDate, setEstimateDate] = useState(estimate.estimate_date || '');
  const [expiryDate, setExpiryDate] = useState(estimate.expiry_date || '');
  const [notes, setNotes] = useState(estimate.notes || '');
  const [terms, setTerms] = useState(estimate.terms || '');
  const [isBackdated, setIsBackdated] = useState(estimate.is_backdated || false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Populate line items from fetched data once
  useEffect(() => {
    if (existingLineItems.length > 0 && !initialized) {
      setLineItems(existingLineItems.map(li => ({
        id: li.id,
        service_name: li.service_name,
        description: li.description || '',
        quantity: Number(li.quantity),
        unit_price: Number(li.unit_price),
        tax_percent: Number(li.tax_percent),
        discount: Number(li.discount),
        line_total: Number(li.line_total),
        sort_order: li.sort_order,
      })));
      setInitialized(true);
    }
  }, [existingLineItems, initialized]);

  // Reset initialized when dialog closes
  useEffect(() => {
    if (!open) setInitialized(false);
  }, [open]);

  const handleSubmit = async () => {
    if (!clientId || lineItems.length === 0) return;
    await updateEstimate.mutateAsync({
      id: estimate.id,
      client_id: clientId,
      estimate_number: estimateNumber || undefined,
      estimate_date: estimateDate,
      expiry_date: expiryDate || null,
      notes: notes || null,
      terms: terms || null,
      is_backdated: isBackdated,
      line_items: lineItems,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Estimate {estimate.estimate_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <ClientSearchSelect
                clients={clients}
                value={clientId}
                onChange={setClientId}
              />
            </div>
            <div className="space-y-2">
              <Label>Estimate Number</Label>
              <Input value={estimateNumber} onChange={e => setEstimateNumber(e.target.value)} placeholder="EST-0001" />
            </div>
            <div className="space-y-2">
              <Label>Estimate Date</Label>
              <Input type="date" value={estimateDate} onChange={e => setEstimateDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isBackdated} onCheckedChange={setIsBackdated} />
            <Label>Backdated Estimate</Label>
          </div>

          <LineItemsEditor items={lineItems} onChange={setLineItems} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
              <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!clientId || lineItems.length === 0 || updateEstimate.isPending}>
              {updateEstimate.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
