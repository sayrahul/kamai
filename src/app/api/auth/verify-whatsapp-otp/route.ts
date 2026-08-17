import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = (body.phone || '').replace(/\D/g, '');
    const enteredOtp = (body.otp || body.otpCode || '').trim();
    const mode = body.mode || 'login'; // 'login' | 'signup'

    if (!phone || phone.length < 10 || !enteredOtp || enteredOtp.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Valid 10-digit mobile number and 6-digit WhatsApp OTP are required.' },
        { status: 400 }
      );
    }

    const clean10Digit = phone.slice(-10);

    // 1. Strict OTP Validation (Zero backdoor, single-use destruction)
    const stored = globalThis.__kamai_otp_store?.get(clean10Digit);

    if (!stored || stored.expiresAt < Date.now()) {
      globalThis.__kamai_otp_store?.delete(clean10Digit);
      return NextResponse.json(
        { success: false, error: 'OTP has expired or was not requested. Please request a new OTP.' },
        { status: 401 }
      );
    }

    if (stored.code !== enteredOtp) {
      return NextResponse.json(
        { success: false, error: 'Invalid 6-digit OTP code. Please check your WhatsApp.' },
        { status: 401 }
      );
    }

    // 2. Consume OTP immediately (Prevents replay attacks)
    globalThis.__kamai_otp_store?.delete(clean10Digit);

    const supabase = getSupabaseServerClient();
    if (!supabase || !isSupabaseServerConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Cloud database authentication is unavailable. Please check system configuration.' },
        { status: 503 }
      );
    }

    // 3. Look up existing staff and business records in Supabase
    let { data: staff } = await supabase
      .from('business_staff')
      .select('id, business_id, name, phone, role, is_active')
      .eq('phone', clean10Digit)
      .maybeSingle();

    let business = null;

    if (staff) {
      // Deactivated staff check
      if (!staff.is_active) {
        return NextResponse.json(
          { success: false, error: 'This account has been deactivated. Please contact support.' },
          { status: 403 }
        );
      }

      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', staff.business_id)
        .maybeSingle();

      business = biz;
    }

    // 4. Mode-specific handling
    if (mode === 'login') {
      if (!staff || !business) {
        return NextResponse.json(
          {
            success: false,
            error: `No store account found for +91 ${clean10Digit}. Please Register your store first.`,
            requireSignup: true,
          },
          { status: 404 }
        );
      }
    } else {
      // Signup Mode
      if (staff) {
        return NextResponse.json(
          {
            success: false,
            error: `An account with +91 ${clean10Digit} already exists. Please Sign In instead.`,
            requireLogin: true,
          },
          { status: 409 }
        );
      }

      const storeName = (body.storeName || '').trim();
      const ownerName = (body.ownerName || '').trim();
      const rawPin = (body.pin || '1234').trim();

      if (!storeName || !ownerName) {
        return NextResponse.json(
          { success: false, error: 'Store Name and Owner Name are required for registration.' },
          { status: 400 }
        );
      }

      // Hash PIN securely with bcrypt
      const pinHash = await bcrypt.hash(rawPin, 10);

      // Create business record in Supabase
      const { data: newBiz, error: bizErr } = await supabase
        .from('businesses')
        .insert({
          name: storeName,
          owner_name: ownerName,
          phone: clean10Digit,
          business_type: body.businessType || 'grocery',
          subscription_tier: 'free',
        })
        .select()
        .single();

      if (bizErr || !newBiz) {
        console.error('Failed to insert business:', bizErr);
        return NextResponse.json(
          { success: false, error: 'Failed to create business in database. Please try again.' },
          { status: 500 }
        );
      }

      business = newBiz;

      // Create owner staff record in Supabase
      const { data: newStaff, error: staffErr } = await supabase
        .from('business_staff')
        .insert({
          business_id: newBiz.id,
          name: ownerName,
          phone: clean10Digit,
          pin_hash: pinHash,
          role: 'owner',
          is_active: true,
        })
        .select()
        .single();

      if (staffErr || !newStaff) {
        console.error('Failed to insert staff, rolling back business:', staffErr);
        await supabase.from('businesses').delete().eq('id', newBiz.id);
        return NextResponse.json(
          { success: false, error: 'Failed to create owner profile. Please try again.' },
          { status: 500 }
        );
      }

      staff = newStaff;
    }

    if (!staff || !business) {
      return NextResponse.json(
        { success: false, error: 'Account profile could not be resolved. Please try again.' },
        { status: 404 }
      );
    }

    // 5. Issue 30-Day httpOnly Signed JWT Session Cookie
    const token = signSessionToken({
      staff_id: staff.id,
      business_id: business.id,
      phone: clean10Digit,
      role: (staff.role as any) || 'owner',
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({
      success: true,
      user: {
        id: staff.id,
        name: staff.name,
        phone: clean10Digit,
        role: staff.role || 'owner',
        business_id: business.id,
        business_name: business.name,
        subscription_tier: business.subscription_tier || 'free',
        subscription_valid_until: business.subscription_valid_until,
      },
      business,
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
    console.error('Verify OTP error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Authentication verification failed.' },
      { status: 500 }
    );
  }
}
