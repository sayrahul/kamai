'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, seedBusinessStarterData } from '@/lib/db';
import { useTranslation } from '@/lib/i18n';
import { BusinessType, SupportedLanguage, Business } from '@/types';
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
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function OnboardingPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

  const handleFinish = async () => {
    if (!businessName.trim()) {
      alert('Please enter your business name');
      return;
    }

    setIsLoading(true);
    try {
      const businessId = `biz_${Date.now()}`;
      const now = new Date().toISOString();

      const newBusiness: Business = {
        id: businessId,
        name: businessName.trim(),
        business_type: businessType,
        owner_name: ownerName.trim() || 'Business Owner',
        phone: phone.trim(),
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

      // Seed starter catalog if checked
      if (seedProducts) {
        await seedBusinessStarterData(businessId, businessType);
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
    <div className="min-h-screen bg-gradient-to-b from-vyapar-50/70 via-white to-slate-50 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-4 py-8">
      {/* Top Header */}
      <div className="w-full max-w-2xl text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-vyapar-100 dark:bg-vyapar-950 border border-vyapar-200 dark:border-vyapar-800 text-vyapar-800 dark:text-vyapar-300 text-xs font-bold mb-3 shadow-sm">
          <Sparkles className="w-4 h-4 text-vyapar-500" />
          <span>KamaiPlus (Kamai+) • Free & Offline-First</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('onboarding.title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('onboarding.subtitle')}
        </p>

        {/* Stepper Progress */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-vyapar-500 text-white ring-4 ring-vyapar-500/20 shadow-md'
                    : step > s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step === s ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-400'}`}>
                {s === 1 ? t('onboarding.step1') : s === 2 ? t('onboarding.step2') : t('onboarding.step3')}
              </span>
              {s < 3 && <div className="w-6 sm:w-10 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full" />}
            </div>
          ))}
        </div>
      </div>

      {/* Card Container */}
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xl p-6 sm:p-8 backdrop-blur-sm">
        {/* STEP 1: Business Profile & Type */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                {t('onboarding.step1')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your shop name and choose your primary line of business.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label={t('onboarding.businessName')}
                placeholder={t('onboarding.businessNamePlaceholder')}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                leftIcon={<Store className="w-5 h-5" />}
                required
                autoFocus
              />

              <Input
                label={t('onboarding.ownerName')}
                placeholder="e.g. Ramesh Kumar"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-2">
                  {t('onboarding.businessType')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {businessTypes.map((item) => {
                    const Icon = item.icon;
                    const isSelected = businessType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setBusinessType(item.type)}
                        className={`flex items-start gap-3 p-3 text-left rounded-2xl border transition-all ${
                          isSelected
                            ? 'border-vyapar-500 bg-vyapar-50/60 dark:bg-vyapar-950/40 ring-2 ring-vyapar-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className={`p-2 rounded-xl flex-shrink-0 ${isSelected ? 'bg-vyapar-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-tight mt-0.5">{item.desc}</div>
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
                disabled={!businessName.trim()}
                onClick={() => setStep(2)}
                className="w-full sm:w-auto"
              >
                <span>{t('common.next')}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Contact & UPI Details */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                {t('onboarding.step2')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add your phone number and payment details for instant UPI QR code invoices.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label={t('onboarding.phone')}
                  placeholder="e.g. 9876543210"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  helperText="Used on bill receipts and for customer WhatsApp sharing"
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label={t('onboarding.address')}
                  placeholder="Shop No., Street, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <Input
                label={t('onboarding.pincode')}
                placeholder="e.g. 400001"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />

              <Input
                label={t('onboarding.gstin')}
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
              />

              <div className="sm:col-span-2">
                <Input
                  label={t('onboarding.upiId')}
                  placeholder={t('onboarding.upiIdPlaceholder')}
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  leftIcon={<QrCode className="w-5 h-5 text-emerald-600" />}
                  helperText="Enables auto-generated UPI QR on bills for zero-commission payments"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between gap-3">
              <Button variant="outline" size="md" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span>{t('common.back')}</span>
              </Button>
              <Button size="lg" onClick={() => setStep(3)}>
                <span>{t('common.next')}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Language & Catalog Preferences */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                {t('onboarding.step3')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose your default language and personalize your invoice numbering.
              </p>
            </div>

            <div className="space-y-5">
              {/* Language Selection Grid */}
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-2">
                  {t('onboarding.language')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { code: 'hi', label: 'हिंदी', sub: 'Hindi', flag: '🇮🇳' },
                    { code: 'mr', label: 'मराठी', sub: 'Marathi', flag: '🇮🇳' },
                    { code: 'en', label: 'English', sub: 'Global', flag: '🌐' },
                  ].map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLanguage(l.code as SupportedLanguage)}
                      className={`p-3.5 rounded-2xl border text-center transition-all ${
                        language === l.code
                          ? 'border-vyapar-500 bg-vyapar-50/60 dark:bg-vyapar-950/40 ring-2 ring-vyapar-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-xl mb-1">{l.flag}</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{l.label}</div>
                      <div className="text-[10px] text-slate-400">{l.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label={t('onboarding.invoicePrefix')}
                placeholder="e.g. INV- or BILL-"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                helperText="Bills will be generated as INV-001, INV-002, etc."
              />

              {/* Seed Products Checkbox Card */}
              <div 
                onClick={() => setSeedProducts(!seedProducts)}
                className={`p-4 rounded-2xl border cursor-pointer flex items-start gap-3.5 transition-all ${
                  seedProducts 
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center ${seedProducts ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'}`}>
                  {seedProducts && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-emerald-600" />
                    <span>{t('onboarding.sampleProducts')}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Pre-loads popular items, realistic Indian MRPs, barcodes, and sample customers so you can test billing immediately.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between gap-3">
              <Button variant="outline" size="md" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span>{t('common.back')}</span>
              </Button>
              <Button
                variant="success"
                size="lg"
                isLoading={isLoading}
                onClick={handleFinish}
                className="w-full sm:w-auto"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                <span>{t('onboarding.completeSetup')}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
