import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    // Recalculate line total
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

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Service</TableHead>
              <TableHead className="min-w-[140px]">Description</TableHead>
              <TableHead className="w-20">Qty</TableHead>
              <TableHead className="w-28">Unit Price</TableHead>
              <TableHead className="w-20">Tax %</TableHead>
              <TableHead className="w-24">Discount</TableHead>
              <TableHead className="w-28 text-right">Total</TableHead>
              {!readOnly && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  {readOnly ? item.service_name : (
                    <Input value={item.service_name} onChange={e => updateItem(idx, 'service_name', e.target.value)} placeholder="Service name" className="h-8" />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (item.description || '-') : (
                    <Input value={item.description || ''} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" className="h-8" />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? item.quantity : (
                    <Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="h-8" min={1} />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? `₹${Number(item.unit_price).toLocaleString()}` : (
                    <Input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} className="h-8" min={0} />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? `${item.tax_percent}%` : (
                    <Input type="number" value={item.tax_percent} onChange={e => updateItem(idx, 'tax_percent', Number(e.target.value))} className="h-8" min={0} max={100} />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? `₹${Number(item.discount).toLocaleString()}` : (
                    <Input type="number" value={item.discount} onChange={e => updateItem(idx, 'discount', Number(e.target.value))} className="h-8" min={0} />
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">₹{item.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                {!readOnly && (
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={readOnly ? 7 : 8} className="text-center text-muted-foreground py-8">
                  No line items added
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
          <Plus className="h-4 w-4" /> Add Line Item
        </Button>
      )}

      <div className="flex justify-end">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>₹{totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          {totalDiscount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-₹{totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
          <div className="flex justify-between font-bold text-base border-t pt-2"><span>Grand Total</span><span>₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        </div>
      </div>
    </div>
  );
}
