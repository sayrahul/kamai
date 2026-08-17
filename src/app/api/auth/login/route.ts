import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, password, otpCode } = body;

    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Valid 10-digit mobile number is required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase || !isSupabaseServerConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase server is not configured. Falling back to local offline mode.',
          offlineFallback: true,
        },
        { status: 503 }
      );
    }

    // 1. Look up staff member by phone
    const { data: staff, error: staffError } = await supabase
      .from('business_staff')
      .select('id, business_id, name, phone, pin_hash, role, is_active')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (staffError || !staff) {
      return NextResponse.json(
        { success: false, error: 'No registered account found with this mobile number. Please sign up first.' },
        { status: 404 }
      );
    }

    if (staff.is_active === false) {
      return NextResponse.json(
        { success: false, error: 'This staff account has been deactivated. Please contact your store owner.' },
        { status: 403 }
      );
    }

    // 2. Validate password/PIN if provided (or OTP pass)
    if (password) {
      const expectedHash = Buffer.from(password).toString('base64');
      if (staff.pin_hash && staff.pin_hash !== expectedHash && staff.pin_hash !== password) {
        return NextResponse.json(
          { success: false, error: 'Incorrect PIN or password.' },
          { status: 401 }
        );
      }
    }

    // 3. Fetch linked Business and Subscription
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', staff.business_id)
      .single();

    if (bizError || !business) {
      return NextResponse.json(
        { success: false, error: 'Business store profile not found.' },
        { status: 404 }
      );
    }

    // 4. Fetch latest active subscription
    const { data: latestSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      user: {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        role: staff.role,
        businessId: business.id,
        businessName: business.name,
        subscriptionTier: business.subscription_tier || 'free',
        subscriptionValidUntil: business.subscription_valid_until,
      },
      business,
      subscription: latestSub || null,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
