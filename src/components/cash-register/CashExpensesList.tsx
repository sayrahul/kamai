'use client';

import React from 'react';
import { 
  ArrowUpRight, 
  Trash2, 
  Coffee, 
  Truck, 
  Zap, 
  ShoppingBag, 
  FileText 
} from 'lucide-react';
import { CashExpense } from '@/types';
import { Card } from '@/components/ui/Card';
import { formatINR } from '@/lib/utils';

interface CashExpensesListProps {
  expenses: CashExpense[];
  onDeleteExpense: (id: string) => Promise<void>;
}

export const CashExpensesList: React.FC<CashExpensesListProps> = ({
  expenses,
  onDeleteExpense,
}) => {
  const totalExpensePaise = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-rose-600" />
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            Today's Petty Cash Outflows
          </h3>
        </div>
        <span className="text-xs font-mono font-black text-rose-600 dark:text-rose-400">
          Total: -{formatINR(totalExpensePaise)}
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {expenses.map((e) => (
          <div key={e.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                  {e.title || e.category}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                  {e.category}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate font-mono">
                {e.paid_to ? `Paid to: ${e.paid_to} • ` : ''}
                {new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-black font-mono text-rose-600 dark:text-rose-400">
                -{formatINR(e.amount)}
              </span>
              <button
                type="button"
                onClick={() => onDeleteExpense(e.id)}
                className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                title="Delete Expense"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {expenses.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400">
            No petty cash expenses recorded today.
          </div>
        )}
      </div>
    </Card>
  );
};
