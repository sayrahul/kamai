'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  Plus, 
  BookOpen 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatINR } from '@/lib/utils';

interface CustomerHeaderActionsProps {
  totalCustomers: number;
  vipCount: number;
  totalCreditDuePaise: number;
  onOpenAddModal: () => void;
}

export const CustomerHeaderActions: React.FC<CustomerHeaderActionsProps> = ({
  totalCustomers,
  vipCount,
  totalCreditDuePaise,
  onOpenAddModal,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Customer Directory &amp; CRM
            </h1>
            <p className="text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400">
              {totalCustomers} registered customers • {vipCount} VIP members • {formatINR(totalCreditDuePaise)} market dues
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
        <Link href="/khata">
          <Button 
            size="sm"
            variant="outline" 
            className="font-bold border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-xs px-3 py-1.5 shadow-2xs cursor-pointer rounded-xl"
          >
            <BookOpen className="w-3.5 h-3.5 mr-1 text-amber-700 dark:text-amber-400" />
            <span>Khata Ledger</span>
          </Button>
        </Link>
        <Button 
          size="sm"
          onClick={onOpenAddModal} 
          className="font-black bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 text-xs px-3.5 py-1.5 shadow-2xs cursor-pointer gap-1.5 rounded-xl"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Customer</span>
        </Button>
      </div>
    </div>
  );
};
