'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { Product, Category, ProductUnit } from '@/types';
import { formatINR, parseRupeesToPaise, cn } from '@/lib/utils';
import { lookupPublicBarcode } from '@/lib/api/publicBarcodeLookup';
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
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { BarcodeScannerModal } from '@/components/barcode/BarcodeScannerModal';

export default function ProductsPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnit, setFormUnit] = useState<ProductUnit>('packet');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formMrp, setFormMrp] = useState('');
  const [formTaxRate, setFormTaxRate] = useState<number>(0);
  const [formStock, setFormStock] = useState('');
  const [formMinStock, setFormMinStock] = useState('5');
  const [formBarcode, setFormBarcode] = useState('');
  const [formIsFavorite, setFormIsFavorite] = useState(false);

  // Live queries
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const categories = useLiveQuery(async () => db.categories.toArray()) || [];
  const products = useLiveQuery(async () => {
    let collection = db.products.toCollection();
    let prods = await collection.toArray();

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
      prods = prods.filter((p) => p.current_stock <= p.min_stock_level);
    }

    return prods;
  }, [searchQuery, selectedCategory, showLowStockOnly]) || [];

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(categories[0]?.id || '');
    setFormUnit('packet');
    setFormPurchasePrice('');
    setFormSellingPrice('');
    setFormMrp('');
    setFormTaxRate(0);
    setFormStock('10');
    setFormMinStock('5');
    setFormBarcode('');
    setFormIsFavorite(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category_id);
    setFormUnit(p.unit);
    setFormPurchasePrice((p.purchase_price / 100).toString());
    setFormSellingPrice((p.selling_price / 100).toString());
    setFormMrp((p.mrp / 100).toString());
    setFormTaxRate(p.tax_rate);
    setFormStock(p.current_stock.toString());
    setFormMinStock(p.min_stock_level.toString());
    setFormBarcode(p.barcode || '');
    setFormIsFavorite(p.is_favorite);
    setIsModalOpen(true);
  };

  const handleBarcodeScanned = async (code: string) => {
    setIsScannerOpen(false);
    if (isModalOpen) {
      // In add/edit modal: fill barcode and auto-lookup name if empty
      setFormBarcode(code);
      if (!formName.trim()) {
        const publicInfo = await lookupPublicBarcode(code);
        if (publicInfo?.name) {
          setFormName(publicInfo.name);
        }
      }
    } else {
      // In main search: filter by barcode or prompt to add
      setSearchQuery(code);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSellingPrice) {
      alert('Please fill in product name and selling price.');
      return;
    }

    const businessId = business?.id || 'biz_default';
    const now = new Date().toISOString();
    const sellingPaise = parseRupeesToPaise(formSellingPrice);
    const purchasePaise = formPurchasePrice ? parseRupeesToPaise(formPurchasePrice) : Math.round(sellingPaise * 0.85);
    const mrpPaise = formMrp ? parseRupeesToPaise(formMrp) : sellingPaise;
    const catObj = categories.find((c) => c.id === formCategory);
    const stockQty = parseFloat(formStock) || 0;
    const minStockQty = parseFloat(formMinStock) || 0;

    if (editingProduct) {
      // Update
      await db.products.update(editingProduct.id, {
        name: formName.trim(),
        category_id: formCategory,
        category_name: catObj?.name || 'General',
        unit: formUnit,
        purchase_price: purchasePaise,
        selling_price: sellingPaise,
        mrp: mrpPaise,
        tax_rate: formTaxRate,
        current_stock: stockQty,
        min_stock_level: minStockQty,
        barcode: formBarcode.trim() || undefined,
        is_favorite: formIsFavorite,
        updated_at: now,
      });
    } else {
      // Create new
      const newId = `prod_${Date.now()}`;
      await db.products.put({
        id: newId,
        business_id: businessId,
        name: formName.trim(),
        category_id: formCategory || 'cat_general',
        category_name: catObj?.name || 'General',
        unit: formUnit,
        purchase_price: purchasePaise,
        selling_price: sellingPaise,
        mrp: mrpPaise,
        tax_rate: formTaxRate,
        is_tax_inclusive: true,
        current_stock: stockQty,
        min_stock_level: minStockQty,
        barcode: formBarcode.trim() || undefined,
        is_favorite: formIsFavorite,
        is_active: true,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      });

      // Record initial inventory movement
      await db.inventory_movements.put({
        id: `mov_${Date.now()}`,
        business_id: businessId,
        product_id: newId,
        product_name: formName.trim(),
        movement_type: 'ADJUSTMENT',
        quantity: stockQty,
        previous_stock: 0,
        new_stock: stockQty,
        reason: 'New Product Opening Stock',
        created_by: 'owner',
        created_at: now,
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to deactivate/delete "${name}"?`)) {
      await db.products.delete(id);
    }
  };

  const handleToggleFavorite = async (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.products.update(p.id, { is_favorite: !p.is_favorite });
  };

  const estMargin = () => {
    const sell = parseFloat(formSellingPrice) || 0;
    const cost = parseFloat(formPurchasePrice) || 0;
    if (sell <= 0 || cost <= 0) return null;
    return (((sell - cost) / sell) * 100).toFixed(1);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header with Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-vyapar-500" />
            <span>{t('products.title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t('products.subtitle')} • {products.length} {products.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleOpenAddModal} size="md" className="gap-2">
            <Plus className="w-4 h-4" />
            <span>{t('products.addProduct')}</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full flex-1 flex items-center gap-2">
            <Input
              placeholder={t('products.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => setIsScannerOpen(true)}
              title="Scan Barcode to Search"
              className="border border-slate-200 dark:border-slate-700"
            >
              <Camera className="w-4 h-4 text-vyapar-500" />
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap',
                showLowStockOnly
                  ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>{t('products.lowStockOnly')}</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            )}
          >
            {t('products.allCategories')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1',
                selectedCategory === cat.id
                  ? 'bg-vyapar-500 text-white shadow-sm shadow-vyapar-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              )}
            >
              <Tag className="w-3 h-3 opacity-60" />
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No items found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or add a new product to your inventory catalog.
          </p>
          <Button onClick={handleOpenAddModal} size="md" className="mt-4">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>{t('products.addProduct')}</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {products.map((p) => {
            const isLowStock = p.current_stock <= p.min_stock_level;
            const isOutOfStock = p.current_stock <= 0;

            return (
              <div
                key={p.id}
                onClick={() => handleOpenEditModal(p)}
                className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-vyapar-300 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-400 uppercase">
                          {p.category_name || 'General'}
                        </span>
                        {p.barcode && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Barcode className="w-2.5 h-2.5" />
                            {p.barcode}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-vyapar-600 transition-colors line-clamp-2 mt-0.5">
                        {p.name}
                      </h3>
                    </div>

                    <button
                      onClick={(e) => handleToggleFavorite(p, e)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        p.is_favorite
                          ? 'text-amber-400 hover:text-amber-500'
                          : 'text-slate-300 hover:text-slate-400'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${p.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                      {formatINR(p.selling_price)}
                    </span>
                    <span className="text-xs text-slate-400">/{p.unit}</span>
                    {p.mrp > p.selling_price && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatINR(p.mrp)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock Footer */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {isOutOfStock ? (
                      <Badge variant="danger" size="sm">
                        {t('products.outOfStock')}
                      </Badge>
                    ) : isLowStock ? (
                      <Badge variant="warning" size="sm">
                        <AlertTriangle className="w-3 h-3 mr-0.5" />
                        {p.current_stock} {p.unit} ({t('products.lowStock')})
                      </Badge>
                    ) : (
                      <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {p.current_stock} {p.unit} left
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(p.id, p.name);
                      }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-1.5">
                {t('products.category')}
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-vyapar-500 focus:outline-none min-h-[44px]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-1.5">
                {t('products.unit')}
              </label>
              <select
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value as ProductUnit)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-vyapar-500 focus:outline-none min-h-[44px]"
              >
                <option value="packet">Packet (पैकेट)</option>
                <option value="piece">Piece (नग / पीस)</option>
                <option value="kg">Kilogram (किलो)</option>
                <option value="gram">Gram (ग्राम)</option>
                <option value="litre">Litre (लीटर)</option>
                <option value="ml">Millilitre (मिली)</option>
                <option value="box">Box (डिब्बा / पेटी)</option>
                <option value="dozen">Dozen (दर्जन)</option>
                <option value="meter">Meter (मीटर)</option>
                <option value="custom">Custom Unit</option>
              </select>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Price & Margin Settings
              </span>
              {estMargin() && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
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
                leftIcon={<span className="text-xs font-bold text-slate-400">₹</span>}
                required
              />

              <Input
                label={t('products.purchasePrice')}
                placeholder="0.00"
                type="number"
                step="0.01"
                value={formPurchasePrice}
                onChange={(e) => setFormPurchasePrice(e.target.value)}
                leftIcon={<span className="text-xs font-bold text-slate-400">₹</span>}
              />

              <Input
                label={t('products.mrp')}
                placeholder="0.00"
                type="number"
                step="0.01"
                value={formMrp}
                onChange={(e) => setFormMrp(e.target.value)}
                leftIcon={<span className="text-xs font-bold text-slate-400">₹</span>}
              />
            </div>

            {/* GST Rate Options */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {t('products.taxRate')}
              </label>
              <div className="flex items-center gap-2">
                {[0, 5, 12, 18, 28].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setFormTaxRate(rate)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      formTaxRate === rate
                        ? 'bg-vyapar-500 border-vyapar-500 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
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
                    className="text-vyapar-500 hover:text-vyapar-600 p-1"
                    title="Scan Barcode via Camera"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                }
              />
            </div>
          </div>

          {/* Pin to favorites */}
          <div
            onClick={() => setFormIsFavorite(!formIsFavorite)}
            className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Star className={`w-5 h-5 ${formIsFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t('products.isFavorite')}
              </div>
              <div className="text-[10px] text-slate-400">
                Quickly accessible on the main billing POS screen
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="md">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>{t('products.saveProduct')}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
