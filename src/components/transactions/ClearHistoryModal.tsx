'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatINR } from '@/lib/utils';

interface ClearHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalInvoicesCount: number;
  totalRevenuePaise: number;
  onConfirmClear: () => Promise<void>;
}

export const ClearHistoryModal: React.FC<ClearHistoryModalProps> = ({
  isOpen,
  onClose,
  totalInvoicesCount,
  totalRevenuePaise,
  onConfirmClear,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (confirmInput.toUpperCase() !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await onConfirmClear();
      setConfirmInput('');
      onClose();
    } catch (err) {
      console.error('Failed to clear history:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⚠️ Clear All Transaction History"
      description="This will permanently delete all past invoices, credit sales records, and sales returns. The invoice number counter will be reset to 1."
    >
      <div className="space-y-3">
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-900 dark:text-rose-200 space-y-1">
          <div className="font-bold">Total Invoices to Delete: {totalInvoicesCount}</div>
          <div>Total Revenue: {formatINR(totalRevenuePaise)}</div>
          <div className="text-[11px] text-rose-700 dark:text-rose-400">
            This action cannot be undone. We recommend exporting Tally XML or CSV before wiping.
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Type <span className="text-rose-600 font-mono font-black">DELETE</span> to confirm:
          </label>
          <Input
            type="text"
            placeholder="DELETE"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            autoFocus
          />
        </div>

        <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={confirmInput.toUpperCase() !== 'DELETE' || isDeleting}
            onClick={handleConfirm}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            {isDeleting ? 'Deleting...' : 'Confirm Wipe History'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
