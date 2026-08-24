'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import QRCode from 'qrcode';
import { generateUPILink } from '@/lib/utils';
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
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { compressImageFile } from '@/lib/utils/imageCompressor';
import { uploadStoreLogoToStorage } from '@/lib/firebase/storage';
import { BusinessType } from '@/types';
import { getStoreProfile } from '@/lib/constants/storeProfiles';
import { useProSubscription, ProFeatureBadge } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { Lock } from 'lucide-react';

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
  const [terms, setTerms] = useState('');
  const [footerMessage, setFooterMessage] = useState('');

  // UI state
  const [isSaved, setIsSaved] = useState(false);
  const [liveQrDataUrl, setLiveQrDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'profile' | 'upi' | 'invoicing'>('upi');

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

      // 2. Cloud Storage upload
      try {
        const { url } = await uploadStoreLogoToStorage(file, business?.id || 'biz_default');
        setLogoUrl(url);
      } catch (err) {
        console.log('Firebase Storage not configured or offline, using compressed image data:', err);
      }
    } catch (err) {
      console.error('Logo compression failed:', err);
      alert('Failed to process image. Please try another file.');
    }
  };

  // Add New UPI ID
  const handleAddUpiAccount = () => {
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
    setUpiList((prev) => [...prev, newEntry]);
    setSelectedPreviewUpiIndex(upiList.length);
    setNewUpiLabel('');
    setNewUpiId('');
  };

  // Set Default UPI ID
  const handleSetDefaultUpi = (id: string) => {
    setUpiList((prev) =>
      prev.map((u) => ({
        ...u,
        is_default: u.id === id,
      }))
    );
  };

  // Delete UPI ID
  const handleDeleteUpi = (id: string) => {
    if (upiList.length <= 1) {
      alert('You must keep at least one UPI address.');
      return;
    }
    setUpiList((prev) => {
      const filtered = prev.filter((u) => u.id !== id);
      if (filtered.length > 0 && !filtered.some((u) => u.is_default)) {
        filtered[0].is_default = true;
      }
      return filtered;
    });
    setSelectedPreviewUpiIndex(0);
  };

  // Save Settings to IndexedDB
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    const primaryUpi = upiList.find((u) => u.is_default)?.upi_id || upiList[0]?.upi_id || 'merchant@upi';

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
      upi_id: primaryUpi,
      upi_ids: upiList,
      bank_name: bankName.trim() || undefined,
      bank_account_no: bankAccountNo.trim() || undefined,
      bank_ifsc: bankIfsc.trim() || undefined,
      bank_account_name: bankAccountName.trim() || undefined,
      invoice_prefix: invoicePrefix.trim() || 'INV-',
      next_invoice_number: parseInt(nextInvoiceNumber) || 1,
      terms_conditions: terms.trim(),
      footer_message: footerMessage.trim(),
      updated_at: new Date().toISOString(),
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
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

      alert('✅ All test sales, test ledger entries, and test customers have been cleared! Your store is now 100% clean and ready for real production sales.');
    } catch (err: any) {
      alert(`Failed to clear test data: ${err?.message}`);
    } finally {
      setIsClearingData(false);
    }
  };

  const activePreviewUpi = upiList[selectedPreviewUpiIndex] || upiList[0];

  return (
    <div className="space-y-3.5 pb-12 max-w-5xl mx-auto">
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
        </select>
        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Desktop Navigation Tabs */}
      <div className="hidden sm:flex items-center gap-1.5 pb-0.5">
        {[
          { id: 'profile', label: 'Shop Profile & Logo', icon: Store },
          { id: 'upi', label: 'Multiple UPI QRs & Banking', icon: QrCode },
          { id: 'invoicing', label: 'Invoice Prefix & Sequence', icon: Receipt },
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
                    onClick={() => setLogoUrl('')}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                      Store &amp; Tax Information
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Store contact information, GSTIN, and business address.
                    </p>
                  </div>
                  <span className="self-start sm:self-auto text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1.5 shadow-2xs">
                    <span>{getStoreProfile(businessType).emoji}</span>
                    <span>{getStoreProfile(businessType).name}</span>
                    <span className="text-[9.5px] text-slate-400 font-normal">(Signup Store)</span>
                  </span>
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
                  <Button type="submit" size="sm" className="font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white">
                    Save Profile Details
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

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  ⚡ Customers can scan this QR code on physical bills, PDF invoices, and POS screens.
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
                  <Button type="submit" size="sm" className="font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-2xs">
                    Save UPI &amp; Banking Settings
                  </Button>
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
              <Button type="submit" size="sm" className="font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white">
                Save Invoicing Preferences
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />
    </div>
  );
}
