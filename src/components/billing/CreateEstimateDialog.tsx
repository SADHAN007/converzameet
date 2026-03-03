import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useBillingClients, useBillingMutations, type LineItem } from '@/hooks/useBilling';
import LineItemsEditor from './LineItemsEditor';
import ClientSearchSelect from './ClientSearchSelect';
import CreateBillingClientDialog from './CreateBillingClientDialog';

export default function CreateEstimateDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const { clients } = useBillingClients();
  const { createEstimate } = useBillingMutations();
  const [clientId, setClientId] = useState('');
  const [estimateNumber, setEstimateNumber] = useState('');
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [isBackdated, setIsBackdated] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const handleSubmit = async () => {
    if (!clientId || lineItems.length === 0) return;
    await createEstimate.mutateAsync({
      client_id: clientId,
      estimate_number: estimateNumber || undefined,
      estimate_date: estimateDate,
      expiry_date: expiryDate || undefined,
      notes: notes || undefined,
      terms: terms || undefined,
      is_backdated: isBackdated,
      line_items: lineItems,
    });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setClientId('');
    setEstimateNumber('');
    setEstimateDate(new Date().toISOString().split('T')[0]);
    setExpiryDate('');
    setNotes('');
    setTerms('');
    setIsBackdated(false);
    setLineItems([]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Estimate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <ClientSearchSelect
                  clients={clients}
                  value={clientId}
                  onChange={setClientId}
                  onAddNew={() => setAddClientOpen(true)}
                />
              </div>
              <div className="space-y-2">
                <Label>Estimate Number (auto if empty)</Label>
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
              <Button onClick={handleSubmit} disabled={!clientId || lineItems.length === 0 || createEstimate.isPending}>
                {createEstimate.isPending ? 'Creating...' : 'Create Estimate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Add Client Dialog */}
      <CreateBillingClientDialog onCreated={() => setAddClientOpen(false)}>
        <span className="hidden" ref={el => { if (addClientOpen && el) el.click(); }} />
      </CreateBillingClientDialog>
    </>
  );
}
