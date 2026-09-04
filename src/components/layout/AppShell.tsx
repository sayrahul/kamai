'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ensureStarterBusinessIfEmpty, db as localDb } from '@/lib/db';
import { AuthUser, getStoredUser, setStoredUser } from '@/lib/auth';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { GlobalBroadcastBanner } from '@/components/common/GlobalBroadcastBanner';
import { DailyDigestAutoWatcher } from '@/components/common/DailyDigestAutoWatcher';
import { useFirebasePageTracking } from '@/lib/firebase/analytics';
import { initFirebaseAppCheck } from '@/lib/firebase/appCheck';
import { initBackgroundCloudSync } from '@/lib/firebase/backgroundSync';
import { restoreFirestoreToLocalDexie } from '@/lib/firebase/firestoreSync';
import { subscriptionService } from '@/lib/subscription/subscriptionService';
import { APP_VERSION } from '@/lib/constants/version';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [accountLockout, setAccountLockout] = useState<{ isFrozen: boolean; message: string } | null>(null);
  const [forceUpdateInfo, setForceUpdateInfo] = useState<{
    required: boolean;
    minVersion: string;
    latestVersion: string;
    url: string;
    changelog?: string;
  } | null>(null);
  const [impersonationData, setImpersonationData] = useState<{
    admin_active: boolean;
    merchant_id: string;
    merchant_name: string;
    merchant_phone?: string;
    backup_user?: string | null;
  } | null>(null);

  const handleExitImpersonation = () => {
    try {
      const imp = sessionStorage.getItem('kamai_admin_impersonation');
      if (imp) {
        const parsed = JSON.parse(imp);
        if (parsed.backup_user) {
          localStorage.setItem('kamai_user', parsed.backup_user);
        } else {
          localStorage.removeItem('kamai_user');
        }
      }
      sessionStorage.removeItem('kamai_admin_impersonation');
    } catch {}
    window.location.href = '/admin';
  };

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

  // --- 1. MOUNT SETUP: DB HYDRATION, EVENT LISTENERS & CLOUD HEARTBEAT ---
  useEffect(() => {
    setIsClient(true);
    initFirebaseAppCheck();
    
    const initialUser = getStoredUser();
    setCurrentUser(initialUser);

    try {
      const imp = sessionStorage.getItem('kamai_admin_impersonation');
      if (imp) {
        setImpersonationData(JSON.parse(imp));
      }
    } catch {}

    // Check remote platform version requirements
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((data) => {
        if (data?.config?.forceUpdate && data?.config?.minRequiredVersion) {
          const reqVer = data.config.minRequiredVersion;
          const curParts = APP_VERSION.split('.').map((p: string) => parseInt(p, 10) || 0);
          const reqParts = reqVer.split('.').map((p: string) => parseInt(p, 10) || 0);
          let isLower = false;
          for (let i = 0; i < Math.max(curParts.length, reqParts.length); i++) {
            const cur = curParts[i] || 0;
            const req = reqParts[i] || 0;
            if (cur < req) { isLower = true; break; }
            if (cur > req) { isLower = false; break; }
          }
          if (isLower) {
            setForceUpdateInfo({
              required: true,
              minVersion: reqVer,
              latestVersion: data.config.latestVersion || reqVer,
              url: data.config.updateDownloadUrl || 'https://github.com/sayrahul/kamai/releases',
              changelog: data.config.updateChangelog,
            });
          }
        }
      })
      .catch(() => {});

    const handleAuthChange = () => {
      const u = getStoredUser();
      setCurrentUser(u);
    };

    window.addEventListener('auth_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    const cleanupSync = initBackgroundCloudSync(initialUser?.business_id);

    // Initial DB hydration: restore business and default products from local Dexie
    const initDb = async () => {
      try {
        if (!localDb.isOpen()) {
          await localDb.open();
        }

        const u = getStoredUser();

        // If user is not logged in (e.g. on /auth or just logged out), DO NOT synthesize a user session
        if (!u) {
          return;
        }

        const localBiz = await localDb.businesses.toCollection().first();

        if (localBiz && localBiz.id && localBiz.is_onboarded) {
          const userPhone = (u.phone || '').replace(/\D/g, '').slice(-10);
          const bizPhone = (localBiz.phone || '').replace(/\D/g, '').slice(-10);
          const userEmail = (u.email || '').toLowerCase().trim();
          const bizEmail = (localBiz.email || '').toLowerCase().trim();
          const isOwner = (userPhone && bizPhone && userPhone === bizPhone) ||
                          (userEmail && bizEmail && userEmail === bizEmail) ||
                          (u.business_id && u.business_id === localBiz.id);

          if (isOwner && (!u.business_id || u.business_id === 'biz_pending')) {
            const restoredUser: AuthUser = {
              uid: u.uid || localBiz.id,
              id: u.id || localBiz.id,
              phone: u.phone || localBiz.phone,
              name: u.name || localBiz.owner_name || 'Store Owner',
              role: u.role || 'admin',
              business_id: localBiz.id,
              business_name: localBiz.name,
              shop_name: localBiz.name,
            };
            setStoredUser(restoredUser);
            setCurrentUser(restoredUser);
          } else if (!isOwner && (!u.business_id || u.business_id === 'biz_pending')) {
            // Stale business from an old or different account on this device; clear it so new user is routed to onboarding cleanly
            await localDb.businesses.clear().catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Local DB hydration notice:', err);
      }
    };

    initDb();

    // Verify session with server API (/api/auth/me) in the background with 30s heartbeat
    const checkServerSession = async () => {
      try {
        // If client is already logged out, do not automatically pull old session
        const currentStored = getStoredUser();
        if (!currentStored) return;

        const res = await fetch('/api/auth/me');
        if (res.status === 403 || res.status === 401) {
          const data = await res.json().catch(() => ({}));
          if (data.isFrozen) {
            // SAFE LOCKOUT: Keep local IndexedDB records 100% intact (zero data loss for offline business)
            // Only pause active user session and render the frozen lockout notice
            setStoredUser(null);
            setCurrentUser(null);
            setAccountLockout({
              isFrozen: true,
              message: data.error || 'Your merchant account has been frozen by the platform administrator.',
            });
            return;
          }
        }

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            const activeStored = getStoredUser();
            if (!activeStored) return; // User logged out while fetch was in-flight

            // Only update stored user if cloud found a valid business_id that client didn't have AND identity matches
            if (data.user.business_id && (!activeStored.business_id || activeStored.business_id === 'biz_pending')) {
              const uPhone = (activeStored.phone || '').replace(/\D/g, '').slice(-10);
              const dPhone = (data.user.phone || '').replace(/\D/g, '').slice(-10);
              const uEmail = (activeStored.email || '').toLowerCase().trim();
              const dEmail = (data.user.email || '').toLowerCase().trim();
              const matches = (uPhone && dPhone && uPhone === dPhone) ||
                              (uEmail && dEmail && uEmail === dEmail) ||
                              (activeStored.uid && data.user.id && activeStored.uid === data.user.id);
              if (matches) {
                const updatedUser: AuthUser = {
                  uid: data.user.id || activeStored.uid || data.user.phone,
                  id: data.user.id || activeStored.id || data.user.phone,
                  phone: data.user.phone || activeStored.phone,
                  name: data.user.name || activeStored.name || 'Store Owner',
                  email: activeStored.email || null,
                  photoURL: activeStored.photoURL || null,
                  role: data.user.role || 'admin',
                  business_id: data.user.business_id,
                  business_name: data.business?.name || data.user.business_name || activeStored.business_name || '',
                  shop_name: data.business?.name || data.user.business_name || activeStored.shop_name || '',
                };
                setStoredUser(updatedUser);
                setCurrentUser(updatedUser);
              }
            }

            // Sync subscription tier from Cloud DB
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

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('focus', checkServerSession);
      cleanupSync();
      window.removeEventListener('auth_changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  // --- 2. DETERMINISTIC ROUTE GUARDING ---
  useEffect(() => {
    if (!isClient) return;

    const user = currentUser || getStoredUser();
    
    // Route classifications
    const isCustomerInvoice = pathname === '/invoice' || (pathname.startsWith('/invoice') && !pathname.startsWith('/invoice-designer'));
    const isLegalOrPublic = pathname === '/terms-of-service' || pathname === '/privacy-policy' || pathname === '/refund-policy' || pathname === '/contact-us' || pathname === '/admin' || pathname.startsWith('/admin');
    const isAuthRoute = pathname === '/auth';
    const isOnboardingRoute = pathname === '/onboarding';
    const isPublicRoute = isCustomerInvoice || isLegalOrPublic || isAuthRoute || isOnboardingRoute;

    if (!user) {
      if (!isPublicRoute && pathname !== '/auth') {
        router.replace('/auth');
      }
    } else {
      const hasBusinessId = Boolean(user.business_id && user.business_id !== 'biz_pending');

      if (!hasBusinessId) {
        if (!isOnboardingRoute && !isLegalOrPublic && !isCustomerInvoice && pathname !== '/auth') {
          router.replace('/onboarding');
        }
      } else {
        if (isAuthRoute || isOnboardingRoute) {
          router.replace('/');
        }
      }
    }
  }, [pathname, currentUser, isClient, router]);

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

      {/* App Version Force Update Modal */}
      {forceUpdateInfo && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-amber-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <span className="text-3xl">🚀</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900">
                New Update Available!
              </h2>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                A critical release <strong>v{forceUpdateInfo.latestVersion}</strong> is ready. Please update to continue using POS billing without interruption.
              </p>
            </div>
            {forceUpdateInfo.changelog && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-xs text-amber-950 text-left space-y-1">
                <div className="font-bold text-[11px] uppercase tracking-wider text-amber-800">What's New:</div>
                <div className="font-medium text-slate-700 leading-relaxed text-[11.5px]">{forceUpdateInfo.changelog}</div>
              </div>
            )}
            <a
              href={forceUpdateInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Update Kamai+ App Now &rarr;
            </a>
          </div>
        </div>
      )}

      {/* SuperAdmin Customer Support Impersonation Banner */}
      {impersonationData && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg sticky top-0 z-[9999] border-b border-amber-400">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider shadow-xs shrink-0">
              SuperAdmin Support Mode
            </span>
            <span className="truncate text-xs">
              Inspecting Store: <strong>{impersonationData.merchant_name}</strong> {impersonationData.merchant_phone ? `(+91 ${impersonationData.merchant_phone})` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={handleExitImpersonation}
            className="bg-slate-950 hover:bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-md shrink-0 ml-2"
          >
            <span>Exit to Admin</span>
            <span>&rarr;</span>
          </button>
        </div>
      )}

      <GlobalBroadcastBanner />
      <DailyDigestAutoWatcher />
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