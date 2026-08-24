'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR, generateWhatsAppReceiptLink, generateUPILink } from '@/lib/utils';
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
  Receipt,
  Download,
  Users,
  ChevronRight,
  Filter,
  Check,
  TrendingDown,
  TrendingUp,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function KhataContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || searchParams.get('customer') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'udhar' | 'advance' | 'settled'>('all');
  
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  
  const allCustomers = useLiveQuery(async () => {
    return await db.customers.toArray();
  }) || [];

  const customers = useLiveQuery(async () => {
    let list = await db.customers.toArray();
    
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanDigits = q.replace(/\D/g, '');
      list = list.filter((c) => {
        const cleanPhone = (c.phone || '').replace(/\D/g, '');
        const phoneDigitsMatch = cleanDigits && cleanPhone ? cleanPhone.includes(cleanDigits) : false;
        return (
          c.name.toLowerCase().includes(q) || 
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          phoneDigitsMatch
        );
      });
    }

    // Balance category filter
    if (filterMode === 'udhar') {
      list = list.filter(c => (c.current_balance || 0) > 0);
    } else if (filterMode === 'advance') {
      list = list.filter(c => (c.current_balance || 0) < 0);
    } else if (filterMode === 'settled') {
      list = list.filter(c => (c.current_balance || 0) === 0);
    }

    // Sort by largest Udhar balance first, then name
    return list.sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0));
  }, [searchQuery, filterMode]) || [];

  // Set default selected customer if none selected or query provided
  useEffect(() => {
    if (initialSearch && customers.length > 0) {
      const found = customers.find(c => 
        c.name.toLowerCase().includes(initialSearch.toLowerCase()) || 
        (c.phone && c.phone.includes(initialSearch))
      );
      if (found) {
        setSelectedCustomerId(found.id);
        return;
      }
    }

    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId, initialSearch]);

  const selectedCustomer = allCustomers.find(c => c.id === selectedCustomerId) || customers[0];

  const transactions = useLiveQuery(async () => {
    if (!selectedCustomer) return [];
    return await db.ledger_transactions
      .where('party_id')
      .equals(selectedCustomer.id)
      .reverse()
      .toArray();
  }, [selectedCustomer]) || [];

  // Compute metrics across entire store
  const totalUdharReceivable = allCustomers.reduce(
    (acc, c) => acc + ((c.current_balance || 0) > 0 ? c.current_balance : 0), 
    0
  );
  const totalAdvancePayable = allCustomers.reduce(
    (acc, c) => acc + ((c.current_balance || 0) < 0 ? Math.abs(c.current_balance) : 0), 
    0
  );
  const totalUdharAccounts = allCustomers.filter(c => (c.current_balance || 0) > 0).length;

  // Recalculate customer balance by summing ledger transactions
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
      current_balance: computedBalance,
      updated_at: new Date().toISOString(),
    });
  };

  // Open Entry Modal with preset type
  const handleOpenEntryModal = (type: 'CREDIT_SALE' | 'PAYMENT_RECEIVED') => {
    if (!selectedCustomer) {
      showToast('Please select or add a customer first');
      return;
    }
    setEntryType(type);
    setEntryAmount('');
    setEntryNotes('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setEntryPaymentMode('cash');
    setIsEntryModalOpen(true);
  };

  // Save New Khata Transaction
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const amountPaise = Math.round(parseFloat(entryAmount || '0') * 100);
    if (!amountPaise || amountPaise <= 0) {
      showToast('Please enter a valid amount');
      return;
    }

    const now = new Date().toISOString();
    const txDate = entryDate ? new Date(entryDate).toISOString() : now;
    const currentBal = selectedCustomer.current_balance || 0;
    const balanceAfter = entryType === 'CREDIT_SALE'
      ? currentBal + amountPaise
      : currentBal - amountPaise;

    const newTx: LedgerTransaction = {
      id: `ledg_${Date.now()}`,
      business_id: business?.id || 'biz_default',
      party_type: 'customer',
      party_id: selectedCustomer.id,
      party_name: selectedCustomer.name,
      transaction_type: entryType,
      amount: amountPaise,
      payment_method: entryType === 'PAYMENT_RECEIVED' ? entryPaymentMode : undefined,
      notes: entryNotes.trim() || undefined,
      balance_after: balanceAfter,
      created_at: txDate,
      sync_status: 'synced',
    };

    await db.ledger_transactions.put(newTx);
    await db.customers.update(selectedCustomer.id, {
      current_balance: balanceAfter,
      updated_at: now,
    });

    setIsEntryModalOpen(false);
    showToast(
      entryType === 'CREDIT_SALE' 
        ? `Added ₹${(amountPaise / 100).toFixed(2)} Udhar for ${selectedCustomer.name}`
        : `Recorded ₹${(amountPaise / 100).toFixed(2)} Payment from ${selectedCustomer.name}`
    );
  };

  // Quick Add Customer to Khata
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const opBalPaise = newCustOpeningBalance ? Math.round(parseFloat(newCustOpeningBalance) * 100) : 0;
    const now = new Date().toISOString();
    const custId = `cust_${Date.now()}`;

    const newCustomer: Customer = {
      id: custId,
      business_id: business?.id || 'biz_default',
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim() || undefined,
      customer_type: opBalPaise > 0 ? 'credit' : 'regular',
      opening_balance: opBalPaise,
      current_balance: opBalPaise,
      loyalty_points: 0,
      total_spent: 0,
      total_visits: 0,
      created_at: now,
      updated_at: now,
      sync_status: 'synced',
    };

    await db.customers.put(newCustomer);

    if (opBalPaise > 0) {
      await db.ledger_transactions.put({
        id: `ledg_${Date.now()}`,
        business_id: business?.id || 'biz_default',
        party_type: 'customer',
        party_id: custId,
        party_name: newCustName.trim(),
        transaction_type: 'OPENING_BALANCE',
        amount: opBalPaise,
        balance_after: opBalPaise,
        notes: 'Initial opening balance',
        created_at: now,
        sync_status: 'synced',
      });
    }

    setSelectedCustomerId(custId);
    setIsAddCustomerOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustOpeningBalance('');
    showToast(`Added ${newCustomer.name} to Khata`);
  };

  // Edit Existing Transaction
  const handleSaveEditTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !selectedCustomer) return;

    const newAmountPaise = Math.round(parseFloat(editTxAmount || '0') * 100);
    if (!newAmountPaise || newAmountPaise <= 0) return;

    await db.ledger_transactions.update(editingTx.id, {
      amount: newAmountPaise,
      transaction_type: editTxType,
      notes: editTxNotes.trim() || undefined,
    });

    await recalculateCustomerBalance(selectedCustomer.id);
    setEditingTx(null);
    showToast('Updated ledger entry');
  };

  // Delete Transaction
  const handleDeleteTx = async (txId: string) => {
    if (!selectedCustomer) return;
    if (!window.confirm('Are you sure you want to delete this ledger entry?')) return;

    await db.ledger_transactions.delete(txId);
    await recalculateCustomerBalance(selectedCustomer.id);
    showToast('Deleted ledger entry');
  };

  // Wipe / Clear Customer History
  const handleClearCustomerKhata = async () => {
    if (!selectedCustomer) return;
    if (clearConfirmationText.toUpperCase() !== 'DELETE') return;

    // Delete all transactions for this party
    await db.ledger_transactions.where('party_id').equals(selectedCustomer.id).delete();
    await db.customers.update(selectedCustomer.id, {
      current_balance: 0,
      opening_balance: 0,
      updated_at: new Date().toISOString(),
    });

    setIsClearAllModalOpen(false);
    setClearConfirmationText('');
    showToast(`Cleared Khata history for ${selectedCustomer.name}`);
  };

  // WhatsApp Payment Reminder Message Builder
  const getWhatsAppReminderUrl = () => {
    if (!selectedCustomer || !selectedCustomer.phone) return '#';

    const storeName = business?.name || 'our store';
    const dueAmount = formatINR(selectedCustomer.current_balance || 0);
    const upiLink = business?.upi_id 
      ? generateUPILink(business.upi_id, storeName, selectedCustomer.current_balance)
      : '';

    let message = `नमस्ते ${selectedCustomer.name} जी,\n\n`;
    message += `आपके ${storeName} के खाते का कुल बकाया ₹${dueAmount} है।\n`;
    message += `कृपया सुविधानुसार भुगतान करें।\n`;
    if (business?.upi_id) {
      message += `\n📲 UPI से भुगतान करने के लिए यहाँ क्लिक करें:\n${upiLink}\nUPI ID: ${business.upi_id}\n`;
    }
    message += `\nधन्यवाद!\n- ${storeName}`;

    return generateWhatsAppReceiptLink(selectedCustomer.phone, message);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-800 shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ---------------- TOP HEADER (Single Row Compact) ---------------- */}
      <div className="bg-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate">
            <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
            <h1 className="text-sm xs:text-base sm:text-lg font-black text-slate-900 truncate">
              Digital Khata &amp; Udhar Ledger
            </h1>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 truncate">
            {allCustomers.length} registered accounts • {totalUdharAccounts} pending udhar
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link href="/customers">
            <Button 
              size="sm"
              variant="outline" 
              className="font-bold border-sky-300 text-sky-900 bg-sky-50 hover:bg-sky-100 text-xs px-2.5 py-1.5 shadow-2xs cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 sm:mr-1 text-sky-700" />
              <span className="hidden sm:inline">Directory</span>
            </Button>
          </Link>
          <Button 
            size="sm"
            onClick={() => setIsAddCustomerOpen(true)}
            className="font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs px-2.5 py-1.5 shadow-2xs cursor-pointer gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* ---------------- LIVE KHATA METRICS RIBBON (Space-Saving & Unified) ---------------- */}
      <Card className="p-2 sm:p-2.5 bg-white border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* 1. You Will Get (Lene Baaki) */}
          <div className="px-2 py-1 sm:py-0 sm:first:pl-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-rose-700">
                <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600" />
                <span>You'll Get</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Lene Baaki</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-rose-600 mt-0.5 leading-tight">
              {formatINR(totalUdharReceivable)}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {totalUdharAccounts} customers with dues
            </div>
          </div>

          {/* 2. Advance (Dene Baaki) */}
          <div className="px-2 pt-2 sm:pt-0 sm:px-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-emerald-700">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>Advance</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Dene Baaki</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-600 mt-0.5 leading-tight">
              {formatINR(totalAdvancePayable)}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              Advance deposits received
            </div>
          </div>

          {/* 3. Net Balance */}
          <div className="px-2 pt-2 sm:pt-0 sm:px-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-slate-700">
                <Wallet className="w-3.5 h-3.5 text-amber-500" />
                <span>Net Balance</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Receivables</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-0.5 leading-tight">
              {formatINR(totalUdharReceivable - totalAdvancePayable)}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              Net balance outstanding
            </div>
          </div>

          {/* 4. Khata Accounts */}
          <div className="px-2 pt-2 sm:pt-0 sm:pl-3">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-indigo-700">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Khata Accounts</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Total</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-indigo-600 mt-0.5 leading-tight">
              {allCustomers.length}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              Registered customers
            </div>
          </div>
        </div>
      </Card>

      {/* Main 2-Column Khata Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Customer Selector & Search (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Khata customer by name / phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterMode === 'all' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                All ({allCustomers.length})
              </button>
              <button
                onClick={() => setFilterMode('udhar')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterMode === 'udhar' 
                    ? 'bg-rose-600 text-white' 
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                Udhar Due ({allCustomers.filter(c => (c.current_balance || 0) > 0).length})
              </button>
              <button
                onClick={() => setFilterMode('advance')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterMode === 'advance' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}
              >
                Advance ({allCustomers.filter(c => (c.current_balance || 0) < 0).length})
              </button>
              <button
                onClick={() => setFilterMode('settled')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterMode === 'settled' 
                    ? 'bg-slate-700 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Settled (₹0)
              </button>
            </div>
          </div>

          {/* Customer Scrollable List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[550px] overflow-y-auto shadow-xs">
            {customers.map((c) => {
              const isSelected = selectedCustomer?.id === c.id;
              const isDue = (c.current_balance || 0) > 0;
              const isAdv = (c.current_balance || 0) < 0;

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`w-full text-left p-3.5 flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50/80 dark:bg-amber-950/30 border-l-4 border-amber-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                        {c.name}
                      </span>
                    </div>
                    {c.phone && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div
                      className={`text-xs sm:text-sm font-black ${
                        isDue
                          ? 'text-rose-600'
                          : isAdv
                          ? 'text-emerald-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {isDue 
                        ? `₹${(c.current_balance / 100).toFixed(2)}` 
                        : isAdv 
                        ? `₹${(Math.abs(c.current_balance) / 100).toFixed(2)}` 
                        : '₹0.00'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                      {isDue ? 'Due (Udhar)' : isAdv ? 'Advance' : 'Settled'}
                    </div>
                  </div>
                </button>
              );
            })}

            {customers.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <div className="font-bold text-slate-600 dark:text-slate-300">No Khata accounts found</div>
                <p className="mt-1">Add a new customer to start recording Udhar and Jama.</p>
                <Button
                  size="sm"
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="mt-3 text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  + Add First Customer
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer Ledger Statement (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCustomer ? (
            <div className="space-y-4">
              
              {/* Active Customer Profile Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                        {selectedCustomer.name}
                      </h2>
                      <Link href={`/customers?search=${encodeURIComponent(selectedCustomer.phone || selectedCustomer.name)}`}>
                        <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md hover:underline cursor-pointer">
                          View 360° Profile
                        </span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      {selectedCustomer.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {selectedCustomer.phone}
                        </span>
                      )}
                      {selectedCustomer.address && (
                        <span className="truncate max-w-[200px] text-[11px] text-slate-400">
                          {selectedCustomer.address}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Outstanding Balance Banner */}
                  <div className="text-left sm:text-right bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 flex-shrink-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Balance Due
                    </div>
                    <div
                      className={`text-xl sm:text-2xl font-black ${
                        (selectedCustomer.current_balance || 0) > 0
                          ? 'text-rose-600'
                          : (selectedCustomer.current_balance || 0) < 0
                          ? 'text-emerald-600'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {(selectedCustomer.current_balance || 0) > 0
                        ? `₹${(selectedCustomer.current_balance / 100).toFixed(2)}`
                        : (selectedCustomer.current_balance || 0) < 0
                        ? `₹${(Math.abs(selectedCustomer.current_balance) / 100).toFixed(2)}`
                        : '₹0.00'}
                    </div>
                    <div className="text-[10px] font-extrabold uppercase">
                      {(selectedCustomer.current_balance || 0) > 0 ? (
                        <span className="text-rose-600">You Will Get (Udhar)</span>
                      ) : (selectedCustomer.current_balance || 0) < 0 ? (
                        <span className="text-emerald-600">You Will Give (Advance)</span>
                      ) : (
                        <span className="text-slate-400">All Cleared</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Big Action Buttons: + You Gave (Udhar) & - You Got (Jama) */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    onClick={() => handleOpenEntryModal('CREDIT_SALE')}
                    className="p-3 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer text-xs sm:text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>You Gave ₹ (Udhar)</span>
                  </button>

                  <button
                    onClick={() => handleOpenEntryModal('PAYMENT_RECEIVED')}
                    className="p-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer text-xs sm:text-sm"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>You Got ₹ (Jama)</span>
                  </button>
                </div>

                {/* Secondary Actions Strip: WhatsApp & Settle */}
                <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {selectedCustomer.phone ? (
                    <a
                      href={getWhatsAppReminderUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold flex items-center gap-1.5 border border-emerald-200 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Send WhatsApp Reminder</span>
                    </a>
                  ) : <div />}

                  <button
                    onClick={() => setIsClearAllModalOpen(true)}
                    className="text-slate-400 hover:text-rose-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Wipe History</span>
                  </button>
                </div>
              </div>

              {/* Transactions Timeline */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    <span>Transaction Statement ({transactions.length})</span>
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {transactions.map((tx) => {
                    const isDebit = 
                      tx.transaction_type === 'CREDIT_SALE' || 
                      tx.transaction_type === 'OPENING_BALANCE' || 
                      tx.transaction_type === 'CREDIT_PURCHASE';

                    return (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                isDebit
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {isDebit ? 'You Gave (Udhar)' : 'You Got (Payment)'}
                            </span>
                            {tx.payment_method && (
                              <span className="text-[10px] font-bold text-slate-500 uppercase bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                {tx.payment_method}
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-1">
                            {tx.notes || (isDebit ? 'Udhar Bill / Goods' : 'Payment Received')}
                          </div>

                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div
                            className={`text-sm sm:text-base font-black ${
                              isDebit ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {isDebit ? `+ ₹${(tx.amount / 100).toFixed(2)}` : `- ₹${(tx.amount / 100).toFixed(2)}`}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Bal: ₹{(tx.balance_after / 100).toFixed(2)}
                          </div>

                          <div className="flex items-center gap-1 justify-end mt-1">
                            <button
                              onClick={() => {
                                setEditingTx(tx);
                                setEditTxAmount((tx.amount / 100).toFixed(2));
                                setEditTxNotes(tx.notes || '');
                                setEditTxType(isDebit ? 'CREDIT_SALE' : 'PAYMENT_RECEIVED');
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                              title="Edit Entry"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteTx(tx.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {transactions.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <div>No transactions recorded yet for this customer.</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Use the <span className="font-bold text-rose-600">You Gave</span> or <span className="font-bold text-emerald-600">You Got</span> buttons above.
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Select a Customer</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Choose a customer from the left list or create a new Khata customer to view their statement.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MANUAL KHATA ENTRY MODAL (+ You Gave / - You Got) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            {entryType === 'CREDIT_SALE' ? (
              <ArrowUpRight className="w-5 h-5 text-rose-600" />
            ) : (
              <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
            )}
            <span>{entryType === 'CREDIT_SALE' ? `You Gave ₹ (Udhar) to ${selectedCustomer?.name}` : `You Got ₹ (Payment) from ${selectedCustomer?.name}`}</span>
          </div>
        }
        description={entryType === 'CREDIT_SALE' ? "Record customer credit / unpaid goods purchase." : "Record payment collected from customer (Cash, UPI, or Bank)."}
        size="md"
      >
        <form onSubmit={handleSaveEntry} className="space-y-4">
          <Input
            label="Amount (₹) *"
            type="number"
            step="0.01"
            placeholder="e.g. 500"
            value={entryAmount}
            onChange={(e) => setEntryAmount(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Transaction Date
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>

            {entryType === 'PAYMENT_RECEIVED' && (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Mode
                </label>
                <select
                  value={entryPaymentMode}
                  onChange={(e) => setEntryPaymentMode(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
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
            placeholder={entryType === 'CREDIT_SALE' ? "e.g. 2 kg Sugar + 1L Oil" : "e.g. Cleared monthly Udhar balance"}
            value={entryNotes}
            onChange={(e) => setEntryNotes(e.target.value)}
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEntryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className={`text-white font-bold cursor-pointer ${
                entryType === 'CREDIT_SALE' 
                  ? 'bg-rose-600 hover:bg-rose-700' 
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {entryType === 'CREDIT_SALE' ? 'Save Udhar Entry' : 'Save Payment Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* QUICK ADD CUSTOMER MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title="Add Customer to Khata"
        description="Register a new customer profile and optional starting opening balance."
        size="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3 p-1">
          <Input
            label="Customer Full Name *"
            placeholder="e.g. Rahul Sharma"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Phone Number (for WhatsApp Reminders)"
            placeholder="e.g. 9876543210"
            type="tel"
            value={newCustPhone}
            onChange={(e) => setNewCustPhone(e.target.value)}
          />

          <Input
            label="Address / Area"
            placeholder="e.g. Shop #4, Market Road"
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

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCustomerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer">
              Add Customer to Khata
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* EDIT ENTRY MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        title="Edit Khata Ledger Entry"
        size="sm"
      >
        <form onSubmit={handleSaveEditTx} className="space-y-3 p-1">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditTxType('PAYMENT_RECEIVED')}
                className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                  editTxType === 'PAYMENT_RECEIVED'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
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
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
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
            placeholder="e.g. Cleared via GPay"
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingTx(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-slate-900 text-white hover:bg-slate-800 font-bold cursor-pointer">
              Update Entry
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* CLEAR ALL CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        title="⚠️ Wipe Customer Khata History"
        size="sm"
      >
        <div className="space-y-3 p-1">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            <div className="font-bold mb-1">Customer: {selectedCustomer?.name}</div>
            <div>Current Outstanding: {formatINR(selectedCustomer?.current_balance || 0)}</div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
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

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsClearAllModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={clearConfirmationText.toUpperCase() !== 'DELETE'}
              onClick={handleClearCustomerKhata}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50"
            >
              Confirm Wipe
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function KhataPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500 font-bold">Loading Khata Ledger...</div>}>
      <KhataContent />
    </Suspense>
  );
}
