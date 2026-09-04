'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db as localDb, seedBusinessStarterData } from '@/lib/db';
import { BusinessType, Business } from '@/types';
import { getStoredUser, setStoredUser, AuthUser } from '@/lib/auth';
import { getFirestoreDb } from '@/lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { sanitizeForFirestore } from '@/lib/firebase/firestoreSync';
import { syncProfileToCloud } from '@/lib/sync/syncEngine';
import { 
  Store, 
  ShoppingBag, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Pill, 
  Wrench, 
  Utensils, 
  Tv, 
  User, 
  Phone, 
  Building2, 
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { OnboardingPhotoScanCard } from '@/components/onboarding/OnboardingPhotoScanCard';

export default function OnboardingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Required Onboarding Fields
  const [businessName, setBusinessName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [businessType, setBusinessType] = useState<BusinessType>('grocery');
  const [seedStarterCatalog, setSeedStarterCatalog] = useState<boolean>(true);
  const [launchPhotoScan, setLaunchPhotoScan] = useState<boolean>(true);

  // Load current authenticated user and pre-fill details
  useEffect(() => {
    const user = getStoredUser();
    setCurrentUserState(user);

    if (user?.name && user.name !== 'Store Owner') {
      setOwnerName(user.name);
    }
    if (user?.phone) {
      const clean = user.phone.replace(/\D/g, '').slice(-10);
      if (clean.length === 10) {
        setPhone(clean);
      }
    }
  }, []);

  const businessCategories: Array<{
    type: BusinessType;
    label: string;
    description: string;
    icon: any;
  }> = [
    { type: 'grocery', label: 'Grocery / Kirana', description: 'Loose weights, FMCG, Rice, Atta & Barcodes', icon: Store },
    { type: 'clothing', label: 'Apparel / Clothing', description: 'Sizes S/M/L/XL, Colors & Garments', icon: ShoppingBag },
    { type: 'electronics', label: 'Electronics & Mobile', description: 'Serial numbers, Accessories & Gadgets', icon: Tv },
    { type: 'restaurant', label: 'Cafe / Restaurant', description: 'Table orders, Food items & KOT tokens', icon: Utensils },
    { type: 'pharmacy', label: 'Pharmacy / Medical', description: 'Batch numbers, Expiry alerts & Medicines', icon: Pill },
    { type: 'hardware', label: 'Hardware & Electrical', description: 'Paints, Tools, Pipes & Metered items', icon: Wrench },
    { type: 'other', label: 'General Retail', description: 'Universal retail billing & general items', icon: Building2 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanStoreName = businessName.trim();
    const cleanOwnerName = ownerName.trim() || 'Store Owner';
    const cleanUpiId = upiId.trim();

    if (!cleanStoreName) {
      setError('Please enter your Store / Business Name.');
      return;
    }

    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit WhatsApp / Contact Number.');
      return;
    }

    if (!cleanUpiId) {
      setError('Please enter your UPI ID (VPA). It is compulsory for generating payment QR codes on invoices.');
      return;
    }

    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(cleanUpiId)) {
      setError('Please enter a valid UPI ID (e.g. yourname@upi, 9876543210@paytm, store@okaxis).');
      return;
    }

    setIsLoading(true);

    try {
      const user = currentUser || getStoredUser();
      const rawUid = user?.uid || user?.id || `user_${cleanPhone}`;
      const safeUidSlice = rawUid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'merchant';
      const businessId = `biz_${safeUidSlice}_${Date.now()}`;
      const now = new Date().toISOString();

      // 1. Initialize Default Store Record in Local IndexedDB (Dexie)
      const newBusinessRecord: Business & { user_uid?: string; user_email?: string } = {
        id: businessId,
        name: cleanStoreName,
        business_type: businessType,
        owner_name: cleanOwnerName,
        phone: cleanPhone,
        upi_id: cleanUpiId,
        email: user?.email || undefined,
        user_email: user?.email || undefined,
        user_uid: rawUid,
        address: '',
        currency: 'INR',
        language: 'hi',
        invoice_prefix: 'INV-',
        next_invoice_number: 1,
        terms_conditions: 'Thank you for your business! Goods once sold can be exchanged within 7 days with bill receipt.',
        footer_message: 'Thank you for shopping with us! Please visit again.',
        is_onboarded: true,
        sync_status: 'synced',
        created_at: now,
        updated_at: now,
      };

      if (!localDb.isOpen()) {
        await localDb.open();
      }
      await Promise.all([
        localDb.businesses.clear().catch(() => {}),
        localDb.products.clear().catch(() => {}),
        localDb.sales.clear().catch(() => {}),
        localDb.customers.clear().catch(() => {}),
        localDb.categories.clear().catch(() => {}),
        localDb.inventory_movements.clear().catch(() => {}),
        localDb.suppliers.clear().catch(() => {}),
        localDb.cash_registers.clear().catch(() => {}),
        localDb.cash_expenses.clear().catch(() => {}),
        localDb.ledger_transactions.clear().catch(() => {}),
      ]);
      await localDb.businesses.put(newBusinessRecord);

      // Seed starter catalog products for selected category
      if (seedStarterCatalog) {
        try {
          await seedBusinessStarterData(businessId, businessType);
        } catch (seedErr) {
          console.warn('Starter catalog seed warning:', seedErr);
        }
      }

      // 2. Write Complete Merchant Document to Firestore `merchants/{uid}`
      const firestore = getFirestoreDb();
      if (firestore) {
        try {
          // Merchant Document
          const merchantDoc = {
            uid: rawUid,
            business_id: businessId,
            shop_name: cleanStoreName,
            business_name: cleanStoreName,
            owner_name: cleanOwnerName,
            phone: cleanPhone,
            email: user?.email || null,
            business_type: businessType,
            role: 'admin',
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(doc(firestore, 'merchants', rawUid), sanitizeForFirestore(merchantDoc), { merge: true });

          // Also write Business Document for full compatibility
          const businessDoc = {
            ...newBusinessRecord,
            subscription_tier: 'free',
            is_active: true,
            created_at: now,
            updated_at: now,
          };
          await setDoc(doc(firestore, 'businesses', businessId), sanitizeForFirestore(businessDoc), { merge: true });
        } catch (cloudErr) {
          console.warn('Cloud Firestore merchant creation notice:', cloudErr);
        }
      }

      // 3. Update localStorage via setStoredUser with complete AuthUser interface
      const completeAuthUser: AuthUser = {
        uid: rawUid,
        id: rawUid,
        phone: cleanPhone,
        email: user?.email || null,
        photoURL: user?.photoURL || null,
        name: cleanOwnerName,
        business_id: businessId,
        business_name: cleanStoreName,
        shop_name: cleanStoreName,
        role: 'admin',
      };
      setStoredUser(completeAuthUser);

      // Sync profile to cloud
      try {
        await syncProfileToCloud(businessId);
      } catch (e) {}

      // Send celebratory English WhatsApp Welcome Kit in background if phone is present
      if (cleanPhone) {
        fetch('/api/auth/onboarding-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            storeName: cleanStoreName,
            ownerName: cleanOwnerName,
            category: businessType,
          }),
        }).catch(() => {});
      }

      // 4. Navigate to products catalog with auto-scan if enabled, otherwise dashboard
      if (launchPhotoScan) {
        router.replace('/products?scan=auto');
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
      setError(err?.message || 'Error setting up your store. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Ambience Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold mb-3 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Store Onboarding • Fast &amp; Free Setup</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Setup Your Store Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Fill in your shop details to launch your digital billing counter and khata.
          </p>
        </div>

        {/* Onboarding Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-white">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* 1. Store / Business Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Store / Business Name *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-amber-400 pointer-events-none">
                  <Store className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Sharma Kirana & General Store"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none text-white text-sm placeholder:text-slate-600 transition"
                />
              </div>
            </div>

            {/* 2. Owner Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Owner / Manager Name
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-emerald-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none text-white text-sm placeholder:text-slate-600 transition"
                />
              </div>
            </div>

            {/* 3. WhatsApp / Contact Number */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                WhatsApp / Contact Number *
              </label>
              <div className="flex rounded-xl overflow-hidden border border-slate-800 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition bg-slate-950">
                <div className="flex items-center gap-1.5 px-3.5 py-3 bg-slate-900/90 border-r border-slate-800 text-slate-200 text-xs font-bold select-none shrink-0">
                  <span className="text-sm">🇮🇳</span>
                  <span className="text-amber-400 font-mono">+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  required
                  className="flex-1 px-4 py-3 bg-transparent text-white text-sm font-mono tracking-wide placeholder:text-slate-600 placeholder:font-sans focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Printed on invoice headers &amp; used for WhatsApp bill dispatches.
              </p>
            </div>

            {/* 4. UPI ID (Compulsory for instant QR & Payments) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>UPI ID / VPA *</span>
                <span className="text-[10px] text-amber-400 font-semibold normal-case">Required for Bill QR Codes</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-cyan-400 pointer-events-none">
                  <QrCode className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value.trim())}
                  placeholder="e.g. 9876543210@paytm or store@okaxis"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none text-white text-sm font-mono placeholder:font-sans placeholder:text-slate-600 transition"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Printed as dynamic NPCI UPI QR code on all bills &amp; WhatsApp payment links.
              </p>
            </div>

            {/* 5. Business Category Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Business Category *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {businessCategories.map((item) => {
                  const Icon = item.icon;
                  const isSelected = businessType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setBusinessType(item.type)}
                      className={`flex items-start gap-2.5 p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/20'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-1 leading-tight mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Preload Starter Catalog Checkbox */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={seedStarterCatalog}
                  onChange={(e) => setSeedStarterCatalog(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-amber-400 focus:ring-amber-400 mt-0.5 accent-amber-400"
                />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Pre-load starter product catalog
                  </span>
                  <span className="text-[10.5px] text-slate-400 block leading-tight mt-0.5">
                    Automatically seeds 8 popular items for {businessCategories.find(c => c.type === businessType)?.label} with standard prices.
                  </span>
                </div>
              </label>
            </div>

            {/* 6. 1-Tap Photo Scan Card (Adaptive for Restaurant / Retail) */}
            <OnboardingPhotoScanCard
              businessType={businessType}
              enabled={launchPhotoScan}
              onToggle={setLaunchPhotoScan}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !businessName.trim() || phone.length < 10}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.99] text-slate-950 font-black text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Setting Up Store...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Complete Setup &amp; Launch POS 🚀</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
