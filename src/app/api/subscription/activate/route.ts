import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessId,
      tier, // 'free' | 'pro' | 'enterprise'
      billingCycle = 'annual', // 'monthly' | 'annual'
      razorpayOrderId,
      razorpayPaymentId,
    } = body;

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
          success: false,
          error: 'Supabase server is not configured.',
          offlineFallback: true,
        },
        { status: 503 }
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

    // 1. Insert into subscriptions table if businessId is provided
    let subscriptionRecord = null;
    if (businessId) {
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          business_id: businessId,
          tier,
          billing_cycle: billingCycle,
          razorpay_order_id: razorpayOrderId || null,
          razorpay_payment_id: razorpayPaymentId || `UPI_${Date.now()}`,
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
