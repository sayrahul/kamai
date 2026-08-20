'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ensureStarterBusinessIfEmpty, db as localDb } from '@/lib/db';
import { AuthUser, getStoredUser, setStoredUser } from '@/lib/auth';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // --- AUTH & SESSION VERIFICATION LOGIC ---
  useEffect(() => {
    setIsClient(true);
    const cachedUser = getStoredUser();
    setCurrentUser(cachedUser);

    const handleAuthChange = () => {
      setCurrentUser(getStoredUser());
    };

    window.addEventListener('auth_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    const isCustomerInvoice = pathname === '/invoice' || (pathname.startsWith('/invoice') && !pathname.startsWith('/invoice-designer'));
    const isPublicRoute = pathname === '/auth' || pathname === '/terms-of-service' || pathname === '/privacy-policy' || pathname === '/refund-policy' || pathname === '/contact-us' || isCustomerInvoice;

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

    // Ensure default starter business exists if DB is completely empty
    const initDb = async () => {
      try {
        if (!localDb.isOpen()) {
          await localDb.open();
        }
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

  if (!isClient) {
    return <main className="min-h-screen bg-[#F8FAFC]" />;
  }

  // Standalone layout for public customer digital invoice links
  const isCustomerInvoice = pathname === '/invoice' || (pathname.startsWith('/invoice') && !pathname.startsWith('/invoice-designer'));
  if (isCustomerInvoice) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  // Standalone full-screen layout for onboarding, auth, and legal policy pages
  if (pathname === '/onboarding' || pathname === '/auth' || pathname === '/terms-of-service' || pathname === '/privacy-policy' || pathname === '/refund-policy' || pathname === '/contact-us') {
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