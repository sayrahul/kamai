'use client';

import React from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  ArrowUpRight, 
  CheckCircle2, 
  Calendar 
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
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
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              SaaS Subscription Collections &amp; Invoices
            </h3>
          </div>
          <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
            Total: {formatINR(totalRevenuePaise)}
          </span>
        </div>
      </Card>

      {/* 2. Transactions Table / List */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {transactions.map((t) => (
            <div key={t.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {t.business_name || t.business_id}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                    {t.tier} ({t.billing_cycle})
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                  Payment ID: {t.razorpay_payment_id || t.id}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-black font-mono text-slate-900 dark:text-slate-100">
                  {formatINR(t.amount || 0)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {new Date(t.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="py-10 text-center text-xs text-slate-400">
              No SaaS subscription transactions recorded yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
