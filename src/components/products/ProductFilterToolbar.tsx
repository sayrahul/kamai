'use client';

import React from 'react';
import { 
  Search, 
  Barcode, 
  X, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Category } from '@/types';
import { cn } from '@/lib/utils';

interface ProductFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (val: string) => void;
  showLowStockOnly: boolean;
  onToggleLowStock: (val: boolean) => void;
  showExpiringOnly?: boolean;
  onToggleExpiringOnly?: (val: boolean) => void;
  onOpenScanner: () => void;
}

export const ProductFilterToolbar: React.FC<ProductFilterToolbarProps> = ({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onSelectCategory,
  showLowStockOnly,
  onToggleLowStock,
  showExpiringOnly = false,
  onToggleExpiringOnly,
  onOpenScanner,
}) => {
  return (
    <div className="flex flex-col gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by product name, barcode, HSN, batch #..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8.5 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Scan Barcode Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenScanner}
          className="text-xs font-bold gap-1 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer shrink-0"
        >
          <Barcode className="w-4 h-4 text-sky-600" />
          <span className="hidden sm:inline">Scan</span>
        </Button>

        {/* Low Stock Toggle */}
        <button
          type="button"
          onClick={() => onToggleLowStock(!showLowStockOnly)}
          className={cn(
            "px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0",
            showLowStockOnly
              ? "bg-rose-600 text-white shadow-2xs"
              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
          )}
        >
          <AlertTriangle className={cn("w-3.5 h-3.5", showLowStockOnly ? "text-white" : "text-rose-500")} />
          <span className="hidden sm:inline">Low Stock</span>
        </button>

        {/* Expiring Soon Toggle */}
        <button
          type="button"
          onClick={() => onToggleExpiringOnly && onToggleExpiringOnly(!showExpiringOnly)}
          className={cn(
            "px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0",
            showExpiringOnly
              ? "bg-amber-500 text-slate-950 shadow-2xs font-black"
              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
          )}
          title="Filter items expiring in 30 days or already expired"
        >
          <Clock className={cn("w-3.5 h-3.5", showExpiringOnly ? "text-slate-950" : "text-amber-500")} />
          <span className="hidden sm:inline">Expiring Soon</span>
        </button>
      </div>

      {/* 1-Tap Category Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none select-none">
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap",
            selectedCategory === 'all'
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-2xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          )}
        >
          All Items
        </button>

        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectCategory(c.id)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap",
              selectedCategory === c.id
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
};
