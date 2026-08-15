'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Business } from '@/types';
import { generateUPILink } from '@/lib/utils';
import { isSoundboxEnabled, setSoundboxEnabled, announcePayment } from '@/lib/voice/paytmSoundbox';
import { 
  QrCode, 
  Download, 
  Share2, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Sparkles,
  Store
} from 'lucide-react';

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
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  useEffect(() => {
    setSoundEnabled(isSoundboxEnabled());
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && business?.upi_id) {
      const upiUrl = generateUPILink(business.upi_id, business.name);
      QRCode.toDataURL(upiUrl, {
        width: 260,
        margin: 1,
        color: { dark: '#002970', light: '#ffffff' },
      }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
    }
  }, [isOpen, business]);

  const toggleSoundbox = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundboxEnabled(next);
    if (next) {
      announcePayment(10000, business?.language || 'hi');
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${(business?.name || 'shop').replace(/\s+/g, '_')}_UPI_QR.png`;
    a.click();
  };

  if (!business) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-paytm-cyan" />
          <span>Paytm-Style All-In-One Merchant QR</span>
        </div>
      }
      description="Accept payments from GPay, PhonePe, Paytm, BHIM, and any UPI app."
      size="md"
    >
      <div className="space-y-4">
        {/* Merchant Standee Container */}
        <div className="bg-gradient-to-b from-[#002970] to-[#00173D] p-5 rounded-3xl text-white text-center shadow-xl border border-paytm-cyan/30 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-paytm-cyan flex items-center justify-center text-white font-black text-sm">
                ₹
              </div>
              <div className="text-left">
                <div className="text-xs font-black tracking-tight text-white line-clamp-1">{business.name}</div>
                <div className="text-[10px] text-paytm-cyan font-semibold">Accepted Here • All UPI Apps</div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>0% Charges</span>
            </div>
          </div>

          {/* QR Canvas Box */}
          <div className="bg-white p-4 rounded-2xl my-4 mx-auto max-w-[240px] shadow-2xl flex flex-col items-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="UPI QR" className="w-48 h-48 rounded-lg" />
            ) : (
              <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-semibold">
                Set UPI ID in Settings
              </div>
            )}
            <div className="text-[11px] font-extrabold text-paytm-royal mt-1 font-mono">{business.upi_id || 'No UPI ID set'}</div>
          </div>

          {/* Bottom Logos & Tagline */}
          <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-white/80">
            <span>Paytm</span>
            <span>•</span>
            <span>PhonePe</span>
            <span>•</span>
            <span>GPay</span>
            <span>•</span>
            <span>BHIM UPI</span>
          </div>
        </div>

        {/* Soundbox Voice Audio Toggle Card */}
        <div className="p-3 bg-paytm-light rounded-2xl border border-paytm-cyan/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${soundEnabled ? 'bg-paytm-royal' : 'bg-slate-400'}`}>
              {soundEnabled ? <Volume2 className="w-5 h-5 text-paytm-cyan" /> : <VolumeX className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Paytm Soundbox Voice Alert</div>
              <div className="text-[10px] text-slate-500">Plays "KamaiPlus par ₹... प्राप्त हुए" on payment</div>
            </div>
          </div>

          <button
            onClick={toggleSoundbox}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              soundEnabled
                ? 'bg-paytm-royal text-white shadow-sm'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {soundEnabled ? 'Active' : 'Muted'}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="md" onClick={handleDownloadQR} className="flex-1">
            <Download className="w-4 h-4 mr-1.5 text-paytm-royal" />
            <span>Download Standee</span>
          </Button>
          <Button variant="primary" size="md" onClick={onClose} className="flex-1 bg-paytm-royal hover:bg-paytm-dark">
            <span>Done</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
