'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Store, 
  Phone, 
  Lock, 
  User, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Eye, 
  EyeOff, 
  Download,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { db, ensureStarterBusinessIfEmpty } from '@/lib/db';
import { 
  AuthUser, 
  setStoredUser, 
  hasSeenIntro, 
  markIntroAsSeen, 
  createDemoUser 
} from '@/lib/auth';
import { IntroWalkthrough } from '@/components/auth/IntroWalkthrough';
import { usePWAInstall } from '@/lib/pwa/usePWAInstall';
import { BusinessType } from '@/types';

export default function AuthPage() {
  const router = useRouter();
  const { isInstalled: isPWAInstalled, triggerInstall } = usePWAInstall();
  const [showIntro, setShowIntro] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('signup'); // Default to register for new users
  const [loginMethod, setLoginMethod] = useState<'otp' | 'pin'>('otp');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Status Banners
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Login Form States
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [loginPin, setLoginPin] = useState<string>('');
  const [loginOtpCode, setLoginOtpCode] = useState<string>('');
  const [loginOtpSent, setLoginOtpSent] = useState<boolean>(false);

  // Signup Form States
  const [signupStoreName, setSignupStoreName] = useState<string>('');
  const [signupOwnerName, setSignupOwnerName] = useState<string>('');
  const [signupPhone, setSignupPhone] = useState<string>('');
  const [signupPin, setSignupPin] = useState<string>('');
  const [signupCategory, setSignupCategory] = useState<BusinessType>('grocery');
  const [signupOtpSent, setSignupOtpSent] = useState<boolean>(false);
  const [signupOtpCode, setSignupOtpCode] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
    const seen = hasSeenIntro();
    if (!seen) {
      setShowIntro(true);
    }
  }, []);

  const handleFinishIntro = () => {
    markIntroAsSeen();
    setShowIntro(false);
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      await ensureStarterBusinessIfEmpty();
      const demoUser = createDemoUser();
      setStoredUser(demoUser);
      markIntroAsSeen();
      router.push('/');
    } catch (err) {
      console.error('Demo login error:', err);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  // Send WhatsApp OTP for Login
  const handleSendLoginOtp = async () => {
    const cleanPhone = loginPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    setIsSendingOtp(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/auth/send-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLoginOtpSent(true);
        if (data.devHint) {
          setLoginOtpCode(data.devHint);
        }
        setStatusMessage({
          type: 'success',
          text: `Verification code sent to your WhatsApp (+91 ${cleanPhone.slice(-10)}).`,
        });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to send WhatsApp OTP.' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Failed to send WhatsApp OTP. Please check internet connection.' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Send WhatsApp OTP for Signup
  const handleSendSignupOtp = async () => {
    const cleanPhone = signupPhone.trim().replace(/\D/g, '');
    if (!signupStoreName.trim() || !signupOwnerName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter Store Name and Owner Name first.' });
      return;
    }
    if (cleanPhone.length < 10) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    setIsSendingOtp(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/auth/send-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSignupOtpSent(true);
        setStatusMessage({
          type: 'success',
          text: `OTP sent to your WhatsApp (+91 ${cleanPhone.slice(-10)}). Enter OTP to complete registration.`,
        });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to send WhatsApp OTP.' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Failed to send WhatsApp OTP.' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = loginPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      // 1. WhatsApp OTP Login Flow
      if (loginMethod === 'otp') {
        if (!loginOtpCode.trim()) {
          setStatusMessage({ type: 'error', text: 'Please enter the 6-digit WhatsApp OTP.' });
          setIsLoading(false);
          return;
        }

        const res = await fetch('/api/auth/verify-whatsapp-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            otp: loginOtpCode.trim(),
            mode: 'login',
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          if (data.business) {
            await db.businesses.put({
              id: data.business.id,
              name: data.business.name,
              business_type: data.business.business_type || 'grocery',
              owner_name: data.business.owner_name || 'Store Owner',
              phone: data.business.phone || cleanPhone,
              address: data.business.address || '',
              pincode: data.business.pincode || '',
              gstin: data.business.gstin || '',
              upi_id: data.business.upi_id || `${cleanPhone}@upi`,
              currency: 'INR',
              language: 'hi',
              invoice_prefix: data.business.invoice_prefix || 'INV-',
              next_invoice_number: data.business.next_invoice_number || 1001,
              is_onboarded: true,
              created_at: data.business.created_at || new Date().toISOString(),
              updated_at: data.business.updated_at || new Date().toISOString(),
              sync_status: 'synced',
            });
          }

          const user: AuthUser = {
            id: data.user.id,
            name: data.user.name || 'Store Owner',
            phone: data.user.phone || cleanPhone,
            business_id: data.user.business_id,
            business_name: data.user.business_name,
            subscription_tier: data.user.subscription_tier || 'free',
            subscription_valid_until: data.user.subscription_valid_until,
            role: data.user.role || 'owner',
            created_at: new Date().toISOString(),
            token: `token_${Date.now()}`,
          };
          setStoredUser(user);
          markIntroAsSeen();
          router.push('/');
          return;
        } else {
          // If not registered yet, auto-switch to register tab
          if (data.requireSignup) {
            setStatusMessage({
              type: 'error',
              text: `No store registered with +91 ${cleanPhone.slice(-10)}. Please Register your store below.`,
            });
            setSignupPhone(cleanPhone);
            setAuthTab('signup');
          } else {
            setStatusMessage({ type: 'error', text: data.error || 'Invalid or expired OTP.' });
          }
          return;
        }
      }

      // 2. PIN / Password Login Flow
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          pin: loginPin.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.business) {
          await db.businesses.put({
            id: data.business.id,
            name: data.business.name,
            business_type: data.business.business_type || 'grocery',
            owner_name: data.business.owner_name || 'Store Owner',
            phone: data.business.phone || cleanPhone,
            address: data.business.address || '',
            pincode: data.business.pincode || '',
            gstin: data.business.gstin || '',
            upi_id: data.business.upi_id || `${cleanPhone}@upi`,
            currency: data.business.currency || 'INR',
            language: data.business.language || 'hi',
            invoice_prefix: data.business.invoice_prefix || 'INV-',
            next_invoice_number: data.business.next_invoice_number || 1001,
            is_onboarded: true,
            created_at: data.business.created_at || new Date().toISOString(),
            updated_at: data.business.updated_at || new Date().toISOString(),
            sync_status: 'synced',
          });
        }

        const user: AuthUser = {
          id: data.user.id,
          name: data.user.name,
          phone: data.user.phone,
          business_id: data.user.businessId,
          business_name: data.user.businessName,
          subscription_tier: data.user.subscriptionTier || 'free',
          subscription_valid_until: data.user.subscriptionValidUntil,
          role: data.user.role || 'owner',
          created_at: new Date().toISOString(),
          token: `token_${Date.now()}`,
        };
        setStoredUser(user);
        markIntroAsSeen();
        router.push('/');
        return;
      }

      setStatusMessage({ type: 'error', text: data.error || 'Authentication failed. Please check your credentials.' });
    } catch (err: any) {
      console.error('Login error:', err);
      setStatusMessage({ type: 'error', text: 'Network connection failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Signup
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = signupPhone.trim().replace(/\D/g, '');

    if (!signupStoreName.trim() || !signupOwnerName.trim() || cleanPhone.length < 10) {
      setStatusMessage({ type: 'error', text: 'Please fill in Store Name, Owner Name, and 10-digit Mobile Number.' });
      return;
    }

    // Require WhatsApp OTP verification on signup
    if (!signupOtpSent) {
      await handleSendSignupOtp();
      return;
    }

    if (!signupOtpCode.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter the 6-digit WhatsApp verification OTP.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      // 1. Verify WhatsApp OTP & Create Cloud Account
      const res = await fetch('/api/auth/verify-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: signupOtpCode.trim(),
          mode: 'signup',
          storeName: signupStoreName.trim(),
          ownerName: signupOwnerName.trim(),
          businessType: signupCategory,
          pin: signupPin.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.business) {
          await db.businesses.put({
            id: data.business.id,
            name: data.business.name,
            business_type: data.business.business_type || signupCategory,
            owner_name: data.business.owner_name || signupOwnerName.trim(),
            phone: data.business.phone || cleanPhone,
            address: '',
            pincode: '',
            gstin: '',
            upi_id: `${cleanPhone}@upi`,
            currency: 'INR',
            language: 'hi',
            invoice_prefix: 'INV-',
            next_invoice_number: 1,
            terms_conditions: 'Thank you for your business! Goods once sold can be returned within 7 days.',
            footer_message: 'Powered by KamaiPlus',
            is_onboarded: true,
            created_at: data.business.created_at || new Date().toISOString(),
            updated_at: data.business.updated_at || new Date().toISOString(),
            sync_status: 'synced',
          });
        }

        const user: AuthUser = {
          id: data.user.id,
          name: data.user.name,
          phone: data.user.phone,
          business_id: data.user.business_id,
          business_name: data.user.business_name,
          subscription_tier: data.user.subscription_tier || 'free',
          subscription_valid_until: data.user.subscription_valid_until,
          role: 'owner',
          created_at: new Date().toISOString(),
          token: `token_${Date.now()}`,
        };
        setStoredUser(user);
        markIntroAsSeen();
        router.push('/');
        return;
      }

      setStatusMessage({ type: 'error', text: data.error || 'Failed to register store. Please check OTP.' });
    } catch (err: any) {
      console.error('Signup error:', err);
      setStatusMessage({ type: 'error', text: 'Registration network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  if (showIntro) {
    return (
      <IntroWalkthrough
        onComplete={handleFinishIntro}
        onSkip={handleFinishIntro}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 py-8 relative">
      {/* Top Header & Tour Button */}
      <div className="relative z-10 max-w-md mx-auto w-full flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Kamai+" className="w-8 h-8 object-contain flex-shrink-0" />
          <span className="font-extrabold text-sm tracking-tight text-white">KamaiPlus POS</span>
        </div>

        <div className="flex items-center gap-2">
          {!isPWAInstalled && (
            <button
              type="button"
              onClick={triggerInstall}
              className="text-xs font-bold text-slate-300 flex items-center gap-1 px-2.5 py-1 rounded border border-slate-800 bg-slate-900 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Install App</span>
            </button>
          )}

          <button
            onClick={() => setShowIntro(true)}
            className="text-xs font-bold text-amber-400 flex items-center gap-1 px-2.5 py-1 rounded border border-slate-800 bg-slate-900 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Intro Tour</span>
          </button>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="relative z-10 max-w-md mx-auto w-full my-auto py-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-5 shadow-2xl">
          {/* Header Title */}
          <div className="text-center space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {authTab === 'signup' ? 'Register Your Store' : 'Sign In to Store'}
            </h1>
            <p className="text-xs text-slate-400">
              {authTab === 'signup'
                ? 'Create your store account with instant WhatsApp OTP verification.'
                : 'Enter your registered mobile number to open your billing POS.'}
            </p>
          </div>

          {/* Status Message Notification Banner */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-600/40 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/80 border border-rose-600/40 text-rose-300'
                  : 'bg-amber-950/80 border border-amber-600/40 text-amber-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              )}
              <span className="leading-snug">{statusMessage.text}</span>
            </div>
          )}

          {/* 1-Click Instant Demo Explore */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full p-3 rounded-xl bg-slate-950 border border-amber-400/30 hover:border-amber-400/60 flex items-center justify-between text-left cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-400 text-slate-950 font-black flex-shrink-0">
                <Zap className="w-4 h-4 fill-slate-950" />
              </div>
              <div>
                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <span>Explore Demo Store (No Sign Up)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                    INSTANT
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Try 50+ pre-seeded grocery items & instant offline billing
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
          </button>

          {/* Tab Switcher: Signup vs Login */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthTab('signup');
                setStatusMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg text-center cursor-pointer transition-all ${
                authTab === 'signup'
                  ? 'bg-amber-400 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. Register Store
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setStatusMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg text-center cursor-pointer transition-all ${
                authTab === 'login'
                  ? 'bg-slate-800 text-white font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Sign In
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: SIGNUP FORM (REGISTRATION FIRST) */}
          {/* ========================================================================= */}
          {authTab === 'signup' ? (
            <form onSubmit={handleSignupSubmit} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">Store / Business Name *</label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. Mahadev Super Market"
                    value={signupStoreName}
                    onChange={(e) => setSignupStoreName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">Owner Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. Rahul Patil"
                      value={signupOwnerName}
                      onChange={(e) => setSignupOwnerName(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">Mobile Number *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono font-bold">
                      +91
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="9595997711"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-11 pr-2 py-2 text-xs font-mono font-bold focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">Business Category</label>
                <select
                  value={signupCategory}
                  onChange={(e) => setSignupCategory(e.target.value as BusinessType)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-400"
                >
                  <option value="grocery">🛒 Kirana & Grocery</option>
                  <option value="clothing">👕 Clothing & Garments</option>
                  <option value="electronics">📱 Electronics & Mobile</option>
                  <option value="bakery">🍰 Bakery & Sweets</option>
                  <option value="restaurant">🍛 Cafe & Restaurant</option>
                  <option value="hardware">🔧 Hardware & Electricals</option>
                  <option value="stationery">📚 Stationery & Books</option>
                  <option value="other">🏢 Other Retail Business</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">Set 4-Digit Security PIN</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="e.g. 1234"
                    value={signupPin}
                    onChange={(e) => setSignupPin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* WhatsApp OTP Step for Registration */}
              <div className="space-y-2 pt-1 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp Verification OTP</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSendSignupOtp}
                    disabled={isSendingOtp}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                  >
                    {isSendingOtp ? 'Sending...' : signupOtpSent ? 'Resend WhatsApp OTP' : 'Send WhatsApp OTP'}
                  </button>
                </div>

                {signupOtpSent ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-Digit OTP"
                      value={signupOtpCode}
                      onChange={(e) => setSignupOtpCode(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-emerald-500/60 text-emerald-400 text-center tracking-[0.3em] rounded-xl py-2 text-sm font-mono font-black focus:outline-none focus:border-emerald-400"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>✓ OTP dispatched to WhatsApp</span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendSignupOtp}
                    disabled={isSendingOtp}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 hover:bg-emerald-900/60 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>{isSendingOtp ? 'Sending WhatsApp OTP...' : 'Send WhatsApp Verification OTP'}</span>
                  </button>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs py-3 rounded-xl border-amber-400 shadow-md gap-2 mt-3 cursor-pointer"
              >
                <span>{isLoading ? 'Creating Store Account...' : 'Complete Registration & Open Store'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            /* ========================================================================= */
            /* TAB 2: LOGIN FORM (EXISTING USERS) */
            /* ========================================================================= */
            <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
              {/* Login Method Toggle */}
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="text-slate-400 font-medium">Login Method:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('otp');
                      setStatusMessage(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      loginMethod === 'otp'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    WhatsApp OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('pin');
                      setStatusMessage(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      loginMethod === 'pin'
                        ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    4-Digit PIN
                  </button>
                </div>
              </div>

              {/* Mobile Number Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">Registered Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono font-bold">
                    +91
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile no."
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-11 pr-3 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* OTP Field or PIN Field */}
              {loginMethod === 'otp' ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp OTP</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSendLoginOtp}
                      disabled={isSendingOtp}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                    >
                      {isSendingOtp ? 'Sending...' : loginOtpSent ? 'Resend WhatsApp OTP' : 'Send WhatsApp OTP'}
                    </button>
                  </div>

                  {loginOtpSent ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-Digit OTP"
                        value={loginOtpCode}
                        onChange={(e) => setLoginOtpCode(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-emerald-500/60 text-emerald-400 text-center tracking-[0.3em] rounded-xl py-2.5 text-base font-mono font-black focus:outline-none focus:border-emerald-400"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>✓ OTP sent on WhatsApp</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendLoginOtp}
                      disabled={isSendingOtp}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 hover:bg-emerald-900/60 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span>{isSendingOtp ? 'Sending...' : 'Send OTP on WhatsApp'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">4-Digit Security PIN</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      maxLength={6}
                      placeholder="Enter your security PIN"
                      value={loginPin}
                      onChange={(e) => setLoginPin(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-amber-400 placeholder:text-slate-600 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg mt-2"
              >
                <span>{isLoading ? 'Verifying & Signing In...' : 'Verify & Sign In to My Store'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer Security Badges */}
      <div className="relative z-10 max-w-md mx-auto w-full text-center text-slate-500 text-[11px] space-y-1">
        <div className="flex items-center justify-center gap-3">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Offline Billing Support</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Encrypted Cloud Sync</span>
          </span>
        </div>
        <p className="text-[10px] text-slate-600">
          KamaiPlus (Kamai+) • Built for Indian Merchants & Retailers
        </p>
      </div>
    </div>
  );
}
