'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Receipt, 
  BookOpen, 
  Boxes, 
  Calculator, 
  Plus, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';

interface QuickActionDockProps {
  onOpenRapidInward: () => void;
  onOpenClosingReport: () => void;
}

export const QuickActionDock: React.FC<QuickActionDockProps> = ({
  onOpenRapidInward,
  onOpenClosingReport,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>⚡ 1-Tap Quick Actions</span>
        </h2>
      </div>

      {/* Main 1-Tap Primary Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* 1. Primary Hero: New Bill (POS) */}
        <Link href="/billing" className="group col-span-2 sm:col-span-1">
          <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-2.5 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer border border-amber-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black truncate leading-tight">
                  + New Bill (POS)
                </div>
                <div className="text-[10.5px] font-bold text-slate-900/80 truncate mt-0.5">
                  Fast Barcode Checkout
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0 text-slate-950 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* 2. Khata Ledger */}
        <Link href="/khata" className="group">
          <div className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-2xs border border-indigo-200/80 dark:border-indigo-900/60 active:scale-[0.98] transition-all cursor-pointer">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                  Digital Khata
                </div>
                <div className="text-[10.5px] font-medium text-slate-400 truncate">
                  Customer Udhar
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* 3. Stock Inward (Carton Scan) */}
        <div 
          onClick={onOpenRapidInward}
          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-2xs border border-blue-200/80 dark:border-blue-900/60 active:scale-[0.98] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Boxes className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate flex items-center gap-1">
                <span>Stock Inward</span>
              </div>
              <div className="text-[10.5px] font-medium text-slate-400 truncate">
                Scan Mal Aavya
              </div>
            </div>
          </div>
        </div>

        {/* 4. Day-End WhatsApp Closing Summary */}
        <div 
          onClick={onOpenClosingReport}
          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-2xs border border-emerald-200/80 dark:border-emerald-900/60 active:scale-[0.98] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform p-1.5">
              <WhatsAppLogo className="w-full h-full" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                Day Summary
              </div>
              <div className="text-[10.5px] font-medium text-slate-400 truncate">
                WhatsApp Z-Report
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
