'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { CashRegister, CashExpense, Sale } from '@/types';
import { formatINR } from '@/lib/utils';
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
  MessageCircle,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { DayEndClosingReportModal } from '@/components/reports/DayEndClosingReportModal';

export default function CashRegisterPage() {
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  
  // Current active open shift query
  const activeShift = useLiveQuery(async () => {
    return await db.cash_registers.where('status').equals('open').first();
  });

  const allShifts = useLiveQuery(async () => {
    return await db.cash_registers.orderBy('opened_at').reverse().toArray();
  }) || [];

  // All sales for today
  const todayDatePrefix = new Date().toISOString().split('T')[0];
  const todaySales = useLiveQuery(async () => {
    const sales = await db.sales.toArray();
    return sales.filter((s) => s.created_at.startsWith(todayDatePrefix) && s.status !== 'cancelled');
  }, [todayDatePrefix]) || [];

  // All expenses for today
  const todayExpenses = useLiveQuery(async () => {
    const expenses = await db.cash_expenses.toArray();
    return expenses.filter((e) => e.created_at.startsWith(todayDatePrefix));
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

  // WhatsApp Z-Report Dispatch to Owner
  const handleSendZReportWhatsApp = () => {
    if (!business) return;
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const msg = 
      `📊 *DAILY BUSINESS Z-REPORT (${dateStr})*\n` +
      `🏪 *${business.name}*\n\n` +
      `💵 *CASH DRAWER TALLY:*\n` +
      `• Opening Float: ${formatINR(openingFloatPaise)}\n` +
      `• Cash Sales: ${formatINR(cashSalesTotalPaise)}\n` +
      `• Cash Expenses: -${formatINR(cashExpensesPaise)}\n` +
      `👉 *Expected Cash in Till:* ${formatINR(expectedCashInTillPaise)}\n` +
      `👉 *Actual Counted Cash:* ${formatINR(actualCountedCashPaise)}\n` +
      `⚖️ *Variance:* ${formatINR(cashVariancePaise)} (${cashVariancePaise === 0 ? 'Balanced' : cashVariancePaise > 0 ? 'Surplus' : 'Short'})\n\n` +
      `📱 *NON-CASH SUMMARY:*\n` +
      `• UPI / QR Collections: ${formatINR(upiSalesTotalPaise)}\n` +
      `• Customer Credit Extended: ${formatINR(creditSalesTotalPaise)}\n` +
      `• Total Invoices: ${todaySales.length} bills\n\n` +
      `_Generated automatically via KamaiPlus POS_`;

    const cleanPhone = (business.phone || '').replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
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
            onClick={() => setIsClosingReportModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-white" />
            <span>WhatsApp Day Summary</span>
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

      {/* ---------------- LIVE REGISTRY SUMMARY CARDS ---------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Opening Float */}
        <Card className="p-3.5 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Opening Float</span>
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1">
            {formatINR(openingFloatPaise)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Morning starting cash</div>
        </Card>

        {/* Card 2: Cash Sales Today */}
        <Card className="p-3.5 bg-gradient-to-br from-white to-emerald-50/40 border border-emerald-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-emerald-900 text-xs font-bold">
            <span>Cash Sales In (+)</span>
            <Banknote className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-950 font-mono mt-1">
            {formatINR(cashSalesTotalPaise)}
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-1">Received from bills</div>
        </Card>

        {/* Card 3: Cash Expenses Out */}
        <Card className="p-3.5 bg-gradient-to-br from-white to-rose-50/40 border border-rose-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-rose-900 text-xs font-bold">
            <span>Cash Expenses (-)</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-700" />
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-950 font-mono mt-1">
            {formatINR(cashExpensesPaise)}
          </div>
          <div className="text-[10px] text-rose-700 font-semibold mt-1">{todayExpenses.length} payouts today</div>
        </Card>

        {/* Card 4: Expected Cash in Till */}
        <Card className="p-3.5 bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Expected in Till</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-400 font-mono mt-1">
            {formatINR(expectedCashInTillPaise)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Cash that should be in box</div>
        </Card>
      </div>

      {/* ---------------- 2 COLUMNS: CASH RECONCILIATION & EXPENSES ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CURRENCY DENOMINATION CALCULATOR (7 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-slate-700" />
                  <span>Physical Cash Denomination Counter</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Count notes & coins in the cash drawer to verify against expected till balance.
                </p>
              </div>
            </div>

            {/* Denomination Rows */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[500, 200, 100, 50, 20, 10, 5, 1].map((denom) => {
                const count = denominations[denom] || 0;
                const total = denom * count;
                return (
                  <div key={denom} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>₹{denom} note</span>
                      <span className="font-mono text-slate-500 text-[10px]">₹{total}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={count || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setDenominations((prev) => ({ ...prev, [denom]: val }));
                      }}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-black text-xs rounded p-1.5 text-right focus:outline-none focus:border-slate-900"
                    />
                  </div>
                );
              })}
            </div>

            {/* Total Counted vs Expected Bar */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Physical Counted Cash</span>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
                  {formatINR(actualCountedCashPaise)}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Cash Difference (Variance)</span>
                <div className={`text-lg font-black font-mono ${
                  cashVariancePaise === 0
                    ? 'text-emerald-400'
                    : cashVariancePaise > 0
                    ? 'text-sky-400'
                    : 'text-rose-400'
                }`}>
                  {formatINR(cashVariancePaise)}
                  <span className="text-xs font-sans font-bold ml-1.5">
                    ({cashVariancePaise === 0 ? '✓ Exact Match' : cashVariancePaise > 0 ? '+ Excess / Surplus' : '- Short / Missing'})
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* QUICK Z-REPORT DISPATCH BAR */}
          <Card className="p-4 bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Instant Day-End Z-Report Actions</span>
              <span className="text-[11px] text-slate-500">Print 58mm POS thermal slip or WhatsApp summary to store owner</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintZReportBluetooth}
                className="text-xs font-bold gap-1 bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100"
              >
                <Printer className="w-3.5 h-3.5 text-sky-700" />
                <span>BT Print Slip</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSendZReportWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Owner</span>
              </Button>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: TODAY'S PETTY EXPENSES & DIGITAL SALES (5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* DIGITAL COLLECTIONS SUMMARY */}
          <Card className="p-4 bg-white border border-slate-200 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-slate-700" />
              <span>Digital & Credit Breakdown Today</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-950 font-bold">
                  <QrCode className="w-4 h-4 text-sky-700" />
                  <span>UPI / QR Collections</span>
                </div>
                <span className="font-mono font-black text-sky-950">{formatINR(upiSalesTotalPaise)}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-950 font-bold">
                  <BookOpen className="w-4 h-4 text-amber-700" />
                  <span>Customer Credit Extended</span>
                </div>
                <span className="font-mono font-black text-amber-950">{formatINR(creditSalesTotalPaise)}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-700 font-semibold">
                <span>Total Bills Created</span>
                <span className="font-bold text-slate-900">{todaySales.length} invoices</span>
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
    </div>
  );
}
