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
    <Card className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
        {/* 1. You'll Get (Lene Baaki) */}
        <div className="px-2 py-1 lg:py-0 lg:first:pl-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>You'll Get</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Lene Baaki</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5 leading-tight truncate">
            {formatINR(totalUdharReceivable)}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5 hidden sm:block">
            {totalUdharAccounts} customer(s) with dues
          </div>
        </div>

        {/* 2. Advance (Dene Baaki) */}
        <div className="px-2 py-1 lg:py-0 lg:px-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Advance</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Dene Baaki</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight truncate">
            {formatINR(totalAdvancePayable)}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5 hidden sm:block">
            Advance deposits received
          </div>
        </div>

        {/* 3. Net Receivable */}
        <div className="px-2 pt-2 lg:pt-0 lg:px-3 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <Wallet className="w-3.5 h-3.5 text-amber-500" />
              <span>Net Balance</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Outstanding</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5 leading-tight truncate">
            {formatINR(netBalance)}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5 hidden sm:block">
            Net store credit
          </div>
        </div>

        {/* 4. Khata Accounts */}
        <div className="px-2 pt-2 lg:pt-0 lg:pl-3 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Khata Accounts</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Total</span>
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
