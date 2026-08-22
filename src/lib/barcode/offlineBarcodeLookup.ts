import { OFFLINE_FMCG_CATALOG, OfflineFMCGItem } from './offlineFMCGDatabase';
import { db } from '@/lib/db';
import { Product } from '@/types';

/**
 * Searches the bundled offline master catalog for a scanned barcode
 */
export function lookupOfflineBarcode(barcode: string): OfflineFMCGItem | null {
  if (!barcode) return null;
  const clean = barcode.trim();
  return OFFLINE_FMCG_CATALOG.find((item) => item.barcode === clean) || null;
}

/**
 * Checks local merchant Dexie inventory first; if not found, falls back to offline master catalog
 */
export async function findProductOrOfflineMaster(
  barcode: string,
  businessId: string
): Promise<{ product?: Product; masterItem?: OfflineFMCGItem; isFromMaster: boolean } | null> {
  if (!barcode) return null;
  const clean = barcode.trim();

  // 1. Search Merchant's local Dexie database
  const localProduct = await db.products
    .where('business_id')
    .equals(businessId)
    .and((p) => p.barcode === clean)
    .first();

  if (localProduct) {
    return { product: localProduct, isFromMaster: false };
  }

  // 2. Fallback to Bundled Offline Master Catalog (Zero latency, 100% offline)
  const master = lookupOfflineBarcode(clean);
  if (master) {
    return { masterItem: master, isFromMaster: true };
  }

  return null;
}

/**
 * Auto-creates a new product in the local merchant's Dexie DB from the master catalog
 */
export async function autoCreateProductFromMaster(
  master: OfflineFMCGItem,
  businessId: string,
  stockQuantity = 10
): Promise<Product> {
  const sellingPricePaise = Math.round(master.selling_price * 100);
  const mrpPaise = Math.round(master.mrp * 100);
  const purchasePricePaise = Math.round(sellingPricePaise * 0.85); // Default ~15% margin

  const newProduct: Product = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    business_id: businessId,
    name: master.name,
    barcode: master.barcode,
    category_id: `cat_${master.category.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    category_name: master.category,
    selling_price: sellingPricePaise,
    mrp: mrpPaise,
    purchase_price: purchasePricePaise,
    current_stock: stockQuantity,
    min_stock_level: 5,
    unit: (master.unit as any) || 'packet',
    tax_rate: master.tax_rate,
    is_tax_inclusive: true,
    hsn_code: master.hsn || '1905',
    is_favorite: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sync_status: 'synced',
  };

  await db.products.add(newProduct);
  return newProduct;
}
