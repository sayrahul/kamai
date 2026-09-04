'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR } from '@/lib/utils';
import { Sale, Customer, Product, LedgerTransaction } from '@/types';
import { sendInvoiceViaOfficialCloudApi, sendInvoiceViaWhatsApp } from '@/lib/invoices/whatsappInvoice';
import { generateTallyPrimeXML } from '@/lib/tally/tallyXmlGenerator';
import { getNextUniqueInvoiceNumber, commitNextInvoiceNumber } from '@/lib/invoices/invoiceNumberService';
import { exportTransactionsCSV } from '@/lib/reports/transactionsCsv';
import { 
  Receipt, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';

// Modular Sub-components
import { TransactionHeaderActions } from '@/components/transactions/TransactionHeaderActions';
import { TransactionMetricsRibbon } from '@/components/transactions/TransactionMetricsRibbon';
import { TransactionFilterToolbar } from '@/components/transactions/TransactionFilterToolbar';
import { TransactionBillCard } from '@/components/transactions/TransactionBillCard';
import { TransactionModals } from '@/components/transactions/TransactionModals';
import { useTransactionFilters, DatePreset, PaymentFilter, SortOption } from '@/components/transactions/useTransactionFilters';

export type { DatePreset, PaymentFilter, SortOption };

export default function TransactionsPage() {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const { t } = useTranslation();

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

  // Filter & KPI Logic
  const {
    searchQuery,
    setSearchQuery,
    datePreset,
    setDatePreset,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    paymentFilter,
    setPaymentFilter,
    selectedCustomerId,
    setSelectedCustomerId,
    sortBy,
    setSortBy,
    filteredSales,
    totalRevenuePaise,
    totalCashPaise,
    totalUpiPaise,
    totalCreditPaise,
    clearAllFilters,
  } = useTransactionFilters(allSales);

  // Export Filtered Records to CSV
  const handleExportCSV = () => {
    exportTransactionsCSV(filteredSales);
  };

  // 1-Tap Convert Quotation / Estimate to Official Tax Invoice
  const handleConvertToInvoice = async (sale: Sale) => {
    try {
      const bizId = business?.id || 'biz_default';
      const { invoiceNumber, nextSeq } = await getNextUniqueInvoiceNumber(bizId);
      await commitNextInvoiceNumber(bizId, nextSeq);

      const now = new Date().toISOString();

      // Deduct product inventory stock & record inventory movements
      for (const item of sale.items || []) {
        let prod = await db.products.get(item.product_id);
        if (!prod && item.barcode) {
          prod = await db.products.where('barcode').equals(item.barcode).first();
        }
        if (!prod && item.product_name) {
          prod = await db.products.where('name').equalsIgnoreCase(item.product_name).first();
        }
        if (prod && !prod.is_unlimited_stock) {
          const prevStock = Number(prod.current_stock ?? 0);
          const newStock = Math.max(0, prevStock - item.quantity);
          const updatedProd: Product = {
            ...prod,
            current_stock: newStock,
            updated_at: now,
          };
          await db.products.put(updatedProd);

          await db.inventory_movements.put({
            id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${prod.id}`,
            business_id: bizId,
            product_id: prod.id,
            product_name: prod.name,
            movement_type: 'SALE',
            quantity: item.quantity,
            previous_stock: prevStock,
            new_stock: newStock,
            reference_id: sale.id,
            reason: `Converted Estimate #${sale.invoice_number} to Bill #${invoiceNumber}`,
            created_by: 'owner',
            created_at: now,
          });
        }
      }

      // If credit, adjust customer khata balance & ledger
      if (sale.customer_id && sale.balance_due && sale.balance_due > 0) {
        const cust = await db.customers.get(sale.customer_id);
        if (cust) {
          const prevBal = Number(cust.current_balance || 0);
          const newBal = prevBal + sale.balance_due;
          await db.customers.update(cust.id, {
            current_balance: newBal,
            updated_at: now,
          });
          await db.ledger_transactions.put({
            id: `ledg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            business_id: bizId,
            party_type: 'customer',
            party_id: cust.id,
            party_name: cust.name,
            transaction_type: 'CREDIT_SALE',
            amount: sale.balance_due,
            balance_after: newBal,
            reference_id: sale.id,
            notes: `Converted to Tax Invoice #${invoiceNumber}`,
            created_at: now,
            sync_status: 'synced',
          });
        }
      }

      // Update sale status to completed with official Tax Invoice #
      const updatedSale: Sale = {
        ...sale,
        invoice_number: invoiceNumber,
        status: 'completed',
        updated_at: now,
      };
      await db.sales.put(updatedSale);

      showTxToast(`🎉 Estimate converted to Tax Invoice #${invoiceNumber}! Inventory updated.`, 'success');
      setActiveSaleForInvoice(updatedSale);
      setIsInvoiceModalOpen(true);
    } catch (err) {
      console.error('Failed to convert estimate to invoice:', err);
      showTxToast('Failed to convert estimate to tax invoice.', 'error');
    }
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
                onConvertToInvoice={handleConvertToInvoice}
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

      {/* ---------------- MODALS & FLOATING TOASTS ---------------- */}
      <TransactionModals
        business={business}
        isInvoiceModalOpen={isInvoiceModalOpen}
        setIsInvoiceModalOpen={setIsInvoiceModalOpen}
        activeSaleForInvoice={activeSaleForInvoice}
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        editSale={editSale}
        setEditSale={setEditSale}
        isReturnModalOpen={isReturnModalOpen}
        setIsReturnModalOpen={setIsReturnModalOpen}
        returnSaleId={returnSaleId}
        setReturnSaleId={setReturnSaleId}
        isClearHistoryModalOpen={isClearHistoryModalOpen}
        setIsClearHistoryModalOpen={setIsClearHistoryModalOpen}
        allSalesCount={allSales.length}
        totalRevenuePaise={totalRevenuePaise}
        onConfirmClear={handleClearAllHistory}
        isUpgradeModalOpen={isUpgradeModalOpen}
        setIsUpgradeModalOpen={setIsUpgradeModalOpen}
        txToast={txToast}
      />
    </div>
  );
}
