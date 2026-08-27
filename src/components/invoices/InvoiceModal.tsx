'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Business, Sale, CartItem, UpiAccount } from '@/types';
import { formatINR, generateUPILink } from '@/lib/utils';
import { calculateGstSummary, numberToWordsINR } from '@/lib/invoices/gstCalculator';
import { sendInvoiceViaWhatsApp, generateWhatsAppInvoiceMessage, sendInvoiceViaOfficialCloudApi } from '@/lib/invoices/whatsappInvoice';
import { usePlatformPromoConfig } from '@/lib/firebase/remoteConfig';
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
  Edit3,
  Lock
} from 'lucide-react';
import { downloadInvoicePdfFromElement, shareInvoicePdfDirect, generateInvoicePdfBlobFromElement } from '@/lib/invoices/pdfGenerator';
import { bluetoothPrinter } from '@/lib/hardware/bluetoothPrinter';
import { Bluetooth, Zap } from 'lucide-react';
import { EditInvoiceModal } from '@/components/invoices/EditInvoiceModal';
import { DEFAULT_INVOICE_THEME_CONFIG } from '@/lib/invoices/themeDefaults';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

export type InvoiceFormat = 'thermal-58' | 'thermal-80' | 'a4';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  business?: Business | null;
  format?: 'a4' | 'thermal-80' | 'thermal-58';
  initialPhone?: string;
  onInvoiceUpdated?: (updatedSale: Sale) => void;
}

