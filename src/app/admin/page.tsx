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
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/utils';
import { AdminCoupon } from '@/app/api/admin/coupons/route';
import { PlatformRemoteConfig } from '@/app/api/admin/config/route';

interface MerchantRecord {
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
  subscription_tier: 'free' | 'pro' | 'growth' | 'enterprise';
  subscription_expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

interface PlatformMetrics {
  totalMerchants: number;
  totalBusinesses: number;
  tiers: {
    free: number;
    pro: number;
    enterprise: number;
  };
  recentSignups: any[];
}

interface TransactionRecord {
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

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'merchants' | 'broadcast' | 'coupons' | 'whatsapp' | 'config' | 'revenue'>('overview');

  // Mobile Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Filters & Search for Merchants
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Merchant Actions State (Drawer / Modal)
  const [selectedMerchantForView, setSelectedMerchantForView] = useState<MerchantRecord | null>(null);
  const [selectedMerchantForEdit, setSelectedMerchantForEdit] = useState<MerchantRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editTier, setEditTier] = useState<string>('pro');
  const [editDaysExtension, setEditDaysExtension] = useState<number>(30);
  const [isUpdatingMerchant, setIsUpdatingMerchant] = useState<boolean>(false);

  // Manual Subscription Activation Modal
  const [isManualSubModalOpen, setIsManualSubModalOpen] = useState<boolean>(false);
  const [manualPhoneOrId, setManualPhoneOrId] = useState<string>('');
  const [manualTier, setManualTier] = useState<string>('pro');
  const [manualDurationDays, setManualDurationDays] = useState<number>(365);
  const [manualNotes, setManualNotes] = useState<string>('Cash payment received');

