'use client';

import React from 'react';
import { 
  BarChart3, 
  Users, 
  Radio, 
  Tag, 
  Send, 
  CreditCard, 
  Sliders 
} from 'lucide-react';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';
import { cn } from '@/lib/utils';

export type AdminTabType = 'overview' | 'merchants' | 'broadcast' | 'coupons' | 'whatsapp' | 'revenue' | 'config';

interface AdminNavTabsProps {
  activeTab: AdminTabType;
  onTabChange: (tab: AdminTabType) => void;
  merchantsCount: number;
  couponsCount: number;
}

export const AdminNavTabs: React.FC<AdminNavTabsProps> = ({
  activeTab,
  onTabChange,
  merchantsCount,
  couponsCount,
}) => {
  const tabs = [
    { id: 'overview' as AdminTabType, label: 'Overview', icon: BarChart3 },
    { id: 'merchants' as AdminTabType, label: 'Merchants', count: merchantsCount, icon: Users },
    { id: 'broadcast' as AdminTabType, label: 'Broadcast Banner', icon: Radio },
    { id: 'coupons' as AdminTabType, label: 'Coupons', count: couponsCount, icon: Tag },
    { id: 'whatsapp' as AdminTabType, label: 'WhatsApp Outreach', icon: WhatsAppLogo },
    { id: 'revenue' as AdminTabType, label: 'Revenue & SaaS', icon: CreditCard },
    { id: 'config' as AdminTabType, label: 'Remote Config', icon: Sliders },
  ];

  return (
    <div className="bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0",
              isActive
                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                : "text-slate-400 hover:text-white hover:bg-slate-800/80 font-bold"
            )}
          >
            <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-slate-950" : "text-slate-400")} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black",
                isActive ? "bg-slate-950 text-amber-400" : "bg-slate-800 text-slate-300"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
