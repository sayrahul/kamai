// Store Category Profiles Configuration for KamaiPlus (Kamai+)
// 5 Core Indian Retail Pillars:
// 1. 🌾 Kirana / Grocery Store (grocery)
// 2. 💊 Medical Store & Pharmacy (pharmacy)
// 3. 👕 Clothing, Apparel & Footwear (clothing)
// 4. 🔩 Hardware, Sanitary & Electricals (hardware)
// 5. 🍽️ Restaurant, Cafe & Food Stall (restaurant)

import { BusinessType, ProductUnit, ModuleId, ProductAttributeDefinition } from '@/types';

export interface StoreProfileProduct {
  name: string;
  category: string;
  unit: ProductUnit;
  selling_price: number; // in paise
  purchase_price: number; // in paise
  mrp: number; // in paise
  tax_rate: number; // percentage
  is_loose_item?: boolean;
  batch_number?: string;
  expiry_date?: string;
  size?: string;
  color?: string;
  warranty_period_months?: number;
  barcode?: string;
}

export interface UnitOption {
  id: ProductUnit;
  labelEn: string;
  labelHi: string;
  symbol: string;
  isDecimalAllowed?: boolean;
}

export const MASTER_UNITS: UnitOption[] = [
  { id: 'piece', labelEn: 'Piece / Item (pc)', labelHi: 'पीस / नग (pc)', symbol: 'pc' },
  { id: 'strip', labelEn: 'Medicine Strip (strip)', labelHi: 'दवा का पत्ता (strip)', symbol: 'strip' },
  { id: 'plate', labelEn: 'Plate / Dish (plate)', labelHi: 'प्लेट / डिश (plate)', symbol: 'plate' },
  { id: 'portion', labelEn: 'Portion / Cup (portion)', labelHi: 'पोर्शन / कप', symbol: 'portion' },
  { id: 'kg', labelEn: 'Kilogram (kg)', labelHi: 'किलोग्राम (kg / किलो)', symbol: 'kg', isDecimalAllowed: true },
  { id: 'gram', labelEn: 'Gram (gm)', labelHi: 'ग्राम (gm)', symbol: 'gm', isDecimalAllowed: true },
  { id: 'litre', labelEn: 'Litre (ltr)', labelHi: 'लीटर (ltr)', symbol: 'ltr', isDecimalAllowed: true },
  { id: 'ml', labelEn: 'Millilitre (ml)', labelHi: 'मिलीलीटर (ml)', symbol: 'ml' },
  { id: 'packet', labelEn: 'Packet / Pouch (pkt)', labelHi: 'पैकेट / पाउच (pkt)', symbol: 'pkt' },
  { id: 'box', labelEn: 'Box / Carton (box)', labelHi: 'डिब्बा / बॉक्स (box)', symbol: 'box' },
  { id: 'pair', labelEn: 'Pair / Shoes (pair)', labelHi: 'जोड़ी (pair)', symbol: 'pair' },
  { id: 'set', labelEn: 'Set / Combo (set)', labelHi: 'सेट / कॉम्बो (set)', symbol: 'set' },
  { id: 'dozen', labelEn: 'Dozen (dz)', labelHi: 'दर्जन (dz)', symbol: 'dz' },
  { id: 'meter', labelEn: 'Meter (mtr)', labelHi: 'मीटर (mtr)', symbol: 'm', isDecimalAllowed: true },
  { id: 'foot', labelEn: 'Feet / Running Ft (ft)', labelHi: 'फीट (ft)', symbol: 'ft', isDecimalAllowed: true },
  { id: 'sqft', labelEn: 'Square Feet (sq.ft)', labelHi: 'स्क्वायर फीट (sq.ft)', symbol: 'sq.ft', isDecimalAllowed: true },
  { id: 'bundle', labelEn: 'Bundle (bdl)', labelHi: 'बंडल (bdl)', symbol: 'bdl' },
  { id: 'custom', labelEn: 'Custom Unit', labelHi: 'अन्य / कस्टम', symbol: 'unit' },
];

