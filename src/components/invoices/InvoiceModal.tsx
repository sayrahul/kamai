'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Business, Sale, CartItem, UpiAccount } from '@/types';
import { formatINR, generateUPILink } from '@/lib/utils';
import { calculateGstSummary, numberToWordsINR } from '@/lib/invoices/gstCalculator';
import { sendInvoiceViaOfficialCloudApi, sendInvoiceViaWhatsApp } from '@/lib/invoices/whatsappInvoice';
import { usePlatformPromoConfig } from '@/lib/firebase/remoteConfig';
import Link from 'next/link';
import { 
  Printer, 
  Share2, 
  Download, 
  FileText, 
  QrCode, 
  CheckCircle2, 
  Receipt,
  Phone,
  Sparkles, 
  Palette, 
  Edit3, 
  Lock,
  ChevronDown,
  ChevronUp,
  Bluetooth,
  Zap,
  Store,
  Clock,
  Calendar,
  CreditCard,
  Check
} from 'lucide-react';
import { downloadInvoicePdfFromElement, shareInvoicePdfDirect, generateInvoicePdfBlobFromElement } from '@/lib/invoices/pdfGenerator';
import { bluetoothPrinter } from '@/lib/hardware/bluetoothPrinter';
import { EditInvoiceModal } from '@/components/invoices/EditInvoiceModal';
import { DEFAULT_INVOICE_THEME_CONFIG } from '@/lib/invoices/themeDefaults';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';

export type InvoiceFormat = 'thermal-58' | 'thermal-80' | 'a4';

export interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewBill?: () => void;
  sale: Sale | null;
  business?: Business | null;
  format?: 'a4' | 'thermal-80' | 'thermal-58';
  initialPhone?: string;
  onInvoiceUpdated?: (updatedSale: Sale) => void;
  isPostSaleSuccess?: boolean;
}

