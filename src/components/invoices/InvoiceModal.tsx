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
  Palette,
  Edit3
} from 'lucide-react';
import { downloadInvoicePdfFromElement, shareInvoicePdfDirect } from '@/lib/invoices/pdfGenerator';
import { bluetoothPrinter } from '@/lib/hardware/bluetoothPrinter';
import { Bluetooth, Zap } from 'lucide-react';
import { EditInvoiceModal } from '@/components/invoices/EditInvoiceModal';

export type InvoiceFormat = 'thermal-58' | 'thermal-80' | 'a4';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  business: Business | null;
  onInvoiceUpdated?: (updatedSale: Sale) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  sale: initialSale,
  business,
  onInvoiceUpdated,
}) => {
  const [format, setFormat] = useState<InvoiceFormat>('a4');
  const [sale, setSale] = useState<Sale | null>(initialSale);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [showPhoneInput, setShowPhoneInput] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [shareSuccessMsg, setShareSuccessMsg] = useState<string>('');
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setSale(initialSale);
  }, [initialSale]);

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

  const handleInvoiceSaved = (updatedSale: Sale) => {
    setSale(updatedSale);
    setShareSuccessMsg('Invoice updated successfully! Changes saved.');
    setTimeout(() => setShareSuccessMsg(''), 4000);
    if (onInvoiceUpdated) {
      onInvoiceUpdated(updatedSale);
    }
  };

  return (
    <>
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
              {/* Edit Invoice Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs font-bold gap-1 text-amber-900 border-amber-300 bg-amber-50 hover:bg-amber-100"
                title="Edit past invoice items, customer or payment"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                <span>Edit Bill</span>
              </Button>

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
                title="1-Click Direct Bluetooth ESC/POS Printing"
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

          {/* Success Toast */}
          {shareSuccessMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{shareSuccessMsg}</span>
            </div>
          )}

          {/* WhatsApp Recipient Phone Input (if missing) */}
          {showPhoneInput && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <Phone className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <input
                type="tel"
                placeholder="Enter customer WhatsApp number..."
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="flex-1 text-xs bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleWhatsAppSend}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg whitespace-nowrap"
              >
                Dispatch Bill
              </button>
            </div>
          )}

          {/* Printable Invoice Container */}
          <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-inner max-h-[60vh] overflow-y-auto p-4 flex justify-center">
            {format === 'a4' ? (
              /* A4 Format */
              <div
                id="modal-printable-invoice"
                className="w-full max-w-[700px] bg-white p-6 rounded-lg text-slate-900 text-xs space-y-4"
              >
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{business.name}</h2>
                    {business.tagline && <p className="text-[11px] text-slate-500">{business.tagline}</p>}
                    <p className="text-[11px] text-slate-600 mt-1 max-w-xs">{business.address}</p>
                    <p className="text-[11px] text-slate-600">Phone: {business.phone}</p>
                    {business.gstin && <p className="text-[11px] font-mono font-bold text-slate-800">GSTIN: {business.gstin}</p>}
                  </div>

                  <div className="text-right">
                    <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-black uppercase text-slate-800 border border-slate-300">
                      TAX INVOICE
                    </div>
                    <p className="text-sm font-black font-mono mt-1">#{sale.invoice_number}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{saleDateFormatted}</p>
                  </div>
                </div>

                {/* Bill To Info */}
                <div className="grid grid-cols-2 gap-4 py-2 bg-slate-50 p-3 rounded-lg text-[11px]">
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Billed To:</span>
                    <p className="font-bold text-slate-900 text-xs mt-0.5">{sale.customer_name || 'Walk-in Cash Customer'}</p>
                    {sale.customer_phone && <p className="text-slate-600">Phone: {sale.customer_phone}</p>}
                    {sale.customer_address && <p className="text-slate-600">{sale.customer_address}</p>}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Payment Details:</span>
                    <p className="font-bold uppercase text-xs mt-0.5">{sale.payment_method}</p>
                    <p className="font-semibold text-emerald-700">Status: {sale.payment_status.toUpperCase()}</p>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-800 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-1.5">#</th>
                      <th className="py-1.5">Item Name</th>
                      <th className="py-1.5 text-right">Price</th>
                      <th className="py-1.5 text-center">Qty</th>
                      <th className="py-1.5 text-right">Disc</th>
                      <th className="py-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 font-bold text-slate-900">{item.product_name}</td>
                        <td className="py-2 text-right font-mono">{formatINR(item.unit_price)}</td>
                        <td className="py-2 text-center font-mono font-bold">{item.quantity} {item.unit}</td>
                        <td className="py-2 text-right font-mono text-slate-500">{item.discount_amount ? formatINR(item.discount_amount) : '—'}</td>
                        <td className="py-2 text-right font-mono font-bold text-slate-900">{formatINR(item.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals & QR Section */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t-2 border-slate-800">
                  <div>
                    {qrDataUrl && (
                      <div className="flex items-center gap-3">
                        <img src={qrDataUrl} alt="UPI QR" className="w-20 h-20 border border-slate-200 rounded p-1" />
                        <div className="text-[10px] text-slate-600">
                          <p className="font-bold text-slate-900">Scan & Pay via UPI</p>
                          <p className="font-mono">{business.upi_id}</p>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 italic mt-2">Amount in words: {amountWords}</p>
                  </div>

                  <div className="space-y-1.5 text-right text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono">{formatINR(sale.subtotal)}</span>
                    </div>
                    {sale.discount_total > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Total Discount:</span>
                        <span className="font-mono">-{formatINR(sale.discount_total)}</span>
                      </div>
                    )}
                    {sale.tax_total > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Total GST:</span>
                        <span className="font-mono">{formatINR(sale.tax_total)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-300">
                      <span>Grand Total:</span>
                      <span className="font-mono">{formatINR(sale.grand_total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 pt-1">
                      <span>Amount Received:</span>
                      <span className="font-mono font-bold">{formatINR(sale.amount_received)}</span>
                    </div>
                    {sale.balance_due > 0 && (
                      <div className="flex justify-between text-xs font-bold text-rose-700">
                        <span>Balance Due (Udhar):</span>
                        <span className="font-mono">{formatINR(sale.balance_due)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer terms */}
                <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
                  <p>{business.terms_conditions || 'Thank you for your business!'}</p>
                  <p className="mt-0.5">{business.footer_message || 'Powered by Kamai+ Digital POS'}</p>
                </div>
              </div>
            ) : (
              /* Thermal Format (58mm or 80mm) */
              <div
                id="modal-printable-invoice"
                className={`bg-white p-4 text-slate-900 font-mono text-xs space-y-2 border border-slate-300 ${
                  format === 'thermal-80' ? 'w-[320px]' : 'w-[260px]'
                }`}
              >
                <div className="text-center pb-2 border-b border-dashed border-slate-300">
                  <h3 className="font-black text-sm uppercase">{business.name}</h3>
                  <p className="text-[10px] text-slate-600">{business.address}</p>
                  <p className="text-[10px] text-slate-600">Ph: {business.phone}</p>
                  {business.gstin && <p className="text-[9px] font-bold">GSTIN: {business.gstin}</p>}
                </div>

                <div className="text-[10px] space-y-0.5 pb-1 border-b border-dashed border-slate-300">
                  <div className="flex justify-between">
                    <span>Inv: #{sale.invoice_number}</span>
                    <span>{new Date(sale.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cust: {sale.customer_name || 'Cash'}</span>
                    <span>{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1 text-[11px] py-1 border-b border-dashed border-slate-300">
                  {sale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between gap-1">
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

      {/* Edit Invoice Submodal */}
      <EditInvoiceModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        sale={sale}
        onSaved={handleInvoiceSaved}
      />
    </>
  );
};
