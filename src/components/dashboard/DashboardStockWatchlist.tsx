'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  Boxes, 
  ArrowRight, 
  Plus, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { Product } from '@/types';
import { formatINR, cn } from '@/lib/utils';

interface DashboardStockWatchlistProps {
  stockWatchlist: Product[];
  outOfStockProducts: Product[];
  lowStockProducts: Product[];
  onQuickRestock: (product: Product, quantityToAdd?: number) => void;
  onOpenRapidInward?: () => void;
}

export const DashboardStockWatchlist: React.FC<DashboardStockWatchlistProps> = ({
  stockWatchlist,
  outOfStockProducts,
  lowStockProducts,
  onQuickRestock,
  onOpenRapidInward,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (stockWatchlist.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-rose-200/90 dark:border-rose-900/60 rounded-2xl shadow-2xs overflow-hidden transition-all duration-200">
      {/* Collapsible Header Banner */}
      <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 cursor-pointer flex-1 select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                Low Stock &amp; Out-of-Stock Alert
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black ${
                outOfStockProducts.length > 0
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-amber-500 text-slate-950'
              }`}>
                {outOfStockProducts.length > 0 ? `${outOfStockProducts.length} Zero Stock` : `${lowStockProducts.length} Reorder Needed`}
              </span>
            </div>
            <p className="text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400">
              {isExpanded 
                ? 'Items below minimum threshold. Restock in 1-tap or record wholesale bills.'
                : `${stockWatchlist.length} items require attention. Click to expand & restock.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-center">
          <Link href="/purchases">
            <button
              type="button"
              className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restock Bills</span>
            </button>
          </Link>

          <Link href="/products?filter=low_stock">
            <button
              type="button"
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <span>View All ({stockWatchlist.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </Link>

          {/* Expand/Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-900 dark:text-rose-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-rose-200 dark:border-rose-800"
            title={isExpanded ? "Collapse Alert Section" : "Expand Alert Section"}
          >
            <span>{isExpanded ? 'Hide' : `Show (${stockWatchlist.length})`}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Dropdown Content */}
      {isExpanded && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-1 border-t border-rose-100 dark:border-rose-900/50 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1.5">
            {stockWatchlist.slice(0, 6).map((item) => {
              const stockNum = Number(item.current_stock ?? 0);
              const isZero = stockNum <= 0;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-2.5 rounded-xl border flex flex-col justify-between transition-all",
                    isZero
                      ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 ring-1 ring-rose-300/40"
                      : "bg-amber-50/30 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">
                        {item.category_name || 'General'}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5" title={item.name}>
                        {item.name}
                      </h4>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        Rate: <span className="font-bold text-slate-800 dark:text-slate-200">{formatINR(item.selling_price)}</span>/{item.unit}
                      </div>
                    </div>

                    <span className={cn(
                      "px-1.5 py-0.5 rounded-md text-[9.5px] font-black uppercase shrink-0",
                      isZero
                        ? "bg-rose-600 text-white shadow-2xs"
                        : "bg-amber-200 dark:bg-amber-950 text-amber-950 dark:text-amber-200 font-bold"
                    )}>
                      {isZero ? '0 Left' : `${stockNum} left`}
                    </span>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 font-medium truncate">
                      Min: {item.min_stock_level || 5} {item.unit}
                    </span>

                    <button
                      type="button"
                      onClick={() => onQuickRestock(item, 10)}
                      className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95 transition shrink-0"
                      title="Add 10 units to stock instantly"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+10 Stock</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {stockWatchlist.length > 6 && (
            <div className="text-center pt-1">
              <Link
                href="/products?filter=low_stock"
                className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
              >
                <span>+{stockWatchlist.length - 6} more low-stock items in catalog</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
