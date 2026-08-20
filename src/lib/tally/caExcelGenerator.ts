import { Sale, Business, CashExpense } from '@/types';

export interface CAExportOptions {
  business: Business | null | undefined;
  sales: Sale[];
  expenses?: CashExpense[];
  periodName?: string;
}

/**
 * Generates official standard CA Master Sales Register CSV with full accounting & tax breakups
 */
export function generateCASalesRegisterCSV(options: CAExportOptions): { csv: string; filename: string } {
  const { business, sales, periodName = 'Sales_Register' } = options;
  const storeName = business?.name || 'My Store';
  const gstin = business?.gstin || '';

  const headers = [
    'Sl No',
    'Invoice Date',
    'Invoice Number',
    'Customer Name',
    'Customer Phone',
    'Customer GSTIN',
    'Place of Supply',
    'Taxable Value (Rs)',
    'CGST (Rs)',
    'SGST (Rs)',
    'IGST (Rs)',
    'Total Tax (Rs)',
    'Discount (Rs)',
    'Invoice Total (Rs)',
    'Payment Method',
    'Payment Status',
    'Balance Due (Rs)',
    'Item Count',
  ];

  const validSales = sales.filter((s) => s.status !== 'cancelled');

  const rows = validSales.map((sale, idx) => {
    const invDate = new Date(sale.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const taxableRs = (sale.subtotal / 100).toFixed(2);
    const halfTaxRs = ((sale.tax_total / 2) / 100).toFixed(2);
    const totalTaxRs = (sale.tax_total / 100).toFixed(2);
    const discountRs = (sale.discount_total / 100).toFixed(2);
    const grandTotalRs = (sale.grand_total / 100).toFixed(2);
    const balanceDueRs = (sale.balance_due / 100).toFixed(2);
    const itemCount = sale.items.reduce((s, i) => s + i.quantity, 0);

    return [
      idx + 1,
      `"${invDate}"`,
      `"${sale.invoice_number}"`,
      `"${(sale.customer_name || 'Cash Customer').replace(/"/g, '""')}"`,
      `"${sale.customer_phone || ''}"`,
      `"${gstin}"`,
      '"Intra-State (Same State)"',
      taxableRs,
      sale.tax_total > 0 ? halfTaxRs : '0.00',
      sale.tax_total > 0 ? halfTaxRs : '0.00',
      '0.00',
      totalTaxRs,
      discountRs,
      grandTotalRs,
      `"${sale.payment_method.toUpperCase()}"`,
      `"${sale.payment_status.toUpperCase()}"`,
      balanceDueRs,
      itemCount,
    ].join(',');
  });

  // Calculate Column Totals
  const totalTaxable = (validSales.reduce((s, x) => s + x.subtotal, 0) / 100).toFixed(2);
  const totalCGST = (validSales.reduce((s, x) => s + x.tax_total / 2, 0) / 100).toFixed(2);
  const totalSGST = (validSales.reduce((s, x) => s + x.tax_total / 2, 0) / 100).toFixed(2);
  const totalTax = (validSales.reduce((s, x) => s + x.tax_total, 0) / 100).toFixed(2);
  const totalGrand = (validSales.reduce((s, x) => s + x.grand_total, 0) / 100).toFixed(2);

  const summaryRow = [
    'TOTAL',
    '""',
    '""',
    `"Total Bills: ${validSales.length}"`,
    '""',
    '""',
    '""',
    totalTaxable,
    totalCGST,
    totalSGST,
    '0.00',
    totalTax,
    '0.00',
    totalGrand,
    '""',
    '""',
    '""',
    '""',
  ].join(',');

  const csvContent = [headers.join(','), ...rows, summaryRow].join('\n');
  const cleanStore = storeName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const filename = `${cleanStore}_CA_Sales_Register_${periodName}_${dateStamp}.csv`;

  return { csv: csvContent, filename };
}
