'use client';

import React from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR } from '@/lib/utils';
import { Boxes, Package, AlertTriangle, ArrowDownRight, ArrowUpRight, History } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function InventoryPage() {
  const products = useLiveQuery(async () => db.products.toArray()) || [];
  const movements = useLiveQuery(async () => db.inventory_movements.reverse().limit(30).toArray()) || [];

  const lowStock = products.filter(p => p.current_stock <= p.min_stock_level);
  const totalStockValuation = products.reduce((acc, p) => acc + (p.current_stock * p.purchase_price), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Boxes className="w-6 h-6 text-vyapar-500" />
          <span>Stock & Inventory Audit Radar</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Est. Stock Valuation: <span className="font-extrabold text-slate-900 dark:text-slate-100">{formatINR(totalStockValuation)}</span> • {lowStock.length} Low Stock Items
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Low stock radar */}
        <Card className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Low Stock Alerts</span>
            </h3>
            <Badge variant="warning" size="sm">{lowStock.length} Items</Badge>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pt-2">
            {lowStock.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">All products have healthy stock levels.</div>
            ) : (
              lowStock.map(p => (
                <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{p.name}</div>
                    <div className="text-[11px] text-slate-400">Min Threshold: {p.min_stock_level} {p.unit}</div>
                  </div>
                  <div className="text-right font-black text-rose-600">
                    {p.current_stock} {p.unit} left
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Immutable Movements Audit Log */}
        <Card className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <History className="w-4 h-4 text-vyapar-500" />
              <span>Stock Movement Audit Log</span>
            </h3>
            <span className="text-[10px] text-slate-400">Immutable Records</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pt-2">
            {movements.map(m => (
              <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${m.quantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {m.quantity > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{m.product_name}</div>
                    <div className="text-[10px] text-slate-400">{m.movement_type} • {m.reason || 'Auto update'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </div>
                  <div className="text-[10px] text-slate-400">New: {m.new_stock}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
