'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR, generateWhatsAppReceiptLink, cn } from '@/lib/utils';
import { Sale, Customer, CartItem, PaymentMethod } from '@/types';
import { sendInvoiceViaWhatsApp } from '@/lib/invoices/whatsappInvoice';
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
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
export type PaymentFilter = 'all' | 'cash' | 'upi' | 'credit';

export default function TransactionsPage() {
  const { t } = useTranslation();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  
  // Active Invoice Modal State
  const [activeSaleForInvoice, setActiveSaleForInvoice] = useState<Sale | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Queries
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const customers = useLiveQuery(async () => db.customers.toArray()) || [];

  const allSales = useLiveQuery(async () => {
    return await db.sales.reverse().toArray();
  }) || [];

  // Filter logic
  const filteredSales = allSales.filter((sale) => {
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
      if (paymentFilter === 'credit' && sale.payment_method !== 'credit' && sale.balance_due <= 0) return false;
    }

    // 3. Customer Filter
    if (selectedCustomerId !== 'all') {
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
      'Balance Due / Udhar (₹)',
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

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-800" />
            <span>Transaction History & Sales Ledger</span>
          </h1>
          <p className="text-xs text-slate-500">
            View, filter, and export all sales invoices, cash entries, UPI payments, and Udhar credit.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            <span>Credit / Udhar</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-amber-900 font-mono mt-0.5">
            {formatINR(totalCreditPaise)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">
            Added to Khata
          </div>
        </Card>
      </div>

      {/* Filter Control Box */}
      <Card className="p-4 bg-white border border-slate-200 space-y-3.5">
        {/* Row 1: Search & Filter Presets */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Box */}
          <div className="flex-1">
            <Input
              placeholder="Search by Invoice # (e.g. INV-001), Customer, or Item name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Payment Type Filter Buttons (Cash vs Credit vs UPI) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {[
              { id: 'all', label: 'All Modes' },
              { id: 'cash', label: 'Cash (नकद)', icon: Banknote },
              { id: 'upi', label: 'UPI / QR', icon: QrCode },
              { id: 'credit', label: 'Credit (उधार)', icon: BookOpen },
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
                  {p.icon && <p.icon className="w-3 h-3" />}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Customer Dropdown */}
          <div className="w-full lg:w-48">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-2 text-xs font-semibold focus:border-slate-900 focus:outline-none min-h-[38px]"
            >
              <option value="all">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Date Range Presets & Custom Pickers */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
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
                    'px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap',
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono"
                />
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 ml-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
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
                      <div className="font-extrabold text-sm font-mono text-slate-900">
                        {formatINR(sale.grand_total)}
                      </div>
                      {sale.balance_due > 0 ? (
                        <div className="text-[10px] font-bold text-amber-700 font-mono">
                          Udhar: {formatINR(sale.balance_due)}
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
    </div>
  );
}
