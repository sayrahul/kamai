'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';
import { AdminCoupon } from '@/app/api/admin/coupons/route';
import { PlatformRemoteConfig } from '@/app/api/admin/config/route';
import { clearLocalDexieAndFreshSync } from '@/lib/firebase/firestoreSync';
import { validateIndianPhone, validateEmail, validateGstin } from '@/lib/validation/validators';

// Modular Sub-components
import { AdminAuthScreen } from '@/components/admin/AdminAuthScreen';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminNavTabs, AdminTabType } from '@/components/admin/AdminNavTabs';
import { AdminOverviewTab } from '@/components/admin/AdminOverviewTab';
import { AdminMerchantsTab } from '@/components/admin/AdminMerchantsTab';
import { AdminBroadcastTab } from '@/components/admin/AdminBroadcastTab';
import { AdminCouponsTab } from '@/components/admin/AdminCouponsTab';
import { AdminWhatsAppTab } from '@/components/admin/AdminWhatsAppTab';
import { AdminRevenueTab } from '@/components/admin/AdminRevenueTab';
import { AdminConfigTab } from '@/components/admin/AdminConfigTab';
import { AdminMobileBottomNav } from '@/components/admin/AdminMobileBottomNav';
import { AdminProGrantModal } from '@/components/admin/modals/AdminProGrantModal';
import { AdminCouponModal } from '@/components/admin/modals/AdminCouponModal';
import { AdminAddMerchantModal } from '@/components/admin/modals/AdminAddMerchantModal';
import { AdminEditMerchantModal } from '@/components/admin/modals/AdminEditMerchantModal';
import { AdminDeleteMerchantModal } from '@/components/admin/modals/AdminDeleteMerchantModal';
import { AdminMerchantDrawer } from '@/components/admin/modals/AdminMerchantDrawer';

export interface MerchantRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  owner_name?: string;
  city?: string;
  state?: string;
  gstin?: string;
  address?: string;
  business_type?: string;
  upi_id?: string;
  subscription_tier: 'free' | 'pro' | 'growth' | 'enterprise';
  subscription_expires_at?: string;
  subscription_valid_until?: string;
  is_active: boolean;
  app_version?: string;
  created_at: string;
  updated_at?: string;
}

export interface PlatformMetrics {
  totalMerchants: number;
  totalBusinesses: number;
  tiers: {
    free: number;
    pro: number;
    enterprise: number;
  };
  recentSignups: any[];
}

export interface TransactionRecord {
  id: string;
  business_id: string;
  business_name?: string;
  tier: string;
  billing_cycle: string;
  amount?: number;
  razorpay_payment_id?: string;
  status: string;
  created_at: string;
}

