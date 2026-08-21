'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Receipt, 
  BookOpen, 
  ArrowRight, 
  ArrowLeft,
  Lock,
  WifiOff,
  Database,
  Zap,
  Volume2,
  Printer,
  MessageCircle,
  QrCode,
  CheckCircle2
} from 'lucide-react';

interface IntroWalkthroughProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const IntroWalkthrough: React.FC<IntroWalkthroughProps> = ({ 
  onComplete, 
  onSkip 
}) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  const slides = [
    {
      id: 0,
      step: '1 / 3',
      badge: 'SECURITY & TRUST',
      title: '100% Private & Offline Security',
      subtitle: 'Your store accounts stay strictly on your device. Works completely offline without internet or server risk.',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
      highlights: [
        { icon: Lock, title: '100% Private & Safe', desc: 'Zero data sharing. Your sales stay yours.' },
        { icon: WifiOff, title: 'Works Without Internet', desc: 'Bill customers uninterrupted 24x7.' },
        { icon: Database, title: 'Instant Offline Storage', desc: 'Secure local device storage & 1-click export.' },
      ]
    },
    {
      id: 1,
      step: '2 / 3',
      badge: 'SPEED & POS BILLING',
      title: '5-Second Retail POS Billing',
      subtitle: 'Fast barcode checkout with Hindi/English voice commands and direct thermal receipt printing.',
      icon: Receipt,
      iconColor: 'text-amber-400 bg-amber-950/60 border-amber-800',
      highlights: [
        { icon: Zap, title: '5-Sec Barcode Scanning', desc: 'Instant item lookup & rapid checkout.' },
        { icon: Volume2, title: 'Voice Billing', desc: 'Speak items in Hindi, Marathi, or English.' },
        { icon: Printer, title: 'Thermal Receipt Print', desc: 'Direct 58mm & 80mm Bluetooth ESC/POS.' },
      ]
    },
    {
      id: 2,
      step: '3 / 3',
      badge: 'CUSTOMER CREDIT & WHATSAPP',
      title: 'Credit Ledger & WhatsApp Bills',
      subtitle: 'Send official WhatsApp PDF invoices with zero-fee UPI QR codes and track pending customer balances.',
      icon: BookOpen,
      iconColor: 'text-sky-400 bg-sky-950/60 border-sky-800',
      highlights: [
        { icon: BookOpen, title: 'Zero-Loss Credit Ledger', desc: 'Track customer balances and payment history.' },
        { icon: MessageCircle, title: 'WhatsApp PDF Invoices', desc: 'Send paperless bills directly to WhatsApp.' },
        { icon: QrCode, title: 'Instant UPI QR Collection', desc: 'Direct bank payments with zero commissions.' },
      ]
    }
  ];

  const current = slides[currentSlide];
  const IconComponent = current.icon;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="h-screen max-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto select-none overflow-hidden">
      {/* ---------------- TOP COMPACT BAR ---------------- */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Kamai+" className="w-8 h-8 object-contain flex-shrink-0" />
          <span className="font-extrabold text-sm text-white tracking-tight">
            KamaiPlus POS
          </span>
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded cursor-pointer"
        >
          Skip
        </button>
      </div>

      {/* ---------------- HERO ICON & BADGE (ANDROID APP STYLE) ---------------- */}
      <div className="my-auto py-2 space-y-4 text-center">
        {/* Main Center SVG Icon */}
        <div className="flex justify-center">
          <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${current.iconColor}`}>
            <IconComponent className="w-8 h-8" />
          </div>
        </div>

        {/* Badge & Step */}
        <div className="flex items-center justify-center gap-2">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-400 text-[10px] font-black uppercase tracking-wider">
            {current.badge}
          </span>
          <span className="text-[10px] text-slate-500 font-bold">
            {current.step}
          </span>
        </div>

        {/* Title & Short Subtitle */}
        <div className="space-y-1 px-2">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            {current.title}
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {current.subtitle}
          </p>
        </div>

        {/* ---------------- 3 COMPACT HIGHLIGHT POINTS ---------------- */}
        <div className="space-y-2 pt-1 text-left">
          {current.highlights.map((h, idx) => {
            const HIcon = h.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800"
              >
                <div className="p-1.5 rounded bg-slate-950 text-amber-400 border border-slate-800 flex-shrink-0">
                  <HIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{h.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">{h.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- BOTTOM ANDROID CONTROLS: PREVIOUS & NEXT ONLY ---------------- */}
      <div className="border-t border-slate-800/80 pt-3 pb-2 space-y-3">
        {/* Step Indicator Dots */}
        <div className="flex items-center justify-center gap-1.5">
          {slides.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentSlide(s.id)}
              className={`h-1.5 rounded cursor-pointer ${
                currentSlide === s.id
                  ? 'w-6 bg-amber-400'
                  : 'w-2 bg-slate-800'
              }`}
              aria-label={`Slide ${s.id + 1}`}
            />
          ))}
        </div>

        {/* Navigation Buttons Row (Only Previous and Next) */}
        <div className="flex items-center gap-2">
          {currentSlide > 0 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="flex-1 py-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
          ) : (
            <div className="flex-1" />
          )}

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-2.5 rounded bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>{currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
