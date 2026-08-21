import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Plan pricing in paise (1 INR = 100 paise) - Startup Launch Pricing
const PLANS: Record<string, { amount: number; label: string; durationDays: number }> = {
  pro_annual: { amount: 149900, label: 'Kamai+ Pro (Annual)', durationDays: 365 },
  pro_monthly: { amount: 19900, label: 'Kamai+ Pro (Monthly)', durationDays: 30 },
  pro: { amount: 149900, label: 'Kamai+ Pro (Annual)', durationDays: 365 },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // 1. Identify user / business (from cookie session or body fallback)
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = sessionCookie ? verifySessionToken(sessionCookie) : null;

    const businessId = payload?.business_id || body.businessId || body.business_id || 'biz_local';
    const staffId = payload?.staff_id || 'staff_owner';
    const phone = payload?.phone || body.phone || '';

    const plan = (body.plan as string) || 'pro';
    const billingCycle = body.billingCycle === 'monthly' ? 'monthly' : 'annual';
    const planKey = `${plan}_${billingCycle}`;

    const planDetails = PLANS[planKey] || PLANS[plan] || PLANS.pro_annual;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Payment gateway is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // 2. Create Razorpay order via REST API
    const orderPayload = {
      amount: planDetails.amount,
      currency: 'INR',
      receipt: `kamai_${businessId}_${Date.now()}`.slice(0, 40),
      notes: {
        business_id: businessId,
        staff_id: staffId,
        plan,
        billing_cycle: billingCycle,
        phone,
      },
    };

    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(orderPayload),
    });

    const rzpData = await rzpRes.json();

    if (!rzpRes.ok || rzpData.error) {
      console.error('Razorpay order creation failed:', rzpData);
      return NextResponse.json(
        { success: false, error: rzpData?.error?.description || 'Failed to create payment order.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: rzpData.id,
      amount: rzpData.amount,
      currency: rzpData.currency,
      keyId: RAZORPAY_KEY_ID,
      planLabel: planDetails.label,
      businessId,
      phone,
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
