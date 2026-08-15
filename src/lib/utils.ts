import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats integer paise into Indian Rupee string (e.g. 10050 paise -> "₹100.50")
 * Supports Indian number formatting (Lakhs and Crores)
 */
export function formatINR(paise: number, includeSymbol: boolean = true): string {
  const rupees = (paise || 0) / 100;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);

  return includeSymbol ? `₹${formatted}` : formatted;
}

/**
 * Parse user-entered Rupee decimal string into integer paise
 * e.g. "120.50" -> 12050
 */
export function parseRupeesToPaise(val: number | string): number {
  if (typeof val === 'number') {
    return Math.round(val * 100);
  }
  const cleaned = val.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

/**
 * Calculate tax amount and base amount from selling price and GST rate
 */
export function calculateTax(
  amountPaise: number,
  taxRatePercent: number,
  isInclusive: boolean
): { baseAmount: number; taxAmount: number; totalAmount: number } {
  if (taxRatePercent <= 0) {
    return {
      baseAmount: amountPaise,
      taxAmount: 0,
      totalAmount: amountPaise,
    };
  }

  if (isInclusive) {
    // Total includes tax: Base = Total / (1 + Rate/100)
    const baseAmount = Math.round(amountPaise / (1 + taxRatePercent / 100));
    const taxAmount = amountPaise - baseAmount;
    return {
      baseAmount,
      taxAmount,
      totalAmount: amountPaise,
    };
  } else {
    // Exclusive: Tax = Base * Rate/100
    const taxAmount = Math.round((amountPaise * taxRatePercent) / 100);
    return {
      baseAmount: amountPaise,
      taxAmount,
      totalAmount: amountPaise + taxAmount,
    };
  }
}

/**
 * Generates an instant UPI Payment deep link or dynamic QR payload
 */
export function generateUPILink(
  vpa: string,
  payeeName: string,
  amountPaise?: number,
  invoiceNumber?: string
): string {
  const encodedName = encodeURIComponent(payeeName);
  let link = `upi://pay?pa=${vpa}&pn=${encodedName}&cu=INR`;
  if (amountPaise && amountPaise > 0) {
    const amountRupees = (amountPaise / 100).toFixed(2);
    link += `&am=${amountRupees}`;
  }
  if (invoiceNumber) {
    const note = encodeURIComponent(`Bill #${invoiceNumber}`);
    link += `&tn=${note}`;
  }
  return link;
}

/**
 * Generate standard WhatsApp web deep link for sharing receipts
 */
export function generateWhatsAppReceiptLink(
  phone: string,
  message: string
): string {
  // Strip non-digits and add 91 if 10 digits
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
