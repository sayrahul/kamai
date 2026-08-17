import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false });
    }

    const payload = verifySessionToken(sessionCookie);
    if (!payload) {
      return NextResponse.json({ authenticated: false });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase || !isSupabaseServerConfigured()) {
      // If server temporarily disconnected but token is cryptographically valid, return cached payload
      return NextResponse.json({
        authenticated: true,
        user: {
          id: payload.staff_id,
          phone: payload.phone,
          role: payload.role,
          business_id: payload.business_id,
        },
      });
    }

    // Re-verify in DB that staff record exists and is active
    const { data: staff, error: staffError } = await supabase
      .from('business_staff')
      .select('id, business_id, name, phone, role, is_active')
      .eq('id', payload.staff_id)
      .maybeSingle();

    if (staffError || !staff || staff.is_active === false) {
      return NextResponse.json({ authenticated: false });
    }

    // Fetch linked business details & subscription tier
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, business_type, owner_name, phone, address, pincode, gstin, upi_id, invoice_prefix, next_invoice_number, subscription_tier, subscription_valid_until')
      .eq('id', staff.business_id)
      .maybeSingle();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        role: staff.role,
        business_id: staff.business_id,
        business_name: business?.name || '',
      },
      business: business || null,
    });
  } catch (err: any) {
    console.error('Session check error:', err);
    return NextResponse.json({ authenticated: false });
  }
}
