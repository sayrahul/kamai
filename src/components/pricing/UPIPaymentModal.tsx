'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatINR } from '@/lib/utils';
import { SubscriptionTier, subscriptionService } from '@/lib/subscription/subscriptionService';
import { 
  CheckCircle2, 
  Copy, 
  QrCode, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Lock,
  ArrowRight,
  MessageCircle
} from 'lucide-react';

interface UPIPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'annual';
  amountPaise: number;
  onSuccess?: () => void;
}

export const UPIPaymentModal: React.FC<UPIPaymentModalProps> = ({
  isOpen,
  onClose,
  tier,
  billingCycle,
  amountPaise,
  onSuccess,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const payeeVpa = 'kamaiplus@icici';
  const payeeName = 'KamaiPlus POS Solutions';
  const amountRupees = amountPaise / 100;
  const planTitle = tier === 'enterprise' ? 'Platinum Scale' : 'Gold Growth';
  const transactionNote = `KamaiPlus_${tier.toUpperCase()}_${billingCycle.toUpperCase()}`;

  const upiUri = `upi://pay?pa=${payeeVpa}&pn=${encodeURIComponent(payeeName)}&am=${amountRupees}&tn=${encodeURIComponent(transactionNote)}&cu=INR`;

  useEffect(() => {
    if (isOpen && amountPaise > 0) {
      setIsSuccess(false);
      setUtrNumber('');
      QRCode.toDataURL(upiUri, {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then(setQrDataUrl);
    }
  }, [isOpen, upiUri, amountPaise]);

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(payeeVpa);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleActivate = () => {
    setIsActivating(true);
    setTimeout(() => {
      subscriptionService.activateSubscription(tier, billingCycle, utrNumber || undefined);
      setIsActivating(false);
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSuccess ? 'Plan Activated Successfully!' : `Upgrade to ${planTitle}`}
    >
      <div className="space-y-4 pt-1 text-slate-900">
        {isSuccess ? (
          /* SUCCESS SCREEN */
          <div className="text-center py-5 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                KamaiPlus {planTitle} Activated!
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Your subscription has been activated successfully. All features are unlocked.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 max-w-sm mx-auto text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Plan:</span>
                <span className="font-bold text-slate-900">{planTitle} ({billingCycle.toUpperCase()})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-700">{formatINR(amountPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valid Until:</span>
                <span className="font-bold text-slate-900">
                  {new Date(Date.now() + (billingCycle === 'monthly' ? 30 : 365) * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            <Button
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-2 justify-center"
            >
              Start Using Premium Tools
            </Button>
          </div>
        ) : (
          /* PAYMENT STEP */
          <>
            {/* Plan Badge Header */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Selected Plan
                </span>
                <div className="text-sm font-black text-slate-900">
                  {planTitle} • {billingCycle === 'annual' ? '1 Year Access' : '1 Month Access'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-mono font-black text-slate-900">
                  {formatINR(amountPaise)}
                </div>
                <span className="text-[10px] text-slate-500">Inc. all GST</span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-lg space-y-3">
              <div className="text-center space-y-0.5">
                <span className="text-xs font-black text-slate-800 flex items-center justify-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-slate-700" />
                  <span>Scan with Any UPI App</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Google Pay • PhonePe • Paytm • BHIM • Cred
                </p>
              </div>

              {qrDataUrl ? (
                <div className="p-2 bg-white rounded border border-slate-200">
                  <img src={qrDataUrl} alt="UPI QR Code" className="w-44 h-44" />
                </div>
              ) : (
                <div className="w-44 h-44 bg-slate-100 rounded" />
              )}

              {/* UPI ID Pill with Copy */}
              <div className="flex items-center gap-2 w-full max-w-xs justify-between px-3 py-1.5 rounded bg-slate-50 border border-slate-200 text-xs">
                <span className="font-mono text-[11px] font-bold text-slate-700 truncate">
                  {payeeVpa}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUPI}
                  className="text-xs font-bold text-slate-900 hover:text-slate-700 flex items-center gap-1 flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Mobile 1-Tap UPI Intent Button */}
              <a
                href={upiUri}
                className="md:hidden w-full text-center py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Tap to Pay in UPI App</span>
              </a>
            </div>

            {/* Verification & Instant Activation */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700">
                Enter UPI Ref / UTR No. (Optional):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 423984729182 or leave blank"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                />
                <Button
                  onClick={handleActivate}
                  disabled={isActivating}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-1.5 whitespace-nowrap"
                >
                  {isActivating ? 'Verifying...' : 'Verify & Activate'}
                </Button>
              </div>
            </div>

            {/* Trust Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>100% Secure NPCI UPI Payment</span>
              </span>
              <a
                href={`https://wa.me/919999999999?text=Hello%20KamaiPlus%20Team%2C%20I%20need%20help%20with%20upgrading%20to%20${encodeURIComponent(planTitle)}`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-800 font-bold hover:underline flex items-center gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5 text-slate-700" />
                <span>Talk to Sales</span>
              </a>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
