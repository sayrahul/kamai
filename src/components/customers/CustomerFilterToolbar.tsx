'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CustomerCategoryFilter = 'all' | 'credit' | 'vip' | 'regular';

interface CustomerFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedFilter: CustomerCategoryFilter;
  onFilterChange: (val: CustomerCategoryFilter) => void;
  totalCustomers: number;
  creditCustomersCount: number;
  vipCustomersCount: number;
}

export const CustomerFilterToolbar: React.FC<CustomerFilterToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedFilter,
  onFilterChange,
  totalCustomers,
  creditCustomersCount,
  vipCustomersCount,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
      {/* Search Input */}
      <div className="relative flex-1 min-w-0">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, phone, GSTIN, or city..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8.5 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 1-Tap Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none select-none">
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
            selectedFilter === 'all'
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-2xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          )}
        >
          All ({totalCustomers})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('credit')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
            selectedFilter === 'credit'
              ? "bg-rose-600 text-white shadow-2xs"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200/60 dark:border-rose-900"
          )}
        >
          Udhar Due ({creditCustomersCount})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('vip')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
            selectedFilter === 'vip'
              ? "bg-amber-400 text-slate-950 font-black shadow-2xs"
              : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/60 dark:border-amber-900"
          )}
        >
          ⭐ VIP ({vipCustomersCount})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('regular')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
            selectedFilter === 'regular'
              ? "bg-sky-600 text-white shadow-2xs"
              : "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 border border-sky-200/60 dark:border-sky-900"
          )}
        >
          Regular
        </button>
      </div>
    </div>
  );
};
