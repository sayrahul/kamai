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
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { href: '/', label: t('nav.dashboard'), icon: Home },
    { href: '/billing', label: t('nav.sell'), icon: Receipt },
    { href: '/transactions', label: 'Transactions', icon: ShieldCheck },
    { href: '/products', label: t('nav.products'), icon: Package },
    { href: '/inventory', label: t('nav.inventory'), icon: Boxes },
    { href: '/khata', label: t('nav.khata'), icon: BookOpen },
    { href: '/customers', label: t('nav.customers'), icon: Users },
    { href: '/purchases', label: t('nav.purchases'), icon: ShoppingBag },
    { href: '/growth', label: t('nav.growth'), icon: TrendingUp },
    { href: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-slate-200 bg-white p-3 h-[calc(100vh-57px)] sticky top-[57px]">
      <div className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold select-none',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Clean Corporate Footer */}
      <div className="pt-3 border-t border-slate-200 flex items-center justify-between px-2 text-xs text-slate-500 font-medium">
        <span>KamaiPlus</span>
        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">v1.2</span>
      </div>
    </aside>
  );
};
