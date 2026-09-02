'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Receipt, 
  Palette, 
  ArrowRight, 
  FileText, 
  Sparkles 
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PWAInstallSettingsCard } from '@/components/pwa/PWAInstallSettingsCard';

interface InvoiceSettingsTabProps {
  invoicePrefix: string;
  setInvoicePrefix: (val: string) => void;
  nextInvoiceNumber: string;
  setNextInvoiceNumber: (val: string) => void;
  gstPricingMode: 'exclusive' | 'inclusive';
  setGstPricingMode: (val: 'exclusive' | 'inclusive') => void;
  terms: string;
  setTerms: (val: string) => void;
  footerMessage: string;
  setFooterMessage: (val: string) => void;
}

export const InvoiceSettingsTab: React.FC<InvoiceSettingsTabProps> = ({
  invoicePrefix,
  setInvoicePrefix,
  nextInvoiceNumber,
  setNextInvoiceNumber,
  gstPricingMode,
  setGstPricingMode,
  terms,
  setTerms,
  footerMessage,
  setFooterMessage,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Invoice Numbering & Pricing Mode */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Tax Invoice Series &amp; Calculation Rules
            </h3>
          </div>

          <Link
            href="/invoice-designer"
            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center gap-1 shadow-2xs hover:bg-amber-100"
          >
            <Palette className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Customize Bill Layout &amp; Themes</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Invoice Prefix"
            placeholder="e.g. INV- or BILL-"
            value={invoicePrefix}
            onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
          />
          <Input
            label="Next Invoice Sequence #"
            placeholder="e.g. 1"
            type="number"
            value={nextInvoiceNumber}
            onChange={(e) => setNextInvoiceNumber(e.target.value)}
          />
        </div>

        {/* GST Pricing Mode Selector */}
        <div>
          <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
            Default GST Calculation &amp; Price Display Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div
              onClick={() => setGstPricingMode('inclusive')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                gstPricingMode === 'inclusive'
                  ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/30'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  Tax-Inclusive (MRP Pricing)
                </span>
                {gstPricingMode === 'inclusive' && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                )}
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1">
                Selling price includes GST. Ideal for Kirana, Grocery, Retail, FMCG &amp; Apparel.
              </p>
            </div>

            <div
              onClick={() => setGstPricingMode('exclusive')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                gstPricingMode === 'exclusive'
                  ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/30'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  Tax-Exclusive (Base + GST Extra)
                </span>
                {gstPricingMode === 'exclusive' && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                )}
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1">
                GST added on top of base rate. Ideal for B2B Wholesale, Hardware, and Restaurants.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Bill Terms & Footer Note */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <FileText className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            Terms &amp; Conditions and Footer Note
          </h3>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Standard Invoice Terms &amp; Return Policy (Printed at Bottom of Bill)
          </label>
          <textarea
            rows={3}
            placeholder="e.g. 1. Goods once sold will not be taken back after 7 days. 2. Subject to local jurisdiction."
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Footer Thank You Message
          </label>
          <input
            type="text"
            placeholder="e.g. Thank you for shopping with us! Visit again. 🙏"
            value={footerMessage}
            onChange={(e) => setFooterMessage(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </Card>

      {/* 3. Offline PWA & App Version */}
      <PWAInstallSettingsCard />
    </div>
  );
};
