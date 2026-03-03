import { Plus, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { LineItem } from '@/hooks/useBilling';

interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  readOnly?: boolean;
}

export default function LineItemsEditor({ items, onChange, readOnly }: LineItemsEditorProps) {
  const addItem = () => {
    onChange([
      ...items,
      { service_name: '', description: '', quantity: 1, unit_price: 0, tax_percent: 18, discount: 0, line_total: 0, sort_order: items.length },
    ]);
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    const item = updated[index];
    const base = item.quantity * item.unit_price - item.discount;
    item.line_total = base + base * item.tax_percent / 100;
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price - i.discount, 0);
  const totalTax = items.reduce((s, i) => s + (i.quantity * i.unit_price - i.discount) * i.tax_percent / 100, 0);
  const totalDiscount = items.reduce((s, i) => s + i.discount, 0);
  const grandTotal = subtotal + totalTax;

  const fmt = (n: number) => `₹${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Line Items</h3>
        </div>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addItem} className="gap-1.5 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Item
          </Button>
        )}
      </div>

      {/* Items as cards instead of table */}
      {items.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No line items added yet</p>
          {!readOnly && (
            <Button variant="ghost" size="sm" onClick={addItem} className="mt-2 gap-1.5 text-primary">
              <Plus className="h-3.5 w-3.5" /> Add your first item
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-lg border bg-card p-3 space-y-3 relative group">
              {/* Row 1: Service & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Service *</Label>
                  {readOnly ? (
                    <p className="text-sm font-medium">{item.service_name}</p>
                  ) : (
                    <Input
                      value={item.service_name}
                      onChange={e => updateItem(idx, 'service_name', e.target.value)}
                      placeholder="e.g. Web Development"
                      className="h-9"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  {readOnly ? (
                    <p className="text-sm">{item.description || '-'}</p>
                  ) : (
                    <Input
                      value={item.description || ''}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      placeholder="Brief description"
                      className="h-9"
                    />
                  )}
                </div>
              </div>

              {/* Row 2: Numbers */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  {readOnly ? (
                    <p className="text-sm font-medium">{item.quantity}</p>
                  ) : (
                    <Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="h-9" min={1} />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Unit Price (₹)</Label>
                  {readOnly ? (
                    <p className="text-sm font-medium">{fmt(item.unit_price)}</p>
                  ) : (
                    <Input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} className="h-9" min={0} />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tax %</Label>
                  {readOnly ? (
                    <p className="text-sm font-medium">{item.tax_percent}%</p>
                  ) : (
                    <Input type="number" value={item.tax_percent} onChange={e => updateItem(idx, 'tax_percent', Number(e.target.value))} className="h-9" min={0} max={100} />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Discount (₹)</Label>
                  {readOnly ? (
                    <p className="text-sm font-medium">{fmt(item.discount)}</p>
                  ) : (
                    <Input type="number" value={item.discount} onChange={e => updateItem(idx, 'discount', Number(e.target.value))} className="h-9" min={0} />
                  )}
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <p className="text-sm font-bold text-primary h-9 flex items-center">{fmt(item.line_total)}</p>
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive/60 hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {items.length > 0 && (
        <>
          <Separator />
          <div className="flex justify-end">
            <div className="w-72 space-y-1.5 text-sm">
              <div className="flex justify-between px-2 py-1">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{fmt(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between px-2 py-1">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-destructive">-{fmt(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between px-2 py-1">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">{fmt(totalTax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between px-2 py-1.5 rounded-md bg-primary/5">
                <span className="font-bold text-base">Grand Total</span>
                <span className="font-bold text-base text-primary">{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
