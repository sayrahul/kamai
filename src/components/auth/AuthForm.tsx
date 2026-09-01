'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '@/lib/firebase/googleAuth';
import { setStoredUser, AuthUser } from '@/lib/auth';
import { db as localDb } from '@/lib/db';
import { getFirestoreDb } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, limit, deleteDoc } from 'firebase/firestore';
import { syncProfileToCloud, restoreDataFromCloud } from '@/lib/sync/syncEngine';
import { 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  Zap,
  Phone,
  MessageSquare,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const AuthForm: React.FC = () => {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  // Reverse Handshake (Click-to-Chat) States
  const [handshakeCode, setHandshakeCode] = useState<string | null>(null);
  const [handshakeUrl, setHandshakeUrl] = useState<string | null>(null);
  const [isHandshakeWaiting, setIsHandshakeWaiting] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer for manual WhatsApp OTP resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Clean up polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  /**
   * Universal Post-Authentication Handler
   * Handles routing and local hydration for Google OAuth, WhatsApp Handshake, and WhatsApp OTP
   */
  const handlePostAuth = useCallback(async (authUser: {
    uid: string;
    phone?: string | null;
    email?: string | null;
    name?: string | null;
    photoURL?: string | null;
  }) => {
    const { uid, phone, email, name, photoURL } = authUser;
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    const cleanEmail = email?.toLowerCase().trim() || '';

    try {
      const firestore = getFirestoreDb();
      let merchantData: any = null;

      if (firestore) {
        // 1. Primary check: Query collection `merchants` for document `merchants/{uid}`
        try {
          const merchantDocRef = doc(firestore, 'merchants', uid);
          const merchantSnap = await getDoc(merchantDocRef);
          if (merchantSnap.exists()) {
            merchantData = merchantSnap.data();
          }
        } catch (mErr) {
          console.warn('merchants/{uid} lookup notice:', mErr);
        }

        // 2. Fallback check: Query collection `businesses` by user_uid, user_email or phone
        if (!merchantData) {
          try {
            if (uid) {
              const uidQ = query(collection(firestore, 'businesses'), where('user_uid', '==', uid), limit(1));
              const uidSnap = await getDocs(uidQ);
              if (!uidSnap.empty) {
                merchantData = uidSnap.docs[0].data();
              }
            }

            if (!merchantData && cleanEmail) {
              const emailQ = query(collection(firestore, 'businesses'), where('user_email', '==', cleanEmail), limit(1));
              const emailSnap = await getDocs(emailQ);
              if (!emailSnap.empty) {
                merchantData = emailSnap.docs[0].data();
              }
            }

            if (!merchantData && cleanPhone) {
              const phoneQ = query(collection(firestore, 'businesses'), where('phone', '==', cleanPhone), limit(1));
              const phoneSnap = await getDocs(phoneQ);
              if (!phoneSnap.empty) {
                merchantData = phoneSnap.docs[0].data();
              }
            }
          } catch (bErr) {
            console.warn('businesses lookup fallback notice:', bErr);
          }
        }

        // 3. Strict Verification: Check if the business document actually exists in `businesses`
        if (merchantData) {
          const targetBizId = merchantData.business_id || merchantData.id;
          if (targetBizId) {
            try {
              const bizDocRef = doc(firestore, 'businesses', targetBizId);
              const bizSnap = await getDoc(bizDocRef);
              if (!bizSnap.exists() || bizSnap.data()?.is_active === false) {
                // The store was deleted or frozen by platform admin!
                await deleteDoc(doc(firestore, 'merchants', uid)).catch(() => {});
                merchantData = null;
              } else {
                merchantData = { ...merchantData, ...bizSnap.data() };
              }
            } catch (vErr) {
              console.warn('Verify business existence notice:', vErr);
            }
          }
        }
      }

      // CASE A: Returning User (Active Merchant document or business verified in Cloud)
      if (merchantData && (merchantData.business_id || merchantData.id) && merchantData.is_active !== false) {
        const businessId = merchantData.business_id || merchantData.id;
        const shopName = merchantData.shop_name || merchantData.name || merchantData.business_name || 'My Store';
        const ownerName = merchantData.owner_name || name || 'Merchant';
        const userPhone = merchantData.phone || cleanPhone || '';

        setWelcomeMessage(`Welcome back, ${shopName}!`);

        // Clean local Dexie tables before restoring latest cloud snapshot
        try {
          if (!localDb.isOpen()) await localDb.open();
          await Promise.all([
            localDb.sales.clear(),
            localDb.customers.clear(),
            localDb.products.clear(),
            localDb.categories.clear(),
            localDb.ledger_transactions.clear(),
            localDb.cash_expenses.clear(),
            localDb.cash_registers.clear(),
            localDb.businesses.clear(),
          ]);
        } catch (clearErr) {
          console.warn('Wipe local tables on returning login:', clearErr);
        }

        // Store business into local Dexie
        try {
          await localDb.businesses.put({
            id: businessId,
            name: shopName,
            owner_name: ownerName,
            phone: userPhone,
            email: cleanEmail || merchantData.email,
            business_type: merchantData.business_type || 'grocery',
            address: merchantData.address || '',
            currency: 'INR',
            language: merchantData.language || 'hi',
            invoice_prefix: merchantData.invoice_prefix || 'INV-',
            next_invoice_number: merchantData.next_invoice_number || 1,
            is_onboarded: true,
            sync_status: 'synced',
            created_at: merchantData.createdAt || merchantData.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn('Put business in local db notice:', dbErr);
        }

        // Hydrate local session
        const sessionPayload: AuthUser = {
          uid,
          id: uid,
          phone: userPhone,
          email: cleanEmail || null,
          photoURL: photoURL || null,
          name: ownerName,
          business_id: businessId,
          business_name: shopName,
          shop_name: shopName,
          role: merchantData.role || 'admin',
        };
        setStoredUser(sessionPayload);

        // Restore cloud data and sync profile
        try {
          await restoreDataFromCloud(businessId);
          await syncProfileToCloud(businessId);
        } catch (syncErr) {
          console.warn('Restore and sync cloud data on login:', syncErr);
        }

        // Navigate seamlessly to dashboard
        setTimeout(() => {
          router.replace('/');
        }, 1000);
      } else {
        // CASE B: First-Time User OR Deleted Merchant (Document Does NOT Exist in Cloud)
        // Complete purge of any stale device data
        try {
          if (!localDb.isOpen()) await localDb.open();
          await Promise.all([
            localDb.sales.clear(),
            localDb.customers.clear(),
            localDb.products.clear(),
            localDb.categories.clear(),
            localDb.ledger_transactions.clear(),
            localDb.cash_expenses.clear(),
            localDb.cash_registers.clear(),
            localDb.businesses.clear(),
          ]);
        } catch (purgeErr) {
          console.warn('Wipe local device tables on first-time signup:', purgeErr);
        }

        const partialUser: AuthUser = {
          uid,
          id: uid,
          phone: cleanPhone || null,
          email: cleanEmail || null,
          photoURL: photoURL || null,
          name: name || 'Store Owner',
          role: 'admin',
          business_id: undefined, // Mandatory onboarding flag
        };
        setStoredUser(partialUser);

        // Navigate immediately to onboarding page for fresh store creation
        router.replace('/onboarding');
      }
    } catch (err: any) {
      console.error('Post-auth routing error:', err);
      setError(err?.message || 'Failed to initialize merchant session.');
      setLoading(false);
      setOtpLoading(false);
      setIsHandshakeWaiting(false);
    }
  }, [router]);

  /**
   * Clipboard Auto-Paste Detector
   * When user copies the 6-digit code from WhatsApp and focuses the app, auto-fill and auto-submit!
   */
  useEffect(() => {
    const handleWindowFocus = async () => {
      if (step === 'OTP' && typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        try {
          const clipboardText = await navigator.clipboard.readText();
          const digitsOnly = (clipboardText || '').replace(/\D/g, '').slice(0, 6);
          if (digitsOnly.length === 6 && digitsOnly !== otp) {
            setOtp(digitsOnly);
            verifyOtpCode(digitsOnly);
          }
        } catch (clipErr) {
          // Clipboard read may require user gesture in some browsers
        }
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [step, otp]);

  // Google OAuth Sign-In
  const handleGoogleSignIn = async () => {
    setError('');
    setWelcomeMessage(null);
    setLoading(true);

    try {
      const result = await signInWithGoogle();
      if (!result.success || !result.user) {
        setError(result.error || 'Google Sign-In failed. Please try again.');
        setLoading(false);
        return;
      }

      const googleUser = result.user;
      await handlePostAuth({
        uid: googleUser.uid,
        phone: googleUser.phoneNumber,
        email: googleUser.email,
        name: googleUser.displayName,
        photoURL: googleUser.photoURL,
      });
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setError(err?.message || 'Google sign-in error occurred.');
      setLoading(false);
    }
  };

  /**
   * Continue with WhatsApp (1-Tap Reverse Handshake)
   * Zero Meta Fee: User taps button -> WhatsApp opens with prefilled text -> User taps send -> Instantly verified!
   */
  const handleContinueWithWhatsApp = async () => {
    setError('');
    setLoading(true);

    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    try {
      const res = await fetch('/api/auth/reverse-handshake/create', {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Could not start WhatsApp handshake.');
        setLoading(false);
        return;
      }

      setHandshakeCode(data.code);
      setHandshakeUrl(data.whatsappUrl);
      setIsHandshakeWaiting(true);
      setLoading(false);

      // Open WhatsApp deep-link immediately
      window.open(data.whatsappUrl, '_blank');

      // Start polling status every 1.5 seconds
      pollingTimerRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/auth/reverse-handshake/status?code=${data.code}`);
          const statusData = await statusRes.json();

          if (statusData.verified && statusData.user) {
            if (pollingTimerRef.current) {
              clearInterval(pollingTimerRef.current);
              pollingTimerRef.current = null;
            }
            setIsHandshakeWaiting(false);

            await handlePostAuth({
              uid: statusData.user.id || statusData.user.uid,
              phone: statusData.user.phone,
              name: statusData.user.name,
            });
          } else if (statusData.status === 'expired') {
            if (pollingTimerRef.current) {
              clearInterval(pollingTimerRef.current);
              pollingTimerRef.current = null;
            }
            setIsHandshakeWaiting(false);
            setError('WhatsApp verification expired. Please tap Continue with WhatsApp again.');
          }
        } catch (pollErr) {
          console.warn('Handshake status poll notice:', pollErr);
        }
      }, 1500);
    } catch (err: any) {
      console.error('Continue with WhatsApp Exception:', err);
      setError(err?.message || 'Failed to connect to WhatsApp authentication service.');
      setLoading(false);
      setIsHandshakeWaiting(false);
    }
  };

  // Send WhatsApp OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setOtpLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          mode: 'login',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.requireSignup) {
          const directRes = await fetch('/api/auth/send-whatsapp-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: cleanPhone,
              mode: 'signup',
            }),
          });
          const directData = await directRes.json();
          if (!directRes.ok || !directData.success) {
            setError(directData.error || 'Could not send WhatsApp verification code.');
            return;
          }
        } else {
          setError(data.error || 'Failed to send WhatsApp verification code.');
          return;
        }
      }

      setStep('OTP');
      setShowOtpForm(true);
      setCooldown(60);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError('Network error while requesting OTP. Please check your connection.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Reusable verify OTP code function
  const verifyOtpCode = async (codeToVerify: string) => {
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    const cleanOtp = codeToVerify.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Please enter the complete 6-digit WhatsApp OTP.');
      return;
    }

    setOtpLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: cleanOtp,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid or expired OTP code.');
        setOtpLoading(false);
        return;
      }

      const verifiedUid = data.user?.id || data.user?.uid || `wa_${cleanPhone}`;

      await handlePostAuth({
        uid: verifiedUid,
        phone: cleanPhone,
        email: data.user?.email || null,
        name: data.user?.name || null,
      });
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setError('Failed to verify OTP. Please try again.');
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    verifyOtpCode(otp);
  };

  const handleCopyCode = () => {
    if (handshakeCode) {
      navigator.clipboard?.writeText(handshakeCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden text-white">
      {/* Top Gradient Glow Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-amber-400 to-emerald-500" />

      {/* Header title */}
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Welcome to KamaiPlus
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Offline-First Billing POS &amp; Digital Khata Platform
        </p>
      </div>

      {/* Welcome Back Toast Banner */}
      {welcomeMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in zoom-in-95">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="font-black text-white text-sm">{welcomeMessage}</div>
            <div className="text-xs text-emerald-300/80">Restoring your store &amp; launching billing counter...</div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* ============================================================= */}
        {/* 1. TOP: Continue with WhatsApp (Primary 1-Tap Handshake) */}
        {/* ============================================================= */}
        {!isHandshakeWaiting ? (
          <div>
            <button
              type="button"
              onClick={handleContinueWithWhatsApp}
              disabled={loading || otpLoading || !!welcomeMessage}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-sm shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2ZM12.04 3.73C16.55 3.73 20.22 7.4 20.22 11.91C20.22 16.42 16.55 20.09 12.04 20.09C10.63 20.09 9.27 19.72 8.08 19.02L7.79 18.85L4.68 19.67L5.51 16.63L5.33 16.34C4.57 15.13 4.16 13.73 4.16 12.28C4.16 7.77 7.83 4.1 12.34 4.1L12.04 3.73ZM17.51 14.34C17.21 14.19 15.74 13.47 15.47 13.37C15.2 13.27 15.01 13.22 14.81 13.52C14.62 13.82 14.06 14.47 13.89 14.67C13.72 14.87 13.55 14.89 13.25 14.74C12.95 14.59 11.99 14.28 10.86 13.27C9.98 12.48 9.38 11.51 9.21 11.21C9.04 10.91 9.19 10.75 9.34 10.6C9.48 10.46 9.65 10.23 9.8 10.06C9.95 9.89 10 9.77 10.1 9.57C10.2 9.37 10.15 9.19 10.08 9.04C10 8.89 9.42 7.46 9.18 6.87C8.94 6.3 8.7 6.38 8.52 6.37C8.35 6.36 8.16 6.36 7.96 6.36C7.76 6.36 7.44 6.43 7.17 6.73C6.9 7.02 6.13 7.74 6.13 9.21C6.13 10.68 7.2 12.1 7.35 12.3C7.5 12.5 9.45 15.5 12.43 16.79C13.14 17.1 13.69 17.28 14.12 17.42C14.83 17.65 15.48 17.61 15.99 17.54C16.56 17.45 17.74 16.82 17.99 16.12C18.24 15.42 18.24 14.82 18.16 14.69C18.09 14.57 17.81 14.49 17.51 14.34Z"
                  fill="#FFFFFF"
                />
              </svg>
              <span>Continue with WhatsApp</span>
            </button>

            {/* Sub-Toggle: Or Get WhatsApp OTP */}
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowOtpForm(!showOtpForm);
                  setError('');
                }}
                className="text-xs text-slate-400 hover:text-emerald-400 font-medium inline-flex items-center gap-1 transition cursor-pointer py-1"
              >
                <span>{showOtpForm ? 'Hide WhatsApp OTP' : 'or get WhatsApp OTP'}</span>
                {showOtpForm ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-white">Waiting for WhatsApp message...</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tap &quot;Send&quot; in WhatsApp. Your screen will unlock automatically!
              </p>
            </div>

            {handshakeCode && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 max-w-xs mx-auto">
                <div className="text-left">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Verification Code</div>
                  <div className="text-xs font-mono font-bold text-emerald-400">{handshakeCode}</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium flex items-center gap-1 text-slate-300 cursor-pointer"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-1">
              {handshakeUrl && (
                <button
                  type="button"
                  onClick={() => window.open(handshakeUrl, '_blank')}
                  className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open WhatsApp Again</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (pollingTimerRef.current) {
                    clearInterval(pollingTimerRef.current);
                    pollingTimerRef.current = null;
                  }
                  setIsHandshakeWaiting(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* 2. WhatsApp OTP Form (Expandable) */}
        {/* ============================================================= */}
        {showOtpForm && !isHandshakeWaiting && (
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {step === 'PHONE' ? (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Enter WhatsApp Mobile Number
                  </label>
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400">
                    <span className="px-3 py-2.5 text-xs text-slate-400 font-bold bg-slate-800/60 border-r border-slate-800">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      required
                      disabled={otpLoading}
                      className="flex-1 py-2.5 px-3 bg-transparent text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || phoneNumber.length < 10}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {otpLoading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending OTP...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Send 6-Digit OTP</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Enter 6-Digit Code
                  </label>
                  <span className="text-xs text-emerald-400 font-mono font-bold">
                    +91 {phoneNumber}
                  </span>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoFocus
                  required
                  disabled={otpLoading}
                  className="w-full py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:outline-none text-white text-center text-lg tracking-[0.4em] font-mono placeholder:text-slate-700 placeholder:tracking-normal transition"
                />

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep('PHONE'); setOtp(''); setError(''); }}
                    className="text-slate-400 hover:text-white underline transition cursor-pointer"
                  >
                    Change Number
                  </button>

                  {cooldown > 0 ? (
                    <span className="text-slate-400 font-mono text-[11px]">Resend in {cooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={otpLoading}
                      className="text-emerald-400 hover:text-emerald-300 font-bold underline transition cursor-pointer"
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || otp.length !== 6}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {otpLoading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify &amp; Continue 🚀</span>
                    </span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* 3. OR DIVIDER */}
        {/* ============================================================= */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800" />
          <span className="flex-shrink mx-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Or
          </span>
          <div className="flex-grow border-t border-slate-800" />
        </div>

        {/* ============================================================= */}
        {/* 4. Continue with Google */}
        {/* ============================================================= */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || otpLoading || isHandshakeWaiting || !!welcomeMessage}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl hover:shadow-2xl transition-all duration-200 border border-slate-200 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        >
          {loading && !isHandshakeWaiting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span>Authenticating with Google...</span>
            </div>
          ) : (
            <>
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* ============================================================= */}
        {/* 4. Reset Device Storage / Fresh Signup Mode */}
        {/* ============================================================= */}
        <div className="pt-2 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={async () => {
              const { purgeLocalDeviceData } = await import('@/lib/auth');
              await purgeLocalDeviceData();
              setWelcomeMessage(null);
              setError('');
              setPhoneNumber('');
              setOtp('');
              setStep('PHONE');
              router.push('/onboarding');
            }}
            className="text-[11.5px] text-slate-400 hover:text-amber-400 font-semibold inline-flex items-center gap-1.5 transition cursor-pointer py-1.5 px-3 rounded-xl hover:bg-slate-800/50"
            title="Wipe IndexedDB & local cache on this device to create a fresh store"
          >
            <span>🧹 Reset Device Data (Start Fresh Signup)</span>
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="pt-2 grid grid-cols-2 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2 justify-center">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-300">100% Offline POS</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2 justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-300">Cloud Sync &amp; Backup</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
