import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

const PLAN_TIERS: Record<string, { tier: 'pro' | 'enterprise'; durationDays: number }> = {
  pro: { tier: 'pro', durationDays: 30 },
  enterprise: { tier: 'enterprise', durationDays: 30 },
};

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }
    const payload = verifySessionToken(sessionCookie);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Session expired.' }, { status: 401 });
    }

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment fields.' },
        { status: 400 }
      );
    }

    if (!RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Payment gateway not configured.' },
        { status: 503 }
      );
    }

    // 2. Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Razorpay signature mismatch — possible tamper attempt');
      return NextResponse.json(
        { success: false, error: 'Payment verification failed. Signature mismatch.' },
        { status: 400 }
      );
    }

    // 3. Upgrade subscription in Supabase
    const planDetails = PLAN_TIERS[plan];
    if (!planDetails) {
      return NextResponse.json({ success: false, error: 'Invalid plan.' }, { status: 400 });
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + planDetails.durationDays);

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 503 });
    }

    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        subscription_tier: planDetails.tier,
        subscription_valid_until: validUntil.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.business_id);

    if (updateError) {
      console.error('Subscription upgrade DB error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Payment received but failed to upgrade plan. Contact support.' },
        { status: 500 }
      );
    }

    console.log(`✅ Subscription upgraded: business=${payload.business_id} plan=${planDetails.tier} until=${validUntil.toISOString()}`);

    return NextResponse.json({
      success: true,
      tier: planDetails.tier,
      validUntil: validUntil.toISOString(),
      message: `🎉 ${planDetails.tier === 'pro' ? 'Pro' : 'Enterprise'} plan activated!`,
    });
  } catch (err: any) {
    console.error('Verify payment error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
