import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface LineItem {
  id?: string;
  service_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  discount: number;
  line_total: number;
  sort_order: number;
}

export function useBillingClients() {
  const { user, isAdmin } = useAuth();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['billing-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_clients')
        .select('*, profiles:profile_id(full_name, email, avatar_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { clients, isLoading };
}

export function useEstimates() {
  const { user } = useAuth();

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ['estimates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('*, billing_clients(id, company_name, profile_id, profiles:profile_id(full_name, email))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { estimates, isLoading };
}

export function useEstimateLineItems(estimateId?: string) {
  return useQuery({
    queryKey: ['estimate-line-items', estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', estimateId!)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!estimateId,
  });
}

export function useInvoices() {
  const { user } = useAuth();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, billing_clients(id, company_name, profile_id, profiles:profile_id(full_name, email))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { invoices, isLoading };
}

export function useInvoiceLineItems(invoiceId?: string) {
  return useQuery({
    queryKey: ['invoice-line-items', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
}

export function useTransactions() {
  const { user } = useAuth();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, billing_clients(id, company_name, profile_id, profiles:profile_id(full_name, email)), invoices(invoice_number, grand_total), estimates(estimate_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { transactions, isLoading };
}

export function useBillingMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createBillingClient = useMutation({
    mutationFn: async (data: {
      profile_id: string;
      company_name?: string;
      gst_number?: string;
      billing_address?: string;
      billing_city?: string;
      billing_state?: string;
      billing_zip?: string;
      billing_email?: string;
      billing_phone?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from('billing_clients').insert({
        ...data,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-clients'] });
      toast.success('Billing client created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createEstimate = useMutation({
    mutationFn: async (data: {
      client_id: string;
      estimate_number?: string;
      estimate_date?: string;
      expiry_date?: string;
      notes?: string;
      terms?: string;
      is_backdated?: boolean;
      scanned_pdf_url?: string;
      line_items: LineItem[];
    }) => {
      const { line_items, ...estimateData } = data;
      const subtotal = line_items.reduce((s, i) => s + (i.quantity * i.unit_price - i.discount), 0);
      const tax_amount = line_items.reduce((s, i) => s + ((i.quantity * i.unit_price - i.discount) * i.tax_percent / 100), 0);
      const discount_amount = line_items.reduce((s, i) => s + i.discount, 0);
      const grand_total = subtotal + tax_amount;

      const { data: estimate, error } = await supabase
        .from('estimates')
        .insert({
          ...estimateData,
          estimate_number: estimateData.estimate_number || '',
          subtotal,
          tax_amount,
          discount_amount,
          grand_total,
          status: 'draft',
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      if (line_items.length > 0) {
        const { error: liError } = await supabase.from('estimate_line_items').insert(
          line_items.map((li, idx) => ({
            estimate_id: estimate.id,
            service_name: li.service_name,
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
            tax_percent: li.tax_percent,
            discount: li.discount,
            line_total: li.quantity * li.unit_price - li.discount + (li.quantity * li.unit_price - li.discount) * li.tax_percent / 100,
            sort_order: idx,
          }))
        );
        if (liError) throw liError;
      }

      return estimate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast.success('Estimate created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateEstimateStatus = useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      }
      if (rejection_reason) updateData.rejection_reason = rejection_reason;

      const { error } = await supabase.from('estimates').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast.success('Estimate status updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createInvoice = useMutation({
    mutationFn: async (data: {
      client_id: string;
      estimate_id?: string;
      invoice_number?: string;
      invoice_date?: string;
      due_date?: string;
      notes?: string;
      terms?: string;
      is_backdated?: boolean;
      scanned_pdf_url?: string;
      line_items: LineItem[];
    }) => {
      const { line_items, ...invoiceData } = data;
      const subtotal = line_items.reduce((s, i) => s + (i.quantity * i.unit_price - i.discount), 0);
      const tax_amount = line_items.reduce((s, i) => s + ((i.quantity * i.unit_price - i.discount) * i.tax_percent / 100), 0);
      const discount_amount = line_items.reduce((s, i) => s + i.discount, 0);
      const grand_total = subtotal + tax_amount;

      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          ...invoiceData,
          invoice_number: invoiceData.invoice_number || '',
          subtotal,
          tax_amount,
          discount_amount,
          grand_total,
          status: 'draft',
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      if (line_items.length > 0) {
        const { error: liError } = await supabase.from('invoice_line_items').insert(
          line_items.map((li, idx) => ({
            invoice_id: invoice.id,
            service_name: li.service_name,
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
            tax_percent: li.tax_percent,
            discount: li.discount,
            line_total: li.quantity * li.unit_price - li.discount + (li.quantity * li.unit_price - li.discount) * li.tax_percent / 100,
            sort_order: idx,
          }))
        );
        if (liError) throw liError;
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice status updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createTransaction = useMutation({
    mutationFn: async (data: {
      client_id: string;
      invoice_id?: string;
      estimate_id?: string;
      transaction_date?: string;
      amount_paid: number;
      payment_mode: string;
      utr_reference_number?: string;
      receipt_url?: string;
      remarks?: string;
    }) => {
      const { error } = await supabase.from('transactions').insert({
        ...data,
        created_by: user?.id,
        status: 'submitted',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Transaction recorded');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyTransaction = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'verified' | 'rejected' }) => {
      const { error } = await supabase.from('transactions').update({
        status,
        verified_by: user?.id,
        verified_date: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;

      // If verified, update invoice amount_paid
      if (status === 'verified') {
        const { data: txn } = await supabase.from('transactions').select('invoice_id, amount_paid').eq('id', id).single();
        if (txn?.invoice_id) {
          const { data: allTxns } = await supabase
            .from('transactions')
            .select('amount_paid')
            .eq('invoice_id', txn.invoice_id)
            .eq('status', 'verified');
          const totalPaid = (allTxns || []).reduce((s, t) => s + Number(t.amount_paid), 0);
          
          const { data: invoice } = await supabase.from('invoices').select('grand_total').eq('id', txn.invoice_id).single();
          const newStatus = totalPaid >= Number(invoice?.grand_total || 0) ? 'paid' : 'partially_paid';
          
          await supabase.from('invoices').update({ amount_paid: totalPaid, status: newStatus }).eq('id', txn.invoice_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Transaction updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convertEstimateToInvoice = useMutation({
    mutationFn: async (estimateId: string) => {
      // Get estimate + line items
      const { data: estimate, error: eErr } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', estimateId)
        .single();
      if (eErr) throw eErr;

      const { data: lineItems, error: liErr } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('sort_order');
      if (liErr) throw liErr;

      // Create invoice
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          client_id: estimate.client_id,
          estimate_id: estimateId,
          invoice_number: '',
          subtotal: estimate.subtotal,
          tax_amount: estimate.tax_amount,
          discount_amount: estimate.discount_amount,
          grand_total: estimate.grand_total,
          notes: estimate.notes,
          terms: estimate.terms,
          status: 'draft',
          created_by: user?.id,
        })
        .select()
        .single();
      if (invErr) throw invErr;

      if (lineItems && lineItems.length > 0) {
        await supabase.from('invoice_line_items').insert(
          lineItems.map(li => ({
            invoice_id: invoice.id,
            service_name: li.service_name,
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
            tax_percent: li.tax_percent,
            discount: li.discount,
            line_total: li.line_total,
            sort_order: li.sort_order,
          }))
        );
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast.success('Invoice created from estimate');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    createBillingClient,
    createEstimate,
    updateEstimateStatus,
    createInvoice,
    updateInvoiceStatus,
    createTransaction,
    verifyTransaction,
    convertEstimateToInvoice,
  };
}
