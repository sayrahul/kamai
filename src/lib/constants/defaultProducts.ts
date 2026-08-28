// src/lib/constants/defaultProducts.ts
import { BusinessType, Product, ProductUnit } from '@/types';
import { db } from '@/lib/db';

export interface SeedProductDefinition {
  name: string;
  category: string;
  unit: ProductUnit;
  selling_price: number; // in paise (1 INR = 100 paise)
  mrp: number; // in paise
  purchase_price: number; // in paise
  current_stock: number;
  min_stock_level: number;
  tax_rate: number;
  is_tax_inclusive?: boolean;
  hsn_code?: string;
  is_loose_item?: boolean;
}

/**
 * DEFAULT_PRODUCTS
 * Category-specific Indian retail starter inventory dictionary.
 * Each item has:
 * - barcode: ''
 * - current_stock: 10
 * - realistic MRP & selling price in paise
 */
export const DEFAULT_PRODUCTS: Record<string, SeedProductDefinition[]> = {
  // 1. KIRANA & GROCERY
  grocery: [
    {
      name: 'Tata Salt (1kg)',
      category: 'Staples & Grains',
      unit: 'packet',
      selling_price: 2800, // ₹28.00
      mrp: 2800,
      purchase_price: 2400, // ₹24.00
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 0,
      is_tax_inclusive: true,
      hsn_code: '2501',
    },
    {
      name: 'Parle-G (₹5)',
      category: 'Snacks & Biscuits',
      unit: 'packet',
      selling_price: 500, // ₹5.00
      mrp: 500,
      purchase_price: 425,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '1905',
    },
    {
      name: 'Maggi Masala (70g)',
      category: 'Instant Food',
      unit: 'packet',
      selling_price: 1400, // ₹14.00
      mrp: 1400,
      purchase_price: 1200,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '1902',
    },
    {
      name: 'Ashirvaad Atta (5kg)',
      category: 'Staples & Grains',
      unit: 'packet',
      selling_price: 24500, // ₹245.00
      mrp: 26000,
      purchase_price: 21500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 0,
      is_tax_inclusive: true,
      hsn_code: '1101',
    },
    {
      name: 'Fortune Sunflower Oil (1L)',
      category: 'Edible Oils & Ghee',
      unit: 'litre',
      selling_price: 14500, // ₹145.00
      mrp: 15500,
      purchase_price: 12500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '1512',
    },
    {
      name: 'Amul Butter (100g)',
      category: 'Dairy & Eggs',
      unit: 'packet',
      selling_price: 5600, // ₹56.00
      mrp: 5600,
      purchase_price: 5000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '0405',
    },
    {
      name: 'Everest Garam Masala (100g)',
      category: 'Spices & Masala',
      unit: 'box',
      selling_price: 7800, // ₹78.00
      mrp: 8500,
      purchase_price: 6500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '0910',
    },
    {
      name: 'Surf Excel Matic (1kg)',
      category: 'Home & Cleaning',
      unit: 'packet',
      selling_price: 14000, // ₹140.00
      mrp: 15000,
      purchase_price: 12000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3402',
    },
    {
      name: 'Brooke Bond Red Label (250g)',
      category: 'Beverages',
      unit: 'packet',
      selling_price: 13500, // ₹135.00
      mrp: 14500,
      purchase_price: 11500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '0902',
    },
    {
      name: 'India Gate Basmati Rice (1kg)',
      category: 'Staples & Grains',
      unit: 'packet',
      selling_price: 12000, // ₹120.00
      mrp: 13500,
      purchase_price: 10000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 0,
      is_tax_inclusive: true,
      hsn_code: '1006',
    },
  ],

  // 2. MEDICAL STORE & PHARMACY
  pharmacy: [
    {
      name: 'Dolo 650',
      category: 'OTC Medicine',
      unit: 'strip',
      selling_price: 3400, // ₹34.00
      mrp: 3400,
      purchase_price: 2700,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '3004',
    },
    {
      name: 'Crocin Advance',
      category: 'OTC Medicine',
      unit: 'strip',
      selling_price: 3200, // ₹32.00
      mrp: 3200,
      purchase_price: 2500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '3004',
    },
    {
      name: 'Vicks Vaporub (25ml)',
      category: 'Balms & Inhalers',
      unit: 'box',
      selling_price: 9500, // ₹95.00
      mrp: 9500,
      purchase_price: 7800,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '3004',
    },
    {
      name: 'Volini Spray',
      category: 'Pain Relief',
      unit: 'piece',
      selling_price: 16000, // ₹160.00
      mrp: 17500,
      purchase_price: 13000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '3004',
    },
    {
      name: 'Digene Tablets',
      category: 'Digestion & Antacids',
      unit: 'strip',
      selling_price: 2500, // ₹25.00
      mrp: 2500,
      purchase_price: 2000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '3004',
    },
    {
      name: 'Betadine Ointment',
      category: 'First Aid & Surgical',
      unit: 'piece',
      selling_price: 12000, // ₹120.00
      mrp: 12000,
      purchase_price: 9800,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '3004',
    },
    {
      name: 'Honitus Cough Syrup',
      category: 'Syrups & Suspensions',
      unit: 'piece',
      selling_price: 10500, // ₹105.00
      mrp: 10500,
      purchase_price: 8400,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '3004',
    },
    {
      name: 'Eno Lemon (Sachet)',
      category: 'Digestion & Antacids',
      unit: 'packet',
      selling_price: 1000, // ₹10.00
      mrp: 1000,
      purchase_price: 800,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '2106',
    },
    {
      name: 'Pudin Hara',
      category: 'Digestion & Antacids',
      unit: 'strip',
      selling_price: 3000, // ₹30.00
      mrp: 3000,
      purchase_price: 2400,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '3004',
    },
    {
      name: 'Calpol 500',
      category: 'OTC Medicine',
      unit: 'strip',
      selling_price: 2200, // ₹22.00
      mrp: 2200,
      purchase_price: 1700,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '3004',
    },
  ],

  // 3. HARDWARE & SANITARY
  hardware: [
    {
      name: 'Asian Paints Tractor Emulsion (1L)',
      category: 'Paints & Primers',
      unit: 'litre',
      selling_price: 26000, // ₹260.00
      mrp: 28500,
      purchase_price: 22000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3208',
    },
    {
      name: 'Fevicol SH (1kg)',
      category: 'Adhesives & Sealants',
      unit: 'packet',
      selling_price: 26500, // ₹265.00
      mrp: 28000,
      purchase_price: 22500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3506',
    },
    {
      name: 'Taplon Tape',
      category: 'Plumbing & Fittings',
      unit: 'piece',
      selling_price: 2000, // ₹20.00
      mrp: 2500,
      purchase_price: 1200,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3919',
    },
    {
      name: 'M-Seal',
      category: 'Adhesives & Sealants',
      unit: 'packet',
      selling_price: 3000, // ₹30.00
      mrp: 3500,
      purchase_price: 2200,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3506',
    },
    {
      name: 'Dr. Fixit LW+ (200ml)',
      category: 'Construction Chemicals',
      unit: 'piece',
      selling_price: 7500, // ₹75.00
      mrp: 8500,
      purchase_price: 5800,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3824',
    },
    {
      name: 'Anchor Switches',
      category: 'Electrical & Switches',
      unit: 'piece',
      selling_price: 3500, // ₹35.00
      mrp: 4500,
      purchase_price: 2400,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8536',
    },
    {
      name: 'Godrej Padlock',
      category: 'Locks & Security',
      unit: 'piece',
      selling_price: 38000, // ₹380.00
      mrp: 42500,
      purchase_price: 29000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8301',
    },
    {
      name: '3M Double Sided Tape',
      category: 'Adhesives & Tapes',
      unit: 'piece',
      selling_price: 8500, // ₹85.00
      mrp: 10000,
      purchase_price: 6000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3919',
    },
    {
      name: 'Hacksaw Blade',
      category: 'Hand Tools',
      unit: 'piece',
      selling_price: 4500, // ₹45.00
      mrp: 5500,
      purchase_price: 3000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8202',
    },
    {
      name: 'Screwdriver Set',
      category: 'Hand Tools',
      unit: 'set',
      selling_price: 18000, // ₹180.00
      mrp: 22000,
      purchase_price: 12000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8205',
    },
  ],

  // 4. ELECTRONICS & MOBILE
  electronics: [
    {
      name: 'Boat Rockerz 255',
      category: 'Headphones & Audio',
      unit: 'piece',
      selling_price: 99900, // ₹999.00
      mrp: 149900,
      purchase_price: 65000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8518',
    },
    {
      name: 'SanDisk 32GB Pen Drive',
      category: 'Storage & Drives',
      unit: 'piece',
      selling_price: 34900, // ₹349.00
      mrp: 49900,
      purchase_price: 24000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8523',
    },
    {
      name: 'Apple 20W Adapter',
      category: 'Chargers & Adapters',
      unit: 'piece',
      selling_price: 169900, // ₹1,699.00
      mrp: 190000,
      purchase_price: 135000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8504',
    },
    {
      name: 'Type-C Fast Data Cable',
      category: 'Cables & Connectors',
      unit: 'piece',
      selling_price: 19900, // ₹199.00
      mrp: 29900,
      purchase_price: 9500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8544',
    },
    {
      name: 'Tempered Glass',
      category: 'Mobile Accessories',
      unit: 'piece',
      selling_price: 9900, // ₹99.00
      mrp: 19900,
      purchase_price: 3500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '7007',
    },
    {
      name: 'Mobile Back Cover',
      category: 'Mobile Accessories',
      unit: 'piece',
      selling_price: 14900, // ₹149.00
      mrp: 24900,
      purchase_price: 6000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3926',
    },
    {
      name: 'Duracell AA Batteries (Pack of 4)',
      category: 'Batteries & Power',
      unit: 'packet',
      selling_price: 16500, // ₹165.00
      mrp: 18000,
      purchase_price: 13500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8506',
    },
    {
      name: 'Syska 9W LED Bulb',
      category: 'Lighting & LEDs',
      unit: 'piece',
      selling_price: 9500, // ₹95.00
      mrp: 12000,
      purchase_price: 7200,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '8539',
    },
    {
      name: 'Zebronics Wired Mouse',
      category: 'Computer Accessories',
      unit: 'piece',
      selling_price: 19900, // ₹199.00
      mrp: 29900,
      purchase_price: 12000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8471',
    },
    {
      name: 'Realme Earbuds',
      category: 'Headphones & Audio',
      unit: 'piece',
      selling_price: 129900, // ₹1,299.00
      mrp: 179900,
      purchase_price: 85000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8518',
    },
  ],

  // 5. CAFE & RESTAURANT
  restaurant: [
    {
      name: 'Masala Dosa',
      category: 'South Indian',
      unit: 'plate',
      selling_price: 9000, // ₹90.00
      mrp: 9000,
      purchase_price: 3500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: false,
      hsn_code: '9963',
    },
    {
      name: 'Paneer Butter Masala',
      category: 'Main Course',
      unit: 'plate',
      selling_price: 22000, // ₹220.00
      mrp: 22000,
      purchase_price: 9000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: false,
      hsn_code: '9963',
    },
    {
      name: 'Veg Biryani',
      category: 'Rice & Biryani',
      unit: 'portion',
      selling_price: 16000, // ₹160.00
      mrp: 16000,
      purchase_price: 6500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: false,
      hsn_code: '9963',
    },
    {
      name: 'Chicken Dum Biryani',
      category: 'Rice & Biryani',
      unit: 'portion',
      selling_price: 22000, // ₹220.00
      mrp: 22000,
      purchase_price: 9500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: false,
      hsn_code: '9963',
    },
    {
      name: 'Tandoori Roti',
      category: 'Breads & Roti',
      unit: 'piece',
      selling_price: 2000, // ₹20.00
      mrp: 2000,
      purchase_price: 600,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: false,
      hsn_code: '9963',
    },
    {
      name: 'Dal Makhani',
      category: 'Main Course',
      unit: 'plate',
      selling_price: 18000, // ₹180.00
      mrp: 18000,
      purchase_price: 7000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: false,
      hsn_code: '9963',
    },
    {
      name: 'Cold Coffee',
      category: 'Beverages & Drinks',
      unit: 'piece',
      selling_price: 8000, // ₹80.00
      mrp: 8000,
      purchase_price: 3000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: false,
      hsn_code: '9963',
    },
    {
      name: 'Sweet Lassi',
      category: 'Beverages & Drinks',
      unit: 'piece',
      selling_price: 5000, // ₹50.00
      mrp: 5000,
      purchase_price: 2000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: false,
      hsn_code: '9963',
    },
    {
      name: 'Samosa (2 pcs)',
      category: 'Snacks',
      unit: 'plate',
      selling_price: 3000, // ₹30.00
      mrp: 3000,
      purchase_price: 1200,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: false,
      hsn_code: '9963',
    },
    {
      name: 'Chai/Tea',
      category: 'Beverages & Drinks',
      unit: 'piece',
      selling_price: 1500, // ₹15.00
      mrp: 1500,
      purchase_price: 500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: false,
      hsn_code: '9963',
    },
  ],

  // 6. CLOTHING & APPAREL
  clothing: [
    {
      name: "Men's Cotton T-Shirt",
      category: "Men's Wear",
      unit: 'piece',
      selling_price: 39900, // ₹399.00
      mrp: 49900,
      purchase_price: 22000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '6109',
    },
    {
      name: 'Denim Jeans',
      category: "Men's Wear",
      unit: 'piece',
      selling_price: 99900, // ₹999.00
      mrp: 129900,
      purchase_price: 58000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '6203',
    },
    {
      name: 'Ladies Kurti',
      category: "Women's Ethnic",
      unit: 'piece',
      selling_price: 59900, // ₹599.00
      mrp: 79900,
      purchase_price: 32000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '6204',
    },
    {
      name: 'Leggings',
      category: "Women's Ethnic",
      unit: 'piece',
      selling_price: 29900, // ₹299.00
      mrp: 34900,
      purchase_price: 16000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '6104',
    },
    {
      name: 'Track Pants',
      category: 'Active Wear',
      unit: 'piece',
      selling_price: 49900, // ₹499.00
      mrp: 69900,
      purchase_price: 27000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '6103',
    },
    {
      name: 'Cotton Saree',
      category: "Women's Ethnic",
      unit: 'piece',
      selling_price: 89900, // ₹899.00
      mrp: 119900,
      purchase_price: 48000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '5208',
    },
    {
      name: 'School Uniform Shirt',
      category: 'Uniforms & Formal',
      unit: 'piece',
      selling_price: 34900, // ₹349.00
      mrp: 44900,
      purchase_price: 19000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '6205',
    },
    {
      name: "Men's Formal Trousers",
      category: "Men's Wear",
      unit: 'piece',
      selling_price: 79900, // ₹799.00
      mrp: 99900,
      purchase_price: 44000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '6203',
    },
    {
      name: 'Winter Jacket',
      category: 'Winter Wear',
      unit: 'piece',
      selling_price: 149900, // ₹1,499.00
      mrp: 199900,
      purchase_price: 82000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '6201',
    },
    {
      name: 'Handkerchief (Set of 3)',
      category: 'Accessories',
      unit: 'set',
      selling_price: 9900, // ₹99.00
      mrp: 14900,
      purchase_price: 4500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '6213',
    },
  ],
};

