'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { db, ensureStarterBusinessIfEmpty } from '@/lib/db';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // If database is completely empty and on dashboard, ensure default starter shop
    const initDb = async () => {
      try {
        const count = await db.businesses.count();
        if (count === 0 && pathname !== '/onboarding') {
          await ensureStarterBusinessIfEmpty();
        }
      } catch (err) {
        console.warn('DB init check:', err);
      }
    };

    initDb();
  }, [pathname]);

  // If on onboarding page, render full width without sidebar/navbar
  if (pathname === '/onboarding') {
    return <main className="min-h-screen bg-[#F5F8FE] dark:bg-slate-950">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#F5F8FE] dark:bg-slate-950 flex flex-col selection:bg-paytm-cyan selection:text-slate-900">
      <Navbar />
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 p-3 sm:p-6 pb-24 md:pb-8 overflow-y-auto max-w-full">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};
