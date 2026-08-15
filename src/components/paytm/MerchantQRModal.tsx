'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Business } from '@/types';
import { generateUPILink } from '@/lib/utils';
import { 
  X, 
  Download, 
  Share2, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Store,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isSoundboxEnabled, setSoundboxEnabled } from '@/lib/voice/paytmSoundbox';

interface MerchantQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
}

export const MerchantQRModal: React.FC<MerchantQRModalProps> = ({
  isOpen,
  onClose,
  business,
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const upiId = business?.upi_id || 'merchant@upi';
  const businessName = business?.name || 'KamaiPlus Store';
  const upiLink = generateUPILink(upiId, businessName);

  useEffect(() => {
    setSoundEnabled(isSoundboxEnabled());
    if (isOpen) {
      QRCode.toDataURL(upiLink, {
        width: 240,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR:', err));
    }
  }, [isOpen, upiLink]);

  if (!isOpen) return null;

  const toggleSoundbox = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundboxEnabled(next);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${businessName} UPI QR Code`,
          text: `Pay ${businessName} directly using UPI ID: ${upiId}`,
          url: window.location.origin,
        });
      } catch (e) {
        console.log('Share canceled');
      }
    } else {
      navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white text-slate-900">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-bold uppercase tracking-wider">Store Payment QR</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Standee Body */}
        <div className="p-5 flex flex-col items-center text-center bg-white space-y-4">
          <div className="flex flex-col items-center">
            {business?.logo_url && (
              <img
                src={business.logo_url}
                alt={businessName}
                className="w-12 h-12 object-contain rounded-lg border border-slate-200 p-1 mb-2 bg-white"
              />
            )}
            <h2 className="text-base font-bold text-slate-900">{businessName}</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{upiId}</p>
          </div>

          {/* QR Code Image Container */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 inline-flex items-center justify-center min-w-[200px] min-h-[200px]">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Store UPI QR Code"
                className="w-44 h-44 object-contain"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            )}
          </div>

          {/* 0% Charges Pill */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>Accepts GPay, PhonePe, Paytm & BHIM</span>
          </div>

          {/* Soundbox Setting Row */}
          <div className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-slate-800" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <div className="text-left">
                <div className="font-bold text-slate-900">Audio Voice Alert</div>
                <div className="text-[10px] text-slate-500">Instant spoken notification</div>
              </div>
            </div>
            <button
              onClick={toggleSoundbox}
              className={`px-2.5 py-1 rounded border text-[11px] font-bold ${
                soundEnabled
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-200 bg-white grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="text-xs"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Share2 className="w-3.5 h-3.5 mr-1" />}
            <span>{copied ? 'Copied' : 'Share QR'}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            <span>Print Standee</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