export function InvoiceModal({
  isOpen,
  onClose,
  onNewBill,
  sale: initialSale,
  business,
  format: initialFormat = 'a4',
  initialPhone = '',
  onInvoiceUpdated,
  isPostSaleSuccess = false,
}: InvoiceModalProps) {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const [format, setFormat] = useState<InvoiceFormat>(initialFormat);
  const [sale, setSale] = useState<Sale | null>(initialSale);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>(initialPhone);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);
  const [shareSuccessMsg, setShareSuccessMsg] = useState<string>('');
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedUpiIndex, setSelectedUpiIndex] = useState<number>(0);
  const [isPdfPreviewExpanded, setIsPdfPreviewExpanded] = useState<boolean>(!isPostSaleSuccess);
  
  // Pharmacy Prescription Bill Mode Toggle (Pro Feature)
  const [isPharmacyRxEnabled, setIsPharmacyRxEnabled] = useState<boolean>(false);

  // Responsive Mobile & Desktop Preview View Mode ('fit' vs 'full')
  const [viewMode, setViewMode] = useState<'fit' | 'full'>('fit');
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState<number>(1);

  const platformPromo = usePlatformPromoConfig();

  useEffect(() => {
    const calculateScale = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.clientWidth - 24;
        const targetWidth = format === 'a4' ? 680 : format === 'thermal-80' ? 320 : 260;
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
    const t3 = setTimeout(calculateScale, 400);
    window.addEventListener('resize', calculateScale);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', calculateScale);
    };
  }, [format, viewMode, isOpen, isPdfPreviewExpanded]);

  useEffect(() => {
    setSale(initialSale);
    if (isPro && (initialSale?.doctor_name || business?.business_type === 'pharmacy' || business?.invoice_theme_config?.show_pharmacy_rx)) {
      setIsPharmacyRxEnabled(true);
    } else {
      setIsPharmacyRxEnabled(false);
    }
  }, [initialSale, business, isPro]);

  const activeUpi: UpiAccount | null = business?.upi_ids && business.upi_ids.length > 0
    ? (business.upi_ids[selectedUpiIndex] || business.upi_ids[0])
    : business?.upi_id
    ? { id: 'def', label: 'Primary Shop QR', upi_id: business.upi_id, is_default: true }
    : null;

  useEffect(() => {
    if (isOpen && sale && business && activeUpi?.upi_id) {
      if (initialPhone) {
        setRecipientPhone(initialPhone);
      } else if (sale.customer_phone) {
        setRecipientPhone(sale.customer_phone);
      }

      setIsPdfPreviewExpanded(!isPostSaleSuccess);

      const upiTarget = activeUpi.upi_id;
      if (upiTarget) {
        const upiUrl = generateUPILink(
          upiTarget,
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
          .catch(() => {});
      }
    }
  }, [isOpen, sale, business, activeUpi?.upi_id, isPostSaleSuccess, initialPhone]);

  if (!sale || !business) return null;

  // Calculate GST Breakdown for A4 Tax Invoice
  const hasTax = (sale.tax_total || 0) > 0;
  const theme = business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG;

  const handlePrint = () => {
    const el = document.getElementById('modal-printable-invoice');
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

    const doc = printFrame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice #${sale.invoice_number}</title>
            <style>
              @page {
                size: ${format === 'a4' ? 'A4 portrait' : format === 'thermal-80' ? '80mm auto' : '58mm auto'};
                margin: ${format === 'a4' ? '10mm' : '0mm'};
              }
              body {
                font-family: ${format === 'a4' ? "'Mukta', 'Noto Sans Devanagari', 'Inter', system-ui, sans-serif" : 'monospace'};
                margin: 0;
                padding: ${format === 'a4' ? '0' : '4px'};
                background: #fff;
                color: #000;
                font-size: ${format === 'a4' ? '12px' : '11px'};
              }
              * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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

  const handleDownloadPdf = async () => {
    const el = document.getElementById('modal-printable-invoice');
    if (!el) return;
    setIsGeneratingPdf(true);
    const prevMode = viewMode;
    const scrollContainer = previewContainerRef.current;
    const prevScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    try {
      if (prevMode !== 'full') {
        setViewMode('full');
      }
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
      await new Promise((r) => setTimeout(r, 60));
      const targetEl = document.getElementById('modal-printable-invoice') || el;
      await downloadInvoicePdfFromElement(targetEl, `Invoice_${sale.invoice_number}.pdf`);
      setShareSuccessMsg('PDF Invoice downloaded successfully!');
      setTimeout(() => setShareSuccessMsg(''), 4000);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not generate PDF directly. Please use the Print button to Save as PDF.');
    } finally {
      if (prevMode !== 'full') {
        setViewMode(prevMode);
      }
      if (scrollContainer) {
        scrollContainer.scrollTop = prevScrollTop;
      }
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
    if (!sale || !business) return;
    const targetPhone = recipientPhone || sale.customer_phone || '';
    if (!targetPhone) {
      alert('Please enter a valid 10-digit customer WhatsApp number.');
      return;
    }

    const el = document.getElementById('modal-printable-invoice');
    setIsSendingWhatsApp(true);
    setIsGeneratingPdf(true);
    const prevMode = viewMode;
    const scrollContainer = previewContainerRef.current;
    const prevScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    try {
      if (prevMode !== 'full') {
        setViewMode('full');
      }
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
      await new Promise((r) => setTimeout(r, 60));
      const targetEl = document.getElementById('modal-printable-invoice') || el;

      let pdfBase64: string | undefined = undefined;
      if (targetEl) {
        try {
          const { blob } = await generateInvoicePdfBlobFromElement(targetEl, `Invoice_${sale.invoice_number}.pdf`);
          pdfBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (pdfErr) {
          console.warn('PDF generation for WhatsApp background dispatch notice:', pdfErr);
        }
      }

      // Silent dispatch via Meta WhatsApp Cloud API
      const res = await sendInvoiceViaOfficialCloudApi(targetPhone, sale, business, pdfBase64);

      if (res.sent) {
        const masked = targetPhone.replace(/\D/g, '').slice(-10);
        setShareSuccessMsg(`✅ Official WhatsApp invoice delivered silently to +91${masked}!`);
        setTimeout(() => setShareSuccessMsg(''), 5000);
      } else {
        // Smart Fail-Safe Auto-Fallback: Open via merchant's WhatsApp app / Web
        console.warn('Cloud API unavailable or unconfigured, launching direct WhatsApp:', res.error);
        sendInvoiceViaWhatsApp(targetPhone, sale, business);
        const masked = targetPhone.replace(/\D/g, '').slice(-10);
        setShareSuccessMsg(`📲 Opened WhatsApp for +91${masked} (Direct Dispatch)`);
        setTimeout(() => setShareSuccessMsg(''), 5000);
      }
    } catch (err: any) {
      console.error('WhatsApp send error, launching direct fallback:', err);
      sendInvoiceViaWhatsApp(targetPhone, sale, business);
      const masked = targetPhone.replace(/\D/g, '').slice(-10);
      setShareSuccessMsg(`📲 Opened WhatsApp for +91${masked}`);
      setTimeout(() => setShareSuccessMsg(''), 5000);
    } finally {
      if (prevMode !== 'full') {
        setViewMode(prevMode);
      }
      if (scrollContainer) {
        scrollContainer.scrollTop = prevScrollTop;
      }
      setIsGeneratingPdf(false);
      setIsSendingWhatsApp(false);
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

  // Render Printable Invoice Elements (A4 & Thermal)
  const renderPrintableCanvas = () => {
    const targetWidth = format === 'a4' ? 680 : format === 'thermal-80' ? 320 : 260;
    const isScaled = scaleFactor < 1 && viewMode === 'fit';
    const estimatedHeight = format === 'a4' ? 950 : 620;

    return (
      <div 
        style={
          isScaled
            ? {
                transform: `scale(${scaleFactor})`,
                transformOrigin: 'top center',
                width: `${targetWidth}px`,
                marginBottom: `-${Math.round((1 - scaleFactor) * estimatedHeight)}px`,
              }
            : {
                width: `${targetWidth}px`,
                maxWidth: '100%',
              }
        }
        className="transition-all duration-150 flex justify-center shrink-0"
      >
        {format === 'a4' ? (
          /* A4 Full Invoice Format */
          <div
            id="modal-printable-invoice"
            data-format="a4"
            className="w-full max-w-[700px] mx-auto bg-white p-6 sm:p-7 pb-6 rounded-2xl text-slate-900 text-xs space-y-4 border border-slate-200 shadow-lg box-border"
            style={{ fontFamily: "'Mukta', 'Noto Sans Devanagari', 'Nirmala UI', 'Inter', system-ui, sans-serif" }}
          >
            {/* 1. Header Banner Styled with Theme Color */}
            <div 
              className="p-4 sm:p-5 rounded-2xl text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm"
              style={{ backgroundColor: theme.primary_color }}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                {theme.show_logo && (
                  business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={business.name}
                      className="w-14 h-14 rounded-xl object-contain bg-white p-1 border border-white/20 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-xs border border-white/30 flex flex-col items-center justify-center text-white shrink-0 shadow-xs">
                      <Store className="w-6 h-6 text-white" />
                      <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">{business.name?.slice(0, 2) || 'KP'}</span>
                    </div>
                  )
                )}
                <div className="min-w-0 space-y-0.5">
                  <h1 className="text-xl sm:text-2xl font-black truncate leading-tight tracking-tight">{business.name}</h1>
                  {business.address && (
                    <p className="text-white/85 text-[11px] truncate leading-tight">{business.address}</p>
                  )}
                  <div className="flex items-center gap-3 text-white/85 text-[11px] pt-0.5 flex-wrap">
                    {business.phone && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-white/70" />
                        {business.phone}
                      </span>
                    )}
                    {business.email && <span className="opacity-90">• {business.email}</span>}
                  </div>
                  {business.gstin && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-amber-300 font-mono text-[11px] font-bold mt-1 border border-white/20">
                      <span className="text-white/80 font-sans text-[9.5px] uppercase font-bold">GSTIN:</span>
                      <span>{business.gstin}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0 space-y-1 sm:self-center">
                <div className="inline-block px-3 py-1 rounded-lg bg-white/20 backdrop-blur-xs text-white text-xs font-black uppercase tracking-wider border border-white/20 shadow-2xs">
                  {sale.status === 'draft' || sale.invoice_number.startsWith('EST-')
                    ? 'ESTIMATE / QUOTATION'
                    : business.gstin
                    ? 'TAX INVOICE'
                    : 'RETAIL INVOICE'}
                </div>
                <div className="font-mono text-base font-black text-amber-300">
                  #{sale.invoice_number}
                </div>
                <div className="text-white/90 text-[11px] font-medium flex sm:justify-end items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-white/70 inline" />
                  <span>
                    {new Date(sale.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-white/60">•</span>
                  <span className="text-white/80 font-mono text-[10.5px]">
                    {new Date(sale.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Pharmacy Rx License Bar (Optional) */}
            {isPharmacyRxEnabled && (
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 flex items-center justify-between text-[11px] shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="font-black px-2 py-0.5 bg-sky-600 text-white rounded-md text-[10px]">Rx</span>
                  <span>Doctor: <b>{sale.doctor_name || 'Registered Medical Practitioner (RMP)'}</b></span>
                </div>
                <div className="font-mono font-bold text-[11px] text-sky-800">
                  D.L. No: {theme.drug_license_no || business.drug_license_no || 'DL-20B/21B-XXXXXX'}
                </div>
              </div>
            )}

            {/* 3. Customer Details & Payment Mode Card */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 sm:p-4 bg-slate-50/90 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bill To</div>
                <div className="text-sm sm:text-base font-black text-slate-900">{sale.customer_name || 'Cash Customer'}</div>
                {sale.customer_phone && (
                  <div className="text-slate-600 font-mono text-xs flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400 inline" />
                    <span>{sale.customer_phone}</span>
                  </div>
                )}
              </div>
              <div className="text-left sm:text-right space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payment Mode</div>
                <div className="flex items-center sm:justify-end gap-2">
                  <span className="font-black text-slate-900 uppercase text-xs tracking-wide">{sale.payment_method}</span>
                  {sale.payment_status === 'paid' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      PAID
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                      {sale.payment_status?.toUpperCase() || 'UNPAID'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-black text-[10.5px] uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3 w-10 text-center text-slate-400">#</th>
                    <th className="py-2.5 px-3.5">Item Description</th>
                    <th className="py-2.5 px-3 text-center w-24 whitespace-nowrap">Qty</th>
                    <th className="py-2.5 px-3 text-right w-24 whitespace-nowrap">Rate</th>
                    {sale.items.some((i) => i.discount_amount && i.discount_amount > 0) && (
                      <th className="py-2.5 px-2.5 text-right w-20 whitespace-nowrap">Disc</th>
                    )}
                    {hasTax && (
                      <th className="py-2.5 px-3 text-right w-16 whitespace-nowrap">GST%</th>
                    )}
                    <th className="py-2.5 px-3.5 text-right w-28 whitespace-nowrap">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="even:bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-black text-slate-900 text-xs">{item.product_name}</div>
                        {item.batch_number && (
                          <div className="text-[10px] text-slate-500 font-mono pt-0.5">
                            Batch: {item.batch_number} {item.expiry_date ? `| Exp: ${item.expiry_date}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-800 whitespace-nowrap">
                        {item.quantity} <span className="text-[10px] text-slate-500 font-normal">{item.unit || 'pcs'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                        {formatINR(item.unit_price)}
                      </td>
                      {sale.items.some((i) => i.discount_amount && i.discount_amount > 0) && (
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                          {item.discount_amount ? `-${formatINR(item.discount_amount)}` : '—'}
                        </td>
                      )}
                      {hasTax && (
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                          {item.tax_rate ? `${item.tax_rate}%` : '0%'}
                        </td>
                      )}
                      <td className="py-2.5 px-3.5 text-right font-black font-mono text-slate-950 whitespace-nowrap text-sm">
                        {formatINR(item.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 5. Bill Totals & Dynamic UPI QR Code */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-1">
              <div className="flex-1 space-y-3 w-full">
                {/* Amount in Words Card */}
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Amount in Words:</div>
                  <div className="italic font-semibold text-slate-800 text-[11px] bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/90 leading-relaxed shadow-2xs">
                    {numberToWordsINR(sale.grand_total)}
                  </div>
                </div>

                {/* Scannable Dynamic UPI QR Box */}
                {activeUpi && (
                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/90 flex items-center gap-3.5 shadow-2xs">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="UPI Payment QR Code"
                        className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-slate-200 flex flex-col items-center justify-center text-slate-500 text-[10px] font-bold shrink-0">
                        <QrCode className="w-6 h-6 text-slate-400 mb-1" />
                        <span>UPI QR</span>
                      </div>
                    )}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900 text-xs">Scan &amp; Pay via UPI</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">0% Fee</span>
                      </div>
                      <div className="font-mono text-xs font-bold text-slate-800 truncate select-all bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                        VPA: {activeUpi.upi_id}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>Accepted:</span>
                        <span className="font-semibold text-slate-600">GPay • PhonePe • Paytm • BHIM</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Totals Breakdown Box */}
              <div className="w-full sm:w-72 bg-slate-50/90 p-4 rounded-xl border border-slate-200/90 space-y-2 text-xs shadow-2xs shrink-0">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-slate-800">{formatINR(sale.subtotal)}</span>
                </div>
                {sale.discount_total > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span className="font-mono font-bold">-{formatINR(sale.discount_total)}</span>
                  </div>
                )}
                {sale.tax_total > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>GST / Tax:</span>
                    <span className="font-mono font-bold text-slate-800">{formatINR(sale.tax_total)}</span>
                  </div>
                )}

                {/* Prominent Grand Total Banner */}
                <div 
                  className="flex justify-between items-center p-3 rounded-xl text-white my-2 shadow-xs"
                  style={{ backgroundColor: theme.primary_color }}
                >
                  <span className="uppercase tracking-wider text-xs font-black">Grand Total:</span>
                  <span className="font-mono text-base sm:text-lg font-black">{formatINR(sale.grand_total)}</span>
                </div>

                {sale.balance_due > 0 && (
                  <div className="flex justify-between items-center p-2 rounded-lg bg-amber-100/80 border border-amber-300 font-bold text-amber-950 text-xs shadow-2xs">
                    <span>Balance Due (Udhar):</span>
                    <span className="font-mono font-black">{formatINR(sale.balance_due)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 6. Footer Message */}
            <div className="text-center text-[11px] font-semibold text-slate-600 pt-3.5 border-t border-slate-200">
              {business.footer_message || 'Thank you for shopping with us! Please visit again.'}
            </div>
          </div>
      ) : (
        /* Thermal Format */
        <div
          id="modal-printable-invoice"
          data-format={format}
          className={`bg-white p-3 sm:p-4 text-slate-950 font-mono text-[11px] space-y-2 border border-slate-200 shadow-md ${
            format === 'thermal-80' ? 'w-[300px]' : 'w-[250px]'
          }`}
        >
          <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-slate-300">
            <h2 className="font-black text-sm">{business.name}</h2>
            {business.address && <p className="text-[10px] text-slate-600">{business.address}</p>}
            {business.phone && <p className="text-[10px] text-slate-600">Ph: {business.phone}</p>}
            {business.gstin && <p className="text-[10px] font-bold">GSTIN: {business.gstin}</p>}
            <div className="text-[10px] font-bold mt-1">
              Inv #{sale.invoice_number} • {new Date(sale.created_at).toLocaleDateString('en-IN')}
            </div>
          </div>

          <div className="space-y-1 py-1 border-b border-dashed border-slate-300">
            {sale.items.map((item, i) => (
              <div key={i} className="flex justify-between items-start text-[10.5px]">
                <div className="flex-1 pr-1 truncate">
                  {item.product_name} x {item.quantity}
                </div>
                <div className="font-bold">{formatINR(item.total_amount)}</div>
              </div>
            ))}
          </div>

          <div className="space-y-1 pt-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatINR(sale.subtotal)}</span>
            </div>
            {sale.discount_total > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Disc:</span>
                <span>-{formatINR(sale.discount_total)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-400">
              <span>TOTAL:</span>
              <span>{formatINR(sale.grand_total)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>Mode:</span>
              <span className="uppercase">{sale.payment_method}</span>
            </div>
          </div>

          {/* Dynamic UPI QR inside Thermal */}
          {qrDataUrl && activeUpi && (
            <div className="flex flex-col items-center py-1 border-t border-dashed border-slate-300">
              <img src={qrDataUrl} alt="UPI QR" className="w-24 h-24" />
              <div className="text-[9px] font-bold text-slate-700 mt-1">{activeUpi.label || 'Scan to Pay'}</div>
              <div className="text-[8px] font-mono text-slate-500">{activeUpi.upi_id}</div>
            </div>
          )}

          <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-dashed border-slate-300">
            {business.footer_message || 'Thank you! Visit again.'}
          </div>
        </div>
      )}
    </div>
  );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          isPostSaleSuccess ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-black text-slate-900">
                  {sale.status === 'draft' || sale.invoice_number.startsWith('EST-')
                    ? 'Estimate / Quotation Created!'
                    : 'Sale Completed Successfully!'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white uppercase shadow-2xs">
                  {sale.status === 'draft' || sale.invoice_number.startsWith('EST-')
                    ? 'Quotation'
                    : sale.balance_due && sale.balance_due > 0
                    ? 'Credit Sale'
                    : 'Paid in Full'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-700" />
              <span>
                {sale.status === 'draft' || sale.invoice_number.startsWith('EST-')
                  ? 'Estimate & Quotation'
                  : 'Tax Invoice & Receipt'}
              </span>
            </div>
          )
        }
        description={`${sale.status === 'draft' || sale.invoice_number.startsWith('EST-') ? 'Estimate' : 'Invoice'} #${sale.invoice_number} • ${sale.customer_name || 'Cash Customer'}`}
        size="xl"
      >
        <div className="space-y-3.5">
          {/* Success / Notification Toast */}
          {shareSuccessMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{shareSuccessMsg}</span>
            </div>
          )}

          {/* ---------------- POST-SALE CELEBRATION & ACTIONS ---------------- */}
          {isPostSaleSuccess && (
            <>
              {/* Top Celebration & Amount Summary Card */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="text-[10.5px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <span>Total Amount Billed</span>
                    <span className="font-mono bg-emerald-200/80 text-emerald-950 px-1.5 py-0.2 rounded font-bold">
                      #{sale.invoice_number}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {formatINR(sale.grand_total)}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                    <span>Customer: <b className="text-slate-900">{sale.customer_name || 'Cash Customer'}</b></span>
                    {sale.customer_phone && <span className="font-mono text-slate-500">({sale.customer_phone})</span>}
                    <span className="text-slate-300">•</span>
                    <span>Payment: <b className="uppercase text-slate-800 font-bold">{sale.payment_method}</b></span>
                  </div>
                  {sale.balance_due && sale.balance_due > 0 ? (
                    <div className="text-xs font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md inline-block mt-1">
                      ⚠️ ₹{formatINR(sale.balance_due)} recorded in Customer Udhar Khata
                    </div>
                  ) : null}
                </div>

                {/* + New Bill Action Button */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Button
                    size="lg"
                    onClick={() => {
                      if (onNewBill) {
                        onNewBill();
                      } else {
                        onClose();
                      }
                    }}
                    className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm gap-2 rounded-xl h-11 px-5 shadow-sm cursor-pointer border border-amber-400 active:scale-95 transition"
                    title="Finish current bill and start a new order immediately"
                  >
                    <Receipt className="w-4 h-4 text-slate-950" />
                    <span>+ New Bill</span>
                  </Button>
                </div>
              </div>

              {/* Main Actions Panel: Direct WhatsApp Dispatch + Print & PDF Options */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xs">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Dispatch &amp; Receipt Actions
                </div>

                {/* WhatsApp Direct Send Row with Official Logo */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-2 px-2 py-0.5 shrink-0">
                    <WhatsAppLogo className="w-5 h-5" />
                    <span className="text-xs font-black text-emerald-950 whitespace-nowrap">WhatsApp Bill:</span>
                  </div>

                  <div className="flex-1 flex items-center gap-1.5">
                    <div className="flex-1 flex items-center bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500">
                      <Phone className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
                      <input
                        type="tel"
                        placeholder="Customer 10-digit WhatsApp number..."
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        className="w-full text-xs font-mono font-bold text-slate-900 bg-transparent outline-none placeholder:text-slate-400"
                      />
                    </div>

                    <Button
                      size="sm"
                      onClick={handleWhatsAppSend}
                      disabled={isGeneratingPdf || isSendingWhatsApp}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black gap-1.5 rounded-lg h-9 px-3.5 shadow-xs cursor-pointer active:scale-95 shrink-0"
                    >
                      {isSendingWhatsApp ? (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <span>Send WhatsApp</span>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Print & PDF Action Buttons Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="text-xs font-bold gap-1.5 rounded-xl h-10 text-slate-800 hover:bg-slate-100 border-slate-300 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-4 h-4 text-slate-700" />
                    <span>Print Receipt</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBluetoothEscPosPrint}
                    disabled={isBluetoothPrinting}
                    className="text-xs font-bold gap-1.5 rounded-xl h-10 text-sky-800 bg-sky-50/60 border-sky-200 hover:bg-sky-100 cursor-pointer shadow-2xs"
                    title="Direct Thermal Bluetooth POS Printing"
                  >
                    <Bluetooth className="w-4 h-4 text-sky-600" />
                    <span>Bluetooth Print</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="text-xs font-bold gap-1.5 rounded-xl h-10 bg-slate-900 text-white hover:bg-slate-800 border-slate-900 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>{isGeneratingPdf ? 'Saving...' : 'Download PDF'}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-xs font-bold gap-1.5 rounded-xl h-10 text-slate-700 hover:bg-slate-50 border-slate-300 cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-4 h-4 text-amber-600" />
                    <span>Edit Bill</span>
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ---------------- REGULAR INVOICE MODE HEADER ---------------- */}
          {!isPostSaleSuccess && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
              {/* Format Tabs & Zoom View Modes */}
              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    onClick={() => setFormat('a4')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      format === 'a4'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    A4 Bill
                  </button>
                  <button
                    onClick={() => setFormat('thermal-80')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      format === 'thermal-80'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    80mm Thermal
                  </button>
                  <button
                    onClick={() => setFormat('thermal-58')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      format === 'thermal-58'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    58mm
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 justify-end">
                {/* Pharmacy Rx Mode Toggle Pill */}
                {business?.business_type === 'pharmacy' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPro) {
                        setIsUpgradeModalOpen(true);
                      } else {
                        setIsPharmacyRxEnabled(!isPharmacyRxEnabled);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer h-8 ${
                      isPharmacyRxEnabled && isPro
                        ? 'bg-sky-50 text-sky-900 border-sky-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title={!isPro ? 'Pharmacy Prescription Rx Bill (Pro Feature)' : 'Toggle Pharmacy Prescription Rx & Drug License Details on Bill'}
                  >
                    <span>💊 Rx Bill:</span>
                    {!isPro ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shadow-2xs">
                        <Lock className="w-2.5 h-2.5" /> PRO
                      </span>
                    ) : (
                      <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black ${isPharmacyRxEnabled ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {isPharmacyRxEnabled ? 'ON' : 'OFF'}
                      </span>
                    )}
                  </button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs font-bold gap-1 rounded-xl h-8 text-slate-700 hover:bg-slate-50 border-slate-300 cursor-pointer"
                  title="Edit past invoice items or payment"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Edit</span>
                </Button>

                <Link href="/invoice-designer">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold gap-1 rounded-xl h-8 text-slate-700 hover:bg-slate-50 border-slate-300 cursor-pointer"
                    title="Customize Invoice Theme & Colors"
                  >
                    <Palette className="w-3.5 h-3.5 text-purple-600" />
                    <span className="hidden sm:inline">Theme</span>
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBluetoothEscPosPrint}
                  disabled={isBluetoothPrinting}
                  className="text-xs font-bold gap-1 rounded-xl h-8 text-sky-800 bg-sky-50 border-sky-200 hover:bg-sky-100 cursor-pointer"
                  title="Direct Bluetooth POS Printing"
                >
                  <Bluetooth className="w-3.5 h-3.5 text-sky-600" />
                  <span className="hidden sm:inline">BT</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="text-xs font-bold gap-1 rounded-xl h-8 text-slate-800 hover:bg-slate-50 border-slate-300 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="text-xs font-bold gap-1 rounded-xl h-8 bg-slate-900 text-white hover:bg-slate-800 border-slate-900 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isGeneratingPdf ? 'Saving...' : 'PDF'}</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleWhatsAppSend}
                  disabled={isGeneratingPdf || isSendingWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black gap-1.5 rounded-xl h-8 shadow-sm cursor-pointer"
                  title="Send official bill silently via Meta WhatsApp Cloud API"
                >
                  {isSendingWhatsApp ? (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <WhatsAppLogo className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ---------------- COLLAPSIBLE PDF / INVOICE PREVIEW DROPDOWN ---------------- */}
          {isPostSaleSuccess ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200">
              <div
                onClick={() => setIsPdfPreviewExpanded(!isPdfPreviewExpanded)}
                className="p-3 sm:p-3.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100/90 transition select-none bg-slate-50"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-slate-700" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {isPdfPreviewExpanded ? 'Tax Invoice & Print Preview' : 'View Full Invoice PDF & Receipt'}
                    </h4>
                    <p className="text-[10.5px] text-slate-500">
                      {isPdfPreviewExpanded ? 'A4, 80mm & 58mm canvas layout' : 'Click to inspect itemized breakdown, tax details & themes'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
                    {isPdfPreviewExpanded ? 'Hide Preview' : 'Show PDF Preview'}
                  </span>
                  {isPdfPreviewExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-700" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-700" />
                  )}
                </div>
              </div>

              {/* Expanded Dropdown Content */}
              {isPdfPreviewExpanded && (
                <div className="p-3 sm:p-4 border-t border-slate-200 space-y-3 animate-in fade-in">
                  {/* Format Tabs inside dropdown */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        onClick={() => setFormat('a4')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          format === 'a4'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        A4 Bill
                      </button>
                      <button
                        onClick={() => setFormat('thermal-80')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          format === 'thermal-80'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        80mm Thermal
                      </button>
                      <button
                        onClick={() => setFormat('thermal-58')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          format === 'thermal-58'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        58mm
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link href="/invoice-designer">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs font-bold gap-1 rounded-xl h-8 text-slate-700 hover:bg-slate-50 border-slate-300 cursor-pointer"
                          title="Customize Invoice Theme & Colors"
                        >
                          <Palette className="w-3.5 h-3.5 text-purple-600" />
                          <span>Theme</span>
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Printable Invoice Container */}
                  <div 
                    ref={previewContainerRef}
                    className="bg-slate-100/70 p-2 sm:p-5 rounded-2xl border border-slate-200/80 max-h-[52vh] overflow-auto shadow-inner flex flex-col items-center"
                  >
                    {renderPrintableCanvas()}
                  </div>
                </div>
              )}

              {/* Hidden copy mounted in DOM when collapsed so PDF generation and WhatsApp dispatch always find element */}
              {!isPdfPreviewExpanded && (
                <div className="hidden" aria-hidden="true">
                  {renderPrintableCanvas()}
                </div>
              )}
            </div>
          ) : (
            /* Non-Success Regular Preview Canvas (Directly Visible) */
            <div 
              ref={previewContainerRef}
              className="bg-slate-100/70 p-2 sm:p-5 rounded-2xl border border-slate-200/80 max-h-[62vh] overflow-auto shadow-inner flex flex-col items-center"
            >
              {renderPrintableCanvas()}
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Invoice Submodal */}
      <EditInvoiceModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        sale={sale}
        onSaved={handleInvoiceSaved}
      />

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />
    </>
  );
}
