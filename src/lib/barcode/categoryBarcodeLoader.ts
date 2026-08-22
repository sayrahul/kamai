'use client';

import { BusinessType } from '@/types';

export interface CategoryBarcodeItem {
  barcode: string;
  name: string;
  category: string;
  mrp: number;
  selling_price: number;
  unit: string;
  tax_rate: number;
  hsn?: string;
}

// In-memory indexed dictionary cache (Keeps only active category in memory: < 50KB RAM footprint)
let activeDictionaryUrl: string | null = null;
let activeBarcodeMap: Map<string, CategoryBarcodeItem> = new Map();
let loadingPromise: Promise<Map<string, CategoryBarcodeItem>> | null = null;

/**
 * Maps business type to corresponding category barcode dictionary file in /public/barcodes/
 */
export function getDictionaryPathForBusinessType(businessType?: BusinessType | string): string {
  switch (businessType) {
    case 'pharmacy':
      return '/barcodes/pharmacy-india.json';
    case 'clothing':
    case 'salon':
      return '/barcodes/apparel-retail.json';
    case 'electronics':
    case 'mobile':
    case 'electrical':
    case 'hardware':
      return '/barcodes/electronics-mobile.json';
    case 'stationery':
    case 'services':
      return '/barcodes/general-store.json';
    case 'grocery':
    case 'fmcg':
    case 'bakery':
    case 'restaurant':
    default:
      return '/barcodes/fmcg-india.json';
  }
}

/**
 * Lazily loads and indexes the category-specific barcode JSON dictionary
 */
export async function loadCategoryBarcodeDictionary(
  businessType?: BusinessType | string
): Promise<Map<string, CategoryBarcodeItem>> {
  const targetUrl = getDictionaryPathForBusinessType(businessType);

  // If already loaded in memory for this category, return instantly (0ms)
  if (activeDictionaryUrl === targetUrl && activeBarcodeMap.size > 0) {
    return activeBarcodeMap;
  }

  // Deduplicate in-flight loading requests
  if (loadingPromise && activeDictionaryUrl === targetUrl) {
    return loadingPromise;
  }

  activeDictionaryUrl = targetUrl;
  loadingPromise = (async () => {
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch(targetUrl, {
          cache: 'force-cache',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (res.ok) {
          const items: CategoryBarcodeItem[] = await res.json();
          const map = new Map<string, CategoryBarcodeItem>();
          for (const item of items) {
            if (item.barcode) {
              map.set(item.barcode.trim(), item);
            }
          }
          activeBarcodeMap = map;
          return activeBarcodeMap;
        }
      }
    } catch (err) {
      console.warn('Category barcode dictionary load notice:', err);
    }

    return activeBarcodeMap;
  })();

  return loadingPromise;
}

/**
 * Instant local lookup in the category barcode dictionary with zero network latency
 */
export async function lookupCategoryBarcode(
  barcode: string,
  businessType?: BusinessType | string
): Promise<CategoryBarcodeItem | null> {
  if (!barcode) return null;
  const clean = barcode.trim();
  if (clean.length < 3) return null;

  const map = await loadCategoryBarcodeDictionary(businessType);
  return map.get(clean) || null;
}
