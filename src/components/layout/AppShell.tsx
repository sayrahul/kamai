'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ensureStarterBusinessIfEmpty } from '@/lib/db';
import { AuthUser, getStoredUser } from '@/lib/auth';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

// 1. Import local database (Dexie)
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
        const count = await localDb.businesses.count();
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

  // --- BACKGROUND SYNC ENGINE (PUSH + PULL) ---
  useEffect(() => {
    // Only run the sync engine if a user is logged in
    if (!currentUser) return;

    // 1. THE "PUSH" ENGINE (Local -> Cloud)
    const performBackgroundSync = async () => {
      try {
        const pendingProducts = await localDb.products.toArray();
        if (pendingProducts.length > 0) {
          await SyncEngine.pushToCloud('products', pendingProducts);
        }

        const pendingSales = await localDb.sales.toArray();
        if (pendingSales.length > 0) {
          await SyncEngine.pushToCloud('sales', pendingSales);
        }

        const pendingCustomers = await localDb.customers.toArray();
        if (pendingCustomers.length > 0) {
          await SyncEngine.pushToCloud('customers', pendingCustomers);
        }
      } catch (error) {
        console.error("Background push failed:", error);
      }
    };

    // Initialize Network Listeners & Initial Push
    SyncEngine.initializeNetworkListener(performBackgroundSync);
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      performBackgroundSync();
    }

    // 2. THE "PULL" ENGINE (Cloud -> Local Real-Time)
    const unsubscribeProducts = SyncEngine.startRealtimeSync(
      'products',
      async (data): Promise<void> => {
        await localDb.products.put(data);
      },
      async (id): Promise<void> => {
        await localDb.products.delete(id);
      }
    );

    const unsubscribeSales = SyncEngine.startRealtimeSync(
      'sales',
      async (data): Promise<void> => {
        await localDb.sales.put(data);
      },
      async (id): Promise<void> => {
        await localDb.sales.delete(id);
      }
    );

    const unsubscribeCustomers = SyncEngine.startRealtimeSync(
      'customers',
      async (data): Promise<void> => {
        await localDb.customers.put(data);
      },
      async (id): Promise<void> => {
        await localDb.customers.delete(id);
      }
    );

    // 3. CLEANUP
    return () => {
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeSales) unsubscribeSales();
      if (unsubscribeCustomers) unsubscribeCustomers();
    };
  }, [currentUser]);

  if (!isClient) {
    return <main className="min-h-screen bg-[#F8FAFC]" />;
  }

  const isCustomerInvoice = pathname === '/invoice' || (pathname.startsWith('/invoice') && !pathname.startsWith('/invoice-designer'));
  if (isCustomerInvoice) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  if (pathname === '/onboarding' || pathname === '/auth') {
    return <main className="min-h-screen bg-slate-950">{children}</main>;
  }

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