export interface StoreProfile {
  id: BusinessType;
  name: string;
  shortName: string;
  iconName: string;
  emoji: string;
  tagline: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  
  // Enabled Modules
  modules: ModuleId[];

  // Dynamic UI Feature Toggles
  featureToggles: {
    showBarcode: boolean; // False for restaurants/cafes, True for retail
    showWeightUnits: boolean; // kg, gram, litre for kirana/hardware
    showBatchExpiry: boolean; // Mandatory for pharmacy
    showTableOrderType: boolean; // True for restaurant: Dine-In, Takeaway, Table #
    showSizeVariants: boolean; // True for clothing: S, M, L, XL, XXL, 32, 34
    showImeiWarranty: boolean; // True for electronics & electricals
    showDoctorPrescription: boolean; // True for pharmacy
    showKOTToken: boolean; // True for restaurant
    hasBillScan: boolean; // True for retail/wholesale, False for restaurant/cafe
  };

  // Dynamic Input Placeholders
  placeholders: {
    searchProduct: string;
    newProductName: string;
    customerSearch: string;
    customerNotes: string;
    invoiceFooterNote: string;
  };

  defaultUnit: ProductUnit;
  recommendedUnits: ProductUnit[];
  quickCategories: string[];
  sampleProducts: StoreProfileProduct[];
}

