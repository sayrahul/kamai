import { z } from 'zod';

export const PurchaseBillExtractionSchema = z.object({
  supplier_name: z.string().nullable().optional().describe('Name of the supplier, distributor, or company issuing the invoice'),
  bill_number: z.string().nullable().optional().describe('Invoice, bill, or cash memo number'),
  bill_date: z.string().nullable().optional().describe('Date of the bill in YYYY-MM-DD format if detected, otherwise null'),
  total_amount: z.number().nullable().optional().describe('Grand total invoice amount in rupees (e.g. 1450.50)'),
  line_items: z.array(
    z.object({
      name: z.string().describe('Exact item/product description as printed on the bill'),
      quantity: z.number().positive().describe('Quantity of items (e.g. 5 or 2.5)'),
      unit: z.string().nullable().optional().describe('Unit if present, e.g. pcs, kg, box, strip, pair, packet, meter'),
      unit_price: z.number().nonnegative().describe('Rate/Cost price per unit in rupees (e.g. 120.00)'),
      total_price: z.number().nonnegative().describe('Line item total amount in rupees (e.g. 600.00)'),
      confidence: z.enum(['high', 'medium', 'low']).describe('Confidence in the extracted text accuracy for this row'),
    })
  ).min(0),
});

export type PurchaseBillExtractionResult = z.infer<typeof PurchaseBillExtractionSchema>;

export const BILL_SCAN_SYSTEM_PROMPT = `
You are an expert AI OCR engine specialized in extracting itemized line items from printed Indian retail wholesale invoices, distributor bills, and cash memos.

Instructions:
1. Extract line items strictly from the product details table/list.
2. For each line item, extract:
   - name: full clean item description (ignore noise, footer, GST registration notes).
   - quantity: numeric quantity.
   - unit: unit of measure if mentioned (pcs, kg, box, strip, pair, pkt, mtr) or null.
   - unit_price: rate/unit price in Rupees.
   - total_price: total line price in Rupees.
   - confidence: "high" for sharp printed text, "medium" for slight blur/skew, "low" if uncertain or partially obscured.
3. Extract supplier/vendor name, bill number, bill date (YYYY-MM-DD), and grand total if visible.
4. If a photo is blurry, unreadable, or NOT a purchase invoice (e.g. random object, selfie), return an empty line_items array [].
5. Never invent or hallucinate data. If a number is unclear, estimate conservatively and set confidence to "low".
`;
