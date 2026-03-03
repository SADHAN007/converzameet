import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBillingClients, useInvoices, useBillingMutations } from '@/hooks/useBilling';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: React.ReactNode;
  preselectedClientId?: string;
  preselectedInvoiceId?: string;
}

export default function CreateTransactionDialog({ children, preselectedClientId, preselectedInvoiceId }: Props) {
  const [open, setOpen] = useState(false);
  const { isAdmin, user } = useAuth();
  const { clients } = useBillingClients();
  const { invoices } = useInvoices();
  const { createTransaction } = useBillingMutations();
  const [clientId, setClientId] = useState(preselectedClientId || '');
  const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId || '');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('upi');
  const [utr, setUtr] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const filteredInvoices = invoices.filter(i => !clientId || i.client_id === clientId);

  const handleSubmit = async () => {
    if (!clientId || !amount) return;

    let receiptUrl: string | undefined;
    if (receiptFile) {
      const path = `${user?.id}/${Date.now()}-${receiptFile.name}`;
      const { error } = await supabase.storage.from('billing-files').upload(path, receiptFile);
      if (!error) {
        const { data: urlData } = supabase.storage.from('billing-files').getPublicUrl(path);
        receiptUrl = urlData.publicUrl;
      }
    }

    await createTransaction.mutateAsync({
      client_id: clientId,
      invoice_id: invoiceId || undefined,
      amount_paid: Number(amount),
      payment_mode: paymentMode,
      utr_reference_number: utr || undefined,
      transaction_date: transactionDate,
      remarks: remarks || undefined,
      receipt_url: receiptUrl,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Record Transaction</DialogTitle></DialogHeader>
        <div className="space-y-4">
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
            <Label>Invoice (optional)</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId}>
              <SelectTrigger><SelectValue placeholder="Link to invoice" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {filteredInvoices.map(i => (
                  <SelectItem key={i.id} value={i.id}>{i.invoice_number} - ₹{Number(i.grand_total).toLocaleString()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount Paid *</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min={0} />
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Transaction Date</Label><Input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>UTR / Reference</Label><Input value={utr} onChange={e => setUtr(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>Receipt Upload</Label>
            <Input type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
          </div>
          <div className="space-y-2"><Label>Remarks</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!clientId || !amount || createTransaction.isPending}>
              {createTransaction.isPending ? 'Recording...' : 'Record Transaction'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
