'use client';

import React, { useState, useCallback } from 'react';
import {
  X,
  Check,
  Zap,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Crown
} from 'lucide-react';
import { subscriptionService } from '@/lib/subscription/subscriptionService';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
  businessName?: string;
  onUpgradeSuccess?: (tier: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function UpgradeModal({ isOpen, onClose, currentTier = 'free', businessName = 'Your Store', onUpgradeSuccess }: UpgradeModalProps) {
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceAmount = billingCycle === 'annual' ? 2100 : 249;
  const originalPrice = billingCycle === 'annual' ? 3999 : 399;

  const handleUpgrade = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Load Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Failed to load payment gateway. Please check your internet connection.');
        setLoading(false);
        return;
      }

      // 2. Create order on our server
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan: 'pro',
          billingCycle,
        }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        setError(orderData.error || 'Failed to initiate payment. Please try again.');
        setLoading(false);
        return;
      }

      // 3. Open Razorpay checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'KamaiPlus (Kamai+)',
        description: `Kamai+ Pro (${billingCycle === 'annual' ? 'Annual Plan' : 'Monthly Plan'})`,
        order_id: orderData.orderId,
        prefill: {
          contact: orderData.phone ? `+91${orderData.phone}` : '',
        },
        theme: {
          color: '#F59E0B',
          backdrop_color: '#0f172a',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                tier: 'pro',
                billingCycle,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              subscriptionService.activateSubscription('pro', billingCycle, response.razorpay_payment_id);
              onUpgradeSuccess?.('pro');
              onClose();
            } else {
              setError('Payment signature verification failed. Please contact support.');
            }
          } catch (err) {
            console.error('Verify error:', err);
            setError('Error verifying payment. Please reach out to support.');
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setError(resp.error?.description || 'Payment was declined or cancelled.');
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Upgrade flow error:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }, [billingCycle, onUpgradeSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900">
        {/* Top Header */}
        <div className="p-6 pb-4 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-slate-950" />
              <span>Unlock Full POS Power</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">Upgrade to Kamai+ Pro</h2>
            <p className="text-xs text-slate-500 mt-0.5">{businessName}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Cycle Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setBillingCycle('annual')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                billingCycle === 'annual'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual (₹2,100 / yr - 50% Off) 🔥
            </button>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly (₹249 / mo)
            </button>
          </div>

          {/* Price Box */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-center">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-xs text-slate-400 line-through font-mono font-bold">
                ₹{originalPrice}
              </span>
              <span className="text-3xl font-black text-slate-950 font-mono">
                ₹{priceAmount}
              </span>
              <span className="text-xs text-slate-600 font-bold">
                / {billingCycle === 'annual' ? 'year' : 'month'}
              </span>
            </div>
            <p className="text-[11px] text-amber-900 font-extrabold mt-1">
              {billingCycle === 'annual' ? 'Just ₹175 / month • Instant Activation' : 'Billed monthly • Cancel anytime'}
            </p>
          </div>

          {/* Features Checklist */}
          <div className="space-y-2 text-xs py-1">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Automatic Cloud Backup & Multi-Device Sync</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Batch Numbers & Expiry Date Radar (15/30 Days Alert)</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Government GSTR-1 & HSN Tax Filing Reports</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Custom Barcode Sticker Label Printing Studio</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>24/7 Dedicated Phone & WhatsApp Support</span>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="flex-1 font-medium">{error}</p>
            </div>
          )}

          {/* Upgrade Button */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-500 active:scale-[0.99] text-slate-950 font-black text-xs rounded-xl transition shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Connecting to Gateway...</span>
              </span>
            ) : (
              <span>Upgrade to Kamai+ Pro (₹{priceAmount}) 🚀</span>
            )}
          </button>

          <p className="text-center text-[10px] text-slate-400">
            🔒 256-bit Secure Payment via Razorpay UPI & Cards • Instant Invoice with 18% GST ITC
          </p>
        </div>
      </div>
    </div>
  );
}
