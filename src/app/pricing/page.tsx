'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Check, 
  X, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Receipt, 
  Barcode, 
  TrendingUp, 
  FileSpreadsheet, 
  Lock, 
  Palette, 
  Mic, 
  Boxes,
  MessageCircle,
  HelpCircle,
  ArrowRight,
  Info,
  Crown,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/utils';
import { SubscriptionTier, subscriptionService, SubscriptionState } from '@/lib/subscription/subscriptionService';
import { UPIPaymentModal } from '@/components/pricing/UPIPaymentModal';

export type PlanDuration = '1year' | '1month';

export default function PricingPage() {
  const [duration, setDuration] = useState<PlanDuration>('1year');
  const [subscription, setSubscription] = useState<SubscriptionState>({ tier: 'free', billingCycle: 'annual' });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);
  const [liveAnnualPrice, setLiveAnnualPrice] = useState<number>(1499);
  const [liveMonthlyPrice, setLiveMonthlyPrice] = useState<number>(199);

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
  }, []);

  const proPrices = {
    '1year': {
      original: (liveAnnualPrice * 2) * 100,
      discounted: liveAnnualPrice * 100,
      monthlyEquivalent: `₹${Math.round(liveAnnualPrice / 12)}.00 / month`,
      savings: 'Save 50%'
    },
    '1month': {
      original: (liveMonthlyPrice * 2) * 100,
      discounted: liveMonthlyPrice * 100,
      monthlyEquivalent: 'Billed monthly',
      savings: 'Standard'
    },
  };

  const currentProPrice = proPrices[duration];
  const isCurrentlyPro = subscription.tier === 'pro' || subscription.tier === 'enterprise';

  const formattedExpiry = subscription.activeUntil
    ? new Date(subscription.activeUntil).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Active';

  const faqs = [
    {
      q: 'Can I use the Free plan forever without paying?',
      a: 'Yes, absolutely! The Free plan allows unlimited basic POS billing, local store management, and customer Khata ledger with zero time limit and no credit card required.'
    },
    {
      q: 'What is included in the Paid (Pro) plan?',
      a: 'The Pro plan unlocks all advanced tools: automatic WhatsApp cloud bills, expiry date radar, GSTR-1 tax export, custom barcode tag printing, low-stock purchase orders, and 24/7 priority support.'
    },
    {
      q: 'How does payment and activation work?',
      a: 'You can pay instantly via UPI (Google Pay, PhonePe, Paytm, BHIM) or Credit/Debit Card through Razorpay. Your store is upgraded to Pro immediately.'
    },
    {
      q: 'Can I use Kamai+ offline without internet?',
      a: 'Yes! All counter billing, barcode scanning, thermal printing, and Khata ledger operate 100% offline. Internet is only used for cloud backup and sending WhatsApp messages.'
    },
    {
      q: 'Can I claim 18% GST Input Tax Credit (ITC)?',
      a: 'Yes. An official GST B2B tax invoice is generated for every paid subscription so you can claim full GST input tax credit.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Active Pro Member Banner */}
      {isCurrentlyPro ? (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-xl border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-md flex-shrink-0">
              <Crown className="w-7 h-7 fill-amber-400" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950 text-white text-[10px] font-black uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Kamai+ PRO Active</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                You Are a Kamai+ PRO Member
              </h2>
              <p className="text-xs text-slate-900/80 font-bold flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Next Renewal / Valid Until: {formattedExpiry}</span>
              </p>
            </div>
          </div>

          <Button
            onClick={() => setIsPaymentModalOpen(true)}
            className="bg-slate-950 hover:bg-slate-900 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md border-none cursor-pointer flex items-center gap-1.5 flex-shrink-0"
          >
            <span>Extend / Renew Plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : null}

      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>{isCurrentlyPro ? 'Subscription Plans & Details' : 'Simple & Transparent Plans'}</span>
        </span>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {isCurrentlyPro ? 'Your Store Plan & Benefits' : 'Choose the Perfect Plan for Your Store'}
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          {isCurrentlyPro 
            ? 'Your store has active access to all premium multi-counter, cloud, and tax features.' 
            : 'Start for free forever, or upgrade to Pro to unlock automated WhatsApp bills, GST filing and expiry tracking.'}
        </p>

        {/* Billing Duration Switcher */}
        <div className="flex items-center justify-center gap-2 pt-3">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 inline-flex items-center">
            <button
              onClick={() => setDuration('1year')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                duration === '1year'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual (50% Off) 🔥
            </button>
            <button
              onClick={() => setDuration('1month')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                duration === '1month'
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* 2-PLAN COMPARISON CARDS (FREE vs PAID) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* ========================================================= */}
        {/* CARD 1: FREE PLAN */}
        {/* ========================================================= */}
        <div className={`bg-white border rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-xs ${
          isCurrentlyPro ? 'border-slate-200 opacity-80' : 'border-slate-300'
        }`}>
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">Free Forever</h3>
                <p className="text-xs text-slate-500 mt-0.5">Essential counter billing for small shops</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-slate-100 text-slate-700">
                ₹0 Free
              </span>
            </div>

            {/* Price Block */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 font-mono">
                  ₹0
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  / lifetime free
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">
                No credit card or payment required
              </div>
            </div>

            {/* CTA Button */}
            <Button
              variant="outline"
              disabled={true}
              className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs justify-center cursor-default opacity-80"
            >
              {isCurrentlyPro ? 'Base Plan Included' : '✓ Your Current Plan'}
            </Button>

            {/* Features Checklist */}
            <div className="space-y-2.5 text-xs pt-2">
              <div className="flex items-center gap-2.5 font-semibold text-slate-800">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>POS Counter Billing & Item Search</span>
              </div>
              <div className="flex items-center gap-2.5 font-semibold text-slate-800">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Customer Credit Khata Ledger</span>
              </div>
              <div className="flex items-center gap-2.5 font-semibold text-slate-800">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Cash Register Note Counter & Till Tally</span>
              </div>
              <div className="flex items-center gap-2.5 font-semibold text-slate-800">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Standard Thermal Print & WhatsApp Link</span>
              </div>
              <div className="flex items-center gap-2.5 font-semibold text-slate-800">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>100% Offline Local Database</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400">
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span>Automatic Cloud Backup & Sync</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400">
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span>Expiry Date Radar & Batch Numbers</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400">
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span>GSTR-1 Tax Reports & HSN Filing</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400">
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span>Custom Barcode Sticker Label Printing</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 2: PAID PLAN (KAMAI+ PRO) */}
        {/* ========================================================= */}
        <div className={`bg-white border-2 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-md relative ${
          isCurrentlyPro ? 'border-emerald-400 ring-2 ring-emerald-400/20' : 'border-amber-400'
        }`}>
          {/* Top Pill */}
          <div className={`absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${
            isCurrentlyPro ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-slate-950'
          }`}>
            {isCurrentlyPro ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-white" />
                <span>Your Active Plan</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-slate-950" />
                <span>All Features Included</span>
              </>
            )}
          </div>

          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>Kamai+ Pro</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                    isCurrentlyPro ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {isCurrentlyPro ? 'ACTIVE' : 'PAID'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Complete digital supermarket & retail suite</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                {currentProPrice.savings}
              </span>
            </div>

            {/* Price Block */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/70 to-orange-50/50 border border-amber-200">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-400 line-through font-mono font-bold">
                  {formatINR(currentProPrice.original)}
                </span>
                <span className="text-3xl font-black text-slate-900 font-mono">
                  {formatINR(currentProPrice.discounted)}
                </span>
                <span className="text-xs text-slate-600 font-semibold">
                  / {duration === '1month' ? 'month' : 'year'}
                </span>
              </div>
              <div className="text-[11px] text-amber-900 font-extrabold mt-1">
                {currentProPrice.monthlyEquivalent}
              </div>
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => setIsPaymentModalOpen(true)}
              className={`w-full py-3 rounded-xl font-black text-xs justify-center shadow-md border-none cursor-pointer ${
                isCurrentlyPro 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' 
                  : 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-amber-400/20'
              }`}
            >
              {isCurrentlyPro ? '✓ Active Plan (Manage / Extend) 🚀' : 'Upgrade to Kamai+ Pro 🚀'}
            </Button>

            {/* Features Checklist */}
            <div className="space-y-2.5 text-xs pt-2">
              <div className="flex items-center gap-2.5 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Everything in Free Forever</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Automatic Cloud Backup & Multi-Device Sync</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Batch Numbers & Expiry Date Radar (15/30 Days Alert)</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Government GSTR-1 & HSN Tax Filing Reports</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Custom Barcode Sticker Label Printing Studio</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>1-Click Low-Stock WhatsApp Purchase Orders</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Staff Roles & Cashier Lock PINs</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>All Professional Invoice Designer Themes</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold text-slate-900">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>24/7 Dedicated Priority Phone & WhatsApp Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <h3 className="text-lg font-black text-slate-900 text-center">Frequently Asked Questions</h3>
        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-4 bg-white border border-slate-200 rounded-xl cursor-pointer"
              onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
            >
              <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                <span>{faq.q}</span>
                <span className="text-slate-400">{openFaqIdx === idx ? '−' : '+'}</span>
              </div>
              {openFaqIdx === idx && (
                <p className="text-xs text-slate-600 mt-2 leading-relaxed pt-2 border-t border-slate-100">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* UPI / Razorpay Payment Modal */}
      <UPIPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        tier="pro"
        billingCycle={duration === '1month' ? 'monthly' : 'annual'}
        amountPaise={currentProPrice.discounted}
      />
    </div>
  );
}
