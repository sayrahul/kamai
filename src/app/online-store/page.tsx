'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Globe, 
  Sparkles, 
  ShoppingBag, 
  MessageSquare, 
  QrCode, 
  Share2, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Store, 
  Smartphone, 
  Zap, 
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function DigitalStoreComingSoonPage() {
  const [phone, setPhone] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  const handleJoinWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setIsJoined(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 px-2 sm:px-4">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-6 sm:p-10 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Coming Very Soon in Next Update</span>
          </div>

          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Launch Your Own <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">Digital WhatsApp Store</span> in 60 Seconds
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Transform your physical shop inventory into a shareable online catalog with direct WhatsApp ordering, instant UPI payments, and zero commission fees.
            </p>
          </div>

          {/* Waitlist Form */}
          <div className="pt-2 max-w-md">
            {isJoined ? (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center gap-3 text-xs font-bold animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>🎉 You&apos;re on the priority beta waitlist! We will notify you when Digital Store goes live.</span>
              </div>
            ) : (
              <form onSubmit={handleJoinWaitlist} className="space-y-2">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20">
                  <input
                    type="tel"
                    placeholder="Enter your WhatsApp number..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full bg-transparent px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none font-mono font-bold"
                  />
                  <Button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shrink-0 shadow-md"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    <span>Get Early Access</span>
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400 pl-2">
                  🔒 No spam. Only 1 notification when your store link is ready.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Feature 1 */}
        <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5 shadow-sm hover:border-emerald-400 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
            <Share2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            1-Click Shareable Link
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Get your own personalized shop link <code className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">kamai.proventure.in/shop/your-store</code> to share on WhatsApp groups and Instagram.
          </p>
        </Card>

        {/* Feature 2 */}
        <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5 shadow-sm hover:border-sky-400 transition-all">
          <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            WhatsApp Direct Checkout
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Customers browse items, select quantities, and place orders directly into your WhatsApp chat with formatted itemized cart lists.
          </p>
        </Card>

        {/* Feature 3 */}
        <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5 shadow-sm hover:border-amber-400 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            Live Inventory Sync
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Zero double data entry. Any product price or stock updated on your POS counter instantly reflects on your customer-facing digital store.
          </p>
        </Card>
      </div>

      {/* Navigation Return Banner */}
      <div className="p-4 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-bold">
          <Store className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Need to record counter sales right now? Head to POS Billing.</span>
        </div>

        <Link href="/billing">
          <Button size="sm" className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold gap-1">
            <span>Open POS Billing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
