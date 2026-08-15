'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { 
  Home, 
  Receipt, 
  Package, 
  Boxes, 
  BookOpen, 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  Settings,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { href: '/', label: t('nav.dashboard'), icon: Home, highlight: false },
    { href: '/billing', label: t('nav.sell'), icon: Receipt, highlight: true },
    { href: '/products', label: t('nav.products'), icon: Package, highlight: false },
    { href: '/inventory', label: t('nav.inventory'), icon: Boxes, highlight: false },
    { href: '/khata', label: t('nav.khata'), icon: BookOpen, highlight: false },
    { href: '/customers', label: t('nav.customers'), icon: Users, highlight: false },
    { href: '/purchases', label: t('nav.purchases'), icon: ShoppingBag, highlight: false },
    { href: '/growth', label: t('nav.growth'), icon: TrendingUp, highlight: false },
    { href: '/settings', label: t('nav.settings'), icon: Settings, highlight: false },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 h-[calc(100vh-61px)] sticky top-[61px]">
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all select-none',
                isActive
                  ? 'bg-vyapar-500 text-white shadow-md shadow-vyapar-500/25'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white',
                item.highlight && !isActive && 'border border-vyapar-200 dark:border-vyapar-900/50 bg-vyapar-50/50 dark:bg-vyapar-950/20 text-vyapar-600 dark:text-vyapar-400 font-bold'
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-white' : item.highlight ? 'text-vyapar-500' : 'text-slate-500 dark:text-slate-400')} />
              <span>{item.label}</span>
              {item.highlight && !isActive && (
                <span className="ml-auto flex h-2 w-2 rounded-full bg-vyapar-500" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Offline Badge Footer */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Local-First PWA</span>
        </div>
        <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">v1.0</span>
      </div>
    </aside>
  );
};
