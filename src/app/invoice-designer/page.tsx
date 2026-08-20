'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  InvoiceThemeConfig, 
  InvoiceThemeId, 
  Business, 
  UpiAccount 
} from '@/types';
import { 
  INVOICE_THEME_PRESETS, 
  DEFAULT_INVOICE_THEME_CONFIG 
} from '@/lib/invoices/themeDefaults';
import { formatINR, generateUPILink } from '@/lib/utils';
import { 
  downloadInvoicePdfFromElement, 
  shareInvoicePdfDirect 
} from '@/lib/invoices/pdfGenerator';
import { usePlatformPromoConfig } from '@/lib/firebase/remoteConfig';
import QRCode from 'qrcode';
import { 
  Palette,
  CheckCircle2, 
  Save, 
  Download, 
  Sparkles, 
  QrCode, 
  Eye, 
  ShieldCheck, 
  Plus,
  Trash2,
  Megaphone,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function InvoiceDesignerPage() {
  const business = useLiveQuery(async () => db.businesses.toCollection().first());

  const [config, setConfig] = useState<InvoiceThemeConfig>(DEFAULT_INVOICE_THEME_CONFIG);
  const [upiList, setUpiList] = useState<UpiAccount[]>([]);
  const [selectedUpiIndex, setSelectedUpiIndex] = useState<number>(0);

  const platformPromo = usePlatformPromoConfig();

  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [sampleQrUrl, setSampleQrUrl] = useState<string>('');

  // Initialize from business config if saved
  useEffect(() => {
    if (business) {
      if (business.invoice_theme_config) {
        setConfig({
          ...DEFAULT_INVOICE_THEME_CONFIG,
          ...business.invoice_theme_config,
        });
      }

      const initialUpiList: UpiAccount[] = business.upi_ids && business.upi_ids.length > 0
        ? business.upi_ids
        : business.upi_id
        ? [{ id: 'upi_def', label: 'Primary Shop QR', upi_id: business.upi_id, is_default: true }]
        : [{ id: 'upi_def', label: 'Primary Shop QR', upi_id: 'merchant@upi', is_default: true }];

      setUpiList(initialUpiList);
    }
  }, [business]);

  // Update Sample QR when active UPI or config changes
  useEffect(() => {
    const activeUpi = upiList[selectedUpiIndex] || upiList[0];
    const upiString = activeUpi?.upi_id || business?.upi_id || 'merchant@upi';

    const upiLink = generateUPILink(
      upiString,
      business?.name || 'Store',
      88500, // Rs. 885.00
      'INV-SAMPLE'
    );
    QRCode.toDataURL(upiLink, { width: 140, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setSampleQrUrl)
      .catch(() => setSampleQrUrl(''));
  }, [selectedUpiIndex, upiList, business]);

  // Handle Preset Change
  const handleSelectPreset = (presetId: InvoiceThemeId) => {
    const preset = INVOICE_THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setConfig((prev) => ({
      ...prev,
      theme_id: presetId,
      primary_color: preset.primaryColor,
    }));
  };

  // Save Settings to Database
  const handleSave = async () => {
    if (!business) return;
    try {
      const primaryUpi = upiList.find((u) => u.is_default)?.upi_id || upiList[0]?.upi_id || business.upi_id;
      await db.businesses.update(business.id, {
        invoice_theme_config: config,
        upi_id: primaryUpi,
        upi_ids: upiList,
        terms_conditions: config.custom_terms || business.terms_conditions,
        footer_message: config.custom_footer || business.footer_message,
        updated_at: new Date().toISOString(),
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save invoice theme:', err);
      alert('Failed to save template configuration.');
    }
  };

  // Download Sample PDF
  const handleDownloadSamplePdf = async () => {
    const el = document.getElementById('preview-live-invoice');
    if (!el) return;
    setIsExporting(true);
    try {
      await downloadInvoicePdfFromElement(el, 'SAMPLE-TEMPLATE');
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Sample items for preview
  const sampleItems = [
    { name: 'Aashirvaad Shudh Chakki Atta (5kg)', hsn: '1101', qty: 2, mrp: 28000, price: 25500, gst: 5, total: 51000 },
    { name: 'Fortune Sunlite Sunflower Oil (1L)', hsn: '1512', qty: 2, mrp: 16500, price: 14500, gst: 5, total: 29000 },
    { name: 'Loose Basmati Rice Premium (1.5 kg)', hsn: '1006', qty: 1.5, mrp: 15000, price: 13000, gst: 0, total: 19500 },
  ];

  const subtotalPaise = sampleItems.reduce((acc, i) => acc + i.total, 0); // 99500 paise = Rs. 995.00
  const gstPaise = Math.round(subtotalPaise * 0.05); // Rs. 49.75
  const grandTotalPaise = subtotalPaise + gstPaise; // Rs. 1044.75
  const totalMrpPaise = sampleItems.reduce((acc, i) => acc + i.mrp * i.qty, 0);
  const totalSavingsPaise = totalMrpPaise - subtotalPaise;

  const activeUpi = upiList[selectedUpiIndex] || upiList[0];

  return (
    <div className="space-y-5 pb-10">
      {/* ---------------- HEADER BAR ---------------- */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-amber-700" />
              <span>Vyapar Style Designer</span>
            </span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Custom PDF, Multi-UPI &amp; Promo Banner Templates
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Invoice Themes &amp; Design
          </h1>
          <p className="text-xs text-slate-500">
            Choose your brand colors, layout, tax headers, multiple UPI QR codes, and bottom advertisement banner.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSamplePdf}
            disabled={isExporting}
            className="text-xs font-bold gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating PDF...' : 'Sample PDF'}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            className={`font-black text-xs gap-1.5 shadow-sm transition-all ${
              isSaved
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Saved Live!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Template</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ---------------- MAIN DESIGNER LAYOUT (2 COLUMNS) ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CUSTOMIZATION CONTROLS (6 Cols on Desktop) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-5">
          {/* STEP 1: SELECT INVOICE THEME & COLOR */}
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">1</span>
                <span>Select Invoice Theme &amp; Color</span>
              </h2>
              <span className="text-[11px] text-slate-500 font-semibold">{INVOICE_THEME_PRESETS.length} Options</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {INVOICE_THEME_PRESETS.map((preset) => {
                const isSelected = config.theme_id === preset.id || config.primary_color.toLowerCase() === preset.primaryColor.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20 flex-shrink-0"
                      style={{ backgroundColor: preset.primaryColor }}
                    />
                    <span>{preset.name}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                  </button>
                );
              })}

              {/* Custom Hex Color Picker */}
              <div className="flex items-center gap-1.5 pl-1">
                <span className="text-xs text-slate-400 font-mono">Custom:</span>
                <input
                  type="color"
                  value={config.primary_color}
                  onChange={(e) => setConfig((prev) => ({ ...prev, primary_color: e.target.value }))}
                  className="w-8 h-8 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                  title="Pick custom color"
                />
              </div>
            </div>
          </Card>

          {/* STEP 2: HEADER & INVOICE DISPLAY OPTIONS */}
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">2</span>
              <span>Header &amp; Invoice Display Options</span>
            </h2>

            <div className="space-y-3">
              {/* Custom Title Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Invoice Document Heading</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['TAX INVOICE', 'RETAIL INVOICE', 'CASH MEMO', 'ESTIMATE / BILL'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, custom_title: t }))}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold text-center transition-all ${
                        config.custom_title === t
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {[
                  { id: 'show_logo', label: 'Show Store Logo', desc: 'Display logo at top left' },
                  { id: 'show_tagline', label: 'Show Tagline', desc: 'Display store motto or category' },
                  { id: 'show_owner', label: 'Show Owner & Phone', desc: 'Display contact details in header' },
                  { id: 'show_upi_qr', label: 'Show Dynamic UPI QR', desc: 'Auto payment QR code for customers' },
                  { id: 'show_gst_breakup', label: 'Show GST Tax Breakup', desc: 'Itemized CGST/SGST breakdown' },
                  { id: 'show_hsn_code', label: 'Show HSN/SAC Code', desc: 'Print product HSN numbers' },
                  { id: 'show_mrp_savings', label: 'Show MRP Savings Badge', desc: 'Highlight customer discount saved' },
                  { id: 'show_signature', label: 'Authorised Signatory', desc: 'Seal / Signatory signature box' },
                ].map((toggle) => {
                  const isChecked = Boolean(config[toggle.id as keyof InvoiceThemeConfig]);
                  return (
                    <div
                      key={toggle.id}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          [toggle.id]: !isChecked,
                        }))
                      }
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="mt-0.5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{toggle.label}</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{toggle.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* STEP 3: PLATFORM BRANDING & PROMO BANNER (FREE PLAN) */}
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">3</span>
                <span className="flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-amber-600" />
                  <span>Platform Branding &amp; Promo Banner</span>
                </span>
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {business?.subscription_tier === 'pro' || business?.subscription_tier === 'enterprise' ? 'Pro (White-Label)' : 'Free Tier Active'}
              </span>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Free Plan Footer Promotion</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Invoices on the <strong>Free Tier</strong> include the KamaiPlus platform footer promotion strip.
                {business?.subscription_tier === 'pro' || business?.subscription_tier === 'enterprise' ? (
                  <span className="text-emerald-700 font-bold block mt-1">
                    ✅ Your account is Pro/Enterprise — White-label enabled (platform ads are hidden on your customer invoices).
                  </span>
                ) : (
                  <span className="text-slate-600 block mt-1">
                    Upgrade to <strong>Pro</strong> or <strong>Enterprise</strong> to remove platform branding and get 100% custom white-label invoices.
                  </span>
                )}
              </p>
            </div>
          </Card>

          {/* STEP 4: FOOTER TERMS & CONDITIONS */}
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-3 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">4</span>
              <span>Terms &amp; Footer Note</span>
            </h2>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Terms &amp; Conditions</label>
                <textarea
                  rows={2}
                  value={config.custom_terms || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, custom_terms: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  placeholder="e.g. 1. Goods once sold will be replaced within 7 days. 2. Subject to local jurisdiction."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Footer Thank You Note</label>
                <input
                  type="text"
                  value={config.custom_footer || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, custom_footer: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  placeholder="e.g. Thank you for your business! Please visit again."
                />
              </div>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW (Full Width Unclipped Canvas) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 sticky top-20 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Eye className="w-4 h-4 text-slate-700" />
              <span>Live Interactive Preview</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">A4 High-Res Format</span>
          </div>

          {/* INVOICE PREVIEW CONTAINER (Zero Scrollbars - 100% Visible Preview) */}
          <div className="bg-slate-100/90 p-2 sm:p-3 rounded-2xl border border-slate-300 shadow-inner flex justify-center overflow-hidden">
            <div
              id="preview-live-invoice"
              className="bg-white border rounded-xl w-full max-w-full p-3.5 sm:p-4 space-y-2.5 text-slate-900 shadow-md text-[11px] leading-normal box-border"
              style={{ borderColor: config.primary_color }}
            >
              {/* THEME HEADER BANNER */}
              <div
                className="p-3 rounded-xl text-white flex justify-between items-start gap-3"
                style={{ backgroundColor: config.primary_color }}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {config.show_logo && business?.logo_url && (
                    <img
                      src={business.logo_url}
                      alt="Logo"
                      className="w-10 h-10 rounded object-contain bg-white p-0.5 shrink-0"
                    />
                  )}
                  <div>
                    <h3 className="font-black text-base tracking-tight text-white leading-snug">
                      {business?.name || 'Mahadev Super Mart'}
                    </h3>
                    {config.show_tagline && (
                      <p className="text-[10px] text-white/80 italic mt-0.5 leading-normal">
                        {business?.tagline || 'Complete Kirana & FMCG Store'}
                      </p>
                    )}
                    {config.show_owner && (
                      <div className="text-[10px] text-white/90 mt-0.5 leading-normal">
                        <span>{business?.owner_name || 'Ramesh Patel'}</span> • <span>{business?.phone || '9876543210'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-white/20 text-white font-black text-[11px] tracking-wider uppercase">
                    {config.custom_title || 'TAX INVOICE'}
                  </span>
                  <div className="text-[11px] text-white font-mono font-bold mt-1">
                    #INV-SAMPLE-01
                  </div>
                  <div className="text-[10px] text-white/80 mt-0.5">
                    {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* BILLED TO & PAYMENT SUMMARY ROW */}
              <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10.5px]">
                <div className="space-y-0.5">
                  <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider block">Billed To:</span>
                  <div className="font-bold text-slate-900 text-xs">Sunil Verma</div>
                  <div className="text-slate-600 font-mono text-[10.5px]">+91 98234 56789</div>
                  <div className="text-slate-600 text-[10.5px]">Shop 4, Market Road</div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider block">Payment Details:</span>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded font-bold text-[10.5px] bg-emerald-100 text-emerald-900 border border-emerald-300">
                      PAID (UPI)
                    </span>
                  </div>
                  {config.show_mrp_savings && (
                    <div className="text-[10.5px] text-emerald-700 font-bold pt-0.5">
                      You Saved: {formatINR(totalSavingsPaise)}
                    </div>
                  )}
                </div>
              </div>

              {/* ITEMS TABLE */}
              <div className="overflow-hidden border border-slate-200 rounded-lg">
                <table className="w-full text-left text-[10.5px] border-collapse table-auto">
                  <thead>
                    <tr
                      className="text-white font-bold text-[10px] uppercase"
                      style={{ backgroundColor: config.primary_color }}
                    >
                      <th className="py-1.5 px-2.5 text-left">Item Description</th>
                      {config.show_hsn_code && <th className="py-1.5 px-1.5 text-center w-12">HSN</th>}
                      <th className="py-1.5 px-1.5 text-center w-10">Qty</th>
                      <th className="py-1.5 px-2 text-right w-16">Price</th>
                      {config.show_gst_breakup && <th className="py-1.5 px-1.5 text-center w-10">GST</th>}
                      <th className="py-1.5 px-2.5 text-right w-20">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {sampleItems.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-1.5 px-2.5 text-slate-900 font-semibold leading-normal align-middle">{item.name}</td>
                        {config.show_hsn_code && <td className="py-1.5 px-1.5 text-center text-slate-400 font-mono text-[10px] leading-normal align-middle">{item.hsn}</td>}
                        <td className="py-1.5 px-1.5 text-center font-bold text-slate-800 leading-normal align-middle">{item.qty}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-600 leading-normal align-middle">{formatINR(item.price)}</td>
                        {config.show_gst_breakup && <td className="py-1.5 px-1.5 text-center text-slate-500 font-bold leading-normal align-middle">{item.gst}%</td>}
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 leading-normal align-middle">{formatINR(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TOTALS & UPI QR CODE ROW */}
              <div className="pt-2 border-t-2 border-slate-200 grid grid-cols-12 gap-3 items-center">
                {/* Left: Dynamic UPI QR Code */}
                <div className="col-span-7">
                  {config.show_upi_qr && (
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                      {sampleQrUrl ? (
                        <img
                          src={sampleQrUrl}
                          alt="UPI QR"
                          className="w-12 h-12 object-contain rounded border border-slate-300 p-0.5 bg-white shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                          QR
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-black text-slate-900 leading-snug">
                          {activeUpi?.label || 'Scan & Pay via UPI'}
                        </div>
                        <div className="text-[10px] text-slate-700 font-mono font-bold truncate mt-0.5 leading-snug">
                          {activeUpi?.upi_id || business?.upi_id || 'merchant@upi'}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5 leading-snug">Zero transaction charges</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Subtotal, GST, Grand Total */}
                <div className="col-span-5 space-y-1 text-right text-[10.5px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">{formatINR(subtotalPaise)}</span>
                  </div>
                  {config.show_gst_breakup && (
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>GST (CGST+SGST):</span>
                      <span className="font-mono font-semibold">{formatINR(gstPaise)}</span>
                    </div>
                  )}
                  <div
                    className="flex justify-between items-center font-black text-xs p-2 rounded-lg text-white mt-0.5 shadow-xs"
                    style={{ backgroundColor: config.primary_color }}
                  >
                    <span>Grand Total:</span>
                    <span className="font-mono">{formatINR(grandTotalPaise)}</span>
                  </div>
                </div>
              </div>

              {/* BOTTOM PLATFORM ADVERTISEMENT BANNER (Shown on Free Tier) */}
              {(!business?.subscription_tier || business?.subscription_tier === 'free') && platformPromo.enabled && (
                <div 
                  className="p-2 sm:p-2.5 rounded-xl text-white flex items-center justify-between gap-2 shadow-xs"
                  style={{ backgroundColor: config.primary_color }}
                >
                  <div>
                    <div className="font-black text-[11px] leading-snug flex items-center gap-1.5">
                      <span>{platformPromo.title}</span>
                      {platformPromo.subtitle && (
                        <span className="text-[9.5px] font-normal opacity-90">• {platformPromo.subtitle}</span>
                      )}
                    </div>
                    <div className="text-[9.5px] text-white/90 mt-0.5 leading-normal">
                      {platformPromo.desc}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white/20 text-[9px] font-black uppercase tracking-wider shrink-0">
                    {platformPromo.badge}
                  </span>
                </div>
              )}

              {/* FOOTER & TERMS & SIGNATURE */}
              <div className="pt-2 pb-1 border-t border-slate-200 flex items-start justify-between gap-3 text-[10px]">
                <div className="space-y-1 flex-1 min-w-0">
                  {config.show_terms && (
                    <div>
                      <span className="font-bold text-slate-700 block text-[9.5px] uppercase tracking-wider mb-0.5">Terms &amp; Conditions:</span>
                      <p className="text-slate-500 text-[9px] whitespace-pre-line leading-relaxed">
                        {config.custom_terms || '1. All disputes subject to local jurisdiction.\n2. Interest @18% p.a. will be charged if bill is unpaid after 15 days.'}
                      </p>
                    </div>
                  )}
                  <p className="text-slate-400 italic text-[9.5px] leading-relaxed pt-0.5">
                    {config.custom_footer || 'Thank you for your business! Goods once sold can be exchanged within 7 days.'}
                  </p>
                </div>

                {config.show_signature && (
                  <div className="text-center w-24 shrink-0 self-end">
                    <div className="h-6 border-b border-dashed border-slate-400 mb-0.5" />
                    <span className="text-[8.5px] font-bold text-slate-700 block uppercase tracking-wider">
                      Authorised Signatory
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
