'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  X,
  Check,
  Zap,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Crown,
  Calendar,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { subscriptionService, SubscriptionState } from '@/lib/subscription/subscriptionService';
import { db } from '@/lib/db';

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

export function UpgradeModal({ isOpen, onClose, currentTier, businessName = 'Your Store', onUpgradeSuccess }: UpgradeModalProps) {
  const [subscription, setSubscription] = useState<SubscriptionState>(() => subscriptionService.getSubscription());
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveAnnualPrice, setLiveAnnualPrice] = useState<number>(1499);
  const [liveMonthlyPrice, setLiveMonthlyPrice] = useState<number>(199);
  const [showExtendForm, setShowExtendForm] = useState(false);

  useEffect(() => {
    setSubscription(subscriptionService.getSubscription());
    const handleSubChange = () => {
      setSubscription(subscriptionService.getSubscription());
    };
    window.addEventListener('subscription_changed', handleSubChange);

    fetch('/api/admin/config')
      .then((res) => res.json())
      .then((data) => {
        if (data?.config?.proAnnualPrice) setLiveAnnualPrice(data.config.proAnnualPrice);
        if (data?.config?.proMonthlyPrice) setLiveMonthlyPrice(data.config.proMonthlyPrice);
      })
      .catch(() => {});

    return () => window.removeEventListener('subscription_changed', handleSubChange);
  }, [isOpen]);

  const isPro = subscription.tier === 'pro' || subscription.tier === 'enterprise' || currentTier === 'pro' || currentTier === 'enterprise';

  const priceAmount = billingCycle === 'annual' ? liveAnnualPrice : liveMonthlyPrice;
  const originalPrice = billingCycle === 'annual' ? liveAnnualPrice * 2 : liveMonthlyPrice * 2;

  const handleUpgrade = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch current business profile for contact info
      const biz = await db.businesses.toCollection().first();

      // 2. Load Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Failed to load payment gateway. Please check your internet connection.');
        setLoading(false);
        return;
      }

      // 3. Create order on our server
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan: 'pro',
          billingCycle,
          businessId: biz?.id,
          phone: biz?.phone,
        }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        setError(orderData.error || 'Failed to initiate payment. Please try again.');
        setLoading(false);
        return;
      }

      // 4. Open Razorpay checkout modal
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
                businessId: biz?.id,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              subscriptionService.activateSubscription('pro', billingCycle, response.razorpay_payment_id);
              onUpgradeSuccess?.('pro');
              setShowExtendForm(false);
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
    } catch (e: any) {
      console.error('Upgrade flow failed:', e);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }, [billingCycle, onUpgradeSuccess, onClose]);

  if (!isOpen) return null;

  // =========================================================================
  // VIEW 1: ACTIVE PRO SUBSCRIBER DASHBOARD (For Pro / Enterprise Users)
  // =========================================================================
  if (isPro && !showExtendForm) {
    const formattedExpiry = subscription.activeUntil
      ? new Date(subscription.activeUntil).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Active';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-white border border-emerald-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900">
          {/* Top Header */}
          <div className="p-6 pb-5 bg-gradient-to-br from-emerald-500/15 via-amber-400/10 to-transparent border-b border-slate-100 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center shadow-md shadow-amber-400/20 text-slate-950 flex-shrink-0">
                <Crown className="w-6 h-6 fill-slate-950" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  <span>Kamai+ PRO Active</span>
                </div>
                <h2 className="text-lg font-black text-slate-900 leading-tight">You Are a PRO Member</h2>
                <p className="text-xs text-slate-500">{businessName}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-4">
            {/* Status Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-slate-200/70 pb-2.5">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Current Tier:
                </span>
                <span className="font-black text-slate-900 px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                  Kamai+ Pro ({subscription.billingCycle === 'monthly' ? 'Monthly' : 'Annual'})
                </span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-slate-200/70 pb-2.5">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Valid Until:
                </span>
                <span className="font-bold text-emerald-700">{formattedExpiry}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-slate-400" />
                  Status:
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-black text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  All Features Unlocked
                </span>
              </div>
            </div>

            {/* Active Benefits Checklist */}
            <div className="space-y-2 text-xs py-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                ✨ Active PRO Benefits:
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-700">
                <div className="flex items-center gap-2 font-bold">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Unlimited Real-Time Cloud Backup &amp; Sync</span>
                </div>
                <div className="flex items-center gap-2 font-bold">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Batch Expiry Date Radar (15/30 Days Alerts)</span>
                </div>
                <div className="flex items-center gap-2 font-bold">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Government GSTR-1 &amp; HSN Filing Reports</span>
                </div>
                <div className="flex items-center gap-2 font-bold">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Barcode Studio &amp; Custom Label Printing</span>
                </div>
                <div className="flex items-center gap-2 font-bold">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>WhatsApp Festival Greetings &amp; Customer Win-Back</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue Using Pro</span>
              </button>

              <button
                type="button"
                onClick={() => setShowExtendForm(true)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Extend / Renew Subscription</span>
              </button>
            </div>

            <p className="text-center text-[10px] text-slate-400">
              Need assistance? WhatsApp Support: +91 91723 39886
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: UPGRADE / RENEWAL CHECKOUT (For Free Users or Extending Pro)
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900">
        {/* Top Header */}
        <div className="p-6 pb-4 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-slate-950" />
              <span>{isPro ? 'Extend Pro Membership' : 'Unlock Full POS Power'}</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">
              {isPro ? 'Renew Kamai+ Pro' : 'Upgrade to Kamai+ Pro'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{businessName}</p>
          </div>

          <button
            onClick={() => {
              setShowExtendForm(false);
              onClose();
            }}
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
              Annual (₹1,499 / yr - 50% Off) 🔥
            </button>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly (₹199 / mo)
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
              {billingCycle === 'annual' ? 'Just ₹125 / month • Instant 1-Year Access' : 'Billed monthly • Cancel anytime'}
            </p>
          </div>

          {/* Free Included vs Pro Features */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-700">
              🎁 100% Free Forever on All Accounts:
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 font-semibold">
              <div>✓ Unlimited POS Billing</div>
              <div>✓ 100% Offline Database</div>
              <div>✓ Customer Khata Ledger</div>
              <div>✓ Full JSON Backup/Restore</div>
              <div>✓ Thermal &amp; PDF Invoices</div>
              <div>✓ Dynamic UPI QR on Bills</div>
            </div>
          </div>

          {/* Pro Features Checklist */}
          <div className="space-y-2 text-xs py-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-950">
              ⚡ What You Unlock with Pro:
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Automatic Cloud Backup &amp; Multi-Device Sync</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Batch Numbers &amp; Expiry Date Radar (15/30 Days Alert)</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Government GSTR-1 &amp; HSN Tax Filing Reports</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Custom Barcode Sticker Label Printing Studio</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>WhatsApp Festival Greetings &amp; Customer Win-Back</span>
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
              <span>{isPro ? `Renew Kamai+ Pro (₹${priceAmount}) 🚀` : `Upgrade to Kamai+ Pro (₹${priceAmount}) 🚀`}</span>
            )}
          </button>

          <p className="text-center text-[10px] text-slate-400">
            🔒 256-bit Secure Payment via Razorpay UPI &amp; Cards • Instant Invoice with 18% GST ITC
          </p>
        </div>
      </div>
    </div>
  );
}
