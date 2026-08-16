'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  InvoiceThemeConfig, 
  InvoiceThemeId, 
  Business, 
  Sale, 
  CartItem 
} from '@/types';
import { 
  INVOICE_THEME_PRESETS, 
  DEFAULT_INVOICE_THEME_CONFIG, 
  COLOR_SWATCHES 
} from '@/lib/invoices/themeDefaults';
import { formatINR, generateUPILink } from '@/lib/utils';
import { 
  downloadInvoicePdfFromElement, 
  shareInvoicePdfDirect 
} from '@/lib/invoices/pdfGenerator';
import QRCode from 'qrcode';
import { 
  Palette, 
  CheckCircle2, 
  Save, 
  Share2, 
  Download, 
  Printer, 
  Sparkles, 
  Store, 
  FileText, 
  QrCode, 
  Eye, 
  ShieldCheck, 
  MessageCircle,
  HelpCircle,
  Undo2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function InvoiceDesignerPage() {
  const business = useLiveQuery(async () => db.businesses.toCollection().first());

  const [config, setConfig] = useState<InvoiceThemeConfig>(DEFAULT_INVOICE_THEME_CONFIG);
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

      // Generate Sample UPI QR Code
      const upiLink = generateUPILink(
        business.upi_id || 'merchant@upi',
        business.name || 'Store',
        88500, // Rs. 885.00
        'INV-SAMPLE'
      );
      QRCode.toDataURL(upiLink, { width: 140, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
        .then(setSampleQrUrl)
        .catch(() => setSampleQrUrl(''));
    }
  }, [business]);

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
      await db.businesses.update(business.id, {
        invoice_theme_config: config,
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
    { name: 'Tata Salt Vacuum Evaporated (1kg)', hsn: '2501', qty: 3, mrp: 3000, price: 2800, gst: 0, total: 8400 },
  ];

  const subtotalPaise = sampleItems.reduce((acc, i) => acc + i.total, 0); // 88400 paise = Rs. 884.00
  const gstPaise = Math.round(subtotalPaise * 0.05); // Rs. 44.20
  const grandTotalPaise = subtotalPaise + gstPaise; // Rs. 928.20
  const totalMrpPaise = sampleItems.reduce((acc, i) => acc + i.mrp * i.qty, 0); // Rs. 980.00
  const totalSavingsPaise = totalMrpPaise - subtotalPaise; // Rs. 96.00

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
              Custom PDF & WhatsApp Invoice Templates
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Invoice Themes & Design • बिल डिज़ाइन
          </h1>
          <p className="text-xs text-slate-500">
            Choose your brand colors, layout, tax headers, and UPI QR codes. Selected template applies automatically to WhatsApp shares and PDF prints.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSamplePdf}
            disabled={isExporting}
            className="text-xs font-bold gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample PDF</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-1.5 px-4 shadow-sm"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Template Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Template</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ---------------- MAIN DESIGNER LAYOUT (2 COLUMNS) ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CUSTOMIZATION CONTROLS (7 Cols on Desktop) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-5">
          {/* STEP 1: PRESET THEMES SELECTION */}
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">1</span>
                <span>Select Invoice Theme (थीम चुनें)</span>
              </h2>
              <span className="text-[11px] text-slate-500 font-semibold">{INVOICE_THEME_PRESETS.length} Themes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {INVOICE_THEME_PRESETS.map((preset) => {
                const isSelected = config.theme_id === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50 shadow-sm ring-2 ring-slate-900/10'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {/* Top Color Accent Strip */}
                    <div
                      className="h-2 w-full rounded-t -mt-3 -mx-3 mb-2.5 px-3"
                      style={{ backgroundColor: preset.primaryColor }}
                    />

                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold text-slate-900 truncate">
                          {preset.name}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-slate-900 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {preset.hindiName}
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-slate-200 text-slate-800">
                        {preset.badge}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300"
                          style={{ backgroundColor: preset.primaryColor }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* STEP 2: ACCENT COLOR SELECTION */}
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-3 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">2</span>
              <span>Brand Accent Color (थीम का रंग)</span>
            </h2>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {COLOR_SWATCHES.map((color) => {
                const isSelected = config.primary_color.toLowerCase() === color.hex.toLowerCase();
                return (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, primary_color: color.hex }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-100 font-bold shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20 flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span>{color.label}</span>
                  </button>
                );
              })}

              {/* Custom Hex Picker */}
              <div className="flex items-center gap-1.5 pl-2">
                <span className="text-xs text-slate-400 font-mono">Custom:</span>
                <input
                  type="color"
                  value={config.primary_color}
                  onChange={(e) => setConfig((prev) => ({ ...prev, primary_color: e.target.value }))}
                  className="w-8 h-8 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                />
              </div>
            </div>
          </Card>

          {/* STEP 3: HEADER, BRANDING & TITLE */}
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">3</span>
              <span>Header & Branding Toggles (हेडर विकल्प)</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'show_logo', label: 'Show Store Logo', desc: 'Display business logo at top left' },
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

          {/* STEP 4: FOOTER TERMS & CONDITIONS */}
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-3 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">4</span>
              <span>Terms & Footer Note (नियम व शर्तें)</span>
            </h2>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={config.custom_terms || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, custom_terms: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  placeholder="e.g. 1. Goods once sold will be replaced within 7 days. 2. Subject to Mumbai jurisdiction."
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
        {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW (6 Cols on Desktop) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 sticky top-20 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Eye className="w-4 h-4 text-slate-700" />
              <span>Live Interactive Preview (रियल-टाइम प्रिव्यू)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">A4 High-Res Format</span>
          </div>

          {/* INVOICE PREVIEW CONTAINER */}
          <div className="bg-slate-200/80 p-3 sm:p-5 rounded-2xl border border-slate-300 max-h-[85vh] overflow-y-auto flex justify-center shadow-inner">
            <div
              id="preview-live-invoice"
              className="bg-white border rounded-xl w-full max-w-lg p-5 sm:p-6 space-y-4 text-slate-900 shadow-md text-xs"
              style={{ borderColor: config.primary_color }}
            >
              {/* THEME HEADER BANNER */}
              <div
                className="p-3.5 rounded-lg text-white flex justify-between items-start gap-3"
                style={{ backgroundColor: config.primary_color }}
              >
                <div className="flex items-start gap-3">
                  {config.show_logo && business?.logo_url && (
                    <img
                      src={business.logo_url}
                      alt="Logo"
                      className="w-12 h-12 rounded object-contain bg-white p-0.5 flex-shrink-0"
                    />
                  )}
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight text-white leading-tight">
                      {business?.name || 'Mahadev Super Mart'}
                    </h3>
                    {config.show_tagline && (
                      <p className="text-[10px] text-white/80 italic mt-0.5">
                        {business?.tagline || 'Complete Kirana & FMCG Store'}
                      </p>
                    )}
                    {config.show_owner && (
                      <div className="text-[10px] text-white/90 mt-1">
                        <span>{business?.owner_name || 'Ramesh Patel'}</span> • <span>{business?.phone || '9876543210'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-white/20 text-white font-black text-[11px] tracking-wider uppercase">
                    {config.custom_title || 'TAX INVOICE'}
                  </span>
                  <div className="text-[10px] text-white/80 font-mono mt-1">
                    #INV-SAMPLE-01
                  </div>
                  <div className="text-[10px] text-white/70">
                    {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* BILLED TO & PAYMENT SUMMARY ROW */}
              <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Billed To:</span>
                  <div className="font-bold text-slate-900 mt-0.5">Sunil Verma</div>
                  <div className="text-slate-500 font-mono text-[10px]">+91 98234 56789</div>
                  <div className="text-slate-500 text-[10px]">Shop 4, Market Road</div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Payment Mode:</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300">
                    PAID (UPI)
                  </span>
                  {config.show_mrp_savings && (
                    <div className="text-[10px] text-emerald-700 font-bold mt-1">
                      You Saved: {formatINR(totalSavingsPaise)}
                    </div>
                  )}
                </div>
              </div>

              {/* ITEMS TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr
                      className="border-b-2 text-white font-bold"
                      style={{ backgroundColor: config.primary_color }}
                    >
                      <th className="py-1.5 px-2 rounded-l">Item Description</th>
                      {config.show_hsn_code && <th className="py-1.5 px-1.5 text-center">HSN</th>}
                      <th className="py-1.5 px-1.5 text-center">Qty</th>
                      <th className="py-1.5 px-1.5 text-right">Price</th>
                      {config.show_gst_breakup && <th className="py-1.5 px-1.5 text-center">GST</th>}
                      <th className="py-1.5 px-2 text-right rounded-r">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {sampleItems.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-1.5 px-2 text-slate-900 font-semibold">{item.name}</td>
                        {config.show_hsn_code && <td className="py-1.5 px-1.5 text-center text-slate-400 font-mono">{item.hsn}</td>}
                        <td className="py-1.5 px-1.5 text-center font-bold">{item.qty}</td>
                        <td className="py-1.5 px-1.5 text-right font-mono text-slate-600">{formatINR(item.price)}</td>
                        {config.show_gst_breakup && <td className="py-1.5 px-1.5 text-center text-slate-500 font-bold">{item.gst}%</td>}
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">{formatINR(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TOTALS & UPI QR CODE ROW */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-12 gap-3 items-end">
                {/* Left: Dynamic UPI QR Code */}
                <div className="col-span-7 space-y-1">
                  {config.show_upi_qr && (
                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                      {sampleQrUrl ? (
                        <img
                          src={sampleQrUrl}
                          alt="UPI QR"
                          className="w-14 h-14 object-contain rounded border border-slate-300 p-0.5 bg-white flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-slate-200 rounded flex items-center justify-center text-[9px] font-bold text-slate-500">
                          UPI QR
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] font-black text-slate-900 flex items-center gap-1">
                          <QrCode className="w-3 h-3 text-emerald-700" />
                          <span>Scan & Pay with UPI</span>
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                          {business?.upi_id || '9876543210@upi'}
                        </div>
                        <div className="text-[8px] text-slate-400">Zero transaction charges</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Subtotal, GST, Grand Total */}
                <div className="col-span-5 space-y-1 text-right text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">{formatINR(subtotalPaise)}</span>
                  </div>
                  {config.show_gst_breakup && (
                    <div className="flex justify-between text-slate-600">
                      <span>GST (CGST+SGST):</span>
                      <span className="font-mono font-semibold">{formatINR(gstPaise)}</span>
                    </div>
                  )}
                  <div
                    className="flex justify-between font-black text-xs pt-1 border-t text-white p-1 rounded"
                    style={{ backgroundColor: config.primary_color }}
                  >
                    <span>Grand Total:</span>
                    <span className="font-mono">{formatINR(grandTotalPaise)}</span>
                  </div>
                </div>
              </div>

              {/* FOOTER & TERMS & SIGNATURE */}
              <div className="pt-3 border-t border-slate-200 flex items-end justify-between gap-4 text-[10px]">
                <div className="space-y-1 flex-1">
                  {config.show_terms && (
                    <div>
                      <span className="font-bold text-slate-700 block">Terms & Conditions:</span>
                      <p className="text-slate-500 text-[9px] whitespace-pre-line leading-tight">
                        {config.custom_terms || 'Goods once sold will not be returned after 7 days.'}
                      </p>
                    </div>
                  )}
                  <p className="text-slate-400 italic text-[9px]">
                    {config.custom_footer || 'Thank you for your business! Please visit again.'}
                  </p>
                </div>

                {config.show_signature && (
                  <div className="text-center w-28 flex-shrink-0">
                    <div className="h-8 border-b border-dashed border-slate-400 mb-1" />
                    <span className="text-[9px] font-bold text-slate-700 block uppercase">
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
