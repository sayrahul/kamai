'use client';

import React from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  Send, 
  Plus, 
  Edit3, 
  Package, 
  Truck 
} from 'lucide-react';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';
import { Product, Supplier } from '@/types';
import { formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface ReorderAlertsListProps {
  lowStockProducts: Product[];
  suppliers: Supplier[];
  onQuickRestock: (product: Product, quantity: number) => Promise<void>;
  onSendSupplierOrder: (product: Product) => void;
}

export const ReorderAlertsList: React.FC<ReorderAlertsListProps> = ({
  lowStockProducts,
  suppliers,
  onQuickRestock,
  onSendSupplierOrder,
}) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {lowStockProducts.map((p) => {
          const isZeroStock = p.current_stock <= 0;
          return (
            <div
              key={p.id}
              className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate block">
                      {p.name}
                    </span>
                    <div className="text-xs text-slate-400 mt-0.5 font-mono">
                      Selling: {formatINR(p.selling_price)} • Cost: {formatINR(p.purchase_price || 0)}
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono shrink-0 ${
                    isZeroStock 
                      ? 'bg-rose-100 text-rose-900 border border-rose-300' 
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {isZeroStock ? 'Out of Stock' : `${p.current_stock} Left`}
                  </span>
                </div>
              </div>

              {/* Threshold info */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500">
                <span>Min Threshold: {p.min_stock_level || 5} {p.unit}</span>
                <span className="text-rose-600 font-bold">
                  Deficit: {Math.max(0, (p.min_stock_level || 5) - p.current_stock)} {p.unit}
                </span>
              </div>

              {/* Actions: WhatsApp Supplier & +10 Instant Stock */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSendSupplierOrder(p)}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Send Purchase Order WhatsApp message to supplier"
                >
                  <WhatsAppLogo className="w-3.5 h-3.5" />
                  <span>Order on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => onQuickRestock(p, 10)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 text-xs font-black flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+10 Stock</span>
                </button>
              </div>
            </div>
          );
        })}

        {lowStockProducts.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <Package className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">All items are well stocked!</div>
            <p className="text-xs text-slate-400 mt-1">No products are currently below safety threshold.</p>
          </div>
        )}
      </div>
    </div>
  );
};
