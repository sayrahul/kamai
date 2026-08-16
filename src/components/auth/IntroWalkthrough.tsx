'use client';

import React, { useState } from 'react';
import { 
  Receipt, 
  BookOpen, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  QrCode, 
  Volume2, 
  Smartphone, 
  Store,
  WifiOff,
  MessageCircle,
  Zap,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface IntroWalkthroughProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const IntroWalkthrough: React.FC<IntroWalkthroughProps> = ({ onComplete, onSkip }) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  const slides = [
    {
      id: 0,
      badge: 'Superfast POS Billing',
      hindiBadge: 'सुपरफास्ट बिलिंग',
      title: 'Lightning-Fast POS & Voice Billing',
      subtitle: 'Generate GST invoices and thermal receipts in under 5 seconds with barcode scanning and Hindi voice commands.',
      accentColor: 'from-amber-500 to-amber-600',
      bgGlow: 'bg-amber-500/10',
      iconBg: 'bg-amber-100 text-amber-900 border-amber-300',
      mainIcon: Receipt,
      points: [
        { icon: Zap, title: '5-Second Checkout', desc: 'Instant barcode scan & quick item search' },
        { icon: Volume2, title: 'Hindi Speech-to-Bill', desc: 'Speak items naturally to generate bills' },
        { icon: Store, title: 'Thermal & A4 Formats', desc: 'Direct 80mm/58mm thermal receipt printing' },
      ],
    },
    {
      id: 1,
      badge: 'Digital Khata & WhatsApp',
      hindiBadge: 'डिजिटल खाता और ऑटो तकादा',
      title: 'Digital Udhar Khata & WhatsApp Invoices',
      subtitle: 'Track customer balances, send automated payment reminders, and dispatch official PDF invoices directly on WhatsApp.',
      accentColor: 'from-emerald-500 to-teal-600',
      bgGlow: 'bg-emerald-500/10',
      iconBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      mainIcon: MessageCircle,
      points: [
        { icon: BookOpen, title: 'Zero-Loss Khata Ledger', desc: 'Full debit/credit audit trail with customer history' },
        { icon: MessageCircle, title: 'WhatsApp PDF Invoices', desc: 'Send branded PDF bills with store logo & UPI' },
        { icon: QrCode, title: 'Zero-Fee UPI QR', desc: 'Instant bank settlements directly into your account' },
      ],
    },
    {
      id: 2,
      badge: '100% Offline-First',
      hindiBadge: 'बिना इंटरनेट चालू',
      title: '100% Offline-First & Multi-Device Sync',
      subtitle: 'Your shop never stops even when internet or power goes out. Full IndexedDB speed with automated cloud backups.',
      accentColor: 'from-sky-500 to-indigo-600',
      bgGlow: 'bg-sky-500/10',
      iconBg: 'bg-sky-100 text-sky-900 border-sky-300',
      mainIcon: ShieldCheck,
      points: [
        { icon: WifiOff, title: 'Works Without Internet', desc: 'All inventory, billing and ledger stored locally' },
        { icon: TrendingUp, title: 'Real-Time Insights', desc: 'Daily revenue, gross profit & low stock alerts' },
        { icon: ShieldCheck, title: 'Safe & Private', desc: '100% data ownership with 1-click JSON backup' },
      ],
    },
  ];

  const current = slides[currentSlide];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden">
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-0 -left-20 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Brand & Skip Button */}
      <div className="relative z-10 flex items-center justify-between max-w-xl mx-auto w-full pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-md">
            K+
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white">KamaiPlus</span>
            <span className="text-[10px] text-amber-400 font-bold ml-1.5 px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
              कमई+
            </span>
          </div>
        </div>

        <button
          onClick={onSkip}
          className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 transition-colors"
        >
          Skip Intro / छोड़ें
        </button>
      </div>

      {/* Main Slide Content Card */}
      <div className="relative z-10 max-w-xl mx-auto w-full my-auto py-6 sm:py-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Header Badge */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{current.badge}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 font-normal">{current.hindiBadge}</span>
            </span>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              {current.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {current.subtitle}
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="space-y-3 pt-2">
            {current.points.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 transition-all hover:border-slate-700"
                >
                  <div className="p-2 rounded-xl bg-slate-800 text-amber-400 flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{p.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar: Dots & Next/Get Started Button */}
      <div className="relative z-10 max-w-xl mx-auto w-full flex items-center justify-between pb-4">
        {/* Step Indicator Dots */}
        <div className="flex items-center gap-2">
          {slides.map((s) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(s.id)}
              className={`h-2 rounded-full transition-all ${
                currentSlide === s.id
                  ? 'w-8 bg-amber-400 shadow-sm'
                  : 'w-2 bg-slate-800 hover:bg-slate-700'
              }`}
              aria-label={`Go to slide ${s.id + 1}`}
            />
          ))}
        </div>

        {/* Action Button */}
        <Button
          onClick={handleNext}
          size="lg"
          className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-6 py-2.5 rounded-xl border-amber-400 shadow-lg gap-2"
        >
          <span>{currentSlide === slides.length - 1 ? 'Get Started / शुरू करें' : 'Next / आगे बढ़ें'}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
