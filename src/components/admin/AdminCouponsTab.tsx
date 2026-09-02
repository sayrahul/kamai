'use client';

import React from 'react';
import { 
  Tag, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Percent, 
  IndianRupee 
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AdminCoupon } from '@/app/api/admin/coupons/route';
import { formatINR } from '@/lib/utils';

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
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-purple-600" />
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Discount Promo Codes &amp; Referral Campaign
            </h3>
            <p className="text-[10.5px] text-slate-400">
              Generate promo codes for merchant onboarding discounts &amp; festival campaigns.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={onOpenCreateModal}
          className="font-black bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 text-xs px-3.5 py-1.5 shadow-2xs cursor-pointer gap-1.5 rounded-xl"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Create Coupon</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {coupons.map((c) => (
          <Card
            key={c.code}
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    {c.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCopyCode(c.code)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Copy Code"
                  >
                    {copiedCode === c.code ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {c.discount_type === 'percentage'
                    ? `${c.discount_value}% OFF`
                    : `Flat ₹${c.discount_value} OFF`}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteCoupon(c.id || c.code)}
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                title="Delete Coupon"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Uses: {c.redemptions_count || 0} / {c.max_redemptions || '∞'}</span>
              <span>Min Order: ₹{c.min_order_amount || 0}</span>
            </div>
          </Card>
        ))}

        {coupons.length === 0 && (
          <div className="col-span-full py-10 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            No promo coupons created yet. Create one above to offer subscription discounts.
          </div>
        )}
      </div>
    </div>
  );
};
