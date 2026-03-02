import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Lead, LEAD_STATUS_OPTIONS, LeadStatus } from '@/types/leads';

interface LeadsImportExportProps {
  leads: Lead[];
  onImport: (leads: Partial<Lead>[]) => Promise<{ success: number; errors: string[] }>;
}

const CSV_HEADERS = [
  'company_name',
  'contact_number',
  'email',
  'address',
  'city',
  'pin',
  'state',
  'website',
  'sectors',
  'poc_name',
  'poc_number',
  'requirements',
  'other_service',
  'lead_source',
  'status',
  'remarks',
  'follow_up_date',
  'deal_value',
];

const SAMPLE_CSV = `company_name,contact_number,email,address,city,pin,state,website,sectors,poc_name,poc_number,requirements,other_service,lead_source,status,remarks,follow_up_date,deal_value
Acme Corp,9876543210,info@acme.com,123 Main St,Mumbai,400001,Maharashtra,https://acme.com,"IT & Software,Healthcare",John Doe,9876543211,"Website Development,Mobile App Development",,Referral,new_lead,Interested in web services,2024-02-15,
Tech Solutions,8765432109,contact@tech.com,456 Tech Park,Bangalore,560001,Karnataka,,"Retail & E-commerce",,,"SEO Services",Custom CRM,LinkedIn,contacted,Follow up next week,,50000`;

export function LeadsImportExport({ leads, onImport }: LeadsImportExportProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [previewData, setPreviewData] = useState<Partial<Lead>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (csvText: string): Partial<Lead>[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const results: Partial<Lead>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const lead: Partial<Lead> = {};

      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        if (!value) return;

        switch (header) {
          case 'company_name':
            lead.company_name = value;
            break;
          case 'contact_number':
            lead.contact_number = value;
            break;
          case 'email':
            lead.email = value;
            break;
          case 'poc_name':
            lead.poc_name = value;
            break;
          case 'poc_number':
            lead.poc_number = value;
            break;
          case 'address':
            lead.address = value;
            break;
          case 'city':
            lead.city = value;
            break;
          case 'pin':
            lead.pin = value;
            break;
          case 'state':
            lead.state = value;
            break;
          case 'website':
            lead.website = value;
            break;
          case 'sectors':
            lead.sectors = value.split(',').map(s => s.trim()).filter(Boolean);
            break;
          case 'requirements':
            lead.requirements = value.split(',').map(r => r.trim()).filter(Boolean);
            break;
          case 'other_service':
            lead.other_service = value;
            break;
          case 'lead_source':
            lead.lead_source = value;
            break;
          case 'status':
            const validStatus = LEAD_STATUS_OPTIONS.find(s => s.value === value);
            if (validStatus) lead.status = value as LeadStatus;
            break;
          case 'remarks':
            lead.remarks = value;
            break;
          case 'follow_up_date':
            if (value && !isNaN(Date.parse(value))) {
              lead.follow_up_date = value;
            }
            break;
          case 'deal_value':
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) lead.deal_value = numValue;
            break;
        }
      });

      // Apply defaults for required fields
      if (!lead.company_name) lead.company_name = `Import ${i}`;
      if (!lead.contact_number) lead.contact_number = '-';
      if (!lead.requirements) lead.requirements = [];

      results.push(lead);
    }

    return results;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setPreviewData(parsed);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    setImporting(true);
    setImportProgress(0);

    const result = await onImport(previewData);
    
    setImportProgress(100);
    setImportResult(result);
    setImporting(false);
  };

  const handleExport = () => {
    const csvContent = [
      CSV_HEADERS.join(','),
      ...leads.map(lead => [
        escapeCSV(lead.company_name),
        escapeCSV(lead.contact_number),
        escapeCSV(lead.email || ''),
        escapeCSV(lead.address || ''),
        escapeCSV(lead.city || ''),
        escapeCSV(lead.pin || ''),
        escapeCSV(lead.state || ''),
        escapeCSV(lead.website || ''),
        escapeCSV(lead.sectors?.join(', ') || ''),
        escapeCSV(lead.poc_name || ''),
        escapeCSV(lead.poc_number || ''),
        escapeCSV(lead.requirements?.join(', ') || ''),
        escapeCSV(lead.other_service || ''),
        escapeCSV(lead.lead_source || ''),
        lead.status,
        escapeCSV(lead.remarks || ''),
        lead.follow_up_date || '',
        lead.deal_value?.toString() || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leads_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetImportDialog = () => {
    setPreviewData([]);
    setImportResult(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Import/Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { resetImportDialog(); setImportDialogOpen(true); }}>
            <Upload className="h-4 w-4 mr-2" />
            Import from CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Leads from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk import leads. All fields are optional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Download */}
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Download the template CSV file with sample data</span>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  Download Template
                </Button>
              </AlertDescription>
            </Alert>

            {/* File Upload */}
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
              </label>
            </div>

            {/* Preview */}
            {previewData.length > 0 && !importResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Preview ({previewData.length} leads)</h4>
                </div>
                <div className="max-h-48 overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Company</th>
                        <th className="px-3 py-2 text-left">Contact</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((lead, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{i + 1}</td>
                          <td className="px-3 py-2">{lead.company_name}</td>
                          <td className="px-3 py-2">{lead.contact_number}</td>
                          <td className="px-3 py-2">{lead.status || 'new_lead'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 10 && (
                    <p className="text-xs text-muted-foreground p-2 text-center bg-muted">
                      + {previewData.length - 10} more leads
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Progress */}
            {importing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Importing leads...</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}

            {/* Result */}
            {importResult && (
              <Alert variant={importResult.errors.length > 0 ? 'destructive' : 'default'}>
                {importResult.errors.length > 0 ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <p className="font-medium">
                    Successfully imported {importResult.success} leads
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="mt-2 text-sm list-disc list-inside">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>...and {importResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                {importResult ? 'Close' : 'Cancel'}
              </Button>
              {!importResult && (
                <Button
                  onClick={handleImport}
                  disabled={previewData.length === 0 || importing}
                >
                  {importing ? 'Importing...' : `Import ${previewData.length} Leads`}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
