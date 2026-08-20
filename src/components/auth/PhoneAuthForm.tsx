'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Phone, ShieldCheck, ArrowRight, RefreshCw, User, Building2, MessageSquare } from 'lucide-react';
import { setStoredUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const PhoneAuthForm: React.FC = () => {
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [storeName, setStoreName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);

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
                        updated_at: new Date().toISOString(),
                    });
                } else if (data.business) {
                    await db.businesses.put({
                        id: data.business.id || `biz_${Date.now()}`,
                        name: data.business.name || storeName || 'My Store',
                        owner_name: data.user.name || ownerName || 'Store Owner',
                        phone: data.user.phone,
                        business_type: (data.business.business_type as any) || 'grocery',
                        address: data.business.address || '',
                        currency: 'INR',
                        language: 'hi',
                        invoice_prefix: data.business.invoice_prefix || 'INV-',
                        next_invoice_number: data.business.next_invoice_number || 1001,
                        is_onboarded: true,
                        sync_status: 'synced',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });
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
        <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-white">
            {/* Top Graphic Icon */}
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-amber-400 shadow-inner">
                <Store className="w-7 h-7" />
            </div>

            {/* Mode Switcher Tabs */}
            {step === 'PHONE' && (
                <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
                    <button
                        type="button"
                        onClick={() => { setMode('login'); setError(''); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            mode === 'login'
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode('signup'); setError(''); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            mode === 'signup'
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Create New Store
                    </button>
                </div>
            )}

            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                    {step === 'PHONE'
                        ? mode === 'login'
                            ? 'Welcome Back'
                            : 'Register Your Store'
                        : 'WhatsApp Verification'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    {step === 'PHONE'
                        ? mode === 'login'
                            ? 'Enter your registered WhatsApp number'
                            : 'Fill details to launch your digital store'
                        : `We sent a 6-digit code to +91 ${phoneNumber}`}
                </p>
            </div>

            {error && (
                <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-300 text-xs sm:text-sm rounded-xl flex items-start space-x-2">
                    <span className="text-base">⚠️</span>
                    <p className="flex-1 font-medium">{error}</p>
                </div>
            )}

            {step === 'PHONE' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                    {mode === 'signup' && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
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
                                        placeholder="e.g. Ramesh Kirana & General Store"
                                        required={mode === 'signup'}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-white text-sm placeholder:text-slate-600 transition"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
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
                                        placeholder="e.g. Ramesh Kumar"
                                        required={mode === 'signup'}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-white text-sm placeholder:text-slate-600 transition"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                            WhatsApp / Mobile Number
                        </label>
                        <div className="relative flex items-center">
                            <span className="absolute left-3.5 text-slate-400 flex items-center space-x-1 border-r border-slate-800 pr-2.5 text-xs font-semibold">
                                <Phone className="w-3.5 h-3.5 mr-1 text-amber-400" /> +91
                            </span>
                            <input
                                type="tel"
                                maxLength={10}
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                placeholder="98765 43210"
                                required
                                className="w-full pl-22 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-white text-base placeholder:text-slate-600 transition"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-amber-400 hover:bg-amber-500 active:scale-[0.99] text-slate-950 font-black rounded-xl transition shadow-lg shadow-amber-500/10 flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
                    >
                        {loading ? (
                            <span className="flex items-center space-x-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Sending WhatsApp OTP...</span>
                            </span>
                        ) : (
                            <span className="flex items-center space-x-2">
                                <MessageSquare className="w-4 h-4" />
                                <span>Send WhatsApp OTP</span>
                                <ArrowRight className="w-4 h-4" />
                            </span>
                        )}
                    </button>

                    <p className="text-center text-[11px] text-slate-500 mt-3">
                        By continuing, you agree to Kamai+ Terms of Service & Privacy Policy
                    </p>
                </form>
            ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 text-center">
                            Enter 6-Digit WhatsApp OTP
                        </label>
                        <div className="relative flex items-center">
                            <span className="absolute left-3.5 text-amber-400">
                                <ShieldCheck className="w-5 h-5" />
                            </span>
                            <input
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="123456"
                                autoFocus
                                required
                                className="w-full pl-10 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-white text-center text-2xl tracking-[0.4em] font-mono placeholder:text-slate-700 placeholder:tracking-normal transition"
                            />
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs">
                            <span className="text-slate-500">Sent via WhatsApp</span>
                            {cooldown > 0 ? (
                                <span className="text-slate-400 font-mono">Resend in {cooldown}s</span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleSendOtp()}
                                    disabled={loading}
                                    className="text-amber-400 hover:text-amber-300 font-semibold underline"
                                >
                                    Resend OTP
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || otp.length !== 6}
                        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-slate-950 font-black rounded-xl transition shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
                    >
                        {loading ? (
                            <span className="flex items-center space-x-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Verifying...</span>
                            </span>
                        ) : (
                            <span>Verify & Enter Store 🚀</span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => { setStep('PHONE'); setOtp(''); setError(''); }}
                        className="w-full text-center text-xs text-slate-400 hover:text-white underline mt-1 transition"
                    >
                        Change Mobile Number
                    </button>
                </form>
            )}
        </div>
    );
};