export function InvoiceModal({
  isOpen,
  onClose,
  sale: initialSale,
  business,
  format: initialFormat = 'a4',
  initialPhone = '',
  onInvoiceUpdated,
}: InvoiceModalProps) {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const [format, setFormat] = useState<InvoiceFormat>(initialFormat);
  const [sale, setSale] = useState<Sale | null>(initialSale);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>(initialPhone);
  const [showPhoneInput, setShowPhoneInput] = useState<boolean>(!initialPhone);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);
  const [shareSuccessMsg, setShareSuccessMsg] = useState<string>('');
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedUpiIndex, setSelectedUpiIndex] = useState<number>(0);
  
  // Pharmacy Prescription Bill Mode Toggle (Pro Feature)
  const [isPharmacyRxEnabled, setIsPharmacyRxEnabled] = useState<boolean>(false);

  // Responsive Mobile & Desktop Preview View Mode ('fit' vs 'full')
  const [viewMode, setViewMode] = useState<'fit' | 'full'>('fit');
  const previewContainerRef = React.useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState<number>(1);

  const platformPromo = usePlatformPromoConfig();

  useEffect(() => {
    const calculateScale = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.clientWidth - 20;
        const targetWidth = format === 'a4' ? 660 : format === 'thermal-80' ? 320 : 260;
        if (containerWidth < targetWidth && viewMode === 'fit') {
          setScaleFactor(Math.max(0.42, containerWidth / targetWidth));
        } else {
          setScaleFactor(1);
        }
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [format, viewMode, isOpen]);

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
      setRecipientPhone(sale.customer_phone || '');
      setShowPhoneInput(!sale.customer_phone);

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
          .catch(() => setQrDataUrl(''));
      }
    } else {
      if (sale) {
        setRecipientPhone(sale.customer_phone || '');
        setShowPhoneInput(!sale.customer_phone);
      }
      setQrDataUrl('');
    }
  }, [isOpen, sale, business, selectedUpiIndex, activeUpi]);

  if (!sale || !business) return null;

  const isExclusive = business.gst_pricing_mode === 'exclusive' || (business.business_type === 'restaurant' && business.gst_pricing_mode !== 'inclusive');
  const gstBreakup = calculateGstSummary(sale.items, false, isExclusive);

  // Ensure Subtotal + Total GST = Grand Total (handles legacy invoices where subtotal was saved equal to grand total)
  const displaySubtotal = (sale.subtotal === sale.grand_total && sale.tax_total > 0)
    ? Math.max(0, sale.grand_total - sale.tax_total)
    : sale.subtotal;

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
      // Wait for unscaled layout repaint
      await new Promise((r) => setTimeout(r, 60));
      const targetEl = document.getElementById('modal-printable-invoice') || el;
      await downloadInvoicePdfFromElement(targetEl, sale.invoice_number);
    } catch (err) {
      console.error('PDF download error:', err);
      window.print();
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
      setShowPhoneInput(true);
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
        setShareSuccessMsg(`✅ Official WhatsApp invoice delivered silently to +${targetPhone.replace(/\D/g, '')}!`);
        setTimeout(() => setShareSuccessMsg(''), 5000);
      } else {
        if (res.fallbackUrl) {
          setShareSuccessMsg(`ℹ️ Opening WhatsApp fallback chat (${res.error || 'Direct link'})...`);
          setTimeout(() => setShareSuccessMsg(''), 4000);
          window.open(res.fallbackUrl, '_blank');
        } else {
          sendInvoiceViaWhatsApp(targetPhone, sale, business);
        }
      }
    } catch (err: any) {
      console.error('WhatsApp send error:', err);
      sendInvoiceViaWhatsApp(targetPhone, sale, business);
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
          {/* Top Bar: Segmented Format Switch + Clean Action Cluster */}
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

              {/* Responsive Zoom View Mode Pill */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setViewMode('fit')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'fit'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Auto-fit complete invoice onto screen (Zero horizontal scroll)"
                >
                  <span>📱 Fit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('full')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'full'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="100% full-resolution actual size view"
                >
                  <span>🔍 100%</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 justify-end">
              {/* Pharmacy Rx Mode Toggle Pill (Pharmacy stores only) */}
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
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </>
                )}
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

          {/* WhatsApp Recipient Phone Input (Clean neutral single bar) */}
          {showPhoneInput && (
            <div className="flex items-center gap-2 p-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl">
              <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <input
                type="tel"
                placeholder="Customer WhatsApp number (e.g. 9876543210)..."
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="flex-1 text-xs bg-transparent border-0 text-slate-900 font-mono font-medium focus:outline-none placeholder:text-slate-400"
              />
              <button
                onClick={handleWhatsAppSend}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg whitespace-nowrap cursor-pointer shadow-xs"
              >
                Send
              </button>
            </div>
          )}

          {/* Printable Invoice Container (Clean Slate Canvas with Smooth Responsive Scaling) */}
          <div 
            ref={previewContainerRef}
            className="bg-slate-100/70 p-2 sm:p-5 rounded-2xl border border-slate-200/80 max-h-[62vh] overflow-auto shadow-inner flex flex-col items-center"
          >
            <div 
              style={
                scaleFactor < 1 && viewMode === 'fit'
                  ? {
                      transform: `scale(${scaleFactor})`,
                      transformOrigin: 'top center',
                      width: format === 'a4' ? '680px' : format === 'thermal-80' ? '320px' : '260px',
                      marginBottom: `-${Math.round((1 - scaleFactor) * (format === 'a4' ? 950 : 600))}px`,
                    }
                  : {
                      width: format === 'a4' ? '100%' : 'auto',
                    }
              }
              className="transition-all duration-150 flex justify-center"
            >
              {format === 'a4' ? (
                /* A4 Format with Dynamic Theme Config (Solid Full Paper Canvas) */
                <div
                  id="modal-printable-invoice"
                  data-format="a4"
                  className="w-full min-w-[620px] max-w-[680px] mx-auto bg-white p-5 sm:p-6 pb-6 rounded-xl text-slate-900 text-xs space-y-4 border border-slate-200 shadow-md box-border"
                  style={{ fontFamily: "'Mukta', 'Noto Sans Devanagari', 'Nirmala UI', 'Inter', system-ui, sans-serif" }}
                >
                {/* Header Banner Styled with Theme Color */}
                <div 
                  className="p-4 rounded-xl text-white flex justify-between items-start gap-4"
                  style={{ backgroundColor: (business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).primary_color }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {(business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).show_logo && business.logo_url && (
                      <img
                        src={business.logo_url}
                        alt="Logo"
                        className="w-12 h-12 rounded object-contain bg-white p-0.5 flex-shrink-0"
                      />
                    )}
                    <div>
                      <h2 className="text-xl font-black text-white leading-tight">{business.name}</h2>
                      {(business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).show_tagline && business.tagline && (
                        <p className="text-[11px] text-white/80 italic mt-0.5">{business.tagline}</p>
                      )}
                      <p className="text-[11px] text-white/90 mt-1 max-w-xs">{business.address}</p>
                      {(business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).show_owner && (
                        <p className="text-[11px] text-white/90">
                          {business.owner_name ? `Owner: ${business.owner_name} • ` : ''}Phone: {business.phone}
                        </p>
                      )}
                      {business.gstin && (
                        <p className="text-[11px] font-bold text-amber-300">GSTIN: {business.gstin}</p>
                      )}
                      {business.fssai_license_no && (
                        <p className="text-[10.5px] font-mono text-emerald-200">FSSAI Lic: {business.fssai_license_no}</p>
                      )}
                      {/* Pharmacy Drug License Details (Pro only & only when valid DL exists) */}
                      {isPharmacyRxEnabled && isPro && (business.drug_license_no || business.invoice_theme_config?.drug_license_no) && (
                        <div className="mt-1 pt-1 border-t border-white/20 text-[10px] font-mono text-cyan-200">
                          <span>D.L. No: {business.drug_license_no || business.invoice_theme_config?.drug_license_no}</span>
                          {(business.pharmacist_reg_no || business.invoice_theme_config?.pharmacist_reg_no) && (
                            <span className="ml-2">• Reg: {business.pharmacist_reg_no || business.invoice_theme_config?.pharmacist_reg_no}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="inline-block px-3 py-1 bg-white/20 rounded-lg text-xs font-black uppercase text-white tracking-wider">
                      {sale.status === 'returned'
                        ? 'SALES RETURN / CREDIT NOTE'
                        : isPharmacyRxEnabled && isPro
                        ? 'PHARMACY CASH / CREDIT MEMO'
                        : (business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).custom_title || 'TAX INVOICE'}
                    </span>
                    <p className="text-sm font-black font-mono mt-1 text-white">#{sale.invoice_number}</p>
                    <p className="text-[11px] text-white/80 mt-0.5">{saleDateFormatted}</p>
                    {sale.status === 'returned' && (
                      <div className="mt-1">
                        <span className="px-2 py-0.5 bg-rose-600 text-white font-black text-[9px] rounded uppercase tracking-wider shadow-xs">
                          RETURNED / CANCELLED
                        </span>
                      </div>
                    )}
                    {sale.status === 'partial_return' && (
                      <div className="mt-1">
                        <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[9px] rounded uppercase tracking-wider shadow-xs">
                          PARTIAL RETURN (-{formatINR(sale.returned_amount || 0)})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Specialized Doctor & Patient Rx Box (Pharmacy Mode - Pro Only) */}
                {isPharmacyRxEnabled && isPro ? (
                  <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl text-[11px] text-sky-950 grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xl font-black text-sky-700 font-serif leading-none mt-0.5">℞</span>
                      <div>
                        <span className="font-bold text-slate-500 uppercase text-[9.5px] block">Prescribed By Doctor:</span>
                        <p className="font-extrabold text-slate-900 text-xs mt-0.5">
                          {sale.doctor_name || 'Dr. Registered Medical Practitioner (MBBS)'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-500 uppercase text-[9.5px] block">Patient Details &amp; Contact:</span>
                      <p className="font-extrabold text-slate-900 text-xs mt-0.5">
                        {sale.patient_name || sale.customer_name || 'Walk-in Cash Patient'}
                      </p>
                      {sale.customer_phone && <p className="text-[10px] text-slate-600 font-mono">Ph: {sale.customer_phone}</p>}
                    </div>
                  </div>
                ) : (
                  /* Standard Bill To Info */
                  <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[10px]">Billed To:</span>
                      <p className="font-bold text-slate-900 text-xs mt-0.5">{sale.customer_name || 'Cash Customer'}</p>
                      {sale.customer_phone && <p className="text-slate-600 font-mono">Phone: {sale.customer_phone}</p>}
                      {sale.customer_address && <p className="text-slate-600">{sale.customer_address}</p>}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-500 uppercase text-[10px]">Payment Details:</span>
                      <p className="font-bold uppercase text-xs mt-0.5">{sale.payment_method}</p>
                      <p className="font-semibold text-emerald-700">Status: {sale.payment_status.toUpperCase()}</p>
                      {(business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).show_mrp_savings && sale.discount_total > 0 && (
                        <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                          Saved: {formatINR(sale.discount_total)}
                        </p>
                      )}
                    </div>

                    {/* Niche Order Details (Restaurant Table, Token) */}
                    {(sale.table_no || sale.order_type || sale.token_number) && (
                      <div className="col-span-2 pt-2 border-t border-slate-200 flex flex-wrap items-center gap-3 text-[10px] text-slate-700 font-medium">
                        {sale.token_number && (
                          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono font-bold">
                            Token #{sale.token_number}
                          </span>
                        )}
                        {sale.order_type && (
                          <span>
                            Order: <b className="uppercase">{sale.order_type.replace('_', '-')}</b>
                          </span>
                        )}
                        {sale.table_no && (
                          <span>
                            Table: <b>{sale.table_no}</b>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse table-auto">
                    <thead>
                      <tr 
                        className="text-white font-bold uppercase text-[10px]"
                        style={{ backgroundColor: (business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).primary_color }}
                      >
                        <th className="py-2 px-2 text-center w-7 rounded-l">#</th>
                        <th className="py-2 px-2.5">Item Name</th>
                        {(business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).show_hsn_code && (
                          <th className="py-2 px-2 text-center w-14">HSN</th>
                        )}
                        <th className="py-2 px-2 text-right w-20">Price</th>
                        <th className="py-2 px-2 text-center w-16">Qty</th>
                        {(business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).show_gst_breakup && (
                          <th className="py-2 px-2 text-center w-12">GST</th>
                        )}
                        <th className="py-2 px-2 text-right w-14">Disc</th>
                        <th className="py-2 px-2.5 text-right w-24 rounded-r">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {sale.items.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 font-bold text-slate-900 leading-snug">
                            <div>{item.product_name}</div>
                            {/* Niche Item Metadata */}
                            <div className="flex flex-wrap gap-1 mt-0.5 text-[9.5px] font-normal text-slate-500 font-mono">
                              {item.batch_number && <span>B:{item.batch_number}</span>}
                              {item.expiry_date && <span>Exp:{item.expiry_date}</span>}
                              {item.size && <span>Size:{item.size}</span>}
                              {item.color && <span>• {item.color}</span>}
                              {item.imei_serial && <span>SN:{item.imei_serial}</span>}
                              {item.warranty_period_months && <span>• {item.warranty_period_months}M War</span>}
                            </div>
                          </td>
                          {(business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).show_hsn_code && (
                            <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[11px]">—</td>
                          )}
                          <td className="py-1.5 px-2 text-right font-medium text-slate-700 tabular-nums">{formatINR(item.unit_price)}</td>
                          <td className="py-1.5 px-2 text-center font-bold text-slate-900 tabular-nums">{item.quantity} {item.unit}</td>
                          {(business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).show_gst_breakup && (
                            <td className="py-1.5 px-2 text-center text-slate-500 font-semibold text-[11px]">{item.tax_rate || 0}%</td>
                          )}
                          <td className="py-1.5 px-2 text-right font-medium text-slate-500 tabular-nums">{item.discount_amount ? formatINR(item.discount_amount) : '—'}</td>
                          <td className="py-1.5 px-2.5 text-right font-bold text-slate-900 tabular-nums">{formatINR(item.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals & QR Section */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t-2 border-slate-800">
                  <div>
                    {(business.invoice_theme_config?.show_upi_qr ?? true) && qrDataUrl && activeUpi && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <img src={qrDataUrl} alt="UPI QR" className="w-20 h-20 border border-slate-200 rounded p-1 bg-white" />
                          <div className="text-[10px] text-slate-600">
                            <p className="font-bold text-slate-900 flex items-center gap-1">
                              <QrCode className="w-3 h-3 text-emerald-700" />
                              <span>{activeUpi.label || 'Scan & Pay via UPI'}</span>
                            </p>
                            <p className="font-mono text-slate-800 font-bold mt-0.5">{activeUpi.upi_id}</p>
                            <p className="text-[9px] text-slate-400">Zero transaction charges</p>
                          </div>
                        </div>

                        {/* Multiple UPI Account Switcher Chips (Hidden during printing) */}
                        {business.upi_ids && business.upi_ids.length > 1 && (
                          <div className="flex items-center gap-1 pt-1 print:hidden">
                            <span className="text-[8px] font-bold text-slate-400 uppercase">QR:</span>
                            {business.upi_ids.map((u, i) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => setSelectedUpiIndex(i)}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all ${
                                  selectedUpiIndex === i
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                }`}
                              >
                                {u.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 italic mt-2">Amount in words: {amountWords}</p>
                  </div>

                  <div className="space-y-1.5 text-right text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-slate-800 tabular-nums">{formatINR(displaySubtotal)}</span>
                    </div>
                    {sale.discount_total > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Total Discount:</span>
                        <span className="font-semibold text-emerald-700 tabular-nums">-{formatINR(sale.discount_total)}</span>
                      </div>
                    )}
                    {sale.tax_total > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Total GST:</span>
                        <span className="font-semibold text-slate-800 tabular-nums">{formatINR(sale.tax_total)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-300">
                      <span>Grand Total:</span>
                      <span className="font-black text-slate-950 tabular-nums">{formatINR(sale.grand_total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 pt-1">
                      <span>Amount Received:</span>
                      <span className="font-bold text-slate-900 tabular-nums">{formatINR(sale.amount_received)}</span>
                    </div>
                    {sale.balance_due > 0 && (
                      <div className="flex justify-between text-xs font-bold text-rose-700">
                        <span>Balance Due (Udhar):</span>
                        <span className="font-bold text-rose-700 tabular-nums">{formatINR(sale.balance_due)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Platform Advertisement Banner (Free Tier Only) */}
                {!isPro && (!business.subscription_tier || business.subscription_tier === 'free') && platformPromo.enabled && (
                  <div 
                    className="p-2.5 rounded-lg text-white flex items-center justify-between gap-2 shadow-xs"
                    style={{ backgroundColor: (business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).primary_color }}
                  >
                    <div>
                      <div className="font-black text-xs leading-tight flex items-center gap-1.5">
                        <span>{platformPromo.title}</span>
                        {platformPromo.subtitle && (
                          <span className="text-[9px] font-normal opacity-85">• {platformPromo.subtitle}</span>
                        )}
                      </div>
                      <div className="text-[9.5px] text-white/90 mt-0.5">
                        {platformPromo.desc}
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-white/20 text-[9px] font-black uppercase tracking-wider flex-shrink-0">
                      {platformPromo.badge}
                    </span>
                  </div>
                )}

                {/* Schedule H Prescription Warning Banner (Pharmacy Mode) */}
                {isPharmacyRxEnabled && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[9.5px] text-rose-900 font-bold text-center flex items-center justify-center gap-1.5">
                    <span>⚠️</span>
                    <span>SCHEDULE H PRESCRIPTION DRUG WARNING: To be sold by retail on the prescription of a Registered Medical Practitioner only.</span>
                  </div>
                )}

                {/* Footer terms */}
                <div className="pt-3 pb-1 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-0.5">
                  <p>{(business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).custom_terms || business.terms_conditions || 'Thank you for your business!'}</p>
                  <p className="text-slate-400">{(business.invoice_theme_config || DEFAULT_INVOICE_THEME_CONFIG).custom_footer || business.footer_message || 'Powered by Kamai+ Digital POS'}</p>
                </div>
              </div>
            ) : (
              /* Thermal Format (58mm or 80mm) */
              <div
                id="modal-printable-invoice"
                className={`bg-white p-4 text-slate-900 text-xs space-y-2 border border-slate-300 ${
                  format === 'thermal-80' ? 'w-[320px]' : 'w-[260px]'
                }`}
                style={{ fontFamily: "'Mukta', 'Noto Sans Devanagari', 'Nirmala UI', 'Inter', system-ui, sans-serif" }}
              >
                <div className="text-center pb-2 border-b border-dashed border-slate-300">
                  <h3 className="font-black text-base tracking-tight leading-tight">{business.name}</h3>
                  <p className="text-[10px] text-slate-600">{business.address}</p>
                  <p className="text-[10px] text-slate-600">Ph: {business.phone}</p>
                  {business.gstin && <p className="text-[9px] font-bold">GSTIN: {business.gstin}</p>}
                  {isPharmacyRxEnabled && isPro && (business.drug_license_no || business.invoice_theme_config?.drug_license_no) && (
                    <p className="text-[9px] font-bold text-slate-700">
                      D.L. No: {business.drug_license_no || business.invoice_theme_config?.drug_license_no}
                    </p>
                  )}
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

                  {/* Niche Order Details in Thermal Header */}
                  {(sale.token_number || sale.table_no || sale.order_type) && (
                    <div className="flex justify-between pt-0.5 font-bold">
                      {sale.token_number && <span>Token #{sale.token_number}</span>}
                      {sale.table_no && <span>Table: {sale.table_no}</span>}
                      {sale.order_type && <span className="uppercase">{sale.order_type.replace('_', '-')}</span>}
                    </div>
                  )}

                  {(isPharmacyRxEnabled || sale.doctor_name || sale.patient_name) && (
                    <div className="flex justify-between pt-0.5 text-[9.5px] font-bold text-slate-800">
                      <span>℞ Dr: {sale.doctor_name || 'RMP'}</span>
                      <span>Pt: {sale.patient_name || sale.customer_name || 'Cash'}</span>
                    </div>
                  )}

                  {sale.status === 'returned' && (
                    <div className="text-center font-bold text-rose-700 pt-1 text-[10px]">
                      *** RETURNED / CANCELLED ***
                    </div>
                  )}
                  {sale.status === 'partial_return' && (
                    <div className="text-center font-bold text-amber-800 pt-1 text-[10px]">
                      *** PARTIAL RETURN (-{formatINR(sale.returned_amount || 0)}) ***
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-1 text-[11px] py-1 border-b border-dashed border-slate-300">
                  {sale.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between gap-1">
                        <span className="leading-snug flex-1">{item.product_name} <span className="text-slate-500 font-mono font-semibold">x{item.quantity}</span></span>
                        <span className="font-bold font-mono text-right flex-shrink-0">{formatINR(item.total_amount)}</span>
                      </div>
                      {(item.batch_number || item.expiry_date || item.size || item.color || item.imei_serial) && (
                        <div className="text-[9px] text-slate-500 flex flex-wrap gap-1">
                          {item.batch_number && <span>B:{item.batch_number}</span>}
                          {item.expiry_date && <span>Exp:{item.expiry_date}</span>}
                          {item.size && <span>Sz:{item.size}</span>}
                          {item.color && <span>{item.color}</span>}
                          {item.imei_serial && <span>SN:{item.imei_serial}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Schedule H warning in Thermal (Pro Only) */}
                {isPharmacyRxEnabled && isPro && (
                  <div className="text-[8.5px] text-center font-bold text-slate-700 py-0.5 border-b border-dashed border-slate-300">
                    *** SCHEDULE H PRESCRIPTION DRUG ***
                  </div>
                )}

                {/* Totals */}
                <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-300 leading-relaxed">
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-mono">{formatINR(displaySubtotal)}</span>
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
                {qrDataUrl && activeUpi && (
                  <div className="flex flex-col items-center py-1">
                    <img src={qrDataUrl} alt="UPI QR" className="w-24 h-24" />
                    <div className="text-[9px] font-bold text-slate-700 mt-1">{activeUpi.label || 'Scan to Pay via UPI'}</div>
                    <div className="text-[8px] font-mono text-slate-500">{activeUpi.upi_id}</div>
                  </div>
                )}

                <div className="text-center text-[10px] text-slate-500 pt-1">
                  {business.footer_message || 'Thank you! Visit again.'}
                </div>

                {!isPro && (!business.subscription_tier || business.subscription_tier === 'free') && (
                  <div className="text-center text-[8.5px] text-slate-400 pt-1 border-t border-dashed border-slate-200">
                    Billed via KamaiPlus POS • kamaiplus.proventure.in
                  </div>
                )}
              </div>
            )}
            </div>
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

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />
    </>
  );
};
