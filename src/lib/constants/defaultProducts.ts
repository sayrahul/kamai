import { BusinessType, Product, ProductUnit } from '@/types';
import { db } from '@/lib/db';

export interface SeedProductDefinition {
  name: string;
  category: string;
  unit: ProductUnit;
  selling_price: number; // in paise
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
 * Default Category-Specific Indian Retail Products Dictionary
 * Mapped to the 8 Primary Business Categories:
 * 1. Kirana & Grocery (grocery)
 * 2. Medical Store & Pharmacy (pharmacy)
 * 3. Cafe & Restaurant (restaurant)
 * 4. Clothing & Footwear (clothing)
 * 5. Electronics & Mobile (electronics / mobile)
 * 6. Hardware & Sanitary (hardware)
 * 7. Electrical Goods (electrical)
 * 8. FMCG & Supermarket (fmcg)
 */
export const DEFAULT_CATEGORY_PRODUCTS: Record<string, SeedProductDefinition[]> = {
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
      name: 'Parle-G Biscuit (80g)',
      category: 'Snacks & Biscuits',
      unit: 'packet',
      selling_price: 1000, // ₹10.00
      mrp: 1000,
      purchase_price: 850,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '1905',
    },
    {
      name: 'Maggi 2-Minute Masala Noodles (70g)',
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
      name: 'Aashirvaad Shudh Chakki Atta (5kg)',
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
      name: 'Fortune Sunlite Refined Sunflower Oil (1L)',
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
      name: 'Amul Butter Salted (100g)',
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
      name: 'Tata Tea Premium Desh Ki Chai (250g)',
      category: 'Beverages',
      unit: 'packet',
      selling_price: 13500, // ₹135.00
      mrp: 14000,
      purchase_price: 11500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      hsn_code: '0902',
    },
    {
      name: 'Surf Excel Quick Wash Detergent (500g)',
      category: 'Home & Cleaning',
      unit: 'packet',
      selling_price: 8000, // ₹80.00
      mrp: 8000,
      purchase_price: 6800,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3402',
    },
  ],

  // 2. MEDICAL STORE & PHARMACY
  pharmacy: [
    {
      name: 'Dolo 650mg Paracetamol Tablets (15 Tabs)',
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
      name: 'Crocin 650 Advance Fast Action (15 Tabs)',
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
      name: 'Vicks VapoRub Balm (25ml)',
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
      name: 'Honitus Ayurvedic Cough Syrup (100ml)',
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
      name: 'Digene Acidity Relief Tablets Mint (15 Tabs)',
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
      name: 'Band-Aid Washproof Strips (Pack of 10)',
      category: 'First Aid & Surgical',
      unit: 'packet',
      selling_price: 2500, // ₹25.00
      mrp: 2500,
      purchase_price: 1900,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '3005',
    },
    {
      name: 'Betadine 10% Antiseptic Ointment (20g)',
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
      name: 'Eno Fruit Salt Lemon Sachet (5g)',
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
  ],

  // 3. CAFE & RESTAURANT
  restaurant: [
    {
      name: 'Special Masala Dosa with Sambar & Chutney',
      category: 'South Indian',
      unit: 'plate',
      selling_price: 9000, // ₹90.00
      mrp: 9000,
      purchase_price: 3500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '9963',
    },
    {
      name: 'Paneer Butter Masala (Full)',
      category: 'Main Course',
      unit: 'plate',
      selling_price: 22000, // ₹220.00
      mrp: 22000,
      purchase_price: 9000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '9963',
    },
    {
      name: 'Veg Dum Biryani with Raita',
      category: 'Rice & Biryani',
      unit: 'portion',
      selling_price: 18000, // ₹180.00
      mrp: 18000,
      purchase_price: 7000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '9963',
    },
    {
      name: 'Butter Tandoori Roti',
      category: 'Breads & Roti',
      unit: 'piece',
      selling_price: 2000, // ₹20.00
      mrp: 2000,
      purchase_price: 600,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '9963',
    },
    {
      name: 'Masala Tea / Cutting Chai',
      category: 'Beverages & Drinks',
      unit: 'piece',
      selling_price: 1500, // ₹15.00
      mrp: 1500,
      purchase_price: 500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '9963',
    },
    {
      name: 'Veg Hakka Noodles',
      category: 'Chinese & Snacks',
      unit: 'plate',
      selling_price: 14000, // ₹140.00
      mrp: 14000,
      purchase_price: 5000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '9963',
    },
    {
      name: 'Cold Coffee with Ice Cream',
      category: 'Beverages & Drinks',
      unit: 'piece',
      selling_price: 9000, // ₹90.00
      mrp: 9000,
      purchase_price: 3500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '9963',
    },
    {
      name: 'Gulab Jamun (2 Pieces)',
      category: 'Desserts',
      unit: 'plate',
      selling_price: 5000, // ₹50.00
      mrp: 5000,
      purchase_price: 2000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '9963',
    },
  ],

  // 4. CLOTHING & FOOTWEAR
  clothing: [
    {
      name: "Men's Classic Cotton Crew Neck T-Shirt (M)",
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
      name: "Men's Slim Fit Denim Jeans (32)",
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
      name: "Men's Formal Oxford Shirt Blue (40)",
      category: "Men's Wear",
      unit: 'piece',
      selling_price: 79900, // ₹799.00
      mrp: 99900,
      purchase_price: 45000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '6205',
    },
    {
      name: "Women's Straight Fit Cotton Kurti (M)",
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
      name: "Women's 4-Way Stretch Cotton Leggings (Free Size)",
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
      name: 'Kids Cotton Printed T-Shirt & Shorts Set',
      category: "Kids & Infants",
      unit: 'set',
      selling_price: 44900, // ₹449.00
      mrp: 59900,
      purchase_price: 24000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '6111',
    },
    {
      name: 'Cotton Ankle Length Socks (Pack of 3 Pairs)',
      category: 'Innerwear & Hosiery',
      unit: 'packet',
      selling_price: 14900, // ₹149.00
      mrp: 19900,
      purchase_price: 8000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 5,
      is_tax_inclusive: true,
      hsn_code: '6115',
    },
    {
      name: "Men's Formal Leather Belt Brown",
      category: 'Accessories',
      unit: 'piece',
      selling_price: 34900, // ₹349.00
      mrp: 49900,
      purchase_price: 18000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '4203',
    },
  ],

  // 5. ELECTRONICS & MOBILE
  electronics: [
    {
      name: '20W PD Fast Charger Adapter Single Port',
      category: 'Chargers & Adapters',
      unit: 'piece',
      selling_price: 39900, // ₹399.00
      mrp: 59900,
      purchase_price: 22000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8504',
    },
    {
      name: 'USB Type-C Fast Charging Cable (1m)',
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
      name: '10000mAh Power Bank Fast Charge 22.5W',
      category: 'Power Banks',
      unit: 'piece',
      selling_price: 99900, // ₹999.00
      mrp: 149900,
      purchase_price: 68000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8504',
    },
    {
      name: 'True Wireless Earbuds Bluetooth 5.3',
      category: 'Headphones & Audio',
      unit: 'piece',
      selling_price: 119900, // ₹1,199.00
      mrp: 179900,
      purchase_price: 75000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8518',
    },
    {
      name: 'Tempered Glass Screen Protector 9D HD Universal',
      category: 'Cases & Covers',
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
      name: 'Wireless Bluetooth Neckband Earphones with Mic',
      category: 'Headphones & Audio',
      unit: 'piece',
      selling_price: 79900, // ₹799.00
      mrp: 129900,
      purchase_price: 48000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8518',
    },
    {
      name: 'Duracell Ultra AA Alkaline Batteries (Pack of 4)',
      category: 'Batteries & Torches',
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
      name: 'Universal Magnetic Car Dashboard Mobile Holder',
      category: 'Mounts & Stands',
      unit: 'piece',
      selling_price: 24900, // ₹249.00
      mrp: 39900,
      purchase_price: 12000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3926',
    },
  ],

  // 6. HARDWARE & SANITARY
  hardware: [
    {
      name: 'Asian Paints Tractor Emulsion Paint (1L)',
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
      name: 'Fevicol SH Synthetic Resin Adhesive (1kg)',
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
      name: 'Taplon Teflon Plumbing Pipe Tape (12mm x 10m)',
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
      name: '4-inch Steel Wire Nails (1kg Box)',
      category: 'Fasteners & Screws',
      unit: 'kg',
      selling_price: 11000, // ₹110.00
      mrp: 12500,
      purchase_price: 8800,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '7317',
    },
    {
      name: 'PVC Solvent Cement Adhesive (100ml)',
      category: 'Plumbing & Fittings',
      unit: 'piece',
      selling_price: 5500, // ₹55.00
      mrp: 6500,
      purchase_price: 4200,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3506',
    },
    {
      name: 'Stainless Steel Tower Bolt 6-inch Heavy Duty',
      category: 'Door & Window Fittings',
      unit: 'piece',
      selling_price: 14500, // ₹145.00
      mrp: 18000,
      purchase_price: 9500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8302',
    },
    {
      name: 'Heavy Duty Steel Measuring Tape (5 Meter)',
      category: 'Hand & Power Tools',
      unit: 'piece',
      selling_price: 18000, // ₹180.00
      mrp: 22000,
      purchase_price: 12000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '9017',
    },
    {
      name: 'Brass Ball Valve 1/2-inch for Water Line',
      category: 'Plumbing & Fittings',
      unit: 'piece',
      selling_price: 21000, // ₹210.00
      mrp: 25000,
      purchase_price: 16000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8481',
    },
  ],

  // 7. ELECTRICAL GOODS & LIGHTING
  electrical: [
    {
      name: 'Philips LED Bulb 9W Cool Daylight (B22 Base)',
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
      name: 'Syska LED Bulb 12W Cool Day White (B22)',
      category: 'Lighting & LEDs',
      unit: 'piece',
      selling_price: 12500, // ₹125.00
      mrp: 16000,
      purchase_price: 9500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '8539',
    },
    {
      name: 'Havells 1.5 sq mm FR Copper Wire Coil (90m Red)',
      category: 'Wires & Cables',
      unit: 'piece',
      selling_price: 185000, // ₹1,850.00
      mrp: 215000,
      purchase_price: 155000,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8544',
    },
    {
      name: 'Anchor 3-Pin Multi-Plug Adapter with Indicator',
      category: 'Switches & Sockets',
      unit: 'piece',
      selling_price: 14000, // ₹140.00
      mrp: 17500,
      purchase_price: 9800,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8536',
    },
    {
      name: 'PVC Electrical Insulation Tape Black (Pack of 5)',
      category: 'Electrical Accessories',
      unit: 'packet',
      selling_price: 5000, // ₹50.00
      mrp: 6000,
      purchase_price: 3200,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3919',
    },
    {
      name: 'Modular 6A 1-Way Piano Switch White',
      category: 'Switches & Sockets',
      unit: 'piece',
      selling_price: 3500, // ₹35.00
      mrp: 4500,
      purchase_price: 2200,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8536',
    },
    {
      name: '16A Heavy Duty Power Socket for AC/Geyser',
      category: 'Switches & Sockets',
      unit: 'piece',
      selling_price: 8500, // ₹85.00
      mrp: 11000,
      purchase_price: 5800,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8536',
    },
    {
      name: 'Crompton LED Batten Tube Light 20W (4 Feet)',
      category: 'Lighting & LEDs',
      unit: 'piece',
      selling_price: 24000, // ₹240.00
      mrp: 32000,
      purchase_price: 18500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '8539',
    },
  ],

  // 8. FMCG & SUPERMARKET
  fmcg: [
    {
      name: 'Tata Salt (1kg)',
      category: 'Staples & Grains',
      unit: 'packet',
      selling_price: 2800, // ₹28.00
      mrp: 2800,
      purchase_price: 2400,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 0,
      is_tax_inclusive: true,
      hsn_code: '2501',
    },
    {
      name: 'Parle-G Glucose Biscuit (80g)',
      category: 'Snacks & Biscuits',
      unit: 'packet',
      selling_price: 1000, // ₹10.00
      mrp: 1000,
      purchase_price: 850,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '1905',
    },
    {
      name: 'Maggi 2-Minute Masala Noodles (70g)',
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
      name: 'Aashirvaad Shudh Chakki Atta (5kg)',
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
      name: 'Fortune Sunlite Refined Sunflower Oil (1L)',
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
      name: 'Dettol Original Bathing Soap (75g)',
      category: 'Personal Care',
      unit: 'piece',
      selling_price: 3800, // ₹38.00
      mrp: 4000,
      purchase_price: 3200,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3401',
    },
    {
      name: 'Colgate Strong Teeth Toothpaste (100g)',
      category: 'Personal Care',
      unit: 'piece',
      selling_price: 5700, // ₹57.00
      mrp: 6000,
      purchase_price: 4800,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3306',
    },
    {
      name: 'Surf Excel Quick Wash Detergent (500g)',
      category: 'Home & Cleaning',
      unit: 'packet',
      selling_price: 8000, // ₹80.00
      mrp: 8000,
      purchase_price: 6800,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3402',
    },
  ],

  // OTHER / GENERAL BUSINESS FALLBACK
  other: [
    {
      name: 'Classmate Long Notebook 172 Pages',
      category: 'Stationery & Books',
      unit: 'piece',
      selling_price: 5500, // ₹55.00
      mrp: 6000,
      purchase_price: 4200,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 12,
      is_tax_inclusive: true,
      hsn_code: '4820',
    },
    {
      name: 'Reynolds 045 Ball Pen Blue (Pack of 5)',
      category: 'Stationery & Books',
      unit: 'packet',
      selling_price: 4500, // ₹45.00
      mrp: 5000,
      purchase_price: 3400,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '9608',
    },
    {
      name: 'Fevicol All Round Adhesive (100g)',
      category: 'General Items',
      unit: 'piece',
      selling_price: 4500, // ₹45.00
      mrp: 5000,
      purchase_price: 3500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '3506',
    },
    {
      name: 'Duracell AA Alkaline Batteries (Pack of 2)',
      category: 'General Items',
      unit: 'packet',
      selling_price: 9000, // ₹90.00
      mrp: 10000,
      purchase_price: 7500,
      current_stock: 10,
      min_stock_level: 5,
      tax_rate: 18,
      is_tax_inclusive: true,
      hsn_code: '8506',
    },
  ],
};

