'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { UserPlus } from 'lucide-react';

interface QuickAddKhataCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  newCustName: string;
  setNewCustName: (val: string) => void;
  newCustPhone: string;
  setNewCustPhone: (val: string) => void;
  newCustAddress: string;
  setNewCustAddress: (val: string) => void;
  newCustOpeningBalance: string;
  setNewCustOpeningBalance: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  formError?: string;
}

export const QuickAddKhataCustomerModal: React.FC<QuickAddKhataCustomerModalProps> = ({
  isOpen,
  onClose,
  newCustName,
  setNewCustName,
  newCustPhone,
  setNewCustPhone,
  newCustAddress,
  setNewCustAddress,
  newCustOpeningBalance,
  setNewCustOpeningBalance,
  onSubmit,
  formError,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-amber-600" />
          <span>Add New Customer to Khata</span>
        </div>
      }
      description="Create a new customer account to track Udhar and payment transactions."
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-3.5 p-1">
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Customer Name *
          </label>
          <Input
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Phone Number (For WhatsApp Statement &amp; Reminders)
          </label>
          <Input
            value={newCustPhone}
            onChange={(e) => setNewCustPhone(e.target.value)}
            placeholder="9876543210"
            type="tel"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Address / Locality (Optional)
          </label>
          <Input
            value={newCustAddress}
            onChange={(e) => setNewCustAddress(e.target.value)}
            placeholder="e.g. Shop 4, Main Bazaar"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Opening Balance (Purana Udhar / Advance) (₹)
          </label>
          <Input
            type="number"
            step="0.01"
            value={newCustOpeningBalance}
            onChange={(e) => setNewCustOpeningBalance(e.target.value)}
            placeholder="0.00"
            helperText="Enter existing due balance if customer already owes money."
          />
        </div>

        {formError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in flex items-center gap-2">
            <span>⚠️</span>
            <span>{formError}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
          >
            Save Customer
          </Button>
        </div>
      </form>
    </Modal>
  );
};
