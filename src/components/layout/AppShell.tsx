'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { db, ensureStarterBusinessIfEmpty } from '@/lib/db';
import { getStoredUser, hasSeenIntro } from '@/lib/auth';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
    
    // Auth route guarding
    const user = getStoredUser();
    const isPublicRoute = pathname === '/auth' || pathname.startsWith('/invoice');

    if (!user && !isPublicRoute) {
      router.push('/auth');
      return;
    }

    // If database is completely empty and on dashboard, ensure default starter shop
    const initDb = async () => {
      try {
        const count = await db.businesses.count();
        if (count === 0 && pathname !== '/onboarding' && pathname !== '/auth') {
          await ensureStarterBusinessIfEmpty();
        }
      } catch (err) {
        console.warn('DB init check:', err);
      }
    };

    initDb();
  }, [pathname, router]);

  // If on onboarding or auth page, render full width without sidebar/navbar
  if (pathname === '/onboarding' || pathname === '/auth') {
    return <main className="min-h-screen bg-[#090D16]">{children}</main>;
  }

  // If on public shared invoice page, render standalone without shell
  if (pathname.startsWith('/invoice')) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900">
      <Navbar />
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6 overflow-y-auto max-w-full">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};
