'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Phone, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  User, 
  Building2, 
  Store,
  MessageSquare,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { setStoredUser } from '@/lib/auth';
import { db, seedBusinessStarterData } from '@/lib/db';
import { BusinessType } from '@/types';
import { getAllStoreProfiles, getStoreProfile } from '@/lib/constants/storeProfiles';

export const PhoneAuthForm: React.FC = () => {
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [selectedCategory, setSelectedCategory] = useState<BusinessType>('grocery');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [storeName, setStoreName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);

    const storeProfiles = getAllStoreProfiles();
    const activeProfile = getStoreProfile(selectedCategory);

    // Cooldown countdown timer for OTP resend
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    // Send WhatsApp OTP Handler
    const handleSendOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }

        if (mode === 'signup') {
            if (!storeName.trim()) {
                setError('Please enter your store or business name.');
                return;
            }
            if (!ownerName.trim()) {
                setError('Please enter the owner or manager name.');
                return;
            }
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/send-whatsapp-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: cleanPhone,
                    mode,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                if (data.requireSignup) {
                    setError(data.error || 'No store found with this number. Please register your store.');
                    setMode('signup');
                } else if (data.requireLogin) {
                    setError(data.error || 'An account already exists with this number. Please sign in.');
                    setMode('login');
                } else {
                    setError(data.error || 'Failed to send WhatsApp verification code. Please try again.');
                }
                return;
            }

            setStep('OTP');
            setCooldown(60); // 60 seconds rate-limit cooldown
        } catch (err: any) {
            console.error('Send OTP error:', err);
            setError('Network error. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    // Verify OTP Handler
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanOtp = otp.trim();
        if (!cleanOtp || cleanOtp.length !== 6) {
            setError('Please enter the complete 6-digit WhatsApp OTP code.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/verify-whatsapp-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phoneNumber.replace(/\D/g, ''),
                    otp: cleanOtp,
                    mode,
                    storeName: storeName.trim(),
                    ownerName: ownerName.trim(),
                    businessType: selectedCategory,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || 'Invalid or expired OTP code.');
                return;
            }

            // Sync user to client state
            const userData = {
                uid: data.user.id,
                id: data.user.id,
                phone: data.user.phone,
                name: data.user.name,
                business_id: data.user.business_id,
                business_name: data.business?.name || storeName || 'My Store',
                role: data.user.role || 'owner',
            };

            setStoredUser(userData);

            // Sync business info to local Dexie if needed
            try {
                if (!db.isOpen()) await db.open();
                const existingBiz = await db.businesses.toCollection().first();
                if (existingBiz) {
                    await db.businesses.update(existingBiz.id, {
                        name: data.business?.name || storeName || existingBiz.name,
                        owner_name: data.user.name || ownerName || existingBiz.owner_name,
                        phone: data.user.phone || existingBiz.phone,
                        business_type: selectedCategory || existingBiz.business_type || 'grocery',
                        updated_at: new Date().toISOString(),
                    });
                } else if (data.business) {
                    const bizId = data.business.id || `biz_${Date.now()}`;
                    await db.businesses.put({
                        id: bizId,
                        name: data.business.name || storeName || 'My Store',
                        owner_name: data.user.name || ownerName || 'Store Owner',
                        phone: data.user.phone,
                        business_type: (data.business.business_type as any) || selectedCategory || 'grocery',
                        address: data.business.address || '',
                        currency: 'INR',
                        language: 'hi',
                        invoice_prefix: data.business.invoice_prefix || 'INV-',
                        next_invoice_number: data.business.next_invoice_number || 1001,
                        terms_conditions: activeProfile.placeholders.invoiceFooterNote,
                        footer_message: activeProfile.placeholders.invoiceFooterNote,
                        is_onboarded: true,
                        sync_status: 'synced',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });

                    // Seed customized category starter catalog
                    await seedBusinessStarterData(bizId, selectedCategory);
                }
            } catch (dexieErr) {
                console.warn('Local DB sync warning:', dexieErr);
            }

            // Dispatch global event
            window.dispatchEvent(new Event('auth_changed'));
            window.dispatchEvent(new Event('storage'));

            // Navigate to Dashboard
            router.replace('/');
        } catch (err: any) {
            console.error('Verify OTP error:', err);
            setError('Failed to verify OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-white transition-all">
            {/* Mode Switcher Tabs */}
            {step === 'PHONE' && (
                <div className="flex bg-slate-950 p-1.5 rounded-2xl mb-6 border border-slate-800/80">
                    <button
                        type="button"
                        onClick={() => { setMode('login'); setError(''); }}
                        className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            mode === 'login'
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <span>Sign In</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode('signup'); setError(''); }}
                        className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            mode === 'signup'
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <span>Create Store</span>
                    </button>
                </div>
            )}

            {/* Step Heading */}
            <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {step === 'PHONE'
                        ? mode === 'login'
                            ? 'Welcome Back'
                            : 'Register Your Business'
                        : 'Enter WhatsApp OTP'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    {step === 'PHONE'
                        ? mode === 'login'
                            ? 'Enter your 10-digit WhatsApp number to sign in'
                            : 'Fill store details to launch your digital store'
                        : `6-digit verification code sent to +91 ${phoneNumber}`}
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                    <p className="flex-1 font-medium leading-relaxed">{error}</p>
                </div>
            )}

            {step === 'PHONE' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                    {mode === 'signup' && (
                        <>
                            {/* Business Category Dropdown */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Select Shop Category
                                </label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3.5 text-slate-500">
                                        <Store className="w-4 h-4 text-amber-400" />
                                    </span>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value as BusinessType)}
                                        className="w-full pl-10 pr-10 py-3 bg-slate-950/80 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:outline-none text-white text-sm appearance-none cursor-pointer transition font-medium"
                                    >
                                        {storeProfiles.map((p) => (
                                            <option key={p.id} value={p.id} className="bg-slate-900 text-white py-2">
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="absolute right-3.5 pointer-events-none text-slate-400">
                                        <ChevronDown className="w-4 h-4" />
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Store / Business Name
                                </label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3.5 text-slate-500">
                                        <Building2 className="w-4 h-4 text-amber-400" />
                                    </span>
                                    <input
                                        type="text"
                                        value={storeName}
                                        onChange={(e) => setStoreName(e.target.value)}
                                        placeholder={
                                            selectedCategory === 'pharmacy' ? 'e.g. Sanjeevani Medical & Pharmacy' :
                                            selectedCategory === 'restaurant' ? 'e.g. Royal Cafe & Restro' :
                                            selectedCategory === 'clothing' ? 'e.g. Fashion Point Men & Kids Wear' :
                                            selectedCategory === 'electronics' ? 'e.g. Om Sai Mobile & Electronics' :
                                            selectedCategory === 'hardware' ? 'e.g. Bharat Hardware & Paints' :
                                            selectedCategory === 'electrical' ? 'e.g. Laxmi Electricals & Lights' :
                                            'e.g. Ramesh Kirana & General Store'
                                        }
                                        required={mode === 'signup'}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:outline-none text-white text-sm placeholder:text-slate-600 transition"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Owner / Manager Name
                                </label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3.5 text-slate-500">
                                        <User className="w-4 h-4 text-amber-400" />
                                    </span>
                                    <input
                                        type="text"
                                        value={ownerName}
                                        onChange={(e) => setOwnerName(e.target.value)}
                                        placeholder="e.g. Ramesh Sharma"
                                        required={mode === 'signup'}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:outline-none text-white text-sm placeholder:text-slate-600 transition"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* WhatsApp / Mobile Number Input with Fixed Prefix */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            WhatsApp / Mobile Number
                        </label>
                        <div className="flex rounded-xl overflow-hidden border border-slate-800 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition bg-slate-950">
                            {/* Country Prefix Block */}
                            <div className="flex items-center gap-1.5 px-3.5 py-3 bg-slate-900/90 border-r border-slate-800 text-slate-200 text-xs font-bold select-none flex-shrink-0">
                                <span className="text-sm">🇮🇳</span>
                                <span className="text-amber-400 font-mono">+91</span>
                            </div>

                            {/* Mobile Input */}
                            <input
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                placeholder="98765 43210"
                                required
                                className="flex-1 px-4 py-3 bg-transparent text-white text-base font-mono tracking-wide placeholder:text-slate-600 placeholder:font-sans focus:outline-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || phoneNumber.length < 10}
                        className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:scale-[0.99] text-slate-950 font-black text-sm rounded-xl transition shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-3"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Sending WhatsApp OTP...</span>
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-slate-950 fill-slate-950" />
                                <span>Send WhatsApp OTP</span>
                                <ArrowRight className="w-4 h-4" />
                            </span>
                        )}
                    </button>

                    <p className="text-center text-[11px] text-slate-500 pt-1">
                        By continuing, you agree to Kamai+ Terms of Service & Privacy Policy
                    </p>
                </form>
            ) : (
                /* OTP Verification Step */
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
                            Enter 6-Digit WhatsApp OTP
                        </label>
                        
                        <div className="relative">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="123456"
                                autoFocus
                                required
                                className="w-full py-3.5 px-4 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none text-white text-center text-2xl tracking-[0.5em] font-mono placeholder:text-slate-700 placeholder:tracking-normal transition"
                            />
                        </div>

                        <div className="flex items-center justify-between mt-3 text-xs">
                            <span className="text-slate-500 flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Sent via WhatsApp</span>
                            </span>
                            
                            {cooldown > 0 ? (
                                <span className="text-slate-400 font-mono">Resend in {cooldown}s</span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleSendOtp()}
                                    disabled={loading}
                                    className="text-amber-400 hover:text-amber-300 font-bold underline transition"
                                >
                                    Resend Code
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || otp.length !== 6}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.99] text-white font-black text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                <span>Verifying...</span>
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Verify & Enter Store 🚀</span>
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => { setStep('PHONE'); setOtp(''); setError(''); }}
                        className="w-full text-center text-xs text-slate-400 hover:text-white underline transition pt-1"
                    >
                        Change Mobile Number
                    </button>
                </form>
            )}
        </div>
    );
};