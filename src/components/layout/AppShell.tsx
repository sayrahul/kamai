'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { db, ensureStarterBusinessIfEmpty } from '@/lib/db';
import { AuthUser, getStoredUser } from '@/lib/auth';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setIsClient(true);
    const user = getStoredUser();
    setCurrentUser(user);

    const handleAuthChange = () => {
      setCurrentUser(getStoredUser());
    };

    window.addEventListener('auth_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    // Auth route guarding
    const isCustomerInvoice = pathname === '/invoice' || (pathname.startsWith('/invoice') && !pathname.startsWith('/invoice-designer'));
    const isPublicRoute = pathname === '/auth' || isCustomerInvoice;

    if (!user && !isPublicRoute) {
      router.replace('/auth');
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

    return () => {
      window.removeEventListener('auth_changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [pathname, router]);

  if (!isClient) {
    return <main className="min-h-screen bg-[#F8FAFC]" />;
  }

  // If on public shared customer digital invoice page (e.g. /invoice?d=...), render standalone without merchant shell
  const isCustomerInvoice = pathname === '/invoice' || (pathname.startsWith('/invoice') && !pathname.startsWith('/invoice-designer'));
  if (isCustomerInvoice) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  // If on onboarding or auth page, render clean full-screen wrapper
  if (pathname === '/onboarding' || pathname === '/auth') {
    return <main className="min-h-screen bg-slate-950">{children}</main>;
  }

  // If user is not logged in and on a protected route, show a minimal loading spinner while redirecting to /auth
  if (!currentUser) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </main>
    );
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
