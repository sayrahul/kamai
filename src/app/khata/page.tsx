'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR, generateWhatsAppReceiptLink } from '@/lib/utils';
import { LedgerTransaction, Customer } from '@/types';
import { 
  BookOpen, 
  Search, 
  Phone, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  MessageCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

export default function KhataPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Edit Entry Modal
  const [editingTx, setEditingTx] = useState<LedgerTransaction | null>(null);
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxNotes, setEditTxNotes] = useState('');
  const [editTxType, setEditTxType] = useState<'PAYMENT_RECEIVED' | 'CREDIT_SALE'>('PAYMENT_RECEIVED');

  // Clear All Modal
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [clearConfirmationText, setClearConfirmationText] = useState('');

  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const customers = useLiveQuery(async () => {
    let list = await db.customers.toArray();
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
    }
    return list;
  }, [searchQuery]) || [];

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  const transactions = useLiveQuery(async () => {
    if (!selectedCustomer) return [];
    return await db.ledger_transactions
      .where('party_id')
      .equals(selectedCustomer.id)
      .reverse()
      .toArray();
  }, [selectedCustomer]) || [];

  const totalOutstanding = customers.reduce((acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0), 0);

  // Recalculates customer balance by summing all transactions
  const recalculateCustomerBalance = async (customerId: string) => {
    const allTx = await db.ledger_transactions.where('party_id').equals(customerId).toArray();
    let computedBalance = 0;
    for (const tx of allTx) {
      if (
        tx.transaction_type === 'CREDIT_SALE' || 
        tx.transaction_type === 'OPENING_BALANCE' || 
        tx.transaction_type === 'CREDIT_PURCHASE'
      ) {
        computedBalance += tx.amount;
      } else if (
        tx.transaction_type === 'PAYMENT_RECEIVED' || 
        tx.transaction_type === 'SUPPLIER_PAYMENT'
      ) {
        computedBalance -= tx.amount;
      } else if (tx.transaction_type === 'ADJUSTMENT') {
        computedBalance += tx.amount;
      }
    }
    await db.customers.update(customerId, {
      current_balance: Math.max(0, computedBalance),
      updated_at: new Date().toISOString(),
    });
  };

  // Record Payment Handler
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentAmount) return;

    const amountPaise = Math.round(parseFloat(paymentAmount) * 100);
    const newBalance = Math.max(0, selectedCustomer.current_balance - amountPaise);
    const now = new Date().toISOString();

    await db.customers.update(selectedCustomer.id, {
      current_balance: newBalance,
      updated_at: now,
    });

    await db.ledger_transactions.put({
      id: `ledg_${Date.now()}`,
      business_id: business?.id || 'biz_default',
      party_type: 'customer',
      party_id: selectedCustomer.id,
      party_name: selectedCustomer.name,
      transaction_type: 'PAYMENT_RECEIVED',
      amount: amountPaise,
      balance_after: newBalance,
      notes: paymentNotes.trim() || 'Payment Received (Cash/UPI)',
      created_at: now,
    });

    setPaymentAmount('');
    setPaymentNotes('');
    setIsPaymentModalOpen(false);
  };

  // Open Edit Entry
  const handleOpenEditTx = (tx: LedgerTransaction) => {
    setEditingTx(tx);
    setEditTxAmount((tx.amount / 100).toString());
    setEditTxNotes(tx.notes || '');
    setEditTxType(tx.transaction_type === 'CREDIT_SALE' ? 'CREDIT_SALE' : 'PAYMENT_RECEIVED');
  };

  // Save Edited Entry
  const handleSaveEditTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !selectedCustomer) return;

    const newAmountPaise = Math.round(parseFloat(editTxAmount) * 100);
    if (isNaN(newAmountPaise) || newAmountPaise <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    await db.ledger_transactions.update(editingTx.id, {
      amount: newAmountPaise,
      transaction_type: editTxType,
      notes: editTxNotes.trim(),
    });

    await recalculateCustomerBalance(selectedCustomer.id);
    setEditingTx(null);
  };

  // Delete Individual Entry
  const handleDeleteTx = async (txId: string) => {
    if (!selectedCustomer) return;
    if (!confirm('Are you sure you want to delete this Khata ledger entry?')) return;

    await db.ledger_transactions.delete(txId);
    await recalculateCustomerBalance(selectedCustomer.id);
  };

  // Clear All Khata for selected customer
  const handleClearCustomerKhata = async () => {
    if (!selectedCustomer) return;
    if (clearConfirmationText.toUpperCase() !== 'DELETE') {
      alert("Please type 'DELETE' to confirm.");
      return;
    }

    // Delete all ledger transactions for this customer
    const txs = await db.ledger_transactions.where('party_id').equals(selectedCustomer.id).toArray();
    const ids = txs.map(t => t.id);
    await db.ledger_transactions.bulkDelete(ids);

    // Reset customer balance to 0
    await db.customers.update(selectedCustomer.id, {
      current_balance: 0,
      updated_at: new Date().toISOString(),
    });

    setIsClearAllModalOpen(false);
    setClearConfirmationText('');
  };

  const handleSendReminder = (c: typeof selectedCustomer) => {
    if (!c) return;
    const dueAmount = (c.current_balance / 100).toFixed(2);
    const storeName = business?.name || 'Our Store';
    const upiTarget = business?.upi_id ? business.upi_id : '';
    
    let msg = `Namaste ${c.name} ji,\nThis is a gentle payment reminder from *${storeName}* regarding your pending Khata balance of *₹${dueAmount}*.\n\n`;
    if (upiTarget) {
      msg += `📲 Pay instantly via GPay / PhonePe / Paytm:\nUPI ID: *${upiTarget}*\n\n`;
    }
    msg += `Thank you for shopping with us! 🙏`;

    window.open(generateWhatsAppReceiptLink(c.phone || '', msg), '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-800" />
            <span>Digital Credit Khata Ledger</span>
          </h1>
          <p className="text-xs text-slate-500">
            Total Outstanding: <span className="font-extrabold text-rose-700 font-mono">{formatINR(totalOutstanding)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Customer List */}
        <div className="lg:col-span-5 space-y-2.5">
          <Input
            placeholder="Search customer by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />

          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {customers.map((c) => {
              const isSelected = selectedCustomer?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-amber-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{c.name}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                      <Phone className="w-3 h-3" />
                      <span>{c.phone || 'No phone'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs font-bold font-mono ${c.current_balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {formatINR(c.current_balance)}
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">
                      {c.current_balance > 0 ? 'Pending Balance' : 'Settled'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Ledger Details for Selected Customer */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCustomer ? (
            <Card className="p-4 bg-white border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedCustomer.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">{selectedCustomer.phone} • {selectedCustomer.address || 'Local Customer'}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                    onClick={() => handleSendReminder(selectedCustomer)}
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    <span>WhatsApp</span>
                  </Button>

                  <Button
                    size="sm"
                    className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Record Payment</span>
                  </Button>

                  {transactions.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200"
                      onClick={() => setIsClearAllModalOpen(true)}
                      title="Clear Customer Khata History"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Transactions List */}
              <div className="pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Khata Statement ({transactions.length})
                  </h3>
                  <span className="text-[11px] text-slate-500">Edit or delete individual entries below</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {transactions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">No ledger transactions recorded yet.</div>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/70 p-1.5 rounded-lg transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${tx.transaction_type === 'PAYMENT_RECEIVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {tx.transaction_type === 'PAYMENT_RECEIVED' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {tx.transaction_type === 'PAYMENT_RECEIVED' ? 'Payment Received' : 'Udhar / Credit Sale'}
                            </div>
                            <div className="text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleDateString('en-IN')} • {tx.notes || 'No note'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className={`font-bold font-mono text-xs ${tx.transaction_type === 'PAYMENT_RECEIVED' ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {tx.transaction_type === 'PAYMENT_RECEIVED' ? '-' : '+'}{formatINR(tx.amount)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">Bal: {formatINR(tx.balance_after)}</div>
                          </div>

                          {/* Quick Action Buttons: Edit & Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTx(tx)}
                              className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                              title="Edit Entry"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTx(tx.id)}
                              className="p-1.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-xl bg-white">
              Select a customer to view Khata ledger
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for ${selectedCustomer?.name}`}
        description="Enter payment amount received to settle or reduce outstanding balance."
      >
        <form onSubmit={handleRecordPayment} className="space-y-3">
          <Input
            label="Payment Amount (₹)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Notes (Optional)"
            placeholder="e.g. Cash received / GPay received"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
          />
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">Save Payment</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Entry Modal */}
      <Modal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        title="Edit Khata Ledger Entry"
        description="Update transaction amount, type, or notes. Balance will recalculate automatically."
      >
        <form onSubmit={handleSaveEditTx} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Transaction Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditTxType('PAYMENT_RECEIVED')}
                className={`py-1.5 rounded-lg border text-xs font-bold ${
                  editTxType === 'PAYMENT_RECEIVED'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Payment Received (-)
              </button>
              <button
                type="button"
                onClick={() => setEditTxType('CREDIT_SALE')}
                className={`py-1.5 rounded-lg border text-xs font-bold ${
                  editTxType === 'CREDIT_SALE'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Udhar / Credit Given (+)
              </button>
            </div>
          </div>

          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            value={editTxAmount}
            onChange={(e) => setEditTxAmount(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Notes"
            value={editTxNotes}
            onChange={(e) => setEditTxNotes(e.target.value)}
            placeholder="e.g. Cleared via PhonePe"
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingTx(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
              Update Entry
            </Button>
          </div>
        </form>
      </Modal>

      {/* Clear All Confirmation Modal */}
      <Modal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        title="⚠️ Clear All Customer Khata History"
        description="This will permanently delete all Khata entries for this customer and reset their pending balance to ₹0."
      >
        <div className="space-y-3">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            <div className="font-bold mb-1">Customer: {selectedCustomer?.name}</div>
            <div>Current Outstanding: {formatINR(selectedCustomer?.current_balance || 0)}</div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Type <span className="text-rose-600 font-mono font-black">DELETE</span> to confirm:
            </label>
            <Input
              type="text"
              placeholder="DELETE"
              value={clearConfirmationText}
              onChange={(e) => setClearConfirmationText(e.target.value)}
              autoFocus
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsClearAllModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={clearConfirmationText.toUpperCase() !== 'DELETE'}
              onClick={handleClearCustomerKhata}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Confirm Wipe
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
