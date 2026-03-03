import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface LineItem {
  service_name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  discount: number;
  line_total: number;
}

interface ClientInfo {
  company_name?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_zip?: string | null;
  billing_email?: string | null;
  billing_phone?: string | null;
  gst_number?: string | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
}

interface PdfData {
  type: 'estimate' | 'invoice';
  number: string;
  date: string;
  due_date?: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  amount_paid?: number;
  notes?: string | null;
  terms?: string | null;
  client: ClientInfo;
  lineItems: LineItem[];
}

const COLORS = {
  primary: [30, 58, 138] as [number, number, number],      // deep blue
  primaryLight: [219, 234, 254] as [number, number, number], // light blue bg
  dark: [31, 41, 55] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  accent: [16, 185, 129] as [number, number, number],       // green accent
};

function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fillColor: [number, number, number]) {
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

export async function generateBillingPdf(data: PdfData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // === HEADER BAR ===
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Title
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(data.type === 'estimate' ? 'ESTIMATE' : 'INVOICE', margin, 26);

  // Number badge
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.type === 'estimate' ? 'EST' : 'INV'}: ${data.number}`, pageWidth - margin, 18, { align: 'right' });
  doc.text(`Date: ${format(new Date(data.date), 'dd MMM yyyy')}`, pageWidth - margin, 26, { align: 'right' });
  if (data.type === 'invoice' && data.due_date) {
    doc.text(`Due: ${format(new Date(data.due_date), 'dd MMM yyyy')}`, pageWidth - margin, 34, { align: 'right' });
  }

  y = 50;

  // === ESTIMATE TO / INVOICE TO SECTION ===
  const clientName = data.client.company_name || data.client.profiles?.full_name || 'N/A';
  const clientAddress = [
    data.client.billing_address,
    [data.client.billing_city, data.client.billing_state, data.client.billing_zip].filter(Boolean).join(', '),
  ].filter(Boolean).join('\n');
  const clientEmail = data.client.billing_email || data.client.profiles?.email || '';
  const clientPhone = data.client.billing_phone || '';
  const clientGst = data.client.gst_number || '';

  // Client box
  drawRoundedRect(doc, margin, y, contentWidth / 2 - 5, 52, 3, COLORS.primaryLight);
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.type === 'estimate' ? 'Estimate' : 'Invoice'} To:`, margin + 5, y + 8);

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(clientName, margin + 5, y + 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  let detailY = y + 22;
  if (clientAddress) {
    const lines = doc.splitTextToSize(clientAddress, contentWidth / 2 - 15);
    doc.text(lines, margin + 5, detailY);
    detailY += lines.length * 4;
  }
  if (clientGst) { doc.text(`GST: ${clientGst}`, margin + 5, detailY); detailY += 4; }
  if (clientPhone) { doc.text(`Phone: ${clientPhone}`, margin + 5, detailY); detailY += 4; }
  if (clientEmail) { doc.text(`Email: ${clientEmail}`, margin + 5, detailY); }

  // Payment method box
  const payX = margin + contentWidth / 2 + 5;
  drawRoundedRect(doc, payX, y, contentWidth / 2 - 5, 52, 3, COLORS.lightGray);
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Company Details', payX + 5, y + 8);

  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let payY = y + 16;
  doc.text('Converza Meet', payX + 5, payY); payY += 5;
  doc.text('Email: info@converza.com', payX + 5, payY); payY += 5;
  doc.text('Phone: +91 XXXXXXXXXX', payX + 5, payY);

  y += 60;

  // === LINE ITEMS TABLE ===
  // Table header
  const colWidths = [8, 72, 30, 15, 25, 30];
  const colX = [margin];
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i - 1] + colWidths[i - 1]);
  }

  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  const headers = ['#', 'DESCRIPTION', 'BASE COST', 'QTY', 'DISC %', 'SUBTOTAL'];
  headers.forEach((h, i) => {
    doc.text(h, colX[i] + 2, y + 7);
  });

  y += 12;

  // Table rows
  doc.setFont('helvetica', 'normal');
  data.lineItems.forEach((item, idx) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    const isEven = idx % 2 === 0;
    if (isEven) {
      drawRoundedRect(doc, margin, y - 1, contentWidth, 9, 1, COLORS.lightGray);
    }

    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(8);
    doc.text(`${idx + 1}`, colX[0] + 2, y + 5);

    const descText = item.description ? `${item.service_name} - ${item.description}` : item.service_name;
    const descLines = doc.splitTextToSize(descText, colWidths[1] - 4);
    doc.text(descLines[0], colX[1] + 2, y + 5);

    doc.text(`₹${Number(item.unit_price).toLocaleString('en-IN')}`, colX[2] + 2, y + 5);
    doc.text(`${item.quantity}`, colX[3] + 2, y + 5);
    doc.text(`${item.discount}%`, colX[4] + 2, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(`₹${Number(item.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, colX[5] + 2, y + 5);
    doc.setFont('helvetica', 'normal');

    y += descLines.length > 1 ? 12 : 10;
  });

  y += 5;

  // === TOTALS ===
  const totalsX = margin + contentWidth - 75;
  drawRoundedRect(doc, totalsX, y, 75, 40, 3, COLORS.lightGray);

  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Sub-total:', totalsX + 5, y + 9);
  doc.setTextColor(...COLORS.dark);
  doc.text(`₹${Number(data.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX + 70, y + 9, { align: 'right' });

  if (data.discount_amount > 0) {
    doc.setTextColor(...COLORS.gray);
    doc.text('Discount:', totalsX + 5, y + 17);
    doc.setTextColor(...COLORS.dark);
    doc.text(`-₹${Number(data.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX + 70, y + 17, { align: 'right' });
  }

  doc.setTextColor(...COLORS.gray);
  doc.text(`GST (${data.lineItems[0]?.tax_percent || 18}%):`, totalsX + 5, y + 25);
  doc.setTextColor(...COLORS.dark);
  doc.text(`₹${Number(data.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX + 70, y + 25, { align: 'right' });

  // Grand total bar
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(totalsX, y + 30, 75, 10, 2, 2, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', totalsX + 5, y + 37);
  doc.text(`₹${Number(data.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX + 70, y + 37, { align: 'right' });

  if (data.type === 'invoice' && data.amount_paid && data.amount_paid > 0) {
    y += 42;
    doc.setTextColor(...COLORS.accent);
    doc.setFontSize(9);
    doc.text(`Amount Paid: ₹${Number(data.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX + 5, y + 5);
    const balance = data.grand_total - data.amount_paid;
    if (balance > 0) {
      doc.setTextColor(...COLORS.primary);
      doc.text(`Balance Due: ₹${Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX + 5, y + 11);
    }
  }

  y += 50;

  // === TERMS & CONDITIONS ===
  if (y > 230) { doc.addPage(); y = 20; }

  doc.setFillColor(...COLORS.primaryLight);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions', margin + 5, y + 6);
  y += 12;

  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  const defaultTerms = [
    '1. An advance payment is required before commencement of the project.',
    '2. Once the project has commenced, all payments made are strictly non-refundable.',
    '3. Delays caused by client\'s failure to provide timely feedback will extend project timelines.',
    '4. Only the number of revisions mentioned in the proposal are included. Additional revisions will be charged.',
    '5. Ownership of deliverables transfers upon receipt of full and final payment.',
  ];

  const termsText = data.terms ? data.terms.split('\n') : defaultTerms;
  termsText.forEach(line => {
    if (y > 280) { doc.addPage(); y = 20; }
    const wrapped = doc.splitTextToSize(line, contentWidth - 10);
    doc.text(wrapped, margin + 5, y);
    y += wrapped.length * 3.5;
  });

  y += 8;

  // === FOOTER ===
  if (y > 265) { doc.addPage(); y = 20; }

  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 282, pageWidth, 15, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank You for Your Business', pageWidth / 2, 290, { align: 'center' });

  // Save
  const filename = `${data.type === 'estimate' ? 'Estimate' : 'Invoice'}_${data.number.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}

export async function downloadEstimatePdf(estimateId: string) {
  const { data: estimate, error: estError } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', estimateId)
    .single();
  if (estError || !estimate) throw estError;

  const { data: lineItems } = await supabase
    .from('estimate_line_items')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order');

  const { data: client } = await supabase
    .from('billing_clients')
    .select('*')
    .eq('id', estimate.client_id)
    .single();

  let profileData: { full_name?: string | null; email?: string | null } | null = null;
  if (client?.profile_id) {
    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', client.profile_id).single();
    profileData = profile;
  }

  await generateBillingPdf({
    type: 'estimate',
    number: estimate.estimate_number,
    date: estimate.estimate_date,
    subtotal: estimate.subtotal,
    tax_amount: estimate.tax_amount,
    discount_amount: estimate.discount_amount,
    grand_total: estimate.grand_total,
    notes: estimate.notes,
    terms: estimate.terms,
    client: client ? { ...client, profiles: profileData } : {},
    lineItems: lineItems || [],
  });
}

export async function downloadInvoicePdf(invoiceId: string) {
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();
  if (invError || !invoice) throw invError;

  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order');

  const { data: client } = await supabase
    .from('billing_clients')
    .select('*')
    .eq('id', invoice.client_id)
    .single();

  let profileData2: { full_name?: string | null; email?: string | null } | null = null;
  if (client?.profile_id) {
    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', client.profile_id).single();
    profileData2 = profile;
  }

  await generateBillingPdf({
    type: 'invoice',
    number: invoice.invoice_number,
    date: invoice.invoice_date,
    due_date: invoice.due_date,
    subtotal: invoice.subtotal,
    tax_amount: invoice.tax_amount,
    discount_amount: invoice.discount_amount,
    grand_total: invoice.grand_total,
    amount_paid: invoice.amount_paid,
    notes: invoice.notes,
    terms: invoice.terms,
    client: client ? { ...client, profiles: profileData2 } : {},
    lineItems: lineItems || [],
  });
}
