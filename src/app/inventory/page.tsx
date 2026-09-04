'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Product, Supplier } from '@/types';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useProSubscription } from '@/components/subscription/ProFeatureGate';

// Modular Sub-components
import { InventoryHeaderActions } from '@/components/inventory/InventoryHeaderActions';
import { InventoryMetricsRibbon } from '@/components/inventory/InventoryMetricsRibbon';
import { InventoryNavTabs, InventoryTabType } from '@/components/inventory/InventoryNavTabs';
import { ReorderAlertsList } from '@/components/inventory/ReorderAlertsList';
import { StockMovementsList } from '@/components/inventory/StockMovementsList';
import { ExpiryRadar } from '@/components/inventory/ExpiryRadar';

// Lazy-load heavy modals
const ExcelInventoryImporter = dynamic(
  () => import('@/components/inventory/ExcelInventoryImporter').then((m) => m.ExcelInventoryImporter),
  { ssr: false }
);
const UpgradeModal = dynamic(
  () => import('@/components/subscription/UpgradeModal').then((m) => m.UpgradeModal),
  { ssr: false }
);

export default function InventoryPage() {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const [isExcelImporterOpen, setIsExcelImporterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<InventoryTabType>('reorder');
  const [invToast, setInvToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const showInvToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setInvToast({ message, type });
    setTimeout(() => setInvToast(null), 4000);
  };

  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const products = useLiveQuery(async () => {
    const all = await db.products.toArray();
    return all.filter((p) => p.is_active !== false);
  }) || [];
  const suppliers = useLiveQuery(async () => db.suppliers.toArray()) || [];
  const movements = useLiveQuery(async () => db.inventory_movements.reverse().limit(100).toArray()) || [];

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => !p.is_unlimited_stock && p.current_stock <= (p.min_stock_level || 5));
  }, [products]);

  // Near-expiry products (<60 days)
  const nearExpiryProducts = useMemo(() => {
    const today = new Date();
    const sixtyDaysLater = new Date();
    sixtyDaysLater.setDate(today.getDate() + 60);

    return products.filter((p) => {
      if (!p.expiry_date) return false;
      const expDate = new Date(p.expiry_date);
      return !isNaN(expDate.getTime()) && expDate <= sixtyDaysLater;
    });
  }, [products]);

  // Inventory asset valuation
  const totalAssetValuePaise = useMemo(() => {
    return products.reduce((acc, p) => {
      if (p.is_unlimited_stock) return acc;
      const cost = p.purchase_price || p.selling_price || 0;
      return acc + (cost * Math.max(0, p.current_stock));
    }, 0);
  }, [products]);

  // Quick Restock Handler
  const handleQuickRestock = async (product: Product, quantity: number) => {
    const newStock = product.current_stock + quantity;
    await db.products.update(product.id, {
      current_stock: newStock,
      updated_at: new Date().toISOString(),
    });

    await db.inventory_movements.put({
      id: `mov_${Date.now()}`,
      business_id: business?.id || 'biz_default',
      product_id: product.id,
      product_name: product.name,
      movement_type: 'PURCHASE',
      quantity,
      previous_stock: product.current_stock,
      new_stock: newStock,
      reason: '1-Tap quick restock',
      created_by: 'owner',
      created_at: new Date().toISOString(),
    });

    showInvToast(`✅ Restocked +${quantity} units for ${product.name}!`);
  };

  // WhatsApp Supplier Order Handler
  const handleSendSupplierOrder = (product: Product) => {
    const supplier = suppliers.find((s) => s.id === product.supplier_id) || suppliers[0];
    const supplierPhone = supplier?.phone ? supplier.phone.replace(/\D/g, '') : '';
    const storeName = business?.name || 'Our Store';
    const reorderQty = Math.max(10, (product.min_stock_level || 5) * 2);

    const message = `🙏 *नमस्ते ${supplier?.name ? supplier.name + ' जी' : 'सप्लायर जी'},*\n━━━━━━━━━━━━━━━━━━━━\n*${storeName}* की तरफ से नया Purchase Re-Order:\n\n📦 *Item:* ${product.name}\n🔢 *Required Quantity:* ${reorderQty} ${product.unit}\n🏷️ *Barcode:* ${product.barcode || 'N/A'}\n\nकृपया जल्द से जल्द बिल और डिलीवरी कन्फर्म करें।\n━━━━━━━━━━━━━━━━━━━━\n_${storeName} — Smart POS_`;

    if (supplierPhone) {
      window.open(`https://wa.me/91${supplierPhone}?text=${encodeURIComponent(message)}`, '_blank');
      showInvToast(`📲 WhatsApp opened for supplier +91${supplierPhone}!`);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      showInvToast(`📲 WhatsApp share opened!`);
    }
  };

  return (
    <div className="space-y-3.5 pb-20 sm:pb-8 animate-in fade-in duration-150">
      {/* 1. Header Actions */}
      <InventoryHeaderActions
        totalItems={products.length}
        onOpenExcelImporter={() => setIsExcelImporterOpen(true)}
      />

      {/* 2. Metrics Ribbon */}
      <InventoryMetricsRibbon
        totalItems={products.length}
        totalAssetValuePaise={totalAssetValuePaise}
        lowStockCount={lowStockProducts.length}
        nearExpiryCount={nearExpiryProducts.length}
      />

      {/* 3. Navigation Tabs */}
      <InventoryNavTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lowStockCount={lowStockProducts.length}
        nearExpiryCount={nearExpiryProducts.length}
      />

      {/* 4. Active Tab Content */}
      {activeTab === 'reorder' && (
        <ReorderAlertsList
          lowStockProducts={lowStockProducts}
          suppliers={suppliers}
          onQuickRestock={handleQuickRestock}
          onSendSupplierOrder={handleSendSupplierOrder}
        />
      )}

      {activeTab === 'expiry' && (
        <ExpiryRadar />
      )}

      {activeTab === 'movements' && (
        <StockMovementsList
          movements={movements}
        />
      )}

      {/* ---------------- MODALS ---------------- */}
      <ExcelInventoryImporter
        isOpen={isExcelImporterOpen}
        onClose={() => setIsExcelImporterOpen(false)}
        businessId={business?.id || 'biz_default'}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />

      {/* Floating Toast */}
      {invToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-slate-700 text-white text-xs font-bold shadow-2xl animate-in slide-in-from-bottom-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{invToast.message}</span>
        </div>
      )}
    </div>
  );
}
