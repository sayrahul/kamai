'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Crown, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Phone, 
  Building2, 
  Calendar, 
  MapPin, 
  Loader2, 
  Plus 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { AdminCoupon } from '@/app/api/admin/coupons/route';
import { PlatformRemoteConfig } from '@/app/api/admin/config/route';
import { clearLocalDexieAndFreshSync } from '@/lib/firebase/firestoreSync';

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
  const [formSupportPhone, setFormSupportPhone] = useState<string>('+919595997711');
  const [formSupportWhatsApp, setFormSupportWhatsApp] = useState<string>('919595997711');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Reset Dexie Cache State
  const [isResettingLocalData, setIsResettingLocalData] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Check existing session
  useEffect(() => {
    const token = localStorage.getItem('kamai_admin_token');
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
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

      if (broadcastRes?.broadcast) {
        setBroadcastEnabled(broadcastRes.broadcast.enabled || false);
        setBroadcastMessage(broadcastRes.broadcast.message || '');
        setBroadcastType(broadcastRes.broadcast.type || 'festive');
        setBroadcastLink(broadcastRes.broadcast.link || '/pricing');
      }

      if (configRes?.config) {
        setConfig(configRes.config);
        setFormMaintenanceMode(configRes.config.maintenance_mode || false);
        setFormMaintenanceMessage(configRes.config.maintenance_message || '');
        setFormAnnualPrice(configRes.config.annual_pro_price || 1499);
        setFormMonthlyPrice(configRes.config.monthly_pro_price || 199);
        setFormSupportPhone(configRes.config.support_phone || '+919595997711');
        setFormSupportWhatsApp(configRes.config.support_whatsapp || '919595997711');
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
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('kamai_admin_token', data.token);
        setIsAuthenticated(true);
        showToast('🔓 SuperAdmin Access Granted');
      } else {
        setAuthError(data.error || 'Invalid Admin Password');
      }
    } catch (err: any) {
      setAuthError('Connection failed: ' + err?.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
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
    if (!newCouponCode.trim()) return;
    setIsCreatingCoupon(true);

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCouponCode.trim().toUpperCase(),
          discount_type: newCouponType,
          discount_value: Number(newCouponValue),
          max_discount: Number(newCouponMaxDiscount),
          min_order_amount: Number(newCouponMinOrder),
          max_uses: Number(newCouponMaxUses),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`✅ Promo code "${newCouponCode.toUpperCase()}" created!`);
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
    setIsSendingOutreach(true);

    try {
      const res = await fetch('/api/admin/whatsapp/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: waTestPhone,
          template: waTemplate,
          customText: waCustomText,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`✅ WhatsApp outreach delivered to +91${waTestPhone}!`);
      } else {
        // Fallback wa.me
        window.open(`https://wa.me/91${waTestPhone.replace(/\D/g, '')}?text=${encodeURIComponent(waCustomText)}`, '_blank');
        showToast('📲 Opened WhatsApp chat!');
      }
    } catch (err) {
      window.open(`https://wa.me/91${waTestPhone.replace(/\D/g, '')}?text=${encodeURIComponent(waCustomText)}`, '_blank');
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
          support_phone: formSupportPhone,
          support_whatsapp: formSupportWhatsApp,
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

  // Quick Grant Pro
  const handleGrantProLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhoneOrId.trim()) return;

    try {
      const res = await fetch('/api/admin/merchants/grant-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: manualPhoneOrId.trim(),
          tier: manualTier,
          durationDays: manualDurationDays,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`👑 Pro subscription granted to ${manualPhoneOrId}!`);
        setIsManualSubModalOpen(false);
        setManualPhoneOrId('');
        fetchAdminData();
      } else {
        showToast('⚠️ ' + (data.error || 'Failed to grant license'));
      }
    } catch (err) {
      showToast('⚠️ Connection error');
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
    <div className="space-y-4 pb-20 animate-in fade-in duration-150">
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
          onSendWhatsApp={(m) => {
            window.open(`https://wa.me/91${m.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${m.name || 'Merchant'}! Special update from KamaiPlus Master Support.`)}`, '_blank');
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
          formAnnualPrice={formAnnualPrice}
          setFormAnnualPrice={setFormAnnualPrice}
          formMonthlyPrice={formMonthlyPrice}
          setFormMonthlyPrice={setFormMonthlyPrice}
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

      {/* ---------------- MODALS ---------------- */}
      {/* 1. Quick Pro License Modal */}
      <Modal
        isOpen={isManualSubModalOpen}
        onClose={() => setIsManualSubModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <span>Grant Pro License to Store</span>
          </div>
        }
        description="Directly assign a Pro / Growth subscription to any merchant by mobile number or store ID."
      >
        <form onSubmit={handleGrantProLicense} className="space-y-3.5">
          <Input
            label="Merchant Mobile Phone or Store ID *"
            placeholder="e.g. 9876543210 or biz_123"
            value={manualPhoneOrId}
            onChange={(e) => setManualPhoneOrId(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subscription Plan
              </label>
              <select
                value={manualTier}
                onChange={(e) => setManualTier(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value="pro">Pro Plan (1 Year)</option>
                <option value="growth">Growth Plan</option>
                <option value="enterprise">Enterprise Plan</option>
                <option value="free">Revert to Free</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Duration (Days)
              </label>
              <select
                value={manualDurationDays}
                onChange={(e) => setManualDurationDays(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value={30}>30 Days (1 Month)</option>
                <option value={90}>90 Days (3 Months)</option>
                <option value={365}>365 Days (1 Year)</option>
                <option value={730}>730 Days (2 Years)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsManualSubModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black">
              Grant Pro License
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Create Promo Coupon Modal */}
      <Modal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        title="Create Promo Discount Coupon"
        description="Offer a percentage or flat cash discount on KamaiPlus Pro subscription checkouts."
      >
        <form onSubmit={handleCreateCoupon} className="space-y-3.5">
          <Input
            label="Coupon Code *"
            placeholder="e.g. DIWALI50 or PRO20"
            value={newCouponCode}
            onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Discount Type
              </label>
              <select
                value={newCouponType}
                onChange={(e) => setNewCouponType(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value="percentage">Percentage (% OFF)</option>
                <option value="flat">Flat Cash (₹ OFF)</option>
              </select>
            </div>

            <Input
              label={newCouponType === 'percentage' ? 'Discount Value (%)' : 'Discount Value (₹)'}
              type="number"
              value={String(newCouponValue)}
              onChange={(e) => setNewCouponValue(Number(e.target.value))}
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCouponModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingCoupon} className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-black">
              {isCreatingCoupon ? 'Creating...' : 'Create Coupon'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-slate-700 text-white text-xs font-bold shadow-2xl animate-in slide-in-from-bottom-3 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