export const STORE_PROFILES: Record<string, StoreProfile> = {
  // 1. 🌾 KIRANA & GROCERY RETAIL
  grocery: {
    id: 'grocery',
    name: 'Kirana & Grocery Store',
    shortName: 'Kirana',
    iconName: 'ShoppingBag',
    emoji: '🌾',
    tagline: 'Daily essentials, loose grain weights & rapid barcode billing',
    description: 'Optimized for Indian Kirana stores with loose kg/gram weighing, FMCG barcodes, and customer credit ledger.',
    accentColor: '#16a34a',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    modules: ['POS', 'INVENTORY', 'KHATA', 'CUSTOMERS', 'SUPPLIERS', 'GST', 'BARCODE', 'WEIGHT', 'PURCHASES', 'EXPENSES', 'REPORTS'],
    featureToggles: {
      showBarcode: true,
      showWeightUnits: true,
      showBatchExpiry: false,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: false,
      showDoctorPrescription: false,
      showKOTToken: false,
      hasBillScan: true,
    },
    placeholders: {
      searchProduct: 'Scan barcode or type Atta, Rice, Oil, Maggi...',
      newProductName: 'e.g., Aashirvaad Shudh Chakki Atta 5kg',
      customerSearch: 'Search regular customer name or 10-digit mobile...',
      customerNotes: 'e.g., Udhar payment promise date or home delivery address',
      invoiceFooterNote: 'Thank you for shopping with us! Please visit again.',
    },
    defaultUnit: 'kg',
    recommendedUnits: ['kg', 'gram', 'litre', 'packet', 'piece', 'box', 'dozen'],
    quickCategories: ['Atta, Rice & Dal', 'Spices & Cooking Oil', 'Dairy, Bread & Eggs', 'Biscuits & Snacks', 'Soaps & Detergents', 'Pooja & Agarbatti'],
    sampleProducts: [
      { name: 'Aashirvaad Shudh Chakki Atta 5kg', category: 'Atta, Rice & Dal', unit: 'piece', selling_price: 24500, purchase_price: 22000, mrp: 26000, tax_rate: 0, barcode: '890103001' },
      { name: 'Fortune Sunlite Refined Sunflower Oil 1L', category: 'Spices & Cooking Oil', unit: 'piece', selling_price: 14500, purchase_price: 13200, mrp: 16000, tax_rate: 5, barcode: '890103002' },
      { name: 'Premium Unpolished Toor Dal (Loose)', category: 'Atta, Rice & Dal', unit: 'kg', selling_price: 16000, purchase_price: 14000, mrp: 17500, tax_rate: 0, is_loose_item: true },
      { name: 'Tata Salt Vacuum Evaporated Iodized 1kg', category: 'Spices & Cooking Oil', unit: 'piece', selling_price: 2800, purchase_price: 2400, mrp: 2800, tax_rate: 0, barcode: '890103003' },
      { name: 'Nestle Maggi 2-Minute Masala Noodles 70g', category: 'Biscuits & Snacks', unit: 'piece', selling_price: 1400, purchase_price: 1200, mrp: 1400, tax_rate: 12, barcode: '890103004' },
    ],
  },

  // 2. 💊 MEDICAL STORE & PHARMACY
  pharmacy: {
    id: 'pharmacy',
    name: 'Medical Store & Pharmacy',
    shortName: 'Medical',
    iconName: 'Pill',
    emoji: '💊',
    tagline: 'Batch numbers, expiry alerts, strip counts & doctor records',
    description: 'Compliant with Indian pharmaceutical standards with auto expiry tracking, batch coding, and prescription tags.',
    accentColor: '#0284c7',
    badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
    modules: ['POS', 'INVENTORY', 'KHATA', 'CUSTOMERS', 'SUPPLIERS', 'GST', 'BARCODE', 'BATCH_EXPIRY', 'PHARMACY', 'PURCHASES', 'EXPENSES', 'REPORTS'],
    featureToggles: {
      showBarcode: true,
      showWeightUnits: false,
      showBatchExpiry: true,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: false,
      showDoctorPrescription: true,
      showKOTToken: false,
      hasBillScan: true,
    },
    placeholders: {
      searchProduct: 'Type medicine name (Paracetamol, Cetirizine, Syrup)...',
      newProductName: 'e.g., Dolo 650mg Paracetamol (Strip of 15)',
      customerSearch: 'Patient name, WhatsApp number, or Doctor name...',
      customerNotes: 'e.g., Dr. Sharma prescription #894 / Dosage: 1 tab after food',
      invoiceFooterNote: 'Medicines once sold cannot be returned without original batch verification. Get well soon!',
    },
    defaultUnit: 'strip',
    recommendedUnits: ['strip', 'piece', 'box', 'ml', 'litre', 'packet'],
    quickCategories: ['Tablets & Capsules', 'Syrups & Suspensions', 'Injections & Vials', 'Ointments & Creams', 'First Aid & Bandages', 'Generic Medicines'],
    sampleProducts: [
      { name: 'Dolo 650mg Paracetamol Tablets (Strip of 15)', category: 'Tablets & Capsules', unit: 'strip', selling_price: 3200, purchase_price: 2400, mrp: 3400, tax_rate: 12, batch_number: 'BT-9921', expiry_date: '2027-12-31', barcode: '890104001' },
      { name: 'Azithral 500mg Tablets (Strip of 5)', category: 'Tablets & Capsules', unit: 'strip', selling_price: 11900, purchase_price: 9500, mrp: 13200, tax_rate: 12, batch_number: 'AZ-4412', expiry_date: '2026-10-31', barcode: '890104002' },
      { name: 'Benadryl Cough Formula Syrup 100ml', category: 'Syrups & Suspensions', unit: 'piece', selling_price: 13500, purchase_price: 11000, mrp: 14500, tax_rate: 12, batch_number: 'BN-8103', expiry_date: '2027-06-30', barcode: '890104003' },
      { name: 'Dettol Antiseptic Liquid 250ml', category: 'First Aid & Bandages', unit: 'piece', selling_price: 16500, purchase_price: 14000, mrp: 17500, tax_rate: 18, batch_number: 'DT-1102', expiry_date: '2028-05-31', barcode: '890104004' },
      { name: 'Volini Instant Pain Relief Spray 55g', category: 'Ointments & Creams', unit: 'piece', selling_price: 15000, purchase_price: 12500, mrp: 16000, tax_rate: 12, batch_number: 'VL-7782', expiry_date: '2026-11-30', barcode: '890104005' },
    ],
  },

  // 3. 👕 CLOTHING, APPAREL & FOOTWEAR
  clothing: {
    id: 'clothing',
    name: 'Clothing, Footwear & Apparel',
    shortName: 'Apparel',
    iconName: 'Shirt',
    emoji: '👕',
    tagline: 'Size matrix (S/M/L/XL/32/34), colors, fabrics & exchange policy',
    description: 'Designed for garment shops and shoe stores with size selection, color tracking, and exchange window notes.',
    accentColor: '#7c3aed',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    modules: ['POS', 'INVENTORY', 'KHATA', 'CUSTOMERS', 'SUPPLIERS', 'GST', 'BARCODE', 'VARIANTS', 'PURCHASES', 'EXPENSES', 'REPORTS'],
    featureToggles: {
      showBarcode: true,
      showWeightUnits: false,
      showBatchExpiry: false,
      showTableOrderType: false,
      showSizeVariants: true,
      showImeiWarranty: false,
      showDoctorPrescription: false,
      showKOTToken: false,
      hasBillScan: true,
    },
    placeholders: {
      searchProduct: 'Search Shirt, Jeans, Kurti, Shoes or scan tag...',
      newProductName: 'e.g., Men Pure Cotton Slim Fit Shirt (Size 40)',
      customerSearch: 'Customer name or WhatsApp number...',
      customerNotes: 'e.g., Alteration requested / Sleeve shortening 1 inch',
      invoiceFooterNote: 'Exchange permitted within 7 days with original bill and price tags intact. No cash refund.',
    },
    defaultUnit: 'piece',
    recommendedUnits: ['piece', 'pair', 'set', 'meter', 'box'],
    quickCategories: ['Men Shirts & T-Shirts', 'Women Kurtis & Sarees', 'Jeans & Trousers', 'Kids Wear', 'Shoes & Footwear', 'Innerwear & Accessories'],
    sampleProducts: [
      { name: 'Men Pure Cotton Casual Shirt', category: 'Men Shirts & T-Shirts', unit: 'piece', selling_price: 89900, purchase_price: 52000, mrp: 129900, tax_rate: 5, size: 'L (40)', color: 'Sky Blue', barcode: '890105001' },
      { name: 'Men Stretchable Slim Fit Jeans', category: 'Jeans & Trousers', unit: 'piece', selling_price: 139900, purchase_price: 85000, mrp: 199900, tax_rate: 12, size: '32', color: 'Dark Navy', barcode: '890105002' },
      { name: 'Women Printed Rayon Anarkali Kurti', category: 'Women Kurtis & Sarees', unit: 'piece', selling_price: 74900, purchase_price: 42000, mrp: 119900, tax_rate: 5, size: 'XL', color: 'Ruby Maroon', barcode: '890105003' },
      { name: 'Lightweight Breathable Running Shoes', category: 'Shoes & Footwear', unit: 'pair', selling_price: 159900, purchase_price: 95000, mrp: 229900, tax_rate: 12, size: 'UK 9', color: 'Charcoal Grey', barcode: '890105004' },
    ],
  },

  // 4. 🔩 HARDWARE, SANITARY & ELECTRICALS
  hardware: {
    id: 'hardware',
    name: 'Hardware, Electrical & Sanitary',
    shortName: 'Hardware',
    iconName: 'Wrench',
    emoji: '🔩',
    tagline: 'Pcs/box/meter counts, plumbing, paints, wires, tools & electricals',
    description: 'Built for hardware, paint, sanitary, and electrical shops with meter lengths, box packs, and contractor ledgers.',
    accentColor: '#475569',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    modules: ['POS', 'INVENTORY', 'KHATA', 'CUSTOMERS', 'SUPPLIERS', 'GST', 'BARCODE', 'WEIGHT', 'WARRANTY', 'PURCHASES', 'EXPENSES', 'REPORTS'],
    featureToggles: {
      showBarcode: true,
      showWeightUnits: true,
      showBatchExpiry: false,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: true,
      showDoctorPrescription: false,
      showKOTToken: false,
      hasBillScan: true,
    },
    placeholders: {
      searchProduct: 'Search Paint, PVC Pipe, Screw, Wire, MCB, Tap...',
      newProductName: 'e.g., Asian Paints Apex Exterior Emulsion 4L',
      customerSearch: 'Contractor, electrician, plumber or customer mobile...',
      customerNotes: 'e.g., Site delivery: Flat 402 / Plumber commission 5%',
      invoiceFooterNote: 'Goods once cut or tinted cannot be taken back. Replacement warranty on LED & Fans with bill copy.',
    },
    defaultUnit: 'piece',
    recommendedUnits: ['piece', 'meter', 'foot', 'sqft', 'kg', 'litre', 'box', 'bundle'],
    quickCategories: ['Pipes & PVC Fittings', 'Paints & Wall Primer', 'Wires, Switches & MCB', 'Hand & Power Tools', 'Screws, Nails & Fasteners', 'Sanitary & Water Taps', 'Cement & Adhesives', 'LED Bulbs & Battens'],
    sampleProducts: [
      { name: 'Asian Paints Apex Exterior Emulsion 4L', category: 'Paints & Wall Primer', unit: 'litre', selling_price: 135000, purchase_price: 112000, mrp: 155000, tax_rate: 18, barcode: '890107001' },
      { name: 'Supreme PVC Pipe 1-inch (10ft Length)', category: 'Pipes & PVC Fittings', unit: 'piece', selling_price: 24000, purchase_price: 19000, mrp: 28000, tax_rate: 18 },
      { name: 'Havells 9W Cool Daylight LED Bulb (B22)', category: 'LED Bulbs & Battens', unit: 'piece', selling_price: 9000, purchase_price: 6200, mrp: 14000, tax_rate: 18, warranty_period_months: 12, barcode: '890108001' },
      { name: 'Polycab 1.5 sq mm FR House Wire (90m Coil)', category: 'Wires, Switches & MCB', unit: 'box', selling_price: 185000, purchase_price: 155000, mrp: 220000, tax_rate: 18, barcode: '890108002' },
      { name: 'Stainless Steel Wood Screws 2-inch (Box of 100)', category: 'Screws, Nails & Fasteners', unit: 'box', selling_price: 18000, purchase_price: 12000, mrp: 22000, tax_rate: 18 },
      { name: 'Fevicol SH Synthetic Resin Adhesive 1kg', category: 'Cement & Adhesives', unit: 'piece', selling_price: 26000, purchase_price: 21500, mrp: 28000, tax_rate: 18, barcode: '890107002' },
    ],
  },

  // 5. 🍽️ RESTAURANT, CAFE & FOOD STALL
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant, Cafe & Fast Food',
    shortName: 'Cafe / Dine',
    iconName: 'UtensilsCrossed',
    emoji: '🍽️',
    tagline: 'Table orders, takeaway parcel, kitchen tokens & touch billing',
    description: 'Fast-paced food billing with Dine-In table selector, Parcel/Takeaway modes, KOT token generation, and no unnecessary barcode boxes.',
    accentColor: '#ea580c',
    badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
    modules: ['POS', 'INVENTORY', 'KHATA', 'CUSTOMERS', 'GST', 'RESTAURANT_ORDERS', 'KOT', 'EXPENSES', 'REPORTS'],
    featureToggles: {
      showBarcode: false, // Clean touch screen without barcode scanner box
      showWeightUnits: false,
      showBatchExpiry: false,
      showTableOrderType: true,
      showSizeVariants: false,
      showImeiWarranty: false,
      showDoctorPrescription: false,
      showKOTToken: true,
      hasBillScan: false,
    },
    placeholders: {
      searchProduct: 'Touch category or type Chai, Paneer, Dosa, Pizza...',
      newProductName: 'e.g., Paneer Butter Masala (Full) / Cold Coffee',
      customerSearch: 'Guest name or phone (optional for dine-in)...',
      customerNotes: 'e.g., Less spicy / Extra butter / Table 4 parcel',
      invoiceFooterNote: 'Thank you for dining with us! Hope you enjoyed the food. Please visit again.',
    },
    defaultUnit: 'plate',
    recommendedUnits: ['plate', 'portion', 'piece', 'packet', 'box'],
    quickCategories: ['Hot & Cold Beverages', 'Starters & Snacks', 'Main Course (Curries)', 'Roti, Naan & Rice', 'Fast Food & Pizzas', 'Desserts & Sweets'],
    sampleProducts: [
      { name: 'Special Masala Cutting Chai', category: 'Hot & Cold Beverages', unit: 'portion', selling_price: 2000, purchase_price: 800, mrp: 2000, tax_rate: 5 },
      { name: 'Paneer Butter Masala (Full)', category: 'Main Course (Curries)', unit: 'plate', selling_price: 22000, purchase_price: 11000, mrp: 22000, tax_rate: 5 },
      { name: 'Butter Tandoori Roti', category: 'Roti, Naan & Rice', unit: 'piece', selling_price: 2500, purchase_price: 800, mrp: 2500, tax_rate: 5 },
      { name: 'Crispy Veg Cheese Burger with Fries', category: 'Fast Food & Pizzas', unit: 'plate', selling_price: 12000, purchase_price: 5500, mrp: 12000, tax_rate: 5 },
      { name: 'Thick Cold Coffee with Chocolate Ice Cream', category: 'Hot & Cold Beverages', unit: 'portion', selling_price: 9000, purchase_price: 3500, mrp: 9000, tax_rate: 5 },
    ],
  },
};

