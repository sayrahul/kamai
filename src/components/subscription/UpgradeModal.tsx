'use client';

import React, { useState, useCallback } from 'react';
import {
  X,
  Check,
  Zap,
  Crown,
  Star,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */
type Plan = 'pro' | 'enterprise';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
  businessName?: string;
  onUpgradeSuccess?: (tier: string) => void;
}

/* ─── Plan Config ─────────────────────────────────────────────── */
const PLANS = [
  {
    id: 'pro' as Plan,
    name: 'Pro',
    price: 299,
    originalPrice: 499,
    icon: Zap,
    color: 'amber',
    badge: 'Most Popular',
    tagline: 'For growing stores',
    features: [
      'Unlimited bills per month',
      'Cloud backup & sync',
      'WhatsApp bill sharing',
      'Up to 3 devices',
      '1 year bill history',
      'GST reports & export',
      'Priority support',
    ],
    notIncluded: ['Multiple staff accounts', 'Custom branding'],
  },
  {
    id: 'enterprise' as Plan,
    name: 'Enterprise',
    price: 799,
    originalPrice: 1299,
    icon: Crown,
    color: 'violet',
    badge: 'Full Power',
    tagline: 'For established businesses',
    features: [
      'Everything in Pro',
      'Unlimited devices',
      'Up to 10 staff accounts',
      'Custom invoice branding',
      'Unlimited bill history',
      'Advanced analytics',
      'Bulk product import',
      'Dedicated support',
    ],
    notIncluded: [],
  },
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

/* ─── Load Razorpay script dynamically ───────────────────────── */
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

/* ═══════════════════════════════════════════════════════════════ */
export function UpgradeModal({ isOpen, onClose, currentTier = 'free', businessName = 'Your Store', onUpgradeSuccess }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('pro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ plan: selectedPlan }),
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
        name: 'KamaiPlus',
        description: orderData.planLabel,
        order_id: orderData.orderId,
        prefill: {
          contact: orderData.phone ? `+91${orderData.phone}` : '',
        },
        notes: {
          plan: selectedPlan,
        },
        theme: {
          color: selectedPlan === 'pro' ? '#F59E0B' : '#8B5CF6',
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
          // 4. Verify payment on our server
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: selectedPlan,
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              onUpgradeSuccess?.(verifyData.tier);
              onClose();
            } else {
              setError(verifyData.error || 'Payment verification failed. Please contact support.');
            }
          } catch {
            setError('Network error during verification. Your payment may have succeeded — please contact support.');
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setError(`Payment failed: ${response.error?.description || 'Please try again.'}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  }, [selectedPlan, onClose, onUpgradeSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-2xl bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Upgrade {businessName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Current: <span className="text-amber-400 font-bold capitalize">{currentTier}</span> Plan
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-600/40 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Plan Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === plan.id;
              const isPro = plan.id === 'pro';

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? isPro
                        ? 'border-amber-400 bg-amber-400/5 shadow-lg shadow-amber-400/10'
                        : 'border-violet-500 bg-violet-500/5 shadow-lg shadow-violet-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  {/* Badge */}
                  <div className="absolute -top-2.5 left-4">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                      isPro ? 'bg-amber-400 text-slate-950' : 'bg-violet-500 text-white'
                    }`}>
                      {plan.badge}
                    </span>
                  </div>

                  {/* Plan header */}
                  <div className="flex items-start justify-between mt-1 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isPro ? 'bg-amber-400/20 text-amber-400' : 'bg-violet-500/20 text-violet-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{plan.name}</div>
                        <div className="text-[10px] text-slate-500">{plan.tagline}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isPro ? 'bg-amber-400' : 'bg-violet-500'
                      }`}>
                        <Check className="w-3 h-3 text-slate-950" />
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-black ${isPro ? 'text-amber-400' : 'text-violet-400'}`}>
                        ₹{plan.price}
                      </span>
                      <span className="text-slate-500 text-xs">/month</span>
                      <span className="text-slate-600 text-xs line-through">₹{plan.originalPrice}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5">
                    {plan.features.slice(0, 5).map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <Check className={`w-3 h-3 flex-shrink-0 ${isPro ? 'text-amber-400' : 'text-violet-400'}`} />
                        {f}
                      </li>
                    ))}
                    {plan.features.length > 5 && (
                      <li className="text-[11px] text-slate-500 pl-4.5">
                        +{plan.features.length - 5} more features
                      </li>
                    )}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* Full feature list for selected plan */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-300 mb-2.5">
              All features in {selectedPlan === 'pro' ? 'Pro' : 'Enterprise'}:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PLANS.find((p) => p.id === selectedPlan)?.features.map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <Check className={`w-3 h-3 flex-shrink-0 ${selectedPlan === 'pro' ? 'text-amber-400' : 'text-violet-400'}`} />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Pay Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleUpgrade}
            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg ${
              selectedPlan === 'pro'
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/25'
                : 'bg-violet-500 hover:bg-violet-400 text-white shadow-violet-500/25'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Opening Payment...
              </>
            ) : (
              <>
                <Star className="w-4 h-4" />
                Pay ₹{PLANS.find((p) => p.id === selectedPlan)?.price}/month
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Trust line */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-600">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-700" />
              Secured by Razorpay
            </span>
            <span>•</span>
            <span>UPI • Card • Netbanking • Wallet</span>
            <span>•</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
