/**
 * Enterprise Validation Engine for KamaiPlus (Kamai+)
 * Standardized, strict, and user-friendly validation across all platform forms.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  cleanedValue?: any;
}

// -------------------------------------------------------------
// 1. Phone & Contact Validators
// -------------------------------------------------------------

/**
 * Validates 10-digit Indian Mobile Numbers starting with 6, 7, 8, or 9
 */
export function validateIndianPhone(
  phone: string | null | undefined,
  required = true,
  fieldLabel = 'Mobile Number'
): ValidationResult {
  if (!phone || !phone.trim()) {
    if (!required) return { isValid: true, cleanedValue: '' };
    return { isValid: false, error: `${fieldLabel} is required.` };
  }

  const cleanDigits = phone.replace(/\D/g, '').slice(-10);

  if (cleanDigits.length !== 10) {
    return {
      isValid: false,
      error: `Please enter a valid 10-digit ${fieldLabel.toLowerCase()} (e.g. 9876543210).`,
    };
  }

  // Must start with 6, 7, 8, or 9 (Standard Indian TRAI telecom prefix)
  if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
    return {
      isValid: false,
      error: `${fieldLabel} must begin with 6, 7, 8, or 9.`,
    };
  }

  return { isValid: true, cleanedValue: cleanDigits };
}

/**
 * Validates RFC standard email addresses
 */
export function validateEmail(
  email: string | null | undefined,
  required = false,
  fieldLabel = 'Email Address'
): ValidationResult {
  if (!email || !email.trim()) {
    if (!required) return { isValid: true, cleanedValue: '' };
    return { isValid: false, error: `${fieldLabel} is required.` };
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(cleanEmail)) {
    return {
      isValid: false,
      error: `Please enter a valid ${fieldLabel.toLowerCase()} (e.g. name@example.com).`,
    };
  }

  return { isValid: true, cleanedValue: cleanEmail };
}

// -------------------------------------------------------------
// 2. Statutory & Tax Identification Validators
// -------------------------------------------------------------

/**
 * Validates Indian 15-character statutory GSTIN (Goods & Services Tax Identification Number)
 * Format: 2 State Digits + 10 PAN Alphanumeric + 1 Entity Number + 'Z' + 1 Check Digit
 * Example: 27AAAAA0000A1Z5
 */
export function validateGstin(
  gstin: string | null | undefined,
  required = false
): ValidationResult {
  if (!gstin || !gstin.trim()) {
    if (!required) return { isValid: true, cleanedValue: '' };
    return { isValid: false, error: 'GSTIN Number is required for tax invoices.' };
  }

  const cleanGstin = gstin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cleanGstin.length !== 15) {
    return {
      isValid: false,
      error: `GSTIN must be exactly 15 characters (currently ${cleanGstin.length}). Example: 27AAAAA0000A1Z5.`,
    };
  }

  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(cleanGstin)) {
    return {
      isValid: false,
      error: 'Invalid GSTIN structure. Example format: 27AAAAA0000A1Z5 (State + PAN + Entity + Z + Checksum).',
    };
  }

  return { isValid: true, cleanedValue: cleanGstin };
}

/**
 * Validates Unified Payments Interface (UPI) Virtual Payment Address (VPA)
 * Example: store@okaxis, 9876543210@paytm, name.business@upi
 */
export function validateUpiId(
  upiId: string | null | undefined,
  required = true
): ValidationResult {
  if (!upiId || !upiId.trim()) {
    if (!required) return { isValid: true, cleanedValue: '' };
    return { isValid: false, error: 'UPI ID is required for generating customer payment QR codes.' };
  }

  const cleanUpi = upiId.trim().toLowerCase();
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

  if (!upiRegex.test(cleanUpi)) {
    return {
      isValid: false,
      error: 'Please enter a valid UPI ID / VPA (e.g. yourstore@okaxis, 9876543210@paytm).',
    };
  }

  return { isValid: true, cleanedValue: cleanUpi };
}

/**
 * Validates 6-Digit Indian Postal Pincode
 */
export function validatePincode(
  pincode: string | null | undefined,
  required = false
): ValidationResult {
  if (!pincode || !pincode.trim()) {
    if (!required) return { isValid: true, cleanedValue: '' };
    return { isValid: false, error: 'Pincode is required.' };
  }

  const cleanPin = pincode.replace(/\D/g, '');
  if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
    return {
      isValid: false,
      error: 'Please enter a valid 6-digit Indian postal Pincode (e.g. 411001).',
    };
  }

  return { isValid: true, cleanedValue: cleanPin };
}

/**
 * Validates 14-Digit FSSAI Food Safety License Number
 */
export function validateFssaiLicense(
  fssai: string | null | undefined,
  required = false
): ValidationResult {
  if (!fssai || !fssai.trim()) {
    if (!required) return { isValid: true, cleanedValue: '' };
    return { isValid: false, error: 'FSSAI License Number is required for food businesses.' };
  }

  const clean = fssai.replace(/\D/g, '');
  if (!/^[0-9]{14}$/.test(clean)) {
    return {
      isValid: false,
      error: 'FSSAI License must be exactly 14 numeric digits.',
    };
  }

  return { isValid: true, cleanedValue: clean };
}

