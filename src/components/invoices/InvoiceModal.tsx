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
import { bluetoothPrinter } from '@/lib/hardware/bluetoothPrinter';
import { Bluetooth, Zap } from 'lucide-react';

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
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState<boolean>(false);

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

  const handleBluetoothEscPosPrint = async () => {
    setIsBluetoothPrinting(true);
    try {
      await bluetoothPrinter.printSaleReceipt(
        sale,
        business,
        format === 'thermal-80' ? 80 : 58
      );
      setShareSuccessMsg('Receipt printed over Bluetooth!');
      setTimeout(() => setShareSuccessMsg(''), 4000);
    } catch (err: any) {
      console.warn('Bluetooth print failed:', err);
      alert(err.message || 'Bluetooth printing failed. Make sure printer is turned on.');
    } finally {
      setIsBluetoothPrinting(false);
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
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
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

            {/* Bluetooth ESC/POS Fast Print Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBluetoothEscPosPrint}
              disabled={isBluetoothPrinting}
              className="text-xs font-bold gap-1 bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100"
              title="1-Click Direct Bluetooth ESC/POS Printing without dialog"
            >
              <Bluetooth className="w-3.5 h-3.5 text-sky-700" />
              <span>{isBluetoothPrinting ? 'Printing...' : 'BT Print'}</span>
            </Button>

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
        <div className="bg-slate-100 p-3 sm:p-6 rounded-xl flex justify-center overflow-x-auto overflow-y-visible">
          {/* ========================================================================= */}
          {/* ========================================================================= */}
          {/* FORMAT 1: A4 DETAILED GST TAX INVOICE */}
          {/* ========================================================================= */}
          {format === 'a4' && (
            <div
              id="modal-printable-invoice"
              className="bg-white border border-slate-200 rounded-2xl w-full min-w-[650px] max-w-3xl p-6 sm:p-10 space-y-6 text-slate-900 shadow-sm border-t-8 border-t-slate-900 font-sans"
            >
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-slate-200 gap-6">
                {/* Store Profile */}
                <div className="flex items-start gap-4">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={business.name}
                      className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1 bg-white flex-shrink-0"
                    />
                  ) : (
                    <img
                      src="/logo.png"
                      alt={business.name}
                      className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1 bg-white flex-shrink-0"
                    />
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">
                        {business.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold uppercase border border-slate-200">
                        {business.business_type}
                      </span>
                    </div>
                    {business.tagline && (
                      <p className="text-xs font-semibold text-slate-500 italic">{business.tagline}</p>
                    )}
                    {business.address && (
                      <p className="text-xs text-slate-600 leading-snug max-w-sm">{business.address}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-slate-600">
                      {business.phone && <span className="font-mono"><strong>Ph:</strong> {business.phone}</span>}
                      {business.email && <span><strong>Email:</strong> {business.email}</span>}
                    </div>
                    {business.gstin && business.gstin.trim().length > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold mt-1">
                        <span className="text-slate-500 font-sans text-[10px] uppercase font-bold">GSTIN:</span>
                        <span>{business.gstin}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tax Invoice Badge & Invoice Meta */}
                <div className="sm:text-right space-y-2 flex-shrink-0 w-full sm:w-auto bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
                  <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded">
                    Tax Invoice
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    Original for Recipient
                  </div>
                  <div className="space-y-0.5 text-xs pt-1">
                    <div className="text-slate-950 font-bold">
                      <span className="text-slate-500 font-medium">Invoice No: </span>
                      <span className="font-mono font-black text-sm">#{sale.invoice_number}</span>
                    </div>
                    <div className="text-slate-600">
                      <span className="text-slate-500">Date: </span>
                      <span className="font-semibold">{saleDateFormatted}</span>
                    </div>
                    <div className="text-slate-600">
                      <span className="text-slate-500">Payment: </span>
                      <span className="font-bold uppercase text-slate-900">{sale.payment_method}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billed To Customer Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                    Billed To Customer:
                  </span>
                  <div className="font-black text-sm text-slate-950">
                    {sale.customer_name || 'Cash Customer'}
                  </div>
                  {sale.customer_phone && (
                    <div className="text-slate-600 font-mono flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sale.customer_phone}</span>
                    </div>
                  )}
                  {sale.customer_address && (
                    <div className="text-slate-600 leading-snug">
                      {sale.customer_address}
                    </div>
                  )}
                </div>

                <div className="sm:text-right space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                    Payment Status:
                  </span>
                  <div className="pt-0.5">
                    <span className={`inline-block px-3 py-1 rounded text-xs font-black uppercase tracking-wider ${
                      sale.payment_status === 'paid' 
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                        : 'bg-amber-100 text-amber-950 border border-amber-300'
                    }`}>
                      {sale.payment_status === 'paid' ? 'Fully Paid' : 'Credit / Balance Due'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-0.5">
                    Place of Supply: <strong>27 - Maharashtra</strong>
                  </div>
                </div>
              </div>

              {/* Items Table with Crisp Header */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">GST %</th>
                      <th className="py-2.5 px-3 text-right">GST Amt</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-900">
                    {sale.items.map((item, idx) => {
                      const itemTaxPaise = Math.round(item.total_amount - (item.total_amount / (1 + (item.tax_rate || 0) / 100)));
                      return (
                        <tr key={idx} className="even:bg-slate-50/60 hover:bg-slate-50">
                          <td className="py-3 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-3 px-3 font-bold text-slate-950">
                            <div>{item.product_name}</div>
                            {(item.hsn_code || item.barcode) && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {item.hsn_code ? `HSN: ${item.hsn_code}` : `Code: ${item.barcode}`}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-700">
                            {item.quantity} <span className="text-[10px] text-slate-500">{item.unit || 'pcs'}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700">
                            {formatINR(item.unit_price)}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600 font-mono">
                            {item.tax_rate}%
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600 font-mono">
                            {formatINR(itemTaxPaise)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-950 font-mono text-sm">
                            {formatINR(item.total_amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Summary Section: Bank Details / UPI QR & Financial Breakdown */}
              <div className="pt-2 flex flex-col sm:flex-row justify-between gap-6 items-start">
                {/* Left Column: QR Code, Bank Details, Words & Terms */}
                <div className="flex-1 space-y-3.5 w-full">
                  {/* Dynamic UPI Payment QR Block */}
                  {qrDataUrl && (
                    <div className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <img src={qrDataUrl} alt="UPI QR" className="w-20 h-20 rounded-lg border border-slate-200 bg-white p-1 flex-shrink-0" />
                      <div className="text-xs space-y-0.5 min-w-0">
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-slate-700" />
                          <span>Instant UPI Payment QR</span>
                        </div>
                        <div className="text-slate-600 font-mono text-[11px] font-bold truncate">{business.upi_id}</div>
                        <div className="text-[10px] text-slate-500">Scan & pay with GPay, PhonePe, Paytm, BHIM</div>
                      </div>
                    </div>
                  )}

                  {/* Amount in Words Box */}
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Amount in Words:</span>
                    <span className="font-bold text-slate-900 leading-snug">{amountWords}</span>
                  </div>

                  {/* Bank Details block if present */}
                  {business.bank_name && (
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1 text-slate-700">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                        <Building2 className="w-3.5 h-3.5 text-slate-700" />
                        <span>Bank Transfer Details (NEFT / IMPS / RTGS):</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                        <div>Bank: <strong>{business.bank_name}</strong></div>
                        <div>A/C Name: <strong>{business.bank_account_name || business.name}</strong></div>
                        {business.bank_account_no && <div>A/C No: <strong className="font-mono">{business.bank_account_no}</strong></div>}
                        {business.bank_ifsc && <div>IFSC: <strong className="font-mono">{business.bank_ifsc}</strong></div>}
                      </div>
                    </div>
                  )}

                  {/* Terms & Conditions */}
                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    <div className="font-bold uppercase tracking-wider text-slate-600">Terms & Conditions:</div>
                    <p className="leading-snug">{business.terms_conditions || 'Goods once sold can be returned within 7 days in original condition with bill.'}</p>
                  </div>
                </div>

                {/* Right Column: Financial Totals Breakdown Card */}
                <div className="w-full sm:w-80 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs flex-shrink-0">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-bold text-slate-800">{formatINR(sale.subtotal)}</span>
                  </div>

                  {sale.tax_total > 0 && (
                    <div className="space-y-1 py-1 border-y border-slate-200/80 text-[11px]">
                      <div className="flex justify-between text-slate-600">
                        <span>CGST (Central Tax):</span>
                        <span className="font-mono">{formatINR(Math.round(sale.tax_total / 2))}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST (State Tax):</span>
                        <span className="font-mono">{formatINR(Math.round(sale.tax_total / 2))}</span>
                      </div>
                    </div>
                  )}

                  {/* Grand Total Highlight Badge */}
                  <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900 text-white font-black text-sm my-2">
                    <span className="uppercase tracking-wide text-xs">Grand Total:</span>
                    <span className="font-mono text-lg text-amber-400">{formatINR(sale.grand_total)}</span>
                  </div>

                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>Amount Paid ({sale.payment_method.toUpperCase()}):</span>
                    <span className="font-mono font-bold">{formatINR(sale.amount_received)}</span>
                  </div>

                  {sale.balance_due > 0 && (
                    <div className="flex justify-between items-center p-2 rounded bg-amber-100 border border-amber-300 font-bold text-amber-950 text-xs">
                      <span>Credit / Balance Due:</span>
                      <span className="font-mono font-black">{formatINR(sale.balance_due)}</span>
                    </div>
                  )}

                  {/* Signatory Box */}
                  <div className="pt-6 text-center space-y-1">
                    <div className="border-b border-dashed border-slate-400 w-36 mx-auto mb-1" />
                    <div className="text-[10px] font-bold text-slate-900 uppercase">For {business.name}</div>
                    <div className="text-[9px] text-slate-500">Authorised Signatory</div>
                  </div>
                </div>
              </div>

              {/* Bottom Footer Seal */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-2">
                <div className="flex items-center gap-1.5">
                  <img src="/logo.png" alt="KamaiPlus" className="w-3.5 h-3.5 object-contain" />
                  <span>Powered by <strong>KamaiPlus POS</strong> • 100% Offline Digital Invoicing</span>
                </div>
                <div>{business.footer_message || 'Thank you for your visit!'}</div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMAT 2: 80mm & 58mm THERMAL RECEIPT */}
          {/* ========================================================================= */}
          {(format === 'thermal-80' || format === 'thermal-58') && (
            <div
              id="modal-printable-invoice"
              className={`bg-white border border-slate-200 rounded-xl p-5 text-[11px] text-slate-900 space-y-3.5 leading-normal ${
                format === 'thermal-58' ? 'max-w-[270px]' : 'max-w-[350px]'
              }`}
            >
              {/* Thermal Header with Logo */}
              <div className="text-center space-y-1 pb-2.5 border-b border-dashed border-slate-300">
                {business.logo_url && (
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    className="w-10 h-10 object-contain mx-auto mb-1"
                  />
                )}
                <div className="font-bold text-xs uppercase tracking-tight">{business.name}</div>
                {business.tagline && <div className="text-[10px] text-slate-500 italic">{business.tagline}</div>}
                {business.address && <div className="text-[10px] text-slate-600 leading-snug">{business.address}</div>}
                {business.phone && <div className="text-[10px] text-slate-600 font-mono">Ph: {business.phone}</div>}
                {business.gstin && <div className="text-[10px] font-semibold font-mono">GSTIN: {business.gstin}</div>}
                <div className="font-bold text-[11px] pt-1 uppercase tracking-wider text-slate-800">TAX INVOICE</div>
              </div>

              {/* Metadata */}
              <div className="text-[10px] space-y-1 pb-2 border-b border-dashed border-slate-300 leading-relaxed">
                <div className="flex justify-between">
                  <span className="font-mono font-bold">Bill #{sale.invoice_number}</span>
                  <span className="font-mono">{new Date(sale.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <div>Cust: <strong className="text-slate-800">{sale.customer_name || 'Cash Customer'}</strong></div>
              </div>

              {/* Items */}
              <div className="space-y-1.5 pb-2.5 border-b border-dashed border-slate-300 text-[11px] leading-relaxed">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-2 py-0.5">
                    <span className="leading-snug flex-1">{item.product_name} <span className="text-slate-500 font-mono font-semibold">x{item.quantity}</span></span>
                    <span className="font-bold font-mono text-right flex-shrink-0">{formatINR(item.total_amount)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-300 leading-relaxed">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-mono">{formatINR(sale.subtotal)}</span>
                </div>
                {sale.tax_total > 0 && (
                  <div className="flex justify-between text-slate-600 py-0.5">
                    <span>GST:</span>
                    <span className="font-mono">{formatINR(sale.tax_total)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1.5 pb-0.5 border-t border-slate-200">
                  <span>TOTAL:</span>
                  <span className="font-mono text-sm">{formatINR(sale.grand_total)}</span>
                </div>
                <div className="flex justify-between text-slate-600 py-0.5">
                  <span>Paid ({sale.payment_method.toUpperCase()}):</span>
                  <span className="font-mono">{formatINR(sale.amount_received)}</span>
                </div>
                {sale.balance_due > 0 && (
                  <div className="flex justify-between font-bold text-amber-700 py-0.5">
                    <span>Credit Due:</span>
                    <span className="font-mono">{formatINR(sale.balance_due)}</span>
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

              <div className="text-center text-[10px] text-slate-500 pt-1">
                {business.footer_message || 'Thank you! Visit again.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
