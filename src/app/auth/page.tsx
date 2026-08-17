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
  Mail, 
  KeyRound,
  Zap,
  Building2,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { db, ensureStarterBusinessIfEmpty } from '@/lib/db';
import { 
  AuthUser, 
  getStoredUser, 
  setStoredUser, 
  hasSeenIntro, 
  markIntroAsSeen, 
  createDemoUser 
} from '@/lib/auth';
import { IntroWalkthrough } from '@/components/auth/IntroWalkthrough';
import { BusinessType } from '@/types';

export default function AuthPage() {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');

  // Login Form States
  const [loginPhone, setLoginPhone] = useState<string>('9876543210');
  const [loginPassword, setLoginPassword] = useState<string>('demo123');

  // Signup Form States
  const [signupStoreName, setSignupStoreName] = useState<string>('');
  const [signupOwnerName, setSignupOwnerName] = useState<string>('');
  const [signupPhone, setSignupPhone] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupCategory, setSignupCategory] = useState<BusinessType>('grocery');

  useEffect(() => {
    setIsClient(true);
    // Check if user has seen intro
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

  const handleSendOtp = () => {
    if (!loginPhone || loginPhone.length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }
    setOtpSent(true);
    setOtpCode('123456'); // Auto-fill test OTP for frictionless experience
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone) {
      alert('Please enter your mobile number');
      return;
    }

    setIsLoading(true);
    try {
      await ensureStarterBusinessIfEmpty();
      const user: AuthUser = {
        id: `usr_${Date.now()}`,
        name: 'Store Owner',
        phone: loginPhone,
        role: 'owner',
        created_at: new Date().toISOString(),
        token: `token_${Date.now()}`,
      };
      setStoredUser(user);
      markIntroAsSeen();
      router.push('/');
    } catch (err) {
      console.error('Login error:', err);
      alert('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupStoreName.trim() || !signupOwnerName.trim() || !signupPhone.trim()) {
      alert('Please fill in required fields: Store Name, Owner Name, and Mobile Number.');
      return;
    }

    setIsLoading(true);
    try {
      const bizId = `biz_${Date.now()}`;
      const now = new Date().toISOString();

      await db.businesses.put({
        id: bizId,
        name: signupStoreName.trim(),
        business_type: signupCategory,
        owner_name: signupOwnerName.trim(),
        phone: signupPhone.trim(),
        address: '',
        pincode: '',
        gstin: '',
        upi_id: `${signupPhone.trim()}@upi`,
        currency: 'INR',
        language: 'hi',
        invoice_prefix: 'INV-',
        next_invoice_number: 1,
        terms_conditions: 'Thank you for your business! Goods once sold can be returned within 7 days.',
        footer_message: 'Powered by KamaiPlus',
        is_onboarded: true,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      });

      const user: AuthUser = {
        id: `usr_${Date.now()}`,
        name: signupOwnerName.trim(),
        phone: signupPhone.trim(),
        email: signupEmail.trim(),
        business_name: signupStoreName.trim(),
        role: 'owner',
        created_at: now,
        token: `token_${Date.now()}`,
      };
      setStoredUser(user);
      markIntroAsSeen();
      router.push('/');
    } catch (err) {
      console.error('Signup error:', err);
      alert('Failed to create store. Please try again.');
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

  // If first-time user and intro not finished, display the 3 intro slides
  if (showIntro) {
    return (
      <IntroWalkthrough
        onComplete={handleFinishIntro}
        onSkip={handleFinishIntro}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 py-8 relative">
      {/* Background Glow */}
      <div className="absolute top-0 -left-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Tour Button */}
      <div className="relative z-10 max-w-md mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-md">
            K+
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">KamaiPlus</span>
        </div>

        <button
          onClick={() => setShowIntro(true)}
          className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-400/20 bg-amber-400/10 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>View Intro Tour</span>
        </button>
      </div>

      {/* Main Authentication Card */}
      <div className="relative z-10 max-w-md mx-auto w-full my-auto py-6">
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Header Title */}
          <div className="text-center space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {authTab === 'login' ? 'Welcome Back' : 'Create Store Account'}
            </h1>
            <p className="text-xs text-slate-400">
              {authTab === 'login'
                ? 'Sign in to access your billing POS, store ledger, and inventory.'
                : 'Join 50,000+ Indian merchants managing billing & customer credit effortlessly.'}
            </p>
          </div>

          {/* 1-Click Instant Demo Explore Pill */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-400/15 via-amber-400/25 to-amber-400/15 border border-amber-400/40 hover:border-amber-400 flex items-center justify-between text-left transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-amber-400 text-slate-950 font-black flex-shrink-0">
                <Zap className="w-4 h-4 fill-slate-950" />
              </div>
              <div>
                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <span>1-Click Demo Login (Fast Test)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                    INSTANT
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  Explore full features with 50+ pre-seeded grocery items & Khata
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </button>

          {/* Tab Switcher: Login vs Signup */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setAuthTab('login')}
              className={`flex-1 py-2 rounded-lg transition-all text-center ${
                authTab === 'login'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthTab('signup')}
              className={`flex-1 py-2 rounded-lg transition-all text-center ${
                authTab === 'signup'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: LOGIN FORM */}
          {/* ========================================================================= */}
          {authTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
              {/* Login Method Toggle */}
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="text-slate-400 font-medium">Login using:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('otp')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      loginMethod === 'otp' ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : 'text-slate-500'
                    }`}
                  >
                    Mobile OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('password')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      loginMethod === 'password' ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : 'text-slate-500'
                    }`}
                  >
                    Password
                  </button>
                </div>
              </div>

              {/* Mobile Number Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono font-bold">
                    +91
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-12 pr-3 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* OTP Field or Password Field */}
              {loginMethod === 'otp' ? (
                <div className="space-y-2">
                  {!otpSent ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendOtp}
                      className="w-full text-xs font-bold border-slate-700 text-slate-200 hover:bg-slate-800"
                    >
                      <span>Get 6-Digit OTP</span>
                    </Button>
                  ) : (
                    <div className="space-y-1 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-bold">Enter OTP (One-Time Password)</span>
                        <span className="text-[10px] text-emerald-400 font-bold">OTP Sent (Test: 123456)</span>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-700 text-white text-center tracking-widest rounded-xl py-2.5 text-sm font-mono font-bold focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
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
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs py-3 rounded-xl border-amber-400 shadow-md gap-2"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In to My Store'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            /* ========================================================================= */
            /* TAB 2: SIGNUP FORM */
            /* ========================================================================= */
            <form onSubmit={handleSignupSubmit} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">Store / Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Mahadev General Store"
                  value={signupStoreName}
                  onChange={(e) => setSignupStoreName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">Owner Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Patil"
                    value={signupOwnerName}
                    onChange={(e) => setSignupOwnerName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">Mobile No. *</label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                  />
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
                  <option value="other">🏢 Other General Business</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Create a password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-3 rounded-xl border-emerald-500 shadow-md gap-2 mt-2"
              >
                <span>{isLoading ? 'Creating Store...' : 'Create Account & Open Store'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Footer Security Badges */}
      <div className="relative z-10 max-w-md mx-auto w-full text-center text-slate-500 text-[11px] space-y-1">
        <div className="flex items-center justify-center gap-3">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Offline & Private</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Zero Subscription Fees</span>
          </span>
        </div>
        <p className="text-[10px] text-slate-600">
          KamaiPlus (Kamai+) • Made with ❤️ for Indian Retailers & Vyaparis
        </p>
      </div>
    </div>
  );
}
