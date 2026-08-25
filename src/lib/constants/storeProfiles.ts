// Store Category Profiles Configuration for KamaiPlus (Kamai+)
// Defines dynamic UI fields, modules, placeholders, feature toggles, quick category chips, and starter products per business niche.

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

  // Dynamic UI Feature Toggles (Maintained for backwards compatibility)
  featureToggles: {
    showBarcode: boolean; // False for restaurants/cafes, True for kirana/retail
    showWeightUnits: boolean; // kg, gram, litre for kirana/hardware
    showBatchExpiry: boolean; // Mandatory for pharmacy, optional for fmcg
    showTableOrderType: boolean; // True for restaurant: Dine-In, Takeaway, Delivery, Table #
    showSizeVariants: boolean; // True for clothing: S, M, L, XL, XXL, 32, 34
    showImeiWarranty: boolean; // True for electronics: IMEI/Serial & Warranty months
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

  pharmacy: {
    id: 'pharmacy',
    name: 'Medical Store & Pharmacy',
    shortName: 'Medical',
    iconName: 'Pill',
    emoji: '💊',
    tagline: 'Batch numbers, expiry alerts, strip/tablet counts & doctor records',
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
    modules: ['POS', 'INVENTORY', 'KHATA', 'CUSTOMERS', 'SUPPLIERS', 'GST', 'BARCODE', 'IMEI_SERIAL', 'WARRANTY', 'PURCHASES', 'EXPENSES', 'REPORTS'],
    featureToggles: {
      showBarcode: true,
      showWeightUnits: false,
      showBatchExpiry: false,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: true,
      showDoctorPrescription: false,
      showKOTToken: false,
      hasBillScan: true,
    },
    placeholders: {
      searchProduct: 'Scan IMEI barcode or type Neckband, Charger, Cable...',
      newProductName: 'e.g., boAt Rockerz 255 Pro+ Wireless Neckband',
      customerSearch: 'Customer phone for warranty tracking...',
      customerNotes: 'e.g., Handed over brand sealed box / Serial verified',
      invoiceFooterNote: 'Brand warranty service handled by authorized service centers. Please preserve this invoice copy.',
    },
    defaultUnit: 'piece',
    recommendedUnits: ['piece', 'box', 'set', 'packet'],
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
      searchProduct: 'Search Paint, PVC Pipe, Screw, Drill, Tap...',
      newProductName: 'e.g., Asian Paints Apex Exterior Emulsion 4L',
      customerSearch: 'Contractor, plumber or customer mobile...',
      customerNotes: 'e.g., Site delivery: Flat 402 / Plumber commission 5%',
      invoiceFooterNote: 'Goods once cut or tinted cannot be taken back. Thank you for your business.',
    },
    defaultUnit: 'piece',
    recommendedUnits: ['piece', 'meter', 'foot', 'sqft', 'kg', 'litre', 'box', 'bundle'],
    quickCategories: ['Pipes & PVC Fittings', 'Paints & Wall Primer', 'Hand & Power Tools', 'Screws, Nails & Fasteners', 'Sanitary & Water Taps', 'Cement & Adhesives'],
    sampleProducts: [
      { name: 'Asian Paints Apex Exterior Emulsion 4L', category: 'Paints & Wall Primer', unit: 'litre', selling_price: 135000, purchase_price: 112000, mrp: 155000, tax_rate: 18, barcode: '890107001' },
      { name: 'Supreme PVC Pipe 1-inch (10ft Length)', category: 'Pipes & PVC Fittings', unit: 'piece', selling_price: 24000, purchase_price: 19000, mrp: 28000, tax_rate: 18 },
      { name: 'Stainless Steel Wood Screws 2-inch (Box of 100)', category: 'Screws, Nails & Fasteners', unit: 'box', selling_price: 18000, purchase_price: 12000, mrp: 22000, tax_rate: 18 },
      { name: 'Fevicol SH Synthetic Resin Adhesive 1kg', category: 'Cement & Adhesives', unit: 'piece', selling_price: 26000, purchase_price: 21500, mrp: 28000, tax_rate: 18, barcode: '890107002' },
    ],
  },

  electrical: {
    id: 'electrical',
    name: 'Electrical & Lighting Store',
    shortName: 'Electrical',
    iconName: 'Zap',
    emoji: '⚡',
    tagline: 'Bulb wattages, wire bundles, modular switches & brand warranties',
    description: 'Optimized for electrical shops with wire coil lengths, bulb warranty tracking, and electrician contractor discounts.',
    accentColor: '#ca8a04',
    badgeBg: 'bg-amber-50 text-amber-900 border-amber-300',
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
      searchProduct: 'Search 9W Bulb, 1.5mm Wire, Switch, MCB...',
      newProductName: 'e.g., Havells 9W Cool Daylight LED Bulb (B22)',
      customerSearch: 'Customer or Electrician WhatsApp...',
      customerNotes: 'e.g., Electrician ref: Raju Bhai / Replacement warranty',
      invoiceFooterNote: '1-Year replacement warranty on LED bulbs and fans supported against manufacturing defects with bill copy.',
    },
    defaultUnit: 'piece',
    recommendedUnits: ['piece', 'meter', 'box', 'bundle', 'set'],
    quickCategories: ['LED Bulbs & Battens', 'House Wires & Cables', 'Modular Switches & Sockets', 'Ceiling & Exhaust Fans', 'MCB & Distribution Boxes', 'Extension Boards'],
    sampleProducts: [
      { name: 'Havells 9W Cool Daylight LED Bulb (B22)', category: 'LED Bulbs & Battens', unit: 'piece', selling_price: 9000, purchase_price: 6200, mrp: 14000, tax_rate: 18, warranty_period_months: 12, barcode: '890108001' },
      { name: 'Polycab 1.5 sq mm FR House Wire (90m Coil)', category: 'House Wires & Cables', unit: 'box', selling_price: 185000, purchase_price: 155000, mrp: 220000, tax_rate: 18, barcode: '890108002' },
      { name: 'Anchor Roma 1-Way 6A Modular Switch', category: 'Modular Switches & Sockets', unit: 'piece', selling_price: 2800, purchase_price: 1800, mrp: 3500, tax_rate: 18 },
      { name: 'Crompton High-Speed 1200mm Ceiling Fan (Brown)', category: 'Ceiling & Exhaust Fans', unit: 'piece', selling_price: 189900, purchase_price: 145000, mrp: 249900, tax_rate: 18, warranty_period_months: 24, barcode: '890108003' },
    ],
  },

  fmcg: {
    id: 'fmcg',
    name: 'FMCG & Supermarket',
    shortName: 'Supermarket',
    iconName: 'ShoppingBag',
    emoji: '🍫',
    tagline: 'Packaged foods, personal care, multi-barcodes & fast checkout',
    description: 'High-speed checkout for mini-marts and FMCG stores with multiple MRP variants and packaged goods.',
    accentColor: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    modules: ['POS', 'INVENTORY', 'KHATA', 'CUSTOMERS', 'SUPPLIERS', 'GST', 'BARCODE', 'WEIGHT', 'BATCH_EXPIRY', 'PURCHASES', 'EXPENSES', 'REPORTS'],
    featureToggles: {
      showBarcode: true,
      showWeightUnits: true,
      showBatchExpiry: true,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: false,
      showDoctorPrescription: false,
      showKOTToken: false,
      hasBillScan: true,
    },
    placeholders: {
      searchProduct: 'Scan barcode or search Dairy Milk, Shampoo, Juice...',
      newProductName: 'e.g., Cadbury Dairy Milk Silk Chocolate 150g',
      customerSearch: 'Customer mobile or loyalty number...',
      customerNotes: 'e.g., Birthday discount coupon applied / Free gift handed over',
      invoiceFooterNote: 'Thank you for shopping at our Supermarket! Check your bill for exciting savings.',
    },
    defaultUnit: 'packet',
    recommendedUnits: ['packet', 'piece', 'box', 'kg', 'litre', 'ml', 'dozen'],
    quickCategories: ['Packaged Foods', 'Chocolates & Confectionery', 'Personal Care & Soaps', 'Cold Drinks & Juices', 'Cleaning & Household', 'Baby Care & Diapers'],
    sampleProducts: [
      { name: 'Cadbury Dairy Milk Silk Chocolate 150g', category: 'Chocolates & Confectionery', unit: 'piece', selling_price: 17500, purchase_price: 14800, mrp: 18500, tax_rate: 18, barcode: '890109001' },
      { name: 'Head & Shoulders Smooth & Silky Shampoo 340ml', category: 'Personal Care & Soaps', unit: 'piece', selling_price: 34000, purchase_price: 28500, mrp: 38000, tax_rate: 18, barcode: '890109002' },
      { name: 'Real Fruit Power Mixed Fruit Juice 1L', category: 'Cold Drinks & Juices', unit: 'piece', selling_price: 12500, purchase_price: 10500, mrp: 14000, tax_rate: 12, barcode: '890109003' },
      { name: 'Surf Excel Quick Wash Detergent Powder 1kg', category: 'Cleaning & Household', unit: 'piece', selling_price: 14500, purchase_price: 12600, mrp: 15500, tax_rate: 18, barcode: '890109004' },
    ],
  },

  bakery: {
    id: 'bakery',
    name: 'Bakery & Sweet Shop',
    shortName: 'Bakery / Mithai',
    iconName: 'Sparkles',
    emoji: '🧁',
    tagline: 'Fresh bakes, custom cakes, mithai boxes & weight billing',
    description: 'Specialized for bakeries, pastry shops, and Indian sweet marts with custom cake messages, box sets, and expiry monitoring.',
    accentColor: '#d97706',
    badgeBg: 'bg-amber-50 text-amber-900 border-amber-300',
    modules: ['POS', 'INVENTORY', 'KHATA', 'CUSTOMERS', 'GST', 'WEIGHT', 'BATCH_EXPIRY', 'EXPENSES', 'REPORTS'],
    featureToggles: {
      showBarcode: true,
      showWeightUnits: true,
      showBatchExpiry: true,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: false,
      showDoctorPrescription: false,
      showKOTToken: false,
      hasBillScan: true,
    },
    placeholders: {
      searchProduct: 'Search Black Forest Cake, Kaju Katli, Bread, Cookies...',
      newProductName: 'e.g., Fresh Cream Pineapple Cake (500g)',
      customerSearch: 'Customer mobile for cake advance booking...',
      customerNotes: 'e.g., Cake Message: "Happy 10th Birthday Aarav!"',
      invoiceFooterNote: 'Freshly baked with love! Consume cream cakes within 24 hours. Keep refrigerated.',
    },
    defaultUnit: 'piece',
    recommendedUnits: ['piece', 'kg', 'gram', 'box', 'packet'],
    quickCategories: ['Fresh Birthday Cakes', 'Pastries & Desserts', 'Breads & Buns', 'Indian Sweets & Mithai', 'Cookies & Biscuits', 'Snacks & Patties'],
    sampleProducts: [
      { name: 'Fresh Cream Dutch Chocolate Cake 500g', category: 'Fresh Birthday Cakes', unit: 'piece', selling_price: 45000, purchase_price: 22000, mrp: 45000, tax_rate: 18, expiry_date: '2026-08-28' },
      { name: 'Kaju Katli Premium Sweets (Box of 500g)', category: 'Indian Sweets & Mithai', unit: 'box', selling_price: 48000, purchase_price: 36000, mrp: 52000, tax_rate: 5 },
      { name: 'Brown Bread Loaf 400g', category: 'Breads & Buns', unit: 'piece', selling_price: 5000, purchase_price: 3800, mrp: 5000, tax_rate: 0 },
      { name: 'Veg Cheese Baked Patties', category: 'Snacks & Patties', unit: 'piece', selling_price: 3500, purchase_price: 1800, mrp: 3500, tax_rate: 5 },
    ],
  },

  stationery: {
    id: 'stationery',
    name: 'Stationery & Book Store',
    shortName: 'Stationery',
    iconName: 'BookOpen',
    emoji: '📚',
    tagline: 'Notebooks, pens, school supplies, xerox & office goods',
    description: 'Optimized for book shops, school stationery counters, and photocopy centers with packet sets and barcode tagging.',
    accentColor: '#0891b2',
    badgeBg: 'bg-cyan-50 text-cyan-900 border-cyan-300',
    modules: ['POS', 'INVENTORY', 'KHATA', 'CUSTOMERS', 'SUPPLIERS', 'GST', 'BARCODE', 'PURCHASES', 'EXPENSES', 'REPORTS'],
    featureToggles: {
      showBarcode: true,
      showWeightUnits: false,
      showBatchExpiry: false,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: false,
      showDoctorPrescription: false,
      showKOTToken: false,
      hasBillScan: true,
    },
    placeholders: {
      searchProduct: 'Search Classmate Notebook, Pen, Register, File...',
      newProductName: 'e.g., Classmate Long Book 172 Pages (Ruled)',
      customerSearch: 'Student / Parent / School WhatsApp...',
      customerNotes: 'e.g., School book set for Standard 8th CBSE',
      invoiceFooterNote: 'Thank you for your purchase! All the best for your studies.',
    },
    defaultUnit: 'piece',
    recommendedUnits: ['piece', 'packet', 'box', 'set', 'dozen'],
    quickCategories: ['Notebooks & Registers', 'Pens, Pencils & Erasers', 'Office Files & Folders', 'Art & Craft Materials', 'School Bag & Bottles', 'Calculators & Geometry'],
    sampleProducts: [
      { name: 'Classmate Long Notebook 172 Pages', category: 'Notebooks & Registers', unit: 'piece', selling_price: 6500, purchase_price: 4800, mrp: 7000, tax_rate: 12, barcode: '890110001' },
      { name: 'Reynolds 045 Fine Carabine Blue Pen (Box of 20)', category: 'Pens, Pencils & Erasers', unit: 'box', selling_price: 18000, purchase_price: 14000, mrp: 20000, tax_rate: 18, barcode: '890110002' },
      { name: 'Camlin Kokuyo 24 Shades Oil Pastels', category: 'Art & Craft Materials', unit: 'box', selling_price: 14000, purchase_price: 11000, mrp: 15000, tax_rate: 12, barcode: '890110003' },
    ],
  },

  salon: {
    id: 'salon',
    name: 'Salon, Spa & Beauty Care',
    shortName: 'Salon & Spa',
    iconName: 'Scissors',
    emoji: '✂️',
    tagline: 'Service packages, hair styling, skin treatments & staff commissions',
    description: 'Designed for beauty salons and spas with service billing, packages, staff commission tracking, and client appointment notes.',
    accentColor: '#db2777',
    badgeBg: 'bg-pink-50 text-pink-900 border-pink-300',
    modules: ['POS', 'INVENTORY', 'KHATA', 'CUSTOMERS', 'GST', 'EXPENSES', 'REPORTS'],
    featureToggles: {
      showBarcode: false,
      showWeightUnits: false,
      showBatchExpiry: false,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: false,
      showDoctorPrescription: false,
      showKOTToken: false,
      hasBillScan: false,
    },
    placeholders: {
      searchProduct: 'Search Haircut, Facial, Bleach, Keratin, Spa...',
      newProductName: 'e.g., Deluxe Hydra Facial / Gold Hair Spa',
      customerSearch: 'Client name or phone for appointment records...',
      customerNotes: 'e.g., Stylist: Priya / Skin allergy note: Sensitive skin',
      invoiceFooterNote: 'Thank you for visiting! Look good, feel amazing. See you again soon.',
    },
    defaultUnit: 'custom',
    recommendedUnits: ['custom', 'portion', 'piece', 'set'],
    quickCategories: ['Hair Styling & Cuts', 'Facials & Skin Cleanups', 'Hair Spa & Keratin', 'Bridal & Party Makeup', 'Manicure & Pedicure', 'Retail Hair Products'],
    sampleProducts: [
      { name: 'Gentlemen Executive Haircut & Beard Grooming', category: 'Hair Styling & Cuts', unit: 'custom', selling_price: 35000, purchase_price: 0, mrp: 35000, tax_rate: 18 },
      { name: 'O3+ Bridal Glow Luxury Facial', category: 'Facials & Skin Cleanups', unit: 'custom', selling_price: 249900, purchase_price: 55000, mrp: 249900, tax_rate: 18 },
      { name: 'L\'Oreal Professionnel Hair Spa 500ml Retail', category: 'Retail Hair Products', unit: 'piece', selling_price: 75000, purchase_price: 52000, mrp: 85000, tax_rate: 18 },
    ],
  },

  mobile: {
    id: 'mobile',
    name: 'Mobile Phone & Accessories',
    shortName: 'Mobile Store',
    iconName: 'Smartphone',
    emoji: '📱',
    tagline: 'Handsets, tempered glass, covers, repairs & IMEI invoices',
    description: 'Specialized for smartphone stores, mobile repair desks, and accessory hubs with IMEI scan-on-bill and repair tokens.',
    accentColor: '#2563eb',
    badgeBg: 'bg-blue-50 text-blue-900 border-blue-300',
    modules: ['POS', 'INVENTORY', 'KHATA', 'CUSTOMERS', 'SUPPLIERS', 'GST', 'BARCODE', 'IMEI_SERIAL', 'WARRANTY', 'PURCHASES', 'EXPENSES', 'REPORTS'],
    featureToggles: {
      showBarcode: true,
      showWeightUnits: false,
      showBatchExpiry: false,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: true,
      showDoctorPrescription: false,
      showKOTToken: false,
      hasBillScan: true,
    },
    placeholders: {
      searchProduct: 'Scan IMEI or search Cover, Cable, Earphone, Display...',
      newProductName: 'e.g., 9D Gorilla Tempered Glass for iPhone 15',
      customerSearch: 'Customer phone for repair / warranty tracking...',
      customerNotes: 'e.g., Handset under display replacement / PIN: 1234',
      invoiceFooterNote: 'All mobile handsets covered under brand manufacturer warranty. Preserve bill copy.',
    },
    defaultUnit: 'piece',
    recommendedUnits: ['piece', 'box', 'set', 'packet'],
    quickCategories: ['Smartphones', 'Tempered Glass & Covers', 'Chargers & USB Cables', 'Bluetooth & Earphones', 'Screen Guards & Skins', 'Mobile Repair & Parts'],
    sampleProducts: [
      { name: '9D Full Glue Curved Tempered Glass', category: 'Tempered Glass & Covers', unit: 'piece', selling_price: 19900, purchase_price: 4500, mrp: 49900, tax_rate: 18 },
      { name: 'Fast 20W Type-C Power Adapter', category: 'Chargers & USB Cables', unit: 'piece', selling_price: 69900, purchase_price: 28000, mrp: 129900, tax_rate: 18, warranty_period_months: 6 },
    ],
  },

  services: {
    id: 'services',
    name: 'Professional & Repair Services',
    shortName: 'Services / Repair',
    iconName: 'Wrench',
    emoji: '🛠️',
    tagline: 'Service charges, labor fees, replacement parts & AMC bills',
    description: 'Tailored for repair workshops, technicians, plumbers, electricians, and consulting services with customized hourly or fixed job billing.',
    accentColor: '#64748b',
    badgeBg: 'bg-slate-100 text-slate-900 border-slate-300',
    modules: ['POS', 'INVENTORY', 'KHATA', 'CUSTOMERS', 'GST', 'EXPENSES', 'REPORTS'],
    featureToggles: {
      showBarcode: false,
      showWeightUnits: false,
      showBatchExpiry: false,
      showTableOrderType: false,
      showSizeVariants: false,
      showImeiWarranty: true,
      showDoctorPrescription: false,
      showKOTToken: false,
      hasBillScan: false,
    },
    placeholders: {
      searchProduct: 'Search AC Service, Repair Charge, Inspection...',
      newProductName: 'e.g., Split AC Jet Pump Cleaning & Gas Top-up',
      customerSearch: 'Client name or site address / mobile...',
      customerNotes: 'e.g., 30 Days service warranty / Technician: Vikas',
      invoiceFooterNote: 'Thank you for trusting our service. 30-Day warranty applicable on repair workmanship.',
    },
    defaultUnit: 'custom',
    recommendedUnits: ['custom', 'piece', 'set'],
    quickCategories: ['Inspection & Visiting Fee', 'Appliance Repair Labor', 'Spare Parts & Materials', 'AMC Annual Contracts', 'Installation & Fitting'],
    sampleProducts: [
      { name: 'Split AC Deep Cleaning & Servicing', category: 'Appliance Repair Labor', unit: 'custom', selling_price: 59900, purchase_price: 0, mrp: 79900, tax_rate: 18 },
      { name: 'Home Electrician Visit & Diagnostics', category: 'Inspection & Visiting Fee', unit: 'custom', selling_price: 25000, purchase_price: 0, mrp: 25000, tax_rate: 18 },
    ],
  },

  other: {
    id: 'other',
    name: 'General Business & Retail',
    shortName: 'General Store',
    iconName: 'Store',
    emoji: '🏪',
    tagline: 'Versatile retail billing, custom inventory & customer khata',
    description: 'Versatile all-in-one configuration suitable for gift shops, toys, sports goods, pet supplies, and general trading.',
    accentColor: '#334155',
    badgeBg: 'bg-slate-100 text-slate-900 border-slate-300',
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
      searchProduct: 'Scan barcode or type item name...',
      newProductName: 'e.g., Premium Gift Item / Custom Product',
      customerSearch: 'Customer name or 10-digit mobile...',
      customerNotes: 'e.g., Special instructions or delivery address',
      invoiceFooterNote: 'Thank you for your business! Please visit again.',
    },
    defaultUnit: 'piece',
    recommendedUnits: ['piece', 'box', 'packet', 'set', 'kg', 'dozen'],
    quickCategories: ['General Items', 'Gifts & Toys', 'Accessories', 'Special Offers'],
    sampleProducts: [
      { name: 'Premium Decorative Gift Hamper', category: 'Gifts & Toys', unit: 'piece', selling_price: 89900, purchase_price: 45000, mrp: 99900, tax_rate: 18 },
      { name: 'Multi-Utility Storage Container Set', category: 'General Items', unit: 'set', selling_price: 45000, purchase_price: 28000, mrp: 59900, tax_rate: 18 },
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
 * Returns an ordered array of primary store profiles for UI pickers, settings and onboarding.
 * Prioritizes the 5 flagship Indian retail categories: Pharmacy, Kirana, Clothing, Hardware, Restaurant.
 */
export function getAllStoreProfiles(): StoreProfile[] {
  return [
    STORE_PROFILES.pharmacy,
    STORE_PROFILES.grocery,
    STORE_PROFILES.clothing,
    STORE_PROFILES.hardware,
    STORE_PROFILES.restaurant,
    STORE_PROFILES.electronics,
    STORE_PROFILES.other,
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
