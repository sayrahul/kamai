'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '@/lib/firebase/googleAuth';
import { setStoredUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getFirestoreDb } from '@/lib/firebase/config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';

export const GoogleAuthCard: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [welcomeUser, setWelcomeUser] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError('');
    setWelcomeUser(null);
    setLoading(true);

    try {
      const result = await signInWithGoogle();

      if (!result.success || !result.user) {
        setError(result.error || 'Google Sign-In failed. Please try again.');
        setLoading(false);
        return;
      }

      const googleUser = result.user;
      const userEmail = googleUser.email?.toLowerCase().trim() || '';
      const userUid = googleUser.uid;
      const now = new Date().toISOString();

      // 1. Check Cloud Firestore to see if this specific Google account already has a registered store
      let registeredBiz: any = null;

      try {
        const firestore = getFirestoreDb();
        if (firestore) {
          // Check by user_email
          if (userEmail) {
            const emailQuery = query(
              collection(firestore, 'businesses'),
              where('user_email', '==', userEmail),
              limit(1)
            );
            const emailSnap = await getDocs(emailQuery);
            if (!emailSnap.empty) {
              registeredBiz = emailSnap.docs[0].data();
            }
          }

          // Check by user_uid if not found by email
          if (!registeredBiz && userUid) {
            const uidQuery = query(
              collection(firestore, 'businesses'),
              where('user_uid', '==', userUid),
              limit(1)
            );
            const uidSnap = await getDocs(uidQuery);
            if (!uidSnap.empty) {
              registeredBiz = uidSnap.docs[0].data();
            }
          }
        }
      } catch (cloudErr) {
        console.warn('Firestore merchant lookup error:', cloudErr);
      }

      // 2. Fallback: check local Dexie to see if existing business matches this user
      if (!registeredBiz) {
        const localBiz = await db.businesses.toCollection().first();
        if (
          localBiz &&
          localBiz.is_onboarded &&
          (localBiz.email?.toLowerCase() === userEmail || (localBiz as any).user_uid === userUid)
        ) {
          registeredBiz = localBiz;
        }
      }

      if (registeredBiz && registeredBiz.is_onboarded) {
        // ALREADY REGISTERED USER -> Welcome back banner & Instant POS Launch
        const displayName = registeredBiz.owner_name || googleUser.displayName || 'Merchant';
        setWelcomeUser(displayName);

        // Put business into local Dexie
        await db.businesses.put(registeredBiz);

        // Update local session
        setStoredUser({
          uid: googleUser.uid,
          id: googleUser.uid,
          email: userEmail,
          photoURL: googleUser.photoURL,
          name: displayName,
          phone: registeredBiz.phone || googleUser.phoneNumber || '',
          role: 'owner',
          business_id: registeredBiz.id,
          business_name: registeredBiz.name,
        });

        // Short delay for the user to enjoy the welcome banner
        setTimeout(() => {
          router.push('/');
        }, 1200);
      } else {
        // FIRST TIME USER (NEW GOOGLE SIGNUP)
        // Clear previous user's local tables so the new account starts fresh
        try {
          await db.sales.clear();
          await db.customers.clear();
          await db.products.clear();
          await db.categories.clear();
          await db.ledger_transactions.clear();
          await db.cash_expenses.clear();
          await db.cash_registers.clear();
          await db.businesses.clear();
        } catch (clearErr) {
          console.warn('Local tables wipe:', clearErr);
        }

        // Store new Google session
        setStoredUser({
          uid: googleUser.uid,
          id: googleUser.uid,
          email: userEmail,
          photoURL: googleUser.photoURL,
          name: googleUser.displayName || 'Store Owner',
          phone: googleUser.phoneNumber || '',
          role: 'owner',
          business_id: 'biz_pending',
        });

        // Redirect directly to questions: Store Type, Owner Name, Store Name, 10-Digit Contact
        router.push('/onboarding');
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Decorative gradient header glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-500" />

      {/* Header title */}
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Welcome to KamaiPlus
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Fast, Free & Offline-First POS Counter & Digital Khata
        </p>
      </div>

      {/* Welcome Back Banner for Registered Users */}
      {welcomeUser && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in zoom-in-95">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="font-black text-white text-sm">Welcome Back, {welcomeUser}! 👋</div>
            <div className="text-xs text-emerald-300/80">Opening your store & POS billing counter...</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Google Login Button */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || !!welcomeUser}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl hover:shadow-2xl transition-all duration-200 border border-slate-200 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span>Authenticating with Google...</span>
            </div>
          ) : (
            <>
              {/* Official Google 'G' SVG Logo */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Feature Highlights */}
        <div className="pt-2 grid grid-cols-2 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2 justify-center">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-300">100% Offline POS</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2 justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-300">Cloud Sync & Backup</span>
          </div>
        </div>
      </div>
    </div>
  );
};
