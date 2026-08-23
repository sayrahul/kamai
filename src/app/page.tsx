'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  BookOpen,
  Boxes,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Filter,
  Package,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
  SlidersHorizontal,
  Plus,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { DayEndClosingReportModal } from '@/components/reports/DayEndClosingReportModal';
import { Sale } from '@/types';
import { MessageCircle } from 'lucide-react';

export default function HomePage() {
  const { t, language } = useTranslation();
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState<boolean>(false);
  const [isClosingReportOpen, setIsClosingReportOpen] = useState<boolean>(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');

  // Recent Transactions Filter & Collapse States
  const [isRecentCollapsed, setIsRecentCollapsed] = useState<boolean>(false);
  const [recentDateFilter, setRecentDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | 'this_month'>('all');
  const [recentPaymentFilter, setRecentPaymentFilter] = useState<'all' | 'cash' | 'upi' | 'credit' | 'split'>('all');
  const [recentSearchQuery, setRecentSearchQuery] = useState<string>('');

  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const allExpenses = useLiveQuery(async () => db.cash_expenses.toArray()) || [];

  // Metrics Queries
  const products = useLiveQuery(async () => db.products.toArray()) || [];
  const lowStockProducts = products.filter((p) => p.current_stock <= p.min_stock_level);

  const customers = useLiveQuery(async () => db.customers.toArray()) || [];
  const customersWithCredit = customers.filter((c) => c.current_balance > 0);
  const totalOutstandingCredit = customers.reduce((acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0), 0);

  const allSales = useLiveQuery(async () => db.sales.toArray()) || [];
  const todayDatePrefix = new Date().toISOString().split('T')[0];
  const todaysSales = allSales.filter((s) => s.created_at.startsWith(todayDatePrefix));
  const todaysSalesTotal = todaysSales.reduce((acc, s) => acc + s.grand_total, 0);

  const isFree = subscriptionTier === 'free';

  // Filtered recent sales for home widget — sorted newest-first
  const filteredRecentSales = [...allSales]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter((s) => {
      const saleDate = new Date(s.created_at);
      const now = new Date();

      // Free user restriction: strictly last 7 days of sales
      if (isFree) {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (saleDate < sevenDaysAgo) return false;
      }

      if (recentDateFilter === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        if (!s.created_at.startsWith(todayStr)) return false;
      } else if (recentDateFilter === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        if (!s.created_at.startsWith(yStr)) return false;
      } else if (recentDateFilter === '7days') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (saleDate < weekAgo) return false;
      } else if (recentDateFilter === 'this_month') {
        if (saleDate.getMonth() !== now.getMonth() || saleDate.getFullYear() !== now.getFullYear()) return false;
      }

      if (recentPaymentFilter !== 'all' && s.payment_method !== recentPaymentFilter) {
        return false;
      }

      if (recentSearchQuery.trim()) {
        const q = recentSearchQuery.toLowerCase();
        const matchInvoice = s.invoice_number.toLowerCase().includes(q);
        const matchCust = (s.customer_name || '').toLowerCase().includes(q);
        const matchPhone = (s.customer_phone || '').includes(q);
        if (!matchInvoice && !matchCust && !matchPhone) return false;
      }

      return true;
    });

  const displayedSales = filteredRecentSales.slice(0, 10);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data?.business?.subscription_tier) {
          setSubscriptionTier(data.business.subscription_tier);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        currentTier={subscriptionTier}
        businessName={business?.name}
        onUpgradeSuccess={(tier) => setSubscriptionTier(tier)}
      />

      {/* ---------------- TOP-LEVEL METRIC SUMMARY CARDS (COMPACT PREVIOUS STYLE) ---------------- */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Card 1: Today's Sales */}
        <Link href="/transactions" className="group block focus:outline-none">
          <Card className="p-2.5 sm:p-4 bg-gradient-to-br from-white to-emerald-50/50 border border-emerald-200/90 hover:border-emerald-400 active:scale-[0.98] transition-all rounded-xl sm:rounded-2xl shadow-xs group-hover:shadow-md h-full flex flex-col justify-between cursor-pointer">
            <div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 sm:gap-1.5 text-emerald-800 font-extrabold text-[10px] sm:text-xs uppercase tracking-tight truncate">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">Today</span>
                    <span className="hidden sm:inline">Today&apos;s Sales</span>
                  </span>
                </div>
                <span className="hidden lg:inline-flex px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 text-[9px] font-black">
                  POS
                </span>
              </div>

              <div className="text-sm sm:text-2xl font-black text-slate-900 font-mono tracking-tight mt-1.5 sm:mt-2 truncate">
                {formatINR(todaysSalesTotal)}
              </div>
            </div>

            <div className="pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-emerald-100/80 flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-600 font-semibold truncate">
                <strong>{todaysSales.length}</strong> <span className="hidden sm:inline">bills today</span><span className="sm:hidden">bills</span>
              </span>
              <span className="text-emerald-700 font-bold hidden sm:inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[10px]">
                <span>Ledger</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </Card>
        </Link>

        {/* Card 2: Total Outstanding Credit */}
        <Link href="/khata" className="group block focus:outline-none">
          <Card className="p-2.5 sm:p-4 bg-gradient-to-br from-white to-amber-50/50 border border-amber-200/90 hover:border-amber-400 active:scale-[0.98] transition-all rounded-xl sm:rounded-2xl shadow-xs group-hover:shadow-md h-full flex flex-col justify-between cursor-pointer">
            <div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 sm:gap-1.5 text-amber-900 font-extrabold text-[10px] sm:text-xs uppercase tracking-tight truncate">
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">Credit</span>
                    <span className="hidden sm:inline">Total Outstanding</span>
                  </span>
                </div>
                <span className="hidden lg:inline-flex px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-950 text-[9px] font-black">
                  Ledger
                </span>
              </div>

              <div className="text-sm sm:text-2xl font-black text-amber-950 font-mono tracking-tight mt-1.5 sm:mt-2 truncate">
                {formatINR(totalOutstandingCredit)}
              </div>
            </div>

            <div className="pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-amber-100/80 flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-600 font-semibold truncate">
                <strong>{customersWithCredit.length}</strong> <span className="hidden sm:inline">pending</span><span className="sm:hidden">debtors</span>
              </span>
              <span className="text-amber-800 font-bold hidden sm:inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[10px]">
                <span>Khata</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </Card>
        </Link>

        {/* Card 3: Low Stock Count */}
        <Link href="/products" className="group block focus:outline-none">
          <Card className="p-2.5 sm:p-4 bg-gradient-to-br from-white to-rose-50/50 border border-rose-200/90 hover:border-rose-400 active:scale-[0.98] transition-all rounded-xl sm:rounded-2xl shadow-xs group-hover:shadow-md h-full flex flex-col justify-between cursor-pointer">
            <div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 sm:gap-1.5 text-rose-900 font-extrabold text-[10px] sm:text-xs uppercase tracking-tight truncate">
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 flex-shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">Low Stock</span>
                    <span className="hidden sm:inline">Low Stock Count</span>
                  </span>
                </div>
                <span className={`hidden lg:inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  lowStockProducts.length > 0
                    ? 'bg-rose-100 text-rose-950'
                    : 'bg-emerald-100 text-emerald-950'
                }`}>
                  {lowStockProducts.length > 0 ? 'Alert' : 'OK'}
                </span>
              </div>

              <div className="text-sm sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 sm:mt-2 flex items-baseline gap-1 truncate">
                <span>{lowStockProducts.length}</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">Items</span>
              </div>
            </div>

            <div className="pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-rose-100/80 flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-600 font-semibold truncate">
                {lowStockProducts.length > 0 ? (
                  <span className="text-rose-700 font-bold">Restock</span>
                ) : (
                  <span className="text-emerald-700 font-bold">Safe</span>
                )}
              </span>
              <span className="text-rose-700 font-bold hidden sm:inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[10px]">
                <span>Items</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </Card>
        </Link>
      </div>

      {/* ---------------- 1-TAP DAY-END CLOSING ACTION (RESPONSIVE FOR ALL SCREEN SIZES) ---------------- */}
      <div 
        onClick={() => setIsClosingReportOpen(true)}
        className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl p-2.5 sm:p-3.5 flex items-center justify-between gap-2 sm:gap-3 shadow-md shadow-emerald-600/15 cursor-pointer active:scale-[0.99] transition-all border border-emerald-500/30"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold flex-shrink-0">
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-black flex items-center gap-1.5 flex-wrap">
              <span className="truncate">Day-End Sales Summary</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] sm:text-[10px] font-black uppercase tracking-tight flex-shrink-0">
                Closing
              </span>
            </div>
            <div className="text-[10.5px] sm:text-[11px] text-emerald-100 font-medium truncate">
              Daily sales PDF &amp; WhatsApp report (Cash, UPI &amp; Udhar)
            </div>
          </div>
        </div>

        <button
          type="button"
          className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-white text-slate-950 font-black text-[11px] sm:text-xs flex items-center gap-1 flex-shrink-0 shadow-xs hover:bg-emerald-50 transition"
        >
          <span>Summary</span>
          <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>

      {/* ---------------- PRIMARY DAILY OPERATIONS (COMPACT, HIGH CONTRAST LIGHT CARDS) ---------------- */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Daily Shop Operations
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Tile 1: POS Billing */}
          <Link href="/billing" className="group">
            <div className="bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-emerald-50/50 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <Receipt className="w-4.5 h-4.5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">POS Billing</div>
                <div className="text-[11px] text-emerald-800 font-medium truncate">Fast checkout</div>
              </div>
            </div>
          </Link>

          {/* Tile 2: Products Master */}
          <Link href="/products" className="group">
            <div className="bg-white border border-amber-300 hover:border-amber-500 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-amber-50/50 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-950 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <Package className="w-4.5 h-4.5 text-amber-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Products Master</div>
                <div className="text-[11px] text-amber-800 font-medium truncate">{products.length} items catalog</div>
              </div>
            </div>
          </Link>

          {/* Tile 3: Digital Khata */}
          <Link href="/khata" className="group">
            <div className="bg-white border border-indigo-200 hover:border-indigo-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-indigo-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4.5 h-4.5 text-indigo-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Khata Ledger</div>
                <div className="text-[11px] text-indigo-800 font-medium truncate">Customer Credit</div>
              </div>
            </div>
          </Link>

          {/* Tile 4: Cash Register */}
          <Link href="/cash-register" className="group">
            <div className="bg-white border border-sky-200 hover:border-sky-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-sky-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <Calculator className="w-4.5 h-4.5 text-sky-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Cash Register</div>
                <div className="text-[11px] text-sky-800 font-medium truncate">Shift & Till</div>
              </div>
            </div>
          </Link>

          {/* Tile 5: Inventory & Expiry */}
          <Link href="/inventory" className="group">
            <div className="bg-white border border-cyan-200 hover:border-cyan-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-cyan-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-cyan-100 text-cyan-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <Boxes className="w-4.5 h-4.5 text-cyan-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Inventory & Expiry</div>
                <div className="text-[11px] text-cyan-800 font-medium truncate">Batches & Alerts</div>
              </div>
            </div>
          </Link>

          {/* Tile 6: Barcode Studio */}
          <Link href="/barcode-generator" className="group">
            <div className="bg-white border border-purple-200 hover:border-purple-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-purple-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <Barcode className="w-4.5 h-4.5 text-purple-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Barcode Studio</div>
                <div className="text-[11px] text-purple-800 font-medium truncate">Price Stickers & QR</div>
              </div>
            </div>
          </Link>

          {/* Tile 7: Transactions & Audit */}
          <Link href="/transactions" className="group">
            <div className="bg-white border border-teal-200 hover:border-teal-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-teal-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4.5 h-4.5 text-teal-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Transactions</div>
                <div className="text-[11px] text-teal-800 font-medium truncate">Bills & Returns</div>
              </div>
            </div>
          </Link>

          {/* Tile 8: WhatsApp Growth */}
          <Link href="/growth" className="group">
            <div className="bg-white border border-emerald-200 hover:border-emerald-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-emerald-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">WhatsApp Growth</div>
                <div className="text-[11px] text-emerald-800 font-medium truncate">Offers & Festivals</div>
              </div>
            </div>
          </Link>
        </div>
      </div>



      {/* ---------------- RECENT TRANSACTIONS WIDGET (CLEAN LIGHT THEME) ---------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRecentCollapsed(!isRecentCollapsed)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center justify-center"
              title={isRecentCollapsed ? 'Expand Transactions List' : 'Collapse Transactions List'}
            >
              {isRecentCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                  {filteredRecentSales.length} bills
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isRecentCollapsed ? 'Click dropdown arrow to expand and filter list' : 'Click any invoice to view, print, or WhatsApp bill'}
              </p>
            </div>
          </div>

          {/* Quick Action: Open Dedicated Filter Page */}
          <Link href="/transactions">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-bold gap-1.5 border-slate-300 hover:border-slate-900 w-full sm:w-auto justify-center"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-700" />
              <span>Full Ledger & Returns Page</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-slate-500" />
            </Button>
          </Link>
        </div>

        {/* Collapsible Content Section */}
        {!isRecentCollapsed && (
          <div className="space-y-3 pt-1">
            {/* Quick Filter Toolbar */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by invoice #, customer name or mobile..."
                  value={recentSearchQuery}
                  onChange={(e) => setRecentSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800"
                />
              </div>

              {/* Filter Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Date Dropdown */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <select
                    value={recentDateFilter}
                    onChange={(e) => setRecentDateFilter(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="this_month">This Month</option>
                  </select>
                </div>

                {/* Payment Mode Dropdown */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <select
                    value={recentPaymentFilter}
                    onChange={(e) => setRecentPaymentFilter(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Payment Modes</option>
                    <option value="cash">Cash Only</option>
                    <option value="upi">UPI / QR Only</option>
                    <option value="credit">Credit / Ledger</option>
                    <option value="split">Split Multi-Payment</option>
                  </select>
                </div>

                {/* Reset Filters Button */}
                {(recentDateFilter !== 'all' || recentPaymentFilter !== 'all' || recentSearchQuery.trim() !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecentDateFilter('all');
                      setRecentPaymentFilter('all');
                      setRecentSearchQuery('');
                    }}
                    className="px-2 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-1 transition-colors"
                    title="Reset all filters"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Transactions List */}
            {filteredRecentSales.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Receipt className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-slate-700">No matching transactions found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your date or payment filters</p>
                <Link href="/billing" className="mt-3 inline-block">
                  <Button size="sm" className="text-xs bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Create First Bill
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayedSales.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSaleForInvoice(s)}
                    className="py-2.5 px-2.5 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50/80 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${
                        s.payment_method === 'cash' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : s.payment_method === 'upi'
                          ? 'bg-sky-100 text-sky-800'
                          : s.payment_method === 'credit'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-purple-100 text-purple-900'
                      }`}>
                        <Receipt className="w-4 h-4" />
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{s.invoice_number}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-700 font-semibold">{s.customer_name || 'Cash Customer'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                          <span>{s.items.length} items</span>
                          <span>•</span>
                          <span className="uppercase font-bold text-[10px]">{s.payment_method}</span>
                          <span>•</span>
                          <span>{new Date(s.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, {new Date(s.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="font-mono font-black text-slate-900 text-sm">
                          {formatINR(s.grand_total)}
                        </div>
                        <Badge variant={s.payment_status === 'paid' ? 'success' : 'warning'} size="sm">
                          {s.payment_status.toUpperCase()}
                        </Badge>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all hidden sm:inline" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer Pagination */}
            {filteredRecentSales.length > 10 && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Showing top 10 of {filteredRecentSales.length} matching transactions
                </span>
                <Link href="/transactions" className="font-bold text-slate-900 hover:text-slate-700 flex items-center gap-1">
                  <span>View All on Ledger Page</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Free Tier 7-Day History Limit Banner */}
            {isFree && allSales.some((s) => new Date(s.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center justify-between gap-2 shadow-2xs mt-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Showing last 7 days of sales on Free Tier. Upgrade to Pro for lifetime sales history.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUpgradeOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] hover:bg-amber-500 cursor-pointer shrink-0 shadow-2xs"
                >
                  Unlock Pro
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invoice Modal for click-to-view */}
      {selectedSaleForInvoice && (
        <InvoiceModal
          isOpen={Boolean(selectedSaleForInvoice)}
          onClose={() => setSelectedSaleForInvoice(null)}
          sale={selectedSaleForInvoice}
          business={business || null}
        />
      )}

      {/* 1-Tap Day-End WhatsApp Sales Summary Modal */}
      <DayEndClosingReportModal
        isOpen={isClosingReportOpen}
        onClose={() => setIsClosingReportOpen(false)}
        business={business}
        sales={allSales}
        expenses={allExpenses}
      />
    </div>
  );
}
