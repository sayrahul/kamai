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
    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, billingCycle } = body;

    // 1. Identify user / business (cookie session or body fallback)
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = sessionCookie ? verifySessionToken(sessionCookie) : null;
    const businessId = payload?.business_id || body.businessId || body.business_id || 'biz_local';

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
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
    const planTier = (plan as string) || 'pro';
    const isAnnual = billingCycle === 'annual' || plan === 'pro_annual';
    const durationDays = isAnnual ? 365 : 30;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + durationDays);

    const supabase = getSupabaseServerClient();
    if (supabase && businessId && businessId !== 'biz_local') {
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          subscription_tier: 'pro',
          subscription_valid_until: validUntil.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (updateError) {
        console.error('Subscription upgrade DB error:', updateError);
      }
    }

    console.log(`✅ Subscription upgraded: business=${businessId} plan=pro until=${validUntil.toISOString()}`);

    return NextResponse.json({
      success: true,
      tier: 'pro',
      validUntil: validUntil.toISOString(),
      message: `🎉 Pro plan activated!`,
    });
  } catch (err: any) {
    console.error('Verify payment error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
