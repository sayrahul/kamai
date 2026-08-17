import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const phone = searchParams.get('phone');

    if (!businessId && !phone) {
      return NextResponse.json(
        { success: false, error: 'businessId or phone parameter is required.' },
        { status: 400 }
      );
    }

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

    let query = supabase.from('businesses').select('id, name, subscription_tier, subscription_valid_until');

    if (businessId) {
      query = query.eq('id', businessId);
    } else if (phone) {
      query = query.eq('phone', phone);
    }

    const { data: business, error } = await query.maybeSingle();

    if (error || !business) {
      return NextResponse.json(
        { success: false, error: 'Business not found.' },
        { status: 404 }
      );
    }

    // Check if subscription has expired
    const validUntil = business.subscription_valid_until ? new Date(business.subscription_valid_until) : null;
    const isExpired = validUntil ? validUntil < new Date() : false;
    const effectiveTier = isExpired ? 'free' : business.subscription_tier || 'free';

    return NextResponse.json({
      success: true,
      businessId: business.id,
      businessName: business.name,
      subscriptionTier: effectiveTier,
      subscriptionValidUntil: business.subscription_valid_until,
      isExpired,
    });
  } catch (err: any) {
    console.error('Subscription status check error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
