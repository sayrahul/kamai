'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, seedBusinessStarterData } from '@/lib/db';
import { useTranslation } from '@/lib/i18n';
import { BusinessType, SupportedLanguage, Business } from '@/types';
import { getStoredUser, setStoredUser } from '@/lib/auth';
import { getFirestoreDb } from '@/lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { sanitizeForFirestore } from '@/lib/firebase/firestoreSync';
import { 
  Store, 
  ShoppingBag, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  QrCode,
  Globe,
  PackageCheck,
  Pill,
  Zap,
  Building2,
  Smartphone,
  Utensils,
  Wrench,
  BookOpen,
  User,
  Phone,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function OnboardingPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [phoneError, setPhoneError] = useState<string>('');

  // Form State
  const [businessName, setBusinessName] = useState<string>('');
  const [businessType, setBusinessType] = useState<BusinessType>('grocery');
  const [ownerName, setOwnerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [invoicePrefix, setInvoicePrefix] = useState<string>('INV-');
  const [seedProducts, setSeedProducts] = useState<boolean>(true);

  // Auto-fill owner details from Google Auth session
  useEffect(() => {
    const user = getStoredUser();
    if (user?.name && !ownerName) {
      setOwnerName(user.name);
    }
    if (user?.phone && user.phone.length === 10 && !phone) {
      setPhone(user.phone);
    }
  }, []);

  const businessTypes: Array<{ type: BusinessType; title: string; desc: string; icon: any }> = [
    { type: 'grocery', title: 'Kirana & Grocery', desc: 'Tata Salt, Parle-G, Maggi, Atta & Daily essentials', icon: Store },
    { type: 'pharmacy', title: 'Medical Store & Pharmacy', desc: 'Dolo 650, Crocin, Vicks, Syrups & First Aid', icon: Pill },
    { type: 'restaurant', title: 'Cafe & Restaurant', desc: 'Dosa, Paneer, Biryani, Roti, Chai & Drinks', icon: Utensils },
    { type: 'clothing', title: 'Clothing & Footwear', desc: 'T-Shirts, Jeans, Kurtis, Leggings & Garments', icon: ShoppingBag },
    { type: 'electronics', title: 'Electronics & Mobile', desc: 'Chargers, Cables, Earbuds, Power Banks', icon: Smartphone },
    { type: 'hardware', title: 'Hardware & Sanitary', desc: 'Paints, Fevicol, Taplon Tape, Nails & Tools', icon: Wrench },
    { type: 'electrical', title: 'Electrical Goods', desc: 'LED Bulbs, Havells Wire, Switches & Multi-Plugs', icon: Zap },
    { type: 'fmcg', title: 'FMCG & Supermarket', desc: 'Packaged foods, Biscuits, Soaps & Detergents', icon: Store },
    { type: 'bakery', title: 'Bakery & Sweets', desc: 'Cakes, Breads, Sweets & Snacks', icon: Sparkles },
    { type: 'stationery', title: 'Stationery & Books', desc: 'Registers, Pens, School & Office items', icon: BookOpen },
    { type: 'other', title: 'General Business / Other', desc: 'Custom products and general trading', icon: Building2 },
  ];

  // Validate 10-Digit Indian Mobile Number
  const validatePhoneNumber = (inputPhone: string): boolean => {
    const clean = inputPhone.replace(/\D/g, '');
    if (!clean) {
      setPhoneError('Contact number is required.');
      return false;
    }
    if (clean.length !== 10) {
      setPhoneError('Please enter exactly 10 digits (e.g. 9876543210).');
      return false;
    }
    if (!/^[6-9]/.test(clean)) {
      setPhoneError('Mobile number must start with 6, 7, 8, or 9.');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleStep1Next = () => {
    if (!businessName.trim()) {
      alert('Please enter your Store / Business name');
      return;
    }
    if (!validatePhoneNumber(phone)) {
      return;
    }
    setStep(2);
  };

  const handleFinish = async () => {
    if (!businessName.trim()) {
      alert('Please enter your business name');
      return;
    }
    if (!validatePhoneNumber(phone)) {
      setStep(1);
      return;
    }

    setIsLoading(true);
    try {
      const businessId = `biz_${Date.now()}`;
      const now = new Date().toISOString();
      const cleanPhone = phone.replace(/\D/g, '');
      const currentUser = getStoredUser();
      const userEmail = currentUser?.email || '';
      const userUid = currentUser?.uid || '';

      const newBusiness: Business & { user_email?: string; user_uid?: string } = {
        id: businessId,
        name: businessName.trim(),
        business_type: businessType,
        owner_name: ownerName.trim() || 'Business Owner',
        phone: cleanPhone,
        email: userEmail,
        user_email: userEmail,
        user_uid: userUid,
        address: address.trim(),
        pincode: pincode.trim(),
        gstin: gstin.trim(),
        upi_id: upiId.trim(),
        currency: 'INR',
        language: language,
        invoice_prefix: invoicePrefix.trim() || 'INV-',
        next_invoice_number: 1,
        terms_conditions: 'Thank you for your business! Goods once sold will be exchanged within 7 days.',
        footer_message: 'Powered by KamaiPlus (Kamai+)',
        is_onboarded: true,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      };

      await db.businesses.put(newBusiness);

      // Seed 8-category starter catalog
      if (seedProducts) {
        await seedBusinessStarterData(businessId, businessType);
      }

      // Update current user session with active business ID
      if (currentUser) {
        setStoredUser({
          ...currentUser,
          business_id: businessId,
          business_name: newBusiness.name,
          phone: cleanPhone,
          name: newBusiness.owner_name,
        });
      }

      // Sync registered merchant to Cloud Firestore so Admin Panel sees it live
      try {
        const firestore = getFirestoreDb();
        if (firestore) {
          const bizDocRef = doc(firestore, 'businesses', businessId);
          await setDoc(
            bizDocRef,
            sanitizeForFirestore({
              ...newBusiness,
              email: userEmail,
              user_email: userEmail,
              user_uid: userUid,
              subscription_tier: 'free',
              is_active: true,
              last_synced_at: now,
            }),
            { merge: true }
          );
        }
      } catch (cloudErr) {
        console.warn('Firestore initial merchant sync:', cloudErr);
      }

      router.push('/');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      alert('Error setting up business. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 py-8">
      {/* Top Header */}
      <div className="w-full max-w-2xl text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold mb-3 shadow-sm">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>KamaiPlus (Kamai+) • Free & Offline-First POS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {step === 1 ? 'Store Setup & Details' : step === 2 ? 'Address & UPI Invoicing' : 'Preferences'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {step === 1 ? 'Please answer a few quick questions to customize your billing counter.' : 'Add your shop details for invoices and QR receipts.'}
        </p>

        {/* Stepper Progress */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/20 shadow-md font-black'
                    : step > s
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step === s ? 'text-white font-bold' : 'text-slate-500'}`}>
                {s === 1 ? 'Store & Contact' : s === 2 ? 'Address & UPI' : 'Preferences'}
              </span>
              {s < 3 && <div className="w-6 sm:w-10 h-0.5 bg-slate-800 rounded-full" />}
            </div>
          ))}
        </div>
      </div>

      {/* Card Container */}
      <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
        {/* STEP 1: Store Type, Owner Name, Store Name, 10-Digit Mobile */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">
                Store & Owner Information
              </h2>
              <p className="text-xs text-slate-400">
                Your owner name is fetched automatically from your Google account.
              </p>
            </div>

            <div className="space-y-4">
              {/* 1. Store Name */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Store / Business Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Store className="w-4 h-4 text-amber-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Shri Ganesh Kirana Store"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. Owner Name (Pre-filled from Google) */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Owner Name (Fetched from Google) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Sharma"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. Contact Number (10-Digit with validation) */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Owner Contact Number (10-Digit Mobile) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                    +91
                  </div>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPhone(val);
                      if (val.length === 10) {
                        validatePhoneNumber(val);
                      }
                    }}
                    required
                    className="w-full pl-14 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                {phoneError ? (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{phoneError}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Used for WhatsApp bill receipts and invoice headers.
                  </p>
                )}
              </div>

              {/* 4. Store Type / Business Category */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  Select Store Type / Line of Business *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {businessTypes.map((item) => {
                    const Icon = item.icon;
                    const isSelected = businessType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setBusinessType(item.type)}
                        className={`flex items-start gap-3 p-3 text-left rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-400 bg-amber-400/10 ring-2 ring-amber-400/20'
                            : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isSelected ? 'text-amber-400' : 'text-white'}`}>{item.title}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1 leading-tight mt-0.5">{item.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                size="lg"
                disabled={!businessName.trim() || phone.length < 10}
                onClick={handleStep1Next}
                className="w-full sm:w-auto bg-amber-400 hover:bg-amber-500 text-slate-950 font-black cursor-pointer"
              >
                <span>Continue to Address</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Address & UPI Details */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">
                Shop Address & UPI Payments
              </h2>
              <p className="text-xs text-slate-400">
                Add your store address and UPI ID to generate auto-payment QR codes on receipts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1">Shop Address</label>
                <input
                  type="text"
                  placeholder="Shop No., Market, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Pincode</label>
                <input
                  type="text"
                  placeholder="e.g. 400001"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1">UPI ID / VPA (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. sharmakirana@upi or 9876543210@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Enables instant dynamic UPI QR on invoices for 0% commission direct customer payments.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between gap-3">
              <Button variant="outline" size="md" onClick={() => setStep(1)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span>Back</span>
              </Button>
              <Button size="lg" onClick={() => setStep(3)} className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black">
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Language & Default Catalog Seeding */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">
                Final Preferences
              </h2>
              <p className="text-xs text-slate-400">
                Choose invoice language and starter inventory.
              </p>
            </div>

            <div className="space-y-4">
              {/* Language Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  Preferred App Language
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { code: 'hi', label: 'हिंदी' },
                    { code: 'en', label: 'English' },
                    { code: 'mr', label: 'मराठी' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLanguage(lang.code as SupportedLanguage)}
                      className={`py-3 px-4 rounded-2xl border text-center font-bold text-sm transition cursor-pointer ${
                        language === lang.code
                          ? 'border-amber-400 bg-amber-400/10 text-amber-400 ring-2 ring-amber-400/20'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seed Products Checkbox */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seedProducts}
                    onChange={(e) => setSeedProducts(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-700 text-amber-400 focus:ring-amber-400 mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-emerald-400" />
                      <span>Pre-load Popular Products for my store</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Auto-populates 8-10 popular items for your selected category with realistic prices and 10 units stock.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between gap-3">
              <Button variant="outline" size="md" onClick={() => setStep(2)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span>Back</span>
              </Button>
              <Button
                size="lg"
                onClick={handleFinish}
                disabled={isLoading}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black cursor-pointer"
              >
                {isLoading ? (
                  <span>Setting Up Your Store...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    <span>Launch Store & POS Counter 🚀</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
