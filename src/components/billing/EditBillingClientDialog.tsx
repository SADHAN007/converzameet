import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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

    supabase.from('projects').select('id, name').order('name').then(({ data }) => {
      setProjects(data || []);
    });
  }, [open, client]);

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
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
