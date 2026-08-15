'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR, generateWhatsAppReceiptLink } from '@/lib/utils';
import { 
  BookOpen, 
  Search, 
  User, 
  Phone, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Share2, 
  Plus, 
  CheckCircle2,
  MessageCircle
} from 'lucide-react';
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-800" />
            <span>Digital Udhar Khata (ग्राहक खाता)</span>
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
                  className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between ${
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
            <Card className="p-4 bg-white border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedCustomer.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">{selectedCustomer.phone} • {selectedCustomer.address || 'Local Customer'}</p>
                </div>

                <div className="flex items-center gap-2">
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
                    className="text-xs font-bold"
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Record Payment</span>
                  </Button>
                </div>
              </div>

              {/* Transactions List */}
              <div className="pt-3 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Transaction History</h3>
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {transactions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">No ledger transactions yet.</div>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${tx.transaction_type === 'PAYMENT_RECEIVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {tx.transaction_type === 'PAYMENT_RECEIVED' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {tx.transaction_type.replace('_', ' ')}
                            </div>
                            <div className="text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleDateString('en-IN')} • {tx.notes}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold font-mono text-xs ${tx.transaction_type === 'PAYMENT_RECEIVED' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {tx.transaction_type === 'PAYMENT_RECEIVED' ? '-' : '+'}{formatINR(tx.amount)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">Bal: {formatINR(tx.balance_after)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-xl bg-white">Select a customer to view Khata ledger</div>
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
            <Button type="submit" size="sm">Save Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
