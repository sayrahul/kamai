'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { Product, Category, ProductUnit } from '@/types';
import { formatINR, parseRupeesToPaise, cn } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  Barcode, 
  Star, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  ArrowUpDown, 
  Tag, 
  Camera, 
  Zap, 
  FileSpreadsheet,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { CashierPrivacyToggleButton, ProfitMask } from '@/components/privacy/ProfitMask';
import { lookupCategoryBarcode } from '@/lib/barcode/categoryBarcodeLoader';
import { getStoreProfile, MASTER_UNITS } from '@/lib/constants/storeProfiles';
import { useProSubscription, ProFeatureBadge } from '@/components/subscription/ProFeatureGate';

// Lazy-load heavy modals & external libraries (xlsx, zxing, qr scanner)
const PurchaseInwardOptionsSheet = dynamic(
  () => import('@/components/purchases/PurchaseInwardOptionsSheet').then((m) => m.PurchaseInwardOptionsSheet),
  { ssr: false }
);
const ExcelInventoryImporter = dynamic(
  () => import('@/components/inventory/ExcelInventoryImporter').then((m) => m.ExcelInventoryImporter),
  { ssr: false }
);
const BarcodeScannerModal = dynamic(
  () => import('@/components/barcode/BarcodeScannerModal').then((m) => m.BarcodeScannerModal),
  { ssr: false }
);
const RapidBarcodeInwardModal = dynamic(
  () => import('@/components/products/RapidBarcodeInwardModal').then((m) => m.RapidBarcodeInwardModal),
  { ssr: false }
);
const UpgradeModal = dynamic(
  () => import('@/components/subscription/UpgradeModal').then((m) => m.UpgradeModal),
  { ssr: false }
);

