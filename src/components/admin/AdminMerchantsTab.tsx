'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Crown, 
  Phone, 
  MapPin, 
  Edit3, 
  Trash2, 
  Eye, 
  X, 
  Sparkles, 
  Calendar,
  Store,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  ShieldCheck,
  Building2,
  Download,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';
import { Button } from '@/components/ui/Button';
import { MerchantRecord } from '@/app/admin/page';
import { AuthUser, setStoredUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface AdminMerchantsTabProps {
  merchants: MerchantRecord[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedTierFilter: string;
  setSelectedTierFilter: (val: string) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (val: string) => void;
  onOpenAddMerchantModal: () => void;
  onOpenManualSubModal: () => void;
  onViewMerchant: (merchant: MerchantRecord) => void;
  onEditMerchant: (merchant: MerchantRecord) => void;
  onDeleteMerchant: (merchant: MerchantRecord) => void;
  onSendWhatsApp: (merchant: MerchantRecord) => void;
}

export const AdminMerchantsTab: React.FC<AdminMerchantsTabProps> = ({
  merchants,
  searchQuery,
  setSearchQuery,
  selectedTierFilter,
  setSelectedTierFilter,
  selectedStatusFilter,
  setSelectedStatusFilter,
  onOpenAddMerchantModal,
  onOpenManualSubModal,
  onViewMerchant,
  onEditMerchant,
  onDeleteMerchant,
  onSendWhatsApp,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 18;

  // Reset page when filter or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTierFilter, selectedStatusFilter]);

  const filteredMerchants = merchants.filter((m) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (m.name || '').toLowerCase().includes(q);
      const matchOwner = (m.owner_name || '').toLowerCase().includes(q);
      const matchPhone = (m.phone || '').includes(q);
      const matchCity = (m.city || '').toLowerCase().includes(q);
      const matchGstin = (m.gstin || '').toLowerCase().includes(q);
      if (!matchName && !matchOwner && !matchPhone && !matchCity && !matchGstin) {
        return false;
      }
    }

    // 2. Tier Filter
    if (selectedTierFilter !== 'all') {
      if (selectedTierFilter === 'pro' && m.subscription_tier !== 'pro' && m.subscription_tier !== 'growth' && m.subscription_tier !== 'enterprise') {
        return false;
      }
      if (selectedTierFilter === 'free' && m.subscription_tier !== 'free') {
        return false;
      }
    }

    // 3. Status Filter
    if (selectedStatusFilter === 'active' && !m.is_active) return false;
    if (selectedStatusFilter === 'inactive' && m.is_active) return false;

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredMerchants.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMerchants = filteredMerchants.slice((safePage - 1) * pageSize, safePage * pageSize);

  // 1-Click CSV/Excel Export
  const handleExportCSV = () => {
    if (!filteredMerchants || filteredMerchants.length === 0) return;

    const headers = [
      'Store ID',
      'Store Name',
      'Owner Name',
      'Phone',
      'Email',
      'City',
      'State',
      'Address',
      'GSTIN',
      'Category',
      'Subscription Tier',
      'Valid Until',
      'Status',
      'Registration Date',
    ];

    const escapeCSV = (val?: string | number | boolean | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredMerchants.map((m) => [
      escapeCSV(m.id),
      escapeCSV(m.name),
      escapeCSV(m.owner_name || ''),
      escapeCSV(m.phone ? `+91 ${m.phone}` : ''),
      escapeCSV(m.email || ''),
      escapeCSV(m.city || ''),
      escapeCSV(m.state || ''),
      escapeCSV(m.address || ''),
      escapeCSV(m.gstin || ''),
      escapeCSV(m.business_type || 'Retail'),
      escapeCSV(m.subscription_tier?.toUpperCase()),
      escapeCSV(m.subscription_valid_until || m.subscription_expires_at || 'Perpetual'),
      escapeCSV(m.is_active ? 'Active' : 'Frozen'),
      escapeCSV(new Date(m.created_at).toLocaleDateString('en-IN')),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `kamai_merchants_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1-Click Store Inspection (Impersonation in Support Mode)
  const handleInspectStore = (m: MerchantRecord) => {
    if (!window.confirm(`Open "${m.name}" (+91 ${m.phone}) in Support Mode?\n\nA SuperAdmin banner will appear at the top allowing you to return to Admin anytime.`)) {
      return;
    }

    const backupUser = localStorage.getItem('kamai_user');
    sessionStorage.setItem('kamai_admin_impersonation', JSON.stringify({
      admin_active: true,
      merchant_id: m.id,
      merchant_name: m.name,
      merchant_phone: m.phone,
      backup_user: backupUser,
    }));

    const impersonatedUser: AuthUser = {
      uid: m.id,
      id: m.id,
      phone: m.phone,
      name: m.owner_name || m.name,
      business_id: m.id,
      business_name: m.name,
      shop_name: m.name,
      role: 'owner',
      login_timestamp: Date.now(),
    };

    setStoredUser(impersonatedUser);
    window.location.href = '/';
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Header Search Toolbar & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/90 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-xl">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search stores by name, owner, phone, city, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-800/90 rounded-xl border border-slate-700 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium transition shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {/* View mode toggle */}
          <div className="hidden sm:flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded-lg transition cursor-pointer",
                viewMode === 'grid' ? "bg-slate-700 text-amber-400 shadow-xs" : "text-slate-400 hover:text-white"
              )}
              title="Grid Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                "p-1.5 rounded-lg transition cursor-pointer",
                viewMode === 'table' ? "bg-slate-700 text-amber-400 shadow-xs" : "text-slate-400 hover:text-white"
              )}
              title="Data Table"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredMerchants.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-40 disabled:pointer-events-none"
            title="Download CSV of stores"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Export CSV</span>
          </button>

          <Button
            size="sm"
            onClick={onOpenManualSubModal}
            className="font-bold border-amber-400/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 text-xs px-3.5 py-2 shadow-xs cursor-pointer rounded-xl gap-1.5"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Grant Pro</span>
          </Button>

          <Button
            size="sm"
            onClick={onOpenAddMerchantModal}
            className="font-black bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs px-4 py-2 shadow-md shadow-amber-500/10 cursor-pointer gap-1.5 rounded-xl"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Store</span>
          </Button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-2.5 px-3.5 rounded-2xl border border-slate-800/80 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Plan:</span>
          {['all', 'pro', 'free'].map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedTierFilter(tier)}
              className={cn(
                "px-3 py-1 rounded-xl font-bold transition cursor-pointer capitalize text-[11px]",
                selectedTierFilter === tier
                  ? "bg-amber-400 text-slate-950 shadow-xs"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60"
              )}
            >
              {tier === 'all' ? 'All Tiers' : tier === 'pro' ? '⭐ Pro & Growth' : 'Free Trial'}
            </button>
          ))}

          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider pl-2">Status:</span>
          {['all', 'active', 'inactive'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatusFilter(st)}
              className={cn(
                "px-3 py-1 rounded-xl font-bold transition cursor-pointer capitalize text-[11px]",
                selectedStatusFilter === st
                  ? "bg-slate-100 text-slate-950 shadow-xs font-black"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60"
              )}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="text-slate-400 text-xs font-mono">
          Showing <span className="font-bold text-amber-400">{filteredMerchants.length}</span> of {merchants.length} stores
        </div>
      </div>

      {/* 3. Merchants View (Grid or Table) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedMerchants.map((m) => {
            const isPro = m.subscription_tier === 'pro' || m.subscription_tier === 'growth' || m.subscription_tier === 'enterprise';
            const initials = m.name?.slice(0, 2).toUpperCase() || 'KP';

            return (
              <div
                key={m.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between space-y-3.5 group text-slate-100"
              >
                {/* Top: Store Avatar, Name, Category & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Store Avatar Initial */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-inner border",
                      isPro 
                        ? "bg-amber-400/20 text-amber-300 border-amber-400/30"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    )}>
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm text-white truncate group-hover:text-amber-400 transition">
                          {m.name}
                        </h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border",
                          isPro 
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        )}>
                          {isPro && <Crown className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                          <span>{m.subscription_tier}</span>
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-200">{m.owner_name || 'Owner'}</span>
                        <span className="text-slate-600">•</span>
                        <a href={`tel:${m.phone}`} className="text-amber-400/90 hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>+91 {m.phone}</span>
                        </a>
                      </div>

                      {m.city && (
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0 text-slate-500" />
                          <span className="truncate">{m.city} • <span className="capitalize">{m.business_type || 'Retail'}</span></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onViewMerchant(m)}
                    className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition cursor-pointer shrink-0"
                    title="View Store 360"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                {/* Middle: Validity & Status */}
                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Valid Until:</span>
                  </span>
                  <span className={isPro ? "text-amber-400 font-bold" : "text-slate-400"}>
                    {m.subscription_expires_at || m.subscription_valid_until
                      ? new Date(m.subscription_expires_at || m.subscription_valid_until!).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'Free / Trial'}
                  </span>
                </div>

                {/* Bottom: Action Toolbar */}
                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSendWhatsApp(m)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    title="Send WhatsApp Message"
                  >
                    <WhatsAppLogo className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Chat</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleInspectStore(m)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 hover:text-amber-100 hover:bg-amber-500/25 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                      title="Inspect Store (Support Mode)"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Inspect</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditMerchant(m)}
                      className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition cursor-pointer"
                      title="Edit Merchant"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteMerchant(m)}
                      className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:text-rose-200 hover:bg-rose-500/25 border border-rose-500/30 transition cursor-pointer"
                      title="Delete Merchant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Table View */
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">Store Name</th>
                  <th className="py-3 px-4">Owner &amp; Phone</th>
                  <th className="py-3 px-4">Plan / Tier</th>
                  <th className="py-3 px-4">City / Category</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {paginatedMerchants.map((m) => {
                  const isPro = m.subscription_tier === 'pro' || m.subscription_tier === 'growth' || m.subscription_tier === 'enterprise';
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{m.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div>{m.owner_name || '—'}</div>
                        <div className="text-slate-400 text-[11px]">+91 {m.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase inline-flex items-center gap-1 border",
                          isPro ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-slate-800 text-slate-400 border-slate-700"
                        )}>
                          {isPro && <Crown className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                          {m.subscription_tier}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>{m.city || '—'}</div>
                        <div className="text-slate-400 text-[11px] capitalize">{m.business_type || 'Retail'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {m.subscription_expires_at || m.subscription_valid_until
                          ? new Date(m.subscription_expires_at || m.subscription_valid_until!).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Trial'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSendWhatsApp(m)}
                            className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 cursor-pointer"
                            title="WhatsApp"
                          >
                            <WhatsAppLogo className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewMerchant(m)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                            title="View 360"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInspectStore(m)}
                            className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:text-amber-100 hover:bg-amber-500/30 border border-amber-500/30 cursor-pointer"
                            title="Inspect Store (Support Mode)"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditMerchant(m)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteMerchant(m)}
                            className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Pagination Controls */}
      {filteredMerchants.length > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 p-3 px-4 rounded-2xl border border-slate-800 text-xs shadow-xl">
          <div className="text-slate-400 font-medium text-xs">
            Showing <span className="font-bold text-white">{(safePage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-bold text-white">{Math.min(safePage * pageSize, filteredMerchants.length)}</span> of{' '}
            <span className="font-bold text-amber-400">{filteredMerchants.length}</span> stores
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 font-bold flex items-center gap-1 cursor-pointer transition text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .map((p, idx, arr) => {
                  const prevP = arr[idx - 1];
                  const hasGap = prevP && p - prevP > 1;
                  return (
                    <React.Fragment key={p}>
                      {hasGap && <span className="px-1 text-slate-500 font-bold">...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={cn(
                          "w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center",
                          safePage === p
                            ? "bg-amber-400 text-slate-950 shadow-xs"
                            : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                        )}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 font-bold flex items-center gap-1 cursor-pointer transition text-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {filteredMerchants.length === 0 && (
        <div className="col-span-full py-16 text-center text-slate-400 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <div className="font-bold text-slate-200 text-sm">No merchants found</div>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keyword.</p>
        </div>
      )}
    </div>
  );
};
