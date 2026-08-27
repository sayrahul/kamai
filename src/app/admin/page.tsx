'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Lock, 
  Users, 
  Store, 
  TrendingUp, 
  Search, 
  Download, 
  MessageCircle, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Crown, 
  RefreshCw, 
  LogOut, 
  ExternalLink,
  ChevronRight,
  Sparkles, 
  Sliders, 
  BellRing, 
  Phone, 
  Building2, 
  Calendar, 
  Layers, 
  ArrowUpDown, 
  Radio, 
  ToggleLeft, 
  ToggleRight, 
  Activity, 
  CreditCard, 
  Send, 
  Database, 
  Server, 
  Eye, 
  Trash2, 
  Ban, 
  Check, 
  Plus, 
  Tag, 
  Gift, 
  HelpCircle, 
  AlertTriangle, 
  Flame, 
  FileSpreadsheet, 
  X, 
  Clock, 
  Filter, 
  BarChart3, 
  Percent, 
  CheckSquare, 
  Globe, 
  Mail, 
  MapPin, 
  Menu, 
  QrCode, 
  Barcode, 
  ShoppingBag, 
  ArrowUpRight,
  Copy,
  CheckCheck,
  Smartphone,
  Monitor,
  ChevronDown,
  Wrench,
  FileText,
  IndianRupee
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/utils';
import { AdminCoupon } from '@/app/api/admin/coupons/route';
import { PlatformRemoteConfig } from '@/app/api/admin/config/route';
import { clearLocalDexieAndFreshSync } from '@/lib/firebase/firestoreSync';
import { GlobalBroadcastBanner } from '@/components/common/GlobalBroadcastBanner';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'merchants' | 'broadcast' | 'coupons' | 'whatsapp' | 'revenue' | 'config'>('overview');

  // Mobile Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Filters & Search for Merchants
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [merchantSortBy, setMerchantSortBy] = useState<'newest' | 'name' | 'tier'>('newest');

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
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Reset Dexie Cache State
  const [isResettingLocalData, setIsResettingLocalData] = useState<boolean>(false);
  const [resetStats, setResetStats] = useState<Record<string, number> | null>(null);
  const [customResetBizId, setCustomResetBizId] = useState<string>('');

  // Helper for toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/admin/session');
        const data = await res.json();
        setIsAuthenticated(!!data.authenticated);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkSession();
  }, []);

  // Load dashboard datasets when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAllAdminData();
    }
  }, [isAuthenticated]);

  const loadAllAdminData = async () => {
    setIsLoadingData(true);
    try {
      // 1. Metrics
      const mRes = await fetch('/api/admin/metrics');
      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData.metrics) setMetrics(mData.metrics);
      }

      // 2. Merchants
      const merRes = await fetch('/api/admin/merchants');
      if (merRes.ok) {
        const merData = await merRes.json();
        if (merData.merchants) setMerchants(merData.merchants);
      }

      // 3. Transactions
      const txRes = await fetch('/api/admin/transactions');
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData.transactions) setTransactions(txData.transactions);
      }

      // 4. Coupons
      const coupRes = await fetch('/api/admin/coupons');
      if (coupRes.ok) {
        const cData = await coupRes.json();
        if (cData.coupons) setCoupons(cData.coupons);
      }

      // 5. Remote Config
      const configRes = await fetch('/api/admin/config');
      if (configRes.ok) {
        const confData = await configRes.json();
        if (confData.config) {
          const c = confData.config;
          setConfig(c);
          if (c.maintenanceMode !== undefined) setFormMaintenanceMode(c.maintenanceMode);
          if (c.maintenanceMessage) setFormMaintenanceMessage(c.maintenanceMessage);
          if (c.razorpayGatewayEnabled !== undefined) setFormRazorpayGateway(c.razorpayGatewayEnabled);
          if (c.cloudSyncEnabled !== undefined) setFormCloudSync(c.cloudSyncEnabled);
          if (c.barcodeGeneratorEnabled !== undefined) setFormBarcodeGenerator(c.barcodeGeneratorEnabled);
          if (c.growthMarketingEnabled !== undefined) setFormGrowthMarketing(c.growthMarketingEnabled);
          if (c.gstReportsEnabled !== undefined) setFormGstReports(c.gstReportsEnabled);
          if (c.proAnnualPrice) setFormAnnualPrice(c.proAnnualPrice);
          if (c.proMonthlyPrice) setFormMonthlyPrice(c.proMonthlyPrice);
          if (c.freeHoldBillsLimit !== undefined) setFormHoldBillsLimit(c.freeHoldBillsLimit);
          if (c.freeHistoryDaysLimit !== undefined) setFormHistoryDaysLimit(c.freeHistoryDaysLimit);
          if (c.supportPhone) setFormSupportPhone(c.supportPhone);
          if (c.supportWhatsApp) setFormSupportWhatsApp(c.supportWhatsApp);
        }
      }

      // 6. Broadcast Announcement
      const bRes = await fetch('/api/admin/broadcast');
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData.announcement) {
          const a = bData.announcement;
          setBroadcastEnabled(Boolean(a.enabled));
          if (a.message) setBroadcastMessage(a.message);
          if (a.type) setBroadcastType(a.type);
          if (a.link) setBroadcastLink(a.link);
          if (a.expires_at) setCustomBroadcastExpiry(a.expires_at);
        }
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Filtered & Sorted Merchants List
  const filteredMerchants = useMemo(() => {
    let result = merchants.filter((m) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (m.name || '').toLowerCase().includes(q);
        const ownerMatch = (m.owner_name || '').toLowerCase().includes(q);
        const phoneMatch = (m.phone || '').includes(q);
        const emailMatch = (m.email || '').toLowerCase().includes(q);
        const cityMatch = (m.city || '').toLowerCase().includes(q);
        const gstinMatch = (m.gstin || '').toLowerCase().includes(q);
        if (!nameMatch && !ownerMatch && !phoneMatch && !emailMatch && !cityMatch && !gstinMatch) return false;
      }
      // Tier
      if (selectedTierFilter !== 'all' && (m.subscription_tier || 'free').toLowerCase() !== selectedTierFilter.toLowerCase()) {
        return false;
      }
      // Status
      if (selectedStatusFilter === 'active' && !m.is_active) return false;
      if (selectedStatusFilter === 'frozen' && m.is_active) return false;
      return true;
    });

    // Sort
    if (merchantSortBy === 'name') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (merchantSortBy === 'tier') {
      const tierRank: Record<string, number> = { enterprise: 3, pro: 2, growth: 2, free: 1 };
      result.sort((a, b) => (tierRank[b.subscription_tier] || 1) - (tierRank[a.subscription_tier] || 1));
    } else {
      result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    return result;
  }, [merchants, searchQuery, selectedTierFilter, selectedStatusFilter, merchantSortBy]);

  // Financial KPI Metrics
  const totalProCount = merchants.filter((m) => m.subscription_tier === 'pro' || m.subscription_tier === 'enterprise').length;
  const totalFreeCount = merchants.filter((m) => m.subscription_tier === 'free').length;
  const activeCount = merchants.filter((m) => m.is_active).length;
  const frozenCount = merchants.filter((m) => !m.is_active).length;
  const calculatedMRR = totalProCount * (config?.proMonthlyPrice || formMonthlyPrice || 199);
  const calculatedARR = calculatedMRR * 12;
  const totalRevenueCollected = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await res.json();
      if (res.ok && data.authenticated) {
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        setAuthError(data.message || 'Incorrect SuperAdmin password');
      }
    } catch {
      setAuthError('Connection error verifying credentials');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
  };

  const handleOpenEditModal = (merchant: MerchantRecord) => {
    setSelectedMerchantForEdit(merchant);
    setEditName(merchant.name || '');
    setEditOwnerName(merchant.owner_name || '');
    setEditPhone(merchant.phone || '');
    setEditEmail(merchant.email || '');
    setEditCity(merchant.city || '');
    setEditAddress(merchant.address || '');
    setEditGstin(merchant.gstin || '');
    setEditBusinessType(merchant.business_type || 'grocery');
    setEditTier(merchant.subscription_tier || 'free');
    setEditDaysExtension(30);
    setEditIsActive(merchant.is_active !== false);
    setIsEditModalOpen(true);
  };

  const handleSaveMerchantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchantForEdit) return;
    setIsUpdatingMerchant(true);

    try {
      let expiresAt: string | null = selectedMerchantForEdit.subscription_expires_at || null;
      if (editTier !== 'free') {
        const baseDate = expiresAt && new Date(expiresAt).getTime() > Date.now() ? new Date(expiresAt) : new Date();
        baseDate.setDate(baseDate.getDate() + (Number(editDaysExtension) || 0));
        expiresAt = baseDate.toISOString();
      } else {
        expiresAt = null;
      }

      const res = await fetch(`/api/admin/merchants/${selectedMerchantForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          owner_name: editOwnerName,
          phone: editPhone,
          email: editEmail,
          city: editCity,
          address: editAddress,
          gstin: editGstin,
          business_type: editBusinessType,
          subscription_tier: editTier,
          subscription_expires_at: expiresAt,
          is_active: editIsActive,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMerchants((prev) =>
          prev.map((m) =>
            m.id === selectedMerchantForEdit.id
              ? {
                  ...m,
                  name: editName,
                  owner_name: editOwnerName,
                  phone: editPhone,
                  email: editEmail,
                  city: editCity,
                  address: editAddress,
                  gstin: editGstin,
                  business_type: editBusinessType,
                  subscription_tier: editTier as any,
                  subscription_expires_at: expiresAt || undefined,
                  is_active: editIsActive,
                }
              : m
          )
        );
        setIsEditModalOpen(false);
        showToast(`Updated store "${editName}" successfully!`);
      } else {
        alert(data.message || 'Failed to update merchant');
      }
    } catch {
      alert('Error updating merchant profile');
    } finally {
      setIsUpdatingMerchant(false);
    }
  };

  const handleCreateNewMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addPhone.trim()) {
      alert('Store Name and Phone Number are required.');
      return;
    }

    setIsCreatingMerchant(true);
    try {
      const res = await fetch('/api/admin/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName,
          owner_name: addOwnerName,
          phone: addPhone,
          email: addEmail,
          city: addCity,
          address: addAddress,
          gstin: addGstin,
          business_type: addBusinessType,
          subscription_tier: addTier,
          days_validity: addDaysValidity,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.merchant) {
        setMerchants((prev) => [data.merchant, ...prev]);
        setIsAddMerchantModalOpen(false);
        setAddName('');
        setAddOwnerName('');
        setAddPhone('');
        setAddEmail('');
        setAddCity('');
        setAddAddress('');
        setAddGstin('');
        showToast(`New store "${data.merchant.name}" created successfully!`);
      } else {
        alert(data.message || data.error || 'Failed to create merchant');
      }
    } catch {
      alert('Error creating merchant');
    } finally {
      setIsCreatingMerchant(false);
    }
  };

  const handleToggleFreezeMerchant = async (m: MerchantRecord) => {
    const nextActive = !m.is_active;
    try {
      const res = await fetch(`/api/admin/merchants/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive }),
      });

      if (res.ok) {
        setMerchants((prev) =>
          prev.map((item) => (item.id === m.id ? { ...item, is_active: nextActive } : item))
        );
        showToast(`Store "${m.name}" is now ${nextActive ? 'ACTIVE' : 'FROZEN'}`);
      }
    } catch {
      alert('Failed to toggle merchant status');
    }
  };

  const handleQuickExtendValidity = async (m: MerchantRecord, days: number) => {
    try {
      const now = new Date();
      const currentExp = m.subscription_expires_at ? new Date(m.subscription_expires_at) : now;
      const baseDate = currentExp.getTime() > now.getTime() ? currentExp : now;
      baseDate.setDate(baseDate.getDate() + days);
      const newExpiry = baseDate.toISOString();

      const res = await fetch(`/api/admin/merchants/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_tier: 'pro',
          subscription_expires_at: newExpiry,
          days_extension: days,
        }),
      });

      if (res.ok) {
        setMerchants((prev) =>
          prev.map((item) =>
            item.id === m.id
              ? { ...item, subscription_tier: 'pro', subscription_expires_at: newExpiry }
              : item
          )
        );
        showToast(`Extended ${m.name} by +${days} days (Pro active)`);
      }
    } catch {
      alert('Failed to extend validity');
    }
  };

  const handleDeleteMerchantConfirm = async () => {
    if (!merchantToDelete) return;
    setIsDeletingMerchant(true);

    try {
      const res = await fetch(`/api/admin/merchants/${merchantToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMerchants((prev) => prev.filter((item) => item.id !== merchantToDelete.id));
        showToast(`Store "${merchantToDelete.name}" permanently deleted.`);
        setMerchantToDelete(null);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete merchant');
      }
    } catch {
      alert('Network error deleting merchant');
    } finally {
      setIsDeletingMerchant(false);
    }
  };

  const handlePublishBroadcast = async (shouldEnable: boolean = true) => {
    if (shouldEnable && !broadcastMessage.trim()) {
      alert('Please enter an announcement headline or message before publishing.');
      return;
    }

    setIsSavingBroadcast(true);
    try {
      let expiresAt: string | null = null;
      if (broadcastDuration === '24h') {
        expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else if (broadcastDuration === '3d') {
        expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      } else if (broadcastDuration === '7d') {
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (broadcastDuration === 'custom' && customBroadcastExpiry) {
        expiresAt = new Date(customBroadcastExpiry).toISOString();
      }

      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: shouldEnable,
          message: broadcastMessage.trim(),
          type: broadcastType,
          link: broadcastLink.trim(),
          expires_at: expiresAt,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBroadcastEnabled(shouldEnable);

        // 1. Write to localStorage for instant synchronous hydration across all POS tabs
        if (data.announcement) {
          localStorage.setItem('kamai_broadcast_announcement', JSON.stringify(data.announcement));
        }
        localStorage.setItem('kamai_last_broadcast_sync', Date.now().toString());

        // 2. BroadcastChannel instant sync to all open tabs without delay
        try {
          const bc = new BroadcastChannel('kamai_broadcast_channel');
          bc.postMessage({ type: 'BROADCAST_UPDATED', announcement: data.announcement });
          bc.close();
        } catch { }

        // 3. Clear dismissed key in session so it pops up immediately
        sessionStorage.removeItem('kamai_dismissed_broadcast_key');

        // 4. Trigger window events
        window.dispatchEvent(new Event('broadcast_updated'));

        showToast(
          shouldEnable
            ? '🚀 Live broadcast published! Displayed on all active merchant POS counters.'
            : '⏹️ Broadcast disabled. Removed from all merchant POS counters.'
        );
      } else {
        alert(data.message || 'Failed to publish broadcast');
      }
    } catch {
      alert('Network error publishing broadcast');
    } finally {
      setIsSavingBroadcast(false);
    }
  };

  const handleSaveFullRemoteConfig = async () => {
    setIsSavingConfig(true);
    try {
      const payload: Partial<PlatformRemoteConfig> = {
        maintenanceMode: formMaintenanceMode,
        maintenanceMessage: formMaintenanceMessage,
        razorpayGatewayEnabled: formRazorpayGateway,
        cloudSyncEnabled: formCloudSync,
        barcodeGeneratorEnabled: formBarcodeGenerator,
        growthMarketingEnabled: formGrowthMarketing,
        gstReportsEnabled: formGstReports,
        proMonthlyPrice: Number(formMonthlyPrice),
        proAnnualPrice: Number(formAnnualPrice),
        freeHoldBillsLimit: Number(formHoldBillsLimit),
        freeHistoryDaysLimit: Number(formHistoryDaysLimit),
        supportPhone: formSupportPhone,
        supportWhatsApp: formSupportWhatsApp,
      };

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
        showToast('✅ Remote platform configuration and feature switches saved live!');
      } else {
        alert('Failed to save remote configuration');
      }
    } catch {
      alert('Network error saving configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponValue) return;
    setIsCreatingCoupon(true);

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCouponCode.trim().toUpperCase(),
          discount_type: newCouponType,
          discount_value: Number(newCouponValue),
          max_discount_amount: Number(newCouponMaxDiscount),
          min_order_amount: Number(newCouponMinOrder),
          max_redemptions: Number(newCouponMaxUses),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCoupons((prev) => [data.coupon, ...prev]);
        setIsCouponModalOpen(false);
        setNewCouponCode('');
        showToast(`🎉 Coupon ${data.coupon.code} created & activated!`);
      } else {
        alert(data.message || data.error || 'Failed to create coupon');
      }
    } catch {
      alert('Network error creating coupon');
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const handleToggleCoupon = async (couponId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: couponId, is_active: !currentActive }),
      });
      if (res.ok) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === couponId ? { ...c, is_active: !currentActive } : c))
        );
        showToast(`Coupon status updated.`);
      }
    } catch {
      alert('Failed to update coupon');
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${couponId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== couponId));
        showToast('Coupon deleted.');
      }
    } catch {
      alert('Failed to delete coupon');
    }
  };

  const handleCopyCoupon = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCouponId(id);
    showToast(`Copied coupon code ${code} to clipboard!`);
    setTimeout(() => setCopiedCouponId(null), 2000);
  };

  const handleExportMerchantsCSV = () => {
    if (merchants.length === 0) {
      alert('No merchants to export.');
      return;
    }
    const headers = ['ID', 'Store Name', 'Owner Name', 'Phone', 'Email', 'City', 'Plan', 'Active Status', 'Created At'];
    const rows = filteredMerchants.map((m) => [
      m.id,
      `"${m.name || ''}"`,
      `"${m.owner_name || ''}"`,
      m.phone,
      m.email || '',
      `"${m.city || ''}"`,
      m.subscription_tier,
      m.is_active ? 'ACTIVE' : 'FROZEN',
      new Date(m.created_at).toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kamaiplus_merchants_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenWhatsAppChat = (phone: string, merchantName: string, customMessage?: string) => {
    const cleanNumber = phone.replace(/\D/g, '');
    const fullNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const defaultText = `Hello ${merchantName}! Greetings from the KamaiPlus SuperAdmin Team. How can we support your retail store today?`;
    const text = encodeURIComponent(customMessage || defaultText);
    window.open(`https://wa.me/${fullNumber}?text=${text}`, '_blank');
  };

  const handleClearLocalDataAndFreshPull = async (targetBizId?: string) => {
    const bizId = targetBizId || customResetBizId || (merchants[0]?.id) || 'biz_default';
    if (
      !confirm(
        `⚠️ CLEAR LOCAL DATA & FRESH CLOUD PULL:\n\nThis will completely wipe local IndexedDB cache on this device (Products, Sales, Khata, Inventory) and freshly pull all latest records from Cloud Firestore for business ${bizId}.\n\nDo you want to proceed?`
      )
    ) {
      return;
    }

    setIsResettingLocalData(true);
    setResetStats(null);
    try {
      const res = await clearLocalDexieAndFreshSync(bizId);
      setResetStats(res.stats);
      showToast(
        `🎉 Local data cleared & fresh sync complete! ${res.stats.products} products, ${res.stats.sales} sales, ${res.stats.customers} customers restored.`
      );
    } catch (err: any) {
      alert(`Local reset and sync failed: ${err.message || 'Check connection'}`);
    } finally {
      setIsResettingLocalData(false);
    }
  };

  // -------------------------------------------------------------
  // VIEW: AUTHENTICATION LOCK SCREEN
  // -------------------------------------------------------------
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#070A11] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400 tracking-wider">Verifying SuperAdmin Authority...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070A11] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-[#070A11] to-[#070A11] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md bg-[#0D121F]/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />
          
          <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mb-3 sm:mb-4 text-amber-400 shadow-inner">
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">KamaiPlus SuperAdmin</h1>
            <p className="text-xs text-slate-400 mt-1 sm:mt-1.5 leading-relaxed">
              Master Platform Authority &amp; Merchant Ecosystem Command
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Master Passkey</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4 text-amber-400" />
                </div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter SuperAdmin passkey"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/30 font-mono transition-all"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isLoggingIn || !passwordInput.trim()}
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black cursor-pointer shadow-lg shadow-amber-400/20 py-3 text-sm"
            >
              {isLoggingIn ? 'Verifying Passkey...' : 'Unlock SuperAdmin Control'}
            </Button>
          </form>

          <div className="mt-6 sm:mt-8 pt-4 border-t border-slate-800 text-center">
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-mono">
              Protected by multi-tier cryptographic token authentication.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: AUTHENTICATED MASTER CONTROL CENTER
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 pb-24 md:pb-16 font-sans antialiased">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 p-3.5 sm:p-4 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs shadow-2xl flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-top-4 duration-200 border border-emerald-400/40">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Live In-App Global Broadcast Banner */}
      <GlobalBroadcastBanner />

      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 bg-[#0B0F17]/95 backdrop-blur-xl border-b border-slate-800/80 px-3 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-400/20 shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-white tracking-tight truncate">
                  KamaiPlus Admin
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                  Master
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Desktop Navigation Bar */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-950/80 border border-slate-800/80 rounded-xl p-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'merchants', label: `Merchants (${merchants.length})`, icon: Store },
              { id: 'broadcast', label: 'Broadcasts', icon: BellRing },
              { id: 'coupons', label: `Coupons (${coupons.length})`, icon: Tag },
              { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
              { id: 'revenue', label: 'Revenue', icon: CreditCard },
              { id: 'config', label: 'Config', icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Quick Tools, Barcode & Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href="/barcode-generator"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all"
              title="Open Barcode & Label Generator"
            >
              <Barcode className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Barcode</span>
            </Link>

            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all"
              title="Open POS Counter"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              <span>POS</span>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={loadAllAdminData}
              disabled={isLoadingData}
              className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-8 px-2 sm:px-2.5 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
            </Button>

            {/* Mobile Menu Trigger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              title="Open Admin Navigation Drawer"
            >
              <Menu className="w-4 h-4" />
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="hidden sm:flex bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs h-8 px-2.5 gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {/* ========================================================================= */}
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {/* Total Merchants */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#101626] to-[#0D121F] border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-bold mb-1 sm:mb-2">
                  <span>Total Merchants</span>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                    <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {merchants.length}
                </div>
                <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 mt-2 font-medium">
                  <span className="text-emerald-400 font-bold">{activeCount} Active</span>
                  <span>•</span>
                  <span className="text-rose-400 font-bold">{frozenCount} Frozen</span>
                </div>
              </div>

              {/* Monthly Run-Rate (MRR) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#101626] to-[#0D121F] border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-bold mb-1 sm:mb-2">
                  <span>Monthly Run-Rate</span>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                  {formatINR(calculatedMRR)}
                </div>
                <div className="text-[10.5px] text-slate-400 mt-2 font-mono truncate">
                  ARR: <span className="text-slate-300 font-bold">{formatINR(calculatedARR)}</span>
                </div>
              </div>

              {/* Active Paid Subscribers */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#101626] to-[#0D121F] border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-bold mb-1 sm:mb-2">
                  <span>Pro Subscribers</span>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                    <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                  {totalProCount}
                </div>
                <div className="text-[10.5px] text-slate-400 mt-2 truncate font-medium">
                  <span>{totalFreeCount} on Free Tier</span>
                </div>
              </div>

              {/* Cloud System Health */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#101626] to-[#0D121F] border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-bold mb-1 sm:mb-2">
                  <span>Cloud Health</span>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate">100% Online</span>
                </div>
                <div className="text-[10.5px] text-slate-400 mt-2 truncate">
                  Firestore &amp; Auth Operational
                </div>
              </div>
            </div>

            {/* Quick Actions Launchpad */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0D121F] border border-slate-800 rounded-2xl shadow-lg">
              <div>
                <h2 className="text-xs sm:text-sm font-black text-white">SuperAdmin Quick Launchpad</h2>
                <p className="text-[11px] text-slate-400">Onboard merchants, publish broadcasts, and manage discount codes</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => setIsAddMerchantModalOpen(true)}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-8.5 px-3 gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Store</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsCouponModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-8.5 px-3 gap-1.5 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Coupon</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setActiveTab('broadcast')}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-8.5 px-3 gap-1.5 cursor-pointer"
                >
                  <BellRing className="w-3.5 h-3.5 text-amber-400" />
                  <span>Broadcast</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleExportMerchantsCSV}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-8.5 px-3 gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </div>

            {/* Recently Joined Merchants Feed */}
            <div className="bg-[#0D121F] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white">Recently Joined Merchants</h3>
                  <p className="text-[11px] text-slate-400">Latest business signups across India</p>
                </div>
                <button
                  onClick={() => setActiveTab('merchants')}
                  className="text-xs font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>View All ({merchants.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-800/60">
                {merchants.slice(0, 6).map((m) => (
                  <div key={m.id} className="py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 text-xs hover:bg-slate-800/20 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-black text-xs shrink-0 shadow-inner">
                        {(m.name || 'Store').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate text-xs sm:text-sm">{m.name}</div>
                        <div className="text-slate-400 font-mono text-[10.5px] truncate">
                          {m.owner_name ? `${m.owner_name} • ` : ''}{m.phone} {m.city ? `(${m.city})` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase ${
                        m.subscription_tier === 'pro' || m.subscription_tier === 'enterprise'
                          ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {m.subscription_tier}
                      </span>
                      <button
                        onClick={() => handleOpenWhatsAppChat(m.phone, m.name)}
                        className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                        title="Chat with merchant on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MERCHANTS DIRECTORY & 360° CONTROL */}
        {/* ========================================================================= */}
        {activeTab === 'merchants' && (
          <div className="space-y-4">
            {/* Search & Filter Toolbar */}
            <div className="bg-[#0D121F] border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search store name, phone, owner, city, GSTIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto flex-wrap sm:flex-nowrap">
                <select
                  value={selectedTierFilter}
                  onChange={(e) => setSelectedTierFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:border-amber-400 focus:outline-none cursor-pointer shrink-0 font-medium"
                >
                  <option value="all">All Plans</option>
                  <option value="free">Free Plan</option>
                  <option value="pro">Pro Plan</option>
                  <option value="enterprise">Enterprise</option>
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:border-amber-400 focus:outline-none cursor-pointer shrink-0 font-medium"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="frozen">Frozen Only</option>
                </select>

                <select
                  value={merchantSortBy}
                  onChange={(e) => setMerchantSortBy(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:border-amber-400 focus:outline-none cursor-pointer shrink-0 font-medium"
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="name">Sort: Name</option>
                  <option value="tier">Sort: Plan</option>
                </select>

                <Button
                  size="sm"
                  onClick={() => setIsAddMerchantModalOpen(true)}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-8.5 px-3 gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Store</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleExportMerchantsCSV}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold h-8.5 px-3 gap-1.5 cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            </div>

            {/* Merchants Data Table */}
            <div className="bg-[#0D121F] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Store &amp; Category</th>
                      <th className="py-3.5 px-4">Owner &amp; Phone</th>
                      <th className="py-3.5 px-4">City / State</th>
                      <th className="py-3.5 px-4">Plan &amp; Validity</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Root Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredMerchants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                          No merchants matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMerchants.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 font-black flex items-center justify-center text-xs shrink-0">
                                {(m.name || 'Store').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-white text-xs">{m.name}</div>
                                <div className="text-slate-400 text-[10.5px] uppercase font-mono tracking-wider">{m.business_type || 'General'}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono">
                            <div className="text-slate-200 font-bold">{m.phone}</div>
                            <div className="text-slate-400 text-[10.5px]">{m.owner_name || 'Owner not set'}</div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-400">
                            <div>{m.city || '-'}</div>
                            {m.gstin && (
                              <div className="text-[10px] text-amber-400/80 font-mono">GST: {m.gstin}</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                m.subscription_tier === 'pro' || m.subscription_tier === 'enterprise'
                                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {m.subscription_tier}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {m.subscription_expires_at
                                ? `Expires: ${new Date(m.subscription_expires_at).toLocaleDateString()}`
                                : 'Forever Free'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleFreezeMerchant(m)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition flex items-center gap-1.5 ${
                                m.is_active
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                              }`}
                              title={m.is_active ? 'Click to Freeze Store' : 'Click to Unfreeze Store'}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              <span>{m.is_active ? 'Active' : 'Frozen'}</span>
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Plan Extension */}
                              <button
                                onClick={() => handleQuickExtendValidity(m, 30)}
                                className="px-2 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 text-[10.5px] font-bold border border-amber-400/30 cursor-pointer"
                                title="Quick Extend Pro (+30 Days)"
                              >
                                +30d
                              </button>

                              {/* WhatsApp Chat */}
                              <button
                                onClick={() => handleOpenWhatsAppChat(m.phone, m.name)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 cursor-pointer"
                                title="Open WhatsApp Chat"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Profile & Plan */}
                              <button
                                onClick={() => handleOpenEditModal(m)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                                title="Edit Store Profile & Subscription"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Merchant */}
                              <button
                                onClick={() => setMerchantToDelete(m)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                                title="Permanently Delete Store"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LIVE BROADCAST COMMAND CENTER */}
        {/* ========================================================================= */}
        {activeTab === 'broadcast' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Composer */}
              <div className="lg:col-span-7 bg-[#0D121F] border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-amber-400" />
                      <span>Live POS Broadcast Banner Composer</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Publish instant announcements atop all active merchant POS counters across India in real time.
                    </p>
                  </div>

                  <div className="shrink-0">
                    {broadcastEnabled ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>LIVE ON POS COUNTERS</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        <span>INACTIVE / DRAFT</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick 1-Click Presets */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Quick Announcement Presets</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastType('festive');
                        setBroadcastMessage('✨ Big Festive Sale! Upgrade to KamaiPlus Pro for near-expiry radar & CA tax filing.');
                        setBroadcastLink('/pricing');
                      }}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-400/40 text-left transition cursor-pointer"
                    >
                      <div className="text-[11px] font-black text-amber-400">✨ Festive Offer</div>
                      <div className="text-[9.5px] text-slate-400 truncate">Pro upgrade discount</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastType('warning');
                        setBroadcastMessage('⚠️ Scheduled Cloud Optimization tonight 11:00 PM - 11:30 PM. Offline billing continues as usual.');
                        setBroadcastLink('');
                      }}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-400/40 text-left transition cursor-pointer"
                    >
                      <div className="text-[11px] font-black text-rose-400">⚠️ Maintenance</div>
                      <div className="text-[9.5px] text-slate-400 truncate">Cloud sync advisory</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastType('success');
                        setBroadcastMessage('🚀 Instant GST Tax Filing & Thermal Barcode Sticker printing now live on KamaiPlus!');
                        setBroadcastLink('/barcode-generator');
                      }}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-400/40 text-left transition cursor-pointer"
                    >
                      <div className="text-[11px] font-black text-emerald-400">🚀 New Feature</div>
                      <div className="text-[9.5px] text-slate-400 truncate">GST &amp; Barcode labels</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastType('info');
                        setBroadcastMessage('📢 Daily Reminder: Verify cash drawer & print Day-End closing report before closing shop.');
                        setBroadcastLink('');
                      }}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-400/40 text-left transition cursor-pointer"
                    >
                      <div className="text-[11px] font-black text-blue-400">📢 Store Checklist</div>
                      <div className="text-[9.5px] text-slate-400 truncate">Day-end closing tip</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-3.5 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300">Announcement Headline / Message *</label>
                      <span className="text-[10px] text-slate-500 font-mono">{broadcastMessage.length} chars</span>
                    </div>
                    <textarea
                      rows={3}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="e.g. ✨ Special Diwali Offer! Upgrade to KamaiPlus Pro for 50% OFF with coupon PRO50."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Theme / Alert Type</label>
                      <select
                        value={broadcastType}
                        onChange={(e) => setBroadcastType(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:border-amber-400 focus:outline-none"
                      >
                        <option value="festive">✨ Festive Gold (Promotions &amp; Celebrations)</option>
                        <option value="info">ℹ️ Indigo Info (General Announcements)</option>
                        <option value="success">✅ Emerald Success (New Feature Releases)</option>
                        <option value="warning">⚠️ Crimson Warning (Urgent Maintenance / Radar)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Call-To-Action Link (Optional)</label>
                      <input
                        type="text"
                        value={broadcastLink}
                        onChange={(e) => setBroadcastLink(e.target.value)}
                        placeholder="e.g. /pricing, /barcode-generator or https://..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                      />
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                        <span>Quick:</span>
                        <button type="button" onClick={() => setBroadcastLink('/pricing')} className="hover:text-amber-400 underline">/pricing</button>
                        <span>•</span>
                        <button type="button" onClick={() => setBroadcastLink('/barcode-generator')} className="hover:text-amber-400 underline">/barcode-generator</button>
                        <span>•</span>
                        <button type="button" onClick={() => setBroadcastLink('')} className="hover:text-amber-400 underline">Clear</button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Broadcast Expiration Schedule</label>
                      <select
                        value={broadcastDuration}
                        onChange={(e) => setBroadcastDuration(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:border-amber-400 focus:outline-none"
                      >
                        <option value="always">Continuous (Until Manually Stopped)</option>
                        <option value="24h">24 Hours from now</option>
                        <option value="3d">3 Days</option>
                        <option value="7d">7 Days (Full Week)</option>
                        <option value="custom">Custom Expiry Date</option>
                      </select>
                    </div>

                    {broadcastDuration === 'custom' && (
                      <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1">Custom Expiry Date</label>
                        <input
                          type="datetime-local"
                          value={customBroadcastExpiry}
                          onChange={(e) => setCustomBroadcastExpiry(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Primary Action Buttons: Publish vs Stop */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <Button
                      onClick={() => handlePublishBroadcast(true)}
                      disabled={isSavingBroadcast || !broadcastMessage.trim()}
                      className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs py-3 gap-2 cursor-pointer shadow-lg shadow-amber-400/20"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSavingBroadcast ? 'Publishing Live...' : '🚀 Publish Live to POS Counters'}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePublishBroadcast(false)}
                      disabled={isSavingBroadcast || !broadcastEnabled}
                      className="bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs py-3 px-4 gap-1.5 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>⏹️ Disable Broadcast</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Device Preview */}
              <div className="lg:col-span-5 bg-[#0D121F] border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Live Screen Simulation</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Live preview of counter appearance</p>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setBroadcastPreviewDevice('mobile')}
                      className={`p-1.5 rounded text-xs cursor-pointer ${
                        broadcastPreviewDevice === 'mobile' ? 'bg-slate-800 text-white' : 'text-slate-500'
                      }`}
                      title="Mobile View"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setBroadcastPreviewDevice('desktop')}
                      className={`p-1.5 rounded text-xs cursor-pointer ${
                        broadcastPreviewDevice === 'desktop' ? 'bg-slate-800 text-white' : 'text-slate-500'
                      }`}
                      title="Desktop POS View"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Smartphone / POS Mockup */}
                <div className="flex-1 flex flex-col items-center justify-center p-2 space-y-3">
                  <div className={`w-full ${broadcastPreviewDevice === 'mobile' ? 'max-w-[280px]' : 'max-w-full'} bg-slate-950 rounded-2xl border-2 border-slate-800 p-2 shadow-2xl overflow-hidden`}>
                    <div className="w-full flex items-center justify-between text-[9px] text-slate-500 pb-1.5 border-b border-slate-900 font-mono px-1">
                      <span>9:41 AM</span>
                      <span>Kamai+ POS Counter</span>
                    </div>

                    {/* Simulated Banner */}
                    <div className={`mt-2 p-2.5 rounded-xl text-[11px] font-bold shadow-sm flex items-center justify-between gap-1.5 transition-all ${
                      broadcastType === 'festive' ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950' :
                      broadcastType === 'warning' ? 'bg-rose-600 text-white' :
                      broadcastType === 'success' ? 'bg-emerald-600 text-white' :
                      'bg-indigo-600 text-white'
                    }`}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                        <span className="truncate leading-tight">{broadcastMessage || 'Broadcast message preview...'}</span>
                      </div>
                      {broadcastLink && (
                        <span className="px-1.5 py-0.5 rounded bg-black/20 text-[9px] font-mono shrink-0">
                          GO &gt;
                        </span>
                      )}
                    </div>

                    {/* Simulated POS Content Placeholder */}
                    <div className="mt-3 p-3 bg-slate-900/60 rounded-xl space-y-2 border border-slate-800/40">
                      <div className="flex justify-between items-center">
                        <div className="h-3 bg-slate-800 rounded w-1/3" />
                        <div className="h-3 bg-slate-800 rounded w-1/4" />
                      </div>
                      <div className="h-7 bg-slate-800 rounded w-full" />
                      <div className="h-9 bg-slate-800 rounded w-full" />
                    </div>
                  </div>

                  {/* Quick POS Direct Verification Link */}
                  <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        sessionStorage.removeItem('kamai_dismissed_broadcast_key');
                        window.dispatchEvent(new Event('broadcast_updated'));
                        showToast('Dismissal cache cleared! Banner refreshed.');
                      }}
                      className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Clear Dismissal Cache
                    </button>

                    <a
                      href="/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300"
                    >
                      <span>Open Live POS Screen</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: COUPON MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'coupons' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D121F] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  <span>Subscription Promo Codes &amp; Discount Vouchers</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create high-converting discount codes for merchants upgrading to KamaiPlus Pro
                </p>
              </div>

              <Button
                onClick={() => setIsCouponModalOpen(true)}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-9 px-4 gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Coupon</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="p-4 sm:p-5 rounded-2xl bg-[#0D121F] border border-slate-800 space-y-3.5 shadow-xl group hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 font-mono font-black text-sm tracking-wider">
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => handleCopyCoupon(coupon.code, coupon.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition"
                        title="Copy Coupon Code"
                      >
                        {copiedCouponId === coupon.id ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                          coupon.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {coupon.is_active ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-200 font-black flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {coupon.discount_type === 'percentage'
                        ? `${coupon.discount_value}% OFF`
                        : `Flat ₹${coupon.discount_value} OFF`}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 font-mono pt-2 border-t border-slate-800">
                    <div className="flex justify-between">
                      <span>Redemptions:</span>
                      <span className="text-white font-bold">{coupon.redemptions_count || 0} / {coupon.max_redemptions || '∞'}</span>
                    </div>
                    {coupon.min_order_amount ? (
                      <div className="flex justify-between">
                        <span>Min Order:</span>
                        <span>₹{coupon.min_order_amount}</span>
                      </div>
                    ) : null}
                    {coupon.expires_at ? (
                      <div className="flex justify-between text-[10px] text-amber-400">
                        <span>Valid Until:</span>
                        <span>{new Date(coupon.expires_at).toLocaleDateString()}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: WHATSAPP CAMPAIGNS & OUTREACH */}
        {/* ========================================================================= */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <div className="bg-[#0D121F] border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xl">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Merchant Outreach &amp; Campaign Center</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct 1-click WhatsApp messaging to onboard new merchants, announce feature upgrades, or prompt Pro renewals.
                </p>
              </div>

              {/* Template Selectors */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Select Message Template</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {[
                    { id: 'welcome', title: '👋 Welcome Onboarding', preview: 'Welcome to KamaiPlus! Your retail store is now digitally enabled.' },
                    { id: 'offer50', title: '🎁 50% Pro Discount', preview: 'Upgrade to KamaiPlus Pro today with code PRO50 and get unlimited bills.' },
                    { id: 'renewal', title: '⏰ Renewal Reminder', preview: 'Your KamaiPlus Pro plan is due for renewal. Avoid uninterrupted billing.' },
                    { id: 'features', title: '🚀 New Features Release', preview: 'We just released instant GST tax filing & barcode label generation.' },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setWaTemplate(tpl.id as any);
                        setWaCustomText(tpl.preview);
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        waTemplate === tpl.id
                          ? 'border-amber-400 bg-amber-400/10 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{tpl.title}</div>
                      <div className="text-[10.5px] text-slate-400 mt-1 line-clamp-2">{tpl.preview}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Editor */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 block">Message Content</label>
                <textarea
                  rows={4}
                  value={waCustomText}
                  onChange={(e) => setWaCustomText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Single Test Phone Sender */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-300 block mb-1">Direct Test Send (Any Phone Number)</label>
                  <input
                    type="text"
                    value={waTestPhone}
                    onChange={(e) => setWaTestPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number (e.g. 9876543210)"
                    className="w-full bg-[#0D121F] border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>

                <Button
                  size="sm"
                  disabled={!waTestPhone.trim() || !waCustomText.trim()}
                  onClick={() => handleOpenWhatsAppChat(waTestPhone, 'Merchant', waCustomText)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs h-9 px-4 gap-1.5 cursor-pointer self-end sm:self-auto shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Launch WhatsApp</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: TRANSACTIONS & REVENUE INTELLIGENCE */}
        {/* ========================================================================= */}
        {activeTab === 'revenue' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121F] border border-slate-800 shadow-xl">
                <span className="text-slate-400 text-xs font-bold block">Total Online Volume</span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
                  {formatINR(totalRevenueCollected)}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Processed via Razorpay</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121F] border border-slate-800 shadow-xl">
                <span className="text-slate-400 text-xs font-bold block">Captured Transactions</span>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {transactions.filter((tx) => tx.status === 'captured' || tx.status === 'paid').length}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Completed payments</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121F] border border-slate-800 shadow-xl">
                <span className="text-slate-400 text-xs font-bold block">Average Plan Value</span>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
                  {formatINR(transactions.length ? Math.round(totalRevenueCollected / transactions.length) : formAnnualPrice)}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Annual &amp; monthly blend</span>
              </div>
            </div>

            {/* Transactions Log Table */}
            <div className="bg-[#0D121F] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
              <h3 className="text-sm sm:text-base font-black text-white mb-1">Razorpay Online Payments Log</h3>
              <p className="text-xs text-slate-400 mb-4">Complete audit trail of all online subscription upgrades</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Store / ID</th>
                      <th className="py-2.5 px-3">Payment ID</th>
                      <th className="py-2.5 px-3">Plan</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                      <th className="py-2.5 px-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                          No Razorpay payments recorded yet.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-3 font-sans font-bold text-white">{tx.business_name || tx.business_id}</td>
                          <td className="py-3 px-3 text-slate-400">{tx.razorpay_payment_id || 'Manual Entry'}</td>
                          <td className="py-3 px-3 uppercase text-amber-400 font-bold">{tx.tier}</td>
                          <td className="py-3 px-3 text-right font-black text-emerald-400">{formatINR(tx.amount || 0)}</td>
                          <td className="py-3 px-3 text-right">
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-slate-400 text-[10px]">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: PLATFORM CONFIG & FEATURE SWITCHES */}
        {/* ========================================================================= */}
        {activeTab === 'config' && (
          <div className="bg-[#0D121F] border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6 shadow-xl">
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Master Platform Switches &amp; Remote Engine</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Toggle platform features live, customize pricing tiers, and configure customer support hotlines.
              </p>
            </div>

            {/* Master Feature Toggles Grid */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Platform Master Feature Gates
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Maintenance Mode */}
                <div className={`p-4 rounded-xl border transition ${
                  formMaintenanceMode ? 'bg-rose-500/10 border-rose-500/40' : 'bg-slate-950 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-rose-400" />
                      <span>Maintenance Mode</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormMaintenanceMode(!formMaintenanceMode)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                        formMaintenanceMode ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {formMaintenanceMode ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-tight">
                    Temporarily shows a maintenance banner and pauses heavy cloud write operations.
                  </p>
                </div>

                {/* Razorpay Gateway */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                      <span>Razorpay Online Gateway</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormRazorpayGateway(!formRazorpayGateway)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                        formRazorpayGateway ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {formRazorpayGateway ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-tight">
                    Allows merchants to self-upgrade to Pro online with UPI, Card, NetBanking.
                  </p>
                </div>

                {/* Cloud Firestore Sync */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cloud Sync Engine</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormCloudSync(!formCloudSync)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                        formCloudSync ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {formCloudSync ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-tight">
                    Background synchronization between local Dexie IndexedDB and Cloud Firestore.
                  </p>
                </div>

                {/* Barcode Generator */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Barcode className="w-3.5 h-3.5 text-purple-400" />
                      <span>Barcode Generator</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormBarcodeGenerator(!formBarcodeGenerator)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                        formBarcodeGenerator ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {formBarcodeGenerator ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-tight">
                    Allows printing custom EAN/CODE128 barcode stickers on sticky thermal paper.
                  </p>
                </div>

                {/* Growth Marketing */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Growth Marketing Tools</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormGrowthMarketing(!formGrowthMarketing)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                        formGrowthMarketing ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {formGrowthMarketing ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-tight">
                    WhatsApp customer marketing templates and festival promotions engine.
                  </p>
                </div>

                {/* GST Reports */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>GST Tax Filing Reports</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormGstReports(!formGstReports)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                        formGstReports ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {formGstReports ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-tight">
                    GSTR-1 JSON and B2B/B2C audit spreadsheets generation.
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing Engine & Quotas */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Subscription Pricing Engine &amp; Free Plan Limits
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Pro Monthly Price (₹)</label>
                  <input
                    type="number"
                    value={formMonthlyPrice}
                    onChange={(e) => setFormMonthlyPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Pro Annual Price (₹)</label>
                  <input
                    type="number"
                    value={formAnnualPrice}
                    onChange={(e) => setFormAnnualPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Free Hold Bills Limit</label>
                  <input
                    type="number"
                    value={formHoldBillsLimit}
                    onChange={(e) => setFormHoldBillsLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Free Sales History (Days)</label>
                  <input
                    type="number"
                    value={formHistoryDaysLimit}
                    onChange={(e) => setFormHistoryDaysLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Support Contacts */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                SuperAdmin Support &amp; Hotline Contacts
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Support Phone Hotline</label>
                  <input
                    type="text"
                    value={formSupportPhone}
                    onChange={(e) => setFormSupportPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Support WhatsApp Number</label>
                  <input
                    type="text"
                    value={formSupportWhatsApp}
                    onChange={(e) => setFormSupportWhatsApp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-4 border-t border-slate-800">
              <Button
                onClick={handleSaveFullRemoteConfig}
                disabled={isSavingConfig}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs py-2.5 px-6 cursor-pointer shadow-lg shadow-amber-400/20"
              >
                {isSavingConfig ? 'Saving Changes...' : 'Save Remote Configuration'}
              </Button>
            </div>

            {/* SUPERADMIN DATABASE RESET & FRESH CLOUD PULL TOOL */}
            <div className="pt-4 border-t border-slate-800 space-y-3 bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-rose-500/20">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider">SuperAdmin Diagnostic Tools</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                If testing or resolving a local synchronization conflict on this device, this tool wipes local Dexie tables and freshly streams the latest cloud snapshot from Cloud Firestore.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Target Business ID (optional)"
                  value={customResetBizId}
                  onChange={(e) => setCustomResetBizId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono flex-1 focus:outline-none focus:border-rose-400"
                />
                <Button
                  size="sm"
                  onClick={() => handleClearLocalDataAndFreshPull()}
                  disabled={isResettingLocalData}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 px-4 gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResettingLocalData ? 'animate-spin' : ''}`} />
                  <span>{isResettingLocalData ? 'Pulling from Cloud...' : 'Clear Dexie & Fresh Pull'}</span>
                </Button>
              </div>

              {resetStats && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                  ✅ Restored: {resetStats.products} products, {resetStats.sales} sales, {resetStats.customers} customers.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW MERCHANT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddMerchantModalOpen}
        onClose={() => setIsAddMerchantModalOpen(false)}
        title="Onboard New Merchant Store"
      >
        <form onSubmit={handleCreateNewMerchant} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Store / Business Name *"
              placeholder="e.g. Mahadev Super Mart"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              required
            />
            <Input
              label="Owner / Contact Person"
              placeholder="e.g. Ramesh Patil"
              value={addOwnerName}
              onChange={(e) => setAddOwnerName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Mobile Number (10-Digit) *"
              placeholder="e.g. 9876543210"
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              placeholder="e.g. store@gmail.com"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="City"
              placeholder="e.g. Pune, Mumbai, Solapur"
              value={addCity}
              onChange={(e) => setAddCity(e.target.value)}
            />
            <Input
              label="GSTIN (Optional)"
              placeholder="e.g. 27AAAAA0000A1Z5"
              value={addGstin}
              onChange={(e) => setAddGstin(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Business / Store Category</label>
            <select
              value={addBusinessType}
              onChange={(e) => setAddBusinessType(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs font-bold focus:border-slate-900 focus:outline-none"
            >
              <option value="grocery">🛒 Grocery / Kirana &amp; Supermarket</option>
              <option value="restaurant">🍽️ Restaurant, Cafe &amp; Fast Food</option>
              <option value="pharmacy">💊 Pharmacy &amp; Medical Chemist</option>
              <option value="clothing">👕 Apparel, Clothing &amp; Footwear</option>
              <option value="electronics">⚡ Electronics &amp; Mobile Accessories</option>
              <option value="hardware">🔧 Hardware, Electrical &amp; Sanitary</option>
              <option value="services">💼 Salon, Spa &amp; Professional Services</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Initial Plan</label>
              <select
                value={addTier}
                onChange={(e) => setAddTier(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs font-bold focus:border-slate-900 focus:outline-none"
              >
                <option value="free">Free Tier</option>
                <option value="pro">Pro Plan</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {addTier !== 'free' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Validity (Days)</label>
                <input
                  type="number"
                  value={addDaysValidity}
                  onChange={(e) => setAddDaysValidity(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs font-bold focus:border-slate-900 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddMerchantModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreatingMerchant}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black"
            >
              {isCreatingMerchant ? 'Creating Store...' : 'Create & Onboard Store'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDIT MERCHANT FULL PROFILE & PLAN */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Store: ${selectedMerchantForEdit?.name}`}
      >
        <form onSubmit={handleSaveMerchantEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Store Name *"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <Input
              label="Owner Name"
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
              label="Email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="City"
              value={editCity}
              onChange={(e) => setEditCity(e.target.value)}
            />
            <Input
              label="GSTIN"
              value={editGstin}
              onChange={(e) => setEditGstin(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Subscription Plan</label>
              <select
                value={editTier}
                onChange={(e) => setEditTier(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs font-bold focus:border-slate-900 focus:outline-none"
              >
                <option value="free">Free Tier</option>
                <option value="pro">Pro Plan</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {editTier !== 'free' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Extend Validity (+Days)</label>
                <input
                  type="number"
                  value={editDaysExtension}
                  onChange={(e) => setEditDaysExtension(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs font-bold focus:border-slate-900 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Account Status</span>
              <span className="text-[11px] text-slate-500">
                {editIsActive ? 'Store is active and can generate bills' : 'Store is frozen (POS locked)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEditIsActive(!editIsActive)}
              className={`px-3 py-1 rounded-full text-xs font-black cursor-pointer ${
                editIsActive ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {editIsActive ? 'ACTIVE' : 'FROZEN'}
            </button>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdatingMerchant}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black"
            >
              {isUpdatingMerchant ? 'Saving Changes...' : 'Save Store Details'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CREATE COUPON */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        title="Create Promotional Discount Coupon"
      >
        <form onSubmit={handleCreateCoupon} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Coupon Code *</label>
            <input
              type="text"
              placeholder="e.g. DIWALI50, FESTIVE100, PROMO20"
              value={newCouponCode}
              onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
              required
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs font-mono font-bold uppercase focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Discount Type</label>
              <select
                value={newCouponType}
                onChange={(e) => setNewCouponType(e.target.value as any)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs font-bold focus:border-slate-900 focus:outline-none"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {newCouponType === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'} *
              </label>
              <input
                type="number"
                value={newCouponValue}
                onChange={(e) => setNewCouponValue(Number(e.target.value))}
                required
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs font-bold focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Min Order Value (₹)</label>
              <input
                type="number"
                value={newCouponMinOrder}
                onChange={(e) => setNewCouponMinOrder(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs font-bold focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Max Redemptions</label>
              <input
                type="number"
                value={newCouponMaxUses}
                onChange={(e) => setNewCouponMaxUses(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs font-bold focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCouponModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreatingCoupon}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black"
            >
              {isCreatingCoupon ? 'Creating...' : 'Activate Coupon'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(merchantToDelete)}
        onClose={() => setMerchantToDelete(null)}
        title="⚠️ Delete Merchant Store"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to permanently delete store <strong className="text-slate-950">{merchantToDelete?.name}</strong> ({merchantToDelete?.phone})?
          </p>
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            This will permanently remove all cloud sales, customer khata ledger entries, and store profiles for this merchant. This action cannot be undone.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMerchantToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteMerchantConfirm}
              disabled={isDeletingMerchant}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeletingMerchant ? 'Deleting...' : 'Confirm Permanent Deletion'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MOBILE NAVIGATION DRAWER */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#0D121F] border-r border-slate-800 h-full p-4 flex flex-col z-10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span className="font-black text-sm text-white">SuperAdmin Menu</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-1 flex-1">
              {[
                { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
                { id: 'merchants', label: `Merchants Hub (${merchants.length})`, icon: Store },
                { id: 'broadcast', label: 'Broadcasts & Alerts', icon: BellRing },
                { id: 'coupons', label: `Coupons (${coupons.length})`, icon: Tag },
                { id: 'whatsapp', label: 'WhatsApp Campaigns', icon: MessageCircle },
                { id: 'revenue', label: 'Revenue Intelligence', icon: CreditCard },
                { id: 'config', label: 'Platform Config', icon: Sliders },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout Session</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
