import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Building2, Save, Upload, Loader2, Landmark, Globe } from 'lucide-react';
import LogoLoader from '@/components/ui/LogoLoader';

interface CompanySettingsData {
  id: string;
  company_name: string;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  company_city: string | null;
  company_state: string | null;
  company_zip: string | null;
  gst_number: string | null;
  pan_number: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  logo_url: string | null;
  website: string | null;
}

export default function CompanySettings() {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<CompanySettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .single();
    if (error) {
      toast.error('Failed to load company settings');
    } else {
      setSettings(data as CompanySettingsData);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from('company_settings')
      .update({
        company_name: settings.company_name,
        company_email: settings.company_email,
        company_phone: settings.company_phone,
        company_address: settings.company_address,
        company_city: settings.company_city,
        company_state: settings.company_state,
        company_zip: settings.company_zip,
        gst_number: settings.gst_number,
        pan_number: settings.pan_number,
        bank_name: settings.bank_name,
        bank_account_number: settings.bank_account_number,
        bank_ifsc: settings.bank_ifsc,
        bank_branch: settings.bank_branch,
        website: settings.website,
      })
      .eq('id', settings.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Company settings saved!');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `company-logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('billing-files')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error('Failed to upload logo');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('billing-files').getPublicUrl(path);

    const { error: updateError } = await supabase
      .from('company_settings')
      .update({ logo_url: urlData.publicUrl })
      .eq('id', settings.id);

    if (updateError) {
      toast.error('Failed to save logo URL');
    } else {
      setSettings({ ...settings, logo_url: urlData.publicUrl });
      toast.success('Logo uploaded successfully!');
    }
    setUploading(false);
  };

  const update = (field: keyof CompanySettingsData, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value || null });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LogoLoader size="md" text="Loading settings..." />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Only admins can manage company settings.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Company Settings</h1>
          <p className="text-muted-foreground text-sm">
            These details appear on estimates and invoices
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Logo & Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Branding & Logo
          </CardTitle>
          <CardDescription>Upload your company logo for PDF headers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="h-24 w-48 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted/30">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Company Logo" className="h-full w-full object-contain p-2" />
              ) : (
                <span className="text-muted-foreground text-sm">No logo</span>
              )}
            </div>
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <Button variant="outline" asChild disabled={uploading}>
                  <span>
                    {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                  </span>
                </Button>
              </Label>
              <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <p className="text-xs text-muted-foreground mt-1">PNG or JPG, recommended 400×120px</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" /> Company Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Company Name *</Label>
            <Input value={settings?.company_name || ''} onChange={e => update('company_name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={settings?.website || ''} onChange={e => update('website', e.target.value)} placeholder="https://" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={settings?.company_email || ''} onChange={e => update('company_email', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={settings?.company_phone || ''} onChange={e => update('company_phone', e.target.value)} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Address</Label>
            <Textarea value={settings?.company_address || ''} onChange={e => update('company_address', e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={settings?.company_city || ''} onChange={e => update('company_city', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input value={settings?.company_state || ''} onChange={e => update('company_state', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ZIP Code</Label>
            <Input value={settings?.company_zip || ''} onChange={e => update('company_zip', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>GST Number</Label>
            <Input value={settings?.gst_number || ''} onChange={e => update('gst_number', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>PAN Number</Label>
            <Input value={settings?.pan_number || ''} onChange={e => update('pan_number', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" /> Bank Details
          </CardTitle>
          <CardDescription>Shown on invoices for payment reference</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input value={settings?.bank_name || ''} onChange={e => update('bank_name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input value={settings?.bank_account_number || ''} onChange={e => update('bank_account_number', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>IFSC Code</Label>
            <Input value={settings?.bank_ifsc || ''} onChange={e => update('bank_ifsc', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Branch</Label>
            <Input value={settings?.bank_branch || ''} onChange={e => update('bank_branch', e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
