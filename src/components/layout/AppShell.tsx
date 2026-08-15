'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const business = useLiveQuery(async () => {
    try {
      return await db.businesses.toCollection().first();
    } catch (e) {
      return null;
    }
  }, []);

  useEffect(() => {
    setMounted(true);

    // If on onboarding already, don't redirect
    if (pathname === '/onboarding') return;

    const checkOnboarding = async () => {
      try {
        const count = await db.businesses.count();
        if (count === 0) {
          router.replace('/onboarding');
        }
      } catch (err) {
        console.warn('Dexie DB check error:', err);
      }
    };

    checkOnboarding();
  }, [pathname, router]);

  // If on onboarding page, render full width without sidebar/navbar
  if (pathname === '/onboarding') {
    return <main className="min-h-screen bg-slate-50 dark:bg-slate-950">{children}</main>;
  }

  // Prevent SSR hydration mismatch before mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-vyapar-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Loading KamaiPlus (Kamai+)...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col selection:bg-vyapar-500 selection:text-white">
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
