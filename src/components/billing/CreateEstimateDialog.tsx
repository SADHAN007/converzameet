import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FileText, CalendarDays, StickyNote } from 'lucide-react';
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
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Create Estimate
            </DialogTitle>
            <DialogDescription>Fill in the details below to create a new estimate for your client.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Section: Client & Estimate Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                <CalendarDays className="h-3.5 w-3.5" /> Basic Details
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Client <span className="text-destructive">*</span></Label>
                  <ClientSearchSelect
                    clients={clients}
                    value={clientId}
                    onChange={setClientId}
                    onAddNew={() => setAddClientOpen(true)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Estimate Number <span className="text-muted-foreground text-xs font-normal">(auto if empty)</span></Label>
                  <Input value={estimateNumber} onChange={e => setEstimateNumber(e.target.value)} placeholder="EST-0001" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Estimate Date</Label>
                  <Input type="date" value={estimateDate} onChange={e => setEstimateDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Expiry Date</Label>
                  <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer hover:bg-accent/5 transition-colors w-full">
                    <Switch checked={isBackdated} onCheckedChange={setIsBackdated} className="scale-90" />
                    <span className="text-sm">Backdated</span>
                  </label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section: Line Items */}
            <LineItemsEditor items={lineItems} onChange={setLineItems} />

            <Separator />

            {/* Section: Notes & Terms */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                <StickyNote className="h-3.5 w-3.5" /> Notes & Terms
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Notes</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Internal notes about this estimate..." className="resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Terms & Conditions</Label>
                  <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} placeholder="Payment terms, validity, etc." className="resize-none" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!clientId || lineItems.length === 0 || createEstimate.isPending} className="min-w-[140px]">
                {createEstimate.isPending ? 'Creating...' : 'Create Estimate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateBillingClientDialog
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        onCreated={() => setAddClientOpen(false)}
      />
    </>
  );
}
