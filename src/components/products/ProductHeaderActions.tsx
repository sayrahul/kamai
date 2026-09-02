'use client';

import React from 'react';
import { 
  Package, 
  Plus, 
  FileSpreadsheet, 
  Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CashierPrivacyToggleButton } from '@/components/privacy/ProfitMask';

interface ProductHeaderActionsProps {
  totalProducts: number;
  onOpenAddModal: () => void;
  onOpenExcelImporter: () => void;
  onOpenRapidInward: () => void;
}

export const ProductHeaderActions: React.FC<ProductHeaderActionsProps> = ({
  totalProducts,
  onOpenAddModal,
  onOpenExcelImporter,
  onOpenRapidInward,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 flex items-center justify-center font-bold shrink-0">
          <Package className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Products Master &amp; Items
            </h1>
            <CashierPrivacyToggleButton />
          </div>
          <p className="text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            {totalProducts} registered products with barcodes, batch expiry &amp; instant stock tracking
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenExcelImporter}
          className="text-xs font-bold gap-1 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shadow-2xs"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Excel Import</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenRapidInward}
          className="text-xs font-bold gap-1 rounded-xl border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 cursor-pointer shadow-2xs"
        >
          <Zap className="w-3.5 h-3.5 text-amber-600" />
          <span>Carton Inward</span>
        </Button>

        <Button
          size="sm"
          onClick={onOpenAddModal}
          className="font-black bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 text-xs px-3.5 py-1.5 shadow-2xs cursor-pointer gap-1.5 rounded-xl"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Product</span>
        </Button>
      </div>
    </div>
  );
};
