'use client';

import React from 'react';
import { 
  Users, 
  Crown, 
  Store, 
  TrendingUp, 
  Zap, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PlatformMetrics, MerchantRecord } from '@/app/admin/page';
import { formatINR } from '@/lib/utils';

interface AdminOverviewTabProps {
  metrics: PlatformMetrics | null;
  merchants: MerchantRecord[];
  onOpenManualSubModal: () => void;
  onSelectTab: (tab: any) => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  metrics,
  merchants,
  onOpenManualSubModal,
  onSelectTab,
}) => {
  const totalMerchants = metrics?.totalMerchants || merchants.length || 0;
  const proCount = metrics?.tiers?.pro || merchants.filter((m) => m.subscription_tier === 'pro' || m.subscription_tier === 'growth' || m.subscription_tier === 'enterprise').length || 0;
  const freeCount = metrics?.tiers?.free || (totalMerchants - proCount);
  const estimatedArr = proCount * 149900; // in paise

  const recentMerchants = merchants.slice(0, 5);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. 4-Stat Platform Pulse */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Merchants */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <Store className="w-4 h-4 text-sky-400" />
              <span>Total Stores</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase bg-slate-800 px-2 py-0.5 rounded-md">Retail</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            {totalMerchants}
          </div>
          <div className="text-[11px] text-slate-400">
            Registered POS merchants
          </div>
        </div>

        {/* Active Pro SaaS */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-xl shadow-amber-500/5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Pro &amp; Growth</span>
            </span>
            <span className="text-[10px] text-amber-300 font-mono font-bold uppercase bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">Paid</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
            {proCount}
          </div>
          <div className="text-[11px] text-slate-400">
            Active paid licenses
          </div>
        </div>

        {/* Free Tier */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              <span>Free Trials</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase bg-slate-800 px-2 py-0.5 rounded-md">Leads</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-200">
            {freeCount}
          </div>
          <div className="text-[11px] text-slate-400">
            Free onboarding accounts
          </div>
        </div>

        {/* Estimated ARR */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-xl shadow-emerald-500/5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Projected ARR</span>
            </span>
            <span className="text-[10px] text-emerald-300 font-mono font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Annual</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {formatINR(estimatedArr)}
          </div>
          <div className="text-[11px] text-slate-400">
            SaaS subscription run-rate
          </div>
        </div>
      </div>

      {/* 2. Quick Pro Activation & Actions Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-slate-900 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="text-sm font-black text-amber-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Instant Pro License Activation</span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Directly upgrade or extend Pro / Growth subscription for any store via 10-digit mobile number or store ID.
          </p>
        </div>

        <Button
          type="button"
          onClick={onOpenManualSubModal}
          className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer gap-2 shrink-0"
        >
          <Crown className="w-4 h-4 text-slate-950" />
          <span>+ Grant Pro License</span>
        </Button>
      </div>

      {/* 3. Recent Signups Feed */}
      <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-white">
              Recent Store Signups
            </h3>
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('merchants')}
            className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({merchants.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-800">
          {recentMerchants.map((m) => {
            const isPro = m.subscription_tier === 'pro' || m.subscription_tier === 'growth';
            return (
              <div key={m.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white truncate">
                      {m.name || 'Store'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                      isPro 
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {m.subscription_tier}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 truncate font-mono flex items-center gap-1.5">
                    <span>{m.owner_name || 'Owner'}</span>
                    <span className="text-slate-600">•</span>
                    <span>+91 {m.phone}</span>
                    {m.city && <span className="text-slate-500">• {m.city}</span>}
                  </div>
                </div>

                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                  {new Date(m.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}

          {recentMerchants.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              No merchant signups recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
