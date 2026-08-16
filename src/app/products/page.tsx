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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const sellingPaise = parseRupeesToPaise(formSellingPrice);
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
      mrp: mrpPaise,
      tax_rate: formTaxRate,
      is_tax_inclusive: true,
      current_stock: stockNum,
      min_stock_level: minStockNum,
      barcode: formBarcode.trim() || undefined,
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

    // If adding a new product, attempt open public lookup
    if (!formName) {
      const info = await lookupPublicBarcode(code);
      if (info && info.name) {
        setFormName(info.name);
      }
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-800" />
            <span>{t('products.title')}</span>
          </h1>
          <p className="text-xs text-slate-500">
            {t('products.subtitle')} • {products.length} {products.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleOpenAddModal} size="md" className="gap-2 text-xs font-bold">
            <Plus className="w-4 h-4" />
            <span>{t('products.addProduct')}</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full flex-1 flex items-center gap-2">
            <Input
              placeholder={t('products.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              title="Scan Barcode to Search"
              className="p-2 min-h-[38px] min-w-[38px] rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-center"
            >
              <Camera className="w-4 h-4 text-slate-800" />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold whitespace-nowrap',
                showLowStockOnly
                  ? 'bg-amber-400 border-amber-400 text-slate-950 font-extrabold'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{t('products.lowStockOnly')}</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap',
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            {t('products.allCategories')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1',
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              <Tag className="w-3 h-3 text-slate-400" />
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
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
            <span>{t('products.addProduct')}</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p) => {
            const isLowStock = p.current_stock <= p.min_stock_level;
            const isOutOfStock = p.current_stock <= 0;

            return (
              <div
                key={p.id}
                onClick={() => handleOpenEditModal(p)}
                className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-4 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">
                          {p.category_name || 'General'}
                        </span>
                        {p.barcode && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-slate-200">
                            <Barcode className="w-2.5 h-2.5" />
                            {p.barcode}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mt-0.5">
                        {p.name}
                      </h3>
                    </div>

                    <button
                      onClick={(e) => handleToggleFavorite(p, e)}
                      className={`p-1 rounded ${
                        p.is_favorite
                          ? 'text-amber-500'
                          : 'text-slate-300 hover:text-slate-400'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${p.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-base font-extrabold text-slate-900 font-mono">
                      {formatINR(p.selling_price)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/{p.unit}</span>
                    {p.mrp > p.selling_price && (
                      <span className="text-xs text-slate-400 line-through font-mono">
                        {formatINR(p.mrp)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock Footer */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {isOutOfStock ? (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                        {t('products.outOfStock')}
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center gap-1 border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-700" />
                        <span>{p.current_stock} {p.unit} left</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        <span>{p.current_stock} {p.unit}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(p.id, p.name);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">
                {t('products.category')}
              </label>
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
              <label className="text-xs font-bold text-slate-900 block mb-1">
                {t('products.unit')}
              </label>
              <select
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value as ProductUnit)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs font-semibold focus:border-slate-900 focus:outline-none min-h-[38px]"
              >
                <option value="packet">Packet (pkt)</option>
                <option value="piece">Piece (pc)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="gram">Gram (gm)</option>
                <option value="litre">Litre (ltr)</option>
                <option value="ml">Millilitre (ml)</option>
                <option value="box">Box (box)</option>
                <option value="dozen">Dozen (dz)</option>
                <option value="meter">Meter (m)</option>
                <option value="custom">Custom Unit</option>
              </select>
            </div>
          </div>

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
    </div>
  );
}
