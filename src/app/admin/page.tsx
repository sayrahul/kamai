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

  // Add Merchant
  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addPhone.trim()) {
      showToast('⚠️ Store Name and Phone are required');
      return;
    }
    setIsCreatingMerchant(true);

    try {
      const res = await fetch('/api/admin/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          owner_name: addOwnerName.trim(),
          phone: addPhone.trim(),
          email: addEmail.trim(),
          city: addCity.trim(),
          address: addAddress.trim(),
          gstin: addGstin.trim(),
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
    setIsUpdatingMerchant(true);

    try {
      const res = await fetch(`/api/admin/merchants/${selectedMerchantForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          owner_name: editOwnerName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim(),
          city: editCity.trim(),
          address: editAddress.trim(),
          gstin: editGstin.trim(),
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

      {/* 3. Add Merchant Store Modal */}
      <Modal
        isOpen={isAddMerchantModalOpen}
        onClose={() => setIsAddMerchantModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-500" />
            <span>Onboard New Merchant Store</span>
          </div>
        }
        description="Register a new retail shop, assign initial subscription tier, and provision credentials."
      >
        <form onSubmit={handleAddMerchant} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Store / Business Name *"
              placeholder="e.g. Ramesh Supermart"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Owner Full Name"
              placeholder="e.g. Ramesh Gupta"
              value={addOwnerName}
              onChange={(e) => setAddOwnerName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number (10-Digit WhatsApp) *"
              placeholder="e.g. 9876543210"
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              required
            />
            <Input
              label="Owner Email Address"
              placeholder="e.g. store@example.com"
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="City / Town"
              placeholder="e.g. Pune"
              value={addCity}
              onChange={(e) => setAddCity(e.target.value)}
            />
            <Input
              label="Address / Area"
              placeholder="e.g. MG Road, Camp"
              value={addAddress}
              onChange={(e) => setAddAddress(e.target.value)}
            />
            <Input
              label="GSTIN Number"
              placeholder="e.g. 27AAAAA0000A1Z5"
              value={addGstin}
              onChange={(e) => setAddGstin(e.target.value.toUpperCase())}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Store Category
              </label>
              <select
                value={addBusinessType}
                onChange={(e) => setAddBusinessType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value="grocery">Grocery / Kirana</option>
                <option value="clothing">Apparel / Clothing</option>
                <option value="electronics">Electronics &amp; Mobile</option>
                <option value="restaurant">Cafe / Restaurant</option>
                <option value="pharmacy">Pharmacy / Medical</option>
                <option value="hardware">Hardware &amp; Electrical</option>
                <option value="other">General Retail</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Initial Plan
              </label>
              <select
                value={addTier}
                onChange={(e) => setAddTier(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value="free">Free Forever (₹0)</option>
                <option value="pro">Pro Plan</option>
                <option value="growth">Growth Plan</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Validity (Days)
              </label>
              <select
                value={addDaysValidity}
                onChange={(e) => setAddDaysValidity(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value={30}>30 Days</option>
                <option value={90}>90 Days</option>
                <option value={365}>365 Days (1 Year)</option>
                <option value={730}>730 Days (2 Years)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAddMerchantModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingMerchant} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black">
              {isCreatingMerchant ? 'Creating...' : 'Create Merchant'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Edit Merchant Store Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-indigo-500" />
            <span>Edit Merchant Store: {selectedMerchantForEdit?.name}</span>
          </div>
        }
        description="Update merchant account details, extend subscription validity, or toggle access status."
      >
        <form onSubmit={handleUpdateMerchant} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Store / Business Name *"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <Input
              label="Owner Full Name"
              value={editOwnerName}
              onChange={(e) => setEditOwnerName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              required
            />
            <Input
              label="Owner Email Address"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="City / Town"
              value={editCity}
              onChange={(e) => setEditCity(e.target.value)}
            />
            <Input
              label="GSTIN Number"
              value={editGstin}
              onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subscription Plan
              </label>
              <select
                value={editTier}
                onChange={(e) => setEditTier(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value="free">Free Forever</option>
                <option value="pro">Pro Plan</option>
                <option value="growth">Growth Plan</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Extend Expiry (+Days)
              </label>
              <select
                value={editDaysExtension}
                onChange={(e) => setEditDaysExtension(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value={0}>No change</option>
                <option value={30}>+30 Days (1 Month)</option>
                <option value={90}>+90 Days (3 Months)</option>
                <option value={365}>+365 Days (1 Year)</option>
                <option value={730}>+730 Days (2 Years)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Account Status
              </label>
              <select
                value={editIsActive ? 'active' : 'inactive'}
                onChange={(e) => setEditIsActive(e.target.value === 'active')}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value="active">Active (Access Allowed)</option>
                <option value="inactive">Frozen / Blocked</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdatingMerchant} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black">
              {isUpdatingMerchant ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Delete Merchant Confirmation Modal */}
      <Modal
        isOpen={Boolean(merchantToDelete)}
        onClose={() => setMerchantToDelete(null)}
        title={
          <div className="flex items-center gap-2 text-rose-600">
            <Trash2 className="w-5 h-5" />
            <span>Permanently Delete Merchant Store?</span>
          </div>
        }
        description={`Are you sure you want to delete "${merchantToDelete?.name}" (+91${merchantToDelete?.phone})? This will wipe cloud store records and cannot be undone.`}
      >
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setMerchantToDelete(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isDeletingMerchant}
            onClick={handleDeleteMerchant}
            className="bg-rose-600 hover:bg-rose-700 text-white font-black"
          >
            {isDeletingMerchant ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </div>
      </Modal>

      {/* 6. Merchant 360 View Dossier Modal */}
      <Modal
        isOpen={Boolean(selectedMerchantForView)}
        onClose={() => setSelectedMerchantForView(null)}
        title={
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Store Dossier: {selectedMerchantForView?.name}</span>
          </div>
        }
        description="Comprehensive 360-degree merchant platform profile and sync metadata."
      >
        {selectedMerchantForView && (
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Store Name</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedMerchantForView.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Owner Name</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedMerchantForView.owner_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile Phone</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">+91 {selectedMerchantForView.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedMerchantForView.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">City / Location</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedMerchantForView.city || 'India'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">GSTIN</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedMerchantForView.gstin || 'Unregistered'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Subscription Tier</span>
                <span className="font-black uppercase text-amber-600 dark:text-amber-400">{selectedMerchantForView.subscription_tier}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Store ID</span>
                <span className="font-mono text-[10px] text-slate-500 truncate block">{selectedMerchantForView.id}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  window.open(`https://wa.me/91${selectedMerchantForView.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${selectedMerchantForView.name}! Special update from KamaiPlus Master Support.`)}`, '_blank');
                }}
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs font-bold gap-1"
              >
                <span>WhatsApp Merchant</span>
              </Button>
              <Button
                type="button"
                onClick={() => setSelectedMerchantForView(null)}
                className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        )}
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
