import { NextRequest, NextResponse } from 'next/server';
import { sendOfficialWhatsAppInvoice, formatRecipientPhone } from '@/lib/whatsapp/cloudApi';
import { encodeInvoiceForSharing, generateWhatsAppInvoiceMessage } from '@/lib/invoices/whatsappInvoice';
import { formatINR } from '@/lib/utils';
import { Sale, Business } from '@/types';
import { getClientIp, checkRateLimit } from '@/lib/security/rateLimiter';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    // 1. Rate Limiting: Max 20 invoice dispatches per minute per IP
    const rateLimit = checkRateLimit(`wa_send_inv:${clientIp}`, 20, 60 * 1000);
    if (!rateLimit.isAllowed) {
      const waitSeconds = Math.ceil((rateLimit.resetTimeMs - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Too many invoice requests. Please wait ${waitSeconds} seconds before sending another bill.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { phone, sale, business, pdfBase64, customNotes } = body as {
      phone: string;
      sale: Sale;
      business: Business;
      pdfBase64?: string;
      customNotes?: string;
    };

    // 2. Comprehensive Input Validation
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Recipient phone number is required.' },
        { status: 400 }
      );
    }

    const cleanPhone = formatRecipientPhone(phone);
    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    if (!sale || typeof sale !== 'object' || !sale.invoice_number) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing invoice/sale data.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(sale.items) || sale.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invoice must contain at least one item.' },
        { status: 400 }
      );
    }

    if (typeof sale.grand_total !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invoice grand total must be a valid number.' },
        { status: 400 }
      );
    }

    if (!business || typeof business !== 'object' || !business.name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Store/business details are missing.' },
        { status: 400 }
      );
    }

    // 3. Security: Check authenticated session if available to prevent cross-business tampering
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (sessionCookie) {
      const session = verifySessionToken(sessionCookie);
      if (session && sale.business_id && session.business_id !== sale.business_id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Cannot send invoices for another business.' },
          { status: 403 }
        );
      }
    }

    const host = req.headers.get('host') || 'kamaiplus.proventure.in';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // 4. Generate online viewing link
    const encodedPayload = encodeInvoiceForSharing(sale, business);
    const viewOnlineUrl = `${baseUrl}/invoice?data=${encodedPayload}`;

    // 5. Generate textual breakdown
    const itemsSummary = sale.items
      .map((item, i) => `${i + 1}. *${item.product_name}* (${item.quantity} ${item.unit}) - ${formatINR(item.total_amount)}`)
      .join('\n');

    const paymentInfo = `*Payment Mode:* ${(sale.payment_method || 'CASH').toUpperCase()}${
      (sale.balance_due || 0) > 0 ? `\n⚠️ *Udhar / Balance Due:* ${formatINR(sale.balance_due)}` : '\n✅ *Status:* Fully Paid'
    }`;

    const summaryText = `*ITEMS PURCHASED:*\n${itemsSummary}\n\n${paymentInfo}${customNotes ? `\n\n📌 *Note:* ${customNotes}` : ''}`;

    const result = await sendOfficialWhatsAppInvoice({
      toPhone: cleanPhone,
      customerName: sale.customer_name,
      invoiceNumber: sale.invoice_number,
      businessName: business.name,
      grandTotalFormatted: formatINR(sale.grand_total),
      pdfBase64: pdfBase64 || undefined,
      viewOnlineUrl,
      summaryText,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          isAccessDenied: result.isAccessDenied,
          fallbackUrl: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
            generateWhatsAppInvoiceMessage(sale, business, baseUrl)
          )}`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      method: result.method,
      viewOnlineUrl,
    });
  } catch (err: any) {
    console.error('API /api/whatsapp/send-invoice error:', err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
