'use client';

import React, { useState } from 'react';
import { Business, Sale, CashExpense } from '@/types';
import { formatINR } from '@/lib/utils';
import { generateDailyClosingPDF } from '@/lib/reports/dailyClosingPdf';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Banknote, 
  QrCode, 
  BookOpen, 
  ArrowDownLeft, 
  Store,
  Sparkles,
  FileDown,
  Printer
} from 'lucide-react';

interface DayEndClosingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null | undefined;
  sales: Sale[];
  expenses: CashExpense[];
  selectedDate?: string; // YYYY-MM-DD
}

export const DayEndClosingReportModal: React.FC<DayEndClosingReportModalProps> = ({
  isOpen,
  onClose,
  business,
  sales,
  expenses,
  selectedDate,
}) => {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [targetPhone, setTargetPhone] = useState(business?.phone || '');

  // Filter sales & expenses for the target day
  const datePrefix = selectedDate || new Date().toISOString().split('T')[0];
  const daysSales = sales.filter((s) => s.created_at.startsWith(datePrefix) && s.status !== 'cancelled');
  const daysExpenses = expenses.filter((e) => e.created_at.startsWith(datePrefix));

  // Calculations
  let totalSalesPaise = 0;
  let cashSalesPaise = 0;
  let upiSalesPaise = 0;
  let creditSalesPaise = 0;
  let totalItemsCount = 0;
  const productFrequency: { [name: string]: number } = {};

  daysSales.forEach((s) => {
    totalSalesPaise += s.grand_total;
    s.items.forEach((item) => {
      totalItemsCount += item.quantity;
      productFrequency[item.product_name] = (productFrequency[item.product_name] || 0) + item.quantity;
    });

    if (s.payment_method === 'cash') {
      cashSalesPaise += s.amount_received;
    } else if (s.payment_method === 'upi') {
      upiSalesPaise += s.amount_received;
    } else if (s.payment_method === 'credit') {
      creditSalesPaise += s.grand_total;
    } else if (s.payment_method === 'split' && s.payment_split) {
      cashSalesPaise += s.payment_split.cash_amount || 0;
      upiSalesPaise += s.payment_split.upi_amount || 0;
      creditSalesPaise += s.payment_split.credit_amount || 0;
    }
  });

  const totalExpensePaise = daysExpenses.reduce((sum, e) => sum + e.amount, 0);
  const cashExpensePaise = daysExpenses
    .filter((e) => e.payment_mode === 'cash')
    .reduce((sum, e) => sum + e.amount, 0);

  const netCashInTillPaise = Math.max(0, cashSalesPaise - cashExpensePaise);

  // Top 3 Items
  const topItems = Object.entries(productFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Format date display
  const dateFormatted = new Date(datePrefix).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Construct WhatsApp Message Payload
  const constructWhatsAppMessage = () => {
    const storeName = business?.name || 'My Store';
    let msg = `🏪 *${storeName.toUpperCase()} — DAILY CLOSING REPORT*\n`;
    msg += `📅 Date: ${dateFormatted} | ⏰ ${timeFormatted}\n`;
    msg += `─────────────────────────\n\n`;

    msg += `📊 *TODAY'S SALES OVERVIEW:*\n`;
    msg += `• 🧾 Total Invoices: *${daysSales.length} bills*\n`;
    msg += `• 💰 Gross Sales (Kul Bikri): *${formatINR(totalSalesPaise)}*\n`;
    msg += `• 📦 Total Items Sold: *${totalItemsCount} pcs*\n\n`;

    msg += `💳 *COLLECTIONS BREAKDOWN:*\n`;
    msg += `• 💵 Cash Sales: *${formatINR(cashSalesPaise)}*\n`;
    msg += `• 📱 UPI / Online QR: *${formatINR(upiSalesPaise)}*\n`;
    msg += `• 📒 Customer Credit (Udhar): *${formatINR(creditSalesPaise)}*\n\n`;

    if (totalExpensePaise > 0) {
      msg += `🔻 *STORE EXPENSES:*\n`;
      msg += `• Total Expenses: -${formatINR(totalExpensePaise)}\n`;
      msg += `• 💵 Net Cash in Till: *${formatINR(netCashInTillPaise)}*\n\n`;
    }

    if (topItems.length > 0) {
      msg += `⭐ *TOP SELLING PRODUCTS TODAY:*\n`;
      topItems.forEach(([name, qty], idx) => {
        msg += `${idx + 1}. ${name} (${qty} sold)\n`;
      });
      msg += `\n`;
    }

    msg += `✅ *Day Shift Safely Closed!* 🙏\n`;
    msg += `_Generated via KamaiPlus Store POS_`;
    return msg;
  };

  const handleSendWhatsApp = () => {
    const message = constructWhatsAppMessage();
    const cleanNumber = targetPhone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;

    if (phoneWithCountry) {
      window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const handleCopyText = async () => {
    const message = constructWhatsAppMessage();
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      alert('Failed to copy text.');
    }
  };

  // Download PDF Report
  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    try {
      const { blob, filename } = generateDailyClosingPDF({
        business,
        sales,
        expenses,
        dateStr: datePrefix,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to generate Closing PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="1-Tap Day-End Closing & Z-Report"
      description="Official store closing summary & hisab-kitab for WhatsApp and PDF archival."
      size="md"
    >
      <div className="space-y-4 text-xs p-0.5">
        {/* Preview Card */}
        <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 font-sans shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <div className="font-black text-xs text-white uppercase tracking-wide">
                  {business?.name || 'My Store'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {dateFormatted} • {timeFormatted}
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
              Shift Closing
            </span>
          </div>

          {/* Key Totals Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Sales (Bikri)</span>
              <div className="text-base font-black text-amber-400 font-mono mt-0.5">
                {formatINR(totalSalesPaise)}
              </div>
              <span className="text-[10px] text-slate-400">{daysSales.length} bills generated</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Cash in Hand</span>
              <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
                {formatINR(netCashInTillPaise)}
              </div>
              <span className="text-[10px] text-slate-400">After ₹{(cashExpensePaise / 100).toFixed(0)} expenses</span>
            </div>
          </div>

          {/* Payment Breakdown Rows */}
          <div className="space-y-1.5 pt-1 text-[11px] font-mono border-t border-slate-800/80 text-slate-300">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Banknote className="w-3.5 h-3.5 text-amber-400" /> Cash Collections:
              </span>
              <span className="font-bold text-white">{formatINR(cashSalesPaise)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-slate-400">
                <QrCode className="w-3.5 h-3.5 text-sky-400" /> UPI / QR Payments:
              </span>
              <span className="font-bold text-white">{formatINR(upiSalesPaise)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-slate-400">
                <BookOpen className="w-3.5 h-3.5 text-rose-400" /> Customer Udhar (Credit):
              </span>
              <span className="font-bold text-white">{formatINR(creditSalesPaise)}</span>
            </div>
          </div>

          {/* Top 3 Products */}
          {topItems.length > 0 && (
            <div className="pt-2 border-t border-slate-800 text-[11px]">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                Top Selling Today:
              </span>
              <div className="space-y-1 text-slate-300">
                {topItems.map(([name, qty], idx) => (
                  <div key={name} className="flex justify-between">
                    <span className="truncate max-w-[200px]">{idx + 1}. {name}</span>
                    <span className="font-mono text-slate-400 font-bold">{qty} sold</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* WhatsApp Mobile Number Input */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Send WhatsApp Summary To:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              placeholder="Enter WhatsApp mobile (e.g. 9876543210)"
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-slate-900"
            />
          </div>
        </div>

        {/* 3 Action Buttons: Copy, PDF, WhatsApp */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyText}
            className="w-full font-bold text-[11px] gap-1 rounded-xl border-slate-300 hover:bg-slate-50 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-black">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                <span>Copy Text</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="w-full font-bold text-[11px] gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border-slate-900 cursor-pointer shadow-xs"
          >
            <FileDown className="w-3.5 h-3.5 text-amber-400" />
            <span>{isGeneratingPdf ? 'Saving...' : 'PDF Report'}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSendWhatsApp}
            className="w-full font-black text-[11px] gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-white" />
            <span>WhatsApp</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
