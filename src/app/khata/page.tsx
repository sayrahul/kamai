'use client';

import React, { useState, useMemo } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR, generateWhatsAppReceiptLink } from '@/lib/utils';
import { LedgerTransaction, Customer, CustomerType } from '@/types';
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
  Receipt,
  Users,
  MapPin,
  Star,
  Tag,
  CreditCard,
  Edit3,
  Award,
  Clock,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

export default function KhataPage() {
  const { t } = useTranslation();
  
  // Main Tab State: 'khata' (Credit Ledger) or 'customers' (Profiles & Directory)
  const [activeTab, setActiveTab] = useState<'khata' | 'customers'>('khata');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'due' | 'vip' | 'regular' | 'settled'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Manual Entry Modal (You Gave / You Got)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'CREDIT_SALE' | 'PAYMENT_RECEIVED'>('PAYMENT_RECEIVED');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryPaymentMode, setEntryPaymentMode] = useState<'cash' | 'upi' | 'bank' | 'other'>('cash');

  // Add / Edit Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custGstin, setCustGstin] = useState('');
  const [custType, setCustType] = useState<CustomerType>('regular');
  const [custOpeningBalance, setCustOpeningBalance] = useState('');
  const [custLoyaltyPoints, setCustLoyaltyPoints] = useState('0');
  const [custNotes, setCustNotes] = useState('');

  // Edit Ledger Entry Modal
  const [editingTx, setEditingTx] = useState<LedgerTransaction | null>(null);
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxNotes, setEditTxNotes] = useState('');
  const [editTxType, setEditTxType] = useState<'PAYMENT_RECEIVED' | 'CREDIT_SALE'>('PAYMENT_RECEIVED');

  // Clear All Modal
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [clearConfirmationText, setClearConfirmationText] = useState('');

  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  
  const rawCustomers = useLiveQuery(async () => {
    return await db.customers.toArray();
  }) || [];

  // Filtered & Searched Customers
  const customers = useMemo(() => {
    let list = [...rawCustomers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanDigits = q.replace(/\D/g, '');
      list = list.filter((c) => {
        const cleanPhone = (c.phone || '').replace(/\D/g, '');
        const phoneDigitsMatch = cleanDigits && cleanPhone ? cleanPhone.includes(cleanDigits) : false;
        return (
          c.name.toLowerCase().includes(q) || 
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          phoneDigitsMatch ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.gstin && c.gstin.toLowerCase().includes(q))
        );
      });
    }

    if (selectedFilter === 'due') {
      list = list.filter((c) => (c.current_balance || 0) > 0);
    } else if (selectedFilter === 'vip') {
      list = list.filter((c) => c.customer_type === 'vip');
    } else if (selectedFilter === 'regular') {
      list = list.filter((c) => c.customer_type === 'regular' || !c.customer_type);
    } else if (selectedFilter === 'settled') {
      list = list.filter((c) => (c.current_balance || 0) <= 0);
    }

    return list.sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0));
  }, [rawCustomers, searchQuery, selectedFilter]);

  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId) {
      const found = rawCustomers.find((c) => c.id === selectedCustomerId);
      if (found) return found;
    }
    return customers[0] || rawCustomers[0] || null;
  }, [selectedCustomerId, rawCustomers, customers]);

  const transactions = useLiveQuery(async () => {
    if (!selectedCustomer) return [];
    return await db.ledger_transactions
      .where('party_id')
      .equals(selectedCustomer.id)
      .reverse()
      .toArray();
  }, [selectedCustomer]) || [];

  const totalOutstanding = useMemo(() => {
    return rawCustomers.reduce((acc, c) => acc + ((c.current_balance || 0) > 0 ? c.current_balance : 0), 0);
  }, [rawCustomers]);

  const dueCount = useMemo(() => rawCustomers.filter((c) => (c.current_balance || 0) > 0).length, [rawCustomers]);
  const vipCount = useMemo(() => rawCustomers.filter((c) => c.customer_type === 'vip').length, [rawCustomers]);
  const regularCount = useMemo(() => rawCustomers.filter((c) => c.customer_type === 'regular' || !c.customer_type).length, [rawCustomers]);
  const settledCount = useMemo(() => rawCustomers.filter((c) => (c.current_balance || 0) <= 0).length, [rawCustomers]);
  const totalLoyaltyPoints = useMemo(() => rawCustomers.reduce((acc, c) => acc + (c.loyalty_points || 0), 0), [rawCustomers]);
  const totalCustomerSpend = useMemo(() => rawCustomers.reduce((acc, c) => acc + (c.total_spent || 0), 0), [rawCustomers]);

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
  const handleOpenEntryModal = (type: 'CREDIT_SALE' | 'PAYMENT_RECEIVED', customCust?: Customer) => {
    if (customCust) {
      setSelectedCustomerId(customCust.id);
    }
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

  // Open Add Customer Modal
  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setCustName('');
    setCustPhone('');
    setCustEmail('');
    setCustAddress('');
    setCustGstin('');
    setCustType('regular');
    setCustOpeningBalance('');
    setCustLoyaltyPoints('0');
    setCustNotes('');
    setIsCustomerModalOpen(true);
  };

  // Open Edit Customer Modal
  const handleOpenEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustName(c.name || '');
    setCustPhone(c.phone || '');
    setCustEmail(c.email || '');
    setCustAddress(c.address || '');
    setCustGstin(c.gstin || '');
    setCustType(c.customer_type || 'regular');
    setCustOpeningBalance(c.opening_balance ? (c.opening_balance / 100).toFixed(2) : '');
    setCustLoyaltyPoints(c.loyalty_points ? String(c.loyalty_points) : '0');
    setCustNotes(c.notes || '');
    setIsCustomerModalOpen(true);
  };

  // Delete Customer
  const handleDeleteCustomer = async (c: Customer) => {
    if (!confirm(`Are you sure you want to delete customer "${c.name}"? This will also remove their local ledger data.`)) return;
    
    // Delete customer transactions
    const txs = await db.ledger_transactions.where('party_id').equals(c.id).toArray();
    await db.ledger_transactions.bulkDelete(txs.map(t => t.id));
    await db.customers.delete(c.id);

    if (selectedCustomerId === c.id) {
      setSelectedCustomerId(null);
    }
  };

  // Save Customer (Create or Update)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      alert('Please enter customer name');
      return;
    }

    const now = new Date().toISOString();
    const opBalPaise = custOpeningBalance ? Math.round(parseFloat(custOpeningBalance) * 100) : 0;
    const pts = parseInt(custLoyaltyPoints) || 0;

    if (editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        name: custName.trim(),
        phone: custPhone.trim(),
        email: custEmail.trim() || undefined,
        address: custAddress.trim() || undefined,
        gstin: custGstin.trim() || undefined,
        customer_type: custType,
        loyalty_points: pts,
        notes: custNotes.trim() || undefined,
        updated_at: now,
      };
      await db.customers.put(updated);
    } else {
      const custId = `cust_${Date.now()}`;
      const newCust: Customer = {
        id: custId,
        business_id: business?.id || 'biz_default',
        name: custName.trim(),
        phone: custPhone.trim(),
        email: custEmail.trim() || undefined,
        address: custAddress.trim() || undefined,
        gstin: custGstin.trim() || undefined,
        customer_type: custType,
        opening_balance: opBalPaise,
        current_balance: opBalPaise,
        loyalty_points: pts,
        total_spent: 0,
        total_visits: 0,
        notes: custNotes.trim() || undefined,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      };

      await db.customers.put(newCust);

      if (opBalPaise > 0) {
        await db.ledger_transactions.put({
          id: `ledg_${Date.now()}`,
          business_id: business?.id || 'biz_default',
          party_type: 'customer',
          party_id: custId,
          party_name: newCust.name,
          transaction_type: 'OPENING_BALANCE',
          amount: opBalPaise,
          balance_after: opBalPaise,
          notes: 'Opening Balance (Purana Udhar)',
          created_at: now,
        });
      }

      setSelectedCustomerId(custId);
    }

    setIsCustomerModalOpen(false);
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

  const handleSendReminder = (c: Customer) => {
    if (!c) return;
    const dueAmount = ((c.current_balance || 0) / 100).toFixed(2);
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
    <div className="space-y-4 pb-12">
      {/* ---------------- TOP HEADER WITH 2 TABS (KHATA & CUSTOMERS) ---------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Top summary row */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
              <BookOpen className="w-4.5 h-4.5 text-amber-700" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black text-slate-900 truncate flex items-center gap-1.5">
                <span>Khata Ledger &amp; Customers</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                  {rawCustomers.length} Total
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                Track credit balances, payment receipts, profiles &amp; WhatsApp reminders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <div className="bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl text-right flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-rose-700">Total Market Udhar:</span>
              <span className="font-extrabold text-rose-800 text-xs sm:text-sm font-mono">{formatINR(totalOutstanding)}</span>
            </div>
          </div>
        </div>

        {/* 2 MAIN TABS: 1. KHATA LEDGER | 2. CUSTOMERS */}
        <div className="flex border-t border-slate-100 bg-slate-50/70 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('khata')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'khata'
                ? 'border-amber-500 bg-white text-slate-900 shadow-2xs font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <BookOpen className={`w-4 h-4 ${activeTab === 'khata' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>Khata Ledger (Udhar &amp; Jama)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-bold font-mono">
              {dueCount} Due
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'customers'
                ? 'border-indigo-600 bg-white text-slate-900 shadow-2xs font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'customers' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Customers (Directory &amp; Profiles)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-900 font-bold font-mono">
              {rawCustomers.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KHATA LEDGER (UDHAR & JAMA INTERFACE) */}
      {/* ========================================================================= */}
      {activeTab === 'khata' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Panel: Customer List */}
          <div className="lg:col-span-5 space-y-2.5">
            {/* Search Bar & Single Add Customer Button */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search name, phone or GSTIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                />
              </div>
              <Button
                size="sm"
                onClick={handleOpenAddCustomer}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shrink-0 gap-1 h-9 px-3"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add Customer</span>
              </Button>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All ({rawCustomers.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter('due')}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  selectedFilter === 'due'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Udhar Due ({dueCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter('vip')}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  selectedFilter === 'vip'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                }`}
              >
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>VIP ({vipCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter('settled')}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                  selectedFilter === 'settled'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                Settled ({settledCount})
              </button>
            </div>

            {/* Customer Cards List */}
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
              {customers.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">No Customers Matching</h3>
                    <p className="text-xs text-slate-500 mt-1">Add customers to record Udhar credit and track ledger history.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleOpenAddCustomer}
                    className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    <span>+ Add Customer</span>
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
                        <div className="flex items-center gap-1.5">
                          <div className="text-xs font-bold text-slate-900 truncate">{c.name}</div>
                          {c.customer_type === 'vip' && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                              VIP
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono truncate">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.phone || 'No phone'}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-xs font-black font-mono ${(c.current_balance || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {formatINR(c.current_balance || 0)}
                        </div>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${(c.current_balance || 0) > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {(c.current_balance || 0) > 0 ? 'Due Udhar' : 'Settled'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Selected Customer Ledger & Profile */}
          <div className="lg:col-span-7 space-y-4">
            {selectedCustomer ? (
              <Card className="p-4 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-3.5">
                {/* Customer Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-black text-slate-900">{selectedCustomer.name}</h2>
                      {selectedCustomer.customer_type === 'vip' && (
                        <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200 uppercase">
                          ⭐ VIP Client
                        </span>
                      )}
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        (selectedCustomer.current_balance || 0) > 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {(selectedCustomer.current_balance || 0) > 0 ? `Due: ${formatINR(selectedCustomer.current_balance)}` : 'All Paid (₹0)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>📞 {selectedCustomer.phone || 'No phone'}</span>
                      {selectedCustomer.address && <span>• 📍 {selectedCustomer.address}</span>}
                      {selectedCustomer.gstin && <span>• 🏛️ {selectedCustomer.gstin}</span>}
                    </p>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-bold border-slate-300 hover:bg-slate-50 text-slate-700"
                      onClick={() => handleOpenEditCustomer(selectedCustomer)}
                      title="Edit Customer Profile"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      <span>Edit Profile</span>
                    </Button>

                    {selectedCustomer.phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-bold bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800"
                        onClick={() => handleSendReminder(selectedCustomer)}
                        title="Send WhatsApp Payment Reminder"
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

                {/* Customer Stats Strip */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Spent</span>
                    <span className="font-extrabold text-slate-800 font-mono">{formatINR(selectedCustomer.total_spent || 0)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Visits / Bills</span>
                    <span className="font-extrabold text-slate-800 font-mono">{selectedCustomer.total_visits || 0} times</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Loyalty Points</span>
                    <span className="font-extrabold text-purple-700 font-mono">{selectedCustomer.loyalty_points || 0} Pts</span>
                  </div>
                </div>

                {/* Core 2 Manual Action Buttons: You Gave (Udhar) vs You Got (Jama) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEntryModal('CREDIT_SALE')}
                    className="p-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-800">🔴 You Gave ₹ (Udhar)</span>
                      <ArrowUpRight className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-rose-600/90 mt-0.5 font-medium">Record credit sale or goods given</p>
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
                    <p className="text-[11px] text-emerald-600/90 mt-0.5 font-medium">Record cash or UPI payment received</p>
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
                        <p className="text-[11px] text-slate-400">Click <b>"You Gave (Udhar)"</b> or <b>"You Got (Jama)"</b> above to add entries.</p>
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
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-slate-800">Select a customer from the left list</div>
                <p className="text-xs text-slate-500">View statement, record Udhar/Jama, or manage customer profile.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CUSTOMERS DIRECTORY & PROFILES */}
      {/* ========================================================================= */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3.5 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Customers</div>
              <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1">
                {rawCustomers.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{regularCount} Regular • {vipCount} VIP</div>
            </Card>

            <Card className="p-3.5 bg-gradient-to-br from-white to-purple-50/50 border border-purple-200 rounded-xl shadow-xs">
              <div className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">⭐ VIP Clients</div>
              <div className="text-lg sm:text-xl font-black text-purple-700 font-mono mt-1">
                {vipCount}
              </div>
              <div className="text-[10px] text-purple-800 mt-0.5">High volume accounts</div>
            </Card>

            <Card className="p-3.5 bg-gradient-to-br from-white to-rose-50/50 border border-rose-200 rounded-xl shadow-xs">
              <div className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">Total Outstanding</div>
              <div className="text-lg sm:text-xl font-black text-rose-600 font-mono mt-1">
                {formatINR(totalOutstanding)}
              </div>
              <div className="text-[10px] text-rose-700 mt-0.5">{dueCount} customers with due</div>
            </Card>

            <Card className="p-3.5 bg-gradient-to-br from-white to-emerald-50/50 border border-emerald-200 rounded-xl shadow-xs">
              <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Loyalty Points Pool</div>
              <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono mt-1">
                {totalLoyaltyPoints} Pts
              </div>
              <div className="text-[10px] text-emerald-800 mt-0.5">{formatINR(totalCustomerSpend)} lifetime sales</div>
            </Card>
          </div>

          {/* Search, Filters & Add Button */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Input
                  placeholder="Search by name, phone, address or GSTIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleOpenAddCustomer}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs gap-1.5 h-9 px-3.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Add New Customer</span>
                </Button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold pt-1">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Customers ({rawCustomers.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter('due')}
                className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedFilter === 'due'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>With Udhar Due ({dueCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter('vip')}
                className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedFilter === 'vip'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                }`}
              >
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>VIP Clients ({vipCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter('regular')}
                className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                  selectedFilter === 'regular'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Regular ({regularCount})
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter('settled')}
                className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                  selectedFilter === 'settled'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Settled (₹0) ({settledCount})
              </button>
            </div>
          </div>

          {/* Customer Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {customers.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Customers Found</h3>
                <p className="text-xs text-slate-500">Try adjusting your search query or filter options.</p>
              </div>
            ) : (
              customers.map((c) => (
                <Card key={c.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
                  <div>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{c.name}</h4>
                          {c.customer_type === 'vip' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-900 border border-purple-200 shrink-0">
                              VIP
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1 truncate">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.phone || 'No phone number'}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          (c.current_balance || 0) > 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {(c.current_balance || 0) > 0 ? `Due ${formatINR(c.current_balance)}` : 'Settled'}
                        </span>
                      </div>
                    </div>

                    {/* Metadata tags */}
                    <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                      {c.address && (
                        <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1 truncate max-w-[200px]">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </span>
                      )}
                      {c.gstin && (
                        <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md font-mono text-[10px] text-slate-700">
                          GSTIN: {c.gstin}
                        </span>
                      )}
                      {c.loyalty_points ? (
                        <span className="bg-purple-50 border border-purple-200 text-purple-800 px-2 py-0.5 rounded-md font-bold text-[10px]">
                          ⭐ {c.loyalty_points} Pts
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setActiveTab('khata');
                      }}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>View Khata</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {c.phone && (
                        <button
                          type="button"
                          onClick={() => handleSendReminder(c)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer transition-colors"
                          title="WhatsApp Message / Reminder"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEditCustomer(c)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors"
                        title="Edit Customer Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCustomer(c)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer transition-colors"
                        title="Delete Customer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ---------------- MODAL 1: MANUAL ENTRY (YOU GAVE / YOU GOT) ---------------- */}
      {isEntryModalOpen && selectedCustomer && (
        <Modal
          isOpen={isEntryModalOpen}
          onClose={() => setIsEntryModalOpen(false)}
          title={entryType === 'CREDIT_SALE' ? `🔴 You Gave Udhar to ${selectedCustomer.name}` : `🟢 You Got Payment from ${selectedCustomer.name}`}
          description={entryType === 'CREDIT_SALE' ? 'This increases customer pending balance' : 'This reduces customer pending balance'}
        >
          <form onSubmit={handleSaveManualEntry} className="space-y-4 text-xs">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-500 text-sm">₹</span>
                <input
                  type="number"
                  step="any"
                  autoFocus
                  required
                  placeholder="0.00"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-base font-mono font-black border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
              </div>

              {entryType === 'PAYMENT_RECEIVED' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={entryPaymentMode}
                    onChange={(e) => setEntryPaymentMode(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white"
                  >
                    <option value="cash">Cash 💵</option>
                    <option value="upi">UPI / GPay / PhonePe 📲</option>
                    <option value="bank">Bank Transfer 🏛️</option>
                    <option value="other">Other / Cheque 📝</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Notes / Bill Reference (Optional)
              </label>
              <input
                type="text"
                placeholder={entryType === 'CREDIT_SALE' ? 'e.g. 5kg Atta + Sugar' : 'e.g. Cleared Diwali Bill'}
                value={entryNotes}
                onChange={(e) => setEntryNotes(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEntryModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="sm" 
                className={entryType === 'CREDIT_SALE' ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold' : 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'}
              >
                Save {entryType === 'CREDIT_SALE' ? 'Udhar Given' : 'Payment Received'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------------- MODAL 2: ADD / EDIT CUSTOMER PROFILE ---------------- */}
      {isCustomerModalOpen && (
        <Modal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          title={editingCustomer ? `Edit Profile: ${editingCustomer.name}` : 'Add New Customer to Khata'}
          description="Customer contact details, profile tags & opening ledger balance"
        >
          <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Customer Name *
              </label>
              <Input
                required
                autoFocus
                placeholder="e.g. Rajesh Sharma"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Phone (WhatsApp)
                </label>
                <Input
                  placeholder="e.g. 9876543210"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Customer Type
                </label>
                <select
                  value={custType}
                  onChange={(e) => setCustType(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white"
                >
                  <option value="regular">Regular Customer</option>
                  <option value="vip">⭐ VIP / Wholesaler</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Address / City
                </label>
                <Input
                  placeholder="e.g. Shop 4, Main Market"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  GSTIN (If B2B)
                </label>
                <Input
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  value={custGstin}
                  onChange={(e) => setCustGstin(e.target.value)}
                />
              </div>
            </div>

            {!editingCustomer && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Opening Purana Udhar (₹)
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00 (Optional past balance)"
                  value={custOpeningBalance}
                  onChange={(e) => setCustOpeningBalance(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Loyalty Points
              </label>
              <Input
                type="number"
                placeholder="0"
                value={custLoyaltyPoints}
                onChange={(e) => setCustLoyaltyPoints(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Notes
              </label>
              <Input
                placeholder="e.g. Trusted neighborhood client"
                value={custNotes}
                onChange={(e) => setCustNotes(e.target.value)}
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCustomerModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black">
                {editingCustomer ? 'Update Profile' : 'Add to Khata'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------------- MODAL 3: EDIT LEDGER ENTRY ---------------- */}
      {editingTx && (
        <Modal
          isOpen={Boolean(editingTx)}
          onClose={() => setEditingTx(null)}
          title="Edit Khata Transaction Entry"
        >
          <form onSubmit={handleSaveEditTx} className="space-y-4 text-xs">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Transaction Type
              </label>
              <select
                value={editTxType}
                onChange={(e) => setEditTxType(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white font-bold"
              >
                <option value="CREDIT_SALE">🔴 You Gave Udhar (Credit Sale)</option>
                <option value="PAYMENT_RECEIVED">🟢 You Got Payment (Jama)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={editTxAmount}
                onChange={(e) => setEditTxAmount(e.target.value)}
                className="w-full p-2 text-sm font-mono font-bold border border-slate-300 rounded-xl bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Notes
              </label>
              <input
                type="text"
                value={editTxNotes}
                onChange={(e) => setEditTxNotes(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingTx(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-slate-900 text-white font-bold">
                Update Entry
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------------- MODAL 4: CLEAR ALL KHATA ---------------- */}
      {isClearAllModalOpen && selectedCustomer && (
        <Modal
          isOpen={isClearAllModalOpen}
          onClose={() => setIsClearAllModalOpen(false)}
          title={`Wipe Ledger History for ${selectedCustomer.name}?`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              This will permanently delete all transaction history for <b>{selectedCustomer.name}</b> and reset their pending balance to <b>₹0.00</b>.
            </p>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              Type <b>DELETE</b> below to confirm:
            </div>
            <input
              type="text"
              placeholder="DELETE"
              value={clearConfirmationText}
              onChange={(e) => setClearConfirmationText(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-xl text-xs font-mono font-bold bg-white"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsClearAllModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleClearCustomerKhata}
                disabled={clearConfirmationText.toUpperCase() !== 'DELETE'}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Permanently Wipe
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
