import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useBillingClients, useBillingMutations, type LineItem } from '@/hooks/useBilling';
import LineItemsEditor from './LineItemsEditor';

export default function CreateInvoiceDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { clients } = useBillingClients();
  const { createInvoice } = useBillingMutations();
  const [clientId, setClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [isBackdated, setIsBackdated] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const handleSubmit = async () => {
    if (!clientId || lineItems.length === 0) return;
    await createInvoice.mutateAsync({
      client_id: clientId,
      invoice_number: invoiceNumber || undefined,
      invoice_date: invoiceDate,
      due_date: dueDate || undefined,
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
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setNotes('');
    setTerms('');
    setIsBackdated(false);
    setLineItems([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name || (c as any).profiles?.full_name || (c as any).profiles?.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invoice Number (auto if empty)</Label>
              <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-0001" />
            </div>
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isBackdated} onCheckedChange={setIsBackdated} />
            <Label>Backdated Invoice</Label>
          </div>

          <LineItemsEditor items={lineItems} onChange={setLineItems} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!clientId || lineItems.length === 0 || createInvoice.isPending}>
              {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
