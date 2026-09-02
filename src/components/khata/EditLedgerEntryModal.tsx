'use client';

import React from 'react';
import { LedgerTransaction } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Edit2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface EditLedgerEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTx: LedgerTransaction | null;
  editTxType: 'CREDIT_SALE' | 'PAYMENT_RECEIVED';
  setEditTxType: (type: 'CREDIT_SALE' | 'PAYMENT_RECEIVED') => void;
  editTxAmount: string;
  setEditTxAmount: (val: string) => void;
  editTxNotes: string;
  setEditTxNotes: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const EditLedgerEntryModal: React.FC<EditLedgerEntryModalProps> = ({
  isOpen,
  onClose,
  editingTx,
  editTxType,
  setEditTxType,
  editTxAmount,
  setEditTxAmount,
  editTxNotes,
  setEditTxNotes,
  onSubmit,
}) => {
  if (!editingTx) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Edit2 className="w-4 h-4 text-amber-600" />
          <span>Edit Transaction Entry</span>
        </div>
      }
      description="Update entry type, amount or notes. Customer total balance will automatically adjust."
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4 p-1">
        {/* Entry Type Toggle */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Transaction Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEditTxType('CREDIT_SALE')}
              className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                editTxType === 'CREDIT_SALE'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>You Gave (Udhar)</span>
            </button>
            <button
              type="button"
              onClick={() => setEditTxType('PAYMENT_RECEIVED')}
              className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                editTxType === 'PAYMENT_RECEIVED'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>You Got (Payment)</span>
            </button>
          </div>
        </div>

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
              value={editTxAmount}
              onChange={(e) => setEditTxAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 text-lg font-black font-mono bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              autoFocus
            />
          </div>
        </div>

        {/* Notes Input */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Notes / Description
          </label>
          <textarea
            rows={2}
            value={editTxNotes}
            onChange={(e) => setEditTxNotes(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Edit item details or transaction notes"
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
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
