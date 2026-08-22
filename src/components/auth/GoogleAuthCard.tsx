'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '@/lib/firebase/googleAuth';
import { setStoredUser } from '@/lib/auth';
import { db } from '@/lib/db';
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
      const now = new Date().toISOString();

      // Check if store/business is already set up in local database
      const existingBiz = await db.businesses.toCollection().first();

      if (existingBiz && existingBiz.is_onboarded) {
        // ALREADY REGISTERED USER -> Welcome back message & Instant POS Launch
        const displayName = existingBiz.owner_name || googleUser.displayName || 'Merchant';
        setWelcomeUser(displayName);

        // Update local session
        setStoredUser({
          uid: googleUser.uid,
          id: googleUser.uid,
          name: displayName,
          phone: existingBiz.phone || googleUser.phoneNumber || googleUser.email || '',
          role: 'owner',
          business_id: existingBiz.id,
          business_name: existingBiz.name,
        });

        // Update owner name in database if changed
        await db.businesses.update(existingBiz.id, {
          owner_name: displayName,
          updated_at: now,
        });

        // Short delay for the user to enjoy the welcome banner
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        // FIRST TIME USER (NEW SIGNUP) -> Store Google session and redirect to onboarding wizard
        setStoredUser({
          uid: googleUser.uid,
          id: googleUser.uid,
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
          India's 100% Offline-First POS & Digital Khata Software
        </p>
      </div>

      {/* Welcome Back Banner for Returning Users */}
      {welcomeUser && (
        <div className="mb-5 p-4 bg-emerald-950/70 border border-emerald-600/60 rounded-2xl flex items-center gap-3 text-emerald-200 animate-fadeIn">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-black text-emerald-300">Welcome Back, {welcomeUser}! 👋</div>
            <div className="text-[11px] text-emerald-400/80">Opening your store & POS billing counter...</div>
          </div>
        </div>
      )}

      {/* Error Alert Box */}
      {error && (
        <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl flex items-start gap-3 text-rose-200 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{error}</span>
        </div>
      )}

      {/* Main Google Sign-In Button */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || Boolean(welcomeUser)}
          className="w-full group relative flex items-center justify-center gap-3 py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl font-bold text-sm shadow-xl hover:shadow-2xl transition-all duration-200 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
          )}

          <span>
            {loading ? 'Connecting to Google...' : welcomeUser ? 'Redirecting to Dashboard...' : 'Continue with Google'}
          </span>
        </button>

        {/* Feature badges */}
        <div className="pt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 p-2 bg-slate-950/50 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>1-Click Safe Sign-In</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 bg-slate-950/50 rounded-xl border border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Encrypted Cloud Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
};
