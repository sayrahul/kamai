'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '@/lib/pwa/usePWAInstall';
import { Download, CheckCircle2, Laptop, Smartphone, Sparkles, Share, X, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function PWAInstallSettingsCard() {
  const { isInstalled, isIOS, showIOSModal, setShowIOSModal, triggerInstall } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await triggerInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-amber-400/40 rounded-2xl p-4 sm:p-6 text-white shadow-xl transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: App Icon & Info */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src="/logo.png"
                alt="KamaiPlus App Logo"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-contain bg-slate-950 p-1.5 border border-slate-800 shadow-md"
              />
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-xs">
                PWA
              </span>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                  Install KamaiPlus Desktop &amp; Mobile App
                </h3>
                {isInstalled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>INSTALLED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[10px] font-black">
                    <Sparkles className="w-3 h-3" />
                    <span>RECOMMENDED</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                Install as a standalone app on your PC counter, laptop, or phone. Enjoy lightning-fast 0ms startup, zero browser clutter, full-screen POS mode, and 100% offline billing reliability.
              </p>

              {/* Feature Badges */}
              <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] text-slate-300 font-medium">
                <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/50">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>100% Offline Ready</span>
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/50">
                  <Laptop className="w-3 h-3 text-sky-400" />
                  <span>Desktop &amp; PC</span>
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/50">
                  <Smartphone className="w-3 h-3 text-emerald-400" />
                  <span>Android &amp; iOS</span>
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/50">
                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                  <span>Auto-Synced</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Install Action */}
          <div className="flex items-center gap-2 shrink-0">
            {isInstalled ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Running in Standalone App Mode</span>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>{isInstalling ? 'Launching Prompt...' : 'Install KamaiPlus App'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* iOS Safari Add to Home Screen Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Kamai+" className="w-7 h-7 object-contain" />
                <span className="font-black text-xs text-white">Install on iPhone / iPad</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[11px] shrink-0">
                  1
                </div>
                <div className="text-[11px] leading-relaxed">
                  Tap the <strong className="text-white">Share</strong> icon <Share className="w-3.5 h-3.5 inline mx-1 text-sky-400" /> at the bottom of Safari browser.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[11px] shrink-0">
                  2
                </div>
                <div className="text-[11px] leading-relaxed">
                  Scroll down the share sheet and tap <strong className="text-white">&quot;Add to Home Screen&quot;</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-[11px] shrink-0">
                  3
                </div>
                <div className="text-[11px] leading-relaxed">
                  Tap <strong className="text-emerald-400">&quot;Add&quot;</strong> in the top-right corner to place KamaiPlus on your home screen.
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md shadow-amber-400/20"
            >
              Got It
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
