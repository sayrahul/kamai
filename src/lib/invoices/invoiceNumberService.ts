import { db } from '@/lib/db';
import { Business, Sale } from '@/types';

/**
 * Formats a prefix and integer sequence into a standardized, zero-padded invoice code.
 * e.g. ("INV-", 1) -> "INV-001"
 * e.g. ("INV-", 25) -> "INV-025"
 * e.g. ("BILL-", 100) -> "BILL-100"
 */
export function formatInvoiceNumber(
  prefix = 'INV-',
  sequenceNumber = 1,
  padDigits = 3
): string {
  const cleanPrefix = prefix ? prefix.trim().toUpperCase() : 'INV-';
  const seq = Math.max(1, Math.floor(sequenceNumber || 1));
  const paddedSeq = String(seq).padStart(padDigits, '0');
  return `${cleanPrefix}${paddedSeq}`;
}

/**
 * Extracts the trailing integer number from an invoice code.
 * e.g. "INV-002" -> 2
 * e.g. "BILL-1045" -> 1045
 */
export function parseInvoiceSequenceNumber(invoiceNumber: string): number | null {
  if (!invoiceNumber) return null;
  const match = invoiceNumber.match(/(\d+)$/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Computes the guaranteed next unique sequential invoice number for a business.
 * Inspects both the business's configured sequence counter and all existing recorded sales
 * to guarantee that no invoice number is ever duplicated or skipped.
 */
export async function getNextUniqueInvoiceNumber(businessId = 'biz_default'): Promise<{
  invoiceNumber: string;
  nextSeq: number;
  prefix: string;
}> {
  const business = await db.businesses.get(businessId);
  const prefix = business?.invoice_prefix || 'INV-';
  const configuredNext = business?.next_invoice_number || 1;

  // Retrieve existing sales for this business to prevent collisions
  const existingSales = await db.sales.where('business_id').equals(businessId).toArray();

  let maxFoundSeq = 0;
  for (const s of existingSales) {
    if (s.invoice_number) {
      const parsed = parseInvoiceSequenceNumber(s.invoice_number);
      if (parsed !== null && parsed > maxFoundSeq) {
        maxFoundSeq = parsed;
      }
    }
  }

  // Next sequence must be strictly greater than any existing sale sequence
  const nextSeq = Math.max(configuredNext, maxFoundSeq + 1);
  const invoiceNumber = formatInvoiceNumber(prefix, nextSeq, 3);

  return {
    invoiceNumber,
    nextSeq,
    prefix,
  };
}

/**
 * Atomically commits and advances the business invoice number counter after a sale is completed.
 */
export async function commitNextInvoiceNumber(
  businessId = 'biz_default',
  usedSequenceNumber: number
): Promise<number> {
  const nextNum = Math.max(1, usedSequenceNumber + 1);
  await db.businesses.update(businessId, {
    next_invoice_number: nextNum,
    updated_at: new Date().toISOString(),
  });
  return nextNum;
}