/**
 * Legacy Type Aliases Mapper: Maps previous/auxiliary categories to one of the 5 Core Pillars
 */
const LEGACY_NICHE_MAP: Record<string, string> = {
  fmcg: 'grocery',
  bakery: 'restaurant',
  electrical: 'hardware',
  electronics: 'hardware',
  mobile: 'hardware',
  salon: 'grocery',
  stationery: 'grocery',
  services: 'hardware',
  other: 'grocery',
};

/**
 * Returns the StoreProfile configuration for a given business type,
 * safely resolving legacy categories to the 5 Core Pillars.
 */
export function getStoreProfile(businessType?: string | null): StoreProfile {
  if (!businessType) return STORE_PROFILES.grocery;
  if (STORE_PROFILES[businessType]) return STORE_PROFILES[businessType];
  const mapped = LEGACY_NICHE_MAP[businessType.toLowerCase()];
  if (mapped && STORE_PROFILES[mapped]) return STORE_PROFILES[mapped];
  return STORE_PROFILES.grocery;
}

/**
 * Checks if a specific module is enabled for a given business type or profile.
 */
export function hasModule(businessType: BusinessType | string | null | undefined, moduleId: ModuleId): boolean {
  const profile = getStoreProfile(businessType);
  return profile.modules ? profile.modules.includes(moduleId) : false;
}

