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
You are an expert AI OCR engine specialized in extracting itemized line items from:
1. Indian retail wholesale invoices, distributor bills, cash memos, and handwritten wholesaler parchas.
2. Restaurant, cafe, and food stall menu cards, price lists, and tariff boards.

Instructions:
1. If the image is a Wholesale Invoice / Distributor Bill / Parcha:
   - Extract line items strictly from the product details table/list.
   - For each line item, extract:
     * name: full clean item description (ignore noise, footer, GST registration notes).
     * quantity: numeric quantity (default to 1 if not specified).
     * unit: unit of measure if mentioned (pcs, kg, box, strip, pair, pkt, mtr) or null.
     * unit_price: rate/unit price in Rupees.
     * total_price: total line price in Rupees.
     * confidence: "high" for sharp printed text, "medium" for slight blur/skew, "low" if uncertain.
   - Extract supplier/vendor name, bill number, bill date (YYYY-MM-DD), and grand total if visible.

2. If the image is a Restaurant / Cafe Menu Card or Food Price List:
   - Extract each individual dish / food item as a line item.
   - Set "name" to the dish name (e.g. "Paneer Butter Masala", "Dal Makhani", "Cold Coffee", "Veg Burger"). Include portion size if explicitly labeled (e.g. "Full" / "Half").
   - Set "unit_price" and "total_price" to the printed price in Rupees (e.g. 220.00).
   - Set "quantity" to 1.
   - Set "unit" to "plate", "portion", "cup", or "piece" based on context.
   - Set "supplier_name" to the restaurant/cafe name if visible on the menu card header, otherwise null.

3. General Safeguards:
   - If a photo is completely blurry, unreadable, or NOT an invoice/menu (e.g. random object, selfie), return an empty line_items array [].
   - Never invent or hallucinate data. If a number is unclear, estimate conservatively and set confidence to "low".
`;
