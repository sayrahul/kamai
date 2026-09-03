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
    <div className="bg-slate-900/90 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between gap-3">
      {/* Brand & Status */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg shadow-amber-500/20">
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-lg md:text-xl font-black text-white tracking-tight truncate">
              KamaiPlus Admin
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] sm:text-[10px] font-black uppercase flex items-center gap-1 border border-emerald-500/30 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden xs:inline">Live</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
            Platform governance, merchant SaaS subscriptions, broadcast campaigns &amp; revenue analytics.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-bold gap-1.5 rounded-xl border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white px-2.5 sm:px-3"
            title="Open POS Store"
          >
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">POS Store</span>
          </Button>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoadingData}
          className="text-xs font-bold gap-1.5 rounded-xl border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer px-2.5 sm:px-3"
          title="Refresh Remote Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin text-amber-400' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          className="text-xs font-bold text-rose-400 border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/50 hover:text-rose-200 rounded-xl cursor-pointer gap-1.5 px-2.5 sm:px-3"
          title="Sign out of SuperAdmin"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Exit</span>
        </Button>
      </div>
    </div>
  );
};
