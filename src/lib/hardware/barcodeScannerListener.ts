'use client';

import { useEffect, useRef } from 'react';

// Plays an authentic supermarket POS laser scanner beep (2400Hz frequency sine wave)
export function playSupermarketBeep() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, ctx.currentTime); // 2.4kHz crystal beep

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08); // 80ms duration

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (err) {
    // AudioContext autoplay restrictions fallback
  }
}

export interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minChars?: number;
  maxIntervalMs?: number; // max milliseconds between keystrokes to qualify as laser gun
}

export function useHardwareBarcodeScanner({
  onScan,
  enabled = true,
  minChars = 3,
  maxIntervalMs = 50,
}: BarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If time between keystrokes was too long (human typing speed > 60ms), reset buffer
      if (timeDiff > maxIntervalMs) {
        bufferRef.current = '';
      }

      // If Enter key is pressed (Standard barcode scanner suffix)
      if (e.key === 'Enter') {
        const scanned = bufferRef.current.trim();
        if (scanned.length >= minChars) {
          e.preventDefault();
          e.stopPropagation();
          playSupermarketBeep();
          onScan(scanned);
          bufferRef.current = '';
        }
        return;
      }

      // Buffer single printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onScan, enabled, minChars, maxIntervalMs]);
}
