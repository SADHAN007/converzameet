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

interface CompanyInfo {
  company_name: string;
  company_email?: string | null;
  company_phone?: string | null;
  company_address?: string | null;
  company_city?: string | null;
  company_state?: string | null;
  company_zip?: string | null;
  gst_number?: string | null;
  pan_number?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;
  logo_url?: string | null;
  website?: string | null;
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
  company: CompanyInfo;
}

// Colors matching the reference PDF
const NAVY = [25, 35, 60] as const;
const YELLOW = [230, 190, 50] as const;
const BLACK = [0, 0, 0] as const;
const DARK_GRAY = [50, 50, 50] as const;
const GRAY = [120, 120, 120] as const;
const WHITE = [255, 255, 255] as const;
const LIGHT_BG = [248, 248, 248] as const;

async function loadImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateBillingPdf(data: PdfData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 12;

  const typeLabel = data.type === 'estimate' ? 'ESTIMATE' : 'INVOICE';
  const typePrefix = data.type === 'estimate' ? 'Estimate' : 'Invoice';

  // === LOGO (top-left) ===
  if (data.company.logo_url) {
    const logoData = await loadImage(data.company.logo_url);
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', margin, y, 35, 25);
      } catch {
        // Logo failed, skip
      }
    }
  }

  // === TITLE (top-right) ===
  doc.setTextColor(...NAVY);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text(typeLabel, pageWidth - margin, y + 18, { align: 'right' });

  y += 30;

  // === Yellow + Navy divider stripe ===
  doc.setFillColor(...YELLOW);
  doc.rect(0, y, pageWidth, 3, 'F');
  doc.setFillColor(...NAVY);
  doc.rect(0, y + 3, pageWidth, 2, 'F');

  y += 8;

  // === CLIENT INFO (left) + DOCUMENT DETAILS (right) ===
  const clientName = data.client.company_name || data.client.profiles?.full_name || 'N/A';
  const clientAddress = [
    data.client.billing_address,
    [data.client.billing_city, data.client.billing_state, data.client.billing_zip].filter(Boolean).join(' – '),
  ].filter(Boolean).join(', ');
  const clientGst = data.client.gst_number || '';
  const clientPhone = data.client.billing_phone || '';
  const clientEmail = data.client.billing_email || data.client.profiles?.email || '';

  // "Invoice To:" / "Estimate To:"
  doc.setTextColor(...DARK_GRAY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${typePrefix} To:`, margin, y);
  y += 5;

  // Client name
  doc.setTextColor(...BLACK);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(clientName, margin, y);
  y += 6;

  // Client details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_GRAY);

  const detailStartY = y;
  if (clientAddress) {
    doc.setFont('helvetica', 'bold');
    doc.text('Address: ', margin, y);
    doc.setFont('helvetica', 'normal');
    const addrLines = doc.splitTextToSize(clientAddress, 85);
    doc.text(addrLines, margin + 18, y);
    y += addrLines.length * 4.5;
  }
  if (clientGst) {
    doc.setFont('helvetica', 'bold');
    doc.text('GST: ', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(clientGst, margin + 12, y);
    y += 4.5;
  }
  if (clientPhone) {
    doc.setFont('helvetica', 'bold');
    doc.text('Contact No: ', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(clientPhone, margin + 24, y);
    y += 4.5;
  }
  if (clientEmail) {
    doc.text(`Email: ${clientEmail}`, margin, y);
    y += 4.5;
  }

  // Document details box (right side)
  const detailBoxX = 130;
  let dy = detailStartY - 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_GRAY);

  doc.text(`${typePrefix} No:`, detailBoxX, dy);
  doc.setFont('helvetica', 'bold');
  doc.text(data.number, pageWidth - margin, dy, { align: 'right' });
  dy += 6;

  doc.setFont('helvetica', 'normal');
  doc.text('Due Date:', detailBoxX, dy);
  doc.text(data.due_date ? format(new Date(data.due_date), 'dd MMM, yyyy') : '–', pageWidth - margin, dy, { align: 'right' });
  dy += 6;

  doc.text(`${typePrefix} Date:`, detailBoxX, dy);
  doc.text(format(new Date(data.date), 'dd MMM, yyyy'), pageWidth - margin, dy, { align: 'right' });

  y = Math.max(y, dy + 4);

  // === Yellow + Navy divider stripe ===
  y += 3;
  doc.setFillColor(...NAVY);
  doc.rect(0, y, pageWidth, 2, 'F');
  doc.setFillColor(...YELLOW);
  doc.rect(0, y + 2, pageWidth, 3, 'F');
  // Navy triangles (chevron pattern) - simplified as a thin stripe
  doc.setFillColor(...NAVY);
  // Draw small navy triangles along the yellow stripe
  for (let tx = 0; tx < pageWidth; tx += 8) {
    doc.triangle(tx, y + 5, tx + 4, y + 2, tx + 8, y + 5, 'F');
  }

  y += 9;

  // === COMPANY CONTACT (left) + PAYMENT METHOD (right) ===
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_GRAY);

  const compContactY = y;

  if (data.company.company_phone) {
    doc.setFont('helvetica', 'bold');
    doc.text('Phone:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.company.company_phone, margin + 18, y);
    y += 5;
  }
  if (data.company.company_email) {
    doc.setFont('helvetica', 'bold');
    doc.text('Email:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.company.company_email, margin + 18, y);
    y += 5;
  }
  if (data.company.company_address) {
    doc.setFont('helvetica', 'bold');
    doc.text('Address:', margin, y);
    doc.setFont('helvetica', 'normal');
    const fullAddr = [data.company.company_address, [data.company.company_city, data.company.company_state, data.company.company_zip].filter(Boolean).join(' - ')].filter(Boolean).join(', ');
    const addrLines = doc.splitTextToSize(fullAddr, 70);
    doc.text(addrLines, margin + 18, y);
    y += addrLines.length * 4.5;
  }

  // Payment Method (right side)
  const hasBankInfo = data.company.bank_name || data.company.bank_account_number;
  if (hasBankInfo) {
    const pmX = 115;
    let pmY = compContactY;

    doc.setTextColor(...BLACK);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT METHOD', pmX, pmY);
    pmY += 6;

    doc.setFontSize(9);
    doc.setTextColor(...DARK_GRAY);

    doc.setFont('helvetica', 'normal');
    doc.text('Account Name:', pmX, pmY);
    doc.text(data.company.company_name, pageWidth - margin, pmY, { align: 'right' });
    pmY += 5;

    if (data.company.bank_account_number) {
      doc.text('Account No:', pmX, pmY);
      doc.text(data.company.bank_account_number, pageWidth - margin, pmY, { align: 'right' });
      pmY += 5;
    }

    if (data.company.bank_ifsc && data.company.bank_name) {
      doc.text('IFSC & Bank:', pmX, pmY);
      doc.text(`${data.company.bank_name} | ${data.company.bank_ifsc}`, pageWidth - margin, pmY, { align: 'right' });
      pmY += 5;
    }

    y = Math.max(y, pmY);
  }

  y += 5;

  // === LINE ITEMS TABLE ===
  // Table header
  const col1 = margin;           // DESCRIPTION
  const col2 = margin + 80;      // BASE COST
  const col3 = margin + 120;     // QTY
  const col4 = margin + 145;     // SUBTOTAL
  const tableRight = pageWidth - margin;

  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', col1 + 4, y + 7);
  doc.text('BASE COST', col2 + 2, y + 7);
  doc.text('QTY', col3 + 2, y + 7);
  doc.text('SUBTOTAL', col4 + 2, y + 7);

  y += 13;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_GRAY);
  doc.setFontSize(10);

  data.lineItems.forEach((item) => {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    const descText = item.description ? `${item.service_name} - ${item.description}` : item.service_name;
    const descLines = doc.splitTextToSize(descText, 75);

    doc.setFont('helvetica', 'normal');
    doc.text(descLines, col1 + 4, y + 4);
    doc.text(Number(item.unit_price).toLocaleString('en-IN'), col2 + 2, y + 4);
    doc.text(`${item.quantity}`, col3 + 8, y + 4);
    doc.text(Number(item.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 }), tableRight - 2, y + 4, { align: 'right' });

    const rowH = Math.max(descLines.length * 5, 8);
    y += rowH + 3;
  });

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(col3, y, tableRight, y);
  y += 5;

  // === TOTALS (right-aligned) ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_GRAY);

  // Sub-total
  doc.text('Sub-total:', col3 + 2, y + 4);
  doc.text(Number(data.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 }), tableRight - 2, y + 4, { align: 'right' });
  y += 7;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(col3, y, tableRight, y);
  y += 5;

  // Discount (if any)
  if (data.discount_amount > 0) {
    doc.text('Discount:', col3 + 2, y + 4);
    doc.text(`-${Number(data.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, tableRight - 2, y + 4, { align: 'right' });
    y += 7;
    doc.line(col3, y, tableRight, y);
    y += 5;
  }

  // GST
  const taxPercent = data.lineItems[0]?.tax_percent || 18;
  doc.setFont('helvetica', 'bold');
  doc.text(`Gst (${taxPercent}%):`, col3 + 2, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(Number(data.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), tableRight - 2, y + 4, { align: 'right' });
  y += 7;

  // Divider
  doc.line(col3, y, tableRight, y);
  y += 5;

  // Total - highlighted
  doc.setFillColor(...LIGHT_BG);
  doc.rect(col3, y - 1, tableRight - col3, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.setFontSize(11);
  doc.text('Total:', col3 + 2, y + 6);
  doc.text(Number(data.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 }), tableRight - 2, y + 6, { align: 'right' });

  y += 14;

  // Amount paid / balance (for invoices)
  if (data.type === 'invoice' && data.amount_paid && data.amount_paid > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(`Amount Paid: ₹${Number(data.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col3 + 2, y + 4);
    const balance = data.grand_total - data.amount_paid;
    if (balance > 0) {
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(`Balance Due: ₹${Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col3 + 2, y + 4);
    }
    y += 8;
  }

  y += 3;

  // === TERM AND CONDITIONS ===
  if (y > 230) { doc.addPage(); y = 20; }

  doc.setTextColor(...BLACK);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TERM AND CONDITIONS', pageWidth / 2, y, { align: 'center' });
  // Underline
  const tcTextWidth = doc.getTextWidth('TERM AND CONDITIONS');
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.line((pageWidth - tcTextWidth) / 2, y + 1, (pageWidth + tcTextWidth) / 2, y + 1);
  y += 7;

  doc.setFontSize(8);
  doc.setTextColor(...DARK_GRAY);

  // Default terms sections
  const defaultSections = [
    {
      title: 'PAYMENT TERMS',
      items: [
        'The Client agrees to pay an advance amount as specified in the applicable Statement of Work ("SOW") prior to commencement of the Project.',
        'The Project shall be deemed to have commenced upon receipt of the advance payment.',
        'Once the Project has commenced, all payments made shall be strictly non-refundable under any circumstances.',
      ]
    },
    {
      title: 'DELAYS & TERMINATION',
      items: [
        'Any delay caused due to the Client\'s failure to provide timely feedback, approvals, inputs, or materials shall result in a corresponding extension of the project timelines, without penalty to the Service Provider.',
        'Either party may terminate the services by providing a minimum of thirty (30) days\' prior written notice to the other party, subject to settlement of all outstanding dues.',
      ]
    },
    {
      title: 'REVISIONS',
      items: [
        'The Client shall be entitled only to the number of revisions expressly mentioned in the proposal or SOW.',
        'Any revisions beyond the agreed limit shall be charged additionally.',
      ]
    },
    {
      title: 'OWNERSHIP & INTELLECTUAL PROPERTY',
      items: [
        'Upon receipt of full and final payment, ownership of the final approved deliverables shall vest with the Client, subject to the terms of the SOW.',
        'The Service Provider retains the right to display, publish, and showcase the completed project, including visuals and footage, for portfolio, marketing, and promotional purposes, unless otherwise restricted in writing.',
      ]
    },
  ];

  if (data.terms) {
    // Use custom terms
    const termsLines = data.terms.split('\n');
    termsLines.forEach(line => {
      if (y > 275) { doc.addPage(); y = 20; }
      const wrapped = doc.splitTextToSize(line, contentWidth - 5);
      doc.setFont('helvetica', 'normal');
      doc.text(wrapped, margin, y);
      y += wrapped.length * 3.5;
    });
  } else {
    // Default structured terms
    defaultSections.forEach(section => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      doc.text(section.title, margin, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK_GRAY);
      section.items.forEach((item, idx) => {
        if (y > 278) { doc.addPage(); y = 20; }
        const text = `${idx + 1}. ${item}`;
        const wrapped = doc.splitTextToSize(text, contentWidth - 5);
        doc.text(wrapped, margin + 2, y);
        y += wrapped.length * 3.5 + 1;
      });
      y += 2;
    });
  }

  // === THANK YOU BANNER ===
  y = Math.max(y + 5, pageHeight - 25);
  if (y > pageHeight - 20) {
    doc.addPage();
    y = pageHeight - 25;
  }

  // "THANK YOU FOR YOUR BUSINESS" centered with small lines
  doc.setTextColor(...BLACK);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const thankText = 'THANK YOU FOR YOUR BUSINESS';
  const thankW = doc.getTextWidth(thankText);
  const thankCx = pageWidth / 2;
  doc.text(thankText, thankCx, y, { align: 'center' });

  // Small decorative lines around text
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1);
  doc.line(thankCx - thankW / 2 - 8, y - 2, thankCx - thankW / 2 - 2, y - 2);
  doc.line(thankCx + thankW / 2 + 2, y - 2, thankCx + thankW / 2 + 8, y - 2);

  y += 4;

  // === FOOTER BAR ===
  const footerY = pageHeight - 14;
  doc.setFillColor(...NAVY);
  doc.rect(0, footerY, pageWidth, 14, 'F');
  // Yellow accent line on top of footer
  doc.setFillColor(...YELLOW);
  doc.rect(0, footerY, pageWidth, 1.5, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const footerItems: string[] = [];
  if (data.company.company_phone) footerItems.push(data.company.company_phone);
  if (data.company.company_email) footerItems.push(data.company.company_email);
  const compAddr = [data.company.company_address, [data.company.company_city, data.company.company_state].filter(Boolean).join(' - '), data.company.company_zip].filter(Boolean).join(', ');
  if (compAddr) footerItems.push(compAddr);

  const footerText = footerItems.join('    |    ');
  doc.text(footerText, pageWidth / 2, footerY + 8, { align: 'center' });

  // Save
  const filename = `${typePrefix}_${data.number.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}

async function fetchCompanySettings(): Promise<CompanyInfo> {
  const { data } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single();
  if (data) return data as CompanyInfo;
  return { company_name: 'Converza Meet' };
}

export async function downloadEstimatePdf(estimateId: string) {
  const [{ data: estimate, error: estError }, companySettings] = await Promise.all([
    supabase.from('estimates').select('*').eq('id', estimateId).single(),
    fetchCompanySettings(),
  ]);
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
    company: companySettings,
  });
}

export async function downloadInvoicePdf(invoiceId: string) {
  const [{ data: invoice, error: invError }, companySettings] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', invoiceId).single(),
    fetchCompanySettings(),
  ]);
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
    company: companySettings,
  });
}
