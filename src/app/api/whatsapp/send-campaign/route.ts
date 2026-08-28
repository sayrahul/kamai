import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppCustomNotification, formatRecipientPhone } from '@/lib/whatsapp/cloudApi';
import { getClientIp, checkRateLimit } from '@/lib/security/rateLimiter';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    // 1. Rate Limiting: Max 30 marketing / greeting dispatches per minute per IP
    const rateLimit = checkRateLimit(`wa_send_campaign:${clientIp}`, 30, 60 * 1000);
    if (!rateLimit.isAllowed) {
      const waitSeconds = Math.ceil((rateLimit.resetTimeMs - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit reached. Please wait ${waitSeconds} seconds before sending more campaign messages.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      phone,
      message,
      customerName,
      campaignTitle,
    } = body as {
      phone: string;
      message: string;
      customerName?: string;
      campaignTitle?: string;
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

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message content cannot be empty.' },
        { status: 400 }
      );
    }

    // 3. Security: Check session
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (sessionCookie) {
      const session = verifySessionToken(sessionCookie);
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Session expired. Please log in again.' },
          { status: 401 }
        );
      }
    }

    // 4. Dispatch via Meta WhatsApp Cloud API
    const result = await sendWhatsAppCustomNotification({
      phone: cleanPhone,
      message: message.trim(),
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
      campaignTitle: campaignTitle || 'Campaign Notification',
    });
  } catch (err: any) {
    console.error('API /api/whatsapp/send-campaign error:', err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
