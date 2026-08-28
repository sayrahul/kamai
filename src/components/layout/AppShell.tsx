'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ensureStarterBusinessIfEmpty, db as localDb } from '@/lib/db';
import { AuthUser, getStoredUser, setStoredUser } from '@/lib/auth';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { GlobalBroadcastBanner } from '@/components/common/GlobalBroadcastBanner';
import { subscriptionService } from '@/lib/subscription/subscriptionService';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // --- PERSISTENT STORAGE & OFFLINE RESILIENCY ---
  useEffect(() => {
    const requestPersistentStorage = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
          const isPersisted = await navigator.storage.persist();
          if (isPersisted) {
            console.log('✅ IndexedDB persistent storage granted (OS will not evict local DB).');
          } else {
            console.log('ℹ️ Persistent storage not granted; standard IndexedDB storage active.');
          }

          if (navigator.storage.estimate) {
            const { usage, quota } = await navigator.storage.estimate();
            console.log(`💾 Storage quota: ${(usage! / (1024 * 1024)).toFixed(1)}MB used of ${(quota! / (1024 * 1024)).toFixed(1)}MB`);
          }
        }
      } catch (err) {
        console.warn('Storage persist check notice:', err);
      }
    };

    requestPersistentStorage();
  }, []);

  // --- AUTH, SESSION, ROUTE GUARDING & LOCAL DATABASE INITIALIZATION ---
  useEffect(() => {
    setIsClient(true);
    const cachedUser = getStoredUser();
    setCurrentUser(cachedUser);

    const handleAuthChange = () => {
      const user = getStoredUser();
      setCurrentUser(user);
    };

    window.addEventListener('auth_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    // Route classifications
    const isCustomerInvoice = pathname === '/invoice' || (pathname.startsWith('/invoice') && !pathname.startsWith('/invoice-designer'));
    const isLegalOrPublic = pathname === '/terms-of-service' || pathname === '/privacy-policy' || pathname === '/refund-policy' || pathname === '/contact-us' || pathname === '/admin' || pathname.startsWith('/admin');
    const isAuthRoute = pathname === '/auth';
    const isOnboardingRoute = pathname === '/onboarding';
    const isPublicRoute = isCustomerInvoice || isLegalOrPublic || isAuthRoute || isOnboardingRoute;

    // --- SMART ROUTE GUARDING TO PREVENT REDIRECT LOOPS ---
    if (!cachedUser) {
      // 1. If not authenticated and not on a public route, redirect to /auth
      if (!isPublicRoute && pathname !== '/auth') {
        router.replace('/auth');
        return;
      }
    } else {
      const hasBusinessId = Boolean(cachedUser.business_id && cachedUser.business_id !== 'biz_pending');

      if (!hasBusinessId) {
        // 2. If authenticated but lacks business_id (onboarding incomplete), redirect dashboard routes to /onboarding
        if (!isOnboardingRoute && !isLegalOrPublic && !isCustomerInvoice && pathname !== '/auth') {
          router.replace('/onboarding');
          return;
        }
      } else {
        // 3. If authenticated with complete business_id and visits /auth or /onboarding, redirect to /
        if (isAuthRoute || isOnboardingRoute) {
          router.replace('/');
          return;
        }
      }
    }

    // Verify session with server API (/api/auth/me) in the background if online
    const checkServerSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            const verifiedUser: AuthUser = {
              uid: data.user.id,
              id: data.user.id,
              phone: data.user.phone,
              name: data.user.name,
              role: data.user.role || 'admin',
              business_id: data.user.business_id,
              business_name: data.business?.name || data.user.business_name || 'My Store',
              shop_name: data.business?.name || data.user.business_name || 'My Store',
            };
            setStoredUser(verifiedUser);
            setCurrentUser(verifiedUser);

            if (data.business?.subscription_tier) {
              subscriptionService.setTierFromCloud(
                data.business.subscription_tier,
                data.business.subscription_valid_until || data.business.subscription_expires_at
              );
            }
          }
        }
      } catch (err) {
        console.warn('Offline session check notice:', err);
      }
    };

    checkServerSession();

    // Ensure Dexie database is open and local business is initialized
    const initDb = async () => {
      try {
        if (!localDb.isOpen()) {
          await localDb.open();
        }

        const localBiz = await localDb.businesses.toCollection().first();
        if (!localBiz && (!cachedUser || !cachedUser.business_id)) {
          await ensureStarterBusinessIfEmpty();
        }
      } catch (err) {
        console.warn('Local Dexie DB init notice:', err);
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

  // Standalone layout for public customer digital invoice links
  const isCustomerInvoice = pathname === '/invoice' || (pathname.startsWith('/invoice') && !pathname.startsWith('/invoice-designer'));
  if (isCustomerInvoice) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  // Standalone full-screen layout for admin, onboarding, auth, and legal policy pages
  if (pathname === '/admin' || pathname.startsWith('/admin') || pathname === '/onboarding' || pathname === '/auth' || pathname === '/terms-of-service' || pathname === '/privacy-policy' || pathname === '/refund-policy' || pathname === '/contact-us') {
    return <main className="min-h-screen bg-slate-950">{children}</main>;
  }

  // Protected routes check
  if (!currentUser || !currentUser.business_id || currentUser.business_id === 'biz_pending') {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900">
      <GlobalBroadcastBanner />
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

export default AppShell;