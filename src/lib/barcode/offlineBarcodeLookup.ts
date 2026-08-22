'use client';

import { db } from '@/lib/db';
import { Product, BusinessType } from '@/types';
import { lookupCategoryBarcode, CategoryBarcodeItem } from './categoryBarcodeLoader';

export interface HybridScanResult {
  product?: Product;
  categoryItem?: CategoryBarcodeItem;
  source: 'dexie' | 'category_json' | 'unknown';
}

/**
 * Hybrid Barcode Scanning Logic:
 * Step A: Query local Dexie.js products table first for lightning-fast retrieval (0ms).
 * Step B: If not in Dexie, instantly search the loaded category-specific JSON dictionary (0ms).
 * Step C: If completely unknown, return null without errors or slow network calls.
 */
export async function performHybridBarcodeScan(
  barcode: string,
  businessId: string,
  businessType?: BusinessType | string
): Promise<HybridScanResult> {
  if (!barcode) {
    return { source: 'unknown' };
  }

  const clean = barcode.trim();
  if (clean.length < 3) {
    return { source: 'unknown' };
  }

  // -------------------------------------------------------------
  // STEP A: Search local Dexie.js indexed database (Store inventory)
  // -------------------------------------------------------------
  let localProduct = await db.products
    .where('barcode')
    .equals(clean)
    .first();

  if (!localProduct && businessId) {
    localProduct = await db.products
      .where('business_id')
      .equals(businessId)
      .and((p) => p.barcode === clean)
      .first();
  }

  if (localProduct) {
    return {
      product: localProduct,
      source: 'dexie',
    };
  }

  // -------------------------------------------------------------
  // STEP B: Search loaded category-specific JSON dictionary
  // -------------------------------------------------------------
  const categoryItem = await lookupCategoryBarcode(clean, businessType);
  if (categoryItem) {
    return {
      categoryItem,
      source: 'category_json',
    };
  }

  // -------------------------------------------------------------
  // STEP C: Unknown Barcode -> Trigger Quick Add Auto-Learning
  // -------------------------------------------------------------
  return {
    source: 'unknown',
  };
}

/**
 * Auto-creates a new product in the local merchant's Dexie DB from the category dictionary item
 */
export async function autoCreateProductFromCategoryItem(
  item: CategoryBarcodeItem,
  businessId: string,
  stockQuantity = 20
): Promise<Product> {
  const sellingPricePaise = Math.round(item.selling_price * 100);
  const mrpPaise = Math.round(item.mrp * 100);
  const purchasePricePaise = Math.round(sellingPricePaise * 0.85); // Default ~15% margin
  const now = new Date().toISOString();

  const newProduct: Product = {
    id: `prod_cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    business_id: businessId || 'biz_default',
    name: item.name,
    barcode: item.barcode,
    category_id: `cat_${item.category.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    category_name: item.category,
    selling_price: sellingPricePaise,
    mrp: mrpPaise,
    purchase_price: purchasePricePaise,
    current_stock: stockQuantity,
    min_stock_level: 5,
    unit: (item.unit as any) || 'piece',
    tax_rate: item.tax_rate || 0,
    is_tax_inclusive: true,
    hsn_code: item.hsn || '1905',
    is_favorite: false,
    is_active: true,
    created_at: now,
    updated_at: now,
    sync_status: 'synced',
  };

  await db.products.put(newProduct);
  return newProduct;
}

/**
 * Backward compatibility alias
 */
export const findProductOrOfflineMaster = async (barcode: string, businessId: string, businessType?: string) => {
  const result = await performHybridBarcodeScan(barcode, businessId, businessType);
  if (result.source === 'dexie' && result.product) {
    return { product: result.product, isFromMaster: false };
  }
  if (result.source === 'category_json' && result.categoryItem) {
    return { masterItem: result.categoryItem, isFromMaster: true };
  }
  return null;
};

export const autoCreateProductFromMaster = autoCreateProductFromCategoryItem;
