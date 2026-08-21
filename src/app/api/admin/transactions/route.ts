import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: true, transactions: [] });
    }

    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('id, business_id, tier, billing_cycle, razorpay_payment_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Subscriptions fetch notice:', error.message);
    }

    return NextResponse.json({
      success: true,
      transactions: subs || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
