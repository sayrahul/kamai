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
import { Card } from '@/components/ui/Card';
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
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center p-1 shrink-0">
              <WhatsAppLogo className="w-full h-full" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Merchant WhatsApp Outreach &amp; Conversion Campaigns
              </h3>
              <p className="text-[10.5px] text-slate-400">
                Engage store owners via official WhatsApp message templates and upgrade offers.
              </p>
            </div>
          </div>
        </div>

        {/* Campaign Templates */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Select Campaign Template
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-left ${
                  waTemplate === t.id
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400/30'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Editor */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Message Copy
          </label>
          <textarea
            rows={4}
            value={waCustomText}
            onChange={(e) => setWaCustomText(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Test Dispatch Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="text-xs font-black text-slate-800 dark:text-slate-200">
            Send Test Dispatch to Phone
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="tel"
              placeholder="Enter 10-digit mobile number..."
              value={waTestPhone}
              onChange={(e) => setWaTestPhone(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
            />
            <Button
              type="button"
              onClick={onSendTestOutreach}
              disabled={isSendingOutreach || !waTestPhone.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow-2xs cursor-pointer gap-1.5"
            >
              {isSendingOutreach ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Send Live Test</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
