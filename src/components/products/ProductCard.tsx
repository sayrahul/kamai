'use client';

import React from 'react';
import { 
  Barcode, 
  Star, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Scale, 
  Pill, 
  Tag 
} from 'lucide-react';
import { Product } from '@/types';
import { formatINR, cn } from '@/lib/utils';
import { ProfitMask } from '@/components/privacy/ProfitMask';

interface ProductCardProps {
  product: Product;
  categoryName?: string;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
  onQuickStockChange: (product: Product, delta: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  categoryName,
  onEdit,
  onDelete,
  onToggleFavorite,
  onQuickStockChange,
}) => {
  const isOutOfStock = !product.is_unlimited_stock && product.current_stock <= 0;
  const isLowStock = !product.is_unlimited_stock && product.current_stock > 0 && product.current_stock <= (product.min_stock_level || 5);
  const profitMarginPaise = product.selling_price - (product.purchase_price || 0);

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3">
      {/* Top Bar: Name, Category, Badges & Favorite */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                {product.name}
              </span>
              {product.is_loose_item && (
                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                  <Scale className="w-2.5 h-2.5" />
                  Weighed
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap font-mono">
              {categoryName && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10.5px] font-semibold text-slate-600 dark:text-slate-300">
                  {categoryName}
                </span>
              )}
              {product.barcode && (
                <span className="flex items-center gap-1 text-[10.5px] text-slate-400">
                  <Barcode className="w-3 h-3 text-slate-400" />
                  <span>{product.barcode}</span>
                </span>
              )}
              {product.batch_number && (
                <span className="flex items-center gap-1 text-[10.5px] text-teal-600 dark:text-teal-400 font-bold">
                  <Pill className="w-3 h-3" />
                  <span>Batch: {product.batch_number}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFavorite(product)}
              className={cn(
                "p-1.5 rounded-lg transition cursor-pointer",
                product.is_favorite 
                  ? "text-amber-500 hover:bg-amber-50" 
                  : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"
              )}
              title={product.is_favorite ? "Remove from Favorites" : "Mark as Favorite"}
            >
              <Star className={cn("w-4 h-4", product.is_favorite ? "fill-amber-400" : "")} />
            </button>
            <button
              type="button"
              onClick={() => onEdit(product)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              title="Edit Product"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Middle: Price, MRP & Margin */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Selling Price</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
              {formatINR(product.selling_price)}
            </span>
            {product.mrp && product.mrp > product.selling_price && (
              <span className="text-[11px] font-mono text-slate-400 line-through">
                {formatINR(product.mrp)}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Profit Margin</span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            <ProfitMask value={`+${formatINR(profitMarginPaise)}`} />
          </span>
        </div>
      </div>

      {/* Bottom: Stock Status & 1-Tap Quick Adjuster */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono",
            product.is_unlimited_stock
              ? "bg-slate-100 text-slate-700"
              : isOutOfStock
              ? "bg-rose-100 text-rose-900 border border-rose-300"
              : isLowStock
              ? "bg-amber-100 text-amber-900 border border-amber-300"
              : "bg-emerald-100 text-emerald-900 border border-emerald-300"
          )}>
            {product.is_unlimited_stock 
              ? 'Unlimited'
              : isOutOfStock
              ? 'Out of Stock'
              : `${product.current_stock} ${product.unit}`}
          </span>
        </div>

        {!product.is_unlimited_stock && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onQuickStockChange(product, -1)}
              disabled={product.current_stock <= 0}
              className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs disabled:opacity-30 cursor-pointer shadow-2xs"
              title="Decrease Stock (-1)"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onQuickStockChange(product, 1)}
              className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs cursor-pointer shadow-2xs"
              title="Increase Stock (+1)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onQuickStockChange(product, 10)}
              className="px-1.5 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-[10.5px] cursor-pointer shadow-2xs border border-emerald-200"
              title="Quick Restock +10"
            >
              +10
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
