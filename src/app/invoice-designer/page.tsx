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
  DEFAULT_INVOICE_THEME_CONFIG,
  FREE_INVOICE_THEME_CONFIG,
  getDefaultThemeForCategory
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
  Check,
  Save, 
  Download, 
  Sparkles, 
  QrCode, 
  Eye, 
  ShieldCheck, 
  Plus,
  Trash2,
  Megaphone,
  CreditCard,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useProSubscription, ProFeatureBadge } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

export default function InvoiceDesignerPage() {
  const { isPro, requirePro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
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
      const catDefaults = getDefaultThemeForCategory(business.business_type);
      if (!isPro) {
        // Free user: category default theme + free default headers
        setConfig({
          ...FREE_INVOICE_THEME_CONFIG,
          theme_id: catDefaults.theme_id,
          primary_color: catDefaults.primary_color,
          ...(business.invoice_theme_config ? {
            show_logo: business.invoice_theme_config.show_logo ?? true,
            show_tagline: business.invoice_theme_config.show_tagline ?? true,
            show_owner: business.invoice_theme_config.show_owner ?? true,
            show_upi_qr: business.invoice_theme_config.show_upi_qr ?? true,
            show_signature: business.invoice_theme_config.show_signature ?? true,
          } : {})
        });
      } else {
        if (business.invoice_theme_config) {
          setConfig({
            ...DEFAULT_INVOICE_THEME_CONFIG,
            ...business.invoice_theme_config,
          });
        } else {
          setConfig({
            ...DEFAULT_INVOICE_THEME_CONFIG,
            theme_id: catDefaults.theme_id,
            primary_color: catDefaults.primary_color,
          });
        }
      }

      const initialUpiList: UpiAccount[] = business.upi_ids && business.upi_ids.length > 0
        ? business.upi_ids
        : business.upi_id
        ? [{ id: 'upi_def', label: 'Primary Shop QR', upi_id: business.upi_id, is_default: true }]
        : [{ id: 'upi_def', label: 'Primary Shop QR', upi_id: 'merchant@upi', is_default: true }];

      setUpiList(initialUpiList);
    }
  }, [business, isPro]);

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
    if (!isPro) {
      setIsUpgradeModalOpen(true);
      return;
    }
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
    <div className="space-y-3.5 pb-10">
      {/* ---------------- HEADER BAR (Single Row Compact) ---------------- */}
      <div className="bg-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate">
            <Palette className="w-4 h-4 text-amber-700 shrink-0" />
            <h1 className="text-sm xs:text-base sm:text-lg font-black text-slate-900 truncate">
              Invoice Themes &amp; Design
            </h1>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 truncate">
            Custom PDF styling, A4 &amp; 80mm thermal themes, and store brand colors
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSamplePdf}
            disabled={isExporting}
            className="text-xs font-bold gap-1 px-2.5 py-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isExporting ? 'Generating...' : 'Sample PDF'}</span>
            <span className="sm:hidden">PDF</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            className={`font-black text-xs gap-1 px-3 py-1.5 shadow-2xs transition-all cursor-pointer ${
              isSaved
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ---------------- MAIN DESIGNER LAYOUT (2 COLUMNS) ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CUSTOMIZATION CONTROLS (6 Cols on Desktop) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-3.5">
          {/* STEP 1: SELECT INVOICE THEME & COLOR */}
          <Card className="p-3 sm:p-4 bg-white border border-slate-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">1</span>
                <span>Select Invoice Theme &amp; Color</span>
                {!isPro && <ProFeatureBadge />}
              </h2>
              <span className="text-[11px] font-bold text-slate-700 font-mono">
                {INVOICE_THEME_PRESETS.find(p => p.id === config.theme_id)?.name || 'Custom Theme'}
              </span>
            </div>

            {!isPro && (
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Lock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                  <span className="truncate text-[11px]">Default <strong>{business?.business_type?.toUpperCase() || 'STORE'}</strong> theme active.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] hover:bg-amber-500 cursor-pointer flex-shrink-0 shadow-2xs"
                >
                  Unlock Pro
                </button>
              </div>
            )}

            {/* Circular Color Swatches (No Text Bloat) */}
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              {INVOICE_THEME_PRESETS.map((preset) => {
                const isSelected = config.theme_id === preset.id || config.primary_color.toLowerCase() === preset.primaryColor.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    title={`${preset.name} (${preset.primaryColor})`}
                    onClick={() => {
                      if (!isPro) {
                        setIsUpgradeModalOpen(true);
                      } else {
                        handleSelectPreset(preset.id);
                      }
                    }}
                    className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-2xs border-2 ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 border-white'
                        : 'border-white hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: preset.primaryColor }}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-white drop-shadow-xs stroke-[3]" />
                    )}
                    {!isPro && !isSelected && (
                      <Lock className="w-3 h-3 text-white/70" />
                    )}
                  </button>
                );
              })}

              {/* Custom Hex Color Picker */}
              <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200">
                <input
                  type="color"
                  value={config.primary_color}
                  disabled={!isPro}
                  onClick={() => {
                    if (!isPro) setIsUpgradeModalOpen(true);
                  }}
                  onChange={(e) => {
                    if (!isPro) {
                      setIsUpgradeModalOpen(true);
                    } else {
                      setConfig((prev) => ({ ...prev, primary_color: e.target.value }));
                    }
                  }}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white shadow-2xs p-0.5 bg-white cursor-pointer ${
                    !isPro ? 'cursor-not-allowed opacity-60' : ''
                  }`}
                  title="Pick custom color"
                />
              </div>
            </div>
          </Card>

          {/* STEP 2: HEADER & INVOICE DISPLAY OPTIONS (Space-Saving & High-Density) */}
          <Card className="p-3 sm:p-4 bg-white border border-slate-200 space-y-2.5 shadow-2xs">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">2</span>
              <span>Header &amp; Invoice Display Options</span>
            </h2>

            <div className="space-y-2.5">
              {/* Custom Title Selector (2x2 Grid) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Invoice Document Heading</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {['TAX INVOICE', 'RETAIL INVOICE', 'CASH MEMO', 'ESTIMATE / BILL'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, custom_title: t }))}
                      className={`px-2 py-1.5 rounded-lg border text-[10.5px] font-black text-center transition-all cursor-pointer truncate ${
                        config.custom_title === t
                          ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* High-Density Toggle Switches (2x2 Grid) */}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                {[
                  { id: 'show_logo', label: 'Show Store Logo', isProOnly: false },
                  { id: 'show_tagline', label: 'Show Tagline', isProOnly: false },
                  { id: 'show_owner', label: 'Show Owner & Phone', isProOnly: false },
                  { id: 'show_upi_qr', label: 'Show Dynamic UPI QR', isProOnly: false },
                  { id: 'show_signature', label: 'Authorised Signatory', isProOnly: false },
                  { id: 'show_gst_breakup', label: 'Show GST Tax Breakup', isProOnly: true },
                  { id: 'show_hsn_code', label: 'Show HSN/SAC Code', isProOnly: true },
                  { id: 'show_mrp_savings', label: 'Show MRP Savings Badge', isProOnly: true },
                  { id: 'show_terms', label: 'Show Terms & Conditions', isProOnly: true },
                  { id: 'show_pharmacy_rx', label: '💊 Pharmacy Rx & D.L.', isProOnly: true },
                ].map((toggle) => {
                  const isChecked = Boolean(config[toggle.id as keyof InvoiceThemeConfig]);
                  const isLocked = toggle.isProOnly && !isPro;

                  return (
                    <div
                      key={toggle.id}
                      onClick={() => {
                        if (isLocked) {
                          setIsUpgradeModalOpen(true);
                          return;
                        }
                        setConfig((prev) => ({
                          ...prev,
                          [toggle.id]: !isChecked,
                        }));
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2 text-xs ${
                        isLocked
                          ? 'border-slate-200 bg-slate-50/70 opacity-80 hover:border-amber-300'
                          : isChecked
                          ? 'border-emerald-400 bg-emerald-50/60'
                          : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-0 cursor-pointer shrink-0"
                        />
                        <span className="font-bold text-slate-800 truncate text-[11px]">{toggle.label}</span>
                      </div>

                      {toggle.isProOnly && !isPro && (
                        <span className="px-1 py-0.2 rounded text-[8px] font-black bg-amber-400 text-slate-950 shadow-2xs flex-shrink-0 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" />
                          <span>PRO</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pharmacy Specific Inputs if show_pharmacy_rx enabled (Pro Users) */}
              {config.show_pharmacy_rx && isPro && (
                <div className="p-2.5 bg-sky-50/70 rounded-xl border border-sky-200 space-y-2 mt-1 animate-in fade-in">
                  <div className="text-xs font-bold text-sky-950 flex items-center gap-1">
                    <span>💊</span>
                    <span>Pharmacy Drug License &amp; Chemist Information</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Drug License (D.L.) No</label>
                      <input
                        type="text"
                        placeholder="e.g. DL-20B/21B-44910"
                        value={config.drug_license_no || ''}
                        onChange={(e) => setConfig((prev) => ({ ...prev, drug_license_no: e.target.value }))}
                        className="w-full p-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Registered Pharmacist No</label>
                      <input
                        type="text"
                        placeholder="e.g. PH-109281"
                        value={config.pharmacist_reg_no || ''}
                        onChange={(e) => setConfig((prev) => ({ ...prev, pharmacist_reg_no: e.target.value }))}
                        className="w-full p-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pharmacy Drug License Pro Lock for Free Users */}
              {!isPro && (
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 mt-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <span>💊</span>
                    <span className="font-bold text-[11px]">Pharmacy Drug License</span>
                    <ProFeatureBadge />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-500 cursor-pointer shadow-2xs"
                  >
                    Unlock Pro
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* STEP 3: PLATFORM BRANDING (Minimal Text) */}
          <Card className="p-3 sm:p-3.5 bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">3</span>
                <Megaphone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-slate-900 truncate">Platform Branding</span>
              </div>
              <span className="text-[9.5px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0 font-mono">
                {business?.subscription_tier === 'pro' || business?.subscription_tier === 'enterprise' ? 'Pro (White-Label)' : 'Free Tier'}
              </span>
            </div>

            <div className="p-2 bg-amber-50/60 border border-amber-200/70 rounded-lg text-xs mt-2 flex items-center justify-between gap-2">
              <div className="text-[11px] text-amber-950 font-medium truncate flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                <span>
                  {business?.subscription_tier === 'pro' || business?.subscription_tier === 'enterprise' 
                    ? 'White-Label Active (Ads hidden on customer invoices)' 
                    : 'Free Tier includes footer promotion strip'}
                </span>
              </div>
              {!isPro && (
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-slate-950 hover:bg-amber-500 cursor-pointer shrink-0"
                >
                  Remove Ads
                </button>
              )}
            </div>
          </Card>

          {/* STEP 4: FOOTER TERMS & CONDITIONS (Minimal Text) */}
          <Card className="p-3 sm:p-3.5 bg-white border border-slate-200 space-y-2.5 shadow-2xs">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">4</span>
              <span>Terms &amp; Footer Note</span>
            </h2>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Terms &amp; Conditions</label>
                <input
                  type="text"
                  value={config.custom_terms || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, custom_terms: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 font-medium"
                  placeholder="e.g. 1. Goods replaced within 7 days. 2. Subject to local jurisdiction."
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-0.5">Footer Thank You Note</label>
                <input
                  type="text"
                  value={config.custom_footer || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, custom_footer: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 font-medium"
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

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />
    </div>
  );
}
