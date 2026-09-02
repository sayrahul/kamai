'use client';

import React from 'react';
import { Customer } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Banknote, 
  QrCode, 
  Landmark, 
  FileText 
} from 'lucide-react';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  entryType: 'CREDIT_SALE' | 'PAYMENT_RECEIVED';
  entryAmount: string;
  setEntryAmount: (val: string) => void;
  entryDate: string;
  setEntryDate: (val: string) => void;
  entryPaymentMode: 'cash' | 'upi' | 'bank' | 'other';
  setEntryPaymentMode: (val: 'cash' | 'upi' | 'bank' | 'other') => void;
  entryNotes: string;
  setEntryNotes: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  customer,
  entryType,
  entryAmount,
  setEntryAmount,
  entryDate,
  setEntryDate,
  entryPaymentMode,
  setEntryPaymentMode,
  entryNotes,
  setEntryNotes,
  onSubmit,
}) => {
  if (!customer) return null;

  const isDebit = entryType === 'CREDIT_SALE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {isDebit ? (
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}
          <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            {isDebit 
              ? `You Gave ₹ (Udhar) to ${customer.name}` 
              : `You Got ₹ (Payment) from ${customer.name}`}
          </span>
        </div>
      }
      description={
        isDebit 
          ? 'Record goods, items or loan given on credit. Will increase customer balance.' 
          : 'Record cash, UPI or bank payment received. Will decrease customer balance.'
      }
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4 p-1">
        {/* Amount Input */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Amount (₹) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
              ₹
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={entryAmount}
              onChange={(e) => setEntryAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 text-lg font-black font-mono bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              autoFocus
            />
          </div>
        </div>

        {/* Date Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Transaction Date
          </label>
          <Input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full text-xs font-semibold"
          />
        </div>

        {/* Payment Mode Selection (For Payment Received) */}
        {!isDebit && (
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Payment Mode
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'upi', label: 'UPI QR', icon: QrCode },
                { id: 'bank', label: 'Bank', icon: Landmark },
                { id: 'other', label: 'Other', icon: FileText },
              ].map((mode) => {
                const Icon = mode.icon;
                const isSelected = entryPaymentMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setEntryPaymentMode(mode.id as any)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px]">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes / Item Details */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Notes / Item Details (Optional)
          </label>
          <textarea
            rows={2}
            value={entryNotes}
            onChange={(e) => setEntryNotes(e.target.value)}
            placeholder={isDebit ? 'e.g. 5kg Rice, 2L Mustard Oil or Bill reference' : 'e.g. Google Pay UTR / Cash deposited at counter'}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Form Actions */}
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
            className={`font-bold text-xs ${
              isDebit
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isDebit ? 'Confirm & Record Udhar' : 'Confirm & Save Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
