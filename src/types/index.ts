// Domain Types for KamaiPlus (Kamai+) Platform
// Note: All monetary amounts (prices, totals, discounts, balances) are stored as integer PAISE (1 INR = 100 paise)

export type BusinessType = 
  | 'grocery'
  | 'clothing'
  | 'electronics'
  | 'bakery'
  | 'salon'
  | 'hardware'
  | 'stationery'
  | 'mobile'
  | 'restaurant'
  | 'services'
  | 'other';

export type SupportedLanguage = 'en' | 'hi' | 'mr';

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF';

export interface Business {
  id: string; // UUID v4
  name: string;
  business_type: BusinessType;
  owner_name: string;
  phone: string;
  email?: string;
  address: string;
  pincode?: string;
  gstin?: string;
  upi_id?: string;
  currency: string; // 'INR'
  language: SupportedLanguage;
  invoice_prefix: string;
  next_invoice_number: number;
  terms_conditions?: string;
  footer_message?: string;
  is_onboarded: boolean;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending';
}

export type ProductUnit = 
  | 'piece'
  | 'kg'
  | 'gram'
  | 'litre'
  | 'ml'
  | 'box'
  | 'packet'
  | 'dozen'
  | 'meter'
  | 'foot'
  | 'custom';

export interface Category {
  id: string;
  business_id: string;
  name: string;
  icon?: string;
  color?: string;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category_id: string;
  category_name?: string;
  unit: ProductUnit;
  purchase_price: number; // in paise
  selling_price: number; // in paise
  mrp: number; // in paise
  tax_rate: number; // percentage (0, 5, 12, 18, 28)
  is_tax_inclusive: boolean;
  hsn_code?: string;
  current_stock: number;
  min_stock_level: number;
  supplier_id?: string;
  is_favorite: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending';
}

export type CustomerType = 'new' | 'regular' | 'vip' | 'inactive' | 'credit';

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  opening_balance: number; // in paise (+ = owes us/Udhar, - = advance payment)
  current_balance: number; // in paise
  loyalty_points: number;
  total_spent: number; // in paise
  total_visits: number;
  last_visit_date?: string;
  customer_type: CustomerType;
  notes?: string;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending';
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  opening_balance: number; // in paise (+ = we owe supplier, - = advance paid)
  current_balance: number; // in paise
  notes?: string;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending';
}

export interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: ProductUnit;
  unit_price: number; // in paise
  mrp: number; // in paise
  discount_amount: number; // in paise per line
  tax_rate: number;
  tax_amount: number; // in paise
  total_amount: number; // in paise
  notes?: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'credit' | 'split';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type SaleStatus = 'completed' | 'cancelled' | 'draft';

export interface Sale {
  id: string;
  business_id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  items: CartItem[];
  subtotal: number; // in paise
  discount_total: number; // in paise
  tax_total: number; // in paise
  grand_total: number; // in paise
  payment_method: PaymentMethod;
  amount_received: number; // in paise
  balance_due: number; // in paise (added to Udhar Khata)
  change_returned: number; // in paise
  payment_status: PaymentStatus;
  status: SaleStatus;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending';
}

export type MovementType = 'SALE' | 'PURCHASE' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGE';

export interface InventoryMovement {
  id: string;
  business_id: string;
  product_id: string;
  product_name: string;
  movement_type: MovementType;
  quantity: number; // positive or negative
  previous_stock: number;
  new_stock: number;
  reference_id?: string; // sale_id or purchase_id
  reason?: string;
  created_by: string;
  created_at: string;
}

export type LedgerPartyType = 'customer' | 'supplier';
export type LedgerTransactionType = 
  | 'CREDIT_SALE'
  | 'PAYMENT_RECEIVED'
  | 'CREDIT_PURCHASE'
  | 'SUPPLIER_PAYMENT'
  | 'OPENING_BALANCE'
  | 'ADJUSTMENT';

export interface LedgerTransaction {
  id: string;
  business_id: string;
  party_type: LedgerPartyType;
  party_id: string;
  party_name: string;
  transaction_type: LedgerTransactionType;
  amount: number; // in paise
  payment_method?: string;
  reference_id?: string;
  notes?: string;
  balance_after: number; // in paise
  created_at: string;
}

export interface CashRegister {
  id: string;
  business_id: string;
  opened_at: string;
  closed_at?: string;
  opening_cash: number; // in paise
  cash_sales: number; // in paise
  cash_in: number; // in paise
  cash_out: number; // in paise
  expected_closing_cash: number; // in paise
  actual_closing_cash?: number; // in paise
  difference?: number; // in paise
  status: 'open' | 'closed';
  notes?: string;
  opened_by: string;
  closed_by?: string;
}

export interface MarketingTemplate {
  id: string;
  title: string;
  category: 'festival' | 'sale' | 'new_arrival' | 'discount' | 'loyalty' | 'reminder' | 'appreciation';
  language: SupportedLanguage;
  template_text: string;
  is_custom: boolean;
}

export interface AuditLog {
  id: string;
  business_id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
}
