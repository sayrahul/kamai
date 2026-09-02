'use client';

import React from 'react';
import { 
  Plus, 
  Edit3, 
  Barcode, 
  Tag, 
  Sparkles, 
  Scale, 
  Pill, 
  Trash2, 
  Building2 
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Product, Category, ProductUnit, BusinessType } from '@/types';
import { MASTER_UNITS } from '@/lib/constants/storeProfiles';

interface AddEditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  categories: Category[];
  businessType?: BusinessType;
  formName: string;
  setFormName: (val: string) => void;
  formCategory: string;
  setFormCategory: (val: string) => void;
  formUnit: ProductUnit;
  setFormUnit: (val: ProductUnit) => void;
  formPurchasePrice: string;
  setFormPurchasePrice: (val: string) => void;
  formSellingPrice: string;
  setFormSellingPrice: (val: string) => void;
  formIsLooseItem: boolean;
  setFormIsLooseItem: (val: boolean) => void;
  formIsUnlimitedStock: boolean;
  setFormIsUnlimitedStock: (val: boolean) => void;
  formMrp: string;
  setFormMrp: (val: string) => void;
  formTaxRate: number;
  setFormTaxRate: (val: number) => void;
  formStock: string;
  setFormStock: (val: string) => void;
  formMinStock: string;
  setFormMinStock: (val: string) => void;
  formBarcode: string;
  setFormBarcode: (val: string) => void;
  formBatchNumber: string;
  setFormBatchNumber: (val: string) => void;
  formExpiryDate: string;
  setFormExpiryDate: (val: string) => void;
  formSize: string;
  setFormSize: (val: string) => void;
  formColor: string;
  setFormColor: (val: string) => void;
  onOpenScanner: () => void;
  onOpenAddCategoryModal: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onDeleteProduct?: (id: string, name: string) => Promise<void>;
}