/**
 * Checks if a specific module is enabled on a given StoreProfile.
 */
export function isModuleEnabled(profile: StoreProfile, moduleId: ModuleId): boolean {
  return profile.modules ? profile.modules.includes(moduleId) : false;
}

/**
 * Returns an ordered array of the 5 Flagship Core Indian Retail Store Profiles:
 * 1. Pharmacy / Medical
 * 2. Kirana / Grocery
 * 3. Clothing / Apparel
 * 4. Hardware / Sanitary / Electricals
 * 5. Restaurant / Cafe
 */
export function getAllStoreProfiles(): StoreProfile[] {
  return [
    STORE_PROFILES.pharmacy,
    STORE_PROFILES.grocery,
    STORE_PROFILES.clothing,
    STORE_PROFILES.hardware,
    STORE_PROFILES.restaurant,
  ];
}

/**
 * Returns recommended units for the given business type.
 */
export function getCategoryRecommendedUnits(businessType?: string | null): ProductUnit[] {
  const profile = getStoreProfile(businessType);
  return profile.recommendedUnits || ['piece', 'packet', 'kg', 'box'];
}

/**
 * Returns placeholder texts for the given business type.
 */
export function getCategoryPlaceholders(businessType?: string | null): StoreProfile['placeholders'] {
  const profile = getStoreProfile(businessType);
  return profile.placeholders;
}
