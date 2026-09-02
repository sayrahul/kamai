'use client';

import React from 'react';
import { 
  Search, 
  X, 
  Calendar, 
  Filter, 
  ArrowUpDown 
} from 'lucide-react';
import { Customer } from '@/types';
import { cn } from '@/lib/utils';
import { DatePreset, PaymentFilter, SortOption } from '@/app/transactions/page';

interface TransactionFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  datePreset: DatePreset;
  onDatePresetChange: (val: DatePreset) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  paymentFilter: PaymentFilter;
  onPaymentFilterChange: (val: PaymentFilter) => void;
  selectedCustomerId: string;
  onCustomerChange: (val: string) => void;
  sortBy: SortOption;
  onSortChange: (val: SortOption) => void;
  customers: Customer[];
  totalSalesCount: number;
  filteredCount: number;
  onClearAllFilters: () => void;
}

export const TransactionFilterToolbar: React.FC<TransactionFilterToolbarProps> = ({
  searchQuery,
  onSearchChange,
  datePreset,
  onDatePresetChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  paymentFilter,
  onPaymentFilterChange,
  selectedCustomerId,
  onCustomerChange,
  sortBy,
  onSortChange,
  customers,
  totalSalesCount,
  filteredCount,
  onClearAllFilters,
}) => {
  const hasActiveFilters = Boolean(
    searchQuery || 
    datePreset !== 'all' || 
    paymentFilter !== 'all' || 
    selectedCustomerId !== 'all' || 
    startDate || 
    endDate ||
    sortBy !== 'date-desc'
  );

  return (
    <div className="p-3 sm:p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-2.5">
      {/* Search & Top Selectors Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search invoice #, customer, phone, or item..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-slate-800 dark:focus:border-slate-300 rounded-xl pl-8.5 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:outline-none transition shadow-2xs"
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

        {/* Dropdowns Row: Customer, Sort, Reset */}
        <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap pb-0.5 md:pb-0 select-none">
          {/* Customer Dropdown */}
          <div className="relative flex-shrink-0">
            <select
              value={selectedCustomerId}
              onChange={(e) => onCustomerChange(e.target.value)}
              className={cn(
                "appearance-none border text-xs font-bold rounded-xl pl-2.5 pr-6 py-2 cursor-pointer focus:outline-none transition shadow-2xs max-w-[130px] truncate",
                selectedCustomerId !== 'all' 
                  ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200" 
                  : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              )}
            >
              <option value="all">👥 Cust ({totalSalesCount})</option>
              <option value="walk-in">🚶 Walk-in</option>
              <optgroup label="Registered">
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </optgroup>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex-shrink-0">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="appearance-none bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl pl-2.5 pr-6 py-2 cursor-pointer focus:outline-none transition shadow-2xs"
            >
              <option value="date-desc">⇅ Newest</option>
              <option value="date-asc">⇅ Oldest</option>
              <option value="amount-desc">⇅ ₹ High</option>
              <option value="amount-asc">⇅ ₹ Low</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAllFilters}
              className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 px-2.5 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition flex-shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 1-Tap Filter Chips: Date & Payment Modes */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        {/* Date Presets Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs font-bold scrollbar-none">
          {[
            { id: 'all', label: 'All Dates' },
            { id: 'today', label: '⚡ Today' },
            { id: 'yesterday', label: '⏪ Yesterday' },
            { id: 'week', label: '🗓️ 7 Days' },
            { id: 'month', label: '📊 Month' },
            { id: 'custom', label: '🔍 Custom' },
          ].map((df) => (
            <button
              key={df.id}
              type="button"
              onClick={() => onDatePresetChange(df.id as DatePreset)}
              className={cn(
                "px-2.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer",
                datePreset === df.id 
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-2xs" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              )}
            >
              {df.label}
            </button>
          ))}
        </div>

        {/* Payment Mode Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs font-bold scrollbar-none">
          {[
            { id: 'all', label: 'All Modes' },
            { id: 'cash', label: '💵 Cash' },
            { id: 'upi', label: '📱 UPI' },
            { id: 'credit', label: '📒 Udhar' },
          ].map((pf) => (
            <button
              key={pf.id}
              type="button"
              onClick={() => onPaymentFilterChange(pf.id as PaymentFilter)}
              className={cn(
                "px-2.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer",
                paymentFilter === pf.id 
                  ? "bg-amber-400 text-slate-950 font-black shadow-2xs" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              )}
            >
              {pf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Picker Bar (Shown when datePreset === 'custom') */}
      {datePreset === 'custom' && (
        <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex flex-wrap items-center gap-2 text-xs animate-in fade-in">
          <span className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Date Range:</span>
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
          />
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => { onStartDateChange(''); onEndDateChange(''); }}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline ml-auto cursor-pointer"
            >
              Clear Dates
            </button>
          )}
        </div>
      )}
    </div>
  );
};
