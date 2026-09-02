'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  RefreshCw, 
  LogOut, 
  Store, 
  ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AdminHeaderProps {
  isLoadingData: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  isLoadingData,
  onRefresh,
  onLogout,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              KamaiPlus Master Control
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 text-[9px] font-black uppercase flex items-center gap-1 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Cloud</span>
            </span>
          </div>
          <p className="text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400">
            Platform governance, merchant subscriptions, broadcast campaigns &amp; revenue analytics.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-bold gap-1 rounded-xl border-slate-200 dark:border-slate-700"
          >
            <Store className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Open POS Store</span>
          </Button>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoadingData}
          className="text-xs font-bold gap-1 rounded-xl border-slate-200 dark:border-slate-700 cursor-pointer"
          title="Refresh Remote Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          className="text-xs font-bold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer gap-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit</span>
        </Button>
      </div>
    </div>
  );
};
