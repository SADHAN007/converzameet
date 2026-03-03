
-- Sequences for estimate/invoice numbering
CREATE SEQUENCE IF NOT EXISTS public.estimate_serial_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.invoice_serial_seq START 1;

-- ============================================
-- BILLING CLIENTS (link profiles to billing)
-- ============================================
CREATE TABLE public.billing_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  company_name TEXT,
  gst_number TEXT,
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip TEXT,
  billing_email TEXT,
  billing_phone TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

ALTER TABLE public.billing_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage billing clients" ON public.billing_clients
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients can view own billing profile" ON public.billing_clients
  FOR SELECT USING (profile_id = auth.uid());

CREATE TRIGGER update_billing_clients_updated_at
  BEFORE UPDATE ON public.billing_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ESTIMATES
-- ============================================
CREATE TABLE public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.billing_clients(id) ON DELETE CASCADE,
  estimate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  rejection_reason TEXT,
  scanned_pdf_url TEXT,
  is_backdated BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all estimates" ON public.estimates
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients can view own estimates" ON public.estimates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.billing_clients bc
      WHERE bc.id = estimates.client_id AND bc.profile_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update own estimates for approval" ON public.estimates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.billing_clients bc
      WHERE bc.id = estimates.client_id AND bc.profile_id = auth.uid()
    )
  );

CREATE TRIGGER update_estimates_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate estimate number
CREATE OR REPLACE FUNCTION public.generate_estimate_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.estimate_number IS NULL OR NEW.estimate_number = '' THEN
    NEW.estimate_number := 'EST-' || LPAD(nextval('public.estimate_serial_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_estimate_number
  BEFORE INSERT ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.generate_estimate_number();

-- ============================================
-- ESTIMATE LINE ITEMS
-- ============================================
CREATE TABLE public.estimate_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax_percent NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.estimate_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage estimate line items" ON public.estimate_line_items
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients can view own estimate line items" ON public.estimate_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.estimates e
      JOIN public.billing_clients bc ON bc.id = e.client_id
      WHERE e.id = estimate_line_items.estimate_id AND bc.profile_id = auth.uid()
    )
  );

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.billing_clients(id) ON DELETE CASCADE,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  scanned_pdf_url TEXT,
  is_backdated BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all invoices" ON public.invoices
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients can view own invoices" ON public.invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.billing_clients bc
      WHERE bc.id = invoices.client_id AND bc.profile_id = auth.uid()
    )
  );

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || LPAD(nextval('public.invoice_serial_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_number();

-- ============================================
-- INVOICE LINE ITEMS
-- ============================================
CREATE TABLE public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax_percent NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoice line items" ON public.invoice_line_items
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients can view own invoice line items" ON public.invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.billing_clients bc ON bc.id = i.client_id
      WHERE i.id = invoice_line_items.invoice_id AND bc.profile_id = auth.uid()
    )
  );

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.billing_clients(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'upi',
  utr_reference_number TEXT,
  receipt_url TEXT,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_by UUID,
  verified_by UUID,
  verified_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all transactions" ON public.transactions
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients can view own transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.billing_clients bc
      WHERE bc.id = transactions.client_id AND bc.profile_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create own transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.billing_clients bc
      WHERE bc.id = transactions.client_id AND bc.profile_id = auth.uid()
    )
  );

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- BILLING AUDIT LOG
-- ============================================
CREATE TABLE public.billing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  user_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON public.billing_audit_log
  FOR ALL USING (public.is_admin(auth.uid()));

-- ============================================
-- NOTIFICATION TRIGGERS
-- ============================================

-- Notify client when estimate is created/sent
CREATE OR REPLACE FUNCTION public.notify_billing_estimate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  _client_profile_id UUID;
BEGIN
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    SELECT bc.profile_id INTO _client_profile_id
    FROM public.billing_clients bc WHERE bc.id = NEW.client_id;
    
    IF _client_profile_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (_client_profile_id, 'New Estimate Received',
        'Estimate ' || NEW.estimate_number || ' has been shared with you for review.',
        'billing_estimate');
    END IF;
  END IF;
  
  -- Notify admin when client approves/rejects
  IF NEW.status IN ('approved', 'rejected') AND OLD.status != NEW.status AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.created_by,
      CASE WHEN NEW.status = 'approved' THEN 'Estimate Approved' ELSE 'Estimate Rejected' END,
      'Estimate ' || NEW.estimate_number || ' has been ' || NEW.status || '.' ||
        CASE WHEN NEW.rejection_reason IS NOT NULL THEN ' Reason: ' || NEW.rejection_reason ELSE '' END,
      'billing_estimate_response');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_billing_estimate
  AFTER UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.notify_billing_estimate();

-- Notify client when invoice is sent
CREATE OR REPLACE FUNCTION public.notify_billing_invoice()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  _client_profile_id UUID;
BEGIN
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    SELECT bc.profile_id INTO _client_profile_id
    FROM public.billing_clients bc WHERE bc.id = NEW.client_id;
    
    IF _client_profile_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (_client_profile_id, 'New Invoice Received',
        'Invoice ' || NEW.invoice_number || ' of ₹' || NEW.grand_total || ' has been shared with you.',
        'billing_invoice');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_billing_invoice
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.notify_billing_invoice();

-- Notify admin when client uploads transaction
CREATE OR REPLACE FUNCTION public.notify_billing_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  _admin_ids UUID[];
BEGIN
  IF TG_OP = 'INSERT' AND NEW.created_by IS NOT NULL THEN
    -- Notify all admins
    SELECT ARRAY_AGG(user_id) INTO _admin_ids
    FROM public.user_roles WHERE role = 'admin';
    
    IF _admin_ids IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      SELECT unnest(_admin_ids), 'New Payment Receipt',
        'A client has uploaded a payment receipt of ₹' || NEW.amount_paid || ' for verification.',
        'billing_transaction';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_billing_transaction
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_billing_transaction();

-- ============================================
-- STORAGE BUCKET for billing files
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('billing-files', 'billing-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can manage billing files" ON storage.objects
  FOR ALL USING (bucket_id = 'billing-files' AND public.is_admin(auth.uid()));

CREATE POLICY "Clients can upload receipts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'billing-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Billing files are viewable by authenticated users" ON storage.objects
  FOR SELECT USING (bucket_id = 'billing-files' AND auth.role() = 'authenticated');
