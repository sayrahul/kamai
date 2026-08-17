'use client';

import React, { useState, useEffect } from 'react';
import { db, seedComprehensiveDemoData } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import QRCode from 'qrcode';
import { generateUPILink } from '@/lib/utils';
import Link from 'next/link';
import { 
  Settings, 
  Store, 
  ShieldCheck, 
  Download, 
  Upload, 
  Globe, 
  CheckCircle2, 
  QrCode, 
  FileText, 
  Camera, 
  Trash2, 
  Building2, 
  Receipt, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  HelpCircle, 
  ExternalLink, 
  Sparkles,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function SettingsPage() {
  const business = useLiveQuery(async () => db.businesses.toCollection().first());

  // Form State
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstin, setGstin] = useState('');
  
  // UPI & Banking
  const [upiId, setUpiId] = useState('');
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
  const [activeTab, setActiveTab] = useState<'profile' | 'upi' | 'invoicing' | 'backup'>('profile');

  // Load business data into form
  useEffect(() => {
    if (business) {
      setName(business.name || '');
      setTagline(business.tagline || '');
      setLogoUrl(business.logo_url || '');
      setOwnerName(business.owner_name || '');
      setPhone(business.phone || '');
      setEmail(business.email || '');
      setAddress(business.address || '');
      setPincode(business.pincode || '');
      setGstin(business.gstin || '');
      setUpiId(business.upi_id || '');
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

  // Generate live UPI QR Code whenever upiId or store name changes
  useEffect(() => {
    if (upiId && upiId.trim()) {
      const upiUrl = generateUPILink(upiId.trim(), name.trim() || 'Store');
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
  }, [upiId, name]);

  // Handle Logo Upload (Converts image to compact Data URL string)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLogoUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
  };

  // Save Settings to IndexedDB
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    await db.businesses.update(business.id, {
      name: name.trim(),
      tagline: tagline.trim(),
      logo_url: logoUrl || undefined,
      owner_name: ownerName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      pincode: pincode.trim() || undefined,
      gstin: gstin.trim() || undefined,
      upi_id: upiId.trim() || undefined,
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

  // Data Export
  const handleExportBackup = async () => {
    try {
      const backupData = {
        version: 1,
        exported_at: new Date().toISOString(),
        businesses: await db.businesses.toArray(),
        products: await db.products.toArray(),
        categories: await db.categories.toArray(),
        customers: await db.customers.toArray(),
        suppliers: await db.suppliers.toArray(),
        sales: await db.sales.toArray(),
        inventory_movements: await db.inventory_movements.toArray(),
        ledger_transactions: await db.ledger_transactions.toArray(),
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kamai_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export backup.');
    }
  };

  // Data Import / Restore
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backup = JSON.parse(text);

        if (backup.version === 1 && backup.products && backup.businesses) {
          if (confirm('Restoring this backup will merge with existing shop records. Continue?')) {
            if (backup.businesses.length > 0) await db.businesses.bulkPut(backup.businesses);
            if (backup.categories?.length > 0) await db.categories.bulkPut(backup.categories);
            if (backup.products?.length > 0) await db.products.bulkPut(backup.products);
            if (backup.customers?.length > 0) await db.customers.bulkPut(backup.customers);
            if (backup.suppliers?.length > 0) await db.suppliers.bulkPut(backup.suppliers);
            if (backup.sales?.length > 0) await db.sales.bulkPut(backup.sales);
            if (backup.inventory_movements?.length > 0) await db.inventory_movements.bulkPut(backup.inventory_movements);
            if (backup.ledger_transactions?.length > 0) await db.ledger_transactions.bulkPut(backup.ledger_transactions);

            alert('Backup data restored successfully!');
            window.location.reload();
          }
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to read backup file.');
      }
    };
    reader.readAsText(file);
  };

  // Load 50+ Test Demo Data
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [demoSeedMessage, setDemoSeedMessage] = useState('');

  const handleLoadDemoData = async (clearExisting = false) => {
    if (!business?.id) {
      alert('Store not loaded yet. Please wait a moment.');
      return;
    }

    if (clearExisting && !confirm('This will replace current demo catalog, sales, customers & suppliers with fresh 50+ test records. Proceed?')) {
      return;
    }

    setIsSeedingDemo(true);
    setDemoSeedMessage('');
    try {
      const res = await seedComprehensiveDemoData(business.id, clearExisting);
      setDemoSeedMessage(`Successfully loaded ${res.productsCount} products, ${res.customersCount} customers, ${res.suppliersCount} suppliers, and ${res.salesCount} sales records!`);
      setTimeout(() => setDemoSeedMessage(''), 6000);
    } catch (err) {
      console.error('Demo data seed error:', err);
      alert('Failed to load demo data. Check console for details.');
    } finally {
      setIsSeedingDemo(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-800" />
            <span>Store Profile & System Settings</span>
          </h1>
          <p className="text-xs text-slate-500">
            Manage your shop logo, contact info, dynamic UPI payment QR, and billing settings.
          </p>
        </div>

        {isSaved && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Settings Saved Successfully!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'profile', label: 'Shop Profile & Logo', icon: Store },
          { id: 'upi', label: 'UPI QR & Bank Accounts', icon: QrCode },
          { id: 'invoicing', label: 'Invoice Terms & Prefix', icon: Receipt },
          { id: 'backup', label: 'Data Backup & Restore', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
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

        <Link
          href="/invoice-designer"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-400 shadow-xs transition-all"
        >
          <Palette className="w-3.5 h-3.5 text-slate-950" />
          <span>🎨 Invoice Themes (Vyapar)</span>
        </Link>
      </div>

      {/* Tab 1: Profile & Logo */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Logo Upload Card */}
            <div className="lg:col-span-4">
              <Card className="p-4 bg-white border border-slate-200 flex flex-col items-center text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Shop Logo (Appears on Invoices)
                </span>

                <div className="relative group w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Shop Logo Preview"
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-center p-3 text-slate-400">
                      <Camera className="w-8 h-8 mx-auto mb-1 text-slate-400" />
                      <span className="text-[10px] font-semibold">No Logo Uploaded</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col w-full gap-2">
                  <label className="w-full">
                    <span className="sr-only">Choose logo file</span>
                    <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer shadow-sm">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{logoUrl ? 'Change Shop Logo' : 'Upload Shop Logo'}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 text-rose-600 text-xs font-semibold hover:bg-rose-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Logo</span>
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-slate-400">
                  Supported formats: PNG, JPG, WebP. High resolution square or rectangular logo recommended.
                </p>
              </Card>
            </div>

            {/* Business Contact Form */}
            <div className="lg:col-span-8">
              <Card className="p-4 bg-white border border-slate-200 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block mb-2">
                  Business & Owner Information
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Shop / Business Name"
                    placeholder="e.g. Laxmi Kirana & General Store"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Input
                    label="Shop Tagline (Optional)"
                    placeholder="e.g. Your Friendly Daily Kirana"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Owner Full Name"
                    placeholder="e.g. Ramesh Chandra"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                  <Input
                    label="Primary Contact Mobile (WhatsApp Number)"
                    placeholder="e.g. 9876543210"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Business Email (Optional)"
                    placeholder="shop@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    label="GSTIN Number (Optional)"
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Input
                      label="Store Full Physical Address"
                      placeholder="Shop #12, Main Market, Station Road"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <Input
                    label="PIN Code"
                    placeholder="e.g. 400001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <Button type="submit" size="sm" className="font-bold text-xs">
                    Save Profile Details
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: UPI QR & Banking */}
      {activeTab === 'upi' && (
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Live QR Preview Card */}
            <div className="lg:col-span-5">
              <Card className="p-4 bg-white border border-slate-200 flex flex-col items-center text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Dynamic UPI Payment QR Preview
                </span>

                <div className="p-4 rounded-xl border-2 border-slate-900 bg-white flex flex-col items-center shadow-sm">
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

                  <div className="mt-2 text-center">
                    <span className="text-xs font-extrabold text-slate-900 block">{name || 'Your Store'}</span>
                    <span className="text-[11px] font-mono text-slate-600 block mt-0.5">{upiId || 'No UPI ID set'}</span>
                    <div className="mt-2 flex items-center justify-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-300">
                        BHIM UPI / GPay / PhonePe / Paytm
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  ⚡ When you change your UPI ID below, this QR Code updates automatically in real-time across all customer invoices!
                </p>
              </Card>
            </div>

            {/* UPI & Bank Details Input Card */}
            <div className="lg:col-span-7">
              <Card className="p-4 bg-white border border-slate-200 space-y-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block mb-1">
                    UPI Payment Address (VPA)
                  </span>
                  <p className="text-xs text-slate-500 mb-3">
                    Customer scans on A4/Thermal bills and online invoice links will directly transfer money to this account.
                  </p>

                  <Input
                    label="Store UPI ID / VPA"
                    placeholder="e.g. yourname@okhdfcbank, 9876543210@paytm, shop@ybl"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    leftIcon={<QrCode className="w-4 h-4 text-slate-700" />}
                    helperText="Valid examples: merchant@icici, mobile@upi, store@oksbi"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                    Bank Account Details (Optional for B2B Invoicing)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Bank Name"
                      placeholder="e.g. State Bank of India / HDFC Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      leftIcon={<Building2 className="w-4 h-4 text-slate-400" />}
                    />
                    <Input
                      label="Account Holder Name"
                      placeholder="e.g. Ramesh Chandra (Proprietor)"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <Button type="submit" size="sm" className="font-bold text-xs">
                    Save UPI & Banking Settings
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
          <Card className="p-4 bg-white border border-slate-200 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
              Invoice Numbering & Terms Configuration
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Invoice Prefix"
                placeholder="e.g. INV- or KP-"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                helperText="Appears before invoice numbers (e.g. INV-001)"
              />
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
                Terms & Conditions / Return Policy
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
              <Button type="submit" size="sm" className="font-bold text-xs">
                Save Invoicing Preferences
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Tab 4: Backup & Restore & Demo Data */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
          {/* Demo Data Seeder Card */}
          <Card className="p-4 bg-amber-50/60 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Test Demo Data (50+ Sample Items)</span>
              </span>
              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                For Testing & QA
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Instantly populate your store with 50+ real Indian kirana/FMCG products (with barcodes, MRP, tax rates & units), 15 customers with active credit balances, 6 wholesale suppliers, and 20 recent sales transactions to test analytics and billing POS.
            </p>

            {demoSeedMessage && (
              <div className="p-2.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>{demoSeedMessage}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                variant="primary"
                onClick={() => handleLoadDemoData(false)}
                disabled={isSeedingDemo}
                size="sm"
                className="font-bold text-xs justify-center bg-slate-900 text-white hover:bg-slate-800"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                <span>{isSeedingDemo ? 'Loading 50+ Test Items...' : '⚡ Append 50+ Test Demo Data'}</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleLoadDemoData(true)}
                disabled={isSeedingDemo}
                size="sm"
                className="font-bold text-xs justify-center border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                <span>Reset & Fresh Seed 50+ Data</span>
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 bg-white border border-slate-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-slate-700" />
                <span>Export Full Shop Database</span>
              </span>
              <p className="text-xs text-slate-500">
                Download your complete catalog, all sales, customer ledger, and settings into a secure JSON backup.
              </p>
              <Button
                variant="secondary"
                onClick={handleExportBackup}
                size="sm"
                className="w-full font-bold text-xs justify-center"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                <span>Download Backup JSON</span>
              </Button>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-slate-700" />
                <span>Restore Database from Backup</span>
              </span>
              <p className="text-xs text-slate-500">
                Import a previously exported JSON backup file to restore all your products and ledger records.
              </p>
              <label className="block w-full">
                <span className="sr-only">Choose backup file</span>
                <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-slate-700" />
                  <span>Select & Restore Backup File</span>
                </div>
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
