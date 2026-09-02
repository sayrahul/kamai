'use client';

import React from 'react';
import { 
  Radio, 
  Send, 
  Eye, 
  Smartphone, 
  Monitor, 
  Sparkles, 
  Loader2, 
  Save 
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GlobalBroadcastBanner } from '@/components/common/GlobalBroadcastBanner';

interface AdminBroadcastTabProps {
  broadcastEnabled: boolean;
  setBroadcastEnabled: (val: boolean) => void;
  broadcastMessage: string;
  setBroadcastMessage: (val: string) => void;
  broadcastType: 'festive' | 'info' | 'warning' | 'success';
  setBroadcastType: (val: 'festive' | 'info' | 'warning' | 'success') => void;
  broadcastLink: string;
  setBroadcastLink: (val: string) => void;
  broadcastDuration: 'always' | '24h' | '3d' | '7d' | 'custom';
  setBroadcastDuration: (val: 'always' | '24h' | '3d' | '7d' | 'custom') => void;
  customBroadcastExpiry: string;
  setCustomBroadcastExpiry: (val: string) => void;
  isSavingBroadcast: boolean;
  onSaveBroadcast: () => Promise<void>;
  broadcastPreviewDevice: 'mobile' | 'desktop';
  setBroadcastPreviewDevice: (val: 'mobile' | 'desktop') => void;
}

export const AdminBroadcastTab: React.FC<AdminBroadcastTabProps> = ({
  broadcastEnabled,
  setBroadcastEnabled,
  broadcastMessage,
  setBroadcastMessage,
  broadcastType,
  setBroadcastType,
  broadcastLink,
  setBroadcastLink,
  broadcastDuration,
  setBroadcastDuration,
  customBroadcastExpiry,
  setCustomBroadcastExpiry,
  isSavingBroadcast,
  onSaveBroadcast,
  broadcastPreviewDevice,
  setBroadcastPreviewDevice,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Configuration Form */}
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-600 animate-pulse" />
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Global Push Banner Broadcast
              </h3>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={broadcastEnabled}
                onChange={(e) => setBroadcastEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-amber-500" />
              <span className="ml-2 text-xs font-black text-slate-900 dark:text-slate-100">
                {broadcastEnabled ? 'LIVE' : 'OFF'}
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Broadcast Message Content (Shown to all retail users)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. ✨ Special Diwali Offer: 50% Off on Kamai+ Pro! Instant WhatsApp bills & GST reports."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Banner Type Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Banner Theme / Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'festive', label: '✨ Festive Offer' },
                { id: 'info', label: 'ℹ️ Information' },
                { id: 'warning', label: '⚠️ Alert' },
                { id: 'success', label: '🎉 Success' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setBroadcastType(t.id as any)}
                  className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    broadcastType === t.id
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Link */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Action Deep-Link URL (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. /pricing or /khata or https://wa.me/..."
              value={broadcastLink}
              onChange={(e) => setBroadcastLink(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <Button
            type="button"
            onClick={onSaveBroadcast}
            disabled={isSavingBroadcast}
            className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 font-black text-xs py-2.5 rounded-xl shadow-2xs cursor-pointer gap-2"
          >
            {isSavingBroadcast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save &amp; Deploy Global Broadcast</span>
          </Button>
        </Card>

        {/* Right: Live Interactive Mockup Preview */}
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Live Retail App Preview
              </h3>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setBroadcastPreviewDevice('mobile')}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  broadcastPreviewDevice === 'mobile' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-400'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setBroadcastPreviewDevice('desktop')}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  broadcastPreviewDevice === 'desktop' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-400'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className={`mx-auto w-full transition-all ${
            broadcastPreviewDevice === 'mobile' ? 'max-w-xs' : 'max-w-md'
          }`}>
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-xl space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold text-center">
                Merchant Screen Header
              </div>

              {broadcastEnabled ? (
                <div className={`p-2.5 rounded-xl text-xs font-bold text-center ${
                  broadcastType === 'festive'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950'
                    : broadcastType === 'warning'
                    ? 'bg-rose-600 text-white'
                    : 'bg-sky-600 text-white'
                }`}>
                  {broadcastMessage}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-600 border border-dashed border-slate-800 rounded-xl">
                  Broadcast banner is currently disabled (OFF).
                </div>
              )}

              <div className="p-4 bg-slate-900 rounded-xl text-center text-xs text-slate-500">
                Store POS Billing Content Area...
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center font-medium">
            Broadcast updates reflect across all live POS terminals within 60 seconds.
          </div>
        </Card>
      </div>
    </div>
  );
};
