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
    { id: 'merchants' as AdminTabType, label: `Merchants (${merchantsCount})`, icon: Users },
    { id: 'broadcast' as AdminTabType, label: 'Broadcast Banner', icon: Radio },
    { id: 'coupons' as AdminTabType, label: `Coupons (${couponsCount})`, icon: Tag },
    { id: 'whatsapp' as AdminTabType, label: 'WhatsApp Outreach', icon: WhatsAppLogo },
    { id: 'revenue' as AdminTabType, label: 'Revenue & SaaS', icon: CreditCard },
    { id: 'config' as AdminTabType, label: 'Remote Config', icon: Sliders },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              isActive
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-2xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800"
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
