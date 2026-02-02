import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, User, Building2, MapPin, Phone, Loader2, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  company_name: string | null;
  job_title: string | null;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<ProfileData>>({});

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload avatar',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          street_address: formData.street_address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          company_name: formData.company_name,
          job_title: formData.job_title,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...formData } : null);

      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(formData);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your personal information</p>
      </div>

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Picture
          </CardTitle>
          <CardDescription>Click on the avatar to upload a new picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative cursor-pointer group"
              onClick={handleAvatarClick}
            >
              <Avatar className="h-24 w-24">
                <AvatarImage src={formData.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(formData.full_name || null, profile?.email || '')}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </motion.div>
            <div>
              <p className="font-medium">{formData.full_name || profile?.email}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Address
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={formData.street_address || ''}
              onChange={(e) => handleInputChange('street_address', e.target.value)}
              placeholder="123 Main Street"
            />
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city || ''}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="New York"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state || ''}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="NY"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={formData.zip_code || ''}
                onChange={(e) => handleInputChange('zip_code', e.target.value)}
                placeholder="10001"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={formData.company_name || ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.job_title || ''}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
                placeholder="Project Manager"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: hasChanges ? 1 : 0.5 }}
        className="flex justify-end gap-3 pb-6"
      >
        {hasChanges && (
          <Button
            variant="outline"
            onClick={() => setFormData(profile || {})}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
