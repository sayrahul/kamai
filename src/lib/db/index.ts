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
import { seedCategoryDefaultProducts } from '@/lib/constants/defaultProducts';

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

// Ensure clean starter business exists if DB is empty
export async function ensureStarterBusinessIfEmpty(): Promise<Business> {
  const existing = await db.businesses.toCollection().first();
  if (existing) {
    return existing;
  }

  const businessId = `biz_${Date.now()}`;
  const now = new Date().toISOString();

  const starterBiz: Business = {
    id: businessId,
    name: 'My Retail Store',
    business_type: 'grocery',
    owner_name: 'Store Owner',
    phone: '',
    address: 'Main Market',
    pincode: '400001',
    currency: 'INR',
    language: 'hi',
    invoice_prefix: 'INV-',
    next_invoice_number: 1,
    terms_conditions: 'Thank you for your business! Goods once sold will be exchanged within 7 days.',
    footer_message: 'Powered by KamaiPlus (Kamai+)',
    is_onboarded: true,
    created_at: now,
    updated_at: now,
    sync_status: 'synced',
  };

  await db.businesses.put(starterBiz);
  await seedBusinessStarterData(businessId, 'grocery');
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

  for (let i = 0; i < categoriesToSeed.length; i++) {
    const catId = `cat_${Date.now()}_${i}`;
    await db.categories.put({
      id: catId,
      business_id: businessId,
      name: categoriesToSeed[i].name,
      icon: categoriesToSeed[i].icon,
      created_at: now,
    });
  }

  // 2. Seed Default Category Retail Products into db.products (stock = 10, no barcode)
  await seedCategoryDefaultProducts(businessId, businessType);

  // 3. Marketing Templates for festival/growth
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
