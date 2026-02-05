export type LeadStatus = 
  | 'new_lead'
  | 'contacted'
  | 'follow_up_required'
  | 'meeting_scheduled'
  | 'proposal_sent'
  | 'converted'
  | 'lost'
  | 'not_interested';

export interface Lead {
  id: string;
  serial_number: string;
  company_name: string;
  contact_number: string;
  poc_name: string | null;
  poc_number: string | null;
  address: string | null;
  website: string | null;
  requirements: string[];
  other_service: string | null;
  lead_source: string | null;
  status: LeadStatus;
  remarks: string | null;
  follow_up_date: string | null;
  deal_value: number | null;
  conversion_date: string | null;
  latitude: number | null;
  longitude: number | null;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadFilters {
  search: string;
  status: LeadStatus | 'all';
  assignedTo: string | 'all';
  dateFrom: string;
  dateTo: string;
}

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'new_lead', label: 'New Lead', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-purple-500' },
  { value: 'follow_up_required', label: 'Follow Up Required', color: 'bg-yellow-500' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled', color: 'bg-indigo-500' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'bg-orange-500' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-gray-500' },
];

export const SERVICE_OPTIONS = [
  'Website Development',
  'Mobile App Development',
  'UI/UX Design',
  'Digital Marketing',
  'SEO Services',
  'Cloud Solutions',
  'IT Consulting',
  'Other',
];
