'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR, generateWhatsAppReceiptLink } from '@/lib/utils';
import { BookOpen, Search, User, Phone, ArrowUpRight, ArrowDownLeft, Share2, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

export default function KhataPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

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

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentAmount) return;

    const amountPaise = Math.round(parseFloat(paymentAmount) * 100);
    const newBalance = selectedCustomer.current_balance - amountPaise;
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
      notes: paymentNotes.trim() || 'Payment Received',
      created_at: now,
    });

    setPaymentAmount('');
    setPaymentNotes('');
    setIsPaymentModalOpen(false);
  };

  const handleSendReminder = (c: typeof selectedCustomer) => {
    if (!c) return;
    const msg = `नमस्ते ${c.name} जी, ${business?.name || 'हमारी दुकान'} से आपका कुल बाक़ी हिसाब ₹${(c.current_balance / 100).toFixed(2)} है। कृपया सुविधानुसार भुगतान करें।\n${business?.upi_id ? `UPI ID: ${business.upi_id}\n` : ''}धन्यवाद! 🙏`;
    window.open(generateWhatsAppReceiptLink(c.phone || '', msg), '_blank');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-rose-500" />
            <span>Digital Udhar Khata (ग्राहक खाता)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Total Outstanding: <span className="font-extrabold text-rose-600">{formatINR(totalOutstanding)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Customer List */}
        <div className="lg:col-span-5 space-y-3">
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
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-vyapar-500 bg-vyapar-50/70 dark:bg-vyapar-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{c.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{c.phone || 'No phone'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-sm font-black ${c.current_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatINR(c.current_balance)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {c.current_balance > 0 ? 'Udhar (बाक़ी)' : 'Settled'}
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
            <Card className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedCustomer.name}</h2>
                  <p className="text-xs text-slate-400">{selectedCustomer.phone} • {selectedCustomer.address || 'Local Customer'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleSendReminder(selectedCustomer)}
                  >
                    <Share2 className="w-4 h-4 mr-1.5" />
                    <span>WhatsApp Reminder</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    <span>Record Payment</span>
                  </Button>
                </div>
              </div>

              {/* Transactions List */}
              <div className="pt-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transaction History</h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                  {transactions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">No ledger transactions yet.</div>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${tx.transaction_type === 'PAYMENT_RECEIVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {tx.transaction_type === 'PAYMENT_RECEIVED' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {tx.transaction_type.replace('_', ' ')}
                            </div>
                            <div className="text-[10px] text-slate-400">{new Date(tx.created_at).toLocaleDateString()} • {tx.notes}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-black text-sm ${tx.transaction_type === 'PAYMENT_RECEIVED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.transaction_type === 'PAYMENT_RECEIVED' ? '-' : '+'}{formatINR(tx.amount)}
                          </div>
                          <div className="text-[10px] text-slate-400">Bal: {formatINR(tx.balance_after)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <div className="p-12 text-center text-slate-400 border border-dashed rounded-3xl">Select a customer to view Khata ledger</div>
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
        <form onSubmit={handleRecordPayment} className="space-y-4">
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
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="success">Save Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
