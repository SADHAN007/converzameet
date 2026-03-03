import { motion } from 'framer-motion';
import { FileText, Receipt, Plus, TrendingUp, Users, CreditCard, Download, Eye, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useEstimates, useInvoices, useTransactions, useBillingClients, useBillingMutations, useEstimateLineItems, useInvoiceLineItems } from '@/hooks/useBilling';
import BillingStatusBadge from '@/components/billing/BillingStatusBadge';
import CreateEstimateDialog from '@/components/billing/CreateEstimateDialog';
import EditEstimateDialog from '@/components/billing/EditEstimateDialog';
import CreateInvoiceDialog from '@/components/billing/CreateInvoiceDialog';
import CreateTransactionDialog from '@/components/billing/CreateTransactionDialog';
import CreateBillingClientDialog from '@/components/billing/CreateBillingClientDialog';
import { format } from 'date-fns';
import { downloadEstimatePdf, downloadInvoicePdf } from '@/lib/billing-pdf';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

function EstimateDetailDialog({ estimate, children }: { estimate: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: lineItems = [] } = useEstimateLineItems(open ? estimate.id : undefined);

  const clientName = estimate.billing_clients?.company_name || estimate.billing_clients?.profiles?.full_name || '-';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Estimate {estimate.estimate_number}</DialogTitle>
            <BillingStatusBadge status={estimate.status} />
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Client & Date Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</p>
              <p className="font-semibold">{clientName}</p>
              {estimate.billing_clients?.profiles?.email && (
                <p className="text-sm text-muted-foreground">{estimate.billing_clients.profiles.email}</p>
              )}
            </div>
            <div className="space-y-2 text-right">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</p>
                <p className="font-medium">{format(new Date(estimate.estimate_date), 'MMM dd, yyyy')}</p>
              </div>
              {estimate.expiry_date && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expiry</p>
                  <p className="font-medium">{format(new Date(estimate.expiry_date), 'MMM dd, yyyy')}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Line Items Table */}
          <div>
            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">Line Items</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Service</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax %</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.service_name}</p>
                        {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">₹{Number(item.unit_price).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.tax_percent}%</TableCell>
                    <TableCell className="text-right">₹{Number(item.discount).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(item.line_total).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {lineItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-4">No line items</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* Financial Summary */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{Number(estimate.subtotal).toLocaleString()}</span>
              </div>
              {Number(estimate.discount_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">-₹{Number(estimate.discount_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>₹{Number(estimate.tax_amount).toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Grand Total</span>
                <span>₹{Number(estimate.grand_total).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes & Rejection */}
          {estimate.notes && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{estimate.notes}</p>
            </div>
          )}
          {estimate.rejection_reason && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-1">Rejection Reason</p>
              <p className="text-sm">{estimate.rejection_reason}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDetailDialog({ invoice, children }: { invoice: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: lineItems = [] } = useInvoiceLineItems(open ? invoice.id : undefined);

  const clientName = invoice.billing_clients?.company_name || invoice.billing_clients?.profiles?.full_name || '-';
  const balance = Number(invoice.grand_total) - Number(invoice.amount_paid);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Invoice {invoice.invoice_number}</DialogTitle>
            <BillingStatusBadge status={invoice.status} />
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Client & Date Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</p>
              <p className="font-semibold">{clientName}</p>
              {invoice.billing_clients?.profiles?.email && (
                <p className="text-sm text-muted-foreground">{invoice.billing_clients.profiles.email}</p>
              )}
            </div>
            <div className="space-y-2 text-right">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Invoice Date</p>
                <p className="font-medium">{format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</p>
              </div>
              {invoice.due_date && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</p>
                  <p className="font-medium">{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Line Items Table */}
          <div>
            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">Line Items</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Service</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax %</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.service_name}</p>
                        {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">₹{Number(item.unit_price).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.tax_percent}%</TableCell>
                    <TableCell className="text-right">₹{Number(item.discount).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(item.line_total).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {lineItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-4">No line items</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* Financial Summary */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{Number(invoice.subtotal).toLocaleString()}</span>
              </div>
              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">-₹{Number(invoice.discount_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>₹{Number(invoice.tax_amount).toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Grand Total</span>
                <span>₹{Number(invoice.grand_total).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="text-success">₹{Number(invoice.amount_paid).toLocaleString()}</span>
              </div>
              {balance > 0 && (
                <div className="flex justify-between font-semibold text-destructive">
                  <span>Balance Due</span>
                  <span>₹{balance.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BillingPage() {
  const { isAdmin, userRole } = useAuth();
  const { estimates, isLoading: estLoading } = useEstimates();
  const { invoices, isLoading: invLoading } = useInvoices();
  const { transactions, isLoading: txnLoading } = useTransactions();
  const { clients } = useBillingClients();
  const { updateEstimateStatus, updateInvoiceStatus, verifyTransaction, convertEstimateToInvoice } = useBillingMutations();
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  

  const isClient = userRole === 'client';

  // Stats
  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  const pendingInvoices = invoices.filter(i => ['draft', 'sent'].includes(i.status)).length;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
  const approvedEstimates = estimates.filter(e => e.status === 'approved').length;
  const pendingEstimates = estimates.filter(e => ['draft', 'sent'].includes(e.status)).length;
  const totalCollection = transactions.filter(t => t.status === 'verified').reduce((s, t) => s + Number(t.amount_paid), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-muted-foreground">{isClient ? 'Your estimates, invoices & payments' : 'Manage billing, invoices & collections'}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <CreateBillingClientDialog><Button variant="outline" size="sm" className="gap-1"><Users className="h-4 w-4" /> Add Client</Button></CreateBillingClientDialog>
            <CreateEstimateDialog><Button variant="outline" size="sm" className="gap-1"><FileText className="h-4 w-4" /> New Estimate</Button></CreateEstimateDialog>
            <CreateInvoiceDialog><Button variant="outline" size="sm" className="gap-1"><Receipt className="h-4 w-4" /> New Invoice</Button></CreateInvoiceDialog>
            <CreateTransactionDialog><Button size="sm" className="gap-1"><CreditCard className="h-4 w-4" /> Add Transaction</Button></CreateTransactionDialog>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Invoices</p>
                  <p className="text-2xl font-bold">{invoices.length}</p>
                  <p className="text-xs text-muted-foreground">{paidInvoices} paid · {pendingInvoices} pending · {overdueInvoices} overdue</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center"><Receipt className="h-6 w-6 text-accent" /></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Estimates</p>
                  <p className="text-2xl font-bold">{estimates.length}</p>
                  <p className="text-xs text-muted-foreground">{approvedEstimates} approved · {pendingEstimates} pending</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="h-6 w-6 text-primary" /></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Collection</p>
                  <p className="text-2xl font-bold">₹{totalCollection.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{transactions.filter(t => t.status === 'verified').length} verified</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center"><TrendingUp className="h-6 w-6 text-success" /></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Billing Clients</p>
                  <p className="text-2xl font-bold">{clients.length}</p>
                  <p className="text-xs text-muted-foreground">{clients.filter(c => c.is_active).length} active</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center"><Users className="h-6 w-6 text-warning" /></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="estimates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="estimates">Estimates</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* ESTIMATES TAB */}
        <TabsContent value="estimates">
          <Card>
            <CardHeader><CardTitle>Estimates</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimates.map(est => (
                    <TableRow key={est.id}>
                      <TableCell className="font-medium">{est.estimate_number}</TableCell>
                      <TableCell>{est.billing_clients?.company_name || (est.billing_clients as any)?.profiles?.full_name || '-'}</TableCell>
                      <TableCell>{format(new Date(est.estimate_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="font-medium">₹{Number(est.grand_total).toLocaleString()}</TableCell>
                      <TableCell><BillingStatusBadge status={est.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <EstimateDetailDialog estimate={est}>
                            <Button variant="ghost" size="sm" className="gap-1"><Eye className="h-3.5 w-3.5" /> View</Button>
                          </EstimateDetailDialog>
                          {isAdmin && ['draft', 'sent'].includes(est.status) && (
                            <EditEstimateDialog estimate={est}>
                              <Button variant="ghost" size="sm" className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                            </EditEstimateDialog>
                          )}
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => downloadEstimatePdf(est.id).catch(() => toast.error('Failed to generate PDF'))}>
                            <Download className="h-3.5 w-3.5" /> PDF
                          </Button>
                          {isAdmin && est.status === 'draft' && (
                            <Button variant="outline" size="sm" onClick={() => updateEstimateStatus.mutate({ id: est.id, status: 'sent' })}>Send</Button>
                          )}
                          {isAdmin && est.status === 'approved' && (
                            <Button size="sm" onClick={() => convertEstimateToInvoice.mutate(est.id)}>→ Invoice</Button>
                          )}
                          {isClient && est.status === 'sent' && (
                            <>
                              <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => updateEstimateStatus.mutate({ id: est.id, status: 'approved' })}>Approve</Button>
                              {rejectingId === est.id ? (
                                <div className="flex gap-1 items-center">
                                  <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason" className="h-8 w-40" />
                                  <Button size="sm" variant="destructive" onClick={() => { updateEstimateStatus.mutate({ id: est.id, status: 'rejected', rejection_reason: rejectReason }); setRejectingId(null); setRejectReason(''); }}>Submit</Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="destructive" onClick={() => setRejectingId(est.id)}>Reject</Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {estimates.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No estimates yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.billing_clients?.company_name || (inv.billing_clients as any)?.profiles?.full_name || '-'}</TableCell>
                      <TableCell>{format(new Date(inv.invoice_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{inv.due_date ? format(new Date(inv.due_date), 'MMM dd, yyyy') : '-'}</TableCell>
                      <TableCell className="font-medium">₹{Number(inv.grand_total).toLocaleString()}</TableCell>
                      <TableCell>₹{Number(inv.amount_paid).toLocaleString()}</TableCell>
                      <TableCell><BillingStatusBadge status={inv.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <InvoiceDetailDialog invoice={inv}>
                            <Button variant="ghost" size="sm" className="gap-1"><Eye className="h-3.5 w-3.5" /> View</Button>
                          </InvoiceDetailDialog>
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => downloadInvoicePdf(inv.id).catch(() => toast.error('Failed to generate PDF'))}>
                            <Download className="h-3.5 w-3.5" /> PDF
                          </Button>
                          {isAdmin && inv.status === 'draft' && (
                            <Button variant="outline" size="sm" onClick={() => updateInvoiceStatus.mutate({ id: inv.id, status: 'sent' })}>Send</Button>
                          )}
                          {(isClient || isAdmin) && ['sent', 'partially_paid'].includes(inv.status) && (
                            <CreateTransactionDialog preselectedClientId={inv.client_id} preselectedInvoiceId={inv.id}>
                              <Button size="sm" variant="outline" className="gap-1"><CreditCard className="h-3 w-3" /> Pay</Button>
                            </CreateTransactionDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoices.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No invoices yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRANSACTIONS TAB */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transactions</CardTitle>
                {(isClient || isAdmin) && (
                  <CreateTransactionDialog><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add</Button></CreateTransactionDialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>UTR/Ref</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(txn => (
                    <TableRow key={txn.id}>
                      <TableCell>{format(new Date(txn.transaction_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{txn.billing_clients?.company_name || (txn.billing_clients as any)?.profiles?.full_name || '-'}</TableCell>
                      <TableCell>{(txn as any).invoices?.invoice_number || '-'}</TableCell>
                      <TableCell className="font-medium">₹{Number(txn.amount_paid).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{txn.payment_mode.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{txn.utr_reference_number || '-'}</TableCell>
                      <TableCell><BillingStatusBadge status={txn.status} /></TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-1">
                            {txn.receipt_url && (
                              <Button variant="ghost" size="sm" asChild><a href={txn.receipt_url} target="_blank" rel="noreferrer">Receipt</a></Button>
                            )}
                            {txn.status === 'submitted' && (
                              <>
                                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => verifyTransaction.mutate({ id: txn.id, status: 'verified' })}>Verify</Button>
                                <Button size="sm" variant="destructive" onClick={() => verifyTransaction.mutate({ id: txn.id, status: 'rejected' })}>Reject</Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">No transactions yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
