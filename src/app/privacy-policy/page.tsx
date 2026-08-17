import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock, Database, Eye, Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Privacy Policy | KamaiPlus',
  description: 'Privacy policy and data protection practices of KamaiPlus Business Management Platform.',
};

export default function PrivacyPolicyPage() {
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Data Privacy & Security Standard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-500">
            Last Updated: {lastUpdated} • Applicable to all KamaiPlus web and mobile applications.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed pt-2">
            KamaiPlus (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the KamaiPlus platform at{' '}
            <strong className="text-slate-800">kamaiplus.proventure.in</strong>. We are committed to protecting the privacy
            of small business owners, retail merchants, and their store data. This policy explains how information is
            collected, stored, and protected.
          </p>
        </div>

        {/* Section Content */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-700" />
              <span>1. Offline-First Architecture & Store Data Ownership</span>
            </h2>
            <p>
              KamaiPlus is built on an <strong>offline-first local architecture</strong>. Your operational business records—including
              product catalogs, inventory movements, sales invoices, customer khata credit balances, and expense entries—are
              stored directly on your device inside your browser&apos;s local IndexedDB database (via Dexie.js).
            </p>
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              ✓ <strong>Your Data Belongs to You:</strong> We do not sell, scrape, or monetize your store&apos;s financial data,
              customer phone numbers, or inventory prices.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-700" />
              <span>2. Information We Collect</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li>
                <strong>Account & Profile Details:</strong> Merchant mobile number, business name, owner name, business type,
                and optional GSTIN / UPI ID provided during registration.
              </li>
              <li>
                <strong>Authentication Credentials:</strong> Security PIN (stored as an irreversible salted bcrypt hash) to
                authenticate staff access.
              </li>
              <li>
                <strong>Subscription & Payment Information:</strong> Payment reference ID, subscription tier, and validity dates
                processed securely via authorized payment gateways (e.g. Razorpay).
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-700" />
              <span>3. How We Use Information</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>To provide, maintain, and authenticate your store session.</li>
              <li>To verify subscription status and enable premium plan features (Pro & Enterprise).</li>
              <li>To provide optional manual encrypted data backups and restore capabilities.</li>
              <li>To provide customer support and service-related notifications.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-700" />
              <span>4. Third-Party Services & Payment Gateways</span>
            </h2>
            <p className="text-xs text-slate-600">
              We integrate with trusted service providers strictly to deliver core infrastructure:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>
                <strong>Supabase (PostgreSQL Cloud):</strong> For encrypted staff authentication and subscription records.
              </li>
              <li>
                <strong>Razorpay:</strong> Payment processing for plan upgrades. All credit card, UPI, and banking details are
                handled directly by Razorpay in compliance with RBI guidelines and PCI-DSS standards.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-700" />
              <span>5. Contact & Grievance Officer</span>
            </h2>
            <p className="text-xs text-slate-600">
              If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact our
              designated Grievance Officer:
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 font-mono text-slate-800">
              <div><strong>Entity:</strong> KamaiPlus / ProVenture</div>
              <div><strong>Email:</strong> support@proventure.in</div>
              <div><strong>Location:</strong> Maharashtra, India</div>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3 pt-2">
          <div>© {new Date().getFullYear()} KamaiPlus. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/terms-of-service" className="hover:text-slate-900 underline font-medium">Terms of Service</Link>
            <Link href="/refund-policy" className="hover:text-slate-900 underline font-medium">Refund Policy</Link>
            <Link href="/contact-us" className="hover:text-slate-900 underline font-medium">Contact Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
