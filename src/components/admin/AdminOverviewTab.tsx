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
import { Card } from '@/components/ui/Card';
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
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. 4-Stat Platform Pulse */}
      <Card className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
          {/* Total Merchants */}
          <div className="px-2 py-1 sm:py-0 sm:first:pl-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-sky-700 dark:text-sky-400">
                <Store className="w-3.5 h-3.5 text-sky-600" />
                <span>Total Stores</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Retailers</span>
            </div>
            <div className="text-base sm:text-xl font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5">
              {totalMerchants}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Registered POS merchants
            </div>
          </div>

          {/* Active Pro SaaS */}
          <div className="px-2 pt-2 sm:pt-0 sm:px-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>Pro &amp; Growth</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Paid</span>
            </div>
            <div className="text-base sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {proCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Active subscriptions
            </div>
          </div>

          {/* Free Tier */}
          <div className="px-2 pt-2 sm:pt-0 sm:px-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-400">
                <Users className="w-3.5 h-3.5 text-slate-600" />
                <span>Free Plan</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Trial</span>
            </div>
            <div className="text-base sm:text-xl font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
              {freeCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Conversion leads
            </div>
          </div>

          {/* Estimated ARR */}
          <div className="px-2 pt-2 sm:pt-0 sm:pl-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Projected ARR</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Annual</span>
            </div>
            <div className="text-base sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatINR(estimatedArr)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Recurring SaaS revenue
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Quick Pro Activation & Actions Banner */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-300 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="space-y-0.5">
          <div className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
            <span>Instant Pro License Grant</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Directly activate or extend Pro / Growth subscription for any merchant via mobile number.
          </p>
        </div>

        <Button
          type="button"
          onClick={onOpenManualSubModal}
          className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer gap-1.5 shrink-0"
        >
          <Crown className="w-3.5 h-3.5" />
          <span>+ Activate Pro License</span>
        </Button>
      </div>

      {/* 3. Recent Signups Feed */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Recent Merchant Signups
            </h3>
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('merchants')}
            className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>View All ({merchants.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {recentMerchants.map((m) => {
            const isPro = m.subscription_tier === 'pro' || m.subscription_tier === 'growth';
            return (
              <div key={m.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                      {m.name || 'Store'}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                      isPro 
                        ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {m.subscription_tier}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate font-mono">
                    +91 {m.phone} • {m.city || m.business_type || 'Retail'}
                  </div>
                </div>

                <span className="text-[10.5px] text-slate-400 font-mono shrink-0">
                  {new Date(m.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}

          {recentMerchants.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400">
              No merchant signups recorded yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
