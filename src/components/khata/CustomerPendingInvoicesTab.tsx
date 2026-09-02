'use client';

import React, { useState } from 'react';
import { Sale, Customer, Business } from '@/types';
import { formatINR } from '@/lib/utils';
import { 
  Receipt, 
  CheckSquare, 
  Square, 
  Calendar, 
  ShoppingBag, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  CreditCard,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CustomerPendingInvoicesTabProps {
  customer: Customer;
  business?: Business | null;
  sales: Sale[];
  onOpenInvoiceModal: (sale: Sale) => void;
  onOpenSettleModal: (selectedSales: Sale[]) => void;
  onOpenConsolidatedModal: (selectedSales: Sale[]) => void;
}

export function CustomerPendingInvoicesTab({
  customer,
  business,
  sales,
  onOpenInvoiceModal,
  onOpenSettleModal,
  onOpenConsolidatedModal,
}: CustomerPendingInvoicesTabProps) {
  const [filterMode, setFilterMode] = useState<'pending' | 'all' | 'settled'>('pending');
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);

  // Filter sales for this customer
  const customerSales = sales.filter((s) => s.customer_id === customer.id || (s.customer_phone && customer.phone && s.customer_phone === customer.phone));

  // Categorize sales
  const pendingSales = customerSales.filter((s) => (s.balance_due && s.balance_due > 0) || s.payment_status === 'unpaid' || s.payment_status === 'partial');
  const settledSales = customerSales.filter((s) => (!s.balance_due || s.balance_due === 0) && s.payment_status === 'paid');

  const displayedSales = 
    filterMode === 'pending'
      ? pendingSales
      : filterMode === 'settled'
      ? settledSales
      : customerSales;

  // Selected Sales objects
  const selectedSales = customerSales.filter((s) => selectedSaleIds.includes(s.id));
  const totalSelectedDue = selectedSales.reduce((sum, s) => sum + (s.balance_due || 0), 0);
  const totalSelectedGrandTotal = selectedSales.reduce((sum, s) => sum + (s.grand_total || 0), 0);

  const toggleSelectSale = (saleId: string) => {
    setSelectedSaleIds((prev) =>
      prev.includes(saleId) ? prev.filter((id) => id !== saleId) : [...prev, saleId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSaleIds.length === displayedSales.length) {
      setSelectedSaleIds([]);
    } else {
      setSelectedSaleIds(displayedSales.map((s) => s.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedSaleIds([]);
  };

  return (
    <div className="space-y-4">
      {/* ---------------- Filter & Batch Action Bar ---------------- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setFilterMode('pending');
              setSelectedSaleIds([]);
            }}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'pending'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Bills ({pendingSales.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('all');
              setSelectedSaleIds([]);
            }}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Invoices ({customerSales.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('settled');
              setSelectedSaleIds([]);
            }}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'settled'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Settled ({settledSales.length})</span>
          </button>
        </div>

        {displayedSales.length > 0 && (
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer self-end sm:self-auto"
          >
            {selectedSaleIds.length === displayedSales.length ? (
              <>
                <CheckSquare className="w-4 h-4 text-amber-500" />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <Square className="w-4 h-4 text-slate-400" />
                <span>Select All ({displayedSales.length})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ---------------- Floating Batch Action Strip when >= 1 Selected ---------------- */}
      {selectedSaleIds.length > 0 && (
        <div className="sticky top-2 z-20 bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm shrink-0 border border-amber-500/30">
              {selectedSaleIds.length}
            </div>
            <div>
              <div className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                <span>{selectedSaleIds.length} {selectedSaleIds.length === 1 ? 'Bill' : 'Bills'} Selected</span>
                <span className="text-slate-400">•</span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-emerald-400">
                Total Due: {formatINR(totalSelectedDue)}
                {totalSelectedGrandTotal !== totalSelectedDue && (
                  <span className="text-xs text-slate-400 ml-1.5 font-normal">
                    (of {formatINR(totalSelectedGrandTotal)} total)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenConsolidatedModal(selectedSales)}
              className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 font-bold text-xs py-2 px-3 gap-1.5 cursor-pointer"
              title="Generate single combined bill / statement for selected invoices"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Consolidated Bill 📄</span>
            </Button>

            {totalSelectedDue > 0 && (
              <Button
                size="sm"
                onClick={() => onOpenSettleModal(selectedSales)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3.5 shadow-sm gap-1.5 cursor-pointer active:scale-95"
                title="Collect payment & clear selected invoices"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Settle Selected (जमा करें)</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ---------------- Invoices List ---------------- */}
      <div className="space-y-3">
        {displayedSales.map((sale) => {
          const isSelected = selectedSaleIds.includes(sale.id);
          const isUnpaid = sale.payment_status === 'unpaid' || (sale.balance_due && sale.balance_due >= sale.grand_total);
          const isPartial = sale.payment_status === 'partial' && (sale.balance_due || 0) > 0;
          const isPaid = sale.payment_status === 'paid' || (!sale.balance_due || sale.balance_due === 0);

          const itemsListSummary = sale.items
            ? sale.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')
            : 'No items breakdown';

          return (
            <div
              key={sale.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700 shadow-sm ring-1 ring-amber-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleSelectSale(sale.id)}
                  className="mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                  )}
                </button>

                {/* Main Invoice Card Body */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
                        #{sale.invoice_number}
                      </span>

                      {/* Payment Status Pill */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          isUnpaid
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-200'
                            : isPartial
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200'
                        }`}
                      >
                        {isUnpaid ? 'Unpaid (Udhar)' : isPartial ? 'Partially Paid' : 'Fully Paid'}
                      </span>

                      {sale.payment_method && (
                        <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {sale.payment_method}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(sale.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>{new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-bold text-slate-700 dark:text-slate-200">Items ({sale.items?.length || 0}): </span>
                      <span className="font-mono text-[11.5px]">{itemsListSummary}</span>
                    </div>
                  </div>

                  {/* Amounts & Actions Footer */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none mb-0.5">Bill Total</span>
                        <span className="font-black font-mono text-slate-900 dark:text-slate-100">
                          {formatINR(sale.grand_total)}
                        </span>
                      </div>

                      {sale.amount_received > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none mb-0.5">Paid</span>
                          <span className="font-black font-mono text-emerald-600 dark:text-emerald-400">
                            {formatINR(sale.amount_received)}
                          </span>
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none mb-0.5">Remaining Due</span>
                        <span className={`font-black font-mono ${
                          (sale.balance_due || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                        }`}>
                          {formatINR(sale.balance_due || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenInvoiceModal(sale)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                        title="View and reprint individual bill"
                      >
                        <Receipt className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>View Bill 📄</span>
                      </button>

                      {(sale.balance_due || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => onOpenSettleModal([sale])}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs active:scale-95"
                          title="Settle this specific invoice"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Clear Bill</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {displayedSales.length === 0 && (
          <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              {filterMode === 'pending'
                ? 'No Pending Bills for this Customer'
                : filterMode === 'settled'
                ? 'No Settled Invoices Yet'
                : 'No Invoices Found'}
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {filterMode === 'pending'
                ? 'All credit purchases for this customer are fully paid and settled! 🎉'
                : 'Credit bills created on POS will appear here automatically.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
