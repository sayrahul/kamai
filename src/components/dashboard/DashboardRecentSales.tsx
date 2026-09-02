'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Receipt, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Calendar, 
  Printer, 
  Phone,
  Clock,
  Sparkles
} from 'lucide-react';
import { Sale, Business } from '@/types';
import { formatINR, cn } from '@/lib/utils';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';
import { sendInvoiceViaWhatsApp, sendInvoiceViaOfficialCloudApi } from '@/lib/invoices/whatsappInvoice';

interface DashboardRecentSalesProps {
  sales: Sale[];
  onSelectSaleForInvoice: (sale: Sale) => void;
  business?: Business | null;
}

export const DashboardRecentSales: React.FC<DashboardRecentSalesProps> = ({
  sales,
  onSelectSaleForInvoice,
  business,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'upi' | 'credit'>('all');
  const [sendingWhatsappId, setSendingWhatsappId] = useState<string | null>(null);

  // Filter Sales
  const filteredSales = sales.filter((s) => {
    if (paymentFilter !== 'all' && s.payment_method !== paymentFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchInvoice = s.invoice_number.toLowerCase().includes(q);
      const matchCust = (s.customer_name || '').toLowerCase().includes(q);
      const matchPhone = (s.customer_phone || '').includes(q);
      if (!matchInvoice && !matchCust && !matchPhone) return false;
    }

    if (dateFilter !== 'all') {
      const saleDate = new Date(s.created_at);
      const now = new Date();
      if (dateFilter === 'today') {
        const isToday = saleDate.toDateString() === now.toDateString();
        if (!isToday) return false;
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = saleDate.toDateString() === yesterday.toDateString();
        if (!isYesterday) return false;
      } else if (dateFilter === '7days') {
        const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      }
    }

    return true;
  });

  const displayedSales = filteredSales.slice(0, 10);

  const handleSendWhatsApp = async (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sale.customer_phone) {
      alert('No phone number saved on this bill.');
      return;
    }

    setSendingWhatsappId(sale.id);
    try {
      if (business) {
        sendInvoiceViaWhatsApp(sale.customer_phone, sale, business);
      }
    } catch (err: any) {
      alert(`Failed to send WhatsApp bill: ${err?.message || 'Error'}`);
    } finally {
      setSendingWhatsappId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2.5 cursor-pointer select-none flex-1"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                Recent Transactions
              </h3>
              <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {displayedSales.length} bills
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400">
              {isCollapsed ? 'Click to expand bills stream' : 'Tap any invoice to view, print, or share WhatsApp bill'}
            </p>
          </div>
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <Link href="/transactions">
            <button
              type="button"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <span>Full Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </Link>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition cursor-pointer"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice # or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            {/* Date & Payment Mode Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10.5px] font-bold">
              {[
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: '7 Days' },
              ].map((df) => (
                <button
                  key={df.id}
                  type="button"
                  onClick={() => setDateFilter(df.id as any)}
                  className={cn(
                    "px-2 py-1 rounded-lg transition whitespace-nowrap cursor-pointer",
                    dateFilter === df.id 
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" 
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                  )}
                >
                  {df.label}
                </button>
              ))}

              <span className="text-slate-300 dark:text-slate-700">|</span>

              {[
                { id: 'all', label: 'All Modes' },
                { id: 'cash', label: 'Cash' },
                { id: 'upi', label: 'UPI' },
                { id: 'credit', label: 'Udhar' },
              ].map((pf) => (
                <button
                  key={pf.id}
                  type="button"
                  onClick={() => setPaymentFilter(pf.id as any)}
                  className={cn(
                    "px-2 py-1 rounded-lg transition whitespace-nowrap cursor-pointer",
                    paymentFilter === pf.id 
                      ? "bg-amber-400 text-slate-950 font-black" 
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                  )}
                >
                  {pf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bills List */}
          <div className="space-y-2">
            {displayedSales.map((sale) => {
              const isCredit = sale.payment_method === 'credit' || (sale.balance_due && sale.balance_due > 0);
              const isPaid = sale.payment_status === 'paid' && (!sale.balance_due || sale.balance_due === 0);

              return (
                <div
                  key={sale.id}
                  onClick={() => onSelectSaleForInvoice(sale)}
                  className="p-2.5 sm:p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-mono font-bold text-xs shrink-0 group-hover:bg-amber-100 group-hover:text-amber-900 transition-colors">
                      #{sale.invoice_number.slice(-3)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono truncate">
                          {sale.invoice_number}
                        </span>
                        {sale.customer_name && (
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                            • {sale.customer_name}
                          </span>
                        )}
                        <span className={cn(
                          "px-1.5 py-0.2 rounded text-[9px] font-black uppercase",
                          isCredit
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        )}>
                          {sale.payment_method}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        <span>•</span>
                        <span>{sale.items?.length || 1} items</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Quick Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-slate-100 leading-tight">
                        {formatINR(sale.grand_total)}
                      </div>
                      <div className="text-[9.5px] text-slate-400 font-medium">
                        {isCredit ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">Due: {formatINR(sale.balance_due || 0)}</span>
                        ) : (
                          <span>Paid</span>
                        )}
                      </div>
                    </div>

                    {/* Quick WhatsApp Share Button */}
                    {sale.customer_phone && (
                      <button
                        type="button"
                        onClick={(e) => handleSendWhatsApp(sale, e)}
                        disabled={sendingWhatsappId === sale.id}
                        className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition active:scale-95 cursor-pointer shadow-2xs"
                        title="Send bill on WhatsApp"
                      >
                        <WhatsAppLogo className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Quick Print / View Bill Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSaleForInvoice(sale);
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
                      title="View / Print Tax Invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {displayedSales.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent bills match the selected filter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
