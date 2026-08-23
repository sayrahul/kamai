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
  UserPlus,
  Calendar,
  CheckCircle2,
  HelpCircle,
  Wallet,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

export default function KhataPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Manual Entry Modal (You Gave / You Got)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'CREDIT_SALE' | 'PAYMENT_RECEIVED'>('PAYMENT_RECEIVED');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryPaymentMode, setEntryPaymentMode] = useState<'cash' | 'upi' | 'bank' | 'other'>('cash');

  // Quick Add Customer Modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustOpeningBalance, setNewCustOpeningBalance] = useState('');

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
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
    }
    return list.sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0));
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

  // Open Entry Modal with preset type
  const handleOpenEntryModal = (type: 'CREDIT_SALE' | 'PAYMENT_RECEIVED') => {
    setEntryType(type);
    setEntryAmount('');
    setEntryNotes('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setEntryPaymentMode('cash');
    setIsEntryModalOpen(true);
  };

  // Save Manual Entry (You Gave or You Got)
  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !entryAmount) return;

    const amountPaise = Math.round(parseFloat(entryAmount) * 100);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      alert('Please enter a valid numeric amount.');
      return;
    }

    const currentBal = selectedCustomer.current_balance || 0;
    let newBalance = currentBal;

    if (entryType === 'CREDIT_SALE') {
      // You Gave Udhar -> increases balance
      newBalance = currentBal + amountPaise;
    } else {
      // You Got Payment -> decreases balance
      newBalance = Math.max(0, currentBal - amountPaise);
    }

    const entryIso = new Date(entryDate).toISOString();
    const now = new Date().toISOString();

    await db.customers.update(selectedCustomer.id, {
      current_balance: newBalance,
      updated_at: now,
    });

    let noteText = entryNotes.trim();
    if (entryType === 'PAYMENT_RECEIVED' && !noteText) {
      noteText = `Payment via ${entryPaymentMode.toUpperCase()}`;
    } else if (entryType === 'CREDIT_SALE' && !noteText) {
      noteText = 'Udhar / Manual Credit Given';
    }

    await db.ledger_transactions.put({
      id: `ledg_${Date.now()}`,
      business_id: business?.id || 'biz_default',
      party_type: 'customer',
      party_id: selectedCustomer.id,
      party_name: selectedCustomer.name,
      transaction_type: entryType,
      amount: amountPaise,
      balance_after: newBalance,
      notes: noteText,
      created_at: entryIso,
    });

    setEntryAmount('');
    setEntryNotes('');
    setIsEntryModalOpen(false);
  };

  // Create New Customer directly from Khata
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('Please enter customer name');
      return;
    }

    const now = new Date().toISOString();
    const custId = `cust_${Date.now()}`;
    const openingBalPaise = Math.round((parseFloat(newCustOpeningBalance) || 0) * 100);

    const newCust: Customer = {
      id: custId,
      business_id: business?.id || 'biz_default',
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      customer_type: 'regular',
      opening_balance: openingBalPaise,
      current_balance: openingBalPaise,
      loyalty_points: 0,
      total_spent: 0,
      total_visits: 0,
      created_at: now,
      updated_at: now,
      sync_status: 'synced',
    };

    await db.customers.put(newCust);

    // If opening balance > 0, record initial ledger transaction
    if (openingBalPaise > 0) {
      await db.ledger_transactions.put({
        id: `ledg_${Date.now()}`,
        business_id: business?.id || 'biz_default',
        party_type: 'customer',
        party_id: custId,
        party_name: newCust.name,
        transaction_type: 'OPENING_BALANCE',
        amount: openingBalPaise,
        balance_after: openingBalPaise,
        notes: 'Opening Balance (Purana Udhar)',
        created_at: now,
      });
    }

    setSelectedCustomerId(custId);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustOpeningBalance('');
    setIsAddCustomerOpen(false);
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

    const txs = await db.ledger_transactions.where('party_id').equals(selectedCustomer.id).toArray();
    const ids = txs.map(t => t.id);
    await db.ledger_transactions.bulkDelete(ids);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <span>Digital Credit Khata Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer credit, record payments, and send instant WhatsApp reminders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-right">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Total Market Udhar</span>
            <span className="font-extrabold text-rose-800 text-sm font-mono">{formatINR(totalOutstanding)}</span>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAddCustomerOpen(true)}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            <span>+ Add Customer</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Customer List */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search customer by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {customers.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">No Customers Added Yet</h3>
                  <p className="text-xs text-slate-500 mt-1">Add your customers to record Udhar credit and Jama payments.</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  <span>+ Add First Customer</span>
                </Button>
              </div>
            ) : (
              customers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-amber-50/80 shadow-xs ring-1 ring-slate-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-slate-900 truncate">{c.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{c.phone || 'No phone'}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-xs font-black font-mono ${c.current_balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {formatINR(c.current_balance)}
                      </div>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${c.current_balance > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {c.current_balance > 0 ? 'Due Udhar' : 'Settled'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Customer Khata Ledger */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCustomer ? (
            <Card className="p-4 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
              {/* Customer Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900">{selectedCustomer.name}</h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedCustomer.current_balance > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {selectedCustomer.current_balance > 0 ? `Due: ${formatINR(selectedCustomer.current_balance)}` : 'All Paid'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedCustomer.phone || 'No phone'} • {selectedCustomer.address || 'Local Customer'}
                  </p>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedCustomer.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-bold bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800"
                      onClick={() => handleSendReminder(selectedCustomer)}
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      <span>WhatsApp</span>
                    </Button>
                  )}

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

              {/* Core 2 Manual Action Buttons: You Gave (Udhar) vs You Got (Jama) */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenEntryModal('CREDIT_SALE')}
                  className="p-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-left transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-800">🔴 You Gave ₹ (Udhar)</span>
                    <ArrowUpRight className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-rose-600/90 mt-1 font-medium">Record credit sale or goods given</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEntryModal('PAYMENT_RECEIVED')}
                  className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-left transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800">🟢 You Got ₹ (Jama)</span>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600 group-hover:translate-y-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-emerald-600/90 mt-1 font-medium">Record cash or UPI payment received</p>
                </button>
              </div>

              {/* Ledger Statement Timeline */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Khata Statement ({transactions.length} Entries)
                  </h3>
                  <span className="text-[10px] text-slate-400">Chronological ledger</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {transactions.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                      <Wallet className="w-8 h-8 text-slate-300 mx-auto" />
                      <p>No transactions recorded for this customer yet.</p>
                      <p className="text-[11px] text-slate-400">Click <b>"You Gave (Udhar)"</b> or <b>"You Got (Jama)"</b> above to add manual entries.</p>
                    </div>
                  ) : (
                    transactions.map((tx) => {
                      const isUdhar = tx.transaction_type === 'CREDIT_SALE' || tx.transaction_type === 'OPENING_BALANCE';
                      return (
                        <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 p-2 rounded-xl transition-colors">
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className={`p-2 rounded-xl shrink-0 ${isUdhar ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {isUdhar ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {tx.transaction_type === 'PAYMENT_RECEIVED'
                                  ? 'Payment Received (Jama)'
                                  : tx.transaction_type === 'OPENING_BALANCE'
                                  ? 'Opening Balance'
                                  : 'Udhar / Credit Given'}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {tx.notes ? ` • ${tx.notes}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className={`font-black font-mono text-xs ${isUdhar ? 'text-rose-700' : 'text-emerald-700'}`}>
                                {isUdhar ? '+' : '-'}{formatINR(tx.amount)}
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
                      );
                    })
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-2xl bg-white space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <p>Select a customer from the left or add a new customer to start your digital Khata ledger.</p>
              <Button
                size="sm"
                onClick={() => setIsAddCustomerOpen(true)}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                <span>+ Add Customer</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry Modal (You Gave / You Got) */}
      <Modal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        title={entryType === 'CREDIT_SALE' ? `🔴 Record Udhar Given to ${selectedCustomer?.name}` : `🟢 Record Payment Received from ${selectedCustomer?.name}`}
        size="md"
      >
        <form onSubmit={handleSaveManualEntry} className="space-y-3 p-1">
          {/* Segmented Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEntryType('CREDIT_SALE')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                entryType === 'CREDIT_SALE'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              🔴 You Gave ₹ (Udhar)
            </button>

            <button
              type="button"
              onClick={() => setEntryType('PAYMENT_RECEIVED')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                entryType === 'PAYMENT_RECEIVED'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              🟢 You Got ₹ (Jama)
            </button>
          </div>

          <Input
            label="Amount (₹) *"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={entryAmount}
            onChange={(e) => setEntryAmount(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:outline-none focus:border-slate-900"
              />
            </div>

            {entryType === 'PAYMENT_RECEIVED' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Payment Mode</label>
                <select
                  value={entryPaymentMode}
                  onChange={(e) => setEntryPaymentMode(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:outline-none focus:border-slate-900"
                >
                  <option value="cash">Cash 💵</option>
                  <option value="upi">UPI / GPay / PhonePe 📲</option>
                  <option value="bank">Bank Transfer 🏦</option>
                  <option value="other">Cheque / Other 📄</option>
                </select>
              </div>
            )}
          </div>

          <Input
            label="Notes / Items Description (Optional)"
            placeholder={entryType === 'CREDIT_SALE' ? "e.g. 2 Strips Dolo + Cough Syrup / Ration items" : "e.g. Cleared full month balance"}
            value={entryNotes}
            onChange={(e) => setEntryNotes(e.target.value)}
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEntryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className={`text-white font-bold ${entryType === 'CREDIT_SALE' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {entryType === 'CREDIT_SALE' ? 'Save Udhar Entry' : 'Save Payment Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title="Add New Customer to Khata"
        size="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3 p-1">
          <Input
            label="Customer Name *"
            placeholder="e.g. Rahul Sharma"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Phone Number (for WhatsApp Reminders)"
            placeholder="e.g. 9876543210"
            value={newCustPhone}
            onChange={(e) => setNewCustPhone(e.target.value)}
          />

          <Input
            label="Address / Area"
            placeholder="e.g. Market Road, Shop #4"
            value={newCustAddress}
            onChange={(e) => setNewCustAddress(e.target.value)}
          />

          <Input
            label="Opening Udhar Balance (₹) (If any old pending amount)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={newCustOpeningBalance}
            onChange={(e) => setNewCustOpeningBalance(e.target.value)}
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCustomerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold">
              Add Customer to Khata
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Entry Modal */}
      <Modal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        title="Edit Khata Ledger Entry"
        size="sm"
      >
        <form onSubmit={handleSaveEditTx} className="space-y-3 p-1">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Transaction Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditTxType('PAYMENT_RECEIVED')}
                className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                  editTxType === 'PAYMENT_RECEIVED'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Payment Got (-)
              </button>
              <button
                type="button"
                onClick={() => setEditTxType('CREDIT_SALE')}
                className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                  editTxType === 'CREDIT_SALE'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Udhar Given (+)
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
            <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
              Update Entry
            </Button>
          </div>
        </form>
      </Modal>

      {/* Clear All Confirmation Modal */}
      <Modal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        title="⚠️ Clear Customer Khata History"
        size="sm"
      >
        <div className="space-y-3 p-1">
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
