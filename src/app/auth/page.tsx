'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store,
  Phone,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  AlertCircle,
  Zap,
  Download,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { db, ensureStarterBusinessIfEmpty } from '@/lib/db';
import {
  AuthUser,
  setStoredUser,
  hasSeenIntro,
  markIntroAsSeen,
  createDemoUser,
} from '@/lib/auth';
import { IntroWalkthrough } from '@/components/auth/IntroWalkthrough';
import { usePWAInstall } from '@/lib/pwa/usePWAInstall';
import { BusinessType } from '@/types';

/* ─── Types ──────────────────────────────────────────────────── */
type AuthMode = 'home' | 'login' | 'signup';
type SignupStep = 'details' | 'otp';
type LoginStep = 'phone' | 'otp';

type StatusMsg = { type: 'success' | 'error' | 'info'; text: string } | null;

/* ─── Constants ───────────────────────────────────────────────── */
const BUSINESS_TYPES: { value: BusinessType; label: string; emoji: string }[] = [
  { value: 'grocery', label: 'Kirana & Grocery', emoji: '🛒' },
  { value: 'clothing', label: 'Clothing & Garments', emoji: '👕' },
  { value: 'electronics', label: 'Electronics & Mobile', emoji: '📱' },
  { value: 'bakery', label: 'Bakery & Sweets', emoji: '🍰' },
  { value: 'restaurant', label: 'Cafe & Restaurant', emoji: '🍛' },
  { value: 'hardware', label: 'Hardware & Electricals', emoji: '🔧' },
  { value: 'stationery', label: 'Stationery & Books', emoji: '📚' },
  { value: 'other', label: 'Other Retail', emoji: '🏢' },
];

/* ─── Small Shared Components ─────────────────────────────────── */
function InputField({
  label,
  icon,
  prefix,
  error,
  ...props
}: {
  label: string;
  icon?: React.ReactNode;
  prefix?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">{label}</label>
      <div className="relative">
        {prefix && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm font-mono font-bold">
            {prefix}
          </div>
        )}
        {icon && !prefix && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`w-full bg-slate-950 border ${error ? 'border-rose-500' : 'border-slate-700 focus:border-amber-400'} text-white rounded-xl ${prefix ? 'pl-12' : icon ? 'pl-10' : 'pl-4'} pr-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 ${error ? 'focus:ring-rose-500/20' : 'focus:ring-amber-400/20'} placeholder:text-slate-600 transition-all`}
        />
      </div>
      {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
    </div>
  );
}

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
        Enter 6-Digit WhatsApp OTP
      </label>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        maxLength={6}
        placeholder="• • • • • •"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        disabled={disabled}
        className="w-full bg-slate-950 border border-emerald-500/50 focus:border-emerald-400 text-emerald-300 text-center tracking-[0.6em] rounded-xl py-4 text-2xl font-mono font-black focus:outline-none focus:ring-2 focus:ring-emerald-400/20 placeholder:text-slate-700 placeholder:tracking-[0.3em] transition-all disabled:opacity-50"
      />
    </div>
  );
}

