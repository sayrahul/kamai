import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { signAdminToken, ADMIN_COOKIE_NAME } from '@/lib/admin/adminAuth';
import { getClientIp, checkRateLimit } from '@/lib/security/rateLimiter';

export const dynamic = 'force-dynamic';

let hasLoggedAdminPasswordDevWarning = false;

function getSuperAdminPassword(): string | null {
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envPassword) {
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
    if (!hasLoggedAdminPasswordDevWarning) {
      console.warn(
        '⚠️ [SECURITY WARNING] ADMIN_PASSWORD is unset. Using development fallback. Configure ADMIN_PASSWORD in .env.local for production.'
      );
      hasLoggedAdminPasswordDevWarning = true;
    }
    return 'Vivaan@52523384';
  }
  return envPassword;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    // 1. Rate Limiting: Max 5 failed attempts per IP within 15 minutes
    const rateLimit = checkRateLimit(`admin_login:${clientIp}`, 5, 15 * 60 * 1000);
    if (!rateLimit.isAllowed) {
      const waitMinutes = Math.ceil((rateLimit.resetTimeMs - Date.now()) / (60 * 1000));
      return NextResponse.json(
        {
          success: false,
          message: `Too many login attempts. Please wait ${waitMinutes} minutes before trying again.`,
        },
        { status: 429 }
      );
    }

    const expectedPassword = getSuperAdminPassword();
    if (!expectedPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'SuperAdmin authentication is disabled: ADMIN_PASSWORD environment variable is not configured.',
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const inputPassword = typeof body.password === 'string' ? body.password : '';

    if (!inputPassword) {
      return NextResponse.json(
        { success: false, message: 'Password is required' },
        { status: 400 }
      );
    }

    // 2. Constant-time hash comparison to prevent timing attacks
    const inputHash = crypto.createHash('sha256').update(inputPassword).digest();
    const expectedHash = crypto.createHash('sha256').update(expectedPassword).digest();

    const isMatch = crypto.timingSafeEqual(inputHash, expectedHash);

    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid SuperAdmin Password' },
        { status: 401 }
      );
    }

    // 3. Issue signed JWT session token
    const token = signAdminToken();
    const isProduction = process.env.NODE_ENV === 'production';

    const response = NextResponse.json({
      success: true,
      message: 'SuperAdmin Authenticated',
    });

    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
