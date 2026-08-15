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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 px-2 py-1 flex items-center justify-around shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        if (item.isSellButton) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative -top-5 flex flex-col items-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#002970] to-[#00BAF2] flex items-center justify-center text-white shadow-xl shadow-paytm-cyan/40 transform active:scale-95 transition-transform border-4 border-[#F5F8FE] dark:border-slate-950">
                <Receipt className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-extrabold text-paytm-royal dark:text-paytm-cyan mt-0.5 uppercase tracking-wider">
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
              'flex flex-col items-center justify-center flex-1 py-1 text-center select-none transition-all',
              isActive
                ? 'text-paytm-royal dark:text-paytm-cyan font-bold scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <div className="relative">
              <Icon className={cn('w-5 h-5 mb-0.5', isActive ? 'text-paytm-royal dark:text-paytm-cyan' : 'text-slate-400')} />
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-paytm-cyan" />
              )}
            </div>
            <span className="text-[11px] leading-tight truncate max-w-[64px] font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
