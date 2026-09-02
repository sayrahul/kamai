'use client';

import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Send, 
  Loader2, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface WhatsAppSettingsTabProps {
  testWhatsAppPhone: string;
  setTestWhatsAppPhone: (val: string) => void;
  isTestingWhatsApp: boolean;
  testWhatsAppResult: {
    success: boolean;
    message: string;
    messageId?: string;
  } | null;
  onSendTestWhatsApp: () => Promise<void>;
  hasCopiedWebhook: boolean;
  setHasCopiedWebhook: (val: boolean) => void;
  hasCopiedToken: boolean;
  setHasCopiedToken: (val: boolean) => void;
}

export const WhatsAppSettingsTab: React.FC<WhatsAppSettingsTabProps> = ({
  testWhatsAppPhone,
  setTestWhatsAppPhone,
  isTestingWhatsApp,
  testWhatsAppResult,
  onSendTestWhatsApp,
  hasCopiedWebhook,
  setHasCopiedWebhook,
  hasCopiedToken,
  setHasCopiedToken,
}) => {
  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/whatsapp/webhook`
    : 'https://your-domain.com/api/whatsapp/webhook';
  
  const verifyToken = 'kamai_whatsapp_verify_token_2026';

  const copyToClipboard = (text: string, type: 'webhook' | 'token') => {
    navigator.clipboard.writeText(text);
    if (type === 'webhook') {
      setHasCopiedWebhook(true);
      setTimeout(() => setHasCopiedWebhook(false), 2500);
    } else {
      setHasCopiedToken(true);
      setTimeout(() => setHasCopiedToken(false), 2500);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Meta WhatsApp Cloud API Header */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center p-1 shrink-0">
              <WhatsAppLogo className="w-full h-full" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Official Meta WhatsApp Cloud API
              </h3>
              <p className="text-[10.5px] text-slate-400">
                Instant digital bills, khata reminders, and daily closing PDF summaries
              </p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
            Active
          </span>
        </div>

        {/* Webhook Configuration Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Webhook Callback URL */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1.5">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Webhook Callback URL</span>
              <button
                type="button"
                onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {hasCopiedWebhook ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{hasCopiedWebhook ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all select-all">
              {webhookUrl}
            </div>
          </div>

          {/* Webhook Verify Token */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1.5">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Verify Token</span>
              <button
                type="button"
                onClick={() => copyToClipboard(verifyToken, 'token')}
                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {hasCopiedToken ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{hasCopiedToken ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all select-all">
              {verifyToken}
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Test Live WhatsApp Message Dispatcher */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Send className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            Test Live WhatsApp Bot Dispatch
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <input
              type="tel"
              placeholder="Enter 10-digit mobile number (e.g. 9876543210)"
              value={testWhatsAppPhone}
              onChange={(e) => setTestWhatsAppPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <Button
            type="button"
            onClick={onSendTestWhatsApp}
            disabled={isTestingWhatsApp || !testWhatsAppPhone.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow-2xs cursor-pointer gap-1.5"
          >
            {isTestingWhatsApp ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Send Test Message</span>
          </Button>
        </div>

        {testWhatsAppResult && (
          <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            testWhatsAppResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <span>{testWhatsAppResult.message}</span>
          </div>
        )}
      </Card>
    </div>
  );
};
