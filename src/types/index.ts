// Domain Types for KamaiPlus (Kamai+) Platform
// Note: All monetary amounts (prices, totals, discounts, balances) are stored as integer PAISE (1 INR = 100 paise)

export type BusinessType = 
  | 'grocery'
  | 'pharmacy'
  | 'restaurant'
  | 'clothing'
  | 'electronics'
  | 'hardware'
  | 'electrical'
  | 'fmcg'
  | 'bakery'
  | 'salon'
  | 'stationery'
  | 'mobile'
  | 'services'
  | 'other';

export type SupportedLanguage = 'en' | 'hi' | 'mr';

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF';

export type InvoiceThemeId = 
  | 'vyapar_classic' 
  | 'modern_emerald' 
  | 'royal_blue' 
  | 'golden_elegance' 
  | 'compact_kirana' 
  | 'pharma_care'
  | 'thermal_minimal';

export interface UpiAccount {
  id: string;
  label: string;
  upi_id: string;
  is_default: boolean;
}

export interface InvoiceThemeConfig {
  theme_id: InvoiceThemeId;
  primary_color: string;
  header_style: 'standard' | 'banner' | 'centered' | 'modern';
  show_logo: boolean;
  show_tagline: boolean;
  show_owner: boolean;
  show_upi_qr: boolean;
  show_gst_breakup: boolean;
  show_hsn_code: boolean;
  show_mrp_savings: boolean;
  show_terms: boolean;
  show_signature: boolean;
  show_pharmacy_rx?: boolean;
  drug_license_no?: string;
  pharmacist_reg_no?: string;
  show_ad_banner?: boolean;
  custom_ad_banner_text?: string;
  custom_ad_banner_subtext?: string;
  custom_title?: string;
  custom_footer?: string;
  custom_terms?: string;
}

export interface Business {
  id: string; // UUID v4
  name: string;
  tagline?: string;
  logo_url?: string;
  business_type: BusinessType;
  owner_name: string;
  phone: string;
  email?: string;
  address: string;
  pincode?: string;
  gstin?: string;
  drug_license_no?: string;
  pharmacist_reg_no?: string;
  upi_id?: string;
  upi_ids?: UpiAccount[];
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  bank_account_name?: string;
  currency: string; // 'INR'
  language: SupportedLanguage;
  invoice_prefix: string;
  next_invoice_number: number;
  terms_conditions?: string;
  footer_message?: string;
  invoice_theme_config?: InvoiceThemeConfig;
  subscription_tier?: 'free' | 'pro' | 'enterprise';
  subscription_valid_until?: string;
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
  | 'strip'
  | 'plate'
  | 'portion'
  | 'pair'
  | 'set'
  | 'bundle'
  | 'dozen'
  | 'meter'
  | 'foot'
  | 'sqft'
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
  selling_price: number; // in paise (Retail MRP/Standard)
  wholesale_price?: number; // in paise (Thok Bhav / Bulk Rate)
  wholesale_min_qty?: number; // minimum quantity to trigger wholesale pricing
  is_loose_item?: boolean; // Kirana loose item sold by open weight
  allow_decimal?: boolean; // allows decimal quantities (0.25 kg, 0.5 kg, etc.)
  is_unlimited_stock?: boolean; // bypasses zero stock block
  mrp: number; // in paise
  tax_rate: number; // percentage (0, 5, 12, 18, 28)
  is_tax_inclusive: boolean;
  hsn_code?: string;
  batch_number?: string;
  mfg_date?: string; // YYYY-MM-DD
  expiry_date?: string; // YYYY-MM-DD
  size?: string; // Clothing size (e.g. S, M, L, XL, 32, 34)
  color?: string; // Clothing / Mobile color
  imei_serial?: string; // Electronics IMEI or device serial number
  warranty_period_months?: number; // Brand warranty period
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
  gstin?: string;
  date_of_birth?: string; // YYYY-MM-DD or MM-DD
  anniversary_date?: string; // YYYY-MM-DD or MM-DD
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
  hsn_code?: string;
  barcode?: string;
  batch_number?: string;
  expiry_date?: string;
  size?: string;
  color?: string;
  imei_serial?: string;
  warranty_period_months?: number;
  quantity: number;
  unit: ProductUnit;
  unit_price: number; // in paise
  retail_price?: number; // original retail price in paise
  wholesale_price?: number; // wholesale price in paise
  pricing_tier?: 'retail' | 'wholesale';
  mrp: number; // in paise
  discount_amount: number; // in paise per line
  tax_rate: number;
  tax_amount: number; // in paise
  total_amount: number; // in paise
  notes?: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'credit' | 'split';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type SaleStatus = 'completed' | 'cancelled' | 'returned' | 'partial_return' | 'draft';
export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'counter';

export interface PaymentSplit {
  cash_amount: number; // in paise
  upi_amount: number; // in paise
  card_amount: number; // in paise
  credit_amount: number; // in paise
  notes?: string;
}

export interface Sale {
  id: string;
  business_id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_gstin?: string;
  table_no?: string;
  order_type?: OrderType;
  token_number?: number;
  doctor_name?: string;
  patient_name?: string;
  items: CartItem[];
  subtotal: number; // in paise
  discount_total: number; // in paise
  tax_total: number; // in paise
  grand_total: number; // in paise
  payment_method: PaymentMethod;
  payment_split?: PaymentSplit;
  amount_received: number; // in paise
  balance_due: number; // in paise (added to Udhar Khata)
  change_returned: number; // in paise
  payment_status: PaymentStatus;
  status: SaleStatus;
  has_return?: boolean;
  returned_amount?: number; // in paise
  return_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending';
}

export interface CashExpense {
  id: string;
  business_id: string;
  category: 'tea_snacks' | 'shop_maintenance' | 'staff_salary' | 'transport' | 'supplier_payout' | 'electricity' | 'other';
  title: string;
  amount: number; // in paise
  paid_to?: string;
  payment_mode: 'cash' | 'upi';
  created_by: string;
  created_at: string;
  notes?: string;
}

export type MovementType = 'SALE' | 'PURCHASE' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGE';

export interface InventoryMovement {
  id: string;
  business_id?: string;
  product_id: string;
  product_name: string;
  movement_type: MovementType;
  quantity: number; // positive or negative
  previous_stock: number;
  new_stock: number;
  reference_id?: string; // sale_id or purchase_id
  reason?: string;
  created_by?: string;
  created_at: string;
  sync_status?: 'synced' | 'pending';
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
  sync_status?: 'synced' | 'pending';
}

export interface CashRegister {
  id: string;
  business_id: string;
  opened_at: string;
  closed_at?: string;
  opening_cash: number; // in paise
  cash_sales: number; // in paise
  upi_sales: number; // in paise
  credit_sales: number; // in paise
  cash_in: number; // in paise
  cash_out: number; // in paise
  expected_closing_cash: number; // in paise
  actual_closing_cash?: number; // in paise
  difference?: number; // in paise (actual - expected)
  status: 'open' | 'closed';
  notes?: string;
  opened_by: string;
  closed_by?: string;
  sync_status?: 'synced' | 'pending';
}

export interface ReturnItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: ProductUnit;
  unit_price: number; // in paise
  tax_rate: number;
  total_amount: number; // in paise
  restock_to_inventory: boolean;
  reason?: string;
}

export interface SalesReturn {
  id: string;
  business_id: string;
  return_number: string;
  original_sale_id: string;
  original_invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  items: ReturnItem[];
  refund_amount: number; // in paise
  refund_method: 'cash' | 'upi' | 'store_credit' | 'khata_deduction';
  notes?: string;
  created_by: string;
  created_at: string;
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
