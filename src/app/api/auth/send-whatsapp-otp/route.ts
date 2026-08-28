import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendWhatsAppOTP } from '@/lib/whatsapp/cloudApi';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { checkOtpCooldown, setLocalOtp, signOtpSessionToken } from '@/lib/auth/otpService';

export const dynamic = 'force-dynamic';

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
    const cooldown = checkOtpCooldown(clean10Digit);
    if (!cooldown.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${cooldown.waitSeconds} seconds before requesting another OTP.`,
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

      // On LOGIN: Reject unregistered users before dispatching WhatsApp message
      if (mode === 'login') {
        if (!staff) {
          return NextResponse.json(
            {
              success: false,
              error: `No store registered with +91 ${clean10Digit}. Please Register your store.`,
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

    // Save in local cache & create stateless signed token for multi-instance serverless verification
    setLocalOtp(clean10Digit, otpCode, expiresAt);
    const otpSessionToken = signOtpSessionToken(clean10Digit, otpCode, expiresAt);

    // 4. Send Official WhatsApp Authentication Template Message
    const sendResult = await sendWhatsAppOTP(clean10Digit, otpCode);

    if (!sendResult.success) {
      console.error('WhatsApp dispatch failed:', sendResult.error);
      const isDev = process.env.NODE_ENV !== 'production';

      const errResponse = NextResponse.json(
        {
          success: false,
          error: `WhatsApp Delivery: ${sendResult.error}`,
          errorCode: sendResult.errorCode,
          isAccessDenied: sendResult.isAccessDenied,
          devOtp: isDev ? otpCode : undefined,
          otpSessionToken: isDev ? otpSessionToken : undefined,
        },
        { status: 502 }
      );

      // Set cookie for dev mode testing
      if (isDev) {
        errResponse.cookies.set({
          name: 'kamai_otp_session',
          value: otpSessionToken,
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 600,
          path: '/',
        });
      }

      return errResponse;
    }

    const response = NextResponse.json({
      success: true,
      message: `Official OTP sent to your WhatsApp (+91 ${clean10Digit}).`,
      otpSessionToken,
    });

    // Set secure HttpOnly cookie for seamless serverless verification across lambdas
    response.cookies.set({
      name: 'kamai_otp_session',
      value: otpSessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Send OTP exception:', err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to send OTP.' },
      { status: 500 }
    );
  }
}
