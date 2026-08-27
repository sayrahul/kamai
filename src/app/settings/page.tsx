'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import QRCode from 'qrcode';
import { generateUPILink, cn } from '@/lib/utils';
import { UpiAccount } from '@/types';
import Link from 'next/link';
import { 
  Settings, 
  Store, 
  CheckCircle2, 
  QrCode, 
  Receipt, 
  Building2, 
  Camera, 
  Trash2, 
  Palette, 
  HardDrive, 
  Plus, 
  Star, 
  Layers, 
  ChevronDown, 
  Printer,
  X,
  MessageCircle,
  Copy,
  Send,
  ExternalLink,
  ShieldCheck,
  Check,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { compressImageFile } from '@/lib/utils/imageCompressor';
import { uploadStoreLogoToStorage } from '@/lib/firebase/storage';
import { BusinessType } from '@/types';
import { getStoreProfile, getAllStoreProfiles } from '@/lib/constants/storeProfiles';
import { useProSubscription, ProFeatureBadge } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { Lock, Volume2, Sparkles } from 'lucide-react';
import { soundboxEngine, SoundboxLanguage } from '@/lib/payments/soundboxEngine';
import { paymentBridge } from '@/lib/payments/paymentBridge';
import { APP_VERSION, APP_RELEASE_DATE } from '@/lib/constants/version';
import { MerchantQRModal } from '@/components/paytm/MerchantQRModal';
import { NativeSoundboxStatusCard } from '@/components/payments/NativeSoundboxStatusCard';
import { PWAInstallSettingsCard } from '@/components/pwa/PWAInstallSettingsCard';

export default function SettingsPage() {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const business = useLiveQuery(async () => db.businesses.toCollection().first());

  // Form State
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('grocery');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstin, setGstin] = useState('');
  const [drugLicenseNo, setDrugLicenseNo] = useState('');
  const [pharmacistRegNo, setPharmacistRegNo] = useState('');
  const [fssaiLicenseNo, setFssaiLicenseNo] = useState('');
  
  // Multiple UPI Management State
  const [upiList, setUpiList] = useState<UpiAccount[]>([]);
  const [selectedPreviewUpiIndex, setSelectedPreviewUpiIndex] = useState<number>(0);
  const [newUpiLabel, setNewUpiLabel] = useState('');
  const [newUpiId, setNewUpiId] = useState('');

  // Banking
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');

  // Invoicing Preferences
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('1');
  const [gstPricingMode, setGstPricingMode] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [terms, setTerms] = useState('');
  const [footerMessage, setFooterMessage] = useState('');

  // Soundbox & Notification Bridge State
  const [soundboxLang, setSoundboxLang] = useState<SoundboxLanguage>(soundboxEngine.getLanguage());
  const [soundboxVol, setSoundboxVol] = useState<number>(soundboxEngine.getVolume());
  const [sampleSmsText, setSampleSmsText] = useState<string>(
    'Your a/c no. XX1234 is credited with INR 848.00 on 25-AUG-26 by a/c linked to UPI/423589123456/Rahul Sharma'
  );
  const [parsedSmsResult, setParsedSmsResult] = useState<any>(null);

  // UI state
  const [isSaved, setIsSaved] = useState(false);
  const [saveNotification, setSaveNotification] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [liveQrDataUrl, setLiveQrDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'profile' | 'upi' | 'invoicing' | 'whatsapp'>('upi');
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);

  // Meta WhatsApp Cloud API Testing State
  const [testWhatsAppPhone, setTestWhatsAppPhone] = useState<string>('');
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState<boolean>(false);
  const [testWhatsAppResult, setTestWhatsAppResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
  } | null>(null);
  const [hasCopiedWebhook, setHasCopiedWebhook] = useState(false);
  const [hasCopiedToken, setHasCopiedToken] = useState(false);

  const showSaveNotification = (title: string, description: string = 'All changes have been successfully saved to your offline database.') => {
    setSaveNotification({ title, description });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 3500);
    setTimeout(() => {
      setSaveNotification((prev) => (prev?.title === title ? null : prev));
    }, 4500);
  };

  // Load business data into form
  useEffect(() => {
    if (business) {
      setName(business.name || '');
      setBusinessType(business.business_type || 'grocery');
      setTagline(business.tagline || '');
      setLogoUrl(business.logo_url || '');
      setOwnerName(business.owner_name || '');
      setPhone(business.phone || '');
      setEmail(business.email || '');
      setAddress(business.address || '');
      setPincode(business.pincode || '');
      setGstin(business.gstin || '');
      setDrugLicenseNo(business.drug_license_no || '');
      setPharmacistRegNo(business.pharmacist_reg_no || '');
      setFssaiLicenseNo(business.fssai_license_no || '');
      
      const initialUpiList: UpiAccount[] = business.upi_ids && business.upi_ids.length > 0
        ? business.upi_ids
        : business.upi_id
        ? [{ id: 'upi_def', label: 'Shop Primary QR', upi_id: business.upi_id, is_default: true }]
        : [];

      setUpiList(initialUpiList);

      setBankName(business.bank_name || '');
      setBankAccountNo(business.bank_account_no || '');
      setBankIfsc(business.bank_ifsc || '');
      setBankAccountName(business.bank_account_name || '');
      setInvoicePrefix(business.invoice_prefix || 'INV-');
      setNextInvoiceNumber((business.next_invoice_number || 1).toString());
      setGstPricingMode(business.gst_pricing_mode || (business.business_type === 'restaurant' ? 'exclusive' : 'inclusive'));
      setTerms(business.terms_conditions || 'Goods once sold will not be returned after 3 days. Thank you for shopping with us!');
      setFooterMessage(business.footer_message || 'Thank you for your business! Please visit again.');
    }
  }, [business]);

  // Generate live UPI QR Code for the active preview selection
  useEffect(() => {
    const activeUpi = upiList[selectedPreviewUpiIndex] || upiList[0];
    const upiString = activeUpi?.upi_id;

    if (upiString && upiString.trim()) {
      const upiUrl = generateUPILink(upiString.trim(), name.trim() || 'Store');
      QRCode.toDataURL(upiUrl, {
        width: 220,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then(setLiveQrDataUrl)
        .catch(() => setLiveQrDataUrl(''));
    } else {
      setLiveQrDataUrl('');
    }
  }, [selectedPreviewUpiIndex, upiList, name]);

  // Logo Upload with In-Browser Compression & Cloud Storage
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. In-browser compression (Max 512x512, WebP, quality 0.82) -> typically reduces 4MB to ~30KB
      const { dataUrl } = await compressImageFile(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.82,
        mimeType: 'image/webp',
      });

      // Immediate responsive UI update
      setLogoUrl(dataUrl);

      if (business) {
        await db.businesses.update(business.id, {
          logo_url: dataUrl,
          updated_at: new Date().toISOString(),
        });
      }
      showSaveNotification(
        'Store Logo Uploaded & Saved!',
        'Your store logo has been updated and will appear on all bills and invoices.'
      );

      // 2. Cloud Storage upload
      try {
        const { url } = await uploadStoreLogoToStorage(file, business?.id || 'biz_default');
        setLogoUrl(url);
        if (business) {
          await db.businesses.update(business.id, {
            logo_url: url,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.log('Firebase Storage not configured or offline, using compressed image data:', err);
      }
    } catch (err) {
      console.error('Logo compression failed:', err);
      alert('Failed to process image. Please try another file.');
    }
  };

  const handleRemoveLogo = async () => {
    setLogoUrl('');
    if (business) {
      await db.businesses.update(business.id, {
        logo_url: undefined,
        updated_at: new Date().toISOString(),
      });
    }
    showSaveNotification('Store Logo Removed', 'Logo has been removed from invoices and store profile.');
  };

  // Add New UPI ID
  const handleAddUpiAccount = async () => {
    if (!isPro && upiList.length >= 1) {
      setIsUpgradeModalOpen(true);
      return;
    }
    if (!newUpiLabel.trim() || !newUpiId.trim()) {
      alert('Please enter both a Label (e.g. Counter 2) and a valid UPI ID (e.g. name@upi).');
      return;
    }
    const newEntry: UpiAccount = {
      id: `upi_${Date.now()}`,
      label: newUpiLabel.trim(),
      upi_id: newUpiId.trim(),
      is_default: upiList.length === 0,
    };
    const updatedList = [...upiList, newEntry];
    setUpiList(updatedList);
    setSelectedPreviewUpiIndex(upiList.length);
    setNewUpiLabel('');
    setNewUpiId('');

    if (business) {
      await db.businesses.update(business.id, {
        upi_ids: updatedList,
        upi_id: updatedList.find((u) => u.is_default)?.upi_id || updatedList[0]?.upi_id || '',
        updated_at: new Date().toISOString(),
      });
    }
    showSaveNotification(
      'New UPI Account Added & Saved!',
      `Added "${newEntry.label}" (${newEntry.upi_id}) to your counter QR list.`
    );
  };

  // Set Default UPI ID
  const handleSetDefaultUpi = async (id: string) => {
    const updated = upiList.map((u) => ({
      ...u,
      is_default: u.id === id,
    }));
    setUpiList(updated);
    const target = updated.find((u) => u.id === id);
    if (business) {
      await db.businesses.update(business.id, {
        upi_id: target?.upi_id || '',
        upi_ids: updated,
        updated_at: new Date().toISOString(),
      });
    }
    showSaveNotification(
      'Primary Counter UPI Changed',
      `"${target?.label || 'Selected QR'}" (${target?.upi_id}) is now set as the primary payment QR on POS.`
    );
  };

  // Delete UPI ID
  const handleDeleteUpi = async (id: string) => {
    if (upiList.length <= 1) {
      alert('You must keep at least one UPI address.');
      return;
    }
    const filtered = upiList.filter((u) => u.id !== id);
    if (filtered.length > 0 && !filtered.some((u) => u.is_default)) {
      filtered[0].is_default = true;
    }
    setUpiList(filtered);
    setSelectedPreviewUpiIndex(0);
    if (business) {
      await db.businesses.update(business.id, {
        upi_id: filtered.find((u) => u.is_default)?.upi_id || filtered[0]?.upi_id || '',
        upi_ids: filtered,
        updated_at: new Date().toISOString(),
      });
    }
    showSaveNotification(
      'UPI Address Removed',
      'The selected UPI address has been removed from store settings.'
    );
  };

  // Save Settings to IndexedDB
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    const primaryUpi = upiList.find((u) => u.is_default)?.upi_id || upiList[0]?.upi_id || '';

    await db.businesses.update(business.id, {
      name: name.trim(),
      business_type: businessType,
      tagline: tagline.trim(),
      logo_url: logoUrl || undefined,
      owner_name: ownerName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      pincode: pincode.trim() || undefined,
      gstin: gstin.trim() || undefined,
      drug_license_no: drugLicenseNo.trim() || undefined,
      pharmacist_reg_no: pharmacistRegNo.trim() || undefined,
      fssai_license_no: fssaiLicenseNo.trim() || undefined,
      upi_id: primaryUpi,
      upi_ids: upiList,
      bank_name: bankName.trim() || undefined,
      bank_account_no: bankAccountNo.trim() || undefined,
      bank_ifsc: bankIfsc.trim() || undefined,
      bank_account_name: bankAccountName.trim() || undefined,
      invoice_prefix: invoicePrefix.trim() || 'INV-',
      next_invoice_number: parseInt(nextInvoiceNumber) || 1,
      gst_pricing_mode: gstPricingMode,
      terms_conditions: terms.trim(),
      footer_message: footerMessage.trim(),
      updated_at: new Date().toISOString(),
    });

    showSaveNotification(
      'Settings Saved Successfully!',
      'All store details, UPI accounts, and invoice rules are saved and active across POS counters.'
    );
  };

  // Change GST Pricing Mode (Exclusive vs Inclusive)
  const handleGstPricingModeChange = async (mode: 'exclusive' | 'inclusive') => {
    setGstPricingMode(mode);
    if (business) {
      await db.businesses.update(business.id, {
        gst_pricing_mode: mode,
        updated_at: new Date().toISOString(),
      });
    }
    showSaveNotification(
      mode === 'exclusive' ? 'GST Mode: Added on Top (Exclusive)' : 'GST Mode: Included in Price (Inclusive)',
      mode === 'exclusive'
        ? 'Base menu prices used; GST is calculated and added on top of bill subtotal.'
        : 'MRP retail mode; selling prices already include GST taxes.'
    );
  };

  // Live Test Dispatcher for Meta WhatsApp Cloud API
  const handleTestWhatsAppInvoice = async () => {
    const targetPhone = testWhatsAppPhone || phone;
    if (!targetPhone || targetPhone.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number for test invoice delivery.');
      return;
    }

    setIsTestingWhatsApp(true);
    setTestWhatsAppResult(null);

    const sampleSale = {
      id: 'test_sample_invoice',
      business_id: business?.id || 'sample_business',
      invoice_number: `${invoicePrefix}TEST-99`,
      customer_name: 'Test Customer',
      customer_phone: targetPhone,
      items: [
        {
          id: 'item_1',
          product_name: 'Premium Basmati Rice (1kg)',
          quantity: 2,
          unit: 'kg' as any,
          unit_price: 12000,
          tax_rate: 5,
          discount_amount: 0,
          total_amount: 24000,
        },
        {
          id: 'item_2',
          product_name: 'Pure Desi Ghee (500ml)',
          quantity: 1,
          unit: 'pc' as any,
          unit_price: 34000,
          tax_rate: 12,
          discount_amount: 0,
          total_amount: 34000,
        },
      ],
      subtotal: 58000,
      tax_total: 3200,
      discount_total: 0,
      grand_total: 58000,
      amount_received: 58000,
      balance_due: 0,
      payment_method: 'upi' as any,
      payment_status: 'paid' as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/whatsapp/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetPhone,
          sale: sampleSale,
          business: business || {
            name: name || 'KamaiPlus Demo Store',
            phone: phone || '9876543210',
            address: address || 'Pune, Maharashtra',
            upi_id: upiList[0]?.upi_id || 'kamai@upi',
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestWhatsAppResult({
          success: true,
          message: `Official WhatsApp invoice dispatched silently to +${targetPhone.replace(/\D/g, '')}!`,
          messageId: data.messageId,
        });
        showSaveNotification(
          'WhatsApp Test Invoice Dispatched!',
          `Live test bill dispatched via Meta Cloud API to +${targetPhone.replace(/\D/g, '')}.`
        );
      } else {
        setTestWhatsAppResult({
          success: false,
          message: data.error || 'WhatsApp dispatch error. Check server logs or token.',
        });
      }
    } catch (err: any) {
      setTestWhatsAppResult({
        success: false,
        message: err.message || 'Failed to contact WhatsApp server.',
      });
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  const [isClearingData, setIsClearingData] = useState(false);

  const handleClearTestingData = async () => {
    if (!confirm('⚠️ Are you sure you want to clear all test sales, test customers, and test khata transactions? Your store profile and products catalog will remain completely safe.')) {
      return;
    }
    setIsClearingData(true);
    try {
      await db.sales.clear();
      await db.ledger_transactions.clear();
      await db.customers.clear();
      await db.suppliers.clear();
      await db.cash_registers.clear();
      await db.cash_expenses.clear();
      await db.sales_returns.clear();
      await db.inventory_movements.clear();
      
      if (business) {
        await db.businesses.update(business.id, {
          next_invoice_number: 1,
          updated_at: new Date().toISOString(),
        });
        setNextInvoiceNumber('1');
      }

      showSaveNotification(
        'Test Database Cleared Successfully',
        'All sample invoices, dummy debts, and test transactions have been wiped. Your store is clean and ready.'
      );
    } catch (err: any) {
      alert(`Failed to clear test data: ${err?.message}`);
    } finally {
      setIsClearingData(false);
    }
  };

  const activePreviewUpi = upiList[selectedPreviewUpiIndex] || upiList[0];

  return (
    <div className="space-y-3.5 pb-12 max-w-5xl mx-auto relative">
      {/* ---------------- FLOATING PROFESSIONAL SAVE / CHANGE CONFIRMATION TOAST ---------------- */}
      {saveNotification && (
        <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92vw] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto shadow-2xl">
          <div className="bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500/80 text-white rounded-2xl p-3.5 sm:p-4 shadow-emerald-950/60 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                  {saveNotification.title}
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 text-[9px] font-black uppercase tracking-wider">
                  ✓ DONE
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                {saveNotification.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSaveNotification(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0 ml-1"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ---------------- HEADER BAR (Single Row Compact) ---------------- */}
      <div className="bg-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate">
            <Settings className="w-4 h-4 text-slate-800 shrink-0" />
            <h1 className="text-sm xs:text-base sm:text-lg font-black text-slate-900 truncate">
              Store Profile &amp; Settings
            </h1>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 truncate">
            Store info, multiple dynamic UPI QR codes, bank accounts &amp; invoice sequence
          </p>
        </div>

        {isSaved ? (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold shrink-0 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Saved!</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/invoice-designer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-2xs transition-all"
            >
              <Palette className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden sm:inline">Invoice Themes</span>
              <span className="sm:hidden">Themes</span>
            </Link>

            <Link
              href="/cloud-backup"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-2xs transition-all"
            >
              <HardDrive className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden sm:inline">Backup &amp; Sync</span>
              <span className="sm:hidden">Backup</span>
            </Link>
          </div>
        )}
      </div>

      {/* ---------------- NAVIGATION TABS (Mobile Dropdown + Desktop Segmented) ---------------- */}
      {/* Mobile Tab Switcher Dropdown (Zero Horizontal Overflow) */}
      <div className="sm:hidden relative">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as any)}
          className="w-full appearance-none bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 text-xs font-black rounded-xl pl-3 pr-8 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
        >
          <option value="profile">🏪 Shop Profile &amp; Logo</option>
          <option value="upi">🔲 Multiple UPI QRs &amp; Banking</option>
          <option value="invoicing">🧾 Invoice Prefix &amp; Sequence</option>
          <option value="whatsapp">💬 Meta WhatsApp Cloud API</option>
        </select>
        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Desktop Navigation Tabs */}
      <div className="hidden sm:flex items-center gap-1.5 pb-0.5">
        {[
          { id: 'profile', label: 'Shop Profile & Logo', icon: Store },
          { id: 'upi', label: 'Multiple UPI QRs & Banking', icon: QrCode },
          { id: 'invoicing', label: 'Invoice Prefix & Sequence', icon: Receipt },
          { id: 'whatsapp', label: 'Meta WhatsApp Cloud API', icon: MessageCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shadow-2xs ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Store Profile & Logo */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Logo Upload Card */}
            <div className="lg:col-span-4">
              <Card className="p-4 bg-white border border-slate-200 flex flex-col items-center text-center space-y-3 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Store Logo
                </span>

                <div className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden group">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Store Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <Camera className="w-8 h-8 mx-auto mb-1 opacity-60" />
                      <span className="text-[10px] font-bold block leading-tight">Click to upload logo</span>
                    </div>
                  )}

                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white text-xs font-bold">
                    <span>Change</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>

                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Logo</span>
                  </button>
                )}

                <p className="text-[11px] text-slate-400 leading-tight">
                  Recommended: Square PNG/JPG under 2MB. Appears on bills and invoices.
                </p>
              </Card>
            </div>

            {/* Business Information Card */}
            <div className="lg:col-span-8">
              <Card className="p-4 bg-white border border-slate-200 space-y-4 shadow-xs">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                    Store &amp; Tax Information
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Store contact information, GSTIN, and business address.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Input
                    label="Store / Business Name"
                    placeholder="e.g. Mahadev Super Mart"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />

                  <Input
                    label="Tagline / Motto"
                    placeholder="e.g. Complete Kirana & FMCG Store"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                  />

                  <Input
                    label="Owner / Contact Person"
                    placeholder="e.g. Ramesh Patel"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                  />

                  <Input
                    label="Primary Mobile Phone"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />

                  <Input
                    label="Email Address (Optional)"
                    type="email"
                    placeholder="e.g. shop@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <Input
                    label="GSTIN Number (Optional)"
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  />

                  {/* Niche Regulatory License Fields */}
                  {businessType === 'pharmacy' && (
                    <>
                      <Input
                        label="Drug License No. (DL 20B / 21B)"
                        placeholder="e.g. MH-MZ2-123456 / 20B, 21B"
                        value={drugLicenseNo}
                        onChange={(e) => setDrugLicenseNo(e.target.value.toUpperCase())}
                      />
                      <Input
                        label="Registered Pharmacist Reg. No."
                        placeholder="e.g. PH-109283 / Reg. Pharmacist"
                        value={pharmacistRegNo}
                        onChange={(e) => setPharmacistRegNo(e.target.value)}
                      />
                    </>
                  )}

                  {(businessType === 'restaurant' || businessType === 'grocery') && (
                    <Input
                      label="FSSAI Food Safety License No."
                      placeholder="e.g. 11521000001234 (14 digits)"
                      value={fssaiLicenseNo}
                      onChange={(e) => setFssaiLicenseNo(e.target.value)}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Input
                      label="Store Address"
                      placeholder="Shop No. 4, Market Road, Near Temple"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="Pincode"
                      placeholder="e.g. 400001"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    className={cn(
                      "font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer",
                      isSaved
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 scale-[1.02]"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    )}
                  >
                    {isSaved ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white animate-bounce" />
                        <span>✓ Done &amp; Saved!</span>
                      </>
                    ) : (
                      <span>Save Profile Details</span>
                    )}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Clear Testing Data Section */}
            <div className="lg:col-span-12">
              <Card className="p-4 bg-rose-50/60 border border-rose-200 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-950 block flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Clear Test Records & Transactions</span>
                    </span>
                    <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                      Wipes all sample invoices, dummy customer debts, and test transactions from this browser while keeping your shop settings and products safe.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isClearingData}
                    onClick={handleClearTestingData}
                    className="border-rose-300 text-rose-700 hover:bg-rose-100 font-bold text-xs shrink-0 cursor-pointer"
                  >
                    {isClearingData ? 'Clearing...' : 'Clear All Test Data'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Multiple UPI QRs & Banking */}
      {activeTab === 'upi' && (
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Live QR Preview Card (Swipeable / Clickable Carousel) */}
            <div className="lg:col-span-5">
              <Card className="p-4 bg-white border border-slate-200 flex flex-col items-center text-center space-y-3 shadow-xs">
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Dynamic UPI Payment QR Preview
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">
                    {upiList.length} {upiList.length === 1 ? 'QR' : 'QRs'}
                  </span>
                </div>

                {/* Multiple QR Selector Chips / Tabs */}
                {upiList.length > 1 && (
                  <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1">
                    {upiList.map((u, idx) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedPreviewUpiIndex(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                          selectedPreviewUpiIndex === idx
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>{u.label}</span>
                        {u.is_default && <span className="ml-1 text-[9px] text-amber-300 font-black">★</span>}
                      </button>
                    ))}
                  </div>
                )}

                <div className="p-4 rounded-xl border-2 border-slate-900 bg-white flex flex-col items-center shadow-sm w-full max-w-[260px]">
                  {liveQrDataUrl ? (
                    <img
                      src={liveQrDataUrl}
                      alt="UPI QR Code Preview"
                      className="w-44 h-44 object-contain"
                    />
                  ) : (
                    <div className="w-44 h-44 flex flex-col items-center justify-center text-slate-400 p-3">
                      <QrCode className="w-12 h-12 mb-2 opacity-50" />
                      <span className="text-[11px] font-bold">Enter UPI ID to generate live QR</span>
                    </div>
                  )}

                  <div className="mt-2 text-center w-full">
                    <span className="text-xs font-extrabold text-slate-900 block truncate">
                      {name || 'Your Store'}
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 block mt-0.5">
                      {activePreviewUpi?.label || 'Primary QR'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-600 block mt-0.5 truncate">
                      {activePreviewUpi?.upi_id || 'No UPI ID set'}
                    </span>
                    <div className="mt-2 flex items-center justify-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-300">
                        BHIM UPI / GPay / PhonePe / Paytm
                      </span>
                    </div>
                  </div>
                </div>

                {/* Swipeable Carousel Dots */}
                {upiList.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    {upiList.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedPreviewUpiIndex(i)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          selectedPreviewUpiIndex === i ? 'bg-slate-900 w-5' : 'bg-slate-300 hover:bg-slate-400 w-2'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Action to Print or Download Counter Standee */}
                <div className="w-full pt-1">
                  <button
                    type="button"
                    onClick={() => setIsStandeeModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-[0.98]"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>Print Counter Standee (PDF)</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  ⚡ Customers can scan this QR code on physical bills, PDF invoices, and countertop standees.
                </p>
              </Card>
            </div>

            {/* Multiple UPI Manager & Bank Details Card */}
            <div className="lg:col-span-7 space-y-3.5">
              <Card className="p-3.5 sm:p-4 bg-white border border-slate-200 space-y-3.5 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Configured Store UPIs ({upiList.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Multiple shop / owner VPAs</span>
                  </div>

                  {/* List of Configured UPIs */}
                  <div className="space-y-1.5">
                    {upiList.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`p-2 sm:p-2.5 rounded-lg border flex items-center justify-between gap-2.5 transition-all ${
                          item.is_default
                            ? 'border-emerald-400 bg-emerald-50/60 shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            item.is_default ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-900 truncate">{item.label}</span>
                              {item.is_default && (
                                <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase bg-emerald-200 text-emerald-950 border border-emerald-300 font-mono">
                                  ★ Primary
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 font-mono font-bold truncate">{item.upi_id}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!item.is_default && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultUpi(item.id)}
                              className="px-2 py-1 rounded text-[10px] font-bold border border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer shadow-2xs"
                            >
                              Make Default
                            </button>
                          )}

                          {upiList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUpi(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer hover:bg-rose-50"
                              title="Delete UPI"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New UPI Address Inputs */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 block">Add Another Store UPI QR</span>
                      {!isPro && <ProFeatureBadge />}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-5">
                        <Input
                          placeholder="Label (e.g. Counter 2)"
                          value={newUpiLabel}
                          onChange={(e) => setNewUpiLabel(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <Input
                          placeholder="UPI ID (e.g. shop2@okaxis)"
                          value={newUpiId}
                          onChange={(e) => setNewUpiId(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Button
                          type="button"
                          onClick={handleAddUpiAccount}
                          size="md"
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-1 h-[38px] cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                          {!isPro && upiList.length >= 1 && <Lock className="w-3 h-3 text-amber-400" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Account Details (2x2 Grid) */}
                <div className="pt-2.5 border-t border-slate-200 space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                    Bank Account Details (B2B Invoices)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      label="Bank Name"
                      placeholder="e.g. State Bank of India / HDFC Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      leftIcon={<Building2 className="w-4 h-4 text-slate-400" />}
                    />
                    <Input
                      label="Account Holder Name"
                      placeholder="e.g. Ramesh Chandra"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                    />
                    <Input
                      label="Bank Account Number"
                      placeholder="e.g. 5010023456789"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                    />
                    <Input
                      label="IFSC Code"
                      placeholder="e.g. HDFC0001234"
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    className={cn(
                      "font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer",
                      isSaved
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 scale-[1.02]"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
                    )}
                  >
                    {isSaved ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white animate-bounce" />
                        <span>✓ Done &amp; Saved!</span>
                      </>
                    ) : (
                      <span>Save UPI &amp; Banking Settings</span>
                    )}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Native Android Soundbox & Background UPI Listener Status Card */}
            <div className="lg:col-span-12">
              <NativeSoundboxStatusCard language="hi" />
            </div>

            {/* Smart Soundbox & Android Notification Bridge Section */}
            <div className="lg:col-span-12">
              <Card className="p-4 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white border border-slate-800 rounded-2xl space-y-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      <span>Smart Soundbox &amp; Android Notification Bridge</span>
                    </span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Instant audio announcements (PhonePe/Paytm style) on receiving customer UPI payments &amp; Bank SMS.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10.5px] font-black border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Bridge Engine Active</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Soundbox Voice Configuration */}
                  <div className="space-y-3 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
                    <span className="text-xs font-bold text-slate-200 block">
                      1. Soundbox Voice &amp; Regional Language
                    </span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'hi-IN', label: 'Hindi (हिंदी)', sub: 'आठ सौ अड़तालीस रुपये प्राप्त हुए' },
                        { id: 'mr-IN', label: 'Marathi (मराठी)', sub: 'आठशे अठ्ठेचाळीस रुपये मिळाले' },
                        { id: 'en-IN', label: 'English (India)', sub: 'Payment of 848 Received' },
                        { id: 'gu-IN', label: 'Gujarati (ગુજરાતી)', sub: 'આઠસો અડતાલીસ રૂપિયા મળ્યા' },
                      ].map((lang) => (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => {
                            setSoundboxLang(lang.id as SoundboxLanguage);
                            soundboxEngine.setLanguage(lang.id as SoundboxLanguage);
                            showSaveNotification(
                              'Soundbox Voice Language Changed',
                              `Payment voice announcements set to ${lang.label}.`
                            );
                          }}
                          className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                            soundboxLang === lang.id
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-xs'
                              : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          <div className="text-xs font-bold">{lang.label}</div>
                          <div className="text-[9.5px] opacity-80 truncate">{lang.sub}</div>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                        <span>Voice Volume</span>
                        <span>{Math.round(soundboxVol * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={soundboxVol}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setSoundboxVol(v);
                          soundboxEngine.setVolume(v);
                        }}
                        onMouseUp={() => {
                          showSaveNotification('Soundbox Volume Saved', `Speaker volume set to ${Math.round(soundboxVol * 100)}%.`);
                        }}
                        onTouchEnd={() => {
                          showSaveNotification('Soundbox Volume Saved', `Speaker volume set to ${Math.round(soundboxVol * 100)}%.`);
                        }}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => soundboxEngine.announcePayment(848, name || 'KamaiPlus')}
                      className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>🔊 Test Soundbox Voice (₹848)</span>
                    </Button>
                  </div>

                  {/* Right: Live Bank SMS & Notification Simulator */}
                  <div className="space-y-3 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
                    <span className="text-xs font-bold text-slate-200 block">
                      2. Bank SMS &amp; App Notification Simulator
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-bold">Preset:</span>
                      {[
                        { label: 'HDFC Bank', text: 'Your a/c no. XX1234 is credited with INR 848.00 on 25-AUG-26 by a/c linked to UPI/423589123456/Rahul Sharma' },
                        { label: 'SBI', text: 'Dear UPI user, A/C XXXX credited by Rs 848.00 on 25Aug26 transfer from Rahul Sharma Ref No 423589123456' },
                        { label: 'PhonePe', text: 'Received ₹848.00 from Rahul Sharma via PhonePe on Kamai QR' },
                        { label: 'Paytm', text: 'Received ₹848 from 9876543210 on Paytm QR (Ref 423589123456)' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setSampleSmsText(preset.text)}
                          className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-slate-200 cursor-pointer transition"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={3}
                      value={sampleSmsText}
                      onChange={(e) => setSampleSmsText(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs font-mono focus:border-amber-400 focus:outline-none"
                      placeholder="Paste incoming SMS text here to test..."
                    />

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const parsed = paymentBridge.handleRawNotification(sampleSmsText);
                        setParsedSmsResult(parsed);
                        if (parsed) {
                          soundboxEngine.announcePayment(parsed.amountRupees, name || 'KamaiPlus');
                        }
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ Test Parse &amp; Trigger Bridge</span>
                    </Button>

                    {parsedSmsResult && (
                      <div className="p-2 bg-emerald-950/80 border border-emerald-500/40 rounded-lg text-[10.5px] text-emerald-300 font-mono space-y-0.5">
                        <div>✓ Extracted: <b>₹{parsedSmsResult.amountRupees}</b> ({parsedSmsResult.sourceApp})</div>
                        {parsedSmsResult.payerName && <div>✓ Payer: <b>{parsedSmsResult.payerName}</b></div>}
                        {parsedSmsResult.referenceNumber && <div>✓ UTR: <b>{parsedSmsResult.referenceNumber}</b></div>}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </form>
      )}

      {/* Tab 3: Invoicing Preferences */}
      {activeTab === 'invoicing' && (
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <Card className="p-4 bg-white border border-slate-200 space-y-4 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
              Invoice Numbering &amp; Terms Configuration
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Invoice Prefix</label>
                  {!isPro && <ProFeatureBadge />}
                </div>
                <Input
                  placeholder="INV-"
                  value={isPro ? invoicePrefix : 'INV-'}
                  onChange={(e) => {
                    if (!isPro) {
                      setIsUpgradeModalOpen(true);
                    } else {
                      setInvoicePrefix(e.target.value);
                    }
                  }}
                  helperText={!isPro ? "Fixed to 'INV-' on Free plan. Upgrade to Pro for custom prefix (e.g. SHOP-, BIL-, 2026/)." : "Appears before invoice numbers (e.g. INV-001)"}
                />
              </div>

              <Input
                label="Next Invoice Sequence Number"
                type="number"
                value={nextInvoiceNumber}
                onChange={(e) => setNextInvoiceNumber(e.target.value)}
                helperText="Auto increments with each completed sale"
              />
            </div>

            {/* GST / Tax Pricing Calculation Mode */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <span>📊</span>
                  <span>GST Billing &amp; Calculation Mode</span>
                </span>
                <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                  {gstPricingMode === 'exclusive' ? '+ ADD GST ON TOTAL' : 'INCLUSIVE IN MRP'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Choose how GST is calculated and displayed on your receipts, POS screen, and PDF invoices:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div
                  onClick={() => handleGstPricingModeChange('exclusive')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    gstPricingMode === 'exclusive'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="gstPricingMode"
                      checked={gstPricingMode === 'exclusive'}
                      onChange={() => handleGstPricingModeChange('exclusive')}
                      className="accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-900">
                      Add GST on Top of Total (Exclusive)
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 mt-1 pl-5 leading-snug">
                    <b>Standard for Restaurants, Cafes, Hotels, Services &amp; Wholesale.</b> Menu prices are base prices; 5%, 12%, or 18% GST is added on top to calculate the Grand Total.
                  </p>
                </div>

                <div
                  onClick={() => handleGstPricingModeChange('inclusive')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    gstPricingMode === 'inclusive'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="gstPricingMode"
                      checked={gstPricingMode === 'inclusive'}
                      onChange={() => handleGstPricingModeChange('inclusive')}
                      className="accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-900">
                      Prices Include GST (Inclusive)
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 mt-1 pl-5 leading-snug">
                    <b>Standard for MRP Retail, Supermarkets &amp; Kirana.</b> Selling prices already include GST; Subtotal shows Taxable Base Value and GST is itemized.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">
                Terms &amp; Conditions / Return Policy
              </label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs font-semibold focus:border-slate-900 focus:outline-none"
                placeholder="e.g. Goods once sold will not be taken back without receipt."
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">
                Invoice Footer Thank You Note
              </label>
              <Input
                value={footerMessage}
                onChange={(e) => setFooterMessage(e.target.value)}
                placeholder="Thank you for shopping with us! Please visit again."
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <Button
                type="submit"
                size="sm"
                className={cn(
                  "font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer",
                  isSaved
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 scale-[1.02]"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                )}
              >
                {isSaved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white animate-bounce" />
                    <span>✓ Done &amp; Saved!</span>
                  </>
                ) : (
                  <span>Save Invoicing Preferences</span>
                )}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Tab 4: Meta WhatsApp Cloud API (Silent PDF Invoicing) */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-4">
          {/* Main WhatsApp Card */}
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-5 shadow-xs">
            {/* Header with Live Webhook Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                      <span>Official Meta WhatsApp Cloud API</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Silent Dispatch
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Dispatches PDF invoices, receipts &amp; Udhar reminders silently without wa.me browser redirects.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Webhook Verified &amp; Active</span>
                </span>
              </div>
            </div>

            {/* Webhook Configuration Details */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                1. Meta Developer Webhook Endpoint Configuration
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Webhook URL Field */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>🔗 Callback Webhook URL</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('https://kamaiplus.proventure.in/api/webhooks/whatsapp');
                        setHasCopiedWebhook(true);
                        setTimeout(() => setHasCopiedWebhook(false), 2500);
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100/70 hover:bg-emerald-200/70 transition cursor-pointer"
                    >
                      {hasCopiedWebhook ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-800 break-all select-all font-semibold">
                    https://kamaiplus.proventure.in/api/webhooks/whatsapp
                  </div>
                  <p className="text-[10.5px] text-slate-500">
                    Paste this in <b>Meta App Dashboard &gt; WhatsApp &gt; Configuration &gt; Callback URL</b>.
                  </p>
                </div>

                {/* Verify Token Field */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>🔐 Webhook Verify Token</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('kamaiplus_verify_token_2026');
                        setHasCopiedToken(true);
                        setTimeout(() => setHasCopiedToken(false), 2500);
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100/70 hover:bg-emerald-200/70 transition cursor-pointer"
                    >
                      {hasCopiedToken ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Token</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-800 font-semibold select-all">
                    kamaiplus_verify_token_2026
                  </div>
                  <p className="text-[10.5px] text-slate-500">
                    Enter this secret token in Meta Dashboard when clicking <b>Verify and Save</b>.
                  </p>
                </div>
              </div>
            </div>

            {/* API Credentials & Numbers */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                2. WhatsApp Sender &amp; Platform Credentials
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">Verified Phone Number ID</span>
                  <div className="font-mono text-xs font-black text-slate-900">828389810357376</div>
                  <span className="text-[10px] text-emerald-700 font-bold block">✓ ProVenture Verified</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">Graph API Version</span>
                  <div className="font-mono text-xs font-black text-slate-900">v20.0</div>
                  <span className="text-[10px] text-slate-500 block">Latest Meta Production Engine</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">Subscribed Webhook Events</span>
                  <div className="font-mono text-xs font-black text-slate-900">messages, deliveries</div>
                  <span className="text-[10px] text-slate-500 block">Receipts, Read &amp; Delivery Tracking</span>
                </div>
              </div>
            </div>

            {/* 3. Live Test Invoice Dispatcher */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3. Live Test Dispatcher (Send Sample Bill)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                  Instant Test
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Enter your mobile number to receive a live sample invoice message with interactive receipt link directly on WhatsApp:
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={testWhatsAppPhone}
                    onChange={(e) => setTestWhatsAppPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-11 pr-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleTestWhatsAppInvoice}
                  disabled={isTestingWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl cursor-pointer shadow-xs whitespace-nowrap h-9"
                >
                  {isTestingWhatsApp ? (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Sample Bill via WhatsApp</span>
                    </>
                  )}
                </Button>
              </div>

              {testWhatsAppResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                    testWhatsAppResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  {testWhatsAppResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 flex-1">
                    <p className="font-bold">{testWhatsAppResult.message}</p>
                    {testWhatsAppResult.messageId && (
                      <p className="text-[10px] font-mono text-emerald-700">
                        Meta Message ID: {testWhatsAppResult.messageId}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Feature Overview Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Silent Cloud Dispatch</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Sends invoices directly in background. Cashiers never wait for external browser apps.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>📄</span>
                  <span>Instant Online Bill Link</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Customers can open, view items, and download official PDF receipts with one tap.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>💳</span>
                  <span>1-Tap Dynamic UPI</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Udhar balance reminders include dynamic payment QR links to settle dues instantly.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Counter Standee Print & Export Modal */}
      <MerchantQRModal
        isOpen={isStandeeModalOpen}
        onClose={() => setIsStandeeModalOpen(false)}
        business={business || null}
        targetUpi={activePreviewUpi?.upi_id}
        targetLabel={activePreviewUpi?.label}
      />

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />

      {/* PWA App Installation Card */}
      <div className="pt-2">
        <PWAInstallSettingsCard />
      </div>

      {/* App Build & Version Footer */}
      <div className="pt-4 pb-8 text-center space-y-1 text-slate-400">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono font-bold">
          <span>KamaiPlus Release</span>
          <span className="text-emerald-700 font-extrabold">v{APP_VERSION}</span>
          <span className="text-slate-400 font-normal">({APP_RELEASE_DATE})</span>
        </div>
        <p className="text-[11px] text-slate-400">Offline-First Enterprise POS &amp; Business Management Platform</p>
      </div>
    </div>
  );
}