// -------------------------------------------------------------
// 3. Product & Catalog Validators
// -------------------------------------------------------------

export interface ProductValidationInput {
  name: string;
  sellingPricePaise: number;
  mrpPaise?: number;
  purchasePricePaise?: number;
  currentStock?: number;
  minStockLevel?: number;
  isUnlimitedStock?: boolean;
  taxRate?: number;
  hsnCode?: string;
  expiryDate?: string;
}

/**
 * Validates complete product master details with retail compliance rules
 */
export function validateProductData(input: ProductValidationInput): ValidationResult {
  const cleanName = (input.name || '').trim();

  // 1. Name Check
  if (!cleanName || cleanName.length < 2) {
    return { isValid: false, error: 'Product Name must be at least 2 characters long.' };
  }
  if (cleanName.length > 150) {
    return { isValid: false, error: 'Product Name cannot exceed 150 characters.' };
  }

  // 2. Selling Price Check
  if (typeof input.sellingPricePaise !== 'number' || isNaN(input.sellingPricePaise) || input.sellingPricePaise <= 0) {
    return { isValid: false, error: 'Selling Price must be greater than ₹0.' };
  }

  // 3. Legal Metrology: MRP cannot be less than Selling Price
  const mrp = input.mrpPaise ?? input.sellingPricePaise;
  if (mrp < input.sellingPricePaise) {
    return {
      isValid: false,
      error: `MRP (₹${(mrp / 100).toFixed(2)}) cannot be lower than Selling Price (₹${(input.sellingPricePaise / 100).toFixed(2)}) per Indian Legal Metrology rules.`,
    };
  }

  // 4. Purchase Price Check
  if (input.purchasePricePaise !== undefined && input.purchasePricePaise < 0) {
    return { isValid: false, error: 'Purchase/Cost Price cannot be negative.' };
  }

  // 5. Stock Check
  if (!input.isUnlimitedStock && input.currentStock !== undefined && input.currentStock < 0) {
    return { isValid: false, error: 'Stock Quantity cannot be negative.' };
  }

  if (input.minStockLevel !== undefined && input.minStockLevel < 0) {
    return { isValid: false, error: 'Reorder / Min Stock Level cannot be negative.' };
  }

  // 6. Tax Rate Slab Check
  const validTaxRates = [0, 0.25, 3, 5, 12, 18, 28];
  if (input.taxRate !== undefined && !validTaxRates.includes(input.taxRate)) {
    return {
      isValid: false,
      error: `GST Rate must be an official Indian GST slab (0%, 3%, 5%, 12%, 18%, or 28%).`,
    };
  }

  // 7. HSN Code Format (if provided)
  if (input.hsnCode && input.hsnCode.trim()) {
    const cleanHsn = input.hsnCode.replace(/\D/g, '');
    if (cleanHsn.length < 2 || cleanHsn.length > 8) {
      return { isValid: false, error: 'HSN / SAC code must be 2 to 8 numeric digits.' };
    }
  }

  return { isValid: true };
}

// -------------------------------------------------------------
// 4. Customer & Khata Validators
// -------------------------------------------------------------

export interface CustomerValidationInput {
  name: string;
  phone: string;
  creditLimitPaise?: number;
  gstin?: string;
  email?: string;
}

export function validateCustomerData(input: CustomerValidationInput): ValidationResult {
  const cleanName = (input.name || '').trim();
  if (!cleanName || cleanName.length < 2) {
    return { isValid: false, error: 'Customer Name must be at least 2 characters long.' };
  }

  const phoneRes = validateIndianPhone(input.phone, true, 'Customer Mobile Phone');
  if (!phoneRes.isValid) return phoneRes;

  if (input.creditLimitPaise !== undefined && input.creditLimitPaise < 0) {
    return { isValid: false, error: 'Credit Limit cannot be negative.' };
  }

  if (input.gstin && input.gstin.trim()) {
    const gstinRes = validateGstin(input.gstin, false);
    if (!gstinRes.isValid) return gstinRes;
  }

  if (input.email && input.email.trim()) {
    const emailRes = validateEmail(input.email, false);
    if (!emailRes.isValid) return emailRes;
  }

  return { isValid: true, cleanedValue: { name: cleanName, phone: phoneRes.cleanedValue } };
}

// -------------------------------------------------------------
// 5. Cash Register & Expense Validators
// -------------------------------------------------------------

export function validateExpenseData(input: { amountPaise: number; category: string; description?: string }): ValidationResult {
  if (typeof input.amountPaise !== 'number' || isNaN(input.amountPaise) || input.amountPaise <= 0) {
    return { isValid: false, error: 'Expense Amount must be greater than ₹0.' };
  }

  if (!input.category || !input.category.trim()) {
    return { isValid: false, error: 'Please select or enter an expense category.' };
  }

  return { isValid: true };
}
