'use client';

import React, { useState, useEffect } from 'react';
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
  ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

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

export default function SuperAdminPage() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Dashboard Data State
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [merchants, setMerchants] = useState<MerchantRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'merchants' | 'broadcast' | 'analytics'>('merchants');

  // Edit / Upgrade Modal State
  const [selectedMerchantForEdit, setSelectedMerchantForEdit] = useState<MerchantRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editTier, setEditTier] = useState<string>('pro');
  const [editDaysExtension, setEditDaysExtension] = useState<number>(30);
  const [isUpdatingMerchant, setIsUpdatingMerchant] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
  const filteredMerchants = merchants.filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      m.name?.toLowerCase().includes(q) ||
      m.owner_name?.toLowerCase().includes(q) ||
      m.phone?.includes(q) ||
      m.city?.toLowerCase().includes(q);

    const matchesTier =
      selectedTierFilter === 'all' || m.subscription_tier === selectedTierFilter;

    return matchesSearch && matchesTier;
  });

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
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-950 text-slate-100">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">KamaiPlus SuperAdmin</h1>
            <p className="text-xs text-slate-400">Restricted Platform Control &amp; Merchant Directory</p>
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
                  <span>Enter SuperAdmin Password</span>
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
                {isLoggingIn ? 'Authenticating...' : 'Access Admin Portal'}
              </Button>

              <p className="text-[11px] text-center text-slate-500">
                Authorized for platform owner only • Access is logged
              </p>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: 2. LOGGED IN SUPERADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
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
          <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">SuperAdmin Center</h1>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase">
                Owner Access
              </span>
            </div>
            <p className="text-xs text-slate-400">Pan-India Merchants, Subscriptions &amp; Platform Controls</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            <span>Total Registered Shops</span>
            <Store className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {metrics?.totalBusinesses ?? merchants.length}
          </div>
          <p className="text-[11px] text-slate-500">Pan-India retail stores</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Paid Pro Users</span>
            <Crown className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-300">
            {metrics?.tiers.pro ?? merchants.filter((m) => m.subscription_tier === 'pro').length}
          </div>
          <p className="text-[11px] text-purple-400/80">Active premium subscribers</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Free Tier Users</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-300">
            {metrics?.tiers.free ?? merchants.filter((m) => !m.subscription_tier || m.subscription_tier === 'free').length}
          </div>
          <p className="text-[11px] text-slate-500">Conversion pipeline</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Platform Status</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>100% Operational</span>
          </div>
          <p className="text-[11px] text-slate-500">Firebase &amp; Supabase active</p>
        </div>
      </div>

      {/* SEARCH & TIER FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchants by store name, owner, phone, or city..."
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
          <span className="text-[11px] text-slate-400 font-medium">Click WhatsApp to connect directly</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <th className="py-3 px-4">Store &amp; Owner</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">City / State</th>
                <th className="py-3 px-3">Subscription Plan</th>
                <th className="py-3 px-3">Joined Date</th>
                <th className="py-3 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredMerchants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No merchants found matching your query.
                  </td>
                </tr>
              ) : (
                filteredMerchants.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{m.name || 'Unnamed Store'}</div>
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
                            title="Chat on WhatsApp"
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
                          <span>Change Plan</span>
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

      {/* MODAL: 1-CLICK PLAN OVERRIDE */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Plan: ${selectedMerchantForEdit?.name || 'Store'}`}
        size="md"
      >
        <div className="space-y-4 p-2 text-slate-900">
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-800">Owner: {selectedMerchantForEdit?.owner_name}</div>
            <div className="text-slate-600 font-mono">Phone: {selectedMerchantForEdit?.phone}</div>
            <div className="text-slate-600">Current Plan: <span className="font-bold uppercase text-amber-700">{selectedMerchantForEdit?.subscription_tier || 'Free'}</span></div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Select New Subscription Tier</label>
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
            <label className="text-xs font-bold text-slate-700">Extend Validity</label>
            <select
              value={editDaysExtension}
              onChange={(e) => setEditDaysExtension(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900"
            >
              <option value={30}>+30 Days (1 Month)</option>
              <option value={90}>+90 Days (3 Months)</option>
              <option value={365}>+365 Days (1 Year)</option>
              <option value={3650}>Lifetime (10 Years)</option>
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
