'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/db/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Store, Phone, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';

export const PhoneAuthForm: React.FC = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Initialize reCAPTCHA container on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && !(window as any).recaptchaVerifier) {
            try {
                (window as any).recaptchaVerifier = new RecaptchaVerifier(
                    auth,
                    'recaptcha-container',
                    {
                        size: 'invisible',
                        callback: () => { },
                    }
                );
            } catch (err) {
                console.error('reCAPTCHA init error:', err);
            }
        }
    }, []);

    // Handler 1: Send OTP to Phone
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneNumber || phoneNumber.length < 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
            const appVerifier = (window as any).recaptchaVerifier;

            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(confirmation);
            setStep('OTP');
        } catch (err: any) {
            console.error('SMS send error:', err);
            setError(err.message || 'Failed to send verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handler 2: Verify OTP & Initialize Random/Unique Shop Profile
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmationResult) return;

        setLoading(true);
        setError('');

        try {
            const result = await confirmationResult.confirm(otp);
            const user = result.user;

            // Generate a unique random business ID and default shop configuration for new signups
            const randomBusinessId = `biz_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;

            const userData = {
                uid: user.uid,
                phone: user.phoneNumber || phoneNumber,
                name: 'Shop Merchant',
                business_id: randomBusinessId,
                shop_name: 'My Retail Store',
                role: 'admin',
                createdAt: new Date().toISOString()
            };

            // Store session securely
            localStorage.setItem('kamai_user', JSON.stringify(userData));

            // Dispatch events to refresh layout state instantly
            window.dispatchEvent(new Event('auth_changed'));
            window.dispatchEvent(new Event('storage'));

            // Navigate into the main application dashboard
            router.replace('/');
        } catch (err: any) {
            console.error('OTP verification error:', err);
            setError('Invalid verification code. Please check and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 text-white">
            <div id="recaptcha-container"></div>

            {/* Top Graphic Icon */}
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-400 shadow-inner">
                <Store className="w-7 h-7" />
            </div>

            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Merchant Portal</h2>
                <p className="text-sm text-slate-400 mt-1">
                    {step === 'PHONE' ? 'Enter your mobile number to sign in or register' : 'Enter the verification code sent to your phone'}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center space-x-2">
                    <span>⚠️</span>
                    <p>{error}</p>
                </div>
            )}

            {step === 'PHONE' ? (
                <form onSubmit={handleSendOtp} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            WhatsApp / Mobile Number
                        </label>
                        <div className="relative flex items-center">
                            <span className="absolute left-4 text-slate-400 flex items-center space-x-1 border-r border-slate-700 pr-3 text-sm font-medium">
                                <Phone className="w-4 h-4 mr-1 text-amber-400" /> +91
                            </span>
                            <input
                                type="tel"
                                maxLength={10}
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                placeholder="98765 43210"
                                required
                                className="w-full pl-24 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-white text-lg placeholder:text-slate-600 transition"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-bold rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="flex items-center space-x-2">
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span>Sending OTP...</span>
                            </span>
                        ) : (
                            <span className="flex items-center space-x-2">
                                <span>Continue with OTP</span>
                                <ArrowRight className="w-5 h-5" />
                            </span>
                        )}
                    </button>

                    <p className="text-center text-xs text-slate-500 mt-4">
                        By continuing, you agree to Kamai+ Terms of Service & Privacy Policy
                    </p>
                </form>
            ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Enter 6-Digit Code
                        </label>
                        <div className="relative flex items-center">
                            <span className="absolute left-4 text-amber-400">
                                <ShieldCheck className="w-5 h-5" />
                            </span>
                            <input
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="123456"
                                required
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-white text-center text-2xl tracking-[0.5em] placeholder:text-slate-700 placeholder:tracking-normal transition"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2 text-right">Code sent to +91 {phoneNumber}</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="flex items-center space-x-2">
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span>Verifying...</span>
                            </span>
                        ) : (
                            <span>Verify & Launch Shop 🚀</span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => { setStep('PHONE'); setOtp(''); }}
                        className="w-full text-center text-xs text-slate-400 hover:text-white underline mt-2 transition"
                    >
                        Change Mobile Number
                    </button>
                </form>
            )}
        </div>
    );
};