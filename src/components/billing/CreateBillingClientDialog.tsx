import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useBillingMutations } from '@/hooks/useBilling';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Props {
  children?: React.ReactNode;
  onCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function CreateBillingClientDialog({ children, onCreated, open: controlledOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) {
      onOpenChange?.(v);
    } else {
      setInternalOpen(v);
    }
  };

  const { createBillingClient } = useBillingMutations();
  const [clientProfiles, setClientProfiles] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
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
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [profileSearch, setProfileSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      const [profilesRes, projectsRes, existingClientsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').order('full_name'),
        supabase.from('projects').select('id, name').order('name'),
        supabase.from('billing_clients').select('profile_id'),
      ]);
      const existingProfileIds = new Set((existingClientsRes.data || []).map(c => c.profile_id));
      setClientProfiles((profilesRes.data || []).filter(p => !existingProfileIds.has(p.id)));
      setProjects(projectsRes.data || []);
    };
    fetchData();
  }, [open]);

  const filteredProfiles = profileSearch
    ? clientProfiles.filter(p =>
        (p.full_name || '').toLowerCase().includes(profileSearch.toLowerCase()) ||
        p.email.toLowerCase().includes(profileSearch.toLowerCase())
      )
    : clientProfiles;

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const handleSubmit = async () => {
    if (!profileId) return;

    const billingClient = await createBillingClient.mutateAsync({
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

    if (selectedProjects.length > 0 && billingClient?.id) {
      const { data: existingLinks, error: existingLinksError } = await supabase
        .from('billing_client_projects')
        .select('project_id')
        .eq('billing_client_id', billingClient.id);

      if (existingLinksError) {
        toast.error(existingLinksError.message);
        return;
      }

      const existingProjectIds = new Set((existingLinks || []).map(link => link.project_id));
      const linksToInsert = selectedProjects
        .filter(projectId => !existingProjectIds.has(projectId))
        .map(projectId => ({ billing_client_id: billingClient.id, project_id: projectId }));

      if (linksToInsert.length > 0) {
        const { error: linkInsertError } = await supabase.from('billing_client_projects').insert(linksToInsert);
        if (linkInsertError) {
          toast.error(linkInsertError.message);
          return;
        }
      }
    }

    setOpen(false);
    resetForm();
    onCreated?.();
  };

  const resetForm = () => {
    setProfileId('');
    setCompanyName('');
    setGstNumber('');
    setBillingAddress('');
    setBillingCity('');
    setBillingState('');
    setBillingZip('');
    setBillingEmail('');
    setBillingPhone('');
    setNotes('');
    setSelectedProjects([]);
    setProfileSearch('');
  };

  const dialogContent = (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Add Billing Client</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>User Account *</Label>
          <Input
            placeholder="Search by name or email..."
            value={profileSearch}
            onChange={e => setProfileSearch(e.target.value)}
            className="mb-2"
          />
          <ScrollArea className="h-32 border rounded-md">
            {filteredProfiles.map(p => (
              <button
                key={p.id}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/10 transition-colors ${profileId === p.id ? 'bg-accent/10 font-medium' : ''}`}
                onClick={() => setProfileId(p.id)}
              >
                <span>{p.full_name || p.email}</span>
                {p.full_name && <span className="text-xs text-muted-foreground ml-2">{p.email}</span>}
              </button>
            ))}
            {filteredProfiles.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground text-center">No users found</p>
            )}
          </ScrollArea>
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
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!profileId || createBillingClient.isPending}>
            {createBillingClient.isPending ? 'Creating...' : 'Add Client'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
