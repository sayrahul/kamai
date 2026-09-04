'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { 
  ShieldCheck, 
  Store, 
  User, 
  Copy, 
  Check, 
  Smartphone, 
  ExternalLink,
  ArrowRight,
  Sparkles,
  QrCode
} from 'lucide-react';
import { formatINR } from '@/lib/utils';

function PayContent() {
  const searchParams = useSearchParams();

  const pa = searchParams.get('pa') || ''; // Payee UPI ID
  const pn = searchParams.get('pn') || 'Merchant Store'; // Payee Name
  const am = searchParams.get('am') || '0'; // Amount in INR
  const cust = searchParams.get('cust') || ''; // Customer Name
  const note = searchParams.get('note') || 'Khata_Udhar_Payment';

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [rawAmountNum, setRawAmountNum] = useState<number>(0);

  useEffect(() => {
    const parsedAmt = parseFloat(am) || 0;
    setRawAmountNum(parsedAmt);

    if (pa) {
      // Standard NPCI UPI URI scheme
      const upiUri = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${parsedAmt > 0 ? parsedAmt.toFixed(2) : ''}&cu=INR&tn=${encodeURIComponent(note)}`;

      QRCode.toDataURL(upiUri, {
        width: 260,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then(setQrCodeUrl)
        .catch(() => {});
    }
  }, [pa, pn, am, note]);

  const copyUpiId = () => {
    if (!pa) return;
    navigator.clipboard.writeText(pa).then(() => {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    });
  };

  const cleanAmt = rawAmountNum > 0 ? rawAmountNum.toFixed(2) : '';
  const upiUniversalLink = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${cleanAmt}&cu=INR&tn=${encodeURIComponent(note)}`;
  const phonepeLink = `phonepe://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${cleanAmt}&cu=INR&tn=${encodeURIComponent(note)}`;
  const gpayLink = `tez://upi/pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${cleanAmt}&cu=INR&tn=${encodeURIComponent(note)}`;
  const paytmLink = `paytmmp://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${cleanAmt}&cu=INR&tn=${encodeURIComponent(note)}`;

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 space-y-4">
      {/* Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 text-white text-center relative overflow-hidden shadow-2xl">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>NPCI Verified UPI Payment</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black tracking-tight">{pn}</h1>
        {cust && (
          <p className="text-xs text-slate-400 mt-1">
            Bill To: <span className="text-slate-200 font-bold">{cust}</span>
          </p>
        )}

        {/* Amount Badge */}
        <div className="mt-4 p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
            Total Balance Due
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 mt-0.5">
            {formatINR(Math.round(rawAmountNum * 100))}
          </div>
        </div>
      </div>

      {/* 1-Tap App Payment Buttons (Mobile First) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider text-center">
          1-Tap Instant Payment via UPI App
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* PhonePe */}
          <a
            href={phonepeLink}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#5f259f] hover:bg-[#521f8a] text-white font-black text-xs transition shadow-sm active:scale-95 cursor-pointer"
          >
            <span>🟣 PhonePe</span>
          </a>

          {/* Google Pay */}
          <a
            href={gpayLink}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-black text-xs transition shadow-sm active:scale-95 cursor-pointer"
          >
            <span>🔵 Google Pay</span>
          </a>

          {/* Paytm */}
          <a
            href={paytmLink}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#002e6e] hover:bg-[#002252] text-white font-black text-xs transition shadow-sm active:scale-95 cursor-pointer"
          >
            <span>🔷 Paytm</span>
          </a>

          {/* Any UPI */}
          <a
            href={upiUniversalLink}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition shadow-sm active:scale-95 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Any UPI App</span>
          </a>
        </div>

        {/* QR Code Section */}
        {qrCodeUrl && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
            <div className="text-[11px] font-bold text-slate-500">
              Or Scan Dynamic QR Code:
            </div>
            <div className="inline-block p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto object-contain" />
            </div>
          </div>
        )}

        {/* Copy UPI ID */}
        {pa && (
          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
            <div className="min-w-0 flex-1 pr-2">
              <div className="text-[10px] uppercase font-bold text-slate-400">UPI ID</div>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">{pa}</div>
            </div>
            <button
              type="button"
              onClick={copyUpiId}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 shadow-2xs hover:bg-slate-50 transition cursor-pointer shrink-0"
            >
              {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-400">
        Secured by KamaiPlus • Payments go directly to merchant bank account
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-white text-xs">Loading payment details...</div>}>
        <PayContent />
      </Suspense>
    </main>
  );
}
