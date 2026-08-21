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

    // 0. Dedicated Testing Account Override (9595997711 -> OTP 123456)
    const isTestAccount = clean10Digit === '9595997711' && enteredOtp === '123456';

    if (!isTestAccount) {
      // 1. Strict OTP Validation for standard users
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

      // Consume OTP immediately
      globalThis.__kamai_otp_store?.delete(clean10Digit);
    }

    const supabase = getSupabaseServerClient();
    if (!supabase || !isSupabaseServerConfigured()) {
      // Offline fallback token generation for development
      const fallbackToken = signSessionToken({
        staff_id: `staff_${clean10Digit}`,
        business_id: `biz_${clean10Digit}`,
        phone: clean10Digit,
        role: 'owner',
      });

      const chosenStoreName = body.storeName?.trim() || (clean10Digit === '9595997711' ? 'Rahul Super Store' : 'My Store');
      const chosenOwnerName = body.ownerName?.trim() || (clean10Digit === '9595997711' ? 'Rahul Jadhav' : 'Store Owner');
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

    // 4. Test account handling: Allow dynamic testing across all business niches
    if (isTestAccount) {
      const chosenStoreName = (body.storeName || '').trim() || (business?.name || 'Rahul Super Store');
      const chosenOwnerName = (body.ownerName || '').trim() || (business?.owner_name || 'Rahul Jadhav');
      const chosenBusinessType = body.businessType || business?.business_type || 'grocery';
      const pinHash = await bcrypt.hash('123456', 10);

      if (!business) {
        const { data: testBiz } = await supabase
          .from('businesses')
          .insert({
            name: chosenStoreName,
            owner_name: chosenOwnerName,
            phone: '9595997711',
            business_type: chosenBusinessType,
            subscription_tier: 'pro',
          })
          .select()
          .single();

        business = testBiz;
      } else {
        // Update existing test account with chosen category/name for instant live testing
        const { data: updatedBiz } = await supabase
          .from('businesses')
          .update({
            name: chosenStoreName,
            owner_name: chosenOwnerName,
            business_type: chosenBusinessType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', business.id)
          .select()
          .single();

        if (updatedBiz) business = updatedBiz;
      }

      if (!staff && business) {
        const { data: testStaff } = await supabase
          .from('business_staff')
          .insert({
            business_id: business.id,
            name: chosenOwnerName,
            phone: '9595997711',
            pin_hash: pinHash,
            role: 'owner',
            is_active: true,
          })
          .select()
          .single();

        staff = testStaff;
      } else if (staff) {
        const { data: updatedStaff } = await supabase
          .from('business_staff')
          .update({
            name: chosenOwnerName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', staff.id)
          .select()
          .single();

        if (updatedStaff) staff = updatedStaff;
      }
    }

    // Mode-specific handling for regular users
    if (mode === 'login' && !isTestAccount) {
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
    } else if (mode === 'signup' && !isTestAccount) {
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

      if (!storeName || !ownerName) {
        return NextResponse.json(
          { success: false, error: 'Store Name and Owner Name are required for registration.' },
          { status: 400 }
        );
      }

      const pinHash = await bcrypt.hash('123456', 10);

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
        console.error('Failed to insert staff:', staffErr);
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
