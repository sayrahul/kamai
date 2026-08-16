import Dexie, { Table } from 'dexie';
import {
  Business,
  Product,
  Category,
  Customer,
  Supplier,
  Sale,
  InventoryMovement,
  LedgerTransaction,
  CashRegister,
  CashExpense,
  SalesReturn,
  MarketingTemplate,
  AuditLog,
  BusinessType,
} from '@/types';

export class VyaparSetuDatabase extends Dexie {
  businesses!: Table<Business, string>;
  categories!: Table<Category, string>;
  products!: Table<Product, string>;
  customers!: Table<Customer, string>;
  suppliers!: Table<Supplier, string>;
  sales!: Table<Sale, string>;
  inventory_movements!: Table<InventoryMovement, string>;
  ledger_transactions!: Table<LedgerTransaction, string>;
  cash_registers!: Table<CashRegister, string>;
  cash_expenses!: Table<CashExpense, string>;
  sales_returns!: Table<SalesReturn, string>;
  marketing_templates!: Table<MarketingTemplate, string>;
  audit_logs!: Table<AuditLog, string>;

  constructor() {
    super('VyaparSetuDB');
    
    this.version(2).stores({
      businesses: 'id, name, business_type, phone, created_at',
      categories: 'id, business_id, name, created_at',
      products: 'id, business_id, name, barcode, category_id, is_active, is_favorite, current_stock, min_stock_level',
      customers: 'id, business_id, name, phone, current_balance, customer_type, last_visit_date',
      suppliers: 'id, business_id, name, phone, current_balance',
      sales: 'id, business_id, invoice_number, customer_id, payment_method, status, created_at',
      inventory_movements: 'id, business_id, product_id, movement_type, reference_id, created_at',
      ledger_transactions: 'id, business_id, party_type, party_id, transaction_type, created_at',
      cash_registers: 'id, business_id, status, opened_at, closed_at',
      cash_expenses: 'id, business_id, category, payment_mode, created_at',
      sales_returns: 'id, business_id, return_number, original_sale_id, original_invoice_number, customer_id, created_at',
      marketing_templates: 'id, category, language, is_custom',
      audit_logs: 'id, business_id, action, entity_type, entity_id, created_at',
    });
  }
}

export const db = new VyaparSetuDatabase();

import { seedComprehensiveDemoData } from './demoData';
export { seedComprehensiveDemoData };

// Auto-seed demo starter business if DB is empty
export async function ensureStarterBusinessIfEmpty(): Promise<Business> {
  const existing = await db.businesses.toCollection().first();
  if (existing) {
    // Check if catalog needs demo data enrichment (e.g. less than 15 products)
    const productCount = await db.products.where('business_id').equals(existing.id).count();
    if (productCount < 15) {
      await seedComprehensiveDemoData(existing.id, false);
    }
    return existing;
  }

  const businessId = `biz_${Date.now()}`;
  const now = new Date().toISOString();

  const starterBiz: Business = {
    id: businessId,
    name: 'Sharma Kirana Store (Kamai+)',
    business_type: 'grocery',
    owner_name: 'Ramesh Sharma',
    phone: '9876543210',
    address: 'Shop 12, Main Market, Mumbai',
    pincode: '400001',
    gstin: '27AAAAA0000A1Z5',
    upi_id: 'sharma.kirana@upi',
    currency: 'INR',
    language: 'hi',
    invoice_prefix: 'INV-',
    next_invoice_number: 1001,
    terms_conditions: 'Thank you for your business! Goods once sold will be exchanged within 7 days.',
    footer_message: 'Powered by KamaiPlus (Kamai+)',
    is_onboarded: true,
    created_at: now,
    updated_at: now,
    sync_status: 'synced',
  };

  await db.businesses.put(starterBiz);
  await seedComprehensiveDemoData(businessId, false);
  return starterBiz;
}

