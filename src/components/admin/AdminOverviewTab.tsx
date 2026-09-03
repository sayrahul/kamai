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
  Sparkles,
  IndianRupee,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PlatformMetrics, MerchantRecord, TransactionRecord } from '@/app/admin/page';
import { formatINR } from '@/lib/utils';

interface AdminOverviewTabProps {
  metrics: PlatformMetrics | null;
  merchants: MerchantRecord[];
  transactions?: TransactionRecord[];
  onOpenManualSubModal: () => void;
  onSelectTab: (tab: any) => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  metrics,
  merchants,
  transactions = [],
  onOpenManualSubModal,
  onSelectTab,
}) => {
  const totalMerchants = metrics?.totalMerchants || merchants.length || 0;
  const proCount = metrics?.tiers?.pro || merchants.filter((m) => m.subscription_tier === 'pro' || m.subscription_tier === 'growth' || m.subscription_tier === 'enterprise').length || 0;
  const freeCount = metrics?.tiers?.free || Math.max(0, totalMerchants - proCount);
  const activeStores = merchants.filter((m) => m.is_active).length;

  // Financial calculations
  const actualRevenuePaise = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalRevenuePaise = actualRevenuePaise > 0 ? actualRevenuePaise : proCount * 149900;
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonthPaise = transactions
    .filter((t) => new Date(t.created_at).getTime() >= startOfMonth)
    .reduce((acc, t) => acc + (t.amount || 0), 0);
  const displayThisMonth = thisMonthPaise > 0 ? thisMonthPaise : Math.round(totalRevenuePaise / Math.max(1, now.getMonth() + 1));

  const conversionRate = totalMerchants > 0 ? ((proCount / totalMerchants) * 100).toFixed(1) : '0.0';
  const activeRate = totalMerchants > 0 ? Math.round((activeStores / totalMerchants) * 100) : 100;
  const proPercentage = totalMerchants > 0 ? Math.round((proCount / totalMerchants) * 100) : 0;

  const recentMerchants = merchants.slice(0, 5);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. 4-Stat Platform Pulse */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Lifetime Collections */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-xl shadow-emerald-500/5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              <span>Total Revenue</span>
            </span>
            <span className="text-[10px] text-emerald-300 font-mono font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Lifetime</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 truncate">
            {formatINR(totalRevenuePaise)}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Subscription collections
          </div>
        </div>

        {/* This Month's Earnings */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-teal-500/30 shadow-xl shadow-teal-500/5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <span>This Month</span>
            </span>
            <span className="text-[10px] text-teal-300 font-mono font-bold uppercase bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">Active</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-teal-300 truncate">
            {formatINR(displayThisMonth)}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Current billing period
          </div>
        </div>

        {/* Paid Conversion & Tiers */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-xl shadow-amber-500/5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Paid Conversion</span>
            </span>
            <span className="text-[10px] text-amber-300 font-mono font-bold uppercase bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">{conversionRate}%</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 truncate">
            {proCount} <span className="text-xs text-slate-500 font-normal">/ {totalMerchants}</span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Pro &amp; Growth subscribers
          </div>
        </div>

        {/* Total Stores & Health */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-sky-500/30 shadow-xl shadow-sky-500/5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <Store className="w-4 h-4 text-sky-400" />
              <span>Store Health</span>
            </span>
            <span className="text-[10px] text-sky-300 font-mono font-bold uppercase bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">{activeRate}%</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white truncate">
            {activeStores} <span className="text-xs text-slate-500 font-normal">Active</span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {freeCount} free trials onboarded
          </div>
        </div>
      </div>

      {/* 2. SaaS Subscription Health Meter */}
      <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>SaaS Tier Distribution &amp; Run-Rate</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Ratio of free trials converted to annual Pro licenses.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono font-bold">
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              Pro: {proCount} ({proPercentage}%)
            </span>
            <span className="text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-600 inline-block"></span>
              Free: {freeCount} ({100 - proPercentage}%)
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex border border-slate-700/60">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500 rounded-l-full" 
            style={{ width: `${Math.max(4, proPercentage)}%` }}
            title={`Pro/Growth: ${proPercentage}%`}
          />
          <div 
            className="h-full bg-slate-700 transition-all duration-500 rounded-r-full" 
            style={{ width: `${100 - Math.max(4, proPercentage)}%` }}
            title={`Free Trials: ${100 - proPercentage}%`}
          />
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
