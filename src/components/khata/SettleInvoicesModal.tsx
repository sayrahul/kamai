'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sale, Customer, Business, LedgerTransaction } from '@/types';
import { formatINR } from '@/lib/utils';
import { db } from '@/lib/db';
import { getFirestoreDb } from '@/lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { sanitizeForFirestore } from '@/lib/firebase/firestoreSync';
import { 
  CheckCircle2, 
  Receipt, 
  IndianRupee, 
  Calendar, 
  CreditCard, 
  Sparkles, 
  ArrowDownLeft, 
  AlertCircle 
} from 'lucide-react';

interface SettleInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSales: Sale[];
  customer: Customer;
  business?: Business | null;
  onSuccess: (updatedCustBalance: number, settledCount: number) => void;
}

export function SettleInvoicesModal({
  isOpen,
  onClose,
  selectedSales,
  customer,
  business,
  onSuccess,
}: SettleInvoicesModalProps) {
  const totalDuePaise = selectedSales.reduce((sum, s) => sum + (s.balance_due || 0), 0);
  
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank' | 'other'>('cash');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [sendWhatsAppReceipt, setSendWhatsAppReceipt] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && selectedSales.length > 0) {
      setPaymentAmount((totalDuePaise / 100).toFixed(2));
      setDiscountAmount('');
      setPaymentMode('cash');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [isOpen, selectedSales, totalDuePaise]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSales.length === 0 || !customer) return;

    const enteredPayPaise = Math.round(parseFloat(paymentAmount || '0') * 100);
    const enteredDiscPaise = Math.round(parseFloat(discountAmount || '0') * 100);
    const totalSettlementPaise = enteredPayPaise + enteredDiscPaise;

    if (totalSettlementPaise <= 0) {
      alert('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const txDate = paymentDate ? new Date(paymentDate).toISOString() : now;
      const businessId = business?.id || customer.business_id || 'biz_default';

      // 1. Allocate settlement amount across selected invoices (in order)
      let remainingSettlement = totalSettlementPaise;
      let remainingPaymentForAllocation = enteredPayPaise;

      for (const sale of selectedSales) {
        if (remainingSettlement <= 0) break;

        const currentSaleDue = sale.balance_due || 0;
        const allocatedForThisSale = Math.min(remainingSettlement, currentSaleDue);
        const allocatedPaidCash = Math.min(remainingPaymentForAllocation, allocatedForThisSale);

        const newAmountReceived = (sale.amount_received || 0) + allocatedPaidCash;
        const newBalanceDue = Math.max(0, currentSaleDue - allocatedForThisSale);
        const newPaymentStatus = newBalanceDue === 0 ? 'paid' : 'partial';

        const updatedSale: Sale = {
          ...sale,
          amount_received: newAmountReceived,
          balance_due: newBalanceDue,
          payment_status: newPaymentStatus,
          updated_at: now,
        };

        // Persist updated sale in Dexie
        await db.sales.put(updatedSale);

        // Firestore sync
        try {
          const firestore = getFirestoreDb();
          if (firestore && businessId && businessId !== 'biz_default') {
            await setDoc(
              doc(firestore, `businesses/${businessId}/sales/${sale.id}`),
              sanitizeForFirestore(updatedSale),
              { merge: true }
            );
          }
        } catch {}

        remainingSettlement -= allocatedForThisSale;
        remainingPaymentForAllocation = Math.max(0, remainingPaymentForAllocation - allocatedPaidCash);
      }

      // 2. Update Customer Balance
      const freshCustomer = (await db.customers.get(customer.id)) || customer;
      const updatedCustomerBalance = Math.max(0, (freshCustomer.current_balance || 0) - totalSettlementPaise);

      await db.customers.update(customer.id, {
        current_balance: updatedCustomerBalance,
        updated_at: now,
      });

      // 3. Create Ledger Transaction for Payment Received
      const invoiceNums = selectedSales.map((s) => `#${s.invoice_number}`).join(', ');
      const ledgerTxId = `ledg_${Date.now()}`;
      const noteDetails = `Settled ${selectedSales.length} Bill(s): ${invoiceNums}${
        enteredDiscPaise > 0 ? ` (Incl ₹${(enteredDiscPaise / 100).toFixed(2)} discount)` : ''
      }${notes.trim() ? ` • ${notes.trim()}` : ''}`;

      const newLedgerTx: LedgerTransaction = {
        id: ledgerTxId,
        business_id: businessId,
        party_type: 'customer',
        party_id: customer.id,
        party_name: customer.name,
        transaction_type: 'PAYMENT_RECEIVED',
        amount: totalSettlementPaise,
        payment_method: paymentMode,
        balance_after: updatedCustomerBalance,
        reference_id: selectedSales.map((s) => s.id).join(','),
        notes: noteDetails,
        created_at: txDate,
        sync_status: 'synced',
      };

      await db.ledger_transactions.put(newLedgerTx);

      // 4. Cloud Ledger Sync
      try {
        const firestore = getFirestoreDb();
        if (firestore && businessId && businessId !== 'biz_default') {
          await setDoc(
            doc(firestore, `businesses/${businessId}/customers/${customer.id}`),
            sanitizeForFirestore({
              ...freshCustomer,
              current_balance: updatedCustomerBalance,
              updated_at: now,
            }),
            { merge: true }
          );

          await setDoc(
            doc(firestore, `businesses/${businessId}/ledger_transactions/${ledgerTxId}`),
            sanitizeForFirestore(newLedgerTx),
            { merge: true }
          );
        }
      } catch {}

      // 5. WhatsApp Payment Receipt Voucher Dispatch
      if (sendWhatsAppReceipt && customer?.phone) {
        const cleanPhone = customer.phone.replace(/\D/g, '').slice(-10);
        const formattedPhone = cleanPhone ? `91${cleanPhone}` : '';
        const bizName = business?.name || 'Hamari Dukan';
        const msg = `🙏 *PAYMENT RECEIVED RECEIPT* 🙏\n` +
          `🏪 *${bizName}*\n\n` +
          `Namaste *${customer.name}* ji,\n` +
          `Aapki taraf se *${formatINR(totalSettlementPaise)}* prapt hue.\n\n` +
          `📅 *Tareekh:* ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n` +
          `💳 *Payment Mode:* ${paymentMode.toUpperCase()}\n` +
          `${notes.trim() ? `📝 *Note:* ${notes.trim()}\n` : ''}` +
          `--------------------------------\n` +
          `💰 *Remaining Khata Balance:* ${updatedCustomerBalance > 0 ? formatINR(updatedCustomerBalance) : '₹0 (Hisab Nil / Clear ✅)'}\n` +
          `--------------------------------\n` +
          `Aapke vishwas aur payment ke liye dhanyawad! 🙏`;

        const waUrl = formattedPhone 
          ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`
          : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        if (typeof window !== 'undefined') {
          window.open(waUrl, '_blank');
        }
      }

      onSuccess(updatedCustomerBalance, selectedSales.length);
      onClose();
    } catch (err: any) {
      console.error('Failed to settle invoices:', err);
      alert(`Error settling invoices: ${err?.message || 'Unknown error'}`);
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
          <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
          <span>Settle {selectedSales.length} Selected {selectedSales.length === 1 ? 'Bill' : 'Bills'}</span>
        </div>
      }
      description={`Record payment collection and clear pending balance for ${customer?.name}.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selected Invoices Summary Box */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Selected Invoices ({selectedSales.length})</span>
            <span className="text-slate-900 dark:text-slate-100 font-mono">
              Total Due: {formatINR(totalDuePaise)}
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-700/50 pr-1">
            {selectedSales.map((s) => (
              <div key={s.id} className="py-1.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    #{s.invoice_number}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                  </span>
                </div>
                <div className="text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatINR(s.balance_due || 0)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Payment Received (₹) *"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Discount / Concession (₹)"
            type="number"
            step="0.01"
            placeholder="0.00 (Optional)"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Payment Mode
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
            >
              <option value="cash">Cash 💵</option>
              <option value="upi">UPI / GPay / PhonePe 📲</option>
              <option value="bank">Bank Transfer 🏦</option>
              <option value="other">Cheque / Other 📄</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Payment Date
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
            />
          </div>
        </div>

        <Input
          label="Notes / Reference (Optional)"
          placeholder="e.g. Cleared via PhonePe UTR 123456"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {customer?.phone && (
          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-950 dark:text-emerald-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sendWhatsAppReceipt}
              onChange={(e) => setSendWhatsAppReceipt(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>📲 Send WhatsApp Payment Receipt Slip to +91{customer.phone.replace(/\D/g, '').slice(-10)}</span>
          </label>
        )}

        {/* Action Buttons */}
        <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer gap-1.5 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Recording Settlement...' : 'Confirm & Clear Bills'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
