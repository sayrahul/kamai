'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatINR } from '@/lib/utils';
import { 
  TrendingUp, 
  Banknote, 
  QrCode, 
  BookOpen 
} from 'lucide-react';

interface TransactionMetricsRibbonProps {
  totalRevenuePaise: number;
  totalCashPaise: number;
  totalUpiPaise: number;
  totalCreditPaise: number;
  salesCount: number;
}

export const TransactionMetricsRibbon: React.FC<TransactionMetricsRibbonProps> = ({
  totalRevenuePaise,
  totalCashPaise,
  totalUpiPaise,
  totalCreditPaise,
  salesCount,
}) => {
  return (
    <Card className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-2xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
        {/* 1. Total Revenue */}
        <div className="px-2 py-1 sm:py-0 sm:first:pl-1">
          <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-slate-700 dark:text-slate-300" />
              <span>Revenue</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">({salesCount} {salesCount === 1 ? 'bill' : 'bills'})</span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5 leading-tight truncate">
            {formatINR(totalRevenuePaise)}
          </div>
        </div>

        {/* 2. Cash Inflow */}
        <div className="px-2 py-1 sm:py-0">
          <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Banknote className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Cash In</span>
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-800 dark:text-emerald-300 font-mono mt-0.5 leading-tight truncate">
            {formatINR(totalCashPaise)}
          </div>
        </div>

        {/* 3. UPI Inflow */}
        <div className="px-2 py-1 sm:py-0 pt-1.5 sm:pt-0">
          <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <QrCode className="w-3 h-3 text-sky-600 dark:text-sky-400" />
              <span>UPI / QR</span>
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-sky-800 dark:text-sky-300 font-mono mt-0.5 leading-tight truncate">
            {formatINR(totalUpiPaise)}
          </div>
        </div>

        {/* 4. Customer Udhar / Credit */}
        <div className="px-2 py-1 sm:py-0 pt-1.5 sm:pt-0">
          <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Credit Due</span>
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-amber-900 dark:text-amber-300 font-mono mt-0.5 leading-tight truncate">
            {formatINR(totalCreditPaise)}
          </div>
        </div>
      </div>
    </Card>
  );
};
