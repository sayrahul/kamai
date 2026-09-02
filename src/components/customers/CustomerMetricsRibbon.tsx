'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatINR } from '@/lib/utils';
import { 
  Users, 
  Star, 
  BookOpen, 
  Award 
} from 'lucide-react';

interface CustomerMetricsRibbonProps {
  totalCustomers: number;
  vipCount: number;
  totalCreditDuePaise: number;
  creditAccountsCount: number;
}

export const CustomerMetricsRibbon: React.FC<CustomerMetricsRibbonProps> = ({
  totalCustomers,
  vipCount,
  totalCreditDuePaise,
  creditAccountsCount,
}) => {
  return (
    <Card className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-2xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
        {/* 1. Total Customers */}
        <div className="px-2 py-1 sm:py-0 sm:first:pl-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-sky-700 dark:text-sky-400">
              <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Customers</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Total</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5 leading-tight truncate">
            {totalCustomers}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Directory accounts
          </div>
        </div>

        {/* 2. VIP Members */}
        <div className="px-2 pt-2 sm:pt-0 sm:px-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <Star className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>VIP Members</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">High-Value</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5 leading-tight truncate">
            {vipCount}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Frequent buyers
          </div>
        </div>

        {/* 3. Total Udhar Due */}
        <div className="px-2 pt-2 sm:pt-0 sm:px-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400">
              <BookOpen className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Udhar Due</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Pending</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5 leading-tight truncate">
            {formatINR(totalCreditDuePaise)}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Market receivable
          </div>
        </div>

        {/* 4. Active Credit Accounts */}
        <div className="px-2 pt-2 sm:pt-0 sm:pl-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400">
              <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Active Udhar</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Ledgers</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5 leading-tight truncate">
            {creditAccountsCount}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Debtor accounts
          </div>
        </div>
      </div>
    </Card>
  );
};
