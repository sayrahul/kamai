'use client';

import React from 'react';
import { LedgerTransaction, Sale } from '@/types';
import { formatINR } from '@/lib/utils';
import { 
  FileText, 
  Receipt, 
  ShoppingBag, 
  Calendar, 
  Edit2, 
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Tag
} from 'lucide-react';

interface CustomerLedgerTimelineTabProps {
  transactions: LedgerTransaction[];
  onOpenSaleInvoice: (referenceId?: string, notes?: string) => void;
  onEditEntry: (tx: LedgerTransaction) => void;
  onDeleteEntry: (txId: string) => void;
  onOpenEntryModal: (type: 'CREDIT_SALE' | 'PAYMENT_RECEIVED') => void;
}

export const CustomerLedgerTimelineTab: React.FC<CustomerLedgerTimelineTabProps> = ({
  transactions,
  onOpenSaleInvoice,
  onEditEntry,
  onDeleteEntry,
  onOpenEntryModal,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 sm:p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-amber-500" />
          <span>Transaction Statement ({transactions.length})</span>
        </h3>
        <span className="text-[10.5px] text-slate-400 font-mono">Latest first</span>
      </div>

      <div className="space-y-2.5">
        {transactions.map((tx) => {
          const isDebit = 
            tx.transaction_type === 'CREDIT_SALE' || 
            tx.transaction_type === 'OPENING_BALANCE' || 
            tx.transaction_type === 'CREDIT_PURCHASE';

          const hasLinkedBill = tx.reference_id || (tx.notes && tx.notes.includes('Invoice #'));

          return (
            <div
              key={tx.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-2xs ${
                isDebit
                  ? 'border-rose-200/80 bg-rose-50/20 hover:border-rose-300 dark:border-rose-900/40 dark:bg-rose-950/10'
                  : 'border-emerald-200/80 bg-emerald-50/20 hover:border-emerald-300 dark:border-emerald-900/40 dark:bg-emerald-950/10'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Left Side: Type Badge, Mode, Bill link & Notes */}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isDebit
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {isDebit ? (
                          <>
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                            <span>You Gave (उधार)</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                            <span>You Got (जमा)</span>
                          </>
                        )}
                      </span>

                      {tx.payment_method && (
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                          {tx.payment_method}
                        </span>
                      )}
                    </div>

                    {/* Amount on Mobile in Top Row */}
                    <div className="sm:hidden text-right">
                      <div
                        className={`text-base font-black font-mono leading-none ${
                          isDebit 
                            ? 'text-rose-600 dark:text-rose-400' 
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isDebit ? `+ ₹${(tx.amount / 100).toFixed(2)}` : `- ₹${(tx.amount / 100).toFixed(2)}`}
                      </div>
                    </div>
                  </div>

                  {hasLinkedBill && (
                    <div>
                      <button
                        type="button"
                        onClick={() => onOpenSaleInvoice(tx.reference_id, tx.notes)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold cursor-pointer transition shadow-2xs active:scale-95"
                        title="Click to view & reprint tax invoice bill"
                      >
                        <Receipt className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>View Original Bill 📄</span>
                      </button>
                    </div>
                  )}

                  {/* Notes & Purchased Items Description */}
                  <div className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                    {tx.notes ? (
                      tx.notes.includes('•') ? (
                        <div className="space-y-1.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>🧾</span>
                            <span>{tx.notes.split('•')[0].trim()}</span>
                          </div>
                          <div className="text-[11.5px] text-slate-700 dark:text-slate-300 bg-white/95 dark:bg-slate-800/90 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-start gap-2 font-sans shadow-2xs">
                            <ShoppingBag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100">Items: </span>
                              <span>{tx.notes.split('•').slice(1).join('•').trim()}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="font-medium bg-white/70 dark:bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800 inline-block">
                          {tx.notes}
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400 font-normal italic text-[11px]">
                        {isDebit ? 'Udhar recorded' : 'Payment received'}
                      </span>
                    )}
                  </div>

                  {/* Date Stamp */}
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 font-medium pt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Right Side: Desktop Amount, Balance After, & Actions */}
                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/80 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <div
                      className={`hidden sm:block text-base sm:text-lg font-black font-mono leading-tight ${
                        isDebit 
                          ? 'text-rose-600 dark:text-rose-400' 
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isDebit ? `+ ₹${(tx.amount / 100).toFixed(2)}` : `- ₹${(tx.amount / 100).toFixed(2)}`}
                    </div>
                    <div className="text-[10.5px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                      Bal: ₹{(tx.balance_after / 100).toFixed(2)}
                    </div>
                  </div>

                  {/* Quick Edit & Delete Actions */}
                  <div className="flex items-center gap-2 mt-0 sm:mt-2">
                    <button
                      type="button"
                      onClick={() => onEditEntry(tx)}
                      className="p-1.5 px-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                      title="Edit this entry"
                    >
                      <Edit2 className="w-3 h-3 text-slate-500" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(tx.id)}
                      className="p-1.5 px-2 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {transactions.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs space-y-2">
            <FileText className="w-9 h-9 mx-auto text-slate-300 dark:text-slate-700" />
            <div className="font-bold text-slate-600 dark:text-slate-300">No transactions recorded yet</div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Add a new transaction using the <span className="font-bold text-rose-600">You Gave</span> or <span className="font-bold text-emerald-600">You Got</span> buttons.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenEntryModal('CREDIT_SALE')}
                className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold cursor-pointer"
              >
                + You Gave ₹ (Udhar)
              </button>
              <button
                type="button"
                onClick={() => onOpenEntryModal('PAYMENT_RECEIVED')}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold cursor-pointer"
              >
                ↙ You Got ₹ (Jama)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
