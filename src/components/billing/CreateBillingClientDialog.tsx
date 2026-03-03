import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBillingMutations } from '@/hooks/useBilling';
import { supabase } from '@/integrations/supabase/client';

export default function CreateBillingClientDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { createBillingClient } = useBillingMutations();
  const [clientProfiles, setClientProfiles] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [profileId, setProfileId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    const fetchClients = async () => {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
      setClientProfiles(profiles || []);
    };
    fetchClients();
  }, [open]);

  const handleSubmit = async () => {
    if (!profileId) return;
    await createBillingClient.mutateAsync({
      profile_id: profileId,
      company_name: companyName || undefined,
      gst_number: gstNumber || undefined,
      billing_address: billingAddress || undefined,
      billing_city: billingCity || undefined,
      billing_state: billingState || undefined,
      billing_zip: billingZip || undefined,
      billing_email: billingEmail || undefined,
      billing_phone: billingPhone || undefined,
      notes: notes || undefined,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Billing Client</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>User Account *</Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger><SelectValue placeholder="Select a client user" /></SelectTrigger>
              <SelectContent>
                {clientProfiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!profileId || createBillingClient.isPending}>
              {createBillingClient.isPending ? 'Creating...' : 'Add Client'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
