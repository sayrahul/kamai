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
  RefreshCw,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { db, ensureStarterBusinessIfEmpty } from '@/lib/db';
import {
  AuthUser,
  setStoredUser,
  markIntroAsSeen,
  createDemoUser,
} from '@/lib/auth';
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

/* ─── Small Shared Components (Android App Style - No Shadow, No Transition, No Animation) ─── */
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
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{label}</label>
      <div className="relative">
        {prefix && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-xs font-bold text-slate-300 bg-slate-800/90 px-2 py-1 rounded-md border border-slate-700 font-mono">
              {prefix}
            </span>
          </div>
        )}
        {icon && !prefix && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`w-full bg-slate-950 border ${error ? 'border-rose-500' : 'border-slate-800 focus:border-amber-400'} text-white rounded-xl ${prefix ? 'pl-20' : icon ? 'pl-10' : 'pl-4'} pr-4 py-3.5 text-sm font-semibold focus:outline-none placeholder:text-slate-600`}
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
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Enter 6-Digit WhatsApp OTP
        </label>
        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
          WhatsApp Verified
        </span>
      </div>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        maxLength={6}
        placeholder="••••••"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        disabled={disabled}
        className="w-full bg-slate-950 border border-emerald-500/70 focus:border-emerald-400 text-emerald-400 text-center tracking-[0.7em] rounded-xl py-3.5 text-2xl font-mono font-black focus:outline-none placeholder:text-slate-700 placeholder:tracking-[0.4em] disabled:opacity-50"
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
    success: 'bg-emerald-950 border-emerald-700 text-emerald-300',
    error: 'bg-rose-950 border-rose-700 text-rose-300',
    info: 'bg-amber-950 border-amber-700 text-amber-300',
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
          className="self-start text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer mt-1"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function WhatsAppBadge({ phone }: { phone: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/60">
      <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
        <MessageSquare className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-emerald-300">OTP sent to WhatsApp</p>
        <p className="text-[11px] text-slate-400 font-mono">+91 {phone.slice(-10)}</p>
      </div>
      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
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
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'demo'>('signin');
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

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
              setActiveTab('signup');
              setSignupPhone(phone);
              setLoginStatus(null);
            },
          });
        } else if (data.devOtp) {
          setLoginStep('otp');
          setLoginOtp(data.devOtp);
          setLoginCooldown(60);
          setLoginStatus({
            type: 'info',
            text: `Meta Sandbox Mode: Test OTP is ${data.devOtp}`,
          });
          setLoginStatusAction({
            label: `Auto-Fill Test OTP (${data.devOtp})`,
            onClick: () => setLoginOtp(data.devOtp),
          });
        } else if (data.isAccessDenied) {
          setLoginStatus({
            type: 'error',
            text: data.error || 'WhatsApp Delivery Failed (#131005): Meta App in Development Mode.',
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
      setLoginStatus({ type: 'error', text: 'Network error. Please check your connection.' });
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
            onClick: () => { setActiveTab('signup'); setSignupPhone(phone); },
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
              setActiveTab('signin');
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
            text: `Meta Sandbox Mode: Test OTP is ${data.devOtp}`,
          });
          setSignupStatusAction({
            label: `Auto-Fill Test OTP (${data.devOtp})`,
            onClick: () => setSignupOtp(data.devOtp),
          });
        } else if (data.isAccessDenied) {
          setSignupStatus({
            type: 'error',
            text: data.error || 'WhatsApp Delivery Failed (#131005): Meta App in Development Mode.',
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
          setTimeout(() => { setActiveTab('signin'); setLoginPhone(phone); }, 1500);
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
        <div className="rounded-full h-8 w-8 border-2 border-slate-700 border-t-amber-400" />
      </div>
    );
  }

  const loginPhoneClean = cleanPhone(loginPhone);
  const signupPhoneClean = cleanPhone(signupPhone);

  const features = [
    { id: 'offline', name: '100% Offline POS', desc: 'Bill continuously without internet. Syncs to cloud when back online.' },
    { id: 'gst', name: 'GST Invoices', desc: 'Generate B2B / B2C GST compliant bills and direct thermal print receipts.' },
    { id: 'khata', name: 'Khata Ledger', desc: 'Send automatic WhatsApp payment reminders and collect dues faster.' },
    { id: 'stock', name: 'Smart Inventory', desc: 'Real-time stock tracking with barcode scanning & low stock alerts.' },
  ];

  /* ═══════════════════════════════════════════════════════════ */
  /* ANDROID APP STYLE AUTH CONTAINER                            */
  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 pb-24 sm:pb-8 select-none font-sans">
      {/* ─── Android Top System / App Bar ─── */}
      <div className="max-w-md mx-auto w-full">
        <div className="flex items-center justify-between py-2 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 font-black flex items-center justify-center text-base border border-amber-300">
              क+
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white tracking-tight">KamaiPlus</span>
                <span className="text-[9px] font-bold bg-amber-400/10 text-amber-400 px-1.5 py-0.2 rounded border border-amber-400/30">
                  POS v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Smart Retail POS for Indian Stores</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isPWAInstalled && (
              <button
                type="button"
                onClick={triggerInstall}
                className="text-[11px] font-bold text-slate-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer hover:border-slate-500"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                App
              </button>
            )}
          </div>
        </div>

        {/* ─── Android Segmented Mode Tabs ─── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 grid grid-cols-3 gap-1 mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('signin'); resetLogin(); }}
            className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'signin'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signup'); resetSignup(); }}
            className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'signup'
                ? 'bg-amber-400 text-slate-950 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            New Store
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('demo'); }}
            className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'demo'
                ? 'bg-slate-800 text-amber-400 border border-amber-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Demo
          </button>
        </div>
      </div>

      {/* ─── Android Content Card ─── */}
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center my-2">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          
          {/* ══════════════════════════════════════════════════ */}
          {/* TAB 1: SIGN IN (WhatsApp OTP)                      */}
          {/* ══════════════════════════════════════════════════ */}
          {activeTab === 'signin' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                <div>
                  <h2 className="text-lg font-black text-white">
                    {loginStep === 'phone' ? 'Store Owner Login' : 'Enter WhatsApp Code'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {loginStep === 'phone'
                      ? 'Enter registered WhatsApp number'
                      : `Code sent to +91 ${loginPhoneClean}`}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              <StatusBanner msg={loginStatus} action={loginStatusAction || undefined} />

              {loginStep === 'phone' ? (
                <div className="space-y-3.5">
                  <InputField
                    label="Mobile Number"
                    prefix="🇮🇳 +91"
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
                    disabled={loginSending || loginPhoneClean.length < 10}
                    onClick={handleLoginSendOtp}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {loginSending ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Sending WhatsApp OTP...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        <span>Get WhatsApp OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-1 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60">
                    <span>New shop or counter?</span>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('signup'); resetSignup(); }}
                      className="text-amber-400 font-bold hover:underline cursor-pointer"
                    >
                      Register store →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <WhatsAppBadge phone={loginPhoneClean} />
                  <OtpInput value={loginOtp} onChange={setLoginOtp} disabled={loginLoading} />

                  <button
                    type="button"
                    disabled={loginLoading || loginOtp.length < 6}
                    onClick={handleLoginVerifyOtp}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {loginLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify & Open POS</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => { setLoginStep('phone'); setLoginOtp(''); setLoginStatus(null); }}
                      className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Change number
                    </button>
                    <button
                      type="button"
                      disabled={loginCooldown > 0 || loginSending}
                      onClick={handleLoginSendOtp}
                      className="text-emerald-400 hover:text-emerald-300 font-bold disabled:text-slate-600 cursor-pointer"
                    >
                      {loginCooldown > 0 ? `Resend in ${loginCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* TAB 2: REGISTER STORE                               */}
          {/* ══════════════════════════════════════════════════ */}
          {activeTab === 'signup' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                <div>
                  <h2 className="text-lg font-black text-white">
                    {signupStep === 'details' ? 'Create Store Profile' : 'Verify WhatsApp'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {signupStep === 'details'
                      ? 'Instant setup • Works 100% offline'
                      : `Enter 6-digit OTP sent to +91 ${signupPhoneClean}`}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
                  <Store className="w-4 h-4 text-amber-400" />
                </div>
              </div>

              <StatusBanner msg={signupStatus} action={signupStatusAction || undefined} />

              {signupStep === 'details' ? (
                <div className="space-y-3">
                  <InputField
                    label="Store Name *"
                    icon={<Store className="w-4 h-4" />}
                    type="text"
                    placeholder="e.g. Krishna Super Market"
                    value={signupStoreName}
                    onChange={(e) => { setSignupStoreName(e.target.value); setFieldErrors((err) => ({ ...err, storeName: '' })); }}
                    error={fieldErrors.storeName}
                    autoFocus
                  />

                  <InputField
                    label="Owner / Cashier Name *"
                    icon={<User className="w-4 h-4" />}
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={signupOwnerName}
                    onChange={(e) => { setSignupOwnerName(e.target.value); setFieldErrors((err) => ({ ...err, ownerName: '' })); }}
                    error={fieldErrors.ownerName}
                  />

                  <InputField
                    label="WhatsApp Number *"
                    prefix="🇮🇳 +91"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    value={signupPhone}
                    onChange={(e) => { setSignupPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setFieldErrors((err) => ({ ...err, phone: '' })); }}
                    error={fieldErrors.phone}
                  />

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Business Type
                    </label>
                    <select
                      value={signupCategory}
                      onChange={(e) => setSignupCategory(e.target.value as BusinessType)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white rounded-xl px-3.5 py-3 text-sm font-semibold focus:outline-none cursor-pointer"
                    >
                      {BUSINESS_TYPES.map((bt) => (
                        <option key={bt.value} value={bt.value} className="bg-slate-900 text-white">
                          {bt.emoji} {bt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <InputField
                    label="Cashier PIN (Optional — 4 to 6 digits)"
                    icon={<ShieldCheck className="w-4 h-4" />}
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Quick pin for billing lock"
                    value={signupPin}
                    onChange={(e) => { setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setFieldErrors((err) => ({ ...err, pin: '' })); }}
                    error={fieldErrors.pin}
                  />

                  <button
                    type="button"
                    disabled={signupSending}
                    onClick={handleSignupSendOtp}
                    className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {signupSending ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        <span>Continue with WhatsApp OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-1 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60">
                    <span>Already registered?</span>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('signin'); resetLogin(); setLoginPhone(signupPhone); }}
                      className="text-emerald-400 font-bold hover:underline cursor-pointer"
                    >
                      Sign In →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <WhatsAppBadge phone={signupPhoneClean} />
                  <OtpInput value={signupOtp} onChange={setSignupOtp} disabled={signupLoading} />

                  <button
                    type="button"
                    disabled={signupLoading || signupOtp.length < 6}
                    onClick={handleSignupVerifyOtp}
                    className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {signupLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Creating store...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify & Launch Store</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => { setSignupStep('details'); setSignupOtp(''); setSignupStatus(null); }}
                      className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Edit details
                    </button>
                    <button
                      type="button"
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
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* TAB 3: DEMO MODE (Instant Access)                  */}
          {/* ══════════════════════════════════════════════════ */}
          {activeTab === 'demo' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                <div>
                  <h2 className="text-lg font-black text-white">Instant Demo Store</h2>
                  <p className="text-xs text-slate-400">Explore complete POS with sample data</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-200">Included in Demo Store:</div>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>Preloaded Grocery & Retail sample items</li>
                  <li>Instant Barcode Scanner & Quick POS Billing</li>
                  <li>Thermal Receipt Generator (58mm & 80mm)</li>
                  <li>Customer Khata Ledger with WhatsApp reminders</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loginLoading}
                className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Loading Demo...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Enter Demo Store (No Sign Up)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                <span className="text-slate-500">Ready to use your own data?</span>
                <button
                  type="button"
                  onClick={() => { setActiveTab('signup'); resetSignup(); }}
                  className="text-amber-400 font-bold hover:underline cursor-pointer"
                >
                  Register Store →
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ─── Interactive Feature Explorer (Android Chips) ─── */}
        <div className="mt-4 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
            Tap features to explore
          </div>
          <div className="grid grid-cols-2 gap-2">
            {features.map((f) => {
              const isSelected = selectedFeature === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFeature(isSelected ? null : f.id)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-amber-400 text-white'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>{f.name}</span>
                    <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400 rotate-90' : 'text-slate-500'}`} />
                  </div>
                  {isSelected && (
                    <p className="text-[10px] text-slate-300 mt-1.5 leading-relaxed pt-1.5 border-t border-slate-700">
                      {f.desc}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Android Minimalist Footer ─── */}
      <div className="max-w-md mx-auto w-full pt-3 pb-1 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-300">100% Offline Safe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-slate-300">10k+ Indian Shops</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-slate-300">GST Ready</span>
          </div>
        </div>
        <div className="text-center text-[10px] text-slate-600 mt-2 font-medium">
          Made with ❤️ for Indian Retailers & Kirana Stores
        </div>
      </div>
    </div>
  );
}

