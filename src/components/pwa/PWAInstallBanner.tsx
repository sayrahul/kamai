'use client';

import React, { useState } from 'react';
import { Download, X, Laptop, Smartphone, Check, Share } from 'lucide-react';
import { usePWAInstall } from '@/lib/pwa/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstalled, isIOS, showIOSModal, setShowIOSModal, triggerInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Compact Install Banner */}
      <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 bg-slate-900 border border-slate-700 text-white rounded-xl p-3 select-none">
        <div className="flex items-center justify-between gap-2.5">
          {/* Left: App Icon & Text */}
          <div className="flex items-center gap-2.5 min-w-0">
            <img 
              src="/logo.png" 
              alt="KamaiPlus" 
              className="w-9 h-9 object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs font-black text-white truncate flex items-center gap-1.5">
                <span>Install KamaiPlus</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                  APP
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                100% Offline • Desktop & Mobile
              </div>
            </div>
          </div>

          {/* Right: Install & Close Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={triggerInstall}
              className="px-3 py-1.5 rounded bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-950" />
              <span>Install</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded text-slate-400 hover:text-white bg-slate-800 border border-slate-700 cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Add to Home Screen Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Kamai+" className="w-7 h-7 object-contain" />
                <span className="font-bold text-xs">Install on iPhone / iPad</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="p-1 rounded bg-slate-800 text-amber-400 font-bold">1</div>
                <div className="text-[11px]">
                  Tap the <strong className="text-white">Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-sky-400" /> at the bottom of Safari.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="p-1 rounded bg-slate-800 text-amber-400 font-bold">2</div>
                <div className="text-[11px]">
                  Scroll down and tap <strong className="text-white">&quot;Add to Home Screen&quot;</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="p-1 rounded bg-slate-800 text-amber-400 font-bold">3</div>
                <div className="text-[11px]">
                  Tap <strong className="text-emerald-400">&quot;Add&quot;</strong> in the top right to complete installation.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 rounded bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
