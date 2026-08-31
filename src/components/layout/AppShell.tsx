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
import { subscriptionService } from '@/lib/subscription/subscriptionService';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [accountLockout, setAccountLockout] = useState<{ isFrozen: boolean; message: string } | null>(null);

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

  // --- AUTH, SESSION, ROUTE GUARDING & BACKGROUND CLOUD SYNC ---
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

    // Verify session with server API (/api/auth/me) in the background with 30s heartbeat
    const checkServerSession = async () => {
      try {
        const currentStored = getStoredUser();
        const params = new URLSearchParams();
        if (currentStored?.business_id) params.set('business_id', currentStored.business_id);
        if (currentStored?.phone) params.set('phone', currentStored.phone);

        const res = await fetch(`/api/auth/me?${params.toString()}`);
        if (res.status === 403 || res.status === 401) {
          const data = await res.json().catch(() => ({}));
          if (data.isFrozen || data.isDeleted) {
            // Instant data purge from local IndexedDB and localStorage
            try {
              await Promise.all([
                localDb.businesses.clear(),
                localDb.products.clear(),
                localDb.sales.clear(),
                localDb.customers.clear(),
                localDb.categories.clear(),
                localDb.inventory_movements.clear(),
                localDb.suppliers.clear(),
              ]);
              localStorage.clear();
              sessionStorage.clear();
            } catch (purgeErr) {
              console.error('Error purging local database on freeze:', purgeErr);
            }
            setStoredUser(null);
            setCurrentUser(null);
            setAccountLockout({
              isFrozen: Boolean(data.isFrozen),
              message: data.error || (data.isFrozen ? 'Your merchant account has been frozen by the platform administrator.' : 'Your merchant account has been deleted by administrator.'),
            });
            return;
          }
        }

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

            // Instant sync of subscription tier from Cloud DB
            if (data.business?.subscription_tier) {
              subscriptionService.setTierFromCloud(
                data.business.subscription_tier,
                data.business.subscription_valid_until || data.business.subscription_expires_at
              );
            }
          }
        }
      } catch (err) {
        console.warn('Offline or session check bypassed:', err);
      }
    };

    checkServerSession();
    const heartbeatTimer = setInterval(checkServerSession, 30000);
    window.addEventListener('focus', checkServerSession);

    // Ensure DB is open & auto-align cloud business if mismatched on this device
    const initDb = async () => {
      try {
        if (!localDb.isOpen()) {
          await localDb.open();
        }

        const localBiz = await localDb.businesses.toCollection().first();

        // If local storage user is missing business_id but Dexie has a valid store, restore it immediately
        if (localBiz && localBiz.id) {
          const u = getStoredUser();
          if (!u || !u.business_id || u.business_id === 'biz_pending') {
            const restoredUser: AuthUser = {
              uid: localBiz.id,
              id: localBiz.id,
              phone: localBiz.phone,
              name: localBiz.owner_name || 'Store Owner',
              role: 'admin',
              business_id: localBiz.id,
              business_name: localBiz.name,
              shop_name: localBiz.name,
            };
            setStoredUser(restoredUser);
            setCurrentUser(restoredUser);
          }
        }

        // Auto-align cloud store if local DB has a different store/type
        if (cachedUser?.business_id && cachedUser.business_id !== 'biz_pending' && typeof navigator !== 'undefined' && navigator.onLine) {
          if (!localBiz || localBiz.id !== cachedUser.business_id) {
            console.log('🔄 Aligning local device store with Cloud profile:', cachedUser.business_id);
            await restoreFirestoreToLocalDexie(cachedUser.business_id);
          } else if (localBiz?.subscription_tier) {
            subscriptionService.setTierFromCloud(
              localBiz.subscription_tier,
              localBiz.subscription_valid_until
            );
          }
        }
      } catch (err) {
        console.warn('DB init & cloud alignment check:', err);
      }
    };

    initDb();

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('focus', checkServerSession);
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
  if (!currentUser || !currentUser.business_id || currentUser.business_id === 'biz_pending') {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900">
      {/* Account Freeze / Delete Lockout Modal */}
      {accountLockout && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-rose-200 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <span className="text-2xl">🛑</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900">
                {accountLockout.isFrozen ? 'Account Suspended' : 'Account Deactivated'}
              </h2>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {accountLockout.message}
              </p>
            </div>
            <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-100 text-xs text-rose-950 space-y-1">
              <div className="font-bold">Official Platform Support Email:</div>
              <div className="font-mono font-bold text-rose-700 text-sm select-all">info@proventure.in</div>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/auth';
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
            >
              Return to Login
            </button>
          </div>
        </div>
      )}

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