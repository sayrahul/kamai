import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Clock, ArrowLeft, Headphones, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Contact Us | KamaiPlus',
  description: 'Get support and contact the KamaiPlus team.',
};

export default function ContactUsPage() {
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
            <Headphones className="w-3.5 h-3.5 text-sky-600" />
            <span>Merchant Support Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Contact Us
          </h1>
          <p className="text-xs text-slate-500">
            Have questions about billing setup, subscription plans, or hardware printers? We are here to help.
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Email Support */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 mb-2">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Customer Support Email</h3>
            <p className="text-xs text-slate-500">For account queries, refund requests, and technical assistance.</p>
            <div className="pt-2 font-mono text-xs font-bold text-slate-900">support@proventure.in</div>
          </div>

          {/* Card 2: Operating Entity & Location */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 mb-2">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Operating Entity & Location</h3>
            <p className="text-xs text-slate-500">KamaiPlus Business Management Platform</p>
            <div className="pt-2 text-xs text-slate-700 leading-snug">
              ProVenture Solutions<br />
              Maharashtra, India
            </div>
          </div>

          {/* Card 3: Support Hours */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Business Hours</h3>
            <p className="text-xs text-slate-500">Monday to Saturday</p>
            <div className="pt-2 text-xs font-mono text-slate-900 font-bold">9:00 AM – 7:00 PM IST</div>
          </div>

          {/* Card 4: Response Time */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 mb-2">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Standard SLA Response Time</h3>
            <p className="text-xs text-slate-500">Priority Merchant Response</p>
            <div className="pt-2 text-xs text-emerald-700 font-bold">Within 24 business hours</div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3 pt-2">
          <div>© {new Date().getFullYear()} KamaiPlus. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-slate-900 underline font-medium">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-slate-900 underline font-medium">Terms of Service</Link>
            <Link href="/refund-policy" className="hover:text-slate-900 underline font-medium">Refund Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
