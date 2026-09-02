'use client';

import React from 'react';
import { 
  Layers, 
  Building2, 
  ShoppingBag, 
  FileText 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type GstTabType = 'hsn' | 'b2b' | 'b2cs' | 'doc_issue';

interface GstNavTabsProps {
  activeTab: GstTabType;
  onTabChange: (tab: GstTabType) => void;
  hsnCount: number;
  b2bCount: number;
  b2csCount: number;
}

export const GstNavTabs: React.FC<GstNavTabsProps> = ({
  activeTab,
  onTabChange,
  hsnCount,
  b2bCount,
  b2csCount,
}) => {
  const tabs = [
    { id: 'hsn' as GstTabType, label: `HSN Summary (${hsnCount})`, icon: Layers },
    { id: 'b2b' as GstTabType, label: `B2B Invoices (${b2bCount})`, icon: Building2 },
    { id: 'b2cs' as GstTabType, label: `B2C Retail (${b2csCount})`, icon: ShoppingBag },
    { id: 'doc_issue' as GstTabType, label: 'Docs Issued', icon: FileText },
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
