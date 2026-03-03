
-- Company settings table (singleton pattern - one row)
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Converza Meet',
  company_email text,
  company_phone text,
  company_address text,
  company_city text,
  company_state text,
  company_zip text,
  gst_number text,
  pan_number text,
  bank_name text,
  bank_account_number text,
  bank_ifsc text,
  bank_branch text,
  logo_url text,
  website text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage company settings
CREATE POLICY "Admins can manage company settings"
  ON public.company_settings FOR ALL
  USING (is_admin(auth.uid()));

-- All authenticated users can read (needed for PDF generation)
CREATE POLICY "Authenticated users can read company settings"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (true);

-- Insert default row
INSERT INTO public.company_settings (company_name, company_email, company_phone)
VALUES ('Converza Meet', 'info@converza.com', '+91 XXXXXXXXXX');

-- Trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
