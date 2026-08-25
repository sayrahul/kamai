import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth/session';
import { getClientIp, checkRateLimit } from '@/lib/security/rateLimiter';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits'),
});

// Security: Constant generic error message to prevent phone enumeration attacks
const AUTH_FAILED_MESSAGE = 'Mobile number or PIN is incorrect.';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    // Rate Limiting: Max 10 attempts per IP within 5 minutes
    const rateLimit = checkRateLimit(`auth_login:${clientIp}`, 10, 5 * 60 * 1000);
    if (!rateLimit.isAllowed) {
      const waitMinutes = Math.ceil((rateLimit.resetTimeMs - Date.now()) / (60 * 1000));
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please wait ${waitMinutes} minutes before trying again.`,
        },
        { status: 429 }
      );
    }

    const rawBody = await req.json().catch(() => ({}));
    const normalizedBody = {
      phone: (rawBody.phone || '').replace(/\D/g, ''),
      pin: rawBody.pin || rawBody.password || '',
    };

    const parseResult = loginSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: AUTH_FAILED_MESSAGE }, { status: 400 });
    }

    const { phone, pin } = parseResult.data;

    const supabase = getSupabaseServerClient();
    if (!supabase || !isSupabaseServerConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase server is not configured.',
          offlineFallback: true,
        },
        { status: 503 }
      );
    }

    // 1. Look up staff member by phone
    const { data: staff, error: staffError } = await supabase
      .from('business_staff')
      .select('id, business_id, name, phone, pin_hash, role, is_active')
      .eq('phone', phone)
      .maybeSingle();

    if (staffError || !staff) {
      // Deliberately return standard message to prevent phone enumeration
      return NextResponse.json({ success: false, error: AUTH_FAILED_MESSAGE }, { status: 401 });
    }

    // 2. Check if account is active
    if (staff.is_active === false) {
      return NextResponse.json(
        { success: false, error: 'This staff account has been deactivated. Please contact your store owner.' },
        { status: 403 }
      );
    }

    // 3. Verify PIN with bcrypt
    const isPinValid = await bcrypt.compare(pin, staff.pin_hash);
    if (!isPinValid) {
      return NextResponse.json({ success: false, error: AUTH_FAILED_MESSAGE }, { status: 401 });
    }

    // 4. Fetch linked Business profile & subscription info
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', staff.business_id)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ success: false, error: 'Store profile not found.' }, { status: 404 });
    }

    // 5. Mint 30-day JWT session token
    const token = signSessionToken({
      staff_id: staff.id,
      business_id: business.id,
      phone: staff.phone,
      role: staff.role,
    });

    // 6. Build response and set httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        business_type: business.business_type,
        owner_name: business.owner_name,
        phone: business.phone,
        address: business.address,
        pincode: business.pincode,
        gstin: business.gstin,
        upi_id: business.upi_id,
        invoice_prefix: business.invoice_prefix,
        next_invoice_number: business.next_invoice_number,
        subscription_tier: business.subscription_tier || 'free',
        subscription_valid_until: business.subscription_valid_until,
      },
      user: {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        role: staff.role,
        business_id: business.id,
        business_name: business.name,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Login handler error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
