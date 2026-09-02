'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Package, 
  Boxes, 
  ShoppingBag, 
  Barcode, 
  TrendingUp, 
  FileSpreadsheet, 
  Palette, 
  HardDrive,
  Calculator,
  ShieldCheck,
  Tag
} from 'lucide-react';

interface QuickToolsGridProps {
  productsCount: number;
}

export const QuickToolsGrid: React.FC<QuickToolsGridProps> = ({
  productsCount,
}) => {
  const tools = [
    {
      title: 'Products Master',
      subtitle: `${productsCount} SKUs`,
      href: '/products',
      icon: Package,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
    },
    {
      title: 'Inventory & Stock',
      subtitle: 'Batch & Alerts',
      href: '/inventory',
      icon: Boxes,
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800',
    },
    {
      title: 'Purchases & Bills',
      subtitle: 'Supplier Inward',
      href: '/purchases',
      icon: ShoppingBag,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
    },
    {
      title: 'Cash Register',
      subtitle: 'Till & Drawer',
      href: '/cash-register',
      icon: Calculator,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
    },
    {
      title: 'Barcode Studio',
      subtitle: 'Price Stickers',
      href: '/barcode-generator',
      icon: Barcode,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
      isPro: true,
    },
    {
      title: 'WhatsApp Growth',
      subtitle: 'Festival Offers',
      href: '/growth',
      icon: TrendingUp,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
      isPro: true,
    },
    {
      title: 'GST & Accounting',
      subtitle: 'GSTR-1 Reports',
      href: '/gst-reports',
      icon: FileSpreadsheet,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
      isPro: true,
    },
    {
      title: 'Backup & Cloud',
      subtitle: 'Excel & JSON',
      href: '/cloud-backup',
      icon: HardDrive,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800',
      isPro: true,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Shop Management Tools</span>
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.title} href={tool.href} className="group block">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 border ${tool.bg} ${tool.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                      {tool.title}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {tool.subtitle}
                    </div>
                  </div>
                </div>

                {tool.isPro && (
                  <span className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 border border-amber-300/80 dark:border-amber-700 text-amber-900 dark:text-amber-300 text-[8.5px] font-black uppercase shrink-0">
                    PRO
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
