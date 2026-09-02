'use client';

import React from 'react';
import { 
  Send, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';
import { Button } from '@/components/ui/Button';

interface AdminWhatsAppTabProps {
  waTemplate: 'welcome' | 'offer50' | 'renewal' | 'features' | 'custom';
  setWaTemplate: (val: 'welcome' | 'offer50' | 'renewal' | 'features' | 'custom') => void;
  waCustomText: string;
  setWaCustomText: (val: string) => void;
  waTestPhone: string;
  setWaTestPhone: (val: string) => void;
  waTargetTier: 'all' | 'free' | 'pro';
  setWaTargetTier: (val: 'all' | 'free' | 'pro') => void;
  onSendTestOutreach: () => Promise<void>;
  isSendingOutreach: boolean;
}

export const AdminWhatsAppTab: React.FC<AdminWhatsAppTabProps> = ({
  waTemplate,
  setWaTemplate,
  waCustomText,
  setWaCustomText,
  waTestPhone,
  setWaTestPhone,
  waTargetTier,
  setWaTargetTier,
  onSendTestOutreach,
  isSendingOutreach,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="p-4 sm:p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl space-y-4 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center p-2 shrink-0">
              <WhatsAppLogo className="w-full h-full" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">
                Merchant WhatsApp Outreach &amp; Conversion Campaigns
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Engage store owners via official WhatsApp message templates and upgrade offers.
              </p>
            </div>
          </div>
        </div>

        {/* Campaign Templates */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-2">
            Select Campaign Template
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'offer50', label: '🔥 50% Off Pro Offer' },
              { id: 'welcome', label: '🙏 Welcome & Setup' },
              { id: 'features', label: '🚀 New Features Update' },
              { id: 'custom', label: '✏️ Custom Message' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setWaTemplate(t.id as any)}
                className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer text-left ${
                  waTemplate === t.id
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 ring-2 ring-emerald-500/20 font-black'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Editor */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            Message Copy
          </label>
          <textarea
            rows={4}
            value={waCustomText}
            onChange={(e) => setWaCustomText(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Test Dispatch Bar */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <input
              type="tel"
              placeholder="Test Mobile # (e.g. 9876543210)"
              value={waTestPhone}
              onChange={(e) => setWaTestPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <Button
            type="button"
            onClick={onSendTestOutreach}
            disabled={isSendingOutreach || !waTestPhone.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer gap-2 shrink-0"
          >
            {isSendingOutreach ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-slate-950" />}
            <span>Send Test Message</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
