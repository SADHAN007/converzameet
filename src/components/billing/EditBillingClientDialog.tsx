import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, X, Image } from 'lucide-react';

interface Props {
  client: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditBillingClientDialog({ client, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  useEffect(() => {
    if (!open || !client) return;
    setCompanyName(client.company_name || '');
    setGstNumber(client.gst_number || '');
    setBillingAddress(client.billing_address || '');
    setBillingCity(client.billing_city || '');
    setBillingState(client.billing_state || '');
    setBillingZip(client.billing_zip || '');
    setBillingEmail(client.billing_email || '');
    setBillingPhone(client.billing_phone || '');
    setNotes(client.notes || '');
    setIsActive(client.is_active);
    setSelectedProjects((client.assigned_projects || []).map((p: any) => p.id));
    setLogoPreview(client.logo_url || '');
    setLogoFile(null);

    supabase.from('projects').select('id, name').order('name').then(({ data }) => {
      setProjects(data || []);
    });
  }, [open, client]);

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Max file size is 2MB'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Upload logo if changed
      let logoUrl = client.logo_url || null;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `client-logos/${client.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('billing-files').upload(path, logoFile, { upsert: true });
        if (uploadErr) toast.error('Logo upload failed');
        else {
          const { data: { publicUrl } } = supabase.storage.from('billing-files').getPublicUrl(path);
          logoUrl = publicUrl;
        }
      }

      const { error } = await supabase.from('billing_clients').update({
        company_name: companyName || null,
        gst_number: gstNumber || null,
        billing_address: billingAddress || null,
        billing_city: billingCity || null,
        billing_state: billingState || null,
        billing_zip: billingZip || null,
        billing_email: billingEmail || null,
        billing_phone: billingPhone || null,
        notes: notes || null,
        is_active: isActive,
        logo_url: logoUrl,
      }).eq('id', client.id);
      if (error) throw error;

      // Sync project assignments
      const currentIds = (client.assigned_projects || []).map((p: any) => p.id) as string[];
      const toAdd = selectedProjects.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter((id: string) => !selectedProjects.includes(id));

      if (toRemove.length > 0) {
        await supabase.from('billing_client_projects')
          .delete()
          .eq('billing_client_id', client.id)
          .in('project_id', toRemove);
      }
      if (toAdd.length > 0) {
        await supabase.from('billing_client_projects').insert(
          toAdd.map(pid => ({ billing_client_id: client.id, project_id: pid }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['billing-clients'] });
      toast.success('Client updated');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Billing Client</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Logo Upload */}
          <div className="flex items-center gap-4 rounded-lg border p-3">
            <Avatar className="h-16 w-16 rounded-xl border-2 border-dashed border-border">
              <AvatarImage src={logoPreview} className="object-cover" />
              <AvatarFallback className="rounded-xl bg-muted">
                <Image className="h-6 w-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <Label className="text-sm font-medium">Client Logo</Label>
              <p className="text-xs text-muted-foreground">Upload a logo (max 2MB)</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-3 w-3" />
                    {logoPreview ? 'Change' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
                  </label>
                </Button>
                {logoPreview && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setLogoFile(null); setLogoPreview(''); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {client.profiles?.full_name || client.profiles?.email}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Company Name</Label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>
            <div className="space-y-2"><Label>GST Number</Label><Input value={gstNumber} onChange={e => setGstNumber(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={billingEmail} onChange={e => setBillingEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={billingPhone} onChange={e => setBillingPhone(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Address</Label><Input value={billingAddress} onChange={e => setBillingAddress(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>City</Label><Input value={billingCity} onChange={e => setBillingCity(e.target.value)} /></div>
            <div className="space-y-2"><Label>State</Label><Input value={billingState} onChange={e => setBillingState(e.target.value)} /></div>
            <div className="space-y-2"><Label>ZIP</Label><Input value={billingZip} onChange={e => setBillingZip(e.target.value)} /></div>
          </div>

          <div className="space-y-2">
            <Label>Assign Projects</Label>
            <ScrollArea className="h-36 border rounded-md p-2">
              {projects.map(p => (
                <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent/10 rounded cursor-pointer">
                  <Checkbox
                    checked={selectedProjects.includes(p.id)}
                    onCheckedChange={() => toggleProject(p.id)}
                  />
                  <span className="text-sm">{p.name}</span>
                </label>
              ))}
              {projects.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground text-center">No projects available</p>
              )}
            </ScrollArea>
            {selectedProjects.length > 0 && (
              <p className="text-xs text-muted-foreground">{selectedProjects.length} project(s) selected</p>
            )}
          </div>

          <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Active</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
