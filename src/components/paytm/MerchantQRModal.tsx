'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  CheckCircle2,
  Printer,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isSoundboxEnabled, setSoundboxEnabled } from '@/lib/voice/paytmSoundbox';

interface MerchantQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  targetUpi?: string;
  targetLabel?: string;
}

export const MerchantQRModal: React.FC<MerchantQRModalProps> = ({
  isOpen,
  onClose,
  business,
  targetUpi,
  targetLabel,
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const upiId = targetUpi || business?.upi_id || (business?.upi_ids && business.upi_ids[0]?.upi_id) || '';
  const businessName = business?.name || 'KamaiPlus Store';
  const upiLink = upiId ? generateUPILink(upiId, businessName) : '';

  useEffect(() => {
    setSoundEnabled(isSoundboxEnabled());
    if (isOpen && upiLink) {
      QRCode.toDataURL(upiLink, {
        width: 300,
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const standeeEl = document.getElementById('printable-standee');
    if (!standeeEl) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(standeeEl, {
        scale: 3, // Crisp 300dpi print resolution
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (_clonedDoc, clonedElement) => {
          clonedElement.style.fontFamily = "'Mukta', 'Noto Sans Devanagari', 'Nirmala UI', 'Inter', system-ui, sans-serif";
          clonedElement.style.width = '380px';
          clonedElement.style.maxWidth = '380px';
          clonedElement.style.padding = '24px';
        },
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Center standee on A4 page (210mm x 297mm)
      const pdfWidth = 140; // 140mm wide clean standee
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const xOffset = (210 - pdfWidth) / 2;
      const yOffset = Math.max(15, (297 - pdfHeight) / 2);

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, pdfWidth, pdfHeight, undefined, 'FAST');
      const safeFilename = (businessName.trim() || 'Store').replace(/[/\\?%*:|"<>]/g, '_');
      pdf.save(`${safeFilename}_UPI_Standee.pdf`);
    } catch (err) {
      console.error('Failed to generate standee PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden flex flex-col my-auto shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 text-slate-900">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-slate-800" />
            <span className="text-xs font-extrabold uppercase tracking-wider">Official Counter UPI Standee</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Standee Body (Matches official PhonePe / Paytm countertop standees) */}
        <div
          id="printable-standee"
          className="p-5 sm:p-6 flex flex-col items-center text-center bg-white space-y-3.5"
          style={{ fontFamily: "'Mukta', 'Noto Sans Devanagari', 'Nirmala UI', 'Inter', system-ui, sans-serif" }}
        >
          {/* Store Brand Header */}
          <div className="w-full pb-3 border-b-2 border-slate-900 flex flex-col items-center">
            {business?.logo_url ? (
              <img
                src={business.logo_url}
                alt={businessName}
                className="w-14 h-14 object-contain rounded-xl border border-slate-200 p-1 mb-2 bg-white shadow-2xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl mb-1.5 shadow-xs">
                🏪
              </div>
            )}
            <h2 className="text-xl font-black text-slate-950 tracking-tight leading-snug max-w-xs">{businessName}</h2>
            {targetLabel && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full mt-1 border border-amber-300">
                {targetLabel}
              </span>
            )}
            {business?.tagline && (
              <p className="text-xs text-slate-600 italic mt-0.5">{business.tagline}</p>
            )}
            {business?.address && (
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs leading-snug">{business.address}</p>
            )}
          </div>

          {/* Standee Instruction */}
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-800">
            Scan &amp; Pay With Any UPI App
          </div>

          {/* QR Code Container with High-Contrast Framing */}
          <div className="p-3.5 bg-white rounded-2xl border-2 border-slate-900 shadow-sm inline-flex flex-col items-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Store UPI QR Code"
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            )}
            <div className="mt-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 font-mono text-xs font-black text-slate-900 max-w-[260px] truncate">
              {upiId || 'No UPI ID Configured'}
            </div>
          </div>

          {/* Accepted Payment Apps Logos Strip */}
          <div className="w-full flex items-center justify-center gap-1.5 pt-0.5 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-black text-[10px] border border-amber-300">
              BHIM UPI
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-black text-[10px] border border-blue-300">
              Google Pay
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-900 font-black text-[10px] border border-purple-300">
              PhonePe
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-900 font-black text-[10px] border border-sky-300">
              Paytm
            </span>
          </div>

          <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Instant Soundbox Voice Alert &amp; 100% Direct Bank Settlement</span>
          </div>
        </div>

        {/* Soundbox Quick Toggle */}
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-700" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-[11px] font-bold text-slate-700">Audio Voice Alert on Payment</span>
          </div>
          <button
            onClick={toggleSoundbox}
            className={`px-2 py-0.5 rounded border text-[10.5px] font-black cursor-pointer transition ${
              soundEnabled
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-200 bg-white grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="text-xs cursor-pointer"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 mr-1" />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs border-slate-300 text-slate-800 hover:bg-slate-100 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-slate-700" />
            <span>Print</span>
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-xs"
          >
            {isGeneratingPdf ? <FileText className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1 text-amber-400" />}
            <span>{isGeneratingPdf ? 'Saving...' : 'PDF'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
