import { useState, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  company_name: string | null;
  client_name?: string | null;
  billing_email?: string | null;
  profiles?: { full_name: string | null; email: string | null } | null;
  [key: string]: any;
}

interface ClientSearchSelectProps {
  clients: Client[];
  value: string;
  onChange: (value: string) => void;
  onAddNew?: () => void;
  placeholder?: string;
}

export default function ClientSearchSelect({ clients, value, onChange, onAddNew, placeholder = 'Select client' }: ClientSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const getLabel = (c: Client) => c.company_name || c.client_name || (c.profiles as any)?.full_name || (c.profiles as any)?.email || c.billing_email || 'Unknown';

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c => {
      const label = getLabel(c).toLowerCase();
      const email = (((c.profiles as any)?.email || c.billing_email) || '').toLowerCase();
      return label.includes(q) || email.includes(q);
    });
  }, [clients, search]);

  const selectedClient = clients.find(c => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {selectedClient ? getLabel(selectedClient) : <span className="text-muted-foreground">{placeholder}</span>}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground text-center">No clients found</p>
          )}
          {filtered.map(c => (
            <button
              key={c.id}
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-accent/10 transition-colors flex flex-col',
                value === c.id && 'bg-accent/10 font-medium'
              )}
              onClick={() => { onChange(c.id); setOpen(false); setSearch(''); }}
            >
              <span>{getLabel(c)}</span>
              {((c.profiles as any)?.email || c.billing_email) && (
                <span className="text-xs text-muted-foreground">{(c.profiles as any)?.email || c.billing_email}</span>
              )}
            </button>
          ))}
        </div>
        {onAddNew && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full gap-2 text-primary" onClick={() => { onAddNew(); setOpen(false); }}>
              <Plus className="h-4 w-4" /> Add New Client
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
