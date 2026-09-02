'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { formatINR } from '@/lib/utils';
import { ProfitMask, CashierPrivacyToggleButton } from '@/components/privacy/ProfitMask';
import { 
  TrendingUp, 
  BookOpen, 
  Wallet, 
  ArrowRight, 
  CircleDollarSign,
  Receipt
} from 'lucide-react';

interface TodayBusinessPulseProps {
  todaysSalesTotal: number;
  todaysSalesCount: number;
  todaysGrossProfit: number;
  netCashInHand: number;
  totalOutstandingCredit: number;
  customersWithCreditCount: number;
}

export const TodayBusinessPulse: React.FC<TodayBusinessPulseProps> = ({
  todaysSalesTotal,
  todaysSalesCount,
  todaysGrossProfit,
  netCashInHand,
  totalOutstandingCredit,
  customersWithCreditCount,
}) => {
  const profitMarginPercent = todaysSalesTotal > 0 
    ? Math.round((todaysGrossProfit / todaysSalesTotal) * 100) 
    : 0;

  return (
    <div className="space-y-2.5">
      {/* Header with Title & Cashier Privacy Toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Today's Business Pulse
          </h2>
        </div>
        <CashierPrivacyToggleButton />
      </div>

      {/* 4-Stat Responsive Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* 1. Today's Sales */}
        <Link href="/transactions?filter=today" className="group block focus:outline-none">
          <Card className="p-3 sm:p-3.5 bg-gradient-to-br from-white to-emerald-50/60 dark:from-slate-900 dark:to-emerald-950/20 border border-emerald-200/90 dark:border-emerald-800/60 hover:border-emerald-400 active:scale-[0.98] transition-all rounded-2xl shadow-2xs group-hover:shadow-md h-full flex flex-col justify-between cursor-pointer">
            <div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10.5px] sm:text-xs uppercase tracking-tight truncate">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Today's Sales</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-[9px] font-black">
                  {todaysSalesCount} Bills
                </span>
              </div>

              <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight mt-1.5 truncate">
                {formatINR(todaysSalesTotal)}
              </div>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-emerald-100/80 dark:border-emerald-900/40 flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-semibold truncate">
                Total Revenue
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[10px]">
                <span>Bills</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </Card>
        </Link>

        {/* 2. Today's Profit (With Privacy Mask) */}
        <div className="group block focus:outline-none">
          <Card className="p-3 sm:p-3.5 bg-gradient-to-br from-white to-blue-50/60 dark:from-slate-900 dark:to-blue-950/20 border border-blue-200/90 dark:border-blue-800/60 hover:border-blue-400 active:scale-[0.98] transition-all rounded-2xl shadow-2xs group-hover:shadow-md h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 font-extrabold text-[10.5px] sm:text-xs uppercase tracking-tight truncate">
                  <CircleDollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">Today's Profit</span>
                </div>
                {todaysSalesTotal > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 text-[9px] font-black font-mono">
                    ~{profitMarginPercent}% Margin
                  </span>
                )}
              </div>

              <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight mt-1.5 truncate">
                <ProfitMask valuePaise={todaysGrossProfit} />
              </div>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-blue-100/80 dark:border-blue-900/40 flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-semibold truncate">
                Gross Margin
              </span>
              <span className="text-blue-700 dark:text-blue-400 font-bold text-[10px]">
                Owner Only
              </span>
            </div>
          </Card>
        </div>

        {/* 3. Cash in Drawer (Galle me Cash) */}
        <Link href="/cash-register" className="group block focus:outline-none">
          <Card className="p-3 sm:p-3.5 bg-gradient-to-br from-white to-amber-50/60 dark:from-slate-900 dark:to-amber-950/20 border border-amber-200/90 dark:border-amber-800/60 hover:border-amber-400 active:scale-[0.98] transition-all rounded-2xl shadow-2xs group-hover:shadow-md h-full flex flex-col justify-between cursor-pointer">
            <div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-extrabold text-[10.5px] sm:text-xs uppercase tracking-tight truncate">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">Cash in Hand</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[9px] font-black">
                  Till / Galla
                </span>
              </div>

              <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight mt-1.5 truncate">
                {formatINR(netCashInHand)}
              </div>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-amber-100/80 dark:border-amber-900/40 flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-semibold truncate">
                Cash Sales - Exp
              </span>
              <span className="text-amber-700 dark:text-amber-400 font-bold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[10px]">
                <span>Register</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </Card>
        </Link>

        {/* 4. Total Outstanding Credit (Khata Udhar) */}
        <Link href="/khata" className="group block focus:outline-none">
          <Card className="p-3 sm:p-3.5 bg-gradient-to-br from-white to-rose-50/60 dark:from-slate-900 dark:to-rose-950/20 border border-rose-200/90 dark:border-rose-800/60 hover:border-rose-400 active:scale-[0.98] transition-all rounded-2xl shadow-2xs group-hover:shadow-md h-full flex flex-col justify-between cursor-pointer">
            <div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-extrabold text-[10.5px] sm:text-xs uppercase tracking-tight truncate">
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="truncate">Market Udhar</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 text-[9px] font-black">
                  {customersWithCreditCount} Debtors
                </span>
              </div>

              <div className="text-base sm:text-xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight mt-1.5 truncate">
                {formatINR(totalOutstandingCredit)}
              </div>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-rose-100/80 dark:border-rose-900/40 flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-semibold truncate">
                Pending Ledger
              </span>
              <span className="text-rose-700 dark:text-rose-400 font-bold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[10px]">
                <span>Khata</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
};
