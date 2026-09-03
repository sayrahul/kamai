import React from 'react';
import Link from 'next/link';
import { RotateCcw, ArrowLeft, CheckCircle2, Clock, HelpCircle, Mail, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Cancellation & Refund Policy | KamaiPlus',
  description: 'Cancellation and refund policies for KamaiPlus subscription plans and services.',
};

export default function RefundPolicyPage() {
  const lastUpdated = 'August 17, 2026';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold bg-white text-slate-800">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to App</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Kamai+" className="w-6 h-6 object-contain" />
            <span className="font-extrabold text-sm text-slate-900">KamaiPlus</span>
          </div>
        </div>

        {/* Title & Introduction */}
        <div className="space-y-3 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>Fair & Transparent Policy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Cancellation & Refund Policy
          </h1>
          <p className="text-xs text-slate-500">
            Last Updated: {lastUpdated} • Customer protection standard.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed pt-2">
            At KamaiPlus, we strive to provide the best POS billing and business management software experience for Indian retailers.
            If you are not satisfied with your paid subscription plan, this policy outlines how cancellations and refunds are handled.
          </p>
        </div>

        {/* Content Breakdown */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Section 1: 7-Day Money-Back Guarantee */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>1. 7-Day Money-Back Guarantee (Pro & Enterprise Plans)</span>
            </h2>
            <p className="text-xs text-slate-600">
              We offer a <strong>100% full refund within 7 days</strong> of your initial Pro or Enterprise plan purchase if you are
              not completely satisfied with the software.
            </p>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-medium">
              ✓ <strong>No Questions Asked:</strong> If you request a refund within 7 calendar days of subscription activation,
              we will process a full refund to your original payment method.
            </div>
          </section>

          {/* Section 2: Cancellation Policy */}
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-700" />
              <span>2. Subscription Cancellation</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li>
                You can cancel your subscription at any time by contacting our support team or visiting the Settings / Upgrade page.
              </li>
              <li>
                Upon cancellation after the 7-day period, your account will remain on the paid tier until the end of your current
                prepaid billing period, and will then automatically revert to the <strong>Free Forever Tier</strong> with full access
                to your local store data preserved.
              </li>
            </ul>
          </section>

          {/* Section 3: Refund Process & Timeline */}
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-slate-700" />
              <span>3. Refund Processing Time (SLA)</span>
            </h2>
            <p className="text-xs text-slate-600">
              Approved refunds are initiated within <strong>24 to 48 hours</strong> of request approval. The refunded amount
              will be credited back to your original source account (UPI, Bank Account, or Card) within <strong>5 to 7 business days</strong>,
              as per standard Indian banking and Razorpay gateway settlement cycles.
            </p>
          </section>

          {/* Section 4: How to Request a Refund */}
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-700" />
              <span>4. How to Request a Cancellation or Refund</span>
            </h2>
            <p className="text-xs text-slate-600">
              To request a refund, please send an email with your registered store phone number and payment receipt / reference ID to:
            </p>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-900">
              <div><strong>Support Email:</strong> <span className="font-mono text-emerald-800 font-bold">info@proventure.in</span></div>
              <div><strong>Subject Line:</strong> Refund Request - [Your Store Name / Mobile Number]</div>
              <div><strong>Operating Entity:</strong> KamaiPlus / ProVenture</div>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3 pt-2">
          <div>© {new Date().getFullYear()} KamaiPlus. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-slate-900 underline font-medium">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-slate-900 underline font-medium">Terms of Service</Link>
            <Link href="/contact-us" className="hover:text-slate-900 underline font-medium">Contact Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
