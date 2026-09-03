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
  Save,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AdminBroadcastTabProps {
  broadcastEnabled: boolean;
  setBroadcastEnabled: (val: boolean) => void;
  broadcastMessage: string;
  setBroadcastMessage: (val: string) => void;
  broadcastType: 'festive' | 'info' | 'warning' | 'success';
  setBroadcastType: (val: 'festive' | 'info' | 'warning' | 'success') => void;
  broadcastLink: string;
  setBroadcastLink: (val: string) => void;
  broadcastAudience: 'all' | 'free' | 'pro';
  setBroadcastAudience: (val: 'all' | 'free' | 'pro') => void;
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
  broadcastAudience,
  setBroadcastAudience,
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Configuration Form */}
        <div className="p-4 sm:p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl space-y-4 text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  Global Push Banner Broadcast
                </h3>
                <p className="text-xs text-slate-400">Push real-time announcements to all merchant screens.</p>
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={broadcastEnabled}
                onChange={(e) => setBroadcastEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400" />
              <span className="ml-2 text-xs font-black text-white">
                {broadcastEnabled ? 'LIVE' : 'OFF'}
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Broadcast Message Content (Shown across merchant POS apps)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. ✨ Special Diwali Offer: 50% Off on Kamai+ Pro! Instant WhatsApp bills & GST reports."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Banner Type Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
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
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md font-black'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Target Store Audience</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {broadcastAudience === 'all' ? 'All Merchants' : broadcastAudience === 'free' ? 'Free Trials Only' : 'Pro Subscribers Only'}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: '👥 All Stores', desc: 'All registered' },
                { id: 'free', label: '🆓 Free Trials', desc: 'Upgrade push' },
                { id: 'pro', label: '⭐ Pro Stores', desc: 'VIP notice' },
              ].map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setBroadcastAudience(a.id as any)}
                  className={`p-2.5 rounded-xl text-left transition cursor-pointer border ${
                    broadcastAudience === a.id
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md font-black'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{a.label}</div>
                  <div className={`text-[10px] truncate ${broadcastAudience === a.id ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Link */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Action Deep-Link URL (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. /pricing or /khata or https://wa.me/..."
              value={broadcastLink}
              onChange={(e) => setBroadcastLink(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <Button
            type="button"
            onClick={onSaveBroadcast}
            disabled={isSavingBroadcast}
            className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg shadow-amber-500/10 cursor-pointer gap-2"
          >
            {isSavingBroadcast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save &amp; Deploy Global Broadcast</span>
          </Button>
        </div>

        {/* Right: Live Interactive Mockup Preview */}
        <div className="p-4 sm:p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between space-y-4 text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-black text-white">
                Live POS Terminal Preview
              </h3>
            </div>

            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setBroadcastPreviewDevice('mobile')}
                className={`p-1.5 rounded-lg cursor-pointer transition ${
                  broadcastPreviewDevice === 'mobile' ? 'bg-slate-700 text-amber-400 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setBroadcastPreviewDevice('desktop')}
                className={`p-1.5 rounded-lg cursor-pointer transition ${
                  broadcastPreviewDevice === 'desktop' ? 'bg-slate-700 text-amber-400 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className={`mx-auto w-full transition-all ${
            broadcastPreviewDevice === 'mobile' ? 'max-w-xs' : 'max-w-md'
          }`}>
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold text-center">
                Merchant Screen Header
              </div>

              {broadcastEnabled ? (
                <div className={`p-3 rounded-xl text-xs font-bold text-center shadow-lg ${
                  broadcastType === 'festive'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black'
                    : broadcastType === 'warning'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-sky-600 text-white font-bold'
                }`}>
                  {broadcastMessage || 'Sample live broadcast alert message'}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-600 border border-dashed border-slate-800 rounded-xl">
                  Broadcast banner is currently disabled (OFF).
                </div>
              )}

              <div className="p-5 bg-slate-900/80 rounded-xl text-center text-xs text-slate-500 border border-slate-800/60">
                Store POS Terminal Content Area...
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center font-medium">
            Broadcast updates reflect across all live POS terminals automatically.
          </div>
        </div>
      </div>
    </div>
  );
};