  // Remote Broadcast State
  const [broadcastEnabled, setBroadcastEnabled] = useState<boolean>(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string>('✨ Special Festive Update Live! Upgrade to Kamai+ Pro for near-expiry radar & CA tax filing.');
  const [broadcastType, setBroadcastType] = useState<'festive' | 'info' | 'warning' | 'success'>('festive');
  const [broadcastLink, setBroadcastLink] = useState<string>('/pricing');
  const [broadcastDuration, setBroadcastDuration] = useState<'always' | '24h' | '3d' | '7d' | 'custom'>('always');
  const [customBroadcastExpiry, setCustomBroadcastExpiry] = useState<string>('');
  const [isSavingBroadcast, setIsSavingBroadcast] = useState<boolean>(false);

  // Coupon Creation State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState<boolean>(false);
  const [newCouponCode, setNewCouponCode] = useState<string>('');
  const [newCouponType, setNewCouponType] = useState<'flat' | 'percentage'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState<number>(20);
  const [newCouponMaxDiscount, setNewCouponMaxDiscount] = useState<number>(500);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState<number>(0);
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<number>(100);

  // Pricing Form State
  const [formAnnualPrice, setFormAnnualPrice] = useState<number>(1999);
  const [formMonthlyPrice, setFormMonthlyPrice] = useState<number>(249);
  const [formHoldBillsLimit, setFormHoldBillsLimit] = useState<number>(3);
  const [formHistoryDaysLimit, setFormHistoryDaysLimit] = useState<number>(7);
  const [formSupportPhone, setFormSupportPhone] = useState<string>('+919595997711');

  // Helper for toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Check existing session
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

  // Load dashboard datasets
  useEffect(() => {
    if (isAuthenticated) {
      loadAllAdminData();
    }
  }, [isAuthenticated]);

  const loadAllAdminData = async () => {
    setIsLoadingData(true);
    try {
      // Metrics
      const mRes = await fetch('/api/admin/metrics');
      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData.metrics) setMetrics(mData.metrics);
      }

      // Merchants
      const merRes = await fetch('/api/admin/merchants');
      if (merRes.ok) {
        const merData = await merRes.json();
        if (merData.merchants) setMerchants(merData.merchants);
      }

      // Transactions
      const txRes = await fetch('/api/admin/transactions');
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData.transactions) setTransactions(txData.transactions);
      }

      // Coupons
      const coupRes = await fetch('/api/admin/coupons');
      if (coupRes.ok) {
        const cData = await coupRes.json();
        if (cData.coupons) setCoupons(cData.coupons);
      }

      // Remote Config
      const configRes = await fetch('/api/admin/config');
      if (configRes.ok) {
        const confData = await configRes.json();
        if (confData.config) {
          setConfig(confData.config);
          if (confData.config.proAnnualPrice) setFormAnnualPrice(confData.config.proAnnualPrice);
          if (confData.config.proMonthlyPrice) setFormMonthlyPrice(confData.config.proMonthlyPrice);
          if (confData.config.freeHoldBillsLimit !== undefined) setFormHoldBillsLimit(confData.config.freeHoldBillsLimit);
          if (confData.config.freeHistoryDaysLimit !== undefined) setFormHistoryDaysLimit(confData.config.freeHistoryDaysLimit);
          if (confData.config.supportPhone) setFormSupportPhone(confData.config.supportPhone);
        }
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Filtered merchants
  const filteredMerchants = useMemo(() => {
    return merchants.filter((m) => {
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
      if (selectedTierFilter !== 'all' && m.subscription_tier !== selectedTierFilter) {
        return false;
      }
      // Status
      if (selectedStatusFilter === 'active' && !m.is_active) return false;
      if (selectedStatusFilter === 'frozen' && m.is_active) return false;
      return true;
    });
  }, [merchants, searchQuery, selectedTierFilter, selectedStatusFilter]);

  // Financial calculations
  const totalProCount = merchants.filter((m) => m.subscription_tier === 'pro' || m.subscription_tier === 'enterprise').length;
  const totalFreeCount = merchants.filter((m) => m.subscription_tier === 'free').length;
  const calculatedMRR = totalProCount * (config?.proMonthlyPrice || 249);
  const calculatedARR = calculatedMRR * 12;

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
    setEditTier(merchant.subscription_tier || 'pro');
    setEditDaysExtension(30);
    setIsEditModalOpen(true);
  };

  const handleSaveMerchantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchantForEdit) return;
    setIsUpdatingMerchant(true);

    try {
      const now = new Date();
      let expiresAt: string | null = null;
      if (editTier !== 'free') {
        const expDate = new Date(now.getTime() + editDaysExtension * 24 * 60 * 60 * 1000);
        expiresAt = expDate.toISOString();
      }

      const res = await fetch(`/api/admin/merchants/${selectedMerchantForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_tier: editTier,
          subscription_expires_at: expiresAt,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMerchants((prev) =>
          prev.map((m) =>
            m.id === selectedMerchantForEdit.id
              ? { ...m, subscription_tier: editTier as any, subscription_expires_at: expiresAt || undefined }
              : m
          )
        );
        setIsEditModalOpen(false);
        showToast(`Updated ${selectedMerchantForEdit.name} to ${editTier.toUpperCase()}`);
      } else {
        alert(data.message || 'Failed to update merchant');
      }
    } catch {
      alert('Error updating merchant subscription');
    } finally {
      setIsUpdatingMerchant(false);
    }
  };

  const handleToggleFreezeMerchant = async (m: MerchantRecord) => {
    const nextActive = !m.is_active;
    const confirmMsg = nextActive
      ? `Unfreeze store "${m.name}"? Merchant will be able to bill again.`
      : `Freeze store "${m.name}"? Merchant POS will be locked immediately.`;
    
    if (!confirm(confirmMsg)) return;

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
        showToast(`Store ${m.name} is now ${nextActive ? 'ACTIVE' : 'FROZEN'}`);
      }
    } catch {
      alert('Failed to toggle merchant status');
    }
  };

  const handleDeleteMerchant = async (m: MerchantRecord) => {
    if (
      !confirm(
        `⚠️ PERMANENT DELETE CONFIRMATION:\n\nAre you sure you want to permanently delete store "${m.name}" (${m.phone})?\n\nThis will remove all products, invoices, and cloud records for this merchant. This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/merchants/${m.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMerchants((prev) => prev.filter((item) => item.id !== m.id));
        showToast(`Store "${m.name}" permanently deleted.`);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete merchant');
      }
    } catch {
      alert('Network error deleting merchant');
    }
  };

  const handleSaveBroadcast = async () => {
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
          enabled: broadcastEnabled,
          message: broadcastMessage.trim(),
          type: broadcastType,
          link: broadcastLink.trim(),
          expires_at: expiresAt,
        }),
      });

      if (res.ok) {
        window.dispatchEvent(new Event('broadcast_updated'));
        localStorage.setItem('kamai_last_broadcast_sync', Date.now().toString());
        showToast(broadcastEnabled ? 'In-App announcement published to all active POS counters!' : 'Announcement disabled.');
      } else {
        alert('Failed to publish broadcast announcement');
      }
    } catch {
      alert('Network error publishing broadcast');
    } finally {
      setIsSavingBroadcast(false);
    }
  };

  const handleSaveConfig = async (newConfig: Partial<PlatformRemoteConfig>) => {
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
        showToast('Remote configuration updated successfully!');
      }
    } catch {
      alert('Failed to update remote configuration');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponValue) return;

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCouponCode.trim().toUpperCase(),
          discount_type: newCouponType,
          discount_value: Number(newCouponValue),
          max_discount_amount: Number(newCouponMaxDiscount),
          min_order_value: Number(newCouponMinOrder),
          max_uses: Number(newCouponMaxUses),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCoupons((prev) => [data.coupon, ...prev]);
        setIsCouponModalOpen(false);
        setNewCouponCode('');
        showToast(`Coupon ${data.coupon.code} created!`);
      } else {
        alert(data.message || 'Failed to create coupon');
      }
    } catch {
      alert('Network error creating coupon');
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

  const handleOpenWhatsAppChat = (phone: string, merchantName: string) => {
    const cleanNumber = phone.replace(/\D/g, '');
    const fullNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const text = encodeURIComponent(
      `Hello ${merchantName}! Greetings from KamaiPlus SuperAdmin Team. How can we support your retail billing and growth today?`
    );
    window.open(`https://wa.me/${fullNumber}?text=${text}`, '_blank');
  };

  // -------------------------------------------------------------
  // VIEW: AUTHENTICATION LOCK SCREEN (RESPONSIVE)
  // -------------------------------------------------------------
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#070A10] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400 tracking-wider">Verifying SuperAdmin Authority...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070A10] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-[#070A10] to-[#070A10] flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-[#0E131F]/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />
          
          <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mb-3 sm:mb-4 text-amber-400 shadow-inner">
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">KamaiPlus SuperAdmin</h1>
            <p className="text-xs text-slate-400 mt-1 sm:mt-1.5 leading-relaxed">
              Master Platform Authority &amp; Merchant Ecosystem Control
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/30 font-mono transition-all"
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
  // VIEW: AUTHENTICATED SUPERADMIN CONTROL CENTER (UNIFIED NAVIGATION)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 pb-24 md:pb-16 font-sans antialiased">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 p-3.5 sm:p-4 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs shadow-2xl flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-top-4 duration-200 border border-emerald-400/40">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar Header (Systematic Desktop & Mobile) */}
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
            {/* Direct Barcode Generator Link */}
            <Link
              href="/barcode-generator"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all"
              title="Open Barcode & Label Generator"
            >
              <Barcode className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Barcode</span>
            </Link>

            {/* Direct POS Counter Link */}
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

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {/* ========================================================================= */}
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {/* Total Merchants */}
              <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-b from-[#111726] to-[#0D121F] border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-bold mb-1 sm:mb-2">
                  <span>Total Merchants</span>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                    <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {merchants.length}
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2 truncate">
                  <span className="text-emerald-400 font-bold">{merchants.filter((m) => m.is_active).length} Active</span>
                  <span>•</span>
                  <span>{merchants.filter((m) => !m.is_active).length} Frozen</span>
                </div>
              </div>

              {/* Monthly Recurring Revenue (MRR) */}
              <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-b from-[#111726] to-[#0D121F] border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-bold mb-1 sm:mb-2">
                  <span>Monthly Run-Rate</span>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
                  {formatINR(calculatedMRR)}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2 font-mono truncate">
                  ARR: {formatINR(calculatedARR)}
                </div>
              </div>

              {/* Active Paid Subscribers */}
              <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-b from-[#111726] to-[#0D121F] border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-bold mb-1 sm:mb-2">
                  <span>Pro Subscribers</span>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                    <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                  {totalProCount}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2 truncate">
                  <span>{totalFreeCount} on Free Tier</span>
                </div>
              </div>

              {/* Firestore Cloud Status */}
              <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-b from-[#111726] to-[#0D121F] border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-bold mb-1 sm:mb-2">
                  <span>Cloud Health</span>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-sm sm:text-lg font-black text-white flex items-center gap-1.5 sm:gap-2">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate">Operational</span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2 truncate">
                  Firestore &amp; Auth Active
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-[#0E1320] border border-slate-800 rounded-2xl">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-white">Platform SuperAdmin Controls</h2>
                <p className="text-[11px] sm:text-xs text-slate-400">Instant merchant upgrades, coupon generation &amp; CSV export</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => setIsCouponModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-8 px-2.5 sm:px-3 gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Coupon</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsManualSubModalOpen(true)}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-8 px-2.5 sm:px-3 gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Upgrade</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleExportMerchantsCSV}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-8 px-2.5 sm:px-3 gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </Button>
              </div>
            </div>

            {/* Recently Joined Merchants Feed */}
            <div className="bg-[#0E1320] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white">Recently Joined Merchants</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">Latest shop owners onboarded to KamaiPlus</p>
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
                  <div key={m.id} className="py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 text-xs hover:bg-slate-800/20 px-1 sm:px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-black text-xs shrink-0 shadow-inner">
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate text-xs sm:text-sm">{m.name}</div>
                        <div className="text-slate-400 font-mono text-[10px] sm:text-[11px] truncate">
                          {m.owner_name ? `${m.owner_name} • ` : ''}{m.phone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase ${
                        m.subscription_tier === 'pro' || m.subscription_tier === 'enterprise'
                          ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {m.subscription_tier}
                      </span>
                      <button
                        onClick={() => handleOpenWhatsAppChat(m.phone, m.name)}
                        className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                        title="Chat on WhatsApp"
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
            <div className="bg-[#0E1320] border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search store name, phone, owner, email, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <select
                  value={selectedTierFilter}
                  onChange={(e) => setSelectedTierFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:border-amber-400 focus:outline-none cursor-pointer shrink-0"
                >
                  <option value="all">All Tiers</option>
                  <option value="free">Free Tier</option>
                  <option value="pro">Pro Tier</option>
                  <option value="enterprise">Enterprise</option>
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:border-amber-400 focus:outline-none cursor-pointer shrink-0"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="frozen">Frozen Only</option>
                </select>

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

            {/* 1. DESKTOP VIEW: HIGH-DENSITY DATA TABLE */}
            <div className="hidden md:block bg-[#0E1320] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Store &amp; Owner</th>
                      <th className="py-3.5 px-4">Contact &amp; Email</th>
                      <th className="py-3.5 px-4">Plan &amp; Validity</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Root Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredMerchants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500 font-mono">
                          No merchants matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMerchants.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 font-black flex items-center justify-center text-xs shrink-0">
                                {m.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-white text-xs">{m.name}</div>
                                <div className="text-slate-400 text-[11px]">{m.owner_name || 'Owner not set'}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono">
                            <div className="text-slate-200 font-bold">{m.phone || 'No phone'}</div>
                            <div className="text-slate-500 text-[11px] truncate max-w-[180px]">{m.email || m.city || 'India'}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              m.subscription_tier === 'pro' || m.subscription_tier === 'enterprise'
                                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {m.subscription_tier}
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {m.subscription_expires_at
                                ? `Exp: ${new Date(m.subscription_expires_at).toLocaleDateString('en-IN')}`
                                : 'Lifetime / Free'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 w-fit ${
                              m.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              <span>{m.is_active ? 'Active' : 'Frozen'}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* WhatsApp Chat */}
                              <button
                                onClick={() => handleOpenWhatsAppChat(m.phone, m.name)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                                title="Open WhatsApp Chat"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>

                              {/* Upgrade Plan Override */}
                              <button
                                onClick={() => handleOpenEditModal(m)}
                                className="p-1.5 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 cursor-pointer transition-colors"
                                title="Change Plan / Extend Subscription"
                              >
                                <Crown className="w-3.5 h-3.5" />
                              </button>

                              {/* Freeze / Unfreeze Switch */}
                              <button
                                onClick={() => handleToggleFreezeMerchant(m)}
                                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                  m.is_active
                                    ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                                title={m.is_active ? 'Freeze Store' : 'Unfreeze Store'}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>

                              {/* View Inspector Drawer */}
                              <button
                                onClick={() => setSelectedMerchantForView(m)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer transition-colors"
                                title="View Store Profile"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Merchant Permanently */}
                              <button
                                onClick={() => handleDeleteMerchant(m)}
                                className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-colors"
                                title="Delete Store Permanently"
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

            {/* 2. MOBILE CARD STACK VIEW */}
            <div className="block md:hidden space-y-3">
              {filteredMerchants.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs bg-[#0E1320] rounded-2xl border border-slate-800">
                  No merchants found.
                </div>
              ) : (
                filteredMerchants.map((m) => (
                  <div key={m.id} className="p-4 rounded-2xl bg-[#0E1320] border border-slate-800 space-y-3 shadow-lg">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 font-black flex items-center justify-center text-xs shrink-0">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{m.name}</h4>
                          <p className="text-[11px] text-slate-400 truncate">{m.owner_name || 'Owner not set'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          m.subscription_tier === 'pro' || m.subscription_tier === 'enterprise'
                            ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {m.subscription_tier}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          m.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {m.is_active ? 'Active' : 'Frozen'}
                        </span>
                      </div>
                    </div>

                    {/* Details Info */}
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Mobile:</span>
                        <span className="text-slate-200 font-bold">{m.phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Expiry:</span>
                        <span className="text-slate-300">
                          {m.subscription_expires_at ? new Date(m.subscription_expires_at).toLocaleDateString('en-IN') : 'Free / Lifetime'}
                        </span>
                      </div>
                      {m.email && (
                        <div className="col-span-2 truncate">
                          <span className="text-slate-500 block text-[10px]">Google Email:</span>
                          <span className="text-slate-300">{m.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Touch-Friendly Action Bar */}
                    <div className="grid grid-cols-5 gap-1.5 pt-1 border-t border-slate-800/80">
                      <button
                        onClick={() => handleOpenWhatsAppChat(m.phone, m.name)}
                        className="py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex flex-col items-center justify-center gap-1 font-bold text-[10px] transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Chat</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(m)}
                        className="py-2 rounded-xl bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 flex flex-col items-center justify-center gap-1 font-bold text-[10px] transition-colors"
                      >
                        <Crown className="w-4 h-4" />
                        <span>Plan</span>
                      </button>

                      <button
                        onClick={() => handleToggleFreezeMerchant(m)}
                        className={`py-2 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-[10px] transition-colors ${
                          m.is_active
                            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        <Ban className="w-4 h-4" />
                        <span>{m.is_active ? 'Freeze' : 'Unfreeze'}</span>
                      </button>

                      <button
                        onClick={() => setSelectedMerchantForView(m)}
                        className="py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 flex flex-col items-center justify-center gap-1 font-bold text-[10px] transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => handleDeleteMerchant(m)}
                        className="py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex flex-col items-center justify-center gap-1 font-bold text-[10px] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: IN-APP ANNOUNCEMENT BROADCASTS */}
        {/* ========================================================================= */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            <div className="lg:col-span-7 bg-[#0E1320] border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">Publish Terminal Announcement</h3>
                <p className="text-xs text-slate-400">Push instant banner alerts to all active POS counters</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block">Broadcast Banner Active</span>
                    <span className="text-[11px] text-slate-400">When enabled, appears on all merchant screens.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBroadcastEnabled(!broadcastEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      broadcastEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      broadcastEnabled ? 'right-1' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Message Text</label>
                  <textarea
                    rows={3}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    placeholder="Enter broadcast announcement message..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Banner Style</label>
                    <select
                      value={broadcastType}
                      onChange={(e) => setBroadcastType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                    >
                      <option value="festive">🪔 Festive &amp; Promotion</option>
                      <option value="info">ℹ️ Informational Update</option>
                      <option value="warning">⚠️ Important Notice</option>
                      <option value="success">🎉 Milestone / Success</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Action Link (Optional)</label>
                    <input
                      type="text"
                      value={broadcastLink}
                      onChange={(e) => setBroadcastLink(e.target.value)}
                      placeholder="/pricing or https://..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveBroadcast}
                  disabled={isSavingBroadcast}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs py-3 cursor-pointer shadow-md"
                >
                  {isSavingBroadcast ? 'Saving Broadcast...' : 'Save & Publish Announcement'}
                </Button>
              </div>
            </div>

            {/* Live Terminal Preview */}
            <div className="lg:col-span-5 bg-[#0E1320] border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
              <h3 className="text-sm font-black text-white">Live Merchant Preview</h3>
              <p className="text-xs text-slate-400">How your banner appears on merchant billing terminals:</p>

              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border border-amber-400/30 text-amber-300 text-xs flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-bold truncate">{broadcastMessage}</span>
                </div>
                {broadcastLink && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] shrink-0">
                    Action
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: COUPON MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'coupons' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#0E1320] border border-slate-800 rounded-2xl p-4">
              <div>
                <h3 className="text-sm font-black text-white">Subscription Promo Codes</h3>
                <p className="text-xs text-slate-400">Discount codes for Kamai+ Pro upgrades</p>
              </div>
              <Button
                onClick={() => setIsCouponModalOpen(true)}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-8.5 gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Coupon</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="p-4 sm:p-5 rounded-2xl bg-[#0E1320] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 font-mono font-black text-sm">
                      {coupon.code}
                    </span>
                    <button
                      onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                        coupon.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {coupon.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div className="text-xs text-slate-300 font-bold">
                    {coupon.discount_type === 'percentage'
                      ? `${coupon.discount_value}% Discount`
                      : `Flat ₹${coupon.discount_value} OFF`}
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 font-mono pt-2 border-t border-slate-800">
                    <div>Used: {coupon.redemptions_count || 0} / {coupon.max_redemptions || '∞'} times</div>
                    <div>Min Order: ₹{coupon.min_order_amount || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: WHATSAPP AUTOMATION */}
        {/* ========================================================================= */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4">
            <div className="bg-[#0E1320] border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">WhatsApp Business Platform Controls</h3>
                <p className="text-xs text-slate-400">Manage templates, webhooks, and direct merchant communications</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block">Cloud API Status</span>
                  <span className="text-sm font-black text-emerald-400 mt-1 block">Connected ✅</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block">WhatsApp OTP Auth</span>
                  <span className="text-sm font-black text-amber-400 mt-1 block">Replaced by Google OAuth ⚡</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block">Bill PDF Sharing</span>
                  <span className="text-sm font-black text-blue-400 mt-1 block">Direct WhatsApp Web link</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: TRANSACTIONS & REVENUE */}
        {/* ========================================================================= */}
        {activeTab === 'revenue' && (
          <div className="space-y-4">
            <div className="bg-[#0E1320] border border-slate-800 rounded-2xl p-4 sm:p-5">
              <h3 className="text-sm font-black text-white mb-1">Razorpay Platform Transactions</h3>
              <p className="text-xs text-slate-400">Live transaction history for paid subscription upgrades</p>

              <div className="mt-4 divide-y divide-slate-800/60">
                {transactions.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 font-mono text-xs">
                    No Razorpay transactions recorded yet.
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{tx.business_name || tx.business_id}</div>
                        <div className="text-slate-400 font-mono text-[10px] sm:text-[11px] truncate">
                          {tx.razorpay_payment_id || 'Manual Activation'} • {new Date(tx.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-emerald-400">{formatINR(tx.amount || 0)}</div>
                        <span className="px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400">
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: PLATFORM CONFIG & PRICING */}
        {/* ========================================================================= */}
        {activeTab === 'config' && (
          <div className="bg-[#0E1320] border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5">
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">Platform Settings &amp; Pricing Engine</h3>
              <p className="text-xs text-slate-400">Manage dynamic plan pricing, hold bills quotas, and support hotlines</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Pro Plan Monthly Price (₹)</label>
                <input
                  type="number"
                  value={formMonthlyPrice}
                  onChange={(e) => setFormMonthlyPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Pro Plan Annual Price (₹)</label>
                <input
                  type="number"
                  value={formAnnualPrice}
                  onChange={(e) => setFormAnnualPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Free Tier Hold Bills Limit</label>
                <input
                  type="number"
                  value={formHoldBillsLimit}
                  onChange={(e) => setFormHoldBillsLimit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">SuperAdmin Support Hotline Phone</label>
                <input
                  type="text"
                  value={formSupportPhone}
                  onChange={(e) => setFormSupportPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() =>
                  handleSaveConfig({
                    proMonthlyPrice: formMonthlyPrice,
                    proAnnualPrice: formAnnualPrice,
                    freeHoldBillsLimit: formHoldBillsLimit,
                    supportPhone: formSupportPhone,
                  })
                }
                className="w-full sm:w-auto bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs py-2.5 px-6 cursor-pointer"
              >
                Save Remote Configuration
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* INTERACTIVE MOBILE BOTTOM NAVIGATION BAR (FIXED DOCK) */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F17]/95 backdrop-blur-2xl border-t border-slate-800/90 py-1.5 px-2 lg:hidden flex items-center justify-around shadow-2xl">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'merchants', label: 'Merchants', icon: Store, badge: merchants.length },
          { id: 'coupons', label: 'Coupons', icon: Tag },
          { id: 'broadcast', label: 'Broadcast', icon: BellRing },
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
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative cursor-pointer ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all relative ${isActive ? 'bg-amber-400/10' : ''}`}>
                <Icon className="w-5 h-5" />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px]">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* More / Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
            isMobileMenuOpen ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="p-1.5 rounded-xl">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* MOBILE "MORE" NAVIGATION DRAWER */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0E1320] border-t border-slate-800 rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span className="font-black text-white text-sm">SuperAdmin Navigation Menu</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/barcode-generator"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5 text-left hover:border-amber-400 transition-colors"
              >
                <Barcode className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-white text-xs">Barcode Generator</span>
                <span className="text-[10px] text-slate-400">Print custom EAN-13 labels</span>
              </Link>

              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5 text-left hover:border-emerald-400 transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-white text-xs">Launch POS Counter</span>
                <span className="text-[10px] text-slate-400">Open main billing interface</span>
              </Link>

              <button
                onClick={() => {
                  setActiveTab('whatsapp');
                  setIsMobileMenuOpen(false);
                }}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5 text-left hover:border-blue-400 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-white text-xs">WhatsApp Automation</span>
                <span className="text-[10px] text-slate-400">Cloud API &amp; Webhooks</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('revenue');
                  setIsMobileMenuOpen(false);
                }}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5 text-left hover:border-emerald-400 transition-colors cursor-pointer"
              >
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-white text-xs">Transactions &amp; Revenue</span>
                <span className="text-[10px] text-slate-400">Razorpay subscription logs</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('config');
                  setIsMobileMenuOpen(false);
                }}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5 text-left hover:border-amber-400 transition-colors cursor-pointer col-span-2"
              >
                <Sliders className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-white text-xs">Platform Settings &amp; Pricing Engine</span>
                <span className="text-[10px] text-slate-400">Adjust Pro plan pricing, limits &amp; hotline</span>
              </button>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-bold py-2.5 gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout from SuperAdmin</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT PLAN OVERRIDE */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedMerchantForEdit && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Override Plan: ${selectedMerchantForEdit.name}`}
        >
          <form onSubmit={handleSaveMerchantEdit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Select Subscription Tier
              </label>
              <select
                value={editTier}
                onChange={(e) => setEditTier(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="free">Free Forever Tier</option>
                <option value="pro">Kamai+ Pro Plan</option>
                <option value="growth">Growth Super Plan</option>
                <option value="enterprise">Enterprise VIP</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Validity Extension (Days)
              </label>
              <input
                type="number"
                value={editDaysExtension}
                onChange={(e) => setEditDaysExtension(Number(e.target.value))}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isUpdatingMerchant} className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black">
                {isUpdatingMerchant ? 'Saving...' : 'Apply Plan Override'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE COUPON */}
      {/* ========================================================================= */}
      {isCouponModalOpen && (
        <Modal
          isOpen={isCouponModalOpen}
          onClose={() => setIsCouponModalOpen(false)}
          title="Create New Subscription Coupon"
        >
          <form onSubmit={handleCreateCoupon} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Coupon Code</label>
              <input
                type="text"
                placeholder="e.g. FESTIVE50 or VIP2026"
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                required
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-2.5 text-xs font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Type</label>
                <select
                  value={newCouponType}
                  onChange={(e) => setNewCouponType(e.target.value as any)}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-2 text-xs"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat (₹)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Value</label>
                <input
                  type="number"
                  value={newCouponValue}
                  onChange={(e) => setNewCouponValue(Number(e.target.value))}
                  required
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCouponModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black">
                Create Coupon
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: MERCHANT 360° INSPECTOR */}
      {/* ========================================================================= */}
      {selectedMerchantForView && (
        <Modal
          isOpen={!!selectedMerchantForView}
          onClose={() => setSelectedMerchantForView(null)}
          title={`Store Inspector: ${selectedMerchantForView.name}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Store ID:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedMerchantForView.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Owner Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedMerchantForView.owner_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedMerchantForView.phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Google Email:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedMerchantForView.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Category:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedMerchantForView.business_type || 'Grocery'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Registered On:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {new Date(selectedMerchantForView.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={() => setSelectedMerchantForView(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
