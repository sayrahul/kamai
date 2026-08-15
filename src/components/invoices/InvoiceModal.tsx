'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Business, Sale, CartItem } from '@/types';
import { formatINR, generateUPILink, generateWhatsAppReceiptLink } from '@/lib/utils';
import { calculateGstSummary, numberToWordsINR } from '@/lib/invoices/gstCalculator';
import { 
  Printer, 
  Share2, 
  Download, 
  FileText, 
  QrCode, 
  Store, 
  CheckCircle2, 
  Receipt,
  Sparkles,
  Phone,
  MapPin
} from 'lucide-react';

export type InvoiceFormat = 'thermal-58' | 'thermal-80' | 'a4';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  business: Business | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  sale,
  business,
}) => {
  const [format, setFormat] = useState<InvoiceFormat>('thermal-80');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && sale && business?.upi_id) {
      const upiUrl = generateUPILink(
        business.upi_id,
        business.name,
        sale.grand_total,
        sale.invoice_number
      );
      QRCode.toDataURL(upiUrl, {
        width: 160,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
    } else {
      setQrDataUrl('');
    }
  }, [isOpen, sale, business]);

  if (!sale || !business) return null;

  const gstBreakup = calculateGstSummary(sale.items, false);
  const amountWords = numberToWordsINR(sale.grand_total);
  const saleDateFormatted = new Date(sale.created_at).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const phone = sale.customer_phone || '';
    const bizName = business.name;
    const itemsSummary = sale.items
      .map((i) => `• ${i.product_name} x ${i.quantity} = ${formatINR(i.total_amount)}`)
      .join('\n');

    const msg = `🧾 *TAX INVOICE: ${sale.invoice_number}*\nFrom: *${bizName}*\n\n${itemsSummary}\n\n*Grand Total: ${formatINR(sale.grand_total)}*\n${
      sale.balance_due > 0 ? `⚠️ Udhar/Balance Due: ${formatINR(sale.balance_due)}\n` : '✅ Paid in Full\n'
    }${business.upi_id ? `\nPay via UPI: ${business.upi_id}` : ''}\n\nThank you for your business! 🙏`;

    window.open(generateWhatsAppReceiptLink(phone, msg), '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-vyapar-500" />
          <span>Invoice & Receipt Preview</span>
        </div>
      }
      description={`Invoice #${sale.invoice_number} • ${sale.customer_name || 'Cash Customer'}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Top Format Selector & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setFormat('thermal-58')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                format === 'thermal-58'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              58mm Thermal (2")
            </button>
            <button
              onClick={() => setFormat('thermal-80')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                format === 'thermal-80'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              80mm Thermal (3")
            </button>
            <button
              onClick={() => setFormat('a4')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                format === 'a4'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              A4 GST Invoice
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="success" size="sm" onClick={handleWhatsAppShare}>
              <Share2 className="w-3.5 h-3.5 mr-1" />
              <span>WhatsApp</span>
            </Button>
            <Button variant="primary" size="sm" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5 mr-1" />
              <span>Print / Save PDF</span>
            </Button>
          </div>
        </div>

        {/* Invoice Body Canvas */}
        <div className="bg-slate-200 dark:bg-slate-950 p-4 sm:p-8 rounded-3xl flex justify-center overflow-x-auto max-h-[60vh] overflow-y-auto">
          <div
            id="printable-invoice-container"
            className={`bg-white text-slate-900 shadow-xl transition-all ${
              format === 'thermal-58'
                ? 'w-[260px] p-3 text-[11px] font-mono leading-tight'
                : format === 'thermal-80'
                ? 'w-[340px] p-4 text-xs font-mono leading-snug'
                : 'w-full max-w-[650px] p-8 text-xs font-sans shadow-2xl'
            }`}
          >
            {/* ---------------- 58mm & 80mm THERMAL RECEIPT LAYOUT ---------------- */}
            {format !== 'a4' ? (
              <div className="space-y-2.5">
                {/* Thermal Header */}
                <div className="text-center pb-2 border-b border-dashed border-slate-400">
                  <h2 className="font-extrabold text-sm uppercase tracking-tight">{business.name}</h2>
                  {business.address && <p className="text-[10px] text-slate-600 mt-0.5">{business.address}</p>}
                  <p className="text-[10px] text-slate-600">Mob: {business.phone}</p>
                  {business.gstin && <p className="text-[10px] font-bold text-slate-800">GSTIN: {business.gstin}</p>}
                </div>

                {/* Metadata Row */}
                <div className="flex justify-between text-[10px] border-b border-dashed border-slate-300 pb-1.5">
                  <div>
                    <div><strong>Bill No:</strong> {sale.invoice_number}</div>
                    <div><strong>Cust:</strong> {sale.customer_name || 'Cash'}</div>
                  </div>
                  <div className="text-right">
                    <div>{saleDateFormatted}</div>
                    <div><strong>Mode:</strong> {sale.payment_method.toUpperCase()}</div>
                  </div>
                </div>

                {/* Thermal Items Table */}
                <div className="border-b border-dashed border-slate-400 pb-2">
                  <div className="flex justify-between font-bold text-[10px] uppercase border-b border-slate-300 pb-1 mb-1">
                    <span>Item</span>
                    <span>Qty x Rate</span>
                    <span>Amt</span>
                  </div>
                  {sale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start py-0.5 text-[11px]">
                      <div className="flex-1 pr-1 truncate font-medium">
                        {item.product_name}
                      </div>
                      <div className="text-right whitespace-nowrap text-[10px] text-slate-600 mr-2">
                        {item.quantity} x {((item.unit_price) / 100).toFixed(0)}
                      </div>
                      <div className="text-right font-bold whitespace-nowrap">
                        {formatINR(item.total_amount, false)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Thermal Totals */}
                <div className="space-y-1 text-right text-[11px]">
                  <div className="flex justify-between font-extrabold text-sm border-t border-b border-slate-900 py-1">
                    <span>GRAND TOTAL:</span>
                    <span>{formatINR(sale.grand_total)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Amount Received:</span>
                    <span>{formatINR(sale.amount_received)}</span>
                  </div>
                  {sale.balance_due > 0 && (
                    <div className="flex justify-between font-bold text-rose-600 text-[11px]">
                      <span>Udhar / Balance Due:</span>
                      <span>{formatINR(sale.balance_due)}</span>
                    </div>
                  )}
                  {sale.change_returned > 0 && (
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span>Change Returned:</span>
                      <span>{formatINR(sale.change_returned)}</span>
                    </div>
                  )}
                </div>

                {/* Thermal Dynamic UPI QR */}
                {qrDataUrl && (
                  <div className="text-center pt-2 border-t border-dashed border-slate-400 flex flex-col items-center">
                    <img src={qrDataUrl} alt="UPI QR" className="w-24 h-24 mx-auto" />
                    <span className="text-[9px] font-bold text-slate-700 mt-0.5">Scan to Pay via UPI</span>
                    <span className="text-[8px] text-slate-500">{business.upi_id}</span>
                  </div>
                )}

                {/* Thermal Footer */}
                <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[9px] text-slate-500">
                  <p>{business.terms_conditions || 'Thank you! Visit again.'}</p>
                  <p className="font-bold text-slate-700 mt-0.5">{business.footer_message || 'Powered by KamaiPlus'}</p>
                </div>
              </div>
            ) : (
              /* ---------------- FULL A4 GST TAX INVOICE LAYOUT ---------------- */
              <div className="space-y-5">
                {/* A4 Tax Invoice Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-vyapar-600">TAX INVOICE</span>
                    <h2 className="text-xl font-extrabold text-slate-900">{business.name}</h2>
                    <p className="text-xs text-slate-600 mt-1">{business.address}</p>
                    <p className="text-xs text-slate-600">Phone: {business.phone} {business.email ? `• ${business.email}` : ''}</p>
                    {business.gstin && (
                      <div className="text-xs font-bold text-slate-800 mt-1">
                        GSTIN: <span className="font-mono">{business.gstin}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-xs">
                      <div><strong>Invoice No:</strong> <span className="font-bold text-slate-900">{sale.invoice_number}</span></div>
                      <div className="mt-1"><strong>Invoice Date:</strong> {saleDateFormatted}</div>
                      <div className="mt-1"><strong>Payment:</strong> <Badge variant="neutral" size="sm">{sale.payment_method.toUpperCase()}</Badge></div>
                    </div>
                  </div>
                </div>

                {/* Buyer / Customer Info Box */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Billed To (Customer):</span>
                    <div className="font-extrabold text-slate-900 text-sm mt-0.5">{sale.customer_name || 'Cash Customer'}</div>
                    {sale.customer_phone && <div>Phone: {sale.customer_phone}</div>}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Place of Supply:</span>
                    <div className="font-semibold text-slate-800">Local (State Code 27)</div>
                  </div>
                </div>

                {/* A4 Line Items Table */}
                <table className="w-full text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                      <th className="border border-slate-300 p-2 text-center w-8">#</th>
                      <th className="border border-slate-300 p-2 text-left">Item Description</th>
                      <th className="border border-slate-300 p-2 text-center w-14">Qty</th>
                      <th className="border border-slate-300 p-2 text-right w-16">Rate (₹)</th>
                      <th className="border border-slate-300 p-2 text-center w-14">GST %</th>
                      <th className="border border-slate-300 p-2 text-right w-20">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2 text-center text-slate-400">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-medium">{item.product_name}</td>
                        <td className="border border-slate-300 p-2 text-center">{item.quantity} {item.unit}</td>
                        <td className="border border-slate-300 p-2 text-right">{((item.unit_price) / 100).toFixed(2)}</td>
                        <td className="border border-slate-300 p-2 text-center">{item.tax_rate}%</td>
                        <td className="border border-slate-300 p-2 text-right font-bold">{formatINR(item.total_amount, false)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* GST Breakdown Table */}
                {gstBreakup.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">GST Tax Summary</span>
                    <table className="w-full text-[10px] border border-slate-300 text-center">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="border border-slate-300 p-1">Taxable Amt</th>
                          <th className="border border-slate-300 p-1">CGST Rate</th>
                          <th className="border border-slate-300 p-1">CGST Amt</th>
                          <th className="border border-slate-300 p-1">SGST Rate</th>
                          <th className="border border-slate-300 p-1">SGST Amt</th>
                          <th className="border border-slate-300 p-1">Total Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gstBreakup.map((g, i) => (
                          <tr key={i}>
                            <td className="border border-slate-300 p-1">{formatINR(g.taxableAmountPaise)}</td>
                            <td className="border border-slate-300 p-1">{g.cgstRate}%</td>
                            <td className="border border-slate-300 p-1">{formatINR(g.cgstAmountPaise)}</td>
                            <td className="border border-slate-300 p-1">{g.sgstRate}%</td>
                            <td className="border border-slate-300 p-1">{formatINR(g.sgstAmountPaise)}</td>
                            <td className="border border-slate-300 p-1 font-bold">{formatINR(g.totalTaxPaise)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Totals, Words & UPI Box */}
                <div className="grid grid-cols-12 gap-4 items-start pt-2">
                  <div className="col-span-7 space-y-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Amount in Words:</span>
                      <p className="text-xs font-bold text-slate-900">{amountWords}</p>
                    </div>

                    {qrDataUrl && (
                      <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <img src={qrDataUrl} alt="UPI QR" className="w-16 h-16 rounded-md" />
                        <div>
                          <div className="text-xs font-bold text-slate-800">Scan & Pay via UPI</div>
                          <div className="text-[11px] text-slate-500 font-mono">{business.upi_id}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-span-5 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs text-right">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subtotal:</span>
                      <span className="font-semibold">{formatINR(sale.subtotal)}</span>
                    </div>
                    <div className="flex justify-between border-t border-b border-slate-300 py-1 font-black text-base text-slate-900">
                      <span>Grand Total:</span>
                      <span>{formatINR(sale.grand_total)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Amount Received:</span>
                      <span>{formatINR(sale.amount_received)}</span>
                    </div>
                    {sale.balance_due > 0 && (
                      <div className="flex justify-between font-bold text-rose-600">
                        <span>Balance Due (Udhar):</span>
                        <span>{formatINR(sale.balance_due)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms & Signature Footer */}
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Terms & Conditions:</span>
                    <p className="text-[11px] text-slate-500 mt-1">{business.terms_conditions || 'Goods once sold will not be returned.'}</p>
                  </div>
                  <div className="text-right flex flex-col justify-end items-end">
                    <div className="w-36 h-10 border-b border-slate-400" />
                    <span className="text-[10px] font-bold text-slate-700 mt-1">Authorized Signatory for {business.name}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
