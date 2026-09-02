import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan = 'pro', billingCycle = 'annual' } = body;

    // 1. Enforce strict cryptographic session verification (No client body fallback)
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = sessionCookie ? verifySessionToken(sessionCookie) : null;

    if (!payload || !payload.business_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Valid merchant login session required to verify payment.' },
        { status: 401 }
      );
    }

    const businessId = payload.business_id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment fields (order_id, payment_id, signature).' },
        { status: 400 }
      );
    }

    if (!RAZORPAY_KEY_SECRET) {
      console.error('[SECURITY ERROR] RAZORPAY_KEY_SECRET is not configured on server.');
      return NextResponse.json(
        { success: false, error: 'Payment gateway configuration error on server.' },
        { status: 503 }
      );
    }

    // 2. Cryptographic HMAC-SHA256 signature verification with constant-time comparison
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureBuf = Buffer.from(razorpay_signature, 'utf8');

    if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
      console.error('Razorpay signature verification mismatch — possible tampering detected');
      return NextResponse.json(
        { success: false, error: 'Payment verification failed. Invalid cryptographic signature.' },
        { status: 400 }
      );
    }

    // 3. Compute subscription duration
    const isAnnual = billingCycle === 'annual' || plan === 'pro_annual';
    const durationDays = isAnnual ? 365 : 30;

    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + durationDays);

    const nowISO = now.toISOString();
    const validUntilISO = validUntil.toISOString();

    // 4. Update Supabase backend if configured
    const supabase = getSupabaseServerClient();
    if (supabase && businessId && businessId !== 'biz_local') {
      // Record subscription payment
      await supabase.from('subscriptions').insert({
        business_id: businessId,
        tier: 'pro',
        billing_cycle: isAnnual ? 'annual' : 'monthly',
        razorpay_order_id,
        razorpay_payment_id,
        status: 'paid',
        activated_at: nowISO,
        valid_until: validUntilISO,
      });

      // Update business tier
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          subscription_tier: 'pro',
          subscription_valid_until: validUntilISO,
          updated_at: nowISO,
        })
        .eq('id', businessId);

      if (updateError) {
        console.error('Subscription upgrade DB error:', updateError);
      }
    }

    console.log(`✅ Subscription verified & upgraded: business=${businessId} plan=pro validUntil=${validUntilISO}`);

    return NextResponse.json({
      success: true,
      tier: 'pro',
      billingCycle: isAnnual ? 'annual' : 'monthly',
      activatedAt: nowISO,
      validUntil: validUntilISO,
      message: '🎉 Pro plan payment verified and activated successfully!',
    });
  } catch (err: any) {
    console.error('Verify payment exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during verification.' },
      { status: 500 }
    );
  }
}