export default function ProductsPage() {
  const { isPro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isRapidInwardOpen, setIsRapidInwardOpen] = useState(false);
  const [isPurchaseSheetOpen, setIsPurchaseSheetOpen] = useState(false);
  const [isExcelImporterOpen, setIsExcelImporterOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Quick Add Category State
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnit, setFormUnit] = useState<ProductUnit>('packet');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formWholesalePrice, setFormWholesalePrice] = useState('');
  const [formWholesaleMinQty, setFormWholesaleMinQty] = useState('5');
  const [formIsLooseItem, setFormIsLooseItem] = useState(false);
  const [formIsUnlimitedStock, setFormIsUnlimitedStock] = useState(false);
  const [formMrp, setFormMrp] = useState('');
  const [formTaxRate, setFormTaxRate] = useState<number>(0);
  const [formStock, setFormStock] = useState('');
  const [formMinStock, setFormMinStock] = useState('5');
  const [formBarcode, setFormBarcode] = useState('');
  const [formIsFavorite, setFormIsFavorite] = useState(false);

  // Dynamic Store Profile Specific Attributes
  const [formBatchNumber, setFormBatchNumber] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formSize, setFormSize] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formImeiSerial, setFormImeiSerial] = useState('');
  const [formWarrantyMonths, setFormWarrantyMonths] = useState('');

  // Live queries
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const categories = useLiveQuery(async () => db.categories.toArray()) || [];
  const allProducts = useLiveQuery(async () => db.products.toArray()) || [];

  // O(N) pre-computed category counts (avoids O(N*M) lag in render loops)
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (let i = 0; i < allProducts.length; i++) {
      const catId = allProducts[i].category_id;
      if (catId) {
        counts.set(catId, (counts.get(catId) || 0) + 1);
      }
    }
    return counts;
  }, [allProducts]);

  // Memoized filtered product list
  const filteredProducts = useMemo(() => {
    let prods = allProducts;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      prods = prods.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q)) ||
          (p.category_name && p.category_name.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'all') {
      prods = prods.filter((p) => p.category_id === selectedCategory);
    }

    if (showLowStockOnly) {
      prods = prods.filter((p) => !p.is_unlimited_stock && p.current_stock <= p.min_stock_level);
    }

    return prods;
  }, [allProducts, searchQuery, selectedCategory, showLowStockOnly]);

  // Pre-computed live inventory metrics (O(N) single pass)
  const stockMetrics = useMemo(() => {
    let lowStockCount = 0;
    let inStockCount = 0;
    let totalStockValuePaise = 0;

    for (let i = 0; i < allProducts.length; i++) {
      const p = allProducts[i];
      if (!p.is_unlimited_stock && p.current_stock <= p.min_stock_level) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
      if (!p.is_unlimited_stock && p.current_stock > 0) {
        totalStockValuePaise += (p.purchase_price || p.selling_price) * p.current_stock;
      }
    }

    return { lowStockCount, inStockCount, totalStockValuePaise };
  }, [allProducts]);

  // Client-side batch rendering (prevents initial DOM lag)
  const [displayLimit, setDisplayLimit] = useState<number>(36);
  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, displayLimit);
  }, [filteredProducts, displayLimit]);

  const storeProfile = getStoreProfile(business?.business_type);
  const canInwardBill = business?.business_type !== 'restaurant' && storeProfile.featureToggles.hasBillScan;

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(categories[0]?.id || '');
    setFormUnit((storeProfile.defaultUnit as ProductUnit) || 'packet');
    setFormPurchasePrice('');
    setFormSellingPrice('');
    setFormWholesalePrice('');
    setFormWholesaleMinQty('5');
    setFormIsLooseItem(false);
    setFormIsUnlimitedStock(false);
    setFormMrp('');
    setFormTaxRate(0);
    setFormStock('10');
    setFormMinStock('5');
    setFormBarcode('');
    setFormIsFavorite(false);
    setFormBatchNumber('');
    setFormExpiryDate('');
    setFormSize('');
    setFormColor('');
    setFormImeiSerial('');
    setFormWarrantyMonths('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category_id);
    setFormUnit(p.unit);
    setFormPurchasePrice((p.purchase_price / 100).toString());
    setFormSellingPrice((p.selling_price / 100).toString());
    setFormWholesalePrice(p.wholesale_price ? (p.wholesale_price / 100).toString() : '');
    setFormWholesaleMinQty(p.wholesale_min_qty ? p.wholesale_min_qty.toString() : '5');
    setFormIsLooseItem(Boolean(p.is_loose_item));
    setFormIsUnlimitedStock(Boolean(p.is_unlimited_stock));
    setFormMrp((p.mrp / 100).toString());
    setFormTaxRate(p.tax_rate);
    setFormStock(p.current_stock.toString());
    setFormMinStock(p.min_stock_level.toString());
    setFormBarcode(p.barcode || '');
    setFormIsFavorite(p.is_favorite);
    setFormBatchNumber(p.batch_number || '');
    setFormExpiryDate(p.expiry_date || '');
    setFormSize(p.size || '');
    setFormColor(p.color || '');
    setFormImeiSerial(p.imei_serial || '');
    setFormWarrantyMonths(p.warranty_period_months ? p.warranty_period_months.toString() : '');
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const sellingPaise = parseRupeesToPaise(formSellingPrice);
    const wholesalePaise = formWholesalePrice.trim() ? parseRupeesToPaise(formWholesalePrice) : undefined;
    const wholesaleMinQtyNum = formWholesaleMinQty.trim() ? parseInt(formWholesaleMinQty) : undefined;
    const purchasePaise = parseRupeesToPaise(formPurchasePrice || formSellingPrice);
    const mrpPaise = parseRupeesToPaise(formMrp || formSellingPrice);
    const stockNum = parseFloat(formStock) || 0;
    const minStockNum = parseFloat(formMinStock) || 5;

    const catObj = categories.find((c) => c.id === formCategory);
    const now = new Date().toISOString();

    const productPayload: Omit<Product, 'id'> = {
      business_id: business?.id || 'biz_default',
      name: formName.trim(),
      category_id: formCategory,
      category_name: catObj?.name || 'General',
      unit: formUnit,
      purchase_price: purchasePaise,
      selling_price: sellingPaise,
      wholesale_price: wholesalePaise,
      wholesale_min_qty: wholesaleMinQtyNum,
      is_loose_item: formIsLooseItem,
      allow_decimal: formIsLooseItem || ['kg', 'gram', 'litre', 'ml', 'meter'].includes(formUnit),
      is_unlimited_stock: formIsUnlimitedStock,
      mrp: mrpPaise,
      tax_rate: formTaxRate,
      is_tax_inclusive: true,
      current_stock: formIsUnlimitedStock ? 999999 : stockNum,
      min_stock_level: minStockNum,
      barcode: formBarcode.trim() || undefined,
      batch_number: formBatchNumber.trim() || undefined,
      expiry_date: formExpiryDate.trim() || undefined,
      size: formSize.trim() || undefined,
      color: formColor.trim() || undefined,
      imei_serial: formImeiSerial.trim() || undefined,
      warranty_period_months: formWarrantyMonths.trim() ? parseInt(formWarrantyMonths) : undefined,
      is_favorite: formIsFavorite,
      is_active: true,
      created_at: editingProduct ? editingProduct.created_at : now,
      updated_at: now,
      sync_status: 'pending',
    };

    try {
      if (editingProduct) {
        await db.products.put({
          ...productPayload,
          id: editingProduct.id,
        });
      } else {
        const newId = `prod_${Date.now()}`;
        await db.products.put({
          ...productPayload,
          id: newId,
        });

        // Add initial inventory movement log
        await db.inventory_movements.put({
          id: `mov_${Date.now()}`,
          business_id: business?.id || 'biz_default',
          product_id: newId,
          product_name: formName.trim(),
          movement_type: 'ADJUSTMENT',
          quantity: stockNum,
          previous_stock: 0,
          new_stock: stockNum,
          reason: 'Initial product stock creation',
          created_by: 'owner',
          created_at: now,
        });
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save product:', err);
      alert('Error saving product. Please try again.');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      await db.products.delete(id);
    }
  };

  const handleToggleFavorite = async (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.products.update(p.id, {
      is_favorite: !p.is_favorite,
      updated_at: new Date().toISOString(),
    });
  };

  const handleBarcodeScanned = async (code: string) => {
    setIsScannerOpen(false);
    setFormBarcode(code);

    // If adding a new product, attempt local category offline dictionary lookup (0ms)
    if (!formName) {
      const match = await lookupCategoryBarcode(code, business?.business_type);
      if (match && match.name) {
        setFormName(match.name);
        if (match.selling_price) setFormSellingPrice(match.selling_price.toString());
        if (match.mrp) setFormMrp(match.mrp.toString());
        if (match.tax_rate) setFormTaxRate(match.tax_rate);
        if (match.unit) setFormUnit(match.unit as any);
      }
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newId = `cat_${Date.now()}`;
    await db.categories.put({
      id: newId,
      business_id: business?.id || 'biz_default',
      name: newCatName.trim(),
      created_at: new Date().toISOString(),
    });
    setFormCategory(newId);
    setSelectedCategory(newId);
    setNewCatName('');
    setIsAddCategoryModalOpen(false);
  };

  const estMargin = () => {
    const sp = parseFloat(formSellingPrice);
    const pp = parseFloat(formPurchasePrice);
    if (!sp || !pp || sp <= 0) return null;
    const margin = ((sp - pp) / sp) * 100;
    return margin.toFixed(1);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-800" />
            <span>{t('products.title')}</span>
          </h1>
          <p className="text-xs text-slate-500">
            {t('products.subtitle')} • {allProducts.length} {allProducts.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <CashierPrivacyToggleButton />

          {canInwardBill && (
            <Button
              type="button"
              onClick={() => setIsPurchaseSheetOpen(true)}
              size="sm"
              className="gap-1 sm:gap-1.5 text-xs font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs cursor-pointer border-none px-3 py-2 justify-center whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
              <span>Inward Stock</span>
            </Button>
          )}

          <Button 
            onClick={handleOpenAddModal} 
            size="sm" 
            className="gap-1 sm:gap-1.5 text-xs font-bold px-3 py-2 justify-center whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>{business?.business_type === 'restaurant' ? 'Add Menu Item' : 'Add Product'}</span>
          </Button>
        </div>
      </div>

      {/* ---------------- LIVE INVENTORY METRICS RIBBON (Space-Saving & Unified) ---------------- */}
      <Card className="p-2 sm:p-2.5 bg-white border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* 1. Total Products */}
          <div className="px-2 py-1 sm:py-0 sm:first:pl-1">
            <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>{business?.business_type === 'restaurant' ? 'Menu Items' : 'Total Items'}</span>
              <Package className="w-3 h-3 text-slate-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5 leading-tight">
              {allProducts.length} <span className="text-[11px] font-sans font-medium text-slate-400">SKUs</span>
            </div>
          </div>

          {/* 2. In Stock */}
          <div className="px-2 py-1 sm:py-0">
            <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>In Stock</span>
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-800 font-mono mt-0.5 leading-tight">
              {stockMetrics.inStockCount} <span className="text-[11px] font-sans font-medium text-emerald-600">Active</span>
            </div>
          </div>

          {/* 3. Low / Out of Stock (Interactive Filter Toggle) */}
          <div className="px-2 py-1 sm:py-0 pt-1.5 sm:pt-0">
            <button
              type="button"
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className="w-full text-left cursor-pointer group"
              title="Click to filter low stock items"
            >
              <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Low Stock</span>
                </span>
                {showLowStockOnly && (
                  <span className="text-[9px] bg-amber-200 text-amber-900 px-1 rounded font-black">ACTIVE</span>
                )}
              </div>
              <div className={cn(
                "text-base sm:text-lg font-black font-mono mt-0.5 leading-tight",
                stockMetrics.lowStockCount > 0 ? "text-amber-800" : "text-slate-400"
              )}>
                {stockMetrics.lowStockCount} <span className="text-[11px] font-sans font-medium text-amber-700">Need Reorder</span>
              </div>
            </button>
          </div>

          {/* 4. Stock Valuation */}
          <div className="px-2 py-1 sm:py-0 pt-1.5 sm:pt-0">
            <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Stock Value</span>
              <Tag className="w-3 h-3 text-slate-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5 leading-tight">
              <ProfitMask valuePaise={stockMetrics.totalStockValuePaise} isPurchasePrice />
            </div>
          </div>
        </div>
      </Card>

      {/* Filter & Search Bar — Space Saving */}
      <Card className="p-2.5 sm:p-3 bg-white border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={t('products.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            title="Scan Barcode to Search"
            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-center cursor-pointer shadow-2xs transition flex-shrink-0"
          >
            <Camera className="w-4 h-4 text-slate-800" />
          </button>

          <button
            type="button"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap cursor-pointer shadow-2xs transition flex-shrink-0',
              showLowStockOnly
                ? 'bg-amber-400 border-amber-400 text-slate-950 font-extrabold'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">{t('products.lowStockOnly')}</span>
            <span className="sm:hidden">Low Stock</span>
          </button>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 flex-shrink-0',
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            <span>{t('products.allCategories')}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
              selectedCategory === 'all' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            )}>
              {allProducts.length}
            </span>
          </button>
          {categories.map((cat) => {
            const count = categoryCounts.get(cat.id) || 0;
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all flex-shrink-0',
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                <Tag className="w-3 h-3 text-slate-400" />
                <span>{cat.name}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                  selectedCategory === cat.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                )}>
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsAddCategoryModalOpen(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center gap-1 whitespace-nowrap flex-shrink-0 cursor-pointer transition-colors"
            title="Create New Custom Category"
          >
            <Plus className="w-3.5 h-3.5 text-amber-700" />
            <span>+ Category</span>
          </button>
        </div>
      </Card>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No items found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or add a new product to your inventory catalog.
          </p>
          <Button onClick={handleOpenAddModal} size="md" className="mt-3 text-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>{business?.business_type === 'restaurant' ? '+ Add Menu Item' : t('products.addProduct')}</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
            {visibleProducts.map((p) => {
              const isLowStock = p.current_stock <= p.min_stock_level;
              const isOutOfStock = p.current_stock <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenEditModal(p)}
                  className="bg-white border border-slate-200/90 hover:border-indigo-500 hover:shadow-md hover:ring-1 hover:ring-indigo-400/30 rounded-2xl p-2.5 sm:p-3 cursor-pointer flex flex-col justify-between transition-all group relative text-left"
                >
                  <div>
                    {/* Top Tag & Favorite */}
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1 flex-wrap min-w-0">
                        <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-tight truncate max-w-[90px]">
                          {p.category_name || 'General'}
                        </span>
                        {p.barcode && (
                          <span className="text-[8.5px] bg-slate-100 text-slate-600 font-mono px-1 py-0.5 rounded flex items-center gap-0.5 border border-slate-200 truncate max-w-[75px]">
                            <Barcode className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{p.barcode}</span>
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleToggleFavorite(p, e)}
                        className={`p-1 rounded shrink-0 ${
                          p.is_favorite
                            ? 'text-amber-500'
                            : 'text-slate-300 hover:text-slate-400'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${p.is_favorite ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {/* Product Name */}
                    <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-indigo-950 line-clamp-2 leading-snug transition-colors">
                      {p.name}
                    </h3>

                    {/* Category Attributes (Batch / Exp / Size / IMEI) */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(p.batch_number || p.expiry_date) && (
                        <span className={cn(
                          "text-[8.5px] px-1 py-0.5 rounded font-mono font-medium border flex items-center gap-0.5",
                          p.expiry_date && new Date(p.expiry_date).getTime() < Date.now()
                            ? "bg-rose-50 text-rose-800 border-rose-200 font-bold"
                            : "bg-amber-50 text-amber-900 border-amber-200"
                        )}>
                          {p.batch_number && <span>B:{p.batch_number}</span>}
                          {p.expiry_date && (
                            <span>
                              {p.batch_number ? '•' : ''}Exp:{p.expiry_date.slice(2)}
                            </span>
                          )}
                        </span>
                      )}

                      {(p.size || p.color) && (
                        <span className="text-[8.5px] bg-indigo-50 text-indigo-900 border border-indigo-200 px-1 py-0.5 rounded font-medium">
                          {p.size && <span>Sz:{p.size} </span>}
                          {p.color && <span>• {p.color}</span>}
                        </span>
                      )}

                      {(p.imei_serial || p.warranty_period_months) && (
                        <span className="text-[8.5px] bg-cyan-50 text-cyan-900 border border-cyan-200 px-1 py-0.5 rounded font-mono">
                          {p.imei_serial && <span>SN:{p.imei_serial} </span>}
                          {p.warranty_period_months && <span>• {p.warranty_period_months}M</span>}
                        </span>
                      )}
                    </div>

                    {/* Pricing Matrix */}
                    <div className="flex flex-wrap items-baseline gap-1.5 mt-2">
                      <span className="text-sm sm:text-base font-black text-indigo-950 font-mono">
                        {formatINR(p.selling_price)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">/{p.unit}</span>
                      {p.mrp > p.selling_price && (
                        <span className="text-[10px] text-slate-400 line-through font-mono">
                          {formatINR(p.mrp)}
                        </span>
                      )}
                    </div>

                    {p.wholesale_price && (
                      <div className="text-[8.5px] text-indigo-800 font-bold bg-indigo-50/90 px-1.5 py-0.5 rounded border border-indigo-200 mt-1 inline-block truncate max-w-full">
                        Thok: {formatINR(p.wholesale_price)} (Min {p.wholesale_min_qty || 5})
                      </div>
                    )}
                  </div>

                  {/* Stock Footer */}
                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      {isOutOfStock ? (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] font-bold">
                          {t('products.outOfStock')}
                        </span>
                      ) : isLowStock ? (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-bold flex items-center gap-1 border border-amber-300">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                          <span>{p.current_stock} left</span>
                        </span>
                      ) : (
                        <span className="font-bold text-slate-700 text-[10px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>{p.current_stock} {p.unit}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(p.id, p.name);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Pagination */}
          {visibleProducts.length < filteredProducts.length && (
            <div className="text-center py-4">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setDisplayLimit((prev) => prev + 36)}
                className="bg-white hover:bg-slate-50 border-slate-300 text-slate-800 font-bold text-xs shadow-xs px-6 py-2"
              >
                Showing {visibleProducts.length} of {filteredProducts.length} Products • Load More (+36)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? t('products.editProduct') : t('products.addProduct')}
        description="Enter product details, pricing, GST rate and initial inventory stock."
        size="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <Input
            label={t('products.name')}
            placeholder="e.g. Parle-G Gold Biscuits 100g"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-900 block">
                  {t('products.category')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(true)}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Category</span>
                </button>
              </div>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs font-semibold focus:border-slate-900 focus:outline-none min-h-[38px]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-900 block">
                  {t('products.unit')}
                </label>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  {storeProfile.shortName} Recommended
                </span>
              </div>
              <select
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value as ProductUnit)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs font-semibold focus:border-slate-900 focus:outline-none min-h-[38px]"
              >
                <optgroup label={`✨ Recommended for ${storeProfile.name}`}>
                  {MASTER_UNITS.filter(u => storeProfile.recommendedUnits.includes(u.id)).map(u => (
                    <option key={`rec_${u.id}`} value={u.id}>
                      {u.labelEn} • {u.labelHi}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="📋 All Supported Units">
                  {MASTER_UNITS.filter(u => !storeProfile.recommendedUnits.includes(u.id)).map(u => (
                    <option key={`all_${u.id}`} value={u.id}>
                      {u.labelEn} • {u.labelHi}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Dynamic Niche Attribute 1: Batch & Expiry (Pharmacy / FMCG) */}
          {storeProfile.featureToggles.showBatchExpiry && (
            <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💊</span>
                  <span>Batch Number &amp; Expiry Date (Pharmacy / Medical)</span>
                </span>
                <span className="text-[10px] text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded font-semibold">
                  Required for Compliance
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Batch Number"
                  placeholder="e.g. BATCH-9942"
                  value={formBatchNumber}
                  onChange={(e) => setFormBatchNumber(e.target.value)}
                />
                <Input
                  label="Expiry Date"
                  type="date"
                  value={formExpiryDate}
                  onChange={(e) => setFormExpiryDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Dynamic Niche Attribute 2: Size & Color Variants (Clothing / Footwear) */}
          {storeProfile.featureToggles.showSizeVariants && (
            <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <span>👕</span>
                  <span>Size &amp; Color Variants (Apparel / Footwear)</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Size / Fit (e.g. S, M, L, XL, 32, 34, 8 UK)"
                  placeholder="e.g. XL or 32"
                  value={formSize}
                  onChange={(e) => setFormSize(e.target.value)}
                />
                <Input
                  label="Color / Shade"
                  placeholder="e.g. Navy Blue / Olive"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Dynamic Niche Attribute 3: Serial / IMEI & Warranty (Electronics / Mobile) */}
          {storeProfile.featureToggles.showImeiWarranty && (
            <div className="p-3.5 bg-cyan-50/70 rounded-xl border border-cyan-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-950 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📱</span>
                  <span>IMEI / Serial No &amp; Warranty (Electronics / Mobile)</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="IMEI / Serial Number"
                  placeholder="e.g. 864209048123456"
                  value={formImeiSerial}
                  onChange={(e) => setFormImeiSerial(e.target.value)}
                />
                <Input
                  label="Warranty Period (Months)"
                  placeholder="e.g. 12"
                  type="number"
                  value={formWarrantyMonths}
                  onChange={(e) => setFormWarrantyMonths(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Pricing Row */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Price & Margin Settings
              </span>
              {estMargin() && (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                  Margin: ~{estMargin()}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label={t('products.sellingPrice')}
                placeholder="0.00"
                type="number"
                step="0.01"
                value={formSellingPrice}
                onChange={(e) => setFormSellingPrice(e.target.value)}
                leftIcon={<span className="text-xs font-bold text-slate-500">₹</span>}
                required
              />

              <Input
                label={t('products.purchasePrice')}
                placeholder="0.00"
                type="number"
                step="0.01"
                value={formPurchasePrice}
                onChange={(e) => setFormPurchasePrice(e.target.value)}
                leftIcon={<span className="text-xs font-bold text-slate-500">₹</span>}
              />

              <Input
                label={t('products.mrp')}
                placeholder="0.00"
                type="number"
                step="0.01"
                value={formMrp}
                onChange={(e) => setFormMrp(e.target.value)}
                leftIcon={<span className="text-xs font-bold text-slate-500">₹</span>}
              />
            </div>

            {/* Wholesale Pricing Tier (Thok Bhav) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <Input
                label="Wholesale Price (Thok Rate ₹)"
                placeholder="Optional bulk rate (e.g. 45.00)"
                type="number"
                step="0.01"
                value={formWholesalePrice}
                onChange={(e) => setFormWholesalePrice(e.target.value)}
                leftIcon={<span className="text-xs font-bold text-amber-600">₹</span>}
              />

              <Input
                label="Min Wholesale Qty (Auto-discount threshold)"
                placeholder="e.g. 5 or 10"
                type="number"
                value={formWholesaleMinQty}
                onChange={(e) => setFormWholesaleMinQty(e.target.value)}
              />
            </div>

            {/* GST Rate Options */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('products.taxRate')}
              </label>
              <div className="flex items-center gap-2">
                {[0, 5, 12, 18, 28].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setFormTaxRate(rate)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold ${
                      formTaxRate === rate
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stock & Barcode Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label={t('products.currentStock')}
              placeholder="10"
              type="number"
              value={formStock}
              onChange={(e) => setFormStock(e.target.value)}
            />

            <Input
              label={t('products.minStock')}
              placeholder="5"
              type="number"
              value={formMinStock}
              onChange={(e) => setFormMinStock(e.target.value)}
              helperText="Alerts when stock is at or below this"
            />

            <div>
              <Input
                label={t('products.barcode')}
                placeholder="Scan or type barcode"
                value={formBarcode}
                onChange={(e) => setFormBarcode(e.target.value)}
                leftIcon={<Barcode className="w-4 h-4 text-slate-400" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="text-slate-700 hover:text-slate-900 p-1"
                    title="Scan Barcode via Camera"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                }
              />
            </div>
          </div>

          {/* Kirana Loose & Unlimited Stock Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsLooseItem}
                onChange={(e) => setFormIsLooseItem(e.target.checked)}
                className="mt-0.5 rounded text-slate-900 focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-900 block">⚖️ Loose Item / Sold by Weight</span>
                <span className="text-[10px] text-slate-500 block">
                  Allows custom fractional weights (e.g. 50g, 250g, 0.5 kg) in billing.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsUnlimitedStock}
                onChange={(e) => setFormIsUnlimitedStock(e.target.checked)}
                className="mt-0.5 rounded text-slate-900 focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-900 block">♾️ Unlimited / Untracked Stock</span>
                <span className="text-[10px] text-slate-500 block">
                  Bypasses stock limits for items where counting is difficult or open.
                </span>
              </div>
            </label>
          </div>

          {/* Pin to favorites */}
          <div
            onClick={() => setFormIsFavorite(!formIsFavorite)}
            className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50"
          >
            <Star className={`w-4 h-4 ${formIsFavorite ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
            <div>
              <div className="text-xs font-bold text-slate-900">
                {t('products.isFavorite')}
              </div>
              <div className="text-[10px] text-slate-500">
                Quickly accessible on the main billing POS screen
              </div>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="sm">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              <span>{t('products.saveProduct')}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rapid Barcode Inward Intake Modal */}
      <RapidBarcodeInwardModal
        isOpen={isRapidInwardOpen}
        onClose={() => setIsRapidInwardOpen(false)}
      />

      {/* Add New Category Modal */}
      <Modal
        isOpen={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        title="Add New Category"
        description="Create a custom product category for your store."
        size="sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. Dairy & Ice Cream, Skin Care, T-Shirts..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            required
            autoFocus
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-slate-900 text-white font-bold">
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Create Category</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Excel / CSV Inventory Importer Modal */}
      <ExcelInventoryImporter
        isOpen={isExcelImporterOpen}
        onClose={() => setIsExcelImporterOpen(false)}
        businessId={business?.id || 'biz_default'}
      />

      {/* 5-Way Inward Bottom Sheet (AI OCR / PDF / CSV / Continuous Barcode / Manual) */}
      <PurchaseInwardOptionsSheet
        isOpen={isPurchaseSheetOpen}
        onClose={() => setIsPurchaseSheetOpen(false)}
        businessType={business?.business_type}
        businessId={business?.id}
        existingProducts={allProducts}
        onManualInwardClick={handleOpenAddModal}
        onRapidBarcodeClick={() => setIsRapidInwardOpen(true)}
        onScanSuccess={(_billId, updated, created) => {
          alert(`🎉 Stock inward complete! ${updated} items restocked, ${created} new products created.`);
        }}
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
