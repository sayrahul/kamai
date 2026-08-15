'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { Home, Receipt, Package, BookOpen, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { href: '/', label: t('nav.dashboard'), icon: Home },
    { href: '/products', label: t('nav.products'), icon: Package },
    { href: '/billing', label: t('nav.sell'), icon: Receipt, isSellButton: true },
    { href: '/khata', label: t('nav.khata'), icon: BookOpen },
    { href: '/customers', label: t('nav.customers'), icon: Users },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        if (item.isSellButton) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 py-1 text-center"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white mb-0.5">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-900">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-1 text-center select-none',
              isActive
                ? 'text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Icon className={cn('w-4 h-4 mb-1', isActive ? 'text-slate-900' : 'text-slate-400')} />
            <span className="text-[10px] leading-tight truncate max-w-[64px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