// Default Category & Sample Product Seeder per business type
export async function seedBusinessStarterData(businessId: string, businessType: BusinessType) {
  const now = new Date().toISOString();

  // 1. Starter Categories
  const categoryTemplates: Partial<Record<BusinessType, Array<{ name: string; icon: string }>>> = {
    grocery: [
      { name: 'Grains & Atta', icon: 'wheat' },
      { name: 'Dairy & Milk', icon: 'milk' },
      { name: 'Edible Oils & Ghee', icon: 'droplet' },
      { name: 'Snacks & Biscuits', icon: 'cookie' },
      { name: 'Personal Care & Soaps', icon: 'sparkles' },
      { name: 'Cleaning & Detergents', icon: 'spray' },
    ],
    clothing: [
      { name: 'Men Shirts & T-Shirts', icon: 'shirt' },
      { name: 'Women Sarees & Kurtis', icon: 'sparkles' },
      { name: 'Kids Wear', icon: 'baby' },
      { name: 'Footwear & Sandals', icon: 'footprints' },
      { name: 'Fabrics & Unstitched', icon: 'scissors' },
    ],
    electronics: [
      { name: 'Smartphones & Mobiles', icon: 'smartphone' },
      { name: 'Mobile Accessories & Covers', icon: 'headphones' },
      { name: 'Cables & Chargers', icon: 'cable' },
      { name: 'Audio & Bluetooth Speakers', icon: 'speaker' },
      { name: 'Repairing Parts & Services', icon: 'wrench' },
    ],
    mobile: [
      { name: 'Smartphones & Mobiles', icon: 'smartphone' },
      { name: 'Mobile Accessories & Covers', icon: 'headphones' },
      { name: 'Cables & Chargers', icon: 'cable' },
      { name: 'Audio & Earphones', icon: 'speaker' },
      { name: 'Recharge & Services', icon: 'wrench' },
    ],
    bakery: [
      { name: 'Fresh Breads & Buns', icon: 'sandwich' },
      { name: 'Cakes & Pastries', icon: 'cake' },
      { name: 'Cookies & Khari', icon: 'cookie' },
      { name: 'Indian Sweets (Mithai)', icon: 'sparkles' },
      { name: 'Cold Drinks & Shakes', icon: 'cup-soda' },
    ],
    restaurant: [
      { name: 'Thali & Meals', icon: 'utensils' },
      { name: 'Fast Food & Snacks', icon: 'sandwich' },
      { name: 'Beverages & Chai', icon: 'coffee' },
      { name: 'Desserts & Sweets', icon: 'ice-cream' },
    ],
    hardware: [
      { name: 'Hand Tools & Drills', icon: 'wrench' },
      { name: 'Paints & Brushes', icon: 'paint-roller' },
      { name: 'Pipes & Sanitary fittings', icon: 'pipe' },
      { name: 'Electrical Wires & Switches', icon: 'zap' },
      { name: 'Nuts, Bolts & Screws', icon: 'nut' },
    ],
    stationery: [
      { name: 'Notebooks & Registers', icon: 'book' },
      { name: 'Pens & Pencils', icon: 'pen' },
      { name: 'Office Files & Folders', icon: 'folder' },
      { name: 'Art & Craft Supplies', icon: 'palette' },
      { name: 'School Bags & Pouches', icon: 'backpack' },
    ],
    salon: [
      { name: 'Hair Cut & Styling', icon: 'scissors' },
      { name: 'Shaving & Beard Grooming', icon: 'sparkles' },
      { name: 'Facial & Skin Care', icon: 'smile' },
      { name: 'Hair Color & Spa', icon: 'droplet' },
      { name: 'Beauty Products', icon: 'package' },
    ],
    services: [
      { name: 'General Labor & Repair', icon: 'wrench' },
      { name: 'Inspection & Diagnosis', icon: 'search' },
      { name: 'Parts Replacement', icon: 'cpu' },
      { name: 'Annual Maintenance (AMC)', icon: 'shield-check' },
    ],
    other: [
      { name: 'General Products', icon: 'package' },
      { name: 'Custom Services', icon: 'briefcase' },
    ],
  };

  const categoriesToSeed = categoryTemplates[businessType] || categoryTemplates.grocery || [];
  const createdCategoryIds: string[] = [];

  for (let i = 0; i < categoriesToSeed.length; i++) {
    const catId = `cat_${Date.now()}_${i}`;
    await db.categories.put({
      id: catId,
      business_id: businessId,
      name: categoriesToSeed[i].name,
      icon: categoriesToSeed[i].icon,
      created_at: now,
    });
    createdCategoryIds.push(catId);
  }

  // 2. Sample Products for Kirana / Grocery
  if (businessType === 'grocery' || !categoryTemplates[businessType]) {
    const sampleGroceryProducts: Array<Omit<Product, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'sync_status'>> = [
      {
        name: 'Aashirvaad Shudh Chakki Atta 5kg',
        barcode: '890103000001',
        category_id: createdCategoryIds[0] || 'cat_grains',
        category_name: 'Grains & Atta',
        selling_price: 24500, // ₹245.00
        purchase_price: 21500, // ₹215.00
        mrp: 26000, // ₹260.00
        unit: 'packet',
        current_stock: 45,
        min_stock_level: 10,
        tax_rate: 0,
        is_tax_inclusive: true,
        hsn_code: '1101',
        is_active: true,
        is_favorite: true,
      },
      {
        name: 'Fortune Sunlite Sunflower Oil 1L Pouch',
        barcode: '890103000002',
        category_id: createdCategoryIds[2] || 'cat_oils',
        category_name: 'Edible Oils & Ghee',
        selling_price: 13500, // ₹135.00
        purchase_price: 12000, // ₹120.00
        mrp: 15500, // ₹155.00
        unit: 'packet',
        current_stock: 60,
        min_stock_level: 15,
        tax_rate: 5,
        is_tax_inclusive: true,
        hsn_code: '1512',
        is_active: true,
        is_favorite: true,
      },
      {
        name: 'Amul Taaza Homogenised Milk 1L',
        barcode: '890103000003',
        category_id: createdCategoryIds[1] || 'cat_dairy',
        category_name: 'Dairy & Milk',
        selling_price: 7400, // ₹74.00
        purchase_price: 6800, // ₹68.00
        mrp: 7500, // ₹75.00
        unit: 'packet',
        current_stock: 25,
        min_stock_level: 8,
        tax_rate: 0,
        is_tax_inclusive: true,
        hsn_code: '0401',
        is_active: true,
        is_favorite: true,
      },
      {
        name: 'Tata Salt Vacuum Evaporated 1kg',
        barcode: '890103000004',
        category_id: createdCategoryIds[0] || 'cat_grains',
        category_name: 'Grains & Atta',
        selling_price: 2800, // ₹28.00
        purchase_price: 2300, // ₹23.00
        mrp: 3000, // ₹30.00
        unit: 'packet',
        current_stock: 100,
        min_stock_level: 20,
        tax_rate: 0,
        is_tax_inclusive: true,
        hsn_code: '2501',
        is_active: true,
        is_favorite: true,
      },
      {
        name: 'Parle-G Gold Biscuits 1kg Family Pack',
        barcode: '890103000005',
        category_id: createdCategoryIds[3] || 'cat_snacks',
        category_name: 'Snacks & Biscuits',
        selling_price: 11000, // ₹110.00
        purchase_price: 9500, // ₹95.00
        mrp: 12000, // ₹120.00
        unit: 'packet',
        current_stock: 35,
        min_stock_level: 10,
        tax_rate: 18,
        is_tax_inclusive: true,
        hsn_code: '1905',
        is_active: true,
        is_favorite: true,
      },
      {
        name: 'Maggi 2-Minute Masala Noodles 420g (Pack of 6)',
        barcode: '890103000006',
        category_id: createdCategoryIds[3] || 'cat_snacks',
        category_name: 'Snacks & Biscuits',
        selling_price: 8800, // ₹88.00
        purchase_price: 7600, // ₹76.00
        mrp: 9600, // ₹96.00
        unit: 'packet',
        current_stock: 40,
        min_stock_level: 10,
        tax_rate: 18,
        is_tax_inclusive: true,
        hsn_code: '1902',
        is_active: true,
        is_favorite: true,
      },
      {
        name: 'Dettol Original Soap 125g (Buy 3 Get 1 Free)',
        barcode: '890103000007',
        category_id: createdCategoryIds[4] || 'cat_personal',
        category_name: 'Personal Care & Soaps',
        selling_price: 17500, // ₹175.00
        purchase_price: 15000, // ₹150.00
        mrp: 19500, // ₹195.00
        unit: 'packet',
        current_stock: 18,
        min_stock_level: 5,
        tax_rate: 18,
        is_tax_inclusive: true,
        hsn_code: '3401',
        is_active: true,
        is_favorite: false,
      },
      {
        name: 'Surf Excel Quick Wash Detergent Powder 1kg',
        barcode: '890103000008',
        category_id: createdCategoryIds[5] || 'cat_cleaning',
        category_name: 'Cleaning & Detergents',
        selling_price: 15500, // ₹155.00
        purchase_price: 13500, // ₹135.00
        mrp: 17000, // ₹170.00
        unit: 'packet',
        current_stock: 30,
        min_stock_level: 8,
        tax_rate: 18,
        is_tax_inclusive: true,
        hsn_code: '3402',
        is_active: true,
        is_favorite: false,
      },
      {
        name: 'Sugar / Chini (Loose / Packaged)',
        barcode: '890103000009',
        category_id: createdCategoryIds[0] || 'cat_grains',
        category_name: 'Grains & Atta',
        selling_price: 4400, // ₹44.00/kg
        purchase_price: 3800, // ₹38.00/kg
        mrp: 4800, // ₹48.00
        unit: 'kg',
        current_stock: 250,
        min_stock_level: 50,
        tax_rate: 5,
        is_tax_inclusive: true,
        hsn_code: '1701',
        is_active: true,
        is_favorite: true,
      },
      {
        name: 'Toor Dal / Arhar Dal Super Premium',
        barcode: '890103000010',
        category_id: createdCategoryIds[0] || 'cat_grains',
        category_name: 'Grains & Atta',
        selling_price: 16500, // ₹165.00/kg
        purchase_price: 14500, // ₹145.00/kg
        mrp: 18000, // ₹180.00
        unit: 'kg',
        current_stock: 120,
        min_stock_level: 25,
        tax_rate: 0,
        is_tax_inclusive: true,
        hsn_code: '0713',
        is_active: true,
        is_favorite: true,
      }
    ];

    for (let p = 0; p < sampleGroceryProducts.length; p++) {
      const prodId = `prod_${Date.now()}_${p}`;
      await db.products.put({
        ...sampleGroceryProducts[p],
        id: prodId,
        business_id: businessId,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      });

      // Add initial stock movement audit log
      await db.inventory_movements.put({
        id: `mov_init_${Date.now()}_${p}`,
        business_id: businessId,
        product_id: prodId,
        product_name: sampleGroceryProducts[p].name,
        movement_type: 'ADJUSTMENT',
        quantity: sampleGroceryProducts[p].current_stock,
        previous_stock: 0,
        new_stock: sampleGroceryProducts[p].current_stock,
        reason: 'Starter Catalog Setup',
        created_by: 'system',
        created_at: now,
      });
    }
  }

  // 3. Sample Customers with Udhar Khata balances
  const sampleCustomers: Array<Omit<Customer, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'sync_status'>> = [
    {
      name: 'Sunil Verma',
      phone: '9820123456',
      address: 'Flat 202, Gokuldham Society',
      customer_type: 'credit',
      opening_balance: 145000,
      current_balance: 145000, // ₹1,450.00 Udhar
      loyalty_points: 85,
      total_spent: 850000,
      total_visits: 14,
      last_visit_date: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      name: 'Pooja Patil',
      phone: '9819988776',
      address: 'Plot 15, Station Road',
      customer_type: 'credit',
      opening_balance: 62000,
      current_balance: 62000, // ₹620.00 Udhar
      loyalty_points: 42,
      total_spent: 420000,
      total_visits: 8,
      last_visit_date: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      name: 'Rajesh Gupta',
      phone: '9833445566',
      address: 'Shanti Nagar, Lane 3',
      customer_type: 'vip',
      opening_balance: 0,
      current_balance: 0, // No Udhar
      loyalty_points: 185,
      total_spent: 1850000,
      total_visits: 28,
      last_visit_date: now,
    },
    {
      name: 'Anil Deshmukh (Inactive 35 days)',
      phone: '9822334455',
      address: 'Near Old Post Office',
      customer_type: 'inactive',
      opening_balance: 0,
      current_balance: 0,
      loyalty_points: 31,
      total_spent: 310000,
      total_visits: 5,
      last_visit_date: new Date(Date.now() - 35 * 86400000).toISOString(), // 35 days ago (Inactive)
    }
  ];

  for (let c = 0; c < sampleCustomers.length; c++) {
    const custId = `cust_${Date.now()}_${c}`;
    await db.customers.put({
      ...sampleCustomers[c],
      id: custId,
      business_id: businessId,
      created_at: now,
      updated_at: now,
      sync_status: 'synced',
    });

    // If customer has initial Udhar balance, add initial ledger record
    if (sampleCustomers[c].current_balance > 0) {
      await db.ledger_transactions.put({
        id: `ledg_init_${Date.now()}_${c}`,
        business_id: businessId,
        party_type: 'customer',
        party_id: custId,
        party_name: sampleCustomers[c].name,
        transaction_type: 'CREDIT_SALE',
        amount: sampleCustomers[c].current_balance,
        balance_after: sampleCustomers[c].current_balance,
        notes: 'Initial Udhar balance setup',
        created_at: now,
      });
    }
  }

  // 4. Marketing Templates for festival/growth
  const templates: Array<Omit<MarketingTemplate, 'id'>> = [
    {
      title: 'Festival Greeting & Special Offer',
      category: 'festival',
      language: 'en',
      template_text: 'Hello {{customer_name}}! 🪔 Warm greetings from {{business_name}}. Celebrate this festival with an exclusive {{discount}}% discount on your next visit! Visit us: {{business_phone}}',
      is_custom: false,
    },
    {
      title: 'Credit Payment Reminder',
      category: 'reminder',
      language: 'en',
      template_text: 'Dear {{customer_name}}, gentle reminder from {{business_name}} regarding pending balance of ₹{{amount}}. Kindly clear at your convenience via UPI: {{upi_id}}. Thank you!',
      is_custom: false,
    },
    {
      title: 'We Miss You! Inactive Customer Offer',
      category: 'discount',
      language: 'en',
      template_text: 'Hello {{customer_name}}, we noticed it has been a while since your last visit to {{business_name}}! Use coupon code {{coupon_code}} to get flat ₹{{discount}} off on your next purchase. See you soon!',
      is_custom: false,
    }
  ];

  for (let m = 0; m < templates.length; m++) {
    await db.marketing_templates.put({
      ...templates[m],
      id: `tmpl_${m + 1}`,
    });
  }
}
