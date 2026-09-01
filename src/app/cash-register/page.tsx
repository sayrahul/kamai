'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { CashRegister, CashExpense, Sale } from '@/types';
import { formatINR, cn } from '@/lib/utils';
import { bluetoothPrinter } from '@/lib/hardware/bluetoothPrinter';
import { EscPosEncoder } from '@/lib/hardware/escpos';
import { 
  Calculator, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Share2, 
  Plus, 
  Minus,
  Receipt, 
  Lock, 
  Unlock, 
  Clock, 
  Calendar, 
  Sparkles, 
  QrCode, 
  Banknote, 
  BookOpen, 
  TrendingUp, 
  TrendingDown,
  Sliders,
  FileText,
  History
} from 'lucide-react';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { DayEndClosingReportModal } from '@/components/reports/DayEndClosingReportModal';
import { useProSubscription, ProFeatureBadge } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

export default function CashRegisterPage() {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  
  // Current active open shift query
  const activeShift = useLiveQuery(async () => {
    return await db.cash_registers.where('status').equals('open').first();
  });

  const allShifts = useLiveQuery(async () => {
    return await db.cash_registers.orderBy('opened_at').reverse().toArray();
  }) || [];

  // All sales for today using high-performance IndexedDB range query on 'created_at' index
  const todayDatePrefix = new Date().toISOString().split('T')[0];
  const todaySales = useLiveQuery(async () => {
    const todayStart = `${todayDatePrefix}T00:00:00.000Z`;
    const todayEnd = `${todayDatePrefix}T23:59:59.999Z`;
    const sales = await db.sales.where('created_at').between(todayStart, todayEnd, true, true).toArray();
    return sales.filter((s) => s.status !== 'cancelled');
  }, [todayDatePrefix]) || [];

  // All expenses for today using high-performance IndexedDB range query on 'created_at' index
  const todayExpenses = useLiveQuery(async () => {
    const todayStart = `${todayDatePrefix}T00:00:00.000Z`;
    const todayEnd = `${todayDatePrefix}T23:59:59.999Z`;
    return await db.cash_expenses.where('created_at').between(todayStart, todayEnd, true, true).toArray();
  }, [todayDatePrefix]) || [];

  // State
  const [openingCashInput, setOpeningCashInput] = useState<string>('2000');
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState<boolean>(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState<boolean>(false);
  const [isClosingReportModalOpen, setIsClosingReportModalOpen] = useState<boolean>(false);

  // New Expense Form
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<any>('tea_snacks');
  const [expensePaidTo, setExpensePaidTo] = useState('');
  const [expenseMode, setExpenseMode] = useState<'cash' | 'upi'>('cash');

  // Denomination Counter State
  const [denominations, setDenominations] = useState<{ [key: number]: number }>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  });

  // Calculate live financial tallies
  let cashSalesTotalPaise = 0;
  let upiSalesTotalPaise = 0;
  let creditSalesTotalPaise = 0;

  todaySales.forEach((sale) => {
    if (sale.payment_method === 'cash') {
      cashSalesTotalPaise += sale.amount_received;
    } else if (sale.payment_method === 'upi') {
      upiSalesTotalPaise += sale.amount_received;
    } else if (sale.payment_method === 'credit') {
      creditSalesTotalPaise += sale.grand_total;
    } else if (sale.payment_method === 'split' && sale.payment_split) {
      cashSalesTotalPaise += sale.payment_split.cash_amount || 0;
      upiSalesTotalPaise += sale.payment_split.upi_amount || 0;
      creditSalesTotalPaise += sale.payment_split.credit_amount || 0;
    }
  });

  const cashExpensesPaise = todayExpenses
    .filter((e) => e.payment_mode === 'cash')
    .reduce((acc, e) => acc + e.amount, 0);

  const upiExpensesPaise = todayExpenses
    .filter((e) => e.payment_mode === 'upi')
    .reduce((acc, e) => acc + e.amount, 0);

  const openingFloatPaise = activeShift?.opening_cash || 0;
  const expectedCashInTillPaise = Math.max(0, openingFloatPaise + cashSalesTotalPaise - cashExpensesPaise);

  // Calculate Total Actual Cash Counted from Denominations
  const actualCountedCashPaise = Object.entries(denominations).reduce(
    (acc, [denom, count]) => acc + parseInt(denom) * (count || 0) * 100,
    0
  );

  const cashVariancePaise = actualCountedCashPaise - expectedCashInTillPaise;

  // Open New Register Shift
  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    const floatPaise = Math.round(parseFloat(openingCashInput || '0') * 100);
    const newShift: CashRegister = {
      id: `shift_${Date.now()}`,
      business_id: business.id,
      opened_at: new Date().toISOString(),
      opening_cash: floatPaise,
      cash_sales: 0,
      upi_sales: 0,
      credit_sales: 0,
      cash_in: floatPaise,
      cash_out: 0,
      expected_closing_cash: floatPaise,
      status: 'open',
      opened_by: business.owner_name || 'Owner',
    };

    await db.cash_registers.put(newShift);
    setIsOpeningModalOpen(false);
  };

  // Add Petty Cash Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !expenseTitle || !expenseAmount) return;

    const amtPaise = Math.round(parseFloat(expenseAmount) * 100);
    const newExp: CashExpense = {
      id: `exp_${Date.now()}`,
      business_id: business.id,
      title: expenseTitle.trim(),
      amount: amtPaise,
      category: expenseCategory,
      paid_to: expensePaidTo.trim(),
      payment_mode: expenseMode,
      created_by: business.owner_name || 'Owner',
      created_at: new Date().toISOString(),
    };

    await db.cash_expenses.put(newExp);
    setIsExpenseModalOpen(false);
    setExpenseTitle('');
    setExpenseAmount('');
    setExpensePaidTo('');
  };

  // Close Register Shift & Save Z-Report
  const handleCloseShift = async () => {
    if (!activeShift) return;

    const now = new Date().toISOString();
    await db.cash_registers.update(activeShift.id, {
      closed_at: now,
      cash_sales: cashSalesTotalPaise,
      upi_sales: upiSalesTotalPaise,
      credit_sales: creditSalesTotalPaise,
      cash_out: cashExpensesPaise,
      expected_closing_cash: expectedCashInTillPaise,
      actual_closing_cash: actualCountedCashPaise,
      difference: cashVariancePaise,
      status: 'closed',
      closed_by: business?.owner_name || 'Owner',
    });

    setIsClosingModalOpen(false);
    setIsClosingReportModalOpen(true);
  };

  // 1-Click Print Z-Report Slip over Bluetooth ESC/POS
  const handlePrintZReportBluetooth = async () => {
    if (!business) return;
    try {
      const enc = new EscPosEncoder(58);
      enc.alignCenter();
      enc.doubleHeight(true).bold(true).textLine(business.name).bold(false).doubleHeight(false);
      enc.textLine('DAILY Z-REPORT • HISAB-KITAB');
      enc.textLine(new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }));
      enc.hr();

      enc.alignLeft();
      enc.row('Opening Cash Float:', formatINR(openingFloatPaise));
      enc.row('Cash Sales Today (+):', formatINR(cashSalesTotalPaise));
      enc.row('Cash Expenses (-):', formatINR(cashExpensesPaise));
      enc.hr();
      enc.bold(true).row('EXPECTED CASH IN TILL:', formatINR(expectedCashInTillPaise)).bold(false);
      enc.row('Actual Counted Cash:', formatINR(actualCountedCashPaise));
      enc.bold(true).row('CASH VARIANCE:', formatINR(cashVariancePaise)).bold(false);
      enc.hr();

      enc.alignLeft();
      enc.textLine('* DIGITAL / CREDIT SALES *');
      enc.row('UPI / QR Collections:', formatINR(upiSalesTotalPaise));
      enc.row('Customer Credit Sales:', formatINR(creditSalesTotalPaise));
      enc.row('Total Bills Generated:', todaySales.length.toString());
      enc.hr();

      enc.alignCenter();
      enc.feed(1);
      enc.textLine('--- END OF DAY Z-REPORT ---');
      enc.cut();

      await bluetoothPrinter.sendRawBytes(enc.getBytes());
    } catch (err: any) {
      alert(err.message || 'Bluetooth printing failed.');
    }
  };

  // WhatsApp Z-Report Dispatch to Owner via Official WhatsApp Cloud API
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppNotice, setWhatsAppNotice] = useState<string | null>(null);

  const handleSendZReportWhatsApp = async () => {
    if (!business) return;
    setIsSendingWhatsApp(true);
    setWhatsAppNotice(null);

    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const targetPhone = business.phone || '';

    try {
      const res = await fetch('/api/reports/send-daily-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toPhone: targetPhone,
          storeName: business.name || 'My Store',
          ownerName: business.owner_name || 'Store Owner',
          dateFormatted: dateStr,
          timeFormatted: timeStr,
          summary: {
            totalInvoices: todaySales.length,
            grossSales: formatINR(cashSalesTotalPaise + upiSalesTotalPaise + creditSalesTotalPaise),
            cashSales: formatINR(cashSalesTotalPaise),
            upiSales: formatINR(upiSalesTotalPaise),
            creditSales: formatINR(creditSalesTotalPaise),
            totalExpenses: formatINR(cashExpensesPaise),
            netCash: formatINR(actualCountedCashPaise || expectedCashInTillPaise),
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setWhatsAppNotice(`✅ Z-Report sent directly to owner WhatsApp (+91 ${targetPhone.slice(-10)})`);
      } else {
        setWhatsAppNotice(`⚠️ WhatsApp notice: ${data.error || 'Failed to dispatch'}`);
      }
    } catch (err: any) {
      setWhatsAppNotice(`⚠️ Could not contact WhatsApp API.`);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* ---------------- HEADER BAR ---------------- */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              activeShift
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}>
              {activeShift ? <Unlock className="w-3.5 h-3.5 text-emerald-700" /> : <Lock className="w-3.5 h-3.5 text-amber-700" />}
              <span>{activeShift ? 'Register Open (Shift Active)' : 'Register Closed'}</span>
            </span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Daily Hisab-Kitab & Cash Drawer Tally
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Day-End Cash Register & Shift Closing
          </h1>
          <p className="text-xs text-slate-500">
            Reconcile daily cash float, track petty expenses, match actual note denominations, and generate daily Z-Reports.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1-Tap WhatsApp Summary Action Button */}
          <Button
            size="sm"
            onClick={() => {
              if (!isPro) {
                setIsUpgradeModalOpen(true);
              } else {
                setIsClosingReportModalOpen(true);
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
          >
            <WhatsAppLogo className="w-3.5 h-3.5" />
            <span>WhatsApp Day Summary</span>
            {!isPro && <Lock className="w-3 h-3 text-amber-300" />}
          </Button>

          {activeShift ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpenseModalOpen(true)}
                className="text-xs font-bold gap-1 bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-rose-700" />
                <span>Add Expense</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setIsClosingModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>Count & Close Shift</span>
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsOpeningModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Open Cash Register</span>
            </Button>
          )}
        </div>
      </div>

      {/* ---------------- LIVE REGISTRY SUMMARY RIBBON (Space-Saving & Unified) ---------------- */}
      <Card className="p-2 sm:p-2.5 bg-white border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* 1. Opening Float */}
          <div className="px-2 py-1 sm:py-0 sm:first:pl-1">
            <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Opening Float</span>
              <Lock className="w-3 h-3 text-slate-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5 leading-tight">
              {formatINR(openingFloatPaise)}
            </div>
          </div>

          {/* 2. Cash Sales In */}
          <div className="px-2 py-1 sm:py-0">
            <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Banknote className="w-3 h-3 text-emerald-600" />
                <span>Cash In (+)</span>
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-800 font-mono mt-0.5 leading-tight">
              {formatINR(cashSalesTotalPaise)}
            </div>
          </div>

          {/* 3. Cash Expenses Out */}
          <div className="px-2 py-1 sm:py-0 pt-1.5 sm:pt-0">
            <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <ArrowDownLeft className="w-3 h-3 text-rose-600" />
                <span>Cash Out (-)</span>
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-rose-800 font-mono mt-0.5 leading-tight">
              {formatINR(cashExpensesPaise)}
            </div>
          </div>

          {/* 4. Expected in Till */}
          <div className="px-2 py-1 sm:py-0 pt-1.5 sm:pt-0">
            <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-amber-600" />
                <span>Expected Till</span>
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-amber-900 font-mono mt-0.5 leading-tight">
              {formatINR(expectedCashInTillPaise)}
            </div>
          </div>
        </div>
      </Card>

      {/* ---------------- 2 COLUMNS: CASH RECONCILIATION & EXPENSES ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CURRENCY DENOMINATION CALCULATOR (7 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-3 sm:p-4 bg-white border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-slate-700" />
                  <span>Physical Cash Denomination Counter</span>
                </h2>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Count notes & coins in drawer to verify against expected till balance.
                </p>
              </div>
              {actualCountedCashPaise > 0 && (
                <button
                  type="button"
                  onClick={() => setDenominations({ 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 })}
                  className="text-[10.5px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded cursor-pointer transition"
                >
                  Reset
                </button>
              )}
            </div>

            {/* 2-Column Denomination Grid: Denom [ - ] [ field ] [ + ] = Total */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {[500, 200, 100, 50, 20, 10, 5, 1].map((denom) => {
                const count = denominations[denom] || 0;
                const total = denom * count;
                return (
                  <div
                    key={denom}
                    className={cn(
                      "flex items-center justify-between gap-1 border rounded-lg p-1.5 sm:px-2.5 sm:py-1.5 transition-all shadow-2xs",
                      count > 0 
                        ? "bg-amber-50/90 border-amber-300 ring-1 ring-amber-200" 
                        : "bg-slate-50/70 hover:bg-slate-100/70 border-slate-200"
                    )}
                  >
                    {/* 1. Minimized Width Note Label */}
                    <div className="min-w-[34px] sm:min-w-[42px] font-extrabold text-xs sm:text-sm text-slate-900 font-mono flex-shrink-0">
                      ₹{denom}
                    </div>

                    {/* 2. [-] [ field ] [+] Stepper */}
                    <div className="flex items-center bg-white border border-slate-300 rounded-md overflow-hidden shadow-2xs flex-shrink-0">
                      {/* Minus Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setDenominations((prev) => ({
                            ...prev,
                            [denom]: Math.max(0, (prev[denom] || 0) - 1),
                          }));
                        }}
                        disabled={count <= 0}
                        className="w-5 sm:w-6 h-6 sm:h-7 text-slate-600 hover:text-slate-950 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-25 disabled:hover:bg-white cursor-pointer select-none transition flex items-center justify-center border-r border-slate-200"
                        title="Minus 1"
                        aria-label={`Minus 1 ₹${denom}`}
                      >
                        <Minus className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                      </button>

                      {/* Number Field */}
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={count || ''}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setDenominations((prev) => ({ ...prev, [denom]: val }));
                        }}
                        className="w-7 sm:w-10 bg-transparent text-slate-950 font-mono font-black text-xs text-center py-0.5 px-0.5 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />

                      {/* Plus Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setDenominations((prev) => ({
                            ...prev,
                            [denom]: (prev[denom] || 0) + 1,
                          }));
                        }}
                        className="w-5 sm:w-6 h-6 sm:h-7 text-slate-700 hover:text-slate-950 hover:bg-amber-100 active:bg-amber-200 cursor-pointer select-none transition flex items-center justify-center border-l border-slate-200"
                        title="Add 1"
                        aria-label={`Add 1 ₹${denom}`}
                      >
                        <Plus className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-slate-800" />
                      </button>
                    </div>

                    {/* 3. Equals Sign */}
                    <span className="text-slate-400 font-bold text-[10px] sm:text-xs flex-shrink-0">=</span>

                    {/* 4. Total Count Amount */}
                    <div className={cn(
                      "min-w-[42px] sm:min-w-[56px] text-right font-mono font-black text-[11px] sm:text-xs truncate transition-colors flex-shrink-0",
                      count > 0 ? "text-amber-950" : "text-slate-400"
                    )}>
                      ₹{total.toLocaleString('en-IN')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Counted vs Expected Bar */}
            <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between gap-3 shadow-inner">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Physical Counted</span>
                <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 mt-0.5 leading-tight">
                  {formatINR(actualCountedCashPaise)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Variance</span>
                <div className={`text-xs sm:text-sm font-black font-mono mt-0.5 leading-tight ${
                  cashVariancePaise === 0
                    ? 'text-emerald-400'
                    : cashVariancePaise > 0
                    ? 'text-sky-400'
                    : 'text-rose-400'
                }`}>
                  {formatINR(cashVariancePaise)}
                  <span className="text-[10px] font-sans font-bold ml-1 hidden xs:inline">
                    ({cashVariancePaise === 0 ? '✓ Match' : cashVariancePaise > 0 ? '+ Excess' : '- Short'})
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* QUICK Z-REPORT DISPATCH BAR */}
          <Card className="p-4 bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 block">Instant Day-End Z-Report Actions</span>
                {!isPro && <ProFeatureBadge />}
              </div>
              <span className="text-[11px] text-slate-500">Print 58mm POS thermal slip or WhatsApp summary to store owner</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!isPro) {
                    setIsUpgradeModalOpen(true);
                  } else {
                    handlePrintZReportBluetooth();
                  }
                }}
                className="text-xs font-bold gap-1 bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-sky-700" />
                <span>BT Print Slip</span>
                {!isPro && <Lock className="w-3 h-3 text-amber-700" />}
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  if (!isPro) {
                    setIsUpgradeModalOpen(true);
                  } else {
                    handleSendZReportWhatsApp();
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
              >
                <WhatsAppLogo className="w-3.5 h-3.5" />
                <span>WhatsApp Owner</span>
                {!isPro && <Lock className="w-3 h-3 text-amber-300" />}
              </Button>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: TODAY'S PETTY EXPENSES & DIGITAL SALES (5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* DIGITAL & CREDIT COLLECTIONS SUMMARY (Space-Saving) */}
          <Card className="p-3 bg-white border border-slate-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-slate-700" />
                <span>Digital & Credit Sales</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-bold font-mono">
                {todaySales.length} {todaySales.length === 1 ? 'bill' : 'bills'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-sky-50/70 border border-sky-200 flex flex-col justify-between">
                <div className="flex items-center gap-1 text-sky-800 text-[10.5px] font-bold">
                  <QrCode className="w-3 h-3 text-sky-600 flex-shrink-0" />
                  <span className="truncate">UPI / QR</span>
                </div>
                <div className="font-mono font-black text-xs sm:text-sm text-sky-950 mt-0.5">
                  {formatINR(upiSalesTotalPaise)}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200 flex flex-col justify-between">
                <div className="flex items-center gap-1 text-amber-800 text-[10.5px] font-bold">
                  <BookOpen className="w-3 h-3 text-amber-600 flex-shrink-0" />
                  <span className="truncate">Khata Udhar</span>
                </div>
                <div className="font-mono font-black text-xs sm:text-sm text-amber-950 mt-0.5">
                  {formatINR(creditSalesTotalPaise)}
                </div>
              </div>
            </div>
          </Card>

          {/* TODAY'S PETTY EXPENSES LOG */}
          <Card className="p-4 bg-white border border-slate-200 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                  <TrendingDown className="w-4 h-4 text-rose-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Today&apos;s Petty Cash Expenses
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Direct cash payouts from drawer
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpenseModalOpen(true)}
                className="text-xs font-bold py-1 px-2.5 border-slate-300"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-slate-600" />
                <span>Add</span>
              </Button>
            </div>

            {/* Expenses List */}
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto text-xs">
              {todayExpenses.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No petty cash expenses recorded today.
                </div>
              ) : (
                todayExpenses.map((exp) => (
                  <div key={exp.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{exp.title}</div>
                      <div className="text-[10px] text-slate-400">
                        {exp.category} • {new Date(exp.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-rose-600">
                      - {formatINR(exp.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: OPEN CASH REGISTER SHIFT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isOpeningModalOpen}
        onClose={() => setIsOpeningModalOpen(false)}
        title="Open Daily Cash Register"
        description="Enter the starting cash float present in your cash drawer at the beginning of the day."
      >
        <form onSubmit={handleOpenRegister} className="space-y-4">
          <Input
            label="Opening Cash Float (₹)"
            type="number"
            step="1"
            placeholder="e.g. 2000"
            value={openingCashInput}
            onChange={(e) => setOpeningCashInput(e.target.value)}
            required
            autoFocus
          />

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <strong>Starting Shift:</strong> All cash and UPI sales made throughout the day will be automatically credited to this register.
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsOpeningModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-emerald-600 text-white font-bold">
              Confirm & Open Register
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: ADD PETTY EXPENSE / CASH PAYOUT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Add Cash Expense / Payout"
        description="Record tea, shop maintenance, staff payouts, or supplier cash payouts from the cash till."
      >
        <form onSubmit={handleAddExpense} className="space-y-3">
          <Input
            label="Expense Title / Reason"
            placeholder="e.g. Chai & Snacks for Staff, Shop Cleaning"
            value={expenseTitle}
            onChange={(e) => setExpenseTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Amount (₹)"
              type="number"
              step="1"
              placeholder="e.g. 150"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              required
            />

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Paid via</label>
              <select
                value={expenseMode}
                onChange={(e) => setExpenseMode(e.target.value as any)}
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-2 font-bold focus:outline-none focus:border-slate-900"
              >
                <option value="cash">Cash (From Till Drawer)</option>
                <option value="upi">UPI / Online Bank</option>
              </select>
            </div>
          </div>

          <Input
            label="Paid To (Optional)"
            placeholder="e.g. Ramesh Tea Stall, Electricity Bill"
            value={expensePaidTo}
            onChange={(e) => setExpensePaidTo(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-slate-900 text-white font-bold">
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: CLOSE SHIFT & CONFIRM Z-REPORT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isClosingModalOpen}
        onClose={() => setIsClosingModalOpen(false)}
        title="Confirm Day Closing & Archive Z-Report"
        description="Verify the day-end hisab-kitab before closing the register for today."
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Expected Cash in Till:</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(expectedCashInTillPaise)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Actual Counted Cash:</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(actualCountedCashPaise)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
              <span>Difference / Variance:</span>
              <span className={cashVariancePaise === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                {formatINR(cashVariancePaise)} ({cashVariancePaise === 0 ? 'Balanced' : cashVariancePaise > 0 ? 'Surplus' : 'Short'})
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsClosingModalOpen(false)}>
              Back
            </Button>
            <Button onClick={handleCloseShift} size="sm" className="bg-slate-900 text-white font-bold">
              Confirm & Close Register
            </Button>
          </div>
        </div>
      </Modal>

      {/* 1-Tap Day-End WhatsApp Sales Summary Modal */}
      <DayEndClosingReportModal
        isOpen={isClosingReportModalOpen}
        onClose={() => setIsClosingReportModalOpen(false)}
        business={business}
        sales={todaySales}
        expenses={todayExpenses}
      />

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />
    </div>
  );
}
