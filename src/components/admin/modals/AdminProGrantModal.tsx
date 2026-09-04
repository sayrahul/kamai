import React from 'react';
import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface AdminProGrantModalProps {
  isOpen: boolean;
  onClose: () => void;
  manualPhoneOrId: string;
  setManualPhoneOrId: (val: string) => void;
  manualTier: string;
  setManualTier: (val: string) => void;
  manualDurationDays: number;
  setManualDurationDays: (val: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminProGrantModal: React.FC<AdminProGrantModalProps> = ({
  isOpen,
  onClose,
  manualPhoneOrId,
  setManualPhoneOrId,
  manualTier,
  setManualTier,
  manualDurationDays,
  setManualDurationDays,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          <span>Grant Pro License to Store</span>
        </div>
      }
      description="Directly assign a Pro / Growth subscription to any merchant by mobile number or store ID."
    >
      <form onSubmit={onSubmit} className="space-y-3.5">
        <Input
          label="Merchant Mobile Phone or Store ID *"
          placeholder="e.g. 9876543210 or biz_123"
          value={manualPhoneOrId}
          onChange={(e) => setManualPhoneOrId(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Subscription Plan
            </label>
            <select
              value={manualTier}
              onChange={(e) => setManualTier(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="pro">Pro Enterprise (₹1,499/Year)</option>
              <option value="free">Free Forever (₹0)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Duration (Days)
            </label>
            <select
              value={manualDurationDays}
              onChange={(e) => setManualDurationDays(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value={30}>30 Days (1 Month)</option>
              <option value={90}>90 Days (3 Months)</option>
              <option value={365}>365 Days (1 Year)</option>
              <option value={730}>730 Days (2 Years)</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black">
            Grant Pro License
          </Button>
        </div>
      </form>
    </Modal>
  );
};
