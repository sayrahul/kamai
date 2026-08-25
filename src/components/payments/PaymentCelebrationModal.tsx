'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ParsedPaymentEvent } from '@/lib/payments/notificationParser';
import { formatINR } from '@/lib/utils';
import { 
  CheckCircle2, 
  Printer, 
  Share2, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Building2,
  Smartphone,
  Check
} from 'lucide-react';

interface PaymentCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: ParsedPaymentEvent | null;
  storeName?: string;
  invoiceNumber?: string;
  onPrintReceipt?: () => void;
  onShareWhatsApp?: () => void;
  autoCloseSeconds?: number;
}

export function PaymentCelebrationModal({
  isOpen,
  onClose,
  payment,
  storeName = 'Store',
  invoiceNumber,
  onPrintReceipt,
  onShareWhatsApp,
  autoCloseSeconds = 5,
}: PaymentCelebrationModalProps) {
  const [countdown, setCountdown] = useState<number>(autoCloseSeconds);

  useEffect(() => {
    if (!isOpen || !payment) {
      setCountdown(autoCloseSeconds);
      return;
    }

    setCountdown(autoCloseSeconds);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, payment, autoCloseSeconds, onClose]);

  if (!isOpen || !payment) return null;

  // Source app badge styling
  const getSourceBadge = () => {
    switch (payment.sourceApp) {
      case 'PhonePe':
        return { label: 'PhonePe UPI', bg: 'bg-purple-100 text-purple-900 border-purple-300' };
      case 'GooglePay':
        return { label: 'Google Pay', bg: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'Paytm':
        return { label: 'Paytm UPI', bg: 'bg-sky-100 text-sky-900 border-sky-300' };
      case 'BHIM':
        return { label: 'BHIM UPI', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'BankSMS':
        return { label: payment.bankName || 'Bank SMS Transfer', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      default:
        return { label: 'Instant UPI', bg: 'bg-slate-100 text-slate-900 border-slate-300' };
    }
  };

  const badge = getSourceBadge();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="md"
    >
      <div className="p-4 sm:p-6 text-center space-y-4 relative overflow-hidden">
        {/* Glowing Ambient Background Ring */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Animated Celebration Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
            <Check className="w-10 h-10 sm:w-12 sm:h-12 stroke-[3]" />
          </div>
          <span className="absolute -top-1 -right-1 text-2xl animate-pulse">✨</span>
        </div>

        {/* Header Title */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${badge.bg}">
            <Smartphone className="w-3 h-3" />
            <span>{badge.label} Verified</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 pt-1">
            Payment Received!
          </h2>
          <p className="text-xs text-slate-500">
            Credited to <b className="text-slate-800">{storeName}</b>
          </p>
        </div>

        {/* Big Amount Display */}
        <div className="py-2.5 px-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
          <div className="text-3xl sm:text-4xl font-black text-emerald-800 font-mono tracking-tight">
            {formatINR(payment.amountPaise)}
          </div>
          {payment.payerName && (
            <div className="text-xs text-slate-700 font-medium">
              From: <b className="text-slate-950 font-bold">{payment.payerName}</b>
            </div>
          )}
        </div>

        {/* Transaction Metadata Card */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-1.5 text-xs">
          {invoiceNumber && (
            <div className="flex items-center justify-between text-slate-600">
              <span>Invoice Ref:</span>
              <span className="font-mono font-bold text-slate-900">{invoiceNumber}</span>
            </div>
          )}
          {payment.referenceNumber && (
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>UPI Ref / UTR:</span>
              </span>
              <span className="font-mono font-black text-slate-950">{payment.referenceNumber}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-slate-600">
            <span>Status:</span>
            <span className="font-bold text-emerald-700">100% Settled & Confirmed</span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {onPrintReceipt && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPrintReceipt}
              className="border-slate-300 hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Print Slip</span>
            </Button>
          )}

          {onShareWhatsApp && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onShareWhatsApp}
              className="border-emerald-300 text-emerald-900 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-4 h-4 text-emerald-700" />
              <span>WhatsApp</span>
            </Button>
          )}
        </div>

        {/* Dismiss Button with Auto-Close Countdown */}
        <div className="pt-2">
          <Button
            type="button"
            size="lg"
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <span>Next Customer</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-mono">
              Auto-close in {countdown}s
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
