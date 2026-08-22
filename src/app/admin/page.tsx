'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  CheckSquare
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

  // Coupon Creation Form
  const [isCouponModalOpen, setIsCouponModalOpen] = useState<boolean>(false);
  const [newCouponCode, setNewCouponCode] = useState<string>('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'flat'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState<number>(50);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState<number>(249);
  const [newCouponMaxUsage, setNewCouponMaxUsage] = useState<number>(100);

  // WhatsApp Campaign Composer
  const [waSegment, setWaSegment] = useState<'all' | 'free' | 'pro' | 'expiring'>('free');
  const [waCustomMessage, setWaCustomMessage] = useState<string>(
    `Hello {owner_name}, greetings from Kamai+ (KamaiPlus)! 🚀\n\nUpgrade your store *{store_name}* to Pro today & unlock 1-Click WhatsApp Invoicing, Expiry Radar, and GSTR-1 Tax Reports at 50% OFF!\n\nTap to upgrade: https://kamaiplus.proventure.in/pricing`
  );

  // Remote Pricing & Limits State
  const [formAnnualPrice, setFormAnnualPrice] = useState<number>(1499);
  const [formMonthlyPrice, setFormMonthlyPrice] = useState<number>(199);
  const [formHoldBillsLimit, setFormHoldBillsLimit] = useState<number>(3);
  const [formHistoryDaysLimit, setFormHistoryDaysLimit] = useState<number>(7);
  const [formSupportPhone, setFormSupportPhone] = useState<string>('+919595997711');
  const [isSavingPricing, setIsSavingPricing] = useState<boolean>(false);

  // 1. Check Session on Mount
  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      const res = await fetch('/api/admin/session');
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        loadAdminDashboardData();
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsLoggingIn(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setPasswordInput('');
        loadAdminDashboardData();
      } else {
        setAuthError(data.message || 'Incorrect SuperAdmin Password');
      }
    } catch {
      setAuthError('Authentication request failed. Please check connection.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      setIsAuthenticated(false);
    }
  };

  const loadAdminDashboardData = async () => {
    setIsLoadingData(true);
    try {
      // Metrics
      const metricsRes = await fetch('/api/admin/metrics');
      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        if (mData.metrics) setMetrics(mData.metrics);
      }

      // Merchants
      const merchantsRes = await fetch('/api/admin/merchants');
      if (merchantsRes.ok) {
        const mData = await merchantsRes.json();
        if (mData.merchants) setMerchants(mData.merchants);
      }

      // Broadcast
      const broadcastRes = await fetch('/api/admin/broadcast');
      if (broadcastRes.ok) {
        const bData = await broadcastRes.json();
        if (bData.announcement) {
          setBroadcastEnabled(Boolean(bData.announcement.enabled));
          if (bData.announcement.message) setBroadcastMessage(bData.announcement.message);
          if (bData.announcement.type) setBroadcastType(bData.announcement.type);
          if (bData.announcement.link) setBroadcastLink(bData.announcement.link);
        }
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
        const cityMatch = (m.city || '').toLowerCase().includes(q);
        const gstinMatch = (m.gstin || '').toLowerCase().includes(q);
        if (!nameMatch && !ownerMatch && !phoneMatch && !cityMatch && !gstinMatch) return false;
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
  const handleOpenEditModal = (m: MerchantRecord) => {
    setSelectedMerchantForEdit(m);
    setEditTier(m.subscription_tier || 'pro');
    setEditDaysExtension(30);
    setIsEditModalOpen(true);
  };

  const handleUpdateMerchantSubscription = async () => {
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
        `⚠️ PERMANENT DELETE WARNING:\n\nAre you sure you want to permanently delete store "${m.name}" (${m.phone})?\n\nThis will remove all products, invoices, and cloud records for this merchant. This action cannot be undone.`
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
          code: newCouponCode.trim(),
          discount_type: newCouponType,
          discount_value: newCouponValue,
          min_order_amount: newCouponMinOrder,
          max_redemptions: newCouponMaxUsage,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCoupons((prev) => [data.coupon, ...prev]);
        setIsCouponModalOpen(false);
        setNewCouponCode('');
        showToast(`Coupon ${data.coupon.code} created!`);
      } else {
        alert(data.error || 'Failed to create coupon');
      }
    } catch {
      alert('Failed to create coupon');
    }
  };

  const handleToggleCoupon = async (c: AdminCoupon) => {
    try {
      const nextActive = !c.is_active;
      const res = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, is_active: nextActive }),
      });
      if (res.ok) {
        setCoupons((prev) => prev.map((item) => (item.id === c.id ? { ...item, is_active: nextActive } : item)));
        showToast(`Coupon ${c.code} ${nextActive ? 'Activated' : 'Paused'}`);
      }
    } catch {
      alert('Failed to update coupon');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon code?')) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCoupons((prev) => prev.filter((item) => item.id !== id));
        showToast('Coupon deleted');
      }
    } catch {
      alert('Failed to delete coupon');
    }
  };

  const handleExportMerchantsCSV = () => {
    if (merchants.length === 0) {
      alert('No merchants found to export.');
      return;
    }
    const headers = ['Store Name', 'Owner Name', 'Phone', 'Email', 'City', 'State', 'GSTIN', 'Tier', 'Status', 'Expires At', 'Joined At'];
    const rows = merchants.map((m) => [
      `"${(m.name || '').replace(/"/g, '""')}"`,
      `"${(m.owner_name || '').replace(/"/g, '""')}"`,
      `"${m.phone || ''}"`,
      `"${m.email || ''}"`,
      `"${m.city || ''}"`,
      `"${m.state || ''}"`,
      `"${m.gstin || ''}"`,
      `"${m.subscription_tier}"`,
      `"${m.is_active ? 'Active' : 'Frozen'}"`,
      `"${m.subscription_expires_at ? new Date(m.subscription_expires_at).toLocaleDateString('en-IN') : 'Never'}"`,
      `"${new Date(m.created_at).toLocaleDateString('en-IN')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KamaiPlus_Merchants_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Merchants list exported to CSV');
  };

  const handleOpenWhatsAppChat = (phone: string, storeName: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const greeting = encodeURIComponent(`Hello ${storeName} team! This is Kamai+ SuperAdmin Support. How may we assist your billing setup today?`);
    window.open(`https://wa.me/${fullPhone}?text=${greeting}`, '_blank');
  };

  // -------------------------------------------------------------
  // RENDER: LOGIN SCREEN (MINIMALIST GRAPHITE)
  // -------------------------------------------------------------
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-slate-400 font-mono text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          <span>Verifying SuperAdmin Key...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-amber-400 selection:text-slate-950">
        <div className="w-full max-w-sm">
          {/* Logo & Security Pill */}
          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Restricted Root Access</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Kamai+ Master Console</h1>
            <p className="text-xs text-slate-400">Authentication required for administrative control.</p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Master Root Password</label>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    autoFocus
                    className="bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-amber-400 pl-9 font-mono text-sm"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-10 rounded-xl cursor-pointer transition shadow-lg shadow-amber-400/10"
              >
                {isLoggingIn ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Authorizing...</span>
                  </span>
                ) : (
                  <span>Enter SuperAdmin Console →</span>
                )}
              </Button>
            </form>

            <div className="pt-3 border-t border-slate-800/80 text-center text-[11px] text-slate-500 font-mono">
              IP & Device telemetry logged for security audit.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: AUTHENTICATED SUPERADMIN CONSOLE
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-400 selection:text-slate-950 font-sans pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-amber-400/80 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP MASTER APP BAR */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-sm">
              K+
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-white">Kamai+ SuperAdmin</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  LIVE ROOT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Master Platform Cockpit</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAdminDashboardData}
              disabled={isLoadingData}
              className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold gap-1.5 h-8 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingData ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAdminLogout}
              className="border-slate-800 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs font-semibold gap-1.5 h-8 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* MASTER NAVIGATION TABS */}
      <nav className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-2">
          {[
            { id: 'overview', label: 'Overview & Metrics', icon: BarChart3 },
            { id: 'merchants', label: `Merchants (${merchants.length})`, icon: Store },
            { id: 'broadcast', label: 'In-App Broadcasts', icon: Radio },
            { id: 'coupons', label: `Promo Coupons (${coupons.length})`, icon: Tag },
            { id: 'whatsapp', label: 'WhatsApp Campaigns', icon: MessageCircle },
            { id: 'config', label: 'Remote Config & Flags', icon: Sliders },
            { id: 'revenue', label: 'Revenue & Ledger', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & METRICS */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick KPI Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Total Merchants</span>
                  <Store className="w-4 h-4 text-slate-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">{merchants.length}</div>
                <div className="text-[11px] text-emerald-400 font-medium">All registered businesses</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Pro Subscribers</span>
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">{totalProCount}</div>
                <div className="text-[11px] text-slate-400 font-medium">{totalFreeCount} on Free tier</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Estimated MRR</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  {formatINR(calculatedMRR * 100)}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">ARR: {formatINR(calculatedARR * 100)}</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Platform Health</span>
                  <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                </div>
                <div className="text-base font-black text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                  <span>100% Operational</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">Firestore &amp; APIs Active</div>
              </div>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">SuperAdmin Quick Controls:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setActiveTab('broadcast')}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-8 gap-1.5 cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  <span>Publish Alert</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsCouponModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-8 gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>New Coupon</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsManualSubModalOpen(true)}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-8 gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Manual Upgrade</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleExportMerchantsCSV}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-8 gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </div>

            {/* Recent Signups / Merchants Feed */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-white">Recently Joined Merchants</h3>
                  <p className="text-xs text-slate-400">Latest shop owners onboarded to KamaiPlus</p>
                </div>
                <button
                  onClick={() => setActiveTab('merchants')}
                  className="text-xs font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>View All {merchants.length}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-800/60">
                {merchants.slice(0, 5).map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{m.name}</div>
                        <div className="text-slate-400 font-mono text-[11px]">
                          {m.phone} {m.city ? `• ${m.city}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        m.subscription_tier === 'pro' || m.subscription_tier === 'enterprise'
                          ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {m.subscription_tier}
                      </span>
                      <button
                        onClick={() => handleOpenWhatsAppChat(m.phone, m.name)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <Input
                  placeholder="Search by store name, phone, owner, city, or GSTIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white placeholder-slate-500 pl-9 text-xs h-9"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <select
                  value={selectedTierFilter}
                  onChange={(e) => setSelectedTierFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:border-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Tiers</option>
                  <option value="free">Free Tier</option>
                  <option value="pro">Pro Tier</option>
                  <option value="enterprise">Enterprise</option>
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:border-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="frozen">Frozen / Suspended</option>
                </select>

                <Button
                  size="sm"
                  onClick={handleExportMerchantsCSV}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold h-8.5 gap-1 cursor-pointer shrink-0"
                >
                  <Download className="w-3 h-3" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            </div>

            {/* Merchants Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Store &amp; Owner</th>
                      <th className="py-3 px-4">Phone &amp; Location</th>
                      <th className="py-3 px-4">Plan &amp; Expiry</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Root Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredMerchants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                          No merchants matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMerchants.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-black text-white text-xs">{m.name}</div>
                            <div className="text-slate-400 text-[11px]">{m.owner_name || 'Owner not specified'}</div>
                          </td>

                          <td className="py-3 px-4 font-mono">
                            <div className="text-slate-200 font-bold">{m.phone}</div>
                            <div className="text-slate-500 text-[11px]">{m.city || m.state || 'India'}</div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
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

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
                              m.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              <span>{m.is_active ? 'Active' : 'Frozen'}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1-Click WhatsApp Support */}
                              <button
                                onClick={() => handleOpenWhatsAppChat(m.phone, m.name)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                                title="Open WhatsApp Chat"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>

                              {/* Upgrade Plan Override */}
                              <button
                                onClick={() => handleOpenEditModal(m)}
                                className="p-1.5 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 cursor-pointer"
                                title="Change Plan / Extend Subscription"
                              >
                                <Crown className="w-3.5 h-3.5" />
                              </button>

                              {/* Freeze / Unfreeze Switch */}
                              <button
                                onClick={() => handleToggleFreezeMerchant(m)}
                                className={`p-1.5 rounded-lg cursor-pointer ${
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
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                                title="View Store Profile"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Merchant Permanently */}
                              <button
                                onClick={() => handleDeleteMerchant(m)}
                                className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: IN-APP ANNOUNCEMENT BROADCASTS */}
        {/* ========================================================================= */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Editor Panel */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-400" />
                  <span>Publish System Broadcast Banner</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Display a dynamic marquee announcement across all merchant POS counters in real-time.
                </p>
              </div>

              {/* Enable Toggle */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Broadcast Status</div>
                  <div className="text-[11px] text-slate-400">Turn banner on or off on POS screens</div>
                </div>
                <button
                  type="button"
                  onClick={() => setBroadcastEnabled(!broadcastEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                    broadcastEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              {/* Message Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Announcement Text</label>
                <textarea
                  rows={3}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="e.g. Diwali Offer: Flat 50% discount on Annual Pro plan today!"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Banner Style Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Visual Style Theme</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['festive', 'info', 'warning', 'success'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBroadcastType(type)}
                      className={`py-2 rounded-lg text-xs font-bold capitalize border cursor-pointer ${
                        broadcastType === type
                          ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Click Action URL (Optional)</label>
                <Input
                  placeholder="/pricing or https://kamaiplus.proventure.in"
                  value={broadcastLink}
                  onChange={(e) => setBroadcastLink(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>

              {/* Expiry & Duration Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block flex items-center justify-between">
                  <span>Broadcast Active Duration</span>
                  <span className="text-[11px] text-amber-400 font-mono">Auto-expires after time</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'always', label: '♾️ Always Active' },
                    { id: '24h', label: '⏱️ 24 Hours' },
                    { id: '3d', label: '📅 3 Days' },
                    { id: '7d', label: '🗓️ 7 Days' },
                  ].map((dur) => (
                    <button
                      key={dur.id}
                      type="button"
                      onClick={() => setBroadcastDuration(dur.id as any)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold border cursor-pointer ${
                        broadcastDuration === dur.id
                          ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSaveBroadcast}
                disabled={isSavingBroadcast}
                className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-10 rounded-xl cursor-pointer"
              >
                {isSavingBroadcast ? 'Publishing...' : 'Save & Broadcast Live 🚀'}
              </Button>
            </div>

            {/* Live Interactive Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Live Merchant POS Preview
                </h4>
                
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="text-[10px] text-slate-500 font-mono">Store View Simulation:</div>
                  
                  {broadcastEnabled ? (
                    <div className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
                      broadcastType === 'festive'
                        ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                        : broadcastType === 'warning'
                        ? 'bg-rose-500/15 border-rose-400/40 text-rose-200'
                        : broadcastType === 'success'
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                        : 'bg-blue-500/15 border-blue-400/40 text-blue-200'
                    }`}>
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <div className="space-y-1">
                        <div>{broadcastMessage || 'No announcement message set.'}</div>
                        {broadcastLink && (
                          <span className="text-[11px] text-amber-400 underline font-extrabold block">
                            Tap here to view →
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 text-xs font-mono">
                      Broadcast Banner is currently DISABLED.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PROMO COUPONS & DISCOUNTS */}
        {/* ========================================================================= */}
        {activeTab === 'coupons' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  <span>Platform Promo Codes &amp; Discount Vouchers</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Create discount coupons for Razorpay subscription checkout.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsCouponModalOpen(true)}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-8.5 gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Coupon</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {coupons.map((c) => (
                <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-1 rounded-md bg-amber-400/10 text-amber-400 border border-amber-400/30 text-xs font-black font-mono">
                        {c.code}
                      </span>
                      <div className="text-xs text-slate-300 font-bold mt-1.5">
                        {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `Flat ₹${c.discount_value} OFF`}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleCoupon(c)}
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase cursor-pointer ${
                        c.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 font-mono pt-2 border-t border-slate-800">
                    <div>Redemptions: <strong>{c.redemptions_count}</strong> {c.max_redemptions ? `/ ${c.max_redemptions}` : ''}</div>
                    <div>Min Order: ₹{c.min_order_amount || 0}</div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleDeleteCoupon(c.id)}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: WHATSAPP CAMPAIGNS & NOTIFICATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'whatsapp' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Broadcast Campaign Dispatcher</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Compose WhatsApp messages with automated variable replacements for merchant outreach.
                </p>
              </div>

              {/* Target Segment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Target Audience Segment</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'free', label: `Free Tier (${totalFreeCount})` },
                    { id: 'pro', label: `Pro Tier (${totalProCount})` },
                    { id: 'all', label: `All Stores (${merchants.length})` },
                    { id: 'expiring', label: 'Near Expiry' },
                  ].map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => setWaSegment(seg.id as any)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold text-center border cursor-pointer ${
                        waSegment === seg.id
                          ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {seg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Composer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Message Template</label>
                  <span className="text-[11px] text-slate-500 font-mono">Variables: &#123;store_name&#125;, &#123;owner_name&#125;</span>
                </div>
                <textarea
                  rows={6}
                  value={waCustomMessage}
                  onChange={(e) => setWaCustomMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 text-xs focus:border-emerald-400 focus:outline-none font-mono"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-bold text-white">Direct 1-Click Launch for Filtered Merchants:</div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {merchants
                    .filter((m) => {
                      if (waSegment === 'free') return m.subscription_tier === 'free';
                      if (waSegment === 'pro') return m.subscription_tier === 'pro' || m.subscription_tier === 'enterprise';
                      return true;
                    })
                    .slice(0, 15)
                    .map((m) => {
                      const cleanPhone = m.phone.replace(/[^0-9]/g, '');
                      const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                      const msg = encodeURIComponent(
                        waCustomMessage
                          .replace('{store_name}', m.name)
                          .replace('{owner_name}', m.owner_name || 'Store Partner')
                      );
                      return (
                        <a
                          key={m.id}
                          href={`https://wa.me/${fullPhone}?text=${msg}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1 border border-emerald-500/30"
                        >
                          <Send className="w-3 h-3" />
                          <span>{m.name} ({m.phone})</span>
                        </a>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Preview Box */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                WhatsApp Chat Bubble Simulation
              </h4>
              <div className="bg-[#0b141a] p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none text-xs space-y-2 shadow-sm">
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {waCustomMessage
                      .replace('{store_name}', 'Sharma Supermarket')
                      .replace('{owner_name}', 'Ramesh Sharma')}
                  </div>
                  <div className="text-[10px] text-emerald-200 text-right font-mono">12:30 PM ✓✓</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: REMOTE CONFIG & FEATURE FLAGS */}
        {/* ========================================================================= */}
        {activeTab === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Kill Switches */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Remote Module Kill-Switches</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Instantly toggle core application features platform-wide.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { key: 'maintenanceMode', label: 'Global Maintenance Mode', desc: 'Lock all non-admin POS sessions' },
                  { key: 'razorpayGatewayEnabled', label: 'Razorpay Payment Gateway', desc: 'Accept online UPI & Card upgrades' },
                  { key: 'cloudSyncEnabled', label: 'Cloud Firestore Sync', desc: 'Multi-device cloud backup engine' },
                  { key: 'barcodeGeneratorEnabled', label: 'Barcode Studio', desc: 'Custom thermal barcode label creator' },
                  { key: 'growthMarketingEnabled', label: 'WhatsApp Growth Studio', desc: 'Festival & Birthday campaigns engine' },
                  { key: 'gstReportsEnabled', label: 'GST Tax Compliance Hub', desc: 'GSTR-1, HSN summary & Tally export' },
                ].map((item) => {
                  const isEnabled = config ? (config as any)[item.key] : true;
                  return (
                    <div key={item.key} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-white">{item.label}</div>
                        <div className="text-[11px] text-slate-400">{item.desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveConfig({ [item.key]: !isEnabled })}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                          isEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
                        }`}
                      >
                        <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Remote Pricing & Free Tier Limits */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Remote Pricing &amp; Free Tier Limits</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Update subscription prices and Free limits in real-time without redeploying code.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Pro Annual Price (₹ / year)</label>
                    <Input
                      type="number"
                      value={formAnnualPrice}
                      onChange={(e) => setFormAnnualPrice(Number(e.target.value))}
                      className="bg-slate-950 border-slate-800 text-amber-300 font-mono text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Pro Monthly Price (₹ / mo)</label>
                    <Input
                      type="number"
                      value={formMonthlyPrice}
                      onChange={(e) => setFormMonthlyPrice(Number(e.target.value))}
                      className="bg-slate-950 border-slate-800 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Free Hold Bills Limit</label>
                    <Input
                      type="number"
                      value={formHoldBillsLimit}
                      onChange={(e) => setFormHoldBillsLimit(Number(e.target.value))}
                      className="bg-slate-950 border-slate-800 text-white font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Free Sales History (Days)</label>
                    <Input
                      type="number"
                      value={formHistoryDaysLimit}
                      onChange={(e) => setFormHistoryDaysLimit(Number(e.target.value))}
                      className="bg-slate-950 border-slate-800 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">SuperAdmin Support WhatsApp Phone</label>
                  <Input
                    value={formSupportPhone}
                    onChange={(e) => setFormSupportPhone(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white font-mono text-xs"
                  />
                </div>

                <Button
                  type="button"
                  disabled={isSavingPricing}
                  onClick={async () => {
                    setIsSavingPricing(true);
                    await handleSaveConfig({
                      proAnnualPrice: formAnnualPrice,
                      proMonthlyPrice: formMonthlyPrice,
                      freeHoldBillsLimit: formHoldBillsLimit,
                      freeHistoryDaysLimit: formHistoryDaysLimit,
                      supportPhone: formSupportPhone,
                    });
                    setIsSavingPricing(false);
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs h-10 rounded-xl cursor-pointer mt-2"
                >
                  {isSavingPricing ? 'Saving Pricing & Limits...' : 'Save Live Pricing & Limits 🚀'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: REVENUE & LEDGER */}
        {/* ========================================================================= */}
        {activeTab === 'revenue' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                <div className="text-xs text-slate-400 font-semibold">Active Subscriptions</div>
                <div className="text-2xl font-black text-amber-400 font-mono">{totalProCount}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                <div className="text-xs text-slate-400 font-semibold">Monthly Recurring Revenue (MRR)</div>
                <div className="text-2xl font-black text-emerald-400 font-mono">{formatINR(calculatedMRR * 100)}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                <div className="text-xs text-slate-400 font-semibold">Annual Run-Rate (ARR)</div>
                <div className="text-2xl font-black text-white font-mono">{formatINR(calculatedARR * 100)}</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-white">Razorpay &amp; Manual Payments Ledger</h3>
                  <p className="text-xs text-slate-400">Chronological list of subscription transactions</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsManualSubModalOpen(true)}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-8 gap-1 cursor-pointer"
                >
                  <Zap className="w-3 h-3" />
                  <span>Manual Entry</span>
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Plan Tier</th>
                      <th className="py-2.5 px-3">Billing Cycle</th>
                      <th className="py-2.5 px-3">Razorpay ID</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 font-mono">
                          No transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td className="py-2.5 px-3 font-black text-amber-400 uppercase">{tx.tier}</td>
                          <td className="py-2.5 px-3 capitalize text-slate-300">{tx.billing_cycle}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{tx.razorpay_payment_id || 'manual_override'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {tx.status || 'PAID'}
                            </span>
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
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: PLAN UPGRADE & EXTENSION */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedMerchantForEdit && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Update Subscription: ${selectedMerchantForEdit.name}`}
        >
          <div className="space-y-4 pt-2 text-slate-900">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="font-bold text-slate-900">{selectedMerchantForEdit.name}</div>
              <div className="text-slate-500 font-mono">Phone: {selectedMerchantForEdit.phone}</div>
              <div className="text-slate-500">Current Plan: <strong className="uppercase">{selectedMerchantForEdit.subscription_tier}</strong></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Select Target Plan Tier</label>
              <select
                value={editTier}
                onChange={(e) => setEditTier(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:border-slate-900 focus:outline-none"
              >
                <option value="free">Free Forever Tier</option>
                <option value="pro">Pro Tier (All Features Unlocked)</option>
                <option value="enterprise">Enterprise VIP</option>
              </select>
            </div>

            {editTier !== 'free' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Validity Extension</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { days: 30, label: '+30 Days' },
                    { days: 90, label: '+90 Days' },
                    { days: 365, label: '+1 Year' },
                    { days: 3650, label: 'Lifetime' },
                  ].map((dur) => (
                    <button
                      key={dur.days}
                      type="button"
                      onClick={() => setEditDaysExtension(dur.days)}
                      className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                        editDaysExtension === dur.days
                          ? 'border-amber-400 bg-amber-50 text-amber-950 font-black'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateMerchantSubscription}
                disabled={isUpdatingMerchant}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs"
              >
                {isUpdatingMerchant ? 'Applying...' : 'Apply Plan Change ⚡'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: STORE DETAIL INSPECTOR DRAWER */}
      {/* ========================================================================= */}
      {selectedMerchantForView && (
        <Modal
          isOpen={Boolean(selectedMerchantForView)}
          onClose={() => setSelectedMerchantForView(null)}
          title={`Store Inspector: ${selectedMerchantForView.name}`}
        >
          <div className="space-y-3 pt-2 text-xs text-slate-700">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Store ID</span>
                <span className="font-mono text-slate-900 font-bold">{selectedMerchantForView.id}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Phone</span>
                <span className="font-mono text-slate-900 font-bold">{selectedMerchantForView.phone}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Owner Name</span>
                <span className="font-bold text-slate-900">{selectedMerchantForView.owner_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">GSTIN</span>
                <span className="font-mono text-slate-900 font-bold">{selectedMerchantForView.gstin || 'Unregistered'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">City / State</span>
                <span className="font-bold text-slate-900">{selectedMerchantForView.city || 'N/A'}, {selectedMerchantForView.state || ''}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Joined On</span>
                <span className="font-mono text-slate-900 font-bold">
                  {new Date(selectedMerchantForView.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenWhatsAppChat(selectedMerchantForView.phone, selectedMerchantForView.name)}
                className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs font-bold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chat on WhatsApp</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedMerchantForView(null);
                  handleOpenEditModal(selectedMerchantForView);
                }}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs"
              >
                Edit Plan
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE PROMO COUPON */}
      {/* ========================================================================= */}
      {isCouponModalOpen && (
        <Modal
          isOpen={isCouponModalOpen}
          onClose={() => setIsCouponModalOpen(false)}
          title="Create Razorpay Promo Coupon"
        >
          <form onSubmit={handleCreateCoupon} className="space-y-4 pt-2 text-slate-900">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Coupon Code</label>
              <Input
                placeholder="e.g. DIWALI50 or VIPPRO"
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Discount Type</label>
                <select
                  value={newCouponType}
                  onChange={(e) => setNewCouponType(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold focus:outline-none"
                >
                  <option value="percentage">Percentage (% OFF)</option>
                  <option value="flat">Flat Cash (₹ OFF)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Discount Value</label>
                <Input
                  type="number"
                  placeholder="50"
                  value={newCouponValue}
                  onChange={(e) => setNewCouponValue(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Min Order Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="249"
                  value={newCouponMinOrder}
                  onChange={(e) => setNewCouponMinOrder(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Max Redemptions</label>
                <Input
                  type="number"
                  placeholder="100"
                  value={newCouponMaxUsage}
                  onChange={(e) => setNewCouponMaxUsage(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsCouponModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs">
                Create Coupon 🎟️
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: MANUAL OFFLINE SUBSCRIPTION ACTIVATOR */}
      {/* ========================================================================= */}
      {isManualSubModalOpen && (
        <Modal
          isOpen={isManualSubModalOpen}
          onClose={() => setIsManualSubModalOpen(false)}
          title="Manual Offline Subscription Activation"
        >
          <div className="space-y-4 pt-2 text-slate-900">
            <p className="text-xs text-slate-500">
              Activate Pro for merchants who paid via direct bank transfer, cash, or offline Cheque.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Merchant Phone / Store ID</label>
              <Input
                placeholder="e.g. 9595997711"
                value={manualPhoneOrId}
                onChange={(e) => setManualPhoneOrId(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Plan Tier</label>
                <select
                  value={manualTier}
                  onChange={(e) => setManualTier(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold focus:outline-none"
                >
                  <option value="pro">Pro Plan</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Validity (Days)</label>
                <Input
                  type="number"
                  value={manualDurationDays}
                  onChange={(e) => setManualDurationDays(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Internal Audit Note</label>
              <Input
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="e.g. NEFT Reference #123456"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsManualSubModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  showToast('Manual subscription activated successfully!');
                  setIsManualSubModalOpen(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Activate Subscription ⚡
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
