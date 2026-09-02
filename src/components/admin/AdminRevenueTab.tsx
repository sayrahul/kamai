'use client';

import React from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  ArrowUpRight, 
  CheckCircle2, 
  Calendar,
  IndianRupee,
  ShieldCheck
} from 'lucide-react';
import { TransactionRecord } from '@/app/admin/page';
import { formatINR } from '@/lib/utils';

interface AdminRevenueTabProps {
  transactions: TransactionRecord[];
}

export const AdminRevenueTab: React.FC<AdminRevenueTabProps> = ({
  transactions,
}) => {
  const totalRevenuePaise = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. SaaS Financial Summary Card */}
      <div className="p-4 sm:p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white">
              SaaS Subscription Collections &amp; Invoices
            </h3>
            <p className="text-xs text-slate-400">
              Live log of Razorpay online checkout transactions &amp; license activations.
            </p>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-mono font-black text-emerald-400 self-end sm:self-center">
          Total Collections: {formatINR(totalRevenuePaise)}
        </div>
      </div>

      {/* 2. Transactions Table / List */}
      <div className="p-4 sm:p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl space-y-3.5 text-slate-100">
        <div className="divide-y divide-slate-800">
          {transactions.map((t) => (
            <div key={t.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-white truncate">
                    {t.business_name || t.business_id}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {t.tier} ({t.billing_cycle})
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                  Payment ID: {t.razorpay_payment_id || t.id}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                  {formatINR(t.amount || 0)}
                </div>
                <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                  {new Date(t.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-500">
              No SaaS subscription transactions recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
