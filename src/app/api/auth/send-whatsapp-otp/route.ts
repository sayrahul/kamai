import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendWhatsAppOTP } from '@/lib/whatsapp/cloudApi';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// In-memory OTP storage with strict expiry
// Key: phone, Value: { code: string, expiresAt: number, lastRequestedAt: number }
declare global {
  var __kamai_otp_store: Map<string, { code: string; expiresAt: number; lastRequestedAt: number }> | undefined;
}

if (!globalThis.__kamai_otp_store) {
  globalThis.__kamai_otp_store = new Map();
}

const otpStore = globalThis.__kamai_otp_store;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = (body.phone || '').replace(/\D/g, '');
    const mode = body.mode || 'login'; // 'login' | 'signup'

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Valid 10-digit mobile number is required.' },
        { status: 400 }
      );
    }

    const clean10Digit = phone.slice(-10);
    const now = Date.now();

    // 1. Rate Limiting: 60-second cooldown per mobile number
    const existing = otpStore.get(clean10Digit);
    if (existing && now - existing.lastRequestedAt < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - (now - existing.lastRequestedAt)) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${waitSeconds} seconds before requesting another OTP.`,
        },
        { status: 429 }
      );
    }

    // 2. Database Authorization Checks
    const supabase = getSupabaseServerClient();
    if (supabase && isSupabaseServerConfigured()) {
      const { data: staff } = await supabase
        .from('business_staff')
        .select('id, name, is_active')
        .eq('phone', clean10Digit)
        .maybeSingle();

      // On LOGIN: Reject unregistered users before dispatching WhatsApp message (saves cost & prevents unauthorized attempts)
      if (mode === 'login') {
        if (!staff) {
          return NextResponse.json(
            {
              success: false,
              error: `No store registered with +91 ${clean10Digit}. Please Register your store first.`,
              requireSignup: true,
            },
            { status: 404 }
          );
        }
        if (!staff.is_active) {
          return NextResponse.json(
            {
              success: false,
              error: 'This account has been deactivated. Please contact support.',
            },
            { status: 403 }
          );
        }
      }

      // On SIGNUP: Reject if mobile number is already registered
      if (mode === 'signup' && staff) {
        return NextResponse.json(
          {
            success: false,
            error: `An account with +91 ${clean10Digit} already exists. Please Sign In.`,
            requireLogin: true,
          },
          { status: 409 }
        );
      }
    }

    // 3. Cryptographically Strong 6-Digit OTP
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes lifetime

    otpStore.set(clean10Digit, {
      code: otpCode,
      expiresAt,
      lastRequestedAt: now,
    });

    // 4. Send Official WhatsApp Authentication Template Message
    const sendResult = await sendWhatsAppOTP(clean10Digit, otpCode);

    if (!sendResult.success) {
      console.error('WhatsApp dispatch failed:', sendResult.error);
      const isDev = process.env.NODE_ENV !== 'production';

      return NextResponse.json(
        {
          success: false,
          error: `WhatsApp Delivery Failed: ${sendResult.error}`,
          errorCode: sendResult.errorCode,
          isAccessDenied: sendResult.isAccessDenied,
          devOtp: isDev ? otpCode : undefined,
          metaDiagnostic: sendResult.isAccessDenied
            ? {
                issue: 'Meta App in Development Mode',
                resolution: `Add +91${clean10Digit} to the "To" test number list in Meta Developer Portal (WhatsApp > API Setup), or switch Meta App to Live Mode.`,
              }
            : undefined,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Official OTP sent to your WhatsApp (+91 ${clean10Digit}).`,
    });
  } catch (err: any) {
    console.error('Send OTP exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to send OTP.' },
      { status: 500 }
    );
  }
}
