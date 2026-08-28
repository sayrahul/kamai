import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth/session';
import { verifyStatelessOtp, verifyLocalOtp } from '@/lib/auth/otpService';

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

    // 1. Multi-Layer OTP Verification: Stateless Signed Token (Serverless) + Memory Cache Fallback
    const otpSessionToken = body.otpSessionToken || req.cookies.get('kamai_otp_session')?.value;
    let isOtpValid = false;
    let verificationError = 'Invalid or expired OTP.';

    if (otpSessionToken) {
      const statelessResult = verifyStatelessOtp(clean10Digit, enteredOtp, otpSessionToken);
      if (statelessResult.valid) {
        isOtpValid = true;
      } else {
        verificationError = statelessResult.error || verificationError;
      }
    }

    // If stateless verification didn't match, check local cache (backup)
    if (!isOtpValid) {
      const localResult = verifyLocalOtp(clean10Digit, enteredOtp);
      if (localResult.valid) {
        isOtpValid = true;
      } else if (!otpSessionToken) {
        verificationError = localResult.error || verificationError;
      }
    }

    if (!isOtpValid) {
      return NextResponse.json(
        { success: false, error: verificationError },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase || !isSupabaseServerConfigured()) {
      // Offline fallback token generation
      const fallbackToken = signSessionToken({
        staff_id: `staff_${clean10Digit}`,
        business_id: `biz_${clean10Digit}`,
        phone: clean10Digit,
        role: 'owner',
      });

      const chosenStoreName = body.storeName?.trim() || 'My Store';
      const chosenOwnerName = body.ownerName?.trim() || 'Store Owner';
      const chosenBusinessType = body.businessType || 'grocery';

      const response = NextResponse.json({
        success: true,
        user: {
          id: `staff_${clean10Digit}`,
          name: chosenOwnerName,
          phone: clean10Digit,
          role: 'owner',
          business_id: `biz_${clean10Digit}`,
          business_name: chosenStoreName,
          subscription_tier: 'pro',
        },
        business: {
          id: `biz_${clean10Digit}`,
          name: chosenStoreName,
          owner_name: chosenOwnerName,
          business_type: chosenBusinessType,
          subscription_tier: 'pro',
        }
      });

      // Clear the used OTP session cookie
      response.cookies.set({
        name: 'kamai_otp_session',
        value: '',
        maxAge: 0,
        path: '/',
      });

      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: fallbackToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      });

      return response;
    }

    // 3. Look up existing staff and business records in Supabase
    let { data: staff } = await supabase
      .from('business_staff')
      .select('id, business_id, name, phone, role, is_active')
      .eq('phone', clean10Digit)
      .maybeSingle();

    let business = null;

    if (staff) {
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

    // Mode-specific handling
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
    } else if (mode === 'signup') {
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

      const newBizId = `biz_${clean10Digit}_${Date.now()}`;
      const newStaffId = `staff_${clean10Digit}_${Date.now()}`;
      const chosenStoreName = body.storeName?.trim() || 'My Store';
      const chosenOwnerName = body.ownerName?.trim() || 'Store Owner';
      const chosenBusinessType = body.businessType || 'grocery';
      const chosenAddress = body.address?.trim() || '';

      const { data: newBiz, error: createBizErr } = await supabase
        .from('businesses')
        .insert({
          id: newBizId,
          name: chosenStoreName,
          business_type: chosenBusinessType,
          owner_name: chosenOwnerName,
          phone: clean10Digit,
          address: chosenAddress,
          subscription_tier: 'free',
          subscription_valid_until: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createBizErr || !newBiz) {
        console.error('Failed to create business in Supabase:', createBizErr);
        return NextResponse.json(
          { success: false, error: 'Failed to create business account. Please try again.' },
          { status: 500 }
        );
      }

      const dummyPassHash = await bcrypt.hash(`WA_AUTH_${clean10Digit}_${Date.now()}`, 10);
      const { data: newStaff, error: createStaffErr } = await supabase
        .from('business_staff')
        .insert({
          id: newStaffId,
          business_id: newBiz.id,
          name: chosenOwnerName,
          phone: clean10Digit,
          password_hash: dummyPassHash,
          role: 'owner',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createStaffErr || !newStaff) {
        console.error('Failed to create staff record in Supabase:', createStaffErr);
        await supabase.from('businesses').delete().eq('id', newBiz.id);
        return NextResponse.json(
          { success: false, error: 'Failed to create staff user record. Please try again.' },
          { status: 500 }
        );
      }

      staff = newStaff;
      business = newBiz;
    }

    if (!staff || !business) {
      return NextResponse.json(
        { success: false, error: 'Authentication could not complete.' },
        { status: 500 }
      );
    }

    const sessionToken = signSessionToken({
      staff_id: staff.id,
      business_id: business.id,
      phone: staff.phone,
      role: staff.role || 'owner',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        role: staff.role,
        business_id: business.id,
        business_name: business.name,
        subscription_tier: business.subscription_tier || 'free',
      },
      business: {
        id: business.id,
        name: business.name,
        owner_name: business.owner_name,
        business_type: business.business_type,
        subscription_tier: business.subscription_tier || 'free',
      }
    });

    // Clear the used OTP session cookie
    response.cookies.set({
      name: 'kamai_otp_session',
      value: '',
      maxAge: 0,
      path: '/',
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Verify OTP exception:', err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Authentication failed.' },
      { status: 500 }
    );
  }
}
