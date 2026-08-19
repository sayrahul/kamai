'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { db, ensureStarterBusinessIfEmpty } from '@/lib/db';
import { AuthUser, getStoredUser } from '@/lib/auth';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

// 1. Import local database
import { db as localDb } from '@/lib/db';

// 2. Import the SyncEngine
import { SyncEngine } from '@/lib/db/syncEngine';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // --- EXISTING AUTH & INIT LOGIC ---
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

  // --- NEW BACKGROUND SYNC ENGINE (PUSH + PULL) ---
  useEffect(() => {
    // Only run the sync engine if a user is logged in
    if (!currentUser) return;

    // 1. THE "PUSH" ENGINE (Local -> Cloud)
    const performBackgroundSync = async () => {
      try {
        console.log("Background sync triggered. Checking for offline data...");

        const pendingProducts = await localDb.products.toArray();
        if (pendingProducts.length > 0) {
          await SyncEngine.pushToCloud('products', pendingProducts);
          console.log(`Synced ${pendingProducts.length} products to the cloud.`);
        }

        // FIXED: Changed 'invoices' to 'sales'
        const pendingSales = await localDb.sales.toArray();
        if (pendingSales.length > 0) {
          await SyncEngine.pushToCloud('sales', pendingSales);
          console.log(`Synced ${pendingSales.length} sales to the cloud.`);
        }

        const pendingCustomers = await localDb.customers.toArray();
        if (pendingCustomers.length > 0) {
          await SyncEngine.pushToCloud('customers', pendingCustomers);
          console.log(`Synced ${pendingCustomers.length} customers to the cloud.`);
        }
      } catch (error) {
        console.error("Background push failed:", error);
      }
    };

    // Initialize Network Listeners & Initial Push
    SyncEngine.initializeNetworkListener(performBackgroundSync);
    if (navigator.onLine) {
      performBackgroundSync();
    }

    // 2. THE "PULL" ENGINE (Cloud -> Local Real-Time)
    // FIXED: Removed the Number() wrapper around IDs since your schema uses string UUIDs
    const unsubscribeProducts = SyncEngine.startRealtimeSync(
      'products',
      async (data) => await localDb.products.put(data),
      async (id) => await localDb.products.delete(id)
    );

    // FIXED: Changed 'invoices' to 'sales'
    const unsubscribeSales = SyncEngine.startRealtimeSync(
      'sales',
      async (data) => await localDb.sales.put(data),
      async (id) => await localDb.sales.delete(id)
    );

    const unsubscribeCustomers = SyncEngine.startRealtimeSync(
      'customers',
      async (data) => await localDb.customers.put(data),
      async (id) => await localDb.customers.delete(id)
    );

    // 3. CLEANUP
    return () => {
      unsubscribeProducts();
      unsubscribeSales();
      unsubscribeCustomers();
    };
  }, [currentUser]);

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
        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6 overflow-y-auto max-w-full">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};