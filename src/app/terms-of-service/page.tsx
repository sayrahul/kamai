import React from 'react';
import Link from 'next/link';
import { FileCheck, ArrowLeft, Scale, CreditCard, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Terms of Service | KamaiPlus',
  description: 'Terms and Conditions for using the KamaiPlus Business Management & POS Platform.',
};

export default function TermsOfServicePage() {
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
            <FileCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>Merchant Agreement</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-500">
            Last Updated: {lastUpdated} • Applicable to all registered stores and users.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed pt-2">
            By accessing, installing, or using the KamaiPlus platform (&quot;Service&quot;), provided by KamaiPlus / ProVenture,
            you agree to be bound by these Terms of Service. Please read them carefully.
          </p>
        </div>

        {/* Sections Content */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-slate-700" />
              <span>1. License & Permitted Use</span>
            </h2>
            <p className="text-xs text-slate-600">
              KamaiPlus grants you a non-exclusive, non-transferable, revocable license to use the web application and progressive
              web app (PWA) for managing retail store billing, inventory tracking, customer khata ledger entries, and business operations.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-700" />
              <span>2. Subscriptions & Payment Terms</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li>
                <strong>Free Tier:</strong> Basic POS billing, catalog management, and digital invoicing without recurring fees.
              </li>
              <li>
                <strong>Pro & Enterprise Tiers:</strong> Premium features (e.g., unlimited GST filing reports, multi-device access,
                advanced voice billing, automated festival campaigns) require an active paid subscription.
              </li>
              <li>
                <strong>Billing Cycles:</strong> Available on monthly or annual prepaid cycles. Prices are in Indian Rupees (INR)
                and inclusive of applicable taxes unless stated otherwise.
              </li>
              <li>
                <strong>Payment Processing:</strong> Payments are processed securely via authorized Indian payment gateways (Razorpay).
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-700" />
              <span>3. Merchant Responsibilities & GST Compliance</span>
            </h2>
            <p className="text-xs text-slate-600">
              As a merchant, you are solely responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>The accuracy of product pricing, GST tax rates (CGST, SGST, IGST), and HSN/SAC codes configured in your store catalog.</li>
              <li>Ensuring that invoices and receipts issued to customers comply with prevailing Indian Goods and Services Tax laws.</li>
              <li>Maintaining local device backups by periodically downloading encrypted `.json` backup files from the Cloud Backup screen.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-700" />
              <span>4. Limitation of Liability</span>
            </h2>
            <p className="text-xs text-slate-600">
              KamaiPlus is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. While we take every measure to ensure high availability
              and data integrity, we shall not be liable for any indirect, incidental, or consequential loss of profits or store data
              arising from hardware failure, browser storage clearing, or internet disruptions.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              5. Governing Law & Jurisdiction
            </h2>
            <p className="text-xs text-slate-600">
              These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes
              arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in
              Maharashtra, India.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3 pt-2">
          <div>© {new Date().getFullYear()} KamaiPlus. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-slate-900 underline font-medium">Privacy Policy</Link>
            <Link href="/refund-policy" className="hover:text-slate-900 underline font-medium">Refund Policy</Link>
            <Link href="/contact-us" className="hover:text-slate-900 underline font-medium">Contact Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
