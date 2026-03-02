import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MapPin } from 'lucide-react';
import { SERVICE_OPTIONS, SECTOR_OPTIONS, LEAD_STATUS_OPTIONS } from '@/types/leads';

const leadSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200),
  contact_number: z.string().min(10, 'Valid contact number is required').max(15),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  poc_name: z.string().max(100).optional(),
  poc_number: z.string().max(15).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  pin: z.string().max(10).optional(),
  state: z.string().max(100).optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  requirements: z.array(z.string()).min(1, 'Select at least one requirement'),
  sectors: z.array(z.string()).optional(),
  other_service: z.string().max(200).optional(),
  lead_source: z.string().max(200).optional(),
  status: z.string().default('new_lead'),
  remarks: z.string().max(1000).optional(),
  follow_up_date: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface CreateLeadDialogProps {
  onSubmit: (data: LeadFormData & { latitude?: number; longitude?: number }) => Promise<{ error: string | null }>;
}

export function CreateLeadDialog({ onSubmit }: CreateLeadDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      company_name: '',
      contact_number: '',
      email: '',
      poc_name: '',
      poc_number: '',
      address: '',
      city: '',
      pin: '',
      state: '',
      website: '',
      requirements: [],
      sectors: [],
      other_service: '',
      lead_source: '',
      status: 'new_lead',
      remarks: '',
      follow_up_date: '',
    },
  });

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const handleSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    const result = await onSubmit({
      ...data,
      latitude: location?.lat,
      longitude: location?.lng,
    });
    setIsSubmitting(false);

    if (!result.error) {
      form.reset();
      setLocation(null);
      setOpen(false);
    }
  };

  const requirements = form.watch('requirements');
  const showOtherField = requirements.includes('Other');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lead</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {/* Company Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter company name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="company@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile No *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter mobile number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WebLink</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="Street address" {...field} className="flex-1" />
                      </FormControl>
                      <Button type="button" variant="outline" size="icon" onClick={handleGetLocation}>
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                    {location && (
                      <p className="text-xs text-muted-foreground">
                        Location captured: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PIN</FormLabel>
                      <FormControl>
                        <Input placeholder="PIN code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Point of Contact */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Point of Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="poc_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>POC Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Point of contact name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="poc_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>POC Number</FormLabel>
                      <FormControl>
                        <Input placeholder="POC contact number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sectors */}
            <FormField
              control={form.control}
              name="sectors"
              render={() => (
                <FormItem>
                  <FormLabel>Sectors</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {SECTOR_OPTIONS.map((sector) => (
                      <FormField
                        key={sector}
                        control={form.control}
                        name="sectors"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(sector)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, sector]);
                                  } else {
                                    field.onChange(current.filter((v) => v !== sector));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {sector}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Requirements */}
            <FormField
              control={form.control}
              name="requirements"
              render={() => (
                <FormItem>
                  <FormLabel>Requirements *</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {SERVICE_OPTIONS.map((service) => (
                      <FormField
                        key={service}
                        control={form.control}
                        name="requirements"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(service)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, service]);
                                  } else {
                                    field.onChange(current.filter((v) => v !== service));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {service}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showOtherField && (
              <FormField
                control={form.control}
                name="other_service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Service Details</FormLabel>
                    <FormControl>
                      <Input placeholder="Specify other services" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Status & Source */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lead_source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Source</FormLabel>
                    <FormControl>
                      <Input placeholder="Where did this lead come from?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEAD_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="follow_up_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Follow-up Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Lead'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
