'use client';

import React from 'react';
import { 
  Banknote, 
  Plus, 
  Minus, 
  Calculator, 
  FileText, 
  Lock, 
  Unlock 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CashierPrivacyToggleButton } from '@/components/privacy/ProfitMask';

interface CashRegisterHeaderActionsProps {
  isOpen: boolean;
  onOpenExpenseModal: () => void;
  onOpenClosingModal: () => void;
  onOpenOpeningModal: () => void;
  onOpenReportModal: () => void;
}

export const CashRegisterHeaderActions: React.FC<CashRegisterHeaderActionsProps> = ({
  isOpen,
  onOpenExpenseModal,
  onOpenClosingModal,
  onOpenOpeningModal,
  onOpenReportModal,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold shrink-0">
          <Banknote className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Cash Register &amp; Petty Cash Drawer
            </h1>
            <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase flex items-center gap-1 border ${
              isOpen 
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{isOpen ? 'Drawer Open' : 'Drawer Closed'}</span>
            </span>
            <CashierPrivacyToggleButton />
          </div>
          <p className="text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            Track day opening cash, petty expenses, cashier handover &amp; daily Z-report closing
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenReportModal}
          className="text-xs font-bold gap-1 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shadow-2xs"
        >
          <FileText className="w-3.5 h-3.5 text-purple-600" />
          <span className="hidden sm:inline">Day Summary</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenExpenseModal}
          className="text-xs font-bold gap-1 rounded-xl border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 cursor-pointer shadow-2xs"
        >
          <Minus className="w-3.5 h-3.5 text-rose-600" />
          <span>Expense</span>
        </Button>

        {isOpen ? (
          <Button
            size="sm"
            onClick={onOpenClosingModal}
            className="font-black bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 text-xs px-3.5 py-1.5 shadow-2xs cursor-pointer gap-1.5 rounded-xl"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Close Shift</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onOpenOpeningModal}
            className="font-black bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-1.5 shadow-2xs cursor-pointer gap-1.5 rounded-xl"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Open Drawer</span>
          </Button>
        )}
      </div>
    </div>
  );
};
