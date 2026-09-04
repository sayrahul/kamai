'use client';

import React from 'react';
import { 
  Package, 
  Plus, 
  FileSpreadsheet, 
  Sparkles,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CashierPrivacyToggleButton } from '@/components/privacy/ProfitMask';

interface ProductHeaderActionsProps {
  totalProducts: number;
  businessType?: string;
  onOpenAddModal: () => void;
  onOpenExcelImporter: () => void;
  onOpenInwardSheet?: () => void;
  onOpenRapidInward?: () => void;
}

export const ProductHeaderActions: React.FC<ProductHeaderActionsProps> = ({
  totalProducts,
  businessType,
  onOpenAddModal,
  onOpenExcelImporter,
  onOpenInwardSheet,
  onOpenRapidInward,
}) => {
  const isRestaurant = businessType === 'restaurant' || businessType === 'cafe' || businessType === 'bakery';
  const handleInwardClick = onOpenInwardSheet || onOpenRapidInward || onOpenAddModal;

  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 flex items-center justify-center font-bold shrink-0">
          <Package className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {isRestaurant ? 'Menu Master & Food Items' : 'Products Master & Items'}
            </h1>
            <CashierPrivacyToggleButton />
          </div>
          <p className="text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            {isRestaurant
              ? `${totalProducts} food items with categories, custom rates & KOT instant billing`
              : `${totalProducts} registered products with barcodes, batch expiry & instant stock tracking`}
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

        {/* Store-Aware AI Inward Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleInwardClick}
          className="text-xs font-black gap-1.5 rounded-xl border-amber-400/60 text-slate-900 dark:text-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 hover:from-amber-100 hover:to-orange-100 cursor-pointer shadow-2xs"
          title={isRestaurant ? "Scan printed Menu Card photo to auto-add all dishes & rates" : "Upload distributor invoice or wholesale parcha to auto-add stock"}
        >
          {isRestaurant ? (
            <>
              <Camera className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              <span>📸 Scan Menu Card</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
              <span>📸 Inward Bill / Parcha</span>
            </>
          )}
        </Button>

        <Button
          size="sm"
          onClick={onOpenAddModal}
          className="font-black bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 text-xs px-3.5 py-1.5 shadow-2xs cursor-pointer gap-1.5 rounded-xl"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isRestaurant ? 'Add Dish' : 'Add Product'}</span>
        </Button>
      </div>
    </div>
  );
};
