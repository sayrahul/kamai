'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ensureStarterBusinessIfEmpty, db as localDb } from '@/lib/db';
import { AuthUser, getStoredUser, setStoredUser } from '@/lib/auth';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { GlobalBroadcastBanner } from '@/components/common/GlobalBroadcastBanner';
import { useFirebasePageTracking } from '@/lib/firebase/analytics';
import { initFirebaseAppCheck } from '@/lib/firebase/appCheck';
import { initBackgroundCloudSync } from '@/lib/firebase/backgroundSync';
import { restoreFirestoreToLocalDexie } from '@/lib/firebase/firestoreSync';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Auto Page View Analytics for Platform Owner
  useFirebasePageTracking();

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

  // --- AUTH, SESSION & BACKGROUND CLOUD SYNC LOGIC ---
  useEffect(() => {
    setIsClient(true);
    initFirebaseAppCheck();
    const cachedUser = getStoredUser();
    setCurrentUser(cachedUser);

    // Initialize auto background sync & real-time multi-device cloud stream
    const cleanupSync = initBackgroundCloudSync(cachedUser?.business_id);

    const handleAuthChange = () => {
      const user = getStoredUser();
      setCurrentUser(user);
    };

    window.addEventListener('auth_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    const isCustomerInvoice = pathname === '/invoice' || (pathname.startsWith('/invoice') && !pathname.startsWith('/invoice-designer'));
    const isPublicRoute = pathname === '/admin' || pathname.startsWith('/admin') || pathname === '/auth' || pathname === '/terms-of-service' || pathname === '/privacy-policy' || pathname === '/refund-policy' || pathname === '/contact-us' || isCustomerInvoice;

    // Verify session with server API (/api/auth/me)
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
              role: data.user.role,
              business_id: data.user.business_id,
              business_name: data.business?.name || data.user.business_name || 'My Store',
            };
            setStoredUser(verifiedUser);
            setCurrentUser(verifiedUser);
          } else if (!isPublicRoute && navigator.onLine && !cachedUser) {
            router.replace('/auth');
          }
        }
      } catch (err) {
        console.warn('Offline or session check bypassed:', err);
      }
    };

    checkServerSession();

    // Ensure DB is open & auto-align cloud business if mismatched on this device
    const initDb = async () => {
      try {
        if (!localDb.isOpen()) {
          await localDb.open();
        }
        if (!isPublicRoute && !cachedUser) {
          router.replace('/auth');
          return;
        }

        // Auto-align cloud store if mobile local DB is empty or has a different store/type
        if (cachedUser?.business_id && cachedUser.business_id !== 'biz_pending' && typeof navigator !== 'undefined' && navigator.onLine) {
          const localBiz = await localDb.businesses.toCollection().first();
          if (!localBiz || localBiz.id !== cachedUser.business_id) {
            console.log('🔄 Aligning local device store with Cloud profile:', cachedUser.business_id);
            await restoreFirestoreToLocalDexie(cachedUser.business_id);
          }
        }
      } catch (err) {
        console.warn('DB init & cloud alignment check:', err);
      }
    };

    initDb();

    return () => {
      cleanupSync();
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
  if (!currentUser) {
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