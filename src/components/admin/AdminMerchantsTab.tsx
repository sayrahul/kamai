'use client';

import React from 'react';
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
  Calendar 
} from 'lucide-react';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MerchantRecord } from '@/app/admin/page';
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

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Header Toolbar & Actions */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search stores by name, phone, city, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            size="sm"
            onClick={onOpenManualSubModal}
            className="font-bold border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-xs px-3 py-1.5 shadow-2xs cursor-pointer rounded-xl gap-1"
          >
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>+ Grant Pro</span>
          </Button>

          <Button
            size="sm"
            onClick={onOpenAddMerchantModal}
            className="font-black bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 text-xs px-3.5 py-1.5 shadow-2xs cursor-pointer gap-1.5 rounded-xl"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Store</span>
          </Button>
        </div>
      </div>

      {/* 2. Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
        <span className="text-slate-400 text-[11px] uppercase tracking-wider pl-1">Tiers:</span>
        {['all', 'pro', 'free'].map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => setSelectedTierFilter(tier)}
            className={cn(
              "px-3 py-1 rounded-xl transition cursor-pointer capitalize",
              selectedTierFilter === tier
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            )}
          >
            {tier === 'all' ? 'All Tiers' : tier === 'pro' ? '⭐ Pro & Growth' : 'Free Trial'}
          </button>
        ))}

        <span className="text-slate-400 text-[11px] uppercase tracking-wider pl-3">Status:</span>
        {['all', 'active', 'inactive'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setSelectedStatusFilter(st)}
            className={cn(
              "px-3 py-1 rounded-xl transition cursor-pointer capitalize",
              selectedStatusFilter === st
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            )}
          >
            {st}
          </button>
        ))}
      </div>

      {/* 3. Merchants Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredMerchants.map((m) => {
          const isPro = m.subscription_tier === 'pro' || m.subscription_tier === 'growth' || m.subscription_tier === 'enterprise';
          return (
            <div
              key={m.id}
              className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
            >
              {/* Top: Name & Tier Badge */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {m.name}
                      </span>
                      <span className={cn(
                        "px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase flex items-center gap-0.5",
                        isPro 
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-slate-100 text-slate-700"
                      )}>
                        {isPro && <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />}
                        {m.subscription_tier}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <a href={`tel:${m.phone}`} className="hover:underline">
                        +91 {m.phone}
                      </a>
                      {m.owner_name && <span className="text-slate-400">• {m.owner_name}</span>}
                    </div>

                    {m.city && (
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{m.city} ({m.business_type || 'Retail'})</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onViewMerchant(m)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="View Store 360"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Middle: Subscription Validity */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-[10.5px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Valid Until:</span>
                </span>
                <span className={isPro ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-500"}>
                  {m.subscription_expires_at || m.subscription_valid_until
                    ? new Date(m.subscription_expires_at || m.subscription_valid_until!).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'Free / Unlimited'}
                </span>
              </div>

              {/* Bottom: Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => onSendWhatsApp(m)}
                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer shadow-2xs"
                  title="Send WhatsApp Message"
                >
                  <WhatsAppLogo className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEditMerchant(m)}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Edit Merchant"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteMerchant(m)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="Delete Merchant"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredMerchants.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">No merchants found</div>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search query.</p>
          </div>
        )}
      </div>
    </div>
  );
};