export const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  isOpen,
  onClose,
  editingProduct,
  categories,
  businessType,
  formName,
  setFormName,
  formCategory,
  setFormCategory,
  formUnit,
  setFormUnit,
  formPurchasePrice,
  setFormPurchasePrice,
  formSellingPrice,
  setFormSellingPrice,
  formIsLooseItem,
  setFormIsLooseItem,
  formIsUnlimitedStock,
  setFormIsUnlimitedStock,
  formMrp,
  setFormMrp,
  formTaxRate,
  setFormTaxRate,
  formStock,
  setFormStock,
  formMinStock,
  setFormMinStock,
  formBarcode,
  setFormBarcode,
  formBatchNumber,
  setFormBatchNumber,
  formExpiryDate,
  setFormExpiryDate,
  formSize,
  setFormSize,
  formColor,
  setFormColor,
  onOpenScanner,
  onOpenAddCategoryModal,
  onSubmit,
  onDeleteProduct,
}) => {
  const isPharmacy = businessType === 'pharmacy';
  const isClothing = businessType === 'clothing';
  const isRestaurant = businessType === 'restaurant';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {editingProduct ? <Edit3 className="w-5 h-5 text-sky-500" /> : <Plus className="w-5 h-5 text-sky-500" />}
          <span>{editingProduct ? `Edit Item: ${editingProduct.name}` : 'Add New Item to Catalog'}</span>
        </div>
      }
      description={editingProduct ? "Update pricing, barcode, inventory levels, and niche compliance." : "Enter product details, barcode, selling price, and initial stock."}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-3.5">
        {/* Product Name */}
        <Input
          label={isRestaurant ? "Menu Item / Dish Name *" : "Product / Item Full Name *"}
          placeholder={isRestaurant ? "e.g. Masala Dosa (Special)" : "e.g. Fortune Sunflower Oil 1L"}
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          required
          autoFocus
        />

        {/* Category & Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Category
              </label>
              <button
                type="button"
                onClick={onOpenAddCategoryModal}
                className="text-[11px] font-bold text-sky-600 hover:underline cursor-pointer"
              >
                + New Category
              </button>
            </div>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">General Products</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Measurement Unit
            </label>
            <select
              value={formUnit}
              onChange={(e) => setFormUnit(e.target.value as ProductUnit)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {MASTER_UNITS.map((u) => (
                <option key={u.id} value={u.id}>{u.labelEn}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing: Selling Price, MRP, Purchase Price */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
          <div className="text-xs font-black text-slate-800 dark:text-slate-200">
            Pricing &amp; Profit Margins
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Selling Price (₹) *"
              placeholder="e.g. 150.00"
              type="number"
              step="0.01"
              value={formSellingPrice}
              onChange={(e) => setFormSellingPrice(e.target.value)}
              required
            />
            <Input
              label="MRP Maximum Retail (₹)"
              placeholder="e.g. 165.00"
              type="number"
              step="0.01"
              value={formMrp}
              onChange={(e) => setFormMrp(e.target.value)}
            />
            <Input
              label="Purchase / Cost Price (₹)"
              placeholder="e.g. 120.00"
              type="number"
              step="0.01"
              value={formPurchasePrice}
              onChange={(e) => setFormPurchasePrice(e.target.value)}
            />
          </div>
        </div>

        {/* Barcode & GST Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Barcode / EAN-13
              </label>
              <button
                type="button"
                onClick={onOpenScanner}
                className="text-[11px] font-bold text-sky-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Barcode className="w-3 h-3" />
                <span>Scan Camera</span>
              </button>
            </div>
            <Input
              placeholder="e.g. 8901030383748"
              value={formBarcode}
              onChange={(e) => setFormBarcode(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              GST Tax Rate (%)
            </label>
            <select
              value={formTaxRate}
              onChange={(e) => setFormTaxRate(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value={0}>0% (Exempt / Nil Rated)</option>
              <option value={5}>5% (Essential Goods)</option>
              <option value={12}>12% (Standard FMCG / Apparel)</option>
              <option value={18}>18% (General Retail / Hardware)</option>
              <option value={28}>28% (Luxury / Electronics)</option>
            </select>
          </div>
        </div>

        {/* Stock & Minimum Alert */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Current Available Stock"
            placeholder="e.g. 50"
            type="number"
            value={formStock}
            onChange={(e) => setFormStock(e.target.value)}
            disabled={formIsUnlimitedStock}
          />
          <Input
            label="Low Stock Warning Threshold"
            placeholder="e.g. 5"
            type="number"
            value={formMinStock}
            onChange={(e) => setFormMinStock(e.target.value)}
          />
        </div>

        {/* Niche Specific Fields: Pharmacy Batch & Expiry */}
        {(isPharmacy || formBatchNumber || formExpiryDate) && (
          <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800 space-y-2">
            <div className="text-xs font-black text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-teal-600" />
              <span>Pharmacy Batch &amp; Expiry Radar</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Batch Number"
                placeholder="e.g. BATCH-8819"
                value={formBatchNumber}
                onChange={(e) => setFormBatchNumber(e.target.value)}
              />
              <Input
                label="Expiry Date (MM/YYYY or DD-MM-YYYY)"
                placeholder="e.g. 12/2027"
                value={formExpiryDate}
                onChange={(e) => setFormExpiryDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Niche Specific Fields: Clothing Size & Color */}
        {(isClothing || formSize || formColor) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Size / Dimensions"
              placeholder="e.g. XL or 32 or Free Size"
              value={formSize}
              onChange={(e) => setFormSize(e.target.value)}
            />
            <Input
              label="Color / Shade"
              placeholder="e.g. Navy Blue / Maroon"
              value={formColor}
              onChange={(e) => setFormColor(e.target.value)}
            />
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          {editingProduct && onDeleteProduct ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => onDeleteProduct(editingProduct.id, editingProduct.name)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs rounded-xl cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Delete</span>
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" className="font-black bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 rounded-xl">
              {editingProduct ? 'Update Product' : 'Save Product'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
