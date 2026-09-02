'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatINR } from '@/lib/utils';
import { 
  Banknote, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calculator 
} from 'lucide-react';
import { ProfitMask } from '@/components/privacy/ProfitMask';

interface CashRegisterMetricsRibbonProps {
  openingBalancePaise: number;
  cashSalesPaise: number;
  cashExpensesPaise: number;
  expectedDrawerCashPaise: number;
}

export const CashRegisterMetricsRibbon: React.FC<CashRegisterMetricsRibbonProps> = ({
  openingBalancePaise,
  cashSalesPaise,
  cashExpensesPaise,
  expectedDrawerCashPaise,
}) => {
  return (
    <Card className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-2xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
        {/* 1. Opening Cash */}
        <div className="px-2 py-1 sm:py-0 sm:first:pl-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-sky-700 dark:text-sky-400">
              <Banknote className="w-3.5 h-3.5 text-sky-600" />
              <span>Opening Float</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Start</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5 leading-tight">
            <ProfitMask value={formatINR(openingBalancePaise)} />
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Morning cash drawer
          </div>
        </div>

        {/* 2. Cash In Sales */}
        <div className="px-2 pt-2 sm:pt-0 sm:px-3">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cash In (Sales)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Today</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">
            <ProfitMask value={`+${formatINR(cashSalesPaise)}`} />
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Received from bills
          </div>
        </div>

        {/* 3. Cash Out Expenses */}
        <div className="px-2 pt-2 sm:pt-0 sm:px-3">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              <span>Cash Out (Pouch)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Spent</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5 leading-tight">
            <ProfitMask value={`-${formatINR(cashExpensesPaise)}`} />
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Petty cash expenses
          </div>
        </div>

        {/* 4. Expected Drawer Cash */}
        <div className="px-2 pt-2 sm:pt-0 sm:pl-3">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400">
              <Calculator className="w-3.5 h-3.5 text-purple-600" />
              <span>Expected Cash</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">In Drawer</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5 leading-tight">
            <ProfitMask value={formatINR(expectedDrawerCashPaise)} />
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Physical cash balance
          </div>
        </div>
      </div>
    </Card>
  );
};
