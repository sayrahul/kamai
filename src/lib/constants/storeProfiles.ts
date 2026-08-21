// Store Category Profiles Configuration for KamaiPlus (Kamai+)
// Defines dynamic UI fields, placeholders, feature toggles, quick category chips, and starter products per business niche.

import { BusinessType, ProductUnit } from '@/types';

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
  
  // Dynamic UI Feature Toggles
  featureToggles: {
    showBarcode: boolean; // False for restaurants/cafes, True for kirana/retail
    showWeightUnits: boolean; // kg, gram, litre for kirana/hardware
    showBatchExpiry: boolean; // Mandatory for pharmacy, optional for fmcg
    showTableOrderType: boolean; // True for restaurant: Dine-In, Takeaway, Delivery, Table #
    showSizeVariants: boolean; // True for clothing: S, M, L, XL, XXL, 32, 34
    showImeiWarranty: boolean; // True for electronics: IMEI/Serial & Warranty months
    showDoctorPrescription: boolean; // True for pharmacy
    showKOTToken: boolean; // True for restaurant
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
  quickCategories: string[];
  sampleProducts: StoreProfileProduct[];
}

export const STORE_PROFILES: Record<string, StoreProfile> = {
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
    featureToggles: {
      showBarcode: true,
      showWeightUnits: true,
      showBatchExpiry: false,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: false,
      showDoctorPrescription: false,
      showKOTToken: false,
    },
    placeholders: {
      searchProduct: 'Scan barcode or type Atta, Rice, Oil, Maggi...',
      newProductName: 'e.g., Aashirvaad Shudh Chakki Atta 5kg',
      customerSearch: 'Search regular customer name or 10-digit mobile...',
      customerNotes: 'e.g., Udhar payment promise date or home delivery address',
      invoiceFooterNote: 'Thank you for shopping with us! Please visit again.',
    },
    defaultUnit: 'kg',
    quickCategories: ['Atta, Rice & Dal', 'Spices & Cooking Oil', 'Dairy, Bread & Eggs', 'Biscuits & Snacks', 'Soaps & Detergents', 'Pooja & Agarbatti'],
    sampleProducts: [
      { name: 'Aashirvaad Shudh Chakki Atta 5kg', category: 'Atta, Rice & Dal', unit: 'piece', selling_price: 24500, purchase_price: 22000, mrp: 26000, tax_rate: 0, barcode: '890103001' },
      { name: 'Fortune Sunlite Refined Sunflower Oil 1L', category: 'Spices & Cooking Oil', unit: 'piece', selling_price: 14500, purchase_price: 13200, mrp: 16000, tax_rate: 5, barcode: '890103002' },
      { name: 'Premium Unpolished Toor Dal (Loose)', category: 'Atta, Rice & Dal', unit: 'kg', selling_price: 16000, purchase_price: 14000, mrp: 17500, tax_rate: 0, is_loose_item: true },
      { name: 'Tata Salt Vacuum Evaporated Iodized 1kg', category: 'Spices & Cooking Oil', unit: 'piece', selling_price: 2800, purchase_price: 2400, mrp: 2800, tax_rate: 0, barcode: '890103003' },
      { name: 'Nestle Maggi 2-Minute Masala Noodles 70g', category: 'Biscuits & Snacks', unit: 'piece', selling_price: 1400, purchase_price: 1200, mrp: 1400, tax_rate: 12, barcode: '890103004' },
    ],
  },

  pharmacy: {
    id: 'pharmacy' as any,
    name: 'Medical Store & Pharmacy',
    shortName: 'Medical',
    iconName: 'Pill',
    emoji: '💊',
    tagline: 'Batch numbers, expiry alerts, strip/tablet counts & doctor records',
    description: 'Compliant with Indian pharmaceutical standards with auto expiry tracking, batch coding, and prescription tags.',
    accentColor: '#0284c7',
    badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
    featureToggles: {
      showBarcode: true,
      showWeightUnits: false,
      showBatchExpiry: true,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: false,
      showDoctorPrescription: true,
      showKOTToken: false,
    },
    placeholders: {
      searchProduct: 'Type medicine name (Paracetamol, Cetirizine, Syrup)...',
      newProductName: 'e.g., Dolo 650mg Paracetamol (Strip of 15)',
      customerSearch: 'Patient name, WhatsApp number, or Doctor name...',
      customerNotes: 'e.g., Dr. Sharma prescription #894 / Dosage: 1 tab after food',
      invoiceFooterNote: 'Medicines once sold cannot be returned without original batch verification. Get well soon!',
    },
    defaultUnit: 'packet',
    quickCategories: ['Tablets & Capsules', 'Syrups & Suspensions', 'Injections & Vials', 'Ointments & Creams', 'First Aid & Bandages', 'Generic Medicines'],
    sampleProducts: [
      { name: 'Dolo 650mg Paracetamol Tablets (Strip of 15)', category: 'Tablets & Capsules', unit: 'packet', selling_price: 3200, purchase_price: 2400, mrp: 3400, tax_rate: 12, batch_number: 'BT-9921', expiry_date: '2027-12-31', barcode: '890104001' },
      { name: 'Azithral 500mg Tablets (Strip of 5)', category: 'Tablets & Capsules', unit: 'packet', selling_price: 11900, purchase_price: 9500, mrp: 13200, tax_rate: 12, batch_number: 'AZ-4412', expiry_date: '2026-10-31', barcode: '890104002' },
      { name: 'Benadryl Cough Formula Syrup 100ml', category: 'Syrups & Suspensions', unit: 'piece', selling_price: 13500, purchase_price: 11000, mrp: 14500, tax_rate: 12, batch_number: 'BN-8103', expiry_date: '2027-06-30', barcode: '890104003' },
      { name: 'Dettol Antiseptic Liquid 250ml', category: 'First Aid & Bandages', unit: 'piece', selling_price: 16500, purchase_price: 14000, mrp: 17500, tax_rate: 18, batch_number: 'DT-1102', expiry_date: '2028-05-31', barcode: '890104004' },
      { name: 'Volini Instant Pain Relief Spray 55g', category: 'Ointments & Creams', unit: 'piece', selling_price: 15000, purchase_price: 12500, mrp: 16000, tax_rate: 12, batch_number: 'VL-7782', expiry_date: '2026-11-30', barcode: '890104005' },
    ],
  },

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
    featureToggles: {
      showBarcode: false, // Clean touch screen without barcode scanner box!
      showWeightUnits: false,
      showBatchExpiry: false,
      showTableOrderType: true,
      showSizeVariants: false,
      showImeiWarranty: false,
      showDoctorPrescription: false,
      showKOTToken: true,
    },
    placeholders: {
      searchProduct: 'Touch category or type Chai, Paneer, Dosa, Pizza...',
      newProductName: 'e.g., Paneer Butter Masala (Full) / Cold Coffee',
      customerSearch: 'Guest name or phone (optional for dine-in)...',
      customerNotes: 'e.g., Less spicy / Extra butter / Table 4 parcel',
      invoiceFooterNote: 'Thank you for dining with us! Hope you enjoyed the food. Please visit again.',
    },
    defaultUnit: 'piece',
    quickCategories: ['Hot & Cold Beverages', 'Starters & Snacks', 'Main Course (Curries)', 'Roti, Naan & Rice', 'Fast Food & Pizzas', 'Desserts & Sweets'],
    sampleProducts: [
      { name: 'Special Masala Cutting Chai', category: 'Hot & Cold Beverages', unit: 'piece', selling_price: 2000, purchase_price: 800, mrp: 2000, tax_rate: 5 },
      { name: 'Paneer Butter Masala (Full)', category: 'Main Course (Curries)', unit: 'piece', selling_price: 22000, purchase_price: 11000, mrp: 22000, tax_rate: 5 },
      { name: 'Butter Tandoori Roti', category: 'Roti, Naan & Rice', unit: 'piece', selling_price: 2500, purchase_price: 800, mrp: 2500, tax_rate: 5 },
      { name: 'Crispy Veg Cheese Burger with Fries', category: 'Fast Food & Pizzas', unit: 'piece', selling_price: 12000, purchase_price: 5500, mrp: 12000, tax_rate: 5 },
      { name: 'Thick Cold Coffee with Chocolate Ice Cream', category: 'Hot & Cold Beverages', unit: 'piece', selling_price: 9000, purchase_price: 3500, mrp: 9000, tax_rate: 5 },
    ],
  },

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
    featureToggles: {
      showBarcode: true,
      showWeightUnits: false,
      showBatchExpiry: false,
      showTableOrderType: false,
      showSizeVariants: true,
      showImeiWarranty: false,
      showDoctorPrescription: false,
      showKOTToken: false,
    },
    placeholders: {
      searchProduct: 'Search Shirt, Jeans, Kurti, Shoes or scan tag...',
      newProductName: 'e.g., Men Pure Cotton Slim Fit Shirt (Size 40)',
      customerSearch: 'Customer name or WhatsApp number...',
      customerNotes: 'e.g., Alteration requested / Sleeve shortening 1 inch',
      invoiceFooterNote: 'Exchange permitted within 7 days with original bill and price tags intact. No cash refund.',
    },
    defaultUnit: 'piece',
    quickCategories: ['Men Shirts & T-Shirts', 'Women Kurtis & Sarees', 'Jeans & Trousers', 'Kids Wear', 'Shoes & Footwear', 'Innerwear & Accessories'],
    sampleProducts: [
      { name: 'Men Pure Cotton Casual Shirt', category: 'Men Shirts & T-Shirts', unit: 'piece', selling_price: 89900, purchase_price: 52000, mrp: 129900, tax_rate: 5, size: 'L (40)', color: 'Sky Blue', barcode: '890105001' },
      { name: 'Men Stretchable Slim Fit Jeans', category: 'Jeans & Trousers', unit: 'piece', selling_price: 139900, purchase_price: 85000, mrp: 199900, tax_rate: 12, size: '32', color: 'Dark Navy', barcode: '890105002' },
      { name: 'Women Printed Rayon Anarkali Kurti', category: 'Women Kurtis & Sarees', unit: 'piece', selling_price: 74900, purchase_price: 42000, mrp: 119900, tax_rate: 5, size: 'XL', color: 'Ruby Maroon', barcode: '890105003' },
      { name: 'Lightweight Breathable Running Shoes', category: 'Shoes & Footwear', unit: 'piece', selling_price: 159900, purchase_price: 95000, mrp: 229900, tax_rate: 12, size: 'UK 9', color: 'Charcoal Grey', barcode: '890105004' },
    ],
  },

  electronics: {
    id: 'electronics',
    name: 'Electronics & Mobile Store',
    shortName: 'Electronics',
    iconName: 'Smartphone',
    emoji: '📱',
    tagline: 'IMEI / Serial tracking, brand warranty & model accessories',
    description: 'Tailored for smartphone dealers and electronics retail with IMEI scan-on-bill, warranty periods, and serial tracking.',
    accentColor: '#2563eb',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    featureToggles: {
      showBarcode: true,
      showWeightUnits: false,
      showBatchExpiry: false,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: true,
      showDoctorPrescription: false,
      showKOTToken: false,
    },
    placeholders: {
      searchProduct: 'Scan IMEI barcode or type Neckband, Charger, Cable...',
      newProductName: 'e.g., boAt Rockerz 255 Pro+ Wireless Neckband',
      customerSearch: 'Customer phone for warranty tracking...',
      customerNotes: 'e.g., Handed over brand sealed box / Serial verified',
      invoiceFooterNote: 'Brand warranty service handled by authorized service centers. Please preserve this invoice copy.',
    },
    defaultUnit: 'piece',
    quickCategories: ['Smartphones & Tablets', 'Audio & Headphones', 'Fast Chargers & Cables', 'Smart Watches', 'Power Banks & Batteries', 'Computer & IT Accessories'],
    sampleProducts: [
      { name: 'boAt Rockerz 255 Pro+ Bluetooth Neckband', category: 'Audio & Headphones', unit: 'piece', selling_price: 129900, purchase_price: 95000, mrp: 299000, tax_rate: 18, warranty_period_months: 12, barcode: '890106001' },
      { name: '65W Fast Warp Type-C Braided Cable 1.2m', category: 'Fast Chargers & Cables', unit: 'piece', selling_price: 39900, purchase_price: 18000, mrp: 79900, tax_rate: 18, warranty_period_months: 6, barcode: '890106002' },
      { name: 'SanDisk Ultra 64GB MicroSD Class 10 Card', category: 'Computer & IT Accessories', unit: 'piece', selling_price: 49900, purchase_price: 34000, mrp: 95000, tax_rate: 18, warranty_period_months: 60, barcode: '890106003' },
      { name: '10000mAh Dual Output Fast Power Bank', category: 'Power Banks & Batteries', unit: 'piece', selling_price: 99900, purchase_price: 68000, mrp: 179900, tax_rate: 18, warranty_period_months: 12, barcode: '890106004' },
    ],
  },

  hardware: {
    id: 'hardware',
    name: 'Hardware & Sanitary Store',
    shortName: 'Hardware',
    iconName: 'Wrench',
    emoji: '🔩',
    tagline: 'Pcs/box/meter counts, plumbing, paints, tools & building fittings',
    description: 'Built for hardware, paint and sanitary shops with bulk box discounts, meter lengths, and contractor ledgers.',
    accentColor: '#475569',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    featureToggles: {
      showBarcode: true,
      showWeightUnits: true,
      showBatchExpiry: false,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: true,
      showDoctorPrescription: false,
      showKOTToken: false,
    },
    placeholders: {
      searchProduct: 'Search Paint, PVC Pipe, Screw, Drill, Tap...',
      newProductName: 'e.g., Asian Paints Apex Exterior Emulsion 4L',
      customerSearch: 'Contractor, plumber or customer mobile...',
      customerNotes: 'e.g., Site delivery: Flat 402 / Plumber commission 5%',
      invoiceFooterNote: 'Goods once cut or tinted cannot be taken back. Thank you for your business.',
    },
    defaultUnit: 'piece',
    quickCategories: ['Pipes & PVC Fittings', 'Paints & Wall Primer', 'Hand & Power Tools', 'Screws, Nails & Fasteners', 'Sanitary & Water Taps', 'Cement & Adhesives'],
    sampleProducts: [
      { name: 'Asian Paints Apex Exterior Emulsion 4L', category: 'Paints & Wall Primer', unit: 'litre', selling_price: 135000, purchase_price: 112000, mrp: 155000, tax_rate: 18, barcode: '890107001' },
      { name: 'Supreme PVC Pipe 1-inch (10ft Length)', category: 'Pipes & PVC Fittings', unit: 'piece', selling_price: 24000, purchase_price: 19000, mrp: 28000, tax_rate: 18 },
      { name: 'Stainless Steel Wood Screws 2-inch (Box of 100)', category: 'Screws, Nails & Fasteners', unit: 'box', selling_price: 18000, purchase_price: 12000, mrp: 22000, tax_rate: 18 },
      { name: 'Fevicol SH Synthetic Resin Adhesive 1kg', category: 'Cement & Adhesives', unit: 'piece', selling_price: 26000, purchase_price: 21500, mrp: 28000, tax_rate: 18, barcode: '890107002' },
    ],
  },

  electrical: {
    id: 'electrical' as any,
    name: 'Electrical & Lighting Store',
    shortName: 'Electrical',
    iconName: 'Zap',
    emoji: '⚡',
    tagline: 'Bulb wattages, wire bundles, modular switches & brand warranties',
    description: 'Optimized for electrical shops with wire coil lengths, bulb warranty tracking, and electrician contractor discounts.',
    accentColor: '#ca8a04',
    badgeBg: 'bg-amber-50 text-amber-900 border-amber-300',
    featureToggles: {
      showBarcode: true,
      showWeightUnits: true,
      showBatchExpiry: false,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: true,
      showDoctorPrescription: false,
      showKOTToken: false,
    },
    placeholders: {
      searchProduct: 'Search 9W Bulb, 1.5mm Wire, Switch, MCB...',
      newProductName: 'e.g., Havells 9W Cool Daylight LED Bulb (B22)',
      customerSearch: 'Customer or Electrician WhatsApp...',
      customerNotes: 'e.g., Electrician ref: Raju Bhai / Replacement warranty',
      invoiceFooterNote: '1-Year replacement warranty on LED bulbs and fans supported against manufacturing defects with bill copy.',
    },
    defaultUnit: 'piece',
    quickCategories: ['LED Bulbs & Battens', 'House Wires & Cables', 'Modular Switches & Sockets', 'Ceiling & Exhaust Fans', 'MCB & Distribution Boxes', 'Extension Boards'],
    sampleProducts: [
      { name: 'Havells 9W Cool Daylight LED Bulb (B22)', category: 'LED Bulbs & Battens', unit: 'piece', selling_price: 9000, purchase_price: 6200, mrp: 14000, tax_rate: 18, warranty_period_months: 12, barcode: '890108001' },
      { name: 'Polycab 1.5 sq mm FR House Wire (90m Coil)', category: 'House Wires & Cables', unit: 'box', selling_price: 185000, purchase_price: 155000, mrp: 220000, tax_rate: 18, barcode: '890108002' },
      { name: 'Anchor Roma 1-Way 6A Modular Switch', category: 'Modular Switches & Sockets', unit: 'piece', selling_price: 2800, purchase_price: 1800, mrp: 3500, tax_rate: 18 },
      { name: 'Crompton High-Speed 1200mm Ceiling Fan (Brown)', category: 'Ceiling & Exhaust Fans', unit: 'piece', selling_price: 189900, purchase_price: 145000, mrp: 249900, tax_rate: 18, warranty_period_months: 24, barcode: '890108003' },
    ],
  },

  fmcg: {
    id: 'fmcg' as any,
    name: 'FMCG & Supermarket',
    shortName: 'Supermarket',
    iconName: 'ShoppingBag',
    emoji: '🍫',
    tagline: 'Packaged foods, personal care, multi-barcodes & fast checkout',
    description: 'High-speed checkout for mini-marts and FMCG stores with multiple MRP variants and packaged goods.',
    accentColor: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    featureToggles: {
      showBarcode: true,
      showWeightUnits: true,
      showBatchExpiry: true,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: false,
      showDoctorPrescription: false,
      showKOTToken: false,
    },
    placeholders: {
      searchProduct: 'Scan barcode or search Dairy Milk, Shampoo, Juice...',
      newProductName: 'e.g., Cadbury Dairy Milk Silk Chocolate 150g',
      customerSearch: 'Customer mobile or loyalty number...',
      customerNotes: 'e.g., Birthday discount coupon applied / Free gift handed over',
      invoiceFooterNote: 'Thank you for shopping at our Supermarket! Check your bill for exciting savings.',
    },
    defaultUnit: 'piece',
    quickCategories: ['Packaged Foods', 'Chocolates & Confectionery', 'Personal Care & Soaps', 'Cold Drinks & Juices', 'Cleaning & Household', 'Baby Care & Diapers'],
    sampleProducts: [
      { name: 'Cadbury Dairy Milk Silk Chocolate 150g', category: 'Chocolates & Confectionery', unit: 'piece', selling_price: 17500, purchase_price: 14800, mrp: 18500, tax_rate: 18, barcode: '890109001' },
      { name: 'Head & Shoulders Smooth & Silky Shampoo 340ml', category: 'Personal Care & Soaps', unit: 'piece', selling_price: 34000, purchase_price: 28500, mrp: 38000, tax_rate: 18, barcode: '890109002' },
      { name: 'Real Fruit Power Mixed Fruit Juice 1L', category: 'Cold Drinks & Juices', unit: 'piece', selling_price: 12500, purchase_price: 10500, mrp: 14000, tax_rate: 12, barcode: '890109003' },
      { name: 'Surf Excel Quick Wash Detergent Powder 1kg', category: 'Cleaning & Household', unit: 'piece', selling_price: 14500, purchase_price: 12600, mrp: 15500, tax_rate: 18, barcode: '890109004' },
    ],
  },
};

/**
 * Returns the StoreProfile configuration for a given business type,
 * falling back safely to 'grocery' (Kirana) if not found.
 */
export function getStoreProfile(businessType?: string | null): StoreProfile {
  if (!businessType) return STORE_PROFILES.grocery;
  return STORE_PROFILES[businessType] || STORE_PROFILES.grocery;
}

/**
 * Returns an ordered array of all 8 primary store profiles for UI pickers.
 */
export function getAllStoreProfiles(): StoreProfile[] {
  return [
    STORE_PROFILES.grocery,
    STORE_PROFILES.pharmacy,
    STORE_PROFILES.restaurant,
    STORE_PROFILES.clothing,
    STORE_PROFILES.electronics,
    STORE_PROFILES.hardware,
    STORE_PROFILES.electrical,
    STORE_PROFILES.fmcg,
  ];
}
