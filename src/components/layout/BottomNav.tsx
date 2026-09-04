'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { Home, Receipt, LayoutGrid, BookOpen, Boxes, UtensilsCrossed, Pill, Shirt, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileMenuCardsModal } from './MobileMenuCardsModal';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const business = useLiveQuery(() => db.businesses.toCollection().first());
  const storeType = business?.business_type;

  const isRestaurant = storeType === 'restaurant' || storeType === 'bakery';
  const isPharmacy = storeType === 'pharmacy';
  const isClothing = storeType === 'clothing';
  const isHardware = storeType === 'hardware' || storeType === 'electrical' || storeType === 'electronics' || storeType === 'mobile';

  let productLabel = 'Product';
  let ProductIcon = Boxes;

  if (isRestaurant) {
    productLabel = 'Menu';
    ProductIcon = UtensilsCrossed;
  } else if (isPharmacy) {
    productLabel = 'Medicines';
    ProductIcon = Pill;
  } else if (isClothing) {
    productLabel = 'Garments';
    ProductIcon = Shirt;
  } else if (isHardware) {
    productLabel = 'Items';
    ProductIcon = Wrench;
  }

  const isHomeActive = pathname === '/';
  const isProductActive = pathname.startsWith('/products') || pathname.startsWith('/inventory');
  const isBillingActive = pathname.startsWith('/billing') || pathname.startsWith('/invoice');
  const isKhataActive = pathname.startsWith('/khata') || pathname.startsWith('/customers');

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe">
        <div className="grid grid-cols-5 items-center justify-around h-16 max-w-lg mx-auto px-1">
          {/* 1. Home */}
          <Link
            href="/"
            className={cn(
              'flex flex-col items-center justify-center py-1 group transition-all text-center',
              isHomeActive
                ? 'text-emerald-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            )}
          >
            <Home className={cn('w-5 h-5 transition-transform', isHomeActive ? 'scale-110 stroke-[2.4]' : '')} />
            <span className="text-[10.5px] tracking-tight mt-1 truncate w-full">Home</span>
            {isHomeActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />}
          </Link>

          {/* 2. Product / Menu */}
          <Link
            href="/products"
            className={cn(
              'flex flex-col items-center justify-center py-1 group transition-all text-center',
              isProductActive
                ? 'text-emerald-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            )}
          >
            <ProductIcon className={cn('w-5 h-5 transition-transform', isProductActive ? 'scale-110 stroke-[2.4]' : '')} />
            <span className="text-[10.5px] tracking-tight mt-1 truncate w-full">{productLabel}</span>
            {isProductActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />}
          </Link>

          {/* 3. Billing POS (Elevated Highlight) */}
          <Link
            href="/billing"
            className="flex flex-col items-center justify-center relative -top-3 group transition-all"
          >
            <div
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 border-2 border-white dark:border-slate-900',
                isBillingActive
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/25 shadow-emerald-600/40'
                  : 'bg-emerald-700 text-white shadow-emerald-800/30 group-hover:bg-emerald-800'
              )}
            >
              <Receipt className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span
              className={cn(
                'text-[10px] tracking-tight mt-1 truncate font-bold',
                isBillingActive ? 'text-emerald-700' : 'text-slate-600'
              )}
            >
              Billing POS
            </span>
          </Link>

          {/* 4. Khata Ledger */}
          <Link
            href="/khata"
            className={cn(
              'flex flex-col items-center justify-center py-1 group transition-all text-center',
              isKhataActive
                ? 'text-emerald-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            )}
          >
            <BookOpen className={cn('w-5 h-5 transition-transform', isKhataActive ? 'scale-110 stroke-[2.4]' : '')} />
            <span className="text-[10.5px] tracking-tight mt-1 truncate w-full">Khata Ledger</span>
            {isKhataActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />}
          </Link>

          {/* 5. Menu */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center py-1 group transition-all text-center cursor-pointer',
              isMenuOpen
                ? 'text-emerald-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            )}
          >
            <LayoutGrid className={cn('w-5 h-5 transition-transform', isMenuOpen ? 'scale-110 stroke-[2.4]' : '')} />
            <span className="text-[10.5px] tracking-tight mt-1 truncate w-full">Menu</span>
            {isMenuOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Full Card Grid Navigation Modal */}
      <MobileMenuCardsModal isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
};

