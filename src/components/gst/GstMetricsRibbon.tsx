'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatINR } from '@/lib/utils';
import { 
  Building2, 
  TrendingUp, 
  Percent, 
  Layers 
} from 'lucide-react';
import { ProfitMask } from '@/components/privacy/ProfitMask';

interface GstMetricsRibbonProps {
  totalTaxableTurnoverPaise: number;
  totalGstTaxPaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  b2bInvoicesCount: number;
}

export const GstMetricsRibbon: React.FC<GstMetricsRibbonProps> = ({
  totalTaxableTurnoverPaise,
  totalGstTaxPaise,
  totalCgstPaise,
  totalSgstPaise,
  b2bInvoicesCount,
}) => {
  return (
    <Card className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-2xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
        {/* 1. Taxable Turnover */}
        <div className="px-2 py-1 sm:py-0 sm:first:pl-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-sky-700 dark:text-sky-400">
              <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
              <span>Taxable Value</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Turnover</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5 leading-tight">
            <ProfitMask value={formatINR(totalTaxableTurnoverPaise)} />
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Excluding tax component
          </div>
        </div>

        {/* 2. Total GST Tax */}
        <div className="px-2 pt-2 sm:pt-0 sm:px-3">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <Percent className="w-3.5 h-3.5 text-emerald-600" />
              <span>Total GST Tax</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Collected</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">
            {formatINR(totalGstTaxPaise)}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            CGST + SGST + IGST
          </div>
        </div>

        {/* 3. CGST & SGST Breakup */}
        <div className="px-2 pt-2 sm:pt-0 sm:px-3">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>CGST / SGST</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">50:50</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5 leading-tight">
            {formatINR(totalCgstPaise)}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            State &amp; Central split
          </div>
        </div>

        {/* 4. B2B Invoices */}
        <div className="px-2 pt-2 sm:pt-0 sm:pl-3">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              <span>B2B Invoices</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">GSTIN</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5 leading-tight">
            {b2bInvoicesCount}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Wholesale tax bills
          </div>
        </div>
      </div>
    </Card>
  );
};
