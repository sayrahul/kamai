import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

const PLAN_TIERS: Record<string, 'pro' | 'enterprise'> = {
  pro: 'pro',
  enterprise: 'enterprise',
};

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.warn('Razorpay webhook secret not configured.');
      return NextResponse.json({ received: true });
    }

    // 1. Verify webhook signature
    const expectedSig = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSig !== signature) {
      console.error('Webhook signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event as string;

    console.log('Razorpay webhook received:', eventType);

    // 2. Handle payment.captured (most reliable event for subscription activation)
    if (eventType === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (!payment) return NextResponse.json({ received: true });

      const notes = payment.notes || {};
      const businessId = notes.business_id as string;
      const plan = notes.plan as string;

      if (!businessId || !PLAN_TIERS[plan]) {
        console.warn('Webhook: missing business_id or invalid plan in notes', notes);
        return NextResponse.json({ received: true });
      }

      const tier = PLAN_TIERS[plan];
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      const supabase = getSupabaseServerClient();
      if (!supabase) {
        console.error('Webhook: Supabase unavailable');
        return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
      }

      const { error } = await supabase
        .from('businesses')
        .update({
          subscription_tier: tier,
          subscription_valid_until: validUntil.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (error) {
        console.error('Webhook: DB update error:', error);
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
      }

      console.log(`✅ Webhook upgraded: business=${businessId} tier=${tier} until=${validUntil.toISOString()}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}
