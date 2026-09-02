import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { getLivePlatformConfig } from '@/app/api/admin/config/route';

export const dynamic = 'force-dynamic';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // 1. Enforce strict cryptographic session verification (No client body fallback)
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = sessionCookie ? verifySessionToken(sessionCookie) : null;

    if (!payload || !payload.business_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Valid merchant login session required to initiate subscription payment.' },
        { status: 401 }
      );
    }

    const businessId = payload.business_id;
    const staffId = payload.staff_id || 'staff_owner';
    const phone = payload.phone || '';

    const plan = (body.plan as string) || 'pro';
    const billingCycle = body.billingCycle === 'monthly' ? 'monthly' : 'annual';

    const config = await getLivePlatformConfig();
    const annualPrice = config.proAnnualPrice || 1499;
    const monthlyPrice = config.proMonthlyPrice || 199;
    const amountInPaise = (billingCycle === 'monthly' ? monthlyPrice : annualPrice) * 100;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Payment gateway is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // 2. Create Razorpay order via REST API
    const orderPayload = {
      amount: amountInPaise,
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
      planLabel: billingCycle === 'monthly' ? 'Kamai+ Pro (Monthly)' : 'Kamai+ Pro (Annual)',
      businessId,
      phone,
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
