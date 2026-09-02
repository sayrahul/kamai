'use client';

import React from 'react';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  ShoppingBag, 
  Truck 
} from 'lucide-react';
import { InventoryMovement } from '@/types';
import { Card } from '@/components/ui/Card';

interface StockMovementsListProps {
  movements: InventoryMovement[];
}

export const StockMovementsList: React.FC<StockMovementsListProps> = ({
  movements,
}) => {
  return (
    <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            Stock Inward &amp; Audit Trail History
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Last {movements.length} movements
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {movements.map((m) => {
          const isPositive = m.movement_type === 'PURCHASE' || m.movement_type === 'RETURN' || (m.movement_type === 'ADJUSTMENT' && m.new_stock > m.previous_stock);
          return (
            <div key={m.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {m.product_name}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase ${
                    m.movement_type === 'SALE'
                      ? 'bg-sky-100 text-sky-900'
                      : m.movement_type === 'PURCHASE'
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {m.movement_type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate font-mono">
                  {m.reason || 'Inventory update'} • Prev: {m.previous_stock} ➔ New: {m.new_stock}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className={`text-xs font-black font-mono ${
                  isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {new Date(m.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {movements.length === 0 && (
          <div className="py-10 text-center text-xs text-slate-400">
            No stock movements recorded yet.
          </div>
        )}
      </div>
    </Card>
  );
};
