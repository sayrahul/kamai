import { Product, PurchaseBillLineItem } from '@/types';

/**
 * Normalizes text for clean fuzzy token comparison
 */
function normalizeName(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes a simple token overlap similarity score between 0 and 1
 */
function computeTokenSimilarity(a: string, b: string): number {
  const normA = normalizeName(a);
  const normB = normalizeName(b);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  const tokensA = normA.split(' ').filter((t) => t.length > 1);
  const tokensB = normB.split(' ').filter((t) => t.length > 1);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setB = new Set(tokensB);
  let intersectionCount = 0;
  for (let i = 0; i < tokensA.length; i++) {
    if (setB.has(tokensA[i])) {
      intersectionCount++;
    }
  }

  const allTokens = tokensA.concat(tokensB);
  const unionCount = new Set(allTokens).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Enriches extracted bill line items by fuzzy matching against existing products in local inventory
 */
export function matchExtractedItemsWithProducts(
  extractedItems: PurchaseBillLineItem[],
  existingProducts: Product[]
): PurchaseBillLineItem[] {
  return extractedItems.map((item) => {
    let bestMatch: Product | null = null;
    let highestScore = 0;

    for (const product of existingProducts) {
      // 1. Direct name match
      if (normalizeName(product.name) === normalizeName(item.raw_name)) {
        bestMatch = product;
        highestScore = 1.0;
        break;
      }

      // 2. Barcode match if present
      if (product.barcode && product.barcode === item.raw_name) {
        bestMatch = product;
        highestScore = 1.0;
        break;
      }

      // 3. Token similarity match
      const similarity = computeTokenSimilarity(product.name, item.raw_name);
      if (similarity > highestScore && similarity >= 0.5) {
        highestScore = similarity;
        bestMatch = product;
      }
    }

    if (bestMatch) {
      return {
        ...item,
        matched_product_id: bestMatch.id,
        is_new_product: false,
        selling_price: item.selling_price || bestMatch.selling_price,
        unit: item.unit || bestMatch.unit,
      };
    }

    return {
      ...item,
      matched_product_id: undefined,
      is_new_product: true,
    };
  });
}
