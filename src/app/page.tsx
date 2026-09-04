'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR, cn } from '@/lib/utils';
import { Sale, Product } from '@/types';
import { triggerBackgroundSync } from '@/lib/firebase/backgroundSync';
import { subscriptionService } from '@/lib/subscription/subscriptionService';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';
import { DayEndClosingReportModal } from '@/components/reports/DayEndClosingReportModal';

// Modular Dashboard Sub-components
import { TodayBusinessPulse } from '@/components/dashboard/TodayBusinessPulse';
import { QuickActionDock } from '@/components/dashboard/QuickActionDock';
import { QuickToolsGrid } from '@/components/dashboard/QuickToolsGrid';
import { NicheRadarBanner } from '@/components/dashboard/NicheRadarBanner';
import { DashboardStockWatchlist } from '@/components/dashboard/DashboardStockWatchlist';
import { DashboardRecentSales } from '@/components/dashboard/DashboardRecentSales';

const getTodayISORange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
};

export default function HomePage() {
  const { t } = useTranslation();
  const { isPro, isUpgradeModalOpen: isUpgradeOpen, setIsUpgradeModalOpen: setIsUpgradeOpen } = useProSubscription();
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [isClosingReportOpen, setIsClosingReportOpen] = useState<boolean>(false);
  const [restockToast, setRestockToast] = useState<string | null>(null);

  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const businessType = business?.business_type || 'grocery';

  // Live Database Queries
  const products = useLiveQuery(async () => db.products.toArray()) || [];
  const activeProducts = useMemo(() => products.filter((p) => p.is_active !== false), [products]);

  // Today's Sales
  const todaysSales = useLiveQuery(async () => {
    const { start, end } = getTodayISORange();
    return db.sales.where('created_at').between(start, end, true, true).toArray();
  }) || [];
  const todaysSalesTotal = useMemo(() => {
    return todaysSales.reduce((acc, s) => acc + s.grand_total, 0);
  }, [todaysSales]);

  // Today's Cash Expenses
  const todaysExpenses = useLiveQuery(async () => {
    const { start, end } = getTodayISORange();
    return db.cash_expenses.where('created_at').between(start, end, true, true).toArray();
  }) || [];

  // Cash in Hand calculation (Cash Sales - Expenses)
  const netCashInHand = useMemo(() => {
    const cashSales = todaysSales.reduce((sum, s) => {
      if (s.payment_method === 'cash') return sum + (s.amount_received || s.grand_total);
      if (s.payment_split?.cash_amount) return sum + s.payment_split.cash_amount;
      return sum;
    }, 0);
    const cashExp = todaysExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    return Math.max(0, cashSales - cashExp);
  }, [todaysSales, todaysExpenses]);

  // Estimated Gross Profit
  const todaysGrossProfit = useMemo(() => {
    const productCostMap = new Map(products.map((p) => [p.id, p.purchase_price || 0]));
    let profit = 0;
    for (const sale of todaysSales) {
      for (const item of sale.items || []) {
        const purchasePrice = productCostMap.get(item.product_id) || Math.round(item.unit_price * 0.75);
        const margin = item.unit_price - purchasePrice;
        profit += Math.max(0, margin * (item.quantity || 1));
      }
    }
    return profit;
  }, [todaysSales, products]);

  // Outstanding Khata Debtors
  const customersWithCredit = useLiveQuery(async () => {
    return db.customers.where('current_balance').above(0).toArray();
  }) || [];
  const totalOutstandingCredit = useMemo(() => {
    return customersWithCredit.reduce((acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0), 0);
  }, [customersWithCredit]);

  // Stock Watchlist (Out of stock & low stock)
  const outOfStockProducts = useMemo(() => {
    return activeProducts.filter(
      (p) => !p.is_unlimited_stock && Number(p.current_stock ?? 0) <= 0
    );
  }, [activeProducts]);

  const lowStockProducts = useMemo(() => {
    return activeProducts.filter(
      (p) => !p.is_unlimited_stock && (Number(p.current_stock ?? 0) <= Number(p.min_stock_level ?? 5) || Number(p.current_stock ?? 0) <= 0)
    );
  }, [activeProducts]);

  const stockWatchlist = useMemo(() => {
    return [...lowStockProducts].sort((a, b) => {
      const stockA = Number(a.current_stock ?? 0);
      const stockB = Number(b.current_stock ?? 0);
      return stockA - stockB;
    });
  }, [lowStockProducts]);

  // Recent Sales list
  const recentSales = useLiveQuery(async () => {
    return await db.sales.orderBy('created_at').reverse().limit(50).toArray();
  }) || [];

  // Niche Metric Computations
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const expiredMedicines = useMemo(() => {
    const now = Date.now();
    return products.filter((p) => p.expiry_date && new Date(p.expiry_date).getTime() <= now);
  }, [products]);

  const expiringSoonMedicines = useMemo(() => {
    const now = Date.now();
    return products.filter((p) => {
      if (!p.expiry_date) return false;
      const diff = new Date(p.expiry_date).getTime() - now;
      return diff > 0 && diff <= thirtyDaysMs;
    });
  }, [products]);

  const looseItemsCount = useMemo(() => {
    return products.filter((p) => p.is_loose_item || ['kg', 'gram', 'litre'].includes(p.unit)).length;
  }, [products]);

  // 1-Tap Quick Restock Handler
  const handleQuickRestock = async (product: Product, quantityToAdd: number = 10) => {
    try {
      const now = new Date().toISOString();
      const current = Number(product.current_stock ?? 0);
      const newStock = current + quantityToAdd;
      const activeBizId = business?.id || product.business_id || 'biz_default';

      await db.products.update(product.id, {
        current_stock: newStock,
        updated_at: now,
      });

      await db.inventory_movements.put({
        id: `mov_dash_restock_${Date.now()}_${product.id}`,
        business_id: activeBizId,
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

      try {
        triggerBackgroundSync(activeBizId);
      } catch {}

      setRestockToast(`✅ Added +${quantityToAdd} ${product.unit || 'units'} to ${product.name}!`);
      setTimeout(() => setRestockToast(null), 3500);
    } catch (err) {
      console.error('Failed to quick restock item:', err);
    }
  };

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
    <div className="space-y-4 pb-20 sm:pb-6 animate-in fade-in duration-150">
      {/* Restock Toast Notification */}
      {restockToast && (
        <div className="fixed bottom-16 sm:bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-800 shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <span>{restockToast}</span>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        currentTier={isPro ? 'pro' : 'free'}
        businessName={business?.name}
      />

      {/* 1. TODAY'S BUSINESS PULSE (4-Stat Realtime Metric Ribbon) */}
      <TodayBusinessPulse
        todaysSalesTotal={todaysSalesTotal}
        todaysSalesCount={todaysSales.length}
        todaysGrossProfit={todaysGrossProfit}
        netCashInHand={netCashInHand}
        totalOutstandingCredit={totalOutstandingCredit}
        customersWithCreditCount={customersWithCredit.length}
      />

      {/* 2. 1-TAP QUICK ACTION DOCK (POS, Khata, Inward, Closing) */}
      <QuickActionDock
        onOpenClosingReport={() => setIsClosingReportOpen(true)}
      />

      {/* 3. NICHE RADAR ADAPTIVE HUB (Pharmacy Rx, Restaurant Tables, Apparel Sizes, etc.) */}
      <NicheRadarBanner
        businessType={businessType}
        products={products}
        expiredMedicines={expiredMedicines}
        expiringSoonMedicines={expiringSoonMedicines}
        looseItemsCount={looseItemsCount}
      />

      {/* 4. LOW STOCK & OUT OF STOCK WATCHLIST ACCORDION */}
      <DashboardStockWatchlist
        stockWatchlist={stockWatchlist}
        outOfStockProducts={outOfStockProducts}
        lowStockProducts={lowStockProducts}
        onQuickRestock={handleQuickRestock}
      />

      {/* 5. SHOP MANAGEMENT TOOLS (Compact 8-Tool Grid) */}
      <QuickToolsGrid productsCount={products.length} />

      {/* 6. RECENT TRANSACTIONS STREAM WITH 1-CLICK ACTIONS */}
      <DashboardRecentSales
        sales={recentSales}
        onSelectSaleForInvoice={(sale) => setSelectedSaleForInvoice(sale)}
        business={business}
      />

      {/* ---------------- MODALS ---------------- */}
      {/* Day-End Closing Z-Report Modal */}
      <DayEndClosingReportModal
        isOpen={isClosingReportOpen}
        onClose={() => setIsClosingReportOpen(false)}
        business={business}
        sales={todaysSales}
        expenses={todaysExpenses}
      />

      {/* Tax Invoice Full Bill Preview Modal */}
      <InvoiceModal
        isOpen={Boolean(selectedSaleForInvoice)}
        onClose={() => setSelectedSaleForInvoice(null)}
        sale={selectedSaleForInvoice}
        business={business}
      />
    </div>
  );
}
