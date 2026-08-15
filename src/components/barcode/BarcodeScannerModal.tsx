'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { playBeepSound } from '@/lib/voice/speechParser';
import { Barcode, Camera, Keyboard, AlertCircle, RefreshCw } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  description?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Product Barcode',
  description = 'Point camera at barcode/QR code on packaging or enter barcode manually.',
}) => {
  const [manualCode, setManualCode] = useState('');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-reader-viewport';

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (isOpen) {
      setScannerError(null);
      setIsScanning(true);

      const timer = setTimeout(async () => {
        try {
          // Formats for retail barcodes + QR
          const formatsToSupport = [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ];

          html5QrCode = new Html5Qrcode(containerId, {
            formatsToSupport,
            verbose: false,
          });
          scannerRef.current = html5QrCode;

          const config = {
            fps: 15,
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.333,
          };

          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              playBeepSound('success');
              if (navigator.vibrate) navigator.vibrate(80);
              onScan(decodedText);
              handleClose();
            },
            () => {
              // Frame scanning callback
            }
          );
        } catch (err: any) {
          console.warn('Camera scanner initialization error:', err);
          setScannerError(
            err?.message || 'Camera permission denied or camera not accessible. You can enter barcode manually below.'
          );
          setIsScanning(false);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(() => {}).finally(() => {
            html5QrCode?.clear();
          });
        }
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {}).finally(() => {
        scannerRef.current?.clear();
        onClose();
      });
    } else {
      onClose();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playBeepSound('success');
    onScan(manualCode.trim());
    setManualCode('');
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <Barcode className="w-5 h-5 text-vyapar-500" />
          <span>{title}</span>
        </span>
      }
      description={description}
      size="md"
    >
      <div className="space-y-4">
        {/* Scanner Viewport */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 min-h-[220px] flex items-center justify-center">
          <div id={containerId} className="w-full" />

          {/* Animated Laser Scanning Line */}
          {isScanning && !scannerError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center">
              <div className="w-64 h-40 border-2 border-vyapar-500/80 rounded-xl relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-vyapar-400" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-vyapar-400" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-vyapar-400" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-vyapar-400" />
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse shadow-sm shadow-rose-500" />
              </div>
            </div>
          )}

          {scannerError && (
            <div className="p-6 text-center text-slate-300 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-xs text-slate-400">{scannerError}</p>
            </div>
          )}
        </div>

        {/* Manual Barcode Entry Fallback */}
        <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Keyboard className="w-4 h-4" />
            <span>Or Enter Barcode Number</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 890103000001"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="font-mono text-sm"
              autoFocus={!!scannerError}
            />
            <Button type="submit" disabled={!manualCode.trim()}>
              Add
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
