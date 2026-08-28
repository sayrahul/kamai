import { NextRequest, NextResponse } from 'next/server';
import { getHandshakeStatus } from '@/lib/auth/reverseHandshakeService';
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth/session';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code')?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Handshake code is required.' },
        { status: 400 }
      );
    }

    const sessionStatus = getHandshakeStatus(code);

    if (sessionStatus.status === 'not_found') {
      return NextResponse.json(
        { success: false, error: 'Handshake session not found.' },
        { status: 404 }
      );
    }

    if (sessionStatus.status === 'expired') {
      return NextResponse.json(
        { success: false, verified: false, status: 'expired', error: 'Session expired. Please request a new code.' },
        { status: 410 }
      );
    }

    if (sessionStatus.status === 'pending') {
      return NextResponse.json({
        success: true,
        verified: false,
        status: 'pending',
      });
    }

    // Session is VERIFIED!
    const cleanPhone = sessionStatus.phone || '';
    const clean10Digit = cleanPhone.slice(-10);

    // Look up or establish staff & business
    let businessId = `biz_${clean10Digit}`;
    let staffId = `staff_${clean10Digit}`;
    let storeName = 'My Store';
    let ownerName = 'Store Owner';
    let isReturning = false;

    const supabase = getSupabaseServerClient();
    if (supabase && isSupabaseServerConfigured()) {
      const { data: staff } = await supabase
        .from('business_staff')
        .select('id, business_id, name, phone, role, is_active')
        .eq('phone', clean10Digit)
        .maybeSingle();

      if (staff) {
        staffId = staff.id;
        businessId = staff.business_id;
        ownerName = staff.name || ownerName;
        isReturning = true;

        const { data: biz } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', staff.business_id)
          .maybeSingle();

        if (biz) {
          storeName = biz.name || storeName;
        }
      }
    }

    const sessionToken = signSessionToken({
      staff_id: staffId,
      business_id: businessId,
      phone: clean10Digit,
      role: 'owner',
    });

    const response = NextResponse.json({
      success: true,
      verified: true,
      status: 'verified',
      isReturning,
      user: {
        id: staffId,
        uid: staffId,
        name: ownerName,
        phone: clean10Digit,
        role: 'owner',
        business_id: isReturning ? businessId : undefined,
        business_name: storeName,
      },
      business: isReturning ? {
        id: businessId,
        name: storeName,
        owner_name: ownerName,
        phone: clean10Digit,
      } : null,
    });

    // Set secure authentication session cookie
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
    console.error('Check reverse handshake status error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to verify handshake status.' },
      { status: 500 }
    );
  }
}
