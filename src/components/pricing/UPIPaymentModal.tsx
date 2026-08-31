'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
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
  CreditCard,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';

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
  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState<boolean>(false);
  const [isSubmittingUtr, setIsSubmittingUtr] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'razorpay' | 'upi_qr'>('razorpay');

  const payeeVpa = 'kamaiplus@icici';
  const payeeName = 'KamaiPlus POS Solutions';
  const amountRupees = amountPaise / 100;
  const planTitle = tier === 'enterprise' ? 'Enterprise Plan' : 'Pro Plan';
  const transactionNote = `KamaiPlus_${tier.toUpperCase()}_${billingCycle.toUpperCase()}`;

  const upiUri = `upi://pay?pa=${payeeVpa}&pn=${encodeURIComponent(payeeName)}&am=${amountRupees}&tn=${encodeURIComponent(transactionNote)}&cu=INR`;

  useEffect(() => {
    if (isOpen && amountPaise > 0) {
      setIsSuccess(false);
      setErrorMessage(null);
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

  // Dynamically load Razorpay SDK
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayCheckout = async () => {
    setIsProcessingRazorpay(true);
    setErrorMessage(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setErrorMessage('Failed to load Razorpay secure checkout. Please check internet connection.');
        setIsProcessingRazorpay(false);
        return;
      }

      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: tier,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Payment gateway currently initializing. You can also pay via direct UPI QR.');
        setIsProcessingRazorpay(false);
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'KamaiPlus Retail POS',
        description: `${data.planLabel} (${billingCycle.toUpperCase()})`,
        order_id: data.orderId,
        prefill: {
          contact: data.phone || '',
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: tier,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              subscriptionService.activateSubscription(tier, billingCycle, response.razorpay_payment_id);
              setIsSuccess(true);
              if (onSuccess) onSuccess();
            } else {
              setErrorMessage(verifyData.error || 'Payment signature verification failed.');
            }
          } catch (err: any) {
            setErrorMessage('Network error while verifying payment with server.');
          } finally {
            setIsProcessingRazorpay(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessingRazorpay(false);
          },
        },
        theme: {
          color: '#0f172a',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        console.error('Payment failed:', resp.error);
        setErrorMessage(resp.error?.description || 'Payment was unsuccessful. Please try again.');
        setIsProcessingRazorpay(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage('Could not initialize checkout. Please try again or use direct UPI QR.');
      setIsProcessingRazorpay(false);
    }
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(payeeVpa);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleUtrSubmit = async () => {
    if (!utrNumber.trim()) {
      setErrorMessage('Please enter the 12-digit UPI UTR / Reference Number from your payment receipt.');
      return;
    }

    setIsSubmittingUtr(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/subscription/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          billingCycle,
          razorpayPaymentId: utrNumber.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        subscriptionService.activateSubscription(tier, billingCycle, utrNumber.trim());
        setIsSuccess(true);
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(data.error || 'Could not verify payment reference.');
      }
    } catch (err: any) {
      setErrorMessage('Network error while recording subscription.');
    } finally {
      setIsSubmittingUtr(false);
    }
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
                Your subscription has been verified and activated. All premium features are unlocked.
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
              Start Using Pro Features
            </Button>
          </div>
        ) : (
          /* PAYMENT OPTIONS */
          <>
            {/* Plan Badge Header */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Selected Plan
                </span>
                <div className="text-sm font-black text-slate-900">
                  {planTitle} • {billingCycle === 'annual' ? 'Annual Plan' : 'Monthly Plan'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-mono font-black text-slate-900">
                  {formatINR(amountPaise)}
                </div>
                <span className="text-[10px] text-slate-500">Inc. all taxes</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="flex-1 font-medium">{errorMessage}</p>
              </div>
            )}

            {/* Payment Method Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => { setActiveTab('razorpay'); setErrorMessage(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'razorpay'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Instant Checkout (UPI/Cards/Netbanking)</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('upi_qr'); setErrorMessage(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'upi_qr'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Direct UPI QR</span>
              </button>
            </div>

            {activeTab === 'razorpay' ? (
              <div className="py-4 space-y-4 text-center">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Secure Payment Gateway</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Pay securely via UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, or Netbanking. Instant automatic activation.
                  </p>
                </div>

                <Button
                  onClick={handleRazorpayCheckout}
                  disabled={isProcessingRazorpay}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm justify-center rounded-xl shadow-md"
                >
                  {isProcessingRazorpay ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Opening Secure Checkout...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>Proceed to Pay {formatINR(amountPaise)}</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </div>
            ) : (
              /* DIRECT UPI QR TAB */
              <>
                <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg space-y-2.5">
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
                      <img src={qrDataUrl} alt="UPI QR Code" className="w-40 h-40" />
                    </div>
                  ) : (
                    <div className="w-40 h-40 bg-slate-100 rounded" />
                  )}

                  {/* UPI ID Pill with Copy */}
                  <div className="flex items-center gap-2 w-full max-w-xs justify-between px-3 py-1 rounded bg-slate-50 border border-slate-200 text-xs">
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

                {/* UTR Entry */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Enter 12-Digit UPI Ref / UTR No.:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 423984729182"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                    <Button
                      onClick={handleUtrSubmit}
                      disabled={isSubmittingUtr || !utrNumber.trim()}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-1.5 whitespace-nowrap"
                    >
                      {isSubmittingUtr ? 'Verifying...' : 'Submit UTR'}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Trust Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>100% Encrypted Payment</span>
              </span>
              <a
                href={`https://wa.me/919999999999?text=Hello%20KamaiPlus%20Team%2C%20I%20need%20help%20with%20upgrading%20to%20${encodeURIComponent(planTitle)}`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-800 font-bold hover:underline flex items-center gap-1"
              >
                <WhatsAppLogo className="w-3.5 h-3.5" />
                <span>WhatsApp Support</span>
              </a>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
