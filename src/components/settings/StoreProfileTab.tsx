'use client';

import React from 'react';
import { 
  Store, 
  Camera, 
  Trash2, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Pill, 
  UtensilsCrossed, 
  Layers,
  User,
  LogOut
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { BusinessType } from '@/types';
import { getAllStoreProfiles } from '@/lib/constants/storeProfiles';

interface StoreProfileTabProps {
  name: string;
  setName: (val: string) => void;
  tagline: string;
  setTagline: (val: string) => void;
  businessType: BusinessType;
  setBusinessType: (val: BusinessType) => void;
  ownerName: string;
  setOwnerName: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  pincode: string;
  setPincode: (val: string) => void;
  gstin: string;
  setGstin: (val: string) => void;
  drugLicenseNo: string;
  setDrugLicenseNo: (val: string) => void;
  pharmacistRegNo: string;
  setPharmacistRegNo: (val: string) => void;
  fssaiLicenseNo: string;
  setFssaiLicenseNo: (val: string) => void;
  logoUrl: string;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
}

export const StoreProfileTab: React.FC<StoreProfileTabProps> = ({
  name,
  setName,
  tagline,
  setTagline,
  businessType,
  setBusinessType,
  ownerName,
  setOwnerName,
  phone,
  setPhone,
  email,
  setEmail,
  address,
  setAddress,
  pincode,
  setPincode,
  gstin,
  setGstin,
  drugLicenseNo,
  setDrugLicenseNo,
  pharmacistRegNo,
  setPharmacistRegNo,
  fssaiLicenseNo,
  setFssaiLicenseNo,
  logoUrl,
  onLogoUpload,
  onRemoveLogo,
}) => {
  const storeProfiles = getAllStoreProfiles();

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Store Identity & Logo */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Store className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            Store Identity &amp; Branding
          </h3>
        </div>

        {/* Logo Upload Section */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700">
          <div className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
            {logoUrl ? (
              <img src={logoUrl} alt="Store Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Camera className="w-6 h-6 text-slate-400" />
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="text-xs font-black text-slate-900 dark:text-slate-100">
              Store Brand Logo (Printable on Tax Invoices)
            </div>
            <p className="text-[11px] text-slate-400">
              Recommended size: 250x250 PNG/JPG. Automatically compressed for thermal printing.
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
              <label className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs cursor-pointer hover:bg-slate-800 shadow-2xs">
                <span>Upload Logo</span>
                <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={onRemoveLogo}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Store Name & Tagline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Business / Store Name *"
            placeholder="e.g. Mahavir Kirana & General Store"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Store Tagline / Slogan"
            placeholder="e.g. Always Fresh, Best Wholesale Rates"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </div>

        {/* Business Industry / Profile Selector */}
        <div>
          <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
            Business Industry &amp; Niche Profile
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {storeProfiles.map((p) => {
              const isSelected = businessType === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setBusinessType(p.id as BusinessType)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/30'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{p.emoji || '🏪'}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    )}
                  </div>
                  <div className="mt-1.5">
                    <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {p.tagline}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 2. Contact & Address Details */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Phone className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            Contact &amp; Store Location
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Owner / Contact Person *"
            placeholder="e.g. Ramesh Patel"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            required
          />
          <Input
            label="Store Mobile Number *"
            placeholder="e.g. 9876543210"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Input
            label="Email Address (Optional)"
            placeholder="e.g. store@gmail.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-3">
            <Input
              label="Full Store Address (Printed on Bill Header)"
              placeholder="e.g. Shop No. 12, Gandhi Market, Station Road"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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
      </Card>

      {/* 3. GST, FSSAI & Pharmacy Licensing */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            GST &amp; Statutory Licenses
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="GSTIN Number (For GST Tax Invoices)"
            placeholder="e.g. 27AAAAA0000A1Z5"
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase())}
          />
          <Input
            label="FSSAI License Number (Food &amp; Restaurant)"
            placeholder="e.g. 10019022009876"
            value={fssaiLicenseNo}
            onChange={(e) => setFssaiLicenseNo(e.target.value)}
          />
        </div>

        {/* Pharmacy Specific License Inputs */}
        {(businessType === 'pharmacy' || drugLicenseNo || pharmacistRegNo) && (
          <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800 space-y-3">
            <div className="text-xs font-black text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-teal-600" />
              <span>Pharmacy &amp; Chemist Compliance (Printed on Rx Invoices)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Drug License Number (Form 20B / 21B)"
                placeholder="e.g. MH-MZ2-123456"
                value={drugLicenseNo}
                onChange={(e) => setDrugLicenseNo(e.target.value)}
              />
              <Input
                label="Registered Pharmacist Reg. No."
                placeholder="e.g. REG-98765-MH"
                value={pharmacistRegNo}
                onChange={(e) => setPharmacistRegNo(e.target.value)}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Account & Session Management Card */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Account &amp; Session Management
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Current Device Session
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Logged in as {ownerName || 'Merchant'} ({phone || 'Owner'})
            </div>
            <p className="text-[11px] text-slate-400">
              Log out to switch accounts or securely sign in from another phone number / Google account.
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (confirm('Are you sure you want to log out from this device?')) {
                const { logoutUser } = await import('@/lib/auth');
                await logoutUser();
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 dark:text-rose-300 dark:bg-rose-950/60 dark:border-rose-800 font-bold text-xs flex items-center gap-1.5 self-start sm:self-center transition active:scale-95 cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout Account</span>
          </button>
        </div>
      </Card>
    </div>
  );
};
