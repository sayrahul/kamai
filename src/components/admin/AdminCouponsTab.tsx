'use client';

import React from 'react';
import { 
  Tag, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Percent, 
  IndianRupee,
  Sparkles,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AdminCoupon } from '@/app/api/admin/coupons/route';

interface AdminCouponsTabProps {
  coupons: AdminCoupon[];
  onOpenCreateModal: () => void;
  onCopyCode: (code: string) => void;
  copiedCode: string | null;
  onDeleteCoupon: (code: string) => Promise<void>;
}

export const AdminCouponsTab: React.FC<AdminCouponsTabProps> = ({
  coupons,
  onOpenCreateModal,
  onCopyCode,
  copiedCode,
  onDeleteCoupon,
}) => {
  const now = new Date();

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center font-black shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white">
              Discount Promo Codes &amp; Referral Campaigns
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate custom promo codes for merchant SaaS checkout discounts with expiry and usage limits.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={onOpenCreateModal}
          className="font-black bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs px-4 py-2 shadow-md shadow-amber-500/10 cursor-pointer gap-1.5 rounded-xl self-end sm:self-center"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Create Coupon</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((c) => {
          const isExpired = c.expires_at ? new Date(c.expires_at) < now : false;
          const maxUses = c.max_redemptions || (c as any).max_uses;
          const usedCount = c.redemptions_count || 0;
          const usagePct = maxUses ? Math.min(100, Math.round((usedCount / maxUses) * 100)) : null;

          return (
            <div
              key={c.code}
              className={`p-4 sm:p-5 bg-slate-900/90 border rounded-2xl shadow-xl flex flex-col justify-between space-y-3.5 relative overflow-hidden group transition ${
                isExpired 
                  ? 'border-rose-900/50 opacity-75' 
                  : 'border-slate-800 hover:border-purple-500/40'
              }`}
            >
              {/* Top: Code, Copy & Delete */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-base text-amber-300 uppercase tracking-widest bg-slate-800/90 px-3 py-1 rounded-xl border border-slate-700">
                      {c.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => onCopyCode(c.code)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer border border-slate-700/60"
                      title="Copy Code"
                    >
                      {copiedCode === c.code ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="text-sm font-black text-emerald-400 mt-2 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {c.discount_type === 'percentage'
                        ? `${c.discount_value}% Discount OFF`
                        : `Flat ₹${c.discount_value} Discount OFF`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                    isExpired
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {isExpired ? 'Expired' : 'Active'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteCoupon(c.id || c.code)}
                    className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:text-rose-200 hover:bg-rose-500/25 border border-rose-500/30 transition cursor-pointer"
                    title="Delete Coupon"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Middle: Usage Limit Tracker */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Usage:</span>
                  <span className="font-bold text-slate-200">
                    {maxUses ? `${usedCount} / ${maxUses} claimed (${usagePct}%)` : `${usedCount} claimed (Unlimited)`}
                  </span>
                </div>
                {maxUses && (
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        usagePct! >= 90 ? 'bg-rose-500' : usagePct! >= 60 ? 'bg-amber-400' : 'bg-purple-400'
                      }`}
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Bottom: Expiry & Min Order */}
              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>
                    {c.expires_at 
                      ? `Exp: ${new Date(c.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` 
                      : 'No Expiry'}
                  </span>
                </span>
                {c.min_order_amount ? (
                  <span className="text-[11px] text-amber-300 font-bold">
                    Min ₹{c.min_order_amount}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">No Min Order</span>
                )}
              </div>
            </div>
          );
        })}

        {coupons.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl">
            <Tag className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <div className="font-bold text-slate-200 text-sm">No promo coupons active</div>
            <p className="text-xs text-slate-500 mt-1">Create your first coupon code to offer merchant discounts.</p>
          </div>
        )}
      </div>
    </div>
  );
};
