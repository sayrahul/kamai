import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Plan pricing in paise (1 INR = 100 paise)
const PLANS: Record<string, { amount: number; label: string; durationDays: number }> = {
  pro: { amount: 29900, label: 'Pro Plan', durationDays: 30 },
  enterprise: { amount: 79900, label: 'Enterprise Plan', durationDays: 30 },
};

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from session cookie
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const payload = verifySessionToken(sessionCookie);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Session expired. Please sign in again.' }, { status: 401 });
    }

    const body = await req.json();
    const plan = body.plan as string;

    if (!PLANS[plan]) {
      return NextResponse.json({ success: false, error: 'Invalid plan selected.' }, { status: 400 });
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Payment gateway is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const planDetails = PLANS[plan];

    // 2. Create Razorpay order via REST API (avoids SDK import issues)
    const orderPayload = {
      amount: planDetails.amount,
      currency: 'INR',
      receipt: `kamai_${payload.business_id}_${Date.now()}`,
      notes: {
        business_id: payload.business_id,
        staff_id: payload.staff_id,
        plan,
        phone: payload.phone,
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
      businessId: payload.business_id,
      phone: payload.phone,
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
