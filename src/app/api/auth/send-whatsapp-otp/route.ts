import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppOTP } from '@/lib/whatsapp/cloudApi';

export const dynamic = 'force-dynamic';

// In-memory OTP storage for rapid verification (or falls back to database)
// Key: phone, Value: { code: string, expiresAt: number }
declare global {
  var __kamai_otp_store: Map<string, { code: string; expiresAt: number }> | undefined;
}

if (!globalThis.__kamai_otp_store) {
  globalThis.__kamai_otp_store = new Map();
}

const otpStore = globalThis.__kamai_otp_store;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = (body.phone || '').replace(/\D/g, '');

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Valid 10-digit mobile number is required.' },
        { status: 400 }
      );
    }

    const clean10Digit = phone.slice(-10);

    // Rate limit: Check if OTP sent in the last 30 seconds
    const existing = otpStore.get(clean10Digit);
    const now = Date.now();
    if (existing && existing.expiresAt - now > 9.5 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: 'Please wait 30 seconds before requesting another OTP.' },
        { status: 429 }
      );
    }

    // Generate secure 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes expiry

    otpStore.set(clean10Digit, { code: otpCode, expiresAt });

    // Send via Meta WhatsApp Cloud API
    const sendResult = await sendWhatsAppOTP(clean10Digit, otpCode);

    if (!sendResult.success) {
      console.error('WhatsApp dispatch failed:', sendResult.error);
      return NextResponse.json(
        {
          success: false,
          error: `WhatsApp Delivery Failed: ${sendResult.error}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Verification code sent to WhatsApp (+91 ${clean10Digit}).`,
    });
  } catch (err: any) {
    console.error('Send OTP error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to send OTP.' },
      { status: 500 }
    );
  }
}
