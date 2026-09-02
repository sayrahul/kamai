'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Minus } from 'lucide-react';

import { validateExpenseData } from '@/lib/validation/validators';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (data: {
    category: string;
    description: string;
    amountPaise: number;
    paidTo?: string;
  }) => Promise<void>;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('tea_snacks');
  const [paidTo, setPaidTo] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setFormError('Expense amount must be greater than ₹0.');
      return;
    }

    const amountPaise = Math.round(amtNum * 100);
    const validation = validateExpenseData({
      amountPaise,
      category,
      description,
    });

    if (!validation.isValid) {
      setFormError(validation.error || 'Invalid expense details');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveExpense({
        category,
        description: description.trim() || category,
        amountPaise,
        paidTo: paidTo.trim() || undefined,
      });
      setDescription('');
      setAmount('');
      setPaidTo('');
      setFormError('');
      onClose();
    } catch (err) {
      console.error('Failed to save expense:', err);
      setFormError('Failed to record expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Minus className="w-5 h-5 text-rose-500" />
          <span>Record Cash Expense (Pouch)</span>
        </div>
      }
      description="Record petty cash withdrawals from the cash drawer."
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Expense Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
          >
            <option value="tea_snacks">☕ Tea &amp; Refreshments</option>
            <option value="delivery_fuel">🛵 Delivery &amp; Fuel</option>
            <option value="utilities">💡 Electricity &amp; Utilities</option>
            <option value="salary">👤 Staff Salary Advance</option>
            <option value="vendor_payment">🚚 Supplier Cash Payment</option>
            <option value="cleaning">🧹 Shop Cleaning &amp; Maintenance</option>
            <option value="misc">📦 Miscellaneous / Other</option>
          </select>
        </div>

        <Input
          label="Amount (₹) *"
          placeholder="e.g. 150.00"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          autoFocus
        />

        <Input
          label="Paid To / Recipient (Optional)"
          placeholder="e.g. Delivery boy / Ramesh"
          value={paidTo}
          onChange={(e) => setPaidTo(e.target.value)}
        />

        <Input
          label="Remarks / Notes (Optional)"
          placeholder="e.g. Evening staff tea & biscuits"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {formError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in flex items-center gap-2">
            <span>⚠️</span>
            <span>{formError}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white font-black">
            {isSubmitting ? 'Recording...' : 'Record Cash Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
