import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { recurrencePatterns, weekDays } from '@/lib/calendar-utils';

interface RecurrenceOptionsProps {
  isRecurring: boolean;
  onIsRecurringChange: (value: boolean) => void;
  recurrencePattern: string;
  onRecurrencePatternChange: (value: string) => void;
  recurrenceInterval: number;
  onRecurrenceIntervalChange: (value: number) => void;
  recurrenceEndDate: string;
  onRecurrenceEndDateChange: (value: string) => void;
  recurrenceDays: string[];
  onRecurrenceDaysChange: (value: string[]) => void;
}

export default function RecurrenceOptions({
  isRecurring,
  onIsRecurringChange,
  recurrencePattern,
  onRecurrencePatternChange,
  recurrenceInterval,
  onRecurrenceIntervalChange,
  recurrenceEndDate,
  onRecurrenceEndDateChange,
  recurrenceDays,
  onRecurrenceDaysChange,
}: RecurrenceOptionsProps) {
  const toggleDay = (day: string) => {
    if (recurrenceDays.includes(day)) {
      onRecurrenceDaysChange(recurrenceDays.filter(d => d !== day));
    } else {
      onRecurrenceDaysChange([...recurrenceDays, day]);
    }
  };

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="is-recurring" className="cursor-pointer">
          Recurring meeting
        </Label>
        <Switch
          id="is-recurring"
          checked={isRecurring}
          onCheckedChange={onIsRecurringChange}
        />
      </div>

      {isRecurring && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Repeat</Label>
              <Select value={recurrencePattern} onValueChange={onRecurrencePatternChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pattern" />
                </SelectTrigger>
                <SelectContent>
                  {recurrencePatterns.map((pattern) => (
                    <SelectItem key={pattern.value} value={pattern.value}>
                      {pattern.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurrence-interval">Every</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="recurrence-interval"
                  type="number"
                  min={1}
                  max={99}
                  value={recurrenceInterval}
                  onChange={(e) => onRecurrenceIntervalChange(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {recurrencePattern === 'daily' && (recurrenceInterval > 1 ? 'days' : 'day')}
                  {recurrencePattern === 'weekly' && (recurrenceInterval > 1 ? 'weeks' : 'week')}
                  {recurrencePattern === 'monthly' && (recurrenceInterval > 1 ? 'months' : 'month')}
                  {recurrencePattern === 'yearly' && (recurrenceInterval > 1 ? 'years' : 'year')}
                </span>
              </div>
            </div>
          </div>

          {recurrencePattern === 'weekly' && (
            <div className="space-y-2">
              <Label>On days</Label>
              <div className="flex flex-wrap gap-1">
                {weekDays.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`
                      px-3 py-1.5 text-xs rounded-md font-medium transition-colors
                      ${recurrenceDays.includes(day.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }
                    `}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="recurrence-end">Ends on (optional)</Label>
            <Input
              id="recurrence-end"
              type="date"
              value={recurrenceEndDate}
              onChange={(e) => onRecurrenceEndDateChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
