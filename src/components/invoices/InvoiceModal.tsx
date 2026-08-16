'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Business, Sale, CartItem } from '@/types';
import { formatINR, generateUPILink } from '@/lib/utils';
import { calculateGstSummary, numberToWordsINR } from '@/lib/invoices/gstCalculator';
import { sendInvoiceViaWhatsApp, generateWhatsAppInvoiceMessage } from '@/lib/invoices/whatsappInvoice';
import Link from 'next/link';
import { 
  Printer, 
  Share2, 
  Download, 
  FileText, 
  QrCode, 
  Store, 
  CheckCircle2, 
  Receipt,
  Phone,
  MapPin,
  ExternalLink,
  MessageCircle,
  Building2,
  Sparkles,
  Palette
} from 'lucide-react';
import { downloadInvoicePdfFromElement, shareInvoicePdfDirect } from '@/lib/invoices/pdfGenerator';

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
  const [format, setFormat] = useState<InvoiceFormat>('a4');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [showPhoneInput, setShowPhoneInput] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [shareSuccessMsg, setShareSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen && sale && business) {
      setRecipientPhone(sale.customer_phone || '');
      setShowPhoneInput(!sale.customer_phone);

      if (business.upi_id) {
        const upiUrl = generateUPILink(
          business.upi_id,
          business.name,
          sale.balance_due > 0 ? sale.balance_due : sale.grand_total,
          sale.invoice_number
        );
        QRCode.toDataURL(upiUrl, {
          width: 180,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        })
          .then(setQrDataUrl)
          .catch(() => setQrDataUrl(''));
      }
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

  const handleDownloadPdf = async () => {
    const el = document.getElementById('modal-printable-invoice');
    if (!el) return;
    setIsGeneratingPdf(true);
    try {
      await downloadInvoicePdfFromElement(el, sale.invoice_number);
    } catch (err) {
      console.error('PDF download error:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleWhatsAppSend = async () => {
    const el = document.getElementById('modal-printable-invoice');
    setIsGeneratingPdf(true);
    try {
      const res = await shareInvoicePdfDirect(el, sale, business, recipientPhone);
      if (res.shared) {
        setShareSuccessMsg('Invoice dispatched to WhatsApp!');
        setTimeout(() => setShareSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('WhatsApp send error:', err);
      sendInvoiceViaWhatsApp(recipientPhone, sale, business);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-700" />
          <span>Tax Invoice & Receipt</span>
        </div>
      }
      description={`Invoice #${sale.invoice_number} • ${sale.customer_name || 'Cash Customer'}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Top Format Selector & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          {/* Format Tabs */}
          <div className="flex items-center gap-1 w-full sm:w-auto">
            <button
              onClick={() => setFormat('a4')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold ${
                format === 'a4'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              A4 Detailed Bill
            </button>
            <button
              onClick={() => setFormat('thermal-80')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold ${
                format === 'thermal-80'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              80mm Thermal
            </button>
            <button
              onClick={() => setFormat('thermal-58')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold ${
                format === 'thermal-58'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              58mm Thermal
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Link href="/invoice-designer">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold gap-1 text-slate-700 hover:text-slate-950"
                title="Customize Invoice Theme & Layout"
              >
                <Palette className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Themes</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs font-bold gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="text-xs font-bold gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Generating...' : 'PDF'}</span>
            </Button>

            <Button
              size="sm"
              onClick={handleWhatsAppSend}
              disabled={isGeneratingPdf}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 text-xs font-bold gap-1 shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Send WhatsApp</span>
            </Button>
          </div>
        </div>

        {/* WhatsApp Mobile Number Input Row */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-medium w-full sm:w-auto">
            <MessageCircle className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span className="whitespace-nowrap">Recipient WhatsApp:</span>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="bg-white border border-emerald-300 text-slate-900 font-mono font-bold text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-600 flex-1 sm:w-40"
            />
          </div>

          {shareSuccessMsg ? (
            <span className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{shareSuccessMsg}</span>
            </span>
          ) : (
            <span className="text-[11px] text-emerald-800 font-semibold text-center sm:text-right">
              Sends PDF & interactive digital bill with your logo & store branding
            </span>
          )}
        </div>

        {/* ========================================================================= */}
        {/* INVOICE PREVIEW CONTAINER */}
        {/* ========================================================================= */}
        <div className="bg-slate-100 p-3 sm:p-6 rounded-xl flex justify-center overflow-x-auto max-h-[55vh] overflow-y-auto">
          {/* ========================================================================= */}
          {/* FORMAT 1: A4 DETAILED GST TAX INVOICE */}
          {/* ========================================================================= */}
          {format === 'a4' && (
            <div
              id="modal-printable-invoice"
              className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl p-6 sm:p-8 space-y-6 text-slate-900 shadow-sm"
            >
              {/* Header with Shop Logo */}
              <div className="flex justify-between items-start pb-5 border-b border-slate-200 gap-4">
                <div className="flex items-start gap-4">
                  {business.logo_url && (
                    <img
                      src={business.logo_url}
                      alt={business.name}
                      className="w-16 h-16 object-contain rounded-lg border border-slate-200 p-1 bg-white flex-shrink-0"
                    />
                  )}
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                      {business.name}
                    </h2>
                    {business.tagline && (
                      <p className="text-xs font-semibold text-slate-500 italic mt-0.5">{business.tagline}</p>
                    )}
                    {business.address && (
                      <p className="text-xs text-slate-600 mt-1 max-w-xs">{business.address}</p>
                    )}
                    {business.phone && (
                      <p className="text-xs text-slate-600 font-mono mt-0.5">Phone: {business.phone}</p>
                    )}
                    {business.gstin && (
                      <p className="text-xs text-slate-700 font-semibold mt-0.5">GSTIN: {business.gstin}</p>
                    )}
                  </div>
                </div>

                <div className="text-right space-y-1 flex-shrink-0">
                  <span className="inline-block px-2.5 py-1 bg-slate-900 text-white text-xs font-bold uppercase rounded">
                    Tax Invoice
                  </span>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    Invoice #{sale.invoice_number}
                  </div>
                  <div className="text-xs text-slate-500">Date: {saleDateFormatted}</div>
                </div>
              </div>

              {/* Bill To Info */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Billed To:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{sale.customer_name || 'Cash Customer'}</div>
                  {sale.customer_phone && <div className="text-slate-500 font-mono">{sale.customer_phone}</div>}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Payment Status:</span>
                  <div className="mt-0.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      sale.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {sale.payment_status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="py-2 px-1 w-8">#</th>
                    <th className="py-2 px-2">Item Description</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-2 text-right">Price</th>
                    <th className="py-2 px-2 text-right">Tax</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-1 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-2 font-semibold text-slate-900">
                        {item.product_name}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-700">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-700 font-mono">
                        {formatINR(item.unit_price)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-500">
                        {item.tax_rate}%
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900 font-mono">
                        {formatINR(item.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & UPI QR */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-6">
                <div className="flex-1 space-y-3">
                  {qrDataUrl && (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                      <img src={qrDataUrl} alt="UPI QR" className="w-20 h-20 rounded border border-slate-200 bg-white" />
                      <div className="text-[11px] space-y-0.5">
                        <div className="font-bold text-slate-900">Scan & Pay via UPI</div>
                        <div className="text-slate-600 font-mono text-[10px] font-bold">{business.upi_id}</div>
                        <div className="text-[10px] text-slate-400">GPay, PhonePe, Paytm, BHIM</div>
                      </div>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600">
                    <strong>Amount in Words:</strong> {amountWords}
                  </div>

                  {/* Bank Details block if present */}
                  {business.bank_name && (
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-[10px] space-y-0.5 text-slate-600">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>Bank Details for NEFT/IMPS:</span>
                      </div>
                      <div>Bank: <strong>{business.bank_name}</strong> {business.bank_account_name ? `(${business.bank_account_name})` : ''}</div>
                      {business.bank_account_no && <div>A/C: <span className="font-mono">{business.bank_account_no}</span> • IFSC: <span className="font-mono font-bold">{business.bank_ifsc}</span></div>}
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatINR(sale.subtotal)}</span>
                  </div>
                  {sale.tax_total > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Total GST:</span>
                      <span className="font-mono">{formatINR(sale.tax_total)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-y border-slate-200 text-sm font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-base">{formatINR(sale.grand_total)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1">
                    <span>Paid ({sale.payment_method.toUpperCase()}):</span>
                    <span className="font-mono">{formatINR(sale.amount_received)}</span>
                  </div>
                  {sale.balance_due > 0 && (
                    <div className="flex justify-between font-bold text-amber-700 pt-0.5">
                      <span>Balance Due (Udhar):</span>
                      <span className="font-mono">{formatINR(sale.balance_due)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Terms & Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                <div>{business.terms_conditions || 'Thank you for your business!'}</div>
                <div>Authorised Signatory</div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMAT 2: 80mm & 58mm THERMAL RECEIPT */}
          {/* ========================================================================= */}
          {(format === 'thermal-80' || format === 'thermal-58') && (
            <div
              id="modal-printable-invoice"
              className={`bg-white border border-slate-200 rounded-xl p-4 font-mono text-[11px] text-slate-900 space-y-3 ${
                format === 'thermal-58' ? 'max-w-[260px]' : 'max-w-[340px]'
              }`}
            >
              {/* Thermal Header with Logo */}
              <div className="text-center space-y-1 pb-2 border-b border-dashed border-slate-300">
                {business.logo_url && (
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    className="w-10 h-10 object-contain mx-auto mb-1"
                  />
                )}
                <div className="font-bold text-xs uppercase">{business.name}</div>
                {business.tagline && <div className="text-[9px] text-slate-500 italic">{business.tagline}</div>}
                {business.address && <div className="text-[10px] text-slate-600">{business.address}</div>}
                {business.phone && <div className="text-[10px] text-slate-600">Ph: {business.phone}</div>}
                {business.gstin && <div className="text-[10px] font-semibold">GSTIN: {business.gstin}</div>}
                <div className="font-bold text-[10px] pt-1 uppercase">Tax Invoice</div>
              </div>

              {/* Metadata */}
              <div className="text-[10px] space-y-0.5 pb-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span>Bill #{sale.invoice_number}</span>
                  <span>{new Date(sale.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <div>Cust: {sale.customer_name || 'Cash Customer'}</div>
              </div>

              {/* Items */}
              <div className="space-y-1 pb-2 border-b border-dashed border-slate-300 text-[10px]">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate pr-2">{item.product_name} x {item.quantity}</span>
                    <span className="font-bold">{formatINR(item.total_amount)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatINR(sale.subtotal)}</span>
                </div>
                {sale.tax_total > 0 && (
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>GST:</span>
                    <span>{formatINR(sale.tax_total)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1">
                  <span>TOTAL:</span>
                  <span>{formatINR(sale.grand_total)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Paid ({sale.payment_method}):</span>
                  <span>{formatINR(sale.amount_received)}</span>
                </div>
                {sale.balance_due > 0 && (
                  <div className="flex justify-between font-bold text-amber-700 text-[10px]">
                    <span>Udhar Due:</span>
                    <span>{formatINR(sale.balance_due)}</span>
                  </div>
                )}
              </div>

              {/* Dynamic QR */}
              {qrDataUrl && (
                <div className="flex flex-col items-center py-1">
                  <img src={qrDataUrl} alt="UPI QR" className="w-24 h-24" />
                  <div className="text-[9px] font-bold text-slate-700 mt-1">Scan to Pay via UPI</div>
                  <div className="text-[8px] font-mono text-slate-500">{business.upi_id}</div>
                </div>
              )}

              <div className="text-center text-[9px] text-slate-500 pt-1">
                {business.footer_message || 'Thank you! Visit again.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
