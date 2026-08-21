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
import { getStoreProfile } from '@/lib/constants/storeProfiles';

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
  const profile = getStoreProfile(businessType);

  // 1. Seed Categories from Profile
  const categoriesToSeed = profile.quickCategories.map((catName) => ({
    name: catName,
    icon: profile.iconName || 'package',
  }));

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

  // 2. Seed Sample Products from Profile
  for (let i = 0; i < profile.sampleProducts.length; i++) {
    const sample = profile.sampleProducts[i];
    const catIndex = profile.quickCategories.indexOf(sample.category);
    const catId = catIndex >= 0 && createdCategoryIds[catIndex] ? createdCategoryIds[catIndex] : createdCategoryIds[0] || 'cat_default';

    const prodId = `prod_${Date.now()}_${i}`;
    await db.products.put({
      id: prodId,
      business_id: businessId,
      name: sample.name,
      barcode: sample.barcode || (profile.featureToggles.showBarcode ? `89010${i}0000${i+1}` : undefined),
      category_id: catId,
      category_name: sample.category,
      selling_price: sample.selling_price,
      purchase_price: sample.purchase_price,
      mrp: sample.mrp,
      unit: sample.unit || profile.defaultUnit,
      current_stock: 50,
      min_stock_level: 10,
      tax_rate: sample.tax_rate,
      is_tax_inclusive: true,
      is_loose_item: sample.is_loose_item || false,
      batch_number: sample.batch_number,
      expiry_date: sample.expiry_date,
      size: sample.size,
      color: sample.color,
      warranty_period_months: sample.warranty_period_months,
      is_active: true,
      is_favorite: i < 3,
      created_at: now,
      updated_at: now,
      sync_status: 'synced',
    });

    // Add initial stock movement audit log
    await db.inventory_movements.put({
      id: `mov_init_${Date.now()}_${i}`,
      business_id: businessId,
      product_id: prodId,
      product_name: sample.name,
      movement_type: 'ADJUSTMENT',
      quantity: 50,
      previous_stock: 0,
      new_stock: 50,
      reason: 'Starter Catalog Setup',
      created_by: 'system',
      created_at: now,
    });
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
