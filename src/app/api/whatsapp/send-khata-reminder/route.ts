import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppKhataReminderMessage, formatRecipientPhone } from '@/lib/whatsapp/cloudApi';
import { formatINR, generateUPILink } from '@/lib/utils';
import { getClientIp, checkRateLimit } from '@/lib/security/rateLimiter';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    // 1. Rate Limiting: Max 20 reminder dispatches per minute per IP
    const rateLimit = checkRateLimit(`wa_send_khata:${clientIp}`, 20, 60 * 1000);
    if (!rateLimit.isAllowed) {
      const waitSeconds = Math.ceil((rateLimit.resetTimeMs - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit reached. Please wait ${waitSeconds} seconds before sending another reminder.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      phone,
      customerName = 'Customer',
      balanceDue,
      businessName = 'Our Store',
      storePhone,
      upiId,
      customNote,
    } = body as {
      phone: string;
      customerName?: string;
      balanceDue: number;
      businessName?: string;
      storePhone?: string;
      upiId?: string;
      customNote?: string;
    };

    // 2. Input Validations
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

    if (typeof balanceDue !== 'number' || balanceDue <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid pending balance due amount is required.' },
        { status: 400 }
      );
    }

    // 3. Security: Check authenticated session if present
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (sessionCookie) {
      const session = verifySessionToken(sessionCookie);
      if (!session && process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { success: false, error: 'Session expired. Please log in again.' },
          { status: 401 }
        );
      }
    }

    // 4. Generate UPI link and Web Pay deep-link if UPI ID is configured
    const upiLink = upiId
      ? generateUPILink(upiId, businessName, balanceDue, 'Khata_Udhar_Payment')
      : undefined;

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kamaiplus.proventure.in';
    const payUrl = upiId
      ? `${appBaseUrl}/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(businessName)}&am=${(balanceDue / 100).toFixed(2)}&cust=${encodeURIComponent(customerName)}`
      : undefined;

    // 5. Dispatch via Meta WhatsApp Cloud API
    const result = await sendWhatsAppKhataReminderMessage({
      phone: cleanPhone,
      customerName: customerName.trim(),
      storeName: businessName.trim(),
      balanceDueFormatted: formatINR(balanceDue),
      storePhone: storePhone || undefined,
      upiId: upiId || undefined,
      upiLink,
      payUrl,
      customNote: customNote || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          isAccessDenied: result.isAccessDenied,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      recipient: cleanPhone,
    });
  } catch (err: any) {
    console.error('API /api/whatsapp/send-khata-reminder error:', err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
