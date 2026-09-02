'use client';

import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  History, 
  Layers 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type InventoryTabType = 'reorder' | 'expiry' | 'movements';

interface InventoryNavTabsProps {
  activeTab: InventoryTabType;
  onTabChange: (tab: InventoryTabType) => void;
  lowStockCount: number;
  nearExpiryCount: number;
}

export const InventoryNavTabs: React.FC<InventoryNavTabsProps> = ({
  activeTab,
  onTabChange,
  lowStockCount,
  nearExpiryCount,
}) => {
  const tabs = [
    {
      id: 'reorder' as InventoryTabType,
      label: `Reorder Radar (${lowStockCount})`,
      icon: AlertTriangle,
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'expiry' as InventoryTabType,
      label: `Near Expiry (${nearExpiryCount})`,
      icon: Clock,
      badge: nearExpiryCount > 0 ? nearExpiryCount : null,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    {
      id: 'movements' as InventoryTabType,
      label: 'Stock Audit Trail',
      icon: History,
      badge: null,
      badgeColor: '',
    },
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
