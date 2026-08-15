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
  marketing_templates!: Table<MarketingTemplate, string>;
  audit_logs!: Table<AuditLog, string>;

  constructor() {
    super('VyaparSetuDB');
    
    this.version(1).stores({
      businesses: 'id, name, business_type, phone, created_at',
      categories: 'id, business_id, name, created_at',
      products: 'id, business_id, name, barcode, category_id, is_active, is_favorite, current_stock, min_stock_level',
      customers: 'id, business_id, name, phone, current_balance, customer_type, last_visit_date',
      suppliers: 'id, business_id, name, phone, current_balance',
      sales: 'id, business_id, invoice_number, customer_id, payment_method, status, created_at',
      inventory_movements: 'id, business_id, product_id, movement_type, reference_id, created_at',
      ledger_transactions: 'id, business_id, party_type, party_id, transaction_type, created_at',
      cash_registers: 'id, business_id, status, opened_at, closed_at',
      marketing_templates: 'id, category, language, is_custom',
      audit_logs: 'id, business_id, action, entity_type, entity_id, created_at',
    });
  }
}

export const db = new VyaparSetuDatabase();

// Default Category & Sample Product Seeder per business type
export async function seedBusinessStarterData(businessId: string, businessType: BusinessType) {
  const now = new Date().toISOString();

  // 1. Starter Categories
  const categoryTemplates: Record<BusinessType, Array<{ name: string; icon: string }>> = {
    grocery: [
      { name: 'Grains & Atta (अनाज/आटा)', icon: 'wheat' },
      { name: 'Dairy & Milk (डेयरी)', icon: 'milk' },
      { name: 'Edible Oils & Ghee (तेल/घी)', icon: 'droplet' },
      { name: 'Packaged Foods & Snacks', icon: 'package' },
      { name: 'Spices & Masalas (मसाले)', icon: 'flame' },
      { name: 'Personal & Home Care', icon: 'sparkles' },
    ],
    clothing: [
      { name: "Men's Wear", icon: 'shirt' },
      { name: "Women's Ethnic", icon: 'scissors' },
      { name: "Kids & Infants", icon: 'baby' },
      { name: "Footwear", icon: 'footprints' },
      { name: "Accessories", icon: 'watch' },
    ],
    electronics: [
      { name: 'Smartphones & Tablets', icon: 'smartphone' },
      { name: 'Cables & Chargers', icon: 'zap' },
      { name: 'Audio & Earphones', icon: 'headphones' },
      { name: 'Home Appliances', icon: 'tv' },
    ],
    bakery: [
      { name: 'Cakes & Pastries', icon: 'cake' },
      { name: 'Breads & Buns', icon: 'package' },
      { name: 'Cookies & Biscuits', icon: 'cookie' },
      { name: 'Savory Snacks', icon: 'coffee' },
    ],
    salon: [
      { name: 'Hair Services', icon: 'scissors' },
      { name: 'Facial & Skin Care', icon: 'sparkles' },
      { name: 'Grooming Products', icon: 'package' },
    ],
    hardware: [
      { name: 'Paints & Primers', icon: 'paint-bucket' },
      { name: 'Plumbing & Pipes', icon: 'wrench' },
      { name: 'Electrical Fittings', icon: 'zap' },
      { name: 'Tools & Hardware', icon: 'hammer' },
    ],
    stationery: [
      { name: 'Notebooks & Registers', icon: 'book' },
      { name: 'Pens & Writing Tools', icon: 'pen' },
      { name: 'Art & Craft', icon: 'palette' },
      { name: 'Office Supplies', icon: 'briefcase' },
    ],
    mobile: [
      { name: 'Mobile Handsets', icon: 'smartphone' },
      { name: 'Screen Guards & Covers', icon: 'shield' },
      { name: 'Repair Services', icon: 'wrench' },
      { name: 'Recharges & Accessories', icon: 'battery-charging' },
    ],
    restaurant: [
      { name: 'Thali & Meals', icon: 'utensils' },
      { name: 'Snacks & Fast Food', icon: 'coffee' },
      { name: 'Beverages & Tea', icon: 'cup-soda' },
      { name: 'Desserts', icon: 'cake' },
    ],
    services: [
      { name: 'Standard Service', icon: 'wrench' },
      { name: 'Consultation', icon: 'user' },
      { name: 'Spare Parts', icon: 'package' },
    ],
    other: [
      { name: 'General Items', icon: 'package' },
      { name: 'Services', icon: 'wrench' },
    ]
  };

  const cats = categoryTemplates[businessType] || categoryTemplates.grocery;
  const createdCategoryIds: Record<string, string> = {};

  for (let i = 0; i < cats.length; i++) {
    const catId = `cat_${Date.now()}_${i}`;
    await db.categories.put({
      id: catId,
      business_id: businessId,
      name: cats[i].name,
      icon: cats[i].icon,
      created_at: now,
    });
    createdCategoryIds[cats[i].name] = catId;
  }

  // 2. Starter Products for Kirana/Grocery or standard retail
  if (businessType === 'grocery' || businessType === 'other') {
    const groceryProducts: Array<Omit<Product, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'sync_status'>> = [
      {
        name: 'Aashirvaad Shudh Chakki Atta 5kg',
        category_id: Object.values(createdCategoryIds)[0] || 'cat_default',
        category_name: 'Grains & Atta (अनाज/आटा)',
        unit: 'packet',
        purchase_price: 24000, // ₹240.00
        selling_price: 26500, // ₹265.00
        mrp: 27500, // ₹275.00
        tax_rate: 0,
        is_tax_inclusive: true,
        current_stock: 25,
        min_stock_level: 5,
        barcode: '890103000001',
        is_favorite: true,
        is_active: true,
      },
      {
        name: 'Amul Taaza Toned Milk 500ml',
        category_id: Object.values(createdCategoryIds)[1] || 'cat_default',
        category_name: 'Dairy & Milk (डेयरी)',
        unit: 'packet',
        purchase_price: 2550, // ₹25.50
        selling_price: 2700, // ₹27.00
        mrp: 2700, // ₹27.00
        tax_rate: 0,
        is_tax_inclusive: true,
        current_stock: 40,
        min_stock_level: 10,
        barcode: '890126201005',
        is_favorite: true,
        is_active: true,
      },
      {
        name: 'Fortune Sunlite Refined Sunflower Oil 1L',
        category_id: Object.values(createdCategoryIds)[2] || 'cat_default',
        category_name: 'Edible Oils & Ghee (तेल/घी)',
        unit: 'packet',
        purchase_price: 12500, // ₹125.00
        selling_price: 14200, // ₹142.00
        mrp: 15500, // ₹155.00
        tax_rate: 5,
        is_tax_inclusive: true,
        current_stock: 30,
        min_stock_level: 6,
        barcode: '890600728001',
        is_favorite: true,
        is_active: true,
      },
      {
        name: 'Parle-G Gold Biscuits 100g',
        category_id: Object.values(createdCategoryIds)[3] || 'cat_default',
        category_name: 'Packaged Foods & Snacks',
        unit: 'packet',
        purchase_price: 850, // ₹8.50
        selling_price: 1000, // ₹10.00
        mrp: 1000, // ₹10.00
        tax_rate: 18,
        is_tax_inclusive: true,
        current_stock: 80,
        min_stock_level: 20,
        barcode: '890171910101',
        is_favorite: true,
        is_active: true,
      },
      {
        name: 'Tata Salt Vaccum Evaporated 1kg',
        category_id: Object.values(createdCategoryIds)[4] || 'cat_default',
        category_name: 'Spices & Masalas (मसाले)',
        unit: 'packet',
        purchase_price: 2400, // ₹24.00
        selling_price: 2800, // ₹28.00
        mrp: 2800, // ₹28.00
        tax_rate: 0,
        is_tax_inclusive: true,
        current_stock: 50,
        min_stock_level: 15,
        barcode: '890404390100',
        is_favorite: true,
        is_active: true,
      },
      {
        name: 'Loose Basmati Rice (सुपर बासमती चावल)',
        category_id: Object.values(createdCategoryIds)[0] || 'cat_default',
        category_name: 'Grains & Atta (अनाज/आटा)',
        unit: 'kg',
        purchase_price: 8200, // ₹82.00 / kg
        selling_price: 9500, // ₹95.00 / kg
        mrp: 10500,
        tax_rate: 0,
        is_tax_inclusive: true,
        current_stock: 4, // Intentionally low stock to showcase attention alert
        min_stock_level: 15,
        is_favorite: true,
        is_active: true,
      }
    ];

    for (let j = 0; j < groceryProducts.length; j++) {
      const p = groceryProducts[j];
      const prodId = `prod_${Date.now()}_${j}`;
      await db.products.put({
        ...p,
        id: prodId,
        business_id: businessId,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      });

      // Also create initial inventory movement
      await db.inventory_movements.put({
        id: `mov_${Date.now()}_${j}`,
        business_id: businessId,
        product_id: prodId,
        product_name: p.name,
        movement_type: 'ADJUSTMENT',
        quantity: p.current_stock,
        previous_stock: 0,
        new_stock: p.current_stock,
        reason: 'Opening Stock Initialization',
        created_by: 'system',
        created_at: now,
      });
    }
  }

  // 3. Add 2 Starter Customers for demonstration
  const starterCustomers: Array<Omit<Customer, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'sync_status'>> = [
    {
      name: 'Ramesh Sharma (शर्मा जी)',
      phone: '9876543210',
      address: 'Shop 4, Main Market, Mumbai',
      opening_balance: 145000, // ₹1,450.00 Udhar
      current_balance: 145000,
      loyalty_points: 120,
      total_spent: 850000, // ₹8,500.00
      total_visits: 14,
      last_visit_date: new Date(Date.now() - 4 * 86400000).toISOString(),
      customer_type: 'credit',
      notes: 'Regular customer, clears balance every 15 days',
    },
    {
      name: 'Pooja Verma (पूजा जी)',
      phone: '9123456789',
      address: 'Flat 302, Green Valley Apts',
      opening_balance: 0,
      current_balance: 0,
      loyalty_points: 350,
      total_spent: 1840000, // ₹18,400.00
      total_visits: 28,
      last_visit_date: new Date(Date.now() - 52 * 86400000).toISOString(), // 52 days ago -> Inactive!
      customer_type: 'vip',
      notes: 'VIP customer, prefers home delivery',
    }
  ];

  for (let k = 0; k < starterCustomers.length; k++) {
    const cust = starterCustomers[k];
    const custId = `cust_${Date.now()}_${k}`;
    await db.customers.put({
      ...cust,
      id: custId,
      business_id: businessId,
      created_at: now,
      updated_at: now,
      sync_status: 'synced',
    });

    if (cust.opening_balance > 0) {
      await db.ledger_transactions.put({
        id: `ledg_${Date.now()}_${k}`,
        business_id: businessId,
        party_type: 'customer',
        party_id: custId,
        party_name: cust.name,
        transaction_type: 'OPENING_BALANCE',
        amount: cust.opening_balance,
        balance_after: cust.opening_balance,
        notes: 'Initial Udhar balance setup',
        created_at: now,
      });
    }
  }

  // 4. Marketing Templates for festival/growth
  const templates: Array<Omit<MarketingTemplate, 'id'>> = [
    {
      title: 'Festival Greeting & Offer (त्यौहार ऑफर)',
      category: 'festival',
      language: 'hi',
      template_text: 'नमस्ते {{customer_name}} जी! 🪔 {{business_name}} की तरफ से आपको और आपके परिवार को हार्दिक शुभकामनाएं। इस त्यौहार पर हमारे यहाँ खरीदारी करने पर पाएं {{discount}}% की विशेष छूट! पधारें: {{business_phone}}',
      is_custom: false,
    },
    {
      title: 'Udhar Payment Reminder (उधार तकादा/याद दिलाना)',
      category: 'reminder',
      language: 'hi',
      template_text: 'नमस्ते {{customer_name}} जी, {{business_name}} से आपका बाक़ी हिसाब ₹{{amount}} है। कृपया सुविधानुसार भुगतान करें। डिजिटल भुगतान (UPI): {{upi_id}} धन्यवाद!',
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
