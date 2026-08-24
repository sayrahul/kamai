'use client';

import React, { useState, useMemo } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Product, Supplier } from '@/types';
import { formatINR, cn } from '@/lib/utils';
import { 
  Boxes, 
  Package, 
  AlertTriangle, 
  ArrowDownRight, 
  ArrowUpRight, 
  History, 
  Calendar, 
  Clock, 
  Send, 
  ShoppingBag, 
  Sparkles, 
  CheckCircle2, 
  AlertOctagon, 
  Search, 
  Plus, 
  Edit3, 
  ExternalLink,
  Tag,
  Barcode,
  Truck,
  Shirt,
  Smartphone,
  Pill,
  Wrench,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { getStoreProfile } from '@/lib/constants/storeProfiles';
import { useProSubscription, ProFeatureBadge } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { ExcelInventoryImporter } from '@/components/inventory/ExcelInventoryImporter';
import { CashierPrivacyToggleButton, ProfitMask } from '@/components/privacy/ProfitMask';
import { ExpiryRadar } from '@/components/inventory/ExpiryRadar';
import { Lock } from 'lucide-react';

export default function InventoryPage() {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const [isExcelImporterOpen, setIsExcelImporterOpen] = useState(false);
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const storeProfile = getStoreProfile(business?.business_type);
  const products = useLiveQuery(async () => {
    const all = await db.products.toArray();
    return all.filter((p) => p.is_active !== false);
  }) || [];
  const suppliers = useLiveQuery(async () => db.suppliers.toArray()) || [];
  const movements = useLiveQuery(async () => db.inventory_movements.reverse().limit(100).toArray()) || [];

  const sevenDaysAgoDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const displayMovements = useMemo(() => {
    if (isPro) return movements;
    return movements.filter((m) => new Date(m.created_at) >= sevenDaysAgoDate);
  }, [movements, isPro, sevenDaysAgoDate]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'expiry' | 'variants' | 'serials' | 'reorder' | 'batches' | 'movements'>(
    storeProfile.featureToggles.showBatchExpiry ? 'expiry' :
    storeProfile.featureToggles.showSizeVariants ? 'variants' :
    storeProfile.featureToggles.showImeiWarranty ? 'serials' : 'reorder'
  );
  const [expiryFilter, setExpiryFilter] = useState<'all' | '15days' | '30days' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reorder Quantities State (mapped by product ID)
  const [reorderQtys, setReorderQtys] = useState<{ [productId: string]: number }>({});

  // Batch / Variant Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editBatchNo, setEditBatchNo] = useState('');
  const [editMfgDate, setEditMfgDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editImei, setEditImei] = useState('');
  const [editWarrantyMonths, setEditWarrantyMonths] = useState('');
  const [editStockAdjustment, setEditStockAdjustment] = useState('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Supplier Map
  const supplierMap = useMemo(() => {
    const map = new Map<string, Supplier>();
    suppliers.forEach((s) => map.set(s.id, s));
    return map;
  }, [suppliers]);

  // Overall Metrics
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.current_stock <= p.min_stock_level);
  }, [products]);

  const totalStockValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + p.current_stock * p.purchase_price, 0);
  }, [products]);

  // Expiry Calculations
  const today = useMemo(() => new Date(), []);
  
  const expiryAnalysis = useMemo(() => {
    const expiredList: Product[] = [];
    const expiring15Days: Product[] = [];
    const expiring30Days: Product[] = [];
    const healthyList: Product[] = [];

    products.forEach((p) => {
      if (!p.expiry_date) {
        healthyList.push(p);
        return;
      }

      const exp = new Date(p.expiry_date);
      const diffMs = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        expiredList.push(p);
      } else if (diffDays <= 15) {
        expiring15Days.push(p);
      } else if (diffDays <= 30) {
        expiring30Days.push(p);
      } else {
        healthyList.push(p);
      }
    });

    return {
      expiredList,
      expiring15Days,
      expiring30Days,
      healthyList,
    };
  }, [products, today]);

  // Filtered Expiry List
  const displayExpiryList = useMemo(() => {
    let list: Product[] = [];
    if (expiryFilter === 'expired') list = expiryAnalysis.expiredList;
    else if (expiryFilter === '15days') list = expiryAnalysis.expiring15Days;
    else if (expiryFilter === '30days') list = [...expiryAnalysis.expiring15Days, ...expiryAnalysis.expiring30Days];
    else list = products.filter((p) => Boolean(p.expiry_date));

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((p) => p.name.toLowerCase().includes(q) || (p.batch_number && p.batch_number.toLowerCase().includes(q)));
  }, [expiryFilter, expiryAnalysis, products, searchQuery]);

  // Group Low Stock Items by Supplier for WhatsApp Purchase Orders
  const lowStockBySupplier = useMemo(() => {
    const groups: { [supplierId: string]: { supplier: Supplier | null; items: Product[] } } = {};

    lowStockProducts.forEach((item) => {
      const supId = item.supplier_id || 'unassigned';
      if (!groups[supId]) {
        groups[supId] = {
          supplier: supId !== 'unassigned' ? supplierMap.get(supId) || null : null,
          items: [],
        };
      }
      groups[supId].items.push(item);
    });

    return Object.values(groups);
  }, [lowStockProducts, supplierMap]);

  // Get days remaining string and color badge
  const getExpiryBadge = (expiryDateStr?: string) => {
    if (!expiryDateStr) {
      return <Badge variant="outline" size="sm" className="text-slate-400">No Expiry</Badge>;
    }
    const exp = new Date(expiryDateStr);
    const diffMs = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
          <AlertOctagon className="w-3 h-3 text-rose-600" />
          <span>EXPIRED ({Math.abs(diffDays)}d ago)</span>
        </span>
      );
    }
    if (diffDays <= 15) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>EXPIRING IN {diffDays} DAYS</span>
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-900 border border-yellow-300">
          {diffDays} Days Left
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
        {diffDays} Days Left (Fresh)
      </span>
    );
  };

  // 1-Click WhatsApp Purchase Order Dispatch
  const handleSendWhatsAppPO = (supplier: Supplier | null, items: Product[]) => {
    const storeName = business?.name || 'My Store';
    const storePhone = business?.phone || '';
    const storeAddress = business?.address || '';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    let message = `📦 *PURCHASE ORDER - ${storeName.toUpperCase()}*\n`;
    message += `📅 *Date:* ${dateStr}\n\n`;
    if (supplier) {
      message += `Dear *${supplier.name}*,\nPlease dispatch the following stock items to our store at your earliest:\n\n`;
    } else {
      message += `Please dispatch the following stock items to our store:\n\n`;
    }

    let grandEstimatedPaise = 0;
    items.forEach((p, idx) => {
      const orderQty = reorderQtys[p.id] || Math.max(p.min_stock_level * 2 - p.current_stock, 10);
      const estCost = orderQty * p.purchase_price;
      grandEstimatedPaise += estCost;

      message += `${idx + 1}. *${p.name}*\n`;
      message += `   • *Order Qty:* ${orderQty} ${p.unit}s (Current Stock: ${p.current_stock})\n`;
      if (p.hsn_code) message += `   • HSN: ${p.hsn_code}\n`;
    });

    message += `\n💰 *Estimated Total Value:* ${formatINR(grandEstimatedPaise)}\n`;
    if (storeAddress) message += `📍 *Delivery Address:* ${storeAddress}\n`;
    if (storePhone) message += `📞 *Contact Phone:* ${storePhone}\n\n`;
    message += `Please confirm order availability and dispatch timing. Thank you!`;

    const phone = supplier?.phone?.replace(/[^0-9]/g, '') || '';
    const targetPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // 1-Click WhatsApp Return Request for Expired Items
  const handleSendReturnRequest = (product: Product) => {
    const sup = product.supplier_id ? supplierMap.get(product.supplier_id) : null;
    const storeName = business?.name || 'My Store';
    let msg = `⚠️ *STOCK RETURN / REPLACEMENT REQUEST*\n\n`;
    msg += `Store: *${storeName}*\n`;
    msg += `Product: *${product.name}*\n`;
    if (product.batch_number) msg += `Batch Number: *${product.batch_number}*\n`;
    if (product.expiry_date) msg += `Expiry Date: *${product.expiry_date}*\n`;
    msg += `Current Quantity: *${product.current_stock} ${product.unit}*\n\n`;
    msg += `This batch is expiring / expired. Please arrange a return credit note or fresh batch replacement during next delivery. Thank you!`;

    const phone = sup?.phone?.replace(/[^0-9]/g, '') || '';
    const targetPhone = phone.length === 10 ? `91${phone}` : phone;
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Open Batch / Variant Editor Modal
  const handleOpenBatchModal = (product: Product) => {
    setEditingProduct(product);
    setEditBatchNo(product.batch_number || `BAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setEditMfgDate(product.mfg_date || new Date().toISOString().split('T')[0]);
    // Default expiry 6 months from now if empty
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);
    setEditExpiryDate(product.expiry_date || futureDate.toISOString().split('T')[0]);
    setEditSize(product.size || '');
    setEditColor(product.color || '');
    setEditImei(product.imei_serial || '');
    setEditWarrantyMonths(product.warranty_period_months ? product.warranty_period_months.toString() : '');
    setEditStockAdjustment(product.current_stock.toString());
  };

  // Save Batch & Variant Changes
  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const newStock = parseInt(editStockAdjustment, 10);
    const stockDiff = !isNaN(newStock) ? newStock - editingProduct.current_stock : 0;
    const warrantyNum = editWarrantyMonths.trim() ? parseInt(editWarrantyMonths, 10) : undefined;

    await db.products.update(editingProduct.id, {
      batch_number: editBatchNo.trim() || undefined,
      mfg_date: editMfgDate || undefined,
      expiry_date: editExpiryDate || undefined,
      size: editSize.trim() || undefined,
      color: editColor.trim() || undefined,
      imei_serial: editImei.trim() || undefined,
      warranty_period_months: warrantyNum,
      current_stock: !isNaN(newStock) ? newStock : editingProduct.current_stock,
      updated_at: new Date().toISOString(),
    });

    // Record stock movement if adjusted
    if (stockDiff !== 0) {
      await db.inventory_movements.add({
        id: `mov_${Date.now()}`,
        business_id: editingProduct.business_id || 'biz_default',
        product_id: editingProduct.id,
        product_name: editingProduct.name,
        quantity: stockDiff,
        movement_type: stockDiff > 0 ? 'PURCHASE' : 'ADJUSTMENT',
        reason: 'Manual batch & stock adjustment',
        previous_stock: editingProduct.current_stock,
        new_stock: newStock,
        created_by: 'owner',
        created_at: new Date().toISOString(),
        sync_status: 'pending',
      });
    }

    setEditingProduct(null);
    setSaveSuccessNotice(`Batch & Expiry details updated for ${editingProduct.name}!`);
    setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  const inventoryTabs = useMemo(() => {
    const tabs: Array<{ id: 'expiry' | 'variants' | 'serials' | 'reorder' | 'batches' | 'movements'; label: string; icon: any }> = [];
    
    if (storeProfile.featureToggles.showBatchExpiry || (expiryAnalysis.expiring15Days.length + expiryAnalysis.expiring30Days.length + expiryAnalysis.expiredList.length > 0)) {
      tabs.push({
        id: 'expiry',
        label: `🚨 Near-Expiry Alert Radar (${expiryAnalysis.expiring15Days.length + expiryAnalysis.expiring30Days.length + expiryAnalysis.expiredList.length})`,
        icon: AlertTriangle,
      });
    }

    if (storeProfile.featureToggles.showSizeVariants) {
      tabs.push({
        id: 'variants',
        label: `👕 Size & Color Variant Matrix (${products.filter(p => p.size || p.color).length})`,
        icon: Shirt,
      });
    }

    if (storeProfile.featureToggles.showImeiWarranty) {
      tabs.push({
        id: 'serials',
        label: `📱 Serial & IMEI Warranty Audit (${products.filter(p => p.imei_serial || p.warranty_period_months).length})`,
        icon: Smartphone,
      });
    }

    tabs.push({
      id: 'reorder',
      label: `📉 1-Click WhatsApp Purchase Orders (${lowStockProducts.length})`,
      icon: Send,
    });

    tabs.push({
      id: 'batches',
      label: `📦 Product & Stock Master (${products.length})`,
      icon: Boxes,
    });

    tabs.push({
      id: 'movements',
      label: '📜 Stock Movements Audit Log',
      icon: History,
    });

    return tabs;
  }, [storeProfile, expiryAnalysis, products, lowStockProducts]);

  return (
    <div className="space-y-5 pb-16">
      {/* ---------------- TOP HEADER & ACTIONS (Single Row Compact) ---------------- */}
      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-sm sm:text-base">{storeProfile.emoji}</span>
            <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
              Inventory & Expiry
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 truncate">
            {storeProfile.name} • {products.length} items in stock • {lowStockProducts.length} low stock
          </p>
        </div>

        {/* Action Toolbar — Single Row */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <CashierPrivacyToggleButton />

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExcelImporterOpen(true)}
            className="text-xs font-bold gap-1 bg-white border-slate-300 hover:bg-slate-50 px-2 sm:px-2.5 py-1.5 cursor-pointer shadow-2xs"
            title="Import Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Import Excel/CSV</span>
            <span className="sm:hidden">Import</span>
          </Button>

          <Link href="/purchases">
            <Button size="sm" variant="outline" className="text-xs font-bold gap-1 bg-slate-50 hover:bg-slate-100 border-slate-300 px-2 sm:px-2.5 py-1.5 shadow-2xs">
              <ShoppingBag className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span className="hidden sm:inline">Purchases Log</span>
              <span className="sm:hidden">Purchases</span>
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={() => {
              if (!isPro) {
                setIsUpgradeModalOpen(true);
              } else {
                window.location.href = '/barcode-generator';
              }
            }}
            className="bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs gap-1 px-2 sm:px-2.5 py-1.5 cursor-pointer shadow-2xs"
            title="Print Barcode Labels & Price Tags"
          >
            <Barcode className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Price Tags</span>
            <span className="sm:hidden">Tags</span>
            {!isPro && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
          </Button>
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* ---------------- LIVE INVENTORY METRICS RIBBON (Space-Saving & Unified) ---------------- */}
      <Card className="p-2 sm:p-2.5 bg-white border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* 1. Total Stock Valuation */}
          <div className="px-2 py-1 sm:py-0 sm:first:pl-1">
            <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Stock Valuation</span>
              <span className="text-[10px] text-slate-400 font-medium font-mono">({products.length} SKUs)</span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5 leading-tight">
              <ProfitMask value={formatINR(totalStockValuation)} isPurchasePrice />
            </div>
          </div>

          {/* 2. Low Stock Alerts */}
          <div className="px-2 py-1 sm:py-0">
            <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                <span>Low Stock</span>
              </span>
              {lowStockProducts.length > 0 && (
                <span className="text-[9px] bg-rose-100 text-rose-800 px-1 rounded font-bold">REORDER</span>
              )}
            </div>
            <div className="text-base sm:text-lg font-black text-rose-800 font-mono mt-0.5 leading-tight">
              {lowStockProducts.length} <span className="text-[11px] font-sans font-medium text-rose-600">Items</span>
            </div>
          </div>

          {/* 3. Expiring Soon / Size Variants */}
          <div className="px-2 py-1 sm:py-0 pt-1.5 sm:pt-0">
            <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              <span>
                {storeProfile.featureToggles.showSizeVariants
                  ? 'Variants'
                  : storeProfile.featureToggles.showImeiWarranty
                  ? 'IMEI Tracked'
                  : 'Expiring ≤30d'}
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-amber-900 font-mono mt-0.5 leading-tight">
              {storeProfile.featureToggles.showSizeVariants
                ? `${products.filter(p => p.size || p.color).length} SKUs`
                : storeProfile.featureToggles.showImeiWarranty
                ? `${products.filter(p => p.imei_serial || p.warranty_period_months).length} Units`
                : `${expiryAnalysis.expiring15Days.length + expiryAnalysis.expiring30Days.length} Batches`}
            </div>
          </div>

          {/* 4. Expired Items / Fast Moving */}
          <div className="px-2 py-1 sm:py-0 pt-1.5 sm:pt-0">
            <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>{storeProfile.featureToggles.showBatchExpiry ? 'Expired' : 'Active'}</span>
            </div>
            <div className={cn(
              "text-base sm:text-lg font-black font-mono mt-0.5 leading-tight",
              storeProfile.featureToggles.showBatchExpiry && expiryAnalysis.expiredList.length > 0 ? "text-rose-600" : "text-slate-900"
            )}>
              {storeProfile.featureToggles.showBatchExpiry
                ? `${expiryAnalysis.expiredList.length} Items`
                : `${products.length} In Stock`}
            </div>
          </div>
        </div>
      </Card>

      {/* ---------------- MAIN TABS CONTAINER ---------------- */}
      <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* TAB HEADERS */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 overflow-x-auto text-xs font-bold">
          {inventoryTabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                  isSelected
                    ? 'border-slate-900 text-slate-900 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5">
          {/* =================================================================== */}
          {/* TAB 1: NEAR-EXPIRY ALERT RADAR */}
          {/* =================================================================== */}
          {activeTab === 'expiry' && (
            <div className="space-y-4">
              <ExpiryRadar />
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB: SIZE & COLOR VARIANT MATRIX (Clothing & Footwear) */}
          {/* =================================================================== */}
          {activeTab === 'variants' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Shirt className="w-3.5 h-3.5 text-purple-600" />
                    <span>Apparel Size & Color Variant Matrix</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Real-time stock balance across garment sizes (S, M, L, XL, XXL, 32, 34) and shoe sizes (UK 7, 8, 9, 10).
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Item / Garment Name</th>
                      <th className="py-2.5 px-2">Category</th>
                      <th className="py-2.5 px-2">Size</th>
                      <th className="py-2.5 px-2">Color</th>
                      <th className="py-2.5 px-2 text-right">In-Stock</th>
                      <th className="py-2.5 px-2 text-right">Selling Price</th>
                      <th className="py-2.5 px-3">Stock Health</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                          No apparel items found in catalog. Add products with sizes & colors in Products page.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => {
                        const isLow = p.current_stock <= p.min_stock_level;
                        const isOut = p.current_stock <= 0;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{p.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{p.barcode || 'No barcode'}</div>
                            </td>
                            <td className="py-2.5 px-2 text-slate-600 font-semibold">
                              {p.category_name || 'General'}
                            </td>
                            <td className="py-2.5 px-2">
                              {p.size ? (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-200 font-mono">
                                  {p.size}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Free Size</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2">
                              {p.color ? (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                  {p.color}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold">
                              <span className={isOut ? 'text-rose-600 font-black' : isLow ? 'text-amber-600 font-bold' : 'text-slate-900'}>
                                {p.current_stock} {p.unit}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                              {formatINR(p.selling_price)}
                            </td>
                            <td className="py-2.5 px-3">
                              {isOut ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Low Stock ({p.current_stock} left)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  In Stock
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenBatchModal(p)}
                                className="text-[10px] font-bold py-1 px-2 text-slate-700"
                              >
                                <Edit3 className="w-3 h-3 mr-1" />
                                Edit Stock
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB: SERIAL & IMEI WARRANTY AUDIT (Electronics & Mobile) */}
          {/* =================================================================== */}
          {activeTab === 'serials' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Device Serials, IMEI &amp; Brand Warranty Tracker</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Track device serial numbers, IMEI barcodes, and warranty coverage periods.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Device / Accessory Name</th>
                      <th className="py-2.5 px-2">Category</th>
                      <th className="py-2.5 px-2">IMEI / Serial Number</th>
                      <th className="py-2.5 px-2">Warranty Period</th>
                      <th className="py-2.5 px-2 text-right">In-Stock</th>
                      <th className="py-2.5 px-2 text-right">Selling Price</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          No electronics items found. Add products with IMEI / Warranty in Products page.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{p.barcode || 'No barcode'}</div>
                          </td>
                          <td className="py-2.5 px-2 text-slate-600 font-semibold">
                            {p.category_name || 'Electronics'}
                          </td>
                          <td className="py-2.5 px-2 font-mono font-bold text-cyan-900">
                            {p.imei_serial ? (
                              <span className="bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded text-[11px]">
                                {p.imei_serial}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Not set</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 font-bold text-slate-700">
                            {p.warranty_period_months ? (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 w-fit">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>{p.warranty_period_months} Months Brand Warranty</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                            {p.current_stock} {p.unit}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                            {formatINR(p.selling_price)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenBatchModal(p)}
                              className="text-[10px] font-bold py-1 px-2 text-slate-700"
                            >
                              <Edit3 className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 2: LOW STOCK & 1-CLICK WHATSAPP PURCHASE ORDERS */}
          {/* =================================================================== */}
          {activeTab === 'reorder' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Low Stock Replenishment & 1-Click WhatsApp Purchase Orders
                </h3>
                <p className="text-[11px] text-slate-500">
                  Products below minimum threshold are automatically grouped by supplier. Adjust quantities and dispatch official WhatsApp purchase orders with 1 tap.
                </p>
              </div>

              {lowStockBySupplier.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="text-sm font-bold text-slate-900">All Stock Levels are Healthy!</div>
                  <div className="text-xs text-slate-500">No items are currently below their minimum threshold level.</div>
                </div>
              ) : (
                lowStockBySupplier.map((group, groupIdx) => {
                  const supName = group.supplier?.name || 'General / Unassigned Wholesale Supplier';
                  const supPhone = group.supplier?.phone || '';
                  
                  // Calculate total suggested PO value
                  let totalGroupCost = 0;
                  group.items.forEach((item) => {
                    const q = reorderQtys[item.id] || Math.max(item.min_stock_level * 2 - item.current_stock, 10);
                    totalGroupCost += q * item.purchase_price;
                  });

                  return (
                    <Card key={groupIdx} className="p-4 border border-slate-200 bg-white rounded-xl shadow-xs space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                            <Truck className="w-4 h-4 text-indigo-700" />
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-slate-900">{supName}</div>
                            <div className="text-[11px] text-slate-500">
                              {supPhone ? `📞 ${supPhone}` : 'No phone linked'} • {group.items.length} items to reorder
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-700 hidden sm:inline">
                            Est: {formatINR(totalGroupCost)}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!isPro) {
                                setIsUpgradeModalOpen(true);
                              } else {
                                handleSendWhatsAppPO(group.supplier, group.items);
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Purchase Order on WhatsApp</span>
                            {!isPro && <Lock className="w-3 h-3 text-amber-300" />}
                          </Button>
                        </div>
                      </div>

                      {/* Items List in this Purchase Order */}
                      <div className="divide-y divide-slate-100 text-xs">
                        {group.items.map((item) => {
                          const currentOrderQty = reorderQtys[item.id] !== undefined 
                            ? reorderQtys[item.id] 
                            : Math.max(item.min_stock_level * 2 - item.current_stock, 10);
                          
                          return (
                            <div key={item.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900">{item.name}</div>
                                <div className="text-[11px] text-slate-500">
                                  Current Stock: <span className="font-bold text-rose-600">{item.current_stock} {item.unit}</span> (Min: {item.min_stock_level}) • Cost: {formatINR(item.purchase_price)}/{item.unit}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-auto">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-slate-600">Reorder Qty:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={currentOrderQty}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      setReorderQtys((prev) => ({ ...prev, [item.id]: isNaN(val) ? 1 : val }));
                                    }}
                                    className="w-16 p-1 border border-slate-300 rounded font-mono font-bold text-center text-xs focus:outline-none focus:border-slate-900 bg-slate-50"
                                  />
                                  <span className="text-[11px] text-slate-500 font-medium">{item.unit}</span>
                                </div>

                                <div className="text-right font-mono font-bold text-slate-900 w-24">
                                  {formatINR(currentOrderQty * item.purchase_price)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 3: BATCH MASTER & STOCK AUDIT */}
          {/* =================================================================== */}
          {activeTab === 'batches' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Product Master Stock & Batch Roster
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Assign batch numbers, manufacturing dates, and update current shelf stock.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search product or batch..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-2">Batch No</th>
                      <th className="py-2.5 px-2 text-right">Selling Price</th>
                      <th className="py-2.5 px-2 text-right">Current Stock</th>
                      <th className="py-2.5 px-2">Mfg Date</th>
                      <th className="py-2.5 px-2">Expiry Date</th>
                      <th className="py-2.5 px-3 text-right">Quick Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {products
                      .filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-[10px] text-slate-400">{p.category_name || 'General'}</div>
                          </td>
                          <td className="py-2.5 px-2 font-mono font-bold text-slate-700">
                            {p.batch_number || <span className="text-slate-400 italic">Not set</span>}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                            {formatINR(p.selling_price)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold">
                            <span className={p.current_stock <= p.min_stock_level ? 'text-rose-600' : 'text-slate-900'}>
                              {p.current_stock} {p.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px]">{p.mfg_date || '-'}</td>
                          <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px]">{p.expiry_date || '-'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenBatchModal(p)}
                              className="text-[11px] font-bold py-1 px-2.5"
                            >
                              <Edit3 className="w-3 h-3 mr-1" />
                              Edit Batch
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 4: IMMUTABLE MOVEMENTS AUDIT LOG */}
          {/* =================================================================== */}
          {activeTab === 'movements' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Immutable Stock Movement Audit Log
                </h3>
                <p className="text-[11px] text-slate-500">
                  Detailed tamper-proof ledger of every sale deduction, purchase restock, and inventory correction.
                </p>
              </div>

              {!isPro && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-950 font-medium">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span>Free Plan shows last 7 days of stock movements. Upgrade to Pro for lifetime immutable history.</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-[11px] py-1 px-2.5 h-auto flex-shrink-0 cursor-pointer"
                  >
                    Unlock Lifetime
                  </Button>
                </div>
              )}

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {displayMovements.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No stock movements recorded in this period.</div>
                ) : (
                  displayMovements.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-lg ${
                            m.quantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {m.quantity > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{m.product_name}</div>
                          <div className="text-[10px] text-slate-400">
                            {m.movement_type} • {m.reason || 'Auto update'} • {new Date(m.created_at).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className={`font-black ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </div>
                        <div className="text-[10px] text-slate-400">New Stock: {m.new_stock}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* =================================================================== */}
      {/* QUICK BATCH / VARIANT / STOCK EDIT MODAL */}
      {/* =================================================================== */}
      {editingProduct && (
        <Modal
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          title={`Edit Stock & Attributes: ${editingProduct.name}`}
          description="Update shelf stock and niche attributes for this item."
        >
          <form onSubmit={handleSaveBatch} className="space-y-3.5 text-xs">
            {/* Batch & Expiry (Pharmacy / FMCG) */}
            {(storeProfile.featureToggles.showBatchExpiry || editingProduct.batch_number || editingProduct.expiry_date) && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 space-y-2.5">
                <div className="font-bold text-amber-950 text-[11px] uppercase tracking-wider flex items-center gap-1">
                  <span>💊</span>
                  <span>Batch &amp; Expiry Control</span>
                </div>
                <Input
                  label="Batch Number"
                  value={editBatchNo}
                  onChange={(e) => setEditBatchNo(e.target.value)}
                  placeholder="e.g. BAT-2026-08"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Manufacturing Date (Mfg)"
                    type="date"
                    value={editMfgDate}
                    onChange={(e) => setEditMfgDate(e.target.value)}
                  />

                  <Input
                    label="Expiry Date"
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Size & Color (Clothing / Footwear) */}
            {(storeProfile.featureToggles.showSizeVariants || editingProduct.size || editingProduct.color) && (
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/70 space-y-2.5">
                <div className="font-bold text-purple-950 text-[11px] uppercase tracking-wider flex items-center gap-1">
                  <span>👕</span>
                  <span>Size &amp; Color Variants</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Size (S, M, L, XL, 32, UK 9)"
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                    placeholder="e.g. L (40) or UK 9"
                  />
                  <Input
                    label="Color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    placeholder="e.g. Navy Blue / Olive"
                  />
                </div>
              </div>
            )}

            {/* IMEI & Warranty (Electronics / Hardware) */}
            {(storeProfile.featureToggles.showImeiWarranty || editingProduct.imei_serial || editingProduct.warranty_period_months) && (
              <div className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-200/70 space-y-2.5">
                <div className="font-bold text-cyan-950 text-[11px] uppercase tracking-wider flex items-center gap-1">
                  <span>📱</span>
                  <span>IMEI &amp; Warranty Tracking</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="IMEI / Device Serial"
                    value={editImei}
                    onChange={(e) => setEditImei(e.target.value)}
                    placeholder="e.g. 86420104889211"
                  />
                  <Input
                    label="Warranty (Months)"
                    type="number"
                    value={editWarrantyMonths}
                    onChange={(e) => setEditWarrantyMonths(e.target.value)}
                    placeholder="e.g. 12"
                  />
                </div>
              </div>
            )}

            <Input
              label={`Current On-Shelf Stock (${editingProduct.unit})`}
              type="number"
              value={editStockAdjustment}
              onChange={(e) => setEditStockAdjustment(e.target.value)}
              helperText="Updating this will record an inventory movement entry"
            />

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingProduct(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-slate-900 text-white font-bold">
                Save Stock &amp; Details
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Excel / CSV Inventory Importer Modal */}
      <ExcelInventoryImporter
        isOpen={isExcelImporterOpen}
        onClose={() => setIsExcelImporterOpen(false)}
        businessId={business?.id || 'biz_default'}
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
