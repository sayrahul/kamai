'use client';

import React, { useState, useEffect } from 'react';
import { paymentBridge } from '@/lib/payments/paymentBridge';
import { Volume2, Smartphone, ShieldCheck, AlertCircle, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { soundboxEngine } from '@/lib/payments/soundboxEngine';
import { SupportedLanguage } from '@/types';

interface NativeSoundboxStatusCardProps {
  language?: SupportedLanguage;
}

export function NativeSoundboxStatusCard({ language = 'hi' }: NativeSoundboxStatusCardProps) {
  const [isNative, setIsNative] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const checkStatus = async () => {
    setIsChecking(true);
    const native = paymentBridge.isNative();
    setIsNative(native);

    if (native) {
      const permitted = await paymentBridge.checkNotificationPermission();
      setHasPermission(permitted);
    }
    setIsChecking(false);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleOpenSettings = async () => {
    await paymentBridge.openNotificationAccessSettings();
    // Re-check after returning from settings
    setTimeout(checkStatus, 2000);
  };

  const handleTestSoundbox = async () => {
    setTestStatus('Speaking...');
    // 1. If on native Android, trigger native TTS
    if (isNative) {
      await paymentBridge.speakNativeVoice(500, language);
    }
    // 2. Also trigger Web Audio soundbox engine as fallback
    await soundboxEngine.announcePayment(500, 'KamaiPlus');

    // 3. Simulate payment in paymentBridge to test POS auto-match
    paymentBridge.simulatePayment(500, 'Rahul Verma', 'PhonePe');

    setTimeout(() => {
      setTestStatus('✅ Test announcement completed!');
      setTimeout(() => setTestStatus(null), 3000);
    }, 1500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-1.5">
              <span>Android UPI Soundbox &amp; Background Listener</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                Zero-Hardware
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Listens to PhonePe, Paytm, GPay &amp; Bank SMS alerts in the background and speaks voice announcements.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={checkStatus}
          disabled={isChecking}
          className="self-start sm:self-center p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          title="Refresh Permission Status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Platform & Permission Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Device Mode */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-[11px] text-slate-400">Execution Runtime</div>
              <div className="text-xs font-bold text-white">
                {isNative ? 'Android Native Container (Capacitor)' : 'Web Browser (PWA)'}
              </div>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
            isNative ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          }`}>
            {isNative ? 'APK Native' : 'PWA Ready'}
          </span>
        </div>

        {/* Background Listener Status */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${hasPermission || !isNative ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div>
              <div className="text-[11px] text-slate-400">Background Listener Access</div>
              <div className="text-xs font-bold text-white">
                {isNative 
                  ? (hasPermission ? 'Active (Screen Off Listening)' : 'Permission Required')
                  : 'Web Notification Bridge'
                }
              </div>
            </div>
          </div>

          {isNative ? (
            hasPermission ? (
              <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>ONLINE</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleOpenSettings}
                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 text-[10px] font-black cursor-pointer shadow-xs transition"
              >
                Enable Access
              </button>
            )
          ) : (
            <span className="text-[10px] font-bold text-slate-400">
              Web Audio Active
            </span>
          )}
        </div>
      </div>

      {/* Supported Payment Apps */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-300 block">Supported Automatic Payment Apps</label>
        <div className="flex flex-wrap gap-1.5">
          {['PhonePe for Business', 'Paytm for Business', 'Google Pay', 'BHIM UPI', 'HDFC Bank SMS', 'SBI Bank SMS', 'ICICI SMS'].map((app) => (
            <span
              key={app}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-medium"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{app}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <button
          type="button"
          onClick={handleTestSoundbox}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs font-black shadow-md shadow-amber-400/20 active:scale-95 transition cursor-pointer"
        >
          <Volume2 className="w-4 h-4" />
          <span>Test Payment Voice Announcement (₹500)</span>
        </button>

        {isNative && !hasPermission && (
          <button
            type="button"
            onClick={handleOpenSettings}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Android Notification Settings</span>
          </button>
        )}
      </div>

      {testStatus && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>{testStatus}</span>
        </div>
      )}
    </div>
  );
}
