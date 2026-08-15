/**
 * Free Public Barcode Lookup using Open Food Facts API
 * (Zero API key required, open source database with over 3 million products including Indian FMCG)
 */

export interface PublicProductInfo {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  quantity?: string;
  source: 'openfoodfacts' | 'manual';
}

export async function lookupPublicBarcode(barcode: string): Promise<PublicProductInfo | null> {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode || cleanBarcode.length < 5) return null;

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data.status === 1 && data.product) {
      const p = data.product;
      const name = p.product_name_en || p.product_name || p.generic_name || p.brands || `Item (${cleanBarcode})`;
      const brand = p.brands || p.brand_owner || undefined;
      const category = p.categories_tags?.[0]?.replace(/^en:/, '').replace(/-/g, ' ') || 'Packaged Goods';
      const imageUrl = p.image_front_small_url || p.image_url || undefined;
      const quantity = p.quantity || undefined;

      return {
        barcode: cleanBarcode,
        name: brand ? `${brand} ${name}` : name,
        brand,
        category,
        imageUrl,
        quantity,
        source: 'openfoodfacts',
      };
    }
  } catch (error) {
    console.warn('Public barcode lookup error (offline or network issue):', error);
  }

  return null;
}
