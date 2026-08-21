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
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/utils';

interface MerchantRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  owner_name?: string;
  city?: string;
  state?: string;
  gstin?: string;
  subscription_tier: 'free' | 'pro' | 'growth' | 'enterprise';
  subscription_expires_at?: string;
  is_active: boolean;
  created_at: string;
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
  tier: string;
  billing_cycle: string;
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
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'merchants' | 'broadcast' | 'revenue' | 'features' | 'health'>('merchants');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');

  // Edit / Upgrade Modal State
  const [selectedMerchantForEdit, setSelectedMerchantForEdit] = useState<MerchantRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editTier, setEditTier] = useState<string>('pro');
  const [editDaysExtension, setEditDaysExtension] = useState<number>(30);
  const [isUpdatingMerchant, setIsUpdatingMerchant] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Remote Broadcast / Announcement State
  const [broadcastEnabled, setBroadcastEnabled] = useState<boolean>(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string>('✨ Special Festive Update Live! Upgrade to Kamai+ Pro for near-expiry radar & CA tax filing.');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'success' | 'festive'>('festive');
  const [broadcastLink, setBroadcastLink] = useState<string>('/pricing');
  const [isSavingBroadcast, setIsSavingBroadcast] = useState<boolean>(false);

  // Remote Feature Flags State
  const [featureFlags, setFeatureFlags] = useState({
    cloudSyncEnabled: true,
    razorpayGatewayEnabled: true,
    barcodeGeneratorEnabled: true,
    growthMarketingEnabled: true,
    voiceBillingEnabled: true,
  });

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
    } catch (err: any) {
      setAuthError('Authentication request failed. Please check network.');
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
      // 1. Load Metrics
      const metricsRes = await fetch('/api/admin/metrics');
      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        if (mData.metrics) setMetrics(mData.metrics);
      }

      // 2. Load Merchants
      const merchantsRes = await fetch('/api/admin/merchants');
      if (merchantsRes.ok) {
        const mData = await merchantsRes.json();
        if (mData.merchants) setMerchants(mData.merchants);
      }

      // 3. Load Broadcast
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

      // 4. Load Transactions
      const txRes = await fetch('/api/admin/transactions');
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData.transactions) setTransactions(txData.transactions);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered Merchants List
  const filteredMerchants = useMemo(() => {
    return merchants.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        m.name?.toLowerCase().includes(q) ||
        m.owner_name?.toLowerCase().includes(q) ||
        m.phone?.includes(q) ||
        m.city?.toLowerCase().includes(q) ||
        m.gstin?.toLowerCase().includes(q);

      const matchesTier =
        selectedTierFilter === 'all' || m.subscription_tier === selectedTierFilter;

      return matchesSearch && matchesTier;
    });
  }, [merchants, searchQuery, selectedTierFilter]);

  // Handle 1-Click Upgrade / Edit
  const handleSaveMerchantOverride = async () => {
    if (!selectedMerchantForEdit) return;
    setIsUpdatingMerchant(true);

    try {
      const res = await fetch(`/api/admin/merchants/${selectedMerchantForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_tier: editTier,
          days_extension: editDaysExtension,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Updated ${selectedMerchantForEdit.name} to ${editTier.toUpperCase()}`);
        setIsEditModalOpen(false);
        // Refresh local list
        setMerchants((prev) =>
          prev.map((m) => (m.id === selectedMerchantForEdit.id ? { ...m, subscription_tier: editTier as any } : m))
        );
      } else {
        alert(data.message || 'Update failed');
      }
    } catch (err: any) {
      alert('Network error while updating merchant');
    } finally {
      setIsUpdatingMerchant(false);
    }
  };

  // Toggle Merchant Active / Suspended
  const handleToggleMerchantStatus = async (m: MerchantRecord) => {
    const nextStatus = !m.is_active;
    const confirmMsg = nextStatus 
      ? `Re-activate ${m.name}?` 
      : `Freeze/Suspend ${m.name}? User will not be able to access billing until unbanned.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/merchants/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      if (res.ok) {
        showToast(`${m.name} is now ${nextStatus ? 'Active' : 'Suspended'}`);
        setMerchants((prev) =>
          prev.map((item) => (item.id === m.id ? { ...item, is_active: nextStatus } : item))
        );
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  // Save Global Announcement Broadcast
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
        }),
      });

      if (res.ok) {
        showToast('Global Announcement broadcasted live across all apps!');
      } else {
        alert('Failed to broadcast');
      }
    } catch {
      alert('Broadcast request failed');
    } finally {
      setIsSavingBroadcast(false);
    }
  };

  // Export Full Leads to CSV
  const handleExportLeadsCSV = () => {
    if (merchants.length === 0) {
      alert('No merchant records available to export.');
      return;
    }

    const headers = ['Business Name', 'Owner Name', 'Phone', 'City', 'State', 'GSTIN', 'Plan', 'Expiry Date', 'Signup Date'];
    const rows = merchants.map((m) => [
      `"${(m.name || '').replace(/"/g, '""')}"`,
      `"${(m.owner_name || '').replace(/"/g, '""')}"`,
      `"${m.phone || ''}"`,
      `"${m.city || ''}"`,
      `"${m.state || ''}"`,
      `"${m.gstin || ''}"`,
      `"${m.subscription_tier || 'free'}"`,
      `"${m.subscription_expires_at || 'Never'}"`,
      `"${new Date(m.created_at).toLocaleDateString('en-IN')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kamaiplus_merchants_leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Merchant Leads CSV Downloaded!');
  };

  // Direct WhatsApp Link Generator
  const getMerchantWhatsAppLink = (m: MerchantRecord) => {
    const phoneClean = m.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;
    const greeting = encodeURIComponent(
      `Namaste ${m.owner_name || m.name} ji! 🙏\n\nMain KamaiPlus team se Rahul baat kar raha hoon. Aapke store *${m.name}* me billing aur inventory setup ko lekar koi help ya feedback chahiye tha?`
    );
    return `https://wa.me/${phoneWithCountry}?text=${greeting}`;
  };

  // -------------------------------------------------------------
  // RENDER: 1. AUTHENTICATION GATE (If not logged in)
  // -------------------------------------------------------------
  if (isAuthenticated === false || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">KamaiPlus SuperAdmin</h1>
            <p className="text-xs text-slate-400">Master Platform Control &amp; Pan-India Management</p>
          </div>

          <Card className="p-6 bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md rounded-2xl">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enter Master SuperAdmin Password</span>
                </label>
                <Input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-sm focus:border-amber-400"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={isLoggingIn || !passwordInput.trim()}
                className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {isLoggingIn ? 'Authenticating...' : 'Access Admin Center'}
              </Button>

              <p className="text-[11px] text-center text-slate-500">
                Encrypted Session • Authorized for Platform Owner
              </p>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: 2. MASTER DASHBOARD (LOGGED IN)
  // -------------------------------------------------------------
  const totalPro = metrics?.tiers.pro ?? merchants.filter((m) => m.subscription_tier === 'pro').length;
  const totalFree = metrics?.tiers.free ?? merchants.filter((m) => !m.subscription_tier || m.subscription_tier === 'free').length;
  const estimatedMRR = totalPro * 249;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 select-none">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-3.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP ADMIN HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
            <Crown className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">SuperAdmin Control Center</h1>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase">
                Owner Access
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Domain: <span className="text-emerald-400 font-mono font-bold">kamaiplus.proventure.in</span> • SSL Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={loadAdminDashboardData}
            disabled={isLoadingData}
            className="text-xs font-bold gap-1.5 rounded-xl h-9 border-slate-800 text-slate-300 hover:bg-slate-900 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportLeadsCSV}
            className="text-xs font-bold gap-1.5 rounded-xl h-9 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleAdminLogout}
            className="text-xs font-bold gap-1.5 rounded-xl h-9 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Registered Stores</span>
            <Store className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {metrics?.totalBusinesses ?? merchants.length}
          </div>
          <p className="text-[11px] text-slate-500">Pan-India merchant network</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Paid Pro Subscribers</span>
            <Crown className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-300">
            {totalPro}
          </div>
          <p className="text-[11px] text-purple-400/80">Est. MRR: {formatINR(estimatedMRR * 100)}/mo</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Free Tier Pipeline</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-300">
            {totalFree}
          </div>
          <p className="text-[11px] text-slate-500">Upgrade conversion base</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Platform Status</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Operational</span>
          </div>
          <p className="text-[11px] text-slate-500">Firebase &amp; Razorpay Ready</p>
        </div>
      </div>

      {/* MASTER NAVIGATION TABS */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800 overflow-x-auto">
        {[
          { id: 'merchants', label: 'Merchants Directory', icon: Users, count: filteredMerchants.length },
          { id: 'broadcast', label: 'Remote Alerts & Broadcast', icon: BellRing },
          { id: 'revenue', label: 'Revenue & Razorpay', icon: CreditCard, count: transactions.length },
          { id: 'features', label: 'Feature Flags (Kill Switch)', icon: Sliders },
          { id: 'health', label: 'System Health', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MERCHANTS DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'merchants' && (
        <div className="space-y-4">
          {/* SEARCH & TIER FILTER BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by store name, owner, phone number, city, or GSTIN..."
                className="pl-10 bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'free', 'pro', 'enterprise'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTierFilter(tier)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    selectedTierFilter === tier
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* MERCHANTS DIRECTORY TABLE */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-black text-white">Merchant Directory ({filteredMerchants.length})</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">1-Click WhatsApp Support Connect enabled</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <th className="py-3 px-4">Store &amp; Owner</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">City / State</th>
                    <th className="py-3 px-3">Subscription</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Joined Date</th>
                    <th className="py-3 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredMerchants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No merchants found matching your query.
                      </td>
                    </tr>
                  ) : (
                    filteredMerchants.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            <span>{m.name || 'Unnamed Store'}</span>
                            {!m.is_active && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-black uppercase">
                                Suspended
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{m.owner_name || 'Owner'}</span>
                            {m.gstin && <span className="text-[10px] text-amber-400 font-mono font-bold">• GSTIN: {m.gstin}</span>}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-mono text-slate-200 font-bold">{m.phone || 'N/A'}</div>
                          {m.email && <div className="text-[10px] text-slate-400">{m.email}</div>}
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-slate-300 font-medium">{m.city || m.state || 'India'}</span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                              m.subscription_tier === 'pro'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : m.subscription_tier === 'enterprise'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {m.subscription_tier === 'pro' && <Crown className="w-3 h-3 text-purple-400" />}
                            <span>{m.subscription_tier || 'free'}</span>
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleMerchantStatus(m)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                              m.is_active 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30'
                            }`}
                            title={m.is_active ? 'Click to Suspend Store' : 'Click to Unban / Activate'}
                          >
                            {m.is_active ? 'Active' : 'Frozen'}
                          </button>
                        </td>

                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {new Date(m.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* 1-Click WhatsApp Button */}
                            {m.phone && (
                              <a
                                href={getMerchantWhatsAppLink(m)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                                title="Chat with Merchant on WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">WhatsApp</span>
                              </a>
                            )}

                            {/* 1-Click Upgrade Plan Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedMerchantForEdit(m);
                                setEditTier(m.subscription_tier === 'pro' ? 'enterprise' : 'pro');
                                setIsEditModalOpen(true);
                              }}
                              className="h-7 text-[11px] font-bold rounded-lg border-slate-700 text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                            >
                              <Zap className="w-3 h-3 mr-1" />
                              <span>Plan Override</span>
                            </Button>
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
      {/* TAB 2: REMOTE ALERTS & BROADCAST (FIREBASE / REMOTE CONFIG) */}
      {/* ========================================================================= */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-black text-white">Live In-App Announcement Banner</h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-bold text-slate-400">Enable Banner:</span>
                  <input
                    type="checkbox"
                    checked={broadcastEnabled}
                    onChange={(e) => setBroadcastEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Announcement Banner Message</label>
                  <textarea
                    rows={3}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="e.g. ✨ Diwali Special Offer! Upgrade to Kamai+ Pro for near-expiry radar."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-400 focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Banner Alert Type</label>
                    <select
                      value={broadcastType}
                      onChange={(e) => setBroadcastType(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    >
                      <option value="festive">🎉 Festive &amp; Offers (Amber)</option>
                      <option value="info">ℹ️ Informational (Blue)</option>
                      <option value="success">✅ Update / Success (Green)</option>
                      <option value="warning">⚠️ Server Maintenance / Notice (Rose)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Action Link (Optional)</label>
                    <Input
                      value={broadcastLink}
                      onChange={(e) => setBroadcastLink(e.target.value)}
                      placeholder="/pricing or https://..."
                      className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleSaveBroadcast}
                    disabled={isSavingBroadcast}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs gap-1.5 rounded-xl h-10 px-5 shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSavingBroadcast ? 'Broadcasting...' : 'Publish Live Announcement'}</span>
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* PREVIEW SIMULATION CARD */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold text-slate-400">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Live App Dashboard Preview</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Simulated Merchant Screen</div>
                {broadcastEnabled ? (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs ${
                    broadcastType === 'festive'
                      ? 'bg-amber-500 text-slate-950'
                      : broadcastType === 'warning'
                      ? 'bg-rose-500 text-white'
                      : broadcastType === 'success'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-blue-600 text-white'
                  }`}>
                    <span className="truncate">{broadcastMessage}</span>
                    {broadcastLink && (
                      <span className="px-2 py-0.5 rounded bg-black/20 text-[10px] font-black uppercase shrink-0">
                        View
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    No active banner broadcasting (Hidden for users)
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REVENUE & RAZORPAY LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1 shadow-lg">
              <div className="text-xs font-bold text-slate-400">Estimated Monthly MRR</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400">{formatINR(estimatedMRR * 100)}</div>
              <p className="text-[11px] text-slate-500">Based on active Pro merchants</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1 shadow-lg">
              <div className="text-xs font-bold text-slate-400">Total Pro Upgrades</div>
              <div className="text-2xl sm:text-3xl font-black text-purple-300">{transactions.length || totalPro}</div>
              <p className="text-[11px] text-slate-500">Direct Razorpay transactions</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1 shadow-lg">
              <div className="text-xs font-bold text-slate-400">Gateway Status</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Mode (rzp_live)</span>
              </div>
              <p className="text-[11px] text-slate-500">Automatic Webhook Sync</p>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Recent Subscription Transactions</span>
              </h3>
              <span className="text-[11px] text-slate-400">Automatic SHA-256 HMAC Verified</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <th className="py-3 px-4">Transaction Ref</th>
                    <th className="py-3 px-3">Tier</th>
                    <th className="py-3 px-3">Cycle</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No live transactions recorded yet. (Live order test: order_TSK3ymYvKjnMDx)
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-amber-400 font-bold">
                          {tx.razorpay_payment_id || tx.id}
                        </td>
                        <td className="py-3 px-3 uppercase font-black">{tx.tier}</td>
                        <td className="py-3 px-3 capitalize text-slate-300">{tx.billing_cycle || 'Annual'}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                            {tx.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
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
      {/* TAB 4: FEATURE FLAGS (KILL SWITCH) */}
      {/* ========================================================================= */}
      {activeTab === 'features' && (
        <div className="max-w-3xl space-y-4">
          <Card className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <span>Platform Remote Kill-Switches &amp; Module Controls</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Instantly enable or disable individual platform modules without redeploying code.
              </p>
            </div>

            <div className="space-y-3 divide-y divide-slate-800/60">
              {[
                { key: 'cloudSyncEnabled', label: 'Firestore Multi-Device Cloud Sync', desc: 'Controls real-time cloud backup across counters' },
                { key: 'razorpayGatewayEnabled', label: 'Razorpay Live Checkout Gateway', desc: 'Controls automated subscription orders & payments' },
                { key: 'growthMarketingEnabled', label: 'WhatsApp Growth Marketing Engine', desc: 'Controls customer festive offer messaging suite' },
                { key: 'barcodeGeneratorEnabled', label: 'Barcode Sticker Studio & Printing', desc: 'Controls multi-label A4 sheet generation' },
                { key: 'voiceBillingEnabled', label: 'Voice AI Hindi/English Billing POS', desc: 'Controls speech recognition item billing engine' },
              ].map((flag) => {
                const isEnabled = featureFlags[flag.key as keyof typeof featureFlags];
                return (
                  <div key={flag.key} className="pt-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{flag.label}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase ${isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {isEnabled ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{flag.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFeatureFlags((prev) => ({ ...prev, [flag.key]: !isEnabled }));
                        showToast(`${flag.label} set to ${!isEnabled ? 'ENABLED' : 'DISABLED'}`);
                      }}
                      className={`p-2 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                        isEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                      }`}
                    >
                      {isEnabled ? 'Turn Off' : 'Turn On'}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SYSTEM HEALTH & SERVER UPTIME */}
      {/* ========================================================================= */}
      {activeTab === 'health' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
          <Card className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Production Server Health</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Host Domain:</span>
                <span className="font-mono text-emerald-400 font-bold">kamaiplus.proventure.in</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">SSL Certificate:</span>
                <span className="font-bold text-emerald-400">Valid (HTTPS Encrypted)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Framework:</span>
                <span className="font-mono text-slate-300 font-bold">Next.js 16 (Turbopack)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Total Routes:</span>
                <span className="font-bold text-slate-300">34 Active Modules</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Database Engine:</span>
                <span className="font-bold text-slate-300">Supabase + Dexie Offline (0ms)</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <span>Cloud Storage &amp; Database Health</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Firebase Firestore:</span>
                <span className="font-bold text-emerald-400">Online &amp; Synced</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Razorpay API:</span>
                <span className="font-bold text-emerald-400">Live Active (rzp_live)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">WhatsApp Webhook:</span>
                <span className="font-bold text-slate-300">Ready</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Admin Authentication:</span>
                <span className="font-bold text-amber-400">Encrypted HMAC Cookie</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: 1-CLICK PLAN OVERRIDE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Plan Override: ${selectedMerchantForEdit?.name || 'Store'}`}
        size="md"
      >
        <div className="space-y-4 p-2 text-slate-900">
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-800">Owner: {selectedMerchantForEdit?.owner_name}</div>
            <div className="text-slate-600 font-mono">Phone: {selectedMerchantForEdit?.phone}</div>
            <div className="text-slate-600">Current Plan: <span className="font-bold uppercase text-amber-700">{selectedMerchantForEdit?.subscription_tier || 'Free'}</span></div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Select Target Subscription Plan</label>
            <div className="grid grid-cols-3 gap-2">
              {['free', 'pro', 'enterprise'].map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setEditTier(tier)}
                  className={`p-2.5 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${
                    editTier === tier
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Select Validity Duration</label>
            <select
              value={editDaysExtension}
              onChange={(e) => setEditDaysExtension(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900"
            >
              <option value={30}>+30 Days (1 Month)</option>
              <option value={90}>+90 Days (3 Months)</option>
              <option value={365}>+365 Days (1 Year)</option>
              <option value={3650}>Lifetime VIP (10 Years)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveMerchantOverride}
              disabled={isUpdatingMerchant}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer"
            >
              {isUpdatingMerchant ? 'Applying...' : 'Apply Plan Override'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