export default function MasterSuperAdminPage() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Dashboard Data State
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [merchants, setMerchants] = useState<MerchantRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [config, setConfig] = useState<PlatformRemoteConfig | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<AdminTabType>('overview');

  // Filters for Merchants
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // View / 360 Drawer State
  const [selectedMerchantForView, setSelectedMerchantForView] = useState<MerchantRecord | null>(null);

  // Edit Merchant Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedMerchantForEdit, setSelectedMerchantForEdit] = useState<MerchantRecord | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editOwnerName, setEditOwnerName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editCity, setEditCity] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editGstin, setEditGstin] = useState<string>('');
  const [editBusinessType, setEditBusinessType] = useState<string>('grocery');
  const [editTier, setEditTier] = useState<string>('pro');
  const [editDaysExtension, setEditDaysExtension] = useState<number>(30);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isUpdatingMerchant, setIsUpdatingMerchant] = useState<boolean>(false);

  // Add Merchant Modal State
  const [isAddMerchantModalOpen, setIsAddMerchantModalOpen] = useState<boolean>(false);
  const [addName, setAddName] = useState<string>('');
  const [addOwnerName, setAddOwnerName] = useState<string>('');
  const [addPhone, setAddPhone] = useState<string>('');
  const [addEmail, setAddEmail] = useState<string>('');
  const [addCity, setAddCity] = useState<string>('');
  const [addAddress, setAddAddress] = useState<string>('');
  const [addGstin, setAddGstin] = useState<string>('');
  const [addBusinessType, setAddBusinessType] = useState<string>('grocery');
  const [addTier, setAddTier] = useState<string>('free');
  const [addDaysValidity, setAddDaysValidity] = useState<number>(365);
  const [isCreatingMerchant, setIsCreatingMerchant] = useState<boolean>(false);

  // Manual Subscription Quick Activation Modal
  const [isManualSubModalOpen, setIsManualSubModalOpen] = useState<boolean>(false);
  const [manualPhoneOrId, setManualPhoneOrId] = useState<string>('');
  const [manualTier, setManualTier] = useState<string>('pro');
  const [manualDurationDays, setManualDurationDays] = useState<number>(365);

  // Delete Confirmation Modal State
  const [merchantToDelete, setMerchantToDelete] = useState<MerchantRecord | null>(null);
  const [isDeletingMerchant, setIsDeletingMerchant] = useState<boolean>(false);

  // Remote Broadcast State
  const [broadcastEnabled, setBroadcastEnabled] = useState<boolean>(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string>('✨ Special Festive Update Live! Upgrade to Kamai+ Pro for near-expiry radar & CA tax filing.');
  const [broadcastType, setBroadcastType] = useState<'festive' | 'info' | 'warning' | 'success'>('festive');
  const [broadcastLink, setBroadcastLink] = useState<string>('/pricing');
  const [broadcastAudience, setBroadcastAudience] = useState<'all' | 'free' | 'pro'>('all');
  const [broadcastDuration, setBroadcastDuration] = useState<'always' | '24h' | '3d' | '7d' | 'custom'>('always');
  const [customBroadcastExpiry, setCustomBroadcastExpiry] = useState<string>('');
  const [isSavingBroadcast, setIsSavingBroadcast] = useState<boolean>(false);
  const [broadcastPreviewDevice, setBroadcastPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Coupon Creation State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState<boolean>(false);
  const [newCouponCode, setNewCouponCode] = useState<string>('');
  const [newCouponType, setNewCouponType] = useState<'flat' | 'percentage'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState<number>(20);
  const [newCouponMaxDiscount, setNewCouponMaxDiscount] = useState<number>(500);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState<number>(0);
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<number>(100);
  const [newCouponExpiryDays, setNewCouponExpiryDays] = useState<number>(30);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState<boolean>(false);

  // WhatsApp Outreach State
  const [waTemplate, setWaTemplate] = useState<'welcome' | 'offer50' | 'renewal' | 'features' | 'custom'>('offer50');
  const [waCustomText, setWaCustomText] = useState<string>('Hello! Special offer from KamaiPlus: Upgrade to Pro today and get 50% off with coupon PRO50. Grow your store with instant WhatsApp bills!');
  const [waTestPhone, setWaTestPhone] = useState<string>('');
  const [waTargetTier, setWaTargetTier] = useState<'all' | 'free' | 'pro'>('free');
  const [isSendingOutreach, setIsSendingOutreach] = useState<boolean>(false);

  // Platform Remote Configuration State
  const [formMaintenanceMode, setFormMaintenanceMode] = useState<boolean>(false);
  const [formMaintenanceMessage, setFormMaintenanceMessage] = useState<string>('Kamai+ is undergoing scheduled system optimization. Normal POS services will resume shortly.');
  const [formRazorpayGateway, setFormRazorpayGateway] = useState<boolean>(true);
  const [formCloudSync, setFormCloudSync] = useState<boolean>(true);
  const [formBarcodeGenerator, setFormBarcodeGenerator] = useState<boolean>(true);
  const [formGrowthMarketing, setFormGrowthMarketing] = useState<boolean>(true);
  const [formGstReports, setFormGstReports] = useState<boolean>(true);
  const [formAnnualPrice, setFormAnnualPrice] = useState<number>(1499);
  const [formMonthlyPrice, setFormMonthlyPrice] = useState<number>(199);
  const [formHoldBillsLimit, setFormHoldBillsLimit] = useState<number>(3);
  const [formHistoryDaysLimit, setFormHistoryDaysLimit] = useState<number>(7);
  const [formSupportPhone, setFormSupportPhone] = useState<string>('+919595997711');
  const [formSupportWhatsApp, setFormSupportWhatsApp] = useState<string>('919595997711');
  const [formMinVersion, setFormMinVersion] = useState<string>('4.00.0');
  const [formLatestVersion, setFormLatestVersion] = useState<string>('4.06.0');
  const [formForceUpdate, setFormForceUpdate] = useState<boolean>(false);
  const [formUpdateUrl, setFormUpdateUrl] = useState<string>('https://github.com/sayrahul/kamai/releases');
  const [formUpdateChangelog, setFormUpdateChangelog] = useState<string>('✨ Native Bluetooth Thermal Printing, Mobile UX Revamp & Security Enhancements');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Reset Dexie Cache State
  const [isResettingLocalData, setIsResettingLocalData] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Check existing session
  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((data) => {
        setIsAuthenticated(Boolean(data?.authenticated));
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  // Fetch all Admin Data
  const fetchAdminData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [merchantsRes, metricsRes, broadcastRes, couponsRes, configRes, transactionsRes] = await Promise.all([
        fetch('/api/admin/merchants').then((r) => r.json()).catch(() => ({ merchants: [] })),
        fetch('/api/admin/metrics').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/broadcast').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/coupons').then((r) => r.json()).catch(() => ({ coupons: [] })),
        fetch('/api/admin/config').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/transactions').then((r) => r.json()).catch(() => ({ transactions: [] })),
      ]);

      if (merchantsRes?.merchants) setMerchants(merchantsRes.merchants);
      if (metricsRes) setMetrics(metricsRes);
      if (couponsRes?.coupons) setCoupons(couponsRes.coupons);
      if (transactionsRes?.transactions) setTransactions(transactionsRes.transactions);

      const b = broadcastRes?.broadcast || broadcastRes?.announcement;
      if (b) {
        setBroadcastEnabled(b.enabled || false);
        setBroadcastMessage(b.message || '');
        setBroadcastType(b.type || 'festive');
        setBroadcastLink(b.link || '/pricing');
        setBroadcastAudience(b.target_audience || 'all');
      }

      if (configRes?.config) {
        setConfig(configRes.config);
        setFormMaintenanceMode(configRes.config.maintenance_mode || false);
        setFormMaintenanceMessage(configRes.config.maintenance_message || '');
        setFormAnnualPrice(configRes.config.annual_pro_price || 1499);
        setFormMonthlyPrice(configRes.config.monthly_pro_price || 199);
        setFormHoldBillsLimit(configRes.config.freeHoldBillsLimit !== undefined ? configRes.config.freeHoldBillsLimit : 3);
        setFormHistoryDaysLimit(configRes.config.freeHistoryDaysLimit !== undefined ? configRes.config.freeHistoryDaysLimit : 7);
        setFormSupportPhone(configRes.config.support_phone || '+919595997711');
        setFormSupportWhatsApp(configRes.config.support_whatsapp || '919595997711');
        setFormMinVersion(configRes.config.minRequiredVersion || '4.00.0');
        setFormLatestVersion(configRes.config.latestVersion || '4.06.0');
        setFormForceUpdate(configRes.config.forceUpdate || false);
        setFormUpdateUrl(configRes.config.updateDownloadUrl || 'https://github.com/sayrahul/kamai/releases');
        setFormUpdateChangelog(configRes.config.updateChangelog || '✨ Native Bluetooth Thermal Printing, Mobile UX Revamp & Security Enhancements');
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminData();
    }
  }, [isAuthenticated, fetchAdminData]);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await res.json().catch(() => ({ success: false, message: 'Invalid response from server' }));
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        showToast('🔓 SuperAdmin Access Granted');
      } else {
        setAuthError(data.message || data.error || 'Invalid Admin Password');
      }
    } catch (err: any) {
      setAuthError('Connection failed: ' + (err?.message || 'Server error'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('kamai_admin_token');
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  // Broadcast Deploy
  const handleSaveBroadcast = async () => {
    setIsSavingBroadcast(true);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: broadcastEnabled,
          message: broadcastMessage,
          type: broadcastType,
          link: broadcastLink,
          target_audience: broadcastAudience,
          duration: broadcastDuration,
          customExpiry: customBroadcastExpiry,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('🚀 Global Broadcast deployed live to all POS stores!');
      } else {
        showToast('⚠️ Broadcast failed: ' + (data.error || 'Unknown'));
      }
    } catch (err: any) {
      showToast('⚠️ Error saving broadcast');
    } finally {
      setIsSavingBroadcast(false);
    }
  };

  // Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCouponCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 3) {
      showToast('⚠️ Coupon Code must be at least 3 characters.');
      return;
    }

    const discountVal = Number(newCouponValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      showToast('⚠️ Discount Value must be greater than 0.');
      return;
    }

    if (newCouponType === 'percentage' && discountVal > 100) {
      showToast('⚠️ Percentage discount cannot exceed 100%.');
      return;
    }

    setIsCreatingCoupon(true);

    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (Number(newCouponExpiryDays) || 30));

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          discount_type: newCouponType,
          discount_value: discountVal,
          max_discount: Number(newCouponMaxDiscount) || undefined,
          min_order_amount: Number(newCouponMinOrder) || undefined,
          max_uses: Number(newCouponMaxUses) || undefined,
          expires_at: expiryDate.toISOString(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`✅ Promo code "${cleanCode}" created!`);
        setIsCouponModalOpen(false);
        setNewCouponCode('');
        fetchAdminData();
      } else {
        showToast('⚠️ ' + (data.error || 'Failed to create coupon'));
      }
    } catch (err) {
      showToast('⚠️ Error creating coupon');
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!window.confirm(`Delete coupon ${code}?`)) return;
    try {
      await fetch(`/api/admin/coupons?code=${encodeURIComponent(code)}`, { method: 'DELETE' });
      showToast(`🗑️ Coupon ${code} deleted`);
      fetchAdminData();
    } catch (err) {
      showToast('⚠️ Failed to delete coupon');
    }
  };

  // WhatsApp Test Outreach
  const handleSendTestOutreach = async () => {
    if (!waTestPhone.trim()) return;

    const phoneRes = validateIndianPhone(waTestPhone, true, 'Recipient WhatsApp');
    if (!phoneRes.isValid) {
      showToast(`⚠️ ${phoneRes.error}`);
      return;
    }

    setIsSendingOutreach(true);

    try {
      const res = await fetch('/api/admin/whatsapp/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneRes.cleanedValue,
          template: waTemplate,
          customText: waCustomText,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`✅ WhatsApp outreach delivered to +91${phoneRes.cleanedValue}!`);
      } else {
        // Fallback wa.me
        window.open(`https://wa.me/91${phoneRes.cleanedValue}?text=${encodeURIComponent(waCustomText)}`, '_blank');
        showToast('📲 Opened WhatsApp chat!');
      }
    } catch (err) {
      const cleanDigits = waTestPhone.replace(/\D/g, '').slice(-10);
      window.open(`https://wa.me/91${cleanDigits}?text=${encodeURIComponent(waCustomText)}`, '_blank');
      showToast('📲 Opened WhatsApp chat!');
    } finally {
      setIsSendingOutreach(false);
    }
  };

  // Remote Config Save
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenance_mode: formMaintenanceMode,
          maintenance_message: formMaintenanceMessage,
          annual_pro_price: formAnnualPrice,
          monthly_pro_price: formMonthlyPrice,
          freeHoldBillsLimit: formHoldBillsLimit,
          freeHistoryDaysLimit: formHistoryDaysLimit,
          support_phone: formSupportPhone,
          support_whatsapp: formSupportWhatsApp,
          minRequiredVersion: formMinVersion,
          latestVersion: formLatestVersion,
          forceUpdate: formForceUpdate,
          updateDownloadUrl: formUpdateUrl,
          updateChangelog: formUpdateChangelog,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('✅ Remote platform configuration updated!');
      }
    } catch (err) {
      showToast('⚠️ Failed to save platform config');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Reset Local Dexie Storage
  const handleResetLocalData = async () => {
    if (!window.confirm('Wipe local browser database and resync fresh data from Firestore?')) return;
    setIsResettingLocalData(true);
    try {
      await clearLocalDexieAndFreshSync('biz_default');
      showToast('✅ Local cache resynced from Firestore cloud!');
    } catch (err) {
      showToast('⚠️ Resync failed: ' + String(err));
    } finally {
      setIsResettingLocalData(false);
    }
  };

  // Add Merchant
  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addName.trim() || addName.trim().length < 2) {
      showToast('⚠️ Store Name must be at least 2 characters.');
      return;
    }

    const phoneRes = validateIndianPhone(addPhone, true, 'Merchant Mobile');
    if (!phoneRes.isValid) {
      showToast(`⚠️ ${phoneRes.error}`);
      return;
    }

    if (addEmail && addEmail.trim()) {
      const emailRes = validateEmail(addEmail, false);
      if (!emailRes.isValid) {
        showToast(`⚠️ ${emailRes.error}`);
        return;
      }
    }

    if (addGstin && addGstin.trim()) {
      const gstinRes = validateGstin(addGstin, false);
      if (!gstinRes.isValid) {
        showToast(`⚠️ ${gstinRes.error}`);
        return;
      }
    }

    setIsCreatingMerchant(true);

    try {
      const res = await fetch('/api/admin/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          owner_name: addOwnerName.trim() || undefined,
          phone: phoneRes.cleanedValue,
          email: addEmail.trim() || undefined,
          city: addCity.trim() || undefined,
          address: addAddress.trim() || undefined,
          gstin: addGstin.trim().toUpperCase() || undefined,
          business_type: addBusinessType,
          subscription_tier: addTier,
          days_validity: addDaysValidity,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`🎉 Merchant "${addName}" created successfully!`);
        setIsAddMerchantModalOpen(false);
        setAddName('');
        setAddOwnerName('');
        setAddPhone('');
        setAddEmail('');
        setAddCity('');
        setAddAddress('');
        setAddGstin('');
        fetchAdminData();
      } else {
        showToast('⚠️ ' + (data.message || data.error || 'Failed to create merchant'));
      }
    } catch (err: any) {
      showToast('⚠️ Error creating merchant: ' + (err?.message || 'Server error'));
    } finally {
      setIsCreatingMerchant(false);
    }
  };

  // Update Merchant
  const handleUpdateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchantForEdit) return;

    if (!editName.trim() || editName.trim().length < 2) {
      showToast('⚠️ Store Name must be at least 2 characters.');
      return;
    }

    const phoneRes = validateIndianPhone(editPhone, true, 'Merchant Mobile');
    if (!phoneRes.isValid) {
      showToast(`⚠️ ${phoneRes.error}`);
      return;
    }

    if (editEmail && editEmail.trim()) {
      const emailRes = validateEmail(editEmail, false);
      if (!emailRes.isValid) {
        showToast(`⚠️ ${emailRes.error}`);
        return;
      }
    }

    if (editGstin && editGstin.trim()) {
      const gstinRes = validateGstin(editGstin, false);
      if (!gstinRes.isValid) {
        showToast(`⚠️ ${gstinRes.error}`);
        return;
      }
    }

    setIsUpdatingMerchant(true);

    try {
      const res = await fetch(`/api/admin/merchants/${selectedMerchantForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          owner_name: editOwnerName.trim() || undefined,
          phone: phoneRes.cleanedValue,
          email: editEmail.trim() || undefined,
          city: editCity.trim() || undefined,
          address: editAddress.trim() || undefined,
          gstin: editGstin.trim().toUpperCase() || undefined,
          business_type: editBusinessType,
          subscription_tier: editTier,
          days_extension: editDaysExtension,
          is_active: editIsActive,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✅ Merchant "${editName}" updated!`);
        setIsEditModalOpen(false);
        setSelectedMerchantForEdit(null);
        fetchAdminData();
      } else {
        showToast('⚠️ ' + (data.message || data.error || 'Failed to update merchant'));
      }
    } catch (err: any) {
      showToast('⚠️ Error updating merchant: ' + (err?.message || 'Server error'));
    } finally {
      setIsUpdatingMerchant(false);
    }
  };

  // Quick 1-Click Pro Upgrade/Downgrade Toggle
  const handleTogglePro = async (merchant: MerchantRecord) => {
    const isPro = merchant.subscription_tier === 'pro' || merchant.subscription_tier === 'enterprise' || merchant.subscription_tier === 'growth';
    const nextTier = isPro ? 'free' : 'pro';
    try {
      const res = await fetch(`/api/admin/merchants/${merchant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_tier: nextTier,
          days_extension: nextTier === 'pro' ? 365 : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(nextTier === 'pro' ? `⭐ Upgraded "${merchant.name}" to Pro (₹1,499/Yr)!` : `Downgraded "${merchant.name}" to Free Forever`);
        fetchAdminData();
      } else {
        showToast('⚠️ ' + (data.message || 'Failed to toggle plan'));
      }
    } catch (err: any) {
      showToast('⚠️ Error updating plan: ' + (err?.message || 'Network error'));
    }
  };

  // Quick 1-Click Freeze / Unfreeze Toggle
  const handleToggleActive = async (merchant: MerchantRecord) => {
    const nextActive = merchant.is_active === false ? true : false;
    try {
      const res = await fetch(`/api/admin/merchants/${merchant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: nextActive,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(nextActive ? `✅ Unfrozen store "${merchant.name}"!` : `🔒 Store "${merchant.name}" has been FROZEN/BLOCKED!`);
        fetchAdminData();
      } else {
        showToast('⚠️ ' + (data.message || 'Failed to toggle status'));
      }
    } catch (err: any) {
      showToast('⚠️ Error: ' + (err?.message || 'Network error'));
    }
  };

  // Delete Merchant
  const handleDeleteMerchant = async () => {
    if (!merchantToDelete) return;
    setIsDeletingMerchant(true);

    try {
      const res = await fetch(`/api/admin/merchants/${merchantToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`🗑️ Merchant "${merchantToDelete.name}" removed from platform.`);
        setMerchantToDelete(null);
        fetchAdminData();
      } else {
        showToast('⚠️ ' + (data.message || data.error || 'Failed to delete merchant'));
      }
    } catch (err: any) {
      showToast('⚠️ Delete error: ' + (err?.message || 'Server error'));
    } finally {
      setIsDeletingMerchant(false);
    }
  };

  // Quick Grant Pro
  const handleGrantProLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = manualPhoneOrId.trim();
    if (!query) return;

    // Find target merchant in loaded merchants
    const target = merchants.find(
      (m) =>
        m.id === query ||
        m.phone === query.replace(/\D/g, '') ||
        m.phone.endsWith(query.replace(/\D/g, ''))
    );

    if (target) {
      try {
        const res = await fetch(`/api/admin/merchants/${target.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription_tier: manualTier,
            days_extension: manualDurationDays,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`👑 ${manualTier.toUpperCase()} subscription granted to ${target.name}!`);
          setIsManualSubModalOpen(false);
          setManualPhoneOrId('');
          fetchAdminData();
        } else {
          showToast('⚠️ ' + (data.message || data.error || 'Failed to grant license'));
        }
      } catch (err) {
        showToast('⚠️ Connection error');
      }
    } else {
      showToast(`⚠️ No merchant found matching "${query}". Please check phone number.`);
    }
  };

  if (isAuthenticated === false) {
    return (
      <AdminAuthScreen
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        onLogin={handleLogin}
        isLoggingIn={isLoggingIn}
        authError={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 max-w-7xl mx-auto py-3.5 sm:py-6 px-3 sm:px-6 lg:px-8 space-y-3.5 sm:space-y-6 pb-28 sm:pb-12 animate-in fade-in duration-150">
      {/* 1. Header Bar */}
      <AdminHeader
        isLoadingData={isLoadingData}
        onRefresh={fetchAdminData}
        onLogout={handleLogout}
      />

      {/* 2. Navigation Tabs */}
      <AdminNavTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        merchantsCount={merchants.length}
        couponsCount={coupons.length}
      />

      {/* 3. Active Tab Body */}
      {activeTab === 'overview' && (
        <AdminOverviewTab
          metrics={metrics}
          merchants={merchants}
          transactions={transactions}
          onOpenManualSubModal={() => setIsManualSubModalOpen(true)}
          onSelectTab={setActiveTab}
        />
      )}

      {activeTab === 'merchants' && (
        <AdminMerchantsTab
          merchants={merchants}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTierFilter={selectedTierFilter}
          setSelectedTierFilter={setSelectedTierFilter}
          selectedStatusFilter={selectedStatusFilter}
          setSelectedStatusFilter={setSelectedStatusFilter}
          onOpenAddMerchantModal={() => setIsAddMerchantModalOpen(true)}
          onOpenManualSubModal={() => setIsManualSubModalOpen(true)}
          onViewMerchant={setSelectedMerchantForView}
          onEditMerchant={(m) => {
            setSelectedMerchantForEdit(m);
            setEditName(m.name || '');
            setEditOwnerName(m.owner_name || '');
            setEditPhone(m.phone || '');
            setEditEmail(m.email || '');
            setEditCity(m.city || '');
            setEditGstin(m.gstin || '');
            setEditTier(m.subscription_tier || 'pro');
            setIsEditModalOpen(true);
          }}
          onDeleteMerchant={setMerchantToDelete}
          onTogglePro={handleTogglePro}
          onToggleActive={handleToggleActive}
          onSendWhatsApp={(m) => {
            const expiryDate = m.subscription_expires_at || m.subscription_valid_until;
            const diffDays = expiryDate ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
            const isExpiringSoon = diffDays !== null && diffDays <= 7 && diffDays > 0;
            const isExpired = diffDays !== null && diffDays <= 0;

            let text = `Namaste ${m.owner_name || m.name} ji! Special update from KamaiPlus Master Support.`;
            if (isExpiringSoon) {
              text = `Namaste ${m.owner_name || m.name} ji! Aapki dukan "${m.name}" ka KamaiPlus Pro subscription agle ${diffDays} din me expire hone wala hai. Bina kisi rukawat billing, digital thermal slips aur cloud backup continue rakhne ke liye abhi renew karein: https://kamaiplus.in/pricing - KamaiPlus Team`;
            } else if (isExpired) {
              text = `Namaste ${m.owner_name || m.name} ji! Aapki dukan "${m.name}" ka KamaiPlus Pro plan expire ho gaya hai. Apne billing counter ko uninterrupted rakhne ke liye abhi renew karein: https://kamaiplus.in/pricing - KamaiPlus Team`;
            }
            window.open(`https://wa.me/91${m.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
          }}
        />
      )}

      {activeTab === 'broadcast' && (
        <AdminBroadcastTab
          broadcastEnabled={broadcastEnabled}
          setBroadcastEnabled={setBroadcastEnabled}
          broadcastMessage={broadcastMessage}
          setBroadcastMessage={setBroadcastMessage}
          broadcastType={broadcastType}
          setBroadcastType={setBroadcastType}
          broadcastLink={broadcastLink}
          setBroadcastLink={setBroadcastLink}
          broadcastAudience={broadcastAudience}
          setBroadcastAudience={setBroadcastAudience}
          broadcastDuration={broadcastDuration}
          setBroadcastDuration={setBroadcastDuration}
          customBroadcastExpiry={customBroadcastExpiry}
          setCustomBroadcastExpiry={setCustomBroadcastExpiry}
          isSavingBroadcast={isSavingBroadcast}
          onSaveBroadcast={handleSaveBroadcast}
          broadcastPreviewDevice={broadcastPreviewDevice}
          setBroadcastPreviewDevice={setBroadcastPreviewDevice}
        />
      )}

      {activeTab === 'coupons' && (
        <AdminCouponsTab
          coupons={coupons}
          onOpenCreateModal={() => setIsCouponModalOpen(true)}
          onCopyCode={(code) => {
            navigator.clipboard.writeText(code);
            setCopiedCouponId(code);
            setTimeout(() => setCopiedCouponId(null), 2000);
            showToast(`📋 Copied coupon "${code}"`);
          }}
          copiedCode={copiedCouponId}
          onDeleteCoupon={handleDeleteCoupon}
        />
      )}

      {activeTab === 'whatsapp' && (
        <AdminWhatsAppTab
          waTemplate={waTemplate}
          setWaTemplate={setWaTemplate}
          waCustomText={waCustomText}
          setWaCustomText={setWaCustomText}
          waTestPhone={waTestPhone}
          setWaTestPhone={setWaTestPhone}
          waTargetTier={waTargetTier}
          setWaTargetTier={setWaTargetTier}
          onSendTestOutreach={handleSendTestOutreach}
          isSendingOutreach={isSendingOutreach}
        />
      )}

      {activeTab === 'revenue' && (
        <AdminRevenueTab
          transactions={transactions}
        />
      )}

      {activeTab === 'config' && (
        <AdminConfigTab
          formMaintenanceMode={formMaintenanceMode}
          setFormMaintenanceMode={setFormMaintenanceMode}
          formMaintenanceMessage={formMaintenanceMessage}
          setFormMaintenanceMessage={setFormMaintenanceMessage}
          formRazorpayGateway={formRazorpayGateway}
          setFormRazorpayGateway={setFormRazorpayGateway}
          formCloudSync={formCloudSync}
          setFormCloudSync={setFormCloudSync}
          formBarcodeGenerator={formBarcodeGenerator}
          setFormBarcodeGenerator={setFormBarcodeGenerator}
          formGrowthMarketing={formGrowthMarketing}
          setFormGrowthMarketing={setFormGrowthMarketing}
          formGstReports={formGstReports}
          setFormGstReports={setFormGstReports}
          formMinVersion={formMinVersion}
          setFormMinVersion={setFormMinVersion}
          formLatestVersion={formLatestVersion}
          setFormLatestVersion={setFormLatestVersion}
          formForceUpdate={formForceUpdate}
          setFormForceUpdate={setFormForceUpdate}
          formUpdateUrl={formUpdateUrl}
          setFormUpdateUrl={setFormUpdateUrl}
          formUpdateChangelog={formUpdateChangelog}
          setFormUpdateChangelog={setFormUpdateChangelog}
          formAnnualPrice={formAnnualPrice}
          setFormAnnualPrice={setFormAnnualPrice}
          formMonthlyPrice={formMonthlyPrice}
          setFormMonthlyPrice={setFormMonthlyPrice}
          formHoldBillsLimit={formHoldBillsLimit}
          setFormHoldBillsLimit={setFormHoldBillsLimit}
          formHistoryDaysLimit={formHistoryDaysLimit}
          setFormHistoryDaysLimit={setFormHistoryDaysLimit}
          formSupportPhone={formSupportPhone}
          setFormSupportPhone={setFormSupportPhone}
          formSupportWhatsApp={formSupportWhatsApp}
          setFormSupportWhatsApp={setFormSupportWhatsApp}
          isSavingConfig={isSavingConfig}
          onSaveConfig={handleSaveConfig}
          onResetLocalData={handleResetLocalData}
          isResettingLocalData={isResettingLocalData}
        />
      )}

      {/* 4. Mobile Sticky Bottom Navigation Bar */}
      <AdminMobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        merchantsCount={merchants.length}
        couponsCount={coupons.length}
      />

      {/* ---------------- MODALS ---------------- */}
      {/* 1. Quick Pro License Modal */}
      <AdminProGrantModal
        isOpen={isManualSubModalOpen}
        onClose={() => setIsManualSubModalOpen(false)}
        manualPhoneOrId={manualPhoneOrId}
        setManualPhoneOrId={setManualPhoneOrId}
        manualTier={manualTier}
        setManualTier={setManualTier}
        manualDurationDays={manualDurationDays}
        setManualDurationDays={setManualDurationDays}
        onSubmit={handleGrantProLicense}
      />

      {/* 2. Create Promo Coupon Modal */}
      <AdminCouponModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        newCouponCode={newCouponCode}
        setNewCouponCode={setNewCouponCode}
        newCouponType={newCouponType}
        setNewCouponType={setNewCouponType}
        newCouponValue={newCouponValue}
        setNewCouponValue={setNewCouponValue}
        newCouponMaxUses={newCouponMaxUses}
        setNewCouponMaxUses={setNewCouponMaxUses}
        newCouponMinOrder={newCouponMinOrder}
        setNewCouponMinOrder={setNewCouponMinOrder}
        newCouponExpiryDays={newCouponExpiryDays}
        setNewCouponExpiryDays={setNewCouponExpiryDays}
        isCreatingCoupon={isCreatingCoupon}
        onSubmit={handleCreateCoupon}
      />

      {/* 3. Add Merchant Store Modal */}
      <AdminAddMerchantModal
        isOpen={isAddMerchantModalOpen}
        onClose={() => setIsAddMerchantModalOpen(false)}
        addName={addName}
        setAddName={setAddName}
        addOwnerName={addOwnerName}
        setAddOwnerName={setAddOwnerName}
        addPhone={addPhone}
        setAddPhone={setAddPhone}
        addEmail={addEmail}
        setAddEmail={setAddEmail}
        addCity={addCity}
        setAddCity={setAddCity}
        addAddress={addAddress}
        setAddAddress={setAddAddress}
        addGstin={addGstin}
        setAddGstin={setAddGstin}
        addBusinessType={addBusinessType}
        setAddBusinessType={setAddBusinessType}
        addTier={addTier}
        setAddTier={setAddTier}
        addDaysValidity={addDaysValidity}
        setAddDaysValidity={setAddDaysValidity}
        isCreatingMerchant={isCreatingMerchant}
        onSubmit={handleAddMerchant}
      />

      {/* 4. Edit Merchant Store Modal */}
      <AdminEditMerchantModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        selectedMerchant={selectedMerchantForEdit}
        editName={editName}
        setEditName={setEditName}
        editOwnerName={editOwnerName}
        setEditOwnerName={setEditOwnerName}
        editPhone={editPhone}
        setEditPhone={setEditPhone}
        editEmail={editEmail}
        setEditEmail={setEditEmail}
        editCity={editCity}
        setEditCity={setEditCity}
        editGstin={editGstin}
        setEditGstin={setEditGstin}
        editTier={editTier}
        setEditTier={setEditTier}
        editDaysExtension={editDaysExtension}
        setEditDaysExtension={setEditDaysExtension}
        editIsActive={editIsActive}
        setEditIsActive={setEditIsActive}
        isUpdatingMerchant={isUpdatingMerchant}
        onSubmit={handleUpdateMerchant}
      />

      {/* 5. Delete Merchant Confirmation Modal */}
      <AdminDeleteMerchantModal
        merchant={merchantToDelete}
        onClose={() => setMerchantToDelete(null)}
        isDeleting={isDeletingMerchant}
        onConfirm={handleDeleteMerchant}
      />

      {/* 6. Merchant 360 View Dossier Modal */}
      <AdminMerchantDrawer
        merchant={selectedMerchantForView}
        onClose={() => setSelectedMerchantForView(null)}
      />

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-slate-700 text-white text-xs font-bold shadow-2xl animate-in slide-in-from-bottom-3 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
