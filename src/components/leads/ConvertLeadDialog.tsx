import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ConvertLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  onConvert: (dealValue: number | null, conversionDate: string) => Promise<void>;
}

export function ConvertLeadDialog({
  open,
  onOpenChange,
  leadName,
  onConvert,
}: ConvertLeadDialogProps) {
  const [dealValue, setDealValue] = useState('');
  const [conversionDate, setConversionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [converting, setConverting] = useState(false);

  const handleConvert = async () => {
    setConverting(true);
    try {
      const value = dealValue ? parseFloat(dealValue) : null;
      await onConvert(value, conversionDate);
      onOpenChange(false);
      setDealValue('');
      setConversionDate(format(new Date(), 'yyyy-MM-dd'));
    } finally {
      setConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Convert Lead
          </DialogTitle>
          <DialogDescription>
            Mark <span className="font-medium text-foreground">{leadName}</span> as converted
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="dealValue">Deal Value (₹)</Label>
            <Input
              id="dealValue"
              type="number"
              placeholder="Enter deal amount"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conversionDate">Conversion Date</Label>
            <Input
              id="conversionDate"
              type="date"
              value={conversionDate}
              onChange={(e) => setConversionDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConvert} disabled={converting} className="bg-green-600 hover:bg-green-700">
              {converting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                'Mark as Converted'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
