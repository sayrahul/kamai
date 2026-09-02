'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR } from '@/lib/utils';
import { Sale, Customer } from '@/types';
import { sendInvoiceViaOfficialCloudApi, sendInvoiceViaWhatsApp } from '@/lib/invoices/whatsappInvoice';
import { generateTallyPrimeXML } from '@/lib/tally/tallyXmlGenerator';
import { 
  Receipt, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';
import { SalesReturnModal } from '@/components/sales/SalesReturnModal';
import { EditInvoiceModal } from '@/components/invoices/EditInvoiceModal';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

// Modular Sub-components
import { TransactionHeaderActions } from '@/components/transactions/TransactionHeaderActions';
import { TransactionMetricsRibbon } from '@/components/transactions/TransactionMetricsRibbon';
import { TransactionFilterToolbar } from '@/components/transactions/TransactionFilterToolbar';
import { TransactionBillCard } from '@/components/transactions/TransactionBillCard';
import { ClearHistoryModal } from '@/components/transactions/ClearHistoryModal';

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
  
  // Modals State
  const [activeSaleForInvoice, setActiveSaleForInvoice] = useState<Sale | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnSaleId, setReturnSaleId] = useState<string | undefined>(undefined);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);

  // Queries
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const customers = useLiveQuery(async () => db.customers.toArray()) || [];

  const allSales = useLiveQuery(async () => {
    return await db.sales.orderBy('created_at').reverse().limit(500).toArray();
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

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInv = sale.invoice_number.toLowerCase().includes(q);
        const matchCust = (sale.customer_name && sale.customer_name.toLowerCase().includes(q)) || 
                          (sale.customer_phone && sale.customer_phone.includes(q));
        const matchItems = sale.items && sale.items.some((i) => i.product_name.toLowerCase().includes(q));

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
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // KPI Calculations on filtered subset
  const totalRevenuePaise = filteredSales.reduce((acc, s) => acc + s.grand_total, 0);
  const totalCashPaise = filteredSales.filter((s) => s.payment_method === 'cash').reduce((acc, s) => acc + s.amount_received, 0);
  const totalUpiPaise = filteredSales.filter((s) => s.payment_method === 'upi').reduce((acc, s) => acc + s.amount_received, 0);
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

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kamai_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const [sendingWhatsAppSaleId, setSendingWhatsAppSaleId] = useState<string | null>(null);
  const [txToast, setTxToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const showTxToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setTxToast({ message, type });
    setTimeout(() => setTxToast(null), 4000);
  };

  const handleOpenInvoice = (sale: Sale) => {
    setActiveSaleForInvoice(sale);
    setIsInvoiceModalOpen(true);
  };

  const handleSendWhatsApp = async (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!business) return;
    if (!sale.customer_phone) {
      showTxToast('⚠️ No customer phone number attached to this bill.', 'error');
      return;
    }
    const cleanPhone = sale.customer_phone.replace(/\D/g, '').slice(-10);
    setSendingWhatsAppSaleId(sale.id);
    showTxToast(`📲 Sending WhatsApp bill to +91${cleanPhone}...`, 'info');
    try {
      sendInvoiceViaWhatsApp(sale.customer_phone, sale, business);
      showTxToast(`✅ WhatsApp bill opened for +91${cleanPhone}!`, 'success');
    } catch (err: any) {
      showTxToast(`⚠️ ${err?.message || 'Failed to dispatch WhatsApp bill'}`, 'error');
    } finally {
      setSendingWhatsAppSaleId(null);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setPaymentFilter('all');
    setSelectedCustomerId('all');
    setSortBy('date-desc');
  };

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
    try {
      await db.sales.clear();
      await db.sales_returns.clear();
      if (business) {
        await db.businesses.update(business.id, {
          next_invoice_number: 1,
          updated_at: new Date().toISOString(),
        });
      }
      showTxToast('All transaction history cleared successfully.', 'success');
    } catch (err) {
      console.error('Failed to clear history:', err);
      showTxToast('Failed to clear transaction history.', 'error');
    }
  };

  return (
    <div className="space-y-3.5 pb-20 sm:pb-8 animate-in fade-in duration-150">
      {/* 1. Header & Quick Actions */}
      <TransactionHeaderActions
        isPro={isPro}
        filteredCount={filteredSales.length}
        totalSalesCount={allSales.length}
        onOpenSalesReturn={() => {
          if (!isPro) {
            setIsUpgradeModalOpen(true);
          } else {
            setReturnSaleId(undefined);
            setIsReturnModalOpen(true);
          }
        }}
        onExportCSV={handleExportCSV}
        onExportTallyXML={() => {
          if (!isPro) {
            setIsUpgradeModalOpen(true);
          } else {
            handleExportTallyXML();
          }
        }}
        onOpenClearHistory={() => setIsClearHistoryModalOpen(true)}
      />

      {/* 2. Key Metrics Summary Ribbon */}
      <TransactionMetricsRibbon
        totalRevenuePaise={totalRevenuePaise}
        totalCashPaise={totalCashPaise}
        totalUpiPaise={totalUpiPaise}
        totalCreditPaise={totalCreditPaise}
        salesCount={filteredSales.length}
      />

      {/* 3. Filter & Search Toolbar */}
      <TransactionFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        selectedCustomerId={selectedCustomerId}
        onCustomerChange={setSelectedCustomerId}
        sortBy={sortBy}
        onSortChange={setSortBy}
        customers={customers}
        totalSalesCount={allSales.length}
        filteredCount={filteredSales.length}
        onClearAllFilters={clearAllFilters}
      />

      {/* 4. Transactions List Container */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Transactions ({filteredSales.length})
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Tap any row to view &amp; print tax invoice
          </span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching transactions found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your date range, customer selection, or payment mode filters.
            </p>
            <Button size="sm" variant="outline" onClick={clearAllFilters} className="mt-2 text-xs rounded-xl">
              Reset All Filters
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSales.map((sale) => (
              <TransactionBillCard
                key={sale.id}
                sale={sale}
                isPro={isPro}
                sendingWhatsAppSaleId={sendingWhatsAppSaleId}
                onOpenInvoice={handleOpenInvoice}
                onEditSale={(s) => {
                  setEditSale(s);
                  setIsEditModalOpen(true);
                }}
                onReturnSale={(sId) => {
                  if (!isPro) {
                    setIsUpgradeModalOpen(true);
                  } else {
                    setReturnSaleId(sId);
                    setIsReturnModalOpen(true);
                  }
                }}
                onSendWhatsApp={handleSendWhatsApp}
              />
            ))}
          </div>
        )}
      </Card>

      {/* ---------------- MODALS ---------------- */}
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
      <ClearHistoryModal
        isOpen={isClearHistoryModalOpen}
        onClose={() => setIsClearHistoryModalOpen(false)}
        totalInvoicesCount={allSales.length}
        totalRevenuePaise={totalRevenuePaise}
        onConfirmClear={handleClearAllHistory}
      />

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />

      {/* Floating In-App Toast Notification */}
      {txToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200 ${
          txToast.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/40'
            : txToast.type === 'info'
            ? 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-slate-950/40'
            : 'bg-rose-950/95 border-rose-500/50 text-rose-100 shadow-rose-950/40'
        }`}>
          {txToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {txToast.type === 'info' && <Sparkles className="w-4 h-4 text-sky-400 shrink-0 animate-pulse" />}
          {txToast.type === 'error' && <span className="text-sm shrink-0">⚠️</span>}
          <span>{txToast.message}</span>
        </div>
      )}
    </div>
  );
}
