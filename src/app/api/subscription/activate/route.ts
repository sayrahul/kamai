import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let businessId: string | undefined;
    const isAdmin = verifyAdminRequest(req);

    // Verify session token from cookie
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (sessionCookie) {
      const payload = verifySessionToken(sessionCookie);
      if (payload) {
        businessId = payload.business_id;
      }
    }

    const body = await req.json().catch(() => ({}));
    const {
      tier, // 'free' | 'pro' | 'enterprise'
      billingCycle = 'annual', // 'monthly' | 'annual'
      razorpayOrderId,
      razorpayPaymentId,
    } = body;

    if (!businessId) {
      if (isAdmin && body.businessId) {
        businessId = body.businessId;
      } else {
        return NextResponse.json(
          { success: false, error: 'Unauthorized. Valid merchant login session or admin privileges required.' },
          { status: 401 }
        );
      }
    }

    if (!tier || !['free', 'pro', 'enterprise'].includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription tier.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase || !isSupabaseServerConfigured()) {
      return NextResponse.json(
        {
          success: true,
          offlineFallback: true,
          message: 'Local subscription activated in offline mode.',
        }
      );
    }

    // Security Gate: Non-admin users activating paid tiers online must provide payment/transaction references
    if (!isAdmin && tier !== 'free' && !razorpayPaymentId && !body.referralCode && !body.couponCode) {
      return NextResponse.json(
        { success: false, error: 'Payment or valid authorization reference is required for paid plan activation.' },
        { status: 403 }
      );
    }

    const now = new Date();
    const expiryDate = new Date(now);
    if (billingCycle === 'monthly') {
      expiryDate.setDate(expiryDate.getDate() + 30);
    } else {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    const validUntilISO = expiryDate.toISOString();
    const nowISO = now.toISOString();

    // 1. Insert into subscriptions table if businessId is resolved
    let subscriptionRecord = null;
    if (businessId) {
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          business_id: businessId,
          tier,
          billing_cycle: billingCycle,
          razorpay_order_id: razorpayOrderId || null,
          razorpay_payment_id: razorpayPaymentId || (isAdmin ? 'ADMIN_MANUAL_GRANT' : `REF_${Date.now()}`),
          status: 'paid',
          activated_at: nowISO,
          valid_until: validUntilISO,
        })
        .select()
        .single();

      if (subError) {
        console.warn('Subscription record insert warning:', subError);
      } else {
        subscriptionRecord = subData;
      }

      // 2. Update businesses table
      const { error: bizUpdateError } = await supabase
        .from('businesses')
        .update({
          subscription_tier: tier,
          subscription_valid_until: validUntilISO,
          updated_at: nowISO,
        })
        .eq('id', businessId);

      if (bizUpdateError) {
        console.warn('Business tier update warning:', bizUpdateError);
      }
    }

    return NextResponse.json({
      success: true,
      subscription: {
        tier,
        billingCycle,
        activatedAt: nowISO,
        validUntil: validUntilISO,
        status: 'paid',
      },
      record: subscriptionRecord,
    });
  } catch (err: any) {
    console.error('Subscription activation error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
