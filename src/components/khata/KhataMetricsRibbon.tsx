'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatINR } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight, Wallet, BookOpen } from 'lucide-react';

interface KhataMetricsRibbonProps {
  totalUdharReceivable: number;
  totalAdvancePayable: number;
  totalUdharAccounts: number;
  totalCustomersCount: number;
}

export const KhataMetricsRibbon: React.FC<KhataMetricsRibbonProps> = ({
  totalUdharReceivable,
  totalAdvancePayable,
  totalUdharAccounts,
  totalCustomersCount,
}) => {
  const netBalance = totalUdharReceivable - totalAdvancePayable;

  return (
    <Card className="p-3 sm:p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-2xl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
        {/* 1. You'll Get (Lene Baaki) */}
        <div className="p-2.5 sm:p-2 bg-rose-50/40 dark:bg-rose-950/20 lg:bg-transparent rounded-xl border border-rose-100/80 dark:border-rose-900/30 lg:border-none lg:first:pl-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10.5px] sm:text-[11px] font-bold">
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
              <span>You'll Get</span>
            </span>
            <span className="text-[9.5px] text-rose-500/80 font-mono hidden xs:inline">बाकी</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5 leading-tight truncate">
            {formatINR(totalUdharReceivable)}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5 hidden sm:block">
            {totalUdharAccounts} customer(s) with dues
          </div>
        </div>

        {/* 2. Advance (Dene Baaki) */}
        <div className="p-2.5 sm:p-2 bg-emerald-50/40 dark:bg-emerald-950/20 lg:bg-transparent rounded-xl border border-emerald-100/80 dark:border-emerald-900/30 lg:border-none lg:px-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10.5px] sm:text-[11px] font-bold">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              <span>Advance</span>
            </span>
            <span className="text-[9.5px] text-emerald-600/80 font-mono hidden xs:inline">जमा</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight truncate">
            {formatINR(totalAdvancePayable)}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5 hidden sm:block">
            Advance deposits received
          </div>
        </div>

        {/* 3. Net Receivable */}
        <div className="p-2.5 sm:p-2 bg-amber-50/30 dark:bg-amber-950/20 lg:bg-transparent rounded-xl border border-amber-100/80 dark:border-amber-900/30 lg:border-none lg:px-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10.5px] sm:text-[11px] font-bold">
            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <Wallet className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Net Balance</span>
            </span>
            <span className="text-[9.5px] text-slate-400 font-mono hidden xs:inline">कुल</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5 leading-tight truncate">
            {formatINR(netBalance)}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5 hidden sm:block">
            Net store credit
          </div>
        </div>

        {/* 4. Khata Accounts */}
        <div className="p-2.5 sm:p-2 bg-indigo-50/30 dark:bg-indigo-950/20 lg:bg-transparent rounded-xl border border-indigo-100/80 dark:border-indigo-900/30 lg:border-none lg:pl-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10.5px] sm:text-[11px] font-bold">
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Accounts</span>
            </span>
            <span className="text-[9.5px] text-indigo-500/80 font-mono hidden xs:inline">खाते</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 leading-tight">
            {totalCustomersCount}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5 hidden sm:block">
            Registered customers
          </div>
        </div>
      </div>
    </Card>
  );
};
