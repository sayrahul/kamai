import jsPDF from 'jspdf';
import { Business, Sale, CashExpense } from '@/types';
import { formatINR } from '@/lib/utils';

export interface DailyClosingData {
  business: Business | null | undefined;
  sales: Sale[];
  expenses: CashExpense[];
  dateStr: string; // YYYY-MM-DD
}

export function generateDailyClosingPDF(data: DailyClosingData): { blob: Blob; filename: string } {
  const { business, sales, expenses, dateStr } = data;
  const storeName = business?.name || 'Proventure Store';
  const ownerName = business?.owner_name || 'Store Owner';
  const phone = business?.phone || '';
  const gstin = business?.gstin || '';

  const dateFormatted = new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Calculations
  const daysSales = sales.filter((s) => s.created_at.startsWith(dateStr) && s.status !== 'cancelled');
  const daysExpenses = expenses.filter((e) => e.created_at.startsWith(dateStr));

  let totalSalesPaise = 0;
  let cashSalesPaise = 0;
  let upiSalesPaise = 0;
  let creditSalesPaise = 0;
  let totalItemsCount = 0;
  const productFrequency: { [name: string]: { qty: number; totalPaise: number } } = {};

  daysSales.forEach((s) => {
    totalSalesPaise += s.grand_total;
    s.items.forEach((item) => {
      totalItemsCount += item.quantity;
      if (!productFrequency[item.product_name]) {
        productFrequency[item.product_name] = { qty: 0, totalPaise: 0 };
      }
      productFrequency[item.product_name].qty += item.quantity;
      productFrequency[item.product_name].totalPaise += item.total_amount;
    });

    if (s.payment_method === 'cash') {
      cashSalesPaise += s.amount_received;
    } else if (s.payment_method === 'upi') {
      upiSalesPaise += s.amount_received;
    } else if (s.payment_method === 'credit') {
      creditSalesPaise += s.grand_total;
    } else if (s.payment_method === 'split' && s.payment_split) {
      cashSalesPaise += s.payment_split.cash_amount || 0;
      upiSalesPaise += s.payment_split.upi_amount || 0;
      creditSalesPaise += s.payment_split.credit_amount || 0;
    }
  });

  const totalExpensePaise = daysExpenses.reduce((sum, e) => sum + e.amount, 0);
  const cashExpensePaise = daysExpenses
    .filter((e) => e.payment_mode === 'cash')
    .reduce((sum, e) => sum + e.amount, 0);

  const netCashInTillPaise = Math.max(0, cashSalesPaise - cashExpensePaise);

  const topItems = Object.entries(productFrequency)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5);

  // Initialize PDF (A4 Portrait, 210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Color Palette
  const darkNavy = [15, 23, 42]; // #0f172a
  const slateText = [71, 85, 105]; // #475569
  const amberAccent = [217, 119, 6]; // #d97706
  const emeraldAccent = [5, 150, 105]; // #059669
  const lightBg = [248, 250, 252]; // #f8fafc

  let y = 16;

  // ---------------- HEADER BANNER ----------------
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.roundedRect(12, y, 186, 26, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(storeName.toUpperCase(), 18, y + 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  const subline = `Owner: ${ownerName} ${phone ? `| Ph: ${phone}` : ''} ${gstin ? `| GSTIN: ${gstin}` : ''}`;
  doc.text(subline, 18, y + 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(251, 191, 36);
  doc.text('DAILY CLOSING & Z-REPORT', 190, y + 10, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`${dateFormatted} • ${timeFormatted}`, 190, y + 18, { align: 'right' });

  y += 32;

  // ---------------- KPI SUMMARY BOXES ----------------
  const colWidth = 44;
  const gap = 3.3;
  const kpis = [
    { label: 'GROSS SALES (BIKRI)', val: formatINR(totalSalesPaise), sub: `${daysSales.length} bills`, color: amberAccent },
    { label: 'CASH COLLECTED', val: formatINR(cashSalesPaise), sub: 'Physical Cash', color: darkNavy },
    { label: 'UPI / QR PAYMENTS', val: formatINR(upiSalesPaise), sub: 'Bank Deposit', color: darkNavy },
    { label: 'NET CASH IN TILL', val: formatINR(netCashInTillPaise), sub: `After expenses`, color: emeraldAccent },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 12 + idx * (colWidth + gap);
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, colWidth, 20, 2, 2, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text(kpi.label, x + 3.5, y + 5.5);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, x + 3.5, y + 13);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, x + 3.5, y + 17.5);
  });

  y += 26;

  // ---------------- DETAILED COLLECTIONS & FINANCIAL RECONCILIATION ----------------
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('1. Financial Collections & Till Reconciliation', 14, y);
  y += 4;

  // Table Container
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, 186, 42, 2, 2, 'D');

  const financialRows = [
    { item: 'Total Invoices Issued (Sales Count)', detail: `${daysSales.length} Transactions`, amount: formatINR(totalSalesPaise), bold: true },
    { item: 'Cash Received (Counter Sales)', detail: 'Direct Cash Drawer', amount: formatINR(cashSalesPaise), bold: false },
    { item: 'UPI / Online QR Collections', detail: 'GooglePay / PhonePe / Paytm', amount: formatINR(upiSalesPaise), bold: false },
    { item: 'Customer Credit Extended (Udhar Khata)', detail: 'Pending Receivables', amount: formatINR(creditSalesPaise), bold: false },
    { item: 'Daily Store Expenses & Petty Cash (-)', detail: `${daysExpenses.length} Expense vouchers recorded`, amount: `-${formatINR(totalExpensePaise)}`, bold: false },
  ];

  let rowY = y + 6;
  financialRows.forEach((r, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(13, rowY - 4, 184, 7.5, 'F');
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', r.bold ? 'bold' : 'normal');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(r.item, 16, rowY);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text(r.detail, 95, rowY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(r.amount, 192, rowY, { align: 'right' });

    rowY += 8;
  });

  y += 48;

  // ---------------- TOP PRODUCTS & MOVEMENT BREAKDOWN ----------------
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('2. Top Selling Products Today', 14, y);
  y += 4;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, 186, Math.max(28, topItems.length * 7.5 + 8), 2, 2, 'D');

  let prodY = y + 6;
  if (topItems.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text('No sales recorded for this date.', 16, prodY);
  } else {
    topItems.forEach(([name, itemData], idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.rect(13, prodY - 4, 184, 7, 'F');
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text(`${idx + 1}. ${name}`, 16, prodY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(slateText[0], slateText[1], slateText[2]);
      doc.text(`Qty: ${itemData.qty} sold`, 120, prodY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text(formatINR(itemData.totalPaise), 192, prodY, { align: 'right' });

      prodY += 7.5;
    });
  }

  y += Math.max(34, topItems.length * 7.5 + 14);

  // ---------------- EXPENSES BREAKDOWN (IF ANY) ----------------
  if (daysExpenses.length > 0) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('3. Recorded Expenses & Outflow', 14, y);
    y += 4;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    const expBoxHeight = Math.min(32, daysExpenses.length * 6.5 + 6);
    doc.roundedRect(12, y, 186, expBoxHeight, 2, 2, 'D');

    let expY = y + 5.5;
    daysExpenses.slice(0, 4).forEach((exp, idx) => {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text(`• ${exp.title}`, 16, expY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(slateText[0], slateText[1], slateText[2]);
      doc.text(`Mode: ${exp.payment_mode.toUpperCase()}`, 110, expY);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(190, 18, 60);
      doc.text(`-${formatINR(exp.amount)}`, 192, expY, { align: 'right' });

      expY += 6.5;
    });

    y += expBoxHeight + 8;
  }

  // ---------------- FOOTER & VERIFICATION STAMP ----------------
  const footerY = 270;
  doc.setDrawColor(226, 232, 240);
  doc.line(12, footerY, 198, footerY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Official Z-Report generated via KamaiPlus Store POS • Complete Offline & Cloud Synchronized Records', 14, footerY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('Authorized Store Signature: __________________________', 198, footerY + 5, { align: 'right' });

  // Output blob
  const cleanDate = dateStr.replace(/[^0-9]/g, '');
  const cleanStore = storeName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanStore}_Day_Closing_${cleanDate}.pdf`;

  const blob = doc.output('blob');
  return { blob, filename };
}
