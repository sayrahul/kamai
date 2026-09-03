'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR } from '@/lib/utils';
import { validateCustomerData } from '@/lib/validation/validators';
import { LedgerTransaction, Customer, Sale } from '@/types';
import { 
  BookOpen, 
  Search, 
  Phone, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  UserPlus, 
  Users, 
  ChevronLeft,
  ChevronRight,
  FileText, 
  Receipt,
  Trash2,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Modular Sub-components
import { KhataMetricsRibbon } from '@/components/khata/KhataMetricsRibbon';
import { CustomerLedgerTimelineTab } from '@/components/khata/CustomerLedgerTimelineTab';
import { ManualEntryModal } from '@/components/khata/ManualEntryModal';
import { EditLedgerEntryModal } from '@/components/khata/EditLedgerEntryModal';
import { QuickAddKhataCustomerModal } from '@/components/khata/QuickAddKhataCustomerModal';

const InvoiceModal = dynamic(
  () => import('@/components/invoices/InvoiceModal').then((m) => m.InvoiceModal),
  { ssr: false }
);
const CustomerPendingInvoicesTab = dynamic(
  () => import('@/components/khata/CustomerPendingInvoicesTab').then((m) => m.CustomerPendingInvoicesTab),
  { ssr: false }
);
const SettleInvoicesModal = dynamic(
  () => import('@/components/khata/SettleInvoicesModal').then((m) => m.SettleInvoicesModal),
  { ssr: false }
);
const ConsolidatedStatementModal = dynamic(
  () => import('@/components/khata/ConsolidatedStatementModal').then((m) => m.ConsolidatedStatementModal),
  { ssr: false }
);

function KhataContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || searchParams.get('customer') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'udhar' | 'advance' | 'settled'>('all');
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  // Manual Entry Modal (+ You Gave / - You Got)
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
  const [addCustomerError, setAddCustomerError] = useState('');

  // Edit Entry Modal
  const [editingTx, setEditingTx] = useState<LedgerTransaction | null>(null);
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxNotes, setEditTxNotes] = useState('');
  const [editTxType, setEditTxType] = useState<'PAYMENT_RECEIVED' | 'CREDIT_SALE'>('PAYMENT_RECEIVED');

  // Clear All Modal
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [clearConfirmationText, setClearConfirmationText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Customer Profile View Tabs: Timeline vs Pending Invoices
  const [profileTab, setProfileTab] = useState<'timeline' | 'invoices'>('timeline');

  // Multi-Bill Settle Modal
  const [settleModalSales, setSettleModalSales] = useState<Sale[]>([]);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  // Consolidated Multi-Bill Statement Modal
  const [consolidatedModalSales, setConsolidatedModalSales] = useState<Sale[]>([]);
  const [isConsolidatedModalOpen, setIsConsolidatedModalOpen] = useState(false);

  // Invoice Detailed Bill Viewer Modal
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // WhatsApp Payment Reminder State & Dispatcher
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const business = useLiveQuery(async () => db.businesses.toCollection().first());

  const allCustomers = useLiveQuery(async () => {
    return await db.customers.toArray();
  }) || [];

  const allSales = useLiveQuery(async () => {
    return await db.sales.orderBy('created_at').reverse().toArray();
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

  // Set default selected customer if none selected on desktop
  useEffect(() => {
    if (initialSearch && customers.length > 0) {
      const found = customers.find(c => 
        c.name.toLowerCase().includes(initialSearch.toLowerCase()) || 
        (c.phone && c.phone.includes(initialSearch))
      );
      if (found) {
        setSelectedCustomerId(found.id);
        setIsMobileDetailOpen(true);
        return;
      }
    }

    if (!selectedCustomerId && customers.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId, initialSearch]);

  const selectedCustomer = allCustomers.find(c => c.id === selectedCustomerId) || (typeof window !== 'undefined' && window.innerWidth >= 1024 ? customers[0] : null);

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

    // 1-Click WhatsApp Payment Received Receipt Slip
    if (entryType === 'PAYMENT_RECEIVED' && selectedCustomer.phone) {
      const cleanPhone = selectedCustomer.phone.replace(/\D/g, '').slice(-10);
      const formattedPhone = cleanPhone ? `91${cleanPhone}` : '';
      const bizName = business?.name || 'Hamari Dukan';
      const msg = `🙏 *PAYMENT RECEIVED RECEIPT* 🙏\n` +
        `🏪 *${bizName}*\n\n` +
        `Namaste *${selectedCustomer.name}* ji,\n` +
        `Aapki taraf se *${formatINR(amountPaise)}* prapt hue.\n\n` +
        `📅 *Tareekh:* ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n` +
        `💳 *Payment Mode:* ${entryPaymentMode.toUpperCase()}\n` +
        `${entryNotes.trim() ? `📝 *Note:* ${entryNotes.trim()}\n` : ''}` +
        `--------------------------------\n` +
        `💰 *Remaining Khata Balance:* ${balanceAfter > 0 ? formatINR(balanceAfter) : '₹0 (Hisab Nil / Clear ✅)'}\n` +
        `--------------------------------\n` +
        `Aapke vishwas aur payment ke liye dhanyawad! 🙏`;

      const waUrl = formattedPhone 
        ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      if (typeof window !== 'undefined') {
        window.open(waUrl, '_blank');
      }
    }

    showToast(
      entryType === 'CREDIT_SALE' 
        ? `Added ₹${(amountPaise / 100).toFixed(2)} Udhar for ${selectedCustomer.name}`
        : `Recorded ₹${(amountPaise / 100).toFixed(2)} Payment & sent receipt for ${selectedCustomer.name}`
    );
  };

  // Quick Add Customer to Khata
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddCustomerError('');

    const validation = validateCustomerData({
      name: newCustName,
      phone: newCustPhone,
    });

    if (!validation.isValid) {
      setAddCustomerError(validation.error || 'Please enter valid customer details.');
      return;
    }

    const opBalPaise = newCustOpeningBalance ? Math.round(parseFloat(newCustOpeningBalance) * 100) : 0;
    const now = new Date().toISOString();
    const custId = `cust_${Date.now()}`;

    const newCustomer: Customer = {
      id: custId,
      business_id: business?.id || 'biz_default',
      name: validation.cleanedValue?.name || newCustName.trim(),
      phone: validation.cleanedValue?.phone || newCustPhone.trim(),
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
    setIsMobileDetailOpen(true);
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

  // Open Full Tax Invoice Modal from reference or notes
  const handleOpenSaleInvoice = async (referenceId?: string, notes?: string) => {
    try {
      if (referenceId) {
        const sale = await db.sales.get(referenceId);
        if (sale) {
          setViewingSale(sale);
          setIsInvoiceModalOpen(true);
          return;
        }
      }
      if (notes) {
        const match = notes.match(/#([A-Z0-9-]+)/i);
        if (match && match[1]) {
          const invNum = match[1];
          const sale = await db.sales.where('invoice_number').equalsIgnoreCase(invNum).first();
          if (sale) {
            setViewingSale(sale);
            setIsInvoiceModalOpen(true);
            return;
          }
        }
      }
      showToast('Full invoice bill not found for this entry.');
    } catch (err) {
      console.warn('Failed to lookup invoice:', err);
    }
  };

  // WhatsApp Payment Reminder Dispatcher
  const handleSendWhatsAppReminder = async () => {
    if (!selectedCustomer || !selectedCustomer.phone) {
      showToast('⚠️ No phone number saved for this customer');
      return;
    }
    if ((selectedCustomer.current_balance || 0) <= 0) {
      showToast('✅ Customer has zero pending balance (Udhar)');
      return;
    }

    const cleanPhone = selectedCustomer.phone.replace(/\D/g, '').slice(-10);
    setIsSendingReminder(true);
    showToast(`📲 Dispatching WhatsApp reminder to +91${cleanPhone}...`);

    try {
      const response = await fetch('/api/whatsapp/send-khata-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedCustomer.phone,
          customerName: selectedCustomer.name,
          balanceDue: selectedCustomer.current_balance,
          businessName: business?.name || 'Our Store',
          storePhone: business?.phone,
          upiId: business?.upi_id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast(`✅ WhatsApp reminder sent to +91${cleanPhone}!`);
      } else {
        showToast(`⚠️ ${data.error || 'Failed to dispatch WhatsApp reminder'}`);
      }
    } catch (err: any) {
      showToast(`⚠️ ${err?.message || 'Network error sending reminder'}`);
    } finally {
      setIsSendingReminder(false);
    }
  };

  return (
    <div className="space-y-3.5 pb-24 lg:pb-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 sm:bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-800 shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ---------------- TOP HEADER (Compact Space-Saving) ---------------- */}
      <div className="bg-white dark:bg-slate-900 px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate">
            <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
            <h1 className="text-sm xs:text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 truncate">
              Digital Khata &amp; Udhar Ledger
            </h1>
          </div>
          <p className="text-[10.5px] sm:text-xs text-slate-500 truncate">
            {allCustomers.length} registered accounts • {totalUdharAccounts} pending udhar
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link href="/customers">
            <Button 
              size="sm"
              variant="outline" 
              className="font-bold border-sky-300 text-sky-900 bg-sky-50 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 text-xs px-2.5 py-1.5 shadow-2xs cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 sm:mr-1 text-sky-700 dark:text-sky-400" />
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

      {/* ---------------- LIVE KHATA METRICS RIBBON ---------------- */}
      <KhataMetricsRibbon
        totalUdharReceivable={totalUdharReceivable}
        totalAdvancePayable={totalAdvancePayable}
        totalUdharAccounts={totalUdharAccounts}
        totalCustomersCount={allCustomers.length}
      />

      {/* ---------------- MAIN KHATA MASTER-DETAIL WORKSPACE ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CUSTOMER DIRECTORY (Always visible on desktop, hidden on mobile if detail active) */}
        {/* ========================================================================= */}
        <div className={`space-y-3 lg:col-span-5 ${isMobileDetailOpen && selectedCustomer ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by customer name or mobile number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterMode === 'all' 
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                All ({allCustomers.length})
              </button>
              <button
                type="button"
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
                type="button"
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
                type="button"
                onClick={() => setFilterMode('settled')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterMode === 'settled' 
                    ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-950' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Settled (₹0)
              </button>
            </div>
          </div>

          {/* Customer Scrollable Cards List */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-0.5">
            {customers.map((c) => {
              const isSelected = selectedCustomer?.id === c.id;
              const isDue = (c.current_balance || 0) > 0;
              const isAdv = (c.current_balance || 0) < 0;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId(c.id);
                    setIsMobileDetailOpen(true);
                  }}
                  className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-2xs ${
                    isSelected
                      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 ring-1 ring-amber-400/60'
                      : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 border ${
                      isDue
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                        : isAdv
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate block leading-snug">
                        {c.name}
                      </span>
                      {c.phone ? (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.phone}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-300 dark:text-slate-600 italic mt-0.5">No phone saved</div>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <div>
                      <div
                        className={`text-xs sm:text-sm font-black font-mono leading-none ${
                          isDue
                            ? 'text-rose-600 dark:text-rose-400'
                            : isAdv
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {isDue 
                          ? `₹${(c.current_balance / 100).toFixed(2)}` 
                          : isAdv 
                          ? `₹${(Math.abs(c.current_balance) / 100).toFixed(2)}` 
                          : '₹0.00'}
                      </div>
                      <div className="mt-1">
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-tight ${
                          isDue
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : isAdv
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {isDue ? 'Due (बाकी)' : isAdv ? 'Advance' : 'Cleared'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 lg:hidden shrink-0" />
                  </div>
                </button>
              );
            })}

            {customers.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                <div className="font-bold text-slate-600 dark:text-slate-300">No Khata accounts found</div>
                <p className="mt-1">Add a new customer to start recording Udhar and Jama.</p>
                <Button
                  size="sm"
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="mt-2 text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  + Add First Customer
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: ACTIVE CUSTOMER DETAIL & STATEMENT */}
        {/* ========================================================================= */}
        <div className={`space-y-3 lg:col-span-7 ${!isMobileDetailOpen && !selectedCustomer ? 'hidden lg:block' : 'block'}`}>
          {selectedCustomer ? (
            <div className="space-y-3.5">
              
              {/* Active Customer Profile & Quick Action Header */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs space-y-3">
                {/* Mobile Back Navigation Bar */}
                <div className="lg:hidden flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileDetailOpen(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-800/60 cursor-pointer active:scale-95 transition-transform"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to List</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {selectedCustomer.phone && (
                      <a
                        href={`tel:${selectedCustomer.phone}`}
                        className="p-1.5 px-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold flex items-center gap-1 active:scale-95 shadow-2xs"
                        title="Call Customer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    )}
                    {selectedCustomer.phone && (
                      <button
                        type="button"
                        onClick={handleSendWhatsAppReminder}
                        disabled={isSendingReminder}
                        className="p-1.5 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1 active:scale-95 shadow-2xs disabled:opacity-50"
                        title="WhatsApp Reminder"
                      >
                        {isSendingReminder ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <WhatsAppLogo className="w-3.5 h-3.5" />
                        )}
                        <span>Reminder</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Profile Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-9 h-9 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
                            {selectedCustomer.name}
                          </h2>
                          <Link href={`/customers?search=${encodeURIComponent(selectedCustomer.phone || selectedCustomer.name)}`}>
                            <span className="text-[10px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-400 px-2 py-0.5 rounded-md hover:underline cursor-pointer border border-sky-200/60 dark:border-sky-800">
                              360° Profile
                            </span>
                          </Link>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                          {selectedCustomer.phone && (
                            <a
                              href={`tel:${selectedCustomer.phone}`}
                              className="flex items-center gap-1 font-mono text-[11.5px] hover:text-slate-900 dark:hover:text-slate-100 transition"
                              title="Click to call customer"
                            >
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{selectedCustomer.phone}</span>
                            </a>
                          )}
                          {selectedCustomer.phone && selectedCustomer.address && <span className="text-slate-300 dark:text-slate-700">•</span>}
                          {selectedCustomer.address && (
                            <span className="truncate max-w-[200px] text-[11px] text-slate-400">
                              {selectedCustomer.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Integrated Balance Due Banner */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto shrink-0 shadow-2xs ${
                    (selectedCustomer.current_balance || 0) > 0
                      ? 'bg-rose-50/90 border-rose-200 text-rose-950 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
                      : (selectedCustomer.current_balance || 0) < 0
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                      : 'bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-200'
                  }`}>
                    <div className="text-left sm:text-right">
                      <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none mb-1">
                        Current Outstanding Balance
                      </div>
                      <div className={`text-lg sm:text-xl font-black font-mono leading-none ${
                        (selectedCustomer.current_balance || 0) > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : (selectedCustomer.current_balance || 0) < 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {(selectedCustomer.current_balance || 0) > 0
                          ? `₹${(selectedCustomer.current_balance / 100).toFixed(2)}`
                          : (selectedCustomer.current_balance || 0) < 0
                          ? `₹${(Math.abs(selectedCustomer.current_balance) / 100).toFixed(2)}`
                          : '₹0.00'}
                      </div>
                    </div>
                    <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight block ${
                        (selectedCustomer.current_balance || 0) > 0
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                          : (selectedCustomer.current_balance || 0) < 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {(selectedCustomer.current_balance || 0) > 0
                          ? 'Udhar (बाकी)'
                          : (selectedCustomer.current_balance || 0) < 0
                          ? 'Advance (जमा)'
                          : 'Settled (₹0)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop Action Buttons Row */}
                <div className="hidden lg:flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEntryModal('CREDIT_SALE')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="Record goods given on credit (Udhar)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ You Gave ₹ (Udhar)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEntryModal('PAYMENT_RECEIVED')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="Record cash or UPI payment received (Jama)"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>↙ You Got ₹ (Jama)</span>
                    </button>

                    {selectedCustomer.phone && (
                      <button
                        type="button"
                        onClick={handleSendWhatsAppReminder}
                        disabled={isSendingReminder}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300/80 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                        title="Send PDF statement & UPI payment link via WhatsApp"
                      >
                        {isSendingReminder ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        ) : (
                          <WhatsAppLogo className="w-3.5 h-3.5" />
                        )}
                        <span>WhatsApp Reminder</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsClearAllModalOpen(true)}
                    className="p-1.5 px-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Wipe transaction statement history"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Wipe History</span>
                  </button>
                </div>
              </div>

              {/* Customer Profile Navigation Tabs: Timeline vs Pending Invoices */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setProfileTab('timeline')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    profileTab === 'timeline'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>📜 Ledger Timeline</span>
                  <span className="text-[10px] text-slate-400 font-mono">({transactions.length})</span>
                </button>

                {(() => {
                  const custSales = allSales.filter(
                    (s) => s.customer_id === selectedCustomer.id || (s.customer_phone && selectedCustomer.phone && s.customer_phone === selectedCustomer.phone)
                  );
                  const pendingCount = custSales.filter(
                    (s) => (s.balance_due && s.balance_due > 0) || s.payment_status === 'unpaid' || s.payment_status === 'partial'
                  ).length;

                  return (
                    <button
                      type="button"
                      onClick={() => setProfileTab('invoices')}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        profileTab === 'invoices'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-slate-700'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5 text-rose-500" />
                      <span>🧾 Pending Bills</span>
                      {pendingCount > 0 ? (
                        <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-mono font-black">
                          {pendingCount}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">({custSales.length})</span>
                      )}
                    </button>
                  );
                })()}
              </div>

              {/* Tab 1 Content: Transactions Timeline */}
              {profileTab === 'timeline' && (
                <CustomerLedgerTimelineTab
                  transactions={transactions}
                  onOpenSaleInvoice={handleOpenSaleInvoice}
                  onEditEntry={(tx) => {
                    setEditingTx(tx);
                    setEditTxAmount((tx.amount / 100).toFixed(2));
                    setEditTxNotes(tx.notes || '');
                    setEditTxType(
                      tx.transaction_type === 'CREDIT_SALE' || tx.transaction_type === 'OPENING_BALANCE'
                        ? 'CREDIT_SALE'
                        : 'PAYMENT_RECEIVED'
                    );
                  }}
                  onDeleteEntry={handleDeleteTx}
                  onOpenEntryModal={handleOpenEntryModal}
                />
              )}

              {/* Tab 2 Content: Pending Invoices / Bill-by-Bill Settlement */}
              {profileTab === 'invoices' && (
                <CustomerPendingInvoicesTab
                  customer={selectedCustomer}
                  business={business}
                  sales={allSales}
                  onOpenInvoiceModal={(sale) => {
                    setViewingSale(sale);
                    setIsInvoiceModalOpen(true);
                  }}
                  onOpenSettleModal={(salesToSettle) => {
                    setSettleModalSales(salesToSettle);
                    setIsSettleModalOpen(true);
                  }}
                  onOpenConsolidatedModal={(salesForConsolidated) => {
                    setConsolidatedModalSales(salesForConsolidated);
                    setIsConsolidatedModalOpen(true);
                  }}
                />
              )}

              {/* STICKY BOTTOM ACTION BAR ON MOBILE FOR ACTIVE CUSTOMER */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 p-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40 flex items-center gap-2 shadow-xl">
                <button
                  type="button"
                  onClick={() => handleOpenEntryModal('CREDIT_SALE')}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ You Gave (उधार)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEntryModal('PAYMENT_RECEIVED')}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>↙ You Got (जमा)</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
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
      <ManualEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        customer={selectedCustomer}
        entryType={entryType}
        entryAmount={entryAmount}
        setEntryAmount={setEntryAmount}
        entryDate={entryDate}
        setEntryDate={setEntryDate}
        entryPaymentMode={entryPaymentMode}
        setEntryPaymentMode={setEntryPaymentMode}
        entryNotes={entryNotes}
        setEntryNotes={setEntryNotes}
        onSubmit={handleSaveEntry}
      />

      {/* ========================================================================= */}
      {/* QUICK ADD CUSTOMER MODAL */}
      {/* ========================================================================= */}
      <QuickAddKhataCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        newCustName={newCustName}
        setNewCustName={setNewCustName}
        newCustPhone={newCustPhone}
        setNewCustPhone={setNewCustPhone}
        newCustAddress={newCustAddress}
        setNewCustAddress={setNewCustAddress}
        newCustOpeningBalance={newCustOpeningBalance}
        setNewCustOpeningBalance={setNewCustOpeningBalance}
        onSubmit={handleCreateCustomer}
        formError={addCustomerError}
      />

      {/* ========================================================================= */}
      {/* EDIT TRANSACTION MODAL */}
      {/* ========================================================================= */}
      <EditLedgerEntryModal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        editingTx={editingTx}
        editTxType={editTxType}
        setEditTxType={setEditTxType}
        editTxAmount={editTxAmount}
        setEditTxAmount={setEditTxAmount}
        editTxNotes={editTxNotes}
        setEditTxNotes={setEditTxNotes}
        onSubmit={handleSaveEditTx}
      />

      {/* ========================================================================= */}
      {/* CLEAR ALL STATEMENT MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-rose-600">
            <Trash2 className="w-5 h-5" />
            <span>Wipe Statement History for {selectedCustomer?.name}?</span>
          </div>
        }
        description="This will permanently delete all recorded ledger transactions for this customer and reset balance to ₹0."
        size="sm"
      >
        <div className="space-y-3 p-1">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Please type <b className="text-rose-600 font-mono">DELETE</b> to confirm:
          </p>
          <input
            type="text"
            placeholder="Type DELETE"
            value={clearConfirmationText}
            onChange={(e) => setClearConfirmationText(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-rose-500"
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsClearAllModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={clearConfirmationText.toUpperCase() !== 'DELETE'}
              onClick={handleClearCustomerKhata}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Wipe Statement History
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* TAX INVOICE BILL VIEWER MODAL */}
      {/* ========================================================================= */}
      {viewingSale && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setViewingSale(null);
          }}
          sale={viewingSale}
          business={business || null}
          initialPhone={viewingSale.customer_phone || ''}
        />
      )}

      {/* ========================================================================= */}
      {/* MULTI-INVOICE SETTLEMENT MODAL */}
      {/* ========================================================================= */}
      {selectedCustomer && (
        <SettleInvoicesModal
          isOpen={isSettleModalOpen}
          onClose={() => {
            setIsSettleModalOpen(false);
            setSettleModalSales([]);
          }}
          selectedSales={settleModalSales}
          customer={selectedCustomer}
          business={business}
          onSuccess={(newBal, count) => {
            showToast(`✅ Successfully settled ${count} bill(s)! New balance: ${formatINR(newBal)}`);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* CONSOLIDATED STATEMENT / MULTI-BILL MODAL */}
      {/* ========================================================================= */}
      {selectedCustomer && (
        <ConsolidatedStatementModal
          isOpen={isConsolidatedModalOpen}
          onClose={() => {
            setIsConsolidatedModalOpen(false);
            setConsolidatedModalSales([]);
          }}
          selectedSales={consolidatedModalSales}
          customer={selectedCustomer}
          business={business}
        />
      )}
    </div>
  );
}

export default function KhataPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-slate-400 text-xs">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-amber-500 mb-2" />
        <span>Loading Customer Khata...</span>
      </div>
    }>
      <KhataContent />
    </Suspense>
  );
}
