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

  const isHomeActive = pathname === '/';
  const isInventoryActive = pathname.startsWith('/inventory') || pathname.startsWith('/products');
  const isBillingActive = pathname.startsWith('/billing') || pathname.startsWith('/invoice');
  const isKhataActive = pathname.startsWith('/khata') || pathname.startsWith('/customers');

  return (
    <>
      <div className="md:hidden fixed bottom-3 left-4 right-4 z-40 max-w-md mx-auto pointer-events-none">
        <div className="relative pointer-events-auto filter drop-shadow-[0_8px_24px_rgba(15,23,42,0.14)]">
          {/* ─── SVG Notched Floating Background ─── */}
          <svg
            className="w-full h-[64px] block overflow-visible"
            viewBox="0 0 380 64"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M 0 32 C 0 14.327 14.327 0 32 0 L 148 0 C 160 0 165 30 190 30 C 215 30 220 0 232 0 L 348 0 C 365.673 0 380 14.327 380 32 C 380 49.673 365.673 64 348 64 L 32 64 C 14.327 64 0 49.673 0 32 Z"
              fill="#FFFFFF"
              stroke="#E2E8F0"
              strokeWidth="1.5"
            />
          </svg>

          {/* ─── Center Elevated Floating Button (Billing POS) ─── */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center">
            <Link
              href="/billing"
              className={cn(
                'w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center border-4 border-white shadow-lg transition-all active:scale-95',
                isBillingActive
                  ? 'bg-emerald-600 shadow-emerald-600/50 ring-2 ring-emerald-500'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              )}
              title={t('nav.sell')}
              aria-label={t('nav.sell')}
            >
              <Receipt className="w-6 h-6 text-white stroke-[2.2]" />
            </Link>
            {/* Center Active Dot */}
            {isBillingActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 block" />
            )}
          </div>

          {/* ─── Navigation Action Icons Container ─── */}
          <div className="absolute inset-0 flex items-center justify-between px-3 sm:px-5">
            {/* Left Group (Home & Inventory) */}
            <div className="flex items-center justify-around w-[38%]">
              {/* 1. Dashboard / Home */}
              <Link
                href="/"
                className="flex flex-col items-center justify-center p-2 text-center group cursor-pointer"
                title={t('nav.dashboard')}
                aria-label={t('nav.dashboard')}
              >
                <Home
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isHomeActive ? 'text-emerald-600 stroke-[2.5]' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1 transition-opacity',
                    isHomeActive ? 'bg-emerald-600 opacity-100' : 'opacity-0'
                  )}
                />
              </Link>

              {/* 2. Inventory / Stock */}
              <Link
                href="/inventory"
                className="flex flex-col items-center justify-center p-2 text-center group cursor-pointer"
                title={t('nav.inventory')}
                aria-label={t('nav.inventory')}
              >
                <Boxes
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isInventoryActive ? 'text-emerald-600 stroke-[2.5]' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1 transition-opacity',
                    isInventoryActive ? 'bg-emerald-600 opacity-100' : 'opacity-0'
                  )}
                />
              </Link>
            </div>

            {/* Middle Spacer for Center Floating Notch */}
            <div className="w-[20%]" />

            {/* Right Group (Khata & All Apps Modal) */}
            <div className="flex items-center justify-around w-[38%]">
              {/* 3. Khata (Customer Ledger) */}
              <Link
                href="/khata"
                className="flex flex-col items-center justify-center p-2 text-center group cursor-pointer"
                title={t('nav.khata')}
                aria-label={t('nav.khata')}
              >
                <BookOpen
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isKhataActive ? 'text-emerald-600 stroke-[2.5]' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1 transition-opacity',
                    isKhataActive ? 'bg-emerald-600 opacity-100' : 'opacity-0'
                  )}
                />
              </Link>

              {/* 4. All Apps / Tools (Opens Card Grid Modal) */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="flex flex-col items-center justify-center p-2 text-center group cursor-pointer"
                title="All Apps & Tools"
                aria-label="All Apps & Tools"
              >
                <LayoutGrid
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isMenuOpen ? 'text-emerald-600 stroke-[2.5]' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1 transition-opacity',
                    isMenuOpen ? 'bg-emerald-600 opacity-100' : 'opacity-0'
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Full Card Grid Navigation Modal */}
      <MobileMenuCardsModal isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
};

