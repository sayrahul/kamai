import React from 'react';
import { Calendar, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface AdminCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  newCouponCode: string;
  setNewCouponCode: (val: string) => void;
  newCouponType: 'flat' | 'percentage';
  setNewCouponType: (val: 'flat' | 'percentage') => void;
  newCouponValue: number;
  setNewCouponValue: (val: number) => void;
  newCouponMaxUses: number;
  setNewCouponMaxUses: (val: number) => void;
  newCouponMinOrder: number;
  setNewCouponMinOrder: (val: number) => void;
  newCouponExpiryDays: number;
  setNewCouponExpiryDays: (val: number) => void;
  isCreatingCoupon: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminCouponModal: React.FC<AdminCouponModalProps> = ({
  isOpen,
  onClose,
  newCouponCode,
  setNewCouponCode,
  newCouponType,
  setNewCouponType,
  newCouponValue,
  setNewCouponValue,
  newCouponMaxUses,
  setNewCouponMaxUses,
  newCouponMinOrder,
  setNewCouponMinOrder,
  newCouponExpiryDays,
  setNewCouponExpiryDays,
  isCreatingCoupon,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-purple-400" />
          <span>Create Promo Discount Coupon</span>
        </div>
      }
      description="Offer a percentage or flat cash discount on KamaiPlus Pro subscription checkouts with custom expiry and usage limits."
    >
      <form onSubmit={onSubmit} className="space-y-3.5">
        <Input
          label="Coupon Code *"
          placeholder="e.g. DIWALI50 or PRO20"
          value={newCouponCode}
          onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Discount Type
            </label>
            <select
              value={newCouponType}
              onChange={(e) => setNewCouponType(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="percentage">Percentage (% OFF)</option>
              <option value="flat">Flat Cash (₹ OFF)</option>
            </select>
          </div>

          <Input
            label={newCouponType === 'percentage' ? 'Discount Value (%) *' : 'Discount Value (₹) *'}
            type="number"
            value={String(newCouponValue)}
            onChange={(e) => setNewCouponValue(Number(e.target.value))}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Usage Limit (Max Uses)"
            type="number"
            placeholder="e.g. 100"
            value={String(newCouponMaxUses)}
            onChange={(e) => setNewCouponMaxUses(Number(e.target.value))}
          />

          <Input
            label="Min Order Amount (₹)"
            type="number"
            placeholder="0"
            value={String(newCouponMinOrder)}
            onChange={(e) => setNewCouponMinOrder(Number(e.target.value))}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Expiry Validity</span>
            </label>
            <select
              value={newCouponExpiryDays}
              onChange={(e) => setNewCouponExpiryDays(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value={7}>7 Days (1 Week)</option>
              <option value={15}>15 Days</option>
              <option value={30}>30 Days (1 Month)</option>
              <option value={60}>60 Days (2 Months)</option>
              <option value={90}>90 Days (3 Months)</option>
              <option value={365}>365 Days (1 Year)</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isCreatingCoupon}
            className="bg-purple-600 hover:bg-purple-700 text-white font-black"
          >
            {isCreatingCoupon ? 'Creating...' : 'Create Promo Coupon'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
