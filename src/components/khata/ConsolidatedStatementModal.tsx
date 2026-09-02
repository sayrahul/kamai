'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Sale, Customer, Business } from '@/types';
import { formatINR, generateUPILink } from '@/lib/utils';
import { numberToWordsINR } from '@/lib/invoices/gstCalculator';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  Printer, 
  Download, 
  Share2, 
  Receipt, 
  FileText, 
  CheckCircle2, 
  QrCode, 
  Phone, 
  Building2, 
  Calendar, 
  ShoppingBag,
  Loader2,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';

interface ConsolidatedStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSales: Sale[];
  customer: Customer;
  business?: Business | null;
}

export function ConsolidatedStatementModal({
  isOpen,
  onClose,
  selectedSales,
  customer,
  business,
}: ConsolidatedStatementModalProps) {
  const [format, setFormat] = useState<'a4' | 'thermal-80'>('a4');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const printableRef = useRef<HTMLDivElement>(null);

  // Aggregated totals
  const totalGrandTotalPaise = selectedSales.reduce((sum, s) => sum + (s.grand_total || 0), 0);
  const totalPaidPaise = selectedSales.reduce((sum, s) => sum + (s.amount_received || 0), 0);
  const totalDuePaise = selectedSales.reduce((sum, s) => sum + (s.balance_due || 0), 0);

  // Generate UPI QR Code for the net balance due
  useEffect(() => {
    if (business?.upi_id && totalDuePaise > 0) {
      const upiUrl = generateUPILink(
        business.upi_id,
        business.name,
        totalDuePaise,
        `Khata_Stmt_${customer?.name?.replace(/\s+/g, '_') || 'Customer'}`
      );
      QRCode.toDataURL(upiUrl, {
        width: 160,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      }).then((url) => setQrDataUrl(url)).catch(() => setQrDataUrl(''));
    } else {
      setQrDataUrl('');
    }
  }, [business, totalDuePaise, customer]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Direct Browser Print
  const handlePrint = () => {
    if (!printableRef.current) return;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
      const isThermal = format === 'thermal-80';
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Consolidated Statement - ${customer.name}</title>
            <meta charset="utf-8" />
            <style>
              @page {
                size: ${isThermal ? '80mm auto' : 'A4 portrait'};
                margin: ${isThermal ? '2mm' : '10mm'};
              }
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: ${isThermal ? '4px' : '16px'};
                color: #0f172a;
                background: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 6px 8px; font-size: ${isThermal ? '11px' : '12px'}; }
            </style>
          </head>
          <body>
            ${printableRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 350);
    }
  };

  // High-Resolution PDF Download
  const handleDownloadPdf = async () => {
    if (!printableRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const isThermal = format === 'thermal-80';
      const canvas = await html2canvas(printableRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png', 1.0);

      if (isThermal) {
        const thermalWidth = 80;
        const thermalHeight = Math.max(80, Math.ceil((canvas.height * thermalWidth) / canvas.width) + 8);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [thermalWidth, thermalHeight],
        });
        pdf.addImage(imgData, 'PNG', 0, 4, thermalWidth, (canvas.height * thermalWidth) / canvas.width);
        pdf.save(`Khata_Statement_${customer.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
      } else {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        const pageWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * pageWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        pdf.save(`Khata_Statement_${customer.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
      }
      showToast('✅ Statement PDF downloaded successfully!');
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      showToast('⚠️ Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // WhatsApp Statement Dispatch
  const handleShareWhatsApp = async () => {
    if (!customer.phone) {
      showToast('⚠️ No phone number saved for this customer');
      return;
    }

    const cleanPhone = customer.phone.replace(/\D/g, '').slice(-10);
    setIsSendingWhatsApp(true);

    try {
      const storeName = business?.name || 'Our Store';
      const invoiceNums = selectedSales.map((s) => `#${s.invoice_number}`).join(', ');

      const response = await fetch('/api/whatsapp/send-khata-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: customer.phone,
          customerName: customer.name,
          balanceDue: totalDuePaise,
          businessName: storeName,
          storePhone: business?.phone,
          upiId: business?.upi_id,
          customNote: `Consolidated Statement for ${selectedSales.length} Bill(s): ${invoiceNums}`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast(`✅ WhatsApp statement sent to +91${cleanPhone}!`);
      } else {
        // Fallback: Open WhatsApp URL directly in new tab
        const upiLink = business?.upi_id
          ? generateUPILink(business.upi_id, storeName, totalDuePaise, 'Khata_Udhar_Payment')
          : '';
        const msg = encodeURIComponent(
          `*${storeName} — Consolidated Khata Statement*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Dear *${customer.name}*,\n\n` +
          `Here is the consolidated summary of your *${selectedSales.length} pending bill(s)*:\n` +
          `🧾 Invoices: ${invoiceNums}\n` +
          `💰 Total Bill Amount: ${formatINR(totalGrandTotalPaise)}\n` +
          `✅ Paid: ${formatINR(totalPaidPaise)}\n` +
          `🔴 *Net Balance Due: ${formatINR(totalDuePaise)}*\n\n` +
          (upiLink ? `📲 *Pay instantly via UPI:*\n${upiLink}\n\n` : '') +
          `Thank you for your business!\n` +
          `_${storeName}_`
        );
        window.open(`https://wa.me/91${cleanPhone}?text=${msg}`, '_blank');
        showToast('📲 Opened WhatsApp with statement summary!');
      }
    } catch (err: any) {
      showToast(`⚠️ ${err?.message || 'Error sending WhatsApp statement'}`);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-500" />
          <span>Consolidated Statement / Bill ({selectedSales.length} Invoices)</span>
        </div>
      }
      description={`Combined multi-invoice billing summary for ${customer?.name}.`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Toast */}
        {toastMsg && (
          <div className="p-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Top Control Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80">
          {/* Format Switch */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFormat('a4')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                format === 'a4'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              A4 Statement
            </button>
            <button
              type="button"
              onClick={() => setFormat('thermal-80')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                format === 'thermal-80'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              80mm Thermal Receipt
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-bold text-xs gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
              <span>Print</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-bold text-xs gap-1.5 cursor-pointer shadow-2xs"
            >
              {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-sky-600" />}
              <span>Download PDF</span>
            </Button>

            {customer.phone && (
              <Button
                size="sm"
                onClick={handleShareWhatsApp}
                disabled={isSendingWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              >
                {isSendingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <WhatsAppLogo className="w-3.5 h-3.5" />}
                <span>WhatsApp</span>
              </Button>
            )}
          </div>
        </div>

        {/* Preview Scrollable Area */}
        <div className="bg-slate-100 dark:bg-slate-950/80 p-3 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[65vh] overflow-y-auto flex justify-center">
          <div
            ref={printableRef}
            className={`bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 ${
              format === 'a4' ? 'w-full max-w-[720px]' : 'w-full max-w-[360px] text-xs'
            }`}
          >
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center sm:text-left flex flex-col sm:flex-row items-start justify-between gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 uppercase">
                  {business?.name || 'Retail Store'}
                </h1>
                {business?.tagline && <p className="text-xs text-slate-500 italic mt-0.5">{business.tagline}</p>}
                <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                  {business?.address && <div>{business.address}{business.pincode ? ` - ${business.pincode}` : ''}</div>}
                  {business?.phone && <div>Phone: {business.phone}</div>}
                  {business?.gstin && <div className="font-mono font-bold">GSTIN: {business.gstin}</div>}
                </div>
              </div>

              <div className="text-left sm:text-right self-stretch sm:self-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <div className="font-black text-slate-900 uppercase tracking-wider text-[11px] text-amber-600">
                  Consolidated Statement
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Date: <span className="font-bold text-slate-800">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Bills Count: <span className="font-bold text-slate-800">{selectedSales.length} Invoices</span>
                </div>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-4 text-xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Statement Billed To
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <div className="font-black text-sm text-slate-900">{customer.name}</div>
                  {customer.phone && <div className="text-slate-600 mt-0.5 font-mono">📱 +91 {customer.phone}</div>}
                  {customer.address && <div className="text-slate-500">{customer.address}</div>}
                </div>
                {customer.gstin && (
                  <div className="text-left sm:text-right font-mono text-[11px] font-bold text-slate-700">
                    GSTIN: {customer.gstin}
                  </div>
                )}
              </div>
            </div>

            {/* Invoices Breakdown Table */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-left">
                    <th className="p-2 rounded-l-lg">Date</th>
                    <th className="p-2">Invoice #</th>
                    <th className="p-2">Items Purchased</th>
                    <th className="p-2 text-right">Bill Total</th>
                    <th className="p-2 text-right">Paid</th>
                    <th className="p-2 text-right rounded-r-lg">Due (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedSales.map((sale) => {
                    const itemsSummary = sale.items
                      ? sale.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')
                      : '-';

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/80">
                        <td className="p-2 font-medium text-slate-600 whitespace-nowrap">
                          {new Date(sale.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="p-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                          #{sale.invoice_number}
                        </td>
                        <td className="p-2 text-slate-700 max-w-[200px] truncate" title={itemsSummary}>
                          {itemsSummary}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {formatINR(sale.grand_total)}
                        </td>
                        <td className="p-2 text-right font-mono text-emerald-600">
                          {formatINR(sale.amount_received || 0)}
                        </td>
                        <td className="p-2 text-right font-mono font-black text-rose-600">
                          {formatINR(sale.balance_due || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals & UPI Summary Box */}
            <div className="border-t-2 border-slate-200 pt-3 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Left: UPI QR Code for instant payment */}
              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 w-full sm:w-auto">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="UPI QR" className="w-20 h-20 rounded border bg-white p-1 shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded border bg-slate-200 flex items-center justify-center text-slate-400 text-[10px] text-center p-1">
                    No UPI Configured
                  </div>
                )}
                <div className="text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-amber-600" />
                    <span>Scan & Pay via UPI</span>
                  </div>
                  {business?.upi_id && <div className="text-[11px] font-mono text-slate-600 mt-0.5">{business.upi_id}</div>}
                  <div className="text-[10px] text-slate-400 mt-1">GPay • PhonePe • Paytm • BHIM</div>
                </div>
              </div>

              {/* Right: Net Summary Calculation */}
              <div className="w-full sm:w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Invoiced:</span>
                  <span className="font-mono font-bold text-slate-900">{formatINR(totalGrandTotalPaise)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Total Received:</span>
                  <span className="font-mono font-bold">(-) {formatINR(totalPaidPaise)}</span>
                </div>
                <div className="border-t border-slate-300 pt-1.5 flex justify-between text-sm font-black text-slate-900">
                  <span className="text-rose-600">Net Due:</span>
                  <span className="font-mono text-base text-rose-600">{formatINR(totalDuePaise)}</span>
                </div>
                <div className="text-[10px] text-slate-400 italic text-right leading-tight">
                  {numberToWordsINR(totalDuePaise)}
                </div>
              </div>
            </div>

            {/* Bank details & Footer */}
            {business?.bank_account_no && (
              <div className="mt-4 pt-3 border-t border-dashed border-slate-200 text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                <span className="font-bold text-slate-800">Bank Transfer:</span>
                <span>Bank: {business.bank_name || '-'}</span>
                <span>A/C: {business.bank_account_no}</span>
                <span>IFSC: {business.bank_ifsc || '-'}</span>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
              Thank you for your business! Please clear the pending balance at your earliest convenience.
              <div className="text-slate-300 mt-0.5">Generated via KamaiPlus Smart Billing</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