// Aliases for compatibility
export const DEFAULT_CATEGORY_PRODUCTS = DEFAULT_PRODUCTS;

/**
 * Returns default seed products for any given business type.
 */
export function getDefaultProductsForCategory(category: string): SeedProductDefinition[] {
  if (category === 'mobile' || category === 'electrical') {
    return DEFAULT_PRODUCTS.electronics || DEFAULT_PRODUCTS.grocery;
  }
  if (category === 'fmcg' || category === 'bakery') {
    return DEFAULT_PRODUCTS.grocery;
  }
  return DEFAULT_PRODUCTS[category] || DEFAULT_PRODUCTS.grocery;
}

/**
 * Seeds default category-wise products directly into the local Dexie `db.products` table.
 * Strictly initializes empty barcodes, stock = 10, and matching category ids.
 */
export async function seedCategoryDefaultProducts(
  businessId: string,
  businessType: BusinessType
): Promise<Product[]> {
  if (!db.isOpen()) {
    await db.open();
  }

  const defaultList = getDefaultProductsForCategory(businessType);
  const now = new Date().toISOString();

  // Load existing categories for this business to link category_id properly
  const categories = await db.categories.where('business_id').equals(businessId).toArray();
  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.name.toLowerCase().trim(), c.id));
  const fallbackCategoryId = categories[0]?.id || `cat_${Date.now()}_default`;

  const productsToInsert: Product[] = defaultList.map((item, idx) => {
    const matchedCatId =
      categoryMap.get(item.category.toLowerCase().trim()) || fallbackCategoryId;

    return {
      id: `prod_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      business_id: businessId,
      name: item.name,
      barcode: '',
      category_id: matchedCatId,
      category_name: item.category,
      unit: item.unit,
      purchase_price: item.purchase_price,
      selling_price: item.selling_price,
      mrp: item.mrp,
      tax_rate: item.tax_rate,
      is_tax_inclusive: item.is_tax_inclusive ?? true,
      hsn_code: item.hsn_code || '',
      current_stock: 10,
      min_stock_level: item.min_stock_level || 5,
      is_loose_item: item.is_loose_item || false,
      is_favorite: idx < 4,
      is_active: true,
      created_at: now,
      updated_at: now,
      sync_status: 'synced',
    };
  });

  // Bulk put into local Dexie database
  await db.products.bulkPut(productsToInsert);
  return productsToInsert;
}

export default DEFAULT_PRODUCTS;
