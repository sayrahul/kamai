'use client';

import React from 'react';
import { 
  Banknote, 
  QrCode, 
  BookOpen, 
  Edit3, 
  RotateCcw, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Loader2,
  Zap
} from 'lucide-react';
import { Sale } from '@/types';
import { formatINR, cn } from '@/lib/utils';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';

interface TransactionBillCardProps {
  sale: Sale;
  isPro: boolean;
  sendingWhatsAppSaleId: string | null;
  onOpenInvoice: (sale: Sale) => void;
  onEditSale: (sale: Sale) => void;
  onReturnSale: (saleId: string) => void;
  onSendWhatsApp: (sale: Sale, e: React.MouseEvent) => void;
  onConvertToInvoice?: (sale: Sale) => void;
}

export const TransactionBillCard: React.FC<TransactionBillCardProps> = ({
  sale,
  isPro,
  sendingWhatsAppSaleId,
  onOpenInvoice,
  onEditSale,
  onReturnSale,
  onSendWhatsApp,
  onConvertToInvoice,
}) => {
  const isCredit = sale.payment_method === 'credit' || (sale.balance_due && sale.balance_due > 0);
  const isUPI = sale.payment_method === 'upi';
  const isReturned = sale.status === 'returned';
  const isEstimate = sale.status === 'draft' || (sale.invoice_number && sale.invoice_number.startsWith('EST-'));

  return (
    <div
      onClick={() => onOpenInvoice(sale)}
      className="p-3 sm:p-3.5 hover:bg-slate-50/90 dark:hover:bg-slate-800/60 active:bg-slate-100/80 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0 group"
    >
      {/* Top Row: Icon + Invoice # + Mode Badge + Customer Name ... Grand Total */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Payment Icon */}
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold',
            isCredit
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
              : isUPI
              ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 border border-sky-200 dark:border-sky-700'
              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700'
          )}>
            {isCredit ? (
              <BookOpen className="w-4 h-4" />
            ) : isUPI ? (
              <QrCode className="w-4 h-4" />
            ) : (
              <Banknote className="w-4 h-4" />
            )}
          </div>

          {/* Invoice # & Customer Name */}
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="font-black text-slate-900 dark:text-slate-100 font-mono text-xs">
              {sale.invoice_number}
            </span>
            {isEstimate ? (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border border-violet-300 dark:border-violet-800 shrink-0">
                📝 Estimate
              </span>
            ) : (
              <span className={cn(
                'px-1.5 py-0.2 rounded text-[9px] font-black uppercase shrink-0',
                sale.payment_method === 'cash' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                sale.payment_method === 'upi' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800' :
                'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
              )}>
                {sale.payment_method}
              </span>
            )}
            {isReturned && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shrink-0">
                ↩ Returned
              </span>
            )}
            <span className="text-slate-700 dark:text-slate-300 font-semibold text-xs truncate">
              • {sale.customer_name || 'Cash Customer'}
            </span>
          </div>
        </div>

        {/* Grand Total */}
        <div className={cn(
          "font-black text-xs sm:text-sm font-mono shrink-0 text-right",
          isReturned ? "line-through text-slate-400" : "text-slate-950 dark:text-slate-100"
        )}>
          {formatINR(sale.grand_total)}
        </div>
      </div>

      {/* Bottom Row: Timestamp + Items (Left) ... Status + Quick Actions (Right) */}
      <div className="flex items-center justify-between gap-2 mt-1.5 pl-10.5 text-[11px]">
        <div className="text-slate-400 flex items-center gap-1.5 truncate min-w-0 flex-1">
          <span className="whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
            {new Date(sale.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span>•</span>
          <span className="truncate">
            {sale.items?.length || 0} {sale.items?.length === 1 ? 'item' : 'items'} ({sale.items?.map(i => i.product_name).slice(0, 2).join(', ')}{sale.items && sale.items.length > 2 ? '...' : ''})
          </span>
        </div>

        {/* Right Status & 4 Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isReturned ? (
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mr-1">Refunded</span>
          ) : isEstimate ? (
            <span className="text-[10px] font-bold text-violet-700 dark:text-violet-400 mr-1">Quotation</span>
          ) : sale.balance_due && sale.balance_due > 0 ? (
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 font-mono mr-1">Due: {formatINR(sale.balance_due)}</span>
          ) : (
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hidden sm:inline-flex items-center gap-0.5 mr-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
              <span>Paid</span>
            </span>
          )}

          {/* 0. Convert to Tax Invoice (Estimates Only) */}
          {isEstimate && onConvertToInvoice && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConvertToInvoice(sale);
              }}
              title="Convert Quotation to Official Tax Invoice"
              className="px-2 py-1 rounded-lg border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/70 hover:bg-violet-100 text-violet-700 dark:text-violet-200 cursor-pointer shadow-2xs transition active:scale-95 text-[10px] font-bold flex items-center gap-1 shrink-0"
            >
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>Convert to Bill</span>
            </button>
          )}

          {/* 1. Edit Invoice */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditSale(sale);
            }}
            title="Edit Invoice"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 cursor-pointer shadow-2xs transition active:scale-95"
          >
            <Edit3 className="w-3 h-3" />
          </button>

          {/* 2. Sales Return */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReturnSale(sale.id);
            }}
            title={!isPro ? "Sales Return (Pro)" : "Sales Return"}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-600 dark:text-slate-300 cursor-pointer shadow-2xs transition active:scale-95"
          >
            <RotateCcw className="w-3 h-3 text-amber-700 dark:text-amber-400" />
          </button>

          {/* 3. WhatsApp Send */}
          <button
            type="button"
            onClick={(e) => onSendWhatsApp(sale, e)}
            disabled={sendingWhatsAppSaleId === sale.id}
            title="Send WhatsApp Invoice"
            className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 cursor-pointer shadow-2xs transition active:scale-95 disabled:opacity-50"
          >
            {sendingWhatsAppSaleId === sale.id ? (
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            ) : (
              <WhatsAppLogo className="w-3.5 h-3.5" />
            )}
          </button>

          {/* 4. Print / View Invoice */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenInvoice(sale);
            }}
            title="Print / View Invoice"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs transition active:scale-95"
          >
            <Printer className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
