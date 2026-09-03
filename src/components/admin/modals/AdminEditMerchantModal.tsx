import React from 'react';
import { Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { MerchantRecord } from '@/app/admin/page';

interface AdminEditMerchantModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMerchant: MerchantRecord | null;
  editName: string;
  setEditName: (val: string) => void;
  editOwnerName: string;
  setEditOwnerName: (val: string) => void;
  editPhone: string;
  setEditPhone: (val: string) => void;
  editEmail: string;
  setEditEmail: (val: string) => void;
  editCity: string;
  setEditCity: (val: string) => void;
  editGstin: string;
  setEditGstin: (val: string) => void;
  editTier: string;
  setEditTier: (val: string) => void;
  editDaysExtension: number;
  setEditDaysExtension: (val: number) => void;
  editIsActive: boolean;
  setEditIsActive: (val: boolean) => void;
  isUpdatingMerchant: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminEditMerchantModal: React.FC<AdminEditMerchantModalProps> = ({
  isOpen,
  onClose,
  selectedMerchant,
  editName,
  setEditName,
  editOwnerName,
  setEditOwnerName,
  editPhone,
  setEditPhone,
  editEmail,
  setEditEmail,
  editCity,
  setEditCity,
  editGstin,
  setEditGstin,
  editTier,
  setEditTier,
  editDaysExtension,
  setEditDaysExtension,
  editIsActive,
  setEditIsActive,
  isUpdatingMerchant,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-indigo-500" />
          <span>Edit Merchant Store: {selectedMerchant?.name}</span>
        </div>
      }
      description="Update merchant account details, extend subscription validity, or toggle access status."
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Store / Business Name *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <Input
            label="Owner Full Name"
            value={editOwnerName}
            onChange={(e) => setEditOwnerName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone Number"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            required
          />
          <Input
            label="Owner Email Address"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="City / Town"
            value={editCity}
            onChange={(e) => setEditCity(e.target.value)}
          />
          <Input
            label="GSTIN Number"
            value={editGstin}
            onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Subscription Plan
            </label>
            <select
              value={editTier}
              onChange={(e) => setEditTier(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="free">Free Forever</option>
              <option value="pro">Pro Plan</option>
              <option value="growth">Growth Plan</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Extend Expiry (+Days)
            </label>
            <select
              value={editDaysExtension}
              onChange={(e) => setEditDaysExtension(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value={0}>No change</option>
              <option value={30}>+30 Days (1 Month)</option>
              <option value={90}>+90 Days (3 Months)</option>
              <option value={365}>+365 Days (1 Year)</option>
              <option value={730}>+730 Days (2 Years)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Account Status
            </label>
            <select
              value={editIsActive ? 'active' : 'inactive'}
              onChange={(e) => setEditIsActive(e.target.value === 'active')}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="active">Active (Access Allowed)</option>
              <option value="inactive">Frozen / Blocked</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isUpdatingMerchant}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black"
          >
            {isUpdatingMerchant ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
