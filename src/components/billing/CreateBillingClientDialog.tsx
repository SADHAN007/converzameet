import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useBillingMutations } from '@/hooks/useBilling';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { UserPlus, Building2, Upload, X, Image } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  };

  const { createBillingClient } = useBillingMutations();
  const [linkToProfile, setLinkToProfile] = useState(false);
  const [clientProfiles, setClientProfiles] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [profileId, setProfileId] = useState('');
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [secondaryContact, setSecondaryContact] = useState('');
  const [billingFrequency, setBillingFrequency] = useState('one_time');
  const [notes, setNotes] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [profileSearch, setProfileSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

  // Auto-fill from selected profile
  useEffect(() => {
    if (!profileId || !linkToProfile) return;
    const profile = clientProfiles.find(p => p.id === profileId);
    if (profile) {
      if (!clientName && profile.full_name) setClientName(profile.full_name);
      if (!billingEmail && profile.email) setBillingEmail(profile.email);
    }
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!clientName.trim() && !companyName.trim()) {
      newErrors.clientName = 'Client name or company name is required';
    }
    if (billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) {
      newErrors.billingEmail = 'Invalid email format';
    }
    if (billingPhone && !/^[\d\s\-+()]{7,15}$/.test(billingPhone)) {
      newErrors.billingPhone = 'Invalid phone number';
    }
    if (gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber)) {
      newErrors.gstNumber = 'Invalid GST format (e.g. 22AAAAA0000A1Z5)';
    }
    if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
      newErrors.panNumber = 'Invalid PAN format (e.g. ABCDE1234F)';
    }
    if (linkToProfile && !profileId) {
      newErrors.profileId = 'Please select a user account';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Max file size is 2MB'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (clientId: string): Promise<string | null> => {
    if (!logoFile) return null;
    const ext = logoFile.name.split('.').pop();
    const path = `client-logos/${clientId}.${ext}`;
    const { error } = await supabase.storage.from('billing-files').upload(path, logoFile, { upsert: true });
    if (error) { toast.error('Logo upload failed'); return null; }
    const { data: { publicUrl } } = supabase.storage.from('billing-files').getPublicUrl(path);
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const billingClient = await createBillingClient.mutateAsync({
        profile_id: linkToProfile && profileId ? profileId : undefined,
        client_name: clientName || undefined,
        company_name: companyName || undefined,
        gst_number: gstNumber || undefined,
        pan_number: panNumber || undefined,
        billing_address: billingAddress || undefined,
        billing_city: billingCity || undefined,
        billing_state: billingState || undefined,
        billing_zip: billingZip || undefined,
        billing_email: billingEmail || undefined,
        billing_phone: billingPhone || undefined,
        secondary_contact: secondaryContact || undefined,
        billing_frequency: billingFrequency,
        notes: notes || undefined,
      });

      if (billingClient?.id) {
        // Upload logo
        if (logoFile) {
          const logoUrl = await uploadLogo(billingClient.id);
          if (logoUrl) {
            await supabase.from('billing_clients').update({ logo_url: logoUrl }).eq('id', billingClient.id);
          }
        }
        // Link projects
        if (selectedProjects.length > 0) {
          const { error: linkError } = await supabase.from('billing_client_projects').insert(
            selectedProjects.map(pid => ({ billing_client_id: billingClient.id, project_id: pid }))
          );
          if (linkError) toast.error(linkError.message);
        }
      }

      setOpen(false);
      resetForm();
      onCreated?.();
    } catch {
      // Error handled by mutation's onError
    }
  };

  const resetForm = () => {
    setLinkToProfile(false);
    setProfileId('');
    setClientName('');
    setCompanyName('');
    setGstNumber('');
    setPanNumber('');
    setBillingAddress('');
    setBillingCity('');
    setBillingState('');
    setBillingZip('');
    setBillingEmail('');
    setBillingPhone('');
    setSecondaryContact('');
    setBillingFrequency('one_time');
    setNotes('');
    setSelectedProjects([]);
    setProfileSearch('');
    setErrors({});
    setLogoFile(null);
    setLogoPreview('');
  };

  const dialogContent = (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Add Billing Client
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {/* Client Logo Upload */}
        <div className="flex items-center gap-4 rounded-lg border p-3">
          <Avatar className="h-16 w-16 rounded-xl border-2 border-dashed border-border">
            <AvatarImage src={logoPreview} className="object-cover" />
            <AvatarFallback className="rounded-xl bg-muted">
              <Image className="h-6 w-6 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <Label className="text-sm font-medium">Client Logo</Label>
            <p className="text-xs text-muted-foreground">Upload a logo (max 2MB, JPG/PNG)</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                <label className="cursor-pointer">
                  <Upload className="h-3 w-3" />
                  {logoFile ? 'Change' : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
                </label>
              </Button>
              {logoFile && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setLogoFile(null); setLogoPreview(''); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Link to user account toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Link to User Account</Label>
            <p className="text-xs text-muted-foreground">Connect to an existing system user</p>
          </div>
          <Switch checked={linkToProfile} onCheckedChange={setLinkToProfile} />
        </div>

        {/* Profile selector (only if linked) */}
        {linkToProfile && (
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
            {errors.profileId && <p className="text-xs text-destructive">{errors.profileId}</p>}
          </div>
        )}

        {/* Client Name & Company */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Client Name {!companyName ? '*' : ''}</Label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full name" />
            {errors.clientName && <p className="text-xs text-destructive">{errors.clientName}</p>}
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Company</Label>
            <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company name" />
          </div>
        </div>

        {/* Tax & Legal */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>GST Number</Label>
            <Input value={gstNumber} onChange={e => setGstNumber(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} />
            {errors.gstNumber && <p className="text-xs text-destructive">{errors.gstNumber}</p>}
          </div>
          <div className="space-y-2">
            <Label>PAN Number</Label>
            <Input value={panNumber} onChange={e => setPanNumber(e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
            {errors.panNumber && <p className="text-xs text-destructive">{errors.panNumber}</p>}
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={billingEmail} onChange={e => setBillingEmail(e.target.value)} placeholder="billing@example.com" type="email" />
            {errors.billingEmail && <p className="text-xs text-destructive">{errors.billingEmail}</p>}
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={billingPhone} onChange={e => setBillingPhone(e.target.value)} placeholder="+91 98765 43210" />
            {errors.billingPhone && <p className="text-xs text-destructive">{errors.billingPhone}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Secondary Contact</Label>
          <Input value={secondaryContact} onChange={e => setSecondaryContact(e.target.value)} placeholder="Alternative phone or email" />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={billingAddress} onChange={e => setBillingAddress(e.target.value)} placeholder="Street address" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2"><Label>City</Label><Input value={billingCity} onChange={e => setBillingCity(e.target.value)} /></div>
          <div className="space-y-2"><Label>State</Label><Input value={billingState} onChange={e => setBillingState(e.target.value)} /></div>
          <div className="space-y-2"><Label>ZIP</Label><Input value={billingZip} onChange={e => setBillingZip(e.target.value)} /></div>
        </div>

        {/* Billing Frequency */}
        <div className="space-y-2">
          <Label>Billing Frequency</Label>
          <Select value={billingFrequency} onValueChange={setBillingFrequency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="one_time">One Time</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="half_yearly">Half Yearly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Assign Projects */}
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

        <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Internal notes about this client..." /></div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createBillingClient.isPending}>
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
