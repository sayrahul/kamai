'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Sale, Customer, Business } from '@/types';
import { formatINR, generateUPILink } from '@/lib/utils';
import { numberToWordsINR } from '@/lib/invoices/gstCalculator';
import { downloadInvoicePdfFromElement } from '@/lib/invoices/pdfGenerator';
import QRCode from 'qrcode';
import { 
  Printer, 
  Download, 
  FileText, 
  CheckCircle2, 
  QrCode, 
  Phone, 
  Building2, 
  Calendar, 
  ShoppingBag,
  Loader2,
  ZoomIn,
  ZoomOut,
  Landmark,
  Check
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
  const [viewMode, setViewMode] = useState<'fit' | 'full'>('fit');
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Aggregated totals
  const totalGrandTotalPaise = selectedSales.reduce((sum, s) => sum + (s.grand_total || 0), 0);
  const totalPaidPaise = selectedSales.reduce((sum, s) => sum + (s.amount_received || 0), 0);
  const totalDuePaise = selectedSales.reduce((sum, s) => sum + (s.balance_due || 0), 0);

  // Responsive scale factor calculation for mobile and desktop preview
  useEffect(() => {
    const calculateScale = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.clientWidth - 24;
        const targetWidth = format === 'a4' ? 700 : 340;
        if (containerWidth > 0) {
          if (viewMode === 'fit') {
            const factor = containerWidth < targetWidth ? containerWidth / targetWidth : 1;
            setScaleFactor(factor);
          } else {
            setScaleFactor(1);
          }
        }
      }
    };

    calculateScale();
    const t1 = setTimeout(calculateScale, 60);
    const t2 = setTimeout(calculateScale, 200);
    window.addEventListener('resize', calculateScale);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', calculateScale);
    };
  }, [format, viewMode, isOpen]);

  // Generate UPI QR Code for the net balance due
  useEffect(() => {
    if (business?.upi_id && totalDuePaise > 0) {
      const upiUrl = generateUPILink(
        business.upi_id,
        business.name,
        totalDuePaise,
        `Stmt_${customer?.name?.replace(/\s+/g, '_') || 'Customer'}`
      );
      QRCode.toDataURL(upiUrl, {
        width: 180,
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

  // High-Resolution PDF Download using unified generator
  const handleDownloadPdf = async () => {
    const el = document.getElementById('modal-consolidated-statement');
    if (!el) return;
    setIsGeneratingPdf(true);
    const prevMode = viewMode;
    const scrollContainer = previewContainerRef.current;

    try {
      if (prevMode !== 'full') {
        setViewMode('full');
      }
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
      await new Promise((r) => setTimeout(r, 60));
      const targetEl = document.getElementById('modal-consolidated-statement') || el;
      const fileName = `Statement_${customer?.name?.replace(/\s+/g, '_') || 'Customer'}_${Date.now()}.pdf`;
      await downloadInvoicePdfFromElement(targetEl, fileName);
      showToast('✅ Statement PDF downloaded successfully!');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      showToast('⚠️ Could not generate PDF directly. Please use Print button.');
    } finally {
      if (prevMode !== 'full') {
        setViewMode(prevMode);
      }
      setIsGeneratingPdf(false);
    }
  };

  // Direct Browser Print via hidden iframe (No popup blockers)
  const handlePrint = () => {
    const el = document.getElementById('modal-consolidated-statement');
    if (!el) {
      window.print();
      return;
    }
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const isThermal = format === 'thermal-80';
    const doc = printFrame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Statement - ${customer.name}</title>
            <style>
              @page {
                size: ${isThermal ? '80mm auto' : 'A4 portrait'};
                margin: ${isThermal ? '2mm' : '10mm'};
              }
              body {
                font-family: ${isThermal ? 'monospace' : "'Mukta', 'Noto Sans Devanagari', 'Inter', system-ui, sans-serif"};
                margin: 0;
                padding: ${isThermal ? '2px' : '0'};
                background: #ffffff;
                color: #000000;
                font-size: ${isThermal ? '11px' : '12px'};
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              * { box-sizing: border-box; }
              table { width: 100%; border-collapse: collapse; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              .font-black { font-weight: 900; }
            </style>
          </head>
          <body>
            ${el.outerHTML}
          </body>
        </html>
      `);
      doc.close();
      printFrame.contentWindow?.focus();
      setTimeout(() => {
        printFrame.contentWindow?.print();
        document.body.removeChild(printFrame);
      }, 350);
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
          `✅ Total Paid: ${formatINR(totalPaidPaise)}\n` +
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
      description={`Combined multi-invoice billing statement for ${customer?.name}.`}
      size="xl"
    >
      <div className="space-y-3.5 p-1">
        {/* Toast */}
        {toastMsg && (
          <div className="p-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/70 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/80">
          {/* Format Switcher */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFormat('a4')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                format === 'a4'
                  ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              A4 Statement
            </button>
            <button
              type="button"
              onClick={() => setFormat('thermal-80')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                format === 'thermal-80'
                  ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              80mm Thermal Receipt
            </button>
          </div>

          {/* Zoom View Mode */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'fit' ? 'full' : 'fit')}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs hover:bg-slate-50"
              title={viewMode === 'fit' ? 'Zoom to 100%' : 'Fit to screen'}
            >
              {viewMode === 'fit' ? <ZoomIn className="w-3.5 h-3.5 text-amber-600" /> : <ZoomOut className="w-3.5 h-3.5 text-amber-600" />}
              <span>{viewMode === 'fit' ? 'Fit' : '100%'}</span>
            </button>

            {/* Action Buttons */}
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

        {/* Scrollable Canvas Container with Zoom/Fit Transform */}
        <div
          ref={previewContainerRef}
          className="bg-slate-100 dark:bg-slate-950/80 p-3 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-auto flex justify-center items-start min-h-[420px]"
        >
          <div
            style={{
              transform: viewMode === 'fit' && scaleFactor < 1 ? `scale(${scaleFactor})` : 'none',
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease',
              marginBottom: viewMode === 'fit' && scaleFactor < 1 ? `-${(1 - scaleFactor) * 100}%` : '0',
            }}
            className="flex justify-center w-full"
          >
            {format === 'a4' ? (
              /* ========================================================================= */
              /* A4 CONSOLIDATED STATEMENT INVOICE CANVAS */
              /* ========================================================================= */
              <div
                id="modal-consolidated-statement"
                data-format="a4"
                className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-xl border border-slate-200 w-full max-w-[720px] space-y-4"
              >
                {/* 1. Header Banner */}
                <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                      {business?.name || 'Retail Store'}
                    </h1>
                    {business?.tagline && (
                      <p className="text-xs text-amber-300 font-medium italic">{business.tagline}</p>
                    )}
                    <div className="text-[11px] text-slate-300 space-y-0.5 pt-0.5">
                      {business?.address && <div>{business.address}{business.pincode ? ` - ${business.pincode}` : ''}</div>}
                      <div className="flex items-center gap-3 text-slate-300 flex-wrap">
                        {business?.phone && <span>Ph: {business.phone}</span>}
                        {business?.email && <span>Email: {business.email}</span>}
                      </div>
                      {business?.gstin && (
                        <div className="text-amber-300 font-mono font-bold pt-0.5">
                          GSTIN: {business.gstin}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right self-stretch sm:self-auto bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 text-xs">
                    <div className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Consolidated Statement
                    </div>
                    <div className="text-white/80 text-[11px] mt-1">
                      Date: <b className="text-white">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b>
                    </div>
                    <div className="text-white/80 text-[11px]">
                      Invoices Count: <b className="text-white">{selectedSales.length} Bills</b>
                    </div>
                  </div>
                </div>

                {/* 2. Customer Details Box */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Statement Billed To
                    </div>
                    <div className="text-sm font-black text-slate-900">{customer.name}</div>
                    {customer.phone && (
                      <div className="text-slate-600 font-mono text-[11px] mt-0.5">
                        📱 +91 {customer.phone}
                      </div>
                    )}
                    {customer.address && (
                      <div className="text-slate-500 text-[11px] mt-0.5 max-w-sm">{customer.address}</div>
                    )}
                  </div>

                  <div className="text-left sm:text-right space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Payment Terms
                    </div>
                    <div className="font-bold text-slate-800 uppercase">Khata Credit Account</div>
                    {customer.gstin && (
                      <div className="font-mono text-[11px] font-bold text-slate-700">
                        Customer GSTIN: {customer.gstin}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Invoices Breakdown Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3 w-8 text-center">#</th>
                        <th className="py-2.5 px-3 w-24">Date</th>
                        <th className="py-2.5 px-3 w-28">Invoice #</th>
                        <th className="py-2.5 px-3">Items Purchased</th>
                        <th className="py-2.5 px-3 text-right w-24">Bill Total</th>
                        <th className="py-2.5 px-3 text-right w-20">Paid</th>
                        <th className="py-2.5 px-3 text-right w-24 text-rose-600">Due (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSales.map((sale, idx) => {
                        const itemsSummary = sale.items
                          ? sale.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')
                          : '-';

                        return (
                          <tr key={sale.id} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-2 px-3 text-slate-600 font-medium whitespace-nowrap">
                              {new Date(sale.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              #{sale.invoice_number}
                            </td>
                            <td className="py-2 px-3 text-slate-700 max-w-[220px] truncate" title={itemsSummary}>
                              {itemsSummary}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatINR(sale.grand_total)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-600 font-medium">
                              {formatINR(sale.amount_received || 0)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-rose-600">
                              {formatINR(sale.balance_due || 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 4. Totals and Payment Summary Section */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pt-2">
                  {/* Left: UPI QR Box & Bank Details */}
                  <div className="flex-1 space-y-2.5 w-full">
                    {/* Amount in Words */}
                    <div className="text-[11px] text-slate-600">
                      <span className="font-bold text-slate-700">Amount in Words:</span>
                      <div className="italic font-semibold text-slate-900">{numberToWordsINR(totalDuePaise)}</div>
                    </div>

                    {/* UPI QR Block */}
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="UPI QR" className="w-20 h-20 rounded-lg border bg-white p-1 shrink-0 shadow-2xs" />
                      ) : (
                        <div className="w-20 h-20 rounded-lg border bg-slate-200 flex items-center justify-center text-slate-400 text-[10px] text-center p-1">
                          No UPI Configured
                        </div>
                      )}
                      <div className="text-xs space-y-0.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <QrCode className="w-3.5 h-3.5 text-amber-600" />
                          <span>Scan &amp; Pay via UPI</span>
                        </div>
                        {business?.upi_id && <div className="text-[11px] font-mono text-slate-700 font-bold">{business.upi_id}</div>}
                        <div className="text-[10px] text-slate-500 font-medium">GPay • PhonePe • Paytm • BHIM</div>
                      </div>
                    </div>

                    {/* Bank Account Info */}
                    {business?.bank_account_no && (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 flex flex-wrap gap-x-3 gap-y-0.5 font-medium">
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <Landmark className="w-3 h-3 text-slate-500" />
                          <span>Bank:</span>
                        </span>
                        <span>{business.bank_name || '-'}</span>
                        <span>A/C: <b className="font-mono">{business.bank_account_no}</b></span>
                        <span>IFSC: <b className="font-mono">{business.bank_ifsc || '-'}</b></span>
                      </div>
                    )}
                  </div>

                  {/* Right: Net Summary Calculation Card */}
                  <div className="w-full sm:w-64 space-y-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200 shrink-0">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Invoiced:</span>
                      <span className="font-mono font-bold text-slate-900">{formatINR(totalGrandTotalPaise)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Total Received:</span>
                      <span className="font-mono font-bold">(-) {formatINR(totalPaidPaise)}</span>
                    </div>
                    <div className="border-t border-slate-300 pt-2 flex justify-between items-baseline text-slate-900">
                      <span className="font-bold text-rose-600">Net Balance Due:</span>
                      <span className="font-mono text-lg font-black text-rose-600">{formatINR(totalDuePaise)}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Terms & Signatory Footer */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10.5px] text-slate-500">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <div>Thank you for your business! Please clear the pending balance at your earliest convenience.</div>
                    <div className="text-slate-400">Generated via KamaiPlus Smart Billing System</div>
                  </div>
                  <div className="text-center sm:text-right shrink-0">
                    <div className="h-8"></div>
                    <div className="border-t border-slate-300 pt-1 font-bold text-slate-700">
                      For {business?.name || 'Retail Store'} (Authorized Signatory)
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* 80MM THERMAL RECEIPT CANVAS */
              /* ========================================================================= */
              <div
                id="modal-consolidated-statement"
                data-format="thermal-80"
                className="bg-white p-4 text-slate-950 font-mono text-[11px] space-y-2.5 border border-slate-200 shadow-xl w-[320px] rounded-lg"
              >
                {/* Store Header */}
                <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-slate-400">
                  <h2 className="font-black text-sm uppercase">{business?.name || 'Retail Store'}</h2>
                  {business?.address && <p className="text-[10px] text-slate-600">{business.address}</p>}
                  {business?.phone && <p className="text-[10px] text-slate-600">Ph: {business.phone}</p>}
                  {business?.gstin && <p className="text-[10px] font-bold">GSTIN: {business.gstin}</p>}
                  <div className="font-black uppercase text-[11px] pt-1 text-slate-900">
                    CONSOLIDATED STATEMENT
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {selectedSales.length} Bills
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-0.5 pb-2 border-b border-dashed border-slate-400 text-[11px]">
                  <div>Customer: <b className="text-slate-900">{customer.name}</b></div>
                  {customer.phone && <div>Phone: <span className="font-mono">{customer.phone}</span></div>}
                </div>

                {/* Invoices List */}
                <div className="space-y-1.5 pb-2 border-b border-dashed border-slate-400">
                  <div className="flex justify-between font-bold text-[10.5px] uppercase border-b border-slate-200 pb-0.5">
                    <span>Inv# / Date</span>
                    <span>Due (₹)</span>
                  </div>
                  {selectedSales.map((sale) => (
                    <div key={sale.id} className="text-[10.5px]">
                      <div className="flex justify-between font-bold">
                        <span>#{sale.invoice_number} ({new Date(sale.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})</span>
                        <span className="font-mono">{formatINR(sale.balance_due || 0)}</span>
                      </div>
                      <div className="text-[9.5px] text-slate-500 truncate">
                        Total: {formatINR(sale.grand_total)} | Paid: {formatINR(sale.amount_received || 0)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Totals */}
                <div className="space-y-1 pb-2 border-b border-dashed border-slate-400 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Invoiced:</span>
                    <span className="font-mono">{formatINR(totalGrandTotalPaise)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Paid:</span>
                    <span className="font-mono">(-) {formatINR(totalPaidPaise)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300">
                    <span>Net Balance Due:</span>
                    <span className="font-mono text-rose-600">{formatINR(totalDuePaise)}</span>
                  </div>
                </div>

                {/* QR Code in Thermal */}
                {qrDataUrl && (
                  <div className="text-center pt-1 flex flex-col items-center space-y-1">
                    <img src={qrDataUrl} alt="UPI QR" className="w-24 h-24 p-1 border border-slate-300" />
                    <div className="text-[10px] font-bold">Scan to Pay via UPI</div>
                    {business?.upi_id && <div className="text-[9.5px] font-mono text-slate-600">{business.upi_id}</div>}
                  </div>
                )}

                {/* Thermal Footer */}
                <div className="text-center text-[9.5px] text-slate-500 pt-1">
                  <div>Thank you for your business!</div>
                  <div>KamaiPlus POS</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
