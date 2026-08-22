'use client';

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Product } from '@/types';
import { formatINR } from '@/lib/utils';
import { 
  AlertTriangle, 
  Clock, 
  Calendar, 
  ShieldAlert, 
  Tag, 
  Send, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowRight,
  Filter,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function ExpiryRadar() {
  const [filterType, setFilterType] = useState<'all' | 'expired' | 'urgent' | 'upcoming'>('all');
  const [discountAppliedMsg, setDiscountAppliedMsg] = useState<string | null>(null);

  const allProducts = useLiveQuery(async () => {
    return db.products.filter((p) => Boolean(p.expiry_date)).toArray();
  }) || [];

  const now = useMemo(() => new Date(), []);

  // Categorize items by expiry status
  const analyzedItems = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return allProducts.map((p) => {
      const expDate = new Date(p.expiry_date!);
      const expTime = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()).getTime();
      const diffDays = Math.ceil((expTime - today) / (1000 * 60 * 60 * 24));

      let status: 'expired' | 'urgent' | 'upcoming' | 'safe';
      if (diffDays < 0) {
        status = 'expired';
      } else if (diffDays <= 15) {
        status = 'urgent';
      } else if (diffDays <= 30) {
        status = 'upcoming';
      } else {
        status = 'safe';
      }

      const totalRiskPaise = (p.selling_price || 0) * (p.current_stock || 0);

      return {
        product: p,
        daysRemaining: diffDays,
        status,
        totalRiskPaise,
      };
    }).filter((item) => item.status !== 'safe');
  }, [allProducts, now]);

  const filteredItems = useMemo(() => {
    if (filterType === 'all') return analyzedItems;
    return analyzedItems.filter((i) => i.status === filterType);
  }, [analyzedItems, filterType]);

  const expiredCount = analyzedItems.filter((i) => i.status === 'expired').length;
  const urgentCount = analyzedItems.filter((i) => i.status === 'urgent').length;
  const upcomingCount = analyzedItems.filter((i) => i.status === 'upcoming').length;
  const totalValueAtRisk = analyzedItems.reduce((sum, i) => sum + i.totalRiskPaise, 0);

  // Apply Clearance Flash Sale Discount (e.g. 30% off selling price)
  const handleApplyClearanceDiscount = async (productId: string, discountPercent: number) => {
    const prod = await db.products.get(productId);
    if (!prod) return;

    const newSellingPrice = Math.round(prod.selling_price * (1 - discountPercent / 100));
    await db.products.update(productId, {
      selling_price: newSellingPrice,
      updated_at: new Date().toISOString(),
    });

    setDiscountAppliedMsg(`Applied ${discountPercent}% clearance discount on ${prod.name}!`);
    setTimeout(() => setDiscountAppliedMsg(null), 3500);
  };

  // Generate WhatsApp return note for distributor / supplier
  const handleSendSupplierReturnNote = (item: typeof analyzedItems[0]) => {
    const text = encodeURIComponent(
      `*⚠️ Expiry Return Request - Store Notice*\n\n` +
      `*Product:* ${item.product.name}\n` +
      `*Batch No:* ${item.product.batch_number || 'N/A'}\n` +
      `*Expiry Date:* ${item.product.expiry_date}\n` +
      `*Available Units:* ${item.product.current_stock} ${item.product.unit || 'pcs'}\n` +
      `*Estimated Value:* ${formatINR(item.totalRiskPaise)}\n\n` +
      `Please arrange replacement or credit note for these near-expiry/expired items.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {discountAppliedMsg && (
        <div className="p-3 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black flex items-center justify-between shadow-lg animate-in fade-in">
          <span>✓ {discountAppliedMsg}</span>
          <button onClick={() => setDiscountAppliedMsg(null)} className="cursor-pointer">✕</button>
        </div>
      )}

      {/* Summary Radar Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setFilterType('all')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition select-none ${
            filterType === 'all' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total at Risk</div>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{formatINR(totalValueAtRisk)}</div>
          <div className="text-[11px] text-slate-500 font-bold mt-1">{analyzedItems.length} Products Tracked</div>
        </div>

        <div 
          onClick={() => setFilterType('expired')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition select-none ${
            filterType === 'expired' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Expired (Do Not Sell)</span>
          </div>
          <div className="text-xl font-black text-rose-700 font-mono mt-0.5">{expiredCount} Items</div>
          <div className="text-[11px] text-rose-600 font-bold mt-1">Return to Distributor</div>
        </div>

        <div 
          onClick={() => setFilterType('urgent')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition select-none ${
            filterType === 'urgent' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Expiring in ≤ 15 Days</span>
          </div>
          <div className="text-xl font-black text-amber-800 font-mono mt-0.5">{urgentCount} Items</div>
          <div className="text-[11px] text-amber-700 font-bold mt-1">Clearance Flash Sale</div>
        </div>

        <div 
          onClick={() => setFilterType('upcoming')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition select-none ${
            filterType === 'upcoming' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Expiring in 16-30 Days</span>
          </div>
          <div className="text-xl font-black text-blue-700 font-mono mt-0.5">{upcomingCount} Items</div>
          <div className="text-[11px] text-blue-600 font-bold mt-1">Watchlist</div>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-black text-slate-900">Zero Near-Expiry Items Found!</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All grocery and pharmacy items with expiry dates are fresh and safe to sell.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {filteredItems.map(({ product, daysRemaining, status, totalRiskPaise }) => {
              const isExpired = status === 'expired';
              const isUrgent = status === 'urgent';

              return (
                <div key={product.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">{product.name}</span>
                      {isExpired ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200">
                          EXPIRED ({Math.abs(daysRemaining)}d ago)
                        </span>
                      ) : isUrgent ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300">
                          Expires in {daysRemaining} days 🔥
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black border border-blue-200">
                          Expires in {daysRemaining} days
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                      {product.batch_number && (
                        <span>Batch: <strong className="text-slate-700">{product.batch_number}</strong></span>
                      )}
                      <span>Expiry: <strong className="text-slate-700">{product.expiry_date}</strong></span>
                      <span>Stock: <strong className="text-slate-700">{product.current_stock} {product.unit}</strong></span>
                      <span>Value: <strong className="text-emerald-700">{formatINR(totalRiskPaise)}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {!isExpired && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplyClearanceDiscount(product.id, 25)}
                        className="text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50 h-8"
                        title="Apply 25% discount to clear stock quickly"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        <span>25% Off</span>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendSupplierReturnNote({ product, daysRemaining, status, totalRiskPaise })}
                      className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-100 h-8"
                      title="Send return note on WhatsApp"
                    >
                      <Send className="w-3 h-3 mr-1 text-emerald-600" />
                      <span>Return Note</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
