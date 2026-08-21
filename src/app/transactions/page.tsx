'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR, generateWhatsAppReceiptLink, cn } from '@/lib/utils';
import { Sale, Customer, CartItem, PaymentMethod } from '@/types';
import { sendInvoiceViaWhatsApp } from '@/lib/invoices/whatsappInvoice';
import { generateTallyPrimeXML } from '@/lib/tally/tallyXmlGenerator';
import { 
  Receipt, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Banknote, 
  QrCode, 
  BookOpen, 
  Printer, 
  MessageCircle, 
  Download, 
  ArrowUpDown, 
  X,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ChevronRight,
  RotateCcw,
  Edit3,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';
import { SalesReturnModal } from '@/components/sales/SalesReturnModal';
import { EditInvoiceModal } from '@/components/invoices/EditInvoiceModal';
import { useProSubscription, ProFeatureBadge } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { Lock } from 'lucide-react';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
export type PaymentFilter = 'all' | 'cash' | 'upi' | 'credit';
export type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export default function TransactionsPage() {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const { t } = useTranslation();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  
  // Active Invoice & Return Modal State
  const [activeSaleForInvoice, setActiveSaleForInvoice] = useState<Sale | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnSaleId, setReturnSaleId] = useState<string | undefined>(undefined);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);
  const [clearConfirmInput, setClearConfirmInput] = useState('');

  // Queries
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const customers = useLiveQuery(async () => db.customers.toArray()) || [];

  const allSales = useLiveQuery(async () => {
    return await db.sales.reverse().toArray();
  }) || [];

  // Filter logic
  const filteredSales = allSales
    .filter((sale) => {
      const saleDate = new Date(sale.created_at);
      const now = new Date();

      // 1. Date Range Filter
      if (datePreset === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        if (!sale.created_at.startsWith(todayStr)) return false;
      } else if (datePreset === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yestStr = yesterday.toISOString().split('T')[0];
        if (!sale.created_at.startsWith(yestStr)) return false;
      } else if (datePreset === 'week') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        if (saleDate < sevenDaysAgo) return false;
      } else if (datePreset === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        if (saleDate < monthStart) return false;
      } else if (datePreset === 'custom') {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (saleDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (saleDate > end) return false;
        }
      }

      // 2. Transaction Type (Cash vs Credit vs UPI)
      if (paymentFilter !== 'all') {
        if (paymentFilter === 'cash' && sale.payment_method !== 'cash') return false;
        if (paymentFilter === 'upi' && sale.payment_method !== 'upi') return false;
        if (paymentFilter === 'credit' && sale.payment_method !== 'credit' && (sale.balance_due || 0) <= 0) return false;
      }

      // 3. Customer Filter
      if (selectedCustomerId === 'walk-in') {
        if (sale.customer_id) return false;
      } else if (selectedCustomerId !== 'all') {
        if (sale.customer_id !== selectedCustomerId) return false;
      }

      // 4. Search Query (Invoice #, customer name, phone, or item name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInv = sale.invoice_number.toLowerCase().includes(q);
        const matchCust = (sale.customer_name && sale.customer_name.toLowerCase().includes(q)) || 
                          (sale.customer_phone && sale.customer_phone.includes(q));
        const matchItems = sale.items && sale.items.some(i => i.product_name.toLowerCase().includes(q));

        if (!matchInv && !matchCust && !matchItems) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date-asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'amount-desc') {
        return b.grand_total - a.grand_total;
      }
      if (sortBy === 'amount-asc') {
        return a.grand_total - b.grand_total;
      }
      // default: date-desc
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // KPI Calculations on filtered subset
  const totalRevenuePaise = filteredSales.reduce((acc, s) => acc + s.grand_total, 0);
  const totalCashPaise = filteredSales.filter(s => s.payment_method === 'cash').reduce((acc, s) => acc + s.amount_received, 0);
  const totalUpiPaise = filteredSales.filter(s => s.payment_method === 'upi').reduce((acc, s) => acc + s.amount_received, 0);
  const totalCreditPaise = filteredSales.reduce((acc, s) => acc + (s.balance_due || 0), 0);

  // Export Filtered Records to CSV
  const handleExportCSV = () => {
    if (filteredSales.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const headers = [
      'Invoice Number',
      'Date & Time',
      'Customer Name',
      'Customer Phone',
      'Items Count',
      'Payment Method',
      'Grand Total (₹)',
      'Amount Received (₹)',
      'Balance Due / Credit (₹)',
      'Payment Status',
    ];

    const rows = filteredSales.map((s) => [
      s.invoice_number,
      new Date(s.created_at).toLocaleString('en-IN'),
      `"${(s.customer_name || 'Walk-in Customer').replace(/"/g, '""')}"`,
      s.customer_phone || '',
      s.items?.length || 0,
      s.payment_method.toUpperCase(),
      (s.grand_total / 100).toFixed(2),
      (s.amount_received / 100).toFixed(2),
      (s.balance_due / 100).toFixed(2),
      s.payment_status.toUpperCase(),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kamai_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenInvoice = (sale: Sale) => {
    setActiveSaleForInvoice(sale);
    setIsInvoiceModalOpen(true);
  };

  const handleSendWhatsApp = (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!business) return;
    sendInvoiceViaWhatsApp(sale.customer_phone || '', sale, business);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setPaymentFilter('all');
    setSelectedCustomerId('all');
  };

  const hasActiveFilters = searchQuery || datePreset !== 'all' || paymentFilter !== 'all' || selectedCustomerId !== 'all' || startDate || endDate;

  // Export 1-Click Tally Prime XML
  const handleExportTallyXML = () => {
    if (filteredSales.length === 0) {
      alert('No transactions to export.');
      return;
    }
    const { xml, filename } = generateTallyPrimeXML({
      business,
      sales: filteredSales,
      customers,
    });
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Clear All Transaction History
  const handleClearAllHistory = async () => {
    if (clearConfirmInput.toUpperCase() !== 'DELETE') {
      alert("Please type 'DELETE' to confirm.");
      return;
    }

    try {
      await db.sales.clear();
      await db.sales_returns.clear();
      if (business) {
        await db.businesses.update(business.id, {
          next_invoice_number: 1,
          updated_at: new Date().toISOString(),
        });
      }
      setIsClearHistoryModalOpen(false);
      setClearConfirmInput('');
      alert('All transaction history has been cleared successfully.');
    } catch (err) {
      console.error('Failed to clear history:', err);
      alert('Failed to clear transaction history.');
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-800" />
            {t('nav.transactions')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit history, reprint thermal bills, customer khata credit tracking, and 1-click Tally export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!isPro) {
                setIsUpgradeModalOpen(true);
              } else {
                setReturnSaleId(undefined);
                setIsReturnModalOpen(true);
              }
            }}
            className="text-xs font-bold gap-1.5 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
            <span>Sales Return</span>
            {!isPro && <Lock className="w-3 h-3 text-amber-700" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs font-bold gap-1.5"
            disabled={filteredSales.length === 0}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (!isPro) {
                setIsUpgradeModalOpen(true);
              } else {
                handleExportTallyXML();
              }
            }}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs gap-1.5 shadow-2xs cursor-pointer"
            disabled={filteredSales.length === 0}
          >
            <Download className="w-3.5 h-3.5 text-slate-950" />
            <span>Tally Prime XML</span>
            {!isPro && <Lock className="w-3 h-3 text-slate-950" />}
          </Button>

          {allSales.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearHistoryModalOpen(true)}
              className="text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200 gap-1"
              title="Delete / Reset All Transaction History"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear History</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Overview Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filtered Revenue</div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono mt-0.5">
            {formatINR(totalRevenuePaise)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">
            {filteredSales.length} {filteredSales.length === 1 ? 'sale' : 'sales'}
          </div>
        </Card>

        <Card className="p-3.5 bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <Banknote className="w-3 h-3 text-emerald-600" />
            <span>Cash Inflow</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-800 font-mono mt-0.5">
            {formatINR(totalCashPaise)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">
            Paid in Cash
          </div>
        </Card>

        <Card className="p-3.5 bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1">
            <QrCode className="w-3 h-3 text-sky-600" />
            <span>UPI / Online</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-sky-800 font-mono mt-0.5">
            {formatINR(totalUpiPaise)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">
            Digital QR Transfers
          </div>
        </Card>

        <Card className="p-3.5 bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-amber-600" />
            <span>Customer Credit</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-amber-900 font-mono mt-0.5">
            {formatINR(totalCreditPaise)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">
            Added to Ledger
          </div>
        </Card>
      </div>

      {/* Filter Control Box */}
      <Card className="p-4 bg-white border border-slate-200 space-y-3.5 shadow-sm">
        {/* Row 1: Search, Customer Filter & Sorting */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box (6 cols on desktop) */}
          <div className="md:col-span-6">
            <Input
              placeholder="Search by Invoice # (e.g. INV-1001), Customer, phone, or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Customer Dropdown (3 cols on desktop) */}
          <div className="md:col-span-3">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-2 text-xs font-semibold focus:border-slate-900 focus:outline-none min-h-[38px]"
            >
              <option value="all">👥 All Customers ({allSales.length})</option>
              <option value="walk-in">🚶 Walk-in Cash Customers Only</option>
              <optgroup label="Registered Customers">
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} {c.current_balance > 0 ? `• Balance: ${formatINR(c.current_balance)}` : ''}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Sort By Dropdown (3 cols on desktop) */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 min-h-[38px]">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full bg-transparent text-slate-900 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Transaction Type & Date Range Presets */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Payment Mode Selector Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
            {[
              { id: 'all', label: 'All Modes' },
              { id: 'cash', label: 'Cash', icon: Banknote },
              { id: 'credit', label: 'Credit', icon: BookOpen },
              { id: 'upi', label: 'UPI / QR', icon: QrCode },
            ].map((p) => {
              const isSelected = paymentFilter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPaymentFilter(p.id as PaymentFilter)}
                  className={cn(
                    'px-2.5 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1',
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                  )}
                >
                  {p.icon && <p.icon className="w-3.5 h-3.5" />}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Date Range Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Date:</span>
            </span>

            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map((d) => {
              const isSelected = datePreset === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setDatePreset(d.id as DatePreset)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-all',
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Custom Date Pickers when 'custom' preset is selected */}
        {datePreset === 'custom' && (
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex flex-wrap items-center gap-3 text-xs animate-in fade-in">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
              <span>Select Date Range:</span>
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:border-slate-900"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 ml-auto"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}

        {/* Row 4: Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Active Filters:</span>
            </span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-medium">
                <span>Search: &quot;{searchQuery}&quot;</span>
                <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => setSearchQuery('')} />
              </span>
            )}

            {paymentFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-medium">
                <span>Type: {paymentFilter.toUpperCase()}</span>
                <X className="w-3 h-3 cursor-pointer hover:text-rose-300" onClick={() => setPaymentFilter('all')} />
              </span>
            )}

            {selectedCustomerId !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-medium">
                <span>
                  Customer: {selectedCustomerId === 'walk-in' ? 'Walk-in Cash' : customers.find(c => c.id === selectedCustomerId)?.name || 'Selected'}
                </span>
                <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => setSelectedCustomerId('all')} />
              </span>
            )}

            {datePreset !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-medium">
                <span>
                  Date: {datePreset === 'custom' ? `${startDate || 'Start'} to ${endDate || 'End'}` : datePreset.toUpperCase()}
                </span>
                <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => { setDatePreset('all'); setStartDate(''); setEndDate(''); }} />
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 ml-auto"
            >
              <X className="w-3 h-3" />
              <span>Reset All ({filteredSales.length} results)</span>
            </button>
          </div>
        )}
      </Card>

      {/* Transactions List / Table */}
      <Card className="bg-white border border-slate-200 overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Transactions ({filteredSales.length})
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            Tap any row to view & print official tax invoice
          </span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
            <h3 className="text-sm font-bold text-slate-800">No matching transactions found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your date range, customer selection, or payment mode filters.
            </p>
            {hasActiveFilters && (
              <Button size="sm" variant="outline" onClick={clearAllFilters} className="mt-2 text-xs">
                Reset All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {filteredSales.map((sale) => {
              const isCredit = sale.payment_method === 'credit' || sale.balance_due > 0;
              const isUPI = sale.payment_method === 'upi';

              return (
                <div
                  key={sale.id}
                  onClick={() => handleOpenInvoice(sale)}
                  className="p-3.5 hover:bg-slate-50/80 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
                >
                  {/* Left: Invoice & Customer Info */}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold',
                      isCredit
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : isUPI
                        ? 'bg-sky-100 text-sky-900 border border-sky-200'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    )}>
                      {isCredit ? (
                        <BookOpen className="w-4 h-4" />
                      ) : isUPI ? (
                        <QrCode className="w-4 h-4" />
                      ) : (
                        <Banknote className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 font-mono text-xs">
                          {sale.invoice_number}
                        </span>
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                          sale.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          sale.payment_method === 'upi' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                          'bg-amber-100 text-amber-900 border border-amber-300'
                        )}>
                          {sale.payment_method}
                        </span>
                        {sale.status === 'returned' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-300">
                            ↩️ Returned
                          </span>
                        )}
                        {sale.status === 'partial_return' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                            ↩️ Partial Return (-{formatINR(sale.returned_amount || 0)})
                          </span>
                        )}
                      </div>

                      <div className="text-slate-800 font-semibold mt-0.5">
                        {sale.customer_name || 'Walk-in Cash Customer'}
                        {sale.customer_phone && (
                          <span className="text-slate-400 font-mono text-[11px] ml-1.5">
                            ({sale.customer_phone})
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{new Date(sale.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        <span>•</span>
                        <span>{sale.items?.length || 0} {sale.items?.length === 1 ? 'item' : 'items'} ({sale.items?.map(i => i.product_name).slice(0, 2).join(', ')}{sale.items?.length > 2 ? '...' : ''})</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amounts & Quick Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 text-right">
                    <div>
                      <div className={cn(
                        "font-extrabold text-sm font-mono",
                        sale.status === 'returned' ? "line-through text-slate-400" : "text-slate-900"
                      )}>
                        {formatINR(sale.grand_total)}
                      </div>
                      {sale.status === 'returned' ? (
                        <div className="text-[10px] font-bold text-rose-600">
                          Refunded in Full
                        </div>
                      ) : sale.balance_due > 0 ? (
                        <div className="text-[10px] font-bold text-amber-700 font-mono">
                          Due: {formatINR(sale.balance_due)}
                        </div>
                      ) : (
                        <div className="text-[10px] font-semibold text-emerald-700 flex items-center justify-end gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Paid in Full</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditSale(sale);
                          setIsEditModalOpen(true);
                        }}
                        title="Edit Past Invoice & Items"
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-950 text-slate-600"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-700" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isPro) {
                            setIsUpgradeModalOpen(true);
                          } else {
                            setReturnSaleId(sale.id);
                            setIsReturnModalOpen(true);
                          }
                        }}
                        title={!isPro ? "Sales Return (Pro Feature)" : "Process Sales Return / Credit Note"}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:text-amber-700 text-slate-600 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                      </button>

                      <button
                        onClick={(e) => handleSendWhatsApp(sale, e)}
                        title="Send invoice via WhatsApp"
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-600"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      </button>

                      <button
                        onClick={() => handleOpenInvoice(sale)}
                        title="Print / View Tax Invoice"
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        sale={activeSaleForInvoice}
        business={business || null}
      />

      {/* Edit Invoice Modal */}
      <EditInvoiceModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditSale(null);
        }}
        sale={editSale}
      />

      {/* Sales Return Modal */}
      <SalesReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setReturnSaleId(undefined);
        }}
        initialSaleId={returnSaleId}
      />

      {/* Clear All History Confirmation Modal */}
      <Modal
        isOpen={isClearHistoryModalOpen}
        onClose={() => setIsClearHistoryModalOpen(false)}
        title="⚠️ Clear All Transaction History"
        description="This will permanently delete all past invoices, credit sales records, and sales returns. The invoice number counter will be reset to 1."
      >
        <div className="space-y-3">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
            <div className="font-bold">Total Invoices to Delete: {allSales.length}</div>
            <div>Total Revenue: {formatINR(totalRevenuePaise)}</div>
            <div className="text-[11px] text-rose-700">This action cannot be undone. We recommend exporting Tally XML or CSV before wiping.</div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Type <span className="text-rose-600 font-mono font-black">DELETE</span> to confirm:
            </label>
            <Input
              type="text"
              placeholder="DELETE"
              value={clearConfirmInput}
              onChange={(e) => setClearConfirmInput(e.target.value)}
              autoFocus
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsClearHistoryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={clearConfirmInput.toUpperCase() !== 'DELETE'}
              onClick={handleClearAllHistory}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Confirm Wipe History
            </Button>
          </div>
        </div>
      </Modal>

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />
    </div>
  );
}
