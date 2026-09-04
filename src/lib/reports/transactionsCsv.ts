import { Sale } from '@/types';

/**
 * Exports an array of sales transactions to a downloadable CSV file.
 */
export function exportTransactionsCSV(sales: Sale[]): void {
  if (sales.length === 0) {
    alert('No transactions to export.');
    return;
  }

  const headers = [
    'Invoice Number',
    'Date & Time',
    'Customer Name',
    'Customer Phone',
    'Items Count',
    'Payment Method',
    'Grand Total (₹)',
    'Amount Received (₹)',
    'Balance Due / Credit (₹)',
    'Payment Status',
  ];

  const rows = sales.map((s) => [
    s.invoice_number,
    new Date(s.created_at).toLocaleString('en-IN'),
    `"${(s.customer_name || 'Walk-in Customer').replace(/"/g, '""')}"`,
    s.customer_phone || '',
    s.items?.length || 0,
    s.payment_method.toUpperCase(),
    (s.grand_total / 100).toFixed(2),
    (s.amount_received / 100).toFixed(2),
    (s.balance_due / 100).toFixed(2),
    s.payment_status.toUpperCase(),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `kamai_transactions_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