function StatusBanner({
  msg,
  action,
}: {
  msg: StatusMsg;
  action?: { label: string; onClick: () => void };
}) {
  if (!msg) return null;
  const styles = {
    success: 'bg-emerald-950/80 border-emerald-600/40 text-emerald-300',
    error: 'bg-rose-950/80 border-rose-600/40 text-rose-300',
    info: 'bg-amber-950/80 border-amber-600/40 text-amber-300',
  };
  return (
    <div className={`p-3.5 rounded-xl text-xs flex flex-col gap-2 border ${styles[msg.type]}`}>
      <div className="flex items-start gap-2">
        {msg.type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        )}
        <span className="leading-relaxed flex-1">{msg.text}</span>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="self-start text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all cursor-pointer shadow-sm mt-1"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function WhatsAppBadge({ phone }: { phone: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/30">
      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
        <MessageSquare className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xs font-bold text-emerald-300">OTP sent to WhatsApp</p>
        <p className="text-[11px] text-slate-400">+91 {phone.slice(-10)}</p>
      </div>
      <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto flex-shrink-0" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* MAIN PAGE COMPONENT                                            */
/* ═══════════════════════════════════════════════════════════════ */
export default function AuthPage() {
  const router = useRouter();
  const { isInstalled: isPWAInstalled, triggerInstall } = usePWAInstall();
  const [isClient, setIsClient] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [mode, setMode] = useState<AuthMode>('home');

  // ─── Login state ───────────────────────────────────────────────
  const [loginStep, setLoginStep] = useState<LoginStep>('phone');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginStatus, setLoginStatus] = useState<StatusMsg>(null);
  const [loginStatusAction, setLoginStatusAction] = useState<{ label: string; onClick: () => void } | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginSending, setLoginSending] = useState(false);
  const [loginCooldown, setLoginCooldown] = useState(0);

  // ─── Signup state ──────────────────────────────────────────────
  const [signupStep, setSignupStep] = useState<SignupStep>('details');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupStoreName, setSignupStoreName] = useState('');
  const [signupOwnerName, setSignupOwnerName] = useState('');
  const [signupCategory, setSignupCategory] = useState<BusinessType>('grocery');
  const [signupPin, setSignupPin] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [signupStatus, setSignupStatus] = useState<StatusMsg>(null);
  const [signupStatusAction, setSignupStatusAction] = useState<{ label: string; onClick: () => void } | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSending, setSignupSending] = useState(false);
  const [signupCooldown, setSignupCooldown] = useState(0);

  // ─── Field errors ─────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsClient(true);
    if (!hasSeenIntro()) setShowIntro(true);
  }, []);

  // Cooldown timers
  useEffect(() => {
    if (loginCooldown <= 0) return;
    const t = setTimeout(() => setLoginCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [loginCooldown]);

  useEffect(() => {
    if (signupCooldown <= 0) return;
    const t = setTimeout(() => setSignupCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [signupCooldown]);

  /* ─── Helpers ─────────────────────────────────────────────── */
  const cleanPhone = (raw: string) => raw.replace(/\D/g, '').slice(-10);
  const isValidPhone = (p: string) => /^[6-9]\d{9}$/.test(p);

  async function saveBusinessToLocal(business: any, phone: string, category: BusinessType) {
    await db.businesses.put({
      id: business.id,
      name: business.name,
      business_type: business.business_type || category,
      owner_name: business.owner_name || '',
      phone: business.phone || phone,
      address: '',
      pincode: '',
      gstin: '',
      upi_id: `${phone}@upi`,
      currency: 'INR',
      language: 'hi',
      invoice_prefix: 'INV-',
      next_invoice_number: 1,
      terms_conditions: 'Thank you for your business!',
      footer_message: 'Powered by KamaiPlus',
      is_onboarded: true,
      created_at: business.created_at || new Date().toISOString(),
      updated_at: business.updated_at || new Date().toISOString(),
      sync_status: 'synced',
    });
  }

  function buildAuthUser(data: any, phone: string): AuthUser {
    return {
      id: data.user.id,
      name: data.user.name || 'Store Owner',
      phone: data.user.phone || phone,
      business_id: data.user.business_id,
      business_name: data.user.business_name || data.business?.name,
      subscription_tier: data.user.subscription_tier || 'free',
      subscription_valid_until: data.user.subscription_valid_until,
      role: data.user.role || 'owner',
      created_at: new Date().toISOString(),
      token: `token_${Date.now()}`,
    };
  }

  /* ─── Login Handlers ─────────────────────────────────────── */
  async function handleLoginSendOtp() {
    const phone = cleanPhone(loginPhone);
    if (!isValidPhone(phone)) {
      setLoginStatus({ type: 'error', text: 'Please enter a valid 10-digit mobile number starting with 6-9.' });
      setLoginStatusAction(null);
      return;
    }
    setLoginSending(true);
    setLoginStatus(null);
    setLoginStatusAction(null);
    try {
      const res = await fetch('/api/auth/send-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, mode: 'login' }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setLoginStep('otp');
        setLoginOtp('');
        setLoginCooldown(60);
        setLoginStatus({ type: 'success', text: `OTP sent to your WhatsApp (+91 ${phone}).` });
        setLoginStatusAction(null);
      } else {
        if (data.requireSignup) {
          setLoginStatus({
            type: 'error',
            text: `+91 ${phone} is not registered. Please register your store first.`,
          });
          setLoginStatusAction({
            label: 'Register Store Now →',
            onClick: () => {
              resetSignup();
              setMode('signup');
              setSignupPhone(phone);
              setLoginStatus(null);
            },
          });
        } else if (data.devOtp) {
          // Development/Testing fallback when WhatsApp Cloud API is restricted
          setLoginStep('otp');
          setLoginOtp(data.devOtp);
          setLoginCooldown(60);
          setLoginStatus({
            type: 'info',
            text: `Meta WhatsApp Sandbox Error: Recipient not in Meta test list. Test OTP is: ${data.devOtp}`,
          });
          setLoginStatusAction({
            label: `Auto-Fill Test OTP (${data.devOtp})`,
            onClick: () => setLoginOtp(data.devOtp),
          });
        } else if (data.isAccessDenied) {
          setLoginStatus({
            type: 'error',
            text: data.error || 'WhatsApp Delivery Failed (#131005): Meta App is in Development Mode. Please add this number to the Meta test list or use Demo Mode.',
          });
          setLoginStatusAction({
            label: '⚡ Open Demo Store Instantly',
            onClick: handleDemoLogin,
          });
        } else {
          setLoginStatus({ type: 'error', text: data.error || 'Failed to send OTP. Please try again.' });
          setLoginStatusAction({
            label: '⚡ Try Demo Mode',
            onClick: handleDemoLogin,
          });
        }
      }
    } catch {
      setLoginStatus({ type: 'error', text: 'Network error. Please check your connection and try again.' });
      setLoginStatusAction(null);
    } finally {
      setLoginSending(false);
    }
  }

  async function handleLoginVerifyOtp() {
    const phone = cleanPhone(loginPhone);
    if (loginOtp.length !== 6) {
      setLoginStatus({ type: 'error', text: 'Please enter the complete 6-digit OTP from WhatsApp.' });
      setLoginStatusAction(null);
      return;
    }
    setLoginLoading(true);
    setLoginStatus(null);
    setLoginStatusAction(null);
    try {
      const res = await fetch('/api/auth/verify-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: loginOtp, mode: 'login' }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.business) await saveBusinessToLocal(data.business, phone, 'grocery');
        const user = buildAuthUser(data, phone);
        setStoredUser(user);
        markIntroAsSeen();
        router.push('/');
      } else {
        if (data.requireSignup) {
          setLoginStatus({ type: 'error', text: 'This number is not registered. Please create an account.' });
          setLoginStatusAction({
            label: 'Register Store Now →',
            onClick: () => { setMode('signup'); setSignupPhone(phone); },
          });
        } else {
          setLoginStatus({ type: 'error', text: data.error || 'Incorrect OTP. Please try again.' });
          setLoginStatusAction(null);
        }
      }
    } catch {
      setLoginStatus({ type: 'error', text: 'Network error. Please try again.' });
      setLoginStatusAction(null);
    } finally {
      setLoginLoading(false);
    }
  }

  /* ─── Signup Handlers ────────────────────────────────────── */
  function validateSignupDetails(): boolean {
    const errors: Record<string, string> = {};
    const phone = cleanPhone(signupPhone);
    if (!isValidPhone(phone)) errors.phone = 'Enter a valid 10-digit number (starts with 6–9).';
    if (!signupStoreName.trim()) errors.storeName = 'Store name is required.';
    if (!signupOwnerName.trim()) errors.ownerName = 'Owner name is required.';
    if (signupPin && !/^\d{4,6}$/.test(signupPin)) errors.pin = 'PIN must be 4 to 6 digits (optional).';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSignupSendOtp() {
    if (!validateSignupDetails()) return;
    const phone = cleanPhone(signupPhone);
    setSignupSending(true);
    setSignupStatus(null);
    setSignupStatusAction(null);
    try {
      const res = await fetch('/api/auth/send-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, mode: 'signup' }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSignupStep('otp');
        setSignupOtp('');
        setSignupCooldown(60);
        setSignupStatus({ type: 'success', text: `Verification OTP sent to WhatsApp (+91 ${phone}).` });
        setSignupStatusAction(null);
      } else {
        if (data.requireLogin) {
          setSignupStatus({
            type: 'error',
            text: `+91 ${phone} is already registered. Please sign in instead.`,
          });
          setSignupStatusAction({
            label: 'Sign In Now →',
            onClick: () => {
              setMode('login');
              setLoginPhone(phone);
              setSignupStatus(null);
            },
          });
        } else if (data.devOtp) {
          setSignupStep('otp');
          setSignupOtp(data.devOtp);
          setSignupCooldown(60);
          setSignupStatus({
            type: 'info',
            text: `Meta WhatsApp Sandbox Error: Recipient not in Meta test list. Test OTP is: ${data.devOtp}`,
          });
          setSignupStatusAction({
            label: `Auto-Fill Test OTP (${data.devOtp})`,
            onClick: () => setSignupOtp(data.devOtp),
          });
        } else if (data.isAccessDenied) {
          setSignupStatus({
            type: 'error',
            text: data.error || 'WhatsApp Delivery Failed (#131005): Meta App is in Development Mode. Please add this number to the Meta test list or use Demo Mode.',
          });
          setSignupStatusAction({
            label: '⚡ Open Demo Store Instantly',
            onClick: handleDemoLogin,
          });
        } else {
          setSignupStatus({ type: 'error', text: data.error || 'Failed to send OTP. Please try again.' });
          setSignupStatusAction({
            label: '⚡ Try Demo Mode',
            onClick: handleDemoLogin,
          });
        }
      }
    } catch {
      setSignupStatus({ type: 'error', text: 'Network error. Please check connection.' });
      setSignupStatusAction(null);
    } finally {
      setSignupSending(false);
    }
  }

  async function handleSignupVerifyOtp() {
    const phone = cleanPhone(signupPhone);
    if (signupOtp.length !== 6) {
      setSignupStatus({ type: 'error', text: 'Please enter the complete 6-digit OTP from WhatsApp.' });
      return;
    }
    setSignupLoading(true);
    setSignupStatus(null);
    try {
      const res = await fetch('/api/auth/verify-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          otp: signupOtp,
          mode: 'signup',
          storeName: signupStoreName.trim(),
          ownerName: signupOwnerName.trim(),
          businessType: signupCategory,
          pin: signupPin.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.business) await saveBusinessToLocal(data.business, phone, signupCategory);
        const user = buildAuthUser(data, phone);
        setStoredUser(user);
        markIntroAsSeen();
        router.push('/');
      } else {
        if (data.requireLogin) {
          setSignupStatus({ type: 'error', text: 'This number is already registered. Signing you in...' });
          setTimeout(() => { setMode('login'); setLoginPhone(phone); }, 2200);
        } else {
          setSignupStatus({ type: 'error', text: data.error || 'Registration failed. Please check your OTP.' });
        }
      }
    } catch {
      setSignupStatus({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSignupLoading(false);
    }
  }

  const handleDemoLogin = async () => {
    setLoginLoading(true);
    try {
      await ensureStarterBusinessIfEmpty();
      const demoUser = createDemoUser();
      setStoredUser(demoUser);
      markIntroAsSeen();
      router.push('/');
    } catch {
      router.push('/');
    } finally {
      setLoginLoading(false);
    }
  };

  /* ─── Reset helpers ──────────────────────────────────────── */
  function resetLogin() {
    setLoginStep('phone');
    setLoginOtp('');
    setLoginStatus(null);
    setLoginCooldown(0);
  }

  function resetSignup() {
    setSignupStep('details');
    setSignupOtp('');
    setSignupStatus(null);
    setSignupCooldown(0);
    setFieldErrors({});
  }

  /* ─── Render Guards ──────────────────────────────────────── */
  if (!isClient) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  if (showIntro) {
    return <IntroWalkthrough onComplete={() => { markIntroAsSeen(); setShowIntro(false); }} onSkip={() => { markIntroAsSeen(); setShowIntro(false); }} />;
  }

  /* ═══════════════════════════════════════════════════════════ */
  /* HOME SCREEN                                                  */
  /* ═══════════════════════════════════════════════════════════ */
  if (mode === 'home') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col p-5 sm:p-8">
        {/* Top Bar */}
        <div className="max-w-md mx-auto w-full flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Kamai+" className="w-9 h-9 object-contain" />
            <div>
              <div className="text-sm font-black tracking-tight text-white">KamaiPlus</div>
              <div className="text-[10px] text-slate-500 font-medium">Smart Billing for Indian Stores</div>
            </div>
          </div>
          <div className="flex gap-2">
            {!isPWAInstalled && (
              <button
                onClick={triggerInstall}
                className="text-[11px] font-bold text-slate-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer hover:border-amber-400/40 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Install
              </button>
            )}
            <button
              onClick={() => setShowIntro(true)}
              className="text-[11px] font-bold text-amber-400 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-400/30 bg-amber-400/5 cursor-pointer hover:bg-amber-400/10 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tour
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center space-y-6">
          <div className="text-center space-y-3 pt-2">
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">
              Billing Made<br />
              <span className="text-amber-400">Kamai Wala</span> 🚀
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
              Complete POS system for your store. Works offline. Syncs on cloud.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {['GST Bills', 'Khata (Ledger)', 'Inventory', 'Cloud Backup', 'WhatsApp'].map((f) => (
              <span key={f} className="text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded-full">
                {f}
              </span>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* Register */}
            <button
              onClick={() => { resetSignup(); setMode('signup'); }}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-4 rounded-2xl flex items-center justify-between px-5 cursor-pointer transition-all shadow-lg shadow-amber-400/20 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-sm">Register Your Store</div>
                  <div className="text-[10px] font-semibold opacity-70">New store • WhatsApp verification</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Login */}
            <button
              onClick={() => { resetLogin(); setMode('login'); }}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-400/40 text-white font-bold py-4 rounded-2xl flex items-center justify-between px-5 cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <div className="text-left">
                  <div className="text-sm">Sign In to My Store</div>
                  <div className="text-[10px] font-semibold text-slate-400">Existing account • WhatsApp OTP</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>

            {/* Demo */}
            <button
              onClick={handleDemoLogin}
              disabled={loginLoading}
              className="w-full border border-dashed border-slate-700 hover:border-amber-400/50 text-slate-400 hover:text-amber-400 py-3.5 rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer text-sm font-semibold transition-all active:scale-[0.98]"
            >
              <Zap className="w-4 h-4" />
              <span>Explore Demo (No Sign Up)</span>
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600 pt-2">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Offline Billing
            </span>
            <span className="text-slate-800">•</span>
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-amber-700" />
              10,000+ Merchants
            </span>
            <span className="text-slate-800">•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
              GST Compliant
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════ */
  /* LOGIN FLOW                                                   */
  /* ═══════════════════════════════════════════════════════════ */
  if (mode === 'login') {
    const phone = cleanPhone(loginPhone);
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col p-5 sm:p-8">
        {/* Back */}
        <div className="max-w-md mx-auto w-full mb-6">
          <button
            onClick={() => { resetLogin(); setMode('home'); }}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
          {/* Header */}
          <div className="mb-6 space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-white">
              {loginStep === 'phone' ? 'Welcome Back!' : 'Verify OTP'}
            </h1>
            <p className="text-sm text-slate-400">
              {loginStep === 'phone'
                ? 'Sign in with your WhatsApp number.'
                : `Enter the 6-digit code sent to WhatsApp`}
            </p>
          </div>

          {/* Step Progress */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`h-1 flex-1 rounded-full transition-all ${loginStep === 'phone' ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            <div className={`h-1 flex-1 rounded-full transition-all ${loginStep === 'otp' ? 'bg-emerald-500' : 'bg-slate-700'}`} />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <StatusBanner msg={loginStatus} action={loginStatusAction || undefined} />

            {loginStep === 'phone' ? (
              <>
                <InputField
                  label="Registered Mobile Number"
                  prefix="+91"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  value={loginPhone}
                  onChange={(e) => {
                    setLoginPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setLoginStatus(null);
                  }}
                  autoFocus
                />

                <button
                  type="button"
                  disabled={loginSending || phone.length < 10}
                  onClick={handleLoginSendOtp}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] text-sm"
                >
                  {loginSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      Send WhatsApp OTP
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-500">
                  New to KamaiPlus?{' '}
                  <button
                    onClick={() => { resetSignup(); setMode('signup'); setSignupPhone(loginPhone); }}
                    className="text-amber-400 font-bold hover:underline cursor-pointer"
                  >
                    Register your store →
                  </button>
                </p>
              </>
            ) : (
              <>
                <WhatsAppBadge phone={phone} />
                <OtpInput value={loginOtp} onChange={setLoginOtp} disabled={loginLoading} />

                <button
                  type="button"
                  disabled={loginLoading || loginOtp.length < 6}
                  onClick={handleLoginVerifyOtp}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] text-sm"
                >
                  {loginLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Verify & Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    onClick={() => { setLoginStep('phone'); setLoginOtp(''); setLoginStatus(null); }}
                    className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Change number
                  </button>
                  <button
                    disabled={loginCooldown > 0 || loginSending}
                    onClick={handleLoginSendOtp}
                    className="text-emerald-400 hover:text-emerald-300 font-bold disabled:text-slate-600 cursor-pointer"
                  >
                    {loginCooldown > 0 ? `Resend in ${loginCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════ */
  /* SIGNUP FLOW                                                  */
  /* ═══════════════════════════════════════════════════════════ */
  const signupPhoneClean = cleanPhone(signupPhone);
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-5 sm:p-8">
      {/* Back */}
      <div className="max-w-md mx-auto w-full mb-6">
        <button
          onClick={() => {
            if (signupStep === 'otp') {
              setSignupStep('details');
              setSignupStatus(null);
            } else {
              resetSignup();
              setMode('home');
            }
          }}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {signupStep === 'otp' ? 'Back to Details' : 'Back'}
        </button>
      </div>

      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
        {/* Header */}
        <div className="mb-6 space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
              <Store className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white">
            {signupStep === 'details' ? 'Register Your Store' : 'Verify WhatsApp'}
          </h1>
          <p className="text-sm text-slate-400">
            {signupStep === 'details'
              ? 'Fill in your store details to get started.'
              : `Enter the OTP we just sent to +91 ${signupPhoneClean}`}
          </p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-1 flex-1 rounded-full bg-amber-400" />
          <div className={`h-1 flex-1 rounded-full transition-all ${signupStep === 'otp' ? 'bg-amber-400' : 'bg-slate-700'}`} />
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide mb-5 -mt-3 px-1">
          <span className="text-amber-400">1. Store Info</span>
          <span className={signupStep === 'otp' ? 'text-amber-400' : 'text-slate-600'}>2. WhatsApp OTP</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
          <StatusBanner msg={signupStatus} action={signupStatusAction || undefined} />

          {signupStep === 'details' ? (
            <div className="space-y-4 mt-1">
              <InputField
                label="Store / Business Name *"
                icon={<Store className="w-4 h-4" />}
                type="text"
                placeholder="e.g. Mahadev Super Market"
                value={signupStoreName}
                onChange={(e) => { setSignupStoreName(e.target.value); setFieldErrors((err) => ({ ...err, storeName: '' })); }}
                error={fieldErrors.storeName}
                autoFocus
              />

              <InputField
                label="Owner Name *"
                icon={<User className="w-4 h-4" />}
                type="text"
                placeholder="e.g. Rahul Patil"
                value={signupOwnerName}
                onChange={(e) => { setSignupOwnerName(e.target.value); setFieldErrors((err) => ({ ...err, ownerName: '' })); }}
                error={fieldErrors.ownerName}
              />

              <InputField
                label="WhatsApp Mobile Number *"
                prefix="+91"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                value={signupPhone}
                onChange={(e) => { setSignupPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setFieldErrors((err) => ({ ...err, phone: '' })); }}
                error={fieldErrors.phone}
              />

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                  Business Category
                </label>
                <select
                  value={signupCategory}
                  onChange={(e) => setSignupCategory(e.target.value as BusinessType)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 text-white rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all"
                >
                  {BUSINESS_TYPES.map((bt) => (
                    <option key={bt.value} value={bt.value}>
                      {bt.emoji} {bt.label}
                    </option>
                  ))}
                </select>
              </div>

              <InputField
                label="Security PIN (Optional — 4 to 6 digits)"
                icon={<ShieldCheck className="w-4 h-4" />}
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Set a PIN for cashier login"
                value={signupPin}
                onChange={(e) => { setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setFieldErrors((err) => ({ ...err, pin: '' })); }}
                error={fieldErrors.pin}
              />

              <button
                type="button"
                disabled={signupSending}
                onClick={handleSignupSendOtp}
                className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-400/20 active:scale-[0.98] text-sm"
              >
                {signupSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending OTP to WhatsApp...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    Continue — Send WhatsApp OTP
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-500">
                Already have an account?{' '}
                <button
                  onClick={() => { resetLogin(); setMode('login'); setLoginPhone(signupPhone); }}
                  className="text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  Sign In →
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-4 mt-1">
              <WhatsAppBadge phone={signupPhoneClean} />
              <OtpInput value={signupOtp} onChange={setSignupOtp} disabled={signupLoading} />

              <button
                type="button"
                disabled={signupLoading || signupOtp.length < 6}
                onClick={handleSignupVerifyOtp}
                className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-400/20 active:scale-[0.98] text-sm"
              >
                {signupLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating your store...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Verify & Open My Store
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px]">
                <button
                  onClick={() => { setSignupStep('details'); setSignupOtp(''); setSignupStatus(null); }}
                  className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Edit details
                </button>
                <button
                  disabled={signupCooldown > 0 || signupSending}
                  onClick={handleSignupSendOtp}
                  className="text-amber-400 hover:text-amber-300 font-bold disabled:text-slate-600 cursor-pointer"
                >
                  {signupCooldown > 0 ? `Resend in ${signupCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
