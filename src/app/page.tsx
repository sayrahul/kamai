'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR, cn } from '@/lib/utils';
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
  Lock,
  Pill,
  UtensilsCrossed,
  Shirt,
  Wrench,
  Stethoscope,
  Tag,
  Scale,
  Clock,
  Sparkle,
  ShoppingBag,
  HardDrive,
  Palette
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { getStoreProfile, hasModule } from '@/lib/constants/storeProfiles';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';
import { DayEndClosingReportModal } from '@/components/reports/DayEndClosingReportModal';
import { subscriptionService } from '@/lib/subscription/subscriptionService';
import { triggerBackgroundSync } from '@/lib/firebase/backgroundSync';
import { Sale, Product } from '@/types';
import { WhatsAppLogo } from '@/components/ui/WhatsAppLogo';

const RapidBarcodeInwardModal = dynamic(
  () => import('@/components/products/RapidBarcodeInwardModal').then((m) => m.RapidBarcodeInwardModal),
  { ssr: false }
);

export default function HomePage() {
  const { t, language } = useTranslation();
  const { isPro, isUpgradeModalOpen: isUpgradeOpen, setIsUpgradeModalOpen: setIsUpgradeOpen } = useProSubscription();
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [isClosingReportOpen, setIsClosingReportOpen] = useState<boolean>(false);
  const [isRapidInwardOpen, setIsRapidInwardOpen] = useState<boolean>(false);
  const [isStockAlertExpanded, setIsStockAlertExpanded] = useState<boolean>(false);

  // Recent Transactions Filter & Collapse States
  const [isRecentCollapsed, setIsRecentCollapsed] = useState<boolean>(false);
  const [recentDateFilter, setRecentDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | 'this_month'>('all');
  const [recentPaymentFilter, setRecentPaymentFilter] = useState<'all' | 'cash' | 'upi' | 'credit' | 'split'>('all');
  const [recentSearchQuery, setRecentSearchQuery] = useState<string>('');

  // Memoized date boundary strings for today
  const { todayStartISO, todayEndISO } = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return {
      todayStartISO: start.toISOString(),
      todayEndISO: end.toISOString(),
    };
  }, []);

  const business = useLiveQuery(async () => db.businesses.toCollection().first());

  // High-performance indexed today's expenses seek
  const todaysExpenses = useLiveQuery(
    async () => db.cash_expenses.where('created_at').between(todayStartISO, todayEndISO, true, true).toArray(),
    [todayStartISO, todayEndISO]
  ) || [];

  // Metrics Queries & Robust Stock Filtering
  const products = useLiveQuery(async () => db.products.toArray()) || [];
  const activeProducts = useMemo(() => products.filter((p) => p.is_active !== false), [products]);

  // Out of Stock products (strictly 0 or negative units)
  const outOfStockProducts = useMemo(() => {
    return activeProducts.filter(
      (p) => !p.is_unlimited_stock && Number(p.current_stock ?? 0) <= 0
    );
  }, [activeProducts]);

  // Low Stock products (at or below min_stock_level threshold, including 0)
  const lowStockProducts = useMemo(() => {
    return activeProducts.filter(
      (p) => !p.is_unlimited_stock && (Number(p.current_stock ?? 0) <= Number(p.min_stock_level ?? 5) || Number(p.current_stock ?? 0) <= 0)
    );
  }, [activeProducts]);

  // Combined Watchlist: Out of stock (0) first, then lowest stock
  const stockWatchlist = useMemo(() => {
    return [...lowStockProducts].sort((a, b) => {
      const stockA = Number(a.current_stock ?? 0);
      const stockB = Number(b.current_stock ?? 0);
      return stockA - stockB;
    });
  }, [lowStockProducts]);

  // 1-Tap Quick Restock directly from dashboard
  const handleQuickRestock = async (product: Product, quantityToAdd: number = 10) => {
    try {
      const now = new Date().toISOString();
      const current = Number(product.current_stock ?? 0);
      const newStock = current + quantityToAdd;

      await db.products.update(product.id, {
        current_stock: newStock,
        updated_at: now,
      });

      await db.inventory_movements.put({
        id: `mov_dash_restock_${Date.now()}_${product.id}`,
        business_id: product.business_id || 'biz_default',
        product_id: product.id,
        product_name: product.name,
        movement_type: 'PURCHASE',
        quantity: quantityToAdd,
        previous_stock: current,
        new_stock: newStock,
        reason: `Quick Dashboard Restock (+${quantityToAdd} ${product.unit || 'units'})`,
        created_by: 'owner',
        created_at: now,
      });

      // Background cloud sync
      try {
        triggerBackgroundSync(product.business_id);
      } catch {}
    } catch (err) {
      console.error('Failed to quick restock item:', err);
    }
  };

  // Niche Metric Computations
  const businessType = business?.business_type || 'grocery';
  const nowMs = new Date().getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  
  // Pharmacy: Expiry alerts
  const expiredMedicines = products.filter((p) => p.expiry_date && new Date(p.expiry_date).getTime() <= nowMs);
  const expiringSoonMedicines = products.filter((p) => {
    if (!p.expiry_date) return false;
    const diff = new Date(p.expiry_date).getTime() - nowMs;
    return diff > 0 && diff <= thirtyDaysMs;
  });

  // Loose Items (Kirana)
  const looseItemsCount = products.filter((p) => p.is_loose_item || ['kg', 'gram', 'litre'].includes(p.unit)).length;

  const customers = useLiveQuery(async () => db.customers.toArray()) || [];
  const customersWithCredit = customers.filter((c) => c.current_balance > 0);
  const totalOutstandingCredit = customers.reduce((acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0), 0);

  // High-performance indexed today's sales seek
  const todaysSales = useLiveQuery(
    async () => db.sales.where('created_at').between(todayStartISO, todayEndISO, true, true).toArray(),
    [todayStartISO, todayEndISO]
  ) || [];
  const todaysSalesTotal = todaysSales.reduce((acc, s) => acc + s.grand_total, 0);

  const isFree = !isPro;

  // Compute boundaries for the selected filter preset
  const filterDateBoundaries = useMemo(() => {
    const now = new Date();
    if (recentDateFilter === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    } else if (recentDateFilter === 'yesterday') {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    } else if (recentDateFilter === '7days') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: start.toISOString(), end: now.toISOString() };
    } else if (recentDateFilter === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    return null;
  }, [recentDateFilter]);

  // Indexed Recent Sales Query
  const recentSalesRaw: Sale[] = useLiveQuery(async () => {
    if (filterDateBoundaries) {
      return await db.sales
        .where('created_at')
        .between(filterDateBoundaries.start, filterDateBoundaries.end, true, true)
        .reverse()
        .toArray();
    }
    if (isFree) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return await db.sales
        .where('created_at')
        .aboveOrEqual(sevenDaysAgo)
        .reverse()
        .toArray();
    }
    return await db.sales.orderBy('created_at').reverse().limit(100).toArray();
  }, [filterDateBoundaries, isFree]) || [];

  // Check if free user has sales older than 7 days for the upgrade banner (single indexed seek)
  const hasOlderSalesThan7Days = useLiveQuery(async () => {
    if (!isFree) return false;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const olderSale = await db.sales.where('created_at').below(sevenDaysAgo).first();
    return Boolean(olderSale);
  }, [isFree]);

  // Filtered recent sales for home widget — sorted newest-first
  const filteredRecentSales = useMemo(() => {
    return recentSalesRaw.filter((s) => {
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
  }, [recentSalesRaw, recentPaymentFilter, recentSearchQuery]);

  const displayedSales = filteredRecentSales.slice(0, 10);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data?.business?.subscription_tier) {
          subscriptionService.setTierFromCloud(data.business.subscription_tier);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {/* Upgrade / Pro Active Modal */}
      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        currentTier={isPro ? 'pro' : 'free'}
        businessName={business?.name}
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

        {/* Card 3: Low & Out of Stock Count */}
        <Link href="/products?filter=low_stock" className="group block focus:outline-none">
          <Card className="p-2.5 sm:p-4 bg-gradient-to-br from-white to-rose-50/50 border border-rose-200/90 hover:border-rose-400 active:scale-[0.98] transition-all rounded-xl sm:rounded-2xl shadow-xs group-hover:shadow-md h-full flex flex-col justify-between cursor-pointer">
            <div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 sm:gap-1.5 text-rose-900 font-extrabold text-[10px] sm:text-xs uppercase tracking-tight truncate">
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 flex-shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">Low Stock</span>
                    <span className="hidden sm:inline">Low &amp; Out of Stock</span>
                  </span>
                </div>
                <span className={`hidden lg:inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  outOfStockProducts.length > 0
                    ? 'bg-rose-600 text-white animate-pulse'
                    : lowStockProducts.length > 0
                    ? 'bg-amber-100 text-amber-950'
                    : 'bg-emerald-100 text-emerald-950'
                }`}>
                  {outOfStockProducts.length > 0 ? `${outOfStockProducts.length} Out` : lowStockProducts.length > 0 ? 'Alert' : 'OK'}
                </span>
              </div>

              <div className="text-sm sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 sm:mt-2 flex items-baseline gap-1.5 truncate">
                <span>{lowStockProducts.length}</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">
                  {outOfStockProducts.length > 0 ? `(${outOfStockProducts.length} Zero)` : 'Items'}
                </span>
              </div>
            </div>

            <div className="pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-rose-100/80 flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-600 font-semibold truncate">
                {outOfStockProducts.length > 0 ? (
                  <span className="text-rose-700 font-bold">Reorder Needed</span>
                ) : lowStockProducts.length > 0 ? (
                  <span className="text-amber-700 font-bold">Restock Needed</span>
                ) : (
                  <span className="text-emerald-700 font-bold">Safe Level</span>
                )}
              </span>
              <span className="text-rose-700 font-bold hidden sm:inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[10px]">
                <span>View</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </Card>
        </Link>
      </div>

      {/* ---------------- 1-TAP QUICK ACTIONS BAR (STOCK INWARD & DAY-END CLOSING) ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Action 1: Rapid Stock Inward (Stock In / Mal Aavya) */}
        <div 
          onClick={() => setIsRapidInwardOpen(true)}
          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl p-2.5 sm:p-3.5 flex items-center justify-between gap-2 sm:gap-3 shadow-md shadow-blue-600/15 cursor-pointer active:scale-[0.99] transition-all border border-blue-500/30 group"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
              <Boxes className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-black flex items-center gap-1.5 flex-wrap">
                <span className="truncate">Stock Inward (Mal Aavya)</span>
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-300 text-slate-950 text-[9px] sm:text-[10px] font-black uppercase tracking-tight flex-shrink-0">
                  Stock In
                </span>
              </div>
              <div className="text-[10.5px] sm:text-[11px] text-blue-100 font-medium truncate">
                Rapid barcode scan, carton inward &amp; stock update
              </div>
            </div>
          </div>

          <button
            type="button"
            className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-white text-slate-950 font-black text-[11px] sm:text-xs flex items-center gap-1 flex-shrink-0 shadow-xs hover:bg-blue-50 transition"
          >
            <span>Stock In</span>
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>

        {/* Action 2: Day-End Sales Summary */}
        <div 
          onClick={() => setIsClosingReportOpen(true)}
          className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl p-2.5 sm:p-3.5 flex items-center justify-between gap-2 sm:gap-3 shadow-md shadow-emerald-600/15 cursor-pointer active:scale-[0.99] transition-all border border-emerald-500/30 group"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform p-1.5 sm:p-2">
              <WhatsAppLogo className="w-full h-full" />
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
      </div>

      {/* ---------------- SPECIALIZED NICHE RADAR & ADAPTIVE HUB (PHARMACY) ---------------- */}
      {businessType === 'pharmacy' && (
        <div className="bg-white border border-teal-200/90 rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 animate-in fade-in">
          {/* Left: Brand Pill & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold flex-shrink-0 shadow-2xs">
              <Pill className="w-4 h-4 text-teal-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">Pharmacy Expiry &amp; Rx Desk</h3>
                <span className="px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-900 text-[9px] font-black uppercase">
                  Compliance
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500 truncate">Batch tracking &amp; Doctor Rx prescription billing</p>
            </div>
          </div>

          {/* Center & Right: Compact Pill Metrics & Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Expired Batches Pill */}
            <Link
              href="/inventory?filter=expired"
              className={cn(
                "px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer",
                expiredMedicines.length > 0
                  ? "bg-rose-50 border-rose-300 text-rose-800 animate-pulse"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
              title="Expired Batches (Remove from shelf)"
            >
              <span className={cn("w-2 h-2 rounded-full", expiredMedicines.length > 0 ? "bg-rose-600" : "bg-emerald-500")} />
              <span>Expired: <b className="font-mono">{expiredMedicines.length}</b></span>
            </Link>

            {/* Expiring Soon Pill */}
            <Link
              href="/inventory?filter=expiring_soon"
              className={cn(
                "px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer",
                expiringSoonMedicines.length > 0
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
              title="Expiring within 30 Days (Supplier return)"
            >
              <span className={cn("w-2 h-2 rounded-full", expiringSoonMedicines.length > 0 ? "bg-amber-500" : "bg-slate-300")} />
              <span>Expiring 30D: <b className="font-mono">{expiringSoonMedicines.length}</b></span>
            </Link>

            {/* Doctor Rx Bill Quick Link */}
            <Link
              href="/billing"
              className="px-2.5 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-2xs cursor-pointer"
            >
              <Stethoscope className="w-3 h-3 text-teal-700" />
              <span>Rx Billing</span>
            </Link>

            {/* Strip/Tab Formulations Link */}
            <Link
              href="/products"
              className="hidden lg:inline-flex px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold items-center gap-1 transition cursor-pointer"
            >
              <span>{products.length} Drugs</span>
            </Link>

            {/* Expiry Radar Button */}
            <Link
              href="/inventory"
              className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
            >
              <span>Expiry Radar</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {businessType === 'restaurant' && (
        <div className="bg-gradient-to-br from-amber-900 via-orange-950 to-amber-950 text-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-amber-700/40">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold flex-shrink-0">
                <UtensilsCrossed className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Dine-In Tables &amp; Quick KOT Counter</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[9px] font-black uppercase">
                    Food &amp; Beverage
                  </span>
                </h3>
                <p className="text-[10.5px] text-amber-200/80">1-Tap Table Order, Parcel &amp; Kitchen Tokens</p>
              </div>
            </div>
            <Link
              href="/billing"
              className="px-2.5 py-1 rounded-lg bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 font-bold text-[11px] flex items-center gap-1 transition flex-shrink-0"
            >
              <span>Touch Menu</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {['T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-6', 'T-7', 'T-8', 'Takeaway Parcel'].map((tbl) => (
              <Link
                key={tbl}
                href={`/billing?orderType=${tbl.includes('Parcel') ? 'takeaway' : 'dine_in'}&table=${tbl.replace('T-', '')}`}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-amber-500/40 border border-white/15 text-white text-xs font-black whitespace-nowrap active:scale-95 transition"
              >
                {tbl}
              </Link>
            ))}
          </div>
        </div>
      )}

      {businessType === 'clothing' && (
        <div className="bg-gradient-to-br from-indigo-900 to-purple-950 text-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-indigo-700/40">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold flex-shrink-0">
                <Shirt className="w-4 h-4 text-indigo-300" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Apparel Variants &amp; Price Tag Studio</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[9px] font-black uppercase">
                    Garments &amp; Footwear
                  </span>
                </h3>
                <p className="text-[10.5px] text-indigo-200/80">Sizes S/M/L/XL &amp; Hang-tag barcode printing</p>
              </div>
            </div>
            <Link
              href="/barcode-generator"
              className="px-2.5 py-1 rounded-lg bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-100 font-bold text-[11px] flex items-center gap-1 transition flex-shrink-0"
            >
              <span>Print Tags</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <Link href="/barcode-generator" className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-between transition group">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Barcode Labels</div>
                <div className="text-xs font-bold text-indigo-100">Thermal &amp; A4 Stickers</div>
              </div>
              <Tag className="w-4 h-4 text-indigo-300 group-hover:scale-110 transition-transform" />
            </Link>

            <Link href="/products" className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-between transition group">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Size Matrix</div>
                <div className="text-xs font-bold text-indigo-100">XS, S, M, L, XL, 32, 34</div>
              </div>
              <Shirt className="w-4 h-4 text-indigo-300 group-hover:scale-110 transition-transform" />
            </Link>

            <Link href="/billing" className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-between transition group col-span-2 sm:col-span-1">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Fast Billing</div>
                <div className="text-xs font-bold text-indigo-100">Color/Size Picker Modal</div>
              </div>
              <Receipt className="w-4 h-4 text-indigo-300 group-hover:scale-110 transition-transform" />
            </Link>
          </div>
        </div>
      )}

      {businessType === 'grocery' && (
        <div className="bg-gradient-to-br from-emerald-900 to-slate-950 text-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-emerald-700/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold flex-shrink-0">
                <Scale className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Kirana Fast Counter &amp; Loose Staples</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[9px] font-black uppercase">
                    Grocery Desk
                  </span>
                </h3>
                <p className="text-[10.5px] text-emerald-200/80">{looseItemsCount} loose weight items • Laser scanner auto-focus</p>
              </div>
            </div>
            <Link
              href="/billing"
              className="px-2.5 py-1 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-100 font-bold text-[11px] flex items-center gap-1 transition flex-shrink-0"
            >
              <span>Quick Counter</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {businessType === 'hardware' && (
        <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 text-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-slate-700/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold flex-shrink-0">
                <Wrench className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Hardware Contractor &amp; Bulk Reorder Hub</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[9px] font-black uppercase">
                    Sanitary &amp; Tools
                  </span>
                </h3>
                <p className="text-[10.5px] text-slate-300">Meter, sq.ft, pipe &amp; wire length units • Wholesale contractor rates</p>
              </div>
            </div>
            <Link
              href="/khata"
              className="px-2.5 py-1 rounded-lg bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 font-bold text-[11px] flex items-center gap-1 transition flex-shrink-0"
            >
              <span>Contractor Udhar</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* ---------------- 1. DAILY SHOP OPERATIONS ---------------- */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
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

          {/* Tile 2: Cash Register */}
          <Link href="/cash-register" className="group">
            <div className="bg-white border border-amber-300 hover:border-amber-500 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-amber-50/50 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <Calculator className="w-4.5 h-4.5 text-amber-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Cash Register</div>
                <div className="text-[11px] text-amber-800 font-medium truncate">Shift &amp; Till</div>
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

          {/* Tile 4: Transactions & Audit */}
          <Link href="/transactions" className="group">
            <div className="bg-white border border-teal-200 hover:border-teal-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-teal-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4.5 h-4.5 text-teal-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Transactions</div>
                <div className="text-[11px] text-teal-800 font-medium truncate">Bills &amp; Returns</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ---------------- 2. CATALOG & STOCK MANAGEMENT ---------------- */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Catalog &amp; Stock Management
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Tile 5: Products Master */}
          <Link href="/products" className="group">
            <div className="bg-white border border-blue-200 hover:border-blue-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-blue-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <Package className="w-4.5 h-4.5 text-blue-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Products Master</div>
                <div className="text-[11px] text-blue-800 font-medium truncate">{products.length} items catalog</div>
              </div>
            </div>
          </Link>

          {/* Tile 6: Inventory & Expiry */}
          <Link href="/inventory" className="group">
            <div className="bg-white border border-cyan-200 hover:border-cyan-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-cyan-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-cyan-100 text-cyan-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <Boxes className="w-4.5 h-4.5 text-cyan-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Inventory &amp; Expiry</div>
                <div className="text-[11px] text-cyan-800 font-medium truncate">Batches &amp; Alerts</div>
              </div>
            </div>
          </Link>

          {/* Tile 7: Purchases & Bills */}
          <Link href="/purchases" className="group">
            <div className="bg-white border border-amber-200 hover:border-amber-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-amber-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-4.5 h-4.5 text-amber-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Purchases &amp; Sourcing</div>
                <div className="text-[11px] text-amber-800 font-medium truncate">Vendor Invoices</div>
              </div>
            </div>
          </Link>

          {/* Tile 8: Barcode Studio */}
          <Link href="/barcode-generator" className="group">
            <div className="bg-white border border-purple-200 hover:border-purple-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-purple-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <Barcode className="w-4.5 h-4.5 text-purple-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Barcode Studio</div>
                <div className="text-[11px] text-purple-800 font-medium truncate">Price Stickers &amp; QR</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ---------------- 3. GROWTH, TAX & CLOUD ---------------- */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Growth, Tax &amp; Cloud
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Tile 9: WhatsApp Growth */}
          <Link href="/growth" className="group">
            <div className="bg-white border border-emerald-200 hover:border-emerald-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-emerald-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">WhatsApp Growth</div>
                <div className="text-[11px] text-emerald-800 font-medium truncate">Offers &amp; Festivals</div>
              </div>
            </div>
          </Link>

          {/* Tile 10: GST & Accounting */}
          <Link href="/gst-reports" className="group">
            <div className="bg-white border border-indigo-200 hover:border-indigo-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-indigo-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-4.5 h-4.5 text-indigo-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">GST &amp; Accounting</div>
                <div className="text-[11px] text-indigo-800 font-medium truncate">GSTR-1 &amp; Reports</div>
              </div>
            </div>
          </Link>

          {/* Tile 11: Invoice Themes */}
          <Link href="/invoice-designer" className="group">
            <div className="bg-white border border-amber-200 hover:border-amber-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-amber-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <Palette className="w-4.5 h-4.5 text-amber-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Invoice Themes</div>
                <div className="text-[11px] text-amber-800 font-medium truncate">Design &amp; Header</div>
              </div>
            </div>
          </Link>

          {/* Tile 12: Backup & Cloud */}
          <Link href="/cloud-backup" className="group">
            <div className="bg-white border border-sky-200 hover:border-sky-400 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs bg-gradient-to-r from-white to-sky-50/40 active:scale-[0.98] transition-all">
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-900 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                <HardDrive className="w-4.5 h-4.5 text-sky-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Backup &amp; Restore</div>
                <div className="text-[11px] text-sky-800 font-medium truncate">JSON &amp; Excel</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ---------------- LOW STOCK & OUT OF STOCK WATCHLIST WIDGET ---------------- */}
      {stockWatchlist.length > 0 && (
        <div className="bg-white border border-rose-200/90 rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
          {/* Collapsible Header Banner */}
          <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div 
              onClick={() => setIsStockAlertExpanded(!isStockAlertExpanded)}
              className="flex items-center gap-2.5 cursor-pointer flex-1 select-none"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-slate-900">Low Stock &amp; Out-of-Stock Alert</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    outOfStockProducts.length > 0
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-amber-500 text-slate-950'
                  }`}>
                    {outOfStockProducts.length > 0 ? `${outOfStockProducts.length} Out of Stock` : `${lowStockProducts.length} Needs Restock`}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  {isStockAlertExpanded 
                    ? 'Items below minimum threshold. Restock in 1-tap or scan new cartons.'
                    : `${stockWatchlist.length} items require attention. Click to expand & restock.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
              <button
                type="button"
                onClick={() => setIsRapidInwardOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rapid Stock In</span>
              </button>

              <Link href="/products?filter=low_stock">
                <button
                  type="button"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <span>View All ({stockWatchlist.length})</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </Link>

              {/* Dropdown Expand/Collapse Toggle Button */}
              <button
                type="button"
                onClick={() => setIsStockAlertExpanded(!isStockAlertExpanded)}
                className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-rose-200"
                title={isStockAlertExpanded ? "Collapse Alert Section" : "Expand Alert Section"}
              >
                <span>{isStockAlertExpanded ? 'Hide' : `Show (${stockWatchlist.length})`}</span>
                {isStockAlertExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-rose-700" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-rose-700" />
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Dropdown Content */}
          {isStockAlertExpanded && (
            <div className="px-3.5 pb-3.5 sm:px-5 sm:pb-5 pt-1 border-t border-rose-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* List of Out of Stock & Low Stock Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5 pt-2">
                {stockWatchlist.slice(0, 6).map((item) => {
                  const stockNum = Number(item.current_stock ?? 0);
                  const isZero = stockNum <= 0;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between transition-all",
                        isZero
                          ? "bg-rose-50/50 border-rose-200 ring-1 ring-rose-300/40"
                          : "bg-amber-50/30 border-amber-200/80"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">
                            {item.category_name || 'General'}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5" title={item.name}>
                            {item.name}
                          </h4>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Rate: <span className="font-bold text-slate-800">{formatINR(item.selling_price)}</span>/{item.unit}
                          </div>
                        </div>

                        <span className={cn(
                          "px-1.5 py-0.5 rounded-md text-[9.5px] sm:text-[10px] font-black uppercase shrink-0",
                          isZero
                            ? "bg-rose-600 text-white shadow-2xs"
                            : "bg-amber-200 text-amber-950 font-bold"
                        )}>
                          {isZero ? '0 Left (Out)' : `${stockNum} left`}
                        </span>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500 font-medium truncate">
                          Min: {item.min_stock_level || 5} {item.unit}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleQuickRestock(item, 10)}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-[10.5px] font-black flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95 transition shrink-0"
                          title="Add 10 units to stock instantly"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+10 Stock</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {stockWatchlist.length > 6 && (
                <div className="text-center pt-1">
                  <Link
                    href="/products?filter=low_stock"
                    className="text-xs font-bold text-rose-700 hover:text-rose-800 hover:underline inline-flex items-center gap-1"
                  >
                    <span>+{stockWatchlist.length - 6} more items need restock in catalog</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------- RECENT TRANSACTIONS WIDGET (CLEAN LIGHT THEME) ---------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div 
            onClick={() => setIsRecentCollapsed(!isRecentCollapsed)}
            className="flex items-center gap-2.5 cursor-pointer select-none flex-1"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center flex-shrink-0">
              <Receipt className="w-4 h-4 text-slate-700" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                  {filteredRecentSales.length} bills
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isRecentCollapsed ? 'Click to expand and filter list' : 'Click any invoice to view, print, or WhatsApp bill'}
              </p>
            </div>
          </div>

          {/* Right Action Cluster: Full Ledger Link + Collapse/Expand Toggle Button */}
          <div className="flex items-center gap-2 self-start sm:self-center">
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

            <button
              type="button"
              onClick={() => setIsRecentCollapsed(!isRecentCollapsed)}
              className="p-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-slate-200"
              title={isRecentCollapsed ? 'Expand Transactions List' : 'Collapse Transactions List'}
            >
              <span>{isRecentCollapsed ? 'Show' : 'Hide'}</span>
              {isRecentCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-slate-700" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-700" />}
            </button>
          </div>
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
                {displayedSales.map((s: Sale) => (
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
            {isFree && hasOlderSalesThan7Days && (
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
        sales={todaysSales}
        expenses={todaysExpenses}
      />

      {/* Rapid Barcode Stock Inward (Stock In / Mal Aavya) Modal */}
      <RapidBarcodeInwardModal
        isOpen={isRapidInwardOpen}
        onClose={() => setIsRapidInwardOpen(false)}
      />
    </div>
  );
}
