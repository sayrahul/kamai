'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import QRCode from 'qrcode';
import { generateUPILink } from '@/lib/utils';
import { UpiAccount, BusinessType } from '@/types';
import { compressImageFile } from '@/lib/utils/imageCompressor';
import { uploadStoreLogoToStorage } from '@/lib/firebase/storage';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { MerchantQRModal } from '@/components/paytm/MerchantQRModal';
import { 
  SettingsChangeBar, 
  SettingsReviewModal, 
  SettingsUnsavedTabModal,
  ChangedField 
} from '@/components/settings/SettingsChangeDialogue';
import { 
  validateIndianPhone, 
  validateEmail, 
  validateGstin, 
  validateUpiId, 
  validatePincode, 
  validateFssaiLicense 
} from '@/lib/validation/validators';

// Modular Tab Components
import { SettingsNavTabs, SettingsTabType } from '@/components/settings/SettingsNavTabs';
import { StoreProfileTab } from '@/components/settings/StoreProfileTab';
import { UpiBankingTab } from '@/components/settings/UpiBankingTab';
import { InvoiceSettingsTab } from '@/components/settings/InvoiceSettingsTab';
import { WhatsAppSettingsTab } from '@/components/settings/WhatsAppSettingsTab';

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
  
  // Multi-UPI State
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
  const [gstPricingMode, setGstPricingMode] = useState<'exclusive' | 'inclusive'>('inclusive');
  const [terms, setTerms] = useState('');
  const [footerMessage, setFooterMessage] = useState('');
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // UI & Dialogue states
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isUnsavedTabModalOpen, setIsUnsavedTabModalOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<SettingsTabType | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTabType>('profile');
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);
  const [liveQrDataUrl, setLiveQrDataUrl] = useState<string>('');

  // WhatsApp Testing
  const [testWhatsAppPhone, setTestWhatsAppPhone] = useState<string>('');
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState<boolean>(false);
  const [testWhatsAppResult, setTestWhatsAppResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
  } | null>(null);
  const [hasCopiedWebhook, setHasCopiedWebhook] = useState(false);
  const [hasCopiedToken, setHasCopiedToken] = useState(false);

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

  // Generate dynamic QR Code for preview
  const generateQrPreview = useCallback(async () => {
    const activeUpi = upiList[selectedPreviewUpiIndex]?.upi_id || upiList[0]?.upi_id;
    if (!activeUpi) {
      setLiveQrDataUrl('');
      return;
    }

    try {
      const upiUrl = generateUPILink(activeUpi, name || 'Our Store', 0);
      const dataUrl = await QRCode.toDataURL(upiUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setLiveQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR code preview generation failed:', err);
    }
  }, [upiList, selectedPreviewUpiIndex, name]);

  useEffect(() => {
    generateQrPreview();
  }, [generateQrPreview]);

  // Logo Upload Handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await uploadStoreLogoToStorage(file, business?.id || 'biz_default');
      if (res?.url) {
        setLogoUrl(res.url);
      }
    } catch (err) {
      console.error('Logo upload error:', err);
    }
  };

  // Add UPI Account
  const handleAddUpi = () => {
    setSettingsError(null);
    if (!newUpiId.trim()) return;

    const upiRes = validateUpiId(newUpiId, true);
    if (!upiRes.isValid) {
      setSettingsError(upiRes.error || 'Invalid UPI ID');
      return;
    }

    const isFirst = upiList.length === 0;
    const newItem: UpiAccount = {
      id: `upi_${Date.now()}`,
      label: newUpiLabel.trim() || `QR Account ${upiList.length + 1}`,
      upi_id: upiRes.cleanedValue || newUpiId.trim(),
      is_default: isFirst,
    };
    setUpiList([...upiList, newItem]);
    setNewUpiLabel('');
    setNewUpiId('');
  };

  const handleSetDefaultUpi = (id: string) => {
    setUpiList(upiList.map((u) => ({ ...u, is_default: u.id === id })));
  };

  const handleRemoveUpi = (id: string) => {
    const filtered = upiList.filter((u) => u.id !== id);
    if (filtered.length > 0 && !filtered.some((u) => u.is_default)) {
      filtered[0].is_default = true;
    }
    setUpiList(filtered);
    if (selectedPreviewUpiIndex >= filtered.length) {
      setSelectedPreviewUpiIndex(Math.max(0, filtered.length - 1));
    }
  };

  // Test WhatsApp Cloud API
  const handleSendTestWhatsApp = async () => {
    if (!testWhatsAppPhone.trim()) return;
    setIsTestingWhatsApp(true);
    setTestWhatsAppResult(null);

    try {
      const res = await fetch('/api/whatsapp/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testWhatsAppPhone,
          business: {
            name: name || 'KamaiPlus Store',
            phone: phone || '9876543210',
          },
          sale: {
            invoice_number: 'TEST-001',
            grand_total: 10000,
            payment_method: 'cash',
            created_at: new Date().toISOString(),
            items: [{ product_name: 'Test Item', quantity: 1, unit_price: 10000, total_amount: 10000 }],
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestWhatsAppResult({
          success: true,
          message: `✅ Test WhatsApp message delivered to +91${testWhatsAppPhone}!`,
          messageId: data.messageId,
        });
      } else {
        setTestWhatsAppResult({
          success: false,
          message: `⚠️ Delivery Failed: ${data.error || 'Check Meta Cloud API tokens in .env.local'}`,
        });
      }
    } catch (err: any) {
      setTestWhatsAppResult({
        success: false,
        message: `⚠️ Connection Error: ${err?.message || 'Network error'}`,
      });
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  // ---------------- CHANGE DETECTION ----------------
  const changedFields = useMemo<ChangedField[]>(() => {
    if (!business) return [];
    const changes: ChangedField[] = [];

    if (name.trim() !== (business.name || '').trim()) {
      changes.push({ key: 'name', label: 'Store Name', category: 'profile', categoryLabel: 'Store Profile', oldValue: business.name || '', newValue: name.trim() });
    }
    if (businessType !== business.business_type) {
      changes.push({ key: 'business_type', label: 'Business Industry', category: 'profile', categoryLabel: 'Store Profile', oldValue: business.business_type, newValue: businessType });
    }
    if (ownerName.trim() !== (business.owner_name || '').trim()) {
      changes.push({ key: 'owner_name', label: 'Owner Name', category: 'profile', categoryLabel: 'Store Profile', oldValue: business.owner_name || '', newValue: ownerName.trim() });
    }
    if (phone.trim() !== (business.phone || '').trim()) {
      changes.push({ key: 'phone', label: 'Store Mobile Phone', category: 'profile', categoryLabel: 'Store Profile', oldValue: business.phone || '', newValue: phone.trim() });
    }
    if (address.trim() !== (business.address || '').trim()) {
      changes.push({ key: 'address', label: 'Address', category: 'profile', categoryLabel: 'Store Profile', oldValue: business.address || '', newValue: address.trim() });
    }
    if (gstin.trim() !== (business.gstin || '').trim()) {
      changes.push({ key: 'gstin', label: 'GSTIN Number', category: 'profile', categoryLabel: 'Store Profile', oldValue: business.gstin || '', newValue: gstin.trim() });
    }
    if (invoicePrefix.trim() !== (business.invoice_prefix || 'INV-').trim()) {
      changes.push({ key: 'invoice_prefix', label: 'Invoice Prefix', category: 'invoicing', categoryLabel: 'Invoices', oldValue: business.invoice_prefix || 'INV-', newValue: invoicePrefix.trim() });
    }
    if (gstPricingMode !== (business.gst_pricing_mode || 'inclusive')) {
      changes.push({ key: 'gst_pricing_mode', label: 'GST Pricing Mode', category: 'invoicing', categoryLabel: 'Invoices', oldValue: business.gst_pricing_mode || 'inclusive', newValue: gstPricingMode });
    }

    return changes;
  }, [business, name, businessType, ownerName, phone, address, gstin, invoicePrefix, gstPricingMode]);

  const changedCategories = useMemo(() => Array.from(new Set(changedFields.map((c) => c.category))), [changedFields]);

  const handleTabChangeAttempt = (newTab: SettingsTabType) => {
    if (newTab === activeTab) return;
    const currentTabHasChanges = changedFields.some((c) => c.category === activeTab);
    if (currentTabHasChanges) {
      setPendingTab(newTab);
      setIsUnsavedTabModalOpen(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const handleSaveAll = async () => {
    if (!business) return;
    setSettingsError(null);

    // 1. Validate Store Name
    if (!name.trim() || name.trim().length < 2) {
      setSettingsError('Store Name must be at least 2 characters long.');
      setActiveTab('profile');
      setIsReviewModalOpen(false);
      return;
    }

    // 2. Validate Phone
    const phoneRes = validateIndianPhone(phone, true, 'Store Mobile Phone');
    if (!phoneRes.isValid) {
      setSettingsError(phoneRes.error || 'Invalid store mobile phone number.');
      setActiveTab('profile');
      setIsReviewModalOpen(false);
      return;
    }

    // 3. Validate Email (if provided)
    if (email && email.trim()) {
      const emailRes = validateEmail(email, false);
      if (!emailRes.isValid) {
        setSettingsError(emailRes.error || 'Invalid email address format.');
        setActiveTab('profile');
        setIsReviewModalOpen(false);
        return;
      }
    }

    // 4. Validate GSTIN (if provided)
    if (gstin && gstin.trim()) {
      const gstinRes = validateGstin(gstin, false);
      if (!gstinRes.isValid) {
        setSettingsError(gstinRes.error || 'Invalid GSTIN structure.');
        setActiveTab('profile');
        setIsReviewModalOpen(false);
        return;
      }
    }

    // 5. Validate Pincode (if provided)
    if (pincode && pincode.trim()) {
      const pinRes = validatePincode(pincode, false);
      if (!pinRes.isValid) {
        setSettingsError(pinRes.error || 'Invalid 6-digit postal pincode.');
        setActiveTab('profile');
        setIsReviewModalOpen(false);
        return;
      }
    }

    // 6. Validate FSSAI (if provided)
    if (fssaiLicenseNo && fssaiLicenseNo.trim()) {
      const fssaiRes = validateFssaiLicense(fssaiLicenseNo, false);
      if (!fssaiRes.isValid) {
        setSettingsError(fssaiRes.error || 'FSSAI License must be 14 digits.');
        setActiveTab('profile');
        setIsReviewModalOpen(false);
        return;
      }
    }

    setIsSaving(true);

    try {
      const defaultUpi = upiList.find((u) => u.is_default)?.upi_id || upiList[0]?.upi_id || '';
      const nextInvNum = parseInt(nextInvoiceNumber, 10) || 1;

      await db.businesses.update(business.id, {
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        business_type: businessType,
        logo_url: logoUrl || undefined,
        owner_name: ownerName.trim(),
        phone: phoneRes.cleanedValue || phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        pincode: pincode.trim() || undefined,
        gstin: gstin.trim().toUpperCase() || undefined,
        drug_license_no: drugLicenseNo.trim() || undefined,
        pharmacist_reg_no: pharmacistRegNo.trim() || undefined,
        fssai_license_no: fssaiLicenseNo.trim() || undefined,
        upi_id: defaultUpi,
        upi_ids: upiList,
        bank_name: bankName.trim() || undefined,
        bank_account_no: bankAccountNo.trim() || undefined,
        bank_ifsc: bankIfsc.trim().toUpperCase() || undefined,
        bank_account_name: bankAccountName.trim() || undefined,
        invoice_prefix: invoicePrefix.trim().toUpperCase() || 'INV-',
        next_invoice_number: nextInvNum,
        gst_pricing_mode: gstPricingMode,
        terms_conditions: terms.trim() || undefined,
        footer_message: footerMessage.trim() || undefined,
        updated_at: new Date().toISOString(),
      });

      // Keep session and cloud synchronized
      try {
        const { getStoredUser, setStoredUser } = await import('@/lib/auth');
        const stored = getStoredUser();
        if (stored) {
          setStoredUser({
            ...stored,
            phone: phone.trim() || stored.phone,
            name: ownerName.trim() || stored.name,
            business_name: name.trim() || stored.business_name,
            shop_name: name.trim() || stored.shop_name,
          });
        }
        const { syncProfileToCloud } = await import('@/lib/sync/syncEngine');
        await syncProfileToCloud(business.id);
      } catch (syncErr) {
        console.warn('Settings cloud sync notice:', syncErr);
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
      setIsReviewModalOpen(false);
    }
  };

  const handleDiscardAll = () => {
    if (!business) return;
    setName(business.name || '');
    setBusinessType(business.business_type || 'grocery');
    setTagline(business.tagline || '');
    setOwnerName(business.owner_name || '');
    setPhone(business.phone || '');
    setAddress(business.address || '');
    setGstin(business.gstin || '');
    setInvoicePrefix(business.invoice_prefix || 'INV-');
    setGstPricingMode(business.gst_pricing_mode || 'inclusive');
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-150">
      {/* Validation Error Alert */}
      {settingsError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold animate-in fade-in flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span>{settingsError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSettingsError(null)}
            className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 text-sm font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Category Nav Tabs */}
      <SettingsNavTabs
        activeTab={activeTab}
        onTabChange={handleTabChangeAttempt}
        changedCategories={changedCategories}
      />

      {/* 2. Active Tab Content Panels */}
      {activeTab === 'profile' && (
        <StoreProfileTab
          name={name}
          setName={setName}
          tagline={tagline}
          setTagline={setTagline}
          businessType={businessType}
          setBusinessType={setBusinessType}
          ownerName={ownerName}
          setOwnerName={setOwnerName}
          phone={phone}
          setPhone={setPhone}
          email={email}
          setEmail={setEmail}
          address={address}
          setAddress={setAddress}
          pincode={pincode}
          setPincode={setPincode}
          gstin={gstin}
          setGstin={setGstin}
          drugLicenseNo={drugLicenseNo}
          setDrugLicenseNo={setDrugLicenseNo}
          pharmacistRegNo={pharmacistRegNo}
          setPharmacistRegNo={setPharmacistRegNo}
          fssaiLicenseNo={fssaiLicenseNo}
          setFssaiLicenseNo={setFssaiLicenseNo}
          logoUrl={logoUrl}
          onLogoUpload={handleLogoUpload}
          onRemoveLogo={() => setLogoUrl('')}
        />
      )}

      {activeTab === 'upi' && (
        <UpiBankingTab
          upiList={upiList}
          newUpiLabel={newUpiLabel}
          setNewUpiLabel={setNewUpiLabel}
          newUpiId={newUpiId}
          setNewUpiId={setNewUpiId}
          onAddUpi={handleAddUpi}
          onSetDefaultUpi={handleSetDefaultUpi}
          onRemoveUpi={handleRemoveUpi}
          liveQrDataUrl={liveQrDataUrl}
          selectedPreviewUpiIndex={selectedPreviewUpiIndex}
          setSelectedPreviewUpiIndex={setSelectedPreviewUpiIndex}
          onOpenStandeeModal={() => setIsStandeeModalOpen(true)}
          bankName={bankName}
          setBankName={setBankName}
          bankAccountName={bankAccountName}
          setBankAccountName={setBankAccountName}
          bankAccountNo={bankAccountNo}
          setBankAccountNo={setBankAccountNo}
          bankIfsc={bankIfsc}
          setBankIfsc={setBankIfsc}
        />
      )}

      {activeTab === 'invoicing' && (
        <InvoiceSettingsTab
          invoicePrefix={invoicePrefix}
          setInvoicePrefix={setInvoicePrefix}
          nextInvoiceNumber={nextInvoiceNumber}
          setNextInvoiceNumber={setNextInvoiceNumber}
          gstPricingMode={gstPricingMode}
          setGstPricingMode={setGstPricingMode}
          terms={terms}
          setTerms={setTerms}
          footerMessage={footerMessage}
          setFooterMessage={setFooterMessage}
        />
      )}

      {activeTab === 'whatsapp' && (
        <WhatsAppSettingsTab
          testWhatsAppPhone={testWhatsAppPhone}
          setTestWhatsAppPhone={setTestWhatsAppPhone}
          isTestingWhatsApp={isTestingWhatsApp}
          testWhatsAppResult={testWhatsAppResult}
          onSendTestWhatsApp={handleSendTestWhatsApp}
          hasCopiedWebhook={hasCopiedWebhook}
          setHasCopiedWebhook={setHasCopiedWebhook}
          hasCopiedToken={hasCopiedToken}
          setHasCopiedToken={setHasCopiedToken}
        />
      )}

      {/* 3. Sticky Bottom Changes Detection Dialogue Bar */}
      <SettingsChangeBar
        changedFields={changedFields}
        onOpenReview={() => setIsReviewModalOpen(true)}
        onSave={handleSaveAll}
        onDiscard={handleDiscardAll}
        isSaving={isSaving}
      />

      {/* 4. Review & Confirm Changes Modal */}
      <SettingsReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        changedFields={changedFields}
        onSave={handleSaveAll}
        onDiscard={handleDiscardAll}
        isSaving={isSaving}
      />

      {/* 5. Unsaved Tab Transition Modal */}
      <SettingsUnsavedTabModal
        isOpen={isUnsavedTabModalOpen}
        onClose={() => {
          setIsUnsavedTabModalOpen(false);
          setPendingTab(null);
        }}
        targetTabName={pendingTab || ''}
        onDiscardAndSwitch={() => {
          handleDiscardAll();
          setIsUnsavedTabModalOpen(false);
          if (pendingTab) setActiveTab(pendingTab);
          setPendingTab(null);
        }}
        onSaveAndSwitch={async () => {
          await handleSaveAll();
          setIsUnsavedTabModalOpen(false);
          if (pendingTab) setActiveTab(pendingTab);
          setPendingTab(null);
        }}
        changedCount={changedFields.length}
      />

      {/* 6. Merchant QR Standee Printable Modal */}
      <MerchantQRModal
        isOpen={isStandeeModalOpen}
        onClose={() => setIsStandeeModalOpen(false)}
        business={business || null}
      />

      {/* 7. Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />
    </div>
  );
}
