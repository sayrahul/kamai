'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { Home, Receipt, LayoutGrid, BookOpen, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileMenuCardsModal } from './MobileMenuCardsModal';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: t('nav.dashboard'), icon: Home },
    { href: '/inventory', label: t('nav.inventory'), icon: Boxes },
    { href: '/billing', label: t('nav.sell'), icon: Receipt, isSellButton: true },
    { href: '/khata', label: t('nav.khata'), icon: BookOpen },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          if (item.isSellButton) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 py-0.5 text-center"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white mb-0.5 shadow-md active:scale-95 transition-transform">
                  <Receipt className="w-5 h-5 text-emerald-400" />
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
              <Icon className={cn('w-4 h-4 mb-0.5', isActive ? 'text-slate-900 font-bold' : 'text-slate-400')} />
              <span className="text-[10px] leading-tight truncate max-w-[64px] font-semibold">{item.label}</span>
            </Link>
          );
        })}

        {/* 5th Button: Open Card Grid Modal */}
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-center select-none text-slate-600 hover:text-slate-900 active:scale-95 transition-transform"
        >
          <div className="w-5 h-5 flex items-center justify-center mb-0.5">
            <LayoutGrid className="w-4 h-4 text-indigo-700" />
          </div>
          <span className="text-[10px] leading-tight truncate max-w-[64px] font-bold text-indigo-900">
            All Apps
          </span>
        </button>
      </nav>

      {/* Mobile Full Card Grid Navigation Modal */}
      <MobileMenuCardsModal isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
};
