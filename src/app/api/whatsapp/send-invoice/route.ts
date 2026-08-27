import { NextRequest, NextResponse } from 'next/server';
import { sendOfficialWhatsAppInvoice } from '@/lib/whatsapp/cloudApi';
import { encodeInvoiceForSharing, generateWhatsAppInvoiceMessage } from '@/lib/invoices/whatsappInvoice';
import { formatINR } from '@/lib/utils';
import { Sale, Business } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, sale, business, pdfBase64, customNotes } = body as {
      phone: string;
      sale: Sale;
      business: Business;
      pdfBase64?: string;
      customNotes?: string;
    };

    if (!phone || !sale || !business) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters (phone, sale, business).' },
        { status: 400 }
      );
    }

    const host = req.headers.get('host') || 'kamaiplus.proventure.in';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Generate online viewing link
    const encodedPayload = encodeInvoiceForSharing(sale, business);
    const viewOnlineUrl = `${baseUrl}/invoice?data=${encodedPayload}`;

    // Generate textual breakdown
    const itemsSummary = sale.items
      .map((item, i) => `${i + 1}. *${item.product_name}* (${item.quantity} ${item.unit}) - ${formatINR(item.total_amount)}`)
      .join('\n');

    const paymentInfo = `*Payment Mode:* ${sale.payment_method.toUpperCase()}${
      sale.balance_due > 0 ? `\n⚠️ *Udhar / Balance Due:* ${formatINR(sale.balance_due)}` : '\n✅ *Status:* Fully Paid'
    }`;

    const summaryText = `*ITEMS PURCHASED:*\n${itemsSummary}\n\n${paymentInfo}${customNotes ? `\n\n📌 *Note:* ${customNotes}` : ''}`;

    const result = await sendOfficialWhatsAppInvoice({
      toPhone: phone,
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
          fallbackUrl: `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(
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
    console.error('API /api/whatsapp/send-invoice error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
