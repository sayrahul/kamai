'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatINR } from '@/lib/utils';
import { 
  Boxes, 
  TrendingUp, 
  AlertTriangle, 
  Clock 
} from 'lucide-react';
import { ProfitMask } from '@/components/privacy/ProfitMask';

interface InventoryMetricsRibbonProps {
  totalItems: number;
  totalAssetValuePaise: number;
  lowStockCount: number;
  nearExpiryCount: number;
}

export const InventoryMetricsRibbon: React.FC<InventoryMetricsRibbonProps> = ({
  totalItems,
  totalAssetValuePaise,
  lowStockCount,
  nearExpiryCount,
}) => {
  return (
    <Card className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-2xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
        {/* 1. Total Catalog Items */}
        <div className="px-2 py-1 sm:py-0 sm:first:pl-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-sky-700 dark:text-sky-400">
              <Boxes className="w-3.5 h-3.5 text-sky-600" />
              <span>Tracked SKUs</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Catalog</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5 leading-tight">
            {totalItems}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Active stock units
          </div>
        </div>

        {/* 2. Total Stock Valuation */}
        <div className="px-2 pt-2 sm:pt-0 sm:px-3">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Inventory Asset</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Cost</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">
            <ProfitMask value={formatINR(totalAssetValuePaise)} />
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Total cost valuation
          </div>
        </div>

        {/* 3. Reorder Alerts */}
        <div className="px-2 pt-2 sm:pt-0 sm:px-3">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Reorder Alert</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Low</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5 leading-tight">
            {lowStockCount}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Requires stock inward
          </div>
        </div>

        {/* 4. Near-Expiry Items */}
        <div className="px-2 pt-2 sm:pt-0 sm:pl-3">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Near Expiry</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">&lt;60d</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5 leading-tight">
            {nearExpiryCount}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Batch expiry radar
          </div>
        </div>
      </div>
    </Card>
  );
};