// Legacy Niche Aliases Mapper
const LEGACY_PRODUCT_MAP: Record<string, string> = {
  fmcg: 'grocery',
  bakery: 'restaurant',
  electrical: 'hardware',
  electronics: 'hardware',
  mobile: 'hardware',
  salon: 'clothing',
  stationery: 'grocery',
  services: 'hardware',
  other: 'grocery',
};

/**
 * Returns default seed products for a given business category
 */
export function getDefaultProductsForCategory(businessType?: BusinessType | string): SeedProductDefinition[] {
  const typeKey = (businessType || 'grocery').toLowerCase();
  if (DEFAULT_CATEGORY_PRODUCTS[typeKey]) {
    return DEFAULT_CATEGORY_PRODUCTS[typeKey];
  }
  const mapped = LEGACY_PRODUCT_MAP[typeKey];
  if (mapped && DEFAULT_CATEGORY_PRODUCTS[mapped]) {
    return DEFAULT_CATEGORY_PRODUCTS[mapped];
  }
  return DEFAULT_CATEGORY_PRODUCTS['grocery'];
}

/**
 * Auto-populates the local Dexie.js products and categories table with category-specific items
 */
export async function seedCategoryDefaultProducts(
  businessId: string,
  businessType: BusinessType | string
): Promise<Product[]> {
  const seedDefs = getDefaultProductsForCategory(businessType);
  const now = new Date().toISOString();

  // 1. Extract unique categories and ensure they exist in db.categories
  const uniqueCategoryNames = Array.from(new Set(seedDefs.map((p) => p.category)));
  const categoryMap = new Map<string, string>();

  for (let i = 0; i < uniqueCategoryNames.length; i++) {
    const catName = uniqueCategoryNames[i];
    const catId = `cat_${Date.now()}_${i}_${catName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    
    // Check if category already exists
    const existing = await db.categories
      .where('business_id')
      .equals(businessId)
      .and((c) => c.name.toLowerCase() === catName.toLowerCase())
      .first();

    if (existing) {
      categoryMap.set(catName, existing.id);
    } else {
      await db.categories.put({
        id: catId,
        business_id: businessId,
        name: catName,
        created_at: now,
      });
      categoryMap.set(catName, catId);
    }
  }

  // 2. Map seed definitions into complete schema-compliant Product objects
  const productsToSeed: Product[] = seedDefs.map((def, idx) => {
    const catId = categoryMap.get(def.category) || `cat_general_${businessId}`;
    return {
      id: `prod_seed_${Date.now()}_${idx}`,
      business_id: businessId,
      name: def.name,
      barcode: undefined, // Barcode left blank as requested
      category_id: catId,
      category_name: def.category,
      unit: def.unit,
      selling_price: def.selling_price,
      mrp: def.mrp,
      purchase_price: def.purchase_price,
      current_stock: def.current_stock || 10, // Stock set to 10
      min_stock_level: def.min_stock_level || 5,
      tax_rate: def.tax_rate,
      is_tax_inclusive: def.is_tax_inclusive !== false,
      hsn_code: def.hsn_code,
      is_loose_item: def.is_loose_item || false,
      is_favorite: idx < 3,
      is_active: true,
      created_at: now,
      updated_at: now,
      sync_status: 'synced',
    };
  });

  // 3. Inject directly into local Dexie database
  await db.products.bulkPut(productsToSeed);

  return productsToSeed;
}
