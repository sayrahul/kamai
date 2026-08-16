import { Sale, Business } from '@/types';
import { formatINR, generateUPILink } from '@/lib/utils';

export interface SharedInvoicePayload {
  b_name: string;
  b_tagline?: string;
  b_logo?: string;
  b_owner?: string;
  b_phone?: string;
  b_email?: string;
  b_address?: string;
  b_gstin?: string;
  b_upi?: string;
  b_terms?: string;
  s_inv: string;
  s_date: string;
  s_cust?: string;
  s_phone?: string;
  s_subtotal: number;
  s_discount?: number;
  s_tax: number;
  s_total: number;
  s_received: number;
  s_balance: number;
  s_method: string;
  s_status: string;
  items: Array<{
    name: string;
    qty: number;
    unit: string;
    price: number;
    tax: number;
    discount?: number;
    total: number;
  }>;
}

/**
 * Encodes an invoice into a compressed Base64 URL parameter
 */
export function encodeInvoiceForSharing(sale: Sale, business: Business): string {
  try {
    const payload: SharedInvoicePayload = {
      b_name: business.name,
      b_tagline: business.tagline,
      b_logo: business.logo_url,
      b_owner: business.owner_name,
      b_phone: business.phone,
      b_email: business.email,
      b_address: business.address,
      b_gstin: business.gstin,
      b_upi: business.upi_id,
      b_terms: business.terms_conditions,
      s_inv: sale.invoice_number,
      s_date: sale.created_at,
      s_cust: sale.customer_name,
      s_phone: sale.customer_phone,
      s_subtotal: sale.subtotal,
      s_discount: sale.discount_total,
      s_tax: sale.tax_total,
      s_total: sale.grand_total,
      s_received: sale.amount_received,
      s_balance: sale.balance_due,
      s_method: sale.payment_method,
      s_status: sale.payment_status,
      items: sale.items.map((i) => ({
        name: i.product_name,
        qty: i.quantity,
        unit: i.unit,
        price: i.unit_price,
        tax: i.tax_rate,
        discount: i.discount_amount,
        total: i.total_amount,
      })),
    };

    const json = JSON.stringify(payload);
    if (typeof window !== 'undefined') {
      return btoa(unescape(encodeURIComponent(json)));
    }
    return Buffer.from(json).toString('base64');
  } catch (err) {
    console.error('Failed to encode invoice payload:', err);
    return '';
  }
}

/**
 * Decodes a shared invoice payload from Base64 string
 */
export function decodeInvoicePayload(base64: string): SharedInvoicePayload | null {
  try {
    let json = '';
    if (typeof window !== 'undefined') {
      json = decodeURIComponent(escape(atob(base64)));
    } else {
      json = Buffer.from(base64, 'base64').toString('utf-8');
    }
    return JSON.parse(json) as SharedInvoicePayload;
  } catch (err) {
    console.error('Failed to decode invoice payload:', err);
    return null;
  }
}

/**
 * Generates an elegant, detailed WhatsApp receipt text message
 */
export function generateWhatsAppInvoiceMessage(
  sale: Sale,
  business: Business,
  originUrl?: string
): string {
  const origin = originUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const encodedPayload = encodeInvoiceForSharing(sale, business);
  const digitalInvoiceUrl = `${origin}/invoice?d=${encodedPayload}`;

  const header = `🧾 *TAX INVOICE / BILL*\n*${business.name.toUpperCase()}*`;
  const info = `${business.phone ? `📞 ${business.phone}` : ''}${business.address ? `\n📍 ${business.address}` : ''}${business.gstin ? `\nGSTIN: ${business.gstin}` : ''}`;
  
  const invDetails = `\n─────────────────────\n*Bill No:* #${sale.invoice_number}\n*Date:* ${new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n*Customer:* ${sale.customer_name || 'Cash Customer'}\n─────────────────────`;

  const itemsList = sale.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.product_name}*\n   ${item.quantity} ${item.unit} x ${formatINR(item.unit_price)} = *${formatINR(item.total_amount)}*`
    )
    .join('\n');

  const paymentBreakdown = `─────────────────────\n*Subtotal:* ${formatINR(sale.subtotal)}${sale.tax_total > 0 ? `\n*Tax (GST):* ${formatINR(sale.tax_total)}` : ''}\n*Grand Total: ${formatINR(sale.grand_total)}*\n\n*Payment Mode:* ${sale.payment_method.toUpperCase()}\n*Paid Amount:* ${formatINR(sale.amount_received)}${
    sale.balance_due > 0
      ? `\n⚠️ *Udhar / Balance Due: ${formatINR(sale.balance_due)}*`
      : '\n✅ *Status: Fully Paid*'
  }`;

  const upiPay = business.upi_id && sale.balance_due > 0
    ? `\n\n💳 *Pay Pending Amount via UPI:*\n${generateUPILink(business.upi_id, business.name, sale.balance_due, sale.invoice_number)}`
    : '';

  const digitalLink = `\n\n📄 *View & Download PDF Invoice Online:*\n${digitalInvoiceUrl}`;

  const footer = `\n\n_Thank you for your business! Visit again._ 🙏`;

  return `${header}\n${info}${invDetails}\n\n*ITEMS PURCHASED:*\n${itemsList}\n\n${paymentBreakdown}${upiPay}${digitalLink}${footer}`;
}

/**
 * Directly opens WhatsApp Web or WhatsApp mobile application
 */
export function sendInvoiceViaWhatsApp(
  phone: string,
  sale: Sale,
  business: Business,
  originUrl?: string
) {
  const message = generateWhatsAppInvoiceMessage(sale, business, originUrl);
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const url = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
